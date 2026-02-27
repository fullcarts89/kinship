# State: Kinship Intelligence Layer

## Project Reference
See: .planning/PROJECT.md (updated 2026-02-27)
**Core value:** The app must feel like a calm, living garden — never a productivity dashboard.
**Current focus:** Phase 1

## Progress

- Phases: 0/9 complete
- Requirements: 2/27 complete

### Phase Checklist

| # | Phase | Status | Requirements Done |
|---|-------|--------|-------------------|
| 1 | Photo & Media | In Progress (Plan 1/2 done) | 2/3 |
| 2 | Memory Detail Views | Not started | 0/2 |
| 3 | Contact Integration | Not started | 0/2 |
| 4 | Reach-Out Flow Core | Not started | 0/2 |
| 5 | Reach-Out Intelligence | Not started | 0/2 |
| 6 | Garden Visuals & Vitality Wiring | Not started | 0/5 |
| 7 | Intelligence Context Layer | Not started | 0/5 |
| 8 | Garden Walk | Not started | 0/2 |
| 9 | Calendar Integration | Not started | 0/4 |

## Current Position

- **Active phase:** Phase 1 — Photo & Media (Plan 1/2 complete)
- **Current plan:** 01-01 complete, 01-02 next
- **Next action:** Execute plan 01-02 (display layer)

## Phase Dependencies

The following phases must complete before the dependent phase begins:

| Dependency | Dependent | Reason |
|------------|-----------|--------|
| Phase 1 | Phase 2 | Memory detail view needs correct photo display |
| Phase 3 | Phase 4 | Reach-out button visibility depends on contact info availability |
| Phase 4 | Phase 5 | Memory carousel sits inside the corrected reach-out flow |
| Phase 7 | Phase 8 | Garden Walk uses the recency exclusion filter fixed in Phase 7 |
| Phase 8 | Phase 9 | Garden Walk suggestions must be wired before calendar feeds into them |

Phases 6 (Garden Visuals) and 3 (Contact Integration) are independently workable alongside their neighbors.

## Session History

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Project initialized | 27 requirements, 9 phases, roadmap created |
| 2026-02-27 | Completed 01-01 | photo_url on Memory, mock persistence, picker fix (2 min, 3 tasks, 4 files) |

## Open Issues

(None)

## Key Decisions

Inherited from PROJECT.md — reproduced here for quick reference:

| Decision | Rationale |
|----------|-----------|
| Reach-out flow → memory carousel then actions then check-in | User wants context (past memories) before choosing how to reach out |
| Remove "Capture a moment" from Garden Walk | Garden Walk should focus only on suggested people to tend |
| Calendar permission in Garden Walk setup + manageable in Settings | Natural onboarding moment + ongoing control |
| Show device contact info on imported person profiles | Users expect to see phone/email when they import someone |
| 7-day minimum lag before memory resurfaces | Prevents "revisit this memory" appearing for something just captured |
| MemoryInsert omits photo_url then re-adds as optional | Keeps Memory row type strict while insert is lenient — backward-compatible |
| memoryService unchanged for photo_url | Spread operator passes all fields through automatically |

## Architecture Reminders

Critical patterns to respect during implementation:

- **Lazy require**: `expo-contacts` and `expo-calendar` must NEVER be top-level imported — always `require()` inside try/catch
- **`router.canGoBack()` first**: Always check before calling `router.back()`, fallback to explicit route
- **`useFocusEffect`**: Use for any data refresh when a tab/screen gains focus — tabs stay mounted
- **Module-level shared state**: New data (people, memories, interactions) goes into the module-level arrays in their respective hooks — not local state
- **Tone validation**: All user-facing copy must avoid guilt words ("haven't", "forgot", "neglect", "overdue", "should")
- **No gamification**: Never show points, streaks, progress bars, or day counts to users
- **FadeIn component**: Accepts `className` only — not `style` prop
