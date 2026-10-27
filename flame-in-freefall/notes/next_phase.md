# Next phase: real evidence in, demo-ready out

> **Update 27 Oct:** we are now a team of 5 and the deadline moved to **Sun 1 Nov 2026**. The current plan is `docs/TEAM_TASKS.md`, live KPIs are in `docs/KPI.md` (`npm run kpi`), and team rules are in `CONTRIBUTING.md`. Where this file disagrees with those, they win.

**Goal of this phase:** 30 verified cards from all three experiments (SAFFIRE, FLEX, BASS-II) by **Sun 1 Nov**, the AI model chosen with the G1 test, and a green `npm run preflight`.

The app is finished enough. What's missing now is **real, human-verified evidence**. Only you two can do that part.

---

## 0. One-time setup (both laptops, ~30 min, needs internet)

```bash
git pull
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd app && npm install && npx next telemetry disable && cd ..
ollama pull llama3.1:8b                                # Nermine: also pull the other models you want to compare
```

Check that it works: `python -m unittest discover pipeline` passes, `cd app && npm test` passes, and `npm run dev` opens the app with the SAMPLE banner.

---

## 1. The card loop (Bassam leads; repeat per paper)

```text
PDF ──extract_text──▶ page text ──draft──▶ S01_drafts.json ──validate_cards──▶ S01_checked.json
                                                                                     │
          cards.json ◀──promote_verified --write── decisions ◀── /review page (human)
```

| Step | Command / action | Output |
|---|---|---|
| 1. Get the PDF | Save it as `papers/S01.pdf` (PDFs are not committed) | |
| 2. Extract text | `python pipeline/extract_text.py papers/S01.pdf S01` | `data/text/S01.json` |
| 3. Draft cards | Write `data/drafts/S01_drafts.json`: a JSON array of cards following `schema/card.schema.json`, with `"status": "draft"`. You can use AI help to draft, but set `team_interpretation.suggested_by` honestly. | |
| 4. Auto-check | `python pipeline/validate_cards.py data/drafts/S01_drafts.json` | `data/drafts/S01_checked.json` with the problems listed |
| 5. Review | `cd app && npm run dev`, open **http://localhost:3000/review**, choose your name | Each card is shown next to its PDF page text, with the quote highlighted yellow and numbers blue. Press **A** approve, **F** flag, **R** reject. |
| 6. Fix flagged cards | Edit `S01_drafts.json`, then run step 4 again and review again (editing a card resets its approval automatically) | |
| 7. Preview | `python pipeline/promote_verified.py` | What would be added, updated or removed, plus warnings |
| 8. Promote | `python pipeline/promote_verified.py --write` | `data/cards.json`. The SAMPLE banner disappears. |
| 9. Commit | `git add data/drafts data/review data/cards.json data/sources.csv && git commit` | The decisions files are your audit trail |
| 10. Log it | Update the numbers in `notes/review_log.md` | |

**Approve a card only if** all of these are true:
- The quote is word-for-word on that **PDF page** (the page index, not the printed page number).
- Every number in the finding and values appears on the page.
- The finding says only what NASA reported (no advice).
- The open question is something **the paper itself** says is unknown.
- Scores have reasons.

If the auto-check flagged something and you're still sure it's right (e.g. the quote sits in a figure caption the text extraction missed), you may approve. The promote script will list it as a warning.

**Second pair of eyes:** Nermine spot-checks about 1 in 5 approved cards against the PDF. Set `expert_checked: true` only if a real domain expert checked the card.

---

## 2. Schedule

| Dates | Bassam (evidence & safety) | Nermine (app & engineering) |
|---|---|---|
| **Thu 22 – Sun 25 Oct** | Steps 1–10 for **S01** (10 drafts already exist). Goal: ≥ 8 verified. | Setup. Watch Bassam run the first review session and note anything slow or confusing in the tool. Pull 2–3 candidate models. |
| **Mon 26 Oct – Sun 1 Nov** | Find and add **FLEX** and **BASS-II** papers to `data/sources.csv` (one row each: `S02`, `S03`, …). Draft and review cards. Goal: ≥ 20 verified, all 3 experiments covered. | Write the **G1 questions** in `data/eval/questions.csv` (~20; about 5 the cards *can't* answer). Start the pre-written answers in `data/demo_answers.json` for the 3–5 questions you'll use in the demo. |
| **Mon 2 – Sun 8 Nov** | Reach **30 verified**. One pass to fill `related_cards` (agrees / conflicts / extends) and `open_question`. Review Nermine's demo answers for accuracy. | Run `npm run eval:g1` for each model, mark the verdicts, **choose the model**. Write the `data/ai_cache.json` explanations for the top cards. Run `npm run preflight`. |

---

## 3. AI content rules (both)

- **`data/demo_answers.json`** (shown when Ollama is offline):

  ```json
  [{ "question": "...", "answer": "What NASA found: ... [SAF-001]\n\nOur safety reading: ... [SAF-001]\n\nSummary: ...", "card_ids": ["SAF-001"] }]
  ```

  - Every claim cites a verified card.
  - Use the same three sections as the live AI.
  - Delete the 2 SAMPLE entries when you add real ones.
- **`data/ai_cache.json`** (the purple box on card pages):

  ```json
  { "SAF-001": "Plain-language explanation..." }
  ```

  - It's shown as "AI explanation", so it must only restate the card.
  - Check every number against the card.
- **Never** put a number, quote or finding in these files that isn't on a verified card.

---

## 4. Choosing the model (Nermine)

```bash
cd app
OLLAMA_MODEL=llama3.1:8b npm run dev        # terminal 1
npm run eval:g1                             # terminal 2 → appends to data/eval/results.csv
# repeat with each candidate model, then fill `verdict` and `marked_by` by hand
```

Pick the model with the fewest **invented numbers** first, then the most correct verdicts. Speed on the demo laptop is the tie-breaker. Look at the summary on the Data page. Then make the chosen model the default (`OLLAMA_MODEL` in how you start the demo, or `DEFAULT_MODEL` in `app/lib/ask.ts`).

---

## 5. Done = this phase is finished when

- [ ] ≥ 30 verified cards, all three experiments covered
- [ ] Every card's source is in `sources.csv`; decisions files committed
- [ ] ≥ 5 cards with an open question, a few `related_cards` links (some "conflicts" make the gaps page interesting)
- [ ] 3–5 real pre-written answers; SAMPLE entries removed
- [ ] G1 run on ≥ 2 models, verdicts marked, model chosen
- [ ] `npm run build && npm start`, then `npm run preflight -- http://localhost:3000` shows **✅ READY**, with Wi-Fi **off**

---

## 6. What Claude can do in parallel (just ask)

- Fix anything slow or confusing in the review page after the first real session
- A script to draft `ai_cache.json` explanations with the local model, marked unreviewed, rejecting any number not on the card
- A side-by-side model comparison view on the Data page once G1 has results
- Projector mode (bigger text, higher contrast), a printable card view, GitHub CI
- A demo script: a 3-minute click path through the app for the presentation

## Hard rules (unchanged)

The app shows only `verified` cards. No number, quote or finding appears unless it's on a card. Our reading (orange) and AI text (purple) are never presented as NASA guidance. The app runs fully offline.
