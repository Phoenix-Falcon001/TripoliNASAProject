# Chart data (Data page)

Each `*.json` file here becomes one chart on the Data page, shown in the blue **NASA found** layer
with its source. **Only values copied from a NASA paper table or a NASA PSI data file. Never estimate or invent values.**

```json
{
  "title": "Flame spread rate by material",
  "kind": "paper_table",
  "source_id": "S01",
  "page": 6,
  "source_note": "Table 2",
  "value_label": "Flame spread rate",
  "unit": "cm/s",
  "rows": [
    { "label": "Material A", "value": "0.68" },
    { "label": "Material B", "value": "~1.2" }
  ]
}
```

- `kind`: `"paper_table"` (typed from a table in a paper, shown with the label "from paper table") or `"psi_data"` (a CSV from NASA's Physical Sciences Informatics system).
- `source_id` must exist in `data/sources.csv`. `page` is the PDF page index.
- `value` is text exactly as written. Values that aren't plain numbers (e.g. `"< 0.1"`) are shown in the table but left out of the bars.
- For PSI data, put the CSV next to the JSON and use `"csv": "file.csv", "label_column": "...", "value_column": "..."` instead of `rows`. Put the PSI dataset link in `source_note`.
