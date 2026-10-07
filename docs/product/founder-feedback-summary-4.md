# Round 4 bugs and recommended fixes

*7 Oct 2026. From your native testing of the build merged in PR #19, plus what was still open before this round. Nothing here is built yet; it waits for your go-ahead. The full notes are in `founder-feedback-4.md` and the screenshots in `screens/feedback4/`.*

**Priority:** P0 = trust or data correctness, or blocks normal use · P1 = clearly wrong or high friction · P2 = polish or new capability.

---

## 1. This round's items, with recommended fixes

### Trust and correctness

| Id | What's wrong | Recommended fix | Pri |
|---|---|---|---|
| **I8** | Reopening Kinship often lands in the **old 1.0 app**; you have to sign out and back in. | **Cause (from reading the code, not yet seen on a phone):** at launch the app asks the server whether the account uses 2.0 and waits at most 4 seconds. With no answer in time it falls back to **1.0**.<br>**Fix:** in the `dogfood-v2` build, a signed-in account always opens 2.0 and never falls back to 1.0. A test proves a slow or failed flag check can't drop you into 1.0. | **P0** |
| **I10** | "Michelle and Sam might be moving to Australia" asked *"Who is this about?"* with **Michelle as an option**, after already saying it was kept for Michelle. | **Cause:** the note became two mirrored lines: one saved on Michelle, plus "Sam might be moving… with Michelle" held because there are two Sams. The H13 duplicate check only merges a mirror into a *saved* line, so a *held* one slips past.<br>**Fix:**<br>- Merge a held mirror into its saved twin too, leaving **one** shared line.<br>- Ask only **"Which Sam?"** (Sam Doughty · Sam Eden · Both · Someone else), never offering someone already resolved.<br>- Say "There are two Sams" instead of "I couldn't tell who this is about".<br>- Hide "Nothing needs you today." behind a waiting question, as was done for the Kept card. | **P0** |
| **I13** | Moving "Wifey has a new job…" to **Kaiya** moved the memory correctly, but the line still says **"Wifey"**. | When you correct the *person*, also correct their name in the line: "Kaiya has a new job…".<br>- Keep "was: ~~Wifey has…~~" (H30); your original note is untouched.<br>- Swap only the wrong person's name, as a whole word.<br>- If the line doesn't name them ("She has a new job"), leave its words alone. | **P0** |
| **I12** | After renaming **Wifey → Cutie Pie**, every line still says "Wifey". The page title is cut to "What Kinship knows about **Cutie**". | **Your choice:**<br>- **(a) Recommended:** lines *show* the current name wherever the old name appears as a whole word. Nothing stored is rewritten, so it's reversible.<br>- **(b)** Rewrite each line, with "Edited by you · was: …".<br>**Also:** use the full chosen name in titles when it's a nickname, not just the first word. | **P1** |
| **I5** | "Susan and Michelle went to Disneyland": the Kept card said **kept for Susan** only. The memory *is* on Michelle's page. | **Display only:** the Kept card names everyone a shared memory belongs to ("Kept for Susan and Michelle"). Confirm against the data first. | **P1** |
| **I11** | You still can't choose **more than one person** for a memory. | In "Who is this about?", allow choosing several people. The memory becomes one shared line across them, like the H5/H13 shared memories. This is the same flow as I10's "Which Sam?". | **P1** |
| **I3** | No way to **remove a person**, e.g. "My daughter Kaiya". It also isn't clear that names can be edited. | **Remove:** "Remove from People" on the person's page, with a confirm step. It's a soft archive, never a hard delete:<br>- notes and sources are kept;<br>- memories shared with others stay with the others;<br>- memories only about this person are archived with them, and can be restored.<br>**Editing:** a visible **Edit** next to the name on the person's page, not only a tappable title.<br>The "My daughter Kaiya" duplicate itself is in the data-cleanup plan and runs only on your yes. | **P1** |
| **I9** | After tapping into a line's details from a Tell's confirmation, you **can't get back** to the confirmation to give other feedback. | Closing the line's sheet returns to the same confirmation, with every other line and Got it right / Not quite still there. Never close both together. | **P1** |

### Friction and layout

| Id | What's wrong | Recommended fix (your approved direction) | Pri |
|---|---|---|---|
| **I6** | The keyboard is **hard to dismiss**, and tapping elsewhere often opens a profile or Tell by accident. | All approved:<br>- a **Done** bar above the keyboard;<br>- **drag down to dismiss**;<br>- **Today / People work** with the keyboard open;<br>- the **unsent draft is kept**;<br>- never needing to tap blank space;<br>- bottom navigation stays. | **P1** |
| **I4** | The Kept card is **a pile of same-weight grey text**; "Add Pedro" is tiny. | Your layout, in sections:<br>- what was kept;<br>- **"Pedro isn't in People yet / Add him so this can appear on his page too"**, with a real **Add Pedro** button and Not now;<br>- **Correct this · Undo** together;<br>- **"Did Kinship get this right?" Got it right · Not quite**, separated;<br>- drop "Tap a line to correct it".<br>Proper tap targets, still Quiet Herbarium (no dashboard). | **P1** |
| **I1** | Tapping a Today item opens the **whole person page**, where the action gets lost. | A **Moment detail** sheet: the line, why now, timing and source, then Message / Call. **View Ben** is secondary and jumps to that line on his page with a brief highlight. | **P1** |
| **I2** | No **interaction history**, and the return loop risks feeling like a CRM. | **Apply "know it, infer it, ask it":**<br>- **Knows it:** a Message from a Moment plus **Yes** records "You messaged · Oct 6 · About getting together this weekend". No type picker.<br>- **Can infer it:** "Did you get together?" plus **Yes** records "You saw Ben and Susan · Game night".<br>- **Doesn't know it:** a manual **Add interaction** gives one tap of Message / Call / Video / In person.<br>**Where it shows:** a small dated trail under Between you.<br>**"Anything worth remembering?":** non-blocking, and only after meaningful contact (a call, seeing someone, a surfaced Moment), never after a routine text.<br>**Never:** counts, "last contacted", streaks or health. | **P2** (new capability) |
| **I7** | When Box was replaced by the rejection, the earlier fact **disappears from the story**. | Build it as part of the approved H15 What Kinship knows. Background shows "Previously interviewed with Box · Ended Oct 6", with the full history on tap.<br>- Never shown next to the current state as if both were true.<br>- If you declined to save the rejection, only "interviewed" shows.<br>New H15 rule recorded. | **P2** (with H15) |

### Small things seen in screenshots

| Id | What | Recommended | Pri |
|---|---|---|---|
| I12b | "Wifey got promoted · Mon, Oct 5" shows **Maybe**. | Check the original note. If it stated it as fact, the uncertainty mark is wrong; fix the rule and add an eval case. | P2 |

---

## 2. Before this round: still open or deferred

| Id | What | Status | Next |
|---|---|---|---|
| **G5** | App froze | **STILL OPEN.** No freeze reported this round. | The new stall telemetry (`app_stall`) will show any freeze of 1 s or more. If none appear across this test cycle, it can be closed once you confirm. |
| N3 | Two "Anthony" people | Deferred | Your call on which one is real (cleanup plan §3). Better handled once I3 (remove) exists. |
| Data cleanup | Kaiya duplicate, Tahoe / Sam-Meesh / wedding duplicates, unlinked Box line | Proposed, **not done** | Only on your yes (`data-cleanup-plan.md`). |
| H15 / H2 | What Kinship knows sections | **Approved, not built** | Next UX phase. Absorbs I7. |
| H16 | Milestone moments | **Approved, not built** | Next UX phase. |
| H4 | Show bring-back in first use | **Approved, not built** | Next UX phase. |
| H3 | Ask Kinship | Roadmap only | Alpha candidate. |
| H8 | Latency | Monitoring | Phone-side timings are now collected. A real p50/p90 report becomes possible after this test cycle. |
| H22 | "August" reading | No change, monitor | — |
| F11, G28, G40 | Carousel, About You, history timeline | Deferred by earlier decisions | — |

**Fixed last round, waiting on your phone check.** 72 items are FIXED but not yet VERIFIED. Your round-4 notes show several working as intended:
- **H21:** Add Pedro was offered.
- **H25:** the Box line was replaced and asked for privacy.
- **H29:** Maybe shows.
- **H10:** "You reached out · Oct 6".
- **H20:** "Kaiya is your daughter", "You and Kaiya are getting ice cream".
- **H1:** rename works, apart from I12.

Tell me which of these you consider confirmed and I'll mark them VERIFIED. **H13** (shared duplicates) did **not** fully hold (see I10), so it reopens.

---

## 3. Suggested order when you say go

1. **P0 trust:**
   - I8: always open 2.0;
   - I10: one line and "Which Sam?";
   - I13: the corrected person's name in the line;
   - plus I12 once you pick (a) or (b).
2. **Fast P1 fixes:**
   - I9: back to the confirmation;
   - I5: names everyone a memory was kept for;
   - I11: choose several people;
   - I3: remove a person and a visible Edit;
   - I6: keyboard.
3. **The Kept card and the loop:**
   - I4: card layout;
   - I1: Moment detail;
   - I2: interaction history.
4. **With the approved H15 work:**
   - I7: Background history;
   - H16;
   - H4.

**One decision needed from you:** I12 option (a) or (b).
