# If the Garden Letter were built: an implementation proposal

**Status: EXPLORATORY · UNAPPROVED. Nothing here is scheduled.** Intended timing per the founder's brief: after B9 and the employer evaluation, alongside the post-B9 return-value work, and only after the decisions in `04-founder-decisions.md`. Nothing in this proposal touches `todayModel.ts` ranking or eligibility, memory schemas, reasons, sync, navigation, or the Tell pipeline.

Complexity is relative: **S** (a day or two), **M** (a week), **L** (more than a week or needs native work).

## 1. Visual-only changes (no behaviour change; the view reads the same `TodayView` data)

| Change | Where | Reuses | Size |
|---|---|---|---|
| The hour's tint: four new palette entries (`dawn`, `day`, `dusk`, `celebrate`) in `color.light` and `color.night`, with contrast checks | `src/design/tokens.ts`, `tokens.test.ts` | the token file and its contrast test | S |
| The sky: one vertical gradient at the top of Today, People and the person page, chosen from the hour (`expo-linear-gradient` is already a dependency of the 1.0 shell; otherwise a 2-stop `react-native-svg` rect) | `src/ui/Screen.tsx` (a `sky` prop) | `Screen`, `usePalette` | S |
| The sundial: a 150 × 62 SVG arc with the sun or moon at the hour | `src/ui/Sundial.tsx` (new) | `react-native-svg`, `useNight` | S |
| The kicker: an italic serif line over the statement, from a fixed template per `ReasonType` | `src/ui/Moment.tsx` (a `kicker` prop); the template table beside `todayModel.ts` copy, **as display copy only** (no ranking or eligibility change) | `Italic` text style | S |
| The statement at 36/40 instead of 34/38 on Today only; `maxScale.display` unchanged | `tokens.ts` (`type.momentDisplay`), `Text.tsx` | — | S |
| The pull-quote: the `hope` line in italic serif 20/27 with quotation marks | `Moment.tsx` | `Italic` | S |
| The illustration: one SVG per reason kind (laurel, candle, door, rings, key, bow), single ink, 7% wash, floated right with the statement wrapping. RN has no `shape-outside`; the layout is a two-column row with the statement given `flex: 1` and the art a fixed 128 × 128 box, which reads the same at Display size | `src/ui/illustration/` (new), `Moment.tsx` | `react-native-svg`, the sprig's leaf maths for the laurel | M |
| The meadow: a seeded grass strip (one path) under the moment with the person's sprig standing at the left | `src/ui/Meadow.tsx` (new) | `Sprig`, `prng` from `sprig/generate.ts` | S |
| The hedgerow: everyone's sprigs on one soil line above the Tell dock, alphabetical, one size, memoised; the moment's person's root mark in ochre | `src/ui/Hedgerow.tsx` (new), rendered by `app/v2/(main)/index.tsx` above the dock | `Sprig`, `cachedSprig`, the People query already on the shell | M |
| The week: day numerals (weekday + date) beside each Coming up / Waiting line; "You said you'd" lines in ochre | `src/ui/QuietLine.tsx` (a `day` prop) | `QuietLine`, `relativeDay` | S |
| Not now as a text link beside the primary pill | `TodayView.tsx` | `Pill variant="text"` (new variant) | S |
| People: the italic line ("Fourteen people. Mid-October.") and sprigs standing on the row hairline | `PeopleView.tsx`, `Row.tsx` | `Row`, `Italic` | S |
| Person page: the sprig standing on a grass strip under the name; "Between you" lines in italic 21/29 | `PortraitView.tsx` | `Meadow` | S |
| Night: the same components with the night palette; the sundial shows the moon | tokens | — | — |

Visual-only total: **M overall** (about two weeks of view work, no backend).

## 2. Interaction changes (new motion, same data and same outcomes)

| Change | Where | Reuses | Size |
|---|---|---|---|
| Three-beat arrive (header, plate, actions/week at 0 / 80 / 160 ms) | `Moment.tsx`, `TodayView.tsx` | the existing `Animated` arrive, `useReduceMotion` | S |
| Press-lift on the moment's words (2 pt, 160 ms) | `Moment.tsx` | `Pressable` | S |
| Not now: slide right + fade (320 ms), then the next state arrives | `TodayView.tsx` | `Animated`, `motion` tokens | S |
| The return: press (600 ms), light pass (900 ms), root mark fade (600 ms), then the question | `TodayView.tsx`, `Hedgerow`, `Screen` | the one approved haptic | M |
| Reduce Motion twins for all of the above (150 ms fades) | same | `motion.reduced` | S (with each) |
| Two proposed haptics (Not now tick; sheet rest) | `src/platform/haptics.ts` | — | S, **decision first** |
| Quiet → active: cross-fade headline, moment arrives | `TodayView.tsx` | — | S |
| Dynamic Type: the art column collapses under the statement above `maxScale.display` | `Moment.tsx` | `maxScale` | S |

Interaction total: **M**.

## 3. Changes that require product decisions first

See `04-founder-decisions.md`. In short: a gradient and a tint; a third meaning for ochre; spot illustrations as a new vocabulary; 36 pt on Today; a kicker as new copy; the hedgerow (and its rule past ~16 people); the "press" and "light" on Yes; two new haptics; the celebration band; the quiet day's season line; whether "a count of people" in the People italic line is acceptable (it counts people, not a relationship).

## 4. Changes that depend on future roadmap capabilities

| Depends on | What the design would then add |
|---|---|
| Promise reasons (RSN-06, "Commit next") | the bow illustration; "You said you'd" as a kicker; the ochre day numeral |
| Open-thread reasons (RSN-07) | a kicker ("A while ago"); no illustration proposed |
| Hard-time reasons (RSN-09, Alpha) | the plain variant: no kicker, no illustration, no band; must be designed with the tone rules when they are written |
| Minimal push (CC-25) | the notification opens Today to the same plate; the light pass must not run on an open-from-push (it runs only on Yes) |
| Remembered / Paused (D13) | a remembered person's sprig in the hedgerow is drawn in ink-quiet (the approved treatment); a paused person's is identical to everyone's |
| "A year ago" quiet line (coverage #10, open) | a week line with the kicker "A year ago" and the day numeral |
| Reason feedback ("Not helpful", Alpha) | a third quiet action beside Not now; no change to the plate |
| Chapters / life groups (Explore later) | the hedgerow could be filtered by chapter; nothing now |

## 5. Tests the build would add

- `tokens.test.ts`: contrast of every text pair over each tint at 8%.
- `Moment` snapshot per reason kind (kicker + illustration), light and night, Reduce Motion on and off.
- `Hedgerow`: identity-only property test (the same inputs as the sprig's CI area test; no prop can reach it except ids and the one lit id).
- `firstRun.test.tsx` and `.maestro/fresh-install.yaml` unchanged in intent; the hedgerow on a fresh account shows only picked people, asserted.
- The "no model identifier in the bundle" guard is unaffected (no new strings).

## 6. What is **not** proposed

No change to: eligibility, scoring, the ≥ 55 threshold, the person cap, freshness, the quiet-line limits, the copy templates for statements and contexts, provenance, the Moment detail, the hand-off sheet, the return-check rules (10 minutes, three days, Yes-only records), the Kept line, the Tell dock's behaviour, the two-item bar, People's search-first alphabetical order, the portrait's section rules, What Kinship knows (B8 in progress), or any schema.
