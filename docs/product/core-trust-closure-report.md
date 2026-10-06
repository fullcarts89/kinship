# Kinship 2.0 — Core Trust Closure + Return Loop Pass: report

- **Date / branch:** 6 Oct 2026, branch `claude/awesome-edison-3cuf6z`.
- **Not merged and no PR.** No production flags changed. No user data changed.
- **Readiness: READY FOR FOUNDER NATIVE PASS.** This assumes the migration is applied (on merge) and ai-gateway is redeployed. Not READY FOR WIFE DOGFOOD: no item from this pass is VERIFIED on a device.

---

## 1. Master bug matrix

The canonical, living ledger is **`docs/product/bug-ledger.md`**. It covers F1–F23, G1–G43, H1–H30 and the new N1–N4, with every required column:
- severity, area, status;
- root cause, fix commit;
- regression coverage, native status, risk.

| Status | Count | Notes |
|---|---|---|
| FIXED | 71 | Code changed. None of this pass's rows are device-verified. |
| VERIFIED | 3 | G19, G21, G38. You reproduced the original scenario on device in pass 3 and it behaved. |
| STILL OPEN | 1 | **G5 freeze.** Not reproduced. Mitigated only. Blocks readiness until native-verified. |
| DEFERRED | 12 | Design or roadmap items (H2, H3, H4, H15, H16, H22), H8 monitoring, F11, G28, G40, N3, N4. |
| SUPERSEDED | 14 | Folded into another row, which carries the status. |

Older F/G items still open after triage:
- **G5:** blocks readiness.
- **G27, G32c, G35:** were open, now fixed in this pass.
- **G41's 10-minute settle:** stays by design and isn't a blocker.

Nothing older was left out.

## 2. Root causes (every H item touched)

**How causes were established:**
- Each H item was reproduced in a failing test before its fix.
- Six causes were confirmed or corrected against your data, read-only (listed in §5): H14, H17, H21/H5, H25, H29, H30.
- Several of the causes I guessed in summary 3 were **wrong**: H28, H14, H25, H5.

| ID | Actual cause |
|---|---|
| H28 | **Two causes.** The app labelled *every* promise "Your promise" (`kindLabel` ignored whose it was), so the pipeline's correct "Tyler's" reading still read as yours. Separately, the server rule missed "promised me", "will send me" and "is going to send me"; "promised me" was dropped outright. |
| H12 | The "Is this the Sam in …?" link suggestions matched by first name and ignored the who-answer. Sam Doughty's page offered memories you had filed to Sam Eden. |
| H20 | The model's mention "My daughter Kaiya" went to name resolution whole. No person has that name, so it became a new one, even with Kaiya already your daughter. |
| H25 | The update **did** run: the old thread was resolved and the new line carried `cancelled`. But a "resolves" never linked the new line to the old, so the review couldn't say what it replaced and What Kinship knows kept listing the ended thread. Its held question didn't say what a yes replaces either. |
| H13 | Dedupe compared exact strings ("Ben and John" ≠ "John and Ben"). Across notes, the dossier never said who a memory was shared with. |
| H21/H5 | Pedro (not in People) was never offered "Add"; only the sentence kept him. The Anthony/Natalia note *did* keep both, as two lines, one per person: the H13 duplicate. Sam/Meesh shows the same pattern. |
| H14 | **Not lost.** The server had the source. The person page showed one source line per run of lines with the same text (my stabilization-pass change), so the line had no source of its own. A real mid-sync gap could also show none. |
| H30 | The edit overwrote the words in place. The earlier interpretation existed only in a server history table and never reached the app. |
| H17 | Nothing compared a stated relationship with the one Kinship already held. |
| H10 | Opening Messages counted as "acted", so the moment vanished at once. The return question only appeared 10 minutes to 12 hours later. |
| H11 | **Likely, not reproduced:** the hand-off was written only *after* Messages opened. If iOS suspended or closed the app first, nothing recorded it. |
| H18 | The return copy never carried the reason ("Did you reach Ben?"). |
| H26 / H27 | Coming up on Today held at most two lines, one per person, and only other people's promises. |
| H9 | First use was decided before the first sync brought the account's data (same class as the G15 consent flash). |
| H19 | The Kept card sat in the dock under Today's last line with only a hairline, and Today didn't know it was there. |
| H19b | The same grouping rule as H14: one source line per run of matching text. |
| H23 | The change was correct but the portrait didn't show it as a change. |
| H24 | The waiting label came from where the note was told ("about Susan"), not from what it says. |
| H29 | The line was stored as tentative (checked) but nothing showed it. |
| G32c (old) | An undated past trip was planned as an event to come ("No date yet"). Still true for new notes until this pass. |

## 3. Implementation summary

**Trust**
- Someone else's commitment is theirs. The review says "Tyler's promise", and **Whose promise?** corrects it with a user_edit source while the note stays the source.
- A relationship said again is "Already known". A different one is asked about, never overwritten.

**Identity**
- "my/our [relation] Name" is structural.
  - Matches the existing person; among namesakes, the stated relation decides.
  - "Add Kaiya" (never "Add My daughter Kaiya") with the relationship set.
  - First-person statements read "You and your daughter Kaiya…".
- A resolved who-answer converges globally: no other Sam asks.
- **Add Pedro** for named newcomers in person-shaped phrases. Created by name, with no phone, and linked to the memory.

**Shared memories**
- Comparison is invariant to participants and word order, within a note and across notes.
- Same kind family, compatible dates; otherwise separate.
- The dossier carries shared people to code only. **The prompt is unchanged.**

**Provenance**
- One source line per memory, shared only within the same note.
- "Source syncing…" when the source hasn't reached the phone yet.
- Edits keep their earlier words and the original note: "Edited by you · was: ~~…~~".
- The Source view keeps replaced lines, marked "Since updated".

**Corrections and changes**
- Any change of the story (progress, completion, cancellation) **supersedes, linked**. That gives one current truth, history kept and restored by Undo. "Resolves" stays for an answered question.
- Saved lines and held questions say "Replaces: ~~…~~". The portrait shows "was: ~~…~~".

**Handoff / return**
- The hand-off is remembered **before** the other app opens, with its question; it's undone if the app didn't open.
- The return question appears at once, waits up to 3 days, and survives restart: "Did you congratulate Ben on the promotion?"
- **Not yet** keeps the moment.
- **Yes** records the contact as your word. Ben's page then shows "You reached out · Oct 6", and the follow-up is "Anything worth remembering from congratulating Ben?"

**Today and Coming up**
- The whole next 7 days by date, your dated promises included. The same person can appear twice; past 3 lines it shows "and N more", which opens in place.
- No "Nothing needs you today" while a Kept card is up. The Kept card is its own raised surface.
- No first-use flash before the first sync.
- The waiting state says "Your note" until it's understood.
- Undated past trips are past facts.

**Uncertainty and names**
- Tentative lines get a quiet **Maybe**.
- Tap a person's name, or "Edit name", to correct it: same id, same memories.

**Dogfood feedback**
- **Got it right · Not quite** (→ *What was off?*, five fixed reasons) on the Kept card.
- Stored on the note (migration `20261007090000`, strict check, owner only), plus a content-free event.
- It never alters memory. The process to turn it into fixtures is `dogfood-feedback-to-evals.md`.

## 4. Product decisions

| Kind | Decisions |
|---|---|
| **Bug fix** | H28, H12, H20, H25, H13, H21/H5, H14, H30, H17, H9, H19, H19b, H24, H26, H27, G32c, N1, N2 |
| **UX hardening** | H10/H11/H18 return loop; H23 "was:" / "Replaces:"; H29 Maybe; H1 rename; Kept card surface |
| **Behaviour change (flagging it)** | Cancellation and completion now **supersede** instead of "resolve" (needed for linking and Undo). Coming up shows more than two lines. The return question appears immediately and waits 3 days (was 10 min–12 h). |
| **Schema** | One forward-only migration, `20261007090000_v2_capture_feedback`: `captures.feedback jsonb`, a strict check, `GRANT UPDATE (feedback)`. No other schema change. Edits use the existing `memory_item_sources.meta`. |
| **Dogfood / eval tooling** | H6 feedback; H7 process doc; 7 sanitized fixtures (corpus **extraction-v2.5**, 407 fixtures) |
| **Roadmap movement** | H3: Ask Kinship → post-wife-dogfood / Alpha candidate (CC-16) |
| **Intentionally deferred** | H15/H2 What Kinship knows sections; H16 milestones; H4 bring-back in first use (all spec'd in `next-ux-proposals.md`); H22; N3 duplicate Anthony; N4 client timings |

## 5. Test and eval evidence

**Automated checks, all passing:**
- Jest: 504 tests, 68 suites.
- Server (Deno): 145 tests.
- Database (pgTAP): 454 tests. New: 63, "capture feedback", with 7 assertions.
- TypeScript clean; ESLint 0 errors (133 warnings, unchanged).

**New and updated tests:**
- `trustClosureProofs.test.ts`: **17 end-to-end cases** through the real pipeline, answer path, sync, review and pages.
  - Covers H28, H12, H20, H25 (held path), H13, H21, H5 (with the Sam/Meesh guard), H14 (kill mid-sync), H30, H17, H23, H29, H1, H6.
- Other new test files:
  - `returnLoop.test.ts` (Message → kill → reopen → Not yet / Yes)
  - `sourceLines.test.tsx`
  - `todayAttention.test.tsx`
  - `keptFeedback.test.tsx`
- New cases added to existing tests:
  - `stabilization.test.ts`: H28 (5 phrasings), H20 (5 relations, namesakes), H13, H17, G32c
  - `resolve.test.ts`: H20 legacy name
  - `todayModel.test.ts`: H26/H27, the return loop, H9
- **Each fix's test was shown to fail on the old code** (or encodes the confirmed data) before passing.

**Free evals (no paid run in this pass; the prompt is unchanged):**

| Check | Result |
|---|---|
| Oracle | No failures |
| Realistic oracle | No failures |
| Replay, v5 baseline | No failures |
| Replay, v6 candidate | No failures |

The corpus was re-frozen as v2.5.

**Read-only data inspected (your account; exactly what was read):**

| Item | What was read |
|---|---|
| H25 | The two Box notes and their items: status, transition, supersedes |
| H21/H5 | The Pedro, Anthony/Natalia and Sam/Meesh notes and their items |
| H14 | The "second tallest" note, its item and source row |
| H30 | The edited Ben items and their sources |
| H17 | John's and Ben's relationship labels and brother/sibling facts |
| H29 | The Seattle item's certainty |
| Cleanup plan | People named "my …" or "Kaiya"; Tahoe, Christmas, zoo, Australia, party, married and Box items (ids, statements, kinds, statuses, source counts) |
| Latency | Aggregates only from `ai_calls` |
| Flags | None read |

**Latency (H8), model and server only:**

| Prompt | Calls | p50 | p90 | Max |
|---|---|---|---|---|
| v6 (Oct 6) | 51 | 3.2 s | 4.4 s | 9.9 s |
| v5 (Oct 5) | 38 | 3.7 s | 6.1 s | 11.3 s |

Client presentation time and total time-to-visible-result **can't be reported**. They're recorded on the phone (`understood_at`, `shown_at`), but the `dogfood-v2` build has analytics off, so they never leave it (N4). No model change.

**Native / device:** none from me. The checklist is below.

## 6. Native test checklist

**`docs/product/native-regression-checklist.md`** has 26 rows on a physical iPhone, covering:
- normal Tell, background / restart, source after force-quit, correction provenance;
- two Sams, my daughter Kaiya, reversed Tahoe, the multi-person wedding, Sam/Meesh, Pedro;
- someone else's promise in three phrasings, the sensitive cancellation, the Oakland change, the known relationship;
- Coming up density, Message → return, Yes / Not yet across restart;
- first-use sync on a new account, uncertainty, rename, Not quite, and freeze watch.

## 7. Open risks

- **G5 freeze:** still no cause. Watch for it on every row.
- **Server changes need deploy:**
  - ai-gateway redeploy (H28 phrasings, H20, H13, H17, H25 supersede, G32c);
  - the migration on merge (H6).
- **Wording rules are heuristics, tested but not exhaustive:**
  - promise phrasings;
  - newcomer shapes ("married to", "moving with", "X and Y are…");
  - "my [relation] Name";
  - relationship statements ("X is your brother").
  - A miss falls back to the old behaviour; it doesn't make a wrong save.
- **Supersede instead of resolve:** cancelled and completed threads are now `superseded`. Anything that read "resolved" as "ended" sees superseded instead. It was checked across the app, and the eval grader accepts both, but it's a behaviour change.
- **H11:** the cause is inferred. The fix (write before open) is proven in tests, not on a device.
- **Existing data:** still shows the old bugs (second Kaiya, Tahoe pair, Anthony/Natalia, Sam/Meesh pairs, Box) until the cleanup plan is approved.
- **No paid eval this pass.** The prompt is unchanged, so the v6 live results stand; new fixtures were checked by oracle and replay only.

## 8. Deferred items

- **H15/H2 What Kinship knows sections, H16 milestone eligibility, H4 bring-back in first use:** spec only (`next-ux-proposals.md`), needs approval.
- **H3 Ask Kinship:** roadmap movement only.
- **H22 "August":** low priority, deferred.
- **N3:** two Anthony people; no merge-people feature (cleanup plan §3).
- **N4:** client timings need analytics on in dogfood (your decision).
- **Not built (brief):** About You, Garden, Landscape, graph, Ask Kinship, chatbot, Opportunity Engine, Intentions, monthly reflection, subscriptions, timeline, task manager, personality onboarding, scores, rankings, health, new navigation, model benchmarking or swaps.

## 9. Data cleanup plan (not executed)

**`docs/product/data-cleanup-plan.md`** lists the exact records, the change for each, how provenance is kept and how to undo:
1. **My daughter Kaiya:** move the zoo line to Kaiya and archive the duplicate person.
2. **Tahoe pair:** keep John's line, carry the other line's source over, and supersede the duplicate.
3. **Anthony / Natalia:** three lines across two Anthonys; needs your call on which Anthony is real.
4. **Sam / Meesh:** two pairs, folded into the Sam line.
5. **Box:** link the update to the line it ended.
6. **Christmas:** already one line; nothing to do.
7. **"He wants to go back to Tahoe":** reword it yourself in the app.

Nothing runs without your explicit yes.

## 10. Readiness

**READY FOR FOUNDER NATIVE PASS.** This requires that the migration reaches production by merging (merge commit) and that ai-gateway is redeployed from `main`.

Not READY FOR WIFE DOGFOOD until you run and pass the native regression set, with G5 included.
