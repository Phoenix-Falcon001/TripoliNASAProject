// G1 test core, used by /api/eval. Same model and settings for both modes:
// "plain" = question only; "cards" = the exact Ask path (retrieve → strict prompt → Ollama).
import { NO_CARDS_ANSWER, OFFLINE_ANSWER, OLLAMA_OPTIONS, ollamaGenerate } from "./ask";
import { extractCitations } from "./citations";
import { matchDemoAnswer, type DemoAnswer } from "./demoAnswers";
import { buildExplainPrompt, buildPlainPrompt, buildPrompt } from "./prompts";
import { retrieve } from "./retrieve";
import type { Card } from "./types";

export type EvalMode = "plain" | "cards" | "explain";
/** What actually answered. "cached"/"offline"/"no_cards" are the app's fallbacks, kept as separate modes. */
export type AnsweredMode = "plain" | "cards" | "explain" | "cached" | "offline" | "no_cards";

export interface EvalFlags {
  cited_cards: string[];
  /** Numbers in the answer that are not in the cards given to the AI. */
  invented_vs_given: string[];
  /** Numbers in the answer that are not in ANY verified card. */
  invented_vs_all: string[];
  missing_citation: boolean;
  said_not_in_evidence: boolean;
}

export interface EvalResult {
  mode: AnsweredMode;
  model: string;
  settings: typeof OLLAMA_OPTIONS;
  answer: string;
  given_cards: string[];
  flags: EvalFlags;
  seconds: number | null;
  note?: string;
}

const CITE_RE = /\[(?:SAF|FLX|BAS|DEMO)-\d{3}\]/g;

/** Numbers written in a text (citations like [SAF-001] removed first). */
export function numbersIn(text: string): string[] {
  return [...new Set(text.replace(CITE_RE, "").match(/\d+(?:[.,]\d+)*/g) ?? [])];
}

function numberIsIn(n: string, haystack: string): boolean {
  return [n, n.replace(/,/g, "")].some((form) => new RegExp(`(?<![\\d.])${form.replace(/[.]/g, "\\.")}(?![\\d])`).test(haystack));
}

/**
 * The evidence text of cards: only content fields. Page numbers, scores and IDs are left out,
 * so a number like "3" in an answer is not "found" just because a card has page 3 or a score of 3.
 */
export function evidenceText(cards: readonly Card[]): string {
  return cards
    .flatMap((c) => [
      c.finding,
      c.evidence_quote,
      c.material_or_fuel,
      c.conditions,
      c.earth_comparison,
      c.open_question,
      c.team_interpretation?.text,
      ...(c.values ?? []).flatMap((v) => [v.quantity, v.value, v.unit]),
    ])
    .filter(Boolean)
    .join(" \n ");
}

export function computeFlags(answer: string, given: readonly Card[], all: readonly Card[]): EvalFlags {
  const givenText = evidenceText(given);
  const allText = evidenceText(all);
  const nums = numbersIn(answer);
  const cited = extractCitations(answer);
  return {
    cited_cards: cited,
    invented_vs_given: nums.filter((n) => !numberIsIn(n, givenText)),
    invented_vs_all: nums.filter((n) => !numberIsIn(n, allText)),
    missing_citation: cited.length === 0,
    said_not_in_evidence: /not in our evidence/i.test(answer),
  };
}

export interface EvalContext {
  cards: readonly Card[];
  demoAnswers: readonly DemoAnswer[];
  model: string;
  fetchFn?: typeof fetch;
}

/** Runs one question (or one card explanation) and returns the answer with its auto-flags. */
export async function runEval(
  input: { mode: EvalMode; question?: string; card_id?: string },
  ctx: EvalContext,
): Promise<EvalResult> {
  const base = { model: ctx.model, settings: OLLAMA_OPTIONS };
  const done = (mode: AnsweredMode, answer: string, given: Card[], seconds: number | null, note?: string): EvalResult => ({
    ...base,
    mode,
    answer,
    given_cards: given.map((c) => c.card_id),
    flags: computeFlags(answer, given, ctx.cards),
    seconds,
    ...(note ? { note } : {}),
  });

  if (input.mode === "explain") {
    const card = ctx.cards.find((c) => c.card_id === input.card_id);
    if (!card) throw new Error(`No verified card ${input.card_id}`);
    const r = await ollamaGenerate(ctx.model, buildExplainPrompt(card), ctx.fetchFn);
    return done("explain", r.text.trim(), [card], r.seconds);
  }

  const question = (input.question ?? "").trim();
  if (!question) throw new Error("Missing question");

  if (input.mode === "plain") {
    const r = await ollamaGenerate(ctx.model, buildPlainPrompt(question), ctx.fetchFn);
    return done("plain", r.text.trim(), [], r.seconds);
  }

  const given = retrieve(ctx.cards, question);
  if (given.length === 0) return done("no_cards", NO_CARDS_ANSWER, [], null);
  try {
    const r = await ollamaGenerate(ctx.model, buildPrompt(given, question), ctx.fetchFn);
    return done("cards", r.text.trim(), given, r.seconds);
  } catch (e) {
    const cached = matchDemoAnswer(ctx.demoAnswers, question);
    const note = `Ollama failed: ${(e as Error).message}`;
    return cached ? done("cached", cached.answer, given, null, note) : done("offline", OFFLINE_ANSWER, given, null, note);
  }
}
