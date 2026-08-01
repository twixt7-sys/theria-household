# Homi

> Homi is the interpretation layer over household data — not a chatbot with an
> app attached. The household system is the product; Homi makes it legible.

**Status:** Phase 8. `core/firebase/ai.ts` and the dashboard strip exist; the
chat feature is not built yet. This document is the contract it must be built
against.

---

## Architecture

Mirrors `theria-finance/src/features/terry/`:

```
features/homi/
  HomiFloat.tsx            dashboard bubble
  components/HomiStrip.tsx dashboard one-liner        ← built
  screens/HomiScreen.tsx   full chat
  chat/
    homiContext.ts         system instruction + buildHouseholdSummary()
    useHomiChat.ts         send loop, history, errors
    chatStore.ts           per-identity localStorage
    quota.ts               rate limiting
    intents.ts             structured mutation proposals
```

`getHomiModel(systemInstruction)` in `core/firebase/ai.ts` returns a
flash-class model over the Gemini Developer API backend. The model id lives in
one constant because model ids get retired without notice.

**No API key exists client-side.** Firebase proxies the call; App Check attests
it. See decision D1 in `prompt0.md`.

---

## The division of labour

This is the single most important thing about Homi.

| Deterministic code | Gemini |
|---|---|
| status, thresholds | natural-language explanation |
| percentages, days remaining | conversational answers |
| bill countdowns | summarising, interpreting |
| permissions, sorting, priority | contextual recommendations |

Homi is never asked to compute anything. `householdStatus.ts` produces the
summary; Homi rephrases it. If the two ever disagree, the code is wrong, not
the model.

This is not caution for its own sake. Models are unreliable at arithmetic and
completely reliable at phrasing — using each for what it is good at is simply
the correct engineering choice.

---

## Context

Compact, permission-filtered JSON, rebuilt for every message:

```ts
{ householdStatus, criticalStock, lowStock, upcomingBills, overdueBills,
  deadlines, recentChanges, insights, currency, today }
```

Budgeted to ~4000 characters, following `buildFinanceSummary()`. When trimming
is needed, **per-row detail goes before headline totals** — the summary figures
must never be the thing that gets cut.

Never the raw database. Never the whole household. Detail is fetched only when
the user asks for it.

Delimited so data cannot read as instructions:

```
<snapshot>{...}</snapshot>
<question>How much rice do we have?</question>
```

The snapshot is built by the same role filter that governs the UI, so an
Observer's snapshot simply does not contain what an Observer may not see.

---

## Grounding — non-negotiable

Homi answers **only** from the snapshot. It never invents or estimates a stock
quantity, bill amount, due date, payment, member or statistic.

When a figure is missing, Homi says so and names what would produce it:

> "I don't have enough consumption history for LPG yet — a few more updates and
> I can estimate how long it lasts."

**Conversation history is context, never truth.** If last week's message says
rice was 18 kg and today's snapshot says 12 kg, the answer is 12 kg. The
snapshot rides with every message precisely so that a conversation resumed days
later still sees current figures.

---

## Actions

Reads are free. Writes follow one path:

1. Homi returns a **structured intent**, not a database call.
2. The app renders a confirmation naming the exact record and change.
3. The user confirms.
4. The app performs a normal repository write, under normal Firestore rules.

```
User  "Mark the electricity bill as paid."
Homi  "Just to confirm — mark the electricity bill due August 4 as paid?"
      [Confirm] [Cancel]
```

Homi never claims to have changed something it has not. For an Observer the
intent is refused at the UI, and would fail at the rules regardless.

---

## Voice

Friendly, calm, concise, observant. Two or three sentences unless more is
asked for.

Not: forced enthusiasm, fake affection, repeated disclaimers, childish
register. A competent assistant, not a mascot.

```
User  "How are things at home?"
Homi  "Everything looks mostly good. Rice is at 72% of your preferred level,
       drinking water is getting low, and the electricity bill is due in 3 days."

User  "Do we need rice?"
Homi  "You have about 18 kg left — roughly 13 days at your recent rate. Your
       preferred level is 25 kg, so it's worth topping up soon."
```

---

## Cost control

Gemini is called **only** on explicit user interaction. Never on dashboard
render, never on a listener firing, never on a poll.

Everything the dashboard shows — including the summary line in `HomiStrip` — is
deterministic and free. Homi phrases things only once a conversation is opened.

Rate limiting and offline checks follow `terry/chat/quota.ts`.

---

## Degradation

If AI is unavailable, the rest of the app is unaffected:

> "I'm having trouble connecting right now, but your household information is
> all on the dashboard."

Homi is an enhancement. The household system works without it.

---

## Entry points

- Bottom navigation
- The dashboard strip
- Contextual "Ask Homi" on cards — opening from the rice card seeds the
  conversation so Homi already knows the subject

## Suggested prompts

*How are things at home? · What needs attention? · When is the next bill due? ·
Do we need rice soon? · Which supplies are running low? · What's changed
recently? · Any overdue bills? · How has electricity changed? · How long will
our rice last?*
