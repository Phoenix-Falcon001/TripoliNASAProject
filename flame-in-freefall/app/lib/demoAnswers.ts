import { tokenize } from "./retrieve";

/** One pre-written answer in data/demo_answers.json (used when Ollama is offline). */
export interface DemoAnswer {
  question: string;
  answer: string;
  /** Every card the answer cites. Entries citing cards not in the current set are ignored. */
  card_ids: string[];
}

export function isDemoAnswer(x: unknown): x is DemoAnswer {
  const d = x as DemoAnswer;
  return (
    !!d &&
    typeof d.question === "string" &&
    typeof d.answer === "string" &&
    Array.isArray(d.card_ids) &&
    d.card_ids.every((id) => typeof id === "string")
  );
}

/** Keeps well-formed entries whose cited cards all exist in the shown card set. */
export function usableDemoAnswers(raw: unknown, cardIds: ReadonlySet<string>): DemoAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isDemoAnswer).filter((d) => d.card_ids.length > 0 && d.card_ids.every((id) => cardIds.has(id)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export const MATCH_THRESHOLD = 0.6;

/** Best pre-written answer whose question is close enough to the asked one, or null. */
export function matchDemoAnswer(answers: readonly DemoAnswer[], question: string): DemoAnswer | null {
  const q = new Set(tokenize(question));
  let best: DemoAnswer | null = null;
  let bestScore = 0;
  for (const a of answers) {
    const s = jaccard(q, new Set(tokenize(a.question)));
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}
