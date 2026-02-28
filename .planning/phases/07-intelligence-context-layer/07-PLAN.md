# Phase 7: Intelligence Context Layer - Plan

**Created:** 2026-02-27
**Requirements:** INTL-01, INTL-02, INTL-03, INTL-04, INTL-05

## Wave 1: Fix interaction data flow + add recency exclusion (INTL-01, INTL-02, INTL-03)

### Task 1.1: Fix useInteractions mock fallback
**File:** `src/hooks/useInteractions.ts`
- Import `mockInteractions` from `@/data/mock`
- Add module-level `locallyCreatedInteractions: Interaction[]` array
- In `useAllInteractions` catch block, fall back to `[...locallyCreatedInteractions, ...mockInteractions]` instead of `[]`
- In `usePersonInteractions` catch block, fall back to filtered mock+local data instead of `[]`
- In `useCreateInteraction`, on catch (mock mode), create a mock interaction and push to `locallyCreatedInteractions`

### Task 1.2: Add 24-hour recency exclusion to suggestion engine
**File:** `src/lib/suggestionEngine.ts`
- Add helper `getRecentlyContactedPersonIds(interactions, hoursWindow)` that returns a `Set<string>` of person IDs with an interaction within the last N hours
- In `generateSuggestions()`, compute recently contacted set (24h window)
- Pass this set to all generators except `generateBirthdaySuggestions` (birthdays are socially expected and should not be suppressed)
- In `generateMemoryResurfaceSuggestions`, `generateDriftSuggestions`, `generateCalendarSuggestions`, and `generateGeneralSuggestions`: skip persons in the recently-contacted set

### Task 1.3: No changes needed to vitality engine
The vitality engine (`src/lib/vitalityEngine.ts`) is already correct. Once Task 1.1 fixes the interaction data flow, vitality computations will automatically reflect recent activity.

## Wave 2: Fix memory resurface 7-day lag (INTL-04)

### Task 2.1: Add minimum creation age to memory resurface
**File:** `src/lib/suggestionEngine.ts`
- In `generateMemoryResurfaceSuggestions()`, change the age threshold check from `age < 30` to `age < 7` for the minimum creation lag
- This means: memories must be at least 7 days old to be candidates for resurfacing (the existing 30-day threshold for "worth revisiting" is separate and remains)
- Actually, the current logic filters `age < 30`. The requirement says 7 days minimum. The current 30-day threshold is MORE restrictive than required. Keep the 30-day threshold for the suggestion engine resurface, but add explicit 7-day guard.

### Task 2.2: Add 7-day filter to home screen memory spotlight
**File:** `app/(tabs)/index.tsx`
- In the `spotlightMemory` useMemo, filter out memories created within the last 7 days before picking by day index
- Only memories older than 7 days should be eligible for the "A moment worth revisiting" spotlight

## Wave 3: Personalize suggestion copy (INTL-05)

### Task 3.1: Create personalized copy generator
**File:** `src/lib/suggestionEngine.ts`
- Add `generatePersonalizedReachOutReason(person, vitalityInfo, growthInfo)` function
- Use relationship type, growth stage, and vitality level to vary copy
- Examples by relationship type + context:
  - Friend + dormant: "Your friendship with {Name} could use a gentle moment."
  - Family + resting: "A small hello to {Name} could brighten both your days."
  - Colleague + vibrant: "{Name} might enjoy hearing from you."
  - Mentor + healthy: "You and {Name} have something growing. Tend to it."
- Never use: "haven't", "forgot", "neglect", "overdue", "remind", "reminder"

### Task 3.2: Wire personalized copy into generators
**File:** `src/lib/suggestionEngine.ts`
- Replace static `reason` strings in `generateDriftSuggestions()` and `generateGeneralSuggestions()` with calls to the personalized copy generator
- Each person should get a reason string that varies based on their unique combination of relationship type, growth stage, and vitality

## Wave 4: Wire Garden Walk + home screen integration

### Task 4.1: Garden Walk already calls generateSuggestions
**File:** `app/garden-walk.tsx`
- No additional changes needed -- the 24-hour recency exclusion added in Wave 1 will automatically filter the Garden Walk's "plants to tend" list
- Verify that Garden Walk uses `useAllInteractions` hook (it does) which will now include locally created interactions

### Task 4.2: Verify home screen data freshness
**File:** `app/(tabs)/index.tsx`
- The home screen already has `useFocusEffect` that refetches persons, memories, and interactions on tab focus
- After Wave 1 fixes the interaction mock fallback, the refetched data will include locally created interactions
- Suggestions will automatically recompute via useMemo dependency on `allInteractions`

## Verification Checklist

- [ ] INTL-01: After logging a reach-out, vitality for that person shows recent activity (not stale)
- [ ] INTL-02: After reaching out, home screen suggestions exclude that person for 24 hours
- [ ] INTL-03: Garden Walk "plants to tend" excludes person reached out to today
- [ ] INTL-04: Memory created today does not appear in "moment worth revisiting"
- [ ] INTL-05: Two different people generate different suggestion copy
