// Drafts AI text for a person to check (Rita runs it; Bassam checks):
//   - data/ai_cache.json: an explanation for each of the top-10 ranked verified cards
//   - data/demo_answers.json: answers for the questions marked "demo" in the notes column
//     of data/eval/questions.csv (the exact Ask path, so they cite cards)
// Every entry is written with "checked_by": null; the app shows it only once a person sets
// checked_by (e.g. "Bassam") after checking every claim and number against the cards.
// Entries that are already checked are never overwritten.
//
//   npm run ai:drafts                       # app must be running (npm run dev), Ollama up
//   npm run ai:drafts -- --url http://localhost:3001 --model qwen2.5:7b
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQuestions } from "./eval-lib.mjs";
import { rankDefault } from "./kpi-lib.mjs";

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const args = process.argv.slice(2);
const flag = (n) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : undefined);
const url = flag("--url") ?? "http://localhost:3000";
const model = flag("--model") ?? process.env.OLLAMA_MODEL ?? "llama3.1:8b";
const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : d);

async function call(body) {
  const res = await fetch(`${url}/api/eval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, model }) });
  const r = await res.json();
  if (!res.ok) throw new Error(r.error ?? `HTTP ${res.status}`);
  return r;
}

const verified = readJson(path.join(DATA, "cards.json"), []).filter((c) => c.status === "verified");
if (verified.length === 0) {
  console.log("No verified cards yet: nothing to explain. Promote cards first.");
  process.exit(0);
}
const now = new Date().toISOString();

// 1. Explanations for the top 10
const cacheFile = path.join(DATA, "ai_cache.json");
const cache = readJson(cacheFile, {});
for (const c of rankDefault(verified).slice(0, 10)) {
  if (cache[c.card_id]?.checked_by) {
    console.log(`  ${c.card_id}: already checked, kept`);
    continue;
  }
  try {
    const r = await call({ mode: "explain", card_id: c.card_id });
    const warn = r.flags.invented_vs_given.length ? `  ⚠ numbers not on the card: ${r.flags.invented_vs_given.join(", ")}` : "";
    cache[c.card_id] = { text: r.answer, checked_by: null, model: r.model, drafted_at: now };
    console.log(`  ${c.card_id}: drafted${warn}`);
  } catch (e) {
    console.log(`  ${c.card_id}: FAILED ${e.message}`);
  }
}
fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2) + "\n");

// 2. Demo answers
const { questions } = validateQuestions(fs.readFileSync(path.join(DATA, "eval", "questions.csv"), "utf8"));
const demoQs = questions.filter((q) => /\bdemo\b/i.test(q.notes ?? ""));
const demoFile = path.join(DATA, "demo_answers.json");
let demo = readJson(demoFile, []).filter((d) => !(d.card_ids ?? []).some((id) => String(id).startsWith("DEMO-")));
for (const q of demoQs) {
  if (demo.some((d) => d.question === q.question && d.checked_by)) {
    console.log(`  "${q.question}": already checked, kept`);
    continue;
  }
  try {
    const r = await call({ mode: "cards", question: q.question });
    const cited = r.flags.cited_cards.filter((id) => r.given_cards.includes(id));
    if (r.mode !== "cards" || cited.length === 0) {
      console.log(`  "${q.question}": skipped (${r.mode === "cards" ? "answer cites no given card" : r.mode})`);
      continue;
    }
    demo = demo.filter((d) => d.question !== q.question);
    demo.push({ question: q.question, answer: r.answer, card_ids: cited, checked_by: null, model: r.model, drafted_at: now });
    console.log(`  "${q.question}": drafted (cites ${cited.join(", ")})`);
  } catch (e) {
    console.log(`  "${q.question}": FAILED ${e.message}`);
  }
}
fs.writeFileSync(demoFile, JSON.stringify(demo, null, 2) + "\n");
if (demoQs.length === 0) console.log('No demo questions: put "demo" in the notes column of data/eval/questions.csv.');
console.log('\nNow check every entry against its cards and set "checked_by": "Bassam" in ai_cache.json / demo_answers.json.');
