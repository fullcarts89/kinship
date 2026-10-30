# 04 · Motion and interaction

**Status: EXPLORATORY · UNAPPROVED.** Six original interaction concepts, each working in every direction in `motion.html` (press Play; toggle Reduce Motion and dark). Values are starting points for a device; a browser proves meaning and composition, not feel.

## 1. Principles

1. **Delight, not reward.** A movement may make Kinship enjoyable; it may never celebrate the user's action. The birthday performs for Maya, not for Nico. A completed hand-off gets a sentence and a nod, not a fanfare. No streaks, points, progress, levels, health, growth or decay; no confetti on a message; no artificial urgency; nothing designed to bring the user back.
2. **Purpose first.** Each movement answers one question: *did it hear me?* (Understood) · *is something here for me?* (Arrival) · *whose day is it?* (Celebration) · *did that count?* (Yes) · *is this the same person?* (Into a person) · *did I press it?* (Press).
3. **Once, then still.** Every movement plays once per open and settles; nothing loops, breathes or pulses while the user reads.
4. **Short.** Under 600 ms to rest, except the birthday (≤ 2.4 s, once).
5. **A twin for Reduce Motion.** Every movement has a 150 ms fade with the same meaning; nothing that *only* a movement conveys.
6. **Readable without motion.** Each direction's identity is complete when animation is off; motion adds, never carries.
7. **One haptic.** The approved success haptic on Yes. No others.

## 2. The six concepts

| # | Concept | What happens | Per direction | Reduce Motion | Risk |
|---|---|---|---|---|---|
| 1 | **Understood** | After a long Tell, the Kept card's lines arrive one at a time (120 ms apart, 320 ms each) and each receives the direction's "understood" mark; the held line fades in last, plainly | Garden: ochre underline draws (600 ms) · Bloom: a marigold highlighter · Keepsake: the slip drops and gets a red-pen line · Orbit: a ring pops beside the line · Postmark: a rule stamps · Woven: a short band weaves under the line | All lines fade in together over 150 ms; the marks appear with them | Must never show a count or a "5 things kept!" |
| 2 | **Arrival** | The Moment enters once per open; then the actions, then the week | Garden: the three-beat rise · Bloom: the flower *unfolds* (420 ms, scale .6→1, −10°→0), then the words rise · Keepsake: the card drops onto the desk with a settle and the tape fades in after · Orbit: the person's discs converge from spread (480 ms) · Postmark: the card is delivered from the right (380 ms) and the postmark stamps (220 ms) · Woven: the band weaves left to right (520 ms), then the words rise | 150 ms fade | Any overshoot on text breaks the "no bounce" rule; only art may spring |
| 3 | **A celebration** | The occasion art performs once, for the friend's day | Garden: the candle's halo brightens · Bloom: a seeded petal drift (14 petals, 2.4 s, once) · Keepsake: the balloon draws itself · Orbit: rings expand from the centre · Postmark: the poster wipes in, then the postmark · Woven: charms string on one by one (100 ms apart) | Art fades in over 150 ms | Never on a hard day (the plain rule is enforced before the art is chosen); never triggered by the user's action |
| 4 | **Yes** | The question becomes its answer in place (240 ms cross-fade); context, pills and the link fade; the person's mark gives one small nod (4°, 480 ms); the optional prompt arrives | The same in every direction (the acknowledgment is in words) | The cross-fade at 150 ms; no nod | Round 2's Resolve plus the nod; the nod is the one addition and should be judged on a device |
| 5 | **Into a person** | Tapping a row: the other rows fade (240 ms), the person's mark travels and grows into the page's mark (420 ms), the page fades in beneath | Same mechanism; the mark is the sprig, the flower, the sticker, the discs, the stamp or the band | A 150 ms cross-fade; no travel | Requires a shared-element transition in React Native (see `05`) |
| 6 | **Press** | The primary pill depresses 2 px and loses its hairline shadow while pressed | Same everywhere | The approved dim only | None |

## 3. Original ideas considered and not built

- *The band breathes on long-press to reveal "Priya · college roommate"*: cute, but a breathing mark is a living thing, and living things can die.
- *A petal lands on the row of the person whose Moment it is*: a gentle wayfinding idea, but it marks one person among others, which is a ranking.
- *The return question "waits" with a slow ink bloom*: it reads as pressure.
- *A sound on Yes*: no; the haptic is enough and sound in a quiet product is a shock.

## 4. Performance notes (see `05` for the implementation assessment)

All six concepts are opacity, transform and clip animations on a handful of elements: native-driver-friendly in Reanimated, no layout thrash. Bloom's petal drift is the only one with 14 simultaneous transforms; cap it at 10 on devices below the A13 and skip it under Low Power Mode. The "understood" underline draw is a width animation on a 1.5 pt view (cheap). Keepsake's shadows during a drop are the only costly piece and are one reason Keepsake is not a finalist.
