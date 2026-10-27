import { describe, expect, it } from "vitest";
import { stability, weightCombos } from "./stability";
import { makeCard } from "./testCards";

describe("weightCombos", () => {
  const combos = weightCombos();
  it("has 27 combinations, each 10–60 in steps of 10, summing to 100", () => {
    expect(combos).toHaveLength(27);
    for (const w of combos) {
      expect(w.crew + w.evid + w.mm).toBe(100);
      for (const x of [w.crew, w.evid, w.mm]) {
        expect(x).toBeGreaterThanOrEqual(10);
        expect(x).toBeLessThanOrEqual(60);
        expect(x % 10).toBe(0);
      }
    }
  });
  it("has no duplicates", () => {
    expect(new Set(combos.map((w) => `${w.crew}/${w.evid}/${w.mm}`)).size).toBe(27);
  });
});

describe("stability", () => {
  const id = (n: number) => `SAF-${String(n).padStart(3, "0")}`;

  it("marks every card Stable when there are no more cards than the top N", () => {
    const cards = [1, 2, 3].map((n) => makeCard({ card_id: id(n) }));
    const s = stability(cards);
    for (const c of cards) expect(s.get(c.card_id)).toEqual({ share: 1, label: "Stable" });
  });

  it("separates always-top, never-top and priority-dependent cards", () => {
    const top = makeCard({ card_id: id(1), scores: { crew_safety: 5, evidence: 5, moon_mars: 5 } });
    const bottom = makeCard({ card_id: id(2), scores: { crew_safety: 1, evidence: 1, moon_mars: 1 } });
    // Strong only on Moon/Mars: in the top 2 only when moon_mars weight is high.
    const mmOnly = makeCard({ card_id: id(3), scores: { crew_safety: 1, evidence: 1, moon_mars: 5 } });
    // Middle card: 3/3/3.
    const mid = makeCard({ card_id: id(4), scores: { crew_safety: 3, evidence: 3, moon_mars: 3 } });
    const s = stability([top, bottom, mmOnly, mid], 2);
    expect(s.get(id(1))).toEqual({ share: 1, label: "Stable" });
    expect(s.get(id(2))).toEqual({ share: 0, label: "Depends on priorities" });
    const mm = s.get(id(3))!;
    const md = s.get(id(4))!;
    // Exactly one of mmOnly / mid takes the 2nd slot in each combo.
    expect(mm.share + md.share).toBeCloseTo(1);
    expect(mm.share).toBeGreaterThan(0);
    expect(mm.label).toBe("Depends on priorities");
  });

  it("uses >= threshold for Stable", () => {
    const a = makeCard({ card_id: id(1) });
    expect(stability([a], 1, 1).get(id(1))?.label).toBe("Stable");
  });

  it("is deterministic regardless of input order", () => {
    const cards = [5, 3, 1, 4, 2].map((n) =>
      makeCard({ card_id: id(n), scores: { crew_safety: n, evidence: 6 - n, moon_mars: 3 } }),
    );
    const s1 = stability(cards, 2);
    const s2 = stability([...cards].reverse(), 2);
    expect([...s1.entries()].sort()).toEqual([...s2.entries()].sort());
  });
});
