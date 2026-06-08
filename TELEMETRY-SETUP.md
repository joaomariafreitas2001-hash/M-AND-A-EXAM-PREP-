# Quiz logging to Google Sheet (~10 minutes)

Track **who** finished quizzes, **scores**, and **which filters** they used. Only you see the Sheet.

## Step 1 — Create the Sheet (1 min)

1. Go to [Google Sheets](https://sheets.google.com) → **Blank spreadsheet**.
2. Name it e.g. `M&A Quiz Log`.
3. Keep it **private** (do not share with classmates).

## Step 2 — Apps Script (3 min)

1. In the Sheet: **Extensions → Apps Script**.
2. Delete any default code.
3. Copy all of `scripts/google-sheet-webhook.gs` from this repo and paste it in.
4. Change `SHEET_TOKEN` to a long random string (e.g. `ma_esade_2026_xK9p2m`).
5. **Save** (Ctrl+S).

## Step 3 — Deploy web app (3 min)

1. **Deploy → New deployment**.
2. Type: **Web app**.
3. **Execute as:** Me  
4. **Who has access:** Anyone  
5. **Deploy** → copy the URL ending in **`/exec`** (not `/dev`).

## Step 4 — Connect the website (2 min)

1. Open `js/telemetry-config.js` in this project.
2. Set:

```javascript
const TELEMETRY = {
  webhookUrl: 'https://script.google.com/macros/s/XXXX/exec',
  token: 'same-secret-as-SHEET_TOKEN',
};
```

3. **Save the file**, then commit and push to GitHub (Vercel only serves what is on `main`). If `webhookUrl` is still `''`, the welcome modal will not appear.

## Step 5 — Test (1 min)

1. Open the live site in an **incognito** window.
2. Enter a test name when prompted.
3. Finish a short quiz.
4. Refresh your Google Sheet — you should see a new row.

---

## What each row means

| Column | Example |
|--------|---------|
| Timestamp | When the quiz finished |
| Event | `quiz_complete` or `learner_registered` |
| Name | First name they entered |
| Score / Total / Pct | e.g. 124 / 147 / 84 |
| Topic filter | e.g. `All lessons`, `L5 - MBOs`, `Kraft · Cadbury` |
| Difficulty | `All difficulties`, `medium`, etc. |
| Missed | Number of wrong answers |

**Count tests per person:** filter Sheet by Name, or `=COUNTIF(C:C,"Maria")` for quiz rows.

---

## Disable logging

Set `webhookUrl: ''` in `telemetry-config.js` — no modal, no requests.

## Notes

- Logging is **off** until you paste the webhook URL.
- The token in `telemetry-config.js` is visible in browser source; it only blocks casual spam.
- Uses `no-cors` requests; rows should still append even if the browser cannot read the response.
