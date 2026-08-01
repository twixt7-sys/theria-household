# Deployment

Vite build → Firebase Hosting. Firestore rules and indexes deploy from this
repository. One platform, one deploy — the direct benefit of having no server
(decision D1).

---

## Firebase project setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).

2. **Authentication** → Sign-in method → enable **Email/Password** and
   **Google**. Add your production domain to authorised domains.

3. **Firestore Database** → create in production mode, in a region near your
   users (`asia-southeast1` for the Philippines).

4. **App Check** → register the web app with **reCAPTCHA v3**. Copy the site
   key into `VITE_RECAPTCHA_V3_SITE_KEY`.

5. **AI Logic** → enable the **Gemini Developer API** backend. It works on the
   free Spark plan; the Vertex AI backend requires billing.

6. **Project settings → Your apps → Web app** → copy the config into `.env`.

---

## Environment

```bash
cp .env.example .env
```

These values are not secrets — they identify the project rather than
authenticating it, and they ship in every client bundle. Firestore rules and
App Check protect the data.

There is no Gemini key to configure. Firebase AI Logic proxies the call.

---

## Rules and indexes

Deploy these **before** the first real user touches the app:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Composite indexes in `firestore.indexes.json` back the queries the app
actually runs — stock events by item and time, bills by due date, payments by
bill. Without them those queries fail in production while working fine against
a small dev dataset.

---

## Build and deploy

```bash
npm run build      # tsc -b && vite build
firebase deploy
```

`firebase.json` sets:

- SPA rewrite — all paths to `index.html`, since routing is client-side
- immutable year-long caching for hashed `js`/`css`/`woff2`
- `no-cache` on `index.html`, so a deploy is picked up immediately

---

## Pre-launch checklist

- [ ] App Check switched to **enforcing** mode
- [ ] Firestore rules deployed and tested against both roles in the emulator
- [ ] Composite indexes built (check the console — they take minutes)
- [ ] `npm run typecheck` and `npm run test` pass
- [ ] Auth authorised domains include production
- [ ] No `.env` committed
- [ ] `VITE_APPCHECK_DEBUG_TOKEN` absent from the production environment
- [ ] Real-time sync verified across two devices: a Manager changes a quantity,
      an Observer's open dashboard updates without a refresh

That last item is the acceptance gate from `prompt0.md` §18. If it does not
work, nothing else matters.

---

## Local emulators

```bash
firebase emulators:start
```

Auth on 9099, Firestore on 8080, UI on 4000. Use this for rules testing — it is
the only way to verify Observer denial without creating a second real account.

---

## Monitoring

Firebase console covers the essentials: Authentication for sign-in failures,
Firestore usage for read volume (a runaway listener shows up here first), App
Check for attestation failures, and AI Logic for Gemini quota.

Application errors go to `console.error` with enough context to debug —
never including tokens, keys or personal data.
