// The minimal private notification (CC-25 "Commit next" item 3, authorised by FD-30e; D4's caps the
// ceiling): the same primary Moment Today already selected, as one private local notification at a
// sensible hour, scheduled on this phone (expo-notifications; no server push, no token, no backend).
//
//   what      Today's own selection for the next notification hour (the same deterministic
//             buildToday, run for that day), so the notification never promises what Today won't show
//   content   private on the lock screen: "Kinship" · "Something worth knowing about Ben today."
//             Never the memory, never a detail; no name for a sensitive kind (none makes a Moment
//             today; the door is there for RSN-09)
//   budget    at most one a day; ≤ 3 in any 7 days; ≤ 2 time-sensitive (a day-bound Moment: a
//             birthday, an event ahead, a milestone, a promise, a first day); quiet hours 21:00–08:00;
//             back-off after the last two were put aside; a global pause (Settings › Notifications)
//   never     for inactivity, a generic "come back", engagement, a streak; never for anyone remembered
//             or paused (Today never selects them); never before permission, which is asked only after
//             a genuinely useful Moment (the first Yes to a return check, or the first Moment acted on)
//   record    what was scheduled, content-free (a day, a reason id, a kind), in the device store, so it
//             is idempotent across launches; a tap opens Today
//
// 1.0's notificationService.ts keeps scheduling 1.0's own kinds and 2.0 cancels those at launch
// (founder I8); this lives beside it under its own payload type, which that cancel leaves alone.

import type { LocalReason, ReasonType } from "@/features/today/todayModel";
import { track } from "@/platform/analytics";
import { getMeta, setMeta } from "@/store/schema";
import type { UserStore } from "@/store/userStore";

export const NOTIFY_RULES = {
  /** The hour a Moment's notification is delivered, local time. */
  hour: 9,
  /** Quiet hours: nothing is delivered from `quietFrom` to `quietUntil` (local hours). */
  quietFrom: 21,
  quietUntil: 8,
  /** D4's caps: at most this many in any seven days, and at most this many time-sensitive ones. */
  perWeek: 3,
  timeSensitivePerWeek: 2,
  /** After this many delivered in a row were put aside ("Not now"), nothing for `backOffDays`. */
  putAsideBeforeBackOff: 2,
  backOffDays: 7,
  /** The device keeps this many days of its own record. */
  keepDays: 30,
} as const;

/** The lock-screen copy (a proposal for the founder's review; private by construction). */
export const NOTIFICATION_COPY = {
  title: "Kinship",
  body: (name: string) => `Something worth knowing about ${name} today.`,
  /** Without a name: for a kind whose person should not be on the lock screen (RSN-09 later). */
  bodyPrivate: "Something worth knowing today.",
} as const;

/** The payload type 2.0 schedules; 1.0's cancel (LEGACY_TYPES) leaves it alone. */
export const MOMENT_NOTIFICATION_TYPE = "moment_v2";

/** Day-bound Moments count as time-sensitive (D4); a follow-up, good news or a check-in do not. */
const TIME_SENSITIVE: ReadonlySet<string> = new Set<ReasonType>(["birthday", "upcoming_event", "milestone", "promise", "starts_today"]);

export interface NotificationLogEntry {
  /** The day it is for (ISO, where the user is). */
  day: string;
  /** Today's reason id for the Moment (an id, never words). */
  reasonId: string;
  type: ReasonType;
  timeSensitive: boolean;
  /** When it was set to be delivered (ISO). */
  at: string;
}

export interface MomentSummary {
  reasonId: string;
  personId: string;
  personName: string;
  type: ReasonType;
  /** True for a kind whose person should stay off the lock screen (none today). */
  sensitive?: boolean;
}

export type PermissionState = "granted" | "denied" | "undetermined";

export interface PlanInput {
  now: Date;
  /** The day the notification would be for, and when it would be delivered (NOTIFY_RULES.hour that day). */
  day: string;
  at: Date;
  /** Today's selection for that day, or null when Today would be quiet. */
  moment: MomentSummary | null;
  log: NotificationLogEntry[];
  /** This device's record of Today's reasons (put aside, acted on). */
  local: Record<string, LocalReason>;
  paused: boolean;
  permission: PermissionState;
}

export type Plan =
  | { action: "schedule"; entry: NotificationLogEntry; content: { title: string; body: string; data: { type: typeof MOMENT_NOTIFICATION_TYPE; day: string } } }
  /** The same Moment is already set for that day: nothing to do. */
  | { action: "keep"; entry: NotificationLogEntry }
  | { action: "none"; why: "paused" | "no_permission" | "past" | "quiet_hours" | "no_moment" | "budget" | "time_sensitive_budget" | "back_off" };

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const t = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

/** Whether a local hour falls in the quiet hours (21:00 through 07:59). */
export function inQuietHours(hour: number): boolean {
  return hour >= NOTIFY_RULES.quietFrom || hour < NOTIFY_RULES.quietUntil;
}

/** The next delivery time from now: today at the hour if that is still ahead, else tomorrow at the hour. */
export function nextDeliveryTime(now: Date): { day: string; at: Date } {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), NOTIFY_RULES.hour, 0, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return { day: isoDay(at), at };
}

/** Pure: whether and what to schedule for `day`, from the rules alone. */
export function planMomentNotification(input: PlanInput): Plan {
  const { now, day, at, moment, log, local } = input;
  if (input.paused) return { action: "none", why: "paused" };
  if (input.permission !== "granted") return { action: "none", why: "no_permission" };
  if (at.getTime() <= now.getTime()) return { action: "none", why: "past" };
  if (inQuietHours(at.getHours())) return { action: "none", why: "quiet_hours" };
  if (!moment) return { action: "none", why: "no_moment" };
  const existing = log.find((e) => e.day === day);
  if (existing && existing.reasonId === moment.reasonId) return { action: "keep", entry: existing };
  // The seven days ending on `day`, the entry being replaced aside.
  const week = log.filter((e) => e.day !== day && daysBetween(e.day, day) >= 0 && daysBetween(e.day, day) < 7);
  if (week.length >= NOTIFY_RULES.perWeek) return { action: "none", why: "budget" };
  const timeSensitive = TIME_SENSITIVE.has(moment.type);
  if (timeSensitive && week.filter((e) => e.timeSensitive).length >= NOTIFY_RULES.timeSensitivePerWeek) return { action: "none", why: "time_sensitive_budget" };
  // Back-off: the last few delivered, every one put aside and none acted on, the newest recent.
  const delivered = log.filter((e) => e.day !== day && Date.parse(e.at) <= now.getTime()).sort((a, b) => b.at.localeCompare(a.at));
  const recent = delivered.slice(0, NOTIFY_RULES.putAsideBeforeBackOff);
  const putAside = (e: NotificationLogEntry) => {
    const r = local[e.reasonId];
    return !!r?.dismissed && !r.acted && !r.done;
  };
  if (recent.length >= NOTIFY_RULES.putAsideBeforeBackOff && recent.every(putAside) && daysBetween(recent[0].day, day) < NOTIFY_RULES.backOffDays) {
    return { action: "none", why: "back_off" };
  }
  const entry: NotificationLogEntry = { day, reasonId: moment.reasonId, type: moment.type, timeSensitive, at: at.toISOString() };
  return {
    action: "schedule",
    entry,
    content: {
      title: NOTIFICATION_COPY.title,
      body: moment.sensitive ? NOTIFICATION_COPY.bodyPrivate : NOTIFICATION_COPY.body(moment.personName),
      data: { type: MOMENT_NOTIFICATION_TYPE, day },
    },
  };
}

// ─── The phone ──────────────────────────────────────────────────────────────

/** What the OS does for us; expo-notifications on a phone, a fake in tests. */
export interface MomentScheduler {
  permission(): Promise<PermissionState>;
  request(): Promise<PermissionState>;
  /** Every scheduled notification with its payload. */
  scheduled(): Promise<{ id: string; data: Record<string, unknown> }[]>;
  cancel(id: string): Promise<void>;
  schedule(content: { title: string; body: string; data: Record<string, unknown> }, at: Date): Promise<string>;
}

let _expo: typeof import("expo-notifications") | null | undefined;
function expo(): typeof import("expo-notifications") | null {
  if (_expo === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _expo = require("expo-notifications");
    } catch {
      _expo = null;
    }
  }
  return _expo ?? null;
}

function stateOf(status: string): PermissionState {
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

/** expo-notifications, lazily; every call a no-op where the module is missing (web, Jest). */
export function expoScheduler(): MomentScheduler {
  return {
    async permission() {
      const N = expo();
      if (!N) return "denied";
      try {
        return stateOf((await N.getPermissionsAsync()).status);
      } catch {
        return "denied";
      }
    },
    async request() {
      const N = expo();
      if (!N) return "denied";
      try {
        return stateOf((await N.requestPermissionsAsync()).status);
      } catch {
        return "denied";
      }
    },
    async scheduled() {
      const N = expo();
      if (!N) return [];
      return (await N.getAllScheduledNotificationsAsync()).map((n) => ({ id: n.identifier, data: (n.content.data ?? {}) as Record<string, unknown> }));
    },
    async cancel(id) {
      await expo()?.cancelScheduledNotificationAsync(id);
    },
    async schedule(content, at) {
      const N = expo();
      if (!N) return "";
      return N.scheduleNotificationAsync({
        content: { title: content.title, body: content.body, data: content.data, sound: false },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at },
      });
    },
  };
}

const LOG = "notif_v2_log";
const ASKED = "notif_v2_asked";

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** This device's content-free record of what it scheduled. */
export async function readNotificationLog(store: UserStore): Promise<NotificationLogEntry[]> {
  return parse<NotificationLogEntry[]>(await getMeta(store.db, LOG), []).filter((e) => e && typeof e.day === "string" && typeof e.reasonId === "string");
}

async function writeNotificationLog(store: UserStore, log: NotificationLogEntry[], today: string): Promise<void> {
  const kept = log.filter((e) => daysBetween(e.day, today) <= NOTIFY_RULES.keepDays).sort((a, b) => a.day.localeCompare(b.day));
  await setMeta(store.db, LOG, JSON.stringify(kept));
}

export interface ScheduleDeps {
  store: UserStore;
  scheduler: MomentScheduler;
  /** Today's selection for a day at a time: the same buildToday the screen uses. */
  momentFor: (day: string, at: Date) => Promise<MomentSummary | null>;
  local: () => Promise<Record<string, LocalReason>>;
  paused: () => Promise<boolean>;
  now?: () => Date;
}

/**
 * Plans and applies the next notification: cancels what was set for another day or another Moment,
 * schedules at most one, and records it. Safe to run on every launch, focus and background.
 */
export async function scheduleMomentNotification(d: ScheduleDeps): Promise<Plan> {
  const now = d.now ? d.now() : new Date();
  const { day, at } = nextDeliveryTime(now);
  const [log, local, paused, permission] = await Promise.all([readNotificationLog(d.store), d.local(), d.paused(), d.scheduler.permission()]);
  const moment = paused || permission !== "granted" ? null : await d.momentFor(day, at);
  const plan = planMomentNotification({ now, day, at, moment, log, local, paused, permission });
  const pending = (await d.scheduler.scheduled()).filter((n) => n.data.type === MOMENT_NOTIFICATION_TYPE);
  if (plan.action === "keep") {
    // Already set on the phone too? If the OS lost it (a reinstall), set it again without a new record.
    if (!pending.some((n) => n.data.day === day)) await d.scheduler.schedule(contentFor(plan.entry, moment), at);
    for (const n of pending) if (n.data.day !== day) await d.scheduler.cancel(n.id);
    return plan;
  }
  // Anything still pending is for another day or a Moment Today no longer picks.
  for (const n of pending) await d.scheduler.cancel(n.id);
  const future = log.filter((e) => !(e.day === day && Date.parse(e.at) > now.getTime()));
  if (plan.action === "schedule") {
    await d.scheduler.schedule(plan.content, at);
    await writeNotificationLog(d.store, [...future, plan.entry], isoDay(now));
    track("push_sent", { tier: plan.entry.timeSensitive ? "normal" : "quiet" });
  } else {
    await writeNotificationLog(d.store, future, isoDay(now));
  }
  return plan;
}

function contentFor(entry: NotificationLogEntry, moment: MomentSummary | null): { title: string; body: string; data: Record<string, unknown> } {
  return {
    title: NOTIFICATION_COPY.title,
    body: moment && !moment.sensitive ? NOTIFICATION_COPY.body(moment.personName) : NOTIFICATION_COPY.bodyPrivate,
    data: { type: MOMENT_NOTIFICATION_TYPE, day: entry.day },
  };
}

/**
 * The permission moment (PUSH-08; CC-25): asked once, only after a genuinely useful Moment (the caller
 * decides when: the first Yes, or the first Moment acted on), never for inactivity. Granted turns the
 * setting on; refused leaves it, and iOS Settings is the way back. Returns the state, or null when it
 * was asked before.
 */
export async function askNotificationPermissionOnce(
  store: UserStore, scheduler: MomentScheduler, turnOn: () => Promise<unknown>,
): Promise<PermissionState | null> {
  if (await getMeta(store.db, ASKED)) return null;
  await setMeta(store.db, ASKED, new Date().toISOString());
  const before = await scheduler.permission();
  const state = before === "undetermined" ? await scheduler.request() : before;
  if (state === "granted") await turnOn();
  track("consent_changed", { scope: "notifications", granted: state === "granted" });
  return state;
}

/** Whether the permission moment has happened on this phone. */
export async function notificationPermissionAsked(store: UserStore): Promise<boolean> {
  return !!(await getMeta(store.db, ASKED));
}

/** Where a tapped 2.0 notification leads: Today. Null for anything else. */
export function momentNotificationRoute(data: Record<string, unknown>): string | null {
  return data.type === MOMENT_NOTIFICATION_TYPE ? "/v2" : null;
}
