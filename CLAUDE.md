# Flame in Freefall — instructions for Claude Code

NASA Space Apps Challenge 2026 (challenge: "Flame in Free Fall"). Team: Bassam (evidence & safety) and Nermine (app & engineering).
We turn NASA fire-in-space papers (SAFFIRE, FLEX, BASS-II) into verified evidence cards, rank them for crew safety, answer questions from those cards only with a local AI, and show what NASA doesn't know yet.

## Hard rules (never break)
- The app runs **fully offline on one laptop**. No cloud APIs, no Claude/Anthropic API calls, no CDN fonts or scripts at runtime.
- The only AI inside the app is **Ollama** at `http://localhost:11434`. Model name comes from env var `OLLAMA_MODEL` (default `llama3.1:8b`, will change after testing). If Ollama is down, the app must still work using `data/ai_cache.json` and pre-written answers.
- The app shows **only cards with `status: "verified"`** from `data/cards.json`.
- **Never invent data.** No number, quote or finding may appear in the UI unless it comes from a card file. For development use `data/sample_cards.json`, where every card has `card_id` starting with `DEMO-` and the UI shows a visible "SAMPLE DATA" banner when it is used. Use sample data only when `data/cards.json` is empty.
- Every piece of content is labelled with its layer, using consistent colours everywhere:
  - **NASA found** (finding, evidence_quote, values, source) — blue
  - **Our safety reading** (team_interpretation) — orange
  - **AI explanation** (anything from Ollama or ai_cache) — purple
- Never present our reading or AI text as NASA guidance.

## Repo layout
```
schema/card.schema.json     ← source of truth for card fields. Do not change without asking.
data/cards.json             ← verified cards (app reads this)
data/sample_cards.json      ← fake DEMO- cards for development only
data/sources.csv            ← one row per paper
data/ai_cache.json          ← pre-written AI explanations, keyed by card_id
data/eval/                  ← G1 accuracy test (questions.csv, results.csv)
pipeline/                   ← Python 3.11 scripts (extract_text.py, validate_cards.py, …)
app/                        ← Next.js (App Router) + TypeScript + Tailwind + recharts
  lib/cards.ts  rank.ts  stability.ts  retrieve.ts
  app/page.tsx  explore/  card/[id]/  earth-vs-space/  ask/  gaps/  data/  method/
  app/api/ask/route.ts
notes/
```
The Next.js project lives in `app/`. Run all npm commands from `app/`. The app reads data files from `../data` at build/server time (server components or route handlers), never via network.

## Card model (summary — the schema file wins if they differ)
`card_id` (SAF-/FLX-/BAS-###), `source_id` (S01…), `page` (PDF page index), `evidence_quote`, `finding`, `material_or_fuel`, `conditions`, `values[] {quantity, value, unit}`, `earth_comparison`, `hazard`, `control_category`, `team_interpretation {text, suggested_by}`, `open_question`, `related_cards[] {card_id, relation}`, `scores {crew_safety, evidence, moon_mars}` (1–5), `score_reasons`, `source_type`, `auto_check`, `status`, `reviewed_by`, `expert_checked`.
Generate TypeScript types in `app/lib/types.ts` from the schema; validate cards on load and log (not crash) on invalid ones.

## Ranking (G2)
- Score = (w_crew·crew_safety + w_evid·evidence + w_mm·moon_mars) / 100, weights in %. Default 40 / 35 / 25.
- Stability: enumerate every weight combination where each weight is 10–60 in steps of 10 and they sum to 100. A card in the top 10 in ≥ 80% of combinations is **"Stable"**, otherwise **"Depends on priorities"**. Pure function in `lib/stability.ts`, with unit tests.
- Ties broken by card_id so ordering is deterministic.

## Ask page (F-Ask)
1. `lib/retrieve.ts`: simple keyword scoring over finding, quote, material, conditions, hazard, open_question (lowercase, stop-words removed). Return top 6–8. No embeddings.
2. `app/api/ask/route.ts`: send only those cards + question to Ollama with the strict prompt below; stream the answer.
3. UI shows the selected cards immediately, then streams the answer.
4. If Ollama is unreachable, return the matching pre-written answer from `data/demo_answers.json`, or "AI is offline — here are the most relevant cards."

Strict prompt:
```
Answer using ONLY the evidence cards below.
- Cite card IDs like [SAF-001] after each claim.
- Separate: What NASA found / Our safety reading / Summary.
- If the cards don't answer the question, say "Not in our evidence." Do not guess.
- Never present our reading as NASA guidance.
Cards: {cards}
Question: {question}
```
Keep the prompt in `app/lib/prompts.ts` so the G1 test script uses the identical text.

## Code style
- TypeScript strict. Small pure functions in `lib/` with tests (vitest). Server components by default; client components only for sliders, filters, streaming.
- Tailwind only, no UI kit unless asked. Clean, readable, works on a 1366×768 laptop and a projector.
- Accessible: real buttons/labels, colour is never the only signal (layers also have text labels).
- After each task: run `npm run lint`, `npm run build` and tests; fix errors before saying you're done. Then summarise what changed and what to test by hand.
- Ask before adding dependencies beyond: next, react, tailwind, recharts, ajv, vitest.
- Commit in small steps with clear messages.
