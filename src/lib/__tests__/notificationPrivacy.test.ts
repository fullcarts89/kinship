// P0-09: nothing the user wrote ever appears on the lock screen. Every
// builder and every scheduler is exercised with recognisable capture text;
// no notification title or body may contain it.
import {
  NOTIFICATION_COPY,
  createGardenWalkNotification,
  createMemoryResurfaceNotification,
  createBirthdayNotification,
  resetNotificationLog,
} from "@/lib/notificationEngine";
import {
  scheduleGardenWalkNotification,
  scheduleBirthdayNotification,
  scheduleMemoryResurfaceNotification,
  scheduleWeeklyDigestNotification,
  schedulePostReachOutCapturePrompt,
  scheduleAmbientNotifications,
} from "@/lib/notificationService";
import type { Memory, Person } from "@/types/database";

const CAPTURE = "her biopsy results came back and she cried";
const NAME = "Maya";

const mockScheduled: { content: { title: string; body: string } }[] = [];
jest.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DATE: "date", TIME_INTERVAL: "timeInterval" },
  getPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  getAllScheduledNotificationsAsync: () => Promise.resolve([]),
  cancelScheduledNotificationAsync: () => Promise.resolve(),
  scheduleNotificationAsync: (req: { content: { title: string; body: string } }) => {
    mockScheduled.push(req);
    return Promise.resolve("id");
  },
}));
jest.mock("@/lib/localStore", () => ({
  loadCollection: () => Promise.resolve([]),
  saveCollection: () => {},
}));

function expectNoCapture(texts: string[]) {
  for (const t of texts) {
    expect(t).not.toContain(CAPTURE);
    // not even a fragment of it
    expect(t).not.toMatch(/biopsy|cried/i);
  }
}

beforeEach(() => {
  mockScheduled.length = 0;
  resetNotificationLog();
});

it("every copy entry is free of capture text", () => {
  const texts: string[] = [];
  for (const entry of Object.values(NOTIFICATION_COPY)) {
    const out =
      typeof entry === "function"
        ? (entry as (...a: string[]) => { title: string; body: string })(NAME, CAPTURE)
        : entry;
    texts.push(out.title, out.body);
  }
  expectNoCapture(texts);
});

it("memory resurfacing names neither the memory nor the person", () => {
  const n = createMemoryResurfaceNotification("p1", "m1");
  expect(`${n.title} ${n.body}`).not.toContain(NAME);
  expect(n.personId).toBe("p1");
  expect(n.memoryId).toBe("m1");
});

it("every builder is free of capture text", () => {
  const all = [
    createGardenWalkNotification(),
    createMemoryResurfaceNotification("p1", "m1"),
    createBirthdayNotification("p1", NAME, "today"),
    createBirthdayNotification("p1", NAME, "tomorrow"),
    createBirthdayNotification("p1", NAME, "this_week"),
  ];
  expectNoCapture(all.flatMap((n) => [n.title, n.body]));
});

it("every scheduler, fed a memory full of capture text, schedules none of it", async () => {
  jest.useFakeTimers({ now: new Date("2026-10-01T12:00:00") });
  try {
    const person = { id: "p1", name: NAME } as Person;
    // An anniversary tomorrow, so ambient scheduling picks it.
    const memory = {
      id: "m1",
      person_id: "p1",
      content: CAPTURE,
      occurred_at: "2025-10-02T12:00:00",
      created_at: "2025-10-02T12:00:00",
      emotion: "grateful",
      photo_url: null,
    } as unknown as Memory;

    await scheduleAmbientNotifications([memory], [person]);
    const ambient = mockScheduled.length;
    resetNotificationLog();
    await scheduleGardenWalkNotification();
    resetNotificationLog();
    await scheduleBirthdayNotification("p1", NAME, "today");
    resetNotificationLog();
    await scheduleMemoryResurfaceNotification("p1", "m1");
    resetNotificationLog();
    await scheduleWeeklyDigestNotification();
    resetNotificationLog();
    await schedulePostReachOutCapturePrompt("p1", NAME);

    // Ambient scheduling really did surface the memory (digest + resurface).
    expect(ambient).toBe(2);
    expect(mockScheduled.length).toBe(7);
    expectNoCapture(mockScheduled.flatMap((r) => [r.content.title, r.content.body]));
  } finally {
    jest.useRealTimers();
  }
});
