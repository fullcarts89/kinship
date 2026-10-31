// The dev-only notification preview (WS-3): inert in any build without EXPO_PUBLIC_E2E_LOCAL=1; in a local test
// build it schedules today's Moment notification with the real, private content in a few seconds.
import type { MomentScheduler, MomentSummary } from "@/lib/momentNotification";

const ben: MomentSummary = { reasonId: "birthday:ben:2026-11-01", personId: "ben", personName: "Ben", type: "birthday", person: { state: "active" } };
function fake(permission: "granted" | "denied" = "granted") {
  const scheduled: { content: { title: string; body: string; data: Record<string, unknown> }; at: Date }[] = [];
  const s: MomentScheduler = {
    permission: async () => permission, request: async () => permission, scheduled: async () => [], cancel: async () => undefined,
    schedule: async (content, at) => {
      scheduled.push({ content, at });
      return "n1";
    },
  };
  return { s, scheduled };
}
function load(flag: string | undefined) {
  if (flag === undefined) delete process.env.EXPO_PUBLIC_E2E_LOCAL;
  else process.env.EXPO_PUBLIC_E2E_LOCAL = flag;
  let mod!: typeof import("@/lib/momentNotification");
  jest.isolateModules(() => {
    mod = require("@/lib/momentNotification");
  });
  return mod;
}

it("a release build has no hook: it refuses and schedules nothing", async () => {
  const m = load(undefined);
  const { s, scheduled } = fake();
  expect(m.DEV_NOTIFICATION_HOOK).toBe(false);
  await expect(m.previewMomentNotification(s, ben, false)).rejects.toThrow(/local test builds/u);
  expect(scheduled).toEqual([]);
});

it("a local test build delivers today's Moment, privately, in ten seconds; the pause, a missing permission, a quiet day or a held person send nothing", async () => {
  const m = load("1");
  const { s, scheduled } = fake();
  const before = Date.now();
  expect(await m.previewMomentNotification(s, ben, false)).toBe("sent");
  expect(scheduled[0].content).toMatchObject({ title: "Kinship", body: "Something worth knowing about Ben today.", data: { type: "moment_v2" } });
  expect(scheduled[0].at.getTime() - before).toBeGreaterThanOrEqual(9_900);
  expect(await m.previewMomentNotification(s, ben, true)).toBe("paused");
  expect(await m.previewMomentNotification(s, null, false)).toBe("no_moment");
  expect(await m.previewMomentNotification(s, { ...ben, person: { state: "paused" } }, false)).toBe("no_moment");
  expect(await m.previewMomentNotification(fake("denied").s, ben, false)).toBe("no_permission");
  expect(scheduled).toHaveLength(1);
});
