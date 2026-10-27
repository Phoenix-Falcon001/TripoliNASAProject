// KPI calculations (K1–K16) for `npm run kpi`. Pure functions: no file access here,
// so they can be unit-tested (scripts/kpi-lib.test.mjs). Rule: never guess. Anything
// that cannot be measured from the data yet is reported as "not measured".
import crypto from "node:crypto";

export const DEADLINE = "Sun 1 Nov";
export const NOT_MEASURED = "not measured";

export const STATUS = {
  met: "✅ met",
  progress: "🟡 in progress",
  notStarted: "❌ not started",
  notMeasured: "— not measured",
};

const YES = /^(y|yes|true|1)$/i;
const CARDS_MODES = new Set(["cards", "ollama"]); // "ollama" = the cards path before WP-RITA renamed it
const AI_MODES = new Set(["cards", "ollama", "plain"]);
const EXPERIMENTS = ["SAFFIRE", "FLEX", "BASS-II"];

/** RFC 4180 CSV → array of row objects keyed by header. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim()));
  return header ? body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()]))) : [];
}

/** Same as cardFingerprint() in app/lib/review.ts and fingerprint() in pipeline/promote_verified.py. */
const REVIEW_EXCLUDED = new Set(["status", "reviewed_by", "auto_check", "expert_checked"]);
function canonicalJson(v) {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}
export function fingerprint(card) {
  const content = Object.fromEntries(Object.entries(card).filter(([k]) => !REVIEW_EXCLUDED.has(k)));
  return crypto.createHash("sha256").update(canonicalJson(content), "utf8").digest("hex").slice(0, 16);
}

/** Default ranking 40/35/25, ties by card_id (same as app/lib/rank.ts). */
export function rankDefault(cards) {
  const s = (c) => (40 * c.scores.crew_safety + 35 * c.scores.evidence + 25 * c.scores.moon_mars) / 100;
  return [...cards].sort((a, b) => s(b) - s(a) || (a.card_id < b.card_id ? -1 : 1));
}

const pct = (n, d) => `${Math.round((100 * n) / d)}%`;

function row(id, name, owner, target, { now, status, note = "" }) {
  return { id, name, owner, target, deadline: id === "K16" ? "before demo" : DEADLINE, now, status, note };
}

/** A count KPI: met at target, in progress above 0, else not started. */
function countStatus(n, target) {
  return n >= target ? STATUS.met : n > 0 ? STATUS.progress : STATUS.notStarted;
}

/**
 * @param {object} d
 * @param {object[]} d.verified       valid cards with status "verified" (from data/cards.json)
 * @param {object[]} d.sources        rows of data/sources.csv
 * @param {object[]} d.checkedDrafts  cards from data/drafts/*_checked.json
 * @param {Record<string, object>} d.decisions  merged data/review/*_decisions.json
 * @param {object[]} d.questions      rows of data/eval/questions.csv
 * @param {object[]} d.results        rows of data/eval/results.csv
 * @param {unknown} d.demoAnswers     data/demo_answers.json
 * @param {Record<string, unknown>} d.aiCache  data/ai_cache.json
 * @param {object|null} d.preflight   notes/preflight_last.json
 * @param {number} d.rehearsals       rows logged in notes/rehearsals.md
 */
export function computeKpis(d) {
  const out = [];
  const ids = new Set(d.verified.map((c) => c.card_id));
  const expOf = (c) => d.sources.find((s) => s.source_id === c.source_id)?.experiment?.toUpperCase();

  // K1 verified cards
  out.push(row("K1", "Verified cards in cards.json", "Evidence team", "30", { now: String(d.verified.length), status: countStatus(d.verified.length, 30) }));

  // K2 experiments covered by verified cards
  const covered = EXPERIMENTS.filter((e) => d.verified.some((c) => expOf(c) === e));
  out.push(row("K2", "Experiments covered (verified)", "Evidence team", "3/3", {
    now: `${covered.length}/3`,
    status: countStatus(covered.length, 3),
    note: covered.length ? covered.join(", ") : "",
  }));

  // K3 sources
  out.push(row("K3", "Papers in sources.csv", "Evidence team / Kafa", "≥ 3", { now: String(d.sources.length), status: countStatus(d.sources.length, 3) }));

  // K4 drafts reviewed (decision saved and still matching the card)
  if (d.checkedDrafts.length === 0) {
    out.push(row("K4", "Draft cards reviewed", "Reviewers", "100%", { now: NOT_MEASURED, status: STATUS.notMeasured, note: "no data/drafts/*_checked.json in the repo" }));
  } else {
    const reviewed = d.checkedDrafts.filter((c) => {
      const dec = d.decisions[c.card_id];
      return dec && dec.status && dec.fingerprint === fingerprint(c);
    }).length;
    const n = d.checkedDrafts.length;
    out.push(row("K4", "Draft cards reviewed", "Reviewers", "100%", {
      now: `${pct(reviewed, n)} (${reviewed}/${n})`,
      status: reviewed === n ? STATUS.met : reviewed > 0 ? STATUS.progress : STATUS.notStarted,
    }));
  }

  // K5 second-checked share of verified cards
  if (d.verified.length === 0) {
    out.push(row("K5", "Verified cards second-checked by another person", "Reviewer 2", "≥ 20%", { now: NOT_MEASURED, status: STATUS.notMeasured, note: "no verified cards yet" }));
  } else {
    const checked = d.verified.filter((c) => {
      const dec = d.decisions[c.card_id];
      const sc = dec?.second_check;
      return sc && sc.by && sc.by !== dec.reviewed_by && sc.result === "pass";
    }).length;
    const share = checked / d.verified.length;
    out.push(row("K5", "Verified cards second-checked by another person", "Reviewer 2", "≥ 20%", {
      now: `${pct(checked, d.verified.length)} (${checked}/${d.verified.length})`,
      status: share >= 0.2 ? STATUS.met : checked > 0 ? STATUS.progress : STATUS.notStarted,
      note: "counts decisions with second_check {by ≠ reviewer, result: pass}",
    }));
  }

  // K6 open questions
  const open = d.verified.filter((c) => c.open_question).length;
  out.push(row("K6", "Verified cards with an open question", "Evidence team", "≥ 5", { now: String(open), status: countStatus(open, 5) }));

  // K7 related links between verified cards
  const links = d.verified.flatMap((c) => (c.related_cards ?? []).filter((r) => ids.has(r.card_id)));
  const conflicts = links.filter((r) => r.relation === "conflicts").length;
  out.push(row("K7", "Related-card links (incl. conflicts)", "Evidence team", "≥ 10 incl. ≥ 2 conflicts", {
    now: `${links.length} links, ${conflicts} conflicts`,
    status: links.length >= 10 && conflicts >= 2 ? STATUS.met : links.length > 0 ? STATUS.progress : STATUS.notStarted,
  }));

  // K8 G1 questions
  const unanswerable = d.questions.filter((q) => /^no$/i.test(q.answerable ?? "")).length;
  out.push(row("K8", "G1 questions written", "Rita", "~20 (≈ 5 unanswerable)", {
    now: `${d.questions.length} (${unanswerable} unanswerable)`,
    status: d.questions.length >= 20 && unanswerable >= 5 ? STATUS.met : d.questions.length > 0 ? STATUS.progress : STATUS.notStarted,
  }));

  // K9 models tested
  const models = [...new Set(d.results.filter((r) => AI_MODES.has(r.mode) && r.model).map((r) => r.model))];
  out.push(row("K9", "Models tested with G1", "Rita", "≥ 2", { now: String(models.length), status: countStatus(models.length, 2), note: models.join(", ") }));

  // K10–K12 measured on the cards path only (what the app does)
  const cardsRows = d.results.filter((r) => CARDS_MODES.has(r.mode));
  if (cardsRows.length === 0) {
    for (const [id, name, target] of [
      ["K10", "Invented-number rate (cards mode)", "0%"],
      ["K11", "Answers citing a card (cards mode)", "≥ 95%"],
      ["K12", "Correct \"Not in our evidence\" on unanswerable", "100%"],
    ]) out.push(row(id, name, "Rita", target, { now: NOT_MEASURED, status: STATUS.notMeasured, note: "no G1 results yet" }));
  } else {
    const invented = cardsRows.filter((r) => YES.test(r.invented_number ?? "")).length;
    out.push(row("K10", "Invented-number rate (cards mode)", "Rita", "0%", {
      now: `${pct(invented, cardsRows.length)} (${invented}/${cardsRows.length})`,
      status: invented === 0 ? STATUS.met : STATUS.progress,
    }));
    const cited = cardsRows.filter((r) => YES.test(r.cited_source ?? "")).length;
    out.push(row("K11", "Answers citing a card (cards mode)", "Rita", "≥ 95%", {
      now: `${pct(cited, cardsRows.length)} (${cited}/${cardsRows.length})`,
      status: cited / cardsRows.length >= 0.95 ? STATUS.met : STATUS.progress,
    }));
    const unansIds = new Set(d.questions.filter((q) => /^no$/i.test(q.answerable ?? "")).map((q) => q.id ?? q.q_id ?? q.Q_id));
    const unansRows = cardsRows.filter((r) => unansIds.has(r.q_id ?? r.id));
    if (unansRows.length === 0) {
      out.push(row("K12", "Correct \"Not in our evidence\" on unanswerable", "Rita", "100%", { now: NOT_MEASURED, status: STATUS.notMeasured, note: "no results for unanswerable questions" }));
    } else {
      const said = unansRows.filter((r) => YES.test(r.said_not_in_evidence ?? "")).length;
      out.push(row("K12", "Correct \"Not in our evidence\" on unanswerable", "Rita", "100%", {
        now: `${pct(said, unansRows.length)} (${said}/${unansRows.length})`,
        status: said === unansRows.length ? STATUS.met : STATUS.progress,
      }));
    }
  }

  // K13 real demo answers (cite only verified cards; checked once checked_by exists)
  const demo = Array.isArray(d.demoAnswers) ? d.demoAnswers : [];
  const real = demo.filter(
    (a) => Array.isArray(a?.card_ids) && a.card_ids.length > 0 && a.card_ids.every((id) => ids.has(id)) && !("checked_by" in a && !a.checked_by),
  ).length;
  out.push(row("K13", "Real pre-written demo answers", "Rita + Bassam", "3–5", {
    now: String(real),
    status: countStatus(real, 3),
    note: demo.length > real ? `${demo.length - real} not usable yet (sample, unverified cards or not checked)` : "",
  }));

  // K14 top-10 cards with a checked AI explanation
  if (d.verified.length === 0) {
    out.push(row("K14", "Top-10 cards with a checked AI explanation", "Rita + Bassam", "10", { now: NOT_MEASURED, status: STATUS.notMeasured, note: "no verified cards yet" }));
  } else {
    const top = rankDefault(d.verified).slice(0, 10);
    const checked = top.filter((c) => {
      const e = d.aiCache[c.card_id];
      return e && typeof e === "object" && e.checked_by;
    }).length;
    out.push(row("K14", "Top-10 cards with a checked AI explanation", "Rita + Bassam", `${top.length}`, {
      now: `${checked}/${top.length}`,
      status: checked === top.length ? STATUS.met : checked > 0 ? STATUS.progress : STATUS.notStarted,
      note: "plain-text entries without checked_by do not count",
    }));
  }

  // K15 last preflight
  if (!d.preflight) {
    out.push(row("K15", "Preflight with real data, Wi-Fi off", "Nermine", "READY", { now: NOT_MEASURED, status: STATUS.notMeasured, note: "run: npm run preflight" }));
  } else {
    const p = d.preflight;
    out.push(row("K15", "Preflight with real data, Wi-Fi off", "Nermine", "READY", {
      now: `${p.ready ? "READY" : `NOT READY (${p.fails} to fix)`} on ${String(p.checked_at).slice(0, 10)}`,
      status: p.ready ? STATUS.met : STATUS.progress,
    }));
  }

  // K16 rehearsals (manual log)
  out.push(row("K16", "Demo rehearsals logged", "Presentation", "≥ 2", {
    now: String(d.rehearsals),
    status: countStatus(d.rehearsals, 2),
    note: "log them in notes/rehearsals.md",
  }));

  return out;
}

/** Counts filled rows of the table in notes/rehearsals.md (rows whose first cell has a date). */
export function countRehearsals(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((l) => /^\|\s*\d{4}-\d{2}-\d{2}/.test(l.trim())).length;
}

export function toMarkdown(rows, generatedAt) {
  const lines = [
    "# KPI dashboard",
    "",
    `Generated by \`npm run kpi\` on ${generatedAt}. Do not edit by hand — re-run the script.`,
    `"not measured" means the data needed does not exist yet; it is never a guess.`,
    "",
    "| KPI | What | Now | Target | Status | Owner | Deadline | Note |",
    "|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.id} | ${r.name} | ${r.now} | ${r.target} | ${r.status} | ${r.owner} | ${r.deadline} | ${r.note} |`),
    "",
  ];
  return lines.join("\n");
}
