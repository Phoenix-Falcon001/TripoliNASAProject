import { describe, expect, it } from "vitest";
import { STATUS, computeKpis, countRehearsals, fingerprint, parseCsv, toMarkdown } from "./kpi-lib.mjs";

const card = (id, over = {}) => ({
  card_id: id,
  source_id: "S01",
  page: 1,
  evidence_quote: "q",
  finding: "f",
  hazard: "flame_spread",
  control_category: "prevent",
  scores: { crew_safety: 3, evidence: 3, moon_mars: 3 },
  score_reasons: { crew_safety: "r", evidence: "r", moon_mars: "r" },
  source_type: "full_paper",
  status: "verified",
  ...over,
});

const empty = {
  verified: [],
  sources: [],
  checkedDrafts: [],
  decisions: {},
  questions: [],
  results: [],
  demoAnswers: [],
  aiCache: {},
  preflight: null,
  rehearsals: 0,
};
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));

describe("computeKpis", () => {
  it("returns K1–K16 and reports 'not measured' instead of guessing when there is no data", () => {
    const k = byId(computeKpis(empty));
    expect(Object.keys(k)).toEqual(Array.from({ length: 16 }, (_, i) => `K${i + 1}`));
    for (const id of ["K4", "K5", "K10", "K11", "K12", "K14", "K15"]) {
      expect(k[id].now).toBe("not measured");
      expect(k[id].status).toBe(STATUS.notMeasured);
    }
    expect(k.K1).toMatchObject({ now: "0", status: STATUS.notStarted });
  });

  it("counts verified cards, experiments, open questions and links", () => {
    const sources = [
      { source_id: "S01", experiment: "SAFFIRE" },
      { source_id: "S02", experiment: "FLEX" },
      { source_id: "S03", experiment: "BASS-II" },
    ];
    const verified = [
      card("SAF-001", { open_question: "?", related_cards: [{ card_id: "FLX-001", relation: "conflicts" }, { card_id: "SAF-999", relation: "agrees" }] }),
      card("FLX-001", { source_id: "S02" }),
    ];
    const k = byId(computeKpis({ ...empty, verified, sources }));
    expect(k.K1.now).toBe("2");
    expect(k.K2).toMatchObject({ now: "2/3", status: STATUS.progress });
    expect(k.K3).toMatchObject({ now: "3", status: STATUS.met });
    expect(k.K6.now).toBe("1");
    expect(k.K7.now).toBe("1 links, 1 conflicts"); // link to unverified SAF-999 not counted
  });

  it("K4 counts only decisions that still match the card", () => {
    const a = card("SAF-001", { status: "draft" });
    const b = card("SAF-002", { status: "draft" });
    const decisions = {
      "SAF-001": { status: "verified", fingerprint: fingerprint(a) },
      "SAF-002": { status: "verified", fingerprint: "stale" },
    };
    expect(byId(computeKpis({ ...empty, checkedDrafts: [a, b], decisions })).K4.now).toBe("50% (1/2)");
  });

  it("K5 counts passed second checks by a different person", () => {
    const verified = ["SAF-001", "SAF-002", "SAF-003", "SAF-004", "SAF-005"].map((id) => card(id));
    const decisions = {
      "SAF-001": { reviewed_by: "Bassam", second_check: { by: "Reviewer 2", result: "pass" } },
      "SAF-002": { reviewed_by: "Bassam", second_check: { by: "Bassam", result: "pass" } }, // same person
      "SAF-003": { reviewed_by: "Bassam", second_check: { by: "Reviewer 2", result: "fail" } },
    };
    expect(byId(computeKpis({ ...empty, verified, decisions })).K5).toMatchObject({ now: "20% (1/5)", status: STATUS.met });
  });

  it("K8–K12 read questions and cards-mode results only", () => {
    const questions = [
      { q_id: "Q1", answerable: "yes" },
      { q_id: "Q2", answerable: "no" },
    ];
    const results = [
      { q_id: "Q1", mode: "ollama", model: "m1", invented_number: "yes", cited_source: "yes", said_not_in_evidence: "no" },
      { q_id: "Q2", mode: "cards", model: "m1", invented_number: "no", cited_source: "no", said_not_in_evidence: "yes" },
      { q_id: "Q1", mode: "plain", model: "m2", invented_number: "yes", cited_source: "no", said_not_in_evidence: "no" },
      { q_id: "Q1", mode: "offline", model: "", invented_number: "no", cited_source: "no", said_not_in_evidence: "no" },
    ];
    const k = byId(computeKpis({ ...empty, questions, results }));
    expect(k.K8.now).toBe("2 (1 unanswerable)");
    expect(k.K9).toMatchObject({ now: "2", status: STATUS.met });
    expect(k.K10.now).toBe("50% (1/2)");
    expect(k.K11.now).toBe("50% (1/2)");
    expect(k.K12).toMatchObject({ now: "100% (1/1)", status: STATUS.met });
  });

  it("K13 ignores sample and unchecked answers; K14 needs checked_by on top-10 entries", () => {
    const verified = [card("SAF-001"), card("SAF-002")];
    const demoAnswers = [
      { question: "a", answer: "x", card_ids: ["SAF-001"] },
      { question: "b", answer: "x", card_ids: ["DEMO-001"] },
      { question: "c", answer: "x", card_ids: ["SAF-002"], checked_by: null },
    ];
    const aiCache = { "SAF-001": { text: "t", checked_by: "Bassam" }, "SAF-002": "plain text" };
    const k = byId(computeKpis({ ...empty, verified, demoAnswers, aiCache }));
    expect(k.K13.now).toBe("1");
    expect(k.K14).toMatchObject({ now: "1/2", status: STATUS.progress });
  });

  it("K15 and K16 read the preflight result and rehearsal count", () => {
    const k = byId(computeKpis({ ...empty, preflight: { ready: true, fails: 0, checked_at: "2026-10-30T10:00:00Z" }, rehearsals: 2 }));
    expect(k.K15).toMatchObject({ now: "READY on 2026-10-30", status: STATUS.met });
    expect(k.K16).toMatchObject({ now: "2", status: STATUS.met });
  });
});

describe("helpers", () => {
  it("fingerprint matches the Python/TypeScript fixture", () => {
    const fixture = {
      card_id: "SAF-001",
      page: 3,
      finding: 'Flame spread ~2 cm/s — slower "than" Earth é',
      status: "draft",
      values: [{ unit: "cm/s", value: "~2", quantity: "rate" }],
      team_interpretation: null,
    };
    expect(fingerprint(fixture)).toBe("bfce6b1ae0561f67");
  });

  it("countRehearsals counts dated table rows only", () => {
    const md = "| Date | Who |\n|---|---|\n| 2026-10-30 | Nermine |\n| | |\n| 2026-10-31 | Rita |\n";
    expect(countRehearsals(md)).toBe(2);
  });

  it("parseCsv handles quoted titles with commas", () => {
    expect(parseCsv('source_id,title\nS01,"Fire, in space"\n')).toEqual([{ source_id: "S01", title: "Fire, in space" }]);
  });

  it("toMarkdown renders one table row per KPI", () => {
    const md = toMarkdown(computeKpis(empty), "2026-10-27");
    expect(md.split("\n").filter((l) => /^\| K\d+ /.test(l))).toHaveLength(16);
  });
});
