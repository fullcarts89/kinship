# Phase 1: Photo & Media — Research

**Researched:** 2026-02-27
**Domain:** expo-image-picker, React Native Image, module-level mock state, Memory type schema
**Confidence:** HIGH (based on direct code inspection + official Expo docs)

---

## Summary

This phase has two distinct problems that must be solved separately. The first is **photo picker scope** (PHOTO-01): the current `launchImageLibraryAsync` call uses `allowsEditing: true` with a fixed aspect ratio, which iOS presents as a crop-first UI that begins from Recents rather than giving users a browsable album list. Removing `allowsEditing` and setting `presentationStyle` to the full-screen system picker will give users album navigation on iOS. Android does not need changes for album access — the system photo picker already shows albums when browsed.

The second and more fundamental problem is **photo data never reaching the saved memory** (PHOTO-02, PHOTO-03): the `Memory` type has no photo field at all, so `createMemory()` has nowhere to put a URI, and the memory card renderer in the person profile never attempts to display one.

The fix path is straightforward: add `photo_url: string | null` to the `Memory` interface and `MemoryInsert` type, pass `photoUri` through `handleSave` into `createMemory`, store the URI in the module-level `locallyCreatedMemories` array (the mock persistence layer), and update the memory card renderer to show the photo when present. No new libraries are required.

**Primary recommendation:** Add `photo_url` to `Memory`, wire the URI through save, store in mock array, render in cards. All three requirements fall once these three layers are connected.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PHOTO-01 | User can select photos from any album/collection folder in the photo picker (not just recent) | `allowsEditing: true` with a fixed aspect forces an iOS crop-first view. Removing it and adjusting `presentationStyle` exposes full album navigation |
| PHOTO-02 | Photos attached to memories are persisted and display correctly in memory views | `Memory` type has no photo field; URI is captured in state but never passed to `createMemory()`; mock persistence array never receives it |
| PHOTO-03 | Photos display in the memory detail view and memory list/cards on person profiles | Memory card renderer in `app/person/[id].tsx` renders a static 📸 emoji gradient placeholder instead of the actual photo; no `Image` component is used in the card |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-image-picker | ~17.0.10 (installed) | System photo library access | Already installed, official Expo SDK module |
| React Native Image | built-in | Render local URIs returned by picker | Built-in, zero-overhead |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-image-picker `requestMediaLibraryPermissionsAsync` | 17.0.x | Explicit permission request before launch | Needed if no prior permission prompt has been shown; ImagePicker will auto-request on launch but explicit call gives control |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in Image | expo-image (Expo Image) | expo-image has better caching/transitions, but built-in Image is sufficient for static URI display within a session and avoids a new dependency |
| In-memory URI string | AsyncStorage persist | AsyncStorage would survive app restarts; out of scope for this phase (v2 requirement DATA-03 covers backend photo upload) |

**Installation:** No new packages needed. expo-image-picker 17.0.10 is already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are confined to:
```
src/types/database.ts          # Add photo_url to Memory interface
app/memory/add.tsx             # Fix picker options; pass photoUri to createMemory
src/services/memoryService.ts  # Accept photo_url in createMemory row (no Supabase yet — mock mode only)
src/hooks/useMemories.ts       # Pass photo_url through in mock createMemory
app/person/[id].tsx            # Render photo_url in memory cards
```

### Pattern 1: Module-Level Mock Persistence

**What:** `locallyCreatedMemories` at module scope in `useMemories.ts` acts as the in-session write store. Any field added to `MemoryInsert` must also be stored in this array or it is silently lost on the next render cycle.

**When to use:** Always — until Supabase backend is connected, all created data lives here.

**Current state of useMemories.ts:** The file has been significantly simplified. It currently delegates directly to `memoryService.ts`, which throws `"Supabase not configured"` when `supabase` is null. This means `createMemory` currently fails silently (the error is caught in `handleSave` and shows an Alert). There is NO module-level `locallyCreatedMemories` array currently in `useMemories.ts` — the architecture docs reference it, but the actual file does not implement it.

**Critical finding:** This means newly created memories are not persisting at all in the current code, not just photos. The service throws, the hook re-throws, and `handleSave` catches and alerts. The memory never appears anywhere. This must be addressed as part of PHOTO-02 — the mock layer needs to be (re)introduced.

**Pattern to implement:**
```typescript
// src/hooks/useMemories.ts — module-level mock array
const locallyCreatedMemories: Memory[] = [];

export function useCreateMemory() {
  const createMemory = useCallback(
    async (memory: Omit<MemoryInsert, "user_id">): Promise<Memory> => {
      // Try Supabase if configured
      try {
        return await memoryService.createMemory(memory);
      } catch {
        // Mock mode: generate a local record
        const newMemory: Memory = {
          id: `local-${Date.now()}`,
          user_id: "u1",
          person_id: memory.person_id,
          content: memory.content,
          emotion: memory.emotion ?? null,
          photo_url: memory.photo_url ?? null,   // ← photo survives here
          created_at: new Date().toISOString(),
        };
        locallyCreatedMemories.push(newMemory);
        return newMemory;
      }
    },
    []
  );
  return { createMemory, isCreating: false, error: null };
}
```

The `usePersonMemories` and `useMemories` hooks must also merge `locallyCreatedMemories` into returned arrays, filtered by `person_id` as appropriate.

### Pattern 2: ImagePicker for Full Album Access (PHOTO-01)

**What:** Remove `allowsEditing` and `aspect` from `launchImageLibraryAsync` options. On iOS, `allowsEditing: true` wraps the picker in a crop UI that starts directly from Recents — the user never sees album navigation. Without it, the native photo picker opens with its standard "Recents / Albums / Search" tab bar, giving access to every named album.

**Current code (app/memory/add.tsx line 730–735):**
```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  allowsEditing: true,      // ← forces crop UI, bypasses album navigation
  aspect: [4, 3],           // ← only valid with allowsEditing, causes iOS crop
  quality: 0.8,
});
```

**Fixed code:**
```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  allowsEditing: false,     // ← native picker with full album navigation
  quality: 0.8,
});
```

On Android, the native photo picker (API 30+) already presents albums and folders. The `defaultTab` option (`'photos'` or `'albums'`) can control the opening tab if needed, but the default behavior is correct without changes.

### Pattern 3: Wiring photoUri Through handleSave (PHOTO-02)

**What:** `photoUri` state is already captured correctly in the component, but it is never passed to `createMemory`. The `MemoryInsert` type must gain a `photo_url` field, and `handleSave` must include it.

**Current handleSave (app/memory/add.tsx line 756–760):**
```typescript
const created = await createMemory({
  person_id: personId,
  content: memoryContent,
  emotion: selectedEmotion,
  // photoUri is in scope here but never passed
});
```

**Fixed handleSave:**
```typescript
const created = await createMemory({
  person_id: personId,
  content: memoryContent,
  emotion: selectedEmotion,
  photo_url: photoUri,      // ← pass URI into the record
});
```

### Pattern 4: Rendering Photos in Memory Cards (PHOTO-03)

**What:** The memory card renderer in `app/person/[id].tsx` (lines 708–772) renders a 2-column grid. The 80px tall card header is a `LinearGradient` containing a static 📸 emoji — it never reads `memory.photo_url`.

**Fixed card header pattern:**
```typescript
{memory.photo_url ? (
  <Image
    source={{ uri: memory.photo_url }}
    style={{ height: 80, width: "100%" }}
    resizeMode="cover"
  />
) : (
  <LinearGradient
    colors={colorPair}
    style={{ height: 80, alignItems: "center", justifyContent: "center" }}
  >
    <Text style={{ fontSize: 24, opacity: 0.5 }}>📸</Text>
  </LinearGradient>
)}
```

This also satisfies the success criterion "A memory saved without a photo shows no broken image state" — the gradient placeholder renders when `photo_url` is null/undefined.

### Anti-Patterns to Avoid

- **Storing the URI in AsyncStorage**: Out of scope. URI persistence across app restarts is deferred to the backend phase (DATA-03). Module-level Map (same pattern as `usePersonPhoto`) is sufficient for this phase.
- **Using `allowsEditing: true` with `aspect` for cropping**: This is what broke album access. Do not re-introduce it for this feature.
- **Calling `Image` with a potentially undefined URI**: Always guard with `memory.photo_url ? ... : placeholder` to prevent broken image states.
- **Forgetting to filter `locallyCreatedMemories` by `person_id`** in `usePersonMemories`: If the filter is missing, all created memories appear on every person profile.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo library access | Custom native module | expo-image-picker | Already installed, handles permissions, iOS/Android differences, URI normalization |
| Photo display | Canvas rendering, base64 conversion | React Native built-in `Image` | Handles file:// and ph:// URIs returned by ImagePicker without transformation |
| Album navigation | Custom album browser | Native picker (just remove allowsEditing) | iOS and Android both have full album browsers built into the system picker |

**Key insight:** The photo stack is already in place. The only hand-rolling needed is connecting three existing pieces: picker URI → type field → mock array → renderer.

---

## Common Pitfalls

### Pitfall 1: allowsEditing Hides Album Navigation
**What goes wrong:** With `allowsEditing: true`, iOS presents a crop/zoom view immediately after the user taps a photo from Recents. There is no album browser visible. The user sees Recents only, then gets cropped into a fixed aspect ratio.
**Why it happens:** `allowsEditing` is a convenience feature designed for profile photos (square crop). It overrides the standard picker presentation.
**How to avoid:** Remove `allowsEditing` and `aspect` when the goal is general-purpose photo attachment, not cropping.
**Warning signs:** User reports they can only see "recent photos" — classic symptom of `allowsEditing: true`.

### Pitfall 2: Memory Type Has No photo_url Field (Root Cause)
**What goes wrong:** Even if the picker is fixed and the URI is passed correctly, TypeScript will reject `photo_url` in the `MemoryInsert` call because the field does not exist on the type. The URI is silently dropped by the type system.
**Why it happens:** The `Memory` interface in `src/types/database.ts` (lines 37–44) has only `id`, `user_id`, `person_id`, `content`, `emotion`, `created_at`. No photo field exists. Mock data in `src/data/mock.ts` also has no photo field on memory records.
**How to avoid:** Add `photo_url: string | null` to `Memory`, `MemoryInsert`, and `MemoryUpdate` types before touching any other file. TypeScript errors will then guide all remaining wiring.
**Warning signs:** No TypeScript error when passing `photo_url` to `createMemory` — means the field was not added correctly (it would be accepted as an extra property and silently dropped).

### Pitfall 3: createMemory Throws in Mock Mode — No Memories Persist At All
**What goes wrong:** In the current codebase, `memoryService.createMemory` throws `"Supabase not configured"` when Supabase is not connected. `useCreateMemory` re-throws. `handleSave` catches and shows an Alert. No memory is saved, photo or otherwise.
**Why it happens:** The module-level `locallyCreatedMemories` array documented in MEMORY.md was either removed or never implemented in the current `useMemories.ts`. The file delegates directly to the service with no mock fallback.
**How to avoid:** Implement the mock fallback catch in `useCreateMemory` as documented in Pattern 1. Verify the fallback works by creating a memory and immediately checking it appears in `usePersonMemories`.
**Warning signs:** After tapping "Save to garden", the app shows an Alert error rather than the S2 success screen. Or the success screen shows but the memory never appears on the person profile.

### Pitfall 4: Memory Cards Have No Image Component — Photo Field Alone Is Not Enough
**What goes wrong:** Even after adding `photo_url` to the type and persisting it correctly, photos will not display because the memory card JSX has no `Image` component. It renders a `LinearGradient` with a static emoji regardless of whether a photo exists.
**Why it happens:** The memory card renderer (lines 731–741 in `app/person/[id].tsx`) was built before photo support was planned. There is no conditional photo path.
**How to avoid:** The renderer must be updated as part of this phase. Check success criterion 4 ("No broken image placeholders") and criterion 5 ("No photo shows no broken state") — both require conditional rendering.
**Warning signs:** After fixing type, save, and mock array — saved memory still shows the emoji gradient with no photo.

### Pitfall 5: Home Screen MemorySpotlight Also Has No Photo Rendering
**What goes wrong:** The `MemorySpotlight` component in `app/(tabs)/index.tsx` (lines 289–400) renders a featured memory. It displays `memory.content` and `memory.emotion` but has no photo display. This will need updating too for full PHOTO-03 compliance.
**Why it happens:** Same as Pitfall 4 — spotlight was built without photo support.
**How to avoid:** After fixing the person profile cards, audit the spotlight component as well. The success criteria say "everywhere that memory appears" — the spotlight counts.
**Warning signs:** Memory shows correct content and emotion on person profile cards, but the spotlight on the home screen shows no photo.

### Pitfall 6: app.json Missing expo-image-picker Plugin Entry
**What goes wrong:** On a dev client or production build, the app may not request photo library permissions correctly if the `expo-image-picker` plugin is not in `app.json`. The picker silently fails or requests minimal permission.
**Why it happens:** `app.json` currently has `expo-contacts` and `expo-calendar` plugin entries with custom permission strings, but no `expo-image-picker` entry. The plugin adds the `NSPhotoLibraryUsageDescription` Info.plist key on iOS and the appropriate permission on Android.
**How to avoid:** Add the `expo-image-picker` plugin to `app.json` with a Kinship-appropriate description string. This is required for any build outside Expo Go (Expo Go bundles the permission by default).
**Warning signs:** Picker works in Expo Go but fails on a TestFlight or production build with a "permission not found" crash.

---

## Code Examples

Verified patterns from direct code inspection and official Expo documentation:

### Full Album Access — Minimal Picker Config
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/imagepicker/
// Use in app/memory/add.tsx pickImage()
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  allowsEditing: false,   // Critical: false gives full album navigation
  quality: 0.8,
});

if (!result.canceled && result.assets[0]) {
  setPhotoUri(result.assets[0].uri);
}
```

### Memory Type Addition
```typescript
// Source: src/types/database.ts
export interface Memory {
  id: string;
  user_id: string;
  person_id: string;
  content: string;
  emotion: Emotion | null;
  photo_url: string | null;   // ← add this
  created_at: string;
}
```

### Mock Fallback in useCreateMemory
```typescript
// Source: src/hooks/useMemories.ts (pattern from usePersonPhoto.ts)
const locallyCreatedMemories: Memory[] = [];  // module-level

const createMemory = useCallback(
  async (memory: Omit<MemoryInsert, "user_id">): Promise<Memory> => {
    try {
      return await memoryService.createMemory(memory);
    } catch {
      // Mock mode — no Supabase
      const newMemory: Memory = {
        id: `m-local-${Date.now()}`,
        user_id: "u1",
        person_id: memory.person_id,
        content: memory.content,
        emotion: memory.emotion ?? null,
        photo_url: memory.photo_url ?? null,
        created_at: new Date().toISOString(),
      };
      locallyCreatedMemories.push(newMemory);
      return newMemory;
    }
  },
  []
);
```

### Memory Card Photo Rendering
```typescript
// Source: app/person/[id].tsx (lines 731–741, to be replaced)
{memory.photo_url ? (
  <Image
    source={{ uri: memory.photo_url }}
    style={{ height: 80, width: "100%", borderRadius: 0 }}
    resizeMode="cover"
  />
) : (
  <LinearGradient
    colors={colorPair}
    style={{ height: 80, alignItems: "center", justifyContent: "center" }}
  >
    <Text style={{ fontSize: 24, opacity: 0.5 }}>📸</Text>
  </LinearGradient>
)}
```

### app.json Plugin Entry
```json
// Add to app.json "plugins" array
[
  "expo-image-picker",
  {
    "photosPermission": "Allow Kinship to access your photos to attach them to memories."
  }
]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mediaTypes: MediaTypeOptions.Images` (enum) | `mediaTypes: ["images"]` (string array) | expo-image-picker 15+ | The enum is deprecated; string arrays are the current API. The current code already uses the new form correctly. |
| `allowsEditing + aspect` for any photo selection | `allowsEditing: false` for non-crop use cases | Always best practice | allowsEditing is designed for profile photo crops, not general attachment. |

**Deprecated/outdated:**
- `MediaTypeOptions.Images` enum: Replaced by `["images"]` string array. Current code correctly uses the new form.

---

## Open Questions

1. **Should the home screen MemorySpotlight display photos?**
   - What we know: PHOTO-03 says "display in memory list/cards on person profiles". The spotlight is on the home screen.
   - What's unclear: Whether "everywhere that memory appears" includes the home screen spotlight.
   - Recommendation: Include it. The success criterion says "everywhere that memory appears" in the phase description. Leaving the spotlight without photo support creates an inconsistency. Address in the same task as person profile cards.

2. **Should the Add Memory screen preview show the photo full-size or thumbnail-only?**
   - What we know: The current Add Memory screen already shows a thumbnail row (lines 384–420 in `app/memory/add.tsx`) with an `Image` component. This is working correctly.
   - What's unclear: Whether the S2 (Saved confirmation) screen should also show the photo.
   - Recommendation: Leave S2 as-is (illustration + text). It's a celebration screen, not a detail view. The photo is already previewed in S1.

3. **Does the current mock mode actually fail to save any memories, or just photos?**
   - What we know: `memoryService.createMemory` throws when `supabase` is null. `useCreateMemory` re-throws. `handleSave` catches and alerts "Failed to save memory."
   - What's unclear: Whether any mock persistence was intentionally removed or was always missing from this branch.
   - Recommendation: Treat the mock fallback as part of this phase. PHOTO-02 and PHOTO-03 cannot be verified without first confirming memories persist at all. Fix mock fallback as task 1 in the plan.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `app/memory/add.tsx` — ImagePicker configuration, handleSave, photoUri state
- Direct code inspection: `src/types/database.ts` — Memory type, confirmed no photo_url field
- Direct code inspection: `src/hooks/useMemories.ts` — Confirmed no locallyCreatedMemories array, service-only with no mock fallback
- Direct code inspection: `app/person/[id].tsx` lines 700–772 — Memory card renderer, confirmed no Image component, static emoji gradient
- Direct code inspection: `app/(tabs)/index.tsx` MemorySpotlight — confirmed no photo rendering
- Direct code inspection: `app.json` — Confirmed expo-image-picker plugin is absent
- [Expo ImagePicker Docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/) — launchImageLibraryAsync options, allowsEditing behavior, defaultTab option

### Secondary (MEDIUM confidence)
- [Expo issue #27117](https://github.com/expo/expo/issues/27117) — Android photo picker limitation + legacy option fix (verified against docs)

### Tertiary (LOW confidence)
- [Expo issue #35623](https://github.com/expo/expo/issues/35623) — iOS limited photo library access behavior (relevant context, not directly impacting this phase)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — expo-image-picker already installed, version confirmed, docs verified
- Architecture: HIGH — all findings from direct code inspection of actual files
- Pitfalls: HIGH — all pitfalls verified by reading the actual code, not inferred

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days — stable SDK, no fast-moving dependencies)
