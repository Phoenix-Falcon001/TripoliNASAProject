// `npm run kpi`: prints K1–K16 (now / target / status) and writes docs/KPI.md.
// Reads only local files. Calculations live in kpi-lib.mjs (tested).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AjvModule from "ajv/dist/2020.js";
import { computeKpis, countRehearsals, parseCsv, toMarkdown } from "./kpi-lib.mjs";

const Ajv2020 = AjvModule.default ?? AjvModule;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = path.join(ROOT, "data");
const p = (...xs) => path.join(ROOT, ...xs);

const readJson = (f, fallback) => {
  if (!fs.existsSync(f)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch (e) {
    console.error(`⚠ ${path.relative(ROOT, f)} is not valid JSON: ${e.message}`);
    return fallback;
  }
};
const readCsv = (f) => (fs.existsSync(f) ? parseCsv(fs.readFileSync(f, "utf8")) : []);
const jsonFiles = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => re.test(f)).sort().map((f) => path.join(dir, f)) : []);

// Verified cards = valid against the schema AND status "verified" (same rule as the app).
const validate = new Ajv2020({ allErrors: true, allowUnionTypes: true }).compile(readJson(p("schema", "card.schema.json")));
const rawCards = readJson(path.join(DATA, "cards.json"), []);
const verified = (Array.isArray(rawCards) ? rawCards : []).filter((c) => validate(c) && c.status === "verified");

// Create the rehearsal log template the first time.
const rehearsalsFile = p("notes", "rehearsals.md");
if (!fs.existsSync(rehearsalsFile)) {
  fs.writeFileSync(
    rehearsalsFile,
    "# Demo rehearsals (K16)\n\nAdd one row per full, timed run-through. Date format YYYY-MM-DD.\n\n| Date | Who presented | Duration | What went wrong / to fix |\n|---|---|---|---|\n",
  );
}

const rows = computeKpis({
  verified,
  sources: readCsv(path.join(DATA, "sources.csv")),
  checkedDrafts: jsonFiles(path.join(DATA, "drafts"), /_checked\.json$/).flatMap((f) => readJson(f, [])),
  decisions: Object.assign({}, ...jsonFiles(path.join(DATA, "review"), /_decisions\.json$/).map((f) => readJson(f, {}))),
  questions: readCsv(path.join(DATA, "eval", "questions.csv")),
  results: readCsv(path.join(DATA, "eval", "results.csv")),
  demoAnswers: readJson(path.join(DATA, "demo_answers.json"), []),
  aiCache: readJson(path.join(DATA, "ai_cache.json"), {}),
  preflight: readJson(p("notes", "preflight_last.json"), null),
  rehearsals: countRehearsals(fs.readFileSync(rehearsalsFile, "utf8")),
});

const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
fs.mkdirSync(p("docs"), { recursive: true });
fs.writeFileSync(p("docs", "KPI.md"), toMarkdown(rows, now));

const w = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(`KPI dashboard — ${now}\n`);
console.log(`${w("KPI", 4)} ${w("What", 46)} ${w("Now", 24)} ${w("Target", 24)} Status`);
for (const r of rows) console.log(`${w(r.id, 4)} ${w(r.name, 46)} ${w(r.now, 24)} ${w(r.target, 24)} ${r.status}`);
console.log(`\nWrote ${path.relative(process.cwd(), p("docs", "KPI.md"))}`);
