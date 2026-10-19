// Option A, containment (founder, 19 Oct 2026): a note the understanding could not take whole is never
// shown as whole, and never silently less than it was. Through the product's real code: the gateway's
// pipeline (the model's reply written by hand, in its shape), the write rules, sync, Understanding, the
// review, the Kept card, the Source view and "Tell the rest". Nothing here changes what happens to a
// note of eight proposals or fewer.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { noteFor } from "@/hooks/useV2";
import { voiced } from "@/features/memory/statements";
import { buildReview, COPY, partialOf, type ReviewView } from "@/features/tell/reviewModel";
import { cardFor, TellFlowProvider, useTellFlow, type TellFlow } from "@/features/tell/TellFlow";
import { Gateway } from "@/store/gateway";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import type { ExtractionInput, ModelProposal, ProposedDetail, ProposedItem } from "../../../../supabase/functions/_shared/extraction/types";

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const TZ = "America/Los_Angeles";
const NO_DETAIL: ProposedDetail = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};

let mockSession: { store: UserStore; understanding: Understanding; userId: string } | null = null;
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => mockSession }));
jest.mock("@/hooks/useFlags", () => ({ useFlags: () => ({ ai_extraction: true, tell: true }) }));
jest.mock("@/hooks/useActivation", () => ({
  useActivation: () => ({ activated: true, activate: async () => undefined, firstName: null }),
}));
jest.mock("@/lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));
jest.mock("expo-router", () => ({ router: { push: () => undefined } }));
jest.mock("../ReviewSheet", () => ({ ReviewSheet: () => null }));

/** Ten plain things about Priya, one a sentence: the model proposes every one, the understanding takes eight. */
const THINGS = [
  "Priya loves jazz", "Priya took up pottery", "Priya started trail running", "Priya is learning Italian", "Priya joined a choir",
  "Priya bought a kayak", "Priya reads Russian novels", "Priya collects stamps", "Priya plays chess on Tuesdays", "Priya grows tomatoes",
];
const TEN = THINGS.map((t) => `${t}.`).join(" ");
const THREE = THINGS.slice(0, 3).map((t) => `${t}.`).join(" ");

function item(key: string, statement: string, evidence: string): ProposedItem {
  return {
    kind: "fact", person: key, person_mention: "Priya", subject: "person", related_relation: null, related_name: null,
    statement, evidence: [evidence], certainty: "stated", sensitivity: "none", confidence: 0.93, date_text: null, date_direction: "unclear",
    detail: { ...NO_DETAIL, category: "interest", topic: statement }, existing: { action: "new", target: null },
  };
}
const proposals = (things: string[]) => (input: ExtractionInput): ModelProposal => {
  const key = input.roster.find((r) => r.display_name === "Priya")?.key ?? "unknown";
  return { items: things.map((t) => item(key, t, t)), needs_clarification: null };
};

let worlds = 0;
async function world() {
  const w = ++worlds;
  let n = 0;
  const newId = () => `${String(w).padStart(8, "0")}-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const server = new FakeServer();
  const gateway = new FakeGateway(server, A);
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { now: () => new Date(server.clock).toISOString(), newId });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway), { clock: () => server.clock });
  const repos = repositoriesFor(store);
  const priya = await repos.people.add({ display_name: "Priya" });
  await engine.sync();
  mockSession = { store, understanding, userId: A };
  return { server, gateway, store, engine, understanding, repos, priya };
}
type World = Awaited<ReturnType<typeof world>>;

async function tell(w: World, note: string, things: string[], opts: { context?: Person; continues?: string } = {}): Promise<string> {
  w.gateway.propose(note, proposals(things));
  const c = await w.repos.captures.tell(note, { aiEnabled: true, timeZone: TZ, contextPersonId: opts.context?.id, continuesCaptureId: opts.continues ?? null });
  await w.understanding.told(c.id);
  await w.understanding.run();
  return c.id;
}

async function review(w: World, id: string): Promise<ReviewView> {
  const row = (await w.understanding.get(id))!;
  const people = await w.repos.people.list();
  const items = (await w.understanding.itemsFor(id, row.reading)).map((m) => voiced(m, people));
  const capture = (await w.repos.captures.get(id))!;
  const continued = (await w.repos.captures.list()).some((c) => c.continues_capture_id === id && !c.deleted_at);
  return buildReview({
    row,
    capture: { id, raw_text: capture.raw_text, context_person_id: capture.context_person_id, status: capture.status, feedback: capture.feedback, coverage: capture.coverage ?? null, continued },
    items, people, related: await w.repos.people.related(), offline: w.understanding.offline, today: "2026-10-19",
    missing: await w.understanding.arriving(row.reading),
  });
}

const liveLines = async (w: World): Promise<MemoryItem[]> =>
  ((await w.store.list("memory_items")) as MemoryItem[]).filter((m) => m.status === "active" && !m.deleted_at);

describe("a note the understanding could not take whole (Option A)", () => {
  it("keeps eight, says so, and marks the rest in the note; nothing is lost in silence", async () => {
    const w = await world();
    const id = await tell(w, TEN, THINGS, { context: w.priya });

    const lines = await liveLines(w);
    expect(lines.length).toBe(8);
    expect(lines.map((l) => l.statement).sort()).toEqual(THINGS.slice(0, 8).sort());

    const capture = (await w.repos.captures.get(id))!;
    expect(capture.coverage).toEqual({ v: 1, unprocessed: [{ start: TEN.indexOf(THINGS[8]), end: TEN.indexOf(THINGS[8]) + THINGS[8].length }, { start: TEN.indexOf(THINGS[9]), end: TEN.indexOf(THINGS[9]) + THINGS[9].length }], unlocated: 0 });
    expect(JSON.stringify(capture.coverage)).not.toContain("tomatoes");

    const v = await review(w, id);
    expect(v.mode).toBe("card");
    expect(v.heading).toBe("Kept for Priya");
    expect(v.status).toBe(COPY.partial);
    expect(v.partial).toEqual({ unprocessed: capture.coverage!.unprocessed, unlocated: 0, continued: false });
    // The card: a kept note that offers "Tell the rest"; never "Try again" (the same note would meet the same limit).
    const card = cardFor(v)!;
    expect(card.mode).toBe("card");
    expect(card.partial).toEqual({ continued: false });
    expect(card.canRetry).toBe(false);
    expect(card.lines.length + card.more).toBe(8);

    // The Source view: the eight kept passages underlined, the two not got to marked apart, plainly.
    const note = (await noteFor(w.store, id, new Date("2026-10-19T12:00:00Z")))!;
    expect(note.runs!.filter((r) => r.unprocessed).map((r) => r.text.trim())).toEqual([`${THINGS[8]}.`.slice(0, -1), `${THINGS[9]}.`.slice(0, -1)]);
    expect(note.runs!.filter((r) => r.marked).length).toBe(8);
    expect(note.partial).toEqual({ continued: false, unlocated: 0 });

    // "Tell the rest": the words not got to, in the note's order, about Priya.
    expect(await w.understanding.restOf(id)).toEqual({ text: `${THINGS[8]} ${THINGS[9]}`, personId: w.priya.id });
  });

  it("telling the rest answers the partial state everywhere and keeps nothing twice", async () => {
    const w = await world();
    const first = await tell(w, TEN, THINGS, { context: w.priya });
    const rest = (await w.understanding.restOf(first))!;
    const second = await tell(w, rest.text, THINGS.slice(8), { context: w.priya, continues: first });

    expect((await w.repos.captures.get(second))!.continues_capture_id).toBe(first);
    // The server has the link (sync pushed it), so another phone sees the first note as answered too.
    expect(w.server.table("captures").get(second)?.continues_capture_id).toBe(first);

    const lines = await liveLines(w);
    expect(lines.length).toBe(10);
    expect(new Set(lines.map((l) => l.statement)).size).toBe(10);

    const v = await review(w, first);
    expect(v.partial).toEqual(expect.objectContaining({ continued: true }));
    expect(v.status).toBeNull();
    expect(cardFor(v)!.partial).toEqual({ continued: true });
    const note = (await noteFor(w.store, first, new Date("2026-10-19T12:00:00Z")))!;
    expect(note.partial).toEqual({ continued: true, unlocated: 0 });
    expect(note.runs!.some((r) => r.unprocessed)).toBe(false);
    // The first note's own understanding is untouched: still eight lines, still the record of what it left out.
    expect((await w.repos.captures.get(first))!.coverage?.unprocessed.length).toBe(2);
  });

  it("a note taken whole is exactly as before: no partial state, nothing on the capture", async () => {
    const w = await world();
    const id = await tell(w, THREE, THINGS.slice(0, 3), { context: w.priya });
    expect((await liveLines(w)).length).toBe(3);
    expect((await w.repos.captures.get(id))!.coverage ?? null).toBeNull();
    const v = await review(w, id);
    expect([v.mode, v.status, v.partial]).toEqual(["card", null, null]);
    expect(cardFor(v)!.partial).toBeNull();
    const note = (await noteFor(w.store, id, new Date("2026-10-19T12:00:00Z")))!;
    expect(note.partial).toBeNull();
    expect(note.runs!.some((r) => r.unprocessed)).toBe(false);
    expect(await w.understanding.restOf(id)).toBeNull();
  });

  it("a reply lost on the way back comes back as what was kept and what was left out, never as nothing", async () => {
    const w = await world();
    w.gateway.propose(TEN, proposals(THINGS));
    const c = await w.repos.captures.tell(TEN, { aiEnabled: true, timeZone: TZ, contextPersonId: w.priya.id });
    await w.understanding.told(c.id);
    w.gateway.loseNextReply = true;
    await expect(w.understanding.run()).resolves.toBeUndefined();
    expect((await w.understanding.get(c.id))!.state).toBe("waiting");
    // The server acted; the next pass meets "done": the eight it kept and the two it did not get to.
    w.server.tick(20_000);
    await w.understanding.run();
    const row = (await w.understanding.get(c.id))!;
    expect(row.state).toBe("review");
    expect(row.reading!.saved.length).toBe(8);
    expect(row.reading!.coverage?.unprocessed.length).toBe(2);
    const v = await review(w, c.id);
    expect([v.mode, v.status]).toEqual(["card", COPY.partial]);
    expect((await liveLines(w)).length).toBe(8);
  });

  it("the server still at work is a wait, never a failed attempt", async () => {
    const w = await world();
    w.gateway.propose(THREE, proposals(THINGS.slice(0, 3)));
    const c = await w.repos.captures.tell(THREE, { aiEnabled: true, timeZone: TZ });
    await w.understanding.told(c.id);
    await w.engine.sync();
    w.server.table("captures").get(c.id)!.status = "processing";
    await w.understanding.run();
    const busy = (await w.understanding.get(c.id))!;
    expect([busy.state, busy.attempts]).toEqual(["waiting", 0]);
    expect(busy.next_at && Date.parse(busy.next_at) - w.server.clock).toBeGreaterThan(0);
    // The worker finished (or died and was reclaimed): the next pass understands as usual.
    w.server.table("captures").get(c.id)!.status = "pending";
    w.server.tick(15_000);
    await w.understanding.run();
    expect((await w.understanding.get(c.id))!.state).toBe("review");
    expect((await liveLines(w)).length).toBe(3);
  });

  it("understanding that kept failing offers Try again, which asks once more without re-entering the note", async () => {
    const w = await world();
    const uh = new Understanding(w.store, () => w.engine.sync(), new Gateway(w.gateway), { maxAttempts: 1, clock: () => w.server.clock });
    w.gateway.propose(THREE, proposals(THINGS.slice(0, 3)));
    const c = await w.repos.captures.tell(THREE, { aiEnabled: true, timeZone: TZ });
    await uh.told(c.id);
    w.gateway.failNext = { status: 503, error: "try_later" };
    await uh.run();
    const failed = (await uh.get(c.id))!;
    expect(failed.state).toBe("failed");
    const row = { ...failed };
    const people = await w.repos.people.list();
    const capture = (await w.repos.captures.get(c.id))!;
    const v = buildReview({ row, capture: { id: c.id, raw_text: capture.raw_text, context_person_id: null, status: capture.status }, items: [], people, related: [], offline: false, today: "2026-10-19" });
    expect([v.mode, v.status]).toEqual(["failed", COPY.failed]);
    expect(cardFor(v)!.canRetry).toBe(true);
    expect(capture.raw_text).toBe(THREE);

    await uh.retry(c.id);
    expect((await uh.get(c.id))!.state).toBe("waiting");
    await uh.run();
    expect((await uh.get(c.id))!.state).toBe("review");
    expect((await liveLines(w)).length).toBe(3);
    // A note kept whole never offers Try again.
    expect(cardFor(await review(w, c.id))!.canRetry).toBe(false);
  });

  it("Undo on a partial note forgets it whole, as on any note", async () => {
    const w = await world();
    const id = await tell(w, TEN, THINGS, { context: w.priya });
    expect((await liveLines(w)).length).toBe(8);
    await w.understanding.undo(id);
    expect((await liveLines(w)).length).toBe(0);
    expect(await w.repos.captures.get(id)).toBeNull();
    expect(await noteFor(w.store, id, new Date())).toBeNull();
  });

  it("partialOf never invents a span and never calls a whole note partial", () => {
    expect(partialOf(null, false)).toBeNull();
    expect(partialOf({ unprocessed: [], unlocated: 0 }, false)).toBeNull();
    expect(partialOf({ unprocessed: [{ start: 5, end: 2 }], unlocated: 0 }, false)).toBeNull();
    expect(partialOf({ unprocessed: [], unlocated: 2 }, true)).toEqual({ unprocessed: [], unlocated: 2, continued: true });
  });
});

describe("the Tell flow (Option A)", () => {
  const flow: { current: TellFlow | null } = { current: null };
  function Probe() {
    flow.current = useTellFlow();
    return null;
  }
  async function settle() {
    for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  }

  it("Tell the rest puts the words not got to in the field, about the note's person, and the next Keep links back", async () => {
    const w = await world();
    const first = await tell(w, TEN, THINGS, { context: w.priya });
    let r: TestRenderer.ReactTestRenderer | null = null;
    await act(async () => {
      r = TestRenderer.create(<TellFlowProvider><Probe /></TellFlowProvider>);
    });
    await settle();
    act(() => flow.current!.tellRest(first));
    await settle();
    expect(flow.current!.focusRequest).toEqual(expect.objectContaining({ personId: w.priya.id, continues: first }));
    expect(flow.current!.draft(w.priya.id)).toBe(`${THINGS[8]} ${THINGS[9]}`);

    w.gateway.propose(`${THINGS[8]} ${THINGS[9]}`, proposals(THINGS.slice(8)));
    await act(async () => {
      await flow.current!.keep(flow.current!.draft(w.priya.id), w.priya.id, "text", first);
    });
    await act(async () => { await w.understanding.run(); });
    await settle();
    const captures = await w.repos.captures.list();
    const second = captures.find((c) => c.id !== first)!;
    expect(second.continues_capture_id).toBe(first);
    expect(second.context_person_id).toBe(w.priya.id);
    expect((await liveLines(w)).length).toBe(10);
    r!.unmount();
  });
});
