"""D0 - add a new paper in one command.

Usage:
    python pipeline/add_paper.py papers/S02.pdf S02 --experiment FLEX --type full_paper \\
        --title "Paper title" --url "https://ntrs.nasa.gov/citations/..." [--ntrs 2019...] [--year 2019]

Adds the row to data/sources.csv (source ids must be unique), extracts the text
to data/text/<SXX>.json and prints the next steps.
"""
import argparse
import json
import sys
from pathlib import Path

from sources import EXPERIMENTS, SOURCE_ID_RE, SOURCE_TYPES, read_sources, write_sources

ROOT = Path(__file__).resolve().parent.parent


def add_source_row(sources_csv: Path, *, source_id: str, title: str, experiment: str, source_type: str,
                   url: str = "", ntrs_id: str = "", year: str = "", pdf_filename: str = "") -> dict:
    """Validates and appends one row. Raises ValueError on a bad or duplicate id."""
    if not SOURCE_ID_RE.match(source_id):
        raise ValueError(f"source id must look like S02, got {source_id!r}")
    if experiment not in EXPERIMENTS:
        raise ValueError(f"experiment must be one of {', '.join(EXPERIMENTS)}")
    if source_type not in SOURCE_TYPES:
        raise ValueError(f"type must be one of {', '.join(SOURCE_TYPES)}")
    if not title.strip():
        raise ValueError("title is required")
    rows = read_sources(sources_csv)
    if any(r["source_id"] == source_id for r in rows):
        raise ValueError(f"{source_id} is already in {sources_csv.name} - pick the next free id")
    row = {"source_id": source_id, "title": title.strip(), "ntrs_id": ntrs_id, "experiment": experiment,
           "source_type": source_type, "year": year, "url": url, "pdf_filename": pdf_filename, "notes": ""}
    write_sources(sources_csv, rows + [row])
    return row


def next_free_id(sources_csv: Path) -> str:
    used = {int(r["source_id"][1:]) for r in read_sources(sources_csv) if SOURCE_ID_RE.match(r["source_id"])}
    n = 1
    while n in used:
        n += 1
    return f"S{n:02d}"


def main() -> None:
    ap = argparse.ArgumentParser(description="Add a paper: sources.csv row + extracted text.")
    ap.add_argument("pdf", type=Path)
    ap.add_argument("source_id")
    ap.add_argument("--experiment", required=True, choices=list(EXPERIMENTS))
    ap.add_argument("--type", dest="source_type", default="full_paper", choices=SOURCE_TYPES)
    ap.add_argument("--title", required=True)
    ap.add_argument("--url", default="")
    ap.add_argument("--ntrs", default="")
    ap.add_argument("--year", default="")
    a = ap.parse_args()

    sources_csv = ROOT / "data" / "sources.csv"
    if not a.pdf.exists():
        sys.exit(f"PDF not found: {a.pdf}")
    try:
        add_source_row(sources_csv, source_id=a.source_id, title=a.title, experiment=a.experiment,
                       source_type=a.source_type, url=a.url, ntrs_id=a.ntrs, year=a.year,
                       pdf_filename=a.pdf.name)
    except ValueError as e:
        sys.exit(f"{e} (next free id: {next_free_id(sources_csv)})")

    from extract_text import extract  # needs pdfplumber
    pages = extract(a.pdf)
    out = ROOT / "data" / "text" / f"{a.source_id}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(pages, ensure_ascii=False, indent=1), encoding="utf-8")
    empty = [p for p, t in pages.items() if len(t.strip()) < 50]

    print(f"Added {a.source_id} ({a.experiment}) to data/sources.csv")
    print(f"Extracted {len(pages)} pages -> {out.relative_to(ROOT)}")
    if empty:
        print(f"  WARNING: little or no text on pages {', '.join(empty)} - quotes there cannot be auto-checked.")
    print("\nNext steps:")
    print(f"  1. Draft cards:   python pipeline/draft_cards.py {a.source_id}      (needs Ollama)")
    print(f"     or write data/drafts/{a.source_id}_drafts.json by hand, then:")
    print(f"     python pipeline/validate_cards.py data/drafts/{a.source_id}_drafts.json")
    print("  2. Review:        cd app && npm run dev  ->  http://localhost:3000/review")
    print("  3. Promote:       python pipeline/promote_verified.py --write")


if __name__ == "__main__":
    main()
