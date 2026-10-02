// OBS-06: analytics accepts only closed, content-free props. The
// expect-error lines below are the type test: `npm run typecheck` fails if
// any of them ever compiles, i.e. if free text could be sent.
import { track, setAnalyticsSink, charsBucket, smallCount } from "@/platform/analytics";

const sent: [string, Record<string, unknown>][] = [];
beforeEach(() => {
  sent.length = 0;
  setAnalyticsSink({ send: (e, p) => sent.push([e, p]) });
});
afterAll(() => setAnalyticsSink());

it("sends schema events with their props", () => {
  track("consent_changed", { scope: "ai_processing", granted: true });
  track("deletion_completed", { scope: "account" });
  track("undo_capture");
  expect(sent).toEqual([
    ["consent_changed", { scope: "ai_processing", granted: true }],
    ["deletion_completed", { scope: "account" }],
    ["undo_capture", {}],
  ]);
});

it("does not compile with free text, unknown props or unknown events", () => {
  const note = "Maya's surgery is on Thursday";
  // @ts-expect-error a note is not a capture source
  track("capture_started", { source: note });
  // @ts-expect-error props outside the schema are rejected
  track("deletion_completed", { scope: "person", person_name: "Maya" });
  // @ts-expect-error events outside the schema are rejected
  track("note_saved", { text: note });
  // @ts-expect-error a raw count is not a bucket
  track("capture_completed", { source: "text", chars_bucket: note.length, offline: false });
  // @ts-expect-error settings_changed never carries a value
  track("settings_changed", { key: "appearance", value: "dark" });
  expect(true).toBe(true);
});

it("sends nothing until a provider is installed", () => {
  setAnalyticsSink();
  track("deletion_completed", { scope: "account" });
  expect(sent).toEqual([]);
});

it("a failing provider never breaks the app", () => {
  setAnalyticsSink({ send: () => { throw new Error("offline"); } });
  expect(() => track("undo_capture")).not.toThrow();
});

it("buckets numbers instead of sending them", () => {
  expect([charsBucket(10), charsBucket(120), charsBucket(5000)]).toEqual(["0-50", "51-200", "201+"]);
  expect([smallCount(-3), smallCount(4.7), smallCount(99)]).toEqual([0, 4, 10]);
});
