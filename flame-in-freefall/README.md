# Flame in Freefall

NASA Space Apps Challenge 2026 · Bassam & Nermine

Verified evidence cards from NASA fire-in-space research, ranked for crew safety,
with a local-AI Ask page and a "what NASA doesn't know yet" page. Runs fully offline.

## Setup

    python -m venv .venv
    source .venv/bin/activate        # Windows: .venv\Scripts\activate
    pip install -r requirements.txt

App (Nermine, task A4) - run from the repo root:

    npx create-next-app@latest app --ts --tailwind --app

## Card pipeline

    python pipeline/extract_text.py papers/S01.pdf S01      # D1
    python pipeline/validate_cards.py data/drafts/S01_drafts.json   # D2

Only cards with `"status": "verified"` go into `data/cards.json`.
