# Kinship 2.0 — Native Trust + Memory Stabilization Pass: summary

*6 Oct 2026. Covers everything done after the second native pass's feedback (G1–G43, logged in `founder-native-feedback.md`) was handed over to be fixed under the "Native Trust + Memory Stabilization Pass" brief.*

**Where it stands:** merged to `main` as [PR #18](https://github.com/fullcarts89/kinship/pull/18) (merge commit `74647de`). **ai-gateway is not deployed yet.**

**Readiness:** **READY FOR FOUNDER NATIVE PASS** once ai-gateway is deployed. Until then the phone talks to the old server.

---

## 1. Root causes (what actually caused the bugs)

| Theme | Feedback | Root cause | Status |
|---|---|---|---|
| Confirmation bouncing away; no confirmation after "which Sam?" | G19, G29 | The old flow closed the sheet when the review went briefly empty during a sync. An answer given while the sheet was off screen finished the note. **Reproduced** against the old code. | Fixed |
| "Nothing happened" after a Tell | G11, G24 | "John and Ben are brothers" was dropped by a guard that didn't handle plurals. The Warriors note was dropped because "every playoff game" isn't a date. A note with nothing to keep showed nothing at all. Confirmed in data. | Fixed |
| 30-second wait, no result | G4 | The server finished in 8 s. A phone request with no timeout most likely stalled. **Inferred, not reproduced.** | Fixed (20 s timeout + retry) |
| App froze | G5, G14 | **Not found.** | Mitigated only: no sheet opens or closes on refresh, never a sheet on a sheet |
| "Writer told Michelle…", "you and **their** daughter" | G26, G33, G37 | The prompt asked for every statement "in the third person" and called the user "the writer". | Fixed at three layers |
| "Not moving anymore" didn't close the plan | G38 | A rule blocked a fact from replacing an event. | Fixed |
| "Got the Stripe job" didn't replace "interviewing" | G30 | The "which Sam?" answer path never compared the note with that Sam's existing memories. | Fixed |
| "Getting better" became a second line | G31 | There was no notion of an update to an ongoing story. | Fixed |
| Consent sheet flashes on sign-in | G15 | The sheet was shown before your earlier answer had synced, and a swipe counted as declining. | Fixed |
| Contacts called "Family" | G39 | A family word anywhere in a saved contact name ("…'s Hubby") was taken as a relationship. | Fixed |

## 2. Product and data decisions

- **Migration `20261006090000_v2_stabilization`** (forward-only; reached production on merge):
  - **`with_person_ids`:** one memory can be about several people. It shows on every page, with one source.
  - **`detail.transition`** (progress, completed, cancelled):
    - The newer memory replaces or resolves the older one.
    - The older one is kept as history, with its source.
  - **Promise subject `person`:** "Tyler said he'd send me…" is Tyler's promise, not yours.
  - **Stated relationships:** a relationship is saved only when the note states it, and the word must appear in the note.
  - **Dates on plans and threads:** season plans store a season date ("Summer 2027") instead of stale "next summer".
- **Phone store:** schema version 3 adds `understood_at` and `shown_at`, so the time from send to understood to shown is measurable.
- **Prompt `relationship_extract/v6`:**
  - Statements say "you" for the user.
  - Updates (progress, completion, cancellation) are described the way the code decides them.
  - Someone else's promise is theirs.
- **One deliberate remaining timer:** a review you've seen that asks nothing, left open off screen for 10 minutes, is settled as "left".
  - Its items stay unreviewed.
  - Questions and anything held for your yes never expire.

## 3. What changed, by area

- **Lifecycle (Gate A)**
  - Each note's state is stored durably, and sheets just show it.
  - No timers in the Tell flow. A refresh or background never closes anything.
  - Restarting resumes. Failures are shown plainly, never silence.
  - "See the note" parks the question and brings it back.
  - Never a sheet on a sheet.
  - Notes still waiting on you appear on Today and on the person's page.
- **Voice and self (Gate B)**
  - Always "you", never writer, user, author or narrator, and never "their" meaning you.
  - After a who-answer, "He…" becomes the name.
  - Your promises read naturally.
  - Stored lines are repaired when shown.
- **Trust (Gate C)**
  - A cancellation closes what it cancels, across kinds.
  - Consent needs an explicit choice, and a swipe is never an answer.
  - No family is assumed from contact names.
- **Feedback (Gate D)**
  - One contract after a Tell: Understanding… → a **Kept** card (tap a line to correct it, Undo; it stays until you're done), or **"One thing to check"** with the reason.
  - "Kept" never shows before something is kept.
- **Memory threads (Gate E)**
  - "Interviewing" → "got the job", and "bothering him" → "getting better" → "better".
  - "Planning to move" → "not moving anymore".
  - One current line, with the earlier ones kept as history.
  - Two equally good matches ask "Does this replace one of these?"
- **Several people (Gate F)**
  - Shared events go on both pages, with no question.
  - Who-is-"he" offers **Ben / John / Both / Not sure** and quotes the sentence.
  - "Add Kaiya" works by name, with no phone needed.
  - Adding Michelle later asks "Is this the Michelle in 'Sam is married to Michelle'?" It never merges silently.
  - "Michelle's sister Ana had a baby" stays about Ana.
  - A pet's vet visit isn't treated as a person's health.
- **Today (Gate G)**
  - Headline priority: a moment, then anything waiting on you, then first use, then quiet.
  - Pending questions are named.
  - "Congratulate Ben" after good news, and things starting today get a moment.
  - "Did Josh send it?" a day or so after someone's promise is due.
- **Readability (Gate H, within Quiet Herbarium, no redesign)**
  - More space between sections, a thin rule, darker labels.
  - Coming up leads with when.
  - The source line shows once per group.
  - People rows prefer the person's own news.

## 4. Eval results

### Paid live run: prompt v6

| | |
|---|---|
| Run | [Actions run 37404679229](https://github.com/fullcarts89/kinship/actions/runs/37404679229), PR #18 label `run-evals-full` |
| Setup | 400 fixtures (corpus `extraction-v2.4`, 7 new stabilization cases), Opus 5.5 at low effort |
| Cost | $2.74 |
| Latency | p50 2.7 s, p95 5.8 s |

**Every gated threshold passed:**

| Metric | Result | Bar |
|---|---|---|
| Wrong person or subject | 0% (0/372) | ≤ 0.5% |
| Sensitive items never auto-saved | 118/118 | 100% |
| Explicit dates / relative dates | 55/55 · 117/117 | 97% · 93% |
| Ambiguous dates confirmed | 18/18 | 100% |
| Merge / supersede / new | 45/46 | 90% |
| User promises found | 13/15 | 85% |
| Hallucinated items, invented names, must-not violations | 0 | 0 |
| Usable model answers | 400/400 | 99% |

**Two regressions the run exposed, both caused by v6's "you" wording, both fixed (commit `76c4029`):**
- **Your promises were dropped.** Lines written "You're dropping off a lasagna…" were rejected by the invented-name check ("You're" wasn't recognised).
- **"We're skiing Tahoe" was held as a new person called "We"** instead of updating the skiing plan.

**After the fix,** replaying the same saved model answers (free):
- User promises 15/15.
- Merge 46/46.
- Items found 362/366.
- The old v5 baseline's replay is unchanged.

**Remaining misses (not product bugs):**
- "Ben got promoted yesterday" was filed as a milestone, but the fixture expects event or fact. Today's good-news moment accepts milestones, so "Congratulate Ben" still works; the fixture is too narrow.
- Two marathons filed as milestones, and one Chinese-language note. Both carried over unchanged from the v5 run.

### Free checks (all green in CI on the merged head)

- Jest 483 · server (Deno) 139 · database (pgTAP) 447 · TypeScript clean · eslint 0 errors.
- Oracle and realistic oracle: no failures.
- Replays of both the v5 baseline and the v6 run: all thresholds pass.
- The Supabase preview branch applied the migration cleanly.

## 5. What was deliberately not changed

- **Not built (per the brief):** About You UI, Relationship Landscape, Garden, Ask Kinship, scores, timeline UI, task manager, onboarding redesign, general graph engine.
- **No model swap and no flag changes.**
- **Self-relations:** stored where the note states them ("Kaiya is my daughter"), with no About You surface.

## 6. Open items

**Yours to do:**
1. **Deploy ai-gateway** (`supabase functions deploy ai-gateway`). The server fixes aren't live until you do.
2. **Install a new app build** on your phone.
3. **Run the native pass:** the brief's 22 checks. For each one, check:
   - what was understood
   - who it's about
   - whether you're written as "you"
   - what's current and what was replaced
   - the source
   - the person page, People and Today
4. **Decide on the eval baseline:** whether the v6 run becomes the approved baseline. It's recorded as a candidate in `evals/results/RUNS.md`.

**Open risks:**
- **The freeze (G5, G14) has no confirmed cause.** Watch for it first.
- **G4's timeout fix rests on an inferred cause.**
- **Wording rules:** recognising updates, unknown names and other people's promises relies on wording rules. They're tested, but they're heuristics. A wrong match would show as an update you didn't intend; two equal matches ask instead of guessing.
- **No device verification** has been done by me; everything above is automated or eval evidence.
- **The 10-minute settle timer** remains (described in §2).

**Known leftovers, not addressed:**
- John's Christmas visit has duplicate event items in your data.
- Duplicate contacts (two Sams, etc.) are not deduplicated.
- Fixture widening (milestone for "promoted") is for the next corpus freeze.

## 7. Deviations from the brief

- **Native device verification** (22 checks) couldn't be run from the cloud container. The checks are mapped to automated tests:
  - `stabilizationProofs.test.ts` covers checks 7–18 and 21.
  - The lifecycle, understanding and consent tests cover 1–6, 19, 20 and 22.
- **The live eval ran through a PR label**, the only route to the API key, after you approved the PR.

## 8. Read-only data inspected (as the brief allowed)

- **Your captures** after 20:20 UTC on 5 Oct matching brothers, Luna, Warriors, Stripe, Alameda and Michelle: status and saved items.
- **The matching model-call records:** outcome, result, latency, drop reasons.
- **The memory table's constraint names.**
- **Nothing was modified.**
