"""D3 - copy human-approved cards into data/cards.json.

Usage:
    python pipeline/promote_verified.py            # dry run: shows what would change
    python pipeline/promote_verified.py --write    # writes data/cards.json

Reads data/drafts/*_checked.json (from validate_cards.py) and the decisions saved
by the app's review page (http://localhost:3000/review, dev mode only) in
data/review/*_decisions.json.

A card goes into cards.json only if:
  1. a human marked it "verified" on the review page,
  2. the card has not changed since that decision (fingerprint matches),
  3. it passes schema/card.schema.json,
  4. its source_id is in data/sources.csv and its ID prefix matches that
     source's experiment (SAF = SAFFIRE, FLX = FLEX, BAS = BASS-II).
A card later marked "flagged" or "rejected" is removed from cards.json.
Cards already in cards.json that have no checked file are kept as they are.
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
PREFIX_EXPERIMENT = {"SAF": "SAFFIRE", "FLX": "FLEX", "BAS": "BASS-II"}

# Fields a review decision does NOT cover: changing them does not invalidate it.
# Must match REVIEW_EXCLUDED in app/lib/review.ts.
REVIEW_EXCLUDED = {"status", "reviewed_by", "auto_check", "expert_checked"}


def fingerprint(card: dict) -> str:
    """Short hash of the reviewed content of a card. Same as cardFingerprint() in app/lib/review.ts."""
    content = {k: v for k, v in card.items() if k not in REVIEW_EXCLUDED}
    canon = json.dumps(content, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()[:16]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_sources(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as f:
        return {r["source_id"].strip(): r for r in csv.DictReader(f) if r.get("source_id", "").strip()}


def card_problems(card: dict, validator, sources: dict[str, dict]) -> list[str]:
    problems = []
    for err in validator.iter_errors(card):
        where = "/".join(str(x) for x in err.path) or "(card)"
        problems.append(f"schema: {where}: {err.message}")
    sid = card.get("source_id", "")
    src = sources.get(sid)
    if src is None:
        problems.append(f"source_id {sid} is not in data/sources.csv")
    else:
        prefix = str(card.get("card_id", ""))[:3]
        expected = PREFIX_EXPERIMENT.get(prefix)
        actual = (src.get("experiment") or "").strip()
        if expected and actual.upper() != expected:
            problems.append(f"ID prefix {prefix} means {expected}, but {sid} is '{actual}' in sources.csv")
    return problems


def plan(root: Path = ROOT) -> dict:
    """Works out the new cards.json. Pure apart from reading files."""
    data = root / "data"
    validator = Draft202012Validator(load_json(root / "schema" / "card.schema.json"))
    sources = load_sources(data / "sources.csv")

    errors: list[str] = []
    warnings: list[str] = []

    checked: dict[str, dict] = {}
    for f in sorted((data / "drafts").glob("*_checked.json")):
        for card in load_json(f):
            cid = card.get("card_id")
            if cid in checked:
                errors.append(f"{cid} appears in more than one checked file (also in {f.name})")
                continue
            checked[cid] = card

    decisions: dict[str, dict] = {}
    for f in sorted((data / "review").glob("*_decisions.json")):
        decisions.update(load_json(f))

    cards_path = data / "cards.json"
    existing = {c["card_id"]: c for c in (load_json(cards_path) if cards_path.exists() else [])}
    result = dict(existing)
    added, updated, removed, skipped = [], [], [], []

    for cid, d in sorted(decisions.items()):
        card = checked.get(cid)
        if card is None:
            warnings.append(f"{cid}: decision saved but card not in any data/drafts/*_checked.json")
            continue
        if d.get("fingerprint") != fingerprint(card):
            warnings.append(f"{cid}: card changed after it was reviewed - review it again")
            skipped.append(cid)
            continue
        status = d.get("status")
        if status == "verified":
            new = {k: v for k, v in card.items()}
            new["status"] = "verified"
            new["reviewed_by"] = d.get("reviewed_by")
            problems = card_problems(new, validator, sources)
            if problems:
                errors.extend(f"{cid}: {p}" for p in problems)
                skipped.append(cid)
                continue
            if (card.get("auto_check") or {}).get("reasons"):
                warnings.append(f"{cid}: approved although auto-check flagged it: "
                                + "; ".join(card["auto_check"]["reasons"]))
            if cid not in existing:
                added.append(cid)
            elif existing[cid] != new:
                updated.append(cid)
            result[cid] = new
        elif status in ("flagged", "rejected") and cid in result:
            del result[cid]
            removed.append(cid)

    final = [result[k] for k in sorted(result)]
    ids = set(result)
    for c in final:
        for r in c.get("related_cards") or []:
            if r.get("card_id") not in ids:
                warnings.append(f"{c['card_id']}: related card {r.get('card_id')} is not verified (yet)")

    not_reviewed = sorted(set(checked) - set(decisions))
    return {
        "cards": final, "errors": errors, "warnings": warnings,
        "added": added, "updated": updated, "removed": removed, "skipped": skipped,
        "not_reviewed": not_reviewed, "path": cards_path,
    }


def main() -> None:
    write = "--write" in sys.argv[1:]
    p = plan()
    print(f"cards.json would have {len(p['cards'])} verified cards")
    print(f"  added:   {', '.join(p['added']) or '-'}")
    print(f"  updated: {', '.join(p['updated']) or '-'}")
    print(f"  removed: {', '.join(p['removed']) or '-'}")
    print(f"  skipped: {', '.join(p['skipped']) or '-'}")
    if p["not_reviewed"]:
        print(f"  not reviewed yet: {len(p['not_reviewed'])} ({', '.join(p['not_reviewed'])})")
    for w in p["warnings"]:
        print(f"WARNING {w}")
    for e in p["errors"]:
        print(f"ERROR   {e}")

    if write:
        text = json.dumps(p["cards"], ensure_ascii=False, indent=2) + "\n"
        p["path"].write_text(text, encoding="utf-8")
        print(f"\nWrote {p['path'].relative_to(ROOT)}. Restart or rebuild the app to see the changes.")
    else:
        print("\nDry run. Add --write to update data/cards.json.")
    if p["errors"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
