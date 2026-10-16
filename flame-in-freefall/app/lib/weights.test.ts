import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "./rank";
import { setWeight } from "./weights";

const total = (w: { crew: number; evid: number; mm: number }) => w.crew + w.evid + w.mm;

describe("setWeight", () => {
  it("keeps the total at 100 and the others in proportion", () => {
    const w = setWeight({ crew: 40, evid: 40, mm: 20 }, "crew", 70);
    expect(w).toEqual({ crew: 70, evid: 20, mm: 10 });
  });

  it("always sums to 100 for every key and value", () => {
    for (const key of ["crew", "evid", "mm"] as const) {
      for (let v = 0; v <= 100; v += 5) expect(total(setWeight(DEFAULT_WEIGHTS, key, v))).toBe(100);
    }
  });

  it("splits evenly when the other two are both 0", () => {
    expect(setWeight({ crew: 100, evid: 0, mm: 0 }, "crew", 60)).toEqual({ crew: 60, evid: 20, mm: 20 });
  });

  it("clamps out-of-range values", () => {
    expect(setWeight(DEFAULT_WEIGHTS, "mm", 150).mm).toBe(100);
    expect(setWeight(DEFAULT_WEIGHTS, "mm", -5).mm).toBe(0);
    expect(total(setWeight(DEFAULT_WEIGHTS, "mm", NaN))).toBe(100);
  });
});
