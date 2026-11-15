# Dram

Our whisky club in one place: meets, tasting scores and a dram to discover.

Live at **https://quick-sheet.github.io/Dram/**. Behind a club PIN, for The Whisky Club.

## What it does

- **Meet**: the next meet, with its date, host, place, line-up, slides and song links, and who's in. The glass fills as the day gets closer.
- **Tasting**: everyone scores each dram out of 10, with flavour tags and a note. Scores stay hidden until someone taps Reveal; then the whole club sees the results. A blind tasting shows Dram A, B and C until then.
- **Explore**: swipe through 6,059 whiskies from the catalogue. Each card has Shop (Google Shopping), Read (the source page) and a heart for the club's wish list.
- **Cabinet**: every dram tasted, best first, and the wish list with votes.
- **Finds**: limited and special releases spotted in Google News, checked every Friday. Look now works once for the club, then Fridays only. Hearting a find adds it to **Worth a look**, the club's voted shortlist.
- **Media**: the club's music (with lock-screen controls), its YouTube channel or playlist, and its Instagram posts.
- **Light and dark**: the sun and moon button at the top switches; Settings also offers Same as phone.

## Host it

1. Set up the Apps Script first (below), then put its web app address in `index.html`: `const API = '…';`
2. Upload every file in this folder to the `quick-sheet/Dram` repo.
3. In **Settings, Pages**, deploy from the `main` branch, `/ (root)`.

## Apps Script (the club's server)

1. On script.google.com, choose **New project** and name it **Dram**.
2. Paste `apps-script/Code.gs` over the default file. In **Project Settings**, tick **Show "appsscript.json" manifest file in editor**, then paste `apps-script/appsscript.json` into it.
3. Choose **setup** in the toolbar, press **Run** and approve (this includes read-only YouTube access, for the club's channel). It creates the club's Google Sheet, the ntfy topics, the daily and weekly triggers, the club PIN, the admin PIN and your developer PIN. Read them under **Execution log**. To change one, edit `PIN`, `ADMIN_PIN` or `DEV_PIN` under **Project Settings, Script Properties**. Running setup again is safe: it keeps what exists.
4. If a test reminder later says permission is missing, choose **authorise**, press **Run** and approve.
5. **Deploy, New deployment, Web app**. Execute as **Me**, Who has access **Anyone**. Copy the web app URL into `index.html`.

To update it later: **Deploy, Manage deployments**, ✎ **Edit**, Version **New version**, **Deploy**. This keeps the same URL.

## Install

- **Android (Chrome)**: open the live address and tap **Install** on the banner, or Chrome ⋮ then **Install app**.
- **iPhone (Safari)**: tap **Share** (under the ⋯ beside the address bar on iOS 26), then **Add to Home Screen**, keeping **Open as Web App** on.

## People

- **Administrator**: one person looks after the club. They unlock admin in Settings with the admin PIN, then add members, share invites (link and club PIN), set the club's name, YouTube, Instagram and music. Unlocking on another phone hands admin over.
- **Members**: the administrator adds their name first. Newcomers enter the club PIN, then pick their name. Nobody can add themselves, except the very first person in an empty club.
- **Developer**: a separate developer PIN signs in as a hidden member. Nobody sees the developer, not even the administrator: not in the member list, and not their replies, scores, votes, wishes or test meets. The developer can't change the club's meets, reveal its scores or be admin. Messages from the developer's actions go to a separate developer ntfy topic.

## Handing over

1. In Apps Script, choose **resetClub** and press **Run**. It clears members, meets, replies, scores, the wish list and Worth a look, and the administrator. It keeps the PINs, club name, media, music and finds.
2. On your phone, sign out (Settings, at the bottom), then come back in with the developer PIN.
3. Give the founder the address, the club PIN and the admin PIN. They add their name as the first member, then unlock admin in Settings.

Or, without clearing anything: add the founder as a member, let them unlock admin, then the old administrator taps **Step down and leave** in Settings.

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
| `apps-script/` | The club's server, deployed separately. Uses the YouTube service (read-only) |

## Good to know

- **Notifications** come through the free ntfy app. The whole club shares one topic. Reminders arrive the day before and on the morning of each meet, around 10:00, and limited-release finds on Fridays around 9:00 when there's something new. New meets and revealed scores are sent by the phone that made them. Never put anything private in a meet's place or notes, since the topic is only private because nobody else knows its name.
- **Pictures**: about half the catalogue has its own picture. For the rest, Dram searches Wikimedia Commons, Open Food Facts and, as a last resort, shows the distillery's Wikipedia picture, clearly labelled. Some shops block their pictures elsewhere; Dram then searches instead.
- **Prices**: the catalogue has none yet, so the Shop button searches Google Shopping.
- **YouTube**: Dram lists the channel's videos through the YouTube service in Apps Script. If the channel belongs to the Google account running the script, private and unlisted videos are listed too; otherwise only public ones, or everything in an unlisted playlist. Private videos only play for the Google accounts they're shared with, so set club videos to Unlisted to play them inside Dram.
- **Instagram**: the account must be a professional account (Creator is free), which makes it public. The administrator pastes an access token from a Meta developer app; Apps Script keeps it and renews it weekly.
- **Music**: Suno song links, Google Drive files shared with "Anyone with the link", Dropbox links and direct MP3 links all play. Dram checks each link when it's added. Drive won't stream files over 100 MB and can be unreliable with big WAVs, so MP3s are best (about a tenth of the size, and quicker on mobile data).
- **Android**: if every launch plays a sound and shows "Tap to copy the URL for this app", that's Chrome's **Full screen site controls** notification. Long-press it and turn that category off.

Catalogue: Global Spirits Inventory v2026.10 by E. Pace, The Remade Agency, CC BY 4.0. Logo: The Whisky Club.
