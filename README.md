# Dram

Our whisky club in one place: meets, tasting scores and a dram to discover.

Live at **https://quick-sheet.github.io/Dram/**. Behind a club PIN, for The Whisky Club.

## What it does

- **Meet**: the next meet, with its date, host, place, line-up, slides and song links, and who's in. The glass fills as the day gets closer.
- **Tasting**: everyone scores each dram out of 10, with flavour tags and a note. Scores stay hidden until someone taps Reveal; then the whole club sees the results. A blind tasting shows Dram A, B and C until then.
- **Drift**: swipe through 6,059 whiskies from the catalogue. Each card has Shop (Google Shopping), Read (the source page) and a heart for the club's wish list.
- **Cabinet**: every dram tasted, best first, and the wish list with votes.
- **Finds**: limited and special releases spotted in Google News, checked every Friday.

## Host it

1. Set up the Apps Script first (below), then put its web app address in `index.html`: `const API = '…';`
2. Upload every file in this folder to the `quick-sheet/Dram` repo.
3. In **Settings, Pages**, deploy from the `main` branch, `/ (root)`.

## Apps Script (the club's server)

1. On script.google.com, choose **New project** and name it **Dram**.
2. Paste `apps-script/Code.gs` over the default file. In **Project Settings**, tick **Show "appsscript.json" manifest file in editor**, then paste `apps-script/appsscript.json` into it.
3. Choose **setup** in the toolbar, press **Run** and approve. It creates the club's Google Sheet, the ntfy topic, the daily and weekly triggers, and a 6-digit club PIN. Read the PIN under **Execution log**. To change it, edit `PIN` under **Project Settings, Script Properties**.
4. If a test reminder later says permission is missing, choose **authorise**, press **Run** and approve.
5. **Deploy, New deployment, Web app**. Execute as **Me**, Who has access **Anyone**. Copy the web app URL into `index.html`.

To update it later: **Deploy, Manage deployments**, ✎ **Edit**, Version **New version**, **Deploy**. This keeps the same URL.

## Install

- **Android (Chrome)**: open the live address and tap **Install** on the banner, or Chrome ⋮ then **Install app**.
- **iPhone (Safari)**: tap **Share** (under the ⋯ beside the address bar on iOS 26), then **Add to Home Screen**, keeping **Open as Web App** on.

## Share it

Send members the live address and the club PIN. Each person picks their name once on their phone.

## Update

1. Upload the changed files (same names replace the old ones) and commit.
2. Every release bumps two markers together: `core.js?v=N` in `index.html` and `dram-vN` in `sw.js`.
3. Close the app fully and open it again.

**New catalogue:** upload a new `whiskies.csv` with the same column names. Dram reads it as it is; nothing else changes. Whiskies are matched by their name, style, age, vintage, batch, strength and distillery, so a changed row counts as a new whisky. Past line-ups keep their own copy and aren't affected.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The app |
| `core.js` | Reading the catalogue, titles and descriptions, search, picture matching, score maths |
| `catalogue-worker.js` | Reads the 6,000-row catalogue without freezing the screen |
| `whiskies.csv` | The catalogue |
| `sw.js` | Offline support and instant updates |
| `logo.webp`, `mark.webp`, icons | The club's artwork |
| `apps-script/` | The club's server, deployed separately |

## Good to know

- **Notifications** come through the free ntfy app. The whole club shares one topic. Reminders arrive the day before and on the morning of each meet, around 10:00, and limited-release finds on Fridays around 9:00 when there's something new. New meets and revealed scores are sent by the phone that made them. Never put anything private in a meet's place or notes, since the topic is only private because nobody else knows its name.
- **Pictures**: about half the catalogue has its own picture. For the rest, Dram searches Wikimedia Commons, Open Food Facts and, as a last resort, shows the distillery's Wikipedia picture, clearly labelled. Some shops block their pictures elsewhere; Dram then searches instead.
- **Prices**: the catalogue has none yet, so the Shop button searches Google Shopping.
- **YouTube**: private videos only play for the Google accounts they're shared with. Unlisted ones work for anyone with the link.
- **Android**: if every launch plays a sound and shows "Tap to copy the URL for this app", that's Chrome's **Full screen site controls** notification. Long-press it and turn that category off.

Catalogue: Global Spirits Inventory v2026.10 by E. Pace, The Remade Agency, CC BY 4.0. Logo: The Whisky Club.
