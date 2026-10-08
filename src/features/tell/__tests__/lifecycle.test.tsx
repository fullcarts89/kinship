// Stabilization Gate A: every Tell is accounted for until it reaches an end.
//
// The real Tell flow (TellFlowProvider) over a real store, sync engine and
// Understanding, with FakeGateway standing in for the server. Each test
// reproduces a failure from the founder's second native pass before showing
// it can't happen any more:
//
//   * a question sheet disappearing on a refresh, or after an answer while the
//     result was still syncing ("bounces away");
//   * an unanswered question becoming invisible once its sheet was closed;
//   * another Tell sent while a question is still open;
//   * "See the note" coming back to nothing;
//   * a note with nothing to remember, or one that keeps failing, met with
//     silence;
//   * a Kept line that disappears on a timer (including while backgrounded),
//     or shows on another person's page.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { randomUUID } from "crypto";
import { Gateway } from "@/store/gateway";
import { repositoriesFor } from "@/store/repositories";
// The flow is tested against a real store, so this test builds one.
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway, type Script } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import type { ReviewSheetProps } from "../ReviewSheet";
import { TellFlowProvider, useTellFlow, type TellFlow } from "../TellFlow";

const A = "aaaaaaaa-0000-4000-8000-0000000000a1";
const SAM_NOTE = "Sam is redoing his kitchen.";
const BEN_NOTE = "Ben runs Chicago Sunday.";
const NOTHING_NOTE = "lol ok";

let mockSession: { store: UserStore; understanding: Understanding; userId: string } | null = null;
const mockSheet: { current: ReviewSheetProps | null } = { current: null };
const mockPushes: string[] = [];

jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => mockSession }));
jest.mock("@/hooks/useFlags", () => ({ useFlags: () => ({ ai_extraction: true, tell: true }) }));
jest.mock("@/hooks/useActivation", () => ({
  useActivation: () => ({ activated: true, activate: async () => undefined, firstName: null }),
}));
jest.mock("@/lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));
jest.mock("expo-router", () => ({ router: { push: (href: string) => mockPushes.push(href) } }));
jest.mock("../ReviewSheet", () => ({
  ReviewSheet: (props: ReviewSheetProps) => {
    mockSheet.current = props;
    return null;
  },
}));

const samScript: Script = {
  items: [{
    kind: "thread", statement: "Sam is redoing his kitchen", quote: "Sam is redoing his kitchen", tier: "hold",
    person_id: null, flags: ["person_ambiguous"], detail: { topic: "redoing his kitchen", followup_after_days: 42 },
  }],
  clarification: { about: "person", question: "Which Sam do you mean?", options: [] },
};

async function world() {
  const server = new FakeServer();
  const gateway = new FakeGateway(server, A);
  const db = await openSqlJsDb(`life-${randomUUID()}`);
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { newId: randomUUID });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway));
  const repos = repositoriesFor(store);
  const ben = await repos.people.add({ display_name: "Ben" });
  const lee = await repos.people.add({ display_name: "Sam", relationship_label: "neighbor" });
  const diaz = await repos.people.add({ display_name: "Sam", relationship_label: "climbing" });
  await engine.sync();
  gateway.script(SAM_NOTE, samScript);
  gateway.script(BEN_NOTE, {
    items: [{
      kind: "event", statement: "Ben runs Chicago Sunday", quote: "Ben runs Chicago Sunday", tier: "auto", person_id: ben.id,
      detail: { date: "2026-10-11", date_precision: "day", event_type: "race", followup_policy: "after" },
    }],
  });
  gateway.script(NOTHING_NOTE, { items: [] });
  mockSession = { store, understanding, userId: A };
  return { server, gateway, store, engine, understanding, repos, ben, lee, diaz };
}

const flow: { current: TellFlow | null } = { current: null };
function Probe() {
  flow.current = useTellFlow();
  return null;
}

async function settle() {
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
}

async function mount() {
  mockSheet.current = null;
  mockPushes.length = 0;
  let r: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    r = TestRenderer.create(<TellFlowProvider><Probe /></TellFlowProvider>);
  });
  await settle();
  return r!;
}

/** Tells a note the way the Tell field does, and lets understanding finish. */
async function tell(w: Awaited<ReturnType<typeof world>>, text: string, contextPersonId?: string) {
  await act(async () => {
    await flow.current!.keep(text, contextPersonId ?? null);
  });
  await act(async () => {
    await w.understanding.run();
  });
  await settle();
}

const sheetOpen = () => !!mockSheet.current;
const sheetQuestion = () => mockSheet.current?.view.questions[0]?.prompt ?? null;

beforeEach(() => {
  jest.useRealTimers();
});

it("a question stays on screen through refreshes and syncs; nothing but the user closes it", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, SAM_NOTE);
  expect(sheetQuestion()).toBe("Which Sam do you mean?");

  // Refreshes, syncs and passes while it's open (the founder's "bounces away").
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      w.store.notify();
      await w.engine.sync();
      await w.understanding.run();
    });
    await settle();
  }
  expect(sheetQuestion()).toBe("Which Sam do you mean?");
  r.unmount();
});

it("no timer closes anything: the Kept card stays until the user is done with it", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, BEN_NOTE);
  expect(flow.current!.card).toMatchObject({ mode: "card", heading: "Kept for Ben", lines: [{ statement: "Ben runs Chicago Sunday" }] });
  await act(async () => {
    await new Promise((res) => setTimeout(res, 50));
  });
  expect(flow.current!.card?.mode).toBe("card");
  // Only the user (✕, Undo, another Tell) ends it.
  await act(async () => flow.current!.dismissCard());
  await settle();
  expect(flow.current!.card).toBeNull();
  r.unmount();
});

it("the Tell flow has no timers at all: backgrounding the app can't use one up", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  const src = fs.readFileSync(path.join(__dirname, "../TellFlow.tsx"), "utf8");
  expect(src).not.toMatch(/setTimeout|setInterval/);
});

it("I10: while a question's sheet is open, Today knows something is waiting (never 'Nothing needs you today.' behind it)", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, SAM_NOTE);
  expect(sheetQuestion()).toBe("Which Sam do you mean?");
  // The note in the sheet is neither the card nor on Today's list: the flow still says it's asking.
  expect(flow.current!.card).toBeNull();
  expect(flow.current!.asking).toBe(true);
  // Answered: nothing is asking any more.
  await act(async () => mockSheet.current!.onAnswer([{ index: 0, person_id: w.lee.id }]));
  await act(async () => {
    await w.understanding.run();
  });
  await settle();
  expect(flow.current!.asking).toBe(false);
  r.unmount();
});

it("I9: opening the Kept card's details and closing them (any way) comes back to the same card, Got it right / Not quite still there", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, BEN_NOTE);
  expect(flow.current!.card).toMatchObject({ mode: "card", heading: "Kept for Ben" });
  const id = flow.current!.card!.captureId;

  for (const close of ["dismissed", "done"] as const) {
    await act(async () => flow.current!.openCard());
    await settle();
    expect(sheetOpen()).toBe(true);
    // A swipe, a tap outside, or Done in the details: back to the card, never both closed.
    await act(async () => (close === "done" ? mockSheet.current!.onDone() : mockSheet.current!.onDismiss()));
    mockSheet.current = null;
    await settle();
    expect(sheetOpen()).toBe(false);
    expect(flow.current!.card).toMatchObject({ captureId: id, mode: "card", heading: "Kept for Ben" });
  }
  // The feedback is still there to give, and it lands on the note.
  await act(async () => flow.current!.rateCard("right"));
  await settle();
  expect(flow.current!.card?.feedback).toMatchObject({ verdict: "right" });
  r.unmount();
});

it("CC-18 telemetry: a Tell sent from the field reports Send → 'Understanding…' on screen, content-free", async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const analytics = require("@/platform/analytics") as typeof import("@/platform/analytics");
  const events: [string, Record<string, unknown>][] = [];
  analytics.setAnalyticsSink({ send: (e, p) => events.push([e, p]) });
  try {
    const w = await world();
    const r = await mount();
    // A slow network: "Understanding…" is on screen while the request is out.
    let release!: () => void;
    w.gateway.pause = new Promise((done) => {
      release = done;
    });
    await act(async () => {
      await flow.current!.keep(BEN_NOTE, null);
    });
    await settle();
    expect(flow.current!.card).toMatchObject({ mode: "understanding" });
    w.gateway.pause = null;
    await act(async () => {
      release();
      await w.understanding.run();
    });
    await settle();
    expect(flow.current!.card).toMatchObject({ mode: "card" });
    const lifecycle = events.find(([e]) => e === "tell_lifecycle")?.[1];
    expect(lifecycle?.understanding_bucket).toEqual(expect.stringMatching(/^(<0\.5s|0\.5-1s|1-2s)$/u));
    expect(lifecycle?.backgrounded).toBe(false);
    expect(JSON.stringify(events)).not.toContain("Chicago");
    r.unmount();
  } finally {
    analytics.setAnalyticsSink();
  }
});

it("closing a question's sheet keeps the question: it waits on Today and the person's page, and another Tell doesn't lose it", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, SAM_NOTE);
  const samNote = mockSheet.current!.view.captureId;

  // "Not now" (or a swipe): the sheet goes, the question doesn't.
  await act(async () => mockSheet.current!.onDismiss());
  mockSheet.current = null;
  await settle();
  expect(sheetOpen()).toBe(false);
  expect(flow.current!.card).toMatchObject({ mode: "sheet", status: "One thing to check about what you told me." });

  // Another Tell while it's unanswered: Ben's card, and Sam's question still waiting, by name.
  await tell(w, BEN_NOTE);
  expect(flow.current!.card).toMatchObject({ heading: "Kept for Ben" });
  const waiting = flow.current!.pending.find((n) => n.captureId === samNote);
  expect(waiting).toMatchObject({ kind: "question", text: "Which Sam do you mean?", action: "Answer" });
  expect(waiting?.personIds).toEqual(expect.arrayContaining([w.lee.id, w.diaz.id]));

  // Answered from there: the confirmation stays until Done, even while what it kept is still syncing.
  await act(async () => flow.current!.openNote(samNote));
  await settle();
  expect(sheetQuestion()).toBe("Which Sam do you mean?");
  await act(async () => mockSheet.current!.onAnswer([{ index: 0, person_id: w.lee.id }]));
  await act(async () => {
    await w.understanding.run();
  });
  await settle();
  expect(mockSheet.current!.view).toMatchObject({ heading: "Kept for Sam (neighbor)", mode: "card" });
  expect(mockSheet.current!.view.lines.map((l) => l.statement)).toEqual(["Sam is redoing his kitchen"]);
  expect(flow.current!.pending.some((n) => n.captureId === samNote)).toBe(false);
  r.unmount();
});

it("\"See the note\" never decides anything: the question comes back on the way out", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, SAM_NOTE);
  const id = mockSheet.current!.view.captureId;
  await act(async () => mockSheet.current!.onOpenNote());
  mockSheet.current = null;
  await settle();
  expect(mockPushes).toEqual([`/v2/source/${id}`]);
  expect(sheetOpen()).toBe(false);
  expect((await w.understanding.get(id))?.state).toBe("review");

  await act(async () => flow.current!.returnFromNote(id));
  await settle();
  expect(sheetQuestion()).toBe("Which Sam do you mean?");
  r.unmount();
});

it("nothing to remember, or understanding that keeps failing: said plainly, never silence", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, NOTHING_NOTE);
  expect(flow.current!.card).toMatchObject({ mode: "nothing", status: "Nothing to remember in that one." });
  expect(await w.repos.captures.get(flow.current!.card!.captureId)).toBeTruthy();

  const uh = new Understanding(w.store, () => w.engine.sync(), new Gateway(w.gateway), { maxAttempts: 1 });
  mockSession = { store: w.store, understanding: uh, userId: A };
  r.unmount();
  const r2 = await mount();
  w.gateway.failNext = { status: 503, error: "try_later" };
  await act(async () => {
    await flow.current!.keep("Ben's sister is visiting.", null);
  });
  await act(async () => {
    await uh.run();
  });
  await settle();
  expect(flow.current!.card).toMatchObject({ mode: "failed", status: "Couldn't understand this one. Your note is saved." });
  r2.unmount();
});

it("the card belongs with the people it's about, never another person's page", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, BEN_NOTE, w.ben.id);
  const card = flow.current!.card!;
  expect(card.personIds).toContain(w.ben.id);
  expect(card.personIds).not.toContain(w.lee.id);
  r.unmount();
});

it("records when it was understood and when it was shown, content-free", async () => {
  const w = await world();
  const r = await mount();
  await tell(w, BEN_NOTE);
  const row = await w.understanding.get(flow.current!.card!.captureId);
  expect(row?.understood_at).toBeTruthy();
  expect(row?.shown_at).toBeTruthy();
  expect(Date.parse(row!.shown_at!)).toBeGreaterThanOrEqual(Date.parse(row!.understood_at!));
  r.unmount();
});

it("never a sheet on a sheet: a question that arrives while another sheet is up waits for it, and is listed meanwhile", async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stack = require("@/ui/sheetStack") as typeof import("@/ui/sheetStack");
  const w = await world();
  const r = await mount();
  act(() => stack.sheetOpened()); // e.g. the Tell sheet on a person's page, still leaving
  await tell(w, SAM_NOTE);
  expect(sheetOpen()).toBe(false);
  expect(flow.current!.card).toMatchObject({ mode: "sheet" });
  act(() => stack.sheetClosed());
  await settle();
  expect(sheetQuestion()).toBe("Which Sam do you mean?");
  r.unmount();
});
