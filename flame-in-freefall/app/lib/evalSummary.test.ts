import { describe, expect, it } from "vitest";
import { headline, parseSummary } from "./evalSummary";

const m = (invented: number | null, sample = false) => ({
  answers: 2, invented_numbers_pct: invented, cites_a_card_pct: null, not_in_evidence_correct_pct: null, unanswerable_questions: 0,
  human_marked: 0, verdict_correct_pct: null, verdict_partly_pct: null, verdict_wrong_pct: null, median_seconds: null, sample_data: sample,
});

describe("evalSummary", () => {
  it("treats an empty or broken summary as not measured", () => {
    expect(parseSummary({ models: {} })).toBeNull();
    expect(parseSummary(null)).toBeNull();
    expect(headline(null)).toBeNull();
  });
  it("headline needs both modes measured", () => {
    const s = { generated_at: "x", questions: 2, models: { a: { plain: m(40) }, b: { plain: m(50), cards: m(0, true) } } };
    expect(headline(parseSummary(s))).toEqual({ model: "b", plain: 50, cards: 0, sample: true });
  });
});
