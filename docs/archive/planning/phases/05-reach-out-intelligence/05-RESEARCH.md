# Phase 5: Reach-Out Intelligence - Research

**Researched:** 2026-02-27
**Domain:** React Native swipeable carousel + contextual action ranking
**Confidence:** HIGH

## Summary

Phase 5 adds two features to the reach-out flow: (1) a horizontally swipeable memory carousel showing the person's recent memories for context before choosing a reach-out action, and (2) contextual action options that vary based on the person's relationship data (interaction history, relationship type, contact info availability).

The current reach-out screen (`app/reach-out/[id].tsx`) is a single `BridgeScreen` component that shows one memory via `getBestMemoryForReachOut()` and presents a static set of action buttons (Message, Call, Video, Meet in person). The memory selection utility (`src/lib/memorySelection.ts`) already handles single-memory selection but has no carousel support. The suggestion engine (`src/lib/suggestionEngine.ts`) generates global suggestions but has no per-person reach-out action ranking.

**Primary recommendation:** Build a horizontal `FlatList` memory carousel as a standalone component, add a `getReachOutActions` function to a new `src/lib/reachOutActionEngine.ts` that ranks actions per person based on interaction history and relationship type, and integrate both into the existing `BridgeScreen`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REACH-01 | After tapping "Reach out", user sees swipeable carousel of recent memories (past year) for context before choosing an action | `usePersonMemories` hook already fetches per-person memories; need to filter to past year, sort by recency, and render in horizontal FlatList with paging. Empty state handled by conditional render. |
| REACH-02 | Reach-out action options are contextually relevant — not the same static list every time | Need new `getReachOutActions()` engine that ranks actions based on: (a) interaction type frequency for this person, (b) relationship type defaults, (c) contact info availability. Returns ordered action list with varied labels. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native FlatList | Built-in | Horizontal scrolling carousel | Native, performant, handles virtualization, `horizontal` + `pagingEnabled` props |
| react-native-reanimated | Already installed | Entrance animations, card transitions | Already used in BridgeScreen for fade/scale animations |
| expo-linear-gradient | Already installed | Card gradient backgrounds | Already used in BridgeScreen for memory cards |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react-native | Already installed | Action button icons | Already imported in reach-out screen |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FlatList with paging | react-native-reanimated-carousel | Over-engineered for 3-5 cards; FlatList paging is simpler, no new dep |
| Custom action engine | Extend suggestionEngine.ts | Suggestion engine is global (all people); reach-out actions are per-person with different logic |

**Installation:** No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── reachOutActionEngine.ts   # NEW: per-person action ranking
├── components/
│   └── MemoryCarousel.tsx        # NEW: swipeable memory carousel
app/
└── reach-out/
    └── [id].tsx                  # MODIFIED: integrate carousel + contextual actions
```

### Pattern 1: Horizontal FlatList Carousel
**What:** `FlatList` with `horizontal`, `pagingEnabled`, `snapToInterval` for card-by-card swipe
**When to use:** Showing 0-N memory cards in a swipeable row
**Key props:**
- `horizontal={true}` — scrolls left/right
- `pagingEnabled={true}` — snap to card boundaries
- `showsHorizontalScrollIndicator={false}` — clean look
- `nestedScrollEnabled={true}` — prevents conflict with parent ScrollView/tab navigation
- `contentContainerStyle={{ paddingHorizontal }}` — edge card centering

### Pattern 2: Action Ranking Engine (Pure Function)
**What:** `getReachOutActions(person, interactions)` returns an ordered array of action options with labels
**When to use:** Determining which reach-out buttons to show and in what order
**Logic:**
1. Count interaction types for this person from history
2. Sort by frequency (most-used first)
3. Apply relationship type defaults for people with no history
4. Filter out unavailable actions (no phone → no call/text/video)
5. Vary label text based on relationship type and frequency data

### Pattern 3: Module-level Data Access
**What:** Reading from `locallyCreatedMemories` + `mockMemories` for carousel data
**When to use:** Fetching memories to display in carousel
**Note:** Already handled by `usePersonMemories` hook — just filter by date range.

### Anti-Patterns to Avoid
- **Gesture conflict with tabs:** FlatList horizontal scroll can conflict with tab navigation swipe. Fix: use `nestedScrollEnabled` and ensure FlatList is within the screen content (not at tab container level).
- **Static action labels:** Hardcoded strings like "Message" / "Call" for every person. Fix: Action engine generates varied labels.
- **Re-inventing memory fetch:** Building a new memory fetch when `usePersonMemories` already works. Fix: Filter existing hook output by date.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Horizontal scroll | Custom gesture handler | FlatList with pagingEnabled | Virtualization, snap, momentum all built-in |
| Date filtering | Custom date parsing | Simple `new Date()` comparison | Memories already have ISO `created_at` |
| Emotion display | New emoji map | Existing `emotionEmojis` from formatters.ts | Already canonically defined |

## Common Pitfalls

### Pitfall 1: FlatList inside ScrollView
**What goes wrong:** Horizontal FlatList inside vertical ScrollView can cause scroll event conflicts
**Why it happens:** Both components capture touch events
**How to avoid:** Set `nestedScrollEnabled={true}` on FlatList; keep parent as `ScrollView` (not nested FlatList)
**Warning signs:** Carousel swipe triggers page scroll instead of card change

### Pitfall 2: Empty carousel with no memories
**What goes wrong:** FlatList renders empty with weird spacing; "no memories" not communicated
**Why it happens:** FlatList with 0 items renders nothing, leaving a blank gap
**How to avoid:** Check `memories.length === 0` and conditionally render a gentle fallback message instead of the FlatList
**Warning signs:** Blank space between avatar and action buttons for new people

### Pitfall 3: Static action copy
**What goes wrong:** Every person sees identical "Message" / "Call" / "Meet in person" buttons
**Why it happens:** Actions are hardcoded JSX, not driven by data
**How to avoid:** Action engine returns `{ type, label, icon }` objects; UI maps over them
**Warning signs:** Opening reach-out for Mom vs. colleague shows identical buttons with identical labels

### Pitfall 4: Carousel performance with photos
**What goes wrong:** If memories have photo_url, loading many images in horizontal scroll causes jank
**Why it happens:** Image loading is expensive; carousel renders multiple cards at once
**How to avoid:** Use FlatList's built-in virtualization (`initialNumToRender`, `windowSize`); `Image` with `resizeMode="cover"`
**Warning signs:** Carousel stutters on swipe

## Code Examples

### Memory Carousel Data Prep
```typescript
// Filter memories to past year, sorted most recent first
function getRecentMemories(memories: Memory[], monthsBack: number = 12): Memory[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  return memories
    .filter(m => new Date(m.created_at) >= cutoff)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
```

### Action Ranking Logic
```typescript
interface ReachOutAction {
  type: InteractionType;
  label: string;
  icon: string; // lucide icon name
  isPrimary: boolean;
}

function getReachOutActions(
  person: Person,
  interactions: Interaction[]
): ReachOutAction[] {
  // Count interaction types for this person
  const typeCounts = new Map<InteractionType, number>();
  for (const i of interactions) {
    typeCounts.set(i.type, (typeCounts.get(i.type) ?? 0) + 1);
  }
  // Sort by frequency, apply defaults, filter by availability
  // ... ranking logic
}
```

## Sources

### Primary (HIGH confidence)
- Direct code review of `app/reach-out/[id].tsx` — current BridgeScreen structure
- Direct code review of `src/hooks/useMemories.ts` — usePersonMemories hook
- Direct code review of `src/lib/suggestionEngine.ts` — suggestion engine architecture
- Direct code review of `src/lib/memorySelection.ts` — existing memory selection utility
- Direct code review of `src/lib/vitalityEngine.ts` — vitality scoring
- Direct code review of `src/types/database.ts` — Person, Memory, Interaction types
- Direct code review of `src/types/index.ts` — InteractionType enum
- Direct code review of `src/data/mock.ts` — mock data structure
- Direct code review of `src/lib/formatters.ts` — emotionEmojis, formatRelativeDate

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, no new dependencies
- Architecture: HIGH - patterns follow existing codebase conventions exactly
- Pitfalls: HIGH - identified from direct code review of current implementation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable — no external dependencies)
