// The minimal private notification (CC-25 item 3, FD-30e): one private local notification of the Moment
// Today already selected, at 9:00, under D4's caps (≤ 3 in 7 days, ≤ 2 time-sensitive), quiet hours,
// back-off after put-asides, a global pause; permission only after a genuinely useful Moment, once;
// content never the memory; idempotent across launches through the device's own content-free record.
import { randomUUID } from "crypto";
import {
  askNotificationPermissionOnce, inQuietHours, MOMENT_NOTIFICATION_TYPE, momentNotificationRoute, nextDeliveryTime, NOTIFICATION_COPY, NOTIFY_RULES,
  notificationPermissionAsked, planMomentNotification, readNotificationLog, scheduleMomentNotification,
  type MomentScheduler, type MomentSummary, type NotificationLogEntry, type PermissionState, type PlanInput,
} from "@/lib/momentNotification";
import { setAnalyticsSink } from "@/platform/analytics";
import { prepareSchema } from "@/store/schema";
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-00000000c0de";
// Sunday Nov 1 2026, 7:30 local: the 9:00 delivery is still ahead.
const NOW = new Date(2026, 10, 1, 7, 30);
const AT = new Date(2026, 10, 1, 9, 0);
const ben: MomentSummary = { reasonId: "birthday:ben:2026-11-01", personId: "ben", personName: "Ben", type: "birthday" };
const thread: MomentSummary = { reasonId: "thread:t1:2026-09-20", personId: "felix", personName: "Felix", type: "thread" };
const entry = (day: string, type: MomentSummary["type"], reasonId = `${type}:${day}`, hour = 9): NotificationLogEntry =>
  ({ day, reasonId, type, timeSensitive: ["birthday", "upcoming_event", "milestone", "promise", "starts_today"].includes(type), at: new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), hour).toISOString() });

function plan(over: Partial<PlanInput> = {}) {
  return planMomentNotification({ now: NOW, day: "2026-11-01", at: AT, moment: ben, log: [], local: {}, paused: false, permission: "granted", ...over });
}

describe("the plan (pure)", () => {
  it("one private notification of the Moment Today selected: 'Kinship' · 'Something worth knowing about Ben today.', never the memory", () => {
    const p = plan();
    expect(p).toEqual({
      action: "schedule",
      entry: { day: "2026-11-01", reasonId: ben.reasonId, type: "birthday", timeSensitive: true, at: AT.toISOString() },
      content: { title: "Kinship", body: "Something worth knowing about Ben today.", data: { type: MOMENT_NOTIFICATION_TYPE, day: "2026-11-01" } },
    });
    // A kind whose person should stay off the lock screen (none today; RSN-09 later) gets no name.
    const quiet = plan({ moment: { ...ben, sensitive: true } });
    expect(quiet.action === "schedule" && quiet.content.body).toBe(NOTIFICATION_COPY.bodyPrivate);
    // The payload carries a day and a type, never a person or a memory.
    expect(JSON.stringify(p)).not.toMatch(/"ben"|personId|memory/u);
  });

  it("a quiet day is quiet; the pause and a missing permission stop everything; nothing in the past or in quiet hours", () => {
    expect(plan({ moment: null })).toEqual({ action: "none", why: "no_moment" });
    expect(plan({ paused: true })).toEqual({ action: "none", why: "paused" });
    for (const permission of ["denied", "undetermined"] as PermissionState[]) expect(plan({ permission })).toEqual({ action: "none", why: "no_permission" });
    expect(plan({ now: new Date(2026, 10, 1, 9, 1) })).toEqual({ action: "none", why: "past" });
    expect(plan({ at: new Date(2026, 10, 1, 22, 0), now: new Date(2026, 10, 1, 21, 0) })).toEqual({ action: "none", why: "quiet_hours" });
    expect([inQuietHours(21), inQuietHours(3), inQuietHours(7), inQuietHours(8), inQuietHours(9), inQuietHours(20)]).toEqual([true, true, true, false, false, false]);
    expect(NOTIFY_RULES.hour).toBe(9);
  });

  it("D4's caps: at most three in any seven days, at most two time-sensitive; a quiet kind still fits after two time-sensitive ones", () => {
    const three = [entry("2026-10-26", "promise"), entry("2026-10-28", "thread"), entry("2026-10-31", "good_news")];
    expect(plan({ log: three })).toEqual({ action: "none", why: "budget" });
    // One of them eight days ago no longer counts.
    expect(plan({ log: [entry("2026-10-25", "promise"), ...three.slice(1)] }).action).toBe("schedule");
    const twoTimed = [entry("2026-10-27", "birthday"), entry("2026-10-30", "milestone")];
    expect(plan({ log: twoTimed })).toEqual({ action: "none", why: "time_sensitive_budget" });
    expect(plan({ log: twoTimed, moment: thread }).action).toBe("schedule");
    expect(NOTIFY_RULES.perWeek).toBe(3);
    expect(NOTIFY_RULES.timeSensitivePerWeek).toBe(2);
  });

  it("back-off: after the last two delivered were put aside, nothing for a week; one acted on breaks it", () => {
    const log = [entry("2026-10-29", "good_news", "news:a"), entry("2026-10-31", "thread", "thread:b")];
    const aside = { "news:a": { dismissed: "x" }, "thread:b": { dismissed: "x" } };
    expect(plan({ log, local: aside })).toEqual({ action: "none", why: "back_off" });
    expect(plan({ log, local: { "news:a": { dismissed: "x" }, "thread:b": { dismissed: "x", acted: "y" } } }).action).toBe("schedule");
    expect(plan({ log, local: { "news:a": { dismissed: "x" } } }).action).toBe("schedule");
    // A week on, it is over.
    expect(plan({ log, local: aside, day: "2026-11-07", at: new Date(2026, 10, 7, 9), now: new Date(2026, 10, 7, 7) }).action).toBe("schedule");
    // One not yet delivered (set for 9:00 today, planning tomorrow's at 7:00) doesn't count as put aside.
    const pending = [entry("2026-10-31", "good_news", "news:a"), entry("2026-11-03", "thread", "thread:b")];
    expect(plan({ log: pending, local: aside, day: "2026-11-04", at: new Date(2026, 10, 4, 9), now: new Date(2026, 10, 3, 7) }).action).toBe("schedule");
  });

  it("idempotent: the same Moment already set for the day is kept, a different one replaces it (within the budget)", () => {
    const same = entry("2026-11-01", "birthday", ben.reasonId);
    expect(plan({ log: [same] })).toEqual({ action: "keep", entry: same });
    const other = entry("2026-11-01", "thread", "thread:x");
    const p = plan({ log: [other] });
    expect(p.action).toBe("schedule");
    // The day's own entry doesn't count against its replacement.
    expect(plan({ log: [other, entry("2026-10-27", "thread"), entry("2026-10-29", "thread")] }).action).toBe("schedule");
  });

  it("delivery is the next 9:00: today before it, tomorrow after", () => {
    expect(nextDeliveryTime(new Date(2026, 10, 1, 7, 30))).toEqual({ day: "2026-11-01", at: new Date(2026, 10, 1, 9) });
    expect(nextDeliveryTime(new Date(2026, 10, 1, 9, 0))).toEqual({ day: "2026-11-02", at: new Date(2026, 10, 2, 9) });
    expect(nextDeliveryTime(new Date(2026, 10, 1, 22, 0))).toEqual({ day: "2026-11-02", at: new Date(2026, 10, 2, 9) });
    expect(momentNotificationRoute({ type: MOMENT_NOTIFICATION_TYPE, day: "2026-11-01" })).toBe("/v2");
    expect(momentNotificationRoute({ type: "weekly_digest" })).toBeNull();
  });
});

// ─── On the phone: the OS stood in by a fake; the device's record in the real encrypted store ────────

function fakeScheduler(permission: PermissionState = "granted") {
  const scheduled: { id: string; content: { title: string; body: string; data: Record<string, unknown> }; at: Date }[] = [];
  const cancelled: string[] = [];
  let requests = 0;
  const s: MomentScheduler & { scheduled$: typeof scheduled; cancelled: string[]; requests: () => number; grant: (p: PermissionState) => void } = {
    permission: async () => permission,
    request: async () => {
      requests++;
      return permission === "undetermined" ? "granted" : permission;
    },
    scheduled: async () => scheduled.map((n) => ({ id: n.id, data: n.content.data })),
    cancel: async (id) => {
      cancelled.push(id);
      const i = scheduled.findIndex((n) => n.id === id);
      if (i >= 0) scheduled.splice(i, 1);
    },
    schedule: async (content, at) => {
      const id = `n${scheduled.length + cancelled.length + 1}`;
      scheduled.push({ id, content, at });
      return id;
    },
    scheduled$: scheduled, cancelled, requests: () => requests, grant: (p) => { permission = p; },
  };
  return s;
}

async function device() {
  const db = await openSqlJsDb(`notif-${randomUUID()}`);
  await prepareSchema(db, A);
  return new UserStore(db, A, { now: () => NOW.toISOString(), newId: randomUUID });
}

const sent: [string, Record<string, unknown>][] = [];
beforeEach(() => {
  sent.length = 0;
  setAnalyticsSink({ send: (e, p) => sent.push([e, p]) });
});
afterAll(() => setAnalyticsSink());

it("schedules once for the day and records it; a second run keeps it; a changed Moment replaces it; a quiet day cancels it", async () => {
  const store = await device();
  const os = fakeScheduler();
  let moment: MomentSummary | null = ben;
  const run = (now = NOW) => scheduleMomentNotification({ store, scheduler: os, momentFor: async () => moment, local: async () => ({}), paused: async () => false, now: () => now });
  expect((await run()).action).toBe("schedule");
  expect(os.scheduled$).toHaveLength(1);
  expect(os.scheduled$[0].at).toEqual(AT);
  expect(os.scheduled$[0].content).toEqual({ title: "Kinship", body: "Something worth knowing about Ben today.", data: { type: MOMENT_NOTIFICATION_TYPE, day: "2026-11-01" } });
  expect(await readNotificationLog(store)).toEqual([{ day: "2026-11-01", reasonId: ben.reasonId, type: "birthday", timeSensitive: true, at: AT.toISOString() }]);
  expect(sent).toEqual([["push_sent", { tier: "normal" }]]);
  // Again (a relaunch): nothing new.
  expect((await run()).action).toBe("keep");
  expect(os.scheduled$).toHaveLength(1);
  expect(sent).toHaveLength(1);
  // Today now picks something else for the day: the old one is cancelled, the new one set, one record.
  moment = thread;
  expect((await run()).action).toBe("schedule");
  expect(os.cancelled).toEqual(["n1"]);
  expect(os.scheduled$.map((n) => n.content.body)).toEqual(["Something worth knowing about Felix today."]);
  expect((await readNotificationLog(store)).map((e) => e.reasonId)).toEqual([thread.reasonId]);
  // A quiet day after all: nothing pending, nothing recorded for it.
  moment = null;
  expect(await run()).toEqual({ action: "none", why: "no_moment" });
  expect(os.scheduled$).toHaveLength(0);
  expect(await readNotificationLog(store)).toEqual([]);
});

it("the pause and a missing permission schedule nothing and never ask", async () => {
  const store = await device();
  const os = fakeScheduler("undetermined");
  let asked = 0;
  const momentFor = async () => {
    asked++;
    return ben;
  };
  const deps = { store, scheduler: os, momentFor, local: async () => ({}), now: () => NOW };
  expect(await scheduleMomentNotification({ ...deps, paused: async () => false })).toEqual({ action: "none", why: "no_permission" });
  os.grant("granted");
  expect(await scheduleMomentNotification({ ...deps, paused: async () => true })).toEqual({ action: "none", why: "paused" });
  expect([asked, os.requests(), os.scheduled$.length]).toEqual([0, 0, 0]);
});

it("the permission moment: asked once, after a useful Moment; granted turns the setting on; refused leaves it", async () => {
  const store = await device();
  const os = fakeScheduler("undetermined");
  const turnedOn = jest.fn(async () => undefined);
  expect(await notificationPermissionAsked(store)).toBe(false);
  expect(await askNotificationPermissionOnce(store, os, turnedOn)).toBe("granted");
  expect(turnedOn).toHaveBeenCalledTimes(1);
  expect(await notificationPermissionAsked(store)).toBe(true);
  expect(sent).toEqual([["consent_changed", { scope: "notifications", granted: true }]]);
  // Never twice.
  expect(await askNotificationPermissionOnce(store, os, turnedOn)).toBeNull();
  expect(os.requests()).toBe(1);
  // Refused: nothing turned on, asked no more.
  const other = await device();
  const no = fakeScheduler("denied");
  const on = jest.fn(async () => undefined);
  expect(await askNotificationPermissionOnce(other, no, on)).toBe("denied");
  expect(on).not.toHaveBeenCalled();
  expect(await askNotificationPermissionOnce(other, no, on)).toBeNull();
});
