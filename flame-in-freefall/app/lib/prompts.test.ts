import { describe, expect, it } from "vitest";
import { extractCitations, splitCitations, unknownCitations } from "./citations";
import { matchDemoAnswer, usableDemoAnswers } from "./demoAnswers";
import { STRICT_PROMPT, buildPrompt, formatCard } from "./prompts";
import { makeCard } from "./testCards";

describe("buildPrompt", () => {
  it("contains the strict rules verbatim plus the cards and question", () => {
    const p = buildPrompt([makeCard()], "  Does it burn? ");
    expect(p.startsWith("Answer using ONLY the evidence cards below.")).toBe(true);
    expect(p).toContain('If the cards don\'t answer the question, say "Not in our evidence." Do not guess.');
    expect(p).toContain("[SAF-001]");
    expect(p.endsWith("Question: Does it burn?")).toBe(true);
    expect(STRICT_PROMPT.split("\n")).toHaveLength(7);
  });

  it("labels our reading as not NASA and keeps $ signs literally", () => {
    const card = makeCard({ team_interpretation: { text: "Costs $& more", suggested_by: "Bassam" } });
    expect(formatCard(card)).toContain("Our safety reading (team, not NASA): Costs $& more");
    expect(buildPrompt([card], "q")).toContain("Costs $& more");
  });
});

describe("citations", () => {
  const text = "Slow spread [SAF-001]. Also [FLX-002] and again [SAF-001]. Not [XYZ-001].";
  it("extracts unique IDs in order", () => {
    expect(extractCitations(text)).toEqual(["SAF-001", "FLX-002"]);
  });
  it("finds citations to cards the AI was not given", () => {
    expect(unknownCitations(text, ["SAF-001"])).toEqual(["FLX-002"]);
  });
  it("splits text around citations", () => {
    expect(splitCitations("A [SAF-001] b")).toEqual([
      { kind: "text", text: "A " },
      { kind: "cite", id: "SAF-001" },
      { kind: "text", text: " b" },
    ]);
  });
});

describe("demo answers", () => {
  const raw = [
    { question: "How fast does flame spread on cotton?", answer: "x [SAF-001]", card_ids: ["SAF-001"] },
    { question: "Missing card answer", answer: "y", card_ids: ["SAF-999"] },
    { question: "bad" },
  ];
  const usable = usableDemoAnswers(raw, new Set(["SAF-001"]));

  it("drops malformed entries and entries citing unknown cards", () => {
    expect(usable.map((a) => a.question)).toEqual(["How fast does flame spread on cotton?"]);
    expect(usableDemoAnswers({}, new Set())).toEqual([]);
  });

  it("matches close questions and rejects unrelated ones", () => {
    expect(matchDemoAnswer(usable, "how fast do flames spread on cotton")).not.toBeNull();
    expect(matchDemoAnswer(usable, "what is toxic smoke")).toBeNull();
  });
});
