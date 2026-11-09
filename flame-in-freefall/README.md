# Flame in Freefall

NASA Space Apps Challenge 2026 · Bassam & Nermine

Verified evidence cards from NASA fire-in-space research, ranked for crew safety,
with a local-AI Ask page and a "what NASA doesn't know yet" page. Runs fully offline.

## Setup

    python -m venv .venv
    source .venv/bin/activate        # Windows: .venv\Scripts\activate
    pip install -r requirements.txt

App (Next.js, in `app/`) - needs Node 20+:

    cd app
    npm install          # once, while online
    npm run dev          # http://localhost:3000 (re-reads data/ on every request)
    npm test             # vitest unit tests
    npm run lint
    npm run build && npm start   # production mode; rebuild after changing data/

If `data/cards.json` is `[]`, the app shows the fake DEMO- cards from
`data/sample_cards.json` with a red SAMPLE DATA banner.

### Local AI (Ask page)

    ollama pull llama3.1:8b                   # once, while online
    ollama serve                              # if not already running
    OLLAMA_MODEL=qwen2.5:7b npm run dev       # optional: try another model

Without Ollama the Ask page still works: it shows a matching pre-written answer
from `data/demo_answers.json` (`[{question, answer, card_ids}]`), or just the
most relevant cards. Pre-written answers citing cards that are not shown are ignored.

### G1 accuracy test

Fill `data/eval/questions.csv`, start the app, then in another terminal:

    cd app && npm run eval:g1

Runs every question in `data/eval/questions.csv` (`id,question,answerable,expected_card_ids,notes`)
twice on the same model and settings: **plain** (question only) and **cards** (the exact Ask path).
`npm run eval:g1 -- --models a,b` compares models. Rows go to `data/eval/results.csv` with auto-flags;
fill `human_verdict` (correct/partly/wrong) and `marked_by`, then `npm run eval:summary`.
The "Plain AI vs our evidence" table (Data, Method, Home) reads `data/eval/summary.json`.

`npm run ai:drafts` drafts AI explanations (top-10 cards) and demo answers with `checked_by: null`;
the app shows them only after a person sets `checked_by`.

### Team KPIs

    npm run kpi        # prints K1–K16 and writes docs/KPI.md (post it in the team chat)

Team rules: `CONTRIBUTING.md` (repo root). Work packages: `docs/TEAM_TASKS.md`.
CI (lint, tests, build, pipeline tests) runs on every pull request.

### Demo

    npm run demo       # production build + start, telemetry off, Review page hidden
    # click path and what to record: notes/demo_path.md · finishing steps: notes/finish_today.md

### Demo-day check

    npm run build && npm start                      # terminal 1
    npm run preflight -- http://localhost:3000      # terminal 2

Checks the data, that the build is newer than the data, no CDN/tracker URLs,
telemetry off, Ollama + model (and loads the model into memory), and a test question.

## Card pipeline

    python pipeline/add_paper.py papers/S02.pdf S02 --experiment FLEX --title "..." --url "..."   # D0 new paper: sources.csv row + text
    python pipeline/extract_text.py papers/S01.pdf S01               # D1  PDF -> data/text/S01.json
    python pipeline/draft_cards.py S01                               # D5  draft cards with Ollama (status always "draft")
    python pipeline/validate_cards.py data/drafts/S01_drafts.json    # D2  -> data/drafts/S01_checked.json
    python pipeline/check_all.py                                     #     D2 for every drafts file + summary
    cd app && npm run dev     # then open http://localhost:3000/review  (D3 human review)
    python pipeline/promote_verified.py           # dry run: what would change
    python pipeline/promote_verified.py --write   # approved cards -> data/cards.json

Only cards a human approved on the review page go into `data/cards.json`.
Decisions are saved in `data/review/<SXX>_decisions.json` (commit them: they are the audit trail).
If a card is edited after it was approved, its approval becomes stale and it must be reviewed again.
The review page only exists in `npm run dev`, never in the demo build.

Pipeline tests: `python -m unittest discover pipeline`
