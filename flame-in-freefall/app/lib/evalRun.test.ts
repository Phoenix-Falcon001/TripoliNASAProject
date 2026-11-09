import { describe, expect, it } from "vitest";
import { checkedText } from "./aiText";
import { computeFlags, numbersIn, runEval } from "./evalRun";
import { makeCard } from "./testCards";

const card = makeCard({
  card_id: "SAF-001",
  finding: "Flame spread over cotton was 0.68 cm/s.",
  values: [{ quantity: "rate", value: "0.68", unit: "cm/s" }],
});
const other = makeCard({ card_id: "SAF-002", finding: "Nomex did not ignite at 21% oxygen." });

function fakeOllama(text: string, calls: string[] = []) {
  return (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string).prompt);
    return new Response(JSON.stringify({ response: text }), { status: 200 });
  }) as unknown as typeof fetch;
}
const down = (async () => {
  throw new Error("ECONNREFUSED");
}) as unknown as typeof fetch;

describe("numbersIn / computeFlags", () => {
  it("ignores card IDs and finds invented numbers vs given and vs all cards", () => {
    expect(numbersIn("It was 0.68 cm/s [SAF-001] and 21%.")).toEqual(["0.68", "21"]);
    const f = computeFlags("Spread was 0.68 cm/s [SAF-001], about 21% oxygen and 99 s.", [card], [card, other]);
    expect(f.cited_cards).toEqual(["SAF-001"]);
    expect(f.invented_vs_given).toEqual(["21", "99"]);
    expect(f.invented_vs_all).toEqual(["99"]);
    expect(f.missing_citation).toBe(false);
  });
  it("does not count 1 as present because of 10, a page number or a score", () => {
    const c = makeCard({ page: 1, finding: "10 samples burned.", scores: { crew_safety: 1, evidence: 1, moon_mars: 1 } });
    expect(computeFlags("1 sample", [c], []).invented_vs_given).toEqual(["1"]);
    expect(computeFlags("10 samples", [c], []).invented_vs_given).toEqual([]);
  });
  it("detects 'Not in our evidence'", () => {
    expect(computeFlags("Not in our evidence.", [], []).said_not_in_evidence).toBe(true);
  });
});

describe("runEval", () => {
  const ctx = { cards: [card, other], demoAnswers: [], model: "m1" };

  it("plain mode sends the question only, with no cards", async () => {
    const calls: string[] = [];
    const r = await runEval({ mode: "plain", question: "How fast does cotton burn?" }, { ...ctx, fetchFn: fakeOllama("About 5 cm/s.", calls) });
    expect(r.mode).toBe("plain");
    expect(r.given_cards).toEqual([]);
    expect(calls[0]).toBe("Answer the question. If you are not sure, say so.\nQuestion: How fast does cotton burn?");
    expect(r.flags.invented_vs_all).toEqual(["5"]);
    expect(r.settings).toEqual({ temperature: 0, seed: 42 });
  });

  it("cards mode uses retrieval and the strict prompt", async () => {
    const calls: string[] = [];
    const r = await runEval({ mode: "cards", question: "flame spread cotton" }, { ...ctx, fetchFn: fakeOllama("0.68 cm/s [SAF-001]", calls) });
    expect(r.mode).toBe("cards");
    expect(r.given_cards).toContain("SAF-001");
    expect(calls[0]).toContain("Answer using ONLY the evidence cards below.");
    expect(r.flags.invented_vs_given).toEqual([]);
  });

  it("keeps fallbacks as separate modes", async () => {
    expect((await runEval({ mode: "cards", question: "chocolate cake" }, { ...ctx, fetchFn: down })).mode).toBe("no_cards");
    expect((await runEval({ mode: "cards", question: "flame spread cotton" }, { ...ctx, fetchFn: down })).mode).toBe("offline");
    const demo = [{ question: "flame spread on cotton", answer: "Pre [SAF-001]", card_ids: ["SAF-001"], checked_by: "Bassam" }];
    expect((await runEval({ mode: "cards", question: "flame spread on cotton" }, { ...ctx, demoAnswers: demo, fetchFn: down })).mode).toBe("cached");
  });

  it("plain mode surfaces an Ollama failure instead of faking an answer", async () => {
    await expect(runEval({ mode: "plain", question: "q" }, { ...ctx, fetchFn: down })).rejects.toThrow();
  });

  it("explain mode uses the card and the explain prompt", async () => {
    const calls: string[] = [];
    const r = await runEval({ mode: "explain", card_id: "SAF-001" }, { ...ctx, fetchFn: fakeOllama("Plain words.", calls) });
    expect(r.mode).toBe("explain");
    expect(calls[0]).toContain("Use ONLY the card");
    expect(calls[0]).toContain("[SAF-001]");
  });
});

describe("checkedText", () => {
  it("shows only checked entries", () => {
    expect(checkedText({ text: "t", checked_by: "Bassam" })).toBe("t");
    expect(checkedText({ text: "t", checked_by: null })).toBeNull();
    expect(checkedText("legacy plain string")).toBeNull();
    expect(checkedText(undefined)).toBeNull();
  });
});
