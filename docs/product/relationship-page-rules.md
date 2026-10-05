# The relationship page: what shows where, at any density

**Code:** `src/features/person/portraitModel.ts` (`buildPortrait`, `PORTRAIT_RULES`). **Proofs:** `src/features/person/__tests__/memoryProofs.test.ts`, run through the real gateway pipeline, write rules, sync and views. Screenshots are in `screens/` and listed at the end.

The page is a portrait, not a record. It shows a few true, sourced lines about what's going on now. **Everything Kinship keeps stays in "What Kinship knows about …", one tap away.** Nothing is ever dropped to make the page fit; it is only not *featured*.

## Sections

| Section | What can appear | Order | At most |
|---|---|---|---|
| **Lately** | Active facts and open threads told in the last **120 days**; dated events that happened in the last **30 days**; undated events told in the last 120 days | Newest first; lines from the same note keep the note's order | 3 |
| **Coming up** | Their birthday within **30 days** (from its source: Contacts, a note, or their own edit); dated events and milestones in the next **120 days**; active plans (undated or seasonal) | Soonest first; undated plans last | 3 |
| **You said you'd** | Open promises (yours) | Newest first | 3 |
| **Between you** | Shared context, traditions, shared moments (active or resolved) | Newest first | 3 |

- A section appears only when it has a line.
- When something Kinship knows isn't on the page, the page shows **"What Kinship knows about Priya →"**. It never shows a count.
- Order is by **time only**. Nothing is ranked by importance, sentiment or inferred closeness.
- A page with nothing told yet says: "What you tell Kinship about Sarah will be here: what's going on with them, what's coming up, what you said you'd do." It also shows "Tell Kinship about Sarah". A Contacts birthday doesn't count as something told.

These numbers are product rules, not technical limits. They are founder questions (see `activation-pass.md`).

## Item states and where they go

| State | On the page | In What Kinship knows | In the database |
|---|---|---|---|
| `active` | Yes, by the section rules | Yes | Yes |
| `resolved` (an open thread something later answered) | Only in Between you (context kinds); a resolved thread leaves Lately | Yes, as written | Yes |
| `superseded` (a newer statement replaced it) | No | No | Kept, with `valid_to` set on facts, its sources, and `memory_item_history`. Retracting the newer item restores it (`v2_restore_superseded`). |
| `retracted` ("Not this") / `expired` | No | No | Tombstoned; purged after 30 days |

## Proven progressions

### Anna: "Anna is interviewing at Stripe." → three weeks later → "Anna got the Stripe job!"

| | After note 1 | After note 2 |
|---|---|---|
| Model reply (written by hand, in the model's exact shape) | thread "Anna is interviewing at Stripe" | fact "Anna got the job at Stripe", `existing: resolves` → the thread |
| Pipeline / write rule | thread saved automatically | new fact saved; the thread becomes `resolved` (gateway SQL `resolves`) |
| **Lately** | Anna is interviewing at Stripe | **Anna got the job at Stripe** (the open question has left) |
| **What Kinship knows** | the thread | the job, **and** "Anna is interviewing at Stripe" |
| **History** | — | The thread is kept, resolved, with its source |
| **Provenance** | Note 1's Source shows the thread | Note 1 still shows the thread; note 2 shows the job |

### Ben's knee: "Ben's knee has been bothering him." → a month later → "Ben's knee is finally better."

| | After note 1 | After note 2 |
|---|---|---|
| Pipeline | health fact; **held** until she taps "Remember" (sensitive) | health fact `existing: supersede`; held until "Remember" |
| Write rule | saved after "Remember" | new fact saved with `supersedes_id`; the old fact becomes `superseded`, `valid_to` set |
| **Lately** | Ben's knee has been bothering him | **Ben's knee is better** |
| **What Kinship knows** | the old fact | **only** "Ben's knee is better" |
| **History** | — | The old fact is kept in the database with its own source (proven), not shown anywhere in V1 |
| **Provenance** | Note 1's Source lists the old fact | Note 1's Source no longer lists it, because superseded items are left out. The note itself is kept. |

**Gap to decide:** superseded history is kept but has no visible home. Its natural home is "Your story together", which isn't built yet (coverage #13).

## Density, proven

| Person | Notes | Page |
|---|---|---|
| **New** (Sam) | none | Name, sprig, the invitation to tell; no sections |
| **Lightly known** (Lena) | 2 | Lately: "Lena moved to Oakland"; You said you'd: "Help Lena hang shelves"; no "What Kinship knows" link (nothing hidden) |
| **Richly known** (Priya) | 24 notes over ten months, 24 kept items | 3 + 3 + 3 + 3 lines. Old preferences ("Priya hates cilantro", the Moth podcast) are not in Lately because they were told more than 120 days ago; they're in What Kinship knows (24 lines). Coming up is soonest first. |

In the rich case the real pipeline also did these things, which is correct behaviour:
- It held "Priya's sister Ana moved to Lisbon" and "Priya's mom is visiting from Pune next week" for a subject check (Priya, or her relative?).
- It raised "Priya's dog Miso had a good vet checkup" to *health*. That's a false positive (it's the dog), but it fails safe: it asks before keeping.
- It dropped two of my first-draft fixture lines whose wording wasn't grounded in the note. "Go to…" was dropped as an invented name when the note said "come". A tradition whose anchor wasn't the note's words was dropped as no evidence.

**Known rough edge seen in the rich page:** "Priya's pottery show is on October 24 · Sun, Oct 24" repeats the date. The de-duplication in `withWhen` only matches exact text. Small; to fix after the native pass.

## Screenshots

[new](screens/person-new.png) · [light](screens/person-light.png) · [rich](screens/person-rich.png) · [rich: What Kinship knows](screens/person-rich-knows.png) · [Anna before](screens/anna-before.png) · [Anna after](screens/anna-after.png) · [Anna: What Kinship knows](screens/anna-knows.png) · [knee before](screens/knee-before.png) · [knee after](screens/knee-after.png) · [knee: What Kinship knows](screens/knee-knows.png)
