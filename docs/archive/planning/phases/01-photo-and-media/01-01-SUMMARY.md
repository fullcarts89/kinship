---
phase: 01-photo-and-media
plan: 01
subsystem: database, ui
tags: [expo-image-picker, typescript, mock-data, memory]

# Dependency graph
requires: []
provides:
  - "Memory type with photo_url: string | null field"
  - "Module-level mock persistence for memories (locallyCreatedMemories)"
  - "Photo picker with full album browsing (allowsEditing: false)"
  - "photo_url wired from picker through handleSave to createMemory"
affects: [01-photo-and-media, 02-memory-detail-views]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level mock persistence array with unshift for newest-first ordering"
    - "MemoryInsert uses Omit + intersection for optional photo_url (backward-compatible)"

key-files:
  created: []
  modified:
    - "src/types/database.ts"
    - "src/data/mock.ts"
    - "src/hooks/useMemories.ts"
    - "app/memory/add.tsx"

key-decisions:
  - "MemoryInsert omits photo_url from base and re-adds as optional — callers that do not pass photo_url remain valid"
  - "memoryService.ts unchanged — it already spreads the input object so photo_url passes through automatically"

patterns-established:
  - "Module-level locallyCreatedMemories array in useMemories.ts follows same pattern as usePersons.ts and useInteractions.ts"

requirements-completed: [PHOTO-01, PHOTO-02]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 1 Plan 01: Data Layer — Photo URL, Mock Persistence, Picker Fix Summary

**Added photo_url field to Memory type, implemented module-level mock persistence for memories, and fixed iOS photo picker to show full album navigation instead of crop-first UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T22:39:35Z
- **Completed:** 2026-02-27T22:42:05Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Memory interface now includes `photo_url: string | null`, with MemoryInsert making it optional for backward compatibility
- useMemories.ts has full mock fallback: `locallyCreatedMemories` module-level array with merge into `useMemories`, `usePersonMemories`, and `useCreateMemory`
- Photo picker uses `allowsEditing: false` (removed `aspect` property) so iOS shows standard picker with Recents/Albums/Search tabs
- `handleSave` in `app/memory/add.tsx` passes `photo_url: photoUri ?? null` through to `createMemory`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add photo_url to Memory type and update mock data** - `6b8a055` (feat)
2. **Task 2: Add module-level mock persistence to useMemories.ts** - `48efaa2` (feat)
3. **Task 3: Fix photo picker album access and wire photo_url through handleSave** - `a500e9f` (feat)

## Files Created/Modified
- `src/types/database.ts` - Added `photo_url: string | null` to Memory interface; updated MemoryInsert to make photo_url optional
- `src/data/mock.ts` - Added `photo_url: null` to all 5 existing mock memory entries
- `src/hooks/useMemories.ts` - Added module-level `locallyCreatedMemories` array; all three hooks now merge mock data on Supabase failure; `useCreateMemory` silently falls back to local persistence
- `app/memory/add.tsx` - Changed `allowsEditing` to false, removed `aspect` property, added `photo_url: photoUri ?? null` to createMemory call

## Decisions Made
- **MemoryInsert pattern:** Used `Omit<Memory, "id" | "created_at" | "photo_url"> & { photo_url?: string | null }` rather than making photo_url optional on the Memory interface itself. This keeps the row type strict (photo_url is always present on a complete Memory) while the insert type is lenient.
- **memoryService.ts unchanged:** The service already uses `{ ...memory, user_id: userId }` spread, so photo_url flows through without any code change needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer is complete: Memory type has photo_url, mock persistence works, photo picker gives album access, and photo_url flows through save
- Ready for Plan 02 (display layer): rendering photos in memory cards and MemorySpotlight, registering expo-image-picker plugin in app.json

---
*Phase: 01-photo-and-media*
*Completed: 2026-02-27*
