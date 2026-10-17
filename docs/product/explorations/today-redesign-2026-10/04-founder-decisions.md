# Founder decisions needed before any production work

**Status: EXPLORATORY · UNAPPROVED.** Every item below departs from an approved board, the Design Direction §H, or a standing rule, and is therefore **FOUNDER APPROVAL REQUIRED**. Until each has a recorded yes in `approved-design-coverage.md`, the approved design stands and nothing is built. Items are grouped so a partial yes is possible: the Garden Letter degrades gracefully if any one is refused.

## A. The room (atmosphere)

| # | Proposal | Departs from | If refused |
|---|---|---|---|
| A1 | **The hour's tint:** a ≤ 8% vertical gradient at the top of Today, People and the person page, from four new palette entries (dawn, day, dusk, celebrate), light and night | §H "no gradients" | Plain paper; the sundial alone marks the hour |
| A2 | **The sundial:** a 150 × 62 dotted arc with the sun (or the moon at night) at the hour, top right of Today | New element | Drop; nothing else depends on it |
| A3 | **The meadow:** a strip of seeded grass under the moment with the person's sprig standing in it; a taller strip on a quiet day | "typographic before graphic" | Keep the sprig beside the statement as today |
| A4 | **The hedgerow:** every person's sprig on one soil line above the Tell dock (board 3's night composition brought to every Today), alphabetical, one size | Board 1 has no hedgerow; D8 is respected (identity drawing only, one size) | Drop; the void returns |
| A5 | **The hedgerow past ~16 people:** proposed rule: the moment's and the week's people first, then alphabetical fill to the width; never recency, frequency or any ranking | New rule; must never become a hidden importance order | Cap at the first 16 alphabetically, or drop A4 |
| A6 | **The People italic line** ("Fourteen people. Mid-October."): counts people, not a relationship | Rule 3 "nothing quantifies a relationship" (a count of people is not a relationship measure, but it is a count) | "Mid-October." alone |
| A7 | **The quiet day's season line** ("Mid-October. A quiet afternoon."): from the date and the clock only | New copy; italic serif for seasons is approved | "Nothing needs you today." alone |

## B. The letter (the moment)

| # | Proposal | Departs from | If refused |
|---|---|---|---|
| B1 | **The kicker:** one italic line naming the kind of day, a fixed template per reason type ("The day after", "A birthday", "Thursday", "You said you'd"); deterministic, no model | New copy on Today | Drop; the statement stands alone as today |
| B2 | **Spot illustrations:** one engraved single-ink drawing per *kind* of reason (laurel, candle, door, rings, key, bow), floated beside the statement; atmosphere, never evidence, never a person | "typographic before graphic"; "no decorative icons" | Drop; the kicker and band carry the kind |
| B3 | **Display at 36/40 on Today** (the scale says 34/38); `maxScale` unchanged | §H type scale | 34/38 |
| B4 | **The pull-quote:** the event's "hope" line in italic serif 20/27 with quotation marks | §H (italic only for places and seasons) | Keep the hope line in sans as today |
| B5 | **The celebration band:** a ≤ 6% warm band behind the plate for a birthday, milestone or good news; never for a hard time | §H "no gradients" | The candle / rings alone |
| B6 | **Not now as a text link** beside the primary pill (one door, one quiet exit) | Board 1's two pills | Keep two pills |
| B7 | **The week's day numerals** (WED 14) beside each quiet line; the user's own promise in ochre | Board 1 caps labels only | Caps labels as today |

## C. The return (the showing-up moment)

| # | Proposal | Departs from | If refused |
|---|---|---|---|
| C1 | **The root mark:** an ochre dot at the moment's person's root in the hedgerow. A third meaning for ochre ("today's reason") beside "understood" and "you said you'd" | §H "ochre marks only two things" | Drop the mark; the hedgerow is uniform |
| C2 | **The press:** on Yes, the plate presses into the paper (scaleY → 0.9, 600 ms) | §H "nothing scales"; the motion spec "never animate to decorate" (argued: it is the one real event) | A 240 ms fade |
| C3 | **The light passes:** a single warm wash over the top of the page on Yes (900 ms) | New motion | Drop |
| C4 | **"You reached Ben."** as the italic line over "Anything worth remembering…" | New copy | Drop the line |

## D. Touch and haptics

| # | Proposal | Departs from | If refused |
|---|---|---|---|
| D1 | **Press-lift on the moment's words** (2 pt, 160 ms) | Spec rule 1 "no scale" (a translate, not a scale; still movement on press) | Dim only |
| D2 | **Not now slides right** (320 ms) | New motion | 240 ms fade |
| D3 | **Two new haptics:** a soft tick on Not now; a soft tap when a sheet reaches rest | Design Direction allows three, one is built | Keep the one |

## E. Scope and sequencing

| # | Question |
|---|---|
| E1 | Confirm the timing: after B9 and the employer evaluation, as part of the return-value work, never before. |
| E2 | Confirm the hybrid as the direction (vs. A, B or C alone), or ask for a further round on one of them. |
| E3 | Whether People and the person page adopt the room (A1, A3) at the same time as Today, or Today first. |
| E4 | Whether the illustration set is drawn in-house (as these were) or commissioned; either way one ink, hairline, 7% wash, no people. |
| E5 | Whether to run this past the wife's dogfood round 1 unchanged (the approved Today) and introduce the Garden Letter in round 2, so the change itself can be felt. |

## What needs **no** decision (already within approved rules)

Serif for people and sans for the machine; the sprig as identity only, one size, no marks; provenance with the ochre dot; one primary action; the Tell dock pinned above the two-item bar; the approved copy templates; the Moment detail sheet; the hand-off sheet; the return-check rules; Reduce Motion → 150 ms fades; the night palette; nothing manufactured on a quiet day; first use ≠ quiet day; no illustration or kicker for sensitive reasons.
