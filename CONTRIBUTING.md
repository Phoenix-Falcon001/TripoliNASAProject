# Contributing to Flame in Freefall

Five people work in this repo in parallel until **Sun 1 Nov 2026**. These rules keep `main` green and stop us overwriting each other.
The project lives in `flame-in-freefall/`. Who owns what: the **Ownership** table in `CLAUDE.md`. What each person does: `flame-in-freefall/docs/TEAM_TASKS.md`.

## Branches and pull requests
- Branch name: `<name>/<topic>`, e.g. `rita/g1-plain-mode`, `kafa/add-paper`, `nermine/trust-badges`.
- Start from the latest `main`: `git checkout main && git pull && git checkout -b <name>/<topic>`.
- **One PR per task.** Small PRs get merged faster.
- **Nermine merges** all PRs. Don't merge your own (Nermine's own PRs are reviewed by one other teammate).
- Fill in the PR template (what changed, folders touched, tests run, screenshots for UI changes).

## Before you open a PR (CI checks the same things)
```bash
cd flame-in-freefall/app
npm run lint
npm test
npm run build
cd .. && python -m unittest discover pipeline
```
All four must pass. Fix failures before asking for a merge.

## Stay in your folders
- Only touch files your role owns (see `CLAUDE.md`). If a task really needs someone else's file, **say so in the PR** and tell the owner.
- Shared pages: Nermine places components; Rita and Kafa own their components but not the pages.

## Data rules
- **Never edit `data/cards.json` by hand.** Cards get there only through the Review page and `python pipeline/promote_verified.py --write`.
- **Schema changes** (`schema/card.schema.json`) need agreement from **both Bassam and Nermine** before the PR.
- Never invent data: no number, quote or finding unless it comes from a verified card. Fake development cards use `DEMO-` IDs only.
- Commit review decisions (`data/review/`) and checked drafts (`data/drafts/`): they are our audit trail.
- PDFs (`papers/*.pdf`) and extracted text (`data/text/`) are not committed.

## The app must stay offline
No cloud APIs, CDN fonts or remote scripts at runtime. The only AI is Ollama on `localhost:11434`. CI may use the internet to install packages; the app may not.

## Using Claude Code
Start each session with: *"Read CLAUDE.md and flame-in-freefall/docs/TEAM_TASKS.md. I am <name>."* Claude will then keep to your folders. Ask it to plan first and wait for your OK.
