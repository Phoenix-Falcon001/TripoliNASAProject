import Link from "next/link";
import { splitCitations } from "@/lib/citations";

/**
 * Renders AI text with [CARD-ID] citations as links to the card pages. Keeps line breaks.
 * If `knownIds` is given, citations not in it are shown as flagged plain text, not links.
 */
export default function CitedText({ text, knownIds }: { text: string; knownIds?: readonly string[] }) {
  const known = knownIds ? new Set(knownIds) : null;
  return (
    <span className="whitespace-pre-wrap">
      {splitCitations(text).map((s, i) =>
        s.kind === "text" ? (
          <span key={i}>{s.text}</span>
        ) : known && !known.has(s.id) ? (
          <span key={i} className="whitespace-nowrap font-mono text-sm font-semibold text-red-800" title="This card was not given to the AI">
            [{s.id} ⚠ not given]
          </span>
        ) : (
          <Link key={i} href={`/card/${s.id}`} className="whitespace-nowrap font-mono text-sm text-blue-900 underline">
            [{s.id}]
          </Link>
        ),
      )}
    </span>
  );
}
