# Interaction and motion concepts for the Garden Letter

**Status: EXPLORATORY · UNAPPROVED.** Extends the proposed spec in `interaction-motion-audit.md` §9; nothing here replaces an approved value without the founder's yes. Everything below is implemented in `prototype.html` so it can be felt, not read.

## Principles kept

Acknowledge every touch at once. Move only what arrives or leaves. Nothing loops. Never animate to decorate. Reduce Motion turns every movement into a 150 ms fade. One new principle: **the room may notice, once, when something real happened.**

## How a moment appears

- The page composes in three beats, 80 ms apart: the header, then the plate (kicker, statement, context, pull-quote, provenance), then the actions, then the week. Each is the approved arrive (320 ms, 8 pt rise, bezier .2 .8 .2 1). Total under half a second; one 150 ms fade under Reduce Motion.
- The illustration arrives with the plate; it does not draw itself. (A stroke-draw was tried in thought and rejected: it makes the drawing the event.)
- The hedgerow is already there; it never animates on open.

## Touching the moment

- **Press on the words:** the words lift 2 pt and dim to 0.85 for the duration of the touch (`transform` only, 160 ms). Release opens the Moment detail sheet (approved I1). Under Reduce Motion: dim only.
- **Press on the primary pill:** the approved dim (0.72). The hand-off sheet rises (360 ms, no overshoot), scrim fades.
- **Not now:** the plate and its actions slide 60 pt to the right and fade (320 ms, ease-in). The quiet day (or the next moment) arrives in its place. A soft tick haptic is proposed here (not one of the three approved; a decision).
- **A week line:** the approved dim; opens the same detail sheet.

## The return

1. The user comes back. The return check arrives as a slip above the moment: a hairline above and below, the question in 21 pt, the moment's context in 12 pt, Yes · Not yet. The moment stays beneath it, unchanged.
2. **Yes:** the one approved success haptic. The slip, the plate and the actions **press** into the paper: scaleY 1 → 0.9, 10 pt down, fade, 600 ms. **Light passes** once over the garden: a warm wash at the top of the paper, 0 → 0.5 → 0 over 900 ms. The moment's **root mark** in the hedgerow fades out (600 ms). Then the optional question arrives ("You reached Ben." in italic, then "Anything worth remembering from talking with Ben?").
3. **Not yet:** nothing moves; the slip fades; the moment stays.
4. Under Reduce Motion: every step is a 150 ms fade; no press, no light.

This is the only place Today "celebrates", and it celebrates the user's action, not a number. Nothing persists afterwards: tomorrow the garden is the same garden.

## Kinds of moments feel different

| Kind | Kicker (fixed template) | Illustration | Tint | Anything else |
|---|---|---|---|---|
| Event follow-up (race, interview, exam…) | "The day after" | laurel (race), door (interview, first day) | the hour's | — |
| Upcoming event | "Tomorrow" / weekday | by type | the hour's | — |
| Birthday | "A birthday" | a candle | a warm band behind the plate (≤ 6%) | the statement wraps around the candle |
| Milestone (wedding, new job, baby, home…) | weekday / "Today" | rings, key, cradle (to draw) | the warm band | — |
| Good news | "Yesterday" / "Today" | laurel | the warm band | — |
| Promise (future, RSN-06) | "You said you'd" | a tied bow | none | the day numeral in ochre in the week |
| Open thread (future, RSN-07) | "A while ago" | none proposed | none | — |
| Hard time (Alpha, RSN-09) | none | **none** | none | never a celebration band; plain paper; the kicker is empty |

The difference between kinds is carried by three things only (kicker, illustration, band). The anatomy, the copy templates and the actions are unchanged.

## The quiet day

- Kicker: the season and the hour, nothing else ("Mid-October. A quiet afternoon."). Both are known from the date and the clock; no data about people is used.
- "Nothing needs you today." at Display size.
- A taller meadow under the headline; the week beneath; the hedgerow as always.
- No motion beyond the arrive.

## Quiet to active

When a moment becomes eligible while Today is open (a refresh returns one), the quiet headline fades (150 ms) and the moment arrives in its three beats. The meadow stays where it is; the person's sprig fades into it.

## First use

- The hedgerow shows only the people the user picked, in the same drawing as everyone else's; the bed is otherwise empty.
- The bring-back example (H4) is one small letter with a faint laurel; "Got it" and it never shows again.
- Nothing moves except the arrive.

## The Tell dock in the composition

The hedgerow's soil line is the top edge of the Tell dock: the sprigs stand on the thing you tell Kinship with. When a note is kept, the Kept line appears above the field as today; the hedgerow does not react (a sprig never changes for history, D8).

## Haptics

| Where | Status |
|---|---|
| Yes to "Did you reach …?" (success) | approved, built |
| Not now (soft tick) | **proposed** |
| Sheet reaches its rest (soft) | **proposed** (iOS sheets do this natively) |
| Anything on scroll, open, tab, press | never |

## Accessibility

- **VoiceOver:** the sky, sundial, grass, illustrations and hedgerow are decorative (`accessibilityElementsHidden`); the kicker is read before the statement as one element with it; the plate is a button with the hint "Shows why this is here"; the hedgerow has one hidden label ("Your people"). Nothing is carried only by the picture.
- **Dynamic Type:** every text style scales as today (`maxScale`); the illustration does not scale; at AX sizes the statement wraps below the illustration (float) and the week scrolls under the hedgerow. See `screens/preferred-today-large-text.png`.
- **Contrast:** no text sits on the tint (≤ 8% over paper keeps every approved pair above 4.5:1; to be re-checked in `tokens.test.ts` if adopted). Ochre root marks are not the only cue (the moment names the person).
- **Reduce Motion:** every animation in the prototype has a 150 ms fade twin; toggle it in the panel.
- **Performance:** the grass is one path; the hedgerow is up to 14 cached sprigs (≈ 0.3 ms each); the sky is one gradient; the illustration is one SVG. No per-frame work except the three timed animations. An ordinary iPhone is fine; the SE's width (375) needs the illustration at 112 instead of 128.
