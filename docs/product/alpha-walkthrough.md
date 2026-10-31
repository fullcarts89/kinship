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

## Fourth walk: the told-again question, both routes, on the final head (31 Oct, integration `0e9e3bb`; screens `r4-*`, `r5-*`)

Fresh account, live model through the harness proxy, Release build of `0e9e3bb` (WS-1 `181eb5b`). Evidence tier NATIVE-SIMULATOR (live model). The first Tell is the Leo paragraph (5 lines kept in 9.8 s); the move line is then edited by hand to "November 22" ("Edited by you").

| Route | Steps | Result | Screens |
|---|---|---|---|
| **(b) told from Today, no page** (earlier head `edf93d8`) | "Who is this about?" → Leo → straight to "Here's what I'll remember": both Nov 22 and Dec 6 active, nothing asked | **FAIL** (routed to WS-1, fixed in `181eb5b`) | r4-02, r4-03 |
| **(b) on the fixed head** | *"Actually the Pilsen move slipped again, it's December 6 now."* → "Who is this about?" → Leo → **"Does this replace what you told me?"** ("It sounds like news about a line you edited.", the edited line as the one-tap yes, No, keep both, Don't keep this) | **PASS** | r5-01 |
| (b) **No, keep both** | Both lines stand (server: Nov 22 active, Dec 6 active); Undo retracts only the Dec 6 line | **PASS** | — |
| (b) **Yes** | Kept card shows "Replaces: ~~Leo signed the lease … November 22~~"; server: the edited line `superseded`, the new line `active`; **Undo** restores the edited line exactly (active, original date) and retracts the new one | **PASS** | r5-02 |
| **(a) told from Leo's page** | *"Actually the Pilsen move slipped again, it's December 6 now."* → "Who is this about?" (Leo offered, because the model's mention was "Leo's move…") → Leo → **replace question** → Yes → "Replaces: ~~…~~"; Undo restores exactly | **PASS** | r5-04, r5-05 |

Two observations: (1) the first send of the same unnamed note from Today once returned **"Nothing to remember in that one."** in 1.3 s (the live model proposed nothing; the note stays saved and nothing is silently kept or lost, but a user could read it as "kept"); the retry went through. (2) Leo's redesigned person page on this head shows the poster-size name over a bloom, Coming up with the edited line marked "EDITED BY YOU", Lately and Message / Call / Tell (r5-03).

Still NOT RUN on the final head: the open-thread check-in, Paused / Remembered / merge on the redesigned person page, dark mode, large text and the iPhone 17e on the redesigned screens, and Delete account.

## Fifth walk: the open-thread check-in and the final sweep (31 Oct, integration `4274345`; screens `r6-*`)

Same account as the fourth walk (fresh, live model, Release build of `0e9e3bb`; the later WS-1 commit `57863f4` is gateway-only and ran on the restarted gateway). A thread for Leo ("Leo is thinking about whether to take the job in Denver", `followup_after_days: 42`) was staged in the local database exactly as WS-3's handoff describes (insert, `created_at` backdated 42 days with `session_replication_role = replica`, then `updated_at` touched so the phone's pull reaches it).

| Step | What happened | Result | Screens |
|---|---|---|---|
| RSN-07 on its day | After a relaunch, Today leads with a poster-size "Leo" and **"Did Leo decide?"**, the thread in the user's words, "What you've told Kinship" beneath it (the edited move line and the dinner, context only, no second primary action), **Ask Leo** · Not now | PASS; the headline sits over the bloom and is hard to read where the petals cross it → WS-2 | r6-01 |
| Hand-off | "Ask Leo", You could mention (two lines), Open Messages, Call · FaceTime · WhatsApp, the quiet SUA-1 line "You could offer to help.", "When you come back: 'Did you reach Leo?'" | PASS | — |
| Messages → back | The notification permission was asked here (this account had not been asked yet, after the first useful Moment), Allow; back on Today: **"Did you ask Leo about it?"** · Yes · Not yet (no "Didn't happen" for a thread) | PASS | r6-02 |
| Yes | "Anything worth remembering from talking with Leo?" · Tell Kinship · Nothing today; server: one `contact_events` row `thread` / `return_check`; the thread stays active; the check-in does not come back | PASS | — |
| Edit sheet | Their name, Save, Pause, **Hold as remembered**, **Merge with someone**, Remove from People, each with its plain-words explanation | PASS (controls present); Pause / Remembered / Resume / Export walked on the earlier build | r6-03 |

**Final black-box sweep on `4274345`** (own gateway :8010, stub :8793, one suite at a time, database log 129 KB throughout): `k28` 3/3, `k20` 22/22, `narrative` 3/3, `showingup` 2/2, `k27` 2/2, `removal` 3/3, `k4` 36/36; `trustfloor` passes Pause, Merge and Export and fails only at Delete (the local Storage containers are stopped: environment, not product).

**Not walked natively on the final head (and why):** Merge-with-someone through the screens (the control is present; `trustfloor` proves the merge and its Undo through the real screens in black-box), Pause / Remembered / Resume on the redesigned person page (walked on the pre-redesign build; the redesigned page was seen with the controls), dark mode, large text and the iPhone 17e on the redesigned screens, Delete account, and the lock-screen banner tap. These are the rows the founder's own native pass should cover first.

## Sixth walk: the last build (31 Oct, integration `5f3ea55`; screen `r7-01`)

Release build of the final head (WS-1 `bd9bfb1` incl. migration `20261031110000_v2_many_held_items`, WS-2 `00fa683` text scrim), installed over the previous app so the account and its data stayed. Gateways restarted on this code.

| Step | What happened | Result | Screens |
|---|---|---|---|
| **The unnamed note, re-sent from Today** | *"Actually the Pilsen move slipped again, it's December 6 now."* with Leo's move already on record → in 2.0 s the sheet **"Who is this about?"** (the whole note quoted, Choose who · Don't keep this); never "Nothing to remember in that one." | **PASS** (WS-1 `57863f4`) | r7-01 |

**Final status of the rows the coordinator asked for, honestly:**

| Row | Status |
|---|---|
| Native re-send of the unnamed note | **PASS** (above) |
| Pause / Remembered / Resume / merge on the REDESIGNED person page | **NOT RUN natively on the final build.** Walked on the pre-redesign build (walk 2: Paused line, Today silent about the person, Settings › Paused and remembered › Resume, Remembered's second confirmation, export). On the redesigned page the controls were seen (Edit sheet: Pause, Hold as remembered, Merge with someone, Remove from People, r6-03); merge and Undo are proven through the real screens in black-box (`trustfloor`) |
| Dark mode, large text, iPhone 17e on the redesigned screens | **NOT RUN on the final build.** WS-2 walked these natively on its own 17e (light, dark, largest text; `13-person-no-photo`, `22-dark-person`, `25-ax-person` on PR #71) and the scrim commit `00fa683` is the fix for the overlap I reported; I did not re-confirm it on my build |
| Delete account | **NOT RUN natively, environment:** the local Storage containers are stopped and starting them would be a shared-stack change; proven in black-box and pgTAP |
| Lock-screen banner tap | NOT RUN (the simulator lock screen does not route it) |

These five are the first things the founder's native pass (FOUNDER-DEVICE) should cover. Nothing in them is a known failure; they are simply not evidenced on the final build.

## Seventh walk: the final merged head (31 Oct, integration `77a6e44` + WS-4 `b0c6ac9`; screens `r9-*.png`)

Taken over from WS-5 by WS-6 (WS-5's budget was spent). Release build of `77a6e44` (WS-1 `54a7e71`, WS-3 `887c91e`, WS-2 `c0fab0b` including `9ca5ff5`, WS-4 `909907e` and its walk commits, WS-6 `1834939`), installed over the previous app on the iPhone 18 Pro (UDID named in every call), so the account `sim-f62986e4@kinship.test` kept Leo Marchetti's edited Nov 22 line. Same method: the harness proxy on :54398, this branch's gateways (no gateway-side file changed since the previous walk, so they were not restarted), the shared local stack with every migration through `20261031110000` applied. Evidence tier NATIVE-SIMULATOR; the live model was used for the two notes below. Light mode unless the screen name says dark.

| Row | What happened | Result | Screen |
|---|---|---|---|
| (a) The replace question | Told from Leo Marchetti's page: *"Actually the Pilsen move slipped again, it's December 6 now."* → the sheet "Does this replace what you told me?", "It sounds like news about a line you edited.", the note quoted in the user's own words (the curly-apostrophe form), the Yes choice **"Yes, replace: Leo signed the lease on an apartment in Pilsen and moves in on November 22"**, No, keep both · Don't keep this · Undo · See the note · Not now. Not now left the line alone and the question waiting on Today and on the page. | PASS (note: the long Yes label shrinks to small type to fit one line; a layout point for WS-2, not a copy defect) | `r9-replace-question` |
| (b) Words edit naming a new day | What Kinship knows → Edit on the lease line, words changed to "…moves in on December 6", Save → the same sheet continues to **"Is it now Sun, Dec 6?"** with the 6th pre-set (December 2026 calendar). **Back** returned to the list with the new words kept and the date still **Sun, Nov 15**. A second edit to "December 13" → "Is it now Sun, Dec 13?", tapping the pre-set 13th confirmed: the date token reads **Sun, Dec 13**, the person page's Coming up ledger reads "SUN, DEC 13 · Leo signed the lease … December 13", and Today reads "…moves in on December 13" under "AROUND SUN, DEC 13". The three places agree. | PASS | `r9-date-follow-up-sheet`, `-back-keeps-date`, `-confirmed-knows`, `-coming-up`, `-today` |
| (c) The scrim | Poster name over the photo art on the person page, light and dark; Today's statement over the dawn wash, light and dark. The name and the statement read clearly in both. | PASS (the Today statement seen was the orientation heading, the account's Moment-free state) | `r9-poster-scrim-light`, `-dark`, `r9-today-greeting-handoff-light`, `r9-today-scrim-dark` |
| (d) The redesigned People list | A lettered directory ("L" in the gutter), the pill pair Find someone · Ask your memory, a row per person with the sprig, name and one live line; light and dark. | PASS | `r9-people-directory-light`, `-dark` |
| (e) SUA-1 in the redesigned hand-off sheet | Told *"Leo just got promoted to team lead at his company today."* → the account has two Leos, so "Which Leo do you mean?" (Leo Marchetti · Leo · Someone else); Leo Marchetti → "Kept for Leo Marchetti", a milestone dated Sat, Oct 31. Leo Marchetti's page → Message → "Reach Leo", **"You could invite them to dinner."** beneath the channels (a milestone with a suggestion), Open Messages · Call · FaceTime · WhatsApp. | PASS (seen from the person page's Message; the milestone did not become a Moment on Today the same day, so the Moment-detail path was not re-walked) | `r9-handoff-sua1-and-return-question` |
| (f) The greeting | "Good afternoon, Nora." under the date on Today, from the account's name. | PASS | `r9-today-greeting-handoff-light` |
| (g) The hand-off preview's return question | The Today preview reads "When you're back · **Did you reach Leo?**"; the sheet ends "When you come back: “Did you reach Leo?”". | PASS | `r9-today-greeting-handoff-light`, `r9-handoff-sua1-and-return-question` |

**Checks on this head:** `npx tsc --noEmit` clean (generated `expo-env.d.ts` removed first); `npx eslint app src` 0 errors (138 warnings, none new in kind); `TZ=UTC npx jest --silent` **115 suites, 1116 tests, all pass**; `deno test` **486 passed, 0 failed**; no new migration (the newest is `20261031110000`, applied). Black-box suites were not re-run: no gateway or database file changed since the previous sweep.

**Left behind in the account by this walk:** the replace question for the Pilsen move is still waiting (answered "Not now"); Leo Marchetti has a milestone line and the lease line now says December 13.

**Still not evidenced on the final build:** Pause / Remembered / Resume and merge on the redesigned person page; dark mode, largest text and the 17e width on the screens WS-2 changed after its own pass; Delete account (local Storage stopped); the lock-screen banner tap; the review sheet's "Yes, replace" confirmation itself (only the question was walked, then "Not now").

**(h) Edit > Merge with someone on the redesigned person page, built after merging WS-4 `b0c6ac9`** (the fix: the merge sheet opens only after the name sheet has left, `afterSheets`; WS-2's layout kept). On the "Leo" page: Edit → Their name sheet with "Merge with someone · Remove from People" → Merge with someone → **the second sheet opens** "Who is also Leo?" (Leo Marchetti) → the preview "Merge Leo into Leo?" lists MEMORIES THAT MOVE (seven lines incl. the lease on December 13 and the promotion), THEIR PEOPLE (sister Carla), CONVERSATIONS (Messaged · Oct 31) and "you can undo this for 30 days" → Merge → the page shows **"Merged with Leo · Undo"** with the merged lines under Coming up and the pending question → Undo → "Leo is back in People." → OK → the page took every tap (Undo, OK, back) → People lists both Leos again, Leo Marchetti with his own line. PASS, 1 of 1 (WS-4 saw the defect 2 of 2 before the fix). Observation for WS-4/WS-2: when both entries are called Leo the preview title reads "Merge Leo into Leo?"; it is unambiguous only by the lines listed. Screens `r9-merge-sheet-opens`, `-preview`, `-done-undo`, `-undone-page-takes-taps`, `-undone-people-restored`. WS-4's own `r8-*` screens came in with the merge.

**Checks on this head:** tsc clean, eslint 0 errors, Jest **116 suites, 1117 tests**, Deno 486 (no server file changed).

## Eighth walk: WS-2 `3222c1f` and WS-4 `b0c6ac9` on the merged head (31 Oct; screens `r10-*.png`)

Release rebuild of the head with WS-2 `3222c1f` merged (long choice labels wrap; Pill `wrap`), same account, same method as the seventh walk, iPhone 18 Pro only. The iPhone 17e was not used: it carries WS-2's own account and build, and installing there would have replaced them. Checks on this head: tsc clean, eslint 0 errors, Jest **116 suites, 1118 tests**, Deno 486.

| Row | What happened | Result | Screens |
|---|---|---|---|
| Yes label wraps at full size | Today's pending question → the sheet: **"Yes, replace: Leo signed the lease on an apartment in Pilsen and moves in on November 22"** on three lines at full size, "No, keep both" beside it; light and dark. | PASS | `r10-replace-yes-label-wraps`, `-dark` |
| Pause / Resume on the redesigned page | Leo Marchetti, dark: Edit → Pause → "Pause Leo?" confirm → the page shows a legible **"Paused"** line and the person still appears under Coming up; Edit now offers **Resume** ("Paused · Kinship keeps what it knows about Leo and brings nothing back for now."); light: the Paused line, the sheet, Resume → the line is gone and the page is as before. | PASS | `r10-paused-dark`, `-paused-line-dark`, `-edit-sheet-resume-dark`, `-paused-line-light`, `-edit-sheet-resume-light` |
| Merge with someone, again on this build | Same result as the seventh walk: sheet opens, preview, Merge, "Merged with Leo · Undo", Undo, People shows both. | PASS | `r10-merge-sheet-opens`, `-preview`, `-done-undo`, `-undone-people-restored` |
| Dark mode on late screens | Today ("One thing to check." with the question), the person page and edit sheet, the pause confirmation. All legible. | PASS | `r10-today-dark`, plus the Pause rows |
| Largest text (accessibility XXXL) | Replace sheet: wraps, and **scrolls** so Yes, No keep both, Don't keep this, Undo, See the note, Not now are all reachable (the first screen shows "No, keep both" clipped until scrolled). People: pills, header and tab bar scale. Person: name, buttons and question scale; the three stacked buttons (Message, Call, Tell) leave about a line and a half of scroll area above them. | PASS with two observations | `r10-ax-replace-sheet`, `-scrolled`, `r10-ax-people`, `r10-ax-person`, `r10-ax-today` |

**Observations for WS-2:** (1) at the largest text size the People rows (names and one-line summaries) keep their normal size while the pills and tab bar grow (`r10-ax-people-rows-do-not-scale`); (2) the Person page's fixed Message / Call / Tell stack takes most of the screen at that size. Neither blocks use. **Not run:** the iPhone 17e width, delete account, the lock-screen banner tap, the "Yes, replace" confirmation itself.

## Ninth walk and the final status of the integrated head (31 Oct; screens `r10-*.png`)

WS-4 `bf98556` (the merge preview tells same-named people apart) merged with WS-2 `3222c1f`; Release rebuild installed on the iPhone 18 Pro. Checks: tsc clean, eslint 0 errors, Jest **116 suites, 1119 tests**, Deno 486 (no server file changed).

| Row | What happened | Result | Screen |
|---|---|---|---|
| Merge title | From the "Leo" page, Merge with someone → Leo Marchetti → **"Merge Leo Marchetti into Leo?"** with the body naming each by full name | PASS | `r10-merge-title-disambiguated` |
| Remembered | Leo, Edit → Hold as remembered → confirm ("Everything you've told Kinship about Leo stays… won't bring Leo up on Today or mention a birthday") → the page shows a legible **"Remembered"** line with the lines kept; Edit now offers **Resume** ("Remembered · Kinship keeps Leo's memories and never brings them back.") → "Resume Leo?" → the page returns to normal | PASS | `r10-remembered-confirm`, `-remembered-page`, `-remembered-edit-sheet`, `-remembered-resume-confirm`, `-resumed-page` |

### Natively evidenced on the final head (Release, iPhone 18 Pro; live model for the Tell rows)
- Replace question: "Yes, replace: …" with the user's own quoted words, wrapping at full size, light, dark and largest text (the sheet scrolls).
- A words edit that names a new day: continues to "Is it now …?", Back keeps the words and leaves the date, confirming updates the token, Coming up and Today.
- Scrim on the poster name and Today statement, light and dark.
- Lettered People directory, light and dark; Ask your memory door; greeting with the account's name.
- SUA-1 line in the redesigned hand-off sheet and the real return question.
- Merge with someone (sheet opens, preview, Merge, Undo, page keeps taking taps) and its disambiguated title.
- Pause and Resume, Remembered and Resume, on the redesigned page; dark mode and largest text on Today, Person, People and the replace sheet.

### Not natively evidenced on the final head
- **Delete account** (environment: local Storage stopped; proven in black-box and pgTAP).
- **Lock-screen banner tap** (the simulator lock screen does not route it).
- **iPhone 17e width** on this head (the 17e carries WS-2's own build; WS-2 walked its screens there on an earlier head).
- The confirmation of "Yes, replace" itself on the final head (the question and its label were walked; the told-again Yes route was walked on earlier heads).
- Review sheet with several lines, quiet-day Today, Reduce Motion, the same-day milestone as a Today Moment (held by the one-primary-per-person-per-7-days cap, per WS-3, not a defect).
- FOUNDER-DEVICE: not run.

Observations for WS-2 (non-blocking): at the largest text size the People rows do not scale and the Person page's Message / Call / Tell stack is tall.
