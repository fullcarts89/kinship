# The Garden Letter: a reusable design language across Today, People and the person page

**Status: EXPLORATORY · UNAPPROVED.** This is the Quiet Herbarium with a room around it. It keeps the Herbarium's principles (typographic first; serif for people, sans for the machine; hairlines, not boxes; ochre for what Kinship understood and what you said you'd do; one door out; silence over noise; sprigs as identity only) and challenges four of its visual decisions (no gradients, no graphic, nothing scales, ochre means two things). Each challenge is a numbered decision in `04-founder-decisions.md`.

## The idea in one sentence

**Kinship is a quiet room with a window: the people you care about stand along the sill, the day's light comes in, and when something matters it arrives as a letter.**

## The three roles

| Surface | Role | What the language gives it |
|---|---|---|
| **Today** | The emotional centre. One grounded reason to show up, or an honest quiet | The full room: the hour's light, the sundial, the letter (kicker, statement, pull-quote, illustration), the meadow with the person's sprig, the hedgerow of everyone on the Tell dock's soil line, the return's one moment of light |
| **People** | An inviting way to find someone, search-first, alphabetical, no counts | A lighter room: the light at the top, one italic line that says what the page is, sprigs standing on each row's hairline as if planted; nothing per person is counted or ranked |
| **A person's page** | An intimate portrait: who they are, what matters now, what is between you | The sprig standing on a strip of ground under the name; the subtitle in italic (their relationship to you, their place); the approved four sections; "Between you" set as a quotation; actions at the bottom as today |

The same elements, dialled down from Today to the page, make the three screens one place. What is *never* shared: counts, sizes, rankings, badges, health.

## Vocabulary

### Colour

The approved palettes, unchanged, plus four tints used only as the top of the sky and the celebration band, never under text:

| Token | Light | Night | Used for |
|---|---|---|---|
| `dawn` | #E9D9C8 | #1C2126 | 5–9 am |
| `day` | #E6E8E2 | #151A17 | 9 am–5 pm |
| `dusk` | #E8D8C2 | #1E1A17 | 5–7 pm, and 7–10 pm at night |
| `celebrate` | #F3E6CF | #1F1C14 | the band behind a birthday, milestone or good news |

Ochre keeps its two approved meanings and, with the founder's yes, a third: *today's reason* (the root mark in the hedgerow; the day numeral of your own promise in the week).

### Type

The approved scale, with three additions on Today only: the **kicker** (Newsreader italic 17/24, ink-quiet), the **statement** (Newsreader Display 36/40 instead of 34/38), the **pull-quote** (Newsreader italic 20/27, ink, in quotation marks, only for the user's own words). People's italic line and the person page's "Between you" quotation use the existing italic style at 17 and 21.

### Marks

- **The sprig**, exactly as built: a person's identity, one size per place (hedgerow 26 wide, meadow 30, row 24, page 78). Remembered people in ink-quiet with a finer stroke, as approved. Never a bud, flower, size or count.
- **The sundial**: a dotted hairline arc, the sun as a paper disc with an ink ring, the moon as a crescent. 150 × 62, top right.
- **The meadow and the hedgerow's soil**: one seeded path of grass blades at 30–40% ink; a hairline soil line. The seed is fixed, so the grass is the same every day.
- **The illustrations**: engraved, one ink, 1.1 pt hairline, 7% wash, a little hatching, nothing coloured. One per *kind* of reason, the same drawing for every instance of that kind, 128 px on Today, 72 px in the bring-back letter. The set: laurel (a race, a finish, good news), candle (a birthday), door (an interview, a first day), rings (an engagement, a wedding), key (a new job, a new home), bow (a promise). To draw later: a cradle (a baby), a cap (a graduation), a suitcase (a trip). **No illustration for a hard time, ever.**
- **Icons**: Lucide at 1.8, functions only, labelled, as approved.

### Space and layout

- The 26 pt gutter and the 4-pt scale, unchanged.
- Today: header at 88 from the top; the plate 26 below the greeting; the meadow 56 tall, full bleed; actions 18 below; the week 28 below; the hedgerow 86 tall above the dock, full bleed, its soil line in the gutter.
- The illustration floats right; the statement wraps around it. In React Native this is a two-column row (statement `flex: 1`, art 128 fixed) that reads the same.
- The Tell dock and the two-item bar are unchanged in size and place. The hedgerow stands on the dock.

### Motion

The approved spec plus six proposed values, every one with a 150 ms fade twin under Reduce Motion:

| Name | Value |
|---|---|
| arrive (three beats) | 320 ms, 8 pt, bezier .2 .8 .2 1, at 0 / 80 / 160 ms |
| lift (press on the words) | 2 pt up, 160 ms |
| put aside (Not now) | 60 pt right + fade, 320 ms, ease-in |
| press (Yes) | scaleY 1 → 0.9, 10 pt down, fade, 600 ms |
| light (Yes) | top wash 0 → 0.5 → 0, 900 ms |
| root mark out (Yes) | fade, 600 ms |

### Components (what would be added to `src/ui/`)

| Component | Replaces / extends | Props (identity-safe by construction) |
|---|---|---|
| `Sky` | a prop on `Screen` | `hour`, `celebrate?` |
| `Sundial` | new | `hour` |
| `Moment` | extended | `+ kicker`, `+ illustration` (by kind), `+ pull` (the hope line) |
| `Meadow` | new | `personId?`, `seed`, `height` |
| `Hedgerow` | new | `personIds[]`, `litId?`, `rememberedIds[]`: nothing else can reach it |
| `QuietLine` | extended | `+ day: { weekday, date }`, `+ ochre` |
| `Illustration` | new | `kind` |
| `Pill variant="text"` | extended | — |

Nothing takes a count, a date of last contact, a score, or anything derived from history.

## The "remove the logo" test, re-run

Hide the wordmark. A Today in this language shows: a warm serif sentence about a person by name; a hairline sprig standing in grass; an ochre provenance dot; a hedgerow of pressed sprigs on a soil line; a sundial; a letter with an engraving. It could not be a notes app, a CRM or a wellness app. The same is true, more quietly, of People and the person page.
