# Proposals for the next UX phase (design/spec only — not built)

*Core Trust Closure pass, 6 Oct 2026. Each item below needs the founder's explicit approval before any build, and an entry in `approved-design-coverage.md` if it changes an approved surface.*

---

## H15 / H2 — "What Kinship knows" as organised durable memory

**Principle:**
- **Portrait = what matters now.** Lately · Coming up · You said you'd · Between you. This stays as approved; no change.
- **What Kinship knows = organised durable memory.** A reference view, not a CRM profile.

**Proposed structure for What Kinship knows.** The section names are Quiet Herbarium copy, lower-case labels as elsewhere:

| Section | What goes there | Comes from (no new model call) |
|---|---|---|
| **Into** | Tastes, interests, things they like or don't (Vietnamese food, volleyball, Warhammer) | `fact.category` = preference |
| **Hoping to** | What they want or are working towards (a construction job, learning robotics) | `plan` / `thread` with the person as subject; `event_goal` |
| **Background** | Where they live, work, study; history; things that changed (with "was: …") | `fact.category` = home / work / education / family; superseded lines |
| **Their people** | Partner, kids, siblings, pets; shared memories with other people | `related_people`, `with_person_ids`, `fact.category` = pet |
| **Between you** | Your shared context, traditions, how you met | `context`, `tradition`, `moment` |

**Rules:**
- Every line keeps its source and Edit / Not this. Changes show quietly ("was: …", "Edited by you").
- **No counts, sizes, scores or "completeness".** An empty section is simply absent.
- The order inside a section is newest first. No ranking.
- "Hoping to" never becomes a goal tracker: no progress, no reminders, no checkboxes.

**Open questions for the founder:**
- **Section names:** "Into" and "Hoping to" are proposals.
- **Their people:** does it belong here or only on the portrait?

## H16 — Milestones as grounded reasons (eligibility proposal)

**Recognise, don't interrogate.** Kinship already recognises good news deterministically (promotion, new job, engagement, wedding, baby, graduation, new home; `GOOD_NEWS` in `todayModel.ts`).

**Proposal:**
1. **A milestone list.** Wedding, engagement, new job, promotion, baby, graduation, new home, retirement, a move. Matched by fixed wording, as GOOD_NEWS is now. No model.
2. **Eligibility for a Today reason:**
   - **When it happened:** good news within 2 days, as now.
   - **When it's upcoming with a known day:** a moment on the day ("It's Anthony and Natalia's wedding today") and a gentle one a few days before ("Anthony and Natalia's wedding is Saturday").
   - **Without a day:** never asked for. It stays quietly on the portrait. If the user later says when, it becomes eligible.
3. **No missing-field questions.** Kinship never asks for venue, date or guest list. The only exception is an *existing* clarification (an ambiguous day), as today.
4. **After it happens:** the existing follow-up ("How did it go for Anthony?") applies, carrying the reason through the handoff (H18).

**Needs approval:**
- the list;
- the "a few days before" window;
- whether weddings of non-contacts (Natalia, before she's added) can be moments.

## H4 — Showing "Bring back" in first use (acceptance criteria)

For the next onboarding hardening pass. No onboarding redesign was built now.

1. First use demonstrates **Tell → Remember → Bring back** with one concrete example, e.g. *"Ben's race is Sunday. He was hoping to break four hours."*, reusing "See how it works".
2. The last step points to **Today**: "This is where Kinship brings things back, when they matter."
3. **Measurable:** a new user who completes first use can say, without help, what Today is for (founder's native check).
4. **Constraints:**
   - Respects Reduce Motion.
   - No decorative motion (Design Direction).
   - At most one extra screen.
   - Never a carousel of features.
5. `firstRun.test.tsx` and `.maestro/fresh-install.yaml` gain a step that asserts the bring-back example is shown.

## H3 — Ask Kinship: roadmap movement only

**Evidence:** repeated, organic recall questions ("What's John into?", "Who lives in Alameda?", "What gift did I get her last?").

**Move:** grounded **Ask Kinship (`retrieval_answer`)** moves forward on the roadmap as a **post-wife-dogfood / Alpha candidate**. It is **not** built in this pass.

**Requirements when it is built:**
- Answers only from stored Kinship memory, with every answer's sources shown.
- Says "I don't know that" or asks back when memory doesn't support an answer.
- Never a general chatbot.
- Its own eval set (grounding, refusal, privacy) before any user sees it.

**People search:** this may improve separately (matching statements as well as names), but it is not an answer to this demand.

## H22 — "August" (low priority)

No change now. The current reading (the next August) is correct.

If needed later, use a deterministic boundary rule: ask only when the named month is the current month or the one just past. Never a general "which year?" question.
