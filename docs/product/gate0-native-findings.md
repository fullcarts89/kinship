# Gate 0 native findings (founder testing the Gate 0 build)

*Logged as they arrive. **Logged only:** nothing gets fixed from this file until the founder says so. Statuses live in `bug-ledger.md`. The checklist being run is `gate0-native-checklist.md`.*

---

## 7 Oct, 2:23 pm

### I12 — Today still shows the old name; the action label uses a short name

**Screenshot:** `screens/feedback4/g0-i12-today-congratulate.png`.

**What the screen shows:**
- **The Today headline** reads **"Wifey got promoted"** (Mon, Oct 5).
- **The action button** reads **"Congratulate Cutie"**.

The person is now "Cutie Pie", so neither label is right.

**Expected after the I12 fix** (`8d43264`, option A):
- the headline reads "Cutie Pie got promoted";
- the button reads "Congratulate Cutie Pie".

**Likely explanation (not yet confirmed).** Checklist step 1 for I12 (`gate0-native-checklist.md`) says the Cutie Pie rename happened **before** the fix, so nothing recorded "Wifey" as her earlier name and nothing marked "Cutie Pie" as a name you chose. The one-time step is: **rename her to Wifey, then back to Cutie Pie**.
- **Without that step,** this screen is exactly what the fix predicts:
  - the old name stays, because there's no record of it;
  - the name is cut to its first word, because a record that doesn't say how the name was given keeps the old first-name reading.

**Status:**
- **If the rename-and-back step was already done** when this was taken, I12 is **re-seen** and goes back to STILL OPEN.
- **If not,** do the step and re-check this exact Today Moment. Only a failure after the step reopens it.

Either way, it is still worth asking whether a person renamed *before* the fix should be repaired without that manual step. Today that affects only the founder's account, since rename never shipped outside dogfood.

---

## 7 Oct, 2:25 pm

### J1 — "He loves Susan" told on Pedro's page asks "Who is 'he'?" and doesn't offer Pedro

**Screenshot:** `screens/feedback4/g0-pedro-he-loves-susan.png`.

**What happened:**
1. On **Pedro's** page (empty: added from the "Add Pedro" flow), the founder told "He loves Susan".
2. Kinship asked **"Who is 'he'?"**, quoting "He loves Susan".
3. It offered **Susan Oxnard** (shown as the filled, primary choice) and **Someone else**.
4. **Pedro was not offered.**

The founder notes Pedro has no phone number in the app.

**Expected:**
- A Tell from a person's page about "he/she" with no other candidate means **that person**. No question; "Pedro loves Susan" is filed on Pedro, and shared with Susan if appropriate.
- If Kinship did need to ask, the page's person must be among the choices.
- **Susan should never be offered for "he"**, and never as the default. She is the object of the sentence, not the subject, and the pronoun doesn't fit her.

**Severity:** P0 (trust). Kinship asked about the obvious subject, suggested the wrong person as the default, and left out the right one.

**Hypotheses for triage (not investigated):**
- **The page context isn't used.** The page's person may not reach the gateway as the default subject for a Tell started on their page, or is ignored when they have no memories yet.
- **Pedro isn't a candidate yet.** He was just created by "Add Pedro" and may not have synced to the server before the note was understood.
- **Candidate generation.** It lists people *named* in the note (Susan) and doesn't exclude the object of the sentence.
- **The phone number is probably irrelevant**: a person needs no number to be resolved. Confirm.

**Related:** G23 ("Both" for he/she), H24 ("Your note" while understanding on a person's page), I10 (offering an already-named person as a choice).

---

## 7 Oct, 3:37–3:41 pm

### J2 — Correcting the person: no way to add someone who isn't in People

**Screenshots:** `screens/feedback4/g0-j2-kept-ben-new-job.png`, `g0-j2-picker-no-josh.png`.

**What happened:**
1. The founder told something about Ben ("Ben starts a new job", Mon, Oct 12, kept for Ben Oxnard).
2. On the confirmation they tapped the person to move it to **Josh**, who isn't in People or in Contacts.
3. "Who is this about?" shows a search field. Typing "Josh" gives **"No one by that name yet."** and nothing else.
4. The only way out is **Back**.

**Expected:**
- When the typed name matches no one, the picker offers **Add Josh**: one tap, which creates the person (typed, so no number is needed) and moves the line to him.
- With I13, the line then reads "Josh starts a new job", with the earlier wording kept as history.
- Creating a person stays the user's explicit choice, as it is for "Add Pedro" (H21), "someone new is added only when the user says so".

**Severity:** P1. Correction is a dead end for anyone not already in People.

**Related:** H21 (Add Pedro, named newcomers), I3 (people management), I11 (several people), I13 (the subject's name follows a correction).

### J3 — Today → person page: highlight the line that was tapped

**Screenshots:** `screens/feedback4/g0-j3-today-coming-up.png`, `g0-j3-ben-page.png`.

**What happened:**
1. On Today, the founder tapped Coming up **"MONDAY · Ben starts a new job"**.
2. It opened **Ben's page**, which has a lot on it.
3. The line they tapped ("Mon, Oct 12 · Ben starts a new job", at the bottom of Coming up) isn't emphasised or scrolled to, so they have to find it.

**Founder's ask:** highlight the item you tapped when you land on Ben's page.

**Fit with the approved plan:**
- This is the deep-link half of **I1** (CC-18): "'View Ben' deep-links to the relevant memory on the relationship page and briefly / quietly emphasizes it".
- I1 also puts a **Moment detail** between Today and the page; that's Phase 4.
- **Interim option (founder to choose):** before I1, a tap on a Today / Coming up line scrolls Ben's page to that line and briefly, quietly emphasises it. That means a soft fade, no badge or colour block, and respecting Reduce Motion. Today's Coming up lines already carry the memory's id, so this is small.
- **Status:** DEFERRED with I1 (Phase 4) unless the founder wants the interim now.

### Also visible in these screenshots (noticed, not reported; for triage)

- **Ben's dog Mochi's vet appointment (Fri, Oct 9) is on Ben's Coming up but missing from Today's Coming up.**
  - **Likely cause** (from the code, not checked against the data): Today leaves out anything marked sensitive (`sensitivity` other than "none"), and the person page doesn't. A vet visit may have been classed as health.
  - **Question:** should a pet's vet appointment count as sensitive health? Probably not; a person's medical appointment would.
- **"Nothing needs you today." shows behind the "Here's what I'll remember" sheet** (3:37 screenshot). G27(a) / H19 removed it behind the inline Kept card. This sheet may need the same treatment. It's a possible re-sighting of G27(a); its status is not changed until the founder confirms.
- **"Tap any underlined word to change it."** is still on the confirmation. This is instructional copy that I4 (Phase 4) replaces with "Correct this"; not new.

---

## 7 Oct, 3:43–3:44 pm

### I12 — re-seen: after two more renames, every line still says "Wifey"

**Screenshots:** `screens/feedback4/g0-i12-boo-boo.png`, `g0-i12-loo-loo.png`.

**What happened.** On the Gate 0 build the founder renamed **Cutie Pie → Boo Boo**, then **Boo Boo → Loo Loo**.
- **Works:** the page title and "What Kinship knows about Loo Loo" show the full new name. That half of the I12 fix holds: full names in titles.
- **Fails:** every line still says **"Wifey"**: "Wifey got promoted · Mon, Oct 5", "Wifey said she might be moving to Seattle…", "Wifey is thinking about moving to Marin next summer".

**Status: I12 → STILL OPEN** (re-seen on device; ledger updated). This also answers the earlier 2:23 pm entry: the founder didn't do the rename-to-Wifey-and-back step, and shouldn't have to.

**Cause** (from reading the code; no data was queried):
1. Before the fix, her contact name was **"Wifey Liu"** and her notes said "Wifey".
2. The **pre-fix** rename to "Cutie Pie" overwrote both her display name and her full name, so "Wifey" no longer exists anywhere in her record. It survives only inside her lines' words.
3. The fix (`8d43264`) learns earlier names **only at rename time, from the record**. Renaming Cutie Pie → Boo Boo → Loo Loo recorded "Cutie Pie" and "Boo Boo", never "Wifey". So nothing tells the app that "Wifey" in her lines means her.

**This isn't only old data.** The same gap hits any nickname used only in notes.
- Example: a contact "Elizabeth Chen", whose notes say "Liz got promoted".
- Renaming her to "Lizzie" records "Elizabeth Chen" and "Elizabeth", never "Liz".
- So "Liz got promoted" never updates.
- Learning names at rename time can't cover words the record never held.

**Recommended direction (for the next Gate 0 iteration; CC-18 already prefers structured references):**
- **Going forward:** each line keeps, as structured data, the words it used for its person (e.g. "Wifey"), recorded when it's understood. Display swaps exactly those words for the person's current name, whatever the rename history. Source keeps the original note.
- **Lines already stored:** fill that in once from what is already known. Candidates are her own lines' leading name (guarded: never a word that is another person's name, never a pronoun or "You"), or the stored review data, whichever is reliable. This needs its own tests and never guesses across people.
- **Her record only, if wanted sooner:** add "Wifey" as one of her earlier names. That is a change to the founder's data, so it needs an explicit yes. The no-data-change workaround is the checklist step: rename her to Wifey, then back to Loo Loo.

**Native check after the fix:** with **no manual step**, her page, What Kinship knows and Today read "Loo Loo got promoted" (and "Congratulate Loo Loo"); Source still shows the original "Wifey…".

---

## 7 Oct, 3:49 pm

### J4 — "Wifey got a raise" → "Nothing to remember in that one." The memory was silently dropped

**Screenshot:** `screens/feedback4/g0-j4-wifey-raise-nothing.png`.

**What happened.** The founder told **"Wifey got a raise"**. This is the second half of checklist row 4 (I12). Kinship answered **"Nothing to remember in that one. Your note is saved."** and kept nothing.

**What the gateway did.** I made one read-only query of the **content-free** call log (`ai_calls`: no user id, no text, no names), for 7 Oct 22:30–23:05 UTC.
- The 3:49 pm call (22:49:22 UTC) shows: result **nothing**, items saved 0, held 0, **dropped 1**, drop reason **`invented_relation`**.
- Another call at 3:53 pm (22:53 UTC) was dropped the same way, presumably a retry. The log can't say what it said.

**Cause** (from that log and the code):
1. "Wifey" is no longer a name Kinship knows. That's the I12 gap above: the pre-fix rename erased it from her record, and the later renames never learned it.
2. With no "Wifey" among her names, the model read "Wifey" as the word **wife** ("your wife got a raise").
3. The pipeline's guard against made-up relationships (`inventedRelations`, `pipeline.ts`) saw "wife" stated nowhere in the note and in no relationship on record. So it dropped the item.
4. One dropped item and nothing else means the user is told "Nothing to remember".

**Why it's P0.**
- A real, meaningful memory was lost.
- The app told the user something false ("nothing to remember").
- The guard did its job (it didn't save an invented "wife"), but dropping the *whole* memory is the wrong fallback. "Silence beats a wrong detail" means not saving a wrong detail. It never means losing the right one without a word.

**Expected:**
- **With I12 done properly** (Wifey as one of her earlier names, or a structured mention), the note is filed on her as "Loo Loo got a raise", with Source "Wifey got a raise".
- **Whatever the name situation**, a memory whose person can't be resolved is **never dropped as "nothing"**. Kinship keeps the words as said ("Wifey got a raise") and asks **"Who is Wifey?"**: the people it could be, Someone new (Add Wifey), and Don't keep this.
- A relation word the model invented is removed from the wording, not used as a reason to throw the memory away.
- **Copy:** "Nothing to remember" is only for notes with genuinely nothing in them. It must never follow a dropped memory.

**Related:**
- **I12:** the same root cause, now proven by the checklist's own row 4.
- **J1:** a person-resolution miss on Pedro's page.
- **J2:** no way to add someone new while correcting.
- **The drop guards** (`invented_name`, `invented_relation`): when a guard drops the only memory in a note, it should become a question instead.

### J4 (continued, 3:54 pm) — founder's additions

**Screenshot:** `screens/feedback4/g0-j4-nothing-again.png`. The same "Nothing to remember in that one. Your note is saved." on the 3:53 pm note, which the call log shows was also dropped as `invented_relation`.

**1. Even if Wifey really were someone new, there must be a way to add her.**
- A note naming someone Kinship doesn't know never ends without **Add Wifey**.
- Same rule as H21 ("Add Pedro") and J2 ("Add Josh" while correcting).

**2. "Your note is saved" is wrong here (founder).**
- The words are stored on the server, but in practice nothing is saved from the user's point of view:
  - the card offers only **Undo**;
  - once closed, the note is attached to no one;
  - the 2.0 app has **no place to find a note** that produced no memory (checked: no notes list in the app; Source opens only from a memory's line).
- So the sentence claims something the user can't see or verify.

**Recommended (copy needs the founder's yes, since it's part of the approved post-Tell contract):**
- **When a memory was dropped by a guard, or its person is unknown:** never this card. Ask instead ("Who is Wifey?", with Add Wifey, the people it could be, and Don't keep this). See J4 above.
- **When a note genuinely holds nothing to remember** (e.g. "testing"), say only **"Nothing to remember in that one."**. Either drop "Your note is saved", or keep it only together with a **See the note** link that opens the note, so the claim is true and checkable.

---

## 7 Oct, 4:01 pm

### J5 — Swiping down doesn't close a line's detail sheet

**Screenshot:** `screens/feedback4/g0-j5-line-sheet-swipe.png`. The "Ben starts a new job" sheet ("Edit the words", who · when · what, Not this / Done), opened from Ben's page.

**What happened.** The sheet shows a grabber at the top, which promises drag-to-close, but swiping down doesn't close it.

**Likely cause** (from the code, not checked on a device):
- In the shared sheet (`src/ui/Sheet.tsx`), the drag-to-close gesture listens **only on the thin strip around the grabber**, roughly the top 50 pt.
- A downward swipe that starts anywhere else (on the line, its tokens, or the buttons) goes to the sheet's scroll area, which takes the drag and does nothing.
- iOS sheets close on a downward drag from anywhere while their content is scrolled to the top.
- Because every sheet uses this component, the same likely applies to the review, the hand-off, the pickers, and the others.
- **If it also fails when dragging from the grabber itself,** there's a second problem. Worth checking in the native pass.

**Expected:**
- A downward drag from anywhere on a sheet closes it, as long as its content is at the top. A drag inside scrolled content scrolls first.
- The sheet follows the finger and springs back on a short drag, as it does now from the grabber.
- Closing a line's sheet opened from a confirmation returns to that confirmation (I9).

**Severity:** P1. Not a dead end (Done, and a tap above the sheet, still close it), but the most basic native gesture fails on the most-used surfaces.

**Related:** I6 (keyboard and drag-to-dismiss behaviour, approved for Phase 4), I9 (returning to the confirmation).

---

## 7 Oct, 4:04 pm

### J6 — "and 1 more" on the Kept card can't be opened

**Screenshot:** `screens/feedback4/g0-j6-kept-and-1-more.png`.

**What happened.**
- Tell: "John and Ben like to play dress up but are thinking about quitting the hobby."
- The Kept card ("HERE'S WHAT I'LL REMEMBER") lists:
  - "John likes to play dress up";
  - "Ben likes to play dress up";
  - "John is thinking about quitting dress up";
  - then **"and 1 more"**.
- The founder assumes the fourth is Ben's, but can't tap "and 1 more" to check.

**Cause (confirmed in the code):**
- The Kept card (`KeptCard`, `src/features/tell/TellDock.tsx`) shows the first **three** lines.
- **"and N more" is plain text, not a control.**
- Tapping one of the three *shown* lines does open the full review with every line, but nothing on the card says so. The only visible hint is "Tap a line to correct it.", which reads as editing, not viewing.

**Expected:**
- **"and 1 more" is a real control** with a proper tap target. It either expands the card in place to show the rest (as Today's Coming up "and N more" does, H27) or opens the full review with every line.
- The card is where the user checks what was kept, so **no kept line may be unreachable from it**.

**Severity:** P1. The user can't verify what Kinship kept, which is the card's whole job.

**Related:** I4 (the Kept-card hierarchy, Phase 4; "Tap a line to correct it" is still here), H27 (Coming up's "and N more" expands in place).

**Also noticed (a product question, not a bug).**
- The note was kept as **four one-person lines**: John likes…, Ben likes…, John is thinking about quitting…, (Ben is thinking about quitting…).
- It was not kept as **two shared lines** ("John and Ben like to play dress up", "…are thinking about quitting"), each on both pages, which is the H5 shape used for "Anthony and Natalia are getting married".
- **Question for the founder:** is a hobby two people share one shared line on both pages, or each person's own line? Per-person suits What Kinship knows › Into (H15); shared halves the lines on the card.

---

## 7 Oct, 4:12 pm

### I13 — re-seen on another path: answering "which person?" with someone else keeps the old name

**Screenshot:** `screens/feedback4/g0-i13-dbz-chris.png`.

**What happened:**
1. The founder told **"Anthony and Sam love watching Dragon Ball Z"**.
2. People has two Anthonys ("Anthony", "Anthony Lopez", N3) and two Sams (Sam Doughty, Sam Eden).
3. The content-free call log shows the note came back **held** twice, at 4:08 and 4:09 pm: result *clarify*, 2 held, 0 saved.
4. The founder answered with **Someone else → Chris**.
5. The confirmation now reads "KEPT FOR CHRIS", with **"Anthony loves watching Dragonball Z"** and **"Sam loves watching Dragonball Z"**, both on Chris.

**Status: I13 → STILL OPEN** (re-seen on device; ledger updated).

**Cause (confirmed in the code):**
- The I13 fix (`d5f4586`) renames the subject only when a **saved line** is moved to another person (`Understanding.correct` → `withSubjectMoved`).
- Answering a **held** "who is this about?" question goes through the server's answer path instead (`resolve.ts`). There, the line's words change only when they start with **He / She / His / Her** (`withSpokenName`, `voice.ts`). A leading **name** that isn't the chosen person ("Anthony…") is kept.

**Expected (CC-18 I13 rule, on every path that sets who a line is about):**
- The line stops naming the wrong person: **"Chris loves watching Dragon Ball Z"**. The earlier words are kept as history, and the note is untouched.
- **If the person chosen goes by the name in the line** (e.g. "Sam" → Samantha Lee, who goes by Sam), the name stays.
- **When two lines become the same line on the same person** (both are now "Chris loves watching Dragon Ball Z"), they collapse into one.

**Native check after the fix:** repeat exactly this. Expect one line on Chris that names Chris, with "was:" history on the line's sheet.

---

## 7 Oct, 4:19 pm

### J7 — Sam's page asks "Is this the Sam…?" about a line the founder already said is about Chris

**Screenshot:** `screens/feedback4/g0-j7-sam-eden-dbz.png` (Sam Eden's page).

**What happened.**
1. After answering "which Sam?" with **Someone else → Chris** (I13 entry above), the founder opened **Sam Eden's** page.
2. It asked whether this was the Sam who loves Dragon Ball Z.
3. In the screenshot the line "Sam loves watching Dragonball Z" now shows in **Sam Eden's Lately**, so it is linked to him. The founder can say whether that came from answering the prompt.

**Cause (confirmed in the code):**
- The person page's "Is this the Sam in '…'?" suggestions (`src/features/person/links.ts`, added for G20/G34) look for any memory filed on someone else **whose words name this person's first name**.
- They skip it only if the name already belongs to someone on the memory.
- Because the line still says "Sam" (the I13 answer-path gap), and Chris isn't a Sam, the suggestion fires on **both** Sams' pages. "Anthony loves…" will do the same on both Anthonys'.

**Why it matters (trust).**
- The user's decision wins (contract §7, invariant 4).
- The founder said explicitly that this line isn't about a Sam; Kinship asks again anyway.
- One tap on Yes pulls the memory onto a person the user already ruled out.

**Expected:**
- **With I13 fixed on the answer path,** the line reads "Chris loves…", and nothing names a Sam.
- **Independently:** once the user has said who a line is about (answered a "who" question, picked Someone else, or corrected the person), name-matching suggestions never re-ask about it on another person's page.

**Severity:** P1.

**Related:** I13 (answer path), H12 (the other Sam's page), G20/G34 (the purpose of the link prompt: someone added after they were mentioned).
