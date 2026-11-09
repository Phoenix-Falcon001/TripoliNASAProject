"""Helpers for data/sources.csv (one row per paper)."""
import csv
import re
from pathlib import Path

COLUMNS = ["source_id", "title", "ntrs_id", "experiment", "source_type", "year", "url", "pdf_filename", "notes"]
EXPERIMENTS = {"SAFFIRE": "SAF", "FLEX": "FLX", "BASS-II": "BAS"}
SOURCE_TYPES = ("full_paper", "slides", "summary")
SOURCE_ID_RE = re.compile(r"^S\d{2}$")


def read_sources(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8", newline="") as f:
        return [r for r in csv.DictReader(f) if (r.get("source_id") or "").strip()]


def write_sources(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") or "" for c in COLUMNS})


def find_source(path: Path, source_id: str) -> dict | None:
    return next((r for r in read_sources(path) if r["source_id"] == source_id), None)
