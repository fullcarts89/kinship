# Motion and touch in Kinship: a review against two design reels — 13 Nov 2026

**Dated and non-canonical.** This is an audit, not a product source. It does not outrank the contract, the approved
boards or any founder decision. The fixes it records bring the code back to rules that already stand. Everything
that would change how Kinship looks, moves or reads waits for the founder (§5).

## 1. Why this review exists

The founder shared two short reels by the same creator and asked to apply whatever fits Kinship:

- **["20 Principles of UX & Animation (in under 30 seconds)"](https://www.instagram.com/reel/DfphRvFBx54/).** Disney's
  animation principles (squash and stretch, anticipation, staging, arcs, timing, exaggeration, appeal) and eight UX
  laws (Fitts, Hick, Miller, Doherty, Postel, Jakob, bigger hit areas, frequency of use).
- **["20 Ways to Make Beautiful UI Animations (in under 60 seconds)"](https://www.instagram.com/reel/DfXKRDQRBS_/).**
  The practitioner's version: ease-out for entrances, exits about 20% shorter, enter from and exit to the trigger,
  no bounce on everyday UI, don't tween while the user holds something, scale to 0.97 on press, a pulse to confirm
  success, rubber-banding past bounds, shared layout ids.

The first reel offers "the skill that teaches Claude to do all of this" to viewers who comment "motion". That skill
was not found publicly, so this review works from the 40 points as the reels state them.

**Method.** The 2.0 shell (`src/ui`, `src/features`, `app/v2`) was read for:
- tap targets under `TOUCH` (44 pt)
- hard-coded motion
- Reduce Motion handling
- easing, overshoot and loops
- pressed feedback
- choice count

Each point was weighed against the contract (§2 rules, §4 experience rules, §7 trust), the motion and press tokens in
`src/design/tokens.ts`, and the founder's decisions in `approved-design-coverage.md`. All 40 verdicts are in the
appendix.

## 2. The short version

Kinship already moves the way the second reel asks, mostly. Arrivals ease out. The full-screen moment grows from its
card and shrinks back into it. Exits are shorter than entrances. A dragged sheet follows the finger directly. Nothing
bounces.

Kinship deliberately declines the reels' expressive half: squash, wind-ups, exaggeration, scale-on-press, success
pulses and rubber-banding. The approved design, and in two places the founder, already ruled those out. The calm is
the product, not a gap.

The review found gaps where Kinship broke its *own* rules:
- Reduce Motion didn't hold from the first frame.
- A dozen tap targets fell short of the 44 pt the tokens promise.
- One row gave no feedback.
- A few entrances used the platform's default curve instead of the approved one.

Those are fixed here, without changing anything a user would see as a design change. What remains is a short list
of real choices for the founder (§5).

## 3. Where the reels and Kinship disagree, and why Kinship holds

The reels are written for products that want delight to register: launchers, dashboards, playful consumer apps.
Kinship's design asks for the opposite register. "A well-kept herbarium in a quiet room… Most days the whole app is
one sentence and one door out of it." Its intended outcome is a real conversation outside the app, and rising
time-in-app counts as a regression (contract §2).

Motion that performs works against that, so these points are **not adopted**:

| Declined | The standing rule that already decides it |
|---|---|
| Squash and stretch; **scale to 0.97 on press** | `press`: "an immediate dim, never a scale or a bounce" |
| Follow-through; **bounce** (which the second reel also rejects for everyday UI) | Sheets: "360 ms spring, no overshoot" |
| **Rubber-band past bounds** | Founder J5 (8 Oct): a sheet's content "no longer bounces at the top"; sheets and the notebook Tell page set `bounces={false}`, and the drag clamps at the top |
| Anticipation (wind-up), secondary action (flourish), exaggeration | H4's guardrail: "no decorative motion". A birthday already lands through its joyful wash; the lime underline drawing under understood words is the one motion that carries meaning |
| **A pulse to confirm success** | Success is said in words on the Kept card ("Kept for Priya"), with Undo. A celebratory pulse would make keeping a memory feel like a score, which is close to what contract §2 rule 3 rules out |
| Arcs; stretched knobs; popovers from 0.95; masks; icon crossfade with blur | Nothing in Kinship travels far, and there are no knobs or popovers. The masks it does use (the person's photo, the bloom-filled name) are art, not transitions |
| "Keep UI under 300 ms"; "dropdowns at 150–250 ms" | Kinship's slower arrivals are approved: arrive 320, sheet 360, hero 520, understand 600. Small state changes are already 160 ms, and exits 240 |

## 4. Where they agree, and what this pass fixed

### Already true

The second reel's craft rules are mostly the code already:
- **Ease-out on entrances.** Moment, Today's hero, sheets and How it works use the arrive curve, (0.2, 0.8, 0.2, 1).
- **Ease-in on exits.** A sheet leaves on `Easing.in(cubic)`.
- **Exits 20% shorter.** Sheet 360 in, 240 out. The moment expands in 420 ms and closes in 320. Its fade is 240 in,
  200 out.
- **Enter from the trigger, exit to it.** One shared element: `MomentFull` grows from the card's own frame and
  returns to it.
- **Don't tween while held.** The sheet takes the finger's position directly and only animates on release.

The first reel's UX laws are the product's structure:
- one Moment and one primary action (staging, Hick)
- at most three lines a section, then "and N more" (Miller)
- natural-language Tell (Postel)
- system sheets, pickers and the Contacts picker (Jakob)
- the "remove the logo" test (appeal)

### Fixed in this pass

These fixes restore a rule already in force or are accessibility fixes (contract §4 allows accessibility as a reason
to deviate). None changes layout, copy, colour or what appears.

1. **Reduce Motion now holds from the first frame.** This was the most important finding. The shared
   `useReduceMotion` hook started every component at `false` and only learned the real setting from an async system
   call. With Reduce Motion on:
   - Today's hero, a Moment, How it works and every sheet started their full rise or slide.
   - They then re-ran as a fade from wherever they had got to.

   Someone who asked for less motion still saw part of it, every time. The setting is now read once when the app
   loads and kept current, so each component mounts already knowing it. `src/ui/__tests__/reduceMotion.test.tsx`
   fails on the old hook and passes on the new one. Relatedly, How it works now fades under Reduce Motion instead of
   sliding, as the notebook Tell page already did.
2. **Tap targets meet 44 pt (Fitts; bigger hit areas).** `TOUCH = 44` is the rule, and these controls fell short:

   | Control | Was | Now |
   |---|---|---|
   | Lens tabs (Now · Pages · Knows) | 38 pt tall | 46 pt |
   | Person page "Edit" / "Undo" | ~26–33 pt wide | +8 pt each side |
   | The dock's "Undo" | ~33 pt wide | +8 pt each side |
   | The alpha dock's kept line | 16–32 pt tall | fills its 44 pt row |
   | Listening › "Open Settings" | 36 pt | 44 pt |
   | The line sheet's kind caption | 24 pt | 44 pt |

   Each was done with `hitSlop` or by filling the row, so nothing looks different. Neighbours were checked so no two
   targets overlap.
3. **Every press answers (Doherty).** The review's line row was the one control with no pressed state. Its only
   result, a phrase lit in "Your words", can be scrolled off-screen, so a tap could show nothing. It now dims like
   every other control.
4. **Every entrance uses the approved curve (ease-out for entrances).** `motion.arrive` specifies the arrival
   easing, and the main arrivals used it, but four smaller ones used React Native's default ease-in-out:
   - the person page's lens change
   - the review fading in over the Tell page
   - How it works' step text
   - the ideas list

   They now use the arrive curve at their existing durations. In the first pass this was held back as a possible
   visible change. The second reel's rule, together with the token itself, makes it conformance rather than a new
   look. Non-arrivals keep their curves (the underline draw, the focus fade, the breathing dot).
5. **The tokens are the one source.** Literal durations equal to tokens (150, 240, 320, 600) now name them.

**Checks:**
- `npx jest`: 133 suites, 1,334 tests passed
- `npx tsc --noEmit`: clean
- `npx eslint app src`: 0 errors (its warnings predate this pass)
- `app/__tests__/firstRun.test.tsx`: unchanged and passing

**Native:** not run; this environment has no iPhone or simulator. **Readiness: NOT READY.**

## 5. For the founder

Each of these would change what a person sees or feels, so none is built.

1. **Source links are 29–31 pt tall.** These are the provenance line under every memory: `Provenance`, `NSource`,
   `PrivateSource` and the "You could…" suggestion. They sit just below a tappable line, so a 44 pt target would take
   the bottom of that line's. Options:
   - (a) extra slop downward only;
   - (b) one row whose tap opens the line, with the source in the line sheet;
   - (c) leave them.

   This needs a device check. Also small, all nested text that can't take slop:
   - Welcome's Terms / Privacy Policy (~16 pt)
   - the review's "Add {name}" tag (~14 pt)
   - the day word and phrases in "Your words" (25–28 pt)
   - the A–Z rail (30 × 15 pt a letter; iOS's own index is similar)
2. **Today animates every time it opens (frequency of use).** The hero rises 14 pt over 520 ms on every open.
   Proposal: the full arrival on the day's first open, a 150 ms fade after that. Kinship wants to be opened briefly
   and left, so later visits shouldn't perform.
3. **The A–Z rail gives no feedback under the finger.** The list jumping is the only sign. A quiet highlight on the
   current letter would help.
4. **The mic ↔ send swap in the Tell field is instant** when the first character is typed. The second reel suggests a
   crossfade. A short opacity crossfade (`motion.quick`, no blur, no scale) would match Kinship's register.
5. **Name the remaining motion values** in `motion`, at their current values, so there's no visible change:
   - 420 (the moment's expansion)
   - 200 (the moment's fade-out, the lens change)
   - 260 (the review fade)
   - 900 (`LineFocus`)
   - 500 (the breathing dot)
   - 1200 (the review's highlight)
   - the 110 / 60 ms staggers

   Optionally take the expansion to 360 to match the sheet.
6. **Choice counts are reviewed; no change recommended.** These screens give 4–6 equal choices:
   - "What was off?" (5)
   - "How were you in touch with X?" (4)
   - the line sheet's 2 × 2
   - "Who is Matt?" (up to 4 + skip)
   - the kind picker (6)

   Each is a closed picker or a trust question, where a highlighted default would be a guess (contract §7.3).

Not changed, and not proposed: system spinners keep spinning under Reduce Motion (Apple keeps them). The review's
1.2 s highlight is a fade, not movement.

---

## Appendix: all 40 points

**Reel 1: principles and laws.**

| # | Point | Verdict |
|---|---|---|
| 1 | Squash and stretch | Declined (§3) |
| 2 | Anticipation | Declined (§3) |
| 3 | Staging | Already the design |
| 4 | Pose to pose | n/a (an animator's technique) |
| 5 | Follow-through | Declined (§3) |
| 6 | Slow in, slow out | Already the design; four entrances aligned (§4.4) |
| 7 | Arcs | Declined (§3) |
| 8 | Secondary action | Declined (§3) |
| 9 | Timing, under 300 ms | Approved durations kept (§3); see §5.5 |
| 10 | Exaggeration | Declined (§3) |
| 11 | Solid drawing | Already as far as wanted (one raised surface, the art) |
| 12 | Appeal | Already the design |
| 13 | Fitts's law | Fixed (§4.2); source links open (§5.1) |
| 14 | Bigger hit areas | Fixed (§4.2) |
| 15 | Hick's law | Already the design; no change (§5.6) |
| 16 | Miller's law | Already the design |
| 17 | Doherty threshold | Fixed the one gap (§4.3); rail open (§5.3) |
| 18 | Postel's law | Already the design |
| 19 | Jakob's law | Already the design |
| 20 | Frequency of use | For the founder (§5.2) |

**Reel 2: techniques.**

| # | Point | Verdict |
|---|---|---|
| 1 | Ease-out for entrances | Fixed where it wasn't (§4.4) |
| 2 | Dropdowns 150–250 ms | n/a (no dropdowns; sheets are approved at 360) |
| 3 | Stagger rows by 30 ms | Kinship staggers ideas (60 ms) and underlines (110 ms) on purpose; no change |
| 4 | Scale to 0.97 on press | Declined (§3) |
| 5 | Stretch moving knobs | n/a |
| 6 | Stagger as details settle | Already (the ideas list, the understood words) |
| 7 | Arcs for movement | Declined (§3) |
| 8 | Pulse to confirm success | Declined (§3) |
| 9 | Ease-in-out for on-screen moves | Already (the lens shift's position; the moment's expansion) |
| 10 | Popovers from 0.95 | n/a |
| 11 | Enter from the trigger | Already (`MomentFull`) |
| 12 | Exit to the trigger | Already (`MomentFull`) |
| 13 | No bounce on everyday UI | Already the design |
| 14 | Don't tween while held | Already (the sheet drag) |
| 15 | Exits ~20% shorter | Already (sheet, moment, fade) |
| 16 | Overlap old and new states | Already where it matters (the moment's card and full view cross) |
| 17 | Masks for reveals and colour | n/a for transitions (masks are art here) |
| 18 | Crossfade icons | For the founder (§5.4), without blur or scale |
| 19 | Rubber-band past bounds | Declined (§3, founder J5) |
| 20 | Reuse the same layout id | Already (`MomentFull`'s shared frame) |
