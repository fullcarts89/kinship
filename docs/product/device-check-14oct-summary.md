# Device check, 14 Oct: issues and recommended fixes

**Build:** app `8a21c5b` (same files as `main` `b9bf364`); ai-gateway deployed from `main` `b9bf364`. The founder ran `reliability-gate-device-checklist.md` and stopped after step 10.
**Readiness:** NOT READY.

## What happened, step by step

| Step | Result | Ledger |
|---|---|---|
| 1. K4 run A | Partly failed. People linked right, but several memories, and the card left out Sam's | K15, K16 |
| 2. Pages agree | Failed. Two lines saying the same thing on Anthony Lopez's and Sam Eden's pages; Chris's page shows Anthony's line but not Sam's | K16, K17 |
| 3. Removal | Not reported | — |
| 4. Told again | Failed. Saved exactly as before; no "looks similar" question | K18 |
| 5. Reopen | Failed for another reason. Today was only a small date and "Good afternoon." | K19 |
| 6. K2 | Not reported | — |
| 7. "I need to call John tonight" | Failed. Nothing on Today after 90+ s, also after leaving and coming back; no pull to refresh; on John's page, "You said you'd" is at the bottom | K20, K21, K22 |
| 8. Return question | Failed. No "Did you reach John?" on Today or John's page | K23 |
| 9–10 | Couldn't run (nothing on Today) | — |

## Issues, causes and recommended fixes

In order of priority.

**1. K20 (P0): "call John tonight" never reaches Today.**
- **Cause:** reproduced for one reply shape. When the model files the note as the user's *plan* for today instead of a *promise* due today, Today never shows it. Coming up starts tomorrow for plans, and today's plans have no other way in. The 13 Oct live replies were all promises, so this shape was never tested. Not yet confirmed as the phone's exact reply.
- **Fix:** anything the user means to do today or tonight (a plan or a promise, due today) shows on Today, with Message / Call and the return question after. Every reply shape the model can give (promise, plan, event) runs through the Today test.

**2. K16, K17, K15 (P0): the K4 note kept as several memories; the card shows only some.**
- **Cause:** not proven. The one-memory rule didn't apply to the phone's reply.
- **What differs from my live runs:** they used "Anthony Test"; your People has "Anthony Lopez", a full name the model may write instead of "Anthony". The pieces may also have come with different kinds.
- **Fix:**
  - Re-run the live model with your exact People and existing lines.
  - Merge one sentence's pieces by the people they're about, so the rule doesn't fail on the model's wording, kind or full names.
  - Pieces of one sentence never link their people differently (K17).
  - The card lists every memory the note kept, including those written by an answer (K15).

**3. K18 (P0): telling the same thing again duplicates it; you asked for a question.**
- **Fix:** when a new line is about the same people and says the same thing as one already kept, the card asks "This looks like something you told Kinship on Oct 13". It shows the earlier and the new line side by side, with four choices:
  - **Keep the earlier one** (the new one isn't kept)
  - **Keep the new one** (it replaces the earlier)
  - **Keep both**
  - **Undo** (forget the note)
- It reuses the existing "Which one does this replace?" question (Gate E), so it's an extension, not a new system.
- Until the question exists, telling it again must join the memory, never duplicate it.
- This is a new surface, so its design gets recorded in `approved-design-coverage.md` with your yes before it's built.

**4. K19 (P1): Today can be a bare header.**
- **Cause (likely):** while a note's card is up or still being understood, Today hides its headline and shows only the lines under it. With no lines, it's just the date and greeting.
- **Fix:**
  - Today never shows a bare header. While a note is being understood, Today itself says so, then shows the result.
  - The date uses one format everywhere ("Wednesday, Oct 14").

**5. K23 (P1): no return question after reaching out from a person's page.**
- **Fix:** reaching out to someone with an open "You said you'd" item, or a Today line, brings "Did you reach John?" on return, on Today and on their page, wherever the hand-off started.

**6. K22 (P1): "You said you'd" is buried at the bottom of the person page.**
- **Fix:** put it first on the person page while it has open items, since it's what the user needs to act on. Recorded as a founder decision in `approved-design-coverage.md`.

**7. K21 (P2): no pull to refresh.**
- **Fix:** pull to refresh on Today and person pages: it syncs, finishes any note still being understood, and refreshes Today.

**8. N11 (P0 for testing): Xcode 27 builds don't launch on iOS 27.**
- **Fix:** adopt the UIScene life cycle (task already queued). Without it I can't run your checklist on the simulator myself.

## How I'll test before asking for your time again
- Every checklist step runs on the simulator first: the real app build, with the live model, your exact People, and lines like the ones already in your account. A build reaches your phone only once every step passes there.
- The live runs cover every shape the model gives for each note, not just the commonest. I'll look for new shapes rather than stop at the first ones.
- The checklist I hand you lists only steps that passed on the simulator, each with the run's evidence.

**Suggested order:** N11 → K20 → K16 / K17 / K15 → K18 (after you approve its design) → K19, K23 → K22 (after your decision) → K21.
