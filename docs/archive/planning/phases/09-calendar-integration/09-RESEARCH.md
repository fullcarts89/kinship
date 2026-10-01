# Phase 9: Calendar Integration - Research

**Researched:** 2026-02-27
**Domain:** expo-calendar permission flow, calendar engine wiring, suggestion engine integration
**Confidence:** HIGH

## Summary

Phase 9 wires the existing calendar engine (`src/lib/calendarEngine.ts`) into the user-facing flows. The engine is already fully implemented with lazy `require("expo-calendar")`, permission requesting, event scanning with recurrence filtering, and attendee-to-person matching. The suggestion engine (`src/lib/suggestionEngine.ts`) already has a `post_event_capture` suggestion type with priority 70 and the `generateCalendarSuggestions` function. The `useSuggestions` hook already fetches calendar matches asynchronously. The home screen already consumes calendar matches for suggestions.

What is MISSING and needs to be built:
1. **CAL-01**: Garden Walk setup screen has NO calendar permission step -- it only has day/time picker. Need to add an optional, skippable step.
2. **CAL-02**: Settings screen has NO calendar permission display or management row.
3. **CAL-03**: Calendar engine scan is already wired in `useSuggestions` and the home screen's `useEffect`, but needs a `getCalendarPermissionStatus` export and a `checkCalendarPermission` function (non-requesting check) for the Settings display.
4. **CAL-04**: Calendar matches already feed into the suggestion engine via `generateCalendarSuggestions`. The wiring from `useSuggestions` -> `getRecentCalendarMatches` -> `generateSuggestions` is complete. Garden Walk screen already uses `useSuggestions` which includes calendar data. This requirement is already satisfied by existing code -- just needs calendar permission to be grantable (CAL-01).

**Primary recommendation:** Add a calendar permission step to Garden Walk setup (before or after the day/time picker), add a calendar status row to Settings with "Open Settings" link, and add a `getCalendarPermissionStatus()` export to the calendar engine for checking current status without re-requesting.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAL-01 | User can grant calendar permission during Garden Walk setup flow | Garden Walk setup (`app/garden-walk-setup.tsx`) has no calendar step. Add optional step using `requestCalendarPermission()` from `calendarEngine.ts`. Lazy require pattern already in engine. |
| CAL-02 | User can manage calendar permission from Settings | Settings screen (`app/settings/index.tsx`) has no calendar row. Add row showing status via new `getCalendarPermissionStatus()` function, with Linking to device settings. |
| CAL-03 | Calendar engine auto-scans recent events and matches attendees to garden persons | Already implemented: `getRecentCalendarMatches()` in calendarEngine.ts scans past 48h, filters recurring events, matches by first name. Called by `useSuggestions` hook and home screen. Need `checkCalendarPermission()` for non-blocking status check. |
| CAL-04 | Calendar matches feed into suggestion engine for post-event memory capture prompts | Already implemented: `generateCalendarSuggestions()` in suggestionEngine.ts creates `post_event_capture` suggestions with priority 70. `useSuggestions` hook passes calendar matches to `generateSuggestions()`. Garden Walk uses `useSuggestions`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-calendar | ~15.0.8 | Calendar event access | Already in package.json and app.json plugins |
| expo-linking | ~8.0.11 | Open device settings for permission management | Already in package.json |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | ~4.1.1 | Animations for new UI steps | Already used throughout app |
| lucide-react-native | ^0.469.0 | Icons for settings row | Already used in settings |

### Alternatives Considered
None needed -- all libraries already in the project.

## Architecture Patterns

### Pattern 1: Lazy require for expo-calendar
**What:** Never top-level import expo-calendar. Always use `require("expo-calendar")` inside try/catch.
**When to use:** Every time calendar functionality is accessed.
**Example:**
```typescript
// ALREADY IMPLEMENTED in calendarEngine.ts
function getExpoCalendar(): any | null {
  try {
    return require("expo-calendar");
  } catch {
    return null;
  }
}
```

### Pattern 2: Module-level permission state
**What:** Calendar permission status cached at module level in `calendarEngine.ts`.
**When to use:** For checking permission status without re-requesting.
**Example:**
```typescript
// Already exists: let _permissionStatus: CalendarPermissionStatus = "undetermined";
// Need to add: export function to read it
export function getCalendarPermissionStatus(): CalendarPermissionStatus {
  return _permissionStatus;
}
```

### Pattern 3: Async permission check without re-requesting
**What:** Check current permission status without triggering the system dialog.
**When to use:** Settings screen to display current status.
**Example:**
```typescript
export async function checkCalendarPermission(): Promise<CalendarPermissionStatus> {
  const ExpoCalendar = getExpoCalendar();
  if (!ExpoCalendar) return "undetermined";
  try {
    const { status } = await ExpoCalendar.getCalendarPermissionsAsync(); // NOT request
    _permissionStatus = status === "granted" ? "granted" : "denied";
  } catch {
    // fail silently
  }
  return _permissionStatus;
}
```

### Pattern 4: Open device settings via Linking
**What:** Use `Linking.openSettings()` to let user manage permissions in device settings.
**When to use:** Settings screen "Manage" button for calendar permission.
**Example:**
```typescript
import { Linking } from "react-native";
// Open device settings
Linking.openSettings();
```

### Anti-Patterns to Avoid
- **Top-level import of expo-calendar:** Causes native module crash. ALWAYS lazy require.
- **Requesting permission on Settings screen load:** Only request during Garden Walk setup. Settings should CHECK, not request.
- **Blocking UI during calendar scan:** Already handled -- `useSuggestions` runs the scan in a `useEffect` with `cancelled` flag.
- **Guilt copy for permission request:** Never "we need" or "you should". Always "you can" or "if you'd like".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar permission request | Custom native bridge | `expo-calendar` `requestCalendarPermissionsAsync()` | Already implemented in calendarEngine.ts |
| Opening device settings | Custom intent system | `Linking.openSettings()` from React Native | Standard cross-platform API |
| Calendar event scanning | Custom event parser | `expo-calendar` `getEventsAsync()` | Already implemented in calendarEngine.ts |
| Attendee matching | Complex NLP | `isFirstNameMatch()` in calendarEngine.ts | Already implemented with word-boundary regex |

## Common Pitfalls

### Pitfall 1: expo-calendar crashes in Expo Go
**What goes wrong:** `require("expo-calendar")` returns null in Expo Go (no native module).
**Why it happens:** Calendar is a native module not available in Expo Go client.
**How to avoid:** The lazy require + null check pattern already handles this. All new code must check for null return.
**Warning signs:** Blank permission step or "undetermined" status that never changes.

### Pitfall 2: Requesting permission when it was already denied
**What goes wrong:** After denying once, `requestCalendarPermissionsAsync()` may not show the system dialog again on iOS.
**Why it happens:** iOS only shows the system permission dialog once per app install.
**How to avoid:** If status is "denied", show the "Open Settings" link instead of re-requesting.
**Warning signs:** User taps "Allow" in Garden Walk setup but nothing happens.

### Pitfall 3: Calendar scan called before permission granted
**What goes wrong:** `getRecentCalendarMatches` checks permission internally and returns [] if not granted. No crash, but no results either.
**Why it happens:** Expected behavior -- the engine is defensive.
**How to avoid:** This is correct. No action needed. The engine gracefully returns empty.

### Pitfall 4: Settings screen shows stale permission status
**What goes wrong:** User grants permission in device settings, returns to app, status still shows "denied".
**Why it happens:** Module-level `_permissionStatus` is cached.
**How to avoid:** Re-check permission on focus using `useFocusEffect`.

## Code Examples

### Garden Walk Setup Calendar Step
```typescript
// New optional step in garden-walk-setup.tsx
const [calendarAsked, setCalendarAsked] = useState(false);
const [calendarGranted, setCalendarGranted] = useState(false);

const handleAllowCalendar = async () => {
  const status = await requestCalendarPermission();
  setCalendarGranted(status === "granted");
  setCalendarAsked(true);
};

const handleSkipCalendar = () => {
  setCalendarAsked(true);
};
```

### Settings Calendar Row
```typescript
// In settings/index.tsx
const [calendarStatus, setCalendarStatus] = useState<CalendarPermissionStatus>("undetermined");

useFocusEffect(useCallback(() => {
  (async () => {
    const status = await checkCalendarPermission();
    setCalendarStatus(status);
  })();
}, []));
```

## Open Questions

1. **Step ordering in Garden Walk setup**
   - What we know: Currently has day picker + time picker + confirm button
   - What's unclear: Should calendar step come before or after the day/time picker?
   - Recommendation: Add calendar step AFTER the day/time picker, before the confirm button. This way the primary task (scheduling) is done first, and calendar is a bonus.
   - Decision: Calendar step will be shown below the time picker, as an optional section with "Allow" and "Skip" options. This keeps it as a single scrollable page rather than a multi-step flow.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/calendarEngine.ts` -- fully implemented engine with lazy require, permission, scanning, matching
- Codebase analysis: `src/lib/suggestionEngine.ts` -- `post_event_capture` type already defined with generateCalendarSuggestions
- Codebase analysis: `src/hooks/useSuggestions.ts` -- already wires calendar matches to suggestions
- Codebase analysis: `app/(tabs)/index.tsx` -- home screen already fetches calendar matches
- Codebase analysis: `app/garden-walk.tsx` -- already uses useSuggestions which includes calendar data
- Codebase analysis: `package.json` -- expo-calendar ~15.0.8 already installed
- Codebase analysis: `app.json` -- expo-calendar plugin already configured with permission string

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured
- Architecture: HIGH - Engine and suggestion wiring already exist, just need UI
- Pitfalls: HIGH - Lazy require pattern well-established in codebase, documented in MEMORY.md

**Research date:** 2026-02-27
**Valid until:** 2026-03-27
