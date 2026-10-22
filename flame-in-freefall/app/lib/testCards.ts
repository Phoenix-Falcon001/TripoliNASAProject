import type { Card } from "./types";

/** Minimal valid card for unit tests. Not used by the app. */
export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    card_id: "SAF-001",
    source_id: "S01",
    page: 1,
    evidence_quote: "A test quote that is long enough.",
    finding: "A test finding that is long enough.",
    hazard: "flame_spread",
    control_category: "prevent",
    scores: { crew_safety: 3, evidence: 3, moon_mars: 3 },
    score_reasons: { crew_safety: "r", evidence: "r", moon_mars: "r" },
    source_type: "full_paper",
    status: "verified",
    ...overrides,
  };
}
