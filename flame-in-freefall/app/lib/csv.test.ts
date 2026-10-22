import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses a header and rows, keeping empty fields", () => {
    expect(parseCsv("a,b,c\n1,,3\n")).toEqual([{ a: "1", b: "", c: "3" }]);
  });

  it("handles quoted fields with commas, quotes and newlines", () => {
    const text = 'id,title\nS01,"Fire, in ""space""\nPart 2"\r\nS02,Plain\r\n';
    expect(parseCsv(text)).toEqual([
      { id: "S01", title: 'Fire, in "space"\nPart 2' },
      { id: "S02", title: "Plain" },
    ]);
  });

  it("ignores blank lines and a BOM, and fills missing trailing fields", () => {
    expect(parseCsv("﻿a,b\n\nx\n")).toEqual([{ a: "x", b: "" }]);
  });

  it("returns [] for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
