const CITATION_RE = /\[((?:SAF|FLX|BAS|DEMO)-\d{3})\]/g;

/** Card IDs cited like [SAF-001], in order of first appearance, without duplicates. */
export function extractCitations(text: string): string[] {
  return [...new Set([...text.matchAll(CITATION_RE)].map((m) => m[1]))];
}

/** Cited IDs that were NOT among the cards given to the AI (a warning sign). */
export function unknownCitations(text: string, givenIds: readonly string[]): string[] {
  const given = new Set(givenIds);
  return extractCitations(text).filter((id) => !given.has(id));
}

export type Segment = { kind: "text"; text: string } | { kind: "cite"; id: string };

/** Splits text into plain runs and [ID] citations, for rendering citations as links. */
export function splitCitations(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(CITATION_RE)) {
    if (m.index! > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "cite", id: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
