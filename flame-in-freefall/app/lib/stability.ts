import { rankCards, type Weights } from "./rank";
import type { Card } from "./types";

export const STABLE_THRESHOLD = 0.8;
export const TOP_N = 10;

export type StabilityLabel = "Stable" | "Depends on priorities";

export interface Stability {
  /** Share of weight combinations (0–1) in which the card is in the top N. */
  share: number;
  label: StabilityLabel;
}

/** Every weight combination with each weight 10–60 in steps of 10, summing to 100 (27 combos). */
export function weightCombos(min = 10, max = 60, step = 10): Weights[] {
  const out: Weights[] = [];
  for (let crew = min; crew <= max; crew += step) {
    for (let evid = min; evid <= max; evid += step) {
      const mm = 100 - crew - evid;
      if (mm >= min && mm <= max) out.push({ crew, evid, mm });
    }
  }
  return out;
}

/** For each card_id: how often it is in the top N across all weight combinations. */
export function stability(
  cards: readonly Card[],
  topN: number = TOP_N,
  threshold: number = STABLE_THRESHOLD,
  combos: Weights[] = weightCombos(),
): Map<string, Stability> {
  const hits = new Map<string, number>(cards.map((c) => [c.card_id, 0]));
  for (const w of combos) {
    for (const r of rankCards(cards, w).slice(0, topN)) {
      hits.set(r.card.card_id, (hits.get(r.card.card_id) ?? 0) + 1);
    }
  }
  const out = new Map<string, Stability>();
  for (const [id, n] of hits) {
    const share = combos.length === 0 ? 0 : n / combos.length;
    out.set(id, { share, label: share >= threshold ? "Stable" : "Depends on priorities" });
  }
  return out;
}
