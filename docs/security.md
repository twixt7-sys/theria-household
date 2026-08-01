# Security

---

## Three independent layers

| Layer | File | Purpose |
|---|---|---|
| UI affordances | components | Managers see controls; Observers do not |
| Service layer | `core/domain/permissions.ts`, feature hooks | Refuse early, with a human sentence |
| **Firestore rules** | `firestore.rules` | **The actual boundary** |

Only the third is security. The first two exist so an Observer gets a clear
experience instead of a stack trace — a hidden button is a courtesy, not a lock.

Never trust: frontend role state, hidden buttons, client-side checks, or
anything the AI says.

---

## Roles

**Manager** — full mutation rights.
**Observer** — read-only everywhere, including through Homi.

Roles come from an **ACTIVE** membership. `INVITED` and `REMOVED` members
resolve to `null`, which grants nothing.

---

## Rule design

Membership documents are keyed by uid, so rules can `get()` them directly —
rules cannot run queries:

```
function isMember(hid) {
  return signedIn()
    && exists(memberPath(hid))
    && get(memberPath(hid)).data.status == 'ACTIVE';
}

function isManager(hid) {
  return isMember(hid) && memberRole(hid) == 'MANAGER';
}
```

Applied as: **members read, managers write.**

### Four constraints worth calling out

**Nobody may edit their own role.**

```
allow update: if isManager(hid)
              && (memberId != request.auth.uid
                  || request.resource.data.role == resource.data.role);
```

Without this, self-promotion walks straight through every other rule in the
file. It is the single most important line here.

**History is append-only.** `stockEvents` and `billPayments` allow `create` and
deny `update` and `delete`. History that can be rewritten is not history. The
actor is pinned server-side too:

```
request.resource.data.actorId == request.auth.uid
```

so a Manager cannot attribute a change to someone else.

**Writes must be correctly scoped.** A document written into household A may
not claim `householdId: 'B'`.

**Nothing is deleted at the root.** `allow delete: if false` on households and
members. Members are set to `REMOVED`.

There is no catch-all `allow`. Anything unmatched is denied.

---

## Testing rules

```bash
firebase emulators:start
```

Verify against both roles, for every collection:

| Case | Expected |
|---|---|
| Manager adjusts stock | allowed |
| Observer adjusts stock | denied |
| Manager marks bill paid | allowed |
| Observer marks bill paid | denied |
| Observer reads dashboard data | allowed |
| Non-member reads anything | denied |
| Manager edits own role | denied |
| Anyone updates a `stockEvent` | denied |
| Write with mismatched `householdId` | denied |

---

## App Check

reCAPTCHA v3 attests that requests come from our app rather than a script with
a copied config. This is what makes the client-side AI Logic call safe, so it
is initialised alongside the Firebase app rather than lazily.

A failed attestation is logged but does not take the app down — Firestore rules
are still enforcing access independently. Enable **enforcing mode** before
launch.

Localhost uses `VITE_APPCHECK_DEBUG_TOKEN`, dev-only.

---

## Secrets

The values in `.env` are **not secrets**. They identify the Firebase project
rather than authenticating it, and they ship in every client bundle. Rules and
App Check are what protect the data.

There is deliberately **no Gemini API key in this project**. Firebase AI Logic
proxies the call server-side, so the key never exists client-side to leak.

Never log passwords, tokens, API keys, or personal data. Firebase errors are
logged with `console.error` and shown to users as plain sentences —
`PERMISSION_DENIED` becomes *"You don't have permission to make changes to this
household."*

---

## AI-specific concerns

**Prompt injection.** Household data and the user's question are delimited, so
neither can read as the other:

```
<snapshot>{...}</snapshot>
<question>...</question>
```

**Data leakage.** Homi's snapshot is built by the same role filter that governs
the UI. An Observer's snapshot omits anything an Observer cannot see, so Homi
cannot reveal it however cleverly it is asked.

**Privilege escalation.** Homi never writes. It returns a structured intent;
the app renders a confirmation; the user confirms; a normal repository write
runs under normal rules. An Observer's intent fails at the UI, and would fail
at the rules regardless of what the model said.
