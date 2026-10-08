# Kinship 2.0 — Master bug ledger

The single, living quality ledger for founder native-pass feedback. It covers F1–F23 (pass 1, recovery), G1–G43 (pass 2, stabilization), H1–H30 (pass 3), the N-series (found while fixing) and I1–I13 (round 4, native testing of the PR #19 build). Source detail for every item is in `founder-native-feedback.md`; this file records **status**.

## Status values

| Status | Meaning |
|---|---|
| **FIXED** | Code changed. |
| **VERIFIED** | The founder reproduced the original scenario on a physical iPhone against a newer build and it behaved correctly. Tests, CI, browser renders or code reading never count. |
| **STILL OPEN** | Not fixed, or fixed and then seen again on device. |
| **DEFERRED** | Deliberately not in the current pass (product decision or brief). |
| **SUPERSEDED** | Folded into another item, which carries the status. |

- **Severity:**
  - P0: trust or core-loop blocker.
  - P1: core-loop quality.
  - P2: polish or tooling.
  - P3: direction or question.
- **Native column:**
  - **Seen working (pass N)**: the founder used the fixed behaviour on device in pass N but did not deliberately re-run the original scenario. It is *not* VERIFIED; it needs a deliberate re-test.
  - **Re-seen (pass N)**: the problem happened again on device.
  - **Not re-tested**: no native evidence since the fix.

*Last updated: 8 Oct 2026. Gate 0 remediation pass (founder decisions after the Gate 0 native findings), branch `claude/awesome-edison-3cuf6z`, not merged: I12 and I13 FIXED again (`d84add5`); J4 FIXED (`eb658d3`), J1 FIXED (`3514416`), J7 FIXED (`5082991`). Earlier: Gate 0 Final Trust Closure merged (PR #20, `b60b84c`); I8 re-seen on that build and fixed in `099f47e` (PR #21, merged). Nothing from Gate 0 or this pass is VERIFIED: every row needs the founder's targeted native gate.*

---

## Pass 1 — recovery build feedback (F1–F23)

| ID | Title | Sev | Area | Status | Root cause | Fix ref | Regression | Native | Notes / risk |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Person page edit control squeezed | P1 | Person page | FIXED | NativeWind dropped `Pressable` style functions on native | Recovery Gate 4: Message · Call · Tell | `nativeStyles.test.tsx` | Seen working (pass 2) | |
| F2 | Tell sheet: no submit | P0 | Tell | FIXED | Same NativeWind cause | Recovery Gate 1 `@/ui/Pressable` | `nativeStyles.test.tsx`, `.maestro/smoke-tell.yaml` | Seen working (passes 2–3) | Founder sent many Tells since |
| F3 | Can't dismiss keyboard | P1 | Tell | FIXED | No dismiss affordance | Recovery Gate 1 keyboard | `keyboard.test.ts` | Not re-tested | |
| F4 | "The writer" / fact filed on wrong person | P0 | Voice, identity | FIXED | Prompt wording; no subject check | Recovery Gate 2; stabilization Gate B | `voice.test.ts`, `subjectProofs.test.ts`, `selfVoice.test.ts` | Not re-tested | G33 was a regression; see G33 |
| F5 | Can't edit a fact | P1 | Corrections | FIXED | No edit affordance | Recovery Gate 2 Edit | `editAffordance.test.tsx` | Seen working (pass 3) | H30: an edit loses lineage |
| F6 | How the user is named | P1 | Voice | FIXED | Decision: "you/your" | Recovery Gate 2 | `voice.test.ts` | Not re-tested | |
| F7 | Tell sheet submit (confirms F2) | P0 | Tell | SUPERSEDED | → F2 | | | | |
| F8 | Settings › Contacts does nothing | P2 | Settings | FIXED | Disclosure only | Recovery Gate 4 | `settingsContacts.test.tsx` | Not re-tested | |
| F9 | Welcome reads as a wall of text | P2 | Welcome | FIXED | Equal weight copy | Recovery Gate 4 | lab renders | Not re-tested | |
| F10 | Apple button broken | P0 | Welcome | FIXED | NativeWind (as F2) | Recovery Gate 1/4 | `nativeStyles.test.tsx` | Not re-tested | |
| F11 | Want carousel/animated orientation | P3 | Welcome | DEFERRED | Direction | Recovery chose one example card, no carousel | | | H4 carries the "show bring-back" need |
| F12 | Example should carry the goal | P2 | Welcome example | FIXED | | Recovery Gate 4 | grounding test | Not re-tested | |
| F13 | Example: show what "Yes" does | P2 | Welcome example | FIXED | | Recovery Gate 4 | lab | Not re-tested | |
| F14 | Example: "Anything worth remembering?" step | P2 | Welcome example | FIXED | | Recovery Gate 4 | lab | Not re-tested | |
| F15 | Email sign-in bounces back | P0 | Auth | FIXED | Welcome left before session applied | Recovery Gate 1 | `signInSettles.test.tsx` | Not re-tested | |
| F16 | Consent naming the AI provider | P2 | Consent | FIXED | Framing | Recovery Gate 4 (benefit first, disclosure kept) | `consent.test` | Not re-tested | Legal read still pending |
| F17 | Today dock can't submit | P0 | Tell | SUPERSEDED | → F2 | | | | |
| F18 | First-use buttons read as a toggle | P2 | Today | FIXED | Filled + outline pair | Recovery Gate 4 | | Not re-tested | |
| F19 | Unsent text follows you | P1 | Tell | FIXED | Shared dock draft | Recovery Gate 3 drafts | `drafts.test.tsx` | Not re-tested | |
| F20 | No orientation; setup skipped | P0 | Activation | FIXED | Setup gate guessed from incidental data | Recovery Gate 3 activation record | `activation.test.ts`, `firstRun.test.tsx` | Not re-tested | H9 is a related first-sign-in flash |
| F21 | Unsent text survives other actions | P1 | Tell | SUPERSEDED | → F19 | | | | |
| F22 | Unsent text on Today too | P1 | Tell | SUPERSEDED | → F19 | | | | |
| F23 | New account shown "mature" quiet day | P0 | Today | FIXED | First use ended when a person existed | Recovery Gate 3 | `firstRun.test.tsx` | Not re-tested | |

## Pass 2 — stabilization feedback (G1–G43)

| ID | Title | Sev | Area | Status | Root cause | Fix ref | Regression | Native | Notes / risk |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Wait after sending, no sign | P1 | Lifecycle | FIXED | No Understanding state | Stabilization Gate A/D | `lifecycle.test.tsx` | Seen working (pass 3) | H8: latency feels much better |
| G2 | ~8 s to result | P2 | Latency | SUPERSEDED | → H8 | | | | |
| G3 | "Kept for Ben" label twice | P2 | Review | FIXED | Label drawn twice | `ReviewSheet.tsx` | `reviewModel.test` | Not re-tested | |
| G4 | Result never appeared (30 s) | P0 | Lifecycle | FIXED | Inferred: stalled fetch, no timeout | `lib/supabase.ts` 20 s timeout | | Not re-tested | Cause inferred, not reproduced |
| G5 | App froze | P0 | Stability | STILL OPEN | Unknown | Mitigated: no sheet churn, never sheet-on-sheet. `app_stall` telemetry (dogfood-v2, merged in PR #19) reports any JavaScript-thread block of 1 s or more while the app is in the foreground, as `duration_bucket` plus `tell_work` | `lifecycle.test.tsx`, `performanceTelemetry.test.ts` | No freeze reported in passes 3 and 4 | **How to close:** the founder reports no freeze through the Gate 0 native pass, **and** PostHog shows no `app_stall` of 3 s or more across the dogfood-v2 sessions in that window. Then VERIFIED on the founder's say-so. Any freeze or a 3 s+ stall keeps it open, with the time noted |
| G6 | "See the note" loses the question | P0 | Lifecycle | FIXED | Sheet closed on navigation | Gate A (park + return) | `lifecycle.test.tsx` | Not re-tested | |
| G7 | No confirmation for a clear fact | P1 | Feedback | FIXED | Light tier had no card | Gate D | `lifecycle.test.tsx` | Seen working (pass 3) | |
| G8 | Shared memory says nothing about others | P1 | Multi-person | FIXED | No `with_person_ids` | Gate F | `stabilizationProofs` | Seen working (pass 3) | H13 duplicates across notes |
| G9 | Kept line follows you to another page | P1 | Lifecycle | FIXED | Card not scoped | Gate A | `lifecycle.test.tsx` | Not re-tested | |
| G10 | Sometimes summary, sometimes not | P1 | Feedback | SUPERSEDED | → G7 | | | | |
| G11 | "John and Ben are brothers": nothing | P0 | Extraction | FIXED | Plural relation guard | Gate F (server) | `stabilization.test.ts` | Seen working (pass 3) | H17: known relationship not recognised |
| G12 | Same-day event not on Today | P1 | Today | FIXED | No starts-today moment | Gate G | `todayModel.test` | Not re-tested | |
| G13 | Waiting notes easy to miss | P1 | Today | FIXED | Not named | Gate A/G | `todayModel.test` | Not re-tested | |
| G14 | App froze again | P0 | Stability | SUPERSEDED | → G5 | | | | |
| G15 | Consent flash on sign-in | P1 | Consent | FIXED | Asked before settings synced | Gate C | `consentAsk.test.tsx` | Not re-tested | H9 is the same class |
| G16 | Note being understood invisible on Today | P1 | Today | SUPERSEDED | → G13 | | | | |
| G17 | Lately / Coming up wall of text | P2 | Person page | FIXED | Weak section styling | Gate H | | Seen working (pass 3) | Founder likes Lately/Coming up |
| G18 | (a) Kept with no text (b) relative time in statement (c) Lately cap | P2 | Display | FIXED | (b) relative words kept | Gates D, F (stripRelativeTime) | `pipeline.test` | Not re-tested | (c) not separately confirmed |
| G19 | "Which Sam?" closes by itself | P0 | Lifecycle | VERIFIED | Sheet closed when view empty during sync (reproduced) | Gate A | `lifecycle.test.tsx` | Pass 3: which-Sam answered and confirmed | |
| G20 | Adding someone later doesn't connect | P1 | Identity | FIXED | No link suggestion | Gate F links | `links.test.ts` | Not re-tested | H12 shows link/question leakage |
| G21 | Good news lost (promotion) | P1 | Today | VERIFIED | No good-news moment | Gate G | `todayModel.test` | Pass 3: "Congratulate Ben" shown | H10/H11: handoff loop |
| G22 | Kept → Understanding → sheet order | P1 | Feedback | SUPERSEDED | → G7 | | | | |
| G23 | No "Both" | P1 | Multi-person | FIXED | | Gate F | `stabilizationProofs` | Not re-tested | |
| G24 | Warriors note dropped | P0 | Extraction | FIXED | Tradition anchor guard | Gate F (server) | `stabilization.test.ts` | Not re-tested | |
| G25 | Own family not in Contacts | P1 | Identity | FIXED | Add needed phone | Gate F "Add Kaiya" | `stabilizationProofs` | Re-seen variant (H20) | H20: "My daughter Kaiya" as name |
| G26 | "You and their daughter" | P0 | Voice | FIXED | voice.ts | Gate B | `voice.test.ts` | Not re-tested | |
| G27 | (a) "Nothing needs you" above plan (b) Susan not in People (c) which line | P1 | Today | FIXED | (a) headline ignored the Kept card; (b) newcomers never offered | Gate G; H19 (`36251cf`); H21 (`5d69e7b`) | `todayAttention.test.tsx`, `trustClosureProofs` H21 | Re-seen (pass 3) before this fix | (c) fixed in Gate F |
| G28 | Things about you should have a home | P3 | Direction | DEFERRED | | About You not built (brief) | | | |
| G29 | After which-Sam, no confirmation | P0 | Lifecycle | SUPERSEDED | → G19 | | | | |
| G30 | "Got the job" doesn't replace "interviewing" | P0 | Threads | FIXED | Answer path didn't re-compare | Gate E | `stabilization.test.ts` | Not re-tested | |
| G31 | Ongoing update kept as second line | P1 | Threads | FIXED | No progress transition | Gate E | `stabilization.test.ts` | Not re-tested | |
| G32 | (a) "He" after answer (b) plan as ongoing (c) past trip "No date yet" (d) not shared | P1 | Display | FIXED | (c) an undated past event was planned as an event to come | Gates B, E, F; (c) `bd2428e` | `stabilization.test.ts` G32c | Re-seen (pass 3) on Oct 5 data | Old "He wants…" row needs the cleanup plan §7 |
| G33 | "Writer" back | P0 | Voice | FIXED | Prompt "third person" | Gate B + prompt v6 | `selfVoice.test.ts`, eval | No "writer" reported in pass 3 | |
| G34 | Michelle's page doesn't know Sam | P1 | Identity | SUPERSEDED | → G20 | | | | |
| G35 | Someone's promise to you as "ongoing" | P0 | Promises | SUPERSEDED | → H28 | | | | |
| G36 | Tentative plans stay tentative | P1 | Certainty | FIXED | | Gate F | | Not re-tested | H29: no visible marker |
| G37 | People previews repeat bugs | P1 | Voice | SUPERSEDED | → G26/G33 | | | | |
| G38 | Cancellation doesn't close plan | P0 | Threads | VERIFIED | Fact→event supersede blocked | Gate C/E | `stabilization.test.ts` | Pass 3: Oakland cancel closed the move | Presentation → H23 |
| G39 | Contacts called "Family" | P1 | Setup | FIXED | Word in saved name | Gate C | `setupModel.test` | Not re-tested | |
| G40 | Old facts as history | P3 | Question | DEFERRED | Not a bug | History kept per line; no timeline (brief) | | | |
| G41 | Kept without yes on app switch | P0 | Trust | FIXED | | Gate A | `understanding.test.ts` | Not re-tested | 10-minute settle remains for no-question reviews |
| G42 | Ana's baby on Michelle's page | P1 | Identity | FIXED | | Gate F | `stabilizationProofs` | Seen working variant (pass 3, Natalia) | |
| G43 | One sheet, unclear what needs what | P1 | Review | FIXED | | Gate D | `reviewModel.test` | Not re-tested | |

## Pass 3 — native pass on the stabilization build (H1–H30)

| ID | Title | Sev | Area | Status | Root cause | Fix ref | Regression | Native | Notes / risk |
|---|---|---|---|---|---|---|---|---|---|
| H1 | Can't edit a person's name | P2 | Person | FIXED | Deferred in recovery | `3cde66f` rename (same id) | `trustClosureProofs` H1 | Not re-tested | Repair path for "My daughter Kaiya" |
| H2 | Hard to inspect everything known | P3 | Person | DEFERRED | Design | Spec approved (CC-17); next UX phase | | | Approved, not built |
| H3 | Demand for recall questions | P3 | Roadmap | DEFERRED | | CC-16: Ask Kinship → post-wife-dogfood / Alpha candidate | | | Not built |
| H4 | Value of bring-back not obvious | P3 | Onboarding | DEFERRED | | Acceptance criteria approved (CC-17) | | | Approved, not built; next UX phase |
| H5 | Anthony + Natalia wedding: only Anthony | P0 | Multi-person | SUPERSEDED | → H13 / H21 (data: two lines, one per person) | | `trustClosureProofs` H5 (with Sam/Meesh guard) | | |
| H6 | No quick "did it get it right" feedback | P2 | Tooling | FIXED | | `ae4d596`; migration `20261007090000` | pgTAP 63, `keptFeedback.test.tsx`, `trustClosureProofs` H6 | Not re-tested | Never alters memory |
| H7 | Dogfood notes → eval corpus | P2 | Process | FIXED | | `dogfood-feedback-to-evals.md`; 7 sanitized fixtures (v2.5) | oracle/replay | n/a | Manual review only |
| H8 | Latency better, still improvable | P3 | Latency | DEFERRED | | Monitor: v6 model p50 3.2 s, p90 4.4 s (51 calls) | | Founder reported better | Phone-side stage timings now collected in dogfood (N4) |
| H9 | First-use flashes on first sign-in | P1 | Activation | FIXED | Decided before the first sync brought the account's data | `36251cf` | `todayModel.test` H9 | Not re-tested | Cause from code, not reproduced on device |
| H10 | Message handoff: card vanishes, nothing recorded | P1 | Loop | FIXED | Opening Messages counted as acted; return check only 10 min–12 h later | `bb85d9f` | `returnLoop.test.ts`, `todayModel.test` | Not re-tested | |
| H11 | Moment returns after restart | P1 | Loop | FIXED | Likely: hand-off written after Messages opened (app suspended first) | `bb85d9f` (write before open) | `returnLoop.test.ts` (kill/reopen) | Not re-tested | Cause inferred, not reproduced |
| H12 | Other Sam still asks about resolved items | P0 | Identity | FIXED | Link suggestions matched by first name, ignored the who-answer | `09699f1` | `trustClosureProofs` H12 | Not re-tested | Reproduced in test |
| H13 | Tahoe duplicate across word order | P0 | Multi-person | FIXED | Exact-string dedupe; dossier lacked shared people. **Reopened in round 4:** a mirror that is *held* (ambiguous person) was never compared with its saved twin (I10) | `b7e90f3`; Gate 0 `1c18d0f` (held mirror joins its kept twin) | `stabilization.test` H13, `trustClosureProofs` H13, `gate0.test.ts` I10, `gate0Proofs` I10 | Round 4: mirror reproduced as held ("Michelle and Sam… Australia"). Not re-tested since | Existing duplicates: cleanup plan §2 (not authorised) |
| H14 | Memory without source after force-quit | P0 | Provenance | FIXED | Not lost: source line shared across same-text neighbours; plus mid-sync gap | `504a70a` | `trustClosureProofs` H14, `sourceLines.test.tsx` | Not re-tested | Server had the source (checked) |
| H15 | Group knowledge into sections | P3 | Person | DEFERRED | Design | Spec approved with changes (CC-17) | | | Approved, not built; Portrait unchanged |
| H16 | Milestones + follow-ups | P3 | Reasons | DEFERRED | Design | Eligibility approved (CC-17): ≤3 days + day-of, anchored to an established person | | | Approved, not built |
| H17 | Known relationship treated as new | P1 | Identity | FIXED | No comparison with the person's relationship | `8a95e98` | `stabilization.test` H17, `trustClosureProofs` H17 | Not re-tested | Conflicts are asked |
| H18 | "Did you reach out?" loses the reason | P1 | Loop | FIXED | Return copy never carried the reason | `bb85d9f` | `todayModel.test`, `returnLoop.test.ts` | Not re-tested | |
| H19 | Kept card looks part of Coming up; headline contradicts | P1 | Today | FIXED | Card in the dock with a hairline; Today unaware | `36251cf` | `todayAttention.test.tsx` | Not re-tested | |
| H19b | Shared source line across unrelated lines | P1 | Provenance | FIXED | Stabilization grouping by identical text | `504a70a` | `sourceLines.test.tsx` | Not re-tested | Now only same note |
| H20 | "My daughter Kaiya" as a person name | P0 | Identity | FIXED | Mention resolved whole as a name | `ae8c18a` | `stabilization.test` H20, `resolve.test` H20, `trustClosureProofs` H20 | Not re-tested | Existing record: cleanup plan §1 |
| H21 | Named participant (Pedro, Natalia) dropped | P0 | Multi-person | FIXED | Newcomers never offered; name only in the sentence | `5d69e7b` | `trustClosureProofs` H21 | Not re-tested | Shapes: married/engaged to, moving with, X and Y are… |
| H22 | "August" became 2027 silently | P3 | Dates | DEFERRED | Reasonable reading | Founder: no change, monitor (CC-17) | | | Boundary rule recorded, not locked |
| H23 | Cancellation too subtle; reads as news | P1 | Display | FIXED | Change not shown on the portrait | `d77587a` (+ Replaces in `27bb0b2`) | `trustClosureProofs` H23 | Not re-tested | |
| H24 | Understanding card names the page's person | P2 | Lifecycle | FIXED | Label from where it was told, not what it says | `90b805f` | `reviewModel.test` | Not re-tested | |
| H25 | Held sensitive cancellation doesn't replace | P0 | Threads | FIXED | Resolves never linked the new line; held question didn't say what it replaces | `27bb0b2` | `trustClosureProofs` H25 (held path) | Not re-tested | Confirmed in data; existing pair: cleanup §5 |
| H26 | Your dated promise not in Coming up | P1 | Today | FIXED | Only others' promises qualified | `18fb7b8` | `todayModel.test` H26/H27 | Not re-tested | |
| H27 | Coming up item disappears when another added | P1 | Today | FIXED | Two-line cap, one per person | `18fb7b8` | `todayModel.test` H26/H27 | Not re-tested | "and N more" |
| H28 | Someone's promise filed as yours | P0 | Promises | FIXED | App labelled every promise "Your promise"; rule missed 3 phrasings | `500cadd` | `stabilization.test` H28, `trustClosureProofs` H28, evals core-134–136 | Not re-tested | "Whose promise?" correction |
| H29 | Uncertain wording has no marker | P1 | Certainty | FIXED | Tentative stored, never shown | `5494f9e` | `trustClosureProofs` H29 | Not re-tested | No scores |
| H30 | Edit loses original source/lineage | P0 | Provenance | FIXED | Edit overwrote words; prior wording only in server history | `29b6dfc` | `trustClosureProofs` H30 | Not re-tested | |

## New issues (N-series)

| ID | Title | Sev | Area | Status | Root cause | Fix ref | Regression | Native | Notes / risk |
|---|---|---|---|---|---|---|---|---|---|
| N1 | Held update questions didn't say what a yes replaces | P1 | Review | FIXED | Held items' action never reached the app | `27bb0b2` | `trustClosureProofs` H25 | Not re-tested | Found reproducing H25 |
| N2 | Source view would hide a replaced line | P0 | Provenance | FIXED | Note view skipped superseded items | `27bb0b2` ("Since updated") | `trustClosureProofs` H25 | Not re-tested | Found while fixing H25 |
| N3 | Two "Anthony" people (Anthony, Anthony Lopez) | P2 | Identity | DEFERRED | Duplicate contact; no merge-people feature | | | | Cleanup plan §3; needs founder |
| N5 | Approved telemetry additions (CC-18): Send → "Understanding…" visible, backgrounded during processing, coarse build version and platform | P3 | Latency | FIXED | Not collected | `72efda2`: `understanding_bucket`, `backgrounded` on `tell_lifecycle` (and `backgrounded` on `tell_failure`); `app_version`, `build` (short commit), `platform`, `os_version` (major) on every performance event; dogfood scope only; `docs/ops/analytics.md` | `performanceTelemetry.test.ts`, `lifecycle.test` | | Confirm in PostHog after the first native Tell on the new build |
| N4 | Phone lifecycle timings not collected in the dogfood build | P3 | Latency | FIXED | Analytics off in `dogfood-v2` | Founder approved (CC-17): performance-only telemetry in `dogfood-v2`. Tell lifecycle by stage, failures, retries, stalls; content-free | `performanceTelemetry.test.ts`, `gateway.test.ts`, `handler.test.ts` | | Confirm events in PostHog Live events after the first native Tell |

## Round 4 (I-series): native testing of the PR #19 build, 7 Oct 2026

Source detail: `founder-feedback-4.md`; summary and recommended fixes: `founder-feedback-summary-4.md`; screenshots: `screens/feedback4/`. Founder decisions: `KINSHIP_2_DECISIONS.md` CC-18.

**Status rules for this table:**
- Gate 0 items are **FIXED** (code changed, 7 Oct). None is VERIFIED until the founder's Gate 0 native gate.
- Approved Phase 4 UX work is **DEFERRED** to Phase 4, which is not the same as rejected.

| ID | Title | Sev | Area | Status | Root cause | Fix ref | Regression | Native | Notes / risk |
|---|---|---|---|---|---|---|---|---|---|
| I1 | Tapping a Today / Coming up Moment opens the whole person page; the action gets lost | P1 | Today | DEFERRED | No reason detail surface exists | | | | Phase 4. Approved (CC-18): Moment detail; "View Ben" is secondary and deep-links with quiet emphasis |
| I2 | No lightweight interaction history; the return loop risks CRM ceremony | P2 | Relationship | DEFERRED | Only "You reached out · date" exists (H10) | | | | Phase 4. Approved (CC-18): know it → infer it → ask it; trail under Between you; no counts or "last contacted" |
| I3 | No way to remove a person; editing a name isn't discoverable | P1 | People | FIXED | No archive-person path in 2.0; rename only via a tappable title (H1) | `82d5943`: visible **Edit** beside the name → name sheet with **Remove from People** → confirm. Soft archive (`state = archived`); nothing deleted; memories only about them leave with them; shared memories stay with the others; Settings › Removed from People › **Bring back** (same id). A later Tell naming them asks "Kaiya was removed from People. · Bring back Kaiya", never "Add Kaiya"; add-by-name offers Bring back first | `gate0Proofs` I3 (×2), `gate0.test.ts` I3, `gate0Views` I3, pgTAP `64_v2_gate0` | Not re-tested | Founder-approved semantics (7 Oct). The "My daughter Kaiya" duplicate can now be removed in the app (no data edit) |
| I4 | Kept card: same-weight grey text; "Add Pedro" tiny | P1 | Review | DEFERRED | One text style for five jobs | | | | Phase 4. Approved hierarchy (CC-18). H21 behaviour itself is correct |
| I5 | Shared memory's Kept card names only one person ("Kept for Susan") | P1 | Review | FIXED | Confirmed in code: the label counted the filed person only, not `with_person_ids`; the data was right | `7d0d00d`: "Kept for Susan Oxnard and Michelle Lee" | `reviewModel.test` I5 | Not re-tested | |
| I6 | Keyboard hard to dismiss; tapping content to dismiss opens things | P1 | Input | DEFERRED | No accessory, no interactive dismiss | | | | Phase 4. Approved: Done accessory, drag-to-dismiss, nav usable, draft kept, bottom nav stays |
| I7 | Superseded facts vanish from the person's story | P2 | Person | DEFERRED | Superseded lines shown only as "was:" under the current line | | | | Phase 4, folded into H15 (Background history; sensitive outcomes stay private if declined) |
| I8 | dogfood-v2 can reopen into the old 1.0 app | P0 | Launch | FIXED | Two doors, reproduced in tests: (1) in the 2.0 build an unknown flag answer (4 s timeout, error, nothing kept on the phone, e.g. after sign-out) meant 1.0 for the whole session; (2) a tapped 1.0 notification opened a 1.0 screen whatever the shell, and 1.0's Home re-arms them. **Re-seen on the Gate 0 build (7 Oct, `b60b84c`):** (3) on a cold start the launch route renders while the saved session is still restoring, so the shell started as the signed-out "v1"; when the session arrived, that "v1" was taken as the account's shell before its flag answer and sent it to 1.0's tabs. The tests had always launched already signed in | `099f47e`: a shell decision belongs to its account; one arriving after the first render waits for its own answer (2.0's paper), then 2.0. Earlier, `bd37b7e`: unknown is 2.0 in the 2.0 build (only an explicit server "off" opens 1.0); 1.0 notification taps never open 1.0 screens in a 2.0 session; 2.0 cancels leftover 1.0 schedules; "Page not found" goes through the launch route | `launchRouting.test` (2.0 build; cold start with the session restored after the first render), `legacyNotifications.test` | Re-seen (Gate 0 build `b60b84c`, 7 Oct) | Native gate: relaunch, force-quit, airplane-mode relaunch, sign out/in, on a build with `099f47e` |
| I9 | After opening a line's details from the confirmation, can't get back to it | P1 | Review | FIXED | Opening the Kept card's details was the full review sheet; every way of closing it finished the note, so the card and its feedback were gone | `7d0d00d`: a sheet opened from the card returns to the same card (corrections applied, Got it right / Not quite still there); only the card's own controls end it | `lifecycle.test` I9 | Not re-tested | |
| I10 | "Michelle and Sam might be moving to Australia": mirrored line held for Sam offers Michelle and says "couldn't tell who" | P0 | Multi-person | FIXED | Saved line on Michelle + a mirrored *held* line for ambiguous Sam: the twin merge needed a resolved person; the app built choices from every name in the sentence; Today ignored the note whose sheet was open | `1c18d0f`: the held mirror knows its kept twin and the name it asks about; "Which Sam do you mean? · You have more than one Sam." with only the Sams, quoting the note; the answer joins Michelle's line (one shared memory); Today hides the quiet headline behind an open question | `gate0.test.ts` I10 (×5), `handler.test` I10, `gate0Proofs` I10, `lifecycle.test` I10 | Screenshot `i10-michelle-sam-australia.png`. Not re-tested | Needs the ai-gateway redeploy. No "Both" for a single name (one Sam can't be both) |
| I11 | Can't choose several people when correcting who a memory is about | P1 | Multi-person | FIXED | Picker was single-choice (G23's "Both" covers one ambiguous pronoun only) | `7d0d00d`: when a line's own words name several people in People (or it's already shared), "Who is this about?" offers just them to choose, plus Someone else and Done; one shared memory. Never a list of everyone | `reviewModel.test` I11, `gate0Views` I11, `gate0Proofs` I11 | Not re-tested | |
| I12 | Rename (Wifey → Cutie Pie) leaves the old name in every line; title cut to "Cutie" | P0 | Person | FIXED | Lines store words as understood, with no record of which words name whom. `8d43264` learned earlier names only from the record at rename time, and the pre-fix rename had already replaced both names, so "Wifey" survived only inside her lines (re-seen on the Gate 0 build). The same gap hit any nickname used only in notes | `d84add5` (Gate 0 remediation, decision 1b): each saved line records which of its words name which linked person, and under which of their names (`memory_items.person_mentions`, additive migration `20261008090000`). A line shows the current name only for words recorded under an earlier name ("Wifey got promoted" → "Loo Loo got promoted"); the user's own word under the current name stays ("Liz got promoted" while she is Elizabeth Chen, "Lizzie got promoted" after a rename to Lizzie). Earlier names = rename aliases + words recorded for them under another name, so later notes saying "Wifey" find her. Existing lines: conservative backfill, rules written in the migration (never another person's name, never he/she/you or a family word, never a word written twice or shared by two people on the line, never a word also used lowercase); rows it won't fill are listed with a reason in `person_mentions_backfill_report`. Statements, notes, sources and history untouched. Earlier: `8d43264` (one name rule, titles, aliases on rename) | `remediationProofs` (rename chain Wifey → Loo Loo; backfilled older lines; Liz 1b), `names.test` (rewritten), `remediation.test.ts`, pgTAP `65_v2_person_mentions` (backfill rules, report, guards), earlier `gate0Proofs` I12, `gate0Views` I12 | Re-seen (Gate 0 build, 7 Oct 3:43 pm) | Needs `npx supabase db push` (column + backfill) and the ai-gateway redeploy. A line the backfill leaves unfilled reads exactly as written (listed in the report). Screenshots `i12-rename-*.png`, `g0-i12-boo-boo.png`, `g0-i12-loo-loo.png`. See `gate0-native-findings.md` |
| I12b | "Wifey got promoted" shows Maybe | P2 | Certainty | FIXED | The founder's note (H29 log) told the promotion and "said she might be moving to Seattle" together; the certainty guard scanned the whole sentence, so the Seattle line's "might" hedged the promotion | `2e3e71a`, `f56008f`: the certainty check sets aside the other lines' own words from the same note; a hedge on the line itself, or outside every line ("I think…"), still holds | `gate0.test.ts` I12b, eval `amb-087` (fails on main, passes now; corpus `extraction-v2.6`), `memoryProofs` (Matt's promise no longer Maybe) | Not re-tested | Needs the ai-gateway redeploy. Replays: guard overreach fell (core-021, sens-011) |
| I13 | Correcting a line's person (Wifey → Kaiya) keeps "Wifey" in its words | P0 | Correction | FIXED | Person correction changed `person_id` only; `d5f4586` fixed a saved line by matching its leading name. Re-seen on the held-answer path: answering "which person?" (`resolve.ts` → `withSpokenName`) replaced only a leading He/She/His/Her, never a name, and the app merged two held questions from one note into one | `d84add5`: every subject change goes through the line's recorded words (I12's per-line mentions): correcting a saved line (one or several people) and answering a held question. An asked name that is someone else's becomes the chosen person's name ("Anthony loves…" → "Chris loves…"); a word that is nobody's name stays as the user's word for them; a name the chosen person goes by stays (a Samantha called Sam). Two questions from one note stay two ("Which Anthony?", "Which Sam?"), and answering both with the same person keeps one line. One edit with "was:" history (H30); the note is untouched | `remediationProofs` (DBZ → one Chris line; Ben → Josh with history; older line without a record), `remediation.test.ts` (DBZ, Sam Eden, Samantha, Liz, Add Zed), `names.test` I13, earlier `gate0Proofs` I13 | Re-seen (Gate 0 build, 7 Oct 4:12 pm) | Needs the ai-gateway redeploy. The line already moved to Kaiya before `d5f4586` keeps its words: Edit them once. Screenshots `i13-person-correction-kaiya.png`, `g0-i13-dbz-chris.png`. See `gate0-native-findings.md` |

## Gate 0 native findings (J-series): founder testing the Gate 0 build, 7 Oct 2026

Source detail: `gate0-native-findings.md` (summary: `gate0-native-findings-summary.md`); screenshots: `screens/feedback4/g0-*.png`. Founder decisions of 8 Oct: the narrow Gate 0 remediation pass, in the order I12 → I13 → J4 → J1 → J7 → J2 → J6 → J5 → Today headline → pet health. J8–J10 are the "also noticed" items the decisions named; their ids are this ledger's.

| ID | Title | Sev | Area | Status | Root cause | Fix ref | Regression | Native | Notes / risk |
|---|---|---|---|---|---|---|---|---|---|
| J1 | "He loves Susan" told on Pedro's page asks "Who is 'he'?", offers Susan (the object), not Pedro | P0 | Person resolution | FIXED | The pipeline counted everyone the note names as a possible "he", so Susan (the one he loves) plus the page's Pedro made two and it asked; the app built the choices from the note's names and never added the page's person | `3514416` (founder guardrail): a pronoun can mean only the people the note names before it, then the page's person; someone named only after it (the object) never. On a page with no one else before it, "he"/"she" is that person with no question ("Pedro loves Susan"), also when the model filed it on the object or couldn't tell; anyone else before it (a name, a relation word, someone the model calls new) is asked, never guessed. "John visited yesterday. He loves Susan." on Pedro's page asks John or Pedro, never Susan. A held pronoun line carries exactly who it can mean (`candidate_ids`); with no one, only "Choose who" | `remediation.test.ts` J1 (×5), `reviewModel.test` J1 (×2), `remediationProofs` J1 (×2), evals `amb-090`, `amb-091`, `amb-092` (on the old pipeline amb-092 saved "Sarah loves Sarah"; corpus `extraction-v2.8`) | Not re-tested | Needs the ai-gateway redeploy. Pedro needs no phone number: a person needs none to be resolved |
| J2 | Correcting the person: no way to add someone who isn't in People ("No one by that name yet.") | P1 | Correction | STILL OPEN | | | | | Decision: "Add Josh", one tap, name-only person, the line moves with I13's rule |
| J3 | Today → person page: highlight the line that was tapped | P2 | Today | DEFERRED | | | | | WAIT FOR I1 (founder, 8 Oct): View Person → deep-link → scroll → brief quiet emphasis → Reduce Motion |
| J4 | "Wifey got a raise" → "Nothing to remember in that one. Your note is saved."; the memory was dropped | P0 | Extraction guards | FIXED | The model read "Wifey" as "your wife"; the invented-relation guard dropped the whole line, and one dropped line reads as "nothing". "Wifey" was unknown because of I12 | `eb658d3`: guards strip what the model inferred, never the memory. A statement with an invented name, number, sensitive term or relationship, a lost "not" or an uncertain "the writer" keeps the note's own words, said to "you", shown for a glance (sensitive still waits for a yes); instructions and contact details stay blocked. A mention the note never says no longer drops the line (asked instead). A related person's unsupported relationship is stripped ("Who is Alex?" / "Is this about Ben?"). Someone not in People: "Who is Wifey?" with the page's person, Add Wifey, anyone already here, Don't keep this. "Nothing to remember in that one." only for a note with nothing in it; "Don't keep this" says "Nothing kept from that one." | `remediation.test.ts` J4 (×6), `pipeline.test.ts` (guard tests now assert the invented words never reach a line), `voice.test.ts` J4, `reviewModel.test` J4 (×3), `remediationProofs` J4 (×3), evals `amb-088` Wifey, `amb-089` Zed (corpus `extraction-v2.7`) | Not re-tested | Needs the ai-gateway redeploy. Replays improve: expected items found up in both, the c1 replay's one escape and one wrong-subject save gone. Still a drop: a "promise" nobody in the note made (`not_a_user_promise`), a kind question, not identity; the note's other lines are kept |
| J5 | Swiping down doesn't close a line's detail sheet | P1 | Sheets | STILL OPEN | | | | | Decision: a downward drag from anywhere dismisses when the content is at the top; scrolled content scrolls first; I9 still applies |
| J6 | "and 1 more" on the Kept card can't be opened | P1 | Review | STILL OPEN | | | | | Decision: a real, accessible control, preferably expanding in place; every kept line inspectable |
| J7 | Sam's page asks "Is this the Sam…?" about a line the founder already said is about Chris | P1 | Person page | FIXED | The link prompt (G20/G34) fired on any line naming this person's first name unless the name belonged to someone on the line; the I13 answer-path gap left "Sam" in a line answered Chris | `5082991`: the user's decision wins. Words the line records as someone's on it (an answer or a correction records them, I12/I13) are never asked about on another person's page; a line from before those records, kept on someone else although it leads with this name ("Sam loves…" on Chris), is never asked about (only the user's answer or correction files a line against its own words). Someone genuinely added after they were mentioned is still asked once. With I13 (`d84add5`) the answered line reads "Chris loves…" | `links.test` J7 (×3), `remediationProofs` J7 (×2) | Not re-tested | The founder's own 7 Oct line may already be linked to Sam Eden from the prompt (screenshot): that link is data, unchanged; remove it on the line if wanted |
| J8 | "Nothing needs you today." behind the "Here's what I'll remember" sheet | P1 | Today | STILL OPEN | | | | | Decision: never the quiet headline behind an active review, clarification, Kept confirmation or other Tell state needing attention |
| J9 | Ben's dog Mochi's vet appointment on Ben's Coming up but not Today's | P2 | Today | STILL OPEN | | | | | Decision: a pet's vet or health information is not human sensitive health; it takes part in Today normally |
| J10 | A hobby two people share kept as four one-person lines | P3 | Shape | DEFERRED | | | | | Not in Gate 0 (founder, 8 Oct): "Shared semantics must actually be shared." With the semantic-memory decision before H15 |

## Older items still open (triage)

| ID | Classification |
|---|---|
| G5 freeze | **Blocks readiness until native-verified.** Not reproduced; no freeze reported in pass 3. Row 26 of the checklist. |
| G41 10-minute settle | By design: a seen review with nothing asked is settled as "left" after 10 minutes off screen; items stay unreviewed; questions never expire. Not a blocker. |
| F11 carousel | Legitimately deferred; next UX hardening (with H4). |
| G28 About You, G40 history | Legitimately deferred (brief). |
| G27, G32, G35 | Fixed in this pass (see rows). |
