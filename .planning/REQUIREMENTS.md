# Requirements: Kinship Intelligence Layer

**Defined:** 2026-02-27
**Core Value:** The app must feel like a calm, living garden that surfaces relevant, timely suggestions based on actual relationship activity — never guilt, never arbitrary.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Photo & Media

- [x] **PHOTO-01**: User can select photos from any album/collection folder in the photo picker (not just recent)
- [x] **PHOTO-02**: Photos attached to memories are persisted and display correctly in memory views
- [x] **PHOTO-03**: Photos display in the memory detail view and memory list/cards on person profiles

### Reach-Out Flow

- [ ] **REACH-01**: After tapping "Reach out" on a person, user sees a swipeable carousel of recent memories (past year) for context before choosing an action
- [ ] **REACH-02**: Reach-out action options (call, text, etc.) are contextually relevant — not the same static list every time
- [ ] **REACH-03**: After completing a reach-out action, user goes directly to the "How'd it go?" check-in screen — no intermediate "moments like this" screen
- [ ] **REACH-04**: Call/text/video action buttons are hidden when the person has no phone number or contact info saved

### Intelligence & Context

- [ ] **INTL-01**: Vitality engine reflects actual recent activity — "it's been a while" context never appears if user interacted with person today
- [ ] **INTL-02**: Home screen suggestions account for recent reach-outs — no suggestion to reach out to someone the user just contacted
- [ ] **INTL-03**: Garden Walk "plants to tend" list excludes people the user has recently reached out to (within last 24 hours)
- [ ] **INTL-04**: Memory resurface ("moment worth revisiting") enforces a minimum 7-day lag from memory creation before surfacing
- [ ] **INTL-05**: Suggestion engine uses real interaction/memory data to generate personalized, varying suggestions (not static/repetitive content)

### Calendar Integration

- [ ] **CAL-01**: User can grant calendar permission during Garden Walk setup flow
- [ ] **CAL-02**: User can manage calendar permission from Settings
- [ ] **CAL-03**: Calendar engine auto-scans recent events in background and matches attendees to garden persons
- [ ] **CAL-04**: Calendar matches feed into suggestion engine for post-event memory capture prompts

### Garden Visuals

- [ ] **VIS-01**: Plant icons in the "All people" list match the corresponding plant visualization in the garden canopy view
- [ ] **VIS-02**: VitalPlant wrapper applies vitality visual modifiers (opacity, desaturation, sway) consistently across all plant rendering contexts

### Memory & Detail Views

- [x] **MEM-01**: User can tap a memory card to view its full detail (content, emotion, photos, date)
- [x] **MEM-02**: Memory detail view displays all attached photos

### Contact Integration

- [ ] **CONT-01**: When a person is imported from device contacts, their phone number and email display on their profile
- [ ] **CONT-02**: Contact info fields (phone, email) are pulled from device contacts using lazy require pattern

### Garden Walk

- [ ] **WALK-01**: Garden Walk screen focuses exclusively on suggested people to tend — no "Capture a moment" / "Anything on your mind" section
- [ ] **WALK-02**: Garden Walk suggestions are contextually intelligent (use vitality, calendar, growth data)

### Vitality Wiring

- [ ] **VITAL-01**: VitalPlant component is integrated into Home screen plant carousel
- [ ] **VITAL-02**: VitalPlant component is integrated into Garden tab canopy and person rows
- [ ] **VITAL-03**: VitalPlant component is integrated into Person profile plant display

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Push Notifications
- **NOTF-01**: Garden Walk reminder delivered as push notification on user's chosen day/time
- **NOTF-02**: Memory resurface notifications delivered with tone-validated copy
- **NOTF-03**: Birthday contextual nudge notifications

### Backend Persistence
- **DATA-01**: All data persisted to Supabase (replace module-level mock arrays)
- **DATA-02**: User authentication with real sessions
- **DATA-03**: Photo upload to Supabase Storage

### Texture Engine UI
- **TEXT-01**: Texture labels displayed on person profiles
- **TEXT-02**: Users can dismiss texture labels (30-day cooldown)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Supabase backend connection | Next milestone — current milestone uses mock data |
| Push notification delivery | Engine exists, delivery deferred to post-backend |
| Subscription/payment features | App is permanently free |
| Localization/i18n | English only for now |
| Analytics tracking | Deferred until backend connected |
| Texture labels in UI | Engine exists, UI deferred to next milestone |

## Traceability

| Requirement | Phase | Phase Name | Status |
|-------------|-------|------------|--------|
| PHOTO-01 | 1 | Photo & Media | Pending |
| PHOTO-02 | 1 | Photo & Media | Pending |
| PHOTO-03 | 1 | Photo & Media | Pending |
| MEM-01 | 2 | Memory Detail Views | Pending |
| MEM-02 | 2 | Memory Detail Views | Pending |
| CONT-01 | 3 | Contact Integration | Pending |
| CONT-02 | 3 | Contact Integration | Pending |
| REACH-03 | 4 | Reach-Out Flow Core | Pending |
| REACH-04 | 4 | Reach-Out Flow Core | Pending |
| REACH-01 | 5 | Reach-Out Intelligence | Pending |
| REACH-02 | 5 | Reach-Out Intelligence | Pending |
| VIS-01 | 6 | Garden Visuals & Vitality Wiring | Pending |
| VIS-02 | 6 | Garden Visuals & Vitality Wiring | Pending |
| VITAL-01 | 6 | Garden Visuals & Vitality Wiring | Pending |
| VITAL-02 | 6 | Garden Visuals & Vitality Wiring | Pending |
| VITAL-03 | 6 | Garden Visuals & Vitality Wiring | Pending |
| INTL-01 | 7 | Intelligence Context Layer | Pending |
| INTL-02 | 7 | Intelligence Context Layer | Pending |
| INTL-03 | 7 | Intelligence Context Layer | Pending |
| INTL-04 | 7 | Intelligence Context Layer | Pending |
| INTL-05 | 7 | Intelligence Context Layer | Pending |
| WALK-01 | 8 | Garden Walk | Pending |
| WALK-02 | 8 | Garden Walk | Pending |
| CAL-01 | 9 | Calendar Integration | Pending |
| CAL-02 | 9 | Calendar Integration | Pending |
| CAL-03 | 9 | Calendar Integration | Pending |
| CAL-04 | 9 | Calendar Integration | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 — phase mappings added after roadmap creation*
