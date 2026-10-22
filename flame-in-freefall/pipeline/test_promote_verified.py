"""Tests for promote_verified.py.  Run:  python -m unittest discover pipeline"""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from promote_verified import ROOT, fingerprint, plan  # noqa: E402

# Same card and expected value as the cross-language test in app/lib/review.test.ts.
FIXTURE = {
    "card_id": "SAF-001", "page": 3,
    "finding": 'Flame spread ~2 cm/s — slower "than" Earth é',
    "status": "draft",
    "values": [{"unit": "cm/s", "value": "~2", "quantity": "rate"}],
    "team_interpretation": None,
}
FIXTURE_FINGERPRINT = "bfce6b1ae0561f67"


def make_card(card_id="SAF-001", **kw):
    card = {
        "card_id": card_id, "source_id": "S01", "page": 2,
        "evidence_quote": "A quote that is long enough.",
        "finding": "A finding that is long enough.",
        "hazard": "flame_spread", "control_category": "prevent",
        "scores": {"crew_safety": 3, "evidence": 3, "moon_mars": 3},
        "score_reasons": {"crew_safety": "r", "evidence": "r", "moon_mars": "r"},
        "source_type": "full_paper", "status": "draft",
        "auto_check": {"quote_found": True, "reasons": []},
    }
    card.update(kw)
    return card


class FingerprintTest(unittest.TestCase):
    def test_matches_fixed_value(self):
        self.assertEqual(fingerprint(FIXTURE), FIXTURE_FINGERPRINT)

    def test_ignores_review_fields_but_not_content(self):
        base = fingerprint(make_card())
        self.assertEqual(base, fingerprint(make_card(status="verified", reviewed_by="Bassam",
                                                     auto_check={"reasons": ["x"]}, expert_checked=True)))
        self.assertNotEqual(base, fingerprint(make_card(page=3)))

    def test_key_order_does_not_matter(self):
        card = make_card()
        self.assertEqual(fingerprint(card), fingerprint(dict(reversed(list(card.items())))))


class PlanTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "schema").mkdir()
        shutil.copy(ROOT / "schema" / "card.schema.json", self.root / "schema")
        for d in ("data/drafts", "data/review"):
            (self.root / d).mkdir(parents=True)
        (self.root / "data/sources.csv").write_text(
            "source_id,title,experiment\nS01,Paper one,SAFFIRE\nS02,Paper two,FLEX\n", encoding="utf-8")
        (self.root / "data/cards.json").write_text("[]", encoding="utf-8")

    def tearDown(self):
        shutil.rmtree(self.root)

    def write(self, rel, obj):
        (self.root / rel).write_text(json.dumps(obj), encoding="utf-8")

    def decide(self, cards, status="verified", who="Bassam", **override):
        return {c["card_id"]: {"status": status, "reviewed_by": who, "fingerprint": fingerprint(c), **override}
                for c in cards}

    def test_promotes_only_approved_cards(self):
        a, b = make_card("SAF-001"), make_card("SAF-002")
        self.write("data/drafts/S01_checked.json", [a, b])
        self.write("data/review/S01_decisions.json", self.decide([a]))
        p = plan(self.root)
        self.assertEqual([c["card_id"] for c in p["cards"]], ["SAF-001"])
        self.assertEqual(p["cards"][0]["status"], "verified")
        self.assertEqual(p["cards"][0]["reviewed_by"], "Bassam")
        self.assertEqual(p["added"], ["SAF-001"])
        self.assertEqual(p["not_reviewed"], ["SAF-002"])
        self.assertEqual(p["errors"], [])

    def test_skips_card_changed_after_review(self):
        a = make_card()
        decisions = self.decide([a])
        self.write("data/drafts/S01_checked.json", [make_card(page=5)])
        self.write("data/review/S01_decisions.json", decisions)
        p = plan(self.root)
        self.assertEqual(p["cards"], [])
        self.assertEqual(p["skipped"], ["SAF-001"])
        self.assertTrue(any("changed after" in w for w in p["warnings"]))

    def test_rejects_schema_errors_and_wrong_experiment(self):
        bad = make_card("SAF-001", page=0)
        wrong = make_card("FLX-001")  # source S01 is SAFFIRE
        self.write("data/drafts/S01_checked.json", [bad, wrong])
        self.write("data/review/S01_decisions.json", self.decide([bad, wrong]))
        p = plan(self.root)
        self.assertEqual(p["cards"], [])
        self.assertTrue(any("SAF-001: schema" in e for e in p["errors"]))
        self.assertTrue(any("FLX-001" in e and "SAFFIRE" in e for e in p["errors"]))

    def test_removes_card_later_rejected(self):
        a = make_card()
        self.write("data/cards.json", [dict(a, status="verified", reviewed_by="Bassam")])
        self.write("data/drafts/S01_checked.json", [a])
        self.write("data/review/S01_decisions.json", self.decide([a], status="rejected"))
        p = plan(self.root)
        self.assertEqual(p["cards"], [])
        self.assertEqual(p["removed"], ["SAF-001"])

    def test_keeps_cards_without_checked_file_and_warns_on_missing_related(self):
        other = make_card("SAF-009", status="verified", related_cards=[{"card_id": "SAF-777", "relation": "agrees"}])
        self.write("data/cards.json", [other])
        p = plan(self.root)
        self.assertEqual([c["card_id"] for c in p["cards"]], ["SAF-009"])
        self.assertTrue(any("SAF-777" in w for w in p["warnings"]))

    def test_warns_when_flagged_card_is_approved(self):
        a = make_card(auto_check={"quote_found": False, "reasons": ["quote not found"]})
        self.write("data/drafts/S01_checked.json", [a])
        self.write("data/review/S01_decisions.json", self.decide([a]))
        p = plan(self.root)
        self.assertEqual(len(p["cards"]), 1)
        self.assertTrue(any("auto-check flagged" in w for w in p["warnings"]))


if __name__ == "__main__":
    unittest.main()
