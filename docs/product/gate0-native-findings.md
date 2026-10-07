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
