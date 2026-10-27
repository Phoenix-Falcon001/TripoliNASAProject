import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cardNumbers, displayText, highlight } from "./highlight";
import { canonicalJson, cardFingerprint, listCheckedSources, loadReviewItems, saveDecision } from "./review";

// Same card and value as FIXTURE in pipeline/test_promote_verified.py.
const FIXTURE = {
  card_id: "SAF-001",
  page: 3,
  finding: 'Flame spread ~2 cm/s — slower "than" Earth é',
  status: "draft",
  values: [{ unit: "cm/s", value: "~2", quantity: "rate" }],
  team_interpretation: null,
};

describe("cardFingerprint", () => {
  it("matches the Python fingerprint exactly", () => {
    expect(cardFingerprint(FIXTURE)).toBe("bfce6b1ae0561f67");
  });
  it("ignores review fields but not content", () => {
    const base = cardFingerprint(FIXTURE);
    expect(cardFingerprint({ ...FIXTURE, status: "verified", reviewed_by: "Bassam", auto_check: { reasons: [] } })).toBe(base);
    expect(cardFingerprint({ ...FIXTURE, page: 4 })).not.toBe(base);
  });
  it("canonicalJson sorts keys at every level", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: null }], c: "é" } })).toBe('{"a":{"c":"é","d":[2,{"y":null,"z":1}]},"b":1}');
  });
});

describe("highlight", () => {
  const page = "Results.  The flame spread rate was\n0.68 cm/s in the “low flow” case.\nOther text 10.";
  it("finds the quote across line breaks, curly quotes and case", () => {
    const r = highlight(page, 'the flame spread rate was 0.68 cm/s in the "low flow" case', ["0.68", "10"]);
    expect(r.quoteFound).toBe(true);
    expect(r.segments.find((s) => s.kind === "quote")?.text).toBe("The flame spread rate was 0.68 cm/s in the “low flow” case");
    expect(r.segments.filter((s) => s.kind === "number").map((s) => s.text)).toEqual(["10"]);
  });
  it("reports a missing quote but still marks numbers", () => {
    const r = highlight(page, "not in the text", ["0.68"]);
    expect(r.quoteFound).toBe(false);
    expect(r.segments.filter((s) => s.kind === "number").map((s) => s.text)).toEqual(["0.68"]);
  });
  it("does not mark a number inside a longer number", () => {
    const r = highlight("value 10.5 and 5", "", ["5"]);
    expect(r.segments.filter((s) => s.kind === "number").map((s) => s.text)).toEqual(["5"]);
  });
  it("re-joins words hyphenated across lines", () => {
    expect(displayText("flam-\nmability  test")).toBe("flammability test");
  });
  it("collects numbers from several texts", () => {
    expect(cardNumbers(["at 0.68 cm/s", null, "21% and 0.68"]).sort()).toEqual(["0.68", "21"]);
  });
});

describe("review files", () => {
  let dir: string;
  const card = { card_id: "SAF-001", source_id: "S01", page: 1, finding: "x" };
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-"));
    fs.mkdirSync(path.join(dir, "drafts"));
    fs.writeFileSync(path.join(dir, "drafts", "S01_checked.json"), JSON.stringify([card]));
    fs.writeFileSync(path.join(dir, "drafts", "S01_drafts.json"), "[]");
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("lists only *_checked.json sources", () => {
    expect(listCheckedSources(dir)).toEqual(["S01"]);
  });

  it("saves, reads and clears a decision", () => {
    const fp = cardFingerprint(card);
    const when = new Date("2026-10-22T10:00:00Z");
    expect(saveDecision("S01", "SAF-001", "verified", "Bassam", fp, dir, when)).toEqual({ ok: true });
    const [item] = loadReviewItems("S01", dir);
    expect(item.decision).toEqual({ status: "verified", reviewed_by: "Bassam", fingerprint: fp, decided_at: when.toISOString() });
    expect(item.stale).toBe(false);
    saveDecision("S01", "SAF-001", null, "Bassam", fp, dir);
    expect(loadReviewItems("S01", dir)[0].decision).toBeNull();
  });

  it("marks a decision stale when the card changes", () => {
    saveDecision("S01", "SAF-001", "verified", "Bassam", cardFingerprint(card), dir);
    fs.writeFileSync(path.join(dir, "drafts", "S01_checked.json"), JSON.stringify([{ ...card, page: 2 }]));
    expect(loadReviewItems("S01", dir)[0].stale).toBe(true);
  });

  it("refuses to save against an out-of-date view, unknown cards or bad source ids", () => {
    expect(saveDecision("S01", "SAF-001", "verified", "Bassam", "old", dir)).toMatchObject({ ok: false });
    expect(saveDecision("S01", "SAF-999", "verified", "Bassam", "x", dir)).toMatchObject({ ok: false });
    expect(saveDecision("../x", "SAF-001", "verified", "Bassam", "x", dir)).toMatchObject({ ok: false, error: "Bad source id" });
  });
});
