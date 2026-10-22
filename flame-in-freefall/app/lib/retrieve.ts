import type { Card } from "./types";

// Plain keyword retrieval (no embeddings). Lowercase, split on non-letters/digits,
// drop stop words, and cut common word endings so "detected", "detection" and
// "detect" all match.

const STOP_WORDS = new Set(
  (
    "a about above after again against all am an and any are as at be because been before being below between both but by " +
    "can could did do does doing down during each few for from further had has have having he her here hers herself him " +
    "himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other " +
    "our ours ourselves out over own same she should so some such than that the their theirs them themselves then there " +
    "these they this those through to too under until up very was we were what when where which while who whom why will " +
    "with would you your yours yourself yourselves tell show explain describe happen happens know nasa please give list " +
    "does did much many use used using"
  ).split(" "),
);

export function tokenize(text: string | null | undefined): string[] {
  return (text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
    .map(stem);
}

const SUFFIXES = ["ations", "ation", "ions", "ion", "ings", "ing", "ed", "s"];
const MIN_STEM = 4;

/** Very small suffix stripper. Numbers are left alone. */
export function stem(word: string): string {
  if (/^[0-9.]+$/.test(word)) return word;
  let w = word;
  for (const suf of SUFFIXES) {
    if (w.endsWith(suf) && w.length - suf.length >= MIN_STEM && !(suf === "s" && w.endsWith("ss"))) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  if (w.endsWith("e") && w.length - 1 >= MIN_STEM) w = w.slice(0, -1);
  return w;
}

/** How much a query word counts when found in each field. */
const FIELD_WEIGHTS: [keyof Card, number][] = [
  ["finding", 3],
  ["evidence_quote", 2],
  ["material_or_fuel", 2],
  ["hazard", 2],
  ["conditions", 1],
  ["open_question", 1],
];

export function scoreCard(card: Card, queryTokens: readonly string[]): number {
  const terms = new Set(queryTokens);
  let score = 0;
  for (const [field, weight] of FIELD_WEIGHTS) {
    const fieldTokens = new Set(tokenize(card[field] as string | null | undefined));
    for (const t of terms) if (fieldTokens.has(t)) score += weight;
  }
  return score;
}

export const DEFAULT_TOP_K = 6;
export const MAX_TOP_K = 8;

/** Top-k cards with score > 0, highest first, ties by card_id. */
export function retrieve(cards: readonly Card[], question: string, k: number = DEFAULT_TOP_K): Card[] {
  const q = tokenize(question);
  if (q.length === 0) return [];
  const limit = Math.max(1, Math.min(MAX_TOP_K, k));
  return cards
    .map((card) => ({ card, score: scoreCard(card, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.card.card_id < b.card.card_id ? -1 : 1))
    .slice(0, limit)
    .map((x) => x.card);
}
