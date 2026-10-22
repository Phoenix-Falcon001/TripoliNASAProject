import type { Card, Scores } from "./types";

/** Weights in percent. Must be non-negative and sum to 100. */
export interface Weights {
  crew: number;
  evid: number;
  mm: number;
}

export const DEFAULT_WEIGHTS: Weights = { crew: 40, evid: 35, mm: 25 };

export function assertValidWeights(w: Weights): void {
  const parts = [w.crew, w.evid, w.mm];
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) {
    throw new Error(`Weights must be non-negative numbers, got ${JSON.stringify(w)}`);
  }
  if (Math.abs(parts[0] + parts[1] + parts[2] - 100) > 1e-9) {
    throw new Error(`Weights must sum to 100, got ${JSON.stringify(w)}`);
  }
}

/** (w_crew·crew_safety + w_evid·evidence + w_mm·moon_mars) / 100 — a number from 1 to 5. */
export function score(scores: Scores, w: Weights = DEFAULT_WEIGHTS): number {
  assertValidWeights(w);
  return (w.crew * scores.crew_safety + w.evid * scores.evidence + w.mm * scores.moon_mars) / 100;
}

export interface RankedCard<C extends Card = Card> {
  card: C;
  score: number;
  rank: number; // 1-based
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Highest score first; ties broken by card_id ascending. Does not mutate the input. */
export function rankCards<C extends Card>(cards: readonly C[], w: Weights = DEFAULT_WEIGHTS): RankedCard<C>[] {
  assertValidWeights(w);
  return cards
    .map((card) => ({ card, score: score(card.scores, w) }))
    .sort((a, b) => b.score - a.score || compareIds(a.card.card_id, b.card.card_id))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Score shown in the UI, e.g. "4.15". */
export function formatScore(s: number): string {
  return s.toFixed(2);
}
