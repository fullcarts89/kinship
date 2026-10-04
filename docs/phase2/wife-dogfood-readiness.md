# Wife dogfood: readiness

**Status: not ready to hand over. Code-complete for the slice, pending a native-device pass and a build.** No account is enabled. No internal user id has been requested. All four flags (`shell_v2`, `tell`, `ai_extraction`, `memory_v2`) stay OFF for everyone.

**The question.** Does Kinship feel beautiful, obvious and low-effort enough that someone who doesn't care about the AI underneath would still want to use it? In the lab, it is close. On a phone, nobody has looked yet. That is the gap.

## Screens (lab render, iPhone 15 size)

| Surface | Light | Night |
|---|---|---|
| Today | [today](screens/today.png) · [quiet day](screens/today-quiet.png) | [night](screens/night-today.png) |
| People | [people](screens/people.png) · [add](screens/people-add.png) · [settings](screens/settings.png) | [night](screens/night-people.png) |
| Relationship page | [person](screens/person.png) · [empty](screens/person-empty.png) · [What Kinship knows](screens/knows.png) | [night](screens/night-person.png) |
| Tell | [typing](screens/tell.png) | — |
| Auto-kept result | [Kept line](screens/kept.png) | — |
| Confirmation | [look over](screens/review.png) · [sensitive: Remember?](screens/keep.png) | [night](screens/night-review.png) |
| Clarification | [Which Sam?](screens/sams.png) · [Sarah or her sister?](screens/sarah.png) · [Is Maya new?](screens/maya.png) | — |
| Source | [your note](screens/source.png) | — |
| Correction | [line](screens/correction.png) · [date](screens/correction-date.png) | — |
| Offline | [waiting to be online](screens/offline.png) | — |
| Reason → hand-off → return | [hand-off](screens/handoff.png) · [choose contact](screens/handoff-choose.png) · [Did you reach Ben?](screens/today-return.png) · [Anything worth remembering?](screens/today-after.png) | — |
| First-run consent (D2/D3) | [consent](screens/consent.png) | — |

Side by side with the approved boards: `screens/compare/` (reviewed in `quiet-herbarium-build.md` §6).

## The gate

| Gate item | Status | Evidence |
|---|---|---|
| Intended fonts installed | ✅ | Newsreader (optical-size instances, OFL) + Instrument Sans registered; no 2.0 screen uses DM fonts |
| Quiet Herbarium tokens/components in use | ✅ | One token source; every 2.0 screen is built from `src/ui` |
| Identity-only sprigs | ✅ | `sprig/generate.ts`; property tests over 500 people |
| Today + People + Tell IA | ✅ | Two tabs, Tell pinned above the bar, nothing else |
| Tell looks polished | ✅ lab · ⏳ device | No mic until voice (E18) |
| Extraction/review feels polished | ✅ lab · ⏳ device | Board 1 "Kept for…" |
| Clarification feels natural | ✅ lab · ⏳ device | One question, alone when nothing is kept |
| People list polished | ✅ lab · ⏳ device | Search, sprig, live line |
| Relationship page reads as a portrait | ✅ lab · ⏳ device | Board 2 sections |
| Source/provenance understandable | ✅ | One tap from every line |
| Correction easy | ✅ | 2 taps (knows/review), 3–4 (portrait) |
| No debug/lab UI leaks | ✅ | `/lab` redirects home unless `EXPO_PUBLIC_V2_LAB=1` at build time; no dev text in 2.0 screens |
| No obvious broken routes | ✅ lab · ⏳ device | Routes: §4 of the build doc; the 1.0 onboarding is skipped for 2.0 accounts |
| **Native-device rendering checked** | ❌ **not done** | No iOS hardware or build service here; checklist below |
| Major offline/relaunch flows | ✅ tests · ⏳ device | D1 suite: kept offline, understood later, survives relaunch |
| Unsupported wording impossible by test | ✅ | `grounding.test.tsx` now covers Today, the Kept line, the hand-off, the review, the portrait, People, What Kinship knows and the Source |
| Trust-required confirmation correct | ✅ | D1 §0 unchanged; `understanding.test.ts` |

## Native-device findings

**None yet.** This environment has no iPhone, simulator or EAS credentials, so everything above was checked in Chromium. The checks below need a dev or TestFlight build of this branch on real hardware: an iPhone SE (3rd gen) or 13 mini, plus a 15 or 16 Pro Max. The D1 first-pass list (`docs/phase1/checkpoint-d1-tell-memory-loop.md` §0) still applies.

| Check | What to look for |
|---|---|
| Newsreader / Instrument Sans | Real faces, not system fallbacks; Display at 34 reads like board 1; no clipped descenders |
| Small and large devices | SE: the Today moment + buttons + one quiet line fit above the Tell field; Pro Max: no stretched rows |
| Dynamic Type XS → AX3 | Display reflows to ≤ 3 lines at AX1 with no truncation (plan §18 gate); pills never cut their labels; the tab bar stays reachable |
| VoiceOver | Moment reads statement + context + provenance as one; tokens say "Who: Ben, double-tap to change"; sheets hold focus; sprigs are skipped |
| Reduce Motion | The moment fades instead of rising; sheets fade instead of sliding |
| Keyboard | The Tell field rises with the keyboard on Today and People; the add-person name field and the words editor aren't covered |
| Sheets/modals | Swipe-down and scrim tap dismiss; no sheet stacks on a sheet; the picker's back works |
| Safe areas | Notch and home indicator on every screen; the person page's bottom actions clear the indicator |
| Long names / long memories | A 30-character name on the portrait and in rows; a 400-character line wraps; tokens wrap |
| Light / night | Switching the system appearance while open; 1.0 stays light if the account is moved back |
| Offline | Airplane mode: tell, kill the app, relaunch, reconnect → understood, nothing lost |
| Relaunch | A question waiting survives a relaunch and shows on Today |
| Corrections / clarification / provenance | Each from the portrait, the review and What Kinship knows |
| Hand-off | Messages, Phone, FaceTime and WhatsApp open at the right person; nothing is pre-filled; the return line appears after 10 minutes and not before |
| Consent | Shown once; "Keep notes as written" keeps notes raw; Settings switches it |

## Rough edges (known; fix or accept before handing over)

1. **Native pass not done** (above). This is the blocker.
2. **Sign-in is still the 1.0 screen** (DM fonts, cream). It is seen once if her account is prepared on the phone in advance. A v2 sign-in is E16.
3. **No voice.** Tell is typing (the keyboard's dictation works). The board's listening screen and mic wait for E18.
4. **Today needs dated events to speak.** A reason exists only for an exact-day, non-sensitive event with a follow-up policy. In her first days Today will often say "Nothing needs you today." That is honest, but it may read as empty. Watch whether she understands it.
5. **Sensitive events never become reasons in v0** (hard times have their own tone rules). Her mother's surgery won't prompt a follow-up yet.
6. **Reasons refresh when Today opens** (online), not overnight; there is no `pg_cron` yet. Opening the app is enough.
7. **The hand-off asks once per person for their contact** (no permission prompt for the picker itself; reading the number later needs Contacts access).
8. **The portrait shows items, not prose.** "Lately" lists her own lines; there is no summary paragraph.
9. **Retention follow-up** (D1 §0) is still unbuilt. It's harmless for a week.
10. **Web lab only** for every screenshot here.

## What it takes to hand it over

1. Your review of this branch: the design-fidelity table, the friction audit, and the reasons migration `20261005090000_v2_reasons_v0.sql`, which reaches production only by a merge to `main`.
2. Merge with "Create a merge commit". The integration applies the migration; verify schema parity as before. The gateway is unchanged (no redeploy).
3. A dev or TestFlight build of `main`, and the native pass above, with fixes.
4. Prepare her account and enable `shell_v2`, `tell`, `ai_extraction` and `memory_v2` for **that one user id only**: the service-role SQL in the D1 doc §8. **Not done, and no id has been requested.**
5. Hand over. Watch for hesitation, not just errors (questions in the brief).

## Recommendation

**Don't hand it over yet.** The code is ready for the native pass: every surface is built from the approved system, the D1 trust behaviour is intact, and grounding is enforced by test on every surface. What's missing can only be done on a phone: fonts, Dynamic Type, VoiceOver, the keyboard, safe areas and the hand-off. If that pass needs only small fixes, the build is right for her.
