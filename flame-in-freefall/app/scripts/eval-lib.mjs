// G1 test helpers (pure, tested in eval-lib.test.mjs): questions file checks, result rows,
// and the summary written to data/eval/summary.json. Never fills a metric that wasn't measured.
import { parseCsv } from "./kpi-lib.mjs";

export { parseCsv };

export const QUESTION_COLUMNS = ["id", "question", "answerable", "expected_card_ids", "notes"];
export const RESULT_COLUMNS = [
  "run_at", "id", "mode", "model", "settings", "question", "answer", "given_cards", "cited_cards",
  "invented_vs_given", "invented_vs_all", "missing_citation", "said_not_in_evidence", "seconds",
  "sample_data", "human_verdict", "marked_by",
];
export const VERDICTS = ["correct", "partly", "wrong"];
const CARD_ID = /^(SAF|FLX|BAS|DEMO)-\d{3}$/;

/** Checks data/eval/questions.csv. Returns { questions, errors }. */
export function validateQuestions(text) {
  const errors = [];
  const header = (text.replace(/^﻿/, "").split(/\r?\n/)[0] ?? "").split(",").map((h) => h.trim());
  for (const c of QUESTION_COLUMNS) if (!header.includes(c)) errors.push(`questions.csv is missing column "${c}"`);
  const rows = parseCsv(text);
  const seen = new Set();
  rows.forEach((r, i) => {
    const where = `questions.csv row ${i + 2}`;
    if (!r.id) errors.push(`${where}: id is empty`);
    else if (seen.has(r.id)) errors.push(`${where}: duplicate id ${r.id}`);
    seen.add(r.id);
    if (!r.question) errors.push(`${where}: question is empty`);
    if (!/^(yes|no)$/i.test(r.answerable ?? "")) errors.push(`${where}: answerable must be yes or no`);
    for (const id of splitIds(r.expected_card_ids)) if (!CARD_ID.test(id)) errors.push(`${where}: bad card id ${id}`);
  });
  return { questions: rows, errors };
}

export function splitIds(s) {
  return (s ?? "").split(/[\s;,]+/).map((x) => x.trim()).filter(Boolean);
}

const csvField = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toResultRow(q, r, runAt, sample) {
  const row = {
    run_at: runAt,
    id: q.id,
    mode: r.mode,
    model: r.model,
    settings: JSON.stringify(r.settings ?? {}),
    question: q.question,
    answer: (r.answer ?? "").trim(),
    given_cards: (r.given_cards ?? []).join(" "),
    cited_cards: (r.flags?.cited_cards ?? []).join(" "),
    invented_vs_given: (r.flags?.invented_vs_given ?? []).join(" "),
    invented_vs_all: (r.flags?.invented_vs_all ?? []).join(" "),
    missing_citation: r.flags?.missing_citation ? "yes" : "no",
    said_not_in_evidence: r.flags?.said_not_in_evidence ? "yes" : "no",
    seconds: r.seconds == null ? "" : r.seconds.toFixed(1),
    sample_data: sample ? "yes" : "no",
    human_verdict: "",
    marked_by: "",
  };
  return RESULT_COLUMNS.map((c) => csvField(row[c])).join(",");
}

const pct = (n, d) => (d === 0 ? null : Math.round((1000 * n) / d) / 10);
function median(xs) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
}

/**
 * Per model and mode ("plain" vs "cards"), using the latest row for each question.
 * Metrics are null when they cannot be measured (e.g. no unanswerable questions, no human verdicts).
 */
export function summarize(results, questions, generatedAt) {
  const answerable = new Map(questions.map((q) => [q.id, /^yes$/i.test(q.answerable ?? "")]));
  const latest = new Map();
  for (const r of results) {
    if (r.mode !== "plain" && r.mode !== "cards") continue;
    const key = `${r.model}|${r.mode}|${r.id}`;
    if (!latest.has(key) || (latest.get(key).run_at ?? "") <= (r.run_at ?? "")) latest.set(key, r);
  }
  const models = {};
  for (const r of latest.values()) {
    ((models[r.model] ??= {})[r.mode] ??= []).push(r);
  }
  const out = {};
  for (const [model, modes] of Object.entries(models)) {
    out[model] = {};
    for (const [mode, rows] of Object.entries(modes)) {
      const unans = rows.filter((r) => answerable.get(r.id) === false);
      const marked = rows.filter((r) => VERDICTS.includes((r.human_verdict ?? "").trim().toLowerCase()));
      const verdict = (v) => pct(marked.filter((r) => r.human_verdict.trim().toLowerCase() === v).length, marked.length);
      const secs = rows.map((r) => parseFloat(r.seconds)).filter((x) => Number.isFinite(x));
      out[model][mode] = {
        answers: rows.length,
        invented_numbers_pct: pct(rows.filter((r) => (r.invented_vs_all ?? "").trim() !== "").length, rows.length),
        cites_a_card_pct: pct(rows.filter((r) => (r.cited_cards ?? "").trim() !== "").length, rows.length),
        not_in_evidence_correct_pct: pct(unans.filter((r) => r.said_not_in_evidence === "yes").length, unans.length),
        unanswerable_questions: unans.length,
        human_marked: marked.length,
        verdict_correct_pct: verdict("correct"),
        verdict_partly_pct: verdict("partly"),
        verdict_wrong_pct: verdict("wrong"),
        median_seconds: median(secs),
        sample_data: rows.some((r) => r.sample_data === "yes"),
      };
    }
  }
  return {
    generated_at: generatedAt,
    note: "invented_numbers_pct = answers containing a number that is in no verified card. null = not measured.",
    questions: questions.length,
    models: out,
  };
}
