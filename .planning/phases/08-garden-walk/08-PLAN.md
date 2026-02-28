# Phase 8: Garden Walk - Plan

**Created:** 2026-02-27
**Requirements:** WALK-01, WALK-02
**File:** `app/garden-walk.tsx`
**Dependencies:** Phase 7 (suggestion engine with 24h recency, personalized copy)

## Tasks

### Task 1: Remove "Capture a moment" / "Anything on your mind" section (WALK-01)

**Goal:** Garden Walk focuses exclusively on suggested people to tend.

**Actions:**
1. Delete the "Capture Prompt Card" section (lines 451-503) — the gold-tinted card with "Anything on your mind today?" and "Capture a moment" link
2. Delete the "Capture a moment" link from the empty state (lines 219-248) — replace with tone-appropriate empty state about no people to tend
3. Remove the `ChevronRight` import if it becomes unused (check: it's also used in memory resurface and plants-to-tend sections, so likely still needed)
4. Update the empty state copy from "Your garden is just getting started. Capture a moment to help it grow." to garden-walk-appropriate copy: "Your garden is all tended. Enjoy your week."

**Verify:** No "Capture a moment", "Anything on your mind", or equivalent freeform section exists in the rendered output.

### Task 2: Wire to useSuggestions hook with calendar integration (WALK-02)

**Goal:** Garden Walk uses contextual intelligence (vitality, calendar, growth) to select people.

**Actions:**
1. Replace direct `generateSuggestions()` call and its `useMemo` wrapper with `useSuggestions(persons, memories, interactions, 5)` hook call
2. Remove the now-unused direct import of `generateSuggestions` and related types — import `useSuggestions` and `IntelligentSuggestion` instead
3. Keep the `memoryResurface` / `plantsToTend` split logic (it still reads from the suggestions array)
4. Update `isLoading` / `isEmpty` to work with the hook's return (it returns `IntelligentSuggestion[]` directly, no loading state — derive from underlying data hooks)

**Verify:** `useSuggestions` is called (not `generateSuggestions` directly). Calendar matches feed into suggestions when available.

### Task 3: Use engine's `reason` field for richer context lines (WALK-02)

**Goal:** Each person shown has a visible, contextual reason for being suggested.

**Actions:**
1. Replace the `getContextLine()` helper usage with the suggestion's `reason` field (truncated to ~60 chars for UI fit)
2. Remove or simplify the `getContextLine()` function since the engine's `reason` is now the primary source
3. Keep the emoji icons per suggestion type — they add visual distinction
4. For the context line below the person name, show `reason` truncated, removing the separate icon prefix (the icon can stay at the beginning)

**Verify:** Each person row shows a meaningful, personalized reason (e.g. "Your friendship with Sarah has deep roots...") instead of generic "Well-rooted" or "Might enjoy a note."

### Task 4: Improve empty state (WALK-01)

**Goal:** When no suggestions exist, show a tone-appropriate empty state.

**Actions:**
1. Replace the "Capture a moment to help it grow" empty state with:
   - Text: "Your garden is all tended for now. Take a breath and enjoy the moment."
   - No action button — the screen communicates completeness, not a task
   - Keep the plant emoji for warmth
2. Adjust animation delay if needed (currently delay 100ms)

**Verify:** Empty state shows when `allSuggestions.length === 0`. No "Capture a moment" or similar. Copy is gentle and complete.

## Success Criteria Mapping

| Criterion | Task |
|-----------|------|
| 1. No "Capture a moment" / "Anything on your mind" section | Task 1 |
| 2. Every person has a contextual reason | Task 3 |
| 3. Recently reached-out person excluded | Already handled by Phase 7's 24h exclusion in generateSuggestions() |
| 4. Empty list shows appropriate empty state | Task 4 |
| 5. Suggestions use positive framing, never guilt | Task 3 (engine's reason field already validated by Phase 7 INTL-05) |
