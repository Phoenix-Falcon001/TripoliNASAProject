import { matchDemoAnswer, type DemoAnswer } from "./demoAnswers";
import { buildPrompt } from "./prompts";
import { retrieve } from "./retrieve";
import type { Card } from "./types";

// Only local AI: Ollama on this laptop. Never a cloud API.
export const OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_MODEL = "llama3.1:8b";
export const MAX_QUESTION_LENGTH = 500;

export function ollamaModel(env: Record<string, string | undefined> = process.env): string {
  return env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL;
}

export const NO_CARDS_ANSWER = "Not in our evidence — none of our verified cards match this question.";
export const OFFLINE_ANSWER = "AI is offline — here are the most relevant cards.";

/** One line of the NDJSON stream sent from /api/ask to the browser. */
export type AskEvent =
  | { type: "cards"; cards: Card[] }
  | { type: "ai"; model: string }
  | { type: "token"; text: string }
  | { type: "fallback"; mode: "cached" | "offline" | "no_cards"; text: string; reason?: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface AskContext {
  cards: readonly Card[];
  demoAnswers: readonly DemoAnswer[];
  model: string;
  fetchFn?: typeof fetch;
  /** Abort if Ollama does not start answering within this time. */
  connectTimeoutMs?: number;
  signal?: AbortSignal;
}

export function validateQuestion(q: unknown): string | null {
  if (typeof q !== "string") return null;
  const t = q.trim();
  return t.length > 0 && t.length <= MAX_QUESTION_LENGTH ? t : null;
}

/** Yields the "response" text of each line of Ollama's /api/generate NDJSON stream. */
async function* readOllamaStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const parse = (line: string): { text: string; done: boolean } => {
    const msg = JSON.parse(line) as { response?: string; done?: boolean; error?: string };
    if (msg.error) throw new Error(`Ollama: ${msg.error}`);
    return { text: msg.response ?? "", done: !!msg.done };
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const m = parse(line);
      if (m.text) yield m.text;
      if (m.done) return;
    }
  }
  if (buf.trim()) {
    const m = parse(buf.trim());
    if (m.text) yield m.text;
  }
}

function fallbackEvent(ctx: AskContext, question: string, reason: string): AskEvent {
  const cached = matchDemoAnswer(ctx.demoAnswers, question);
  return cached
    ? { type: "fallback", mode: "cached", text: cached.answer, reason }
    : { type: "fallback", mode: "offline", text: OFFLINE_ANSWER, reason };
}

/**
 * The whole Ask flow: pick cards, send them to Ollama with the strict prompt, stream
 * the answer. Falls back to a pre-written answer (or the offline message) if Ollama
 * can't be reached. Never throws.
 */
export async function* askEvents(question: string, ctx: AskContext): AsyncGenerator<AskEvent> {
  const cards = retrieve(ctx.cards, question);
  yield { type: "cards", cards };

  if (cards.length === 0) {
    yield { type: "fallback", mode: "no_cards", text: NO_CARDS_ANSWER };
    yield { type: "done" };
    return;
  }

  const fetchFn = ctx.fetchFn ?? fetch;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  ctx.signal?.addEventListener("abort", onAbort);
  const timer = setTimeout(() => controller.abort(), ctx.connectTimeoutMs ?? 60_000);

  let res: Response;
  try {
    res = await fetchFn(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ctx.model, prompt: buildPrompt(cards, question), stream: true, options: { temperature: 0 } }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    ctx.signal?.removeEventListener("abort", onAbort);
    yield fallbackEvent(ctx, question, `Ollama not reachable (${(e as Error).message})`);
    yield { type: "done" };
    return;
  }
  clearTimeout(timer);

  try {
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      yield fallbackEvent(ctx, question, `Ollama returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
      return;
    }
    yield { type: "ai", model: ctx.model };
    let any = false;
    try {
      for await (const text of readOllamaStream(res.body)) {
        any = true;
        yield { type: "token", text };
      }
    } catch (e) {
      if (!any) {
        yield fallbackEvent(ctx, question, (e as Error).message);
        return;
      }
      yield { type: "error", message: `The AI stopped part-way: ${(e as Error).message}` };
    }
  } finally {
    ctx.signal?.removeEventListener("abort", onAbort);
    yield { type: "done" };
  }
}
