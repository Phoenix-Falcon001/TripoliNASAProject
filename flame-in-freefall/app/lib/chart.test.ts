import { describe, expect, it } from "vitest";
import { parseChartSpec, toNumber } from "./chart";

const ids = new Set(["S01"]);
const noCsv = () => null;

describe("toNumber", () => {
  it("parses plain and approximate numbers only", () => {
    expect(toNumber("0.68")).toBe(0.68);
    expect(toNumber("~1.2")).toBe(1.2);
    expect(toNumber("1,000")).toBe(1000);
    expect(toNumber("< 0.1")).toBeNull();
    expect(toNumber("n/a")).toBeNull();
  });
});

describe("parseChartSpec", () => {
  const base = { title: "T", kind: "paper_table", source_id: "S01", page: 6, rows: [{ label: "A", value: "0.68" }, { label: "B", value: "<0.1" }] };

  it("keeps values as written and marks non-numbers", () => {
    const c = parseChartSpec("t", base, ids, noCsv);
    expect(typeof c).not.toBe("string");
    if (typeof c === "string") return;
    expect(c.rows).toEqual([
      { label: "A", value: "0.68", numeric: 0.68 },
      { label: "B", value: "<0.1", numeric: null },
    ]);
    expect(c.page).toBe(6);
  });

  it("rejects unknown sources, bad kinds and empty data", () => {
    expect(parseChartSpec("t", { ...base, source_id: "S09" }, ids, noCsv)).toMatch(/S09/);
    expect(parseChartSpec("t", { ...base, kind: "guess" }, ids, noCsv)).toMatch(/kind/);
    expect(parseChartSpec("t", { ...base, rows: [] }, ids, noCsv)).toMatch(/no rows/);
    expect(parseChartSpec("t", { ...base, rows: undefined }, ids, noCsv)).toMatch(/rows/);
  });

  it("reads PSI CSV files by column name", () => {
    const spec = { title: "T", kind: "psi_data", source_id: "S01", csv: "d.csv", label_column: "run", value_column: "rate" };
    const c = parseChartSpec("t", spec, ids, () => "run,rate\nR1,2.5\nR2,3\n");
    expect(typeof c === "string" ? c : c.rows.map((r) => r.numeric)).toEqual([2.5, 3]);
    expect(parseChartSpec("t", { ...spec, value_column: "nope" }, ids, () => "run,rate\nR1,2\n")).toMatch(/columns/);
    expect(parseChartSpec("t", spec, ids, noCsv)).toMatch(/not found/);
  });
});
