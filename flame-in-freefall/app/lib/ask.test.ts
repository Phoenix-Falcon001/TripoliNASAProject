import { describe, expect, it } from "vitest";
import { askEvents, NO_CARDS_ANSWER, OFFLINE_ANSWER, ollamaModel, validateQuestion, type AskEvent } from "./ask";
import { makeCard } from "./testCards";

const cards = [makeCard({ card_id: "SAF-001", finding: "Flame spread over cotton was slow." })];

async function collect(gen: AsyncGenerator<AskEvent>): Promise<AskEvent[]> {
  const out: AskEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

function streamOf(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const l of lines) c.enqueue(enc.encode(l));
      c.close();
    },
  });
}

const okFetch = (lines: string[]) =>
  (async () => new Response(streamOf(lines), { status: 200 })) as unknown as typeof fetch;
const downFetch = (async () => {
  throw new Error("ECONNREFUSED");
}) as unknown as typeof fetch;

describe("askEvents", () => {
  it("sends cards first, then streams Ollama tokens", async () => {
    let sentBody = "";
    const fetchFn = (async (url: string, init: RequestInit) => {
      expect(url).toBe("http://localhost:11434/api/generate");
      sentBody = init.body as string;
      return new Response(streamOf(['{"response":"Slow ","done":false}\n{"respo', 'nse":"[SAF-001]","done":false}\n', '{"done":true}\n']));
    }) as unknown as typeof fetch;
    const events = await collect(askEvents("cotton flame", { cards, demoAnswers: [], model: "m1", fetchFn }));
    expect(events[0]).toMatchObject({ type: "cards", cards: [{ card_id: "SAF-001" }] });
    expect(events[1]).toEqual({ type: "ai", model: "m1" });
    expect(events.filter((e) => e.type === "token").map((e) => (e as { text: string }).text).join("")).toBe("Slow [SAF-001]");
    expect(events.at(-1)).toEqual({ type: "done" });
    const body = JSON.parse(sentBody);
    expect(body.model).toBe("m1");
    expect(body.prompt).toContain("Answer using ONLY the evidence cards below.");
    expect(body.prompt).toContain("Question: cotton flame");
  });

  it("does not call Ollama when no card matches", async () => {
    const fetchFn = (async () => {
      throw new Error("should not be called");
    }) as unknown as typeof fetch;
    const events = await collect(askEvents("chocolate", { cards, demoAnswers: [], model: "m", fetchFn }));
    expect(events).toEqual([
      { type: "cards", cards: [] },
      { type: "fallback", mode: "no_cards", text: NO_CARDS_ANSWER },
      { type: "done" },
    ]);
  });

  it("falls back to the offline message when Ollama is down", async () => {
    const events = await collect(askEvents("cotton", { cards, demoAnswers: [], model: "m", fetchFn: downFetch }));
    expect(events[1]).toMatchObject({ type: "fallback", mode: "offline", text: OFFLINE_ANSWER });
  });

  it("uses a matching pre-written answer when Ollama is down", async () => {
    const demoAnswers = [{ question: "Does cotton flame spread slowly?", answer: "Pre-written [SAF-001]", card_ids: ["SAF-001"] }];
    const events = await collect(
      askEvents("does cotton flame spread slowly", { cards, demoAnswers, model: "m", fetchFn: downFetch }),
    );
    expect(events[1]).toMatchObject({ type: "fallback", mode: "cached", text: "Pre-written [SAF-001]" });
  });

  it("falls back when the model is missing (HTTP 404)", async () => {
    const fetchFn = (async () => new Response('{"error":"model not found"}', { status: 404 })) as unknown as typeof fetch;
    const events = await collect(askEvents("cotton", { cards, demoAnswers: [], model: "m", fetchFn }));
    expect(events[1]).toMatchObject({ type: "fallback", mode: "offline" });
    expect((events[1] as { reason: string }).reason).toMatch(/404.*model not found/);
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("reports an error if the stream breaks after some tokens", async () => {
    const events = await collect(
      askEvents("cotton", { cards, demoAnswers: [], model: "m", fetchFn: okFetch(['{"response":"Hi"}\n', "not json\n"]) }),
    );
    expect(events.map((e) => e.type)).toEqual(["cards", "ai", "token", "error", "done"]);
  });
});

describe("helpers", () => {
  it("validateQuestion trims and limits length", () => {
    expect(validateQuestion("  hi ")).toBe("hi");
    expect(validateQuestion("   ")).toBeNull();
    expect(validateQuestion(42)).toBeNull();
    expect(validateQuestion("x".repeat(501))).toBeNull();
  });
  it("ollamaModel reads OLLAMA_MODEL with a default", () => {
    expect(ollamaModel({})).toBe("llama3.1:8b");
    expect(ollamaModel({ OLLAMA_MODEL: "qwen2.5:7b" })).toBe("qwen2.5:7b");
  });
});
