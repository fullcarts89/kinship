# Electric Garden (FD-30b): NATIVE-SIMULATOR evidence

**Readiness: NOT READY** (the integrated candidate on `claude/alpha-integration` decides; this records what WS-2's branch showed on the simulator). Build: Release, `claude/ws2-electric-garden-5ec0d5` at the PR's head, `EXPO_PUBLIC_V2_ENTRY=1 EXPO_PUBLIC_E2E_LOCAL=1` against the local stack (`e2e/README.md`, "The simulator build"), iPhone 18 Pro (iOS 27), 30 Oct 2026. Accounts: a local test account made by `e2e/make-local-account.mjs` (fresh: Welcome → setup) and an existing local test account with three told lines about "Priya" (staged: a birthday today, set on the local stack by REST, so Today has a Moment; the user's photo is a synthetic Stage 1 sample image added to the simulator's library, not a real person).

Tiers reported apart: UNIT · NATIVE-SIMULATOR. Nothing here is FOUNDER-DEVICE. Screenshots: `docs/product/screens/electric-garden/`. **Status 30 Oct, 16:12: the walk was interrupted by the session's usage limit; rows marked _pending_ were not run.** Rows 1–6, 11, 15–21 are NOT RUN.

| # | Row | What was checked | NATIVE-SIMULATOR | Screenshot |
|---|---|---|---|---|
| 1 | Welcome | Wash + hero bloom cut by the top right; "Kinship" label; the promise in Archivo Black; the example as three open lines; Apple / Google / email actions pinned | _pending_ | `01-welcome.png` |
| 2 | See how it works | Steps 1–4 in the poster voice; the note and reply as the user's words behind a lavender rule; the example moment in the statement style | _pending_ | `02-how-it-works.png` |
| 3 | Setup: consent | The question in the poster voice under the warm wash and leaf; the D2 sentence unchanged; Allow / Keep notes as written | _pending_ | `03-setup-consent.png` |
| 4 | Setup: people | Search, rows with sprigs, T8 lock line, Continue with N | _pending_ | `04-setup-people.png` |
| 5 | Setup: already worth knowing + first Tell | Dots on the lines, the field on the surface, examples | _pending_ | `05-setup-worth.png` |
| 6 | Today, first use | Orientation under the wash and bloom; one primary action | _pending_ | `06-today-first-use.png` |
| 7 | Today, a Moment with the person's photo | Wash (joyful), bloom, fluid photo with leaves in front, poster name, statement, lime source, Message + Not now | **PASS** (seen on the first build; screenshot not yet saved: the photo map was wiped when another session reinstalled the app) | `07-today-moment-photo.png` |
| 8 | Today, a Moment without a photo | The name filled with the bloom, leaves behind | **PASS** (the window shows leaf green over the first letters; the window is re-aimed at the petals on the branch, not yet rebuilt) | `08-today-moment-no-photo.png` |
| 9 | Today, a quiet day | "Nothing needs you today." under the quiet wash with the bud | **PASS** (first build; the quiet wash since strengthened) | `09-today-quiet.png` |
| 10 | Moment detail | Title, hope in italic, source, Message / Call, View person | opened; screenshot saved, not yet reviewed | `10-moment-detail.png` |
| 11 | Hand-off | The sheet: heading, You could mention, channels or "Which contact is…" | _pending_ | `11-handoff.png` |
| 12 | People | Leaves at the top right, search as the raised surface, rows with two-colour sprigs and serif live lines | **PASS** (first build) | `12-people.png` |
| 13 | Person, no photo | Lavender bloom, leaf, poster name, Edit · Add a photo, sections with dots, sources | **PASS** (first build) | `13-person-no-photo.png` |
| 14 | Add a photo → Person with photo | Picker → crop → the fluid mask with the leaf; "Change photo"; the file kept on the phone | **PASS** on the second attempt (see Open) | `14-person-photo.png` |
| 15 | Tell → review → Kept card | The field as the one raised surface; the review sheet's title; the Kept card | _pending_ | `15-tell.png`, `16-review.png`, `17-kept.png` |
| 16 | What Kinship knows | Title in the poster voice; rows, tokens with the lime underline, sources | _pending_ | `18-knows.png` |
| 17 | Source | The note with the lime underline; a dim leaf | _pending_ | `19-source.png` |
| 18 | Settings | Title, rows unchanged | _pending_ | `20-settings.png` |
| 19 | Dark: Today, Person, People | Deep green-black paper; the art vivid; the wash quiet; text pairs legible | _pending_ | `21-dark-today.png`, `22-dark-person.png`, `23-dark-people.png` |
| 20 | Largest accessibility text: Today, Person | The statement reflows, nothing truncates; the poster name stays fitted; labels cap | _pending_ | `24-ax-today.png`, `25-ax-person.png` |
| 21 | Reduce Motion | The hero fades instead of rising (settings → Accessibility → Motion) | _pending_ | — |

## Defects found on the simulator and fixed on the branch

- A repeating `Image` (the grain) drew one tile at the top left on this renderer: the grain is now a grid of finer tiles at a lower strength.
- The person page's leaf was placed from the page's left edge instead of against the photo; it now crosses the photo's edge as in the still.

## Open

- First attempt at "Add a photo" ended on the home screen after the picker (the process was alive at the time of the last log line; no crash report was written); the second attempt, with the log streaming, completed normally (picker → crop → Choose → the photo in the mask). Not reproduced since; recorded here, not closed.
