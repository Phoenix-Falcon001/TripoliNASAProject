// Charts on the Data page come only from files in data/chart/ (see data/chart/README.md):
// tables typed from a NASA paper, or NASA PSI CSV files. Never estimated values.
import { parseCsv } from "./csv";

export interface ChartRow {
  label: string;
  /** Exactly as written in the source. */
  value: string;
  /** Plotted value, or null if the text is not a plain number (shown in the table only). */
  numeric: number | null;
}

export interface ChartSpec {
  id: string;
  title: string;
  kind: "paper_table" | "psi_data";
  source_id: string;
  page: number | null;
  source_note: string;
  value_label: string;
  unit: string;
  rows: ChartRow[];
}

/** "0.68" → 0.68, "~1.2" → 1.2 (approximation sign kept in the text), "< 0.1" → null. */
export function toNumber(v: string): number | null {
  const t = v.trim().replace(/^[~≈]\s*/, "").replace(/,/g, "");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

/**
 * Validates one chart file. `readCsv` returns the text of a CSV next to the JSON (PSI data).
 * Returns the chart or an error message.
 */
export function parseChartSpec(
  id: string,
  raw: unknown,
  sourceIds: ReadonlySet<string>,
  readCsv: (name: string) => string | null,
): ChartSpec | string {
  if (!raw || typeof raw !== "object") return `${id}: not a JSON object`;
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
  const kind = o.kind;
  if (kind !== "paper_table" && kind !== "psi_data") return `${id}: kind must be "paper_table" or "psi_data"`;
  if (!str("title")) return `${id}: title is required`;
  if (!sourceIds.has(str("source_id"))) return `${id}: source_id ${str("source_id") || "(missing)"} is not in sources.csv`;

  let rawRows: { label: string; value: string }[] = [];
  if (Array.isArray(o.rows)) {
    rawRows = (o.rows as Record<string, unknown>[]).map((r) => ({ label: String(r?.label ?? "").trim(), value: String(r?.value ?? "").trim() }));
  } else if (str("csv")) {
    const text = readCsv(str("csv"));
    if (text === null) return `${id}: CSV file ${str("csv")} not found in data/chart/`;
    const [lc, vc] = [str("label_column"), str("value_column")];
    const rows = parseCsv(text);
    if (rows.length && (!(lc in rows[0]) || !(vc in rows[0]))) return `${id}: CSV needs columns ${lc} and ${vc}`;
    rawRows = rows.map((r) => ({ label: r[lc] ?? "", value: r[vc] ?? "" }));
  } else return `${id}: needs "rows" or "csv"`;

  const rows = rawRows.filter((r) => r.label && r.value).map((r) => ({ ...r, numeric: toNumber(r.value) }));
  if (rows.length === 0) return `${id}: no rows`;
  return {
    id,
    title: str("title"),
    kind,
    source_id: str("source_id"),
    page: Number.isInteger(o.page) ? (o.page as number) : null,
    source_note: str("source_note"),
    value_label: str("value_label") || "Value",
    unit: str("unit"),
    rows,
  };
}
