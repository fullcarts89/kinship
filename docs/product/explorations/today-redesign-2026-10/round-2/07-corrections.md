# The correction pass: before and after, with evidence

**Status: EXPLORATORY · UNAPPROVED.** Focused corrections to PR #43 after the founder's and the independent reviewer's review (17 Oct 2026). No new exploration; no production code, navigation, ranking, memory, retrieval backend, reasons, schema, deployment configuration, round-1 artifact or B6–B9 file changed. Nothing in CC-25 or the coverage matrix was edited.

## Before and after

| Gap | Before (round 2, first draft) | After | Where |
|---|---|---|---|
| **1 · Search vs Ask** | People's field read *Search or ask*; typing "Susan moved" could filter, retrieve or answer, decided silently | The field filters People only, immediately. Asking is an explicit act: **S1**, an *Ask Kinship about "…"* row that is always the last row while there is a query (recommended); **S2**, a People \| Ask mode (alternative). The user sees what will be asked before asking. The dock never asks; the bar stays two items; a question never writes. Labelled PROVISIONAL — FINAL FORM SUBJECT TO ASK IMPLEMENTATION EVIDENCE | `architecture.html` (S1 with "Susan", "Alameda", "Susan moved", a question; S2 in three states); `00-…` §4a; `02-…` §10; decisions 11, 14, AR-2 |
| **2 · Return wording** | "Kinship opened Messages for you this morning. Nothing was sent." | "You opened Messages earlier." in small type under the question; nothing claimed about what happened in Messages. Rules unchanged: the hand-off never counts, Yes records, Not yet records nothing, the window is the approved one, the reason is not repeated as a primary action | `prototype.html` Return check; `screens/today-return*.png`; `02-…` §11; decision 9; reconciliation row 15 |
| **3 · The push** | The lock screen showed "How did it go for Ben? · Ben runs Chicago Sunday" | "Something for today." for every kind of Moment; tap → the app (its own access first) → Today at the Moment → one tap more, the detail with its source → hand-off → return. No richer preview and no new preferences; any less-private configuration is a separate founder decision | Journey 1 in `architecture.html`; `screens/arch-push-lock.png`; `02-…` §12; decision 15, AR-6; reconciliation row 16 |
| **4 · Ask identity and sources** | "Ben's mom lives in Alameda" shown like a person; the composed Susan line's provenance flattened; no clarification, no scale | Three result kinds, each with its own landing: **established** (Susan; lands on her line; "both notes" opens B5's members with their sources, Edit, Not this), **related** ("Mentioned in a note about Ben · not in People"; lands on the owning memory), **memory-only** ("From a note · doesn't say who", under "Also in your notes", or left out of a stronger claim such as "Who do I *know*…"). "Which Sam?" for an ambiguous name; "Nothing kept about that" (`not_found`) with Tell offered; six results in a full-height sheet | `architecture.html` "The answer, and what a result can be"; `screens/arch-alt1-answer.png`, `ask-members.png`, `ask-answer-know.png`, `ask-clarify.png`, `ask-scale.png`, `arch-alt1-nothing-kept.png`; `00-…` §4b; decisions 14, AR-3; reconciliation row 17 |
| **5 · Remembered / Paused** | Implied by omission that these people were out of Ask | The three different acts are documented (Kinship surfacing; the user opening a page; the user asking). No retrieval policy is set: neither excluded nor included; never deletion; never proactive. **FOUNDER DECISION DEFERRED TO THE REMEMBERED / PAUSED TRUST BRIEF** | `00-…` §4c; decision 16, AR-8; reconciliation row 19 |
| Featured "now" line | Read as a rule | Marked provisional: soonest Coming up, else newest Lately is a stand-in, not an importance rule, until B8 and real data | `02-…` §13; decision 12 |
| Hard-time Moment | "Call Mom" as the primary | Message, as every Moment; the RSN-09 brief decides channel, tone, privacy; the screen is illustrative | `02-…` §13; decision 13; reconciliation row 20 |
| Ask at scale | Not shown | Six results in a full-height sheet, one list grouped by kind, scrolls; not a chat | `screens/ask-scale.png`; `00-…` §4a point 5 |
| Native validation | — | Sundial, tints, 36 pt, press-lift stay category P; never approved from screenshots | `02-…` §13; decisions 2, 5, 6, 10 |
| Decision categories | R / V / X | The founder's three: A directionally approved for future planning · P provisional / requires implementation or native evidence · D deferred / requires a future founder product decision; traceability to round 1's 26 items kept; the Ask recording as the founder asked (preferred initial direction · not yet decided · non-negotiable) | `03-founder-decisions.md`; `00-…` §6 |

## Test evidence for the updated static prototype

What was done, and what it does and does not show.

**Automated render checks** (Node, the engine's pure renderer, no browser): eleven assertions after the engine change and three after the fixture fixes, all passing: the Ask row appears for "Alameda" and stands alone for a question; S2's Ask mode reads *Ask Kinship…*; the "Alameda" answer carries "not in People"; "What's Sam into?" renders "Which Sam?"; the members sheet says "Composed from two notes"; six results render the full-height sheet; the lock screen says "Something for today."; the return state contains "You opened Messages earlier." and not "Nothing was sent"; the hard-time Moment's primary is "Message Mom"; Susan's page carries the composed provenance.

**Browser click-through** (the built-in browser pane, Chrome, served from a local static server; no console errors at any step):

1. People with "Alameda" typed → the *Ask Kinship about "Alameda"* row is the only row → tap → the answer sheet shows all three kinds: Susan (composed, with *both notes*), "Mentioned in a note about Ben · not in People", "From a note · doesn't say who".
2. *both notes* → the members sheet: both notes, each with its own source ("You told Kinship · Oct 9"; "You edited this · Sep 30 (from your note, Sep 28)"), Edit · Not this, *View Susan*.
3. *View Susan* → Susan's page at the composed line (added in this pass; before it, the prototype fell back to an empty page, a prototype bug, fixed).
4. The lock screen: "Something for today." and no occurrence of "Ben" anywhere on the screen → tap → Today at Ben's Moment with **no** sheet auto-opened; the detail is one tap further.
5. The return state renders "You opened Messages earlier." and no claim about sending; Yes with Resolve still reaches the optional prompt (verified in the previous pass; the words changed, the flow did not).

**Stills**: only the affected and new frames were re-captured (`today-return*`, `today-hard-time`, `arch-push-lock`, `arch-alt1-*`, the new `ask-*`), plus the two galleries, which include them.

**Limitations, stated plainly**: this is a static HTML prototype on fictional fixtures. It proves composition, copy and flow, not retrieval: no `retrieval_answer` exists, no identity resolution runs, the three result kinds are hand-assigned, and "Which Sam?" is a fixture. Nothing was run on a device or simulator; no native verification is claimed; the sundial, tints, type sizes and press-lift remain unvalidated. CI on the PR covers the app, edge functions and database, none of which this branch touches.

## What this pass did not do

No new screens beyond the ones the gaps required; no Ask product; no notification preferences; no retrieval policy for Remembered / Paused; no change to round 1; no change to any canonical document. After this pass the exploration is to be archived and visual work paused until the post-B9 household dogfood provides evidence.
