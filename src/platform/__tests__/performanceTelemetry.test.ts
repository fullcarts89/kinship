// Performance-only telemetry (dogfood-v2): Tell latency by stage, failures,
// retries and stalls. Content-free, and nothing else leaves the phone.
import { randomUUID } from "crypto";
import { durationBucketOf, setAnalyticsSink, track } from "@/platform/analytics";
import { performanceOnly, startAnalytics } from "@/platform/analyticsSetup";
import { startStallMonitor, tellWork } from "@/platform/stallMonitor";
import { Gateway, serverTiming } from "@/store/gateway";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const sent: [string, Record<string, unknown>][] = [];
beforeEach(() => {
  sent.length = 0;
  setAnalyticsSink({ send: (e, p) => sent.push([e, p]) });
});
afterAll(() => setAnalyticsSink());

describe("performance scope", () => {
  it("passes only latency, failure and stall events; never feedback or behaviour", () => {
    const inner: [string, Record<string, unknown>][] = [];
    setAnalyticsSink(performanceOnly({ send: (e, p) => inner.push([e, p]) }));
    track("tell_feedback", { verdict: "not_quite", off: "wrong_person" });
    track("review_item_accepted", { tier: "auto", item_kind: "event" });
    track("capture_started", { source: "text" });
    track("handoff_opened", { channel: "text" });
    track("tell_failure", { stage: "timeout", attempt: 1, backgrounded: false });
    track("app_stall", { duration_bucket: "1-2s", tell_work: false });
    expect(inner.map(([e]) => e)).toEqual(["tell_failure", "app_stall"]);
  });

  it("CC-18: every performance event carries the coarse build and platform, nothing finer", () => {
    const inner: [string, Record<string, unknown>][] = [];
    setAnalyticsSink(performanceOnly({ send: (e, p) => inner.push([e, p]) }, { app_version: "1.0.0", build: "2e3e71a", platform: "ios", os_version: "26" }));
    track("app_stall", { duration_bucket: "1-2s", tell_work: false });
    track("tell_feedback", { verdict: "right", off: "none" });
    expect(inner).toEqual([["app_stall", { duration_bucket: "1-2s", tell_work: false, app_version: "1.0.0", build: "2e3e71a", platform: "ios", os_version: "26" }]]);
  });

  it("reads the build: the app version, the build's short commit (EAS), the platform and its major version only", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { buildInfo } = require("@/platform/buildInfo") as typeof import("@/platform/buildInfo");
    const info = buildInfo({ version: "1.0.0", extra: { build: "2e3e71a" } }, { OS: "ios", Version: "26.0.1" });
    expect(info).toEqual({ app_version: "1.0.0", build: "2e3e71a", platform: "ios", os_version: "26" });
    expect(buildInfo(null, { OS: "android", Version: 35 })).toEqual({ app_version: "unknown", build: "unknown", platform: "android", os_version: "35" });
  });

  it("is chosen by EXPO_PUBLIC_ANALYTICS_SCOPE=performance, and analytics stays off without the switch", () => {
    expect(startAnalytics({ EXPO_PUBLIC_ANALYTICS_SCOPE: "performance", EXPO_PUBLIC_POSTHOG_KEY: "phc_x" }, { stalls: false })).toBe(false);
    expect(startAnalytics({
      EXPO_PUBLIC_ANALYTICS_ENABLED: "true", EXPO_PUBLIC_ANALYTICS_SCOPE: "performance", EXPO_PUBLIC_POSTHOG_KEY: "phc_x",
    }, { stalls: false })).toBe(true);
    setAnalyticsSink();
  });
});

it("buckets durations finely enough for p50/p90 without exact values", () => {
  expect([0, 499, 500, 999, 1000, 2999, 3000, 4999, 7999, 12_999, 19_999, 59_999, 60_000, 600_000].map(durationBucketOf)).toEqual([
    "<0.5s", "<0.5s", "0.5-1s", "0.5-1s", "1-2s", "2-3s", "3-5s", "3-5s", "5-8s", "8-13s", "13-20s", "20-60s", "1-10m", "10m+",
  ]);
});

it("reads ai-gateway's Server-Timing header", () => {
  expect(serverTiming("total;dur=3210")).toBe(3210);
  expect(serverTiming("cache;dur=1, total;dur=88.6")).toBe(89);
  expect(serverTiming(null)).toBeNull();
  expect(serverTiming("nonsense")).toBeNull();
});

describe("stalls", () => {
  function harness(state: "active" | "background" = "active") {
    let t = 0;
    let tick: () => void = () => {};
    let onChange: (s: string) => void = () => {};
    const stop = startStallMonitor({
      now: () => t,
      setInterval: (fn) => { tick = fn; return 1; },
      clearInterval: () => {},
      appState: {
        currentState: state,
        addEventListener: ((_: string, fn: (s: string) => void) => { onChange = fn; return { remove: () => {} }; }) as never,
      },
    });
    return { advance: (ms: number) => { t += ms; tick(); }, change: (s: string) => onChange(s), stop };
  }

  it("reports a blocked JavaScript thread in the foreground, with whether Tell work was running", () => {
    const h = harness();
    h.advance(250);
    expect(sent).toEqual([]);
    tellWork(true);
    h.advance(250 + 4000);
    tellWork(false);
    h.advance(250 + 1200);
    expect(sent).toEqual([
      ["app_stall", { duration_bucket: "3-5s", tell_work: true }],
      ["app_stall", { duration_bucket: "1-2s", tell_work: false }],
    ]);
    h.stop();
  });

  it("never counts time in the background as a stall", () => {
    const h = harness();
    h.change("background");
    h.advance(60_000);
    h.change("active");
    h.advance(250);
    expect(sent).toEqual([]);
    h.stop();
  });
});

describe("a Tell's lifecycle, by stage", () => {
  const A = "aaaaaaaa-0000-4000-8000-0000000000f7";
  let clock = Date.parse("2026-10-08T21:14:00.000Z");
  const now = () => new Date(clock).toISOString();

  async function device() {
    const server = new FakeServer();
    const gateway = new FakeGateway(server, A);
    const db = await openSqlJsDb(`perf-${randomUUID()}`);
    await prepareSchema(db, A);
    const store = new UserStore(db, A, { now, newId: randomUUID });
    const engine = new SyncEngine(store, new FakeRemote(server, A));
    const away = { n: 0 };
    const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway), { clock: () => clock, away: () => away.n });
    return { gateway, understanding, repos: repositoriesFor(store), engine, away };
  }

  it("times send → request → reply → on screen, splits server from network, and carries no content", async () => {
    const d = await device();
    const ben = await d.repos.people.add({ display_name: "Ben" });
    await d.engine.sync();
    const note = "Ben runs Chicago Sunday.";
    d.gateway.script(note, { items: [{
      kind: "event", statement: "Ben runs Chicago Sunday", quote: "Ben runs Chicago Sunday.", tier: "auto", person_id: ben.id,
      detail: { date: "2026-10-11", date_precision: "day", date_hint: "Sunday", event_type: "race", followup_policy: "after" },
    }] });
    d.gateway.serverMs = 3200;
    d.gateway.onCall = () => { clock += 4100; }; // the round trip
    const c = await d.repos.captures.tell(note, { aiEnabled: true, timeZone: "America/Chicago" });
    await d.understanding.told(c.id);
    clock += 300; // queued and uploaded before the request
    await d.understanding.run();
    clock += 150; // the phone presenting it
    const row = await d.understanding.get(c.id);
    await d.understanding.markShown(row!);

    const lifecycle = sent.filter(([e]) => e === "tell_lifecycle");
    expect(lifecycle).toEqual([["tell_lifecycle", {
      outcome: "kept",
      understood_bucket: "3-10s",
      shown_bucket: "<1s",
      total_bucket: "3-5s",
      sync_bucket: "<0.5s",
      gateway_bucket: "3-5s",
      server_bucket: "3-5s",
      network_bucket: "0.5-1s",
      render_bucket: "<0.5s",
      retries: 0,
      // Not told through this phone's Tell field in this test: unknown, never guessed.
      understanding_bucket: "unknown",
      backgrounded: "unknown",
    }]]);
    // Content-free: no words, names or ids in anything sent.
    const wire = JSON.stringify(sent);
    for (const s of ["Ben", "Chicago", c.id, ben.id]) expect(wire).not.toContain(s);
  });

  it("CC-18: times Send → 'Understanding…' on screen, and says whether the app went to the background while the Tell was processing", async () => {
    const d = await device();
    const ben = await d.repos.people.add({ display_name: "Ben" });
    await d.engine.sync();
    const note = "Ben runs Chicago Sunday.";
    d.gateway.script(note, { items: [{
      kind: "event", statement: "Ben runs Chicago Sunday", quote: "Ben runs Chicago Sunday.", tier: "auto", person_id: ben.id,
      detail: { date: "2026-10-11", date_precision: "day", date_hint: "Sunday", event_type: "race", followup_policy: "after" },
    }] });
    const tapped = clock;
    clock += 120; // saved on the phone
    const c = await d.repos.captures.tell(note, { aiEnabled: true, timeZone: "America/Chicago" });
    d.understanding.sent(c.id, tapped);
    await d.understanding.told(c.id);
    clock += 200; // "Understanding…" painted
    d.understanding.understandingVisible(c.id);
    d.away.n += 1; // the user switched apps while it was understood
    clock += 2500;
    await d.understanding.run();
    const row = await d.understanding.get(c.id);
    await d.understanding.markShown(row!);
    const [, props] = sent.find(([e]) => e === "tell_lifecycle")!;
    expect(props).toMatchObject({ understanding_bucket: "<0.5s", backgrounded: true });

    // Another Tell that stayed in the foreground.
    const note2 = "Ben runs Boston in April.";
    d.gateway.script(note2, { items: [] });
    const c2 = await d.repos.captures.tell(note2, { aiEnabled: true, timeZone: "America/Chicago" });
    d.understanding.sent(c2.id, clock);
    await d.understanding.told(c2.id);
    await d.understanding.run();
    await d.understanding.markShown((await d.understanding.get(c2.id))!);
    const second = sent.filter(([e]) => e === "tell_lifecycle")[1][1];
    // The result came before "Understanding…" was ever painted.
    expect(second).toMatchObject({ understanding_bucket: "not_shown", backgrounded: false });
  });

  it("reports each failed attempt by stage, and the retries on the eventual result", async () => {
    const d = await device();
    const c = await d.repos.captures.tell("Sam is redoing his kitchen.", { aiEnabled: true, timeZone: "America/Chicago" });
    await d.understanding.told(c.id);
    d.gateway.failNext = { status: 503, error: "try_later" };
    await d.understanding.run();
    expect(sent.filter(([e]) => e === "tell_failure")).toEqual([["tell_failure", { stage: "server", attempt: 1, backgrounded: "unknown" }]]);
    d.gateway.offline = true;
    clock += 60 * 60_000;
    await d.understanding.run();
    expect(sent.filter(([e]) => e === "tell_failure").at(-1)).toEqual(["tell_failure", { stage: "offline", attempt: 2, backgrounded: "unknown" }]);
    d.gateway.offline = false;
    await d.understanding.run();
    const row = await d.understanding.get(c.id);
    await d.understanding.markShown(row!);
    const [, props] = sent.find(([e]) => e === "tell_lifecycle")!;
    expect(props.retries).toBe(1);
    expect(props.server_bucket).toBe("unknown");
  });
});

it("only the dogfood-v2 build turns analytics on, and only in the performance scope", () => {
  const eas = require("../../../eas.json") as { build: Record<string, { env?: Record<string, string> }> };
  const on = Object.entries(eas.build).filter(([, p]) => p.env?.EXPO_PUBLIC_ANALYTICS_ENABLED === "true");
  expect(on.map(([name]) => name)).toEqual(["dogfood-v2"]);
  expect(eas.build["dogfood-v2"].env?.EXPO_PUBLIC_ANALYTICS_SCOPE).toBe("performance");
  // The project key comes from EAS environment variables, never the repo.
  expect(JSON.stringify(eas)).not.toMatch(/phc_/);
});
