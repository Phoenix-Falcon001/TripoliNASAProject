"""D1 - PDF -> text per page.

Usage:
    python pipeline/extract_text.py papers/S01.pdf S01
Writes data/text/S01.json  ->  {"1": "page one text", "2": "...", ...}
Page keys are PDF page indexes (1 = first page of the file).
"""
import json
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent


def extract(pdf_path: Path) -> dict[str, str]:
    pages = {}
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            pages[str(i)] = page.extract_text() or ""
    return pages


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("Usage: python pipeline/extract_text.py <pdf> <source_id>")
    pdf_path, source_id = Path(sys.argv[1]), sys.argv[2]
    pages = extract(pdf_path)

    out = ROOT / "data" / "text" / f"{source_id}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(pages, ensure_ascii=False, indent=1), encoding="utf-8")

    empty = [p for p, t in pages.items() if len(t.strip()) < 50]
    print(f"{source_id}: {len(pages)} pages -> {out.relative_to(ROOT)}")
    if empty:
        print(f"  WARNING: little or no text on pages {', '.join(empty)} "
              "(scanned images? figures only?) - quotes there cannot be auto-checked.")


if __name__ == "__main__":
    main()
