# The Garden Letter, round 2 (17 Oct 2026)

**Status: EXPLORATORY · UNAPPROVED.** The founder adopted the Garden Letter as the leading creative direction after round 1 (merged as PR #41, unapproved) and asked for a second round that (a) settles an experience architecture that accommodates Ask before refining further, and (b) closes the gap between "more beautiful" and "more engaging". Nothing here changes production code, `todayModel.ts`, memory, reasons, navigation contracts, B6–B9, canonical decisions or the coverage matrix. Round 1's files are untouched for comparison; everything new is in this folder. Fictional people and notes throughout.

## Open these

| What | Where |
|---|---|
| **The architecture checkpoint**: the capability map, three navigation alternatives for Ask, four end-to-end journeys (push → Moment → return; Ask across people; a promise reason; an open thread and Remembered) | [`architecture.html`](architecture.html) · [`00-experience-architecture.md`](00-experience-architecture.md) |
| **The interactive prototype**: Today (moment, birthday, milestone, busy week, hard time, quiet, first use, bring back, return, after), People (15 / 110 / search), six people's pages in two treatments, the ground alternatives, the three after-Yes motions, light / night, the hour, Reduce Motion, larger text, iPhone SE | [`prototype.html`](prototype.html) |
| **The comparisons**: two profile treatments × sparse / rich / shared; sensitive and remembered; People at density; the ground on Today (A / B / C) across states and night; the return before and after; devices and text | [`compare.html`](compare.html) |
| **After Yes, three ways**, live, with Reduce Motion | [`motion.html`](motion.html) · [`06-motion.md`](06-motion.md) |
| Stills of everything | [`screens/`](screens/) |

Plain HTML / CSS / JS; no build, no network beyond the font fallback, no production code or data. The sprigs are the real generator's output for 110 fictional ids (`sprigs2.js`).

## Read these, in order

1. [`00-experience-architecture.md`](00-experience-architecture.md): where everything lives; Tell vs Ask; three alternatives; the recommendation; decisions AR-1…AR-8.
2. [`01-critique.md`](01-critique.md): what round 1 solved, what it introduced, and whether this is more engaging or only more illustrated.
3. [`02-design-system.md`](02-design-system.md): typography, botanical rules, the source-backed quotation rule, colour and light, motion, empty states, density, accessibility, scaling across the three screens, and where Ask lives.
4. [`03-founder-decisions.md`](03-founder-decisions.md): twelve consolidated decisions with three statuses, mapped to round 1's 26 numbered proposals (the "22" in round 1's README was wrong).
5. [`05-reconciliation.md`](05-reconciliation.md): the prototype audited against `todayModel.ts` and the approved contracts; fixture errors separated from genuine proposals.
6. [`04-implementation.md`](04-implementation.md): current functionality vs. future CC-25 capabilities, sized, with component reuse and regression tests.

## What changed since round 1, in one list

- **Architecture first.** Ask lives in People's field (*Search or ask*) and on a person's page (*Ask about Priya →*) as a source-backed sheet; the bar stays two items; the dock stays Tell-only. Promise, open-thread and hard-time reasons are the same letter with different kickers. The push opens Today at the Moment's detail.
- **Quotation marks only for verbatim source text.** The hope line is a paraphrase and is set in italic without quotes; the note's own words appear under "From your note" in the detail sheet.
- **The return question stands alone**, as production already implies (an acted reason is not the Moment): the question, the reason as context, "Open Messages again" as a link.
- **Resolve after Yes**: the question becomes its answer in place; one haptic; nothing pressed, lit or marked.
- **The contextual ground**: no hedgerow, no horizon strip; a sprig appears only where there is a grounded reason; the quiet day gets the meadow.
- **The portrait**: a strong opening, one current line with presence, the shared ground set apart, verbatim words honoured; sparse, rich, shared, sensitive, remembered and empty states; the journal rejected.
- **People**: serif names, italic letter marks, an A–Z index past thirty, the search match in ochre; no count; 15 and 110 shown.
- **First use**: a worked example as a small letter and one action.
- **A hard time**: plain paper, no kicker, no illustration, no band, Call first.
- **Fixtures fixed**: Maya's birthday dated honestly; the busy week in production's order and counts; devices and text sizes shown.

## The three questions the founder asked

1. *Meaningfully more enjoyable and distinctive than today's Kinship?* Open `prototype.html`, press Moment, then Birthday, then Hard time, then Quiet day. Each is a different kind of page without a different kind of product.
2. *A coherent experience across Today, People and profiles?* Press People, open Priya, open Chris; then `architecture.html` for Ask and a push, which use the same sheet, the same serif, the same provenance.
3. *Easier and more rewarding to show up, without pressure or gimmicks?* Run the loop (Moment → Ask how it went → Open Messages → Yes) with "Resolve" selected, then with "Original" in `motion.html`, and compare.

## Branch and PR

Branch `claude/today-redesign-round2` from `main` (94850bd). A PR is opened for review and **not merged**; merging round 1 was not approval and merging this would not be either.
