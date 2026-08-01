# Architecture

Decisions actually taken, and why. Not a wish list.

---

## The shape of the problem

Household information exists but never coheres into a current state. The app's
job is to turn scattered records into one legible answer to *"is everything
okay at home?"*

That framing drives everything below: the app is a **state machine over
household data**, not a CRUD surface. Records are the input; state is the
product.

---

## Layering

```
src/
  app/        shell, routing, layout
  core/       domain, data access, firebase
  shared/     reusable UI, design tokens
  features/   vertical slices
```

Mirrors `theria-finance/src` deliberately. Anyone who has worked in Finance can
navigate this repository without a map, and improvements to shared conventions
travel between them.

**Rule:** features never import from each other. A concept needed by two
features belongs in `core/domain` or `shared/`.

### Data flow

```
Screen → feature hook → context → repository → Firestore
```

One direction, no shortcuts. Concretely:

- No component imports `firebase/firestore`.
- No component performs a permission check inline.
- No component computes a percentage, countdown or forecast.

The last one matters most: every derived number has exactly one definition, in
`core/domain/`. When the dashboard and Homi both say "18 kg", it is because
they called the same function, not because two implementations happened to
agree.

---

## Why there is no server

The original brief specified Express hosting server-side Gemini calls. Theria:
Finance has no server, and Terry runs through Firebase AI Logic:

```ts
const ai = getAI(app, { backend: new GoogleAIBackend() });
getGenerativeModel(ai, { model, systemInstruction, generationConfig });
```

Firebase proxies the request. **The Gemini API key never enters the browser** —
which is exactly what the brief's security requirement asked for. App Check
attests that the caller is our app rather than a script with a copied config.

So the security goal is met without an Express deployment to host, secure, scale
and pay for. The cost is that "privileged AI tools" cannot be server functions.
That is handled by making the constraint stricter rather than looser:

| Concern | How it is handled without a server |
|---|---|
| AI doing arithmetic | It never does. All maths is deterministic and client-side. |
| AI seeing too much | Context is a pre-filtered snapshot built by the same role filter as the UI. |
| AI performing writes | It returns a structured intent; the app confirms and writes; Firestore rules decide. |

If server-side work is ever genuinely required — scheduled notifications,
cross-household aggregation — the answer is **Cloud Functions**, not Express.
One deployment, one auth model.

---

## Why Firestore is the source of truth

Finance is local-first and usable signed-out, because a personal ledger is
personal. A household is shared by definition, and the product's core value is
that someone abroad can see what someone at home just changed. Local-first
would undermine the reason the app exists.

So: Firestore is authoritative, real-time listeners are mandatory, and sign-in
is required.

The repository interface from Finance is kept anyway, because it is a good
seam — it makes the domain testable without Firebase and gives the demo seed
somewhere to live. The one change is that `subscribe` is required rather than
optional.

---

## State management

Three React contexts, no state library:

| Context | Owns |
|---|---|
| `AuthContext` | Firebase auth session; resolves before protected UI renders |
| `HouseholdContext` | Active household, live data, derived status, role, capabilities |
| `UiContext` | Ephemeral shell state (modals, filters) |

`HouseholdContext` opens **one subscription** and derives everything from it.
Household status is computed once, in a `useMemo` keyed on the data, and shared
by every consumer. This is why the dashboard and Homi cannot disagree.

Redux would add ceremony without solving anything: there is one shared
document tree, and Firestore already handles synchronising it.

---

## The dashboard is composed, not authored

There is no hardcoded list of dashboard cards. `priority.ts` scores everything:

```
score = urgency + severity + userPriority + deviation + recency
```

Score determines both **order** and **card size**, which is what keeps a
dynamically composed grid visually coherent instead of ragged.

Two properties fall out of this that a hand-authored dashboard cannot have:

- **It stays current.** Paying a bill demotes it; water crossing its danger
  threshold promotes it to hero. Nobody has to remember to re-order anything.
- **State outranks configuration.** A `LOW`-priority bill that goes overdue
  beats a `HIGH`-priority one due in three weeks.

Priority is deliberately a plain function rather than a model judgement. Card
ordering is not a problem that needs intelligence, and an opaque ranking would
be unpredictable, unexplainable, and impossible to unit-test.

---

## Honesty as an architectural constraint

The `UNKNOWN` status and the `null` forecast are load-bearing.

A consumption rate computed from two data points is worse than no rate,
because the user will act on it. `consumption.ts` therefore refuses to estimate
below **3 events spanning 7 days**, and the UI says *"Not enough data yet."*

The same principle appears throughout: estimated bill amounts are labelled as
estimates and excluded from trend analysis; forecasts are always hedged in copy
(*estimated*, *approximately*); Homi answers only from its snapshot and says so
when a figure is missing.

An app that guesses convincingly is worse than one that admits ignorance,
because the whole point is being trusted from another country.

---

## Performance

- Route-level code splitting; the dashboard is eager since it is the landing route.
- Listeners are scoped to the active household and torn down on change — never
  one per card.
- The subscription emits only once every collection has reported, so the first
  paint is not a half-populated dashboard that flickers into place.
- A cached `summary/current` document exists for fast dashboard loads. It is
  explicitly a **cache**: recomputed on every mutation, carrying `updatedAt`,
  and never read for anything a mutation depends on.

---

## What was deliberately not built

Task management, purchasing, delivery, barcode scanning, IoT, gamification,
streaks. Maintenance and tuition are deadlines, not modules.

Every one of these is a plausible household-app feature. None of them answers
*what is the state of my home right now?*, and each would dilute the screen
that does.
