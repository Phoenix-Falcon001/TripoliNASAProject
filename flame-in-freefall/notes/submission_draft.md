# Space Apps submission + pitch: DRAFT

Fill every `[[…]]` from `docs/KPI.md`, `data/eval/summary.json` or the app, **never from memory**. Delete any sentence whose number we don't have. Check the official 2026 submission form for the exact fields and limits; this follows the usual Space Apps layout.

---

## Project name
**Flame in Freefall**: what NASA's fire-in-space experiments mean for crew safety

## High-level summary (≈ 100 words)
Fire behaves differently without gravity, and the answers are spread across many NASA papers. Flame in Freefall turns NASA results from SAFFIRE, FLEX and BASS-II into **verified evidence cards**: one finding, its exact quote, its PDF page. People check every card. We rank the cards for crew safety, show how much the ranking depends on priorities, answer questions **only from those cards** with an AI that runs offline on one laptop, and list what the papers themselves say is **still unknown**. Every screen separates what NASA found from our interpretation and from AI text.

## Project details
**What it does**
- **Explore:** 31 verified cards from 2 NASA documents across 3 experiments (SAFFIRE, FLEX, BASS-II), filterable by hazard, control type and material. Sliders let you weight crew safety, strength of evidence and Moon/Mars relevance; a stability badge shows which cards stay in the top 10 under any reasonable weighting.
- **Ask:** questions are answered by a local AI that may only use the retrieved cards and must cite them. If the cards don't cover a question it says "Not in our evidence."
- **What NASA doesn't know:** open questions stated in the papers, plus a map of where our evidence is thin.
- **Earth vs Space:** comparisons, only where the paper itself makes them.

**How it works**
- Pipeline: PDF → text per page → card drafts → automatic checks (quote found on the stated page, every number on the page) → two-person human review → only `verified` cards reach the app.
- Three labelled layers everywhere: **NASA found** (blue), **our safety reading** (orange), **AI explanation** (purple), each with a text label, not colour alone.
- Fully offline: Next.js app, a local Ollama model, no cloud services at runtime.

**Does it work? (our G1 test)**
Same local model, [[questions]] questions, asked once plain and once with our cards:
- answers containing a number that is in none of our evidence: [[plain %]] → [[cards %]]
- answers citing a source: [[plain %]] → [[cards %]]
- correct "Not in our evidence" on questions the cards can't answer: [[plain %]] → [[cards %]]

*(If G1 hasn't run, delete this block. Don't estimate.)*

**Benefits**
- Mission planners and crew can see the evidence behind each safety point in seconds, with its page.
- Honest uncertainty: the ranking shows when it depends on priorities, and the gaps page shows what isn't known.
- Works where there is no internet (a habitat, a ship, a classroom).

**Tools**: Next.js, TypeScript, Tailwind, Recharts, Python (pdfplumber, rapidfuzz, jsonschema), Ollama ([[model]]), GitHub Actions.

## NASA data and resources used
| ID | Title | Experiment | Link |
|---|---|---|---|
| S01 | Results of Large-Scale Spacecraft Flammability Tests (ICES 2017 slides) | SAFFIRE | https://ntrs.nasa.gov/citations/20170008805 |
| S02 | A Researcher's Guide to: Combustion Science (ISS), NP-2015-10-034: droplet combustion / FLEX sections | FLEX | https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/ |
| S03 | Same Guide: solid-fuel / BASS sections | BASS-II | same link |

## Use of AI (disclose honestly)
- **In the app:** a local open-weight model via Ollama ([[model]]) answers questions live. It only sees verified cards, must cite them, and its text is labelled "AI explanation". The offline fallback answers and card explanations were written by Claude from the cards only, and every number in them was checked against the cited cards.
- **In building it:** we used Claude (Anthropic) through Claude Code to help write code, tests and documentation, and to draft the evidence cards from the text of the NASA documents. Every card's quote was checked automatically, word for word, against its PDF page, and every number on a card appears on that page. The team accepted the cards on that basis; [[number]] cards were also read by a team member against the PDF (update before submitting, and say "none" if none). The app's trust badges show this for each card.

## Team
Bassam (evidence lead), Nermine (app & integration), Rita (AI & evaluation), Kafa (pipeline & data), [[name]] (evidence reviewer, mechanical engineering).

---

# Pitch: 2 minutes, 5 slides

| # | Slide | Say (≈ 20–25 s each) |
|---|---|---|
| 1 | **The problem**: a spacecraft fire photo from a NASA source we cite, plus the title | "In space, fire doesn't rise. NASA has run real fire experiments in orbit, but the answers are spread across papers that crews and planners don't have time to read." |
| 2 | **Evidence cards**: screenshot of one card page (blue / orange / purple) | "We turned NASA's SAFFIRE, FLEX and BASS-II results into 31 evidence cards: exact quote, page and numbers, each checked word for word against the source. Blue is what NASA found, orange is our reading, purple is AI, always labelled." |
| 3 | **Live demo**: Ask, then cards, then citation (`notes/demo_path.md` steps 1–2) | "Ask anything. Our offline AI may only use these cards and must cite them." |
| 4 | **Does it help?**: the Plain AI vs our evidence table | "Same model, same questions: with our cards, answers with a number from nowhere dropped from [[plain %]] to [[cards %]], and it says 'Not in our evidence' instead of guessing." *(skip this slide if G1 hasn't run)* |
| 5 | **What NASA doesn't know**: the gaps page | "And the papers themselves tell us what's still unknown, so here are the next questions to test for Moon and Mars crews." |

Close: "Flame in Freefall: NASA evidence, checked, ranked and honest about what we don't know."
