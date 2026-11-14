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
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "demo-"));
    try {
      fs.writeFileSync(
        path.join(dir, "demo_answers.json"),
        JSON.stringify([
          { question: "a", answer: "x [SAF-001]", card_ids: ["SAF-001"], checked_by: "Bassam" },
          { question: "b", answer: "y [SAF-001] [SAF-002]", card_ids: ["SAF-001", "SAF-002"], checked_by: "Bassam" },
          { question: "c", answer: "z [DEMO-001]", card_ids: ["DEMO-001"], checked_by: "SAMPLE" },
        ]),
      );
      expect(loadDemoAnswers(dir, new Set(["SAF-001", "SAF-002"])).map((a) => a.question)).toEqual(["a", "b"]);
      expect(loadDemoAnswers(dir, new Set(["SAF-001"])).map((a) => a.question)).toEqual(["a"]);
      expect(loadDemoAnswers(dir, new Set(["DEMO-001"])).map((a) => a.question)).toEqual(["c"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("no sample data once real cards exist", () => {
  it("cards, sources and pre-written answers contain nothing from the sample set", async () => {
    const { loadDemoAnswers } = await import("./cards");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "real-"));
    try {
      for (const f of ["sample_cards.json", "sample_sources.csv", "demo_answers.json"]) {
        fs.copyFileSync(path.join(REPO, "data", f), path.join(dir, f));
      }
      fs.writeFileSync(path.join(dir, "sources.csv"), "source_id,title,experiment\nS01,Real paper,SAFFIRE\n");
      fs.writeFileSync(path.join(dir, "cards.json"), JSON.stringify([makeCard()]));
      const data = loadCardData(dir, SCHEMA_PATH);
      expect(data.isSample).toBe(false);
      expect(data.cards.some((c) => c.card_id.startsWith("DEMO-"))).toBe(false);
      expect(data.sources.map((s) => s.source_id)).toEqual(["S01"]);
      const answers = loadDemoAnswers(dir, new Set(data.cards.map((c) => c.card_id)));
      expect(answers.some((a) => a.card_ids.some((id) => id.startsWith("DEMO-")))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
