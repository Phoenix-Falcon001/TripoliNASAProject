// G1 accuracy test. Sends every question in data/eval/questions.csv to the running
// app's /api/ask (same retrieval + same strict prompt as the Ask page) and appends
// one row per question to data/eval/results.csv.
//
// Usage (app must be running, e.g. `npm run dev` in another terminal):
//   npm run eval:g1                       # uses http://localhost:3000
//   npm run eval:g1 -- http://localhost:3001
//
// Columns filled automatically: q_id, mode, model, answer, invented_number,
// cited_source, said_not_in_evidence. A human then fills verdict and marked_by.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = path.resolve(here, "..", "..", "data", "eval");
const BASE = process.argv[2] ?? "http://localhost:3000";
const COLS = ["q_id", "mode", "model", "answer", "verdict", "invented_number", "cited_source", "said_not_in_evidence", "marked_by"];

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim()));
  return header ? body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()]))) : [];
}

const csvField = (s) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const yn = (b) => (b ? "yes" : "no");

/** Numbers in the answer that appear nowhere in the cards it was given (card IDs ignored). */
function inventedNumbers(answer, cards) {
  const cardText = JSON.stringify(cards);
  const nums = answer.replace(/\[(SAF|FLX|BAS|DEMO)-\d{3}\]/g, "").match(/\d+(?:[.,]\d+)*/g) ?? [];
  return nums.filter((n) => !cardText.includes(n) && !cardText.includes(n.replace(/,/g, "")));
}

async function ask(question) {
  const res = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  let cards = [], mode = "", model = "", answer = "";
  for (const line of (await res.text()).split("\n")) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    if (e.type === "cards") cards = e.cards;
    else if (e.type === "ai") { mode = "ollama"; model = e.model; }
    else if (e.type === "token") answer += e.text;
    else if (e.type === "fallback") { mode = e.mode; answer = e.text; }
    else if (e.type === "error") answer += `\n[ERROR: ${e.message}]`;
  }
  return { cards, mode, model, answer };
}

const questions = parseCsv(fs.readFileSync(path.join(EVAL_DIR, "questions.csv"), "utf8"));
if (questions.length === 0) {
  console.log("data/eval/questions.csv has no questions yet. Add rows: Q_id,question,answerable,expected_answer,expected_cards");
  process.exit(0);
}

const out = path.join(EVAL_DIR, "results.csv");
if (!fs.existsSync(out) || !fs.readFileSync(out, "utf8").trim()) fs.writeFileSync(out, COLS.join(",") + "\n");

for (const q of questions) {
  const id = q.Q_id ?? q.q_id ?? "";
  process.stdout.write(`${id}: ${q.question} ... `);
  try {
    const r = await ask(q.question);
    const invented = inventedNumbers(r.answer, r.cards);
    const row = {
      q_id: id,
      mode: r.mode,
      model: r.model,
      answer: r.answer.trim(),
      verdict: "",
      invented_number: yn(invented.length > 0),
      cited_source: yn(/\[(SAF|FLX|BAS|DEMO)-\d{3}\]/.test(r.answer)),
      said_not_in_evidence: yn(/not in our evidence/i.test(r.answer)),
      marked_by: "",
    };
    fs.appendFileSync(out, COLS.map((c) => csvField(row[c])).join(",") + "\n");
    console.log(`${r.mode}${invented.length ? ` (numbers not in cards: ${invented.join(", ")})` : ""}`);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }
}
console.log(`\nAppended to ${path.relative(process.cwd(), out)}. Now fill in 'verdict' and 'marked_by' by hand.`);
