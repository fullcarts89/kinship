# The relationship page: what shows where, at any density

**Code:** `src/features/person/portraitModel.ts` (`buildPortrait`, `PORTRAIT_RULES`). **Proofs:** `src/features/person/__tests__/memoryProofs.test.ts`, run through the real gateway pipeline, write rules, sync and views. Screenshots are in `screens/` and listed at the end.

The page is a portrait, not a record. It shows a few true, sourced lines about what's going on now. **Everything Kinship keeps stays in "What Kinship knows about …", one tap away.** Nothing is ever dropped to make the page fit; it is only not *featured*.

## Sections

| Section | What can appear | Order | At most |
|---|---|---|---|
| **Lately** | Active facts and open threads told in the last **120 days**; dated events that happened in the last **30 days**; undated events told in the last 120 days; **someone else's promise whose day has passed**, still open, for **30 days** after its day (founder K2, below). **A residence told more and less precisely takes one slot** (Phase 4B B7, below) | Newest first; lines from the same note keep the note's order | 3 |
| **Coming up** | Their birthday within **30 days** (from its source: Contacts, a note, or their own edit); dated events and milestones in the next **120 days**; active plans (undated or seasonal); someone else's promise **until the end of its day**. **Never anything whose day has passed** (founder K2) | Soonest first; undated plans last | 3 |
| **You said you'd** | Open promises (yours) | Newest first | 3 |
| **Between you** | Shared context, traditions, shared moments (active or resolved); then **the conversations the user confirmed** (founder I2, below) | Newest first | 3 + 3 conversations |

- A section appears only when it has a line.
- When something Kinship knows isn't on the page, the page shows **"What Kinship knows about Priya →"**. It never shows a count.
- Order is by **time only**. Nothing is ranked by importance, sentiment or inferred closeness.
- A page with nothing told yet says: "What you tell Kinship about Sarah will be here: what's going on with them, what's coming up, what you said you'd do." It also shows "Tell Kinship about Sarah". A Contacts birthday doesn't count as something told.

These numbers are product rules, not technical limits. They are founder questions (see `activation-pass.md`).

## One residence, one line (Phase 4B B7; brief §13; founder CC-19)

"Susan lives in California" and, later, "Susan lives in Alameda" are two current lines that compose (`compose.ts`, B5). In Lately they take **one slot**:

- the line shown is the **most specific line's own statement** ("Susan lives in Alameda"), voiced with the current name as every line is; never the composed wording ("Lives in Alameda, California" belongs to What Kinship knows);
- it is **dated and ordered by the chain's newest member**, so a recent "California" keeps the chain recent, and an Alameda told long ago still speaks for it;
- the other members leave the Portrait only. What Kinship knows lists every one (as the composed line, with each note behind it), and each keeps its source, Edit and Not this; the page's "What Kinship knows about Susan →" says more is there;
- the head keeps its own provenance, note and "was:" line.

**Fail open:** without a valid chain (one line; a place the data doesn't know; two readings of a name; two places that can't both be true; no reading on this phone yet), every line shows as before. Nothing is merged, hidden or lost. The rule is `residenceChains` in `portraitModel.ts`, over `residenceChain` in `compose.ts`; proofs: `portraitDedupe.test.ts`, `b7Proofs.test.ts`, the semantic corpus's `portrait` expectations.

## Someone else's promise (founder K2, CC-22)

"Tyler said he'd send you his contractor's number Friday" is Tyler's promise to the user: never under "You said you'd". Days are calendar days where the user is.

| When | On Tyler's page | On Today |
|---|---|---|
| Before its day | Coming up: "By Fri, Oct 9 · …" | Coming up, within the next 7 days |
| On its day | Coming up | Coming up ("Today") |
| Days 1–3 after, still open | Lately, with **"Waiting on Tyler"** where its date was | **Waiting on Tyler** · "Did Tyler send it?" (`today-eligibility.md`) |
| Days 4–30 after, still open | Lately, "Waiting on Tyler" | nothing |
| More than 30 days after | Only in What Kinship knows | nothing |
| The user reached Tyler about it (a Yes to the return check, on any phone) | Lately, plain: no "Waiting" | nothing: Waiting doesn't keep asking (K3) |
| Resolved ("Tyler sent it") or cancelled | Not on the page (What Kinship knows keeps it as history) | nothing |
| No day, or only a month or a year | Lately while told in the last 120 days, never "Waiting" | never |

Never "overdue", "late", "you still haven't" or a count of days. Never "Waiting on …" for someone remembered or paused (the line stays, plainly, as Today stays silent about them).

## Conversations (founder I2, CC-22)

- Only conversations the user confirmed: a Yes to Today's return check, or their own entry. Opening Messages or Phone is never one; "Not yet" records nothing.
- Under Between you, the newest three: "You messaged · Oct 12" (dated when Kinship opened the conversation) and, underneath, the memory it was about in the words the page shows (only while that memory is current and about this person). The words by channel: You messaged · You called · You had a video call · You emailed · You saw Tyler · You were in touch.
- What Kinship knows lists every one, newest first, each with **Not this** (asked first) for one recorded by mistake; it is reachable from the page whenever there is a conversation, even with nothing told yet.
- **Add a conversation** (only for someone active, on a page that has something told) asks "How were you in touch with Tyler?": Message · Call · Video · In person. Nothing else is asked.
- No count, frequency, streak, health or "last contacted". "You reached out · <date>" under the name is gone (CC-20).

## Reaching out from the page (founder K23, K28, K26; CC-26)

- **Message** and **Call** open the real channel. They never record a conversation by themselves (T12).
- **What comes back:** with something to act on (Today's line about them, else the open "You said you'd" nearest its day), the same return question and resolution as Today's line (K23). With nothing to act on, the page's own **"Did you reach Susan?"**: strictly local, no reason, no Moment, nothing told to the server (K28). Yes records one conversation in the user's own word (channel and time, nothing attached); Not yet records nothing; then the optional **"Anything worth remembering from talking with Susan?"** with **Tell Kinship** · **Nothing today**, on the page as on Today. A channel that never opened asks nothing. Never for someone remembered, paused or removed. Once, across repeats, a restart and sync; retractable in What Kinship knows.
- **"You could mention"** on the sheet is up to two of their current lines chosen by a small deterministic preference (`src/features/today/mentions.ts`): about the hand-off's subject first, then what is going on or coming up, then other current facts, then a memory shared with other People only when nothing better is left; in the user's own words, uncertainty kept, nothing sensitive or no longer current, never the first rows of the page. One fixed-template suggestion may sit under the first line for a milestone still ahead. Zero is an answer.

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
