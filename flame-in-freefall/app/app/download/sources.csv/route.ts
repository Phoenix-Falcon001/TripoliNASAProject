import { getCardData } from "@/lib/cards";

function csvField(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function GET() {
  const { sources, isSample } = getCardData();
  const cols = ["source_id", "title", "ntrs_id", "experiment", "source_type", "year", "url", "pdf_filename", "notes"] as const;
  const body = [cols.join(","), ...sources.map((s) => cols.map((c) => csvField(s[c])).join(","))].join("\n") + "\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${isSample ? "SAMPLE_sources.csv" : "sources.csv"}"`,
    },
  });
}
