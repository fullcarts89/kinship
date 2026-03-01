/**
 * Calendar Engine
 *
 * Scans recent calendar events (past 48 hours) and matches attendee
 * names or event titles against persons in the user's garden.
 *
 * Matching strategy:
 * - Compare event title and attendee names against Person.name
 * - Case-insensitive, first-name match is sufficient
 * - Only consider events that ended in the past 48 hours
 * - Ignore recurring daily events (standup, etc.) via heuristic:
 *   skip events that occur 5+ times in the past 14 days
 *
 * Returns matched events as CalendarMatch objects for the suggestion engine.
 *
 * Uses lazy require("expo-calendar") inside try/catch to avoid native
 * module crash on top-level import (same pattern as expo-contacts).
 */

import type { Person } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CalendarMatch {
  personId: string;
  personName: string;
  eventTitle: string;
  eventDate: string; // ISO string
}

export type CalendarPermissionStatus = "granted" | "denied" | "undetermined";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Only consider events whose end time is within the past 48 hours. */
const RECENT_WINDOW_HOURS = 48;

/** Look back 14 days to detect recurring daily events. */
const RECURRENCE_WINDOW_DAYS = 14;

/**
 * If an event title appears 5+ times in 14 days, treat it as a recurring
 * daily event (standup, sync, etc.) and skip it.
 */
const RECURRENCE_THRESHOLD = 5;

/** Minimum first-name length to match against — avoids false positives. */
const MIN_NAME_LENGTH = 3;

// ─── Module-level State ─────────────────────────────────────────────────────

let _permissionStatus: CalendarPermissionStatus = "undetermined";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check whether `eventText` contains the first name extracted from
 * `personName`. Case-insensitive, word-boundary-aware.
 *
 * Skips very short first names (< 3 characters) to avoid false positives
 * like matching "Al" inside "Calendar".
 */
export function isFirstNameMatch(
  eventText: string,
  personName: string
): boolean {
  if (!eventText || !personName) return false;

  const firstName = personName.split(/\s+/)[0];
  if (!firstName || firstName.length < MIN_NAME_LENGTH) return false;

  // Use a word-boundary regex to avoid partial matches inside longer words.
  // Escape any special regex characters in the name, just in case.
  const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(eventText);
}

/**
 * Build a frequency map of event titles from a list of events.
 * Titles are lower-cased and trimmed for comparison.
 */
function buildTitleFrequencyMap(
  events: { title?: string }[]
): Map<string, number> {
  const freq = new Map<string, number>();
  for (const event of events) {
    const key = (event.title ?? "").trim().toLowerCase();
    if (key.length === 0) continue;
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return freq;
}

/**
 * Check whether a given event should be skipped because it recurs
 * too frequently (>= RECURRENCE_THRESHOLD in the 14-day window).
 */
function isRecurringDaily(
  event: { title?: string },
  titleFrequency: Map<string, number>
): boolean {
  const key = (event.title ?? "").trim().toLowerCase();
  if (key.length === 0) return false;
  return (titleFrequency.get(key) ?? 0) >= RECURRENCE_THRESHOLD;
}

/**
 * Attempt to load expo-calendar lazily.
 * Returns the module or null if unavailable.
 *
 * NOTE: Calendar integration is disabled in Expo Go.
 * Enable when using a dev client build by uncommenting the require below.
 */
function getExpoCalendar(): any | null {
  try {
    return require("expo-calendar");
  } catch {
    return null;
  }
}

// ─── Permission ─────────────────────────────────────────────────────────────

/**
 * Return the cached calendar permission status without triggering
 * any system dialog or async work. Useful for synchronous reads
 * (e.g. conditional rendering in Settings).
 */
export function getCalendarPermissionStatus(): CalendarPermissionStatus {
  return _permissionStatus;
}

/**
 * Check the current calendar permission status WITHOUT triggering the
 * system permission dialog. Updates the module-level cache.
 *
 * Use this in Settings to display current status; use
 * `requestCalendarPermission` in Garden Walk setup to actually prompt.
 *
 * Returns 'undetermined' if the native module is unavailable.
 */
export async function checkCalendarPermission(): Promise<CalendarPermissionStatus> {
  const ExpoCalendar = getExpoCalendar();
  if (!ExpoCalendar) {
    return _permissionStatus;
  }

  try {
    const { status } = await ExpoCalendar.getCalendarPermissionsAsync();
    if (status === "granted") {
      _permissionStatus = "granted";
    } else {
      _permissionStatus = "denied";
    }
  } catch {
    // Fail silently — retain existing cached value
  }

  return _permissionStatus;
}

/**
 * Request calendar permission using expo-calendar.
 * Caches the result at module level so repeated calls are cheap.
 * Returns 'undetermined' if the native module is unavailable.
 */
export async function requestCalendarPermission(): Promise<CalendarPermissionStatus> {
  const ExpoCalendar = getExpoCalendar();
  if (!ExpoCalendar) {
    _permissionStatus = "undetermined";
    return _permissionStatus;
  }

  try {
    const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
    if (status === "granted") {
      _permissionStatus = "granted";
    } else {
      _permissionStatus = "denied";
    }
  } catch {
    // Permission request failed — treat as denied
    _permissionStatus = "denied";
  }

  return _permissionStatus;
}

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Scan recent calendar events and match attendee names / event titles
 * against persons in the user's garden.
 *
 * Returns an empty array gracefully on any error (permission denied,
 * native module unavailable, no calendars, etc.).
 */
export async function getRecentCalendarMatches(
  persons: Person[]
): Promise<CalendarMatch[]> {
  if (!persons || persons.length === 0) return [];

  // ── 1. Load native module ────────────────────────────────────────────
  const ExpoCalendar = getExpoCalendar();
  if (!ExpoCalendar) return [];

  // ── 2. Ensure permission ─────────────────────────────────────────────
  try {
    if (_permissionStatus !== "granted") {
      const status = await requestCalendarPermission();
      if (status !== "granted") return [];
    }
  } catch {
    return [];
  }

  // ── 3. Get calendars ─────────────────────────────────────────────────
  let calendars: any[];
  try {
    calendars = await ExpoCalendar.getCalendarsAsync(
      ExpoCalendar.EntityTypes?.EVENT ?? "event"
    );
  } catch {
    return [];
  }

  if (!calendars || calendars.length === 0) return [];

  const calendarIds = calendars.map((c: any) => c.id);

  // ── 4. Fetch events ──────────────────────────────────────────────────
  const now = new Date();

  // Past 48 hours for recent matches
  const recentStart = new Date(
    now.getTime() - RECENT_WINDOW_HOURS * 60 * 60 * 1000
  );

  // Past 14 days for recurrence detection
  const recurrenceStart = new Date(
    now.getTime() - RECURRENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  let recentEvents: any[];
  let allRecentEvents: any[]; // 14-day window for frequency analysis

  try {
    // Fetch the two windows in parallel
    const [recentResult, allResult] = await Promise.all([
      ExpoCalendar.getEventsAsync(
        calendarIds,
        recentStart.toISOString(),
        now.toISOString()
      ),
      ExpoCalendar.getEventsAsync(
        calendarIds,
        recurrenceStart.toISOString(),
        now.toISOString()
      ),
    ]);

    recentEvents = recentResult ?? [];
    allRecentEvents = allResult ?? [];
  } catch {
    return [];
  }

  if (recentEvents.length === 0) return [];

  // ── 5. Build recurrence frequency map from 14-day window ─────────────
  const titleFrequency = buildTitleFrequencyMap(allRecentEvents);

  // ── 6. Match events against persons ──────────────────────────────────
  const matches: CalendarMatch[] = [];

  // Track which (personId, eventTitle+eventDate) pairs we've already matched
  // to avoid duplicate entries for the same event-person combo.
  const seen = new Set<string>();

  for (const event of recentEvents) {
    // Skip events with no title
    const eventTitle: string = (event.title ?? "").trim();
    if (eventTitle.length === 0) continue;

    // Skip recurring daily events
    if (isRecurringDaily(event, titleFrequency)) continue;

    // Determine event date — prefer endDate, fall back to startDate
    const eventDate: string =
      event.endDate ?? event.startDate ?? now.toISOString();

    // Collect all text to match against: event title + attendee names
    const textsToMatch: string[] = [eventTitle];

    if (Array.isArray(event.attendees)) {
      for (const attendee of event.attendees) {
        if (attendee.name && typeof attendee.name === "string") {
          textsToMatch.push(attendee.name);
        }
      }
    }

    // Check each person against all matchable text
    for (const person of persons) {
      const dedupeKey = `${person.id}::${eventTitle}::${eventDate}`;
      if (seen.has(dedupeKey)) continue;

      const matched = textsToMatch.some((text) =>
        isFirstNameMatch(text, person.name)
      );

      if (matched) {
        seen.add(dedupeKey);
        matches.push({
          personId: person.id,
          personName: person.name,
          eventTitle,
          eventDate,
        });
      }
    }
  }

  return matches;
}
