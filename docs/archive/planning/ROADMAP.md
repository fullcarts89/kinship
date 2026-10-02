# Roadmap: Kinship Intelligence Layer

**Created:** 2026-02-27
**Milestone:** v1.0 — Intelligence Layer Bug Fixes & Completion
**Phases:** 9
**Total Requirements:** 27

---

## Phase Overview

| # | Phase | Goal | Requirements | Plans |
|---|-------|------|--------------|-------|
| 1 | Photo & Media | Fix photo picker and ensure photos persist and display correctly | PHOTO-01, PHOTO-02, PHOTO-03 | 2/2 Complete |
| 2 | Memory Detail Views | Make memories tappable with a full detail view including photos | MEM-01, MEM-02 | 2/2 Complete |
| 3 | Contact Integration | Pull device contact info onto imported person profiles | CONT-01, CONT-02 | 2 |
| 4 | Reach-Out Flow Core | Fix routing bugs and hide action buttons with no contact info | REACH-03, REACH-04 | 5 |
| 5 | Reach-Out Intelligence | Add memory carousel and contextual action options to reach-out | REACH-01, REACH-02 | 6 |
| 6 | Garden Visuals & Vitality Wiring | Unify plant icons and wire VitalPlant across all plant-rendering surfaces | VIS-01, VIS-02, VITAL-01, VITAL-02, VITAL-03 | 8 |
| 7 | Intelligence Context Layer | Fix staleness bugs and wire suggestion engine to real data | INTL-01, INTL-02, INTL-03, INTL-04, INTL-05 | 8 |
| 8 | Garden Walk | Remove "Capture a moment" section and make suggestions contextually intelligent | WALK-01, WALK-02 | 5 |
| 9 | Calendar Integration | Wire calendar permission flow and connect engine to suggestions | CAL-01, CAL-02, CAL-03, CAL-04 | 7 |

---

## Phase 1: Photo & Media

**Goal:** Users can select photos from any album or collection folder, and any photo attached to a memory persists and displays correctly everywhere that memory appears.

**Requirements:** PHOTO-01, PHOTO-02, PHOTO-03

### Success Criteria
1. A user opening the photo picker in the Add Memory screen can browse and select a photo from a named album (e.g. "Screenshots", "Trips") — not just the Recents roll.
2. After saving a memory with an attached photo, the photo appears on the memory card in the person's profile without being re-selected.
3. The photo is visible again when the user returns to the app after closing and reopening it (within the same session).
4. No broken image placeholders appear on any memory card or list row that previously had a photo attached.
5. A memory saved without a photo shows no broken image state — just the memory content.

### Plans: 2 plans (Complete)

- [x] 01-01-PLAN.md — Data layer: Add photo_url to Memory type, implement mock persistence for memories, fix photo picker album access and wire photo_url through save
- [x] 01-02-PLAN.md — Display layer: Render photos in memory cards (person profile) and MemorySpotlight (home screen), register expo-image-picker plugin in app.json, visual verification

---

## Phase 2: Memory Detail Views

**Goal:** Every memory card in the app is tappable and opens a full detail view showing the memory's content, emotion, date, and any attached photos.

**Requirements:** MEM-01, MEM-02

### Success Criteria
1. Tapping any memory card on a person's profile navigates to a detail screen — the card is never inert.
2. The detail screen displays the full memory content text without truncation.
3. If the memory has an attached photo, the photo is displayed prominently in the detail view.
4. If the memory has an emotion tag, it is displayed (with the correct label/emoji) in the detail view.
5. The detail view has a working back navigation that returns the user to the person's profile without losing scroll position.

### Plans: 2/2 Complete

- [x] 02-01-PLAN.md — Data/utility layer: Add useMemory(id) hook, move emotionEmojis to formatters.ts, update barrel exports
- [x] 02-02-PLAN.md — Screen + wiring: Create memory detail screen (app/memory/[id].tsx), wire onPress on memory cards and MemorySpotlight

---

## Phase 3: Contact Integration

**Goal:** When a person has been imported from device contacts, their phone number and email address appear on their profile and are used to determine which reach-out actions are available.

**Requirements:** CONT-01, CONT-02

### Success Criteria
1. Opening the profile of a person imported from device contacts shows their phone number (if they have one) without the user needing to manually enter it.
2. Opening the profile of a person imported from device contacts shows their email address (if they have one) without the user needing to manually enter it.
3. Contact data is fetched at profile load time using the lazy `require("expo-contacts")` pattern — no top-level import crash.
4. A person added manually (not from contacts) shows no phantom phone or email fields.
5. If the device denies contacts permission, the profile degrades gracefully with no crash and no empty broken field.

### Plans: 2 plans

- [ ] 03-01-PLAN.md — Data layer: Add phone/email to Person type, mock data, and wire createPerson save payload in add flow
- [ ] 03-02-PLAN.md — Display layer: Render phone/email on person profile, verify no top-level expo-contacts imports

---

## Phase 4: Reach-Out Flow — Core Fixes

**Goal:** The reach-out flow routes correctly (skipping the intermediate "moments like this" screen) and hides action buttons (call, text, video) when the person has no contact info.

**Requirements:** REACH-03, REACH-04

### Success Criteria
1. After a user completes a reach-out action (e.g. taps "Send a text"), they land directly on the "How'd it go?" check-in screen — no intermediate screen appears.
2. The "How'd it go?" check-in screen is reachable from every reach-out action type.
3. If a person has no phone number saved, the Call and Text buttons do not appear in the reach-out options.
4. If a person has no email saved, the Email button does not appear.
5. If a person has no contact info at all, the reach-out screen still works — showing only generic options (e.g. "Meet in person", "Send a note").

### Plans (to be created)
- 4-01: Trace current reach-out navigation stack — document every screen in the flow and identify the wrong intermediate screen
- 4-02: Remove or bypass the intermediate "moments like this" screen — wire action completion directly to check-in route
- 4-03: Audit action button rendering logic — identify where call/text/video buttons are defined and what conditions currently gate them
- 4-04: Wire contact info availability (from Phase 3) to conditionally render call/text/email buttons
- 4-05: End-to-end test the corrected flow for both a person with contact info and one without

---

## Phase 5: Reach-Out Intelligence

**Goal:** The reach-out flow opens with a swipeable carousel of the person's recent memories (giving context) and presents action options that vary based on relationship data rather than a static list.

**Requirements:** REACH-01, REACH-02

### Success Criteria
1. Opening the reach-out flow for a person shows a horizontally swipeable carousel of their memories from the past year (most recent first).
2. The carousel is skippable — a user with no memories for that person still reaches the action options without error.
3. Action option labels or ordering vary between people based on their relationship data (e.g. someone usually called by phone sees "Call" first; someone usually messaged sees "Send a message" first).
4. The action options never include repetitive, static copy identical every single time regardless of context.
5. Swipe gestures on the memory carousel do not conflict with the tab navigation swipe gesture.
6. The carousel displays memory content and emotion tags — not just a blank card — even for memories without photos.

### Plans (to be created)
- 5-01: Design data flow — identify how recent memories for a person are fetched and filtered to past year in `useMemories`
- 5-02: Build swipeable memory carousel component for reach-out screen (horizontal FlatList or ScrollView with paging)
- 5-03: Integrate carousel into reach-out screen as first section, above action buttons
- 5-04: Audit suggestion engine's ability to rank or vary reach-out action types per person — wire output to action option rendering
- 5-05: Write contextual action copy variations using suggestion engine data (no static list)
- 5-06: Test carousel empty state (person has no memories in past year) and verify graceful fallback

---

## Phase 6: Garden Visuals & Vitality Wiring

**Goal:** Plant icons are visually consistent across all surfaces (canopy and list), and the VitalPlant wrapper is applied to every plant rendering context so vitality visual modifiers (opacity, desaturation, gentle sway) are reflected everywhere.

**Requirements:** VIS-01, VIS-02, VITAL-01, VITAL-02, VITAL-03

### Success Criteria
1. A person at "Sprouting" stage shows the same plant illustration in the garden canopy view and in the "All people" list row — no icon mismatch.
2. A person at any growth stage shows the matching icon in both views — the rule holds across all 6 stages.
3. On the Home screen plant carousel, a person with low vitality score shows a visually muted plant (lower opacity or desaturated) compared to a person with high vitality.
4. On the Garden tab, canopy and list plants reflect vitality visual state consistently — same modifiers applied in both places.
5. On the Person profile, the plant display reflects the person's current vitality state.
6. Vitality visual changes are smooth — no jarring flickers on screen focus or when vitality data loads.

### Plans (to be created)
- 6-01: Audit `VitalPlant` component — document the props it accepts and the visual modifiers it applies (opacity, desaturation, animation)
- 6-02: Audit Home screen plant carousel — confirm which plant component is used and wire `VitalPlant` wrapper around it
- 6-03: Audit Garden tab canopy view — identify plant component used per person card and wire `VitalPlant` wrapper
- 6-04: Audit Garden tab "All people" list rows — wire `VitalPlant` wrapper
- 6-05: Audit Person profile plant display — wire `VitalPlant` wrapper
- 6-06: Identify root cause of icon mismatch between canopy and list (likely different illustration components being used) — unify to single source of truth per growth stage
- 6-07: Verify all 6 growth stages render consistently in both canopy and list views after fix
- 6-08: Smoke test all plant-rendering surfaces for performance — vitality wiring should not cause excessive re-renders

---

## Phase 7: Intelligence Context Layer

**Goal:** The vitality engine and suggestion engine always reflect current activity — no "it's been a while" context when the user just reached out, no suggestion to contact someone just contacted, no memory resurfacing too soon, and suggestions are personalized rather than static.

**Requirements:** INTL-01, INTL-02, INTL-03, INTL-04, INTL-05

### Success Criteria
1. After logging a reach-out with someone today, the vitality context for that person no longer shows "it's been a while" — the engine reads the latest interaction timestamp.
2. After reaching out to someone, the home screen suggestion list no longer includes that person as a reach-out suggestion for at least 24 hours.
3. The Garden Walk "plants to tend" list refreshes correctly after a reach-out — a person reached out to today is not listed.
4. A memory captured today (or within the last 7 days) does not appear in any "moment worth revisiting" surface.
5. Two different people in the garden generate different suggestion copy — the engine is producing personalized output rather than the same static text for everyone.

### Plans (to be created)
- 7-01: Audit vitality engine's interaction timestamp lookup — trace how `useVitality` or equivalent determines recency and identify why recent interactions are ignored
- 7-02: Fix vitality engine to read from `locallyCreatedInteractions` (and mock data) with correct recency — ensure today's reach-out updates the score immediately
- 7-03: Audit suggestion engine's reach-out recency filter — identify where suggestions are generated and add / fix the "recently contacted" exclusion window
- 7-04: Wire 24-hour exclusion: after a reach-out interaction is recorded, mark the person as excluded from reach-out suggestions for 24 hours
- 7-05: Fix Garden Walk suggestion list to apply the same exclusion — re-use the recency filter already fixed in 7-04
- 7-06: Fix memory resurface logic — add 7-day creation lag check before any memory can appear in a "moment worth revisiting" surface
- 7-07: Audit suggestion engine output — compare output for two different people and confirm personalized, varying copy is generated
- 7-08: End-to-end test: add interaction, close app to tabs, check home suggestions and vitality context are consistent

---

## Phase 8: Garden Walk

**Goal:** The Garden Walk screen is focused exclusively on suggested people to tend — the "Capture a moment" / "Anything on your mind" section is removed — and the people surfaced are chosen via contextual intelligence rather than arbitrary ordering.

**Requirements:** WALK-01, WALK-02

### Success Criteria
1. Opening the Garden Walk screen shows no "Capture a moment", "Anything on your mind", or equivalent freeform section.
2. Every person shown in the Garden Walk list has a reason for being there (low vitality, upcoming event, or growth milestone) — not just all people alphabetically.
3. A person the user reached out to today does not appear in the Garden Walk list (uses the same recency filter from Phase 7).
4. The Garden Walk screen loads without error even if the suggestion engine returns an empty list — an appropriate empty state is shown.
5. The suggestions in Garden Walk reflect different contextual reasons (e.g. "You haven't connected recently" is never shown; instead reasons like "A good moment to share something" or "Something to celebrate" are used per the tone rules).

### Plans (to be created)
- 8-01: Audit Garden Walk screen code — locate and remove "Capture a moment" / "Anything on your mind" section and any related UI/state
- 8-02: Audit how Garden Walk currently populates its people list — identify whether it uses suggestion engine output or a simpler query
- 8-03: Wire Garden Walk people list to suggestion engine output filtered by vitality, calendar, and growth data
- 8-04: Apply the Phase 7 recency exclusion to Garden Walk list population
- 8-05: Add empty state for Garden Walk when no suggestions are generated (tone-appropriate, no guilt copy)

---

## Phase 9: Calendar Integration

**Goal:** Users can grant (and manage) calendar permission in Garden Walk setup and Settings, and the calendar engine scans recent events to feed post-event memory capture prompts into the suggestion engine.

**Requirements:** CAL-01, CAL-02, CAL-03, CAL-04

### Success Criteria
1. During Garden Walk setup, the user is prompted to grant calendar access with a clear, optional explanation — they can skip it without consequence.
2. In Settings, the user can see whether calendar access is granted and navigate to device settings to change it.
3. After granting permission, the calendar engine scans recent events (past 7 days) without any UI-blocking delay.
4. If the user attended a calendar event with a person in their garden, a prompt to "Capture a memory from [event name]" appears in suggestions within the next Garden Walk or home screen refresh.
5. Revoking calendar permission in device settings causes the calendar integration to fail silently — no crash, no error toast.

### Plans (to be created)
- 9-01: Audit Garden Walk setup screen — identify where calendar permission prompt should be inserted and implement using lazy `require("expo-calendar")`
- 9-02: Implement permission request UI in Garden Walk setup (optional step, skippable, tone-appropriate copy)
- 9-03: Audit Settings screen — add calendar permission status display and "Open settings" link for managing permission
- 9-04: Wire calendar engine background scan — confirm engine is called after permission granted and on each Garden Walk open, using lazy require inside try/catch
- 9-05: Implement attendee matching logic in calendar engine — match event attendees to person records by name/email
- 9-06: Wire calendar match results into suggestion engine as post-event capture prompts
- 9-07: Test revoked-permission graceful degradation — engine returns empty array, no crash, suggestions fall back to non-calendar sources

---

## Dependency Map

```
Phase 1 (Photos)
  └─► Phase 2 (Memory Detail) — detail view needs photos to display correctly

Phase 3 (Contacts)
  └─► Phase 4 (Reach-Out Core) — button visibility depends on contact info

Phase 4 (Reach-Out Core)
  └─► Phase 5 (Reach-Out Intelligence) — carousel sits inside the corrected flow

Phase 7 (Intelligence Context)
  └─► Phase 8 (Garden Walk) — Garden Walk uses same recency exclusion filter

Phase 9 (Calendar) — depends on Phase 7 for suggestion engine integration
  └─► runs after Phase 8 (Garden Walk wired to suggestions before calendar feeds them)
```

Phases 6 (Garden Visuals) and 8 (Garden Walk) are otherwise independent and can be worked in parallel with adjacent phases.

---

## Coverage Verification

| Requirement | Phase |
|-------------|-------|
| PHOTO-01 | 1 |
| PHOTO-02 | 1 |
| PHOTO-03 | 1 |
| MEM-01 | 2 |
| MEM-02 | 2 |
| CONT-01 | 3 |
| CONT-02 | 3 |
| REACH-03 | 4 |
| REACH-04 | 4 |
| REACH-01 | 5 |
| REACH-02 | 5 |
| VIS-01 | 6 |
| VIS-02 | 6 |
| VITAL-01 | 6 |
| VITAL-02 | 6 |
| VITAL-03 | 6 |
| INTL-01 | 7 |
| INTL-02 | 7 |
| INTL-03 | 7 |
| INTL-04 | 7 |
| INTL-05 | 7 |
| WALK-01 | 8 |
| WALK-02 | 8 |
| CAL-01 | 9 |
| CAL-02 | 9 |
| CAL-03 | 9 |
| CAL-04 | 9 |

**Total: 27/27 requirements mapped. Coverage: 100%.**

---
*Roadmap created: 2026-02-27*
*Last updated: 2026-02-27 after initial creation*
