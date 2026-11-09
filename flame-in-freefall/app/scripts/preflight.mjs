// Demo-day pre-flight check. Run from app/:
//   npm run preflight                          # checks files, build, telemetry, Ollama
//   npm run preflight -- http://localhost:3000 # also checks the running app
//
// ✅ ok · ⚠️ works but worth fixing · ❌ fix before the demo. Exit code 1 if any ❌.
// Runs fully offline (only talks to localhost).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AjvModule from "ajv/dist/2020.js";

const Ajv2020 = AjvModule.default ?? AjvModule;
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(APP, "..");
const DATA = path.join(ROOT, "data");
const OLLAMA = "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL?.trim() || "llama3.1:8b";
const APP_URL = process.argv[2];
const TARGET_CARDS = 30;

const results = [];
const ok = (msg) => results.push(["✅", msg]);
const warn = (msg) => results.push(["⚠️ ", msg]);
const fail = (msg) => results.push(["❌", msg]);
const section = (name) => results.push(["", `\n${name}`]);

const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = (lines.shift() ?? "").split(",").map((h) => h.trim());
  // Only the first column (source_id) and experiment are needed here; titles may contain commas.
  return lines.map((l) => {
    const cells = l.split(",");
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
}

async function fetchWithTimeout(url, opts = {}, ms = 3000) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
}

// ---------- 1. Data ----------
section("Data");
let verified = [];
try {
  const schema = readJson(path.join(ROOT, "schema", "card.schema.json"));
  const validate = new Ajv2020({ allErrors: true, allowUnionTypes: true }).compile(schema);
  const raw = readJson(path.join(DATA, "cards.json"), null);
  if (!Array.isArray(raw)) fail("data/cards.json is missing or not a JSON array");
  else if (raw.length === 0) fail("data/cards.json is empty — the app will show SAMPLE DATA");
  else {
    const invalid = raw.filter((c) => !validate(c));
    verified = raw.filter((c) => validate(c) && c.status === "verified");
    if (invalid.length) fail(`${invalid.length} card(s) in cards.json fail the schema: ${invalid.map((c) => c.card_id ?? "?").join(", ")}`);
    const notVerified = raw.length - invalid.length - verified.length;
    if (notVerified) warn(`${notVerified} card(s) in cards.json are not "verified" and will be hidden`);
    (verified.length >= TARGET_CARDS ? ok : warn)(`${verified.length} verified cards (target ${TARGET_CARDS})`);
  }
} catch (e) {
  fail(`Could not read cards: ${e.message}`);
}

const sources = fs.existsSync(path.join(DATA, "sources.csv"))
  ? parseCsv(fs.readFileSync(path.join(DATA, "sources.csv"), "utf8"))
  : [];
const sourceIds = new Set(sources.map((s) => s.source_id));
const ids = new Set(verified.map((c) => c.card_id));
if (verified.length) {
  const noSource = verified.filter((c) => !sourceIds.has(c.source_id));
  if (noSource.length) fail(`Cards with a source_id not in sources.csv: ${noSource.map((c) => c.card_id).join(", ")}`);
  else ok("Every card's source is in sources.csv");
  const exps = new Set(verified.map((c) => sources.find((s) => s.source_id === c.source_id)?.experiment).filter(Boolean));
  (exps.size >= 3 ? ok : warn)(`Experiments covered: ${[...exps].join(", ") || "none"}`);
  const dangling = verified.flatMap((c) => (c.related_cards ?? []).filter((r) => !ids.has(r.card_id)).map((r) => `${c.card_id}→${r.card_id}`));
  if (dangling.length) warn(`Related cards that are not verified: ${dangling.join(", ")}`);
  const withOpen = verified.filter((c) => c.open_question).length;
  (withOpen ? ok : warn)(`${withOpen} cards have an open question (the "What NASA doesn't know" page)`);
}

const demo = readJson(path.join(DATA, "demo_answers.json"), []);
const usableDemo = Array.isArray(demo) ? demo.filter((d) => d?.card_ids?.length && d.card_ids.every((id) => ids.has(id))) : [];
const sampleDemo = Array.isArray(demo) ? demo.filter((d) => d?.card_ids?.some((id) => String(id).startsWith("DEMO-"))) : [];
(usableDemo.length ? ok : warn)(`${usableDemo.length} pre-written answers usable when Ollama is offline`);
if (verified.length && sampleDemo.length) warn(`demo_answers.json still has ${sampleDemo.length} SAMPLE entries (ignored, but tidy up)`);

const aiCache = readJson(path.join(DATA, "ai_cache.json"), {});
const explained = verified.filter((c) => aiCache[c.card_id]).length;
if (verified.length) (explained === verified.length ? ok : warn)(`${explained}/${verified.length} cards have an AI explanation in ai_cache.json`);

const evalRows = fs.existsSync(path.join(DATA, "eval", "results.csv"))
  ? fs.readFileSync(path.join(DATA, "eval", "results.csv"), "utf8").split(/\r?\n/).filter((l) => l.trim()).length - 1
  : 0;
(evalRows > 0 ? ok : warn)(`G1 results: ${Math.max(0, evalRows)} rows in data/eval/results.csv`);

// ---------- 2. Build ----------
section("Build");
const buildId = path.join(APP, ".next", "BUILD_ID");
if (!fs.existsSync(buildId)) fail("No production build — run: npm run build");
else {
  const builtAt = fs.statSync(buildId).mtimeMs;
  const dataFiles = ["cards.json", "sources.csv", "demo_answers.json", "ai_cache.json"].map((f) => path.join(DATA, f)).filter(fs.existsSync);
  const newer = dataFiles.filter((f) => fs.statSync(f).mtimeMs > builtAt).map((f) => path.basename(f));
  if (newer.length) fail(`Data changed after the last build (${newer.join(", ")}) — run: npm run build`);
  else ok(`Build is newer than the data (built ${new Date(builtAt).toLocaleString()})`);

  const BAD_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "googletagmanager.com", "google-analytics.com", "va.vercel-scripts.com"];
  const hits = new Set();
  const scan = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) scan(p);
      else if (/\.(js|css|html|json|rsc)$/.test(e.name)) {
        const text = fs.readFileSync(p, "utf8");
        for (const h of BAD_HOSTS) if (text.includes(h)) hits.add(h);
      }
    }
  };
  scan(path.join(APP, ".next", "static"));
  scan(path.join(APP, ".next", "server", "app"));
  if (hits.size) fail(`Build loads from the internet: ${[...hits].join(", ")}`);
  else ok("No CDN fonts, scripts or trackers in the build");
}

try {
  const out = execFileSync("npx", ["--no-install", "next", "telemetry", "status"], { cwd: APP, encoding: "utf8", timeout: 30000 });
  if (/disabled/i.test(out) || process.env.NEXT_TELEMETRY_DISABLED === "1") ok("Next.js telemetry is off");
  else warn("Next.js telemetry is on — run: npx next telemetry disable");
} catch {
  warn("Could not check Next.js telemetry — run: npx next telemetry disable");
}

// ---------- 3. Local AI ----------
section(`Local AI (Ollama, model ${MODEL})`);
try {
  const tags = await (await fetchWithTimeout(`${OLLAMA}/api/tags`)).json();
  const names = (tags.models ?? []).map((m) => m.name);
  ok("Ollama is running");
  if (!names.includes(MODEL) && !names.includes(`${MODEL}:latest`)) {
    fail(`Model ${MODEL} is not pulled — run: ollama pull ${MODEL}  (installed: ${names.join(", ") || "none"})`);
  } else {
    try {
      const t0 = Date.now();
      const res = await fetchWithTimeout(
        `${OLLAMA}/api/generate`,
        { method: "POST", body: JSON.stringify({ model: MODEL, prompt: "Reply with the single word OK.", stream: false, options: { num_predict: 5 } }) },
        180000,
      );
      const body = await res.json();
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      if (res.ok && typeof body.response === "string") ok(`Model answers (${secs}s, model is now loaded in memory)`);
      else fail(`Model did not answer: ${body.error ?? res.status}`);
    } catch (e) {
      fail(`Model did not answer: ${e.message}`);
    }
  }
} catch {
  warn("Ollama is not running — Ask will use pre-written answers only. Start it with: ollama serve");
}

// ---------- 4. Running app (optional) ----------
if (APP_URL) {
  section(`Running app at ${APP_URL}`);
  try {
    const home = await (await fetchWithTimeout(APP_URL)).text();
    ok("App responds");
    if (home.includes("SAMPLE DATA")) fail("App is showing SAMPLE DATA");
    const q = usableDemo[0]?.question ?? "flame spread";
    const text = await (
      await fetchWithTimeout(`${APP_URL}/api/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) }, 180000)
    ).text();
    const events = text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const cards = events.find((e) => e.type === "cards")?.cards ?? [];
    const mode = events.some((e) => e.type === "ai") ? "live AI" : events.find((e) => e.type === "fallback")?.mode ?? "?";
    (cards.length ? ok : warn)(`Ask "${q}" → ${cards.length} cards, answer from: ${mode}`);
  } catch (e) {
    fail(`App not reachable at ${APP_URL} (${e.message}) — start it with: npm start`);
  }
}

// ---------- Report ----------
for (const [icon, msg] of results) console.log(icon ? `${icon} ${msg}` : msg);
const fails = results.filter((r) => r[0] === "❌").length;
const warns = results.filter((r) => r[0].startsWith("⚠")).length;
console.log(`\n${fails ? "❌ NOT READY" : "✅ READY"} — ${fails} to fix, ${warns} warnings`);

// Saved for `npm run kpi` (K15). Commit it after the run on the demo laptop.
fs.writeFileSync(
  path.join(ROOT, "notes", "preflight_last.json"),
  JSON.stringify({ ready: fails === 0, fails, warns, app_checked: Boolean(APP_URL), checked_at: new Date().toISOString() }, null, 2) + "\n",
);
process.exit(fails ? 1 : 0);
