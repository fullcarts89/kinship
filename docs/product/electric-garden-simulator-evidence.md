# Electric Garden (FD-30b): NATIVE-SIMULATOR evidence

**Readiness: NOT READY** (the integrated candidate on `claude/alpha-integration` decides; this records what WS-2's branch showed on the simulator). Build: Release, `claude/ws2-electric-garden-5ec0d5` at the PR's head, `EXPO_PUBLIC_V2_ENTRY=1 EXPO_PUBLIC_E2E_LOCAL=1` against the local stack (`e2e/README.md`, "The simulator build"), iPhone 18 Pro (iOS 27), 30 Oct 2026. Accounts: a local test account made by `e2e/make-local-account.mjs` (fresh: Welcome → setup) and an existing local test account with three told lines about "Priya" (staged: a birthday today, set on the local stack by REST, so Today has a Moment; the user's photo is a synthetic Stage 1 sample image added to the simulator's library, not a real person).

Tiers reported apart: UNIT · NATIVE-SIMULATOR. Nothing here is FOUNDER-DEVICE. Screenshots: `docs/product/screens/electric-garden/`. **Status 31 Oct, 09:45: the walk is complete except row 21 and the review-sheet half of row 15 (see each row). The iPhone 17e (390 pt) was used from 09:29 once the 18 Pro went to the integration walk; the small-width rows are the 17e captures.**

| # | Row | What was checked | NATIVE-SIMULATOR | Screenshot |
|---|---|---|---|---|
| 1 | Welcome | Wash + hero bloom cut by the top right; "Kinship" label; the promise in Archivo Black; the example as three open lines; Apple / Google / email actions pinned | **PASS** on the iPhone 17e (390 pt): wash, bloom, leaves, label, promise, three open lines, actions pinned. Note: the promise ran over the bloom's berries; the bloom is now higher and further right on the branch (rebuilt, re-checked below) | `01-welcome.png` |
| 2 | See how it works | Steps 1–4 in the poster voice; the note and reply as the user's words behind a lavender rule; the example moment in the statement style | **PASS** (17e): steps 1 and 3 captured; the close control sat over the leaf, now moved (rebuilt) | `02-how-it-works.png` |
| 3 | Setup: consent | The question in the poster voice under the warm wash and leaf; the D2 sentence unchanged; Allow / Keep notes as written | **PASS** (17e), plus the name step | `03-setup-consent.png` |
| 4 | Setup: people | Search, rows with sprigs, T8 lock line, Continue with N | **PASS** (17e): the simulator's sample contacts, sprigs with accents, lock line, Continue with N | `04-setup-people.png` |
| 5 | Setup: already worth knowing + first Tell | Dots on the lines, the field on the surface, examples | **PASS** (17e) as the first Tell alone (no birthdays in the next weeks for the picked people, so no worth-knowing lines: correct) | `05-setup-worth.png` |
| 6 | Today, first use | Orientation under the wash and bloom; one primary action | **PASS** with a defect fixed: the orientation body ran over the bloom's leaves; the first-use bloom is now smaller and higher (rebuilt) | `06-today-first-use.png` |
| 7 | Today, a Moment with the person's photo | Wash (joyful), bloom, fluid photo with leaves in front, poster name, statement, lime source, Message + Not now | **PASS** (seen on the first build; screenshot not yet saved: the photo map was wiped when another session reinstalled the app) | `07-today-moment-photo.png` |
| 8 | Today, a Moment without a photo | The name filled with the bloom, leaves behind | **PASS** (the window shows leaf green over the first letters; the window is re-aimed at the petals on the branch, not yet rebuilt) | `08-today-moment-no-photo.png` |
| 9 | Today, a quiet day | "Nothing needs you today." under the quiet wash with the bud | **PASS** (first build; the quiet wash since strengthened) | `09-today-quiet.png` |
| 10 | Moment detail | Title, hope in italic, source, Message / Call, View person | opened; screenshot saved, not yet reviewed | `10-moment-detail.png` |
| 11 | Hand-off | The sheet: heading, You could mention, channels or "Which contact is…" | **PASS** (17e): Reach Anna, Open Messages, Call, FaceTime, Email, the return line | `11-handoff.png` |
| 12 | People | Leaves at the top right, search as the raised surface, rows with two-colour sprigs and serif live lines | **PASS** (first build) | `12-people.png` |
| 13 | Person, no photo | Lavender bloom, leaf, poster name, Edit · Add a photo, sections with dots, sources | **PASS** (first build) | `13-person-no-photo.png` |
| 14 | Add a photo → Person with photo | Picker → crop → the fluid mask with the leaf; "Change photo"; the file kept on the phone | **PASS** on the second attempt (see Open) | `14-person-photo.png` |
| 15 | Tell → review → Kept card | The field as the one raised surface; the review sheet's title; the Kept card | **PARTIAL**: the field, typing and sending PASS; the understanding failed on the local stack for both notes ("Couldn't understand this yet… I'll try again", the gateway path, not the app), so the review sheet and a kept card with lines were not seen natively. The correction sheet (the same tokens and sheet) PASS from a kept line on the 18 Pro | `15-tell.png`, `16-review.png`, `17-kept.png` |
| 16 | What Kinship knows | Title in the poster voice; rows, tokens with the lime underline, sources | **PASS** (18 Pro) | `18-knows.png` |
| 17 | Source | The note with the lime underline; a dim leaf | **PASS** (18 Pro) | `19-source.png` |
| 18 | Settings | Title, rows unchanged | **PASS** (17e) | `20-settings.png` |
| 19 | Dark: Today, Person, People | Deep green-black paper; the art vivid; the wash quiet; text pairs legible | **PASS** (17e): the art vivid on green-black paper, the wash quiet, lime marks, off-white ink | `21-dark-today.png`, `22-dark-person.png`, `23-dark-people.png` |
| 20 | Largest accessibility text: Today, Person | The statement reflows, nothing truncates; the poster name stays fitted; labels cap | **FAIL → fixed**: at accessibility XXXL every pill lost its label (iOS fit-to-width left the pill blank); pills now wrap their label at large scales and rows of actions (the person's Message · Call · Tell, the Moment detail's Message · Call) stack vertically, so a label never breaks mid-word (rebuilt and re-checked: `24-ax-today.png` shows "Message Anna" whole and "Not now" on its own row). The statement reflows, nothing truncates, the poster name stays fitted | `24-ax-today.png`, `25-ax-person.png` |
| 21 | Reduce Motion | The hero fades instead of rising (settings → Accessibility → Motion) | NOT RUN natively (the setting is not reachable from the simulator tooling without the Settings app walk); UNIT: the hero and every arrive use the 150 ms fade under Reduce Motion by the same hook as before | — |


## Pass three (31 Oct, 10:30–10:50): the structural redesign (founder review of PR #71)

The founder judged the first pass a reskin. Five surfaces were recomposed, one commit each (fcb131d Moment Detail,
777b8ab Today, 4a73983 Person, a5f55e3 People, 0dfbfef Tell / review / hand-off; 849ccd5 the fixes below), on the
Release build of the branch (which now carries `claude/alpha-integration` 6e9593c, so WS-3's suggestion line, WS-4's
hold line and WS-6's Ask ride along). Device: iPhone 17e (390 pt), light unless said; the local test account seeded
with people and remembered lines (each with a source) over the local stack. **Before** images: `before/`. **Monochrome
wireframe pairs** (hierarchy with colour, art and type stripped): `wireframes/`.

| Surface | Structural change | NATIVE-SIMULATOR | After | Before |
|---|---|---|---|---|
| Moment Detail | A composition: the person's presence bleeding from the sheet's top (photo in the fluid mask with a leaf, or the name as a window onto the bloom), the kind's wash and botanical (joyful bloom / quiet leaf / difficult none), an eyebrow of name · day with the kind's dot, the memory in the serif as the centre, a two-column ledger (Why now / From, the source tappable), one primary Message with Call beside it, WS-3's "You could…" line, the person as the quiet way out | **PASS** no-photo and photo (`10-moment-detail.png`, `10c-moment-detail-photo.png`); the action path Message / Call / View Anna / the source walked; the suggestion line present ("You could ask if they'd like company.") | `10-moment-detail.png`, `10c-moment-detail-photo.png` | `before/10-moment-detail.png` |
| Today | The moment keeps its poster hero and gains the human context (one or two lines the user has told Kinship about them, behind a lavender rule under its own label); the week is a dated ledger (the day in caps down a column, the line beside it, entries set apart by space, a butter dot for anything waiting); a quiet day is composed differently (the greeting as the headline, one serif sentence, the week at once) | **PASS** with a photo and without (`07-today-moment-photo.png`, `08-today-moment-no-photo.png`); dark (`21-dark-today.png`); largest text (`24-ax-today.png`: statement reflows, context and pills wrap, nothing truncates). The quiet-day composition was unit-tested, not seen on this pass (the account had a Moment) | `07-today-moment-photo.png`, `08-today-moment-no-photo.png` | `before/08-today-moment-no-photo.png`, `before/09-today-quiet.png` |
| Person | Four kinds of section instead of four identical ones: Coming up as a dated ledger behind a lime rule (Today's week vocabulary), Lately as the running story, You said you'd in the user's serif italic behind a sunset rule, Between you behind a lavender rule; the hero with the photo in the mask or the leaf alone | **PASS** (`13-person-no-photo.png`, `13c-person-sections.png`, `14-person-photo.png`), dark (`22-dark-person.png`), largest text (`25-ax-person.png`: the three actions stack and stretch). One defect fixed from this pass: the name sat across the photo's bottom edge (ink on a dark shirt), now under it (849ccd5; rebuilt, re-checked) | `13-person-no-photo.png`, `14-person-photo.png` | `before/13-person-no-photo.png` |
| People | A masthead (People, Add, Settings); two explicit doors under the field, Find someone and Ask your memory (Ask: a butter-dotted eyebrow, the question's placeholder, three example questions); a lettered index with the letter large down the left margin and rows set apart by space | **PASS** (`12-people.png`, `12b-people-ask.png`, `12c-people-ask-answer.png`: "What is Ben into?" keeps Ben and shows WS-6's "In your memory" under him), dark (`23-dark-people.png`), largest text (`26-ax-people.png`). One defect fixed from this pass: the title clipped at the largest size (849ccd5) | `12-people.png`, `12b-people-ask.png` | `before/12-people.png` |
| Tell / review / hand-off | Hand-off: a quiet wash and leaf bleeding from the sheet's top, the heading at title scale, "You could mention" as the user's lines behind a lavender rule, one primary channel and the others as small choices beside each other, the suggestion line; review: a lime-dotted eyebrow, kept lines as a ledger behind the lime rule, the question behind a butter rule, Done full width; the Kept card as one raised surface | **PASS** hand-off (`11-handoff.png`: Open Messages primary; Call · FaceTime · Email; the return line); the Tell field and the Kept card (`15-tell.png`, `17-kept.png`); **NOT SEEN** the review sheet with kept lines: understanding on the local stack failed for every test note on this pass ("Couldn't understand this yet"), a gateway / stub matter, not the app. UNIT covers the review sheet's order and actions (ReviewSheet.test, optionA.test) | `11-handoff.png`, `15-tell.png`, `17-kept.png` | `before/11-handoff.png`, `before/16-review.png` |

Defects found on this pass and fixed (849ccd5): the sheets' bleeds were not clipped, so the bloom crossed into the
ledger; the People title clipped at accessibility sizes; the person page's name sat across the photo. Rebuilt and
re-checked after the fixes: Moment Detail (clipped bleed), People at the largest size, the person page with a photo.

Not seen natively on this pass: the quiet-day composition (unit), the review sheet with lines (understanding failed
on the local stack), Reduce Motion (unit), the difficult-mood detail (no caller sets it yet; unit). Readiness stays
**NOT READY**; the integrated candidate decides.

## Defects found on the simulator and fixed on the branch (pass two, 31 Oct morning)

- Pill labels vanished at accessibility text sizes (row 20): labels now wrap at scales above 1.35 instead of shrinking, and the three-up and two-up action rows stack and stretch (`isLargeText()` in `src/ui/theme.ts`; a first stacked version used `flex: 1` in the column and the pills overlapped, caught on the same pass and fixed, `25-ax-person.png`).
- The first-use orientation and the welcome promise ran over the bloom; the bloom sits higher and smaller on those two screens. The example's leaf sat under the close control; moved.

- A repeating `Image` (the grain) drew one tile at the top left on this renderer: the grain is now a grid of finer tiles at a lower strength.
- The person page's leaf was placed from the page's left edge instead of against the photo; it now crosses the photo's edge as in the still.

## Open

- Understanding on the local stack failed for both test notes on 31 Oct (the ai-gateway served from another worktree and the replay stub); the review sheet and a kept card with lines were therefore not seen on this pass. The Jest lab states and the correction sheet cover the same tokens.

- First attempt at "Add a photo" ended on the home screen after the picker (the process was alive at the time of the last log line; no crash report was written); the second attempt, with the log streaming, completed normally (picker → crop → Choose → the photo in the mask). Not reproduced since; recorded here, not closed.
