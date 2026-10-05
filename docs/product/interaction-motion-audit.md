# Interaction and motion: audit, fixes, and a proposed spec

**Scope:** the 2.0 first-use and core-loop journey (welcome → setup → Tell → review → People → relationship page → Today → hand-off → return).

**Method:** I read every 2.0 interaction in code and exercised the views in the lab. **I could not measure frame rates, real keyboard timing, haptics or permission dialogs.** No iPhone is available here; those items are in the native test path (§9).

**Character we're aiming for:** restrained, fast, calm, tactile. An immediate dim on touch; no scaling, no bounce; motion only where something arrives or leaves.

---

## 1. Every animation and transition

"Before" is the build you reviewed; "Now" is this branch after the fixes in §8.

| Where | Before | Now | Duration / easing | Reduce Motion |
|---|---|---|---|---|
| Today's moment arrives | Fade + 8 pt rise | same | 320 ms, cubic-bezier(0.2, 0.8, 0.2, 1), native driver | 150 ms fade |
| Sheets (review, correction, hand-off, add someone, consent fallback, email) | RN `Modal` "slide". **The dim scrim slid up with the sheet**; no drag despite the grabber | **Scrim fades; sheet rises; drag down from the top to close** | In: 360 ms, bezier(0.2, 0.8, 0.2, 1). Out: 240 ms ease-in cubic. Scrim 240 ms. Drag snap-back 160 ms ease-out | Both fade, 150 ms |
| "See how it works" opens | iOS full-screen modal slide | same | System (≈ 350 ms) | System cross-fade |
| "See how it works" step change | Fade in | same | 320 ms (default ease-in-out) | 150 ms |
| Welcome → 2.0 | **Slide from right over 1.0's cream (`#FDF7ED`) background** | **Fade on 2.0 paper** | System fade | System |
| Setup → Today | Push from right | **Fade** | System fade | System |
| People → person; person → What Kinship knows; → Source; → Add from contacts | iOS push (swipe back works) | same | System push (≈ 350 ms) | System |
| Today ⇄ People tabs | None (instant) | same | — | — |
| Keyboard rise/fall of the Tell dock and setup footer | **Jumped to the keyboard's final height on the first frame** | **Moves with the keyboard** (iOS `LayoutAnimation` keyboard curve, its own duration) | ≈ 250 ms, system keyboard curve | System |
| Pill busy | — (buttons went to 40% and looked disabled) | Spinner in place of the label | — | — |
| Waiting (store opening, setup check) | Spinner at once / blank paper up to 5 s | **Paper; a quiet spinner only after 600 ms** | — | — |
| 1.0 login animations (reanimated breathing, 1250–2000 ms loops) | 1.0 only | unchanged; never shown on the 2.0 entry | — | — |

**Not animated (instant):**
- setup step changes;
- correction panes swapping inside a sheet;
- the Kept line appearing above the Tell field;
- a review line removed with ×;
- the Tell field changing from pill to box after 34 characters;
- the return-check line;
- quiet lines.

See §6 for the layout jumps these cause.

## 2. Pressed and loading acknowledgment

**Before:** pressed dims at four different values (0.6, 0.72, 0.8; disabled 0.4 or 0.5). **Seven controls had no pressed state at all:**
- the review line's words ("change the words");
- the review line's ×;
- date-picker days;
- the correction sheet's line;
- What Kinship knows lines;
- the Kept line (which opens the review);
- the Today / People tabs.

**Now:** every pressable in 2.0 dims immediately to one of two tokens (`press.surface` 0.72 for buttons, rows and lines; `press.link` 0.6 for small text links and icons). Disabled is 0.4. A test fails if anyone hand-writes a pressed opacity again.

| Action | Immediate acknowledgment now | After |
|---|---|---|
| Continue with Apple | Dim; spinner in the button; "Signing you in…" | Native sheet, then the app fades in |
| Allow / Keep notes as written (consent) | Dim; **spinner in the pressed button**, the other disabled | Next step (waits on the server; see §4) |
| Pick a contact | Dim; tick fills at once | — |
| Continue with N people | Dim; **spinner** | Next step (local writes only, ~instant) |
| Keep it (first Tell) | Dim; **spinner** | Today, with Kept line or review (later) |
| Tell send (↑) | Dim; field clears at once | "Understanding…" line, then Kept line or review sheet |
| Done / Undo / × in review | Dim | Sheet leaves (240 ms) / line removed |
| A line on a person's page | Dim | Correction sheet rises |
| Provenance | Dim (link) | Source pushes |
| Message / Call | Dim | Hand-off sheet rises; buttons appear when the contact is read (~instant for picked contacts) |
| Open Messages | Dim; second tap ignored | Messages opens |
| Yes (did you reach …?) | Dim; **success haptic** | "Anything worth remembering about Ben?" |

## 3. Inconsistent patterns found

1. Four pressed-opacity values. **Fixed.**
2. "Busy" shown as "disabled" (40% grey) on setup and consent buttons, while the Apple button showed a spinner. **Fixed** (Pill `busy`).
3. The sheet's grabber promised a drag that didn't exist. **Fixed.**
4. The scrim slid with the sheet. **Fixed.**
5. Entering 2.0 slid in like 1.0, over 1.0's colour. **Fixed** (fade on paper).
6. Waiting was sometimes a spinner, sometimes blank paper. **Fixed** (`Waiting`: paper, then spinner after 600 ms).
7. Undo windows differ:
   - the auto-kept summary line: 5 s (plan says 4 s);
   - after Done: 8 s;
   - the look-over sheet closes itself after 20 s idle.

   All three are deliberate D1 values. **Recommend 5 / 8 / 20 stay** (see spec).
8. A review sheet can rise on its own (2–7 s after a Tell) on whatever screen she's on, even mid-scroll on People. It's D1 behaviour; see question 3 in §7.
9. Return check and "Anything worth remembering?" appear without the moment's arrive motion. Small; spec says they should arrive like the moment.

## 4. Optimistic UI, waits, and latency-sensitive flows

**Optimistic (instant, local first):**
- the Tell send (kept on the phone in < 100 ms; field clears at once);
- Undo;
- × "not this";
- corrections;
- saving picked people;
- adding by name;
- the return-check answer;
- Not now.

All are local writes that sync later.

**Waits on the network:**

| Flow | Waits for | Typical | Feels like |
|---|---|---|---|
| Understanding a Tell | Server extraction (model) | 2–7 s (plan target p95 7 s) | "Understanding…" line under the field. Fine |
| Consent Allow / decline | Server consent write | < 1 s online; up to the network timeout offline | Spinner in the button. **Could be optimistic:** move on at once and save in the background (the gateway enforces consent anyway; if it fails, Today asks again). Not changed; needs your yes |
| After sign-in: shell decision | Server flags (4 s timeout) | < 1 s | Paper (deliberate: no 1.0 flash) |
| Setup check on a new phone | One sync (5 s cap) | < 1 s online | Paper, spinner after 600 ms |
| Today's first refresh | `refresh_my_reasons` + sync | < 1 s; skipped if refreshed in the last 10 min | **Was:** "Nothing needs you today." could flash and then swap to a moment. **Now:** the empty state waits up to 1.5 s for the refresh; date, greeting and any moment show at once |
| Hand-off sheet buttons | Reading the contact on the phone (no network) | ~instant; the first time for a person added by name, the system contact picker | Heading shows at once; buttons appear when ready (no spinner) |

**Unnecessary waits:** the consent write (above) is the only one I'd change, with your approval.

## 5. Specific journeys

- **Contact selection:** 2,000 contacts load behind a spinner, then a virtualized list. Ticking used to redraw every visible row (each with its sprig drawing). **Now rows are memoized**, so a tick redraws one row. The permission prompt is asked once, on arrival, with the question on screen behind it. Denied and limited states recover.
- **Correction / date picker:** panes replace the sheet's content instantly. The sheet's height can jump (e.g. a line → a calendar month); see §6. Days now dim on press. Month arrows are icon buttons (dim).
- **People → person:** native push, swipe back; the page reads from the store. That read was quadratic in sources and **is now one read** (§8), which matters on a rich page.
- **Today → hand-off → Messages → back:**
  1. moment → Ask how it went (dim) → sheet rises (360 ms) → Open Messages (dim);
  2. iOS switches apps; the sheet closes behind;
  3. on return, the app re-renders Today on foreground; the return check shows only after 10 minutes, by design.

  Nothing waits on the network.
- **Permission prompts:** Contacts (setup step 2, or the first hand-off for someone added by name). Nothing else: no notifications, no calendar, no microphone.
- **Loading and errors:**
  - store opening, setup check and Today's first refresh are covered above;
  - sign-in errors are said in words;
  - a failed local save restores the Tell text with an alert;
  - **gap:** if a store read ever fails, Today renders nothing and People shows its empty state (`useStoreQuery` errors aren't surfaced in the views). Rare (local SQLite), but a silent failure.

## 6. Layout shifts and re-renders

| Shift | Cause | Severity | Recommendation |
|---|---|---|---|
| Kept / "Understanding…" line appears above the Tell field | Dock height changes instantly | Medium: the whole Today/People content area shortens by one line | Animate the line's height, 160 ms (spec §7.4) |
| Review line removed with × | Row disappears | Low | 160 ms fade then collapse |
| Correction pane swap | Sheet height jumps | Medium | 160 ms cross-fade; let height follow |
| Tell field pill → box at 34 characters | Radius and alignment flip | Low | Animate radius or switch on the second line only |
| Setup step change | Content swaps instantly | Low | 160 ms cross-fade |
| Today empty state ⇄ moment | Refresh arriving late | **Was high: fixed** (§4) | — |

**Re-renders:**
- every store change re-runs every mounted query (Today, People, the dock, the Tell flow). Sync notifies only when rows changed, and Understanding runs every 30 s while open;
- Today also re-reads once a minute (for the return-check window).

Fine at dogfood scale.

**Likely native performance problems** (to check on the phone):
1. Relationship page and What Kinship knows were O(items × sources) on every change. **Fixed:** one grouped read.
2. Today still reads all `memory_items` and `reasons` on each change. Fine for hundreds; watch at thousands.
3. The contact picker builds its lists in JS on the main thread (2,000 contacts: likely 50–150 ms once).
4. Sprig SVGs per row are cached per person but still drawn with SVG paths. 500-row scroll is untested on device.
5. `LayoutAnimation` for the keyboard is iOS-only (Android lifts without animation; not a target).

## 7. Haptics

**Before: none in 2.0.** The Design Direction allows exactly three:
- a soft tick when recording starts and stops (voice, not built);
- a light tap when a leaf is added (sprig marks, off);
- a success tap after hand-off confirmation.

**Now:** one. A success haptic when she answers **Yes** to "Did you reach …?" (`src/platform/haptics.ts`). Nothing on scroll, navigation, tabs or ordinary taps.

## 8. Fixes made in this pass (obvious defects and consistency only)

1. Sheet: fading scrim; 360 ms rise / 240 ms exit with no overshoot; drag-to-close from the grabber area; 150 ms fades with Reduce Motion (`src/ui/Sheet.tsx`).
2. Keyboard: the Tell dock and setup footer move with the keyboard (`src/ui/useKeyboardLift.ts`).
3. Pressed states added to the seven controls missing them; all presses use `press.surface` / `press.link` (`src/design/tokens.ts`); a test guards it.
4. `Pill busy`: spinner in place of the label, same size, no double press. Used on consent, Continue with N people, Keep it, Add someone → Done.
5. Today holds its empty states until the first refresh (≤ 1.5 s).
6. `Waiting`: paper, then a spinner after 600 ms, for the store opening and the setup check.
7. Entering 2.0 and setup → Today fade on paper, instead of sliding over 1.0's cream.
8. The one approved haptic (return check Yes).
9. Contact rows memoized; page and What Kinship knows read sources once.
10. A second tap on Open Messages / Call is ignored while the first is opening.

Tests: `src/ui/__tests__/interaction.test.tsx` (5). Jest 319/319, `tsc` clean, ESLint 0 errors (130 warnings, unchanged).

---

## 9. Proposed Kinship motion and interaction spec (for your approval)

**Principles.** Acknowledge every touch at once. Move only what arrives or leaves. Nothing scales, bounces, overshoots or loops. Never animate to decorate. Reduce Motion turns every movement into a short fade.

| # | Rule | Value |
|---|---|---|
| 1 | **Press** | Immediate dim on touch-down: 0.72 for buttons, rows and lines; 0.6 for small links and icons. No scale. Disabled 0.4 |
| 2 | **Busy** | The pressed control shows a spinner in place of its label within one frame; it keeps its size; nothing else on screen dims |
| 3 | **Waiting for a screen** | Paper only for the first 600 ms; then one quiet spinner. Never a skeleton, never a progress bar |
| 4 | **Arrive** (Today's moment, the return check, "Anything worth remembering?", a new quiet line) | Fade + 8 pt rise, 320 ms, bezier(0.2, 0.8, 0.2, 1) |
| 5 | **Small changes** (a line appearing or leaving, a pane swap, a setup step) | Cross-fade 160 ms, height follows. *Proposed; not built yet* |
| 6 | **Sheets** | Scrim fades 240 ms; sheet rises 360 ms bezier(0.2, 0.8, 0.2, 1), no overshoot; leaves 240 ms ease-in; drag down to close; never a sheet on a sheet |
| 7 | **Navigation** | Native iOS push for going deeper (person, knows, source), with swipe back; fade for changes of place (entering the app, setup → Today); tabs switch instantly |
| 8 | **Keyboard** | Anything pinned above the keyboard moves with it, on its curve and duration |
| 9 | **Optimism** | Anything the phone can do alone happens at once (tell, undo, correct, forget, pick, answer); only consent and understanding wait on the network, and say so in words |
| 10 | **Latency words** | "Understanding…" while a note is being read; "I'll understand your notes when you're online." offline; never a spinner for understanding |
| 11 | **Undo windows** | Auto-kept line 5 s; after Done 8 s; untouched look-over closes after 20 s |
| 12 | **Haptics** | Only the Design Direction's three; today one (reached someone: success). Never on scroll, navigation, tabs or ordinary taps |
| 13 | **Reduce Motion** | Every movement becomes a 150 ms fade; no rise, no slide, no sway |

**Decisions for you:**
- approve the spec (or change values);
- whether rule 5 should be built before the wife's build;
- whether consent should be optimistic;
- whether a review sheet may rise on its own on another screen, or should wait for her to come back to where she told it.

---

## 10. Native test path: responsiveness and motion (about 5 minutes)

Use the `dogfood-v2` build. Normal text size first, then Larger Text, then Settings › Accessibility › Motion › Reduce Motion on.

1. **Cold open.** Kill the app; open it. *Expect:* paper, then the welcome. No cream flash, no spinner unless it takes over 0.6 s.
2. **"See how it works".** Tap through all 4 steps quickly. *Expect:* each tap acknowledged at once; steps fade in; "Got it" returns to the welcome without a stutter.
3. **Sign in.** *Expect:* the Apple button shows a spinner at once; afterwards the app **fades** in (no slide from the right).
4. **Consent.** Tap Allow. *Expect:* a spinner inside Allow at once; the next step within about a second.
5. **Contacts.** Scroll your whole list fast; tick 10 people quickly; search; clear. *Expect:* no dropped frames; each tick fills instantly; the count updates without the list jumping.
6. **First Tell.** Tap the box. *Expect:* the keyboard rises and the buttons ride up **with** it, never ahead of it or covered. Type 3 lines; tap Keep it (spinner), then land on Today.
7. **Understanding.** Watch the line above the Tell field. *Expect:* "Understanding…" at once, then the Kept line or the review sheet within ~7 s. Note any jump in the screen when the line appears.
8. **Sheets.** In the review sheet: tap a date (the calendar replaces the content), pick a day, then drag the sheet down by its top. *Expect:* the dim behind **fades**, the sheet follows your finger, closes past a short drag, springs back from a small one. Note any height jump when the calendar opens.
9. **People → person → back.** Open three people quickly; swipe back. *Expect:* native push; a rich page opens without a pause.
10. **Hand-off.** From a Today moment (or a person's page): Message → Open Messages, double-tapping the button. *Expect:* Messages opens once. Come back after 10 minutes: "Did you reach …?" → Yes. *Expect:* **one success haptic**, then "Anything worth remembering about …?".
11. **Today open.** Switch apps and back several times. *Expect:* "Nothing needs you today." never flashes before a moment appears.
12. **Reduce Motion on.** Repeat 2, 7 and 8. *Expect:* only short fades; nothing slides or rises.

Note anything that feels slow, jumpy, bouncy, or unacknowledged, with the step number.
