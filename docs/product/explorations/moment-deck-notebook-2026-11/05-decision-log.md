# Decision log

**Status: PROPOSALS for the founder.** Nothing here is decided. Each row says whether it departs from the contract (§ reference) and what I recommend. "Departure" means it needs a recorded founder decision and a coverage-matrix entry before any build (contract §11).

## A. Decisions this design needs

| # | Decision | Options | Recommendation | Contract impact |
|---|---|---|---|---|
| **DN-1** | Adopt the direction: Moment Deck Today × Notebook person and Tell × Showing Up inside both | Adopt · adopt in part · reject | **Adopt**, then brief build steps one at a time (Implementation §6) | Supersedes PR #76's pending "which structure" question with a combination PR #76 §G recommended but did not design |
| **DN-2** | **T4:** retire People search-first A–Z for equal tiles A–Z plus a date-only "coming up for them" band and one unified search | Keep T4 · this proposal · a different index | **This proposal.** It keeps alphabetical order and adds no ranking; only the presentation and the band change | **Departure** from §6 T4 (the override PR #76 already asked for) |
| **DN-3** | Person page as **three lenses** (Now · Pages · Knows) with What Kinship knows moving into a lens | Keep sections + separate Knows screen · lenses | **Lenses.** Removes repetition between Portrait and Knows; keeps every rule | Presentation of approved surfaces 12 and 14; no rule change |
| **DN-4** | **Pages** (your notes about this person over time, plus what you did) | Build as the realization of row 13 "Your story together" / B2 History · build as a plain lens · hold | **Build as a lens, and treat it as the first step toward row 13.** It is a story in your words, not an activity log | Coverage row 13 is NOT BUILT, and "timeline-heavy CRM UI is on hold": **needs the founder's yes** |
| **DN-5** | **Ideas for showing up**: where they appear | Under the hand-off (SUA-1 today) · explicit control in the moment and on Now · also on the Today card | **Explicit control in the moment and on Now; never on the card or in a push** | Answers the founder's 19 Oct point 2 and FD-8 |
| **DN-6** | Ideas: **titles** | A: fixed template per category + the verbatim quote (no model) · B: grounded short title ("Get her the book she keeps mentioning") | **Start with A** in the build. Test B in the founder-only preview against A (the founder's point 1: generic vs memory-grounded) | B touches §3 grounded phrasing and copy rules; A doesn't |
| **DN-7** | **Keep it in mind** (an intention saved as the user's sentence with a day; or a day added to an existing promise) | Hold until Intentions (row 33) · ship as v0 now · never | **Ship as v0 with the ideas step.** It is a user-authored promise: no cadence, never repeats, never overdue | Pulls row 33 "Intentions v0" forward and makes it user-visible: **departure from the deferral; needs approval**. Not the cadence question (F1): nothing is time-since-contact |
| **DN-8** | **Help me start** (two openers on request, copied, never sent) | Hold (D9 "later") · ship with ideas | **Hold** until ideas and the loop are proven; keep it in the design | D9 timing; **needs approval to ship** |
| **DN-9** | **Hard-time moments** (tender poster) for the user's *own* promise tied to a sensitive event (Elena) | Exclude (current RSN-06 behaviour, as far as I can tell) · allow with the tender treatment | **Allow only for the user's own promise, with the tender treatment, private lock screen.** Brief it with RSN-09 | **Needs an RSN-09 brief and approval.** Today eligibility excludes sensitive events as moments; this is a promise moment, which may also be excluded in alpha |
| **DN-10** | **"I did this"** on a promise moment and in the line sheet | Return check only · also "I did this" | **Also "I did this".** It's the user's own report, recorded as the promise kept; not contact | Fits T12 (only the user's answer counts). Confirm the alpha's promise loop semantics match |
| **DN-11** | G3b outcome question after a Yes that followed an idea ("Did you offer to help?") | Keep SUA-1's alpha behaviour · drop · expand | **Keep as built in alpha:** content-free kind, never required, never counted back | None (already FD-30d's authorised prototype) |
| **DN-12** | **Review layout**: your words on top + phrase ↔ line mapping + inline sentence edit; clear lines still auto-save | This · hold everything until Done | **This.** Auto-save with Undo is what users already have, so I do not propose changing the save semantics | Presentation only; semantics unchanged |
| **DN-13** | **Poster photos**: the person's chosen photo as the hero | Photo when chosen, type otherwise · always type | **Photo when the user chose one** (alpha already supports "Add a photo"). Never from Contacts automatically | Photo-optional preserved; privacy unchanged (photos stay on the phone) |
| **DN-14** | **Flowers replace sprigs** as identity marks | Keep hairline sprigs · Electric Garden flowers | **Flowers**, identity only, never growing. They follow FD-30b | D8 preserved (`sprig_marks` stays off); the "pressed sprig" signature in §4 is superseded by FD-30b |
| **DN-15** | Today deck: **how many cards** | Up to 3 + end (quiet-line rules) · more | **Keep the quiet-line limits** (Coming up 3, then "and N more" becomes the end card's line) | None if limits stay |
| **DN-16** | Find it (plain web hand-off for a remembered item) | Never · later after G5 | **Later, after G5**, plain link, no partner, no data, disclosed | CC-28 R7/R8; future only |

## B. The founder's three points on showing up (19 Oct), and how this design answers them

1. **"Generic suggestions don't show Kinship's advantage."** Every idea quotes the specific memory it came from, with a source; there is no generic line. DN-6 proposes testing template vs grounded titles side by side.
2. **"User-initiated needs a sharper definition; a line under a proactive Moment isn't user-requested."** Ideas are behind an explicit control ("Ideas for showing up") inside the moment or person page, closed by default, never on Today's card or a push (DN-5).
3. **"Outcome measurement must separate intention from action."** The interaction spec's evidence ladder keeps five records apart:
   - considered (analytics only);
   - intended (your saved sentence);
   - opened a channel (nothing);
   - reached them (return-check Yes);
   - did the thing (outcome kind, or the promise kept).

   Learned (a new Tell) is separate again. None is inferred from another.

## C. Tradeoffs I chose, and what they cost

| Choice | Cost | Why I accept it |
|---|---|---|
| Poster-first Today | A text-only moment loses some density; photo quality varies with the user's own photos | The person, not the app, is the delight; the type poster keeps it working without photos |
| Lenses on the person page | One more tap to reach Knows than scrolling | It removes repetition and makes Pages possible without an endless scroll |
| Ideas behind a tap | Fewer people will discover them | That is the point (founder point 2); discoverability is measured, not forced |
| Review keeps your words on screen | Longer screen for long notes | Collapsed to five lines; mapping is the trust moment |
| No Actions tab | Intentions are spread across people | Intentions surface on Today on their day; a list of them would be a to-do list |

## D. Unresolved design questions (mine)

- **Night.** The prototype doesn't design it. The type poster, the tender variant and ruled paper need night versions.
- **Large text.** The spec says the deck becomes vertical above XXL. That needs a prototype pass.
- **Swipe between lenses.** It may conflict with the iOS back-swipe on the person page. Test on device.
- **Two people with the same first name in the deck** (Sam and Sam). Deck cards show the first name only; this needs a rule (full name when ambiguous, as tiles already do).
- **The understanding sweep.** It is lovely in a prototype and may add perceived latency on device. Measure before committing.
- **"Coming up for them" band.** With 100 people and many birthdays it could get long. It stays capped at 14 days; consider 7.

## E. What this design deliberately does not do

- No Actions or Intentions tab, no to-do list, no overdue, no counts.
- No chat; Ask stays future and appears only as search.
- No drafting by default, no sending, no buying, booking or inviting.
- No cadence or elapsed-time reasons (F1 stays open and untouched).
- No voice UI (D5): no mic until on-device voice exists.
- No new data sources: no calendar, no message reading, no location.
- No Garden or Landscape, and no flower that grows with contact.
