# Rowing Badge Log — 101

A quick reference for how the site works and how to manage it day to day. Nothing here requires touching code unless stated.

## The moving parts

The site is a few things working together, all anchored to one Google Sheet:

1. **The Sheet's badge catalog tab** — every badge's name, description, image, and rarity flag lives here. This is the thing you'll edit most often.
2. **The Sheet's "Users" tab** — one name per row, feeds the "Rowing as" dropdown on the site.
3. **The Sheet's "Progress" tab** — who's earned what. Managed automatically by the Apps Script below; you don't need to edit it by hand (though you can).
4. **A Google Apps Script Web App** (`apps-script/Code.gs`), deployed from inside that same spreadsheet — a small API the site calls to read/write the Users and Progress tabs. This replaced Supabase, which kept auto-pausing from inactivity; Apps Script has no such limit.
5. **The static site files** (`index.html`, `mainstyle.css`, `app.js`) — the actual webpage. You only touch these for layout/style changes, not for adding badges or people — those are both Sheet edits now.

Because of that split: **adding a badge = edit the catalog tab. Adding a person = edit the Users tab. Changing how it looks = edit `mainstyle.css`.**

## Adding or editing a badge

In the badge catalog tab, each row is one badge, with columns:

| Column | Field | Notes |
|---|---|---|
| A | Section | Groups badges under a heading (e.g. "Training", "Boats"). New section name → new section appears automatically. |
| B | Title | The badge name. |
| C | Description | One line, shows under the title. |
| D | Flag | Leave blank normally. Put `RARE!` (or similar) to give it the coral tag in the corner. |
| E | Image filename | Must match a file already in the `images/` folder of the repo exactly, including `.png`. |
| F | ID | A short unique code for the badge, e.g. `brave-souls`. See below for why this matters. |

To add a badge: add a new row anywhere with these six columns filled in. It'll show up on the site next time the page loads — no code changes needed.

**Why the ID column matters:** each person's earned/locked state is saved against this ID. If you leave it blank, the site invents one from the title automatically — so it still works. But if you rename a badge's title *after* people have started earning it, and it never had an explicit ID, its saved progress will look "reset" for everyone (because the auto-generated ID changes when the title changes). Safest habit: give every badge an ID once, up front, and you can rename titles freely after that without consequence.

**Section blurb rows:** you can give a section an intro paragraph (shown under its heading) by adding a row where Title is exactly `SECTION_DESCRIPTION` and Description is the blurb text. Section and Description are the only columns that matter on that row.

## Adding a person

Add a row to the **Users** tab — one name per row in column A (a header like "Name" in row 1 is fine). It shows up in the "Rowing as" dropdown next page load, no deployment or code change needed.

Internally, each name is turned into a lowercase, no-spaces "slug" (e.g. "A.N. Other" → `a-n-other`) that's what actually gets saved against their progress — that's handled automatically, you only ever need to type the name as you want it displayed.

If the Apps Script is ever unreachable, the site falls back to a small hardcoded list in `index.html` so the dropdown isn't empty — that list only matters as a last resort and isn't where you should add people day to day.

There's currently no password or login — anyone with the site link can pick any name from the dropdown and mark badges for them. Fine for a trusted crew; worth knowing.

## How earning works

- Clicking a badge's status pill toggles it between **Earn it** and **Earned**, and saves immediately to the Progress tab against whoever's selected in "Rowing as."
- Earning a normal badge fires a confetti burst; earning a `RARE!` badge fires a bigger, longer one.
- On phones, badges show as icon + title only. Tapping one expands it to show the description and the Earn it/Earned pill; tap again to collapse. This is just a display state — nothing is saved until the pill itself is tapped.
- Switching "Rowing as" reloads that person's saved badges from the Progress tab — each person's progress is independent.

## The Apps Script (`apps-script/Code.gs`)

This is what turns the spreadsheet into something the site can read and write to. It's not part of the deployed website files — it lives inside the Google Sheet itself (Extensions → Apps Script).

If you ever need to change it:

1. Open the spreadsheet → Extensions → Apps Script.
2. Replace the code with the updated version (ask for it as a file if copy/paste keeps mangling it — Apps Script's editor can be fussy about pasted formatting).
3. **Deploy → Manage deployments → edit (pencil) → New version.** This keeps the same URL, so nothing else needs updating.
4. If you ever create a genuinely *new* deployment instead of updating the existing one, the URL changes — you'll need to update `PROGRESS_API_URL` near the top of `app.js` to match.

## Where things live

```
index.html         — page structure, hero copy, fallback person list
mainstyle.css       — all visual styling (colors, layout, fonts)
app.js              — fetches the Sheet catalog + calls the Apps Script, renders badges, handles clicks
apps-script/Code.gs — the Apps Script source (lives for real inside the Sheet, kept here for reference/version control)
images/             — badge artwork, section icons, the badge board photo
```

The spreadsheet itself is external — not in this repo. `app.js` has the connection details near the top (`SHEET_URL`, `PROGRESS_API_URL`).

## Troubleshooting

- **Badges not showing at all / "Error loading badges"** — usually means the Google Sheet's sharing settings changed (it needs to be viewable by anyone with the link) or a row is malformed.
- **A badge's image is broken** — the filename in Column E doesn't exactly match a file in `images/` (check spelling and the `.png`/`.jpg` extension).
- **Someone's earned badges "disappeared"** — most likely a badge's title was changed without it having an explicit ID (see the ID section above).
- **New badge/section/person not appearing** — the Sheet is fetched fresh on every page load, so a hard refresh (Cmd/Ctrl+Shift+R) usually fixes stale content.
- **Earning a badge doesn't save, or `?mode=users` shows an error page instead of JSON** — the Apps Script deployment itself is the problem, not the site. Check: it's deployed with "Who has access: Anyone" (not "Anyone with Google account"), you actually clicked Deploy after changing that setting, and the URL in `app.js`'s `PROGRESS_API_URL` matches the current deployment's URL exactly.
