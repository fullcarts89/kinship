---
phase: 01
status: human_needed
verified: 2026-02-27
---

# Phase 1 Verification: Photo & Media

## Goal
Users can select photos from any album or collection folder, and any photo attached to a memory persists and displays correctly everywhere that memory appears.

## Must-Haves Check

| # | Must-Have | Status | Evidence |
|---|----------|--------|----------|
| 1 | `Memory` interface has `photo_url: string \| null` field | ✓ | `src/types/database.ts:43` — `photo_url: string \| null` on `Memory` interface |
| 2 | `MemoryInsert` makes `photo_url` optional (backward-compatible) | ✓ | `src/types/database.ts:79` — `Omit<Memory, "id" \| "created_at" \| "photo_url"> & { photo_url?: string \| null }` |
| 3 | Module-level `locallyCreatedMemories` array exists in `useMemories.ts` | ✓ | `src/hooks/useMemories.ts:15` — `const locallyCreatedMemories: Memory[] = [];` |
| 4 | `useMemories` and `usePersonMemories` merge locally created memories on Supabase failure | ✓ | `src/hooks/useMemories.ts:32` and `:62` — both catch blocks spread `[...locallyCreatedMemories, ...mockMemories]` |
| 5 | `useCreateMemory` persists `photo_url` on the mock memory object | ✓ | `src/hooks/useMemories.ts:100` — `photo_url: memory.photo_url ?? null` in mock fallback object |
| 6 | `useCreateMemory` pushes new memory to `locallyCreatedMemories` with `unshift` | ✓ | `src/hooks/useMemories.ts:103` — `locallyCreatedMemories.unshift(newMemory)` |
| 7 | Photo picker uses `allowsEditing: false` (no forced crop UI) | ✓ | `app/memory/add.tsx:732` — `allowsEditing: false` with no `aspect` property |
| 8 | `handleSave` passes `photo_url: photoUri ?? null` to `createMemory` | ✓ | `app/memory/add.tsx:759` — `photo_url: photoUri ?? null` in the `createMemory` call |
| 9 | Person profile memory cards conditionally render `Image` when `photo_url` is present | ✓ | `app/person/[id].tsx:732–737` — `{memory.photo_url ? <Image source={{ uri: memory.photo_url }} style={{ height: 80, width: "100%" }} resizeMode="cover" /> : <LinearGradient ...>}` |
| 10 | `MemorySpotlight` on home screen conditionally renders `Image` when `photo_url` is present | ✓ | `app/(tabs)/index.tsx:341–346` — `{memory.photo_url ? <Image source={{ uri: memory.photo_url }} style={{ height: 140, width: "100%" }} resizeMode="cover" /> : <LinearGradient ...>}` |
| 11 | `expo-image-picker` plugin registered in `app.json` with `photosPermission` string | ✓ | `app.json:45–49` — plugin entry with `"photosPermission": "Allow Kinship to access your photos to attach them to memories in your garden."` |

## Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| PHOTO-01: User can select photos from any album/collection folder | ✓ | `app/memory/add.tsx:730–733` — `launchImageLibraryAsync` called with `allowsEditing: false` and no `aspect` property. Removing `allowsEditing: true` restores the standard iOS picker (Recents / Albums / Search tabs) rather than jumping directly to the crop UI. |
| PHOTO-02: Photos attached to memories are persisted and display correctly | ✓ | `photo_url` field present on `Memory` type (`src/types/database.ts:43`); wired through `handleSave` (`app/memory/add.tsx:759`); stored on mock object in `useCreateMemory` (`src/hooks/useMemories.ts:100`); locally created memories merged into all fetch hooks so photos survive navigation. |
| PHOTO-03: Photos display in memory cards in person profile and memory views | ✓ | Conditional `Image` rendering confirmed in person profile cards (`app/person/[id].tsx:732`) and in `MemorySpotlight` on home screen (`app/(tabs)/index.tsx:341`). Both fall back gracefully to `LinearGradient` placeholder when `photo_url` is null. |

## Human Verification Items

The following items cannot be confirmed from static code analysis and require manual testing on a device or simulator:

1. **iOS album picker UI** — Confirm that with `allowsEditing: false` the picker opens to the standard "Recents / Albums / Search" navigation rather than the direct crop screen. Run on iOS simulator or device, tap the photo attachment button in `app/memory/add.tsx`, and verify all album folders are browsable.
2. **Photo persists after navigation** — Add a memory with a photo, navigate away from the person profile, then return. Verify the photo still appears in the memory card (tests that `locallyCreatedMemories` module-level array survives re-render without a page reload).
3. **MemorySpotlight photo display** — Verify a memory with a photo eventually surfaces in the home screen MemorySpotlight and that the 140px photo renders without distortion.
4. **Null fallback** — Confirm that existing mock memories (all have `photo_url: null`) continue to show the gradient placeholder rather than a broken image.
5. **Production build permissions** — Verify that the `expo-image-picker` plugin in `app.json` correctly surfaces the custom permission string on a fresh iOS/Android install (requires an EAS build or bare `npx expo run`).

## Gaps

None — all must-haves verified in code. Status set to `human_needed` because photo display, album navigation, and mock persistence across navigation can only be fully confirmed through manual device testing.
