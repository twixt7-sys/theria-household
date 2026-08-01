# Data model

Types live in `src/core/domain/types.ts`. This document explains the decisions
behind them.

---

## Ownership

```
User → HouseholdMember → Household → household data
```

The **household** is the ownership boundary, never the user. Every record
carries `householdId`, and every collection is a subcollection of its
household. That makes queries and security rules share the same natural
boundary — a rule never has to reason about who owns what.

V1 ships one active household. The model already supports more; there is
simply no switcher yet.

---

## Firestore layout

```
households/{householdId}
  members/{userId}          ← doc id IS the uid
  categories/{id}
  stockItems/{id}
  stockEvents/{id}          ← append-only
  bills/{id}
  billPayments/{id}         ← append-only
  deadlines/{id}
  insights/{id}
  settings/{id}
  summary/current           ← cache

userHouseholds/{userId}     ← membership index
```

Two details are load-bearing:

**Member doc id is the uid.** Security rules cannot run queries. Keying
membership by uid lets a rule do `get(.../members/$(request.auth.uid))`
directly.

**`userHouseholds` exists** because a user must discover which households they
belong to *before* they are allowed to read any household document. Without
this index there is no first step.

---

## Derived values are computed, never stored

Storing `percentage` alongside `quantity` and `maxQuantity` guarantees they
will disagree eventually. Store inputs, derive outputs:

| Stored | Derived at render |
|---|---|
| `quantity`, `maxQuantity` | `percentage` |
| `dueDate` | `daysUntilDue`, `status`, countdown copy |
| `stockEvents` | consumption rate, days remaining, trend |
| thresholds | `Status` |

A stored "3 days left" is wrong by tomorrow.

The one intentional exception is `summary/current`, which is explicitly a
cache — recomputed on every mutation, and never read for anything a mutation
depends on.

---

## Packaged quantities

Rice is *three sealed 5 kg sacks plus 2.2 kg open*. That is how the cupboard
looks, so that is how it is modelled:

```ts
interface Packaging {
  packSize: number;      // 5
  packUnit: UnitCode;    // 'kg'
  sealedPacks: number;   // 3
  openQuantity: number;  // 2.2
}
```

`quantity` stores the derived total (17.2 kg) so thresholds, queries and
forecasts work uniformly across packaged and unpackaged items. `packaging` is
the source of truth for items that have it; `adjustStock` redistributes packs
after a partial-unit change so "3 packs + 2.2 kg" stays true after a −1 kg tap.

Cramming this into a single number loses the "+1 pack" button. Cramming it into
a string loses everything.

---

## Status thresholds

Per item, never a global percentage rule — 8 kg of rice and 8 bars of soap mean
completely different things.

```
quantity <= dangerThreshold   → CRITICAL
quantity <= warningThreshold  → WARNING
quantity <  preferredQuantity → WARNING   (low, not yet urgent)
otherwise                     → GOOD
```

Validated ordering, enforced at form and service boundaries:

```
0 ≤ danger < warning < preferred ≤ max
```

Without that check, `warning: 5, danger: 10` yields a permanently CRITICAL item
and no explanation for it.

The `preferred` band is what makes the dashboard useful: an item can be below
where the household likes to keep it without being anywhere near urgent, and
the UI needs to say so without crying wolf.

---

## `UNKNOWN` and `null`

`Status` has four values, not three. `UNKNOWN` is the honest state for an item
we cannot yet judge, and it has its own colour token.

Likewise `averageDailyConsumption` and `estimatedDaysRemaining` are
`number | null`. Null is not an error state — it is the correct answer when
evidence is thin, and it renders as *"Not enough data yet."*

Minimum evidence: **3 consumption events spanning 7 days.**

Only `CONSUMPTION` events count. A restock is not usage; a `CORRECTION` is an
admission the record was wrong. Folding either into the rate would make a
well-stocked cupboard look like it is emptying fast.

---

## Estimated vs actual

Bills carry both:

```ts
estimatedAmount: number | null;   // before the statement arrives
actualAmount:    number | null;
```

The UI shows `actual ?? estimated` and labels an estimate as such. **Analysis
uses `actualAmount` only** — an estimate is never charted as fact. When a
recurring bill generates its next period, last period's actual becomes the new
estimate: the best available guess, clearly marked.

---

## Append-only history

`stockEvents` and `billPayments` are the household's audit trail. Firestore
rules permit `create` and deny `update` and `delete` outright.

Every stock adjustment records actor, timestamp, before, after, delta and
reason. That is what lets someone abroad see *who* changed what — the point of
the feature, not a compliance box.

Elsewhere, retire rather than delete: `active: false`, or `status: 'REMOVED'`
for members. History is what makes analysis possible, and in a shared household
one person's cleanup is another person's lost record.

---

## Units

Built-ins: `kg`, `g`, `L`, `mL`, `pcs`, `pack`, `container`, `%`. Households may
define their own.

Conversion happens **only within a dimension** (mass, volume). `convert()`
returns `null` across dimensions and for custom units. "3 containers" into
kilograms is not a conversion, it is a guess.

---

## Rounding

Full precision in the model, rounded at the presentation layer.
`1.384729 kg/day` displays as `1.38 kg/day`. Raw float precision on a household
screen looks broken.
