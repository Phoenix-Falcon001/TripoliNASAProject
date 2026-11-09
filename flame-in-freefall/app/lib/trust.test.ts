import { describe, expect, it } from "vitest";
import { cardFingerprint } from "./review";
import { makeCard } from "./testCards";
import { trustBadges } from "./trust";

const card = makeCard({ reviewed_by: "Bassam", auto_check: { quote_found: true } });
const fp = cardFingerprint(card as unknown as Record<string, unknown>);
const decision = (over = {}) => ({
  status: "verified" as const,
  reviewed_by: "Bassam" as const,
  fingerprint: fp,
  decided_at: "t",
  second_check: { by: "Reviewer 2" as const, result: "pass" as const, note: "", at: "t" },
  ...over,
});
const labels = (b: ReturnType<typeof trustBadges>) => b.map((x) => `${x.ok ? "+" : "-"}${x.label}`);

describe("trustBadges", () => {
  it("shows every check that was done", () => {
    expect(labels(trustBadges({ ...card, expert_checked: true }, decision()))).toEqual([
      "+Quote auto-verified on the page",
      "+Reviewed by Bassam",
      "+Second-checked by Reviewer 2",
      "+Source: Full paper",
      "+Expert-checked",
    ]);
  });
  it("is honest about what was not done", () => {
    const b = labels(trustBadges(makeCard({ source_type: "slides" }), undefined));
    expect(b).toEqual(["-Quote not auto-verified", "-Reviewer not recorded", "-Not second-checked", "-Source: Slides"]);
  });
  it("ignores a second check made on an older version or by the same person", () => {
    expect(labels(trustBadges(card, decision({ fingerprint: "old" })))[2]).toBe("-Not second-checked");
    expect(labels(trustBadges(card, decision({ second_check: { by: "Bassam", result: "pass", note: "", at: "t" } })))[2]).toBe("-Not second-checked");
    expect(labels(trustBadges(card, decision({ second_check: { by: "Rita", result: "fail", note: "x", at: "t" } })))[2]).toBe("-Not second-checked");
  });
});
