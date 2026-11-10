"""Tests for add_paper.py, check_all.py and draft_cards.py.  Run: python -m unittest discover pipeline"""
import io
import json
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_all  # noqa: E402
from add_paper import add_source_row, next_free_id  # noqa: E402
from draft_cards import draft, parse_pages, parse_response, to_card  # noqa: E402
from promote_verified import ROOT  # noqa: E402
from sources import read_sources  # noqa: E402

PAGE2 = ("Results. The flame spread rate over the cotton-fiberglass sample was 0.68 cm/s in the low "
         "flow case. It is not known whether thicker samples behave the same way.")


class TempRepo(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "schema").mkdir()
        shutil.copy(ROOT / "schema" / "card.schema.json", self.root / "schema")
        for d in ("data/drafts", "data/text"):
            (self.root / d).mkdir(parents=True)
        self.sources = self.root / "data/sources.csv"
        self.sources.write_text("source_id,title,ntrs_id,experiment,source_type,year,url,pdf_filename,notes\n"
                                "S01,Paper one,,SAFFIRE,full_paper,,,S01.pdf,\n", encoding="utf-8")
        (self.root / "data/cards.json").write_text("[]", encoding="utf-8")

    def tearDown(self):
        shutil.rmtree(self.root)


class AddPaperTest(TempRepo):
    def test_adds_row_and_rejects_duplicates_and_bad_values(self):
        add_source_row(self.sources, source_id="S02", title='FLEX, "droplets"', experiment="FLEX",
                       source_type="slides", url="https://example", pdf_filename="S02.pdf")
        rows = read_sources(self.sources)
        self.assertEqual([r["source_id"] for r in rows], ["S01", "S02"])
        self.assertEqual(rows[1]["title"], 'FLEX, "droplets"')  # quoting survives a round trip
        with self.assertRaises(ValueError):
            add_source_row(self.sources, source_id="S02", title="x", experiment="FLEX", source_type="slides")
        with self.assertRaises(ValueError):
            add_source_row(self.sources, source_id="2", title="x", experiment="FLEX", source_type="slides")
        with self.assertRaises(ValueError):
            add_source_row(self.sources, source_id="S03", title="x", experiment="MARS", source_type="slides")
        self.assertEqual(next_free_id(self.sources), "S03")


class DraftCardsTest(TempRepo):
    def setUp(self):
        super().setUp()
        (self.root / "data/text/S01.json").write_text(json.dumps({"1": "Title page of the paper.", "2": PAGE2}))

    def fake_model(self, model, prompt):
        self.prompts.append(prompt)
        good = {"page": 2, "evidence_quote": "The flame spread rate over the cotton-fiberglass sample was 0.68 cm/s",
                "finding": "Flame spread over cotton-fiberglass was 0.68 cm/s at low flow.",
                "values": [{"quantity": "flame spread rate", "value": "0.68", "unit": "cm/s"}],
                "hazard": "flame_spread", "control_category": "material_selection",
                "team_interpretation": "Low-flow spread is slow but not zero.",
                "open_question": "Whether thicker samples behave the same way.",
                "scores": {"crew_safety": 9, "evidence": "4", "moon_mars": 2}, "score_reasons": {}}
        invented = dict(good, evidence_quote="Fires in space are always harmless and slow.")
        wrong_page = dict(good, page=7)
        return "Here you go: " + json.dumps({"cards": [good, invented, wrong_page]}) + " done"

    def test_drafts_valid_cards_and_never_verifies(self):
        self.prompts = []
        r = draft("S01", root=self.root, model="m", generate=self.fake_model, log=lambda *_: None)
        self.assertEqual(r["added"], 1)
        self.assertEqual(r["dropped"], 2)  # invented quote + page outside the chunk
        cards = json.loads((self.root / "data/drafts/S01_drafts.json").read_text())
        c = cards[0]
        self.assertEqual(c["card_id"], "SAF-001")
        self.assertEqual(c["status"], "draft")
        self.assertEqual(c["scores"], {"crew_safety": 5, "evidence": 4, "moon_mars": 2})
        self.assertEqual(c["team_interpretation"]["suggested_by"], "Ollama")
        self.assertIn("ONLY the pages below", self.prompts[0])
        checked = json.loads((self.root / "data/drafts/S01_checked.json").read_text())
        self.assertEqual(checked[0]["status"], "draft", checked[0]["auto_check"])  # passes the auto-check
        self.assertNotIn("verified", {x["status"] for x in checked})

    def test_appends_with_next_free_id(self):
        self.prompts = []
        draft("S01", root=self.root, model="m", generate=self.fake_model, log=lambda *_: None)
        draft("S01", root=self.root, model="m", generate=self.fake_model, log=lambda *_: None)
        ids = [c["card_id"] for c in json.loads((self.root / "data/drafts/S01_drafts.json").read_text())]
        self.assertEqual(ids, ["SAF-001", "SAF-002"])

    def test_unknown_source_is_an_error(self):
        with self.assertRaises(ValueError):
            draft("S09", root=self.root, model="m", generate=self.fake_model)


class HelpersTest(unittest.TestCase):
    def test_parse_response(self):
        self.assertEqual(parse_response('{"cards": [{"a": 1}, 3]}'), [{"a": 1}])
        self.assertEqual(parse_response("no json"), [])
        self.assertEqual(parse_response('{"cards": "x"}'), [])

    def test_to_card_fixes_enums_and_rejects_incomplete(self):
        base = {"page": 2, "evidence_quote": "A quote here", "finding": "A finding here", "hazard": "fire!",
                "control_category": "pray"}
        c = to_card(base, card_id="SAF-001", source_id="S01", source_type="full_paper", valid_pages={"2"})
        self.assertEqual((c["hazard"], c["control_category"]), ("other", "prevent"))
        self.assertIsNone(to_card(dict(base, finding=""), card_id="x", source_id="S01", source_type="full_paper",
                                  valid_pages={"2"}))

    def test_parse_pages(self):
        self.assertEqual(parse_pages("2,4-6"), ["2", "4", "5", "6"])
        self.assertIsNone(parse_pages(None))


class CheckAllTest(TempRepo):
    def test_summary_per_source(self):
        (self.root / "data/text/S01.json").write_text(json.dumps({"2": PAGE2}))
        card = to_card({"page": 2, "evidence_quote": "not in the text at all, invented", "finding": "Some finding"},
                       card_id="SAF-001", source_id="S01", source_type="full_paper", valid_pages={"2"})
        (self.root / "data/drafts/S01_drafts.json").write_text(json.dumps([card]))
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = check_all.main(self.root)
        self.assertEqual(code, 0)
        self.assertIn("quote not found (1)", buf.getvalue())
        self.assertTrue((self.root / "data/drafts/S01_checked.json").exists())

    def test_reason_groups(self):
        self.assertEqual(check_all.reason_group("quote not on page 3 but found on page 4 (score 99)"), "wrong page number")
        self.assertEqual(check_all.reason_group("numbers not on page 2: 99"), "number not on page")
        self.assertEqual(check_all.reason_group("schema: page: 0 is less than 1"), "schema error")


if __name__ == "__main__":
    unittest.main()
