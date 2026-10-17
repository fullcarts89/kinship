# The three directions, compared, and a recommendation

**Status: EXPLORATORY · UNAPPROVED.** See `README.md` for the full set.

Mockups: `directions.html` (all three, each across Today, People and a person's page; birthdays and night side by side). Captures: `screens/direction-*.png`.

## The three in one line each

| | A · The Living Garden ("The Bed") | B · The Illustrated Storybook ("The Letter") | C · The Playful Companion ("The Desk") |
|---|---|---|---|
| Idea | Today is a plot of ground: the hour's light, a sundial, the person's sprig standing in grass, everyone's sprigs as a hedgerow rooted on the Tell dock | Every moment is a letter: a kicker that names the kind of day, the statement at 40 pt, the user's words as a pull-quote, one engraved illustration per kind of moment, the sprig as a stamp | Today is a desk: the moment is a pinned slip that lifts, flips and slides away; a physical button; tags for the week; tags on a board for People |
| What it fixes | The void (critique §2), the lifeless sprig (§3), night (§3) | Sameness (§1), the to-do look (§5), "one meaningful thing feels special" | Touchability (§4 partly), fun under the thumb |
| What it risks | Decorative wallpaper if the garden says nothing; a gradient | Static; needs an illustration per reason type forever | Becomes cards, shadows and a CRM-board look; motion for its own sake |

## Scored

Five-point scale, judged against the mockups and the approved principles. These are design judgements, not measurements.

| Criterion | A · Garden | B · Letter | C · Desk | Notes |
|---|---|---|---|---|
| Emotional warmth | 4 | 5 | 3 | B's kicker + pull-quote makes a single fact feel personal; A's light does the same at the level of the room; C's warmth is physical, not emotional |
| Fun and delight | 3 | 4 | 5 | C is the most fun to handle; B's "what will the illustration be today" is a quiet delight that compounds; A's delight is slow (light, season) |
| Distinctiveness | 4 | 5 | 3 | B is unmistakably Kinship ("remove the logo" test passes at a glance); C could be several note apps |
| Garden-theme coherence | 5 | 3 | 2 | A *is* the garden; B is a herbarium's letterhead; C has sprigs on paper but the metaphor is a desk |
| Immediate comprehension | 4 | 5 | 4 | B's kicker tells you the kind of day before you read; A's hedgerow needs a second's learning; C's swipe hint is extra UI |
| Encourages real contact | 4 | 5 | 4 | B makes the one door bigger and the exit a text link; A keeps the approved pair; C's big button is good, the swipe gesture is a distraction |
| Accessibility and performance | 4 | 5 | 3 | A: a gradient, grass SVG and 14 sprigs per page (cheap, static); B: text and one SVG, the easiest to make accessible; C: shadows, rotations, device motion, swipe: the most to get right |
| Implementation complexity | M | S–M | L | A: sky + sundial + grass + hedgerow, all deterministic; B: kicker templates + six SVGs + type changes; C: gestures, physics, haptics, new component family |
| Scales to future Moment types | 4 | 4 | 3 | A: any reason can stand in the grass; B: needs an illustration per type (a bounded, growing set); C: every reason is a slip, which flattens the difference |

## Recommendation: a hybrid, with B as the spine

**Take B's moment, set it in A's room, and keep one of C's gestures.** The letter is what makes *one grounded thing* feel like the reason you opened the app (the product's thesis); the garden is what makes the page a place, gives night its sky, and fills the void with the people you care about instead of paper; the desk contributes only the feeling that the words can be touched (the words lift 2 pt on press) and that "Not now" moves something out of the way.

What the hybrid is **not**: it is not three ideas stacked. The stamp (B), the physical button and the swipe (C) and the full-width garden scene (A) are dropped. The result keeps the approved anatomy exactly (date, greeting, one moment, primary + Not now, ≤ 2 quiet lines, Tell dock, two-item bar) and adds four things:

1. **The hour's light.** A ≤ 8% tint at the top of the paper (dawn rose, day green-grey, dusk ochre, night garden) and a small sundial arc with the sun or moon where the hour is. It carries real information and gives night a sky.
2. **The kicker and the illustration.** An italic line that names the kind of day ("The day after", "A birthday", "Thursday"), a fixed template per reason type, and one engraved, single-ink illustration per *kind* of reason, floated so the statement wraps around it. Never a picture of a person; never evidence.
3. **The meadow and the hedgerow.** Under the moment, a strip of grass with the person's own sprig standing in it. At the bottom of Today, above the Tell dock, everyone's sprigs stand on one soil line at one size, alphabetical; the moment's person has an ochre root mark that goes out when the user says Yes. A first-use account shows only the people it has.
4. **The return has a moment.** On Yes: the success haptic, the plate presses into the paper (600 ms), light passes once over the garden, the root mark fades. Then the optional question. Nothing is scored, counted or kept visible.

The prototype (`prototype.html`) is this hybrid across nine Today states, People and a person's page, light and night, with Reduce Motion and larger text.

## Why not A alone, B alone, C alone

- **A alone** answers the founder's "basic text" with atmosphere but leaves every kind of day looking the same inside the garden. The garden becomes wallpaper by week two.
- **B alone** fixes sameness beautifully but leaves night as inverted paper and the lower half of the screen empty; it is a better page, not yet a place.
- **C alone** is the most fun for a day and the least Kinship. It reintroduces cards and shadows the Herbarium removed for good reasons, and its fun is in the handling, not in the people.

## What the hybrid still cannot do (honest limits)

- A quiet day is still a quiet day. The garden, the light and the season line make it a composed page rather than a void, but there is no new content, by design.
- Illustrations are a bounded set that must grow with reason types (six now; promise, open thread and hard-time reasons each need one, and a hard-time illustration must be very plain).
- The hedgerow at 40+ people needs a rule (a sample of the day's and the week's people, then alphabetical fill; never "most contacted"). Left as a founder question.
