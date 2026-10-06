# Release 1.0 — Liquid Glass

Everything in this folder is the repo root. Unzip, then from inside the folder:

```
git init -b main
git remote add origin https://github.com/jdockery341/DockeryTravels.git
git add -A
git commit -m "DocTravels 1.0 — Liquid Glass"
git push -u origin main --force   # drop --force if the repo is still empty
```

## Netlify (once)

1. Netlify → **Add new project → Import an existing project** → `jdockery341/DockeryTravels`. Build settings come from `netlify.toml`; just click Deploy.
2. The first deploy provisions the Postgres database and applies `netlify/database/migrations/`. If the **Database** tab is empty afterwards, click *Create a database manually* and redeploy once.
3. **Project configuration → Environment variables → Add** `FAMILY_PASSCODE` = the phrase the family will share. Trigger a redeploy so the functions pick it up.
4. Open the site URL on each phone → passcode → pick who you are → *Share → Add to Home Screen*.

## Before you tag it done

- `public/index.html` line ~131: replace the placeholder names `K`, `E`, `N` in `MEMBERS` with real first names (keep `initial` to one letter). Do this before anyone signs in — names are stored on notes, ratings and trip access.
- Open the live site once on a real iPhone: check the glass blur in Safari, the home-indicator spacing under the tab bar, and that the trip opens with the sheet at the right height.
- Identity is honor-system (shared passcode + self-picked name). Per-person passcodes are the planned upgrade; nothing in the data model needs to change for it.

## What ships

- App shell `public/` (Liquid Glass UI, PWA, offline cache `doctravels-v2`)
- `netlify/functions/trips.mjs` — trips API, Postgres, version compare-and-set, server-side Edit/View enforcement
- `netlify/functions/photos.mjs` — photo upload/serve, Netlify Blobs
- `netlify/lib/auth.mjs` — passcode check
- `netlify/database/migrations/` — schema

Known gaps (not blockers): no delete-trip button (the API supports it), cities can't be added or removed after a trip is created, Tailwind compiles in the browser from a CDN.
