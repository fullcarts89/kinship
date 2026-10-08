# Phase 4 native dogfood: slice 1 (I4 · I6 · I1 · H16 · N8)

*8 Oct 2026. For the founder, on a physical iPhone, on the next build (CC-21). This is a Phase 4 UX and product gate, not an extraction stress test: if a row shows a trust regression, note it and stop that row. Browser renders and tests don't count. Rows move to VERIFIED in `bug-ledger.md` only on your say-so.*

**Readiness: NOT READY.** Phase 4 is not yet ready for this milestone: the build doesn't exist yet and these rows haven't been run. This is not a return to Gate 0 stabilization.

## Before you start (on your Mac, in this order)

1. **Gate 0 deployment verification**, if not done yet:
   - redeploy ai-gateway from `main`;
   - re-run rows 1b, 2, 2b, 3, 5, 5b, 11 and 11b of `gate0-remediation-checklist.md`.

   No new build is needed for this, and this branch changes nothing in ai-gateway.
2. **Merge** this branch into `main` with a merge commit, when you're happy to. Ask me if you want a PR first.
3. **Apply the N8 migration** from `main`:
   ```
   npx supabase db push
   ```
   - It applies `20261009090000_v2_exact_undo`: one new column plus three replaced functions.
   - No stored row changes.
   - It covers notes told **after** the push. An older note isn't linked to a thread it closed, so use new notes for the N8 rows.
4. **Build and install**, when you say so:
   ```
   npx eas-cli build --profile dogfood-v2 --platform ios
   ```

Use test people where a row says so, such as a "Susan" and a "Ben" with phone numbers. Today shows one Moment at a time, and at most one a week per person. If another Moment is already up, the row's Moment may wait its turn: that's Today's ranking working, not a failure.

## I4: the Kept card

| # | Do | Pass when |
|---|---|---|
| 1 | Tell "Susan is getting married to Pedro in the fall" (Pedro not in People) | What was kept reads first. **"Pedro isn't in People yet."** comes below it, with "Add Pedro so this also shows on Pedro's page." and **Add Pedro** · **Not now**, clearly secondary. Then **Correct this · Undo**, then a quiet "Did Kinship get this right?". No "Tap a line to correct it." |
| 2 | Tap **Add Pedro** | Pedro is in People once, and the line also shows on Pedro's page. On another note, **Not now** removes the row and changes nothing |
| 3 | **Correct this**, then back | What was kept opens; back returns to the card (I9) |
| 4 | **Undo** | The note and its lines are gone |

## I6: the keyboard

| # | Do | Pass when |
|---|---|---|
| 1 | Tap Today's Tell field | The keyboard brings one bar: **Today · People** and **Done**. The bottom navigation stays in place, with no second navigation bar on screen |
| 2 | Type a few words, tap **Done** | The keyboard goes; the words stay |
| 3 | Type, tap **People**, then **Today** | People opens straight away; back on Today the draft is still there |
| 4 | People's search | The same bar; **Today** works from there |
| 5 | Drag the keyboard down | It goes, the way iOS keyboards do. The Tell field may stay put until you let go. Only if that feels materially wrong is a keyboard library worth adding (it needs a new build) |
| 6 | Change a line's words (Correct this, or Edit on a person's page), and Tell from a person's page | **Done** puts the keyboard away. One-line boxes keep their return key |

## I1: the Moment detail and View <Person>

| # | Do | Pass when |
|---|---|---|
| 1 | Tap the words of Today's Moment | A sheet with the line in your words, one sentence on why now ("It was yesterday."), when, and its source. No ids, scores or percentages. It explains why it's here |
| 2 | Tap the source line | The note it came from, in a form you understand |
| 3 | **Message** (or **Call**) in the sheet | The sheet leaves first, then Messages or Phone opens. When the contact has no number for it, the hand-off sheet opens instead. Never two sheets at once. Back in Kinship, the return question reads naturally |
| 4 | **View Ben** | Ben's page opens at that exact line, which fades up gently. Try a line far down a long page. With Reduce Motion on (Settings › Accessibility › Motion) it jumps there with a quick fade |
| 5 | View <Person> for an older line that isn't on the page | What Kinship knows opens at that line |
| 6 | Tap a Coming up line (a birthday, a plan, a promise due) and a "Waiting on…" line | The same kind of sheet, with a fitting why ("Maya's birthday is tomorrow.", "It's due on Thursday.") |

## H16: milestones (and N7)

| # | Do | Pass when |
|---|---|---|
| 1 | On a person with no Moment this week, Tell "Anthony's wedding is on Saturday" (3 days away or fewer) | Today can show it in your words, with "Saturday · Sat, Oct …" and **Message Anthony**. After the hand-off: "Did you reach Anthony about the wedding?" |
| 2 | The next days | It doesn't come back, and nothing nags |
| 3 | Tell "Anthony and Natalia are getting married next spring" | Remembered quietly. No Moment, and nothing asks for the date |
| 4 | Tell "Ben's sister's wedding is Saturday"; then "Susan lives in Denver now" (after Alameda) | No milestone Moment for either: not a relative's, and a residence change is never a move |
| 5 | Tell "Ben got promoted in 2024" | No good-news Moment today. "Ben got promoted!" with no date can be today's news |

## N8: Undo restores what was there (after the `db push`)

| # | Do | Pass when |
|---|---|---|
| 1 | Tell "Josh's interview is tomorrow". When its Moment is up, Tell "Josh's interview moved to Monday", then **Undo** that note | "Josh's interview is tomorrow" is current again, and its Moment can come back on Today (reopen the app if needed). If Today was busy with another Moment, check the line on Josh's page |
| 2 | As 1, but tap **Not now** on the Moment before the second note | After Undo the line is back, and the Moment stays put aside |
| 3 | Tell "Ben is waiting to hear back about the Stripe job", then "Ben got the Stripe job!", then **Undo** | The waiting line leaves Ben's Lately when the job note closes it, and is back after Undo. If it never left, Kinship didn't read the note as closing it: note that, but it isn't an N8 failure |

"Another live closer prevents restoration" isn't a phone row: the database tests prove it against the real migration (pgTAP `60` and `66`).

**While you're in there:** note anything about Today comprehension, Moment usefulness, actionability, friction in the return loop, and how a person's page hangs together (CC-21, low-coaching direction). Confusion is evidence.

Not in this build: I2's trail, H4's Bring back, and H15's sections. B1 has nothing visible yet.
