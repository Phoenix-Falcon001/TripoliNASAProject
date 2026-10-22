// Highlighting the evidence quote and the card's numbers inside a page's extracted text.
// Pure, client-safe.

export type HighlightKind = "plain" | "quote" | "number";
export interface HighlightSegment {
  kind: HighlightKind;
  text: string;
}

/** One-to-one character folding (keeps string length) so indices map back to the display text. */
function fold(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .toLowerCase();
}

/** Page text with all whitespace runs collapsed to single spaces. */
export function displayText(pageText: string): string {
  return pageText.replace(/-\s*\n\s*/g, "").replace(/\s+/g, " ").trim();
}

/** Numbers that appear in a card's finding, conditions, Earth comparison, quote and values. */
export function cardNumbers(texts: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const t of texts) for (const m of (t ?? "").matchAll(/\d+(?:[.,]\d+)*/g)) out.add(m[0]);
  return [...out];
}

export interface HighlightResult {
  segments: HighlightSegment[];
  quoteFound: boolean;
}

/**
 * Splits the (collapsed) page text into plain / quote / number segments.
 * The quote is matched exactly after folding case, quotes and dashes.
 */
export function highlight(pageText: string, quote: string, numbers: readonly string[]): HighlightResult {
  const text = displayText(pageText);
  const folded = fold(text);
  const q = fold(displayText(quote));
  const kinds: HighlightKind[] = new Array(text.length).fill("plain");

  let quoteFound = false;
  if (q.length > 0) {
    const at = folded.indexOf(q);
    if (at >= 0) {
      quoteFound = true;
      for (let i = at; i < at + q.length; i++) kinds[i] = "quote";
    }
  }
  for (const n of numbers) {
    const re = new RegExp(`(?<![\\d.])${n.replace(/[.,]/g, (c) => `\\${c}`)}(?!\\d)`, "g");
    for (const m of text.matchAll(re)) {
      for (let i = m.index!; i < m.index! + m[0].length; i++) if (kinds[i] === "plain") kinds[i] = "number";
    }
  }

  const segments: HighlightSegment[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = segments[segments.length - 1];
    if (last && last.kind === kinds[i]) last.text += text[i];
    else segments.push({ kind: kinds[i], text: text[i] });
  }
  return { segments, quoteFound };
}
