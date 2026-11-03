# Moment Deck × Notebook × Showing Up — implementation record (2 Nov 2026)

**Readiness: READY FOR FOUNDER NATIVE PASS.** All six journeys pass with the live model in the black-box suite and
again by hand on a Release iOS simulator build (§5), where the walk found and fixed eight defects. Nothing has
run on a phone; the narrow width and Reduce Motion are not yet checked natively.

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
| UNIT / INTEGRATION (`TZ=UTC npx jest`) | **PASS**: 127 suites, 1243 tests (incl. `app/__tests__/firstRun.test.tsx`), plus 1 mentions test added after; ~170 new tests across the five surfaces |
| BLACK-BOX regression, flag off (replayed model, this branch's gateway) | **PASS**: showingup 2/2, today 2/2, k28 3/3, k19 2/2, trustfloor 1/1 |
| TYPES / LINT | `npx tsc --noEmit` clean; `npx eslint app src` 0 errors |
| BLACK-BOX + LIVE-MODEL (`e2e/blackbox/notebook.blackbox.tsx`, this branch's gateway with the model key) | **PASS** 4/4 in one run (38.5 s), all six journeys; see §4 |
| NATIVE-SIMULATOR (Release, iOS 27, this branch's gateway, live model) | **PASS** after fixes, 3 Nov: all six journeys by hand, Night, the largest text; see §5 |
| FOUNDER-DEVICE | **NOT RUN** |

## 4. Journeys (PR #77's six)

Black-box suite `e2e/blackbox/notebook.blackbox.tsx`: the real screens, session classes, sync engine and
network client against the local stack, with `GATEWAY_URL` at this branch's ai-gateway holding the model
key, so every note is read by the **live model**. Stand-ins: sql.js for SQLCipher, mocked routing, auth
context, safe area, contacts and the OS hand-off. Run: `GATEWAY_URL=http://127.0.0.1:<port> npx jest -c
e2e/jest.blackbox.config.js e2e/blackbox/notebook.blackbox.tsx`.

| Journey | What ran | BLACK-BOX + LIVE-MODEL | NATIVE-SIM |
|---|---|---|---|
| **J1 Remember to connect** | An earlier note's marathon (day before) → the server's `event_followup` reason → the poster ("Yesterday · Sun, Nov 1", "How did it go for Ben?", the memory, "Ben was hoping to break four hours.", its source) → expanded moment ("It was yesterday.") → Message → Messages opened, **nothing recorded** → back → "Did you ask Ben how it went?" → Yes → **one** conversation (`return_check`) → "Anything worth remembering?" with "In Ben's notebook: You messaged · today" | PASS | PASS |
| **J2 Tell something meaningful** | PR #77's exact messy note (Priya back from Lisbon, Oakland "on the 15th I think? or mid-month", sister Anjali, mom's knee surgery, dad alone, "Sam called — she got the promotion!!!", the promise to celebrate Friday, "Leo — no wait, Josh") on the Tell page → review → which Sam (answered: Sam Delgado) → two sensitive readings (Keep it) → kept → Undo | PASS: nothing on Sam Okafor; nothing on Leo; sensitive lines only after yes; every line sourced; Undo removed every line of the note and left the earlier one | PASS (same checks, read back from the database) |
| **J3 Revisit someone's life** | People search "flour" → the hit → `/v2/person/<Rosa>?lens=pages&note=<the note>` → Pages scrolled to and ringing that note | PASS | PASS |
| **J4 A thoughtful gesture** | Ben's expanded moment → Ideas for showing up (closed until tapped) → "Suggest doing trail running together" quoting “Ben loves trail running.” with its source; Rosa's Now → an idea → Keep it in mind → "Make ravioli with Rosa on Sunday" → a note kept as written (status `skipped`) and **one** user-authored promise sourced to it | PASS | PASS |
| **J5 Follow-through** | Elena's own promise → its idea → Keep it in mind → "You already said you'd do this" → Bring it back tomorrow → **the same promise**, its day the user's edit (nothing new) → I did this from the line → resolved, **no conversation recorded** | PASS | PASS |
| **J6 Connection becomes memory** | After J1's Yes → Tell Kinship → the Tell page about Ben → "Ben finished the marathon in 3:52 … He still loves trail running." → the new line kept from the new note; the earlier "is running the marathon" line closed (superseded, `transition: completed`); "trail running" **not doubled** | PASS | PASS |

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

## 5. Native simulator (3 Nov 2026)

**Setup.** A Release build of this branch (iOS 27 simulator "Kinship Notebook 18 Pro", 402 × 874 pt) against the
local stack through a harness proxy that sends the gateway to this branch's live-model gateway; a local test
account (36 fictional people, earlier notes like the prototype's, `notebook_deck` on for it alone). Driven by hand
through the simulator, every result read back from the screen and, for what was saved, from the database.
Screens: `docs/product/explorations/moment-deck-notebook-2026-11/native/` (26 stills, beside PR #77's `shots/`).

| Journey | What was done natively | Result |
|---|---|---|
| J1 | Ben's poster → the moment → Ideas → an idea → "Ask how it went" → Choose Ben (Contacts) → Messages opened empty → back → "Did you ask Ben how it went?" → Yes | PASS: one conversation (`contact_events`: Ben · text · return_check); "In Ben's notebook: You messaged · today" |
| J2 | PR #77's exact note pasted on the Tell page → Keep → the review (live model, 26 s) → which Sam → two "Who is her/she" → two Needs your yes → Keep it ×2 → Undo this note | PASS: ten lines, Sam Delgado only, nothing on Leo, the two private lines kept only after yes; Undo retracted all ten and restored "Priya lives in Lisbon" |
| J3 | People → search "flour" → the hit → Rosa's Pages, that note ringed | PASS |
| J4 | Ben's moment → Ideas → Something for Ben → Keep it in mind → edited sentence → Keep | PASS: one skipped note + one user promise due the next day; leads Ben's ideas as "Follow through on what you said" |
| J5 | Elena's "Bring Elena dinner" → Ideas → "You already said you'd do this" → Bring it back tomorrow → I did this | PASS: the same promise (version 2, due moved), still one; then resolved, **no** conversation recorded; "Nice. Anything worth remembering about Elena?" |
| J6 | After J1's Yes → Tell Kinship (about Ben) → "Ben finished the marathon in 3:52! … trail running … Chicago next fall." → the review | PASS: the marathon line replaces "is running the New York Marathon"; trail running not doubled |

**Defects the walk found, all fixed on this branch** (each with a test; the build re-run and the fix seen natively):
1. The expanded moment's actions did nothing on a phone: a hand-off sheet presented while the moment was still
   leaving was dropped by iOS. The moment now counts as an open sheet until it has gone (`sheetStack`), so the
   hand-off waits for it. It also keeps its own words while it leaves (they had blanked as Today refreshed).
2. "Keep it in mind": the sentence and its button sat under the keyboard. Every sheet now scrolls a covered field
   into view (`Sheet.revealBy`).
3. People: the A–Z rail lay over the third column and the band; it now sits beside Everyone with its own gutter,
   and stays in view as the list scrolls.
4. People: tiles without a photo had no flower (an absolute image sized by aspect ratio alone draws nothing on iOS).
5. A lime person's poster had a lime action and chip on lime (invisible). On their colour, ink and white instead;
   at Night the poster's buttons keep the person's ink (they had turned light-on-lime).
6. Person: "Message" broke as "Messag / e" in the three equal buttons; buttons now size to their words first.
7. A note told on a Pacific evening read "You told Kinship today." the next morning (Today's model read the UTC
   day; `mentions.ts` had been fixed for this earlier, `todayModel` now uses the same local day).
8. "Which Sam?": both read "Sam"; they now read by their full names, as in the prototype. Also: the current lens
   was invisible at Night (its pill matched the well); the Pages highlight was a heavy full-line band (lightened
   to the prototype's weight).

**Compared with PR #77's stills.** Same structure, order and words on every surface walked: the poster
(`today-mon.jpg`), the expanded moment (`moment-ben.jpg`, `annot-moment-elena.jpg`), ideas and the assist
(`moment-maya-ideas.jpg`, `assist-maya.jpg`), the return panel (`rc-elena-plan.jpg`), the Tell page (`tell.jpg`),
the review (`review-j2.jpg`), People (`people.jpg`, `people-dense.jpg`, `people-search.jpg`), the person
(`person-ben.jpg`, `person-rosa-pages.jpg`, `person-leo-knows.jpg`). Differences that remain: the prototype's
people have photos (the test account has none, so every face is the colour-initial-flower form); the iOS
hand-off is the system's own Messages screen, not the prototype's mock; the platform adaptations in §6.

**Not checked natively:** the narrow width (a 375 pt simulator was set up; driving it needed a separate
simulator approval that was not answered, so it was removed unrun); Reduce Motion; VoiceOver; performance with
hundreds of people; Source from a line; a phone.

**Also seen (pre-existing, not changed):** after the review's Done, the alpha Kept card returns with "Did Kinship
get this right?" (the built Gate D behaviour, kept on purpose, but it repeats what the review just showed; a
decision for the founder). At the largest text the People search placeholder is capped smaller than the rest.

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

**Not verified:** anything on a phone; Reduce Motion natively; the narrow width natively; performance with 500+
people natively (virtualized; unit-tested).

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
