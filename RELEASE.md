# Release 1.2 — Route-strip itinerary filter

Everything in this folder is the repo root. Unzip, then from inside the folder:

```
git init -b main
git remote add origin https://github.com/jdockery341/DockeryTravels.git
git add -A
git commit -m "DocTravels 1.2 — whole-trip itinerary with route-strip filter"
git push -u origin main --force   # drop --force if the repo is still empty
```

## New in 1.2

- A trip opens on **today** showing the whole itinerary, day by day, each day header naming its city.
- The city/day chips are replaced by one **route strip**: `All · Today · one pill per stop` (a city visited twice is two stops) with its days as numbered discs — the ringed one is today. Tap a stop to filter to it (tap several to combine); tap a day number, then another, for a date range. `All` clears.
- **Edit trip → Cities**: add a city (typed name, located automatically), remove one, and tap a city open to pick the days spent there. A day belongs to one city and its places move with it — so the departure flight can live in Atlanta on Oct 7 while Barcelona starts Oct 8. A place's Day picker now lists every trip day.
- The map follows the list: whichever day is under the top of the list is the active day (the small chip at the map's bottom-left), and the pins refit to it. Photos are unaffected by the filter.
- The map view always uses light glass (the glass is lit by the map behind it), even when the phone is in dark mode; the trip list and sign-in still follow Appearance.

## Already deployed? (upgrading from 1.1)

Just push: `git add -A && git commit -m "DocTravels 1.2 — route-strip filter, city editing" && git push`. No new env vars, no migrations, no Netlify settings. Phones pick up the new build on their next open (cache `doctravels-v4`); a saved "Barcelona" day selection from 1.1 is replaced by today automatically.

First thing after deploying: **Edit trip → Add a city → Atlanta → tap day 7 → Save** so the departure flight lives in Atlanta.

- Offline cache bumped to v4 so phones pick up the new build.

## Netlify (once)

1. **Add new project → Import an existing project** → `jdockery341/DockeryTravels`. Build settings come from `netlify.toml`; click Deploy.
2. The first deploy provisions the Postgres database and applies `netlify/database/migrations/`. If the **Database** tab is empty afterwards, click *Create a database manually* and redeploy once.
3. **Project configuration → Identity → Enable Identity.** Then under *Registration* choose **Invite only**.
4. **Identity → Users → Invite users** → enter the family's email addresses. Each person gets an email; the link opens the app's **Create your account** screen (first name + password), and they're in.
5. On each phone: *Share → Add to Home Screen*.

No environment variables are needed. Password resets are self-service from the sign-in screen (**Forgot password?**).

## Before you tag it done

- Open the live site once on a real iPhone: sign in, check the glass blur in Safari, the home-indicator spacing under the tab bar, and that a trip opens on today with the whole itinerary listed.
- Try the route strip: tap a stop (teal), tap two day numbers for a range, tap **All** to clear; scroll the list and watch the map and the day chip follow.
- Sign in yourself first — the first sign-in seeds the Barcelona trip and grants editing to everyone who has signed in so far. Others appear in each trip's **People** list after their first sign-in.
- `netlify dev` can't run Identity; test sign-in on the deploy or a Deploy Preview.

## What ships

- App shell `public/` (Liquid Glass UI, whole-trip itinerary with route-strip filter, email + password sign-in, PWA, offline cache `doctravels-v4`)
- `netlify/functions/trips.mjs` — trips API, Postgres, version compare-and-set, server-side Edit/View enforcement keyed to the signed-in user, `members` roster
- `netlify/functions/photos.mjs` — photo upload/serve, Netlify Blobs
- `netlify/lib/auth.mjs` — verifies the Identity token on every API call
- `netlify/database/migrations/` — schema

Known gaps (not blockers): no delete-trip button (the API supports it), Tailwind compiles in the browser from a CDN.
