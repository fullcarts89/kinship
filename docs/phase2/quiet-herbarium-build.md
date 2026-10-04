# Kinship 2.0: the Quiet Herbarium, built (E07, E08, Phase 2 slice)

**Goal: build the design we already chose, not a new one.**

**Sources of truth:**
- Kinship 2.0 Design Direction (Claude Doc), read in full.
- The Design Exploration canvas: boards "Recommended · Setup, Today, Tell, Confirm", "Brief, Follow-up, Reconnect, Person, History", "Garden, Reflection, Ask, Privacy, Night" and "Design system".
- `KINSHIP_2_COMPLETE_PLAN.md` §13–§20.
- Two later founder decisions that override the boards:
  - the sprig is identity-only;
  - there is no Garden or Landscape destination.

**Branch:** `claude/awesome-edison-3cuf6z` (from `main` at `08d5d87`).

**How references were made.** Each reference image is the approved board itself, rendered locally from the canvas files with their own markup and sprig script. They use the same font files as the app, not a redraw. Implemented screenshots come from the dev lab (`EXPO_PUBLIC_V2_LAB=1`, `/lab#<state>`) in Chromium at iPhone 15 size (393 × 852 @2x). **They are web renders, not device captures** (see the readiness doc).

---

## 1. Tokens: `src/design/tokens.ts` (the only source)

| Token | Light | Night | Use |
|---|---|---|---|
| paper | #EFEEE9 | #121513 | App background |
| surface | #F7F6F2 | #1A1E1B | Sheets, the Tell field, inline question boxes |
| ink | #1D221E | #E6E4DC | Text, primary buttons, sprigs |
| inkBody | #3C423D | #E6E4DC | Explanations (drawn on boards 1–2; not in the token table) |
| inkQuiet | #5E645D | #8E968B | Secondary text, provenance, labels |
| hairline | #D6D5CD | #2C322D | Rules between rows |
| rule | #CFCEC5 | #3A403A | Ghost button outline (drawn on the boards) |
| ochre | #A87A22 | #D9B25A | Marks only: understood-word underlines, provenance dots |
| ochreText | #8A6417 | #D9B25A | "You said you'd", links |
| brick | #9A3B2A | #D98A77 | Destructive actions |

**Type.**

| Style | Font and size | Use |
|---|---|---|
| Display | Newsreader 34/38 | The Today moment |
| Name | Newsreader 40 | A person's name on their page |
| Title | Newsreader 30 | Sheet titles ("Here's what I'll remember.") |
| Heading | Newsreader 24 | Sheet headings ("Ask Ben how it went") |
| Moment | Newsreader 21/28 | |
| Line | Newsreader 19/26 | Remembered lines |
| Body | Instrument Sans 16/24 | Explanations |
| Button | Instrument Sans 500, 15 | |
| Label | Instrument Sans 11, caps, +14% | Section labels |
| Provenance | Instrument Sans 12/16 | |
| Nav | Instrument Sans 13 | The two-item bar |

**Scale and depth.**
- Space: 4 8 12 16 20 26 34 48 64; gutter 26.
- Radius: pill = h/2; inline 16; sheet 28; photo 10.
- Motion: arrive 320 ms with an 8 pt rise; understand 600 ms; sheet 360 ms; Reduce Motion becomes a 150 ms fade.
- One shadow: `shadow.sheet`.
- Fixed sizes from the boards: button 48, Tell 54, search 50, person row 58, bar 62, dot 5, grabber 36×4.

**Contrast.** `src/design/__tests__/tokens.test.ts` checks every text pair at ≥ 4.5:1 in light and night, and ochre marks at ≥ 3:1. Ochre text on paper is 4.62:1, not the 5.1:1 the canvas lists. It passes; the canvas figure was optimistic.

**Fonts.**
- **Newsreader** is instanced from the OFL variable font at the optical sizes the scale uses: Display at opsz 36, Text at opsz 20, Light 300 for the transcript, and Italic. Files and licence are in `assets/fonts/newsreader/`. The design asks for "optical size on", and React Native can't set a variable axis at run time.
- **Instrument Sans** comes from `@expo-google-fonts/instrument-sans`.
- DM Serif Display and DM Sans stay registered for 1.0 only. **No 2.0 screen uses them.**

**Night.** The app now declares `userInterfaceStyle: automatic`. The 1.0 shell is pinned to light at launch; the 2.0 shell releases the pin so it follows the system ("night garden").

## 2. Components: `src/ui/` (no Card)

| Component | File | Notes |
|---|---|---|
| Moment | `Moment.tsx` | Sprig + display statement + context + provenance + ≤ 2 actions; arrives 320 ms / 8 pt; with Reduce Motion, a fade |
| Row | `Row.tsx` | Hairline rows, 44 pt min (58 with a sprig), combined accessibility label |
| Token | `Token.tsx` | Solid 1.5 pt ochre underline (System board); a button with "Double-tap to change"; `TokenRow` separates tokens with middots |
| Provenance | `Provenance.tsx` | Ochre dot + 12 pt quiet line; link role; opens the Source |
| Sprig | `Sprig.tsx`, `sprig/generate.ts` | §3 |
| TellField | `TellField.tsx` | 54 pt pill on the surface; grows to an inline surface while typing; a round ink send button |
| Sheet | `Sheet.tsx` | Surface, 28 pt top corners, grabber, the one shadow; slides, or fades with Reduce Motion; focus held (`accessibilityViewIsModal`) |
| Pill | `Pill.tsx` | primary (ink), ghost (rule outline), quiet (text), danger (brick); 48/44 pt; label never truncated |
| QuietLine | `QuietLine.tsx` | Caps label over a serif line, one quiet action |
| Label / text styles | `Text.tsx` | Display, Name, Title, Heading, MomentText, Line, Greeting, Italic, Body, Label, Small; Dynamic Type caps per style |
| Screen | `Screen.tsx` | Paper, 26 gutter, back control, pinned footer |
| NavBar | `NavBar.tsx` | Today · People in words; the current one in ink with an underline |

## 3. The sprig (E08): identity-only

- It is a pure function of the person's id (FNV-1a → mulberry32). There is **no other input**, so relationship history cannot reach it.
- It belongs to one of six form families (frond, spray, bract, trailing, grass, umbel) and has 5–9 nodes.
- Leaf sizes are normalised so **every sprig carries the same total leaf area**: more nodes means smaller leaves, never a fuller sprig.
- The terminal is structural (a bud, spike or rays), never a flower.
- "Remembered" people get the same drawing in ink-quiet with a finer line.
- `sprig_marks` stays off, and marks aren't implemented.
- It is drawn with `react-native-svg`, cached per person (LRU of 200), and decorative (hidden from VoiceOver).
- Tests (`src/ui/sprig/__tests__/sprig.test.ts`, over 500 ids): deterministic; one-argument API (no history parameter exists); constant leaf area; full structure; fits the specimen box; all six families occur; a pinned snapshot.
- It is used on People rows, the relationship page, Today's moment, the person picker and the Source view.

## 4. Information architecture

```
app/v2/_layout.tsx            session, Tell flow, appearance
app/v2/(main)/_layout.tsx     Today · People tabs; the tab bar is the Tell field + the two-item bar; one-time consent
app/v2/(main)/index.tsx       Today
app/v2/(main)/people.tsx      People (+ Settings sheet from the header)
app/v2/person/[id]/index.tsx  the relationship page (portrait)
app/v2/person/[id]/knows.tsx  What Kinship knows about them
app/v2/source/[captureId].tsx the Source
```

There are no other destinations. Garden, Landscape, Activity, Garden Walk, Reach Out, Quick Notes, Check-ins and the notification archive don't exist in 2.0.

## 5. Phase 2 slice: reasons v0, Today, hand-off, return

- **Engine.** Migration `20261005090000_v2_reasons_v0.sql` (forward-only) adds two functions:
  - `reasons_refresh(user, day, tz)` is service-role only.
  - `refresh_my_reasons(tz)` takes the caller's own `auth.uid()` and no user id.

  It creates deterministic `upcoming_event` and `event_followup` candidates with their evidence. Windows follow plan §13: the day before (2–3 days for celebrations); the day after it ends (3–7 days for a move or a new job or school). It uses only exact-day, sensitivity-none events about an active person. It suppresses reasons whose evidence changed and expires those that have passed. It is idempotent (it dedupes by type, item and day). There are 22 pgTAP assertions in `61_v2_reasons_v0.test.sql`.
- **Selection** (`src/features/today/todayModel.ts`) runs on the device:
  - The plan §13 ranking: base × timeliness × evidence × freshness, with one primary per person per 7 days.
  - Threshold 55.
  - ≤ 2 quiet lines from different people.
- **Copy** is fixed templates plus the name, the user's own statement and a computed date ("How did it go for Ben?" / "Ben runs Chicago Sunday · Sun, Oct 11"). There is no model and no `event_type` vocabulary.
- **Hand-off** (`src/platform/handoff.ts`) opens `sms:`, `tel:`, `facetime:` or `whatsapp://send?phone=` with no body. Numbers are read from the device contact at tap time and never stored (only the device contact id, `contact_ref`). Opening a channel writes nothing.
- **Return check.** It appears 10 min–12 h after a hand-off. "Yes" writes `contact_events` (source `return_check`) and offers "Anything worth remembering about Ben?". "Not yet" lets the reason speak again.
- **Recording.** Reason events go to `reason_events` when online. The device keeps its own record (shown, acted, dismissed) in the encrypted store.

## 6. Design-fidelity review

Side-by-side images are in `docs/phase2/screens/compare/` (approved board on the left, implementation on the right). Legend: **exact**, **intentional** adaptation, **technical/accessibility** adaptation, **unresolved**.

### Today (board 1, "Thursday, 1 October"): `compare/today.png`

| Aspect | Status |
|---|---|
| Date label, greeting, sprig beside a Display statement, context line, provenance, primary + "Not now", hairline, quiet lines, Tell field, two-item bar | exact |
| Statement: board "Ben ran the Chicago Marathon yesterday." → built "How did it go for Ben?" with "Ben runs Chicago Sunday · Sun, Oct 11" | **intentional** (founder grounding invariant: the note never says "marathon"; template copy until `reason_generate` exists) |
| Quiet lines: board "A year ago · Lisbon" with a photo, and "Saturday · Maya's birthday · Ideas →" | **intentional** (v0 types only: upcoming this week and questions; no resurfacing, birthdays or photos yet) |
| Mic in the Tell field | **technical** (no on-device voice until E18; the send button appears when there's text; the keyboard's dictation works) |
| After 8 pm, Today leads with "Anything worth remembering?" | **intentional, deferred** (needs calendar encounters; the return check's "Anything worth remembering about Ben?" is the built form) |

Visual PASS · Interaction PASS · Accessibility PASS in lab; **device pending**.

### Tell (board 1, "Listening · for David"): `compare/tell.png`

| Aspect | Status |
|---|---|
| Full-screen dark listening with a live transcript and ochre underlines | **technical** (voice isn't built: E18 / `voice_capture`). Typing happens in place in the field, which grows; there is no navigation before capture |
| Pinned Tell field on Today and People; from a person, a sheet "About Ben" | exact (Design Direction §H) |

Visual NEEDS WORK until voice exists (board 1's signature listening screen isn't built) · Interaction PASS · Accessibility PASS.

### Kept / confirmation (board 1, "Kept for David"): `compare/confirm.png`

| Aspect | Status |
|---|---|
| "KEPT FOR BEN" label, "Here's what I'll remember." title, hairline rows, ×, "Tap any underlined word to change it", Done | exact |
| A sheet over Today rather than a full screen | **intentional** (plan §18: the Sheet holds "follow-up, extraction, source"; it keeps Tell in place) |
| Tokens inline inside the sentence → a token row under it | **technical** (statements are stored text with no per-word mapping to fields; a token row is what we can underline truthfully) |
| Clear readings show a 5 s "Kept: … · Undo" line instead of the sheet | **intentional** (Design Direction "auto-dismiss if untouched"; the founder's "no mandatory approval ceremony") |

Visual PASS · Interaction PASS · Accessibility PASS.

### Clarification (board 1, the "Is 'his son' Leo?" box): `compare/clarify.png`

| Aspect | Status |
|---|---|
| A question with pill choices in an inline surface, under kept lines | exact |
| A question with nothing kept yet becomes the whole sheet, in Title type | **intentional** ("ask one question; resolve; done") |

Visual PASS · Interaction PASS · Accessibility PASS.

### Follow-up hand-off (board 2): `compare/handoff.png`

| Aspect | Status |
|---|---|
| Sheet heading, "You could mention", Open Messages + Call, "When you come back: 'Did you reach Ben?'" | exact |
| "Suggest a first line" | **intentional, deferred** (AI openers are not in v0) |
| FaceTime and WhatsApp as smaller pills | intentional (founder's channel list) |
| Mention items are the user's own other lines (not "His goal was under four hours") | **intentional** (grounding: structured `event_goal` is never turned into words) |

Visual PASS · Interaction PASS · Accessibility PASS.

### Relationship page (board 2, "David Reyes"): `compare/person.png`

| Aspect | Status |
|---|---|
| Name at 40, sub-line, sprig top right, Lately / Coming up / You said you'd (ochre) / Between you, only when non-empty | exact |
| Message · Call · Tell at the bottom | exact, with Tell drawn as a pen icon (**technical**: no voice; the board's mic would promise voice) |
| Footnote numerals → a provenance line under each line (the brief board's own pattern) | **accessibility** (footnotes don't survive Dynamic Type and VoiceOver well) |
| Lines are the user's items, not a written paragraph | **intentional** (no summarising model in v0; grounded) |
| "Your story together" (history) | **intentional, deferred** (not in this slice) |
| "What Kinship knows about Ben →" | exact |

Visual PASS · Interaction PASS · Accessibility PASS.

### People (board 3, list side): `compare/people.png`

| Aspect | Status |
|---|---|
| Search at the top, hairline rows with sprig + name + one live line, the two-item bar | exact (Design Direction §I.6) |
| List/Garden toggle and the season plate | **superseded** (founder: no Garden destination now) |
| "+" in the header to add, and Settings | intentional (Settings "from the People header", §H) |

Visual PASS · Interaction PASS · Accessibility PASS.

### Night (board 3, "Good evening."): `compare/night.png`

The night palette is exact: green-black paper, parchment ink, a parchment primary button. Screens: `night-*.png`. Visual PASS.

### Source, correction, offline: no board

These are specified in the Design Direction (§I, §J) but not drawn. They are built from the same vocabulary:
- **Source.** The note in Moment serif with ochre underlines under the kept words; "From this note" rows; delete in brick.
- **Correction.** A focused sheet: the line, its tokens, its provenance, "Not this", Done.
- **Offline.** A quiet line above the Tell field: "I'll understand your notes when you're online."

There are no unexplained deviations in these screens.

## 7. Deviation summary

| Kind | Items |
|---|---|
| Superseded by the founder | Sprig marks and accumulation; Garden/Landscape toggle |
| Intentional (grounding, scope) | Template moment copy; v0 quiet-line types; no first-line suggestions; mention items; review as a sheet; Kept line for clear readings; question-only sheet; history deferred; evening prompt deferred |
| Technical / accessibility | No voice (Tell's listening screen and mic); token row instead of inline tokens; per-line provenance instead of footnotes; Newsreader instanced at fixed optical sizes |
| Unresolved | None in the lab. **Device rendering not yet checked** (see the readiness doc) |

## 8. Checks on this branch

| Check | Result |
|---|---|
| Jest | 267/267 in 42 suites (new: tokens, sprig, Today model, hand-off URLs, reasons and local state, consent copy, grounding across every 2.0 surface) |
| pgTAP | 431, including `61_v2_reasons_v0` (22 assertions). The `54_v2_amendments` allowlist now names four user-callable SECURITY DEFINER functions; the new one, `refresh_my_reasons`, takes no user id |
| Deno | 117 (no edge-function code changed; the gateway, prompt, model and schema are untouched) |
| `tsc --noEmit` | clean |
| ESLint | 0 errors, 131 warnings (the same as `main`; none in new code) |
