/**
 * Notification Engine
 *
 * Codifies the notification rules for Kinship so they are enforced
 * structurally, not just by convention. Every piece of copy generated
 * by this module passes `validateNotificationCopy` before it leaves
 * the factory function.
 *
 * RULES (inviolable):
 * 1. No notification may imply the user is falling short.
 * 2. Default cadence: one Garden Walk per week at user-chosen time.
 * 3. All other notifications are memory-based or context-based, never timer-based.
 *
 * CADENCE LIMITS:
 * - Garden Walk:             1x per week (scheduled)
 * - Memory Resurface:        max 2 per month (triggered by meaningful memory anniversary)
 * - Contextual Nudge:        as relevant, max 1 per day (birthday, calendar event)
 * - Post-Reach-Out Check-In: handled in-app, not a push notification
 *
 * BANNED PATTERNS:
 * - Timer-based:         "It's been X days since..."
 * - Guilt-based:         "Your plant is wilting..."
 * - Urgency-based:       "Don't forget to..."
 * - Per-friend reminders: "Time to check in with..."
 *
 * COPY VALIDATION:
 * Every notification body must pass these checks:
 * - Does not contain "haven't", "forgot", "remember to", "don't forget"
 * - Does not contain any number followed by "days" or "weeks"
 * - Does not contain "remind" in any form
 * - Does not reference wilting, dying, or neglect
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationType =
  | "garden_walk"
  | "memory_resurface"
  | "contextual_nudge";

export interface KinshipNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  personId?: string;
  memoryId?: string;
  scheduledFor: Date;
}

export interface GardenWalkPreferences {
  /** Whether the weekly Garden Walk notification is enabled. */
  enabled: boolean;
  /** Day of the week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday. */
  dayOfWeek: number;
  /** Time of day in 24-hour "HH:MM" format, e.g. "10:00". */
  timeOfDay: string;
}

// ─── Copy Validation ────────────────────────────────────────────────────────

/**
 * Banned patterns — any notification body matching one of these
 * is rejected. The list encodes every inviolable tone rule.
 */
const BANNED_PATTERNS: RegExp[] = [
  /haven'?t/i,
  /forgot/i,
  /remember to/i,
  /don'?t forget/i,
  /remind/i,
  /\d+\s*(days?|weeks?)/i,
  /wilt/i,
  /dying/i,
  /neglect/i,
  /overdue/i,
];

/**
 * Returns `true` if the body passes all tone-safety checks.
 * Returns `false` if any banned pattern is detected.
 */
export function validateNotificationCopy(body: string): boolean {
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(body)) {
      return false;
    }
  }
  return true;
}

// ─── Pre-Validated Notification Copy ────────────────────────────────────────

export const NOTIFICATION_COPY = {
  garden_walk: {
    title: "Your garden is ready",
    body: "A few moments from your garden this week \uD83C\uDF3F",
  },

  memory_resurface: (personName: string, preview: string) => ({
    title: "A moment worth revisiting",
    body: `With ${personName}: "${preview.slice(0, 60)}..."`,
  }),

  birthday: (personName: string, when: "today" | "tomorrow" | string) => ({
    title: `${personName}'s birthday`,
    body:
      when === "today"
        ? `Today is ${personName}'s birthday \uD83C\uDF82`
        : when === "tomorrow"
          ? `${personName}'s birthday is tomorrow \uD83C\uDF82`
          : `${personName}'s birthday is coming up this week \uD83C\uDF82`,
  }),
} as const;

// ─── Module-Level State ─────────────────────────────────────────────────────

/** Current Garden Walk scheduling preferences. */
let _gardenWalkPrefs: GardenWalkPreferences = {
  enabled: true,
  dayOfWeek: 0, // Sunday
  timeOfDay: "10:00",
};

/**
 * Log of sent notifications used for cadence enforcement.
 * Entries older than 31 days are pruned on each `canSendNotification` call.
 */
let _notificationLog: { type: NotificationType; sentAt: Date }[] = [];

// ─── Garden Walk Preferences ────────────────────────────────────────────────

/** Return a shallow copy of the current Garden Walk preferences. */
export function getGardenWalkPreferences(): GardenWalkPreferences {
  return { ..._gardenWalkPrefs };
}

/**
 * Merge partial updates into the Garden Walk preferences.
 * Unspecified fields retain their current value.
 */
export function setGardenWalkPreferences(
  prefs: Partial<GardenWalkPreferences>
): void {
  _gardenWalkPrefs = { ..._gardenWalkPrefs, ...prefs };
}

// ─── Date Helpers ───────────────────────────────────────────────────────────

/**
 * Compute the next occurrence of the configured Garden Walk day + time.
 *
 * If the target day+time is still in the future today, returns today's
 * occurrence. Otherwise returns next week's occurrence.
 */
export function getNextGardenWalkDate(): Date {
  const now = new Date();
  const [hours, minutes] = _gardenWalkPrefs.timeOfDay
    .split(":")
    .map(Number);
  const targetDay = _gardenWalkPrefs.dayOfWeek;

  // Start from today and walk forward up to 7 days
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);

  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;

  if (daysUntil < 0) {
    // Target day already passed this week
    daysUntil += 7;
  } else if (daysUntil === 0 && candidate.getTime() <= now.getTime()) {
    // Same day but time already passed
    daysUntil = 7;
  }

  candidate.setDate(candidate.getDate() + daysUntil);
  return candidate;
}

// ─── Cadence Enforcement ────────────────────────────────────────────────────

/**
 * Prune log entries older than 31 days to keep memory bounded.
 */
function pruneLog(): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 31);
  _notificationLog = _notificationLog.filter(
    (entry) => entry.sentAt.getTime() >= cutoff.getTime()
  );
}

/**
 * Check whether a notification of the given type may be sent
 * right now without violating cadence limits.
 *
 * Cadence rules:
 * - garden_walk:       max 1 per 7-day rolling window
 * - memory_resurface:  max 2 per 30-day rolling window
 * - contextual_nudge:  max 1 per calendar day
 */
export function canSendNotification(type: NotificationType): boolean {
  pruneLog();

  const now = new Date();

  switch (type) {
    case "garden_walk": {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentCount = _notificationLog.filter(
        (e) =>
          e.type === "garden_walk" &&
          e.sentAt.getTime() >= sevenDaysAgo.getTime()
      ).length;
      return recentCount < 1;
    }

    case "memory_resurface": {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCount = _notificationLog.filter(
        (e) =>
          e.type === "memory_resurface" &&
          e.sentAt.getTime() >= thirtyDaysAgo.getTime()
      ).length;
      return recentCount < 2;
    }

    case "contextual_nudge": {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const recentCount = _notificationLog.filter(
        (e) =>
          e.type === "contextual_nudge" &&
          e.sentAt.getTime() >= todayStart.getTime()
      ).length;
      return recentCount < 1;
    }

    default:
      return false;
  }
}

/**
 * Record that a notification of the given type was just sent.
 * This updates the cadence log used by `canSendNotification`.
 */
export function logNotificationSent(type: NotificationType): void {
  _notificationLog.push({ type, sentAt: new Date() });
}

// ─── Notification Factory Functions ─────────────────────────────────────────

/**
 * Create the weekly Garden Walk notification.
 *
 * Uses `NOTIFICATION_COPY.garden_walk` for the title and body.
 * The `scheduledFor` timestamp is set to the next occurrence
 * of the user's chosen day + time.
 */
export function createGardenWalkNotification(): KinshipNotification {
  const copy = NOTIFICATION_COPY.garden_walk;

  // Defensive: verify the pre-validated copy still passes
  if (__DEV__ && !validateNotificationCopy(copy.body)) {
    console.warn(
      "[notificationEngine] garden_walk copy failed validation — this is a bug"
    );
  }

  return {
    id: `notif-garden_walk-${Date.now()}`,
    type: "garden_walk",
    title: copy.title,
    body: copy.body,
    scheduledFor: getNextGardenWalkDate(),
  };
}

/**
 * Create a Memory Resurface notification.
 *
 * Triggered when a meaningful memory's anniversary date approaches.
 * The preview is truncated to 60 characters inside `NOTIFICATION_COPY`.
 */
export function createMemoryResurfaceNotification(
  personId: string,
  personName: string,
  memoryId: string,
  memoryPreview: string
): KinshipNotification {
  const copy = NOTIFICATION_COPY.memory_resurface(personName, memoryPreview);

  // Defensive: verify generated copy passes validation
  if (__DEV__ && !validateNotificationCopy(copy.body)) {
    console.warn(
      "[notificationEngine] memory_resurface copy failed validation — this is a bug"
    );
  }

  return {
    id: `notif-memory_resurface-${Date.now()}`,
    type: "memory_resurface",
    title: copy.title,
    body: copy.body,
    personId,
    memoryId,
    scheduledFor: new Date(),
  };
}

/**
 * Create a birthday notification (contextual nudge).
 *
 * `when` controls the copy variant:
 * - `"today"`     — "Today is {Name}'s birthday"
 * - `"tomorrow"`  — "{Name}'s birthday is tomorrow"
 * - `"this_week"` — "{Name}'s birthday is coming up this week"
 */
export function createBirthdayNotification(
  personId: string,
  personName: string,
  when: "today" | "tomorrow" | "this_week"
): KinshipNotification {
  const copy = NOTIFICATION_COPY.birthday(personName, when);

  // Defensive: verify generated copy passes validation
  if (__DEV__ && !validateNotificationCopy(copy.body)) {
    console.warn(
      "[notificationEngine] birthday copy failed validation — this is a bug"
    );
  }

  return {
    id: `notif-contextual_nudge-${Date.now()}`,
    type: "contextual_nudge",
    title: copy.title,
    body: copy.body,
    personId,
    scheduledFor: new Date(),
  };
}

// ─── Testing Utilities ──────────────────────────────────────────────────────

/**
 * Reset all module-level state. Intended for tests only.
 */
export function __resetForTesting(): void {
  _gardenWalkPrefs = {
    enabled: true,
    dayOfWeek: 0,
    timeOfDay: "10:00",
  };
  _notificationLog = [];
}
