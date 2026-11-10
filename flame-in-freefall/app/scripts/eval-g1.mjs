// G1 accuracy test: "plain AI" vs "our evidence" on the SAME model and settings.
//
//   npm run eval:g1                                   # model from OLLAMA_MODEL (or llama3.1:8b)
//   npm run eval:g1 -- --models llama3.1:8b,qwen2.5:7b
//   npm run eval:g1 -- --url http://localhost:3001 --allow-sample
//   npm run eval:summary                              # recompute summary.json after marking verdicts
//
// Needs the app running (npm run dev or npm start) and Ollama. For every question in
// data/eval/questions.csv and every model, runs mode "plain" (question only) and mode
// "cards" (the exact Ask path) via the app's /api/eval, appends rows to
// data/eval/results.csv, and writes data/eval/summary.json. Humans then fill human_verdict
// (correct / partly / wrong) and marked_by, and run `npm run eval:summary`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RESULT_COLUMNS, parseCsv, summarize, toResultRow, validateQuestions } from "./eval-lib.mjs";

const EVAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "eval");
const QUESTIONS = path.join(EVAL, "questions.csv");
const RESULTS = path.join(EVAL, "results.csv");
const SUMMARY = path.join(EVAL, "summary.json");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const url = flag("--url") ?? "http://localhost:3000";
const models = (flag("--models") ?? process.env.OLLAMA_MODEL ?? "llama3.1:8b").split(",").map((m) => m.trim()).filter(Boolean);
const allowSample = args.includes("--allow-sample");
const summaryOnly = args.includes("--summary-only");

const { questions, errors } = validateQuestions(fs.existsSync(QUESTIONS) ? fs.readFileSync(QUESTIONS, "utf8") : "");
if (errors.length) {
  console.error("Fix data/eval/questions.csv first:\n  " + errors.join("\n  "));
  process.exit(1);
}

function writeSummary() {
  const results = fs.existsSync(RESULTS) ? parseCsv(fs.readFileSync(RESULTS, "utf8")) : [];
  const s = summarize(results, questions, new Date().toISOString());
  fs.writeFileSync(SUMMARY, JSON.stringify(s, null, 2) + "\n");
  console.log(`\nWrote ${path.relative(process.cwd(), SUMMARY)}`);
  for (const [model, modes] of Object.entries(s.models)) {
    for (const [mode, m] of Object.entries(modes)) {
      const f = (v) => (v === null ? "not measured" : `${v}%`);
      console.log(`  ${model} · ${mode.padEnd(5)}  invented numbers ${f(m.invented_numbers_pct)} · cites a card ${f(m.cites_a_card_pct)} · ` +
        `"Not in our evidence" on unanswerable ${f(m.not_in_evidence_correct_pct)} · median ${m.median_seconds ?? "-"} s`);
    }
  }
}

if (summaryOnly) {
  writeSummary();
  process.exit(0);
}
if (questions.length === 0) {
  console.log("data/eval/questions.csv has no questions yet (columns: id,question,answerable,expected_card_ids,notes).");
  process.exit(0);
}

const header = RESULT_COLUMNS.join(",");
if (!fs.existsSync(RESULTS) || fs.readFileSync(RESULTS, "utf8").split(/\r?\n/)[0] !== header) {
  if (fs.existsSync(RESULTS) && parseCsv(fs.readFileSync(RESULTS, "utf8")).length > 0) {
    fs.renameSync(RESULTS, RESULTS.replace(/\.csv$/, `.old-${Date.now()}.csv`));
    console.log("Old results.csv had different columns; kept it as results.old-*.csv");
  }
  fs.writeFileSync(RESULTS, header + "\n");
}

const runAt = new Date().toISOString();
let failed = 0;
for (const model of models) {
  console.log(`\nModel ${model}`);
  for (const q of questions) {
    for (const mode of ["plain", "cards"]) {
      process.stdout.write(`  ${q.id} ${mode.padEnd(5)} ... `);
      try {
        const res = await fetch(`${url}/api/eval`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, question: q.question, model, allow_sample: allowSample }),
        });
        const r = await res.json();
        if (!res.ok) throw new Error(r.error ?? `HTTP ${res.status}`);
        fs.appendFileSync(RESULTS, toResultRow(q, r, runAt, allowSample) + "\n");
        const inv = r.flags.invented_vs_all.length ? ` · numbers not in our evidence: ${r.flags.invented_vs_all.join(", ")}` : "";
        console.log(`${r.mode}${r.seconds != null ? ` (${r.seconds.toFixed(1)} s)` : ""}${inv}`);
      } catch (e) {
        failed++;
        console.log(`FAILED: ${e.message}`);
        if (/fetch failed|ECONNREFUSED/.test(e.message)) {
          console.error(`\nThe app is not running at ${url}. Start it with: npm run dev`);
          process.exit(1);
        }
      }
    }
  }
}
writeSummary();
console.log(`\nNext: open data/eval/results.csv, fill human_verdict (correct/partly/wrong) and marked_by, then run: npm run eval:summary`);
process.exit(failed ? 1 : 0);
