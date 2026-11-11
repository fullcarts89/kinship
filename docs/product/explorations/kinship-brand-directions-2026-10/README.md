# Kinship brand directions, round 3 (19 Oct 2026)

**Status: EXPLORATORY · UNAPPROVED. Founder-requested research and design exploration only.** No production code, database, gateway, flag, Today eligibility, memory, trust, navigation, coverage row, canonical decision or roadmap entry changes. Rounds 1 and 2 (`../today-redesign-2026-10/`) are untouched for comparison; this folder reads their sprig output and engravings and writes nothing back. Fictional people and notes throughout. Items marked **Proposed** (the one-person, one-story first Tell from PR #52), **Alpha** (Ask) and **Future** (a contextual planning idea, CC-28 bucket D, PR #51) are drawn so the directions can be judged on them; none is built or approved.

## Open these

| What | Where | How |
|---|---|---|
| **Stage 1 · the divergent gallery**: six directions, each with its concept, colour and type specimens, marks, occasion art and icons, five live phones (a Moment, Priya, a birthday, a hard day, a quiet day), and the why / the but | [`gallery.html`](gallery.html) | Double-click; no server needed. `?theme=woven` for one direction; `?night=1` for dark |
| **Stages 2–3 · the interactive prototype**: every direction on every scenario (A first Tell, B Moment, C quiet day, D portrait, E hand-off and return, F sensitive), the extended states (110 people, one memory, many, correction, Which Sam?, a long Tell, kept + pending, an Ask result, a planning idea), light / dark, the hour, Reduce Motion, larger text, iPhone SE, the F′ serif voice, and *side by side* (finalists or all six) | [`prototype.html`](prototype.html) | Click inside the phone. Run the loop: E → the words → Ask how it went → Open Messages → Yes → Nothing today |
| **Stage 3 · motion**: six original interaction concepts (Understood · Arrival · A celebration · Yes · Into a person · Press) in every direction, each with a Reduce Motion twin | [`motion.html`](motion.html) | Press Play; switch directions; toggle Reduce Motion and dark |
| Stills of everything (review fallback only; never a substitute for the prototypes) | [`screens/`](screens/) | `<direction>-<screen>-<state>.png`; `compare-*`, `*-gallery`, `*-motion-*` |

Plain HTML / CSS / JavaScript; no build; no network beyond Google Fonts (all faces OFL; the system fonts stand in offline). Nothing is connected to the app or to any data. To re-capture stills: `python3 -m http.server 8093 --directory docs/product/explorations` from the repo root, then `./capture-all.sh` (needs Google Chrome).

## Read these, in order

1. [`00-creative-diagnosis-and-research.md`](00-creative-diagnosis-and-research.md): the Garden Letter assessed on the brief's ten questions; what rounds 1–2 got wrong; the external references with documented findings separated from our judgment; the eight principles every direction obeys.
2. [`01-brand-territories.md`](01-brand-territories.md): six directions (A Garden Letter · B Bloom · C Keepsake · D Orbit · E Postmark · F Woven, the wild card), each as a brand system: personality, metaphor, palette with hex, type, icons, illustration, shape, navigation, light and dark, interaction, motion, accessibility, scaling, app icon, complexity, risks.
3. [`02-comparative-gallery.md`](02-comparative-gallery.md): the fourteen-criterion scorecard with its reasoning, the first-impression answers, what only testing can settle, and the three finalists.
4. [`03-finalist-explorations.md`](03-finalist-explorations.md): Woven, Garden Letter and Bloom across the whole product.
5. [`04-motion-and-interaction.md`](04-motion-and-interaction.md): principles (delight, not reward), the six concepts per direction, what was rejected, performance notes.
6. [`05-implementation-and-roadmap.md`](05-implementation-and-roadmap.md): visual-layer vs interaction vs behaviour; a sized assessment per finalist; roadmap implications (none); an adoption sequence if the founder proceeds.
7. [`06-founder-decision-register.md`](06-founder-decision-register.md): existing approved rules · previous unapproved proposals · the new recommended direction (BD-1…BD-10) · provisional details needing native testing · unresolved founder decisions (FD-1…FD-6).
8. [`07-founder-report.md`](07-founder-report.md): the thirteen questions answered, the recommendation and its trade-offs.
9. [`08-study-proposal.md`](08-study-proposal.md): a two-week, 24-participant usability and preference study across four age cohorts, with its measures and stopping rule.

## The recommendation in two sentences

Keep everything the Garden Letter got structurally right (the letter, the quotation rule, Resolve, the plain rule, the quiet day, the two-item bar, the sheets, the Ask architecture) and change its skin and temperature: adopt **Woven**, the friendship bracelet, as Kinship's identity, with a woven band for every person that never grows, charms for a celebration and nothing for a hard day. Validate it, and its typographic voice, with the study before any production work; the committed roadmap does not move.

## Files

`engine.js` (one renderer for every screen, sheet and the return loop; the six directions supply marks, art and a room), `art.js` (original artwork generators, all seeded from the person id), `fixtures.js` (the shared fictional content), `specs.js` (each direction's brand system and critique as data), `brand.css` (the phone frame, the components, six treatments, night, Reduce Motion, larger text, SE), `motion.css` (the six concepts), `capture.sh` / `capture-all.sh` (stills).

## Branch and PR

Branch `claude/kinship-brand-visual-identity-14e1c0` from `main` (`9ad5e6d`); a design/documentation-only PR, left open for founder review. Merging it would not be approval; a merged exploratory document never becomes an approved product requirement.
