/**
 * Context Extractor
 *
 * Lightweight keyword + date heuristic that scans capture text for
 * references to upcoming events.
 *
 * V1 detects:
 * - Explicit dates: "March 15", "next Tuesday", "in two weeks"
 * - Event keywords: "birthday", "wedding", "moving", "starting",
 *   "surgery", "interview", "graduation", "trip", "marathon",
 *   "concert", "exam", "due date"
 *
 * When a match is found:
 * - Store as a ContextualNudge record linked to the person
 * - Schedule a suggestion for the extracted date (or 1-2 days before)
 * - If no date extracted, schedule for 2-4 weeks from capture date
 *   (assumption: person mentioned a near-future event)
 *
 * V2 (future): Replace keyword matching with lightweight NLP
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContextualNudge {
  id: string;
  personId: string;
  sourceMemoryId: string;
  keyword: string;
  extractedDate?: string; // ISO date if detected
  fallbackDate: string; // 2-4 weeks from capture if no date detected
  surfaced: boolean; // Has this nudge been shown?
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EVENT_KEYWORDS = [
  "birthday",
  "wedding",
  "moving",
  "starting",
  "surgery",
  "interview",
  "graduation",
  "trip",
  "marathon",
  "concert",
  "exam",
  "due date",
  "anniversary",
  "vacation",
  "holiday",
  "reunion",
  "recital",
  "presentation",
  "conference",
  "retreat",
];

const MONTH_NAMES: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const WORD_TO_NUMBER: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  a: 1,
  "a few": 3,
};

// ─── Module-level store ─────────────────────────────────────────────────────

let _nudges: ContextualNudge[] = [];

// ─── Date helpers ───────────────────────────────────────────────────────────

/** Return an ISO date string (YYYY-MM-DD) from a Date object. */
function toISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Add `n` days to a Date and return a new Date. */
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/** Add `n` weeks to a Date and return a new Date. */
function addWeeks(base: Date, n: number): Date {
  return addDays(base, n * 7);
}

/** Add `n` months to a Date and return a new Date. */
function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

/**
 * Given a day name (e.g. "tuesday"), find the next occurrence of that day
 * from `base`. If today is that day, it returns the *next* occurrence (7 days out).
 */
function nextDayOfWeek(base: Date, dayName: string): Date {
  const targetIdx = DAY_NAMES.indexOf(dayName.toLowerCase());
  if (targetIdx === -1) return base;

  const currentIdx = base.getDay();
  let diff = targetIdx - currentIdx;
  if (diff <= 0) diff += 7; // always advance forward
  return addDays(base, diff);
}

/**
 * Find the upcoming weekend (Saturday) from `base`.
 */
function thisWeekend(base: Date): Date {
  return nextDayOfWeek(base, "saturday");
}

// ─── Date extraction ────────────────────────────────────────────────────────

/**
 * Try to extract a date from the given text, searching within a window
 * around a keyword match. Returns an ISO date string, a raw text hint,
 * or undefined if nothing is found.
 */
function extractDateFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  const now = new Date();

  // ── "tomorrow" / "tonight" ────────────────────────────────────────────
  if (/\btomorrow\b/.test(lower)) {
    return toISO(addDays(now, 1));
  }
  if (/\btonight\b/.test(lower)) {
    return toISO(now); // same calendar day
  }

  // ── Month + day: "March 15", "march 15th", "Mar 15" ──────────────────
  const monthDayRegex =
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthDayMatch = lower.match(monthDayRegex);
  if (monthDayMatch) {
    const monthIdx = MONTH_NAMES[monthDayMatch[1].toLowerCase()];
    const day = parseInt(monthDayMatch[2], 10);
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      let year = now.getFullYear();
      const candidate = new Date(year, monthIdx, day);
      // If the date is in the past, assume next year
      if (candidate < now) {
        year += 1;
      }
      return toISO(new Date(year, monthIdx, day));
    }
  }

  // ── "next Tuesday", "next Friday" ────────────────────────────────────
  const nextDayRegex =
    /\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
  const nextDayMatch = lower.match(nextDayRegex);
  if (nextDayMatch) {
    return toISO(nextDayOfWeek(now, nextDayMatch[1].toLowerCase()));
  }

  // ── "this Friday", "this Saturday" ───────────────────────────────────
  const thisDayRegex =
    /\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
  const thisDayMatch = lower.match(thisDayRegex);
  if (thisDayMatch) {
    const dayName = thisDayMatch[1].toLowerCase();
    const targetIdx = DAY_NAMES.indexOf(dayName);
    const currentIdx = now.getDay();
    let diff = targetIdx - currentIdx;
    // "this <day>" means the coming one, even if it's today
    if (diff < 0) diff += 7;
    if (diff === 0) diff = 0; // "this Tuesday" on Tuesday = today
    return toISO(addDays(now, diff));
  }

  // ── "this weekend" ───────────────────────────────────────────────────
  if (/\bthis\s+weekend\b/i.test(lower)) {
    return toISO(thisWeekend(now));
  }

  // ── "next week" ──────────────────────────────────────────────────────
  if (/\bnext\s+week\b/i.test(lower)) {
    return toISO(addWeeks(now, 1));
  }

  // ── "next month" ─────────────────────────────────────────────────────
  if (/\bnext\s+month\b/i.test(lower)) {
    return toISO(addMonths(now, 1));
  }

  // ── "in <N> weeks" / "in a few weeks" / "in two weeks" ───────────────
  const inWeeksRegex =
    /\bin\s+(a few|one|two|three|four|five|six|seven|eight|\d+)\s+weeks?\b/i;
  const inWeeksMatch = lower.match(inWeeksRegex);
  if (inWeeksMatch) {
    const raw = inWeeksMatch[1].toLowerCase();
    const n = WORD_TO_NUMBER[raw] ?? parseInt(raw, 10);
    if (!isNaN(n) && n > 0) {
      return toISO(addWeeks(now, n));
    }
  }

  // ── "in <N> days" / "in a few days" ──────────────────────────────────
  const inDaysRegex =
    /\bin\s+(a few|one|two|three|four|five|six|seven|eight|\d+)\s+days?\b/i;
  const inDaysMatch = lower.match(inDaysRegex);
  if (inDaysMatch) {
    const raw = inDaysMatch[1].toLowerCase();
    const n = WORD_TO_NUMBER[raw] ?? parseInt(raw, 10);
    if (!isNaN(n) && n > 0) {
      return toISO(addDays(now, n));
    }
  }

  // ── "in <N> months" / "in a month" ───────────────────────────────────
  const inMonthsRegex =
    /\bin\s+(a|one|two|three|four|five|six|\d+)\s+months?\b/i;
  const inMonthsMatch = lower.match(inMonthsRegex);
  if (inMonthsMatch) {
    const raw = inMonthsMatch[1].toLowerCase();
    const n = WORD_TO_NUMBER[raw] ?? parseInt(raw, 10);
    if (!isNaN(n) && n > 0) {
      return toISO(addMonths(now, n));
    }
  }

  return undefined;
}

// ─── Core extraction ────────────────────────────────────────────────────────

/**
 * Scan `text` for event keywords and nearby date references.
 *
 * Returns the first matched keyword and an optional date hint (ISO string
 * when parseable, raw text fragment otherwise), or null if no keyword is found.
 */
export function extractContext(
  text: string
): { keyword: string; dateHint?: string } | null {
  if (!text || text.trim().length === 0) return null;

  const lower = text.toLowerCase();

  // Find the first matching keyword
  let matchedKeyword: string | null = null;
  for (const kw of EVENT_KEYWORDS) {
    // Use word boundary for single-word keywords,
    // and a looser match for multi-word keywords like "due date"
    const pattern = kw.includes(" ")
      ? new RegExp(kw, "i")
      : new RegExp(`\\b${kw}\\b`, "i");

    if (pattern.test(lower)) {
      matchedKeyword = kw;
      break;
    }
  }

  if (!matchedKeyword) return null;

  // Try to extract a date from the full text
  const dateHint = extractDateFromText(text);

  return {
    keyword: matchedKeyword,
    dateHint: dateHint ?? undefined,
  };
}

// ─── Nudge creation ─────────────────────────────────────────────────────────

/**
 * Create a ContextualNudge from a capture.
 *
 * Calls `extractContext` on the text. If a keyword match is found, builds
 * a nudge record with the appropriate dates:
 *
 * - If an ISO date is extracted, use it as `extractedDate` and set
 *   `fallbackDate` to 1-2 days before the event.
 * - If no date is found, set `fallbackDate` to 3 weeks from now.
 *
 * Returns null if no keyword match is detected.
 */
export function createNudgeFromCapture(
  personId: string,
  memoryId: string,
  text: string
): ContextualNudge | null {
  const result = extractContext(text);
  if (!result) return null;

  const now = new Date();
  const createdAt = now.toISOString();
  const id = `nudge-${personId}-${Date.now()}`;

  let extractedDate: string | undefined;
  let fallbackDate: string;

  if (result.dateHint) {
    // dateHint is already an ISO date string (YYYY-MM-DD) from extractDateFromText
    extractedDate = result.dateHint;

    // Set fallbackDate to 1-2 days before the event
    // Use 1 day before as default
    const eventDate = new Date(result.dateHint + "T00:00:00");
    const daysBefore = eventDate > addDays(now, 2) ? 2 : 1;
    const reminderDate = addDays(eventDate, -daysBefore);

    // If the reminder date is in the past (event is very soon), use today
    fallbackDate =
      reminderDate < now ? toISO(now) : toISO(reminderDate);
  } else {
    // No date detected — assume near-future event, schedule 3 weeks out
    fallbackDate = toISO(addWeeks(now, 3));
  }

  const nudge: ContextualNudge = {
    id,
    personId,
    sourceMemoryId: memoryId,
    keyword: result.keyword,
    extractedDate,
    fallbackDate,
    surfaced: false,
    createdAt,
  };

  return nudge;
}

// ─── Store operations ───────────────────────────────────────────────────────

/** Add a nudge to the module-level store. */
export function addNudge(nudge: ContextualNudge): void {
  _nudges.push(nudge);
}

/** Get all nudges for a specific person. */
export function getNudgesForPerson(personId: string): ContextualNudge[] {
  return _nudges.filter((n) => n.personId === personId);
}

/**
 * Get upcoming nudges: those with an extractedDate or fallbackDate
 * within the next 7 days that have not yet been surfaced.
 */
export function getUpcomingNudges(): ContextualNudge[] {
  const now = new Date();
  const sevenDaysOut = addDays(now, 7);
  const todayISO = toISO(now);
  const sevenDaysISO = toISO(sevenDaysOut);

  return _nudges.filter((nudge) => {
    if (nudge.surfaced) return false;

    // Use extractedDate if available, otherwise fallbackDate
    const relevantDate = nudge.extractedDate ?? nudge.fallbackDate;

    // Check if the date falls within [today, today + 7 days]
    return relevantDate >= todayISO && relevantDate <= sevenDaysISO;
  });
}

/** Mark a nudge as surfaced so it won't appear in upcoming nudges again. */
export function markNudgeSurfaced(nudgeId: string): void {
  const nudge = _nudges.find((n) => n.id === nudgeId);
  if (nudge) {
    nudge.surfaced = true;
  }
}

/** Get all nudges in the store (for debugging or admin views). */
export function getAllNudges(): ContextualNudge[] {
  return [..._nudges];
}
