// Server-only: reads data/eval/summary.json written by `npm run eval:g1` / `npm run eval:summary`.
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { DATA_DIR } from "./cards";

export interface ModeMetrics {
  answers: number;
  invented_numbers_pct: number | null;
  cites_a_card_pct: number | null;
  not_in_evidence_correct_pct: number | null;
  unanswerable_questions: number;
  human_marked: number;
  verdict_correct_pct: number | null;
  verdict_partly_pct: number | null;
  verdict_wrong_pct: number | null;
  median_seconds: number | null;
  sample_data: boolean;
}

export interface EvalSummaryData {
  generated_at: string;
  questions: number;
  models: Record<string, { plain?: ModeMetrics; cards?: ModeMetrics }>;
}

export function parseSummary(raw: unknown): EvalSummaryData | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as EvalSummaryData;
  if (!s.models || typeof s.models !== "object" || Object.keys(s.models).length === 0) return null;
  return s;
}

/** null = no G1 results yet ("not measured yet"). */
export const getEvalSummary = cache((): EvalSummaryData | null => {
  const file = path.join(DATA_DIR, "eval", "summary.json");
  if (!fs.existsSync(file)) return null;
  try {
    return parseSummary(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    console.warn("[eval] summary.json is not valid JSON");
    return null;
  }
});

/** The headline for the home page: invented-number rate, plain vs cards, for the first model with both. */
export function headline(s: EvalSummaryData | null): { model: string; plain: number; cards: number; sample: boolean } | null {
  if (!s) return null;
  for (const [model, m] of Object.entries(s.models)) {
    if (m.plain?.invented_numbers_pct != null && m.cards?.invented_numbers_pct != null) {
      return { model, plain: m.plain.invented_numbers_pct, cards: m.cards.invented_numbers_pct, sample: m.plain.sample_data || m.cards.sample_data };
    }
  }
  return null;
}
