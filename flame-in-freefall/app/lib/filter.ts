import type { Card, ControlCategory, Hazard } from "./types";

/** Empty string means "any". */
export interface CardFilters {
  experiment: string;
  hazard: Hazard | "";
  control: ControlCategory | "";
  material: string;
}

export const NO_FILTERS: CardFilters = { experiment: "", hazard: "", control: "", material: "" };

/** Value used in the material filter for cards with no material_or_fuel. */
export const NO_MATERIAL = "__none__";

export interface FilterableItem {
  card: Card;
  experiment: string;
}

export function matchesFilters(item: FilterableItem, f: CardFilters): boolean {
  const material = item.card.material_or_fuel ?? NO_MATERIAL;
  return (
    (!f.experiment || item.experiment === f.experiment) &&
    (!f.hazard || item.card.hazard === f.hazard) &&
    (!f.control || item.card.control_category === f.control) &&
    (!f.material || material === f.material)
  );
}

/** Keeps the order of `items` (which is the ranking order). */
export function filterItems<T extends FilterableItem>(items: readonly T[], f: CardFilters): T[] {
  return items.filter((i) => matchesFilters(i, f));
}

/** Sorted distinct values, for building filter dropdowns. */
export function distinct(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
