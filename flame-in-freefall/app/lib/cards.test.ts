import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCardData, validateCards, withDemoIds } from "./cards";
import { makeCard } from "./testCards";

const REPO = path.resolve(__dirname, "..", "..");
const SCHEMA_PATH = path.join(REPO, "schema", "card.schema.json");
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("validateCards", () => {
  it("keeps valid verified cards", () => {
    const { cards, problems } = validateCards([makeCard()], schema);
    expect(cards.map((c) => c.card_id)).toEqual(["SAF-001"]);
    expect(problems).toEqual([]);
  });

  it("drops non-verified cards without reporting a problem", () => {
    const { cards, problems } = validateCards(
      [makeCard({ status: "draft" }), makeCard({ card_id: "SAF-002", status: "flagged" })],
      schema,
    );
    expect(cards).toEqual([]);
    expect(problems).toEqual([]);
  });

  it("skips and reports invalid cards instead of throwing", () => {
    const bad = { ...makeCard({ card_id: "SAF-002" }), scores: { crew_safety: 9, evidence: 1, moon_mars: 1 } };
    const extra = { ...makeCard({ card_id: "SAF-003" }), surprise: true };
    const { cards, problems } = validateCards([makeCard(), bad, extra, "nonsense"], schema);
    expect(cards.map((c) => c.card_id)).toEqual(["SAF-001"]);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toMatch(/SAF-002.*crew_safety/);
  });

  it("skips duplicate card_ids", () => {
    const { cards, problems } = validateCards([makeCard(), makeCard()], schema);
    expect(cards).toHaveLength(1);
    expect(problems[0]).toMatch(/duplicate/);
  });

  it("rejects DEMO- ids under the real schema but accepts them under the sample schema", () => {
    const demo = makeCard({ card_id: "DEMO-001", related_cards: [{ card_id: "DEMO-002", relation: "agrees" }] });
    expect(validateCards([demo], schema).cards).toEqual([]);
    expect(validateCards([demo], withDemoIds(schema)).cards).toHaveLength(1);
  });

  it("withDemoIds does not modify the original schema", () => {
    const before = JSON.stringify(schema);
    withDemoIds(schema);
    expect(JSON.stringify(schema)).toBe(before);
  });

  it("sorts cards by card_id", () => {
    const { cards } = validateCards([makeCard({ card_id: "SAF-002" }), makeCard({ card_id: "BAS-001" })], schema);
    expect(cards.map((c) => c.card_id)).toEqual(["BAS-001", "SAF-002"]);
  });
});

describe("loadCardData", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "cards-"));
    fs.copyFileSync(path.join(REPO, "data", "sample_cards.json"), path.join(dir, "sample_cards.json"));
    fs.copyFileSync(path.join(REPO, "data", "sample_sources.csv"), path.join(dir, "sample_sources.csv"));
    fs.writeFileSync(path.join(dir, "sources.csv"), "source_id,title,experiment\nS01,Real paper,SAFFIRE\n");
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("falls back to the 9 sample cards when cards.json is empty", () => {
    fs.writeFileSync(path.join(dir, "cards.json"), "[]");
    const data = loadCardData(dir, SCHEMA_PATH);
    expect(data.isSample).toBe(true);
    expect(data.cards).toHaveLength(9);
    expect(data.cards.every((c) => c.card_id.startsWith("DEMO-"))).toBe(true);
    expect(data.sources.map((s) => s.source_id)).toEqual(["S01", "S91", "S92", "S93"]);
    expect(console.warn).not.toHaveBeenCalled(); // every sample card is valid
  });

  it("has 3 sample cards per experiment", () => {
    fs.writeFileSync(path.join(dir, "cards.json"), "[]");
    const data = loadCardData(dir, SCHEMA_PATH);
    const exp = data.cards.map((c) => data.sources.find((s) => s.source_id === c.source_id)?.experiment);
    for (const e of ["SAFFIRE", "FLEX", "BASS-II"]) expect(exp.filter((x) => x === e)).toHaveLength(3);
  });

  it("uses real cards (and no sample sources) when cards.json has cards", () => {
    fs.writeFileSync(path.join(dir, "cards.json"), JSON.stringify([makeCard(), makeCard({ card_id: "SAF-002", status: "draft" })]));
    const data = loadCardData(dir, SCHEMA_PATH);
    expect(data.isSample).toBe(false);
    expect(data.cards.map((c) => c.card_id)).toEqual(["SAF-001"]);
    expect(data.sources.map((s) => s.source_id)).toEqual(["S01"]);
  });

  it("does not fall back to sample data when cards.json has only unverified cards", () => {
    fs.writeFileSync(path.join(dir, "cards.json"), JSON.stringify([makeCard({ status: "draft" })]));
    const data = loadCardData(dir, SCHEMA_PATH);
    expect(data.isSample).toBe(false);
    expect(data.cards).toEqual([]);
  });

  it("does not crash or show sample data when cards.json is broken JSON", () => {
    fs.writeFileSync(path.join(dir, "cards.json"), "[{");
    const data = loadCardData(dir, SCHEMA_PATH);
    expect(data.isSample).toBe(false);
    expect(data.cards).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it("warns when a card's source_id is not in sources.csv", () => {
    fs.writeFileSync(path.join(dir, "cards.json"), JSON.stringify([makeCard({ source_id: "S42" })]));
    loadCardData(dir, SCHEMA_PATH);
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/S42/));
  });
});

describe("loadDemoAnswers", () => {
  it("keeps only answers whose cards are all in the shown set", async () => {
    const { loadDemoAnswers } = await import("./cards");
    const all = loadDemoAnswers(path.join(REPO, "data"), new Set(["DEMO-001", "DEMO-006", "DEMO-008"]));
    expect(all).toHaveLength(2);
    expect(loadDemoAnswers(path.join(REPO, "data"), new Set(["SAF-001"]))).toEqual([]);
  });
});
