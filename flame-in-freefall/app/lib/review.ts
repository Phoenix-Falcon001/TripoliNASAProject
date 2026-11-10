// Server-only helpers for the /review page (dev mode): read checked draft cards,
// their extracted page text, and the review decisions; save decisions.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./cards";

/** Fields a review decision does NOT cover. Must match REVIEW_EXCLUDED in pipeline/promote_verified.py. */
export const REVIEW_EXCLUDED = new Set(["status", "reviewed_by", "auto_check", "expert_checked"]);

export const REVIEWERS = ["Bassam", "Reviewer 2", "Nermine", "Rita", "Kafa"] as const;
/** Only the Evidence lead may edit scores, open questions and related cards on the Review page. */
export const EVIDENCE_LEAD: Reviewer = "Bassam";
export type Reviewer = (typeof REVIEWERS)[number];
export const DECISIONS = ["verified", "flagged", "rejected"] as const;
export type DecisionStatus = (typeof DECISIONS)[number];

export interface SecondCheck {
  by: Reviewer;
  result: "pass" | "fail";
  note: string;
  at: string;
}

export interface Decision {
  status: DecisionStatus;
  reviewed_by: Reviewer;
  fingerprint: string;
  decided_at: string;
  /** Why the card was flagged (required for "flagged"). */
  note?: string;
  /** Check by a second, different person (K5). Stored here, never on the card. */
  second_check?: SecondCheck;
}

/** JSON with sorted keys and no spaces — same bytes as Python json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False). */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Short hash of the reviewed content of a card. Same as fingerprint() in pipeline/promote_verified.py. */
export function cardFingerprint(card: Record<string, unknown>): string {
  const content = Object.fromEntries(Object.entries(card).filter(([k]) => !REVIEW_EXCLUDED.has(k)));
  return crypto.createHash("sha256").update(canonicalJson(content), "utf8").digest("hex").slice(0, 16);
}

export const SOURCE_ID_RE = /^S\d{2}$/;

/** A draft card as written by validate_cards.py. Not schema-checked: fields may be missing. */
export type DraftCard = Record<string, unknown> & { card_id?: string; auto_check?: { reasons?: string[]; quote_score?: number } };

export interface ReviewItem {
  card: DraftCard;
  fingerprint: string;
  decision: Decision | null;
  /** The card changed after the decision was saved. */
  stale: boolean;
}

function readJsonFile<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

const draftsDir = (dataDir: string) => path.join(dataDir, "drafts");
const decisionsFile = (dataDir: string, sourceId: string) => path.join(dataDir, "review", `${sourceId}_decisions.json`);

/** Source IDs that have a data/drafts/<SXX>_checked.json file. */
export function listCheckedSources(dataDir: string = DATA_DIR): string[] {
  const dir = draftsDir(dataDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((f) => /^(S\d{2})_checked\.json$/.exec(f)?.[1])
    .filter((s): s is string => !!s)
    .sort();
}

export function loadDecisions(sourceId: string, dataDir: string = DATA_DIR): Record<string, Decision> {
  return readJsonFile(decisionsFile(dataDir, sourceId), {});
}

export function loadReviewItems(sourceId: string, dataDir: string = DATA_DIR): ReviewItem[] {
  const cards = readJsonFile<DraftCard[]>(path.join(draftsDir(dataDir), `${sourceId}_checked.json`), []);
  const decisions = loadDecisions(sourceId, dataDir);
  return cards.map((card) => {
    const fp = cardFingerprint(card);
    const decision = (card.card_id && decisions[card.card_id]) || null;
    return { card, fingerprint: fp, decision, stale: !!decision && decision.fingerprint !== fp };
  });
}

/** Page texts from data/text/<SXX>.json (made by extract_text.py), keyed by PDF page index. */
export function loadPageTexts(sourceId: string, dataDir: string = DATA_DIR): Record<string, string> {
  return readJsonFile(path.join(dataDir, "text", `${sourceId}.json`), {});
}

export type SaveResult = { ok: true } | { ok: false; error: string };

function writeDecisions(sourceId: string, decisions: Record<string, Decision>, dataDir: string): void {
  const file = decisionsFile(dataDir, sourceId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sorted = Object.fromEntries(Object.keys(decisions).sort().map((k) => [k, decisions[k]]));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(sorted, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

/** Finds the card and checks the reviewer is looking at the current version of it. */
function currentItem(sourceId: string, cardId: string, seenFingerprint: string, dataDir: string): ReviewItem | string {
  if (!SOURCE_ID_RE.test(sourceId)) return "Bad source id";
  const item = loadReviewItems(sourceId, dataDir).find((i) => i.card.card_id === cardId);
  if (!item) return `${cardId} is not in ${sourceId}_checked.json`;
  if (item.fingerprint !== seenFingerprint) {
    return "This card changed on disk since you opened it. Reload the page and review it again.";
  }
  return item;
}

/**
 * Saves (or with status null, clears) a decision. Refuses if the card on disk no longer
 * matches the fingerprint the reviewer was looking at. Flagging needs a reason.
 * A new decision clears any earlier second check (it was for the old decision).
 */
export function saveDecision(
  sourceId: string,
  cardId: string,
  status: DecisionStatus | null,
  reviewer: Reviewer,
  seenFingerprint: string,
  dataDir: string = DATA_DIR,
  now: Date = new Date(),
  note: string = "",
): SaveResult {
  const item = currentItem(sourceId, cardId, seenFingerprint, dataDir);
  if (typeof item === "string") return { ok: false, error: item };
  if (status === "flagged" && !note.trim()) return { ok: false, error: "Say why you flag it (what needs fixing)." };
  const decisions = loadDecisions(sourceId, dataDir);
  if (status === null) delete decisions[cardId];
  else {
    decisions[cardId] = { status, reviewed_by: reviewer, fingerprint: item.fingerprint, decided_at: now.toISOString() };
    if (note.trim()) decisions[cardId].note = note.trim();
  }
  writeDecisions(sourceId, decisions, dataDir);
  return { ok: true };
}

/** Approved, up-to-date cards that no second person has checked yet. */
export function secondCheckQueue(items: ReviewItem[]): ReviewItem[] {
  return items.filter((i) => i.decision?.status === "verified" && !i.stale && !i.decision.second_check);
}

/**
 * Records a second check by a different person. A failed check sends the card back to
 * "flagged" (so promote_verified.py removes it from cards.json) with the reason.
 */
export function saveSecondCheck(
  sourceId: string,
  cardId: string,
  result: "pass" | "fail",
  reviewer: Reviewer,
  seenFingerprint: string,
  note: string = "",
  dataDir: string = DATA_DIR,
  now: Date = new Date(),
): SaveResult {
  const item = currentItem(sourceId, cardId, seenFingerprint, dataDir);
  if (typeof item === "string") return { ok: false, error: item };
  const decisions = loadDecisions(sourceId, dataDir);
  const d = decisions[cardId];
  if (!d || d.status !== "verified" || d.fingerprint !== item.fingerprint) {
    return { ok: false, error: "Only an approved, unchanged card can be second-checked." };
  }
  if (d.reviewed_by === reviewer) return { ok: false, error: `${reviewer} approved this card; a different person must second-check it.` };
  if (result === "fail" && !note.trim()) return { ok: false, error: "Say what is wrong so it can be fixed." };
  d.second_check = { by: reviewer, result, note: note.trim(), at: now.toISOString() };
  if (result === "fail") {
    d.status = "flagged";
    d.note = `Second check failed (${reviewer}): ${note.trim()}`;
  }
  writeDecisions(sourceId, decisions, dataDir);
  return { ok: true };
}

export interface CardEdit {
  scores?: { crew_safety: number; evidence: number; moon_mars: number };
  open_question?: string | null;
  related_cards?: { card_id: string; relation: "agrees" | "conflicts" | "extends" }[];
}

const RELATED_ID_RE = /^(SAF|FLX|BAS)-\d{3}$/;

/** Checks an edit from the Review page. Returns an error message or null. */
export function validateEdit(edit: CardEdit): string | null {
  if (edit.scores) {
    for (const k of ["crew_safety", "evidence", "moon_mars"] as const) {
      const v = edit.scores[k];
      if (!Number.isInteger(v) || v < 1 || v > 5) return `Score ${k} must be a whole number 1–5.`;
    }
  }
  if (edit.open_question !== undefined && edit.open_question !== null && typeof edit.open_question !== "string") {
    return "Open question must be text.";
  }
  for (const r of edit.related_cards ?? []) {
    if (!RELATED_ID_RE.test(r.card_id)) return `Related card id ${r.card_id} must look like SAF-001.`;
    if (!["agrees", "conflicts", "extends"].includes(r.relation)) return `Relation must be agrees, conflicts or extends.`;
  }
  return null;
}

/**
 * Evidence lead only: edits scores / open_question / related_cards in both the drafts file
 * and the checked file. The card's fingerprint changes, so its approval must be redone.
 */
export function editCard(
  sourceId: string,
  cardId: string,
  edit: CardEdit,
  reviewer: Reviewer,
  seenFingerprint: string,
  dataDir: string = DATA_DIR,
): SaveResult {
  if (reviewer !== EVIDENCE_LEAD) return { ok: false, error: `Only the Evidence lead (${EVIDENCE_LEAD}) can edit cards here.` };
  const item = currentItem(sourceId, cardId, seenFingerprint, dataDir);
  if (typeof item === "string") return { ok: false, error: item };
  const problem = validateEdit(edit);
  if (problem) return { ok: false, error: problem };

  const patch: Record<string, unknown> = {};
  if (edit.scores) patch.scores = edit.scores;
  if (edit.open_question !== undefined) patch.open_question = edit.open_question?.trim() || null;
  if (edit.related_cards) patch.related_cards = edit.related_cards;

  for (const name of [`${sourceId}_drafts.json`, `${sourceId}_checked.json`]) {
    const file = path.join(draftsDir(dataDir), name);
    if (!fs.existsSync(file)) continue;
    const cards = JSON.parse(fs.readFileSync(file, "utf8")) as DraftCard[];
    const target = cards.find((c) => c.card_id === cardId);
    if (!target) continue;
    Object.assign(target, patch);
    fs.writeFileSync(file, JSON.stringify(cards, null, 2) + "\n");
  }
  return { ok: true };
}

/** The review page and API only work in `npm run dev`, never in the demo build. */
export function reviewEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
