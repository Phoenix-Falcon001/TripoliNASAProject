// Types for one evidence card. Mirrors ../schema/card.schema.json exactly:
// fields in the schema's "required" list are required here, all others optional,
// and every "null" allowed by the schema is allowed here. If the schema changes,
// change this file too (the schema wins).

export const HAZARDS = [
  "flame_spread",
  "ignition",
  "heat_release",
  "toxic_products",
  "extinction",
  "detection",
  "material_flammability",
  "other",
] as const;
export type Hazard = (typeof HAZARDS)[number];

export const CONTROL_CATEGORIES = ["prevent", "detect", "suppress", "material_selection"] as const;
export type ControlCategory = (typeof CONTROL_CATEGORIES)[number];

export type SuggestedBy = "Claude" | "Ollama" | "Bassam" | "Nermine";
export type Relation = "agrees" | "conflicts" | "extends";
export type SourceType = "full_paper" | "slides" | "summary";
export type CardStatus = "draft" | "flagged" | "verified" | "rejected";

export interface CardValue {
  quantity: string;
  /** Kept as text exactly as written, e.g. "0.68" or "~2". */
  value: string;
  unit: string;
}

export interface TeamInterpretation {
  text: string;
  suggested_by: SuggestedBy;
}

export interface RelatedCard {
  card_id: string;
  relation: Relation;
}

export interface Scores {
  crew_safety: number; // integer 1–5
  evidence: number; // integer 1–5
  moon_mars: number; // integer 1–5
}

export interface ScoreReasons {
  crew_safety: string;
  evidence: string;
  moon_mars: string;
}

export interface AutoCheck {
  quote_found?: boolean;
  quote_score?: number;
  numbers_found?: boolean;
  missing_numbers?: string[];
  reasons?: string[];
}

export interface Card {
  /** SAF-### (SAFFIRE), FLX-### (FLEX), BAS-### (BASS-II). DEMO-### only in sample data. */
  card_id: string;
  source_id: string;
  /** PDF page index (1 = first page of the file), not the printed page number. */
  page: number;
  evidence_quote: string;
  finding: string;
  material_or_fuel?: string | null;
  conditions?: string | null;
  values?: CardValue[];
  earth_comparison?: string | null;
  hazard: Hazard;
  control_category: ControlCategory;
  team_interpretation?: TeamInterpretation | null;
  open_question?: string | null;
  related_cards?: RelatedCard[];
  scores: Scores;
  score_reasons: ScoreReasons;
  source_type: SourceType;
  auto_check?: AutoCheck;
  status: CardStatus;
  reviewed_by?: string | null;
  expert_checked?: boolean;
}

/** One row of data/sources.csv. */
export interface Source {
  source_id: string;
  title: string;
  ntrs_id: string;
  experiment: string;
  source_type: string;
  year: string;
  url: string;
  pdf_filename: string;
  notes: string;
}

export const HAZARD_LABELS: Record<Hazard, string> = {
  flame_spread: "Flame spread",
  ignition: "Ignition",
  heat_release: "Heat release",
  toxic_products: "Toxic products",
  extinction: "Extinction",
  detection: "Detection",
  material_flammability: "Material flammability",
  other: "Other",
};

export const CONTROL_LABELS: Record<ControlCategory, string> = {
  prevent: "Prevent",
  detect: "Detect",
  suppress: "Suppress",
  material_selection: "Material selection",
};
