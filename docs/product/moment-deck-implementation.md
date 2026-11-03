# Moment Deck × Notebook × Showing Up — implementation record (2 Nov 2026)

**Readiness: NOT READY.** Built and tested up to the black-box tier with the live model; the native
simulator walk is partly blocked (see §5); nothing has run on a phone.

**What this is.** The founder approved PR #77's prototype on 2 Nov 2026 ("Implement the Approved Prototype
End to End"). This branch builds it in the real app, on the stabilized alpha (PR #74 + PR #75), behind one
flag, `notebook_deck` (off for every account; migration `20261102090000`). Decisions row by row: PR #77
`05-decision-log.md` §F. Coverage: `approved-design-coverage.md` § "Moment Deck × Notebook × Showing Up".

## 1. What was built, and on what

| Surface | Code | Built on (unchanged) |
|---|---|---|
| Today: poster, deck, end card, quiet day, first use, return panel | `src/features/today/deck/` (`DeckToday`, `DeckParts`, `deckModel`) | `buildToday`, `today-eligibility.md`, the return loop |
| The expanded moment | `src/features/today/deck/MomentFull.tsx` | `momentDetail.ts`, `useHandoff`, `mentions.ts` |
| Ideas for showing up, Assist, Keep it in mind, I did this | `src/features/showingup/`, `src/hooks/useIdeas.ts`, `src/hooks/useShowingUp.ts` | SUA-1's exclusions (`suggestions.ts`), `MemoryRepo.remember/resolve`, `Understanding.correct` |
| People index and search | `src/features/people/notebook/`, `src/hooks/usePeopleIndex.ts` | Ask v1 (`retrieve.ts`, `useAsk`), `isProactiveEligible` |
| Person notebook: Now · Pages · Knows, line sheet, Source | `src/features/person/notebook/`, `src/hooks/usePages.ts` | `portraitModel`, `recordSections`, `composedRecord`, `trail`, `NoteView` runs |
| Tell page and the review with your words | `src/features/tell/notebook/` | `TellFlow`, `reviewModel`, drafts, consent, Option A partials, exact Undo |
| Shared vocabulary | `src/ui/notebook/`, `src/design/tokens.ts` (notebook section), `assets/images/notebook/` | Electric Garden tokens and fonts |

**No change** to the gateway, the extraction prompt, the schema (besides the one flag row), Today's
eligibility or scoring, the Portrait rules, sensitivity, identity questions, told-again, Undo or the
return loop. An intention is written on existing paths: a note kept exactly as written (status
`skipped`, never sent for understanding) and one user-authored promise whose source is that note.

## 2. The evidence ladder (directive §4), as built

| Step | What records it | Never inferred from |
|---|---|---|
| Considered | `ideas_opened` / `idea_opened` (content-free) | — |
| Intended | A promise in the user's words ("Keep it in mind"), or a day added to their own (`intention_saved`) | considering |
| Opened a channel | nothing (T12) | — |
| Reached them | Return-check **Yes** → one conversation | opening a channel |
| Did the thing | **I did this** → the promise resolved (`promise_kept`); or SUA-1's content-free outcome after a Yes | reaching them |
| Learned | A new Tell, through the pipeline | any of the above |

## 3. Evidence by tier

| Tier | Result |
|---|---|
| UNIT / INTEGRATION (`TZ=UTC npx jest`) | see §4 |
| TYPES / LINT | `npx tsc --noEmit` clean; `npx eslint app src` 0 errors |
| BLACK-BOX + LIVE-MODEL (`e2e/blackbox/notebook.blackbox.tsx`, this branch's gateway with the model key) | see §4 |
| NATIVE-SIMULATOR (Release, iOS 27, this branch's gateway, live model) | see §5 |
| FOUNDER-DEVICE | **NOT RUN** |

## 4. Journeys (PR #77's six)

Black-box suite `e2e/blackbox/notebook.blackbox.tsx`: the real screens, session classes, sync engine and
network client against the local stack, with `GATEWAY_URL` at this branch's ai-gateway holding the model
key, so every note is read by the **live model**. Stand-ins: sql.js for SQLCipher, mocked routing, auth
context, safe area, contacts and the OS hand-off. Run: `GATEWAY_URL=http://127.0.0.1:<port> npx jest -c
e2e/jest.blackbox.config.js e2e/blackbox/notebook.blackbox.tsx`.

| Journey | What ran | BLACK-BOX + LIVE-MODEL | NATIVE-SIM |
|---|---|---|---|
| **J1 Remember to connect** | An earlier note's marathon (day before) → the server's `event_followup` reason → the poster ("Yesterday · Sun, Nov 1", "How did it go for Ben?", the memory, "Ben was hoping to break four hours.", its source) → expanded moment ("It was yesterday.") → Message → Messages opened, **nothing recorded** → back → "Did you ask Ben how it went?" → Yes → **one** conversation (`return_check`) → "Anything worth remembering?" with "In Ben's notebook: You messaged · today" | PASS | see §5 |
| **J2 Tell something meaningful** | PR #77's exact messy note (Priya back from Lisbon, Oakland "on the 15th I think? or mid-month", sister Anjali, mom's knee surgery, dad alone, "Sam called — she got the promotion!!!", the promise to celebrate Friday, "Leo — no wait, Josh") on the Tell page → review → which Sam (answered: Sam Delgado) → two sensitive readings (Keep it) → kept → Undo | PASS: nothing on Sam Okafor; nothing on Leo; sensitive lines only after yes; every line sourced; Undo removed every line of the note and left the earlier one | see §5 |
| **J3 Revisit someone's life** | People search "flour" → the hit → `/v2/person/<Rosa>?lens=pages&note=<the note>` → Pages scrolled to and ringing that note | PASS | see §5 |
| **J4 A thoughtful gesture** | Ben's expanded moment → Ideas for showing up (closed until tapped) → "Suggest doing trail running together" quoting “Ben loves trail running.” with its source; Rosa's Now → an idea → Keep it in mind → "Make ravioli with Rosa on Sunday" → a note kept as written (status `skipped`) and **one** user-authored promise sourced to it | PASS | see §5 |
| **J5 Follow-through** | Elena's own promise → its idea → Keep it in mind → "You already said you'd do this" → Bring it back tomorrow → **the same promise**, its day the user's edit (nothing new) → I did this from the line → resolved, **no conversation recorded** | PASS | see §5 |
| **J6 Connection becomes memory** | After J1's Yes → Tell Kinship → the Tell page about Ben → "Ben finished the marathon in 3:52 … He still loves trail running." → the new line kept from the new note; the earlier "is running the marathon" line closed (superseded, `transition: completed`); "trail running" **not doubled** | PASS | see §5 |

**Findings the live model showed (pre-existing pipeline behaviour, not changed here; logged for the
founder, not fixed, per the directive's "prompts unchanged"):**
1. "his interview got moved to Thursday at 10" was kept as "Josh's interview got moved to at 10" (the day
   went to the date and left a hole in the words), twice in two runs. The review's inline edit fixes it; the
   wording rule needs its own brief.
2. "she's back from Lisbon for good" was kept beside "Priya lives in Lisbon" instead of replacing it (no
   told-again question), twice in two runs.

**Fixed on the way (this branch):** a line told on a Pacific evening wasn't "lately" until midnight UTC
(`mentions.current` read the UTC day), which hid it from You could mention, SUA-1 and ideas for hours; the
expanded moment stayed mounted after a hand-off closed it; the expand now falls back to a fade if the card
can't be measured; the poster no longer puts Kinship's "was hoping to" sentence in quotation marks.

## 5. Native simulator

Filled in below as run.

## 6. Known limitations and open decisions

**Decisions for the founder** (none of these is enabled):
- DN-10 copy for "I did this", and whether it belongs on the poster as well as the moment and the line.
- Review: a removed line can't be brought back with ✓ (× retracts; there is no un-retract); "Keep both" on an
  auto-saved replacement and "Answers:" vs "Replaces:" have no model counterpart — omitted rather than faked.
- The relation line has no stored source, so it shows no source dot or tap.
- People band: any sourced birthday counts (Contacts, a note, the user's edit); say if it should be Contacts only.
- A private line's sheet shows its note sentence when the user opens it (Now rows never do).
- "Write a card", Help me start (DN-8), Find it (DN-16), the tender poster (DN-9): not built, no control shown.

**Platform adaptations** (intent kept, look differs): highlighter bands are full text backgrounds (React
Native can't draw a 60–92% band); the review's underlines fade in phrase by phrase instead of drawing left to
right; lens swipe is not built (tabs only) so it never fights the iOS back-swipe; the A–Z rail is 28 pt wide
(an index, as iOS's; one VoiceOver adjustable control, with letter headers in the rotor).

**Not verified:** anything on a phone; Night appearance natively; the largest Dynamic Type natively; Reduce
Motion natively; the 17e width natively; performance with 500+ people natively (virtualized; unit-tested).

## 7. Founder walkthrough (once a build is on your phone, or on the simulator)

1. Turn the experience on for your account only (needs your explicit yes for your user id; never global):
   one `user_flag_overrides` row `(your id, 'notebook_deck', true)`. Off again by deleting the row.
2. **Today.** If something clears the bar you'll see one poster; otherwise "Nothing needs you today." Swipe the
   deck under it; it ends with "That's today." Tap the poster to open the moment.
3. **Showing up.** In the moment, tap **Ideas for showing up** (it is closed until you ask). Each idea quotes
   your own words and says where they came from. Open one: **Message** / **Call** open the app and send nothing;
   **Keep it in mind** saves your sentence with a day you pick (it appears under "You said you'd" and comes back
   on that day); on something you already promised it only moves the day. Undo is in the confirmation.
4. **Follow-through.** After you message someone from a moment, come back: Kinship asks the one return question.
   Yes records the conversation; then "Anything worth remembering?" opens Tell about them. On your own promise,
   **I did this** keeps it without pretending you talked.
5. **Tell.** Tap "Tell Kinship something…", write something long and messy about several people, Keep. The
   review shows your words with what was understood underlined in each person's colour; tap a phrase to find its
   line, tap a line to edit it in place, answer "Which Sam?" and any "Needs your yes". **Undo this note** removes
   everything from it.
6. **People.** Search a word you told Kinship (not a name): tap a result to land on that note in the person's
   **Pages**. Above the tiles, "Coming up for them" is ordered by date only.
7. **A person.** **Now** is what matters now (as before), **Pages** is your notes about them over time with what
   you did, **Knows** is What Kinship knows. Tap any line to fix it; your edit wins.
