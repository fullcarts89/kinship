# Kinship creative reset · Checkpoint A (19 Oct 2026)

**Status: EXPLORATORY · UNAPPROVED · design only.** Three independently art-directed Today experiences, each on the same three scenarios and the same fictional, grounded content. No production code, gateway, schema, eligibility, ranking, decision register or coverage row changes; PR #55 (round 3) stays as reference and is not touched. **This checkpoint stops here for the founder's visual feedback.** Nothing below declares a winner, and no study starts.

## Open this

- **[`gallery.html`](gallery.html)**: the side-by-side gallery (three concepts × a meaningful Moment, a celebration, a quiet day), with Light / Dark, Reduce Motion, and one-scenario rows. Double-click to open; no server needed. Google Fonts load the display faces (all OFL); system fonts stand in offline.
- Stills as a fallback: [`screens/`](screens/) (`<concept>-<state>.png`, the dark variants, and three gallery captures).
- The founder's boards, kept with the exploration: [`reference/`](reference/).

## The three concepts

### 1 · Overgrown (the Electric Garden board, reimagined)
**Character:** a living, oversized garden you look through, not a room you sit in. **What's new on Today:** the Moment is a *scene*, not a page. Grainy gradient botanicals fill the top two thirds and the headline is set into them in a deep-green display face with a paper halo, so the words grow through the leaves. The facts and the one action sit on a single white plant-label card that overlaps the scene; the week is two seed chips. Each *kind* of day has its own flora: a race gets a tulip and berries, a birthday gets big pink and orange blooms with pollen, a quiet day gets the garden at rest in sage with a low sun. **The person:** one bloom, seeded from their id, one size (the only per-person mark). **Dark:** the same garden at night; the greens glow. **From the board:** the grain and gradient leaves, the deep-green type, the lavender and butter tiles, "people help people bloom" as a temperature rather than a slogan.

### 2 · Fragments (the Social Scrapbook board)
**Character:** a page in a scrapbook about your people. **What's new on Today:** the Moment is a torn "photo" fragment, and in the text-only default **the person's name is the picture**, huge, on a pastel gradient with one small doodle for the kind of day (a finish flag, a cake, a sun). A photo the user added would sit in the same frame; nothing implies photos Kinship doesn't have. Kinship's own words are *typed* (a label-maker strip for the context, typewriter caps for the source); the line that came from the user's note is *handwritten* on a lilac sticky. Washi strips are the page's furniture and sit in the same places every day; stars and sparkles appear only for a celebration. **Dark:** white paper on a dark desk, which is the most striking of the three night modes. **From the board:** torn edges, washi, the yellow highlighter under "Today", the sticker stars, the rounded brush display face.

### 3 · Rings (the wild card: Connection Orbit's forms, Postcards' warmth)
**Character:** a week you can feel. **What's new on Today:** the layout is radial, not vertical. Thick arcs in orbit blue, orange, yellow and white make a dial; the Moment sits at its centre; the things coming up are dots on the outer orbit placed **by their day of the week** (today at the top, the week clockwise), never by importance; today is the filled yellow marker. The person's token is a two-colour disc, seeded, one size. A birthday turns the arcs pink and orange and scatters dots; a quiet day is two calm blue rings with "Nothing needs you today." at the centre. **Dark:** navy with the same arcs. **From the boards:** Orbit's palette, arcs and dot-on-a-path motif; Postcards' slab day-name and yellow date tag for warmth. **What it refuses from the Orbit board:** no dots for people, no "12 friends", no orbit around a face. The dial is a calendar, not a graph.

## How the boards informed the work, and what was left on them

The boards set the bar for energy and craft: grain, gradients, oversized forms, bold display type, colour as structure rather than accent. All three concepts take that. The boards also show things Kinship must not do (friend counts, "online now", following, stats, a feed of strangers' photos, "Find your people"); none of those crossed over. The approved behaviour is unchanged in every concept: one selective Moment, the hope line as a grounded paraphrase, a visible source on everything, one primary action and *Not now*, the week capped at three lines, the Tell field and the two-item bar, nothing that varies with history or contact.

## Candid critique

- **Overgrown** is the most polished and the most "App Store" of the three, and the lushest dark mode. It is also the closest to being *a mood with a card under it*: the card is a good card, but the scene does the emotional work and the card does the product work, and they could drift apart on a dense day. The flat tulip is weaker than the board's flowers; a second pass would give every bloom the board's layered petals and grain. Risk: beautiful, but is it *about Ben*? Only the small bloom says so.
- **Fragments** makes the person most present: BEN at 92 pt on a torn photo is the only one of the three where the screen is unmistakably about him. The handwritten/typed distinction is honest and could become a trust feature. It is also the busiest, the one most at risk of "school project", and its density on a rich day is unproven (that is checkpoint B's question). The washi could be fewer; the week scraps are heavier than they need to be.
- **Rings** is the most structurally different and the most memorable at a glance; the week-as-dial is a real idea, not a reskin. It is also the coldest of the three (the person is a disc, the Moment is in a circle), the centre can only hold a short statement, and its "orbit" DNA needs permanent vigilance against graph readings. A sensitive day will test whether the dial can go quiet enough.
- **What none of them has yet:** a sensitive-day treatment, People, the portrait, the return loop, the first Tell, and real density. Those are deliberately checkpoint B, after the founder reacts to these nine.

## What the founder is asked

Look at the gallery and say which of the three (or which parts) feel like Kinship: exciting, warm, yours. Point at what is wrong. That feedback decides which concepts go into checkpoint B (the remaining states, the interactive flows, accessibility, a realistic scaling check, and an implementation view). No concept is declared the winner here, and no research study is proposed.

## Files

`gallery.html` · `common.css` (the frame and the review chrome) · `fixtures.js` (the shared content) · `overgrown.js` / `.css` · `fragments.js` / `.css` · `rings.js` / `.css` · `capture.sh` · `screens/` · `reference/`. Everything is plain HTML, CSS and SVG; original artwork; no copyrighted graphics reproduced.
