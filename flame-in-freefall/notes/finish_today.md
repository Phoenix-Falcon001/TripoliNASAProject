# Finish today: the runbook

All the engineering is built (see "What exists" at the bottom). What's missing is **evidence**: 0 verified cards. Only the team can create it, on a laptop that has the NASA PDFs and Ollama. Follow these steps in order. Times assume one paper per experiment.

## 0. One laptop, once (15 min, needs internet)
```bash
git pull                                   # get everything (after the PR is merged)
cd flame-in-freefall
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd app && npm install && npx next telemetry disable && cd ..
ollama pull llama3.1:8b                    # + any second model for G1, e.g. ollama pull qwen2.5:7b
```
Download one paper per experiment from NASA NTRS into `papers/`. S01 (SAFFIRE) is already listed in `data/sources.csv`. Pick one FLEX and one BASS-II paper. Search terms and how to choose: `notes/papers_to_find.md`.

## 1. Papers → drafts (≈ 30 min, mostly waiting for Ollama)
```bash
# S01 is already in sources.csv: just extract its text
python pipeline/extract_text.py papers/S01.pdf S01
# New papers: one command each (adds the sources.csv row + extracts text)
python pipeline/add_paper.py papers/S02.pdf S02 --experiment FLEX    --title "<exact title>" --url "<NTRS link>"
python pipeline/add_paper.py papers/S03.pdf S03 --experiment BASS-II --title "<exact title>" --url "<NTRS link>"
# Draft cards with the local AI (status always "draft"; invented quotes are dropped)
python pipeline/draft_cards.py S01
python pipeline/draft_cards.py S02
python pipeline/draft_cards.py S03
python pipeline/check_all.py              # summary: drafted / OK / flagged per paper
```
If Bassam already has the 10 hand-written S01 drafts, save them as `data/drafts/S01_drafts.json` **before** running `draft_cards.py S01` (new drafts are added after them with the next free IDs), then run `python pipeline/validate_cards.py data/drafts/S01_drafts.json`.

## 2. Review (Bassam + Reviewer 2, ≈ 2 min per card)
```bash
cd app && npm run dev        # open http://localhost:3000/review and choose your name
```
- **A** approve / **F** flag (type the reason) / **R** reject / **N** next.
- Approve only if the quote is word-for-word on that PDF page, every number is on that page, the finding has no advice, and the open question is stated by the paper.
- Bassam: use **✎ Edit** to fix scores, open questions and related cards (e.g. `conflicts FLX-002`); then approve the card again.
- Reviewer 2: open **Second check**. Pass or fail at least 1 in 5 approved cards.

## 3. Promote (1 min)
```bash
python pipeline/promote_verified.py          # dry run: read the warnings
python pipeline/promote_verified.py --write
git add data && git commit -m "Verified cards" && git push
```
The SAMPLE DATA banner disappears as soon as one card is promoted.

## 4. G1 test: plain AI vs our evidence (≈ 30 min)
Start from the 20 drafts in `data/eval/questions_draft.csv` (confirm `answerable`, fill `expected_card_ids` once cards exist), and write ~20 questions in `data/eval/questions.csv` (`id,question,answerable,expected_card_ids,notes`). About 5 should be ones the cards **can't** answer (`answerable` = `no`). Put `demo` in the notes column of the 3–5 you will show live.
```bash
cd app && npm run dev                                      # terminal 1
npm run eval:g1 -- --models llama3.1:8b,qwen2.5:7b        # terminal 2
```
Open `data/eval/results.csv`, fill `human_verdict` (`correct` / `partly` / `wrong`) and `marked_by`, then run `npm run eval:summary`. Choose the model with the fewest invented numbers (then most correct), and set it as the default with `OLLAMA_MODEL` or `DEFAULT_MODEL` in `app/lib/ask.ts`.

## 5. AI explanations + demo answers (≈ 20 min)
```bash
npm run ai:drafts            # app running; drafts top-10 explanations + demo answers, checked_by: null
```
Bassam checks each entry against its cards in `data/ai_cache.json` and `data/demo_answers.json`. Fix or delete anything wrong, and set `"checked_by": "Bassam"`. Unchecked entries are never shown. Delete the two SAMPLE entries in `demo_answers.json`.

## 6. Demo laptop (15 min)
```bash
cd app && npm run kpi                          # post docs/KPI.md in the team chat
npm run demo                                   # terminal 1
npm run preflight -- http://localhost:3000     # terminal 2; turn Wi-Fi OFF and run it again
```
Then rehearse `notes/demo_path.md` twice and log each run in `notes/rehearsals.md` (K16).

---

## What exists (all on the PR branch)
| Area | What |
|---|---|
| App | 8 pages + Review (dev only), three labelled layers, sliders + stability, trust badges, Ask with live AI or checked fallback, Data charts from `data/chart/`, Plain-vs-cards table |
| Pipeline | `add_paper.py`, `extract_text.py`, `draft_cards.py` (Ollama), `validate_cards.py`, `check_all.py`, `promote_verified.py` |
| Review | 5 reviewers, flag reasons, second-check queue, Evidence-lead edits, fingerprints (edits force re-approval) |
| G1 | `/api/eval`, `npm run eval:g1` (models × plain/cards), `eval:summary`, `ai:drafts` |
| Demo | `npm run demo`, `npm run preflight`, `npm run kpi`, `notes/demo_path.md` |
| Quality | 121 app tests + 18 pipeline tests, CI on every PR |
