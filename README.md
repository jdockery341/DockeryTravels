# DocTravels

The Dockery family trip planner. Satellite map, day-by-day places, notes and photos — shared by the whole family, live.

Everything in this folder is the deployable site. Push it to the root of the `DockeryTravels` repo and connect that repo to Netlify.

```
public/                      the app (index.html), icons, manifest, service worker
netlify/functions/trips.mjs  GET/PUT trips  →  Netlify Database (Postgres)
netlify/functions/photos.mjs upload/serve photos  →  Netlify Blobs
netlify/lib/auth.mjs         family-passcode check used by both functions
netlify/database/migrations/ schema, applied automatically on deploy
netlify.toml · package.json
```

## Deploy (about 10 minutes)

1. **Push to GitHub.** Copy the contents of this folder to the root of `jdockery341/DockeryTravels` and push to `main`.
2. **Create the Netlify project.** Netlify → *Add new project* → *Import an existing project* → pick the repo. Build settings are read from `netlify.toml` (publish `public`, no build command). Deploy.
3. **Database.** Netlify detects `@netlify/database` and provisions a Postgres database on the first deploy, applying `netlify/database/migrations/`. If the project's **Database** tab shows nothing after the deploy, click *Create a database manually* and redeploy once.
4. **Passcode.** *Project configuration → Environment variables* → add `FAMILY_PASSCODE` (any word or phrase the family will share). Trigger a redeploy so the functions pick it up.
5. **Open the site on each phone**, enter the passcode once, pick who you are, then *Share → Add to Home Screen* so it launches full-screen like an app.

The first device to sign in seeds the database with the Barcelona trip. After that everything lives in Postgres and syncs to every phone within ~30 seconds (immediately when the app is reopened).

## How data works

- One row per trip in the `trips` table: `id`, `data` (JSONB — name, dates, cover photo, per-person access, cities, days, places, notes, photo URLs), `version`, `updated_at`, `updated_by`.
- Saves are refused (`403`) when the sender isn't an editor of that trip; the phone undoes the change and reloads the server copy.
- Every save is a compare-and-set on `version`. If two people edit at once, the second save gets a `409`, the app merges field-by-field (notes and photos are unioned) and retries. Nobody's edit is lost.
- Offline: edits are kept on the phone and pushed when the connection returns. The app shell is cached by `public/sw.js`; map tiles still need a connection.
- Photos are downscaled on the phone (max 1600 px JPEG) and stored in the `photos` blob store; the trip only holds their URLs.

Query the data any time from the Netlify Database tab, e.g. `SELECT data->>'name', version, updated_by FROM trips;`

## Local development

```
npm install
cp .env.example .env         # set FAMILY_PASSCODE
npx netlify-cli dev          # http://localhost:8888
```

Opening `public/index.html` directly (no functions) runs the app in **preview mode**: no passcode, data stays in that browser only.

## Family names

Edit the `MEMBERS` list near the top of `public/index.html` to replace the placeholder initials with real names. Each phone picks its traveler on first launch (changeable under *The Dockerys → Switch traveler*).

## Editing a trip

Open a trip and tap the avatars at the top of the map → **Edit trip**:

- **Cover photo** — any photo from the phone; stored like place photos (downscaled, Netlify Blobs). Remove it to get the plain tile back.
- **Name and dates** — days are trimmed or extended city by city; a place that falls outside the new dates moves to the nearest day (you're asked first).
- **People** — each family member is **Edit**, **View** or **Hidden** on every trip. Editors plan the trip; viewers see everything (and are told it's view only) but can't add, rate, note or change anything; hidden means the trip doesn't appear for that person. At least one editor is required. The same choices appear when starting a trip (everyone can edit by default).

Trips saved before this existed count as everyone-can-edit. The traveler picker is on the honor system — anyone with the family passcode can pick any name.

## Photos

Open any place and tap **+ Photo** (several at once is fine). The place shows a thumbnail on its row, and every photo added to any place lands automatically in the **trip gallery** — the **Photos** tab in the floating bar at the bottom of a trip, grouped by day and city. Tap a photo to view it full screen, swipe between all the trip's photos, jump to the place it belongs to, or delete it (editors only).

## Look and feel

The app uses a Liquid Glass treatment: frosted, blurred panels with a specular rim, floating over the map or a soft wash. Inside a trip, two glass cards float over the map (city + day picker, then the day's places as a timeline) and a glass tab bar at the bottom carries **Trips · Itinerary · Photos · Locate**. Map style and the **+** add button float at the right edge. Type is the system font (SF Pro on Apple devices). The pre-glass build is kept in `archive/index.pre-glass.html` in the design project, not in the site.

## Free services in use

- **Map tiles:** Esri World Imagery (satellite) and OpenStreetMap (standard). No key.
- **Place search / addresses:** Photon (OpenStreetMap data). No key; fair-use.
- **Directions:** hands off to Apple Maps (iPhone) or Google Maps (Android) in walking mode.
- **Hosting, functions, database, blobs:** Netlify. The Free plan has a hard monthly cap that pauses the site when exceeded; the $9 Personal plan auto-recharges, which is safer for a trip in progress.
