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
