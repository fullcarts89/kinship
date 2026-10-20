# Kinship creative reset · Checkpoint A, refined (19 Oct 2026)

**Status: EXPLORATORY · UNAPPROVED · design only.** After the founder's review of the first checkpoint A (Overgrown: too decorative, Ben confined to a card; Fragments: people-first but juvenile and busy; Rings: too close to activity rings, not advancing), Overgrown and Fragments were rebuilt around the person. Rings stays in the folder as reference only (`gallery.html?rings=1`). No production code, gateway, schema, eligibility, ranking, decision register or coverage change; PR #55 untouched; B7–B9 and the RRU workstream (PR #52) untouched. **Stopped here for founder review. No winner, no checkpoint B, no study.**

> **20 October 2026 · Stage 1 of the creative fidelity reset is in [`stage1/`](stage1/README.md).** The founder judged the concepts below technically competent but creatively underwhelming against the boards; Stage 1 restarts from the boards with original raster art and photography and stops for feedback. The gallery below stays as the record of checkpoint A.


## Open this

- **[`gallery.html`](gallery.html)**: the two concepts side by side on six states: a Moment with no photo (the default), the same Moment with a **person photo** the user chose, the same Moment with a **memory photo** and the user's caption, the same Moment on a **busy week** (production's order: a Waiting line, three Coming up lines, "and 2 more"), a birthday, a quiet day. Light / Dark, Reduce Motion. Double-click to open.
- [`screens/`](screens/): the stills (`<concept>-<state>[-dark].png`, the gallery captures, and `rings-moment-reference`).
- [`photos-roadmap.md`](photos-roadmap.md): photo support recorded as a **proposed** capability: what already exists (the 1.0 picker and local store, two `photo_url` columns, the `photo` capture source, the plan's "Later" row, D2's never-send rule), the two capabilities as framed, the design rules, and the eleven architecture and privacy decisions it will require (PH-1…PH-11).
- [`reference/`](reference/): the founder's mood boards.

**Photos in the prototype are drawn stand-ins** (a backlit figure at golden hour; two people on a dock at dusk). No photograph of a real person is in this repository. A reviewer can register real images locally (see `photos.js`); nothing is fetched otherwise.

## What changed, and why

**The person is the headline now.** In both concepts the name comes first, large, and the grounded statement completes the sentence ("Ben / runs Chicago tomorrow."). The story block beneath is open paper, not a card, with a hard rule separating the picture from the facts.

**Verbatim and paraphrase are typographically separate, and handwriting is gone.** The user's own words appear once, in quotation marks, in a clipping labelled FROM YOUR NOTE · OCT 8. Kinship's paraphrase ("Ben was hoping to break four hours.") is an italic serif with no quotation marks. A photo caption is labelled YOUR CAPTION · MAY 3 · a photo you attached to "Ben's half in May". Nothing is written in a hand.

**Less decoration.** Overgrown dropped the full-bleed scene for a single plant that holds the person's bloom (or their photo), two or three leaves and a few berries; the quiet day is sage and a low sun. Fragments dropped the stars, the sticky notes and most of the washi; one strip remains, and one star appears on a birthday only. Both week lists are now plain rows.

**Photos, where the user chose them.** Overgrown: the person's photo takes the bloom's own silhouette as its frame, on the same stem, so the plant is still the plant. A memory photo becomes the sky the plant grows under, fading into the paper above the name. Fragments: the person's photo *is* the torn plate (a scrim keeps the name legible); a memory photo is a second, smaller torn print pinned over the plate's corner. With no photo, Overgrown shows the seeded bloom and Fragments shows a duotone typographic plate in the person's two colours. Neither default looks like something is missing.

**Personalisation that never fabricates.** The only per-person elements are the bloom (petal count, two hues, rotation) and the duotone pair, both pure functions of the person's id, both the same size for everyone. The kicker and the plant's flora vary with the *kind* of day, never the person. Nothing varies with history, contact, closeness or completeness.

## Candid critique

- **Overgrown** now reads as a poster about Ben rather than a garden with Ben in it; the bloom-as-photo-frame is the strongest single idea in the set and the memory-photo variant is the most emotionally present screen of the twelve. Still wrong: the plant is one plant, so the birthday and the race differ only by kicker and berries, which is thinner than the first pass's flora; the bloom's gradient reads a little synthetic against the grainy leaves; the lavender kicker chip is a leftover from the first pass and could go. The dense state fits but the week rows are plainer than the rest of the page deserves.
- **Fragments** is the more mature of the two now, and the only one where the person's photo fully becomes the design. The typed clipping with a left rule is a trustworthy way to show verbatim text. Still wrong: without a photo the duotone plate can look like a placeholder for a photo rather than a design in its own right (the fine line drawing helps less than hoped); the memory print covering the plate's corner hides the plate's drawing; the busy week's slips are heavier than the typed clipping and should probably become rules, as Overgrown's did. It is still the busier of the two.
- **Both**: the quiet day is better than the first pass but still "the same page with nothing on it"; a quiet day deserves one idea of its own in checkpoint B. The sensitive state was not drawn here (not asked for in this refinement) and remains the hardest test for both.

## What the founder is asked

Look at the six rows in the gallery, light and dark, and say which concept, or which parts, to carry into checkpoint B, and whether photos (as proposed in `photos-roadmap.md`) are a direction to design for. Nothing proceeds until then.
