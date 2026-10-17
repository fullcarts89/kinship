# The Garden Letter, round 2: design-system specification

**Status: EXPLORATORY · UNAPPROVED.** A specification for a language the founder has adopted as the leading direction, not for production. It keeps the Quiet Herbarium's principles and extends `src/design/tokens.ts`; it never replaces it. Where a value departs from an approved rule, the decision number from `03-founder-decisions.md` is given.

## 1. Typography and hierarchy

The approved scale (Newsreader for people, Instrument Sans for the machine) with three additions:

| Role | Style | Where |
|---|---|---|
| Kicker | Newsreader italic 17/24, ink-quiet | Over Today's statement; the profile's "now" line; the quiet day's season line |
| Statement | Newsreader Display 36/40 (approved 34/38) | Today's moment only (D3) |
| Paraphrase | Newsreader italic 20/27, ink | Grounded copy Kinship built, e.g. the hope line |
| Quotation | Newsreader 19/26 with typographic quotation marks | Verbatim source text only (§3) |
| Now line (profile) | Newsreader 24/30 | The one current line on a person's page (P1) |
| People name | Newsreader 19/24 | The row's name (was sans 17) |

Hierarchy on Today, top to bottom: date (label) · greeting · kicker · statement · context (sans) · paraphrase (italic) · provenance · the meadow · primary pill + Not now (text) · the week. Nothing else on the page is larger than the statement. On a person's page: name (40) · relationship and place (italic) · the ground · the now line (24) · section labels · lines (19). Under Dynamic Type every size scales by the approved `maxScale`; the illustration does not scale.

## 2. Botanical illustration rules

- **Identity:** the sprig, exactly as built. One size per place (meadow 30 wide, row 24, page 78, hedgerow 26 if ever used). A remembered person's sprig in ink-quiet with a 0.85 stroke. Never a bud, a flower, a size or a count that depends on history (D8).
- **Occasion:** one engraved drawing per *kind* of reason, never per person. Single ink, 1.1 pt hairline, 7% wash, a little hatching, nothing coloured, no faces, no objects that could be mistaken for the person's things. The set: laurel (a race, a finish, good news), candle (a birthday), door (an interview, a first day), rings (an engagement, a wedding), key (a new job, a new home), bow (a promise, future). To draw later: cradle, cap, suitcase. **No illustration for a hard time.**
- **Ground:** the meadow is one seeded grass path, 30–40% ink, the same every day. It appears under the moment (with the person's sprig standing in it), taller on a quiet day, and under a person's name. Nowhere else (D5: the contextual ground).
- **Ornament:** one leaf glyph (❧) in ochre marks the shared ground on a person's page and nothing else.
- **Placement:** the occasion drawing floats right of the statement with the text wrapping around it (in React Native, a two-column row). It never overlaps the statement; at AX sizes it moves above the text.

## 3. Source-backed quotation rules

Three kinds of text, visually distinct, never mixed:

| Kind | What it is | How it looks | Example |
|---|---|---|---|
| **Source text** | The user's own words, verbatim, from a note (or a Contacts field) | Quotation marks, Newsreader roman, always beside its provenance; labelled "From your note" / "In your words" | “Ben runs Chicago Sunday. He's hoping to break four hours.” |
| **Grounded display copy** | A sentence Kinship built from kept items by a fixed template (statements, context lines, the hope line, section lines) | Roman for statements and lines; *italic without quotation marks* for a built sentence that sounds like reported speech (the hope line) | Ben was hoping to break four hours. |
| **Illustrative content** | Atmosphere: the occasion drawing, the meadow, the sky, the sundial | Never near a provenance dot; decorative for VoiceOver; never changes with the person | a laurel |

Rules: quotation marks never appear on Today's page, a People row or a section line, because none of those is verbatim. They appear in the detail sheet ("From your note"), in a profile's Between you where the kept line *is* a verbatim excerpt (the pipeline keeps the note's quotes for milestones; H16), and in the bring-back example (the user's own first Tell). Every quotation has a source link; a paraphrase has its provenance dot. Nothing says "Ben said" unless the note did.

## 4. Colour, light and night

The approved palettes unchanged, plus four tints used only at the top of the sky and in the celebration band, never under text (D1):

| Token | Light | Night | When |
|---|---|---|---|
| dawn | #E9D9C8 | #1C2126 | 5–9 am |
| day | #E6E8E2 | #151A17 | 9 am–5 pm |
| dusk | #E8D8C2 | #1E1A17 | 5–7 pm, and 7–10 pm at night |
| celebrate | #F3E6CF | #1F1C14 | behind a birthday, milestone or good news; never a hard time |

Ochre keeps exactly its two approved meanings: something understood (provenance dot, the search match underline) and something you said you'd do (the label and the week's day numeral). The root mark is withdrawn.

Night is the night garden: the moon on the sundial, the same drawings in parchment ink, the tints as above.

## 5. Interaction and motion

The approved spec, plus:

| Name | Value | Reduce Motion |
|---|---|---|
| arrive, three beats | 320 ms, 8 pt rise, at 0 / 80 / 160 ms | 150 ms fade |
| lift (press on the words) | 2 pt up, 160 ms | none (dim only) |
| put aside (Not now) | 60 pt right + fade, 320 ms | 150 ms fade |
| **resolve (after Yes)** | the question cross-fades to its answer, 240 ms; context and pills fade; the prompt arrives | the same at 150 ms |
| sheets | approved (360 / 240 / 240) | 150 ms fades |

Haptics: the one approved success haptic on Yes. No others (round 1's Not now tick and sheet tap are withdrawn).

## 6. Empty states

| State | Composition |
|---|---|
| First use (people picked, nothing told) | "This is where Kinship brings things back." · one sentence · a worked example drawn as a small letter, labelled "An example", with its pill greyed · one action |
| Bring back (once, after the first Tell) | The user's own words in quotes · what Kinship kept · how it comes back · Got it |
| A quiet day | The season and the hour · "Nothing needs you today." · the meadow · the week if any |
| A person with nothing told | Name · the ground · one sentence · "Tell Kinship about Sam" |
| Search with no match | "No one called ‘…’." · Add |
| A section with nothing | Absent |

## 7. Dense content

- Today: one moment; a Waiting line; up to three Coming up lines; "and N more" opens in place. Nothing else, ever (production's `COMING_SHOWN = 3`).
- A long statement (the wedding, 42 characters) wraps to three lines at 36/40 and the illustration stays right; at 56 characters the illustration should drop to 112 px; above 80 the statement goes to 34/38. These are view rules, not copy rules.
- People at 110: 58 pt rows, letter marks in italic, an A–Z index when there are more than thirty people, virtualised. Search filters as you type; the match is underlined in ochre.
- A rich profile: the now line, then three lines per section, then "What Kinship knows →" (unchanged from the portrait rules).
- iPhone SE: the statement at 32/36, the illustration at 82%, the meadow 44 pt, so the moment, its actions and one week line fit above the dock.

## 8. Accessibility

- Sky, sundial, meadow, occasion drawings and ornaments are decorative (`accessibilityElementsHidden`). The kicker and the statement read as one element. Quotation marks are read by VoiceOver as such, which is the point: only verbatim text has them.
- Every text pair stays above 4.5:1 because no text sits on the tint (to be re-checked in `tokens.test.ts` if adopted).
- Touch targets stay at 44 pt minimum; People rows at 58.
- Reduce Motion: every movement is a 150 ms fade (toggle it in the prototype).
- Dynamic Type: all text scales; the illustration moves above the statement at AX sizes; the week scrolls.

## 9. Scaling across the three screens

| | Today | People | A person's page |
|---|---|---|---|
| The room | the full sky, the sundial | the sky at 200 pt, no sundial | the sky at 260 pt, no sundial |
| The ground | the meadow under the moment; taller on a quiet day | the hairline each sprig stands on | the ground under the name |
| The sprig | the moment's person, 30, in the meadow | each person, 24, on their row | the person, 78, on the ground |
| Occasion drawing | yes | no | no |
| Kicker | the kind of day | no | the now line's date relation |
| Ochre | provenance; your own promise | the search match | provenance; You said you'd |
| Quotation marks | never on the page; in the detail sheet | never | only for a verbatim line in Between you |

The same six elements (sky, ground, sprig, serif, kicker, ochre) at three intensities make the three screens one place without copying Today's layout.

## 10. Where Ask lives (the provisional architecture, `00-experience-architecture.md`)

- People's field reads *Search or ask* once Ask ships (*Search your people* until then). A name filters the list; a question opens the **answer sheet**: the question as a heading, each answer line in the serif with its sprig and its provenance, each line a door to the person's page at that line; "Nothing kept about that" with *Tell Kinship* when unsupported; a closing line, "From what you've told Kinship, with each line's source. Nothing is kept from a question."
- On a person's page, *Ask about Priya →* sits beside *What Kinship knows about Priya →* and opens the same sheet scoped to her.
- The Tell dock never asks. The bar stays two items. A third destination is reserved, not designed.
- The sheet is the only Ask surface: never a page of history, never a thread.
