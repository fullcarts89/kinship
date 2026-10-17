# Kinship Today: a design exploration (16 Oct 2026)

**Status: EXPLORATORY · UNAPPROVED.** This folder is a design exploration for the founder. It changes no production code, no approved design, no coverage row, no product decision, no data. Every departure from an approved board is labelled **FOUNDER APPROVAL REQUIRED** and listed in `04-founder-decisions.md`. Fictional people and notes throughout. Intended timing, if any of it is adopted: after B9 and the employer evaluation, with the post-B9 return-value work (CC-25).

## Open these

| What | Where | How |
|---|---|---|
| **The three directions**, each across Today, People and a person's page, plus birthdays and night side by side | [`directions.html`](directions.html) | Open in a browser (double-click). Needs no server. Fonts load from the repo; Google Fonts as a fallback |
| **The preferred direction as an interactive prototype** ("The Garden Letter"): nine Today states, People, Priya's page, light / night, the hour, Reduce Motion, larger text, the whole hand-off and return loop | [`prototype.html`](prototype.html) | Open in a browser. Click inside the phone. The panel on the left switches states |
| Still captures of everything (iPhone 15 size, 2×) | [`screens/`](screens/) | `direction-*.png`, `preferred-*.png`, `directions-gallery.png` |

Both pages are plain HTML, CSS and JavaScript with no build, no network calls beyond the font fallback, no production code and no data. The sprigs are the real generator's output for fixture ids (`sprigs.js`, produced by running `src/ui/sprig/generate.ts` once); nothing else is shared with the app.

## Read these, in order

1. [`01-critique.md`](01-critique.md): what works in the built Today, and the five biggest weaknesses, with evidence.
2. [`02-comparison.md`](02-comparison.md): the three directions scored on the brief's criteria, and the recommendation.
3. [`06-design-language.md`](06-design-language.md): the one language across Today, People and the person page.
4. [`05-interaction-motion.md`](05-interaction-motion.md): how a moment appears, is touched, put aside, and returned; haptics; accessibility.
5. [`03-implementation.md`](03-implementation.md): visual-only, interaction, decision-dependent and roadmap-dependent changes, sized S / M / L, with the components that would be reused.
6. [`04-founder-decisions.md`](04-founder-decisions.md): every decision needed before production work, grouped so a partial yes is possible.

## The founder review, in seven points

**1. The critique in a sentence.** The built Today is correct, grounded and calm, and it is the same page every day: one template for a birthday, a marathon and a quiet day; sixty percent unintended paper; the signature sprig at 46 pt doing nothing; no visual moment at the one place the product pays off (Yes, I reached them); and a week list that reads as a to-do list. The bones (serif by name, provenance, one door, silence, the identity-only sprig, the motion spec, the tokens) are right and are kept in everything that follows.

**2. Three directions.** *A · The Living Garden*: Today as a plot of ground; the hour's light, a sundial, the person's sprig in grass, everyone's sprigs as a hedgerow rooted on the Tell dock. *B · The Illustrated Storybook*: every moment as a letter; a kicker naming the kind of day, the statement at 40 pt, the user's words as a pull-quote, one engraving per kind of reason, the sprig as a stamp. *C · The Playful Companion*: a desk; the moment as a pinned slip that lifts, flips and slides away, a physical button, tags for the week and for People. Each is shown on Today, People and Priya's page (`directions.html`, `screens/direction-*`).

**3. Recommendation.** A hybrid with B as the spine: **the letter, set in the garden's room, with one of the desk's gestures.** B makes one grounded thing feel like the reason to open the app; A makes the page a place and gives night a sky and fills the void with the people you care about; C contributes only the feeling that the words can be touched. The stamp, the physical button, the swipe and the full-width scene are dropped. The approved anatomy is unchanged; four things are added (the hour's light, the kicker and illustration, the meadow and hedgerow, a moment on Yes).

**4. Expanded screens and the prototype.** `prototype.html`: a meaningful moment, a birthday, a milestone, a busy week (with a promise of the user's own and a Waiting line, as future reasons will look), a quiet day, first use, the bring-back letter, the return check, after Yes; People; Priya's page; light, dusk and night; Reduce Motion; larger text; the Moment detail and hand-off sheets. Stills in `screens/preferred-*`.

**5. Interaction and motion.** Three-beat arrive; the words lift on press; Not now slides the plate aside; on Yes the plate presses into the paper, light passes once over the garden and the person's root mark goes out, then the one optional question. Kinds of moments differ by kicker, illustration and a warm band only; a hard time gets none of them. Every movement has a 150 ms fade twin. One approved haptic kept; two proposed. `05-interaction-motion.md`.

**6. Implementation.** Visual-only work is about M (a sky, a sundial, a meadow, a hedgerow, a kicker, six SVGs, type tweaks, all in `src/ui` and tokens); interaction work about M; nothing in `todayModel.ts`, eligibility, ranking, memory, navigation or the Tell pipeline changes. Dependencies on promise, open-thread and hard-time reasons, minimal push, Remembered / Paused and the year-ago line are listed. `03-implementation.md`.

**7. Decisions needed before any production work.** Twenty-two, grouped: the room (a ≤ 8% tint, a sundial, a meadow, a hedgerow and its rule past ~16 people, a count of people, a season line); the letter (a kicker, spot illustrations, 36 pt, a pull-quote, a celebration band, Not now as a text link, day numerals); the return (a third ochre meaning, the press, the light, "You reached Ben."); touch (lift, slide, two haptics); scope and sequencing (timing, the hybrid vs. one direction, People and the page now or later, who draws, which dogfood round). `04-founder-decisions.md`.

## Boundaries kept

Worked on the branch `claude/kinship-today-redesign-fa09aa` in its own worktree; nothing merged, deployed or released. No change to B5–B9 files, `todayModel.ts`, Supabase, schemas, reasons, production data, canonical decisions, coverage or approved designs. The exploration ends here; production implementation is not started.

## The test the brief set

Would someone enjoy opening this, and would what they find make them more likely to show up for someone? Open `prototype.html`, press Moment, read the letter, tap *Ask how it went*, open Messages, say *Yes*, and watch the room notice. Then press Quiet day and ask whether an honest "nothing" still feels like a place worth visiting.
