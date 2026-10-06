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
