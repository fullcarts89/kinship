# Alpha release candidate: the journey, walked

**31 Oct 2026, WS-5 (integration).** The integrated app from `claude/alpha-integration` at `e460af3` (PR #74: WS-1 `9bdf0ea`, WS-2 `441de2a`, WS-3 `9119b36`, WS-4 `8bcb0ae`, WS-6 `7b6822f`), built **Release for the iOS 27 simulator** (iPhone 18 Pro; iPhone 17e for the narrow width), against the **shared local Supabase stack** with every migration through `20261031090000` applied, this branch's **own ai-gateway talking to the live model** (through a harness-only proxy on :54398, `e2e/README.md` pattern), a **fresh local test account** created minutes before, and two contacts with phone numbers added to the simulator. No stub, no replay, no fixture data.

**Evidence tier of everything below: NATIVE-SIMULATOR (live model)**, except where a row says otherwise. Nothing here is FOUNDER-DEVICE. **Readiness: NOT READY** until the routed defects below are fixed and the journey is re-walked; the candidate is then at most READY FOR FOUNDER NATIVE PASS.

Screenshots: `docs/product/screens/alpha-rc/` (JPEG, 1000 px tall; numbered in walk order; light unless the name says dark; iPhone 18 Pro unless it says 17e). Scenario numbers refer to `alpha-acceptance-scenarios.md`.

## The walk

| # | Step | What was said / done | What Kinship did | Result | Screens |
|---|---|---|---|---|---|
| 1 | Fresh install → Welcome | Launch after uninstall + keychain reset | The promise in three plain lines, the Ben example, Apple primary, Google, Use email; no carousel, nothing about AI | PASS | 01 |
| 2 | Sign in | Use email, the local account | Signed in; iOS's own password prompts dismissed | PASS | 02 |
| 3 | Setup 1 of 4: your name | "Nora" | Greeting uses it from then on | PASS | 02 |
| 4 | Consent | Allow | The D2 sentence and "Sent to Anthropic to understand it; not used to train models." word for word, full screen, before anything is sent | PASS | 03 |
| 5 | Choose people | Allow contacts → Sam Delgado, Leo Marchetti | T8 lock line ("Only the people you pick are saved."), search, "Continue with 2 people" | PASS | 04 |
| 6 | Already worth knowing | — | "Sam's birthday is Saturday, Nov 7." · From Contacts, then the first Tell on the same screen | PASS | 05 |
| 7 | First Tell (scenario 1) | *"Had a long dinner with Leo last night. He finally signed the lease on the apartment in Pilsen and moves in on November 15, so he's packing every weekend until then. His sister Carla is getting married in June and asked him to give a toast, which he's dreading because he hates public speaking."* | 9.5 s with the live model. **Kept for Leo**: the dinner, the Pilsen move (Nov 15), Carla's wedding in June as his sister's (a related person, not someone in People), the toast and the dread, "hates public speaking". No question asked. Today showed first use with the Kept card | PASS | 06, 07 |
| 8 | People, Leo's page | — | Alphabetical, one live line each; Leo's page: Lately (toast, public speaking), Coming up (Nov 22 move, June wedding), the Kept card on the page too | PASS | 08–11 |
| 9 | What Kinship knows | — | Every line with "You told Kinship · Oct 31"; sources open to the note with the words marked; Carla under Their people | PASS | 12, 13 |
| 10 | Correction (scenario 2) | Edit the move's words to Nov 22, then its date token | "Edited by you · was: ~~…~~" after the words; the date needed the token as well (the words alone leave Nov 15); then Coming up says Sun, Nov 22 | PASS (two steps, as designed) | 14, 15 |
| 11 | Told again | From Leo's page: *"Actually the Pilsen move slipped again, it's December 6 now."* | 3.6 s. Kept as a **new** line beside the edited one; no "Replaces", no question; Coming up listed **both** Nov 22 and Dec 6 | **FAIL → WS-1 (#72)** | 16 |
| 12 | Undo | Undo on the Kept card | The Dec 6 line gone (server: retracted), the edited Nov 22 line exactly as before | PASS | 17 |
| 13 | Today, bring back | — | "This is where Kinship brings things back, when they matter." with the user's own Nov 22 line as the example (H4), Got it | PASS | 18 |
| 14 | A promise (scenario 3) | On Today: *"I promised I'd bring Sam soup tonight because she's been completely overwhelmed at work. She hasn't decided which kind she wants."* | 4.9 s. Kept as **your promise** (server `kind=promise, subject=user`) + Sam's thread. Today's Moment at once: **"You said you'd bring Sam soup."** · Today · Sat, Oct 31 · **Message Sam** · Not now; detail "Bring Sam soup · It's due today."; no "You could…" for a promise | PASS | 19–21 |
| 15 | Hand-off | Message | Messages opened with Sam's number and nothing pre-written. The notification permission prompt appeared on this first hand-off (after a useful Moment, as specified); Allow | PASS | 22 |
| 16 | Return check | Back | **"Did you bring Sam soup?"** Yes · Not yet · Didn't happen → Yes | PASS | 23 |
| 17 | After Yes | — | Moment gone; Sam's page "You messaged · Oct 31 · Bring Sam soup"; server: one `contact_events` row (`promise`, `return_check`), the promise `resolved` | PASS | 24, 25 |
| 18 | A second note on Sam | From Sam's page: *"Sam just got the promotion she'd been chasing for a year, she starts as team lead on Monday. She's also been getting into pottery on weekends."* | 6.2 s. Milestone (promotion), event (team lead, Mon Nov 2), interest (pottery) | PASS | 26 |
| 19 | SUA-1 line (scenario 3 step 5) | Message from Sam's page | The sheet: You could mention (both new lines), Open Messages, Call, FaceTime, WhatsApp, and beneath them the quiet line **"You could ask if they'd like company."**; tapping it opened Messages empty | PASS (copy precedence noted to WS-3) | 27, 28 |
| 20 | Return check from the page | Back → Yes | "Did you reach Sam?" → Yes → **"Did you ask if they'd like company?"** → Yes → "Anything worth remembering from talking with Sam?" → Nothing today | PASS; the Tell Kinship pill's label renders tiny → **WS-2 (#71)** | 29–31 |
| 21 | Ask Kinship v1 (scenario 6) | People search: "What is Sam into?", "Pilsen", "Does Leo like olives?" | "In your memory › Sam › Has been getting into pottery on weekends" with its source; "Leo › Signed the lease… (Edited by you · From your note)"; **"Kinship knows nothing about that for Leo yet."** No model call, no chat | PASS | 32–34 |
| 22 | Paused (scenario 7) | Sam › Edit › Pause → confirm | "Paused" line on the page; Sam's birthday gone from Today; Settings › Paused and remembered: Sam · Resume | PASS; the state line is hard to read over the hero art → **WS-2 (#71)** | 35–39 |
| 23 | Settings, Export | Export your data | Share sheet, `kinship-export-2026-10-31` (3 KB, Markdown): both people, states, birthday source, every line with kind, date, provenance and the quoted span, the two confirmed conversations, the notes as written | PASS | 40, 41 |
| 24 | Resume, Remembered | Settings › Resume Sam; Leo › Hold as remembered; Leo › Resume | Birthday back on Today; "Remembered" line; Resume asks once more ("Resume Leo?"); normal again | PASS | 42–45 |
| 25 | Dark | System dark | Person page, Today (bring back, week list, quiet day), People | PASS | 46–48, 50 |
| 26 | Quiet day | Sam paused again, bring back dismissed | **"Nothing needs you today."** with the bud; with Coming up lines present Today shows the header and the week instead (K11's one truth: a line under the header means it is not a quiet day) | PASS | 48, 50 |
| 27 | Larger text | Dynamic Type xxL | Today and People reflow; nothing clipped | PASS | 54, 55 |
| 28 | iPhone 17e width | Same account, second simulator | Welcome, sign-in, People, Leo's page at 390 pt | PASS | 49, 53, 56 |
| 29 | Second device, first sync | 17e signed in while Sam was paused | For a few seconds Today showed a Moment for Sam ("Congratulate Sam") until the people pull completed, then "Nothing needs you today." | **Observation → WS-4 (#70)** | 51, 52 |
| 30 | Notification | Permission allowed at step 15; Settings › Notifications "On" | The lock-screen delivery at the next 09:00 was **not observed** in this session (no simulator clock advance); permission flow and the Settings state seen | NOT RUN (delivery) | 39 |
| 31 | Open-thread check-in (RSN-07, scenario 4) | — | Needs a thread's own day or the 42-day window; not stageable on a fresh account today | NOT RUN | — |
| 32 | Dense note / Tell the rest (scenario 8) | — | Covered at LIVE-MODEL (s12 11/11, s13 19/19 in the probe) and BLACK-BOX (`narrative` 3/3); not walked natively this pass | NOT RUN natively | — |
| 33 | Merge duplicates, delete account | — | Covered by WS-4's black-box (`trustfloor`); delete is not served on the shared stack; not walked | NOT RUN | — |

## Defects and observations routed from the walk

| To | Where | What | Severity |
|---|---|---|---|
| WS-1 | #72 | A told-again move (Dec 6) is kept beside the user-edited one (Nov 22): no Replaces, no question, two dates for one move (row 11) | P1: trust invariant 4 / G30 |
| WS-2 | #71 | The page's "Anything worth remembering…" Tell Kinship pill renders its label at a tiny size (row 20) | P2 |
| WS-2 | #71 | "Paused" / "Remembered" state line barely legible over the hero leaf (row 22) | P2 |
| WS-3 | #69 | SUA-1 picked "company" over "plan" with a promotion milestone and a Monday job start both current; a copy-precedence question for the founder, not a spec defect (row 19) | note |
| WS-4 | #70 | A second device's first render shows a Moment for a paused person until the people pull completes (row 29) | P3 |

## What this proves, and what it does not

Proves (NATIVE-SIMULATOR, live model, real gateway and database): the whole first-session journey of the contract §10 from a fresh install to a confirmed conversation, with the Electric Garden design, natural paragraphs understood without questions, exact correction and Undo, a promise becoming Today's Moment on its day, the hand-off and return check recording exactly one conversation, the SUA-1 line and its one outcome question, Ask v1 retrieval with honest misses, Paused / Remembered / Resume honoured on Today, and a complete export.

Does not prove: the lock-screen notification delivery; the open-thread check-in on its day; merge and delete through the screens; anything on a real iPhone; the told-again replacement (which failed). Timings above are the gateway's own (proxy log), on a Mac under light load.

## Second walk: the structural redesign build (31 Oct, integration `df32d24`, rebuilt once)

Same method (Release simulator, live model through the harness proxy, fresh local account, iPhone 18 Pro), after WS-2's five structural commits (Moment Detail, Today, Person, People, Tell/review/hand-off), WS-1's user-edited-line question (`8985610`, migration `20261031100000`), WS-6's reviewed Ask v1 and WS-3's bounded nudge. Screens `r2-*.jpg` in `docs/product/screens/alpha-rc/`. Evidence tier NATIVE-SIMULATOR (live model).

| Step | What happened | Result | Screens |
|---|---|---|---|
| Fresh install → sign in → name → consent → pick Sam and Leo → Already worth knowing → first Tell | The new Welcome, setup and consent screens; the first Tell (the Leo paragraph) understood in 9.7 s by the live model, no question | PASS | r2-00 |
| Kept card | "Kept for Leo Marchetti": the dinner, the Pilsen move, Carla's wedding, "and 2 more"; Correct this · Undo; Got it right · Not quite | PASS | r2-01 |
| People (redesign 4/5) | A lettered directory (L, S) with two explicit doors, **Find someone** and **Ask your memory**; one live line per person | PASS | — |
| Ask your memory | "Who do I know in Pilsen?" → Leo's lease line, sourced "You told Kinship · Oct 31". "What is Marcus into?" (unknown name + word) → **"Nothing about that in your memory yet."**, no other person's lines (WS-6's review finding holds natively) | PASS | r2-02, r2-03 |
| Person page (redesign 3/5) | A portrait: the name over a bloom, Coming up and Lately sections, Message / Call / Tell. The surname overlaps the leaf art and "Leo" is partly under it | PASS; legibility note → WS-2 | r2-04 |
| **Row 16: told again over a user-edited line** | Line edited by hand ("Edited by you · was: …"); then *"Actually the Pilsen move slipped again, it's December 6 now."* → **"Does this replace what you told me?"** with the edited line as the one-tap yes, No, keep both, Don't keep this, Undo | **PASS** | r2-05 |
| Yes, then Undo | "Here's what I'll remember." with the Dec 6 line and "Replaces: ~~…~~"; server: old line `superseded`, new active. **Undo** restores the edited line exactly and retracts the Dec 6 line | **PASS** | r2-06 |
| No, keep both | Telling the same note a second time from Leo's page right after the Undo asked **"Who is this about?"** instead of the replace question (capture `needs_review`, page person set) | **NOT WALKED; defect → WS-1 (#72)** | r2-07 |
| Today after setup | Bring-back orientation with the user's own Nov 15 line as the example; "This week · Sam's birthday" | PASS | — |

Still NOT RUN on this build: the promise Moment → hand-off → return check and the SUA-1 line in the redesigned sheet (passed on the earlier build; black-box `k20`/`k28`/`showingup` pass on the redesigned head), WS-3's "Test: send today's notification in 10 s" hook, the open-thread check-in staged by SQL, Paused/Remembered/Export on the redesigned Settings, dark mode and large text on the redesigned screens, the iPhone 17e width, and Delete account. A third walk should cover those once WS-1's "who is this about" follow-up is fixed.

## Third walk: the final head (31 Oct, integration `b5221a8` + `bb7aea0`, all five redesign surfaces; screens `r3-*.jpg`)

Fresh install, fresh local account, live model through the harness proxy, iPhone 18 Pro. Evidence tier NATIVE-SIMULATOR (live model).

| Step | What happened | Result | Screens |
|---|---|---|---|
| Setup (name → consent → Sam and Leo from Contacts → Already worth knowing → first Tell) | The consent step carries the D2 sentence and "Sent to Anthropic to understand it; not used to train models."; "Sam's birthday is on Nov 7. · FROM CONTACTS"; first Tell *"I promised I'd bring Sam soup tonight because she's been completely overwhelmed at work. She hasn't decided which kind she wants."* understood in 5.1 s | PASS | — |
| Today (redesign 2/5) | The promise is the Moment, at once: a big bloom-filled "Sam", **"You said you'd bring Sam soup."**, Today · Sat, Oct 31, "You told Kinship · Oct 31", the Kept card under it; after dismissing, "What you've told Kinship: Sam has been completely overwhelmed at work", **Message Sam** · Not now, and "This week: Sat, Nov 7 · Sam's birthday" | PASS | r3-01 |
| Hand-off (redesign 5/5) | "Message Sam", You could mention (the thread line), Open Messages, Call · FaceTime · WhatsApp, "When you come back: 'Did you reach Sam?'" | PASS | r3-02 |
| Messages | Opened with Sam's number and nothing pre-written; the notification permission asked here, after the first useful Moment; Allow | PASS | — |
| Return check | Back on Today: **"Did you bring Sam soup?"** · "You said you'd bring Sam soup." · Yes · Not yet · Didn't happen, above the bring-back orientation ("This is where Kinship brings things back, when they matter." with its example) | PASS | r3-03 |
| Yes | Moment gone; server: one `contact_events` row (`promise`, `return_check`), the promise `resolved`; Today keeps the bring-back orientation with the example, plus "This week · Sam's birthday" | PASS | r3-04 |
| Settings (WS-3 test hook) | Notifications **On** (permission from the hand-off), "Test: send today's notification in 10 s", Your data (Export your data · Export as JSON) | PASS | — |
| Private notification | With a day-precise promise open for Leo ("I promised Leo I'd send him the name of that moving company tonight." → Today's Moment "You said you'd send Leo the name of that moving company."), the test hook: "Background the app: it arrives in about 10 seconds." → on the lock screen **Kinship · "Something worth knowing about Leo today."** and nothing more | PASS (the hook, not the 09:00 planner) | r3-05 |
| Tap the notification → Today | The simulator's lock screen does not route a banner tap here | NOT RUN natively (UNIT only) | — |
| Export | Share sheet `kinship-export-2026-10-31` (Text Document, 2 KB) | PASS | — |

Observations from this walk: (1) with an undated-time promise "this afternoon", the live model files it as the user's promise **and** an event, but `date_precision: "unknown"`, so no Moment is made for it (nothing to say about an afternoon with no day); (2) a promise told for "tonight" after the same person was already reached today makes no second Moment ("Call Sam tonight about the soup recipe she asked for" sat quietly in This week), which is the rule, not a defect; (3) the send arrow in the redesigned Tell dock is a round control that is clearly reachable above the keyboard.

Still NOT RUN on the final head: row 16's "No, keep both" (blocked by the WS-1 defect on #72), the RSN-07 thread check-in, Paused / Remembered / Resume and merge on the redesigned person page, dark mode and large text and the iPhone 17e on the redesigned screens, and Delete account.
