"""D5 - draft evidence cards from a paper with the local AI (Ollama).

Usage:
    python pipeline/draft_cards.py S02                  # uses OLLAMA_MODEL or llama3.1:8b
    python pipeline/draft_cards.py S02 --pages 3-9 --model qwen2.5:7b

Needs data/text/<SXX>.json (from add_paper.py / extract_text.py) and Ollama running.
Sends the page text in small chunks with a strict drafting prompt, turns the answers
into schema-format cards with status "draft", appends them to
data/drafts/<SXX>_drafts.json and runs the validator on that file.

Safety: this script NEVER sets status "verified". Drafts whose quote cannot be found
anywhere in the paper are dropped (use --keep-unmatched to keep them, flagged).
Every draft must still be approved by a human on the Review page.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable

from rapidfuzz import fuzz

from sources import EXPERIMENTS, find_source
from validate_cards import QUOTE_THRESHOLD, normalise, validate_file

ROOT = Path(__file__).resolve().parent.parent
OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.1:8b"
HAZARDS = {"flame_spread", "ignition", "heat_release", "toxic_products", "extinction", "detection",
           "material_flammability", "other"}
CONTROLS = {"prevent", "detect", "suppress", "material_selection"}

DRAFT_PROMPT = """You extract evidence cards from ONE NASA fire-safety document. Use ONLY the pages below.
Rules:
- evidence_quote: copy ONE sentence (or part of one) EXACTLY as written on the page, at most 25 words. Give its page number.
- finding: what the authors reported, in plain words. No advice, no opinion.
- values: only numbers written on that page, kept exactly as written (e.g. "0.68", "~2"), with their unit.
- open_question: only if the authors themselves say something is unknown or untested; otherwise null.
- hazard: one of flame_spread, ignition, heat_release, toxic_products, extinction, detection, material_flammability, other.
- control_category: one of prevent, detect, suppress, material_selection.
- team_interpretation: a one-sentence crew-safety reading, clearly an interpretation.
- scores 1-5 (crew_safety, evidence, moon_mars) with a short reason each.
- At most {max_cards} cards, only clear findings. If the pages have no finding (e.g. references), return {{"cards": []}}.
Return JSON only, in this shape:
{{"cards": [{{"page": 3, "evidence_quote": "...", "finding": "...", "material_or_fuel": null, "conditions": null,
  "values": [{{"quantity": "...", "value": "...", "unit": "..."}}], "earth_comparison": null,
  "hazard": "flame_spread", "control_category": "prevent", "team_interpretation": "...", "open_question": null,
  "scores": {{"crew_safety": 3, "evidence": 3, "moon_mars": 3}},
  "score_reasons": {{"crew_safety": "...", "evidence": "...", "moon_mars": "..."}}}}]}}

{pages}"""


def build_prompt(pages: dict[str, str], page_numbers: list[str], max_cards: int = 3) -> str:
    text = "\n\n".join(f"=== PAGE {p} ===\n{pages[p].strip()}" for p in page_numbers)
    return DRAFT_PROMPT.format(max_cards=max_cards, pages=text)


def chunks(page_numbers: list[str], size: int) -> list[list[str]]:
    return [page_numbers[i:i + size] for i in range(0, len(page_numbers), size)]


def parse_response(text: str) -> list[dict]:
    """Model output -> list of raw card dicts. Tolerates text around the JSON object."""
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []
    cards = data.get("cards") if isinstance(data, dict) else None
    return [c for c in cards if isinstance(c, dict)] if isinstance(cards, list) else []


def _str_or_none(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s if s and s.lower() not in ("null", "none", "n/a") else None


def _score(v) -> int:
    try:
        return min(5, max(1, int(round(float(v)))))
    except (TypeError, ValueError):
        return 3


def to_card(raw: dict, *, card_id: str, source_id: str, source_type: str, valid_pages: set[str]) -> dict | None:
    """Raw model output -> a schema-shaped draft card, or None if it is unusable."""
    quote = _str_or_none(raw.get("evidence_quote"))
    finding = _str_or_none(raw.get("finding"))
    page = str(raw.get("page", "")).strip()
    if not quote or not finding or page not in valid_pages:
        return None
    hazard = str(raw.get("hazard", "")).strip()
    control = str(raw.get("control_category", "")).strip()
    values = []
    for v in raw.get("values") or []:
        if isinstance(v, dict) and _str_or_none(v.get("value")):
            values.append({"quantity": str(v.get("quantity") or "").strip(), "value": str(v["value"]).strip(),
                           "unit": str(v.get("unit") or "").strip()})
    ti = _str_or_none(raw.get("team_interpretation"))
    scores = raw.get("scores") if isinstance(raw.get("scores"), dict) else {}
    reasons = raw.get("score_reasons") if isinstance(raw.get("score_reasons"), dict) else {}
    return {
        "card_id": card_id,
        "source_id": source_id,
        "page": int(page),
        "evidence_quote": quote,
        "finding": finding,
        "material_or_fuel": _str_or_none(raw.get("material_or_fuel")),
        "conditions": _str_or_none(raw.get("conditions")),
        "values": values,
        "earth_comparison": _str_or_none(raw.get("earth_comparison")),
        "hazard": hazard if hazard in HAZARDS else "other",
        "control_category": control if control in CONTROLS else "prevent",
        "team_interpretation": {"text": ti, "suggested_by": "Ollama"} if ti else None,
        "open_question": _str_or_none(raw.get("open_question")),
        "related_cards": [],
        "scores": {k: _score(scores.get(k)) for k in ("crew_safety", "evidence", "moon_mars")},
        "score_reasons": {k: str(reasons.get(k) or "Suggested by Ollama - check.").strip()
                          for k in ("crew_safety", "evidence", "moon_mars")},
        "source_type": source_type,
        "status": "draft",
        "reviewed_by": None,
        "expert_checked": False,
    }


def quote_in_paper(quote: str, pages: dict[str, str]) -> bool:
    q = normalise(quote)
    return any(fuzz.partial_ratio(q, normalise(t)) >= QUOTE_THRESHOLD for t in pages.values() if t.strip())


def next_number(prefix: str, existing_ids: set[str]) -> int:
    nums = [int(i[len(prefix) + 1:]) for i in existing_ids if re.match(rf"^{prefix}-\d{{3}}$", i)]
    return max(nums, default=0) + 1


def ollama_generate(model: str, prompt: str, timeout: int = 600) -> str:
    body = json.dumps({"model": model, "prompt": prompt, "stream": False, "format": "json",
                       "options": {"temperature": 0}}).encode()
    req = urllib.request.Request(f"{OLLAMA_URL}/api/generate", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read())["response"]


def draft(source_id: str, *, root: Path = ROOT, model: str, page_numbers: list[str] | None = None,
          chunk_size: int = 2, max_cards: int = 3, keep_unmatched: bool = False,
          generate: Callable[[str, str], str] = ollama_generate, log=print) -> dict:
    src = find_source(root / "data" / "sources.csv", source_id)
    if src is None:
        raise ValueError(f"{source_id} is not in data/sources.csv - run add_paper.py first")
    prefix = EXPERIMENTS.get((src.get("experiment") or "").strip().upper())
    if prefix is None:
        raise ValueError(f"{source_id} has experiment {src.get('experiment')!r}; expected one of {', '.join(EXPERIMENTS)}")
    text_path = root / "data" / "text" / f"{source_id}.json"
    if not text_path.exists():
        raise FileNotFoundError(f"Missing {text_path} - run add_paper.py or extract_text.py first")
    pages = json.loads(text_path.read_text(encoding="utf-8"))
    wanted = [p for p in (page_numbers or sorted(pages, key=int)) if pages.get(p, "").strip()]

    drafts_path = root / "data" / "drafts" / f"{source_id}_drafts.json"
    drafts_path.parent.mkdir(parents=True, exist_ok=True)
    existing = json.loads(drafts_path.read_text(encoding="utf-8")) if drafts_path.exists() else []
    cards_json = root / "data" / "cards.json"
    taken = {c.get("card_id") for c in existing}
    if cards_json.exists():
        taken |= {c.get("card_id") for c in json.loads(cards_json.read_text(encoding="utf-8"))}
    n = next_number(prefix, {t for t in taken if t})

    new, dropped = [], 0
    for chunk in chunks(wanted, chunk_size):
        log(f"  pages {chunk[0]}-{chunk[-1]} ...")
        try:
            raw_cards = parse_response(generate(model, build_prompt(pages, chunk, max_cards)))
        except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError) as e:
            raise RuntimeError(f"Ollama call failed on pages {chunk}: {e}. Is Ollama running with {model}?") from e
        for raw in raw_cards:
            card = to_card(raw, card_id=f"{prefix}-{n:03d}", source_id=source_id,
                           source_type=src.get("source_type") or "full_paper", valid_pages=set(chunk))
            if card is None:
                dropped += 1
                continue
            if not keep_unmatched and not quote_in_paper(card["evidence_quote"], pages):
                dropped += 1
                continue
            assert card["status"] == "draft"  # never verified
            new.append(card)
            n += 1

    drafts_path.write_text(json.dumps(existing + new, ensure_ascii=False, indent=2), encoding="utf-8")
    checked, checked_path = validate_file(drafts_path, root)
    added = checked[len(existing):]
    return {"added": len(new), "dropped": dropped, "drafts_path": drafts_path, "checked_path": checked_path,
            "ok": sum(c["status"] == "draft" for c in added),
            "flagged": sum(c["status"] == "flagged" for c in added)}


def parse_pages(spec: str | None) -> list[str] | None:
    if not spec:
        return None
    out = []
    for part in spec.split(","):
        a, _, b = part.partition("-")
        out += [str(i) for i in range(int(a), int(b or a) + 1)]
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Draft cards for one paper with Ollama (status always 'draft').")
    ap.add_argument("source_id")
    ap.add_argument("--model", default=os.environ.get("OLLAMA_MODEL") or DEFAULT_MODEL)
    ap.add_argument("--pages", help="e.g. 3-9 or 2,4,6-8 (default: all pages with text)")
    ap.add_argument("--chunk", type=int, default=2, help="pages per AI call (default 2)")
    ap.add_argument("--max-cards", type=int, default=3, help="max cards per chunk (default 3)")
    ap.add_argument("--keep-unmatched", action="store_true", help="keep drafts whose quote is not found in the paper")
    a = ap.parse_args()
    print(f"Drafting {a.source_id} with {a.model} (this can take a few minutes)")
    try:
        r = draft(a.source_id, model=a.model, page_numbers=parse_pages(a.pages), chunk_size=a.chunk,
                  max_cards=a.max_cards, keep_unmatched=a.keep_unmatched)
    except (ValueError, FileNotFoundError, RuntimeError) as e:
        sys.exit(str(e))
    print(f"\n{r['added']} drafts added ({r['dropped']} dropped: quote not in the paper or incomplete)")
    print(f"  auto-check: {r['ok']} OK, {r['flagged']} flagged -> {r['checked_path'].relative_to(ROOT)}")
    print("Next: cd app && npm run dev  ->  http://localhost:3000/review   (a human must approve every card)")


if __name__ == "__main__":
    main()
