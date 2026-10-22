// Server-only: reads card and source files from ../data with node:fs.
// Never import this from a client component.
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject } from "ajv";
import { parseCsv } from "./csv";
import { usableDemoAnswers, type DemoAnswer } from "./demoAnswers";
import { stability } from "./stability";
import type { Card, Source } from "./types";

/** Repo data folder. The Next.js app runs from app/, so data lives one level up. */
export const DATA_DIR = path.resolve(process.cwd(), "..", "data");
export const SCHEMA_PATH = path.resolve(process.cwd(), "..", "schema", "card.schema.json");

const REAL_ID = "^(SAF|FLX|BAS)-[0-9]{3}$";
const REAL_OR_DEMO_ID = "^(SAF|FLX|BAS|DEMO)-[0-9]{3}$";

export interface CardData {
  /** Valid cards with status "verified", sorted by card_id. */
  cards: Card[];
  sources: Source[];
  /** True when data/cards.json was empty and DEMO- sample cards are shown instead. */
  isSample: boolean;
}

type JsonSchema = Record<string, unknown>;

/**
 * The real schema only allows SAF/FLX/BAS ids. For sample data we validate against an
 * in-memory copy that also allows DEMO- ids; every other rule stays identical.
 * The schema file itself is never changed.
 */
export function withDemoIds(schema: JsonSchema): JsonSchema {
  const copy = structuredClone(schema) as {
    $id?: string;
    properties: {
      card_id: { pattern: string };
      related_cards: { items: { properties: { card_id: { pattern: string } } } };
    };
  };
  if (copy.properties.card_id.pattern !== REAL_ID) {
    throw new Error("card.schema.json card_id pattern changed; update withDemoIds()");
  }
  copy.$id = `${copy.$id ?? "card.schema.json"}.demo`;
  copy.properties.card_id.pattern = REAL_OR_DEMO_ID;
  copy.properties.related_cards.items.properties.card_id.pattern = REAL_OR_DEMO_ID;
  return copy as JsonSchema;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? []).map((e) => `${e.instancePath || "(card)"} ${e.message}`).join("; ");
}

export interface ValidationResult {
  cards: Card[];
  problems: string[];
}

/**
 * Validates each item against the schema. Invalid items and duplicate ids are skipped
 * and reported in `problems` (never thrown). Only status "verified" cards are returned.
 */
export function validateCards(raw: unknown, schema: JsonSchema): ValidationResult {
  const problems: string[] = [];
  if (!Array.isArray(raw)) {
    return { cards: [], problems: ["cards file is not a JSON array"] };
  }
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  const validate = ajv.compile<Card>(schema);
  const seen = new Set<string>();
  const cards: Card[] = [];

  raw.forEach((item, i) => {
    const label =
      item && typeof item === "object" && typeof (item as { card_id?: unknown }).card_id === "string"
        ? (item as { card_id: string }).card_id
        : `#${i}`;
    if (!validate(item)) {
      problems.push(`card ${label} skipped (invalid): ${formatErrors(validate.errors)}`);
      return;
    }
    if (seen.has(item.card_id)) {
      problems.push(`card ${label} skipped (duplicate card_id)`);
      return;
    }
    seen.add(item.card_id);
    if (item.status === "verified") cards.push(item);
  });

  cards.sort((a, b) => (a.card_id < b.card_id ? -1 : a.card_id > b.card_id ? 1 : 0));
  return { cards, problems };
}

export function toSources(rows: Record<string, string>[]): Source[] {
  return rows
    .filter((r) => r.source_id)
    .map((r) => ({
      source_id: r.source_id,
      title: r.title ?? "",
      ntrs_id: r.ntrs_id ?? "",
      experiment: r.experiment ?? "",
      source_type: r.source_type ?? "",
      year: r.year ?? "",
      url: r.url ?? "",
      pdf_filename: r.pdf_filename ?? "",
      notes: r.notes ?? "",
    }));
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readCsv(file: string): Record<string, string>[] {
  return fs.existsSync(file) ? parseCsv(fs.readFileSync(file, "utf8")) : [];
}

/**
 * Loads verified cards and sources. Uses data/sample_cards.json (+ sample_sources.csv)
 * only when data/cards.json is missing or an empty array.
 */
export function loadCardData(dataDir: string = DATA_DIR, schemaPath: string = SCHEMA_PATH): CardData {
  const schema = readJson(schemaPath) as JsonSchema;
  const cardsFile = path.join(dataDir, "cards.json");
  let raw: unknown = [];
  if (fs.existsSync(cardsFile)) {
    try {
      raw = readJson(cardsFile);
    } catch (e) {
      console.error(`[cards] ${cardsFile} is not valid JSON:`, e);
      raw = null; // broken file is not "empty": do not silently fall back to sample data
    }
  }

  const isSample = Array.isArray(raw) && raw.length === 0;
  const result = isSample
    ? validateCards(readJson(path.join(dataDir, "sample_cards.json")), withDemoIds(schema))
    : validateCards(raw, schema);

  const sources = toSources([
    ...readCsv(path.join(dataDir, "sources.csv")),
    ...(isSample ? readCsv(path.join(dataDir, "sample_sources.csv")) : []),
  ]);

  const known = new Set(sources.map((s) => s.source_id));
  for (const c of result.cards) {
    if (!known.has(c.source_id)) result.problems.push(`card ${c.card_id}: source_id ${c.source_id} not in sources.csv`);
  }
  for (const p of result.problems) console.warn(`[cards] ${p}`);

  return { cards: result.cards, sources, isSample };
}

/** Per-request memoised loader for server components. */
export const getCardData = cache(() => loadCardData());

export function findCard(data: CardData, id: string): Card | undefined {
  return data.cards.find((c) => c.card_id === id);
}

export function findSource(data: CardData, sourceId: string): Source | undefined {
  return data.sources.find((s) => s.source_id === sourceId);
}

/** Experiment name (SAFFIRE / FLEX / BASS-II) from sources.csv, or "Unknown". */
export function experimentOf(data: CardData, card: Card): string {
  return findSource(data, card.source_id)?.experiment || "Unknown";
}

/**
 * Pre-written AI explanation from data/ai_cache.json, keyed by card_id.
 * Accepts either a string or an object with a `text` field. Returns null if none.
 */
export const getAiExplanation = cache((cardId: string): string | null => {
  const file = path.join(DATA_DIR, "ai_cache.json");
  if (!fs.existsSync(file)) return null;
  try {
    const entry = (readJson(file) as Record<string, unknown>)[cardId];
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object" && typeof (entry as { text?: unknown }).text === "string") {
      return (entry as { text: string }).text;
    }
  } catch (e) {
    console.error("[cards] ai_cache.json is not valid JSON:", e);
  }
  return null;
});

/** Ranking stability for the shown cards (independent of the user's sliders). */
export const getStability = cache(() => stability(getCardData().cards));

/**
 * Pre-written answers from data/demo_answers.json for when Ollama is offline.
 * Entries citing a card that is not in the current verified (or sample) set are dropped,
 * so sample answers never appear next to real cards and vice versa.
 */
export function loadDemoAnswers(dataDir: string, cardIds: ReadonlySet<string>): DemoAnswer[] {
  const file = path.join(dataDir, "demo_answers.json");
  if (!fs.existsSync(file)) return [];
  try {
    return usableDemoAnswers(readJson(file), cardIds);
  } catch (e) {
    console.error("[cards] demo_answers.json is not valid JSON:", e);
    return [];
  }
}

export const getDemoAnswers = cache(() =>
  loadDemoAnswers(DATA_DIR, new Set(getCardData().cards.map((c) => c.card_id))),
);

/** Rows of data/eval/results.csv (G1 accuracy test). Empty if not run yet. */
export const getEvalResults = cache(() => readCsv(path.join(DATA_DIR, "eval", "results.csv")));
