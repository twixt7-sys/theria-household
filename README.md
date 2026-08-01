# Theria: Household

A household operations and monitoring app. Sibling to **Theria: Finance**,
sharing its design language and engineering conventions.

> **What is the current state of my home?** — answered in about five seconds,
> without navigating anywhere.

How much rice is left, whether the water bill is paid, what needs attention
today, what changed since yesterday. The dashboard presents *state*, not
records.

The sharpest case it serves: a family member working overseas who funds the
household without being there, and currently has to ask by message and wait.

**Full specification:** [`prompt0.md`](./prompt0.md)

---

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Scaffold, design tokens, shell, routing | ✅ |
| 2 | Domain model, repository, Firestore rules | ✅ |
| 3 | Auth, household, roles, stock, live dashboard | ✅ |
| 4 | Bills: CRUD, payments, recurrence, history, trends | ✅ |
| 5–10 | Deadlines, analysis, Homi, polish | roadmap |

Routes not yet built render an honest placeholder naming their phase.

---

## Stack

React 18 · TypeScript 5.9 (strict) · Vite 6 · Tailwind CSS 4 · Radix ·
lucide-react · motion · react-router 7 · Firebase 12 (Auth, Firestore, App
Check, AI Logic) · Vitest.

Versions are pinned to match Theria: Finance so the two apps upgrade together.

**No backend server.** Homi runs on Firebase AI Logic, which proxies Gemini
server-side — the API key never reaches the browser. This replaces the Express
layer in the original brief; see decision **D1** in `prompt0.md`.

---

## Architecture

```
src/
  app/        shell, routing, layout      — how the app is put together
  core/       domain, data, firebase      — what the app knows
  shared/     reusable UI, styles         — how it looks
  features/   vertical slices             — what it does
```

Data flows one way, and only one way:

```
Screen → feature hook → context → repository → Firestore
```

No component imports `firebase/firestore`. No permission check is written
inline in a component. All household arithmetic lives in `core/domain/` and is
unit-tested — the AI never computes, it only phrases.

### Key modules

| File | Responsibility |
|---|---|
| `core/domain/householdStatus.ts` | The single source of household state — dashboard and Homi both read it |
| `core/domain/priority.ts` | Transparent scoring that composes the dashboard |
| `core/domain/stock.ts` · `consumption.ts` | Levels, thresholds, usage rates, forecasts |
| `core/domain/bills.ts` | Countdowns, status, idempotent recurrence |
| `core/domain/billTrends.ts` | Amount history, and what may honestly be claimed about it |
| `core/domain/dates.ts` | Calendar dates that never pass through UTC |
| `core/domain/permissions.ts` | Manager/Observer capabilities (UX layer) |
| `firestore.rules` | Manager/Observer enforcement (security layer) |

The last two rows are deliberately separate. Hiding a button is UX; the rules
file is the actual boundary.

---

## Roles

**Manager** — full mutation rights.
**Observer** — read-only everywhere, including through Homi.

Observers see the same dashboard, minus mutation controls. The UI should read
as *observational*, never as disabled or broken.

Enforced independently in three places: UI affordances, the service layer, and
Firestore rules.

---

## Local setup

```bash
npm install
cp .env.example .env      # fill in your Firebase project config
npm run dev
```

### Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → enable Email/Password and Google.
3. **Firestore** → create a database in production mode.
4. **App Check** → register the web app with reCAPTCHA v3; put the site key in
   `.env`. For localhost, add a debug token as `VITE_APPCHECK_DEBUG_TOKEN`.
5. **AI Logic** → enable the Gemini Developer API backend (works on the free
   Spark plan; the Vertex backend requires billing).
6. Deploy rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

The values in `.env` are **not secrets** — they identify the project rather
than authenticating it, and they ship in every client bundle. Firestore rules
and App Check are what actually protect the data.

---

## Commands

```bash
npm run dev         # dev server on :5174
npm run build       # typecheck + production build
npm run preview     # serve the build
npm run typecheck   # tsc -b
npm run lint        # eslint
npm run test        # vitest
```

---

## Testing

Tests concentrate on domain logic, where the risk actually is:

- stock status across all four threshold bands
- packaged-quantity totals and repackaging after a partial change
- consumption rates — **including the refusal to estimate on thin evidence**
- bill countdowns and idempotent recurrence generation
- payment recording: settlement, backdating, and the next period opening once
- bill amount trends — **including the refusal to call two periods a trend**
- dashboard priority ordering, and state outranking configured priority
- Manager/Observer capabilities

Firestore rules should be tested against both roles with the emulator
(`firebase emulators:start`).

---

## Docs

- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/data-model.md`](./docs/data-model.md)
- [`docs/security.md`](./docs/security.md)
- [`docs/homi.md`](./docs/homi.md)
- [`docs/deployment.md`](./docs/deployment.md)

---

## Deployment

```bash
npm run build
firebase deploy
```

Vite build → Firebase Hosting. One platform, one deploy. Enable App Check in
enforcing mode before launch.
