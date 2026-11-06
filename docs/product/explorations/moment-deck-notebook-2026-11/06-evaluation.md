# Self-evaluation

**Status: DESIGNER'S SELF-REVIEW, not user evidence.** I walked every journey in the browser prototype, on the founder's path where possible, and judged it on the three equal dimensions in the brief. Nothing here is user research. PR #76 §H's three tests are how these judgements get disproved.

## 1. Memory quality: contributing, retrieving, correcting

| Question | Verdict | Why |
|---|---|---|
| Can a messy, several-person note go in without preparation? | **Strong** | Journey 2's note has three people, a relative, a self-correction ("Leo, no wait, Josh"), a vague date, a told-again change, good news, a promise and a sensitive line. Each is handled by an existing rule, and the review shows it. |
| Is it obvious what Kinship understood, and from which words? | **Strong** | Your words stay on top, underlined per person; tap either side to see the other. The self-correction is visibly *not* attributed to Leo. |
| Is correcting one detail cheap? | **Strong** | One tap on a date token (as said → a day you wrote → another). One tap on a sentence edits it in place, with your words beside it. × removes a line without touching the note. |
| Are ambiguities asked only when consequential? | **Adequate** | "Which Sam?" is asked because Today depends on it. The vague date is never asked; it's kept as said, with a one-tap pin. Risk: a note with several identity questions still stacks several cards. |
| Can you find a detail weeks later and trust it? | **Strong** | Journey 3: search "flour" → Rosa's page → the line, and the note adds "the 00 one", a detail only your original words kept. |
| Does it stay usable at hundreds of memories? | **Adequate** | Pages groups by year and is searchable; Now stays capped; Knows is sectioned. Unproven at real scale, and Pages could get long for close people. |

## 2. Moment quality: surfacing what matters

| Question | Verdict | Why |
|---|---|---|
| Is Today worth opening? | **Strong** | The person comes first, at poster scale, with the reason and its source. The deck shows the rest of the week, then ends. |
| Is there a clear "why now"? | **Strong** | Every poster and card has a when chip, one fixed why-now sentence, and the source. |
| No obligation, no guilt? | **Strong** | Not now on every poster. Nothing counts or escalates. The end card says "Nothing else is waiting." |
| Quiet days and first run? | **Adequate** | The first run orients and never looks empty. The quiet day is beautiful but sparse: by design, and it depends on capture volume (PR #76's supply problem). |
| Hard times? | **Adequate, needs a decision** | The tender poster is right in tone, but whether such moments may appear at all depends on RSN-09 (DN-9). |
| Differentiated from birthdays-only? | **Depends on supply** | Promise and thread moments make Today about what *you* said and did. If a user tells little, Today falls back to Contacts birthdays, which iOS already does. The design can't fix supply; it makes telling easier and asks "anything worth remembering?" at the right time. |

## 3. Showing-up quality: practical usefulness and authenticity

The test is practical usefulness and authenticity, not engagement or how many actions get generated.

| Question | Verdict | Why |
|---|---|---|
| Does it help beyond sending a message? | **Strong in design, unproven in life** | Journeys 4 and 5: a gift she actually mentioned, dinner you said you might bring, a ride to a follow-up she said she can't drive to. Each is real help grounded in what was said. |
| Does it feel like the user's own care, not automation? | **Strong** | Ideas quote the user's words. Intentions are saved in the user's sentence. Openers are only on request and copied, never sent. Doing nothing is always offered. |
| Does it support follow-through without a to-do list? | **Strong** | Your promise returns once, on its day ("You said you'd check in on Elena"). "Keep it in mind" adds a day and never repeats. There's no list anywhere. |
| Does it close the loop honestly? | **Strong** | Five distinct records (intended · reached · did · learned) and none is inferred. "I did this" and "Yes" are the only evidence. "Already known" prevents duplicate memories after contact (Journey 6). |
| Is it authentic for sensitive moments? | **Adequate** | Tender styling, private lines and practical help that names only what the user wrote. Still, any help near health is delicate, and the copy needs review with RSN-09. |
| Could it become a task manager? | **Low risk, watch it** | The risk is intentions accumulating on a page. Mitigations: a cap of 3 per section, no overdue, Lately then Knows after the day. Watch for it in dogfood. |
| Could it drift to commerce? | **Low risk** | "Find it" is future, link-only, disclosed. No catalogue or partner is ever involved. |

**Where Showing Up is weakest:**
- **Shared experiences and connecting people are thin.** "Start planning Chicago" is the only real time-together example. Group gatherings (CC-28 family D) need chapters, which don't exist. I did not invent them.
- **The value depends on grounded ideas existing.** For a person with two lines, there may be zero ideas. That's honest, and it means the feature is quiet for sparse users.
- **Nothing here proves real-world outcomes.** G3b's interview and confirmed-kind evidence is the only way to learn that.

## 4. Contract compliance checklist (self-checked in the prototype)

| Rule | Held? | Where to check |
|---|---|---|
| No visible AI (no sparkles, badges, model names, chat) | ✓ | Every screen; the "Ideas" icon is a sprout, not a sparkle |
| Nothing quantifies a relationship | ✓ | No counts in People, the deck or pages; the band is ordered by date only |
| Every durable statement has a source | ✓ | Every line shows a source; intentions are sourced notes |
| Sensitive readings need a yes | ✓ | Priya's mom (J2), Ben's knee (J1), Elena's pain (J5) |
| Two candidates → one question | ✓ | Which Sam (J2) |
| User edit wins | ✓ | Sam's Thai line (J2), then "Already known" in J6 uses the edited line |
| Kinship never sends; hand-off isn't contact | ✓ | Hand-off screen copy; return check required |
| First run never lands on empty Today or People | ✓ | First run state |
| No fake people in real accounts | ✓ | All fixtures are fictional and in the prototype only |
| No flags, merges, deploys, migrations | ✓ | Docs and prototype only |

## 5. Where I'd push back on my own design

- **The poster is loud.** For someone who opens Kinship on a hard day, a laughing full-bleed photo for an unrelated birthday could jar. The tender variant handles the person's *own* hard time, not the user's. Consider a calmer default after 9 pm (Night).
- **Three lenses might be one too many** for people with little told. The design already hides lenses for sparse pages; consider hiding Pages until there are two or more notes.
- **The review is long for a nine-line note.** Grouping helps, but this is the screen to test first with real long notes (calibration: about 1.5 s per proposed memory, and long notes are common).
