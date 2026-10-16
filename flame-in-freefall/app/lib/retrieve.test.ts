import { describe, expect, it } from "vitest";
import { retrieve, scoreCard, stem, tokenize } from "./retrieve";
import { makeCard } from "./testCards";

describe("tokenize", () => {
  it("lowercases, drops stop words and cuts word endings", () => {
    expect(tokenize("How fast do the Flames spread on Cotton?")).toEqual(["fast", "flam", "spread", "cotton"]);
  });
  it("gives related word forms the same stem", () => {
    expect(new Set(["detect", "detected", "detection", "detects"].map(stem))).toEqual(new Set(["detect"]));
    expect(new Set(["ignite", "ignited", "ignition", "ignites"].map(stem))).toEqual(new Set(["ignit"]));
    expect(new Set(["flame", "flames"].map(stem))).toEqual(new Set(["flam"]));
    expect(new Set(["burn", "burning", "burned", "burns"].map(stem))).toEqual(new Set(["burn"]));
    expect(stem("glass")).toBe("glass");
    expect(stem("fire")).toBe("fire");
    expect(stem("0.68")).toBe("0.68");
  });
  it("matches a question word to a hazard name in another form", () => {
    const card = makeCard({ hazard: "detection", finding: "Some finding text here." });
    expect(retrieve([card], "How can a fire be detected?")).toHaveLength(1);
  });
  it("splits snake_case hazards and keeps decimals", () => {
    expect(tokenize("flame_spread at 0.68 cm/s")).toEqual(["flam", "spread", "0.68", "cm"]);
  });
  it("handles null and empty", () => {
    expect(tokenize(null)).toEqual([]);
    expect(tokenize("the of and")).toEqual([]);
  });
});

describe("retrieve", () => {
  const cotton = makeCard({ card_id: "SAF-002", finding: "Flame spread over cotton was slow.", material_or_fuel: "Cotton" });
  const nomex = makeCard({ card_id: "SAF-001", finding: "Nomex did not ignite.", hazard: "ignition", material_or_fuel: "Nomex" });
  const droplet = makeCard({ card_id: "FLX-001", finding: "Heptane droplet flames showed cool flame burning.", hazard: "extinction" });

  it("ranks the best-matching card first", () => {
    expect(retrieve([nomex, cotton, droplet], "Does cotton burn fast?").map((c) => c.card_id)[0]).toBe("SAF-002");
  });

  it("returns nothing when no word matches", () => {
    expect(retrieve([nomex, cotton], "What about chocolate cake?")).toEqual([]);
    expect(retrieve([nomex, cotton], "the of")).toEqual([]);
  });

  it("caps results at 8 and breaks ties by card_id", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeCard({ card_id: `SAF-${String(12 - i).padStart(3, "0")}`, finding: "Flame spread result." }),
    );
    const out = retrieve(many, "flame spread", 20);
    expect(out).toHaveLength(8);
    expect(out[0].card_id).toBe("SAF-001");
    expect(retrieve(many, "flame spread")).toHaveLength(6);
  });

  it("weights finding above conditions", () => {
    const inFinding = makeCard({ card_id: "SAF-009", finding: "Oxygen level matters a lot here." });
    const inConditions = makeCard({ card_id: "SAF-001", conditions: "oxygen 21%" });
    expect(scoreCard(inFinding, ["oxygen"])).toBeGreaterThan(scoreCard(inConditions, ["oxygen"]));
  });
});
