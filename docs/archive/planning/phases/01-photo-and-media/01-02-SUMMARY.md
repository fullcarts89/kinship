---
phase: 01-photo-and-media
plan: 02
subsystem: ui
tags: [expo-image-picker, react-native-image, memory-cards, memory-spotlight]

# Dependency graph
requires:
  - phase: 01-photo-and-media plan 01
    provides: "Memory type with photo_url field, mock persistence, picker fix"
provides:
  - "Conditional photo rendering in memory cards on person profile"
  - "Conditional photo rendering in MemorySpotlight on home screen"
  - "expo-image-picker plugin registered in app.json for production builds"
affects: [02-memory-detail-views]

# Tech tracking
tech-stack:
  added:
    - "expo-image-picker plugin in app.json"
  patterns:
    - "Conditional Image/LinearGradient rendering based on photo_url presence"

key-files:
  created: []
  modified:
    - "app/person/[id].tsx"
    - "app/(tabs)/index.tsx"
    - "app.json"

key-decisions:
  - "Memory card photo height 80px matches existing gradient placeholder height for visual consistency"
  - "MemorySpotlight photo height 140px (taller than cards) to give photos prominence in featured display"

patterns-established:
  - "Conditional photo rendering: check photo_url ? Image : LinearGradient placeholder — reusable across future memory display surfaces"

requirements-completed: [PHOTO-02, PHOTO-03]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 1 Plan 02: Display Layer — Photo Rendering in Memory Cards and Spotlight Summary

**Conditional photo display in memory cards (person profile) and MemorySpotlight (home screen) with expo-image-picker plugin registration for production builds**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T22:44:37Z
- **Completed:** 2026-02-27T22:46:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 3

## Accomplishments
- Memory cards on person profiles conditionally render the actual photo (Image component) when `memory.photo_url` exists, or the gradient emoji placeholder when null
- MemorySpotlight on home screen renders a prominent 140px photo when available, falling back to the existing 72px gradient header
- expo-image-picker plugin added to app.json with garden-toned `photosPermission` string for iOS/Android production builds
- Auto-approved checkpoint (Task 3): end-to-end photo flow verification treated as passed per YOLO mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Add photo rendering to memory cards on person profile** - `7db09c2` (feat)
2. **Task 2: Add photo rendering to MemorySpotlight and register expo-image-picker plugin** - `8ec45c1` (feat)
3. **Task 3: Verify photo flow end-to-end** - Auto-approved checkpoint (no commit)

## Files Created/Modified
- `app/person/[id].tsx` - Memory card renderer now conditionally shows Image (height: 80, width: 100%, resizeMode: cover) when photo_url exists, gradient placeholder when null
- `app/(tabs)/index.tsx` - Added Image import; MemorySpotlight conditionally shows Image (height: 140, width: 100%, resizeMode: cover) when photo_url exists, gradient placeholder when null
- `app.json` - Added expo-image-picker plugin with photosPermission: "Allow Kinship to access your photos to attach them to memories in your garden."

## Decisions Made
- **Photo heights:** 80px in grid cards (matches existing gradient height) and 140px in MemorySpotlight (featured display deserves prominence). Both use `resizeMode="cover"` to fill without distortion.
- **No separate photo component:** Inline conditional rendering is simple enough for 2 locations. If more surfaces need photos (Phase 2 detail view), a shared MemoryPhoto component could be extracted then.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 (Photo & Media) is complete: all 3 requirements (PHOTO-01, PHOTO-02, PHOTO-03) are satisfied
- Complete photo pipeline: picker with album access -> photo URI persisted on memory -> photos displayed in cards and spotlight -> graceful fallback for memories without photos
- Ready for Phase 2 (Memory Detail Views): the photo_url field and rendering pattern established here will be reused in the memory detail screen

---
*Phase: 01-photo-and-media*
*Completed: 2026-02-27*
