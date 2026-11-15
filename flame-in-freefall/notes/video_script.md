# 30-second video: script and shot list

**Team:** Bassam Eter · Ibrahim Hajjo · Nermine Chhhayta · Rita Marroun · Kafa

## Before recording (5 min)
```bash
git pull
cd flame-in-freefall/app
npm install          # first time only
npm run demo         # builds and starts http://localhost:3000
```
- Turn **Wi-Fi off** for the whole recording: the app is fully offline.
- Browser window 1366×768, zoom 100%, no other tabs. Record the screen with sound (e.g. OBS, or Win+G / Cmd+Shift+5).
- Ollama on or off both work. With Ollama off, the Ask page shows our checked pre-written answer straight away, which is the safest option for a 30-second take.
- Narrate calmly at about 150 words per minute. The script below is ~75 words, which is 30 seconds.

## Shot list + voice-over
| Time | Screen | Do | Say |
|---|---|---|---|
| 0–6 s | **Home** | Show the three live numbers | "Flame in Freefall turns NASA's fire-in-space experiments into thirty-one evidence cards, each checked against NASA's own words." |
| 6–14 s | **Ask** | Click **"Does spraying nitrogen at a flame put it out in microgravity?"** | "Ask a question: our offline AI answers only from those cards, and cites every claim." |
| 14–19 s | **Card BAS-003** | Click the **[BAS-003]** citation | "Each citation opens NASA's exact quote and page." |
| 19–24 s | **Explore** | Drag **Crew safety** up, then **Moon/Mars** up | "Rank the evidence by what matters to your mission." |
| 24–30 s | **What NASA doesn't know** | Scroll the open questions | "And see what NASA says is still unknown: the next questions for Moon and Mars crews." |

**End card (optional, 1–2 s):** "Flame in Freefall · NASA Space Apps 2026", with the five names.

## Rules for the video
- Say only what's on screen or on a card. **No numbers that aren't in the app.**
- Don't mention G1 results unless `npm run eval:g1` has been run and the table shows real numbers.
- If the SAMPLE DATA banner appears, stop: `data/cards.json` didn't load. Run `git pull`, then `npm run demo` again.

## 2-minute pitch (if a longer video or live pitch is needed)
Use `notes/Flame_in_Freefall_pitch.pptx`. The script for each slide is in its **speaker notes** (in PowerPoint: View → Notes). Eight slides at about 15 seconds each, plus the live demo from the table above on slide 6.
