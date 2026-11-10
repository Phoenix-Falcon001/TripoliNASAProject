# Space Apps submission + pitch: DRAFT

Fill every `[[…]]` from `docs/KPI.md`, `data/eval/summary.json` or the app, **never from memory**. Delete any sentence whose number we don't have. Check the official 2026 submission form for the exact fields and limits; this follows the usual Space Apps layout.

---

## Project name
**Flame in Freefall**: what NASA's fire-in-space experiments mean for crew safety

## High-level summary (≈ 100 words)
Fire behaves differently without gravity, and the answers are spread across many NASA papers. Flame in Freefall turns NASA results from SAFFIRE, FLEX and BASS-II into **verified evidence cards**: one finding, its exact quote, its PDF page. People check every card. We rank the cards for crew safety, show how much the ranking depends on priorities, answer questions **only from those cards** with an AI that runs offline on one laptop, and list what the papers themselves say is **still unknown**. Every screen separates what NASA found from our interpretation and from AI text.

## Project details
**What it does**
- **Explore:** [[K1]] verified cards from [[papers]] NASA papers across [[K2]] experiments, filterable by hazard, control type and material. Sliders let you weight crew safety, strength of evidence and Moon/Mars relevance; a stability badge shows which cards stay in the top 10 under any reasonable weighting.
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
| S01 | Results of Large-Scale Spacecraft Flammability Tests | SAFFIRE | https://ntrs.nasa.gov/citations/20170008805 |
| [[S02]] | [[title]] | FLEX | [[link]] |
| [[S03]] | [[title]] | BASS-II | [[link]] |

## Use of AI (disclose honestly)
- **In the app:** a local open-weight model via Ollama ([[model]]) writes explanations and answers. It only sees verified cards, must cite them, and its text is labelled "AI explanation". Pre-written AI text is shown only after a team member checked it.
- **In building it:** we used Claude (Anthropic) through Claude Code to help write code, tests and documentation. Card drafts come from [[Ollama / Claude / by hand]], and **every card shown was approved by a team member against the PDF page**. [[K5]] were checked by a second person.

## Team
Bassam (evidence lead), Nermine (app & integration), Rita (AI & evaluation), Kafa (pipeline & data), [[name]] (evidence reviewer, mechanical engineering).

---

# Pitch: 2 minutes, 5 slides

| # | Slide | Say (≈ 20–25 s each) |
|---|---|---|
| 1 | **The problem**: a spacecraft fire photo from a NASA source we cite, plus the title | "In space, fire doesn't rise. NASA has run real fire experiments in orbit, but the answers are spread across papers that crews and planners don't have time to read." |
| 2 | **Evidence cards**: screenshot of one card page (blue / orange / purple) | "We turned those papers into [[K1]] verified evidence cards: exact quote, page, numbers, checked by two people. Blue is what NASA found, orange is our reading, purple is AI, always labelled." |
| 3 | **Live demo**: Ask, then cards, then citation (`notes/demo_path.md` steps 1–2) | "Ask anything. Our offline AI may only use these cards and must cite them." |
| 4 | **Does it help?**: the Plain AI vs our evidence table | "Same model, same questions: with our cards, answers with a number from nowhere dropped from [[plain %]] to [[cards %]], and it says 'Not in our evidence' instead of guessing." *(skip this slide if G1 hasn't run)* |
| 5 | **What NASA doesn't know**: the gaps page | "And the papers themselves tell us what's still unknown, so here are the next questions to test for Moon and Mars crews." |

Close: "Flame in Freefall: NASA evidence, checked, ranked and honest about what we don't know."
