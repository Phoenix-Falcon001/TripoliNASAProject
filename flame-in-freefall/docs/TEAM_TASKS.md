# Team tasks: work packages until Sun 1 Nov 2026

Five people, four work packages, all done and merged by **Sun 1 Nov 2026**.
Each engineer runs their package in their **own Claude Code session on their own branch** (`<name>/<topic>`, one PR per task, Nermine merges). The packages touch different files, so they can run in parallel. Rules: `CONTRIBUTING.md`. File ownership: `CLAUDE.md` → **Ownership**. KPIs: run `npm run kpi` (writes `docs/KPI.md`).

| Package | Owner | KPIs |
|---|---|---|
| WP-NERMINE | Nermine (app & integration lead) | K15 |
| WP-RITA | Rita (AI & evaluation engineer) | K8–K14 |
| WP-KAFA | Kafa (pipeline & data engineer) | supports K1, K3–K5 |
| WP-REVIEW | Bassam (evidence lead) + Reviewer 2 (mechanical engineer) | K1, K2, K4–K7 |

**Agreed decisions (27 Oct):**
- Each file has one owner. Pages belong to Nermine; Rita and Kafa own components that Nermine places on pages (`EvalSummary`, `DataChart`).
- Second checks are stored in the review decisions file (`data/review/<SXX>_decisions.json`), **not** on the card, so no schema change is needed.
- Reviewer names on the Review page: Bassam, Reviewer 2, Nermine, Rita, Kafa.

---

## WP-NERMINE: App, integration & demo (K15)

**Owns:** `app/app/*` pages and layout (except the Ask/Ollama API owned by Rita and the Review page/API owned by Kafa), shared components, preflight, KPI script, merges.

**Tasks**
1. **HOME:** show 3 live numbers: verified cards, papers, and the headline G1 result from `data/eval/summary.json` ("not measured yet" until it exists).
2. **TRUST BADGES (G5)** on every card: quote auto-verified · reviewed by · second-checked · source type · expert-checked (if true). Text labels, not icons only.
3. **SAMPLE DATA:** once `data/cards.json` has ≥ 1 verified card, sample cards must never appear anywhere (including Ask, Data, downloads). Add a test.
4. **DEMO BUILD:** `npm run demo` builds and starts the production build with the Review page hidden, telemetry off, and no external requests. Works on a 1366×768 laptop and a projector.
5. **PREFLIGHT:** extend it to check: ≥ 30 verified cards, 3 experiments covered, `summary.json` present, `ai_cache`/`demo_answers` entries are `checked_by`, model from `OLLAMA_MODEL` installed and answering, Wi-Fi-off test question. Clear ✓/⚠/✗ output.
6. **DEMO PATH:** add `notes/demo_path.md`: the exact 30-second click path (Ask a question → cards appear → sliders → plain-vs-ours table → What NASA doesn't know), with the screens to record.
7. Review and merge teammates' PRs daily; keep `main` green.

**Done when:** all PRs merged, CI green on `main`, `npm run demo` + `npm run preflight` show READY with real data and Wi-Fi off.

---

## WP-RITA: AI & evaluation (K8–K14)

**Owns:** `app/lib/prompts.ts`, `app/lib/retrieve.ts` (+ `ask.ts`, `citations.ts`, `demoAnswers.ts`), `app/app/api/ask/`, `app/app/api/ollama/`, eval scripts (`app/scripts/eval-*.mjs`), `app/components/EvalSummary.tsx`, `data/eval/`, `data/ai_cache.json`, `data/demo_answers.json`.

**Tasks**
1. **G1 PLAIN MODE (most important).** The G1 runner must run every question in two modes on the SAME model with the SAME generation settings:
   - **"plain"**: question only, no cards, a neutral prompt ("Answer the question. If you are not sure, say so.").
   - **"cards"**: the exact app path (retrieve top 6 → `lib/prompts.ts` prompt → Ollama).

   Keep the existing modes (cached/offline) as separate, clearly named modes. Results rows record: question id, mode, model, answer, cited cards, auto-flags (invented numbers vs the given cards AND vs all verified cards, missing citation, said "Not in our evidence"), and an empty `human_verdict` column.
2. **MODEL COMPARISON:** `npm run eval:g1 -- --models a,b` runs both models in both modes and writes `data/eval/summary.json` with, per model and mode:
   - % invented numbers
   - % answers citing a card
   - % correct "Not in our evidence" on unanswerable questions
   - % human verdict correct / partly / wrong (only once humans have marked them)
   - median answer time.

   Never fill a metric that hasn't been measured.
3. Show `summary.json` on the Method page and the Data page as a **"Plain AI vs our evidence"** table. If there are no results yet, show "not measured yet". (Rita provides the `EvalSummary` component; Nermine places it.)
4. **QUESTIONS FILE:** make `data/eval/questions.csv` the single source: `id, question, answerable (yes/no), expected_card_ids, notes`. Validate it on load. *(Today's header is `q_id,question,answerable,expected_answer,expected_cards`; the file is empty, so switch now before anyone fills it.)*
5. **AI EXPLANATIONS + DEMO ANSWERS:** a script that drafts an AI explanation for each of the top-10 ranked verified cards into `data/ai_cache.json`, and drafts answers for the demo questions into `data/demo_answers.json`, each with `"checked_by": null`. The app shows an entry only once `checked_by` is set (Bassam checks them). Label them as AI explanation everywhere.
6. **Model config:** model name from the `OLLAMA_MODEL` env var with a documented default; log model name + settings into every results row.

Tests for everything new. Lint, build, tests green.

**Done when:** G1 has run plain vs cards on ≥ 2 models, `summary.json` is shown in the app, and the top-10 explanations and 3–5 demo answers are drafted and waiting for Bassam's check.

---

## WP-KAFA: Pipeline & data (supports K1, K3–K5)

**Owns:** `pipeline/`, the Review page (`app/app/review/`, `app/app/api/review/`, `app/lib/review.ts`, `app/lib/highlight.ts`, `app/components/Review*.tsx`), `data/drafts/`, `data/review/`, `data/sources.csv` tooling, the Data page chart component (`app/components/DataChart*.tsx`, `data/chart/`).

**Tasks**
1. **ONE COMMAND FOR A NEW PAPER:** `python pipeline/add_paper.py papers/S02.pdf S02 --experiment FLEX --type full_paper --title "..." --url "..."` adds the `sources.csv` row, extracts text, and prints next steps. Validate that source ids are unique.
2. **BATCH CHECK:** `python pipeline/check_all.py` runs `validate_cards` on every drafts file and prints a summary per source (drafted / OK / flagged, top flag reasons).
3. **DRAFT WITH OLLAMA (D5):** `pipeline/draft_cards.py` sends a paper's page texts in chunks to Ollama with the drafting prompt, writes drafts in schema format, then runs the validator. It must **never** set status verified. The drafting prompt says:
   - use only this document
   - exact quotes of ≤ 25 words, with their page
   - numbers only if written in the paper
   - `open_question` only if the authors say it's unknown
   - `team_interpretation` and scores marked `suggested_by: "Ollama"`.
4. **REVIEW PAGE: TWO REVIEWERS (K5):**
   - The reviewer picks their name (Bassam, Reviewer 2, Nermine, Rita, Kafa) at the top. It's stored with every decision.
   - Keyboard shortcuts: A approve, F flag (with reason), R reject, N next.
   - Show the auto-check reasons and highlight the quote and each number inside the page text.
   - "Second check" queue: approved cards not yet checked by a different person. Record `second_check {by, result, note}` **in the decisions file**. A failed second check sends the card back to flagged.
   - The Evidence lead may edit scores, open_question and related_cards on the page. That re-fingerprints the card and requires re-approval.
5. **KPI SUPPORT:** make sure `npm run kpi` reads review decisions and second checks correctly for K1, K4, K5, K6, K7.
6. **DATA PAGE CHART:** support either a real data file (CSV from NASA PSI) or a results table typed from a paper, stored in `data/chart/` with a sources note. The chart always shows its source, and the label "from paper table" when applicable. No made-up values.

Tests for everything new (pipeline tests + app tests).

**Done when:** a new paper goes from PDF to reviewable drafts with two commands, two people can review and second-check, and `npm run kpi` shows K4/K5 measured.

---

## WP-REVIEW: Bassam + Reviewer 2 (no coding)

Not a Claude Code prompt. Daily routine:

1. `git pull` → `cd flame-in-freefall/app && npm run dev` → open http://localhost:3000/review → choose your name.
2. Work through the queue: **A** approve / **F** flag / **R** reject. Approve only if:
   - the quote is word-for-word on that page
   - every number is on that page
   - the finding has no advice
   - the open question is stated by the paper.
3. Reviewer 2 also clears the **Second check** queue (target ≥ 20% of approved cards). This needs WP-KAFA task 4.
4. `python pipeline/promote_verified.py` (dry run), then `--write` → commit → push (or ask Nermine).
5. `cd app && npm run kpi` → post the table in the team chat.

**Daily targets:** Thu ≥ 8 verified (S01) · Fri ≥ 20 (3 experiments) · Sat 30 · Sun second checks + G1 verdicts.

> ⚠ **Status on Tue 27 Oct:** 0 verified cards, and the 10 S01 drafts are not in the repo yet. Bassam: commit them as `data/drafts/S01_drafts.json` first.

---

## After 28 Oct: challenge statement check (any session)

```
Here is the full 2026 "Flame in Free Fall" challenge statement: <paste>.
Compare it with docs/ARCHITECTURE.md and the app. List: (1) required datasets or resources and whether we use them, (2) required or suggested features we lack, (3) anything we built that the statement makes unnecessary, (4) a short prioritised change list for this week. Don't change code yet.
```
