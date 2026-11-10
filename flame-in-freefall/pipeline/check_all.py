"""Run validate_cards on every data/drafts/*_drafts.json and print a summary per source.

Usage:
    python pipeline/check_all.py
"""
import re
import sys
from collections import Counter
from pathlib import Path

from validate_cards import validate_file

ROOT = Path(__file__).resolve().parent.parent

REASON_GROUPS = [
    (r"^schema:", "schema error"),
    (r"^quote is \d+ words", "quote too long"),
    (r"^quote not on page .* but found on page", "wrong page number"),
    (r"^quote not found", "quote not found"),
    (r"^numbers not on page", "number not on page"),
    (r"has no extracted text", "page has no text"),
]


def reason_group(reason: str) -> str:
    for pattern, name in REASON_GROUPS:
        if re.search(pattern, reason):
            return name
    return "other"


def summarise(cards: list[dict]) -> dict:
    reasons = Counter(reason_group(r) for c in cards for r in (c.get("auto_check") or {}).get("reasons", []))
    return {
        "drafted": len(cards),
        "ok": sum(c.get("status") == "draft" for c in cards),
        "flagged": sum(c.get("status") == "flagged" for c in cards),
        "top_reasons": reasons.most_common(3),
    }


def main(root: Path = ROOT) -> int:
    files = sorted((root / "data" / "drafts").glob("*_drafts.json"))
    if not files:
        print("No data/drafts/*_drafts.json files yet.")
        return 0
    failed = 0
    print(f"{'source':<8}{'drafted':>8}{'OK':>6}{'flagged':>9}   top flag reasons")
    for f in files:
        sid = f.name.split("_")[0]
        try:
            cards, _ = validate_file(f, root)
        except (FileNotFoundError, ValueError) as e:
            print(f"{sid:<8}  ERROR: {e}")
            failed += 1
            continue
        s = summarise(cards)
        top = ", ".join(f"{name} ({n})" for name, n in s["top_reasons"]) or "-"
        print(f"{sid:<8}{s['drafted']:>8}{s['ok']:>6}{s['flagged']:>9}   {top}")
    print("\nChecked files written next to each drafts file (<SXX>_checked.json). Review them at /review.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
