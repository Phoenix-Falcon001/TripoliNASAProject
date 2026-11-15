# Flame in Freefall: submission text and final report

Team: Bassam Eter · Ibrahim Hajjo · Nermine Chhhayta · Rita Marroun · Kafa
NASA Space Apps Challenge 2026, challenge "Flame in Free Fall"

---

## 1. Project details (paste into the form)

**What it does / how it works**
Flame in Freefall turns NASA fire-in-space research (SAFFIRE, FLEX, BASS-II) into 31 evidence cards. Each card holds one finding, its exact quote, its PDF page and its numbers as written.

Pipeline: NASA PDF → text extracted page by page → card draft → automatic check that the quote and every number appear word for word on the stated page → team acceptance → app. Only accepted cards are shown.

The app runs fully offline on one laptop:
- **Explore:** filter the cards by hazard, control type and material, and rank them with crew-safety / evidence / Moon-Mars sliders. A stability badge shows which cards stay in the top 10 whatever the weighting.
- **Card pages:** NASA's quote, page and values, plus trust badges showing what was checked.
- **Ask:** a local AI (Ollama) answers only from the matching cards and must cite them. When our cards don't cover a question, it says "Not in our evidence". If the AI is off, checked pre-written answers are shown.
- **What NASA doesn't know:** open questions stated in the sources, gaps in our evidence, and cards that conflict.
- **Earth vs Space, Data and Method pages.**

Every piece of content is labelled with its layer: NASA found (blue), our safety reading (orange), AI explanation (purple).

**Benefits**
Planners, crews and students can see in seconds what NASA actually found about fire in space, with the source page. Interpretation is never mixed with evidence. The app works without internet, as it would have to in a habitat or spacecraft.

**Intended impact**
Safer material choices and fire procedures for Moon and Mars missions. Key findings include:
- NASA's Earth flammability test is not conservative.
- Nitrogen jets can strengthen a flame in microgravity.
- Invisible cool flames can keep burning after the visible flame is out.

The app also gives a clear list of what NASA says is still unknown, to guide the next experiments.

**Tools, languages, hardware, software**
- **App:** TypeScript, Next.js (React), Tailwind CSS, Recharts, Ajv, Vitest.
- **Pipeline:** Python with pdfplumber, rapidfuzz and jsonschema.
- **AI in the app:** Ollama with Llama 3.1 8B, run locally.
- **Development:** GitHub with GitHub Actions CI. Claude (Anthropic) via Claude Code helped write code, tests and documentation, and drafted the cards from the NASA texts.
- **Hardware:** a standard laptop; no cloud services at runtime.

**Creativity**
Every claim is verifiable: an automatic check rejects any quote or number not found on its page. The three colour-coded layers separate NASA's findings from our reading and from AI text. Ranking stability is tested across 27 weightings. A "what NASA doesn't know" view turns open questions into a research agenda. And the local AI can only answer from evidence, or say it can't.

**Factors considered**
- Accuracy and honesty: no invented data, AI never shown as NASA guidance, and how each card was checked shown openly.
- Offline use and crew safety relevance.
- Accessibility: text labels, never colour alone.
- Projector and laptop readability.
- Transparency: the method, the AI prompt and the sources are all public in the app.

AI disclosure: the cards were drafted by Claude and checked automatically, word for word, against the NASA pages. The team accepted them on that basis.

---

## 2. Space Agency Partner & other data (Link Text → Link)

| Link Text | Link |
|---|---|
| NASA, Results of Large-Scale Spacecraft Flammability Tests (Saffire, ICES 2017) | https://ntrs.nasa.gov/citations/20170008805 |
| NASA, A Researcher's Guide to: International Space Station Combustion Science | https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/ |
| NASA Physical Sciences Informatics (PSI) – Combustion Science | https://psi.nasa.gov/physci/repo/search?q=combustion |
| Next.js | https://nextjs.org |
| React | https://react.dev |
| TypeScript | https://www.typescriptlang.org |
| Tailwind CSS | https://tailwindcss.com |
| Recharts | https://recharts.org |
| Ajv JSON Schema validator | https://ajv.js.org |
| Vitest | https://vitest.dev |
| pdfplumber | https://github.com/jsvine/pdfplumber |
| RapidFuzz | https://github.com/rapidfuzz/RapidFuzz |
| jsonschema (Python) | https://github.com/python-jsonschema/jsonschema |
| Ollama | https://ollama.com |
| Llama 3.1 8B (Meta) | https://ollama.com/library/llama3.1 |
| Claude Code (Anthropic) | https://www.anthropic.com/claude-code |
| PptxGenJS (pitch deck) | https://gitbrent.github.io/PptxGenJS/ |
| Font Awesome icons via react-icons (pitch deck) | https://react-icons.github.io/react-icons/ |
| Project source code (GitHub) | https://github.com/Phoenix-Falcon001/TripoliNASAProject |

Note: the PSI repository was a reference for finding sources; no PSI dataset is shown in the app. The GitHub link only works if the repository is public, so make it public before submitting or remove the row.

---

## 3. Final report (status at submission)

| Area | Status |
|---|---|
| App (8 pages, Ask, Review, trust badges, offline) | ✅ done, 121 app + 18 pipeline tests, CI green |
| Evidence | ✅ 31 verified cards, 3/3 experiments, 8 open questions, 41 links |
| Offline fallback | ✅ 5 demo answers, 10 card explanations (numbers checked against cards) |
| G1 AI test | ⚠ 20 questions ready, **not run** (needs Ollama on a laptop) |
| Second human check (K5) | ⚠ not done; cards accepted on the automatic check |
| Pitch | ✅ `notes/Flame_in_Freefall_pitch.pptx`, `notes/video_script.md` |

**Last task (one person, about 45 min):** run `npm run demo`, record the 30-second video from `notes/video_script.md`, paste sections 1 and 2 above into the form, and submit.
