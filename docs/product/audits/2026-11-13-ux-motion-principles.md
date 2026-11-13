# UX and motion principles review — 13 Nov 2026

**Dated and non-canonical.** This is an audit, not a product source. It does not outrank the contract, the approved
boards or any founder decision. Nothing here changes what Kinship looks like or says. Every change that would is
listed under "For the founder" and waits for a yes.

**Prompt.** The founder asked to apply what fits Kinship from a reel,
["20 Principles of UX & Animation (in under 30 seconds)"](https://www.instagram.com/reel/DfphRvFBx54/). The reel names
12 animation principles and 8 UX laws, and ends by offering "the skill that teaches Claude to do all of this" to
viewers who comment "motion". That skill was not found publicly, so this review works from the 20 principles as the
reel states them.

**Method.** The 2.0 shell (`src/ui`, `src/features`, `app/v2`) was read for:
- tap targets under `TOUCH` (44 pt)
- hard-coded or untokenised motion
- Reduce Motion handling
- linear motion, overshoot and loops
- missing pressed feedback
- action choices with more than three equal options

Before anything was changed, each principle was weighed against the contract (§2 rules, §4 experience rules, §7
trust) and the motion and press tokens (`src/design/tokens.ts`).

---

## 1. The 20 principles against Kinship

| # | Principle (the reel's gloss) | Verdict | Why |
|---|---|---|---|
| 1 | Squash and stretch: "things squish on impact to show weight" | **Not adopted** | `press`: "an immediate dim, never a scale or a bounce". Kinship's calm is part of the approved design |
| 2 | Anticipation: "a small wind-up before the big move" | **Not adopted** | A wind-up delays the result and is decorative motion (H4 guardrail: "no decorative motion") |
| 3 | Staging: "direct the eye to one thing at a time" | **Already the design** | One Moment on Today, one primary action and a quiet "Not now", "Most days the whole app is one sentence and one door out of it" |
| 4 | Pose to pose: "set the key poses, let the rest fill in" | n/a | An animator's technique; Kinship's arrivals are already from/to tweens |
| 5 | Follow-through: "parts keep moving after the main body stops" | **Not adopted** | Equivalent to overshoot; sheets are "360 ms spring, no overshoot" |
| 6 | Slow in, slow out: "speed up and slow down, never constant" | **Already the design** (verified) | No `Easing.linear` anywhere in 2.0; the arrive curve is (0.2, 0.8, 0.2, 1). Several `Animated.timing` calls use React Native's default ease rather than the token curve (§3 item 5) |
| 7 | Arcs: "move along curves, not straight lines" | **Not adopted** | Nothing in Kinship travels far enough for a path to read; rises are 8–14 pt |
| 8 | Secondary action: "a small flourish that backs up the main one" | **Not adopted** | Flourishes are decorative; the lime underline drawing under understood words (600 ms) is the one approved "secondary" motion and it carries meaning |
| 9 | Timing: "keep UI under 300 ms" | **Considered, no change** | Approved durations are deliberately slower and calmer (arrive 320, sheet 360, hero 520, understand 600). Small state changes are already 160 ms. See §3 item 2 |
| 10 | Exaggeration: "push it past real so the moment lands" | **Not adopted** | Contradicts "quiet"; a birthday already gets the joyful wash, which is the approved way a moment lands |
| 11 | Solid drawing: "give flat things depth and volume" | **Already the design** (as far as it goes) | One raised surface with one soft lift; Electric Garden's art and grain. No more depth wanted |
| 12 | Appeal: "the sum of every detail, done with care" | **Already the design** | The "remove the logo" test |
| 13 | Fitts's law: "bigger, closer targets are faster to hit" | **Applied** (where it was a defect) | `TOUCH = 44` is the rule; several controls fell short (§2) |
| 14 | Bigger hit areas: "the clickable zone can be bigger than it looks" | **Applied** | Done with `hitSlop` or by filling the row, so nothing looks different (§2). Source links wait for a device check (§3 item 1) |
| 15 | Hick's law: "more choices, slower decisions" | **Already the design**; a few places reviewed, no change recommended | One primary per screen. The places with 4–6 equal choices are trust questions ("Who is Matt?") or closed pickers, where a default would be a guess (contract §7.3) (§3 item 4) |
| 16 | Miller's law: "about 7 things at once, so chunk it" | **Already the design** | At most 3 lines a section on the Portrait; "and N more"; sections in What Kinship knows |
| 17 | Doherty threshold: "respond within 400 ms" | **Already the design**; one gap fixed | The press dim is immediate; Tell shows "Understanding…" at once. One row gave no feedback at all (§2) |
| 18 | Postel's law: "accept messy input, give back clean output" | **Already the design** | The Tell: natural language in, sourced lines out; "Chris'", "Chris's" are Chris (K7) |
| 19 | Jakob's law: "people expect your app to work like the others" | **Already the design** | System sheets and pickers, back, drag-to-dismiss, the Contacts picker, the share sheet |
| 20 | Frequency of use: "the more it's used, the less it should animate" | **For the founder** | Today's hero arrival (520 ms rise) plays on every open (§3 item 3) |

## 2. Applied in this pass (no visible change)

Each change either restores a rule that already stands, or is an accessibility fix (contract §4: accessibility is an
allowed reason to deviate). None changes layout, copy or what appears.

| What | Where | Before → after |
|---|---|---|
| **Reduce Motion started late** | `src/ui/theme.ts` `useReduceMotion` | Every component started from `false` and switched once the system answered asynchronously. With Reduce Motion on, Today's hero, a Moment, the How it works rise and every sheet began their full rise or slide, then re-ran as a fade from wherever they were. The rise or slide was **partly visible**. Now the setting is read once when the app loads, kept current, and each component mounts already knowing it. Regression test: `src/ui/__tests__/reduceMotion.test.tsx` (it fails on the old hook) |
| Reduce Motion ignored | `src/features/welcome/HowItWorks.tsx` | The example always slid up. Now it fades with Reduce Motion on, as the notebook Tell page already did |
| No pressed feedback | `src/features/tell/notebook/NotebookReview.tsx` review line row | A tap only lit its phrase in "Your words", which can be scrolled off-screen, so the tap could show nothing. It now dims on press like every other control |
| Tap target 38 pt tall | Lens tabs (Now · Pages · Knows), `src/ui/notebook/parts.tsx` | The well's 4 pt padding is now part of each tab: 46 pt |
| Tap target ~26–33 pt wide | Person page "Edit" / "Undo" (`QuietControl`), the dock's "Undo" (`NotebookDock` `Link`) | 8 pt of slop each side. Neighbours sit `space.l` apart, so the slop never overlaps |
| Tap target 16–32 pt tall | The kept line in the alpha Tell dock (`TellDock` `KeptLine`) | The control now fills its 44 pt row instead of only its text |
| Tap target 36 pt tall | Listening › "Open Settings" | 4 pt of slop above and below: 44 pt |
| Tap target 24 pt tall | Line sheet › the kind caption ("A plan · …") that opens the kind picker | Slop above and below: 44 pt. Nothing tappable is adjacent |
| Literal durations equal to tokens | `MomentFull.tsx`, `YourWords.tsx`, `IdeasViews.tsx` | `150` → `motion.reduced.duration`, `240` → `motion.sheetOut.duration`, `320` → `motion.arrive.duration`, `600` → `motion.understand.duration`. Same values; the tokens are now the one source (tokens.ts header rule) |

**Checks:** `npx jest` 132 suites / 1332 tests passed before the new test was added, and the new test passes.
`npx tsc --noEmit` clean. `npx eslint app src`: 0 errors (the warnings were there before).
**Native:** not run. This environment has no iPhone or simulator. **Readiness: NOT READY.**

## 3. For the founder (not built)

1. **Source links are 29–31 pt tall.** These are the provenance under every line: `Provenance`, `NSource`,
   `PrivateSource`, `SuggestionLine`. They sit just below a tappable memory line, so enlarging their slop to 44 pt
   would take the bottom of that line's tap area. Options:
   - (a) more slop downward only;
   - (b) make the line and its source one row whose tap opens the line, with the source reached from the line sheet;
   - (c) leave them.

   This needs a device check before choosing.

   Also small, all nested text links that can't take slop:
   - Welcome's "Terms" / "Privacy Policy" (~16 pt)
   - the review's "Add {name}" tag (~14 pt)
   - the day word and the phrases in "Your words" (25–28 pt)
   - the A–Z rail (30 × 15 pt per letter; iOS's own index is similar)
2. **Timing under 300 ms (principle 9).** No change recommended. Kinship's slower arrivals are approved and part of
   its calm. The one candidate to tighten is the Moment's full-screen expansion (`EXPAND_MS = 420`), which isn't a
   token. It could take `motion.sheet.duration` (360).
3. **Frequency of use (principle 20).** Today is opened many times a day, and its hero rises (520 ms, 14 pt) every
   time. Proposal: the full arrival on the first open of a day; later opens the same day fade in (150 ms). This is a
   change to an approved surface's motion, so it needs a yes.
4. **Choices (principle 15).** Reviewed, no change recommended:
   - "What was off?" (5 reasons)
   - "How were you in touch with X?" (4)
   - the line sheet's 2 × 2 actions
   - the "Who is Matt?" choices (up to 4 + skip)
   - the kind picker (6)

   Each is either a closed picker or a trust question where a highlighted default would be a guess (§7.3: "never a
   guess").
5. **Untokenised motion values.**
   - The values: 420 (expand), 200 (fade out, lens change), 260 (`FadeIn`), 900 (`LineFocus`), 500 (the breathing
     dot), 1200 (the review's pulse), and the staggers 110 / 60.
   - Proposal: name them in `motion` at their current values, so there's no visible change.
   - Separately, aligning the `Animated.timing` calls that use React Native's default ease to `motion.arrive.easing`
     would be a small visible change.
6. **The A–Z rail** gives no highlight under the finger; the list jumping is the only feedback. A quiet highlight
   on the current letter would answer principle 17. It's a visible change.

Not changed, and not proposed: system spinners keep spinning under Reduce Motion (Apple keeps them). The review's
1.2 s highlight fade is a fade, not movement.
