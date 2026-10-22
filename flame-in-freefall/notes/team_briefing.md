# Flame in Freefall: team briefing pack

> **How to use this file:** paste the whole thing into a Claude chat with the instruction below.
>
> *"You are helping our NASA Space Apps team. Using ONLY the facts in this document, write: (1) a one-page summary of what we've done so far for the whole team, (2) a short briefing for each role in section 7, and (3) a KPI dashboard from section 6. Don't invent progress, dates or numbers that aren't here; where something is unknown, say 'TBD'."*

Status as of **Thu 22 Oct 2026**. Team: was 2 people (Bassam, Nermine), now **4–5**. New teammates are listed as *TBD* until roles are assigned.

---

## 1. The project in one paragraph

NASA Space Apps Challenge 2026, challenge **"Flame in Free Fall"**. We turn NASA fire-in-space research papers (experiments **SAFFIRE**, **FLEX**, **BASS-II**) into **verified evidence cards**: one finding from one paper, with the exact quote and PDF page. We **rank** them for crew safety, let people **ask questions** answered only from those cards by a **local AI** (no internet), and show **what NASA doesn't know yet**. The app runs **fully offline on one laptop**.

## 2. Hard rules (everyone must know these)

1. **Offline only.** No cloud APIs and no internet at runtime. The only AI is **Ollama** running on the laptop.
2. **Verified only.** The app shows only cards with `status: "verified"`, and only a human sets that.
3. **Never invent data.** No number, quote or finding appears unless it's on a verified card. Fake development cards are named `DEMO-###` and trigger a red **SAMPLE DATA** banner.
4. **Three labelled layers, everywhere.** Each has a colour **and** a text label:
   - ◆ **NASA found** (blue): what the paper says.
   - ▲ **Our safety reading** (orange): our team's interpretation and scores.
   - ● **AI explanation** (purple): anything written by the AI.

   Our reading and AI text are **never** presented as NASA guidance.

## 3. What we have built (done ✅)

All code is on the git branch `claude/app-foundation-cards-lxbx6f` (12 commits). It is **not merged into `main` yet**.

### 3.1 The app (Next.js + TypeScript + Tailwind, in `app/`)
| Page | What it does |
|---|---|
| Home | Intro, colour legend, top 5 cards |
| Explore | All cards with filters (experiment, hazard, control type, material). Three **priority sliders** (crew safety / strength of evidence / Moon-Mars relevance) re-rank live, and each card has a **stability badge**. |
| Card page | The three layers, source title + PDF page, values table, open question, related cards, score reasons |
| Earth vs Space | "In space" next to "on Earth", only where the paper itself makes the comparison |
| Ask | Question → keyword search picks the top 6 cards → local AI answers citing card IDs, shown streaming. Warns if the AI cites a card it wasn't given, or cites none. **Works without the AI:** shows a pre-written answer or just the relevant cards. |
| What NASA doesn't know | Open questions stated in the papers, a table of where our evidence is thin, and cards that conflict |
| Data | Counts, cards-per-hazard chart, sources, all cards, AI accuracy results, downloads (JSON/CSV) |
| Method | How cards are made and checked, the ranking formula, the stability rule, the exact AI prompt, limits |
| Review (dev only) | Internal tool to approve, flag or reject draft cards next to the PDF page text. Hidden in the demo build. |

### 3.2 Ranking
- **Score** = (crew safety × 40% + evidence × 35% + Moon/Mars × 25%). Each card scores 1–5 on each criterion.
- **Stability:** we test all **27** weight mixes (each weight 10–60%). A card in the top 10 in ≥ 80% of them is **"Stable"**; otherwise **"Depends on priorities"**.

### 3.3 Evidence pipeline (Python, in `pipeline/`)
1. `extract_text.py`: PDF → text per page
2. Draft cards (by hand or with AI help)
3. `validate_cards.py`: auto-checks the schema, finds the quote on the stated page, checks every number is on the page
4. **Review page**: a human approves or rejects each card. Decisions are saved with a fingerprint, so editing a card after approval forces a re-review.
5. `promote_verified.py`: copies approved cards into `data/cards.json`

### 3.4 Quality and safety tooling
- **80 automated app tests + 9 pipeline tests**, all passing. Lint and build are clean.
- **AI accuracy test (G1):** `npm run eval:g1` runs every test question through the same AI path as the app. It auto-flags **invented numbers**, **missing citations** and **"Not in our evidence"** answers. Humans mark the final verdict.
- **Demo-day check:** `npm run preflight` gives a ✅/⚠️/❌ list covering:
  - the data, and whether the build is up to date
  - no internet URLs in the build, telemetry off
  - the AI model is installed and answers
  - a live test question

### 3.5 Documentation
`README.md` (how to run), `notes/next_phase.md` (step-by-step card process and schedule), `notes/app_progress.md`, `notes/review_log.md`.

## 4. Where we actually are (honest status)

| Item | Status |
|---|---|
| App features | ✅ Built and tested with **fake sample data** |
| Real verified cards | ❌ **0**. The app still shows SAMPLE DATA. |
| Draft cards | 10 drafted from paper **S01** (SAFFIRE), not reviewed yet |
| Sources (papers) | 1 listed (S01, SAFFIRE). **FLEX and BASS-II papers not added yet.** |
| AI model | Default `llama3.1:8b`, **not tested** on the demo laptop. No model chosen. |
| AI test questions (G1) | 0 written |
| Pre-written answers (offline fallback) | 0 real (2 sample ones exist) |
| AI explanations per card | 0 |
| Demo laptop check (`preflight`) | Not run with real data |
| Branch merged to `main` | No |

**Main risk:** the app is ready but has no real evidence. Everything from here depends on verifying cards.

## 5. Key dates

| Date | Milestone |
|---|---|
| Sun 25 Oct | S01 reviewed (≥ 8 verified) |
| Sun 1 Nov | ≥ 20 verified, all 3 experiments covered, G1 questions written |
| **Sun 8 Nov** | **30 verified cards**, model chosen, preflight ✅ READY |
| Demo / submission day | **TBD** (please fill in) |

## 6. KPIs: what we still need to do

| # | KPI | Now | Target | Deadline | Owner |
|---|---|---|---|---|---|
| K1 | Verified cards in `cards.json` | **0** | **30** | Sun 8 Nov | Evidence team |
| K2 | Experiments covered (SAFFIRE / FLEX / BASS-II) | 0 of 3 verified (1 paper listed) | 3 of 3 | Sun 1 Nov | Evidence team |
| K3 | Papers (sources) in `sources.csv` | 1 | ≥ 3 (1+ per experiment) | Wed 28 Oct | Evidence team |
| K4 | Draft cards reviewed (approved + flagged + rejected) | 0 of 10 | 100% of drafts | ongoing | Reviewers |
| K5 | Second-check rate (approved cards re-checked by another person against the PDF) | 0% | ≥ 20% | Sun 8 Nov | Reviewer 2 |
| K6 | Cards with an open question (feeds the "doesn't know" page) | 0 | ≥ 5 | Sun 8 Nov | Evidence team |
| K7 | Cards linked as related (agrees / conflicts / extends) | 0 | ≥ 10 links, ≥ 2 conflicts | Sun 8 Nov | Evidence team |
| K8 | G1 test questions written | 0 | ~20 (≈ 5 unanswerable) | Sun 1 Nov | AI & eval |
| K9 | Models tested with G1 | 0 | ≥ 2 | Sun 8 Nov | AI & eval |
| K10 | **Invented-number rate** of the chosen model in G1 | not measured | **0%** (target) | Sun 8 Nov | AI & eval |
| K11 | Answers that cite a card (G1) | not measured | ≥ 95% | Sun 8 Nov | AI & eval |
| K12 | Correct "Not in our evidence" on unanswerable questions | not measured | 100% | Sun 8 Nov | AI & eval |
| K13 | Real pre-written answers (offline fallback) | 0 | 3–5 (one per demo question) | Sun 8 Nov | AI & eval + Evidence check |
| K14 | Cards with an AI explanation (`ai_cache.json`) | 0 | top 10 cards, all checked | Sun 8 Nov | AI & eval |
| K15 | `npm run preflight` result with real data, Wi-Fi off | not run | ✅ READY | Sun 8 Nov | App lead |
| K16 | Demo script rehearsed (timed click path) | 0 | ≥ 2 full rehearsals | before demo | Presentation |

## 7. Roles for a team of 4–5 (proposal; please confirm names)

| Role | Person | Main job | KPIs |
|---|---|---|---|
| **Evidence lead** | Bassam | Owns card quality. Drafts and approves cards, sets scores and reasons, decides open questions and related links. | K1, K2, K6, K7 |
| **App & engineering lead** | Nermine | Keeps the app, pipeline and demo laptop working. Merges the branch, runs preflight, fixes issues from reviewers. | K15 |
| **Evidence reviewer 2 / sources** | TBD | Finds and adds the FLEX and BASS-II papers, drafts cards from them, and second-checks about 1 in 5 approved cards against the PDF. | K3, K4, K5 |
| **AI & evaluation** | TBD | Installs and compares Ollama models, writes G1 questions, runs the tests, marks verdicts, writes pre-written answers and AI explanations (checked by Evidence lead). | K8–K14 |
| **Presentation & demo** (if 5th person) | TBD | Story, slides, demo script, timing, judging criteria. Collects the honest numbers for the pitch: cards verified, % checked twice, G1 results. | K16 |

If there are only 4 people, split Presentation between the Evidence lead and AI & evaluation.

## 8. How a new teammate gets started (≈ 30 min)

```bash
git clone <repo> && cd TripoliNASAProject/flame-in-freefall
git checkout claude/app-foundation-cards-lxbx6f          # until it is merged into main
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd app && npm install && npx next telemetry disable
npm run dev                                              # open http://localhost:3000
```

Read first: this file, then `notes/next_phase.md` (the card process step by step), then `CLAUDE.md` (project rules).

The card process in one line: **PDF → extract text → draft → auto-check → review page (human) → promote → commit.**
Approve a card only if:
- the quote is word-for-word on that PDF page
- every number is on that page
- the finding has no advice in it
- the open question is something the paper itself says is unknown.

## 9. Decisions still open (need a team answer)

1. Who takes each TBD role (section 7)?
2. What is the demo / submission date and format (live, video, both)?
3. Which FLEX and BASS-II papers do we use?
4. Is there a domain expert who could check some cards? That would let us mark `expert_checked: true`.
5. Should the G1 test also compare "AI with cards" vs "AI without cards"? (Currently the results file records ollama / cached / offline / no_cards.)
6. When do we merge the branch into `main`?
