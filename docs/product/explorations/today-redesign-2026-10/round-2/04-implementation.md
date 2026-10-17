# Implementation implications, round 2

**Status: EXPLORATORY · UNAPPROVED. Nothing is scheduled.** Timing if adopted: after B9 and the employer evaluation, with the return-value roadmap (CC-25), after household dogfood round 1 on the approved Today. This supersedes round 1's `../03-implementation.md` where they differ. No production code was written. Sizes are relative: **S** a day or two · **M** a week · **L** more.

## 1. Current functionality (no behaviour change; the views read the same data)

| Change | Where | Reuses | Size | Regression tests |
|---|---|---|---|---|
| Tints `dawn`, `day`, `dusk`, `celebrate` in both palettes | `src/design/tokens.ts` | the token file, `tokens.test.ts` contrast | S | contrast of every text pair over each tint |
| The sky (one gradient at the top of Today, People, the page) | `src/ui/Screen.tsx` (`sky` prop) | `Screen`, `usePalette` | S | snapshot light / night |
| The sundial | `src/ui/Sundial.tsx` (new) | `react-native-svg`, `useNight` | S | snapshot per hour band |
| The kicker (fixed template per `ReasonType`), the statement at 36/40 on Today, the hope line as italic paraphrase, Not now as a text link | `src/ui/Moment.tsx`, `tokens.ts` (`type.momentDisplay`), `TodayView.tsx` | `Italic`, `Pill` (new `text` variant) | S | `Moment` snapshot per reason type; Dynamic Type at AX1 (3-line reflow gate) |
| The quotation rule in the view: quotes only around `MomentDetail`'s source excerpt and verbatim Between-you lines | `MomentDetailSheet.tsx`, `PortraitView.tsx`, `Text.tsx` (`Quote`) | `Provenance` | S | a test that no `“` reaches `TodayView` or `QuietLine` output |
| Occasion illustrations (laurel, candle, door, rings, key, bow); none for sensitive | `src/ui/illustration/` (new), `Moment.tsx` two-column row | `react-native-svg`, the sprig's leaf maths | M | snapshot per kind; a test that `sensitivity !== "none"` never gets one |
| The meadow under the moment, taller on a quiet day, under a page's name | `src/ui/Meadow.tsx` (new) | `Sprig`, `prng` | S | identity-only property test (ids are the only person input) |
| Day numerals in the week; ochre for the user's own promise | `QuietLine.tsx` (`day` prop) | `relativeDay` | S | snapshot |
| The return composition: question first; "You opened Messages earlier." from the hand-off's channel and time; the reason as context; "Open Messages again" as a link | `TodayView.tsx` | `ReturnView` (`ask`, `about`, `channel`) unchanged; the re-open uses the existing hand-off | S | the existing return-check tests, plus "no primary pill while a return check is open" and "the observed line names only the channel that was opened" |
| Resolve after Yes (240 ms cross-fade, then arrive) | `TodayView.tsx` | the approved haptic, `motion` tokens | S | Reduce Motion twin |
| First use: the worked example as a small letter | `TodayView.tsx` (FIRST_USE / BRING_BACK copy unchanged in intent) | `Moment` at a small size | S | `firstRun.test.tsx` unchanged; the example is asserted present |
| People: serif names, italic letter marks, A–Z index past 30, search match underlined | `PeopleView.tsx`, `Row.tsx` | `Row`, `SectionList` | M | 500-row scroll on device; VoiceOver reads a list |
| The portrait (P1): the now line, the shared ground, verbatim quotes, Remembered rendering | `PortraitView.tsx`, `portraitModel.ts` (a pure "now" pick: the soonest Coming up line, else the newest Lately line) | the portrait rules unchanged (3 per section, time order) | M | `memoryProofs.test.ts` density cases; sparse / rich / shared snapshots |

Total for current functionality: **M–L** (about three weeks of view work; no backend, no migration, no gateway change).

## 2. Future CC-25 capabilities the design is ready for (no work until each has its brief)

| Capability (bucket) | Design already holds | Work when its time comes |
|---|---|---|
| Promise reasons, RSN-06 (B) | kicker "You said you'd", the bow, return copy, no memory prompt after Yes (I2) | the reason type and its brief; one kicker string; one illustration already drawn |
| Open-thread reasons, RSN-07 (B) | kicker "A while ago", no illustration | the reason type and its brief; one kicker string |
| Minimal push (B) | the private lock-screen treatment ("Something for today.", every kind); deep link to Today at the Moment; the detail one tap further | notifications, permission moment, budget, pause (its own brief); any richer preview is a founder decision |
| Remembered / Paused, D13 (B) | the remembered sprig and page; the italic word in People; Paused identical to active | the Edit-sheet controls, the server states; **explicit Ask behaviour for these people is deferred to the trust brief** |
| Hard-time reasons, RSN-09 (C) | the plain letter: no kicker, no illustration, no band (illustrative) | the type, its channel preference, tone rules, lock-screen privacy |
| Grounded Ask (C) | the Ask row under People's results (S1), the answer surface with typed results (established · related · memory-only), member-level provenance for composed lines, "Which Sam?", "nothing kept", *Ask about Priya →* | `retrieval_answer` and its evals (grounding, refusal, privacy; identity resolution that never promotes a related person); the answer view; a full-height variant past three results. All PROVISIONAL until that evidence exists |
| Reason feedback (C) | a quiet third action in the Moment detail (not drawn) | the mute rule |
| Chapters, Intentions, reflection, calendar (D) | reservations only: a filter row on People; a Tell about yourself; a push that opens Today; an evidence line in the detail | undesigned by decision |

## 3. What is **not** proposed

No change to eligibility, scoring, the ≥ 55 threshold, the person cap, freshness, `COMING_SHOWN`, the copy templates for statements and contexts, provenance, the hand-off sheet, the return-check timing / persistence / recording, the Kept line, the Tell pipeline, the two-item bar, People's order, the portrait's section rules, What Kinship knows (B8), any schema, any gateway behaviour.

## 4. Sequencing and rollout, if adopted

1. Decisions 1–12 (`03-founder-decisions.md`) and AR-1…AR-8 (`00-experience-architecture.md`) recorded in `approved-design-coverage.md`.
2. Tokens and the quotation rule first (they are also trust fixes); then Today; then People and the portrait; each behind `shell_v2`'s existing structure, no new flag needed.
3. A native pass on the "V" items (36 pt, tints, sundial, press-lift) before anything reaches the wife's build.
4. Readiness labels apply as always: NOT READY until the founder's native pass.
