# Rowing Badge Log — 101

A quick reference for how the site works and how to manage it day to day. Nothing here requires touching code unless stated.

## The three moving parts

The site is three things working together:

1. **The Google Sheet** — the badge catalog. Every badge's name, description, image, and rarity flag lives here. This is the thing you'll edit most often.
2. **Supabase** — a small free database that remembers who's earned what. When someone taps a badge, that gets saved here, not in the sheet.
3. **The static site files** (`index.html`, `mainstyle.css`, `app.js`) — the actual webpage. These pull from the Sheet and Supabase live, every time someone loads the page. You only touch these for layout/style changes, not for adding badges or people.

Because of that split: **adding a badge = edit the Sheet. Adding a person = edit `index.html`. Changing how it looks = edit `mainstyle.css`.**

## Adding or editing a badge

In the Google Sheet, each row is one badge, with columns:

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

The list of names in the "Rowing as" switcher (top right of the site) is hardcoded in `index.html`. Find this block:

```html
<select id="personSelect">
  <option value="daniel">Daniel</option>
  <option value="tara">Tara</option>
  ...
</select>
```

Add a new line in the same pattern, e.g.:

```html
<option value="george">George</option>
```

The `value` is what actually gets saved to the database, so keep it lowercase with no spaces — it doesn't need to match the visible name exactly, but keeping them aligned avoids confusion. That's it: no Supabase setup needed per person, the database just starts saving rows for that name the first time they tick a badge.

There's currently no password or login — anyone with the site link can pick any name from the dropdown and mark badges for them. Fine for a trusted crew; worth knowing.

## How earning works

- Clicking a badge's status pill toggles it between **Earn it** and **Earned**, and saves immediately to Supabase against whoever's selected in "Rowing as."
- Earning a normal badge fires a confetti burst; earning a `RARE!` badge fires a bigger, longer one.
- On phones, badges show as icon + title only. Tapping one expands it to show the description and the Locked/Earned pill; tap again to collapse. This is just a display state — nothing is saved until the pill itself is tapped.
- Switching "Rowing as" reloads that person's saved badges from Supabase — each person's progress is independent.

## Where things live

```
index.html      — page structure, the person list, hero copy
mainstyle.css    — all visual styling (colors, layout, fonts)
app.js           — fetches the Sheet + Supabase, renders badges, handles clicks
images/          — badge artwork, section icons, the badge board photo
```

The Sheet and Supabase project are external — not in this repo. `app.js` has both connection details near the top (`SHEET_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).

## Troubleshooting

- **Badges not showing at all / "Error loading badges"** — usually means the Google Sheet's sharing settings changed (it needs to be viewable by anyone with the link) or a row is malformed.
- **A badge's image is broken** — the filename in Column E doesn't exactly match a file in `images/` (check spelling and the `.png`/`.jpg` extension).
- **Someone's earned badges "disappeared"** — most likely a badge's title was changed without it having an explicit ID (see the ID section above).
- **New badge/section not appearing** — the Sheet is fetched fresh on every page load, so a hard refresh (Cmd/Ctrl+Shift+R) usually fixes stale content.
