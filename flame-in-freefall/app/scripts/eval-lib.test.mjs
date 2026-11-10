import { describe, expect, it } from "vitest";
import { RESULT_COLUMNS, parseCsv, summarize, toResultRow, validateQuestions } from "./eval-lib.mjs";

const QHEAD = "id,question,answerable,expected_card_ids,notes\n";

describe("validateQuestions", () => {
  it("accepts a good file", () => {
    const { questions, errors } = validateQuestions(QHEAD + 'Q1,"How fast, really?",yes,SAF-001 FLX-002,demo\nQ2,Is it safe?,no,,\n');
    expect(errors).toEqual([]);
    expect(questions.map((q) => q.id)).toEqual(["Q1", "Q2"]);
  });
  it("reports missing columns, duplicates and bad values", () => {
    expect(validateQuestions("q_id,question\n").errors[0]).toMatch(/missing column "id"/);
    const { errors } = validateQuestions(QHEAD + "Q1,a,maybe,SAF-1,\nQ1,,yes,,\n");
    expect(errors.join(" | ")).toMatch(/answerable must be yes or no/);
    expect(errors.join(" | ")).toMatch(/bad card id SAF-1/);
    expect(errors.join(" | ")).toMatch(/duplicate id Q1/);
    expect(errors.join(" | ")).toMatch(/question is empty/);
  });
});

describe("toResultRow + summarize", () => {
  const qs = [
    { id: "Q1", question: "How fast?", answerable: "yes" },
    { id: "Q2", question: "Unknown thing?", answerable: "no" },
  ];
  const res = (mode, answer, flags, seconds = 2) => ({ mode, model: "m1", settings: { temperature: 0 }, answer, given_cards: [], flags, seconds });
  const csv = (rows) => parseCsv([RESULT_COLUMNS.join(","), ...rows].join("\n"));

  it("round-trips answers with commas and newlines", () => {
    const row = toResultRow(qs[0], res("cards", 'a, "b"\nc', { cited_cards: ["SAF-001"] }), "t1", false);
    const [parsed] = csv([row]);
    expect(parsed.answer).toBe('a, "b"\nc');
    expect(parsed.cited_cards).toBe("SAF-001");
    expect(parsed.sample_data).toBe("no");
  });

  it("compares plain vs cards and leaves unmeasured metrics null", () => {
    const rows = csv([
      toResultRow(qs[0], res("plain", "About 5 cm/s", { invented_vs_all: ["5"], cited_cards: [] }, 1), "t1", false),
      toResultRow(qs[1], res("plain", "Yes it is", { cited_cards: [] }, 3), "t1", false),
      toResultRow(qs[0], res("cards", "0.68 [SAF-001]", { cited_cards: ["SAF-001"] }, 4), "t1", false),
      toResultRow(qs[1], res("cards", "Not in our evidence.", { said_not_in_evidence: true, cited_cards: [] }, 2), "t1", false),
      toResultRow(qs[0], res("offline", "AI is offline", {}), "t1", false), // fallback: not in the comparison
    ]);
    const s = summarize(rows, qs, "now");
    expect(s.models.m1.plain).toMatchObject({ answers: 2, invented_numbers_pct: 50, cites_a_card_pct: 0, not_in_evidence_correct_pct: 0, median_seconds: 2 });
    expect(s.models.m1.cards).toMatchObject({ answers: 2, invented_numbers_pct: 0, cites_a_card_pct: 50, not_in_evidence_correct_pct: 100 });
    expect(s.models.m1.cards.verdict_correct_pct).toBeNull(); // nobody marked yet
    expect(s.models.m1.cards.human_marked).toBe(0);
  });

  it("uses the latest run per question and counts human verdicts", () => {
    const old = toResultRow(qs[0], res("cards", "old 99", { invented_vs_all: ["99"], cited_cards: [] }), "2026-11-01", false);
    const fresh = toResultRow(qs[0], res("cards", "new [SAF-001]", { cited_cards: ["SAF-001"] }), "2026-11-09", false);
    const rows = csv([old, fresh]);
    rows[1].human_verdict = "correct";
    const s = summarize(rows, qs, "now");
    expect(s.models.m1.cards).toMatchObject({ answers: 1, invented_numbers_pct: 0, human_marked: 1, verdict_correct_pct: 100, verdict_wrong_pct: 0 });
  });
});
