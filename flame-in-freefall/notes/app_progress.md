# App progress — summary and next steps

Branch: `claude/app-foundation-cards-lxbx6f` · Last checked: lint ✓ · build ✓ · 68 unit tests ✓

## What we built

### The app (`app/`, Next.js + TypeScript + Tailwind + recharts)
Runs fully offline. The only AI is Ollama on `localhost:11434` (model from `OLLAMA_MODEL`, default `llama3.1:8b`).

| Page | What it shows |
|---|---|
| **Home** | Intro, three-layer legend, top 5 cards by default ranking |
| **Explore** | All verified cards, filters (experiment, hazard, control, material), weight sliders (always 100%), stability badges |
| **Card `/card/[id]`** | NASA found (finding, quote, source + PDF page, values table, open question) · Our safety reading (team text, scores + reasons, rank, stability) · AI explanation (from `ai_cache.json`) · related cards |
| **Earth vs Space** | "In space" next to "On Earth", only where the source states the comparison |
| **Ask** | Ollama status, suggested questions, cards shown first, then streamed AI answer with linked citations and warnings; offline fallback |
| **What NASA doesn't know** | Open questions from the papers (ordered by crew-safety score), hazard × control coverage table, conflicting card pairs |
| **Data** | Counts, cards-per-hazard chart + table, sources, all cards, G1 results summary, JSON/CSV downloads |
| **Method** | Pipeline, layers, ranking formula, stability rule, exact AI prompt, limits |

Every page has the top nav and the footer "Evidence from NASA papers · Our reading labelled · AI labelled".

### Rules built into the code
- **Verified only:** only cards with `status: "verified"` are shown. Each card is checked against `schema/card.schema.json` with ajv. Invalid cards are skipped and logged, never a crash.
- **Sample data:** if `data/cards.json` is `[]`, the app uses `data/sample_cards.json` (DEMO-001 … DEMO-009) and shows a red **SAMPLE DATA** banner. The schema file was not changed; DEMO- IDs are allowed only in an in-memory copy used for sample data.
- **Three layers, always labelled:** each has a colour, a text label and a symbol: ◆ NASA found (blue), ▲ Our safety reading (orange), ● AI explanation (purple).
- **Ranking:** score = (w_crew·crew + w_evid·evidence + w_mm·moon_mars) / 100, default 40/35/25. Ties are broken by card_id.
- **Stability:** across the 27 weight mixes (each weight 10–60%, steps of 10), a card in the top 10 in ≥ 80% of them is "Stable", otherwise "Depends on priorities".
- **Ask flow:**
  1. Keyword retrieval (stop words removed, simple stemming, top 6, no embeddings).
  2. The strict prompt from `app/lib/prompts.ts` is sent to Ollama, and the answer streams back.
  3. If no card matches, the app answers "Not in our evidence" without calling the AI.
  4. If Ollama is down, the app shows a pre-written answer from `data/demo_answers.json`, or "AI is offline — here are the most relevant cards."
  5. The app warns when the AI cites a card it wasn't given, or cites none.

### Files added outside `app/`
- `data/sample_cards.json`: 9 fake DEMO- cards (3 per experiment).
- `data/sample_sources.csv`: fake sources S91–S93, only used with the sample cards.
- `data/demo_answers.json`: 2 SAMPLE pre-written answers. Entries citing cards that aren't shown are ignored automatically.
- `app/scripts/eval-g1.mjs` (`npm run eval:g1`): the G1 test runner.
- `README.md`: how to run the app, Ollama and G1.

### Main code files
`app/lib/`: `types.ts`, `cards.ts`, `rank.ts`, `stability.ts`, `weights.ts`, `filter.ts`, `retrieve.ts`, `prompts.ts`, `ask.ts`, `citations.ts`, `demoAnswers.ts`, `csv.ts`. Each has unit tests.
`app/app/api/ask/route.ts` streams Ask answers; `app/app/api/ollama/route.ts` checks the Ollama status.

### Added 22 Oct: review tools and demo check
- **`/review` page** (only in `npm run dev`): each checked draft next to its PDF page text, with the quote highlighted yellow and numbers blue. Approve/Flag/Reject (keys A/F/R). Decisions are saved in `data/review/<SXX>_decisions.json` with a card fingerprint, so a card edited after approval must be reviewed again.
- **`pipeline/promote_verified.py`**: copies approved, unchanged, schema-valid cards into `data/cards.json`. Dry run by default; `--write` saves. Python tests in `pipeline/test_promote_verified.py`.
- **`npm run preflight`**: demo-day check of data, build freshness, CDN URLs, telemetry, Ollama and model, plus a live test question.
- **What to do next:** see `notes/next_phase.md`.

## How to run
```
cd app
npm install          # once, while online
npm run dev          # http://localhost:3000
npm test             # unit tests
npm run lint
npm run build && npm start   # production mode; rebuild after changing data/
```
Local AI: `ollama pull llama3.1:8b`, then refresh the Ask page. To try another model: `OLLAMA_MODEL=<name> npm run dev`.

## What to do next

### Evidence (Bassam)
- [ ] Review the 10 S01 draft cards. Mark the good ones `verified` and copy them into `data/cards.json`. The sample data and banner switch off automatically.
- [ ] Add the FLEX and BASS-II sources to `data/sources.csv` and draft their cards (target: 30 verified by Sun 8 Nov).
- [ ] Fill `related_cards` (agrees / conflicts / extends) and `open_question` where the paper states one. These feed the gaps page.
- [ ] Update `notes/review_log.md` with the numbers.

### AI content (both)
- [ ] Write real pre-written answers in `data/demo_answers.json` (`[{question, answer, card_ids}]`), one for each demo question. Answers must cite card IDs like `[SAF-001]`.
- [ ] Write per-card explanations in `data/ai_cache.json` as `{ "SAF-001": "text…" }`. They appear in the purple layer on card pages.
- [ ] Delete the 2 SAMPLE entries from `demo_answers.json` once real ones exist (optional; they are ignored anyway when real cards are shown).

### G1 accuracy test (Nermine)
- [ ] Write questions in `data/eval/questions.csv`. Include some that should get "Not in our evidence".
- [ ] For each model you want to compare: `ollama pull <model>`, run the app with `OLLAMA_MODEL=<model>`, then `npm run eval:g1`.
- [ ] Mark `verdict` and `marked_by` in `data/eval/results.csv` by hand. The Data page shows the summary.
- [ ] Choose the final model and set it as the default `OLLAMA_MODEL`.

### Demo laptop
- [ ] Run `npx next telemetry disable` once, so Next.js never tries to send usage data.
- [ ] Run `npm run build && npm start` with real data and Wi-Fi off. Check every page, and Ask with and without Ollama.
- [ ] Check it on the projector (colours and text size).

### Decisions still open
- [ ] G1 `mode` column: currently filled with `ollama` / `cached` / `offline` / `no_cards`. Change it if you meant something else (e.g. with cards vs without cards).
- [ ] Should the gaps page and Earth vs Space get charts once there's real data, or stay as tables?
- [ ] Stability badges only become useful with more than 10 cards; with fewer, every card is "Stable".
