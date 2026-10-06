# Founder feedback summary 3 — native pass on the stabilization build

*6 Oct 2026. Covers H1–H30, from the founder's testing after PR #18 was merged and ai-gateway was deployed. The full log is in `founder-native-feedback.md` (round three); screenshots are in `screens/feedback3/`.*

**Status:** logged only, nothing built.

**About the causes:** every "likely cause" below is a reading of the code as I know it from building it. None was confirmed against your data or reproduced, so the first step of any fix is to reproduce it. Effort is a rough guess: S = hours, M = about a day, L = several days or needs design.

**Readiness: NOT READY** for wife dogfood. The P0 items break trust in what Kinship remembers.

---

## What's working (keep it)

- A fact told on Susan's page about Natalia was filed to Natalia.
- "Natalia got rejected" was held for your yes as personal, which you called a good privacy callout.
- "August" wasn't assumed to be this past August.
- "Not moving to Oakland anymore" closed the earlier move.
- "Which Sam?" was asked.
- The zoo line read naturally: "You and Kaiya are going to the zoo", Sun, Oct 11.
- Lately and Coming up work for you.
- Latency feels substantially better (H8).

---

## P0 — Trust: wrong person, wrong owner, or contradictions

| # | Bug | Likely cause | Recommendation | Effort |
|---|---|---|---|---|
| **H28** | "Tyler promised to send me his contractor's number Friday" was filed as **your** promise, and the review can't change whose promise it is. | **Regression of G35.** The someone-else's-promise rule catches "said he'd send me" but not "promised to send me". | Widen the rule to cover "promised (to) / will / is going to … me", and add eval fixtures for each phrasing. Add a **"Whose promise?"** correction in the review sheet (yours or theirs), like the person correction. | S + S |
| **H12** | Sam Doughty's page still asks you to confirm items you already filed under Sam Eden (Stripe job, married to Michelle). | Pending questions or "Is this the…?" suggestions are matched by first name and aren't cleared once a who-answer files the item to the other Sam. | When a who-answer is given, clear every pending question and suggestion for that item on every page. Never show a question on a person's page once the item belongs to someone else. Add a regression test with two Sams. | M |
| **H20** | "My daughter Kaiya and I are going to the zoo" asked "Is **My daughter Kaiya** someone new?". It then created a person named "My daughter Kaiya", although Kaiya is already your daughter. | The whole phrase "My daughter Kaiya" was taken as the name. The relation words weren't stripped, and the result wasn't matched to the existing Kaiya. | Strip "my / our + relation word" before matching names. Match "my daughter" to the person whose stated relationship is daughter, then to the name. If one person fits, file it without asking. Never offer "Add" with a relation word in the name. | M |
| **H25** | "Natalia is no longer interviewing with Box (rejected)" didn't remove "Natalia is interviewing with Box". | The update was held for your yes (sensitive), and the replace step probably doesn't run when a held item is confirmed. | When a held item is confirmed, run the same compare-and-replace as for a saved one. Add a test: a sensitive cancellation closes the earlier line after a yes. | S–M |
| **H13** | "John and Ben went to Tahoe" and "Ben and John went to Tahoe" are two lines on John's page (screenshot). | Each is a shared memory filed under a different person. The duplicate check only runs within one note, not across notes. | Compare against existing shared memories for **all** the people involved, in any word order. Offer a one-time merge for the existing duplicates in your account, with your yes. | M |
| **H17** | "John and Ben are my brothers" said it will remember John is your brother. It should already know from "Ben is the youngest brother of me and John". | The new statement isn't compared with relationships already on record. | When a stated relationship matches what's known, say so ("Already known: John is your brother"). When it differs, ask which is right. | S–M |
| **H21 / H5** | "Susan is getting married to Pedro" didn't ask who Pedro is. The Anthony + Natalia wedding only captured Anthony. | A named person not in People is only offered "Add …" in some phrasings. Shared events need everyone already in People. | For a shared event or relationship, offer "Add Pedro" for any named newcomer. Store the newcomer's name on the memory until they're added. | M |

## P1 — Lifecycle and Today

| # | Bug | Likely cause | Recommendation | Effort |
|---|---|---|---|---|
| **H10 / H11** | "Congratulate Ben" → Message → back: the card is gone and nothing is recorded. After a force quit, the Congratulate cards for Ben, Sam and the Oakland home all come back. | The dismissal is kept only for the session, and opening Messages is treated as done. | When you return from Messages, show a light "Did you send it? · Yes · Not yet". Store the answer: Yes records a quiet "You reached out · Oct 6" on the person page; Not yet keeps the moment. Store dismissals so they survive a restart. | M |
| **H18** | "Did you reach out to Ben?" doesn't say why. "Anything to tell Kinship about Ben?" reads as unrelated. | The follow-up doesn't carry the reason it came from. | Name the reason: "Did you congratulate Ben on his promotion?" Make the follow-up prompt about that conversation: "How did it go?" | S |
| **H26** | Your promise "I'd send Chris that restaurant Wednesday" didn't appear in Coming up. | Your own dated promises may not feed Coming up the way events do. | Your dated promises go in Coming up, worded "You said you'd send Chris…". | S |
| **H27** | After Tyler's promise appeared in Coming up, the zoo trip (Sunday) disappeared. | A cap on how many Coming up lines show, or one replacing another. | Show everything in the next 7 days, sorted by date. If there are too many, collapse to "and 2 more", but never drop one silently. | S |
| **H9** | On first sign-in, "Tell Kinship something" flashes, then Today. | First use is decided before your existing data has synced. Same family as the consent flash (G15). | Wait for the first sync, or a stored "has data" flag, before choosing first use versus Today. Show the paper splash until then. | S |
| **H19** | On Today, the Kept card for Ben's promotion sits right under "Saturday · Ben wants to play games", so it looks like part of that entry (screenshot). The headline still says "Nothing needs you today." above it. | The Kept card is placed in the same column as Coming up, with no separation. | Pin the Kept card above Today's sections (or by the Tell field) with clear separation. Don't say "Nothing needs you today" while a card is showing. | S |

## P1 — Showing changes and sources

| # | Bug | Likely cause | Recommendation | Effort |
|---|---|---|---|---|
| **H23** | The Oakland cancellation is correct but subtle. On Susan's page, "no longer moving to Oakland" and "not moving to Alameda anymore" read as current news (screenshot). | Updates show only as a small grey "Updates: …" line. | In the review: "Replaces: ~~Susan is moving to Oakland in August~~". On the page: show the change as one line, e.g. "Not moving to Oakland after all (was August)", not as a new current fact. | S–M |
| **H30** | Editing "really happy" to "really not happy" kept the new line but lost the original Tell and the fact that it was corrected. | An edit keeps the replaced text but not the original source on the new line. | Keep the original source and add "Edited by you · Oct 6". In the line's sheet, show the old wording struck through. | S–M |
| **H14** | Force-quit right after a Tell: the fact was kept but has no "You told Kinship · Oct 6" line. | The source note hadn't reached the phone's local store when the app was killed. | Fall back to the memory's own date and fetch the note on the next sync. Never show a line with no source. | S |
| **H19b** | On person pages, sharing one source line across a group makes unrelated lines look like one (Susan's Meta line). | My last pass's change: show the source line once per group. | Revert to one source line per memory, or group only lines from the **same note**. | S |
| **H24** | On Susan's page, a note about Natalia showed "Understanding… Susan" while it waited. | The waiting card names the page's person before the reading is known. | Say "Your note" until it's understood. | S |
| **H29** | "Wifey might be moving to Seattle" was saved with no sign that it's uncertain. | Hedged wording is kept, but there's no marker and no follow-up. | Mark tentative lines in the review ("Maybe", from your own words). Optionally follow up later on Today ("Is Wifey still thinking about Seattle?"). | S |

## P2 — Bugs from the first batch

| # | Bug | Recommendation | Effort |
|---|---|---|---|
| **H1** | Can't edit a person's name after creation. | Add "Edit name" to the person page actions, using the existing person correction screen. It also cleans up the "My daughter Kaiya" record. | S |
| **H6** | No quick way to say whether Kinship understood correctly. | A one-tap "Got it right / Not quite" on the Kept card, recorded with the note for review (content stays private). This also feeds H7. | S–M |
| **H8** | Latency: monitor, don't optimize. | Read the new send → understood → shown timings from your next session before changing anything. | — |

## Needs your decision (product direction)

| # | Ask | My recommendation |
|---|---|---|
| **H15** | Group what Kinship knows about a person into sections (interests; something for aspirations, a better word than "goals"). Keep Lately and Coming up. | Worth doing, but it changes the approved person page. Suggest a small fixed set: **Lately · Coming up · Into** (interests, tastes) · **Hoping to** (aspirations) · **Background**. Sections are filled by the category the model already returns, so no new model call is needed. Needs a design and an entry in `approved-design-coverage.md`. |
| **H16** | Recognise big milestones (wedding, home, new job, baby, graduation) and follow up on missing details (when, where). | Do it with fixed rules, not the model: a milestone list plus a template of the details that matter for each. Missing details become one gentle question on Today a day later ("Do you know when Anthony and Natalia's wedding is?"), and the moment comes back near the date. No extra model cost. |
| **H2** | Make everything Kinship knows easier to inspect. | Combine with H15: sections give the overview, and each line's sheet shows its history. Still no timeline UI. |
| **H3** | People naturally ask recall questions ("what's John into?"). | This is evidence for Ask Kinship, but it's on the "do not build" list. Cheapest first step: search over memories in the People search. |
| **H4** | The value of bringing things back isn't obvious. | Have first use show one example of a moment ("Ben's race is Sunday — he was hoping to break four hours"), then point to Today. |
| **H7** | Dogfood notes should feed the eval set. | Only with consent: "Not quite" notes (H6), stripped of identifying details, become fixtures through a manual review step. |
| **H22** | "August" became 2027 with no check. | It's a reasonable reading. Optionally ask only when the month is within about 2 months of today in either direction. |

---

## Suggested order for the next pass

1. **P0 trust fixes:** H28, H12, H20, H25, H13, H17, H21/H5. Each needs a regression test, and H28/H20 need eval fixtures.
2. **Today and the reach-out loop:** H10/H11 with H18, then H26, H27, H9, H19.
3. **Showing changes and sources:** H23, H30, H14, H19b, H24, H29.
4. **Name edit and feedback:** H1, H6.
5. **Then decide** on H15/H16 (design) before building them.

**Data clean-up needing your yes:**
- The "My daughter Kaiya" person.
- The duplicate Tahoe lines.
- The older duplicate Christmas items.

## Screenshots

| Item | File |
|---|---|
| H13 Tahoe duplicate on John's page | `screens/feedback3/h13-john-tahoe-duplicate.png` |
| H19 Kept card under Coming up on Today | `screens/feedback3/h19-today-kept-card-under-coming-up.png` |
| H20 "Is My daughter Kaiya someone new?" | `screens/feedback3/h20-kaiya-someone-new.png` |
| H20 "Kept for My daughter Kaiya" | `screens/feedback3/h20-kept-for-my-daughter-kaiya.png` |
| H23 Susan's Oakland cancellation | `screens/feedback3/h23-susan-not-moving-oakland.png` |
