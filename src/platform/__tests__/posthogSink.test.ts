// F0-D4: the PostHog sink sends exactly the typed event and its schema
// props, under an anonymous per-install id, and nothing else.
import { createPostHogSink, resetAnalyticsInstallId } from "@/platform/posthogSink";
import { startAnalytics } from "@/platform/analyticsSetup";
import { setAnalyticsSink, track } from "@/platform/analytics";
import { files } from "@/test-utils/memoryFileSystem";

jest.mock("expo-file-system", () => require("@/test-utils/memoryFileSystem"));
jest.mock("expo-crypto", () => {
  let n = 0;
  return { randomUUID: () => `install-${++n}` };
});

const calls: { url: string; body: Record<string, unknown> }[] = [];
const fakeFetch = jest.fn((url: string, init: { body: string }) => {
  calls.push({ url, body: JSON.parse(init.body) });
  return Promise.resolve(new Response("{}"));
}) as unknown as typeof fetch;
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  calls.length = 0;
  files.clear();
  resetAnalyticsInstallId();
});
afterAll(() => setAnalyticsSink());

it("sends exactly the event, its schema props and the privacy flags", async () => {
  setAnalyticsSink(
    createPostHogSink({
      apiKey: "phc_test",
      host: "https://eu.i.posthog.com/",
      fetchImpl: fakeFetch,
      now: () => new Date("2026-10-02T10:00:00Z"),
    })
  );
  track("consent_changed", { scope: "ai_processing", granted: true });
  await flush();
  expect(calls).toEqual([
    {
      url: "https://eu.i.posthog.com/i/v0/e/",
      body: {
        api_key: "phc_test",
        event: "consent_changed",
        distinct_id: expect.stringMatching(/^install-\d+$/),
        timestamp: "2026-10-02T10:00:00.000Z",
        properties: {
          scope: "ai_processing",
          granted: true,
          $process_person_profile: false,
          $geoip_disable: true,
        },
      },
    },
  ]);
});

it("the install id is stable, and resets after the sign-out wipe", async () => {
  setAnalyticsSink(createPostHogSink({ apiKey: "k", host: "https://h", fetchImpl: fakeFetch }));
  track("undo_capture");
  track("undo_capture");
  await flush();
  files.clear(); // the sign-out wipe deletes the on-device store…
  resetAnalyticsInstallId(); // …and clearAllLocalUserData drops the cache
  track("undo_capture");
  await flush();
  const [a, b, c] = calls.map((call) => call.body.distinct_id);
  expect(a).toBe(b);
  expect(c).not.toBe(a);
});

it("a failing network never throws into the app", async () => {
  const failing = jest.fn(() => Promise.reject(new Error("offline"))) as unknown as typeof fetch;
  setAnalyticsSink(createPostHogSink({ apiKey: "k", host: "https://h", fetchImpl: failing }));
  expect(() => track("undo_capture")).not.toThrow();
  await flush();
});

describe("global switch", () => {
  it("is off without EXPO_PUBLIC_ANALYTICS_ENABLED=true, even with a key", () => {
    expect(startAnalytics({ EXPO_PUBLIC_POSTHOG_KEY: "phc_x" })).toBe(false);
    expect(startAnalytics({ EXPO_PUBLIC_ANALYTICS_ENABLED: "1", EXPO_PUBLIC_POSTHOG_KEY: "phc_x" })).toBe(false);
  });
  it("is off without a key", () => {
    expect(startAnalytics({ EXPO_PUBLIC_ANALYTICS_ENABLED: "true" })).toBe(false);
  });
  it("is on only with both", () => {
    expect(startAnalytics({ EXPO_PUBLIC_ANALYTICS_ENABLED: "true", EXPO_PUBLIC_POSTHOG_KEY: "phc_x" }, { stalls: false })).toBe(true);
    setAnalyticsSink();
  });
});
