# Kinship 2.0 — Master bug ledger

The single, living quality ledger for founder native-pass feedback. It covers F1–F23 (pass 1, recovery), G1–G43 (pass 2, stabilization), H1–H30 (pass 3) and any new issues (N-series). Source detail for every item is in `founder-native-feedback.md`; this file records **status**.

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

*Last updated: 6 Oct 2026, at the start of the Core Trust Closure pass (before code changes).*

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
| G5 | App froze | P0 | Stability | STILL OPEN | Unknown | Mitigated: no sheet churn, never sheet-on-sheet | `lifecycle.test.tsx` | No freeze reported in pass 3 | Not confirmed fixed |
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
| G27 | (a) "Nothing needs you" above plan (b) Susan not in People (c) which line | P1 | Today | STILL OPEN | (a) headline ignores the Kept card | Gate G | `todayModel.test` | Re-seen (pass 3, H19) | (a) → H19; (b) → H21 |
| G28 | Things about you should have a home | P3 | Direction | DEFERRED | | About You not built (brief) | | | |
| G29 | After which-Sam, no confirmation | P0 | Lifecycle | SUPERSEDED | → G19 | | | | |
| G30 | "Got the job" doesn't replace "interviewing" | P0 | Threads | FIXED | Answer path didn't re-compare | Gate E | `stabilization.test.ts` | Not re-tested | |
| G31 | Ongoing update kept as second line | P1 | Threads | FIXED | No progress transition | Gate E | `stabilization.test.ts` | Not re-tested | |
| G32 | (a) "He" after answer (b) plan as ongoing (c) past trip "No date yet" (d) not shared | P1 | Display | STILL OPEN | (c) undated past outing shown as upcoming | Gates B, E, F for a, b, d | | Re-seen (pass 3 screenshot, Oct 5 items) | (c) open; may be legacy data only |
| G33 | "Writer" back | P0 | Voice | FIXED | Prompt "third person" | Gate B + prompt v6 | `selfVoice.test.ts`, eval | No "writer" reported in pass 3 | |
| G34 | Michelle's page doesn't know Sam | P1 | Identity | SUPERSEDED | → G20 | | | | |
| G35 | Someone's promise to you as "ongoing" | P0 | Promises | STILL OPEN | Rule caught "said he'd send me" only | Gate F `theyPromisedMe` | `stabilization.test.ts` | Re-seen (pass 3, H28) | → H28 |
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
| H1 | Can't edit a person's name | P2 | Person | STILL OPEN | Deferred in recovery | | | | |
| H2 | Hard to inspect everything known | P3 | Person | DEFERRED | Design | Spec only this pass (with H15) | | | |
| H3 | Demand for recall questions | P3 | Roadmap | DEFERRED | | Ask Kinship moved forward on roadmap; not built | | | |
| H4 | Value of bring-back not obvious | P3 | Onboarding | DEFERRED | | Acceptance criteria this pass; build next UX phase | | | |
| H5 | Anthony + Natalia wedding: only Anthony | P0 | Multi-person | SUPERSEDED | → H21 | | | | |
| H6 | No quick "did it get it right" feedback | P2 | Tooling | STILL OPEN | | | | | |
| H7 | Dogfood notes → eval corpus | P2 | Process | STILL OPEN | | Process doc this pass | | | |
| H8 | Latency better, still improvable | P3 | Latency | DEFERRED | | Monitor via timings; no model change | | | |
| H9 | First-use flashes on first sign-in | P1 | Activation | STILL OPEN | To reproduce | | | | |
| H10 | Message handoff: card vanishes, nothing recorded | P1 | Loop | STILL OPEN | To reproduce | | | | |
| H11 | Moment returns after restart | P1 | Loop | STILL OPEN | To reproduce | | | | |
| H12 | Other Sam still asks about resolved items | P0 | Identity | STILL OPEN | To reproduce | | | | |
| H13 | Tahoe duplicate across word order | P0 | Multi-person | STILL OPEN | To reproduce | | | | Data cleanup needs approval |
| H14 | Memory without source after force-quit | P0 | Provenance | STILL OPEN | To reproduce | | | | |
| H15 | Group knowledge into sections | P3 | Person | DEFERRED | Design | Spec only this pass | | | |
| H16 | Milestones + follow-ups | P3 | Reasons | DEFERRED | Design | Proposal only; no missing-field questions | | | |
| H17 | Known relationship treated as new | P1 | Identity | STILL OPEN | To reproduce | | | | |
| H18 | "Did you reach out?" loses the reason | P1 | Loop | STILL OPEN | To reproduce | | | | |
| H19 | Kept card looks part of Coming up; headline contradicts | P1 | Today | STILL OPEN | To reproduce | | | | Also G27a |
| H19b | Shared source line across unrelated lines | P1 | Provenance | STILL OPEN | Stabilization Gate H change | | | | New ID (split from H19) |
| H20 | "My daughter Kaiya" as a person name | P0 | Identity | STILL OPEN | To reproduce | | | | Data cleanup needs approval |
| H21 | Named participant (Pedro, Natalia) dropped | P0 | Multi-person | STILL OPEN | To reproduce | | | | Sam + Meesh must not regress |
| H22 | "August" became 2027 silently | P3 | Dates | DEFERRED | Reasonable reading | | | | Low priority |
| H23 | Cancellation too subtle; reads as news | P1 | Display | STILL OPEN | | | | | |
| H24 | Understanding card names the page's person | P2 | Lifecycle | STILL OPEN | To reproduce | | | | |
| H25 | Held sensitive cancellation doesn't replace | P0 | Threads | STILL OPEN | To reproduce | | | | |
| H26 | Your dated promise not in Coming up | P1 | Today | STILL OPEN | To reproduce | | | | |
| H27 | Coming up item disappears when another added | P1 | Today | STILL OPEN | To reproduce | | | | |
| H28 | Someone's promise filed as yours | P0 | Promises | STILL OPEN | To reproduce | | | | Regression of G35 |
| H29 | Uncertain wording has no marker | P1 | Certainty | STILL OPEN | | | | | |
| H30 | Edit loses original source/lineage | P0 | Provenance | STILL OPEN | To reproduce | | | | |

## New issues (N-series)

None yet.

## Older items still open (triage)

| ID | Classification |
|---|---|
| G5 freeze | **Blocks readiness until native-verified.** No repro. Watch on every native pass. |
| G27a headline over a Kept card | Required this pass, as H19. |
| G27b Susan not in People | Required this pass, as H21. |
| G32c undated past outing shown as "No date yet" | Investigate this pass. If it's only legacy data, propose cleanup; otherwise fix. |
| G35 others' promises | Required this pass, as H28. |
| F11 carousel | Legitimately deferred; next UX hardening (with H4). |
| G28 About You, G40 history | Legitimately deferred (brief). |
