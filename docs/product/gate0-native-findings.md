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
