# Founder feedback, round 4: native testing of the Core Trust Closure build

*The founder's native testing of the build merged in PR #19 (6 Oct 2026). Logged as it arrives, in batches.*

**Status: logged only.** Nothing is built until the founder says so. Items get ledger ids and statuses in `bug-ledger.md` when the round is triaged.

---

## Batch 1

### I1 — A Moment / Reason detail surface (instead of landing on the person's page)

**Observed.** Tapping an upcoming item on Today opens Ben's whole page, e.g. "Ben wants to play games with you and Susan this weekend". Ben has a lot logged, so the action is lost in a page of Tells.

**Founder's recommendation:**
- A **reusable Moment / Reason detail surface**. Tapping a reason goes there directly.
- It shows **grounded context, timing, Source, and the human actions** (Message, Call…).
- **"View Ben" is secondary.** It deep-links to the relevant memory on Ben's page, with **temporary emphasis** on that line.

### I2 — Lightweight interaction history ("Between you")

**Founder's direction:**
- Record **confirmed relationship interactions**, never raw communication content. They form a small, **sourced and dated trail under Between you**.
- Message / Call hand-offs create an interaction **only after the user confirms** the contact happened.
- **Preserve the known reason and context** when available ("About getting together this weekend").
- **Interaction types:** Message · Call · Video · In person.
- **Shared activities are contextual memories, not interaction types.** "Game night" is a memory, not a fifth type.
- **Preselect or infer the type** whenever Kinship already knows it.
- **Never:** counts, frequency, "last contacted", streaks, recency pressure, scores, transcripts, or relationship-health implications.

**Why it matters (founder).** It connects pieces built separately into one visible loop:

**Moment → action → hand-off → return → interaction history → new memory.**

**The danger** is a product the user has to maintain. This is too much ceremony for texting a friend:

> Moment → tap → detail → Message → return → Yes → choose Messaged → Anything worth remembering? → dismiss

If Kinship repeatedly asks the user to classify what they just did, it starts feeling like a CRM.

#### Design rule (founder, strict)

> **Completing the relationship loop should usually require one tap after the real-world action. Two taps only when Kinship genuinely needs information it doesn't know.**

#### "Know it, infer it, ask it"

This is an application of the existing principle: *ask the user to decide only what Kinship genuinely cannot know.*

1. **Kinship knows it → don't ask.**
   - The user launched Message from Kinship, so the channel is Message.
   - Tapping Message Ben from "Ben wants to play games this weekend" means Kinship knows the person (Ben), the channel (message), the reason (making game plans) and the originating Moment.
   - On return, the only required question is: *"Did you message Ben about getting together this weekend?"* **Yes · Not yet**.
   - **Yes** automatically records **"You messaged · Oct 6 · About getting together this weekend"**. There is no "How did you connect?" picker.
2. **Kinship can safely infer it → confirm once.**
   - *"Did you end up getting together with Ben and Susan?"* **Yes** means they saw each other.
   - Because the underlying plan was playing games, Kinship records **"You saw Ben and Susan · Game night"** without asking "Saw each other" and then "Played games".
3. **Kinship genuinely doesn't know → the tiny picker.**
   - Ben's page → **Add interaction** opens one compact sheet: *"You connected with Ben"* **Message · Call · Video · In person**, and *Anything worth remembering?* (optional).
   - **One selection and Done.**

#### "Anything worth remembering?": not after every text

- It is **non-blocking**: shown under the confirmation with a **Tell Kinship** link. The user can ignore it and leave; the loop is already complete.
- **Show it after meaningful interactions:**
  - a call;
  - seeing someone;
  - a Moment Kinship specifically surfaced;
  - an important event;
  - perhaps a conversation that came from a promise or follow-up.
- **Don't show it after mundane ones.** Example: "Ben wanted the restaurant address → you messaged it → Yes" needs no prompt to document the conversation.

#### Target experience

| Case | Flow | Verdict |
|---|---|---|
| Most common | Moment → Message → return → **Yes**. Done. | Excellent |
| More meaningful | Moment → Message → return → **Yes** → optional "Anything worth remembering?" | Still good |
| Unknown / manual | Ben → Add interaction → **Call**. Done. | Good |
| **Avoid** | Message → Yes → Messaged → Played games → Save → Anything else? | Friction that slowly kills usage |

#### Relation to what exists (for triage, not a plan)

- The H10/H11/H18 return loop already asks one question with the reason ("Did you congratulate Ben on the promotion?") and records **"You reached out · date"** on the portrait. I2 generalises that line into a sourced trail under Between you, with a type known from the hand-off channel.
- "Anything worth remembering?" currently follows every **Yes**. Under I2 it becomes conditional (meaningful interactions only) and non-blocking.
- There is no detail surface for a reason today: a tap opens the person's page (I1).

---

## Batch 2

### I3 — People can't be removed; name editing isn't discoverable

**Observed:**
- There's no way to remove someone from People. The founder wants to delete **"My daughter Kaiya"** (the duplicate H20 created) and can't.
- It isn't clear that names can be edited at all. The founder only knows from having asked for it (H1: tap the name, or "Edit name").

**Ask:**
- A way to remove a person.
- A clearer sign that the name is editable.

**For triage:**
- Removing a person must keep provenance. Their notes stay; decide what happens to memories filed only on them.
- It should be a soft archive with confirmation (like Forget), never a hard delete.
- The existing data-cleanup plan proposes archiving "My daughter Kaiya" and moving its zoo memory to Kaiya. It runs only on the founder's explicit yes.

### I4 — Post-Tell confirmation hierarchy (founder's id)

**Problem.** The Kept surface mixes five things as similarly weighted small grey text:
- the memory confirmation;
- unresolved-person actions;
- correction controls;
- Undo;
- dogfood feedback.

Important actions are easy to miss. Example: "Susan is getting married to Pedro in the fall" correctly offered to add Pedro, but **"Add Pedro" is tiny** and has the same weight as "Tap a line to correct it", Undo and Got it right / Not quite. The behaviour is right; the hierarchy makes it feel like a pile of text.

**Approved direction.** Break the confirmation into clear semantic sections. Make unresolved identity / person actions proper controls. Separate correction and Undo from feedback. Use stronger type hierarchy and accessible tap targets. Keep the transient Quiet Herbarium feel rather than a dashboard or card stack.

**Founder's target layout:**
```
KEPT FOR SUSAN OXNARD
Susan is getting married to Pedro in the fall

Pedro isn't in People yet
Add him so this can appear on his page too.
[Add Pedro]   Not now

Correct this · Undo

Did Kinship get this right?
Got it right · Not quite
```

**Specifics:**
- **"Add Pedro"** is a real control with a proper tap target, not an inline text link.
- **The unresolved-person action** gets its own row or section, separated from the confirmation. Its type size must match its importance (currently too small).
- **Correct this + Undo** sit together as secondary editing actions.
- **Got it right / Not quite** is visually separated as dogfood feedback, not mixed into memory management.
- **Drop "Tap a line to correct it"** (too instructional, vague). Expose **Correct this**, or make the remembered line visibly editable.
- **Wording:** "Pedro isn't in People yet / Add him so this can appear on his page too." (not "Pedro isn't in your people yet · Add"), which says why to care.
- **Kept is done.** Adding Pedro is an optional next enhancement. The memory exists with Pedro named before he's a Person, so the card must never feel blocked.

### I5 — "Susan and Michelle went to Disneyland" confirmed only for Susan

**Observed:**
- The Kept confirmation named only Susan.
- The memory *is* on Michelle's page, so it's shared correctly in the data.

**Expected:** the confirmation shows it's kept for **both** Susan and Michelle.

**For triage:** this looks like a display gap. The Kept card names the primary person only, not `with_person_ids`. That needs confirming against the data.

### I6 — Keyboard dismissal

**Observed:**
- The keyboard is hard to swipe away.
- The only way to dismiss it is tapping elsewhere, which often opens a profile or a Tell by accident.

**Approved direction:**
1. **A native keyboard accessory** with **Done** (or a down-chevron) when Tell or any input is focused. One tap dismisses the keyboard without submitting or navigating.
2. **Interactive drag-to-dismiss.** Scrolling or dragging the page down dismisses the keyboard like a normal iOS surface. This is probably the most important missing native behaviour.
3. **Safe navigation taps.** With the keyboard open, tapping Today / People navigates normally. Tapping random content just to dismiss the keyboard is never necessary.
4. **Unsent drafts are preserved** when dismissing or navigating.
5. **No requirement to tap blank page space.**
6. **Keep the bottom navigation**, unless broader usability testing gives a separate reason to reconsider it.

### I7 — Superseded memories as Background history (Natalia / Box)

**Observed:**
1. The founder told Kinship "Natalia is interviewing with Box".
2. Later they said she was rejected.
3. Kinship correctly replaced the line (struck through) and asked about privacy.

**Question:** should "was interviewing with Box" stay in What Kinship knows?

**Founder's direction.** Yes, as Background. It is legitimate relationship context.
- **Portrait = what matters now.** It must not show "Natalia is interviewing with Box" as if current.
- **What Kinship knows = durable context, including things that used to be true.**

Wanted, for example:
```
Background
Previously interviewed with Box
Ended · Oct 6
```
Tapping it shows the lineage:
- You told Kinship: "Natalia is interviewing with Box…"
- Later updated by: "Natalia got rejected from Box…"

This gives three properties at once: **one current truth; historical context not erased; provenance intact.**

**Not wanted:** two equal bullets ("Natalia is interviewing with Box" / "Natalia was rejected from Box"). The first looks current and recreates the contradiction.

**Privacy carries into history:**
- If the user confirmed the sensitive outcome (rejection), it can show there.
- If they declined, Kinship may keep the less-sensitive fact that she interviewed, without exposing the outcome they declined to save.

**New design rule for H15 (founder):**

> Superseded memories remain available in What Kinship knows when they are meaningful background, but are clearly presented as past state and never alongside current state in a way that implies both are true.

What Kinship knows is "where a person's story has some continuity", not a dump of active facts.

---

## Batch 3

### I8 — The app opens in the old (1.0) app

**Observed.** Reopening Kinship regularly lands in the old app. Getting back to 2.0 means signing out and in again.

**Ask.** Remove that path: this build should always start in 2.0.

**For triage (read-only look, nothing changed):**
- After sign-in, the shell is chosen per account from the `shell_v2` flag (`useLaunchShell`, `app/index.tsx`).
- That flag is fetched at launch with a 4-second limit, falling back to the copy on the device. When neither answers, it is treated as off, and **off means 1.0**.
- So a slow or failed flag check at cold start (e.g. the session still refreshing) can drop a 2.0 account into 1.0.
- **Likely fix:** in the `dogfood-v2` build (`EXPO_PUBLIC_V2_ENTRY=1`), a signed-in account always opens 2.0 and never falls back to 1.0. This is to be confirmed on device; the exact cause isn't reproduced yet.

### I9 — Can't get back to the confirmation after opening a line's details

**Observed:**
1. After a Tell, the founder tapped into a line's details to see what's underlined.
2. After confirming there, they couldn't return to the original confirmation view.
3. So they couldn't give feedback on anything else (other lines, Got it right / Not quite).

**Expected.** Closing a line's details returns to the same confirmation, with everything else still actionable.

### I10 — Asked "is this about Michelle?" after already saying it would keep it for Michelle

**Observed:**
- Tell: "Michelle and Sam might be moving to Australia".
- **Correct:** the confirmation asked which of the two Sams was meant, and said it would keep it for Michelle.
- **Wrong:** it *also* asked whether it was about Michelle, a question already answered on the same screen. A screenshot is to follow.

**Expected.** One question: which Sam. Michelle is already resolved.

**Screenshot:** `screens/feedback4/i10-michelle-sam-australia.png`. It shows that this is really the **H5/H13 mirrored-duplicate pattern**, not only a redundant question:
- **Two lines came back for one shared memory:**
  - "Michelle might be moving to Australia with Sam", kept on Michelle Lee (Maybe · Something ongoing);
  - a second, mirrored line, "Sam might be moving to Australia with Michelle", held because Sam is ambiguous.
- **The held question offers Michelle Lee as a choice** ("Sam Doughty · Michelle Lee · Sam Eden · Someone else"), because she is named in the note.
- **Its reason, "I couldn't tell who this is about.", is wrong.** Kinship knew exactly who; it just didn't know *which Sam*.

**Expected:**
- **One** shared line, "Michelle and Sam might be moving to Australia", on Michelle.
- **One** question: *Which Sam?* Sam Doughty · Sam Eden (Both / Someone else as today).
- The answer adds that Sam to the same memory.
- The same flow handles I11: choosing more than one person.

**Why the H13 fix didn't catch it.** The twin check merges a mirrored line into one that is *saved*. Here the mirror is *held* (ambiguous person), so it is never compared. This is to be confirmed when fixing.

**Also visible:** "Nothing needs you today." shows behind the sheet while a question is waiting. H19 removed the quiet headline behind a Kept card; a waiting question should get the same treatment.

### I11 — Still no way to choose more than one person

**Observed.** The founder still can't multi-select the people a memory is about.

**Related.** G23 added a **Both** choice for an ambiguous he/she between two people. It isn't a general "choose several people".

**Expected.** Where Kinship asks who a memory is about, the user can pick more than one person. The memory is then shared across them, like H5/H13 shared memories.
