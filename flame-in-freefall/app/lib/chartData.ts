// Server-only: loads data/chart/*.json for the Data page.
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { DATA_DIR, getCardData } from "./cards";
import { parseChartSpec, type ChartSpec } from "./chart";

export function loadCharts(dataDir: string, sourceIds: ReadonlySet<string>): ChartSpec[] {
  const dir = path.join(dataDir, "chart");
  if (!fs.existsSync(dir)) return [];
  const out: ChartSpec[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch (e) {
      console.warn(`[chart] ${f} is not valid JSON: ${(e as Error).message}`);
      continue;
    }
    const readCsv = (name: string) => {
      const p = path.join(dir, path.basename(name));
      return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    };
    const spec = parseChartSpec(f.replace(/\.json$/, ""), raw, sourceIds, readCsv);
    if (typeof spec === "string") console.warn(`[chart] skipped ${spec}`);
    else out.push(spec);
  }
  return out;
}

export const getCharts = cache(() => loadCharts(DATA_DIR, new Set(getCardData().sources.map((s) => s.source_id))));
