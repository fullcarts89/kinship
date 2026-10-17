# Founder decisions, consolidated (round 2)

**Status: EXPLORATORY · UNAPPROVED.** Round 1 listed 26 numbered proposals (A1–A7, B1–B7, C1–C4, D1–D3, E1–E5) while its README said 22; the matrix was right and the summary wrong. This round consolidates them into twelve decisions with three statuses, keeps the original numbers for traceability, and folds in the founder's directional feedback. Nothing is approved by this document; a yes is recorded only in `approved-design-coverage.md`.

Statuses: **R** = recommended for approval · **V** = needs visual comparison or native validation · **X** = recommend rejecting or deferring.

| # | Decision | Status | Round-1 items | Recommendation and rationale | Approved rule that would change |
|---|---|---|---|---|---|
| 1 | **The Garden Letter as the leading visual identity** across Today, People and a person's page | **R** | E2, E3 | Adopt as direction. The three screens share six elements at three intensities (`02-design-system.md` §9); none copies Today's layout | None (a direction, not a rule) |
| 2 | **The editorial moment:** kicker (a fixed template per reason type), the statement at 36/40, the hope line as an italic paraphrase without quotation marks, Not now as a text link | **R** (36 pt: **V**) | B1, B3, B4, B6 | The kicker and the paraphrase are deterministic display copy; no model. The size needs a device to judge | §H type scale (34 → 36 on Today); §H italic only for places and seasons; board 1's two pills |
| 3 | **The source-backed quotation rule:** quotation marks only for verbatim source text, italic for grounded copy, illustration never near provenance | **R** | new (corrects B4) | A trust rule that costs nothing and fixes a round-1 error. Applies to Today, People, profiles, detail and hand-off sheets | None; it tightens contract §7.5 (grounded copy) in the view |
| 4 | **An original occasion-illustration vocabulary:** one engraving per kind of reason; none for a hard time | **R** | B2 | Restrained, bounded, drawn in-house; the engagement case rests on kinds of days looking different | §H "typographic before graphic" (a bounded exception) |
| 5 | **Subtle environmental atmosphere:** the hour's tint (≤ 8%), the celebration band (≤ 6%), the season line on a quiet day | **R** for the idea; exact levels **V** | A1, A7, B5 | The tint carries the hour; the band marks a celebration; the season line is grounded in the clock. Levels and contrast to be set on device | §H "no gradients" (one bounded exception) |
| 6 | **The sundial** | **V** | A2 | Pretty, cheap, possibly pointless. Keep in the prototype; decide after a native pass whether anyone looks at it | New element |
| 7 | **The ground on Today: contextual (C)** — a sprig only where there is a grounded reason; the meadow under the moment; a taller meadow on a quiet day; no hedgerow, no horizon strip | **R** | A3, A4, A5 (withdrawn), C1 (withdrawn) | The hedgerow was inventory with an ordering problem and a future Remembered / Paused complication; the horizon doubled the meadow on a quiet day. C is calm and says only what is true. See `compare.html` | None once A4, A5 and C1 are withdrawn |
| 8 | **After Yes: Resolve** — the question becomes its answer in place, one haptic, the prompt arrives; nothing pressed, lit or marked | **R** | C2, C3, C4 (replaced), D3 (withdrawn) | Tested against the original and "Settle" in `motion.html`; the only version that is an acknowledgment rather than a reward. No new haptics | None; motion spec rule 4 gains one entry |
| 9 | **The return composition:** the question is the moment, the reason its context, "Open Messages again" a quiet link; "Kinship opened Messages for you this morning. Nothing was sent." | **R** | new | Consistent with `todayModel.ts` (an acted reason is not the moment). The copy is new and needs the founder's eye; the behaviour, timing, persistence and recording rules are unchanged | New copy only |
| 10 | **Press and lift:** the words lift 2 pt on press; Not now slides aside | **V** | D1, D2 | Harmless in a browser, unproven on device against the "no scale" rule's intent (no bounce, no play). Try on the phone | Spec rule 1 (a translate on press) |
| 11 | **People:** serif names, italic letter marks, an A–Z index past thirty people, the search match underlined in ochre; no count | **R** | A6 (withdrawn: the count) | Efficiency kept (search first, alphabetical, 58 pt rows, hundreds of people); personality through type and marks only | Board 3's sans name (a type choice) |
| 12 | **The person's page: P1, the portrait** — a strong opening, one current line with presence, the approved sections, Between you set apart with the user's verbatim words; the journal (P2) as the rejected alternative | **R** for the composition; **scope V** | new | Information architecture unchanged (H15/B8 untouched; What Kinship knows remains the organised reference). Whether the page ships with Today or after is a sequencing call | None (presentation only). B8's category display must land first or alongside |

## Withdrawn from round 1

| Item | Was | Why |
|---|---|---|
| A4 / A5 | The hedgerow and its rule past 16 people | Decision 7: inventory, hidden ordering, Remembered / Paused complications |
| A6 | "Fourteen people. Mid-October." | A count with no functional or emotional value (founder) |
| B4 (as drawn) | The hope line in quotation marks | Unsupported quotation (decision 3) |
| C1 | A third meaning for ochre (the root mark) | Nothing to mark once the hedgerow is gone; ochre keeps two meanings |
| C2 / C3 | The press and the light pass | Spectacle; reads as completion (decision 8) |
| D3 | Two new haptics | No demonstrated benefit |
| E5 | Which dogfood round | Folded into `04-implementation.md` timing |

## Sequencing (E1, unchanged)

Production work, if any, starts after B9 and the employer evaluation, with the return-value roadmap (CC-25), after the household dogfood round 1 on the approved Today. The decisions above can be taken now; none of them starts a build.
