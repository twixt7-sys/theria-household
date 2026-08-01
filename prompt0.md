# THERIA: HOUSEHOLD — Master Implementation Specification

**Version:** 0 (prompt0)
**Status:** Authoritative build spec
**Companion app:** Theria: Finance (`theria-FinanceApp/theria-finance`)
**Companion AI:** Homi

---

## 0. HOW TO READ THIS DOCUMENT

This is the optimized, repository-grounded rewrite of the original 208-section
brief. It differs from the brief in one important way: **every architectural
choice here has been checked against the real Theria: Finance codebase** rather
than proposed in the abstract. Where the original brief and the existing
codebase disagreed, this document records the resolution and why.

Read §1 for what the product is, §2 for the decisions that were changed, §3–§7
for architecture, §8–§16 for domain and UI, §17 for the build order.

**Prime directive:**

> Reduce the friction of knowing what is happening at home.

A user should never have to inspect lists, remember dates, or do arithmetic to
answer: *How much rice is left? Is the water bill paid? What needs attention?*

---

## 1. PRODUCT

### 1.1 Identity

**Theria: Household** — a household operations and monitoring application.
Sibling to **Theria: Finance**, sharing its design language, its shell, and its
engineering conventions, but not its domain.

| | Theria: Finance | Theria: Household |
|---|---|---|
| Domain | Money — income, expenses, budgets, savings | Resources — stock, bills, deadlines, household state |
| Companion | Terry | Homi |
| Core question | *Where did my money go?* | *What is the state of my home right now?* |

Household is **not** a second Finance app. Bills are tracked as obligations with
due dates, not as ledger entries. Amounts exist because bills have amounts, not
because the app does accounting.

### 1.2 The problem

Household information exists but never coheres into a current state. Bill due
dates live in memory, stock levels live in whoever last opened the cupboard, and
obligations live in group chats.

The sharpest version of this problem is the **overseas-family case**: a family
member works abroad and funds the household without being present. They buy
supplies that are already stocked, repeatedly ask when bills are due, and have
no way to see current levels. Every question costs a message and a delay.

### 1.3 The five-second test

Opening the app should answer, within about five seconds and without any
navigation:

1. Is everything okay?
2. What is running low?
3. What is due soon?
4. What needs attention today?
5. What recently changed?

The dashboard therefore presents **state**, not records. It is not a table, not
an admin panel, and not a grid of unrelated CRUD cards.

### 1.4 Interaction model

Favour `glance → understand → act` over `open module → inspect → calculate → act`.

```
BAD    Inventory → Rice → History → compute remaining → compare to threshold
GOOD   Dashboard → "RICE  18 kg  ~13 days remaining  GOOD"
```

### 1.5 Roles

**Manager** — full mutation rights: stock, bills, deadlines, categories,
members, settings, thresholds. Can ask Homi to perform actions.

**Observer** — read-only across the entire app, including Homi. Sees the same
dashboard, the same beautiful UI, minus mutation controls. The experience must
read as *observational*, never as *disabled* or broken.

The permission boundary is enforced in three independent places: UI affordances,
the service layer, and Firestore security rules. Hidden buttons are not security.

### 1.6 Explicit non-goals

Do not build: purchasing or marketplace flows, delivery management, barcode
scanning, IoT or smart-home control, general task management, social features,
streaks, achievements, or gamification. Maintenance and tuition are represented
as deadlines, not as their own modules.

Groceries are household stock. The app answers *how much do we have*, never
*where should we buy it*.

---

## 2. ALIGNMENT DECISIONS (changes from the original brief)

These five decisions supersede the corresponding sections of the original brief.
Each was made after reading the Finance codebase.

### D1 — Homi runs on Firebase AI Logic, not Express + Gemini SDK

*Original brief: §52, §119, §120, §123 mandated an Express.js API layer hosting
server-side Gemini calls.*

Theria: Finance has **no backend server**. Terry runs entirely client-side
through Firebase AI Logic:

```ts
// theria-finance/src/core/firebase/ai.ts
const ai = getAI(app, { backend: new GoogleAIBackend() });
return getGenerativeModel(ai, { model: 'gemini-flash-latest', systemInstruction, ... });
```

Firebase proxies the call, so **the Gemini API key never reaches the client** —
which is precisely what §120 demanded. App Check attests that the request came
from our app. The brief's security requirement is satisfied without a server.

**Resolution:** Homi mirrors Terry. `src/core/firebase/ai.ts` exports
`getHomiModel(systemInstruction)`. No Express, no second deployment target, no
hosting bill. The two apps stay structurally identical.

**What this costs and how it is handled:** without a server, "Homi tools"
(§11) cannot be privileged server functions. Instead:

- All household arithmetic is **deterministic and client-side**, in
  `src/core/domain/`. Homi never computes; it only phrases. This is the §138 and
  §191 requirement, and it is stronger here than it would be with a server.
- Homi's context is a **pre-built, permission-filtered JSON snapshot**, exactly
  as `buildFinanceSummary()` works today. Homi sees only what the current role
  is allowed to see, because the snapshot builder already filtered it.
- **Mutations Homi "performs" are UI-proposed, user-confirmed, and executed by
  the app**, never by the model. Homi returns a structured intent; the app shows
  a confirmation; the user taps it; the normal repository write runs with the
  normal Firestore rules applied. An Observer's write is rejected by the rules
  regardless of what the model said.

If a server is ever genuinely needed (scheduled notifications, cross-household
aggregation), add **Firebase Cloud Functions** rather than Express — it keeps one
deployment and one auth model.

### D2 — Firestore-first, with the repository seam preserved

*Original brief: §56, §57, §109, §170.*

Finance is local-first: `TheriaRepository` has `localRepository` and
`firestoreRepository` implementations, and the app is fully usable signed-out.

Household is inherently multi-user and its core value is shared visibility, so
**Firestore is the source of truth** and real-time listeners are mandatory
(§57, §139). But keep the repository interface — it is a good seam, it makes the
domain testable without Firebase, and it powers the demo seed.

```ts
export interface HouseholdRepository {
  load(householdId: string): Promise<HouseholdData>;
  subscribe(householdId: string, onChange: (data: HouseholdData) => void): () => void;
  put<K extends CollectionKey>(householdId: string, collection: K, item: ItemOf<K>): Promise<void>;
  remove(householdId: string, collection: CollectionKey, id: string): Promise<void>;
  replaceAll(householdId: string, data: HouseholdData): Promise<void>;
}
```

`subscribe` is **required** here, not optional as in Finance. The local
implementation exists for tests and the demo household only; unlike Finance,
signing in is required to use the app.

### D3 — No monorepo

*Original brief: §127, §196.*

With no server there is nothing to share across packages. Single Vite app at the
repository root, matching `theria-finance/`. A `shared/` package would be
ceremony.

### D4 — Bottom navigation keeps the hexagon

*Original brief: §15, §62.*

Finance's `BottomNav` has a signature centre: a `clip-path` hexagon Home button
that lifts and scales when active, flanked by two wings of nav items, with a
`motion` `layoutId="nav-dot"` indicator. This is the most recognisable piece of
Theria's chrome and it carries over unchanged.

```
DEADLINES   STOCK   ⬡HOME⬡   ANALYSIS   HOMI
```

Five destinations, Home centred, so each wing holds two items.

### D5 — Design tokens are inherited, then extended

*Original brief: §7, §104, §141, §156.*

Copy `theria-finance/src/shared/styles/` wholesale — `theme.css`, `tailwind.css`,
`index.css`, `fonts.css` — then **replace the two finance-specific semantic
tokens** (`--income`, `--expense`) with the household status ramp. Everything
else, including the emerald primary and the 386px design frame, stays byte-identical.

---

## 3. TECH STACK

Pinned to match Finance so the two apps upgrade together.

**Runtime:** React 18.3 · TypeScript 5.9 (strict) · Vite 6.3
**Styling:** Tailwind CSS 4.1 via `@tailwindcss/vite` · `tw-animate-css`
**UI:** Radix primitives + local shadcn/ui components · `lucide-react` (sole icon family) · `class-variance-authority` · `clsx` · `tailwind-merge`
**Motion:** `motion` 12
**Routing:** `react-router` 7 (`createBrowserRouter`)
**Dates:** `date-fns` 3
**Charts:** `recharts` 2
**Backend:** `firebase` 12 — Auth, Firestore, App Check, AI Logic
**Testing:** `vitest` 3 · `@testing-library/react` · `happy-dom`
**Lint:** `eslint` 9 + `typescript-eslint` 8

Rules: one icon family only. No Redux — React context plus Firestore
subscriptions is sufficient. No dependency without a stated reason. Verify
current stable versions before installing; do not trust tutorials for Firebase
APIs, which churn.

---

## 4. PROJECT STRUCTURE

Mirrors `theria-finance/src` exactly. The four top-level buckets are load-bearing:
`app` = shell and routing, `core` = domain and infrastructure, `shared` = reusable
UI, `features` = vertical slices.

```
theria-household/
  prompt0.md
  firebase.json
  firestore.rules
  firestore.indexes.json
  .env.example
  README.md
  docs/
    architecture.md      data-model.md
    security.md          homi.md
    deployment.md
  scripts/
    seed-demo.mjs
  src/
    main.tsx
    app/
      AppProviders.tsx
      router.tsx
      routes.ts                 # SCREENS, NAV_ITEMS, pathFor, SCREEN_TITLES
      layout/
        AppShell.tsx  TopBar.tsx  BottomNav.tsx  GlobalModals.tsx
      screens/
        DashboardScreen.tsx
      state/
        UiContext.tsx
    core/
      auth/           authResult.ts  user.ts  firebaseUser.ts  validateAuthForm.ts
      constants/      appStorage.ts
      data/           repository.ts  firestoreRepository.ts  localRepository.ts
      domain/
        types.ts                # every domain type
        ids.ts
        stock.ts                # status, percentage, packaged quantity
        consumption.ts          # rates, days remaining, forecasts
        bills.ts                # countdown, status, recurrence
        deadlines.ts
        householdStatus.ts      # the central state engine
        priority.ts             # dashboard ranking
        insights.ts
        units.ts
        mockData.ts
      firebase/       app.ts  auth.ts  config.ts  firestore.ts  ai.ts  appCheck.ts
      lib/            applyTheme.ts  themePresets.ts  themeStorage.ts  localStorageJson.ts
      state/
        AuthContext.tsx         HouseholdContext.tsx
        HouseholdDataProvider.tsx   ThemeContext.tsx
        AlertContext.tsx        ModalStackContext.tsx
        HomiContext.tsx
    shared/
      components/
        ui/                     # Radix-backed primitives
        TheriaBrandLogo.tsx     ProgressRing.tsx   StatusBadge.tsx
        CountdownBadge.tsx      TheriaCard.tsx     QuantityAdjuster.tsx
        EmptyState.tsx          LoadingState.tsx   ConfirmDialog.tsx
        AppPageBackground.tsx   FloatingActionButton.tsx
      lib/            featureColors.ts  formatQuantity.ts  cn.ts
      styles/         index.css  theme.css  tailwind.css  fonts.css
    features/
      auth/           dashboard/    stock/
      bills/          deadlines/    analysis/
      homi/           household/    settings/
      onboarding/
```

Each feature owns `screens/`, `components/`, `hooks/`, `lib/`, and its own
validation. Features never import from each other — shared concepts belong in
`core/domain` or `shared/`.

**Data flow, strictly one-directional:**

```
Screen → feature hook → context → repository → Firestore
```

No component imports `firebase/firestore` directly. No permission check is
written inline in a component.

---

## 5. DESIGN SYSTEM

### 5.1 Inherited tokens

Copy `theme.css` from Finance verbatim. The essentials:

```css
:root {
  --font-size: clamp(13px, calc(100vw * 16 / 386), 16px);
  --radius: 0.75rem;
  --primary: #10B981;
}
.dark {
  --background: #0A0F0D;   --card: #1A2420;
  --foreground: #E8F5E9;   --muted: #2D3832;
  --muted-foreground: #9CA3AF;
  --border: rgba(16, 185, 129, 0.2);
}
```

The `--font-size` clamp scales the whole rem grid to a **386px design frame** on
narrow phones. This is why Finance feels right on a phone. Do not remove it.

Also carried over: the `.hexagon` clip-path and its pulse animation, `.pt-safe` /
`.pb-safe` / `.pb-bottom-nav` safe-area utilities, mobile scrollbar hiding, and
the emerald desktop scrollbar.

### 5.2 Household status ramp

Replace `--income` / `--expense` with:

```css
--status-good:     #10B981;   /* sufficient · paid · healthy */
--status-warning:  #F59E0B;   /* low · due soon · approaching threshold */
--status-critical: #EF4444;   /* critical · overdue · insufficient */
--status-info:     #3B82F6;   /* informational · neutral */
--status-unknown:  #6B7280;   /* not enough data */
```

Register each in the `@theme inline` block as `--color-status-*`.

`--status-unknown` matters: it is the honest colour for an item with no
consumption history, and it prevents the app from implying a forecast it cannot
make (§7.4).

### 5.3 Colour discipline

Colour communicates **state**, never decoration. Most cards are neutral; a
coloured card is a claim that something needs attention. If every card is
coloured, the dashboard is screaming and the user stops reading it.

Colour is never the only signal. Every status carries an icon and a text label
alongside its colour, per WCAG 1.4.1.

### 5.4 Visual hierarchy

```
18 kg              ← value: largest, tabular-nums
RICE               ← label: small, uppercase, tracked
~13 days remaining ← context: muted
GOOD               ← status: badge, coloured
```

Never invert this. The number is the answer to the user's question.

### 5.5 Card variants

Four sizes, assigned by the priority engine, never hardcoded per item type:

| Variant | Use | Mobile | Desktop |
|---|---|---|---|
| `hero` | critical or overdue | full width | 2 cols |
| `large` | primary stock | full width | 2 cols |
| `medium` | secondary stock, categories, bills | full width | 1 col |
| `compact` | low-priority information | half width | 1 col |

The priority engine runs identically on every screen size; only the grid changes.

### 5.6 Motion

Subtle and communicative. Screen transitions use Finance's pattern
(`opacity 0→1`, `y 10→0`, 200ms `easeOut`). Progress rings and number changes
animate; nothing bounces; no animated backgrounds. Honour
`prefers-reduced-motion`.

---

## 6. DOMAIN MODEL

All types live in `src/core/domain/types.ts`. Strict TypeScript; `any` is
forbidden without a written justification.

### 6.1 Ownership

The household — never the user — is the ownership boundary.

```
User → HouseholdMember → Household → household data
```

Every record carries `householdId`. V1 ships one active household, but nothing in
the model forbids more, and no household switcher is needed yet.

### 6.2 Entities

```ts
type Role   = 'MANAGER' | 'OBSERVER';
type Status = 'GOOD' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

interface Household {
  id: string; name: string;
  currency: string;          // 'PHP' default — configurable, never hardcoded
  timezone: string;          // 'Asia/Manila' default
  createdAt: string; updatedAt: string;
}

interface HouseholdMember {
  id: string; userId: string; householdId: string;
  role: Role;
  status: 'ACTIVE' | 'INVITED' | 'REMOVED';
  displayName: string;
  invitedAt: string | null; joinedAt: string | null;
}

interface Category {
  id: string; householdId: string;
  name: string; icon: string;       // lucide icon name
  priority: Priority; description: string;
  active: boolean; createdAt: string; updatedAt: string;
}

interface StockItem {
  id: string; householdId: string; categoryId: string;
  name: string;
  unit: UnitCode;
  quantity: number;                 // in `unit`, always the total
  packaging: Packaging | null;      // see §6.3
  maxQuantity: number;
  preferredQuantity: number;
  warningThreshold: number;
  dangerThreshold: number;
  consumptionTrackingEnabled: boolean;
  priority: Priority;
  notes: string;
  active: boolean;
  createdAt: string; updatedAt: string;
}

interface StockEvent {
  id: string; householdId: string; itemId: string;
  type: 'ADJUSTMENT' | 'RESTOCK' | 'CONSUMPTION' | 'CORRECTION';
  previousQuantity: number; newQuantity: number; delta: number;
  reason: string;
  actorId: string; timestamp: string;
}

interface Bill {
  id: string; householdId: string;
  name: string; provider: string; categoryId: string | null;
  estimatedAmount: number | null;   // §6.5
  actualAmount: number | null;
  dueDate: string;                  // ISO date — never a display string
  billingPeriod: string;            // e.g. '2026-08'
  status: BillStatus;               // derived, never stored — see §7.3
  recurrence: Recurrence | null;
  priority: Priority;
  notes: string;
  active: boolean;
  createdAt: string; updatedAt: string;
}

interface BillPayment {
  id: string; householdId: string; billId: string;
  amount: number; paidAt: string;
  method: string; notes: string;
  actorId: string;
}

interface Deadline {
  id: string; householdId: string;
  title: string; description: string;
  date: string; categoryId: string | null;
  priority: Priority;
  status: 'UPCOMING' | 'DONE' | 'MISSED';
  recurrence: Recurrence | null;
  notes: string;
  active: boolean; createdAt: string; updatedAt: string;
}

interface Insight {
  id: string; householdId: string;
  kind: 'CONSUMPTION_CHANGE' | 'BILL_TREND' | 'DEPLETION' | 'THRESHOLD';
  title: string; detail: string;
  severity: Status;
  subjectType: 'STOCK' | 'BILL' | 'DEADLINE';
  subjectId: string;
  generatedAt: string;
}
```

Future entities (`ShoppingList`, `MaintenanceRecord`, `Document`, `Integration`)
are named here so the model leaves room for them. **Do not implement them in V1.**

### 6.3 Packaged and partial quantities

Rice is *three unopened 5 kg sacks plus 2.2 kg in an open one*. That must not be
crammed into a single number or, worse, a string.

```ts
interface Packaging {
  packSize: number;        // 5
  packUnit: UnitCode;      // 'kg'
  sealedPacks: number;     // 3
  openQuantity: number;    // 2.2
}

// quantity is always derived and stored as the total, in `unit`:
const total = sealedPacks * packSize + openQuantity;   // 17.2 kg
```

The UI shows `3 packs + 2.2 kg` with `17.2 kg total`. Items without packaging set
`packaging: null` and use `quantity` directly. Adjustment controls offer `±1 pack`
and `±1 kg` for packaged items, `±1 unit` otherwise.

### 6.4 Units

Support `kg`, `g`, `L`, `mL`, `pcs`, `pack`, `container`, `%`, plus user-defined
units. Conversion is a lookup table within a dimension (mass, volume) — never
assume two arbitrary units convert. Custom units never convert.

### 6.5 Estimated vs actual

A bill may carry an estimate before the statement arrives. The two are separate
fields and the UI labels them as such. Analysis uses `actualAmount` only; an
estimate is never charted as fact.

### 6.6 Data integrity

Validate, both at form and service boundaries:

```
0 ≤ dangerThreshold < warningThreshold < preferredQuantity ≤ maxQuantity
0 ≤ quantity              (overflow beyond max is allowed but flagged)
amount ≥ 0
dueDate parses as a valid date
```

### 6.7 Derived values are computed, never stored

Do not persist `percentage` alongside `quantity` and `maxQuantity` — it goes
stale the moment either changes. Store inputs, derive outputs. Same for bill
countdowns: store `dueDate`, compute `daysUntilDue` at render.

The one deliberate exception is the cached dashboard summary (§9.4), which is
explicitly a cache and carries `updatedAt`.

### 6.8 Deletion

Bills, payments, stock events and household activity are **never hard-deleted**.
Use `active: false` or a `REMOVED` status. History is what makes analysis
possible, and a household's records are shared property.

---

## 7. DETERMINISTIC CALCULATIONS

Every formula lives in `src/core/domain/`, is pure, and is unit-tested. The AI
never performs arithmetic (§13.3).

### 7.1 Stock level

```ts
percentage = maxQuantity > 0 ? (quantity / maxQuantity) * 100 : 0
```

### 7.2 Stock status

Thresholds are per-item and user-configurable. There is no global percentage rule.

```ts
quantity <= dangerThreshold      → CRITICAL
quantity <= warningThreshold     → WARNING
quantity <  preferredQuantity    → WARNING   (low, but not yet urgent)
otherwise                        → GOOD
```

### 7.3 Bill status

Derived from `dueDate`, today, and payment records:

```ts
paid                       → PAID
daysUntilDue <  0          → OVERDUE
daysUntilDue === 0         → DUE_TODAY
daysUntilDue <= dueSoonDays (household setting, default 3) → DUE_SOON
otherwise                  → UPCOMING
```

Countdown copy is human: `Due today`, `Due tomorrow`, `Due in 3 days`,
`Overdue by 2 days`. No timestamps.

### 7.4 Consumption and forecasting

```ts
averageDailyConsumption = totalConsumed / daysObserved
estimatedDaysRemaining  = quantity / averageDailyConsumption
```

Computed only from `CONSUMPTION` events, never from `RESTOCK` or `CORRECTION`.

**Requires a minimum of 3 consumption events spanning at least 7 days.** Below
that threshold the item's forecast is `null`, its status contribution is
`UNKNOWN`, and the UI says *"Not enough data yet."* — never a guess.

Forecasts are always hedged in copy: *Estimated*, *Approximately*, *Based on
recent usage*. A prediction is never presented as a measurement.

### 7.5 Rounding

Round at the presentation layer only; keep full precision in the model.
`1.384729 kg/day` displays as `1.38 kg/day`. Never show raw float precision.

### 7.6 Household status engine

`householdStatus.ts` is the single source of household state. Both the dashboard
and Homi consume it — the logic is never duplicated in the UI or the AI layer.

```ts
interface HouseholdStatus {
  overallStatus: 'GOOD' | 'ATTENTION' | 'CRITICAL';
  criticalItems:  StatusItem[];
  attentionItems: StatusItem[];
  upcomingItems:  StatusItem[];
  recentChanges:  ChangeEntry[];
  summary: string;        // "2 things need attention"
  computedAt: string;
}
```

`summary` is generated deterministically. Homi may rephrase it; Homi never
originates it.

### 7.7 Dashboard priority

Priority is a transparent, testable function — not a model judgement.

```ts
score = urgency        // time pressure: overdue > due today > due soon
      + severity       // CRITICAL 40, WARNING 20, GOOD 0
      + userPriority   // the item's configured Priority
      + deviation      // distance below preferredQuantity, normalised
      + recency        // recently changed items surface briefly
```

State outranks configured priority: a `LOW` priority bill that is overdue is
still urgent (§77).

Ordering, per §125 of the brief and covered by a unit test:

```
1. critical stock       2. overdue bills
3. bills due soon       4. important deadlines
5. low stock            6. significant changes
7. normal stock         8. informational insights
```

The layout must stay visually coherent — priority chooses card size and order,
it does not license a chaotic grid.

---

## 8. FIRESTORE

### 8.1 Schema

Household-scoped subcollections, so every query and every security rule is
naturally bounded by the ownership boundary.

```
households/{householdId}
  members/{memberId}
  categories/{categoryId}
  stockItems/{itemId}
  stockEvents/{eventId}        # indexed: itemId + timestamp desc
  bills/{billId}               # indexed: dueDate asc, active
  billPayments/{paymentId}     # indexed: billId + paidAt desc
  deadlines/{deadlineId}       # indexed: date asc, active
  insights/{insightId}
  settings/{settingId}
  summary/current              # cached dashboard state (§9.4)

userHouseholds/{userId}        # membership index for post-login resolution
```

`userHouseholds` exists because a user must discover their households *before*
they can read any household document — a rule cannot query for you.

### 8.2 Security rules

Rules enforce membership and role independently of any application code.

```
function member(hid) {
  return exists(/databases/$(database)/documents/households/$(hid)/members/$(request.auth.uid));
}
function role(hid) {
  return get(/databases/$(database)/documents/households/$(hid)/members/$(request.auth.uid)).data.role;
}
function manager(hid) { return member(hid) && role(hid) == 'MANAGER'; }

match /households/{hid}/{document=**} {
  allow read:  if request.auth != null && member(hid);
  allow write: if request.auth != null && manager(hid);
}
```

Additional constraints: a member may not edit their own `role`; `stockEvents` and
`billPayments` are append-only (`allow update, delete: if false`); writes must
carry a matching `householdId`.

Test both roles against every collection before shipping.

### 8.3 Real-time

`HouseholdDataProvider` opens listeners scoped to the active household and only
for collections the current view needs. Detach on unmount. Do not open a
listener per card.

The §130 acceptance test: a Manager changes rice 18 kg → 12 kg; an Observer with
the dashboard open sees 12 kg without refreshing.

### 8.4 Offline

Enable Firestore persistence. Show connection state in the header. Never render a
write as succeeded while it is queued — mark it pending. Reconcile on reconnect.

---

## 9. SCREENS

### 9.1 Routes

```
/auth        sign in / register        (outside the shell)
/setup       first-run household setup (gate, not a route)
/            Dashboard
/deadlines   Deadlines
/stock       Stock
/analysis    Analysis
/homi        Homi
/stock/:id   stock item detail
/bills       Bills   ·  /bills/:id  bill detail
/settings    Settings  ·  /profile  Profile  ·  /notifications
```

Auth state resolves before any protected route renders — protected UI must never
flash before authorization is known.

### 9.2 Shell

`AppShell` follows Finance's structure: `AppPageBackground`, sticky `TopBar`,
animated `<Outlet />`, fixed `BottomNav`, then floating layers (FAB, Homi bubble,
global modals, alerts).

**TopBar:** `TheriaBrandLogo` + `THERIA • Household` + current screen title;
connection indicator; notification bell; profile menu. Nothing more.

**BottomNav:** the hexagon layout from D4. `DEADLINES · STOCK · ⬡HOME⬡ ·
ANALYSIS · HOMI`.

**FAB (Managers only):** collapses to a single direct action on feature screens —
`+ Add Stock` on `/stock`, `+ Add Bill` on `/bills` — and expands to the full
quick-action set on the dashboard. Hidden entirely for Observers, and on `/homi`
where the composer owns the bottom of the screen.

### 9.3 Dashboard

Composed dynamically by the priority engine. The **order** below is the default
rhythm, not a fixed layout; sections that have nothing to say do not render.

```
CALENDAR CARD     month · day number · ProgressRing of month elapsed
HOUSEHOLD STATUS  "2 things need attention"
PRIORITY CARDS    ranked by §7.7 — stock, bills, deadlines interleaved
CATEGORY SUMMARY  "KITCHEN · 12 items · 2 low"
RECENT CHANGES    "Rice +5 kg · Electricity marked paid"
HOMI STRIP        one line, tappable, never dominant
```

The dashboard must feel alive: paying the electricity bill demotes its card;
drinking water crossing its danger threshold promotes it to `hero`. When
everything is healthy the dashboard becomes **calmer**, not emptier — it should
never manufacture alarm to look busy.

**The calendar card** is compact and slightly decorative but still informative:
current month, day number, and a `ProgressRing` showing progress through the
month.

### 9.4 Dashboard performance

Never fetch the entire household to paint the home screen. Maintain
`households/{id}/summary/current`:

```ts
{ criticalStockCount, lowStockCount, upcomingBillCount, overdueBillCount,
  upcomingDeadlineCount, overallStatus, updatedAt }
```

This is a deliberate denormalisation. It is a **cache, not a source of truth**:
it is recomputed on every mutation, and any inconsistency resolves on the next
write. Never read it for anything a mutation depends on.

### 9.5 Stock

Search, filter by category and status, sort. Rows are compact and each carries a
`QuantityAdjuster` for one-tap changes. Detail view shows current state, history,
consumption, forecast, thresholds and notes.

**Fast adjustment is the defining interaction.** A Manager must be able to record
consumption in a single tap from the dashboard:

```
GOOD   Dashboard → Rice card → −1 kg → done
BAD    Dashboard → Stock → Rice → Edit → Quantity → Save → Confirm → Back
```

Every adjustment writes a `StockEvent` with actor, timestamp, before, after,
delta and reason.

### 9.6 Bills

List grouped by status with countdowns. Recurring bills generate the next period
on payment, guarded against duplicates by a deterministic id
(`${billId}-${billingPeriod}`) — never a blind append. Detail shows amount
history so a rising electricity trend is visible at a glance.

### 9.7 Deadlines

Tuition, maintenance, renewals, servicing. Date-driven, with countdowns and
optional recurrence. This is **not** a task manager: no subtasks, no assignees,
no checklists.

### 9.8 Analysis

Every chart answers a stated question, and the question is the chart's title.

```
GOOD   "Rice consumption rose 18% versus last month"
GOOD   "Electricity has increased three months running"
GOOD   "Drinking water typically lasts 9 days"
BAD    a colourful chart of every stock item
```

If the data cannot support a claim, show the empty state instead of a chart.

### 9.9 States

Every data-dependent view implements loading, empty, and error states. No blank
screens.

Empty states say what to do next: *"Your household inventory is empty. Add rice,
water or LPG to start tracking."* · *"Not enough data yet — record a few updates
to see consumption."*

Errors are human. `FirebaseError: PERMISSION_DENIED` becomes *"You don't have
permission to make changes to this household."* Technical detail goes to
`console.error`, never to the user, and never includes tokens or keys.

---

## 10. FIRST-RUN

After registration, a Manager gets a short, **fully skippable** setup:

1. Household name
2. Add key stock — suggest rice, drinking water, LPG
3. Add key bills — suggest electricity, water, internet
4. Add key deadlines
5. Invite members

Suggestions are prefilled defaults, not fixed options. Everything is editable and
every step can be skipped. This is a helping hand, not a wizard the user must
survive.

---

## 11. HOMI

### 11.1 Character

Homi is the interpretation layer over household data, not a chatbot with an app
attached. **The household system is the product; Homi makes it legible.**

Voice: friendly, calm, concise, observant. Two or three sentences unless more is
asked for. No forced enthusiasm, no fake affection, no repeated disclaimers, no
childish register. A competent assistant, not a mascot.

```
User  "How are things at home?"
Homi  "Everything looks mostly good. Rice is at 72% of your preferred level,
       drinking water is getting low, and the electricity bill is due in 3 days."

User  "Do we need rice?"
Homi  "You have about 18 kg left — roughly 13 days at your recent rate. Your
       preferred level is 25 kg, so it's worth topping up soon."

User  "What needs attention?"
Homi  "Three things: the water bill is due tomorrow, drinking water is below
       your preferred level, and LPG is close to its danger threshold."
```

### 11.2 Architecture

Per D1, mirroring `theria-finance/src/features/terry/`:

```
features/homi/
  HomiFloat.tsx          # dashboard bubble
  screens/HomiScreen.tsx # full chat
  chat/
    homiContext.ts       # system instruction + buildHouseholdSummary()
    useHomiChat.ts       # send loop, history, error handling
    chatStore.ts         # per-identity localStorage persistence
    quota.ts             # rate limiting
    intents.ts           # structured mutation proposals (§11.5)
```

`core/firebase/ai.ts` exports `getHomiModel(systemInstruction)` using
`GoogleAIBackend` and a flash-class model, exactly as Finance does. Keep the
model id in one constant — model ids get retired.

### 11.3 Context

Compact, permission-filtered JSON rebuilt for every message. Never the raw
database, never the whole household.

```ts
{ householdStatus, criticalStock, lowStock, upcomingBills, overdueBills,
  deadlines, recentChanges, insights, currency, today }
```

Budget it to ~4000 characters like `buildFinanceSummary`, trimming per-row detail
before ever trimming headline totals. Detail is fetched only when the user asks
for it.

Delimit rigorously, so data cannot read as instructions:

```
<snapshot>{...}</snapshot>
<question>How much rice do we have?</question>
```

**The snapshot is built by the same filter that governs the UI.** An Observer's
snapshot omits anything an Observer cannot see, so Homi cannot leak it even if
asked cleverly (§166).

### 11.4 Grounding — non-negotiable

Homi answers **only** from the snapshot. It never invents or estimates a stock
quantity, bill amount, due date, payment, member or statistic. When a figure is
absent, Homi says so and names the record that would produce it:

> "I don't have enough consumption history for LPG yet — a few more updates and
> I can estimate how long it lasts."

Conversation history is context, never truth. If a message from last week says
rice was 18 kg and today's snapshot says 12 kg, the answer is 12 kg.

### 11.5 Actions

Reads are free. Writes follow a strict path:

1. Homi returns a **structured intent**, not a database call.
2. The app renders a confirmation naming the exact record and change.
3. The user confirms.
4. The app performs a normal repository write, subject to normal Firestore rules.

```
User  "Mark the electricity bill as paid."
Homi  "Just to confirm — mark the electricity bill due August 4 as paid?"
      [Confirm] [Cancel]
```

Homi never claims to have changed something it has not. For an Observer, the
intent is refused at the UI and would fail at the rules regardless.

### 11.6 Cost control

Gemini is called **only** on explicit user interaction. Never on dashboard
render, never on a listener firing, never on a poll. All dashboard state is
deterministic and free. Apply the rate limiting and offline checks from
`terry/chat/quota.ts`.

### 11.7 Degradation

If AI is unavailable, the rest of the app is unaffected:

> "I'm having trouble connecting right now, but your household information is all
> on the dashboard."

### 11.8 Entry points

The bottom nav; the dashboard strip; and contextual "Ask Homi" buttons on cards,
which open the chat pre-seeded with that item's context — from the rice card,
Homi already knows the subject is rice.

### 11.9 Suggested prompts

*How are things at home? · What needs attention? · When is the next bill due? ·
Do we need rice soon? · Which supplies are running low? · What's changed
recently? · Any overdue bills? · How has electricity changed? · How long will our
rice last?*

---

## 12. NOTIFICATIONS

`NotificationService` derives candidates from household state and is entirely
separate from delivery, so push or email can be added later without touching the
logic.

Categories: bill due soon, bill overdue, stock low, stock critical, deadline
approaching. **Timing is configurable per household** — "7 days before" is a
default, not a law. The header badge reflects genuine attention items only; it is
never a re-engagement device.

---

## 13. NON-NEGOTIABLES

**13.1 Dynamic, always.** Rice, electricity and water are *example data*. Nothing
in the code may special-case them. Every stock item, bill, category, unit and
deadline type is user-created and behaves identically.

**13.2 Security is layered.** Never trust frontend role state, hidden buttons,
client-side checks, or anything the model says. Firestore rules protect data on
their own.

**13.3 Deterministic code owns the facts.**

| Deterministic code | Gemini |
|---|---|
| status, thresholds, dates | natural-language explanation |
| percentages, forecasts | conversational answers |
| permissions, sorting, priority | summarising, interpreting |

Never ask the model to do arithmetic the app can do exactly.

**13.4 Real-time.** Shared state is the product. Manager writes must reach
Observer screens without a refresh.

**13.5 Mobile-first.** The 386px design frame governs. Desktop gets a real
responsive layout, not a stretched phone.

**13.6 Household first.** Every feature answers *what does this mean for the
state of the household?* If it does not, it does not ship.

---

## 14. QUALITY

**Accessibility:** semantic HTML, keyboard navigation, visible focus, labelled
controls, sufficient contrast, `prefers-reduced-motion`. Status is never
conveyed by colour alone.

**Code:** no giant components, no duplicated logic, no magic numbers or strings,
no direct Firestore access from components, no AI logic in UI, no scattered
permission checks.

**Observability:** log API, auth, AI and Firestore failures with enough context
to debug. Never log passwords, tokens, API keys or personal data.

**Performance:** route-level code splitting (`lazy` + `Suspense`) as Finance
does; targeted queries; listeners only where needed; memoise real work only.

---

## 15. TESTING

Vitest, focused on domain logic where the risk actually is:

- stock status across all four threshold bands
- percentage and packaged-quantity totals
- consumption rate; days remaining; **the insufficient-data path returning `UNKNOWN`**
- bill countdown across overdue / today / tomorrow / future
- recurring bill generation, including the no-duplicates guarantee
- dashboard priority ordering — the §125 fixture:
  *water critical, electricity due tomorrow, rice normal, internet due in 14 days*
  must rank `water → electricity → rice → internet`
- role permissions: Manager can adjust stock and mark bills paid; Observer cannot
- Homi context builder: an Observer snapshot omits restricted fields
- unit conversion within a dimension; refusal across dimensions

Firestore rules are tested against both roles with the emulator.

---

## 16. CONFIGURATION

```
# .env.example — client-side config. Not secrets: these identify the
# project, they do not authenticate it. Firestore rules and App Check
# are what actually protect the data.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_RECAPTCHA_V3_SITE_KEY=
VITE_APPCHECK_DEBUG_TOKEN=
```

No Gemini key exists in this project — Firebase AI Logic proxies the call
server-side (D1). Never commit `.env`.

**Scripts:** `dev · build · preview · typecheck · lint · test · seed`

**Deployment:** Vite build → Firebase Hosting. Firestore rules and indexes deploy
from `firestore.rules` / `firestore.indexes.json`. Enable App Check in enforcing
mode before launch. One platform, one deploy.

---

## 17. BUILD ORDER

Build **vertically**. A thin working slice beats a broad speculative one. Do not
generate hundreds of files before anything runs.

### Phase 1 — Foundation
Scaffold Vite + React + TS. Port `shared/styles/` from Finance and swap in the
status ramp. Firebase init, App Check, auth (email/password + Google).
`AppShell`, `TopBar`, `BottomNav` (hexagon), router, `AppProviders`.

### Phase 2 — Household and domain
Domain types. Household creation, membership, Manager/Observer.
`HouseholdContext` with real-time subscription. Repository interface plus the
Firestore implementation. Firestore rules and indexes. Deterministic modules:
`stock.ts`, `bills.ts`, `householdStatus.ts`, `priority.ts`, with tests.

### Phase 3 — First vertical slice ✅ *primary acceptance gate*
Categories and stock items. Fast quantity adjustment writing `StockEvent`.
Dashboard rendering calendar, status and priority-ranked stock cards, live.

> **Gate:** a Manager changes rice 18 kg → 12 kg and an Observer's open dashboard
> updates without a refresh. That single flow proves auth, authorization, the
> data model, Firestore, real-time sync, the priority engine and the UI all work
> together. Nothing else starts until it passes.

### Phase 4 — Bills
CRUD, payments, recurrence, countdowns, history, trends.

### Phase 5 — Deadlines
Creation, recurrence, priority, countdowns.

### Phase 6 — Dashboard completion
Category summaries, recent changes, quick actions, full priority composition,
responsive grid.

### Phase 7 — Analysis
Consumption analytics, forecasts, bill trends, the insight engine.

### Phase 8 — Homi
Chat UI, Firebase AI Logic wiring, context builder, grounding, confirmed
intents, contextual entry points.

### Phase 9 — Polish
Responsive refinement, loading/empty/error states everywhere, motion,
accessibility, performance.

### Phase 10 — Production
Rules hardening, App Check enforcement, full test pass, seed script,
deployment, docs.

For each phase: state the change, implement it, run typecheck and tests, verify
in the browser, fix, then continue. Working increments over speculative dumps.

---

## 18. ACCEPTANCE

The product is done when this scenario works end to end.

A mother is overseas. She opens Theria: Household and within five seconds knows
whether the household is okay, how much rice and drinking water remain, when
electricity and water are due, what needs attention, and what recently changed.

She asks Homi *"How are things at home?"* and gets a concise, accurate answer
drawn entirely from current data.

Meanwhile a Manager at home records rice 18 kg → 12 kg. **Her dashboard updates
while she is looking at it.** She asks *"How much rice is left?"* and Homi says
*"12 kg."*

That is the heart of Theria: Household.

---

## 19. WHAT THE PRODUCT SHOULD FEEL LIKE

Calm, organised, intelligent, lightweight, trustworthy, family-oriented.

Not corporate, clinical, cluttered, childish, or conspicuously AI-driven.

Finance's warmth carries over; its playfulness does not become gamification.

> **A live operating system for the household** — not a database where household
> things are recorded.

The difference is the whole point.
