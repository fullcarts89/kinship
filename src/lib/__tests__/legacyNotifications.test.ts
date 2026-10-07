// Founder I8: 1.0's notifications (scheduled by 1.0's Home) are a door back
// into 1.0. The 2.0 shell drops the ones still scheduled on the phone, and a
// tapped one opens a 1.0 screen only in a 1.0 session (useFlags'
// legacyRoutesAllowed, covered in app/__tests__/launchRouting.test.tsx).
import { cancelLegacyNotifications, notificationRoute } from "@/lib/notificationService";

const mockScheduled: { identifier: string; content: { data: Record<string, unknown> } }[] = [];
const mockCancelled: string[] = [];
jest.mock("expo-notifications", () => ({
  getAllScheduledNotificationsAsync: () => Promise.resolve(mockScheduled),
  cancelScheduledNotificationAsync: (id: string) => {
    mockCancelled.push(id);
    return Promise.resolve();
  },
}));

beforeEach(() => {
  mockScheduled.length = 0;
  mockCancelled.length = 0;
});

it("drops every 1.0 notification still scheduled, and nothing else", async () => {
  mockScheduled.push(
    { identifier: "digest", content: { data: { type: "weekly_digest" } } },
    { identifier: "resurface", content: { data: { type: "memory_resurface", memoryId: "m1" } } },
    { identifier: "walk", content: { data: { type: "garden_walk", id: "g1" } } },
    { identifier: "prompt", content: { data: { type: "memory_capture_prompt", personId: "p1" } } },
    { identifier: "someone", content: { data: { personId: "p2" } } },
    { identifier: "other", content: { data: { kind: "not-ours" } } },
  );
  await cancelLegacyNotifications();
  expect(mockCancelled.sort()).toEqual(["digest", "prompt", "resurface", "someone", "walk"]);
});

it("knows where each 1.0 notification leads (used only in a 1.0 session)", () => {
  expect(notificationRoute({ type: "memory_capture_prompt", personId: "p1" })).toBe("/memory/add?personId=p1");
  expect(notificationRoute({ type: "memory_resurface", memoryId: "m1" })).toBe("/memory/m1");
  expect(notificationRoute({ type: "weekly_digest" })).toBe("/activity");
  expect(notificationRoute({ type: "garden_walk" })).toBe("/garden-walk");
  expect(notificationRoute({ personId: "p2" })).toBe("/person/p2");
  expect(notificationRoute({})).toBeNull();
});
