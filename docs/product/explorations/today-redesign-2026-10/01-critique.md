# Today, as built: a critique

**Status: EXPLORATORY · UNAPPROVED.** Part of the Today redesign exploration (16 Oct 2026). Nothing here changes the approved design, the coverage matrix or production code. Every proposal that follows is labelled; every deviation from an approved board is **FOUNDER APPROVAL REQUIRED**.

**Evidence:** the built screens in `docs/product/screens/` (lab renders and the founder's phone), `src/features/today/TodayView.tsx`, `src/ui/Moment.tsx`, `src/ui/Sprig.tsx`, `src/design/tokens.ts`, the approved board 1 (`screens/compare/today.png`) and board 3 night (`screens/compare/night.png`), `today-eligibility.md`, `interaction-motion-audit.md`.

## What works, and must survive any redesign

- **One warm serif sentence about a person, by name.** "How did it go for Ben?" at 34 pt on empty paper is already the best thing on the screen. The three signatures (serif line, sprig, ochre provenance) are right.
- **Grounded copy and the ochre provenance dot.** Every statement says where it came from, in one tap. The exploration keeps this exactly.
- **One door out.** Primary pill → hand-off sheet → Messages. Never a second product inside Today.
- **Silence is designed.** "Nothing needs you today." is correct and honest; no filler, no manufactured reasons.
- **The sprig as identity, never quantity (D8).** The identity-only generator is a real asset: six form families, stable per person, cheap to draw, already accessible (decorative, the name carries meaning).
- **The motion discipline.** 320 ms arrive, 8 pt rise, 150 ms fades under Reduce Motion, one haptic. A good spine to build on, not to replace.
- **The tokens.** One source of colour, type, space, radius and motion. Any redesign should extend `tokens.ts`, not fork it.

## The five biggest weaknesses

Ranked by how much each contributes to the founder's verdict ("basic text with basic headers; should be fun to engage with").

### 1. Every kind of day looks the same (the biggest cause of flatness)

A birthday, a marathon follow-up, a promotion, a wedding on Thursday and "Nothing needs you today." share one stack: caps date → quiet greeting → 34 pt line → sans context → provenance → two pills. The eye learns the template on day two and stops reading. Nothing in the composition says *this is a celebration* or *this is a question for a friend*. The brief's "distinct visual treatments for milestones, birthdays and other reasons" do not exist: the only variable is the verb in the pill label.

Screens: `maya.png` (birthday) vs `kept.png` (race follow-up) vs `feedback4/g0-i12-today-congratulate.png` (promotion): identical skeletons.

### 2. Sixty percent of the screen is unintended emptiness

On the founder's phone (`feedback4/g0-j4-nothing-again.png`, `g0-j3-today-coming-up.png`), everything Today has to say ends a third of the way down. The rest is bare paper until the Tell dock. The approved night board (board 3) composes its emptiness: a row of the household's sprigs stands along the bottom, so the quiet page still looks inhabited. The built app dropped that hedgerow and kept the void. Restraint is a choice; a void is an accident.

### 3. Kinship's only image is 46 pt tall and never moves

The sprig is the signature mark, and on Today it is the smallest element on the page, drawn once, beside the text, doing nothing. There is no light, no time of day beyond the word "morning", no season, no atmosphere; night is the light palette inverted. A product whose language is "a well-kept herbarium in a quiet room" shows no room. The approved boards promised "a hairline pressed sprig beside every person" and a night garden; the build delivers an icon.

### 4. The showing-up moment has no moment

CC-25 says the return is the product value. On screen it is: tap → sheet → Messages → come back → "Did you reach Ben?" → Yes → one haptic → the line disappears → "Anything worth remembering?" The highest-value event in the product is the quietest thing on the page. There is no acknowledgement that the user showed up, no change in the room, nothing to come back for. (Nothing should be a score or a streak; but a page can notice.)

### 5. The quiet lines read as a to-do list, and on a quiet day they are the whole page

"TODAY · Send Chris that restaurant / FRIDAY · Tyler promised to send you his contractor's number / SATURDAY · Ben wants to play games…" is a task list in a nice serif. On the quiet day it is all Today has (`g0-j4-nothing-again.png`). CC-25 adds promise and open-thread reasons next; without a different visual grammar for "this week" versus "the one thing today", Today drifts toward exactly the task manager the contract forbids.

### Also noted (smaller)

- The date and greeting header spends the top of the screen on the least interesting information.
- The Tell dock floats, unrelated to the content above it; the composition doesn't say "telling is how this page fills".
- "Not now" and the primary pill have equal visual seriousness.
- Pressed states are dims only (correct per spec) but nothing on Today feels touchable until you touch it; the moment's words are a button nobody can see is a button.
- Dynamic Type at AX sizes stacks the pills and pushes the quiet lines off screen (lab).

## Which weaknesses drive engagement most

1 (sameness) and 3 (no image, no atmosphere) are the reasons the page is "basic text". 2 (the void) is the reason it feels unfinished rather than calm. 4 is the reason there is nothing to come back for. 5 is the risk that grows with the roadmap.

## Approved decisions versus opportunities

| Approved and kept in every concept | Opportunity (needs founder approval to change) |
|---|---|
| Serif for people, sans for the machine; Newsreader + Instrument Sans | Add a second, expressive use of the serif (italic display, numerals) |
| Ochre means understood / promised; provenance dot | A third ochre meaning for "today's reason" (proposed in the Garden direction) |
| Sprigs identity-only; no marks; no sizes | A sprig placed in the foreground *for the day's moment* (temporary, not history) |
| "No cards, badges, rings, counters, dashboards, glass or gradients" | A time-of-day light wash (a gradient); a bounded, non-card "plate" for the moment; tactile lift on press (a scale) |
| Motion: arrive, understand, sheets; Reduce Motion → fades | New motions: light passing, pressing, a slip folding; new haptics beyond the three |
| Today = one moment, ≤ 2 quiet lines, or silence; Tell dock + two-item bar | No change proposed to eligibility, ranking, counts or copy |
| Night garden palette | A night sky with a moon arc; sprigs along the horizon (already on board 3) |
| First use ≠ quiet day; bring-back example | Illustrated bring-back; an "empty bed" first-use composition |

Nothing in this exploration touches `todayModel.ts`, eligibility, ranking, memory, navigation or the Tell pipeline.
