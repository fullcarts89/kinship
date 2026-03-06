/**
 * Notification Service
 *
 * Bridges the notification engine (copy, cadence, factory functions) to
 * the actual expo-notifications scheduling API. All functions gracefully
 * no-op if expo-notifications is not installed, so the rest of the app
 * compiles and runs without it.
 *
 * Usage:
 *   import { setupNotificationHandler, scheduleGardenWalkNotification } from "@/lib/notificationService";
 */

import {
  canSendNotification,
  logNotificationSent,
  createGardenWalkNotification,
  createBirthdayNotification,
  createMemoryResurfaceNotification,
  getNextGardenWalkDate,
  getGardenWalkPreferences,
} from "@/lib/notificationEngine";

// ─── Lazy Require ────────────────────────────────────────────────────────────

/**
 * Lazily require expo-notifications so the module compiles even when
 * the package is not yet installed. Every public function checks
 * `getNotifications()` before touching the API.
 */
let _Notifications: typeof import("expo-notifications") | null = null;
let _resolved = false;

function getNotifications(): typeof import("expo-notifications") | null {
  if (!_resolved) {
    _resolved = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _Notifications = require("expo-notifications");
    } catch {
      _Notifications = null;
    }
  }
  return _Notifications;
}

// ─── Permissions ─────────────────────────────────────────────────────────────

/**
 * Request notification permissions from the OS.
 *
 * Returns `true` if permission was granted, `false` otherwise.
 * Returns `false` (no-op) if expo-notifications is unavailable.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Scheduling ──────────────────────────────────────────────────────────────

/**
 * Schedule the weekly Garden Walk push notification.
 *
 * Cancels any previously scheduled Garden Walk notifications first,
 * then creates a new one at the user's preferred day + time.
 * Respects the engine's cadence check (`canSendNotification`).
 *
 * No-ops silently if:
 * - expo-notifications is unavailable
 * - Garden Walk notifications are disabled in preferences
 * - The cadence limit has been reached
 */
export async function scheduleGardenWalkNotification(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const prefs = getGardenWalkPreferences();
  if (!prefs.enabled) return;

  if (!canSendNotification("garden_walk")) return;

  const notification = createGardenWalkNotification();
  const triggerDate = getNextGardenWalkDate();

  // Cancel existing Garden Walk notifications before scheduling a new one
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const existing of scheduled) {
    if (
      existing.content.data &&
      (existing.content.data as Record<string, unknown>).type === "garden_walk"
    ) {
      await Notifications.cancelScheduledNotificationAsync(
        existing.identifier
      );
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: {
        type: notification.type,
        id: notification.id,
      },
    },
    trigger: {
      type: "date" as const,
      date: triggerDate,
    },
  });

  logNotificationSent("garden_walk");
}

/**
 * Schedule a birthday notification (contextual nudge).
 *
 * `when` controls the copy variant:
 * - `"today"`     — fires immediately
 * - `"tomorrow"`  — fires immediately (the copy says "tomorrow")
 * - `"this_week"` — fires immediately (the copy says "this week")
 */
export async function scheduleBirthdayNotification(
  personId: string,
  personName: string,
  when: "today" | "tomorrow" | "this_week"
): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  if (!canSendNotification("contextual_nudge")) return;

  const notification = createBirthdayNotification(personId, personName, when);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: {
        type: notification.type,
        id: notification.id,
        personId: notification.personId,
      },
    },
    trigger: null, // Fire immediately
  });

  logNotificationSent("contextual_nudge");
}

/**
 * Schedule a memory resurface notification.
 *
 * Triggered when a meaningful memory anniversary approaches.
 * Fires immediately — the engine already validated the timing.
 */
export async function scheduleMemoryResurfaceNotification(
  personId: string,
  personName: string,
  memoryId: string,
  preview: string
): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  if (!canSendNotification("memory_resurface")) return;

  const notification = createMemoryResurfaceNotification(
    personId,
    personName,
    memoryId,
    preview
  );

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: {
        type: notification.type,
        id: notification.id,
        personId: notification.personId,
        memoryId: notification.memoryId,
      },
    },
    trigger: null, // Fire immediately
  });

  logNotificationSent("memory_resurface");
}

// ─── Cancellation ────────────────────────────────────────────────────────────

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Handler Setup ───────────────────────────────────────────────────────────

/**
 * Configure the default notification handler so notifications are
 * displayed even when the app is in the foreground.
 *
 * Call once on app startup (e.g. in the root layout's `useEffect`).
 */
export function setupNotificationHandler(): void {
  const Notifications = getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// ─── Response Listener ───────────────────────────────────────────────────────

/**
 * Register a listener for when the user taps a notification.
 *
 * Returns a subscription object whose `.remove()` method should be
 * called on cleanup. Returns `null` if expo-notifications is unavailable.
 *
 * The callback receives the notification response, which contains
 * `response.notification.request.content.data` with our custom payload.
 */
export function addNotificationResponseListener(
  callback: (response: { notification: { request: { content: { data: Record<string, unknown> } } } }) => void
): { remove: () => void } | null {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      callback({
        notification: {
          request: {
            content: {
              data: (response.notification.request.content.data ?? {}) as Record<string, unknown>,
            },
          },
        },
      });
    }
  );

  return subscription;
}
