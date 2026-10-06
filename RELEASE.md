# Release 1.1 — Liquid Glass + email sign-in

Everything in this folder is the repo root. Unzip, then from inside the folder:

```
git init -b main
git remote add origin https://github.com/jdockery341/DockeryTravels.git
git add -A
git commit -m "DocTravels 1.1 — Liquid Glass, Netlify Identity sign-in"
git push -u origin main --force   # drop --force if the repo is still empty
```

## Netlify (once)

1. **Add new project → Import an existing project** → `jdockery341/DockeryTravels`. Build settings come from `netlify.toml`; click Deploy.
2. The first deploy provisions the Postgres database and applies `netlify/database/migrations/`. If the **Database** tab is empty afterwards, click *Create a database manually* and redeploy once.
3. **Project configuration → Identity → Enable Identity.** Then under *Registration* choose **Invite only**.
4. **Identity → Users → Invite users** → enter the family's email addresses. Each person gets an email; the link opens the app's **Create your account** screen (first name + password), and they're in.
5. On each phone: *Share → Add to Home Screen*.

No environment variables are needed. Password resets are self-service from the sign-in screen (**Forgot password?**).

## Before you tag it done

- Open the live site once on a real iPhone: sign in, check the glass blur in Safari, the home-indicator spacing under the tab bar, and that a trip opens with the sheet at the right height.
- Sign in yourself first — the first sign-in seeds the Barcelona trip and grants editing to everyone who has signed in so far. Others appear in each trip's **People** list after their first sign-in.
- `netlify dev` can't run Identity; test sign-in on the deploy or a Deploy Preview.

## What ships

- App shell `public/` (Liquid Glass UI, email + password sign-in, PWA, offline cache `doctravels-v3`)
- `netlify/functions/trips.mjs` — trips API, Postgres, version compare-and-set, server-side Edit/View enforcement keyed to the signed-in user, `members` roster
- `netlify/functions/photos.mjs` — photo upload/serve, Netlify Blobs
- `netlify/lib/auth.mjs` — verifies the Identity token on every API call
- `netlify/database/migrations/` — schema

Known gaps (not blockers): no delete-trip button (the API supports it), cities can't be added or removed after a trip is created, Tailwind compiles in the browser from a CDN.
