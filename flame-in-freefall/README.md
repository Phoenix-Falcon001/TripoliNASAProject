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

## Card pipeline

    python pipeline/extract_text.py papers/S01.pdf S01      # D1
    python pipeline/validate_cards.py data/drafts/S01_drafts.json   # D2

Only cards with `"status": "verified"` go into `data/cards.json`.
