# Phase 2: Memory Detail Views — Research

**Researched:** 2026-02-27
**Domain:** Expo Router dynamic routes, React Native modal navigation, memory data access patterns
**Confidence:** HIGH (all findings from direct code inspection of the actual codebase)

---

## Summary

Phase 1 completed the data layer (photo_url on Memory, mock persistence) and the card display layer (conditional Image in person profile cards and MemorySpotlight). Phase 2 builds one level higher: making every memory card interactive and presenting a full-detail view. The core work is simple and confined to three concerns.

First, memory cards in `app/person/[id].tsx` are currently wrapped in `View` — they have no `onPress` handler at all. The fix is to swap the outer `View` for a `Pressable` and navigate to a new detail route. Second, the MemorySpotlight in `app/(tabs)/index.tsx` already has a `Pressable` but it navigates to the person's profile (`/person/${person.id}`) rather than the memory detail — this navigation target needs to change. Third, the detail screen itself does not exist yet and must be created as `app/memory/[id].tsx`.

The `memory` folder already has a Stack layout (`app/memory/_layout.tsx`) with `presentation: "modal"` as the default. The new `[id].tsx` screen inside that folder will automatically inherit modal presentation, giving the correct app-feel (slides up from bottom, swipe-down to dismiss). No new libraries are required. The only data-access question is how to look up a memory by ID from the detail screen — the current hook layer has no `useMemory(id)` hook, so one must be added.

**Primary recommendation:** Create `app/memory/[id].tsx` as a modal screen; swap memory card `View` to `Pressable` navigating to `/memory/${memory.id}`; add a `useMemory(id)` hook that searches `locallyCreatedMemories + mockMemories`; update MemorySpotlight to navigate to the memory detail instead of the person profile.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MEM-01 | User can tap a memory card to view its full detail (content, emotion, photos, date) | Memory cards use `View` — no `onPress` exists. Swap to `Pressable` + router.push. Detail screen must be created. |
| MEM-02 | Memory detail view displays all attached photos | `Memory.photo_url` exists (Phase 1). Detail screen needs same conditional Image / LinearGradient pattern used in cards and spotlight. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Expo Router (file-based) | ~4.x (installed) | Dynamic route `app/memory/[id].tsx` | Already the project's routing system — creating the file is enough |
| React Native `Pressable` | built-in | Tap target on memory cards | Already used throughout the codebase for all tappable elements |
| React Native `Image` | built-in | Photo display in detail view | Established pattern from Phase 1 — no new library needed |
| expo-linear-gradient | installed | No-photo placeholder header | Already used in card and spotlight; same pattern in detail view |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useSafeAreaInsets` from react-native-safe-area-context | installed | Status bar safe padding in detail view | All full-screen screens in this app use it for correct top padding |
| `router.canGoBack()` | Expo Router | Safe back navigation | Project-wide pattern — always check before `router.back()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Full-screen modal route (`/memory/[id]`) | Bottom sheet / `Modal` component | Modal component requires managing open/close state in parent; route-based modal is simpler, supports deep linking, and matches Expo Router conventions already used in this project (`app/reach-out/[id].tsx` uses the same pattern) |
| New `useMemory(id)` hook | Passing full memory object via route params | Route params in Expo Router are strings only — passing a serialized memory object is brittle. A hook lookup by ID is the clean pattern. |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

No new folders needed. One new file:
```
app/memory/
├── _layout.tsx          # EXISTING — Stack with presentation: "modal" (already correct)
├── add.tsx              # EXISTING — memory creation
└── [id].tsx             # NEW — memory detail view
```

One hook addition:
```
src/hooks/useMemories.ts    # ADD useMemory(id) hook
src/hooks/index.ts          # RE-EXPORT useMemory
```

One formatter addition (optional but clean):
```
src/lib/formatters.ts       # ADD emotionEmojis export (currently duplicated in index.tsx)
```

### Pattern 1: Dynamic Route File in Existing Stack

**What:** Create `app/memory/[id].tsx`. Expo Router automatically registers this as a child route of the `memory` Stack defined in `app/memory/_layout.tsx`. The `_layout.tsx` already sets `presentation: "modal"` as the default for the entire Stack — the detail screen inherits this without any explicit `Stack.Screen` registration.

**When to use:** Any new screen inside an existing folder that should inherit the folder's layout options.

**Example navigation from memory card:**
```typescript
// Source: app/person/[id].tsx — MemoriesTab component
// Swap outer View → Pressable
<Pressable
  key={memory.id}
  onPress={() => router.push(`/memory/${memory.id}`)}
  style={{
    flex: 1,
    backgroundColor: white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: borderColor,
    overflow: "hidden",
  }}
>
  {/* ...existing card content unchanged... */}
</Pressable>
```

### Pattern 2: Memory Lookup by ID in Mock Mode

**What:** The detail screen receives a memory ID from the route. It needs to look up the full Memory object. No `useMemory(id)` hook exists today — only `usePersonMemories(personId)` and `useMemories()`. The hook must be added to `src/hooks/useMemories.ts`.

**Key insight:** The mock data source is `[...locallyCreatedMemories, ...mockMemories]`. Since `locallyCreatedMemories` is module-level in `useMemories.ts`, a `useMemory(id)` hook in the same file has direct access to it without any inter-file coupling.

**Pattern to implement:**
```typescript
// Source: src/hooks/useMemories.ts — add after existing hooks
export function useMemory(id: string) {
  const [memory, setMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      // Future: const data = await memoryService.getMemoryById(id);
      // For now, search mock sources
      throw new Error("not implemented");
    } catch {
      // Mock mode — search locally created + mock data
      const found = [...locallyCreatedMemories, ...mockMemories].find(
        (m) => m.id === id
      ) ?? null;
      setMemory(found);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { memory, isLoading };
}
```

### Pattern 3: Detail Screen Layout

**What:** The detail screen needs a consistent structure: a large photo header (or gradient fallback), emotion chip + date, full content text, and a back button. This matches the tone of the existing app — calm, unhurried, card-style layouts.

**Exact layout structure:**
```typescript
// app/memory/[id].tsx — structure outline
export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { memory, isLoading } = useMemory(id);

  if (isLoading) return <LoadingState />;
  if (!memory) {
    // Memory not found — navigate back
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/people");
    return null;
  }

  return (
    <ScrollView ...>
      {/* Photo header or gradient */}
      {memory.photo_url ? (
        <Image source={{ uri: memory.photo_url }} style={{ height: 220 }} resizeMode="cover" />
      ) : (
        <LinearGradient colors={gradientPair} style={{ height: 220 }} />
      )}

      {/* Content area */}
      <View style={{ padding: 24 }}>
        {/* Emotion chip (if present) */}
        {memory.emotion && (
          <View ...>
            <Text>{emotionEmojis[memory.emotion]}</Text>
            <Text>{formatEmotionLabel(memory.emotion)}</Text>
          </View>
        )}

        {/* Date */}
        <Text>{formatRelativeDate(memory.created_at)}</Text>

        {/* Full content — no numberOfLines truncation */}
        <Text>{memory.content}</Text>
      </View>
    </ScrollView>
  );
}
```

### Pattern 4: MemorySpotlight Navigation Update

**What:** The home screen `MemorySpotlight` currently navigates to `/person/${person.id}` on press. It should navigate to `/memory/${memory.id}` instead, so tapping a spotlight memory opens the memory detail directly.

**Current code (app/(tabs)/index.tsx, line 325):**
```typescript
onPress={() => router.push(`/person/${person.id}`)}
```

**Updated code:**
```typescript
onPress={() => router.push(`/memory/${memory.id}`)}
```

**Note:** The `person` prop should still be passed to the detail screen as context (shown as "a memory with [name]") — the memory object has `person_id` which the detail screen can use to look up the person's name.

### Pattern 5: Emotion Emoji Map — Move to formatters.ts

**What:** The `emotionEmojis` map is currently defined inline in `app/(tabs)/index.tsx` (line 104–115). The memory detail view also needs this map. Rather than duplicating it, export it from `src/lib/formatters.ts` so both screens import it from the same source.

**Move to formatters.ts:**
```typescript
// src/lib/formatters.ts — add after emotionList
export const emotionEmojis: Record<string, string> = {
  grateful: "🙏",
  connected: "💫",
  curious: "🔮",
  joyful: "😊",
  nostalgic: "🌅",
  proud: "⭐",
  peaceful: "🌸",
  inspired: "✨",
  hopeful: "🌱",
  loved: "💛",
};
```

Then update `app/(tabs)/index.tsx` to import from formatters instead of defining locally.

### Anti-Patterns to Avoid

- **Passing the full Memory object as a route param:** Expo Router route params are URL segments — they're strings. Serializing a Memory object into a query string is brittle and breaks with special characters in content. Always navigate by ID and look up the object in the screen.
- **Using `router.back()` without `canGoBack()` check:** This crashes in edge cases (e.g. user deep-links directly to detail screen). Always use the `canGoBack()` check + fallback pattern established throughout the project.
- **Modal without back button:** The `memory/_layout.tsx` uses `presentation: "modal"` which provides a swipe-to-dismiss gesture on iOS, but should also include an explicit close button for Android and for users who don't know the swipe gesture.
- **`numberOfLines` on content text:** This causes truncation. The entire reason for the detail view is to show full content — never use `numberOfLines` on the content field in the detail screen.
- **Forgetting to export `useMemory` from `src/hooks/index.ts`:** All hooks in this project are barrel-exported from `index.ts`. Not adding the export there means the detail screen must use a direct import path, which is inconsistent with the rest of the codebase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Presenting detail screen | Custom `Modal` component with open/close state | File-based route in `app/memory/[id].tsx` | Routes handle all navigation state, back gesture, deep linking, and stack management automatically. The `_layout.tsx` already sets modal presentation. |
| Back navigation | Custom back-button implementation | `router.canGoBack()` + `router.back()` | Already the project-wide pattern. Consistent with all other screens. |
| Emotion display formatting | Custom emoji lookup | `emotionEmojis` map in `formatters.ts` (after moving) | Centralizes the map; eliminates duplication across home, detail, and any future memory surfaces. |

**Key insight:** The Expo Router file-based convention means the routing infrastructure is already set up — creating the file in the right directory is all that's needed for it to work as a modal.

---

## Common Pitfalls

### Pitfall 1: Memory Card Outer Container Is a View, Not Pressable
**What goes wrong:** The memory card in `app/person/[id].tsx` line 721 is a `View`. Adding `onPress` to a `View` does nothing — React Native ignores `onPress` on `View` components.
**Why it happens:** Cards were built as display-only elements with no interaction planned.
**How to avoid:** Replace the outer `View` wrapper with `Pressable`. The `overflow: "hidden"` and all other styles carry over identically — `Pressable` accepts the same style props.
**Warning signs:** Tapping the card does nothing. No error is thrown. Easy to miss in testing if you don't try tapping.

### Pitfall 2: No useMemory(id) Hook Exists
**What goes wrong:** The detail screen can't look up a memory by ID. There is no `getMemoryById` in `memoryService.ts`, no `useMemory` hook, and the Supabase client would throw anyway in mock mode.
**Why it happens:** The hook layer only supports listing (all memories, per-person memories) — single-record lookup was never needed until now.
**How to avoid:** Implement `useMemory(id)` in `useMemories.ts` that searches `[...locallyCreatedMemories, ...mockMemories]`. This is a simple `.find()` — no new data source needed.
**Warning signs:** TypeScript error trying to import `useMemory`, or undefined memory in the detail screen.

### Pitfall 3: Stack.Screen Registration Not Needed for [id].tsx
**What goes wrong:** Developer assumes that because `app/_layout.tsx` has explicit `<Stack.Screen name="memory" />`, the new `[id].tsx` needs a corresponding entry in `_layout.tsx` or `memory/_layout.tsx`.
**What's actually true:** The `memory/_layout.tsx` is a Stack — its `screenOptions` apply to all child screens automatically via the wildcard pattern. Expo Router's file-based routing registers `[id].tsx` without any explicit Screen declaration. Adding an unnecessary `Stack.Screen` entry can cause conflicts.
**How to avoid:** Just create the file. Trust the convention.
**Warning signs:** Explicitly adding `<Stack.Screen name="[id]" />` and then seeing duplicate navigation entries or unexpected header behavior.

### Pitfall 4: emotionEmojis Defined in Two Places
**What goes wrong:** The detail screen defines its own `emotionEmojis` map inline, which then diverges from the one in `index.tsx` when someone updates one but not the other.
**Why it happens:** The map is currently file-local in `index.tsx` and not exported.
**How to avoid:** As part of this phase, move `emotionEmojis` to `src/lib/formatters.ts` and export it. Update `index.tsx` to import from formatters. The detail screen then imports from the same source.
**Warning signs:** Two copies of the emoji map in the codebase with different entries for the same emotion key.

### Pitfall 5: MemorySpotlight Still Navigates to Person Profile
**What goes wrong:** After implementing the detail screen and wiring cards, tapping the MemorySpotlight on the home screen still navigates to `/person/${person.id}` instead of `/memory/${memory.id}`. The success criteria says "tapping any memory card" — the spotlight is a memory surface.
**Why it happens:** The spotlight's `onPress` predates the detail view and the navigation target was `/person/${person.id}` as a reasonable interim behavior.
**How to avoid:** Update the spotlight's `onPress` as part of this phase. One-line change.
**Warning signs:** After completing all other tasks, the home screen spotlight tap still goes to the person profile instead of the memory detail.

### Pitfall 6: Modal Back Navigation — Android and canGoBack Edge Cases
**What goes wrong:** On iOS, `presentation: "modal"` gives a swipe-down-to-dismiss gesture. On Android, this gesture is not available. Users can tap the Android system back button, which calls `router.back()` automatically. But the explicit close button in the detail screen must also call `router.canGoBack() ? router.back() : router.replace("/(tabs)/people")`.
**Why it happens:** The project-wide pattern from MEMORY.md requires this check. Modal screens don't always have a stack history behind them (e.g., deep link scenario).
**How to avoid:** Follow the `canGoBack()` pattern. For the detail view, the fallback should be `router.replace("/(tabs)/people")` — the most reasonable destination if no history exists.
**Warning signs:** "Error: Cannot go back" crash in edge cases.

---

## Code Examples

Verified patterns from direct code inspection:

### Swapping Memory Card View → Pressable
```typescript
// app/person/[id].tsx — MemoriesTab, inside row.map()
// Before (line 721): <View key={memory.id} style={{ ... }}>
// After:
<Pressable
  key={memory.id}
  onPress={() => router.push(`/memory/${memory.id}`)}
  style={{
    flex: 1,
    backgroundColor: white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: borderColor,
    overflow: "hidden",
  }}
>
  {/* All existing inner content unchanged */}
</Pressable>
```

### useMemory Hook
```typescript
// src/hooks/useMemories.ts — add at end of file
export function useMemory(id: string) {
  const [memory, setMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      // Future Supabase path here
      throw new Error("mock mode");
    } catch {
      const found =
        [...locallyCreatedMemories, ...mockMemories].find((m) => m.id === id) ??
        null;
      setMemory(found);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { memory, isLoading };
}
```

### Memory Detail Screen — Core Structure
```typescript
// app/memory/[id].tsx
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemory } from "@/hooks";
import { emotionEmojis, formatEmotionLabel, formatRelativeDate } from "@/lib/formatters";

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { memory, isLoading } = useMemory(id ?? "");

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/people");
    }
  };

  if (isLoading) { /* skeleton */ }
  if (!memory) {
    handleBack();
    return null;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: cream }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      {/* Photo header (220px) or gradient fallback */}
      {memory.photo_url ? (
        <Image
          source={{ uri: memory.photo_url }}
          style={{ height: 220, width: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[sagePale, sageLight + "88"]}
          style={{ height: 220 }}
        />
      )}

      <View style={{ padding: 24 }}>
        {/* Emotion chip */}
        {memory.emotion && (
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 6 }}>
            <Text style={{ fontSize: 18 }}>{emotionEmojis[memory.emotion]}</Text>
            <Text style={{ fontFamily: fonts.sansMedium, color: warmGray }}>
              {formatEmotionLabel(memory.emotion)}
            </Text>
          </View>
        )}

        {/* Date */}
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: warmGray, marginBottom: 16 }}>
          {formatRelativeDate(memory.created_at)}
        </Text>

        {/* Full content — NO numberOfLines */}
        <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: nearBlack, lineHeight: 24 }}>
          {memory.content}
        </Text>
      </View>
    </ScrollView>
  );
}
```

### emotionEmojis Export Addition to formatters.ts
```typescript
// src/lib/formatters.ts — add after emotionList
// (Exact same values as currently in app/(tabs)/index.tsx)
export const emotionEmojis: Record<string, string> = {
  grateful: "\uD83D\uDE4F",
  connected: "\uD83D\uDCAB",
  curious: "\uD83D\uDD2E",
  joyful: "\uD83D\uDE0A",
  nostalgic: "\uD83C\uDF05",
  proud: "\u2B50",
  peaceful: "\uD83C\uDF38",
  inspired: "\u2728",
  hopeful: "\uD83C\uDF31",
  loved: "\uD83D\uDC9B",
};
```

### MemorySpotlight Navigation Fix
```typescript
// app/(tabs)/index.tsx — line 325
// Before:
onPress={() => router.push(`/person/${person.id}`)}
// After:
onPress={() => router.push(`/memory/${memory.id}`)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Navigation `navigate` with object params | Expo Router `router.push("/path/id")` | Expo Router v1+ | Route params are URL path segments or query strings — not arbitrary objects |
| `Modal` component for overlays | `presentation: "modal"` in Stack screen options | Expo Router conventions | File-based modal routes eliminate all open/close state management from parent components |

**Deprecated/outdated:**
- Passing complex objects as navigation params: In Expo Router, params are serialized as URL query strings. All complex data lookups should happen in the destination screen using the ID.

---

## Open Questions

1. **Should the detail view show the person's name as context?**
   - What we know: `memory.person_id` is available. `usePerson(id)` hook exists. The MemorySpotlight already shows person name in the card footer.
   - What's unclear: Whether the detail view needs to show which person the memory is about — useful if reached from the home screen spotlight where context switches.
   - Recommendation: Yes — show person name as a subtle subheader or footer. The detail screen has `memory.person_id` and can call `usePerson(memory.person_id)` to get the name. Keeps the context clear regardless of entry point.

2. **Does the detail view need a "Back to [Person Name]" back button, or a generic close button?**
   - What we know: The `memory/_layout.tsx` already provides a default header with a back button via `headerShown: true`.  The default title will be empty unless set.
   - What's unclear: Whether a custom header (no default header, custom back arrow) matches the app's design style better.
   - Recommendation: Use a custom header matching the style of `app/person/[id].tsx` — same `ChevronLeft` back button, custom title, no system header. Set `Stack.Screen options={{ headerShown: false }}` in the detail screen and render the back button manually. This is consistent with how other modal screens in this project handle headers.

3. **Should the detail view be reachable from the home screen MemorySpotlight?**
   - What we know: The success criteria says "tapping any memory card" — the MemorySpotlight is a memory surface. The plan already includes updating the spotlight `onPress`.
   - What's unclear: Nothing — this is confirmed in scope.
   - Recommendation: Update `MemorySpotlight` `onPress` to navigate to `/memory/${memory.id}` as part of the wiring task.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `app/person/[id].tsx` lines 700–781 — MemoriesTab component, confirmed outer container is `View` with no `onPress`
- Direct code inspection: `app/memory/_layout.tsx` — Confirmed `presentation: "modal"` default, `headerShown: true`
- Direct code inspection: `src/hooks/useMemories.ts` — Confirmed no `useMemory(id)` single-record hook exists; `locallyCreatedMemories` module-level array is accessible to new hook
- Direct code inspection: `src/types/database.ts` — Confirmed `Memory.photo_url: string | null` is present (Phase 1 complete)
- Direct code inspection: `app/(tabs)/index.tsx` lines 104–115 and 324–325 — `emotionEmojis` defined locally; MemorySpotlight navigates to person profile
- Direct code inspection: `src/lib/formatters.ts` — Confirmed `emotionEmojis` is NOT in formatters.ts; `formatEmotionLabel`, `emotionList`, `formatRelativeDate` are already exported
- Direct code inspection: `app/_layout.tsx` — Confirmed `memory` Stack is registered with `headerShown: false` at the Stack level; child screens can override

### Secondary (MEDIUM confidence)
- Expo Router docs pattern: Dynamic routes (`[id].tsx`) inherit parent Stack layout options — consistent with observed behavior across `app/person/[id].tsx` and `app/reach-out/[id].tsx`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from direct codebase inspection, no new libraries
- Architecture: HIGH — patterns confirmed by reading actual implementation in reach-out and person screens
- Pitfalls: HIGH — all pitfalls identified from direct code inspection, not inferred

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days — no fast-moving dependencies; stable Expo Router and RN APIs)
