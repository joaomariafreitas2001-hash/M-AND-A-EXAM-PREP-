# M&A — Deals Learn

Interactive revision for **9 ESADE M&A exam case deals**. Static site — no build step.

**Live:** deploy via [Vercel](https://vercel.com) from this repo.

## Deploy on Vercel

1. Import [joaomariafreitas2001-hash/M-AND-A-EXAM-PREP-](https://github.com/joaomariafreitas2001-hash/M-AND-A-EXAM-PREP-)
2. Framework Preset: **Other**
3. Build Command: *(leave empty)*
4. Output Directory: **.** (root)
5. Deploy

## Open locally

Double-click **`index.html`** or open it in Chrome/Edge.

**Study music:** sidebar → **Play music** (needs internet). Volume remembered in this browser.

## Deals covered

| # | Deal | Value | Year |
|---|------|-------|------|
| 1 | Microsoft — LinkedIn | $26.2bn | 2016 |
| 2 | CaixaBank — Bankia | ~€4.3bn | 2020–21 |
| 3 | Amazon — Whole Foods | $13.7bn | 2017 |
| 4 | Facebook — Instagram | ~$1bn | 2012 |
| 5 | Kraft — Cadbury | $19.5bn | 2010 |
| 6 | Disney — 21st Century Fox | $71.3bn | 2019 |
| 7 | Marriott — Starwood | ~$13.6bn | 2016 |
| 8 | VW — Porsche | ~€8.36bn | 2009–12 |
| 9 | LVMH — Tiffany | $15.8bn | 2021 |

## Modes

| Tab | What it does |
|-----|----------------|
| **Home** | Quick start + progress (saved in browser) |
| **Study** | Expandable notes per deal + exam frameworks |
| **Compare** | Side-by-side matrix (value, type, motive, outcome) |
| **Practice** | MCQ drill (54 Qs), filter by deal/difficulty |
| **Flashcards** | Key facts + spaced repeat (localStorage) |

## Files

| File | Role |
|------|------|
| `index.html` | Shell + script load order |
| `css/style.css` | Layout and theme |
| `js/study-data.js` | Deal notes + compare matrix |
| `js/flashcards-data.js` | Flashcard deck |
| `js/quiz-data.js` | MCQ bank |
| `js/app.js` | UI logic |

Progress keys: `madeals_flash_v1`, `madeals_quiz_stats_v1`.

Source PDFs: `iCloudDrive/.../Mergers and Acquisitions/Deals/`
