import type { Weights } from "./rank";

export type WeightKey = keyof Weights;
const KEYS: WeightKey[] = ["crew", "evid", "mm"];

/**
 * Sets one weight (clamped to 0–100, rounded) and shares the remainder between the
 * other two in proportion to their current values, so the total always stays 100.
 */
export function setWeight(w: Weights, key: WeightKey, value: number): Weights {
  const v = Math.round(Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0)));
  const others = KEYS.filter((k) => k !== key);
  const rest = 100 - v;
  const sum = w[others[0]] + w[others[1]];
  const first = sum === 0 ? Math.round(rest / 2) : Math.round((rest * w[others[0]]) / sum);
  return { ...w, [key]: v, [others[0]]: first, [others[1]]: rest - first } as Weights;
}
