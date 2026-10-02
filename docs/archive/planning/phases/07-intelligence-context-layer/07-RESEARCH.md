# Phase 7: Intelligence Context Layer - Research

**Researched:** 2026-02-27
**Domain:** Vitality/Suggestion engine context awareness, recency filtering, personalization
**Confidence:** HIGH

## Summary

The intelligence layer engines (vitality, suggestion) are well-structured pure-function engines that accept arrays of memories and interactions. The core issue is not architectural but data-flow: the engines already compute correct results given correct inputs, but **the suggestion engine lacks recency exclusion filters** and **the memory spotlight on the home screen has no creation-date filter**. The vitality engine itself is already correct -- it reads `created_at` timestamps and computes days since last activity accurately. The real problems are:

1. The suggestion engine's `generateSuggestions()` has no 24-hour exclusion window for recently-contacted persons.
2. The `generateMemoryResurfaceSuggestions()` uses a 30-day threshold but lacks a **minimum age from creation** -- a memory created today that happens to have a mock `created_at` 30+ days ago would surface, and any memory resurfaced on the home screen spotlight has NO age filter at all.
3. The home screen "spotlight memory" picks randomly by day index with zero recency filtering.
4. Suggestion copy is static per type -- every `general_reach_out` says the exact same thing regardless of person data.
5. Garden Walk calls `generateSuggestions()` directly with the same lack of recency exclusion.

**Primary recommendation:** Add a 24-hour recency exclusion filter in `generateSuggestions()`, a 7-day creation-age minimum to both the memory resurface generator and the home screen spotlight, and personalized copy templates that vary by relationship type, growth stage, and vitality level.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTL-01 | Vitality engine reflects actual recent activity | Vitality engine is already correct -- `getDaysSinceLastActivity()` reads `created_at` from all memories and interactions. The real fix is ensuring the **home screen and suggestion engine pass freshly-fetched data** including locally created interactions. The `useAllInteractions` hook already reads from the service which falls back to mock data -- but it needs `useFocusEffect` to refetch on tab focus after a reach-out. |
| INTL-02 | Home screen suggestions exclude recently-contacted persons | `generateSuggestions()` has no recency exclusion. Add a filter that excludes any person with an interaction `created_at` within the last 24 hours from all suggestion types (birthday excepted). |
| INTL-03 | Garden Walk excludes recently-reached-out persons | Garden Walk calls `generateSuggestions()` directly. The same 24-hour exclusion added for INTL-02 will automatically fix this. |
| INTL-04 | Memory resurface enforces 7-day lag from creation | `generateMemoryResurfaceSuggestions()` checks `age >= 30` days but this is from the mock `created_at` field. Need to also check that the memory was created at least 7 days ago. Additionally, the home screen spotlight (`spotlightMemory`) has no age filter at all -- it picks by day index from all memories. |
| INTL-05 | Suggestion copy is personalized, not static | All generators produce static strings: `"You might enjoy reaching out to {Name}."` regardless of relationship type, growth stage, or vitality. Need copy variations per person context. |
</phase_requirements>

## Architecture Patterns

### Current Data Flow
```
usePersons()  ──┐
useMemories() ──┼──> generateSuggestions(persons, memories, interactions) ──> UI
useAllInteractions() ──┘
```

Both the home screen (`app/(tabs)/index.tsx`) and Garden Walk (`app/garden-walk.tsx`) call `generateSuggestions()` directly with data from hooks. The `useSuggestions` hook exists but the home screen doesn't use it (it calls the engine directly with calendar matches).

### Key Pattern: Module-Level Mock Persistence
- `locallyCreatedMemories` in `useMemories.ts`
- Interactions use `interactionService.ts` which throws on Supabase not configured, then the hook catch block currently sets `interactions` to `[]` -- **this means locally created interactions may not be included in the fallback data**.
- The `useAllInteractions` hook calls `interactionService.getAllInteractions()` which throws, then falls back to `setInteractions([])` -- missing mock interactions.

### Root Cause Analysis

**INTL-01 (Vitality shows stale):** The `useAllInteractions` hook's catch block sets interactions to empty `[]` instead of using mock data + locally created interactions. When vitality is computed with empty interactions, it falls back to memories-only timestamps which may be older. The fix is to add mock fallback (same pattern as `useMemories`).

**INTL-02/03 (No recency exclusion):** `generateSuggestions()` has no parameter or internal logic to exclude recently-contacted persons. Add an exclusion filter based on interaction timestamps.

**INTL-04 (Memory resurface too soon):** `generateMemoryResurfaceSuggestions()` only checks `age >= 30` but doesn't enforce a minimum creation-age gap. Home screen spotlight has zero filtering.

**INTL-05 (Static copy):** All suggestion generators use hardcoded strings with only `{personName}` interpolation.

## Common Pitfalls

### Pitfall 1: Interaction Data Not Available in Mock Mode
**What goes wrong:** `useAllInteractions` catch block returns `[]` instead of mock data.
**Why it happens:** The service layer throws when Supabase is not configured, and the hook doesn't fall back to mock data like `useMemories` does.
**How to avoid:** Add mock fallback in `useAllInteractions` catch block, merging `locallyCreatedInteractions` with `mockInteractions`.

### Pitfall 2: Birthday Suggestions Should Not Be Excluded
**What goes wrong:** If the 24-hour recency filter is too aggressive, birthday suggestions get filtered out even though birthdays are socially expected.
**How to avoid:** Exempt `birthday_upcoming` type from the recency exclusion.

### Pitfall 3: Tone Violations in Personalized Copy
**What goes wrong:** Copy variations accidentally include guilt words like "haven't", "forgot", "neglect".
**How to avoid:** All copy must pass the existing tone rules. Use only positive/invitational framing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date comparison | Custom date math | Existing `getDaysSinceLastActivity()` and `memoryAgeDays()` | Already correct and tested |
| Copy personalization | External template engine | Simple switch/case with relationship type + vitality level | Keep it lightweight |

## Sources

### Primary (HIGH confidence)
- Direct code analysis of `src/lib/vitalityEngine.ts`, `src/lib/suggestionEngine.ts`, `src/hooks/useVitality.ts`, `src/hooks/useSuggestions.ts`, `src/hooks/useInteractions.ts`, `src/hooks/useMemories.ts`
- Direct code analysis of `app/(tabs)/index.tsx`, `app/garden-walk.tsx`

## Metadata

**Confidence breakdown:**
- Architecture: HIGH - direct codebase analysis, all files read
- Root causes: HIGH - traced full data flow from hooks to engines to UI
- Fix approach: HIGH - changes are localized and follow existing patterns
