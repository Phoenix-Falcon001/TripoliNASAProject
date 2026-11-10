🔥 **Flame in Freefall: team update (Tue 10 Nov)**

**Done ✅: all the software is on `main`.** Please `git pull`.
- App: 8 pages, trust badges, priority sliders, Ask with local AI + offline fallback, "Plain AI vs our evidence" table, `npm run demo`
- Pipeline: `add_paper.py` → `draft_cards.py` (Ollama drafts) → `check_all.py` → **Review page** (approve / flag / reject, second check) → `promote_verified.py`
- AI test (G1): plain vs with-cards on the same model, `npm run eval:g1`
- Checks: `npm run preflight` (demo-day check), `npm run kpi` (our dashboard), CI on every PR

**Not done ❌: the evidence.** 0 verified cards and 1 of 3 papers, so the app still shows SAMPLE DATA. Nothing else can move until we have real cards.

**Today, in this order** (full commands: `notes/finish_today.md`)
1. **Kafa / Bassam**: find 1 FLEX + 1 BASS-II paper on NTRS (search terms in `notes/papers_to_find.md`), then run `add_paper.py` for each and `extract_text.py` for S01.
2. **Kafa** (laptop with Ollama): `python pipeline/draft_cards.py S01` (then S02, S03), then `check_all.py`. Bassam: if you have the 10 hand-made S01 drafts, save them as `data/drafts/S01_drafts.json` **first**.
3. **Bassam + Reviewer 2**: `npm run dev` and open `localhost:3000/review`. A approve · F flag · R reject · N next. Reviewer 2: second-check at least 1 in 5 approved cards. Goal: **30 verified, all 3 experiments**.
4. **Bassam**: `python pipeline/promote_verified.py --write`, then commit and push.
5. **Rita**: 20 draft questions are ready in `data/eval/questions_draft.csv`. Once cards exist, confirm `answerable`, fill `expected_card_ids`, and copy them into `questions.csv`. Then `npm run eval:g1 -- --models llama3.1:8b,<2nd model>`, mark the verdicts, `npm run eval:summary`, and `npm run ai:drafts`.
6. **Bassam**: check the AI explanations and demo answers, set `"checked_by": "Bassam"`, and delete the 2 SAMPLE answers.
7. **Nermine**: `npm run demo`, then `npm run preflight -- http://localhost:3000` with Wi-Fi OFF until it shows ✅ READY. Fill in `notes/submission_draft.md` from real numbers only.
8. **Everyone**: 2 rehearsals of `notes/demo_path.md`, logged in `notes/rehearsals.md`.

Post `npm run kpi` output here after each step. Questions → ask Claude in your Claude Code session (it reads `CLAUDE.md` + `docs/TEAM_TASKS.md`).
