import { describe, expect, it } from "vitest";
import { retrieve, scoreCard, tokenize } from "./retrieve";
import { makeCard } from "./testCards";

describe("tokenize", () => {
  it("lowercases, drops stop words and strips plurals", () => {
    expect(tokenize("How fast do the Flames spread on Cotton?")).toEqual(["fast", "flame", "spread", "cotton"]);
  });
  it("splits snake_case hazards and keeps decimals", () => {
    expect(tokenize("flame_spread at 0.68 cm/s")).toEqual(["flame", "spread", "0.68", "cm"]);
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
