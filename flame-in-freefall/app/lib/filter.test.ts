import { describe, expect, it } from "vitest";
import { NO_FILTERS, NO_MATERIAL, distinct, filterItems } from "./filter";
import { makeCard } from "./testCards";

const items = [
  { experiment: "SAFFIRE", card: makeCard({ card_id: "SAF-001", hazard: "ignition", material_or_fuel: "Nomex" }) },
  { experiment: "FLEX", card: makeCard({ card_id: "FLX-001", control_category: "suppress", material_or_fuel: null }) },
  { experiment: "SAFFIRE", card: makeCard({ card_id: "SAF-002", control_category: "detect" }) },
];
const ids = (xs: typeof items) => xs.map((x) => x.card.card_id);

describe("filterItems", () => {
  it("returns everything (in the same order) with no filters", () => {
    expect(ids(filterItems(items, NO_FILTERS))).toEqual(["SAF-001", "FLX-001", "SAF-002"]);
  });

  it("filters by experiment, hazard, control and material", () => {
    expect(ids(filterItems(items, { ...NO_FILTERS, experiment: "SAFFIRE" }))).toEqual(["SAF-001", "SAF-002"]);
    expect(ids(filterItems(items, { ...NO_FILTERS, hazard: "ignition" }))).toEqual(["SAF-001"]);
    expect(ids(filterItems(items, { ...NO_FILTERS, control: "suppress" }))).toEqual(["FLX-001"]);
    expect(ids(filterItems(items, { ...NO_FILTERS, material: "Nomex" }))).toEqual(["SAF-001"]);
  });

  it("matches cards without a material via NO_MATERIAL", () => {
    expect(ids(filterItems(items, { ...NO_FILTERS, material: NO_MATERIAL }))).toEqual(["FLX-001", "SAF-002"]);
  });

  it("combines filters with AND", () => {
    expect(ids(filterItems(items, { ...NO_FILTERS, experiment: "SAFFIRE", control: "detect" }))).toEqual(["SAF-002"]);
    expect(filterItems(items, { ...NO_FILTERS, experiment: "FLEX", hazard: "ignition" })).toEqual([]);
  });
});

describe("distinct", () => {
  it("dedupes and sorts", () => {
    expect(distinct(["b", "a", "b"])).toEqual(["a", "b"]);
  });
});
