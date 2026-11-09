# Demo path: 30 seconds, 5 screens

Run on the demo laptop with **Wi-Fi off**:

```bash
cd flame-in-freefall/app
npm run demo                                   # terminal 1: builds + starts http://localhost:3000
npm run preflight -- http://localhost:3000     # terminal 2: must say ✅ READY
```

Before you start: browser at 100% zoom (or 125% on the projector), window 1366×768 or larger, Ollama running (`ollama serve`), and one question chosen from `data/demo_answers.json`. A checked pre-written answer exists for that question, so the demo still works if Ollama stalls.

| # | Time | Screen | Click / type | Say (one line) | Record |
|---|---|---|---|---|---|
| 1 | 0–8 s | **Ask** | Click a suggested question (or type the chosen demo question), press **Ask** | "Every answer comes only from verified NASA evidence cards." | The cards appearing on the right **before** the answer, then the purple answer streaming with `[SAF-…]` citations |
| 2 | 8–12 s | Ask → **card** | Click one citation in the answer | "Each claim links to the exact quote and PDF page." | Card page: blue NASA layer with quote + page, the trust badges, orange team reading below |
| 3 | 12–18 s | **Explore** | Drag **Crew safety** to ~70%, then **Moon/Mars** to ~70% | "Rank by what matters to your mission; ■ Stable cards stay on top whatever the weights." | The list re-ordering; the Stable / Depends on priorities badges |
| 4 | 18–24 s | **Method** (or **Data**) | Scroll to **Plain AI vs our evidence** | "Same local model: with our cards it invents fewer numbers and says 'Not in our evidence' instead of guessing." | The table. Use only the real numbers shown; it says "not measured yet" until G1 has run |
| 5 | 24–30 s | **What NASA doesn't know** | Scroll the open questions, then the coverage table | "And here is what the papers themselves say is still unknown: the next experiments for crew safety." | Top open questions; empty cells in the hazard × control table |

## Recording tips
- Record at 1366×768, 30 fps; zoom in post on the citations (step 1) and the table (step 4).
- Do one take with Ollama on (live streaming) and keep one take with Ollama off (pre-written answer + cards) as a backup.
- Don't read numbers aloud unless they are on screen from a verified card or the G1 table.

## If something goes wrong live
- **Answer is slow:** keep talking over step 1; the cards are already on screen. If it takes more than 20 s, refresh, stop Ollama, and ask again to get the checked pre-written answer.
- **SAMPLE DATA banner visible:** `data/cards.json` is empty on this laptop. `git pull`, then `npm run demo` again.
- **"not measured yet" in step 4:** G1 has not been run on this laptop's data. Say "we measure this with our G1 test" and skip to step 5.
