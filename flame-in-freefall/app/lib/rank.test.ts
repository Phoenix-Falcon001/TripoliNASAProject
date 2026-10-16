import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, formatScore, rankCards, score } from "./rank";
import { makeCard } from "./testCards";

describe("score", () => {
  it("uses the default 40/35/25 weights", () => {
    expect(DEFAULT_WEIGHTS).toEqual({ crew: 40, evid: 35, mm: 25 });
    // (40·5 + 35·3 + 25·1) / 100 = 3.3
    expect(score({ crew_safety: 5, evidence: 3, moon_mars: 1 })).toBeCloseTo(3.3);
  });

  it("gives 5 when every score is 5 and 1 when every score is 1", () => {
    expect(score({ crew_safety: 5, evidence: 5, moon_mars: 5 })).toBeCloseTo(5);
    expect(score({ crew_safety: 1, evidence: 1, moon_mars: 1 })).toBeCloseTo(1);
  });

  it("respects custom weights", () => {
    expect(score({ crew_safety: 5, evidence: 1, moon_mars: 1 }, { crew: 60, evid: 20, mm: 20 })).toBeCloseTo(3.4);
  });

  it("rejects weights that do not sum to 100", () => {
    expect(() => score({ crew_safety: 1, evidence: 1, moon_mars: 1 }, { crew: 50, evid: 50, mm: 10 })).toThrow(/sum to 100/);
  });

  it("rejects negative or non-numeric weights", () => {
    expect(() => score({ crew_safety: 1, evidence: 1, moon_mars: 1 }, { crew: 110, evid: -10, mm: 0 })).toThrow(/non-negative/);
    expect(() => score({ crew_safety: 1, evidence: 1, moon_mars: 1 }, { crew: NaN, evid: 50, mm: 50 })).toThrow();
  });
});

describe("rankCards", () => {
  const a = makeCard({ card_id: "SAF-002", scores: { crew_safety: 5, evidence: 5, moon_mars: 5 } });
  const b = makeCard({ card_id: "FLX-001", scores: { crew_safety: 1, evidence: 1, moon_mars: 1 } });
  const c = makeCard({ card_id: "BAS-003", scores: { crew_safety: 3, evidence: 3, moon_mars: 3 } });

  it("sorts by score, highest first, with 1-based ranks", () => {
    const ranked = rankCards([b, c, a]);
    expect(ranked.map((r) => r.card.card_id)).toEqual(["SAF-002", "BAS-003", "FLX-001"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranked[0].score).toBeCloseTo(5);
  });

  it("breaks ties by card_id so the order is deterministic", () => {
    const s = { crew_safety: 4, evidence: 4, moon_mars: 4 };
    const x = makeCard({ card_id: "SAF-010", scores: s });
    const y = makeCard({ card_id: "BAS-001", scores: s });
    const z = makeCard({ card_id: "FLX-005", scores: s });
    expect(rankCards([x, y, z]).map((r) => r.card.card_id)).toEqual(["BAS-001", "FLX-005", "SAF-010"]);
    expect(rankCards([z, x, y]).map((r) => r.card.card_id)).toEqual(["BAS-001", "FLX-005", "SAF-010"]);
  });

  it("changes order when weights change", () => {
    const crewHeavy = makeCard({ card_id: "SAF-001", scores: { crew_safety: 5, evidence: 1, moon_mars: 1 } });
    const mmHeavy = makeCard({ card_id: "SAF-002", scores: { crew_safety: 1, evidence: 1, moon_mars: 5 } });
    expect(rankCards([crewHeavy, mmHeavy], { crew: 60, evid: 20, mm: 20 })[0].card.card_id).toBe("SAF-001");
    expect(rankCards([crewHeavy, mmHeavy], { crew: 20, evid: 20, mm: 60 })[0].card.card_id).toBe("SAF-002");
  });

  it("does not mutate the input array", () => {
    const input = [b, c, a];
    rankCards(input);
    expect(input.map((x) => x.card_id)).toEqual(["FLX-001", "BAS-003", "SAF-002"]);
  });

  it("returns an empty list for no cards", () => {
    expect(rankCards([])).toEqual([]);
  });
});

describe("formatScore", () => {
  it("shows two decimals", () => {
    expect(formatScore(3.3)).toBe("3.30");
  });
});
