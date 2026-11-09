// AI-written text (ai_cache.json explanations, demo_answers.json answers) is shown in the
// app only after a person has checked it: the entry must have a non-empty "checked_by".

export interface AiCacheEntry {
  text: string;
  checked_by: string | null;
  model?: string;
  drafted_at?: string;
}

/** The text to show for an ai_cache entry, or null if it is missing or not checked yet. */
export function checkedText(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const e = entry as Partial<AiCacheEntry>;
  return typeof e.text === "string" && e.text.trim() && typeof e.checked_by === "string" && e.checked_by.trim() ? e.text : null;
}
