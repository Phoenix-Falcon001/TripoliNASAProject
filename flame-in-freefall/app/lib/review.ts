// Server-only helpers for the /review page (dev mode): read checked draft cards,
// their extracted page text, and the review decisions; save decisions.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./cards";

/** Fields a review decision does NOT cover. Must match REVIEW_EXCLUDED in pipeline/promote_verified.py. */
export const REVIEW_EXCLUDED = new Set(["status", "reviewed_by", "auto_check", "expert_checked"]);

export const REVIEWERS = ["Bassam", "Nermine"] as const;
export type Reviewer = (typeof REVIEWERS)[number];
export const DECISIONS = ["verified", "flagged", "rejected"] as const;
export type DecisionStatus = (typeof DECISIONS)[number];

export interface Decision {
  status: DecisionStatus;
  reviewed_by: Reviewer;
  fingerprint: string;
  decided_at: string;
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

/**
 * Saves (or with status null, clears) a decision. Refuses if the card on disk no longer
 * matches the fingerprint the reviewer was looking at.
 */
export function saveDecision(
  sourceId: string,
  cardId: string,
  status: DecisionStatus | null,
  reviewer: Reviewer,
  seenFingerprint: string,
  dataDir: string = DATA_DIR,
  now: Date = new Date(),
): SaveResult {
  if (!SOURCE_ID_RE.test(sourceId)) return { ok: false, error: "Bad source id" };
  const item = loadReviewItems(sourceId, dataDir).find((i) => i.card.card_id === cardId);
  if (!item) return { ok: false, error: `${cardId} is not in ${sourceId}_checked.json` };
  if (item.fingerprint !== seenFingerprint) {
    return { ok: false, error: "This card changed on disk since you opened it. Reload the page and review it again." };
  }
  const decisions = loadDecisions(sourceId, dataDir);
  if (status === null) delete decisions[cardId];
  else decisions[cardId] = { status, reviewed_by: reviewer, fingerprint: item.fingerprint, decided_at: now.toISOString() };

  const file = decisionsFile(dataDir, sourceId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sorted = Object.fromEntries(Object.keys(decisions).sort().map((k) => [k, decisions[k]]));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(sorted, null, 2) + "\n");
  fs.renameSync(tmp, file);
  return { ok: true };
}

/** The review page and API only work in `npm run dev`, never in the demo build. */
export function reviewEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
