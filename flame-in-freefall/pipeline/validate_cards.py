"""D2 - automatic checks on draft cards.

Usage:
    python pipeline/validate_cards.py data/drafts/S01_drafts.json

Needs data/text/<source_id>.json from extract_text.py.
Writes data/drafts/S01_checked.json and prints a report.

For each card:
  1. fields match schema/card.schema.json
  2. evidence_quote is <= 25 words and found on the stated page (fuzzy >= 90)
  3. every number in finding / conditions / values / earth_comparison / quote
     appears on that page
-> status "draft" (passed, ready for Bassam) or "flagged" (with reasons).
The script never sets "verified": only a human does that.
"""
import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator
from rapidfuzz import fuzz

ROOT = Path(__file__).resolve().parent.parent
QUOTE_THRESHOLD = 90
MAX_QUOTE_WORDS = 25
NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)*")


def normalise(text: str) -> str:
    text = re.sub(r"-\s*\n\s*", "", text)            # re-join words hyphenated across lines
    text = (text.replace("\u2019", "'").replace("\u2018", "'")
                .replace("\u201c", '"').replace("\u201d", '"')
                .replace("\u2013", "-").replace("\u2014", "-").replace("\u2212", "-")
                .replace("\ufb01", "fi").replace("\ufb02", "fl"))
    return re.sub(r"\s+", " ", text).strip().lower()


def number_forms(raw: str) -> set[str]:
    """'1,000' -> {'1,000','1000'};  '0.5' -> {'0.5','.5'}"""
    forms = {raw, raw.replace(",", "")}
    for f in list(forms):
        if f.startswith("0."):
            forms.add(f[1:])
    return forms


def numbers_in(text: str) -> set[str]:
    return {n for n in NUMBER_RE.findall(text or "")}


def number_on_page(num: str, page_text: str) -> bool:
    for form in number_forms(num):
        if re.search(rf"(?<![\d.]){re.escape(form)}(?![\d])", page_text):
            return True
    return False


def card_numbers(card: dict) -> set[str]:
    parts = [card.get("finding"), card.get("conditions"),
             card.get("earth_comparison"), card.get("evidence_quote")]
    parts += [v.get("value", "") for v in card.get("values", [])]
    nums = set()
    for p in parts:
        nums |= numbers_in(p or "")
    return nums


def check_card(card: dict, pages: dict[str, str], validator) -> dict:
    reasons = []

    for err in validator.iter_errors(card):
        where = "/".join(str(x) for x in err.path) or "(card)"
        reasons.append(f"schema: {where}: {err.message}")

    page = str(card.get("page", ""))
    page_text = normalise(pages.get(page, ""))
    if not page_text:
        reasons.append(f"page {page} has no extracted text")

    # quote
    quote = card.get("evidence_quote", "")
    if len(quote.split()) > MAX_QUOTE_WORDS:
        reasons.append(f"quote is {len(quote.split())} words (max {MAX_QUOTE_WORDS})")
    q = normalise(quote)
    score = fuzz.partial_ratio(q, page_text) if q and page_text else 0.0
    quote_found = score >= QUOTE_THRESHOLD
    if not quote_found:
        # help the reviewer: is it on a neighbouring page? (page numbering mix-up)
        best = max(((fuzz.partial_ratio(q, normalise(t)), p) for p, t in pages.items()),
                   default=(0, None))
        if best[0] >= QUOTE_THRESHOLD:
            reasons.append(f"quote not on page {page} but found on page {best[1]} "
                           f"(score {best[0]:.0f}) - fix the page number?")
        else:
            reasons.append(f"quote not found (best match {score:.0f} on stated page)")

    # numbers
    missing = sorted(n for n in card_numbers(card) if not number_on_page(n, page_text))
    if missing:
        reasons.append(f"numbers not on page {page}: {', '.join(missing)}")

    card["auto_check"] = {
        "quote_found": quote_found,
        "quote_score": round(score, 1),
        "numbers_found": not missing,
        "missing_numbers": missing,
        "reasons": reasons,
    }
    if card.get("status") not in ("verified", "rejected"):
        card["status"] = "flagged" if reasons else "draft"
    return card


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: python pipeline/validate_cards.py data/drafts/<SXX>_drafts.json")
    drafts_path = Path(sys.argv[1])
    cards = json.loads(drafts_path.read_text(encoding="utf-8"))
    schema = json.loads((ROOT / "schema" / "card.schema.json").read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)

    text_cache: dict[str, dict] = {}
    for card in cards:
        sid = card.get("source_id", "")
        if sid not in text_cache:
            tp = ROOT / "data" / "text" / f"{sid}.json"
            if not tp.exists():
                sys.exit(f"Missing {tp} - run extract_text.py for {sid} first.")
            text_cache[sid] = json.loads(tp.read_text(encoding="utf-8"))
        check_card(card, text_cache[sid], validator)

    out = drafts_path.with_name(drafts_path.name.replace("_drafts", "_checked"))
    out.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")

    ok = [c for c in cards if c["status"] == "draft"]
    flagged = [c for c in cards if c["status"] == "flagged"]
    print(f"{len(cards)} cards: {len(ok)} OK, {len(flagged)} FLAGGED -> {out}")
    for c in flagged:
        print(f"\n  {c.get('card_id', '?')}")
        for r in c["auto_check"]["reasons"]:
            print(f"    - {r}")


if __name__ == "__main__":
    main()
