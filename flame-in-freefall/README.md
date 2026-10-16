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

This sends every question through the same `/api/ask` (same retrieval, same prompt
from `app/lib/prompts.ts`) and appends rows to `data/eval/results.csv` with
`invented_number`, `cited_source` and `said_not_in_evidence` pre-filled.
Fill in `verdict` and `marked_by` by hand; the Data page summarises the results.

## Card pipeline

    python pipeline/extract_text.py papers/S01.pdf S01      # D1
    python pipeline/validate_cards.py data/drafts/S01_drafts.json   # D2

Only cards with `"status": "verified"` go into `data/cards.json`.
