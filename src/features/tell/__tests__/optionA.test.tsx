// Option A, containment (founder, 19 Oct 2026): a note the understanding could not take whole is never
// shown as whole, and never silently less than it was. Through the product's real code: the gateway's
// pipeline (the model's reply written by hand, in its shape), the write rules, sync, Understanding, the
// review, the Kept card, the Source view and "Tell the rest". Nothing here changes what happens to a
// note of eight proposals or fewer.
//
// Founder review of PR #58 (19 Oct): a later note's existence proves nothing. The second block proves
// that a passage counts as told again only when a later note that was read has a kept line resting on
// those words, and that every other state (not read yet, failed, read but partial, read but unrelated,
// undone) is said as it is, with "Tell the rest" offered only while that is the honest next step.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { noteFor, recoveryFor } from "@/hooks/useV2";
import { voiced } from "@/features/memory/statements";
import { NOTE_COPY, partialNoteLine } from "@/features/person/NoteView";
import { buildReview, COPY, partialOf, partialStatus, type ReviewView } from "@/features/tell/reviewModel";
import { cardFor, TellFlowProvider, useTellFlow, type TellFlow } from "@/features/tell/TellFlow";
import { recoveryOf } from "@/store/followUp";
import { Gateway } from "@/store/gateway";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding, questionWaiting } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import type { ExtractionInput, ModelProposal, ProposedDetail, ProposedItem } from "../../../../supabase/functions/_shared/extraction/types";

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const TZ = "America/Los_Angeles";
const NOW = new Date("2026-10-19T12:00:00Z");
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
const REST = `${THINGS[8]} ${THINGS[9]}`;

/** One proposal, in the model's shape: a thing said, the words it rests on, and who it is about (a roster name, or "unknown"). */
interface Spec { statement: string; evidence?: string; person?: string; mention?: string }
const spec = (t: string | Spec): Spec => (typeof t === "string" ? { statement: t } : t);
function item(key: string, s: Spec): ProposedItem {
  return {
    kind: "fact", person: key, person_mention: s.mention ?? s.person ?? "Priya", subject: "person", related_relation: null, related_name: null,
    statement: s.statement, evidence: [s.evidence ?? s.statement], certainty: "stated", sensitivity: "none", confidence: 0.93, date_text: null, date_direction: "unclear",
    detail: { ...NO_DETAIL, category: "interest", topic: s.statement }, existing: { action: "new", target: null },
  };
}
const proposals = (things: (string | Spec)[]) => (input: ExtractionInput): ModelProposal => ({
  items: things.map(spec).map((s) => {
    const who = s.person ?? "Priya";
    const key = who === "unknown" ? "unknown" : input.roster.find((r) => r.display_name === who)?.key ?? "unknown";
    return item(key, s);
  }),
  needs_clarification: null,
});

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
  const ben = await repos.people.add({ display_name: "Ben" });
  await engine.sync();
  mockSession = { store, understanding, userId: A };
  return { server, gateway, store, engine, understanding, repos, priya, ben };
}
type World = Awaited<ReturnType<typeof world>>;

/** Keeps a note and lets the understanding run; `run: false` keeps it told and waiting. */
async function tell(w: World, note: string, things: (string | Spec)[], opts: { context?: Person | null; continues?: string; run?: boolean } = {}): Promise<string> {
  w.gateway.propose(note, proposals(things));
  const c = await w.repos.captures.tell(note, { aiEnabled: true, timeZone: TZ, contextPersonId: opts.context?.id, continuesCaptureId: opts.continues ?? null });
  await w.understanding.told(c.id);
  if (opts.run !== false) await w.understanding.run();
  return c.id;
}

/** "Tell the rest" as the flow does it: the words still not got to, kept as a linked note, understood. */
async function tellRest(w: World, first: string, things: (string | Spec)[], opts: { text?: string; run?: boolean } = {}): Promise<string> {
  const rest = (await w.understanding.restOf(first))!;
  const person = rest.personId ? (await w.repos.people.list()).find((p) => p.id === rest.personId) ?? null : null;
  return tell(w, opts.text ?? rest.text, things, { context: person, continues: first, run: opts.run });
}

async function review(w: World, id: string): Promise<ReviewView> {
  const row = (await w.understanding.get(id))!;
  const people = await w.repos.people.list();
  const items = (await w.understanding.itemsFor(id, row.reading)).map((m) => voiced(m, people));
  const capture = (await w.repos.captures.get(id))!;
  return buildReview({
    row,
    capture: {
      id, raw_text: capture.raw_text, context_person_id: capture.context_person_id, status: capture.status, feedback: capture.feedback,
      coverage: capture.coverage ?? null, recovery: await recoveryFor(w.store, capture),
    },
    items, people, related: await w.repos.people.related(), offline: w.understanding.offline, today: "2026-10-19",
    missing: await w.understanding.arriving(row.reading),
  });
}

const liveLines = async (w: World): Promise<MemoryItem[]> =>
  ((await w.store.list("memory_items")) as MemoryItem[]).filter((m) => m.status === "active" && !m.deleted_at);
const note = (w: World, id: string) => noteFor(w.store, id, NOW);
const span = (text: string, words: string) => ({ start: text.indexOf(words), end: text.indexOf(words) + words.length });

describe("a note the understanding could not take whole (Option A)", () => {
  it("keeps eight, says so, and marks the rest in the note; nothing is lost in silence", async () => {
    const w = await world();
    const id = await tell(w, TEN, THINGS, { context: w.priya });

    const lines = await liveLines(w);
    expect(lines.length).toBe(8);
    expect(lines.map((l) => l.statement).sort()).toEqual(THINGS.slice(0, 8).sort());

    const capture = (await w.repos.captures.get(id))!;
    expect(capture.coverage).toEqual({ v: 1, unprocessed: [span(TEN, THINGS[8]), span(TEN, THINGS[9])], unlocated: 0 });
    expect(JSON.stringify(capture.coverage)).not.toContain("tomatoes");

    const v = await review(w, id);
    expect(v.mode).toBe("card");
    expect(v.heading).toBe("Kept for Priya");
    expect(v.status).toBe(COPY.partial);
    expect(v.partial).toEqual({ unprocessed: capture.coverage!.unprocessed, unlocated: 0, recovered: 0, followUp: "none", resolved: false, tellRest: true });
    // The card: a kept note that offers "Tell the rest"; never "Try again" (the same note would meet the same limit).
    const card = cardFor(v)!;
    expect(card.mode).toBe("card");
    expect(card.partial).toEqual({ tellRest: true, resolved: false });
    expect(card.canRetry).toBe(false);
    expect(card.lines.length + card.more).toBe(8);

    // The Source view: the eight kept passages underlined, the two not got to marked apart, plainly.
    const n = (await note(w, id))!;
    expect(n.runs!.filter((r) => r.unprocessed).map((r) => r.text.trim())).toEqual([THINGS[8], THINGS[9]]);
    expect(n.runs!.filter((r) => r.marked).length).toBe(8);
    expect(n.runs!.some((r) => r.marked && r.unprocessed)).toBe(false);
    expect(n.partial).toEqual({ followUp: "none", resolved: false, recovered: 0, unlocated: 0, tellRest: true });
    expect(partialNoteLine(n.partial!, true)).toBe("");

    // "Tell the rest": the words not got to, in the note's order, about Priya.
    expect(await w.understanding.restOf(id)).toEqual({ text: REST, personId: w.priya.id });
  });

  it("telling the rest, read and kept, is the one state that answers the note: everywhere, and nothing twice", async () => {
    const w = await world();
    const first = await tell(w, TEN, THINGS, { context: w.priya });
    const second = await tellRest(w, first, THINGS.slice(8));

    expect((await w.repos.captures.get(second))!.continues_capture_id).toBe(first);
    // The server has the link (sync pushed it), so another phone reads the same evidence.
    expect(w.server.table("captures").get(second)?.continues_capture_id).toBe(first);

    const lines = await liveLines(w);
    expect(lines.length).toBe(10);
    expect(new Set(lines.map((l) => l.statement)).size).toBe(10);

    const v = await review(w, first);
    expect(v.partial).toEqual({ unprocessed: [], unlocated: 0, recovered: 2, followUp: "read", resolved: true, tellRest: false });
    expect(v.status).toBeNull();
    expect(cardFor(v)!.partial).toEqual({ tellRest: false, resolved: true });
    const n = (await note(w, first))!;
    expect(n.partial).toEqual({ followUp: "read", resolved: true, recovered: 2, unlocated: 0, tellRest: false });
    expect(partialNoteLine(n.partial!, false)).toBe(NOTE_COPY.continued);
    expect(n.runs!.some((r) => r.unprocessed)).toBe(false);
    expect(await w.understanding.restOf(first)).toBeNull();
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
    const n = (await note(w, id))!;
    expect(n.partial).toBeNull();
    expect(n.runs!.some((r) => r.unprocessed)).toBe(false);
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
    expect(await note(w, id)).toBeNull();
  });

  it("partialOf never invents a span, never calls a whole note partial, and never resolves what no later note took", () => {
    expect(partialOf(null, null)).toBeNull();
    expect(partialOf({ unprocessed: [], unlocated: 0 }, null)).toBeNull();
    expect(partialOf({ unprocessed: [{ start: 5, end: 2 }], unlocated: 0 }, null)).toBeNull();
    const two = [{ start: 0, end: 4 }, { start: 5, end: 9 }];
    expect(partialOf({ unprocessed: two, unlocated: 0 }, null)).toEqual({ unprocessed: two, unlocated: 0, recovered: 0, followUp: "none", resolved: false, tellRest: true });
    // Read, but only one passage has a kept line on it: the other stays, and the pill stays.
    const some = partialOf({ unprocessed: two, unlocated: 0 }, { recovered: [two[0]], remaining: [two[1]], followUp: "read" })!;
    expect(some).toEqual({ unprocessed: [two[1]], unlocated: 0, recovered: 1, followUp: "read", resolved: false, tellRest: true });
    expect(partialStatus(some)).toBe(COPY.partialSome);
    // Read, nothing resting on the passages: not covered, said so.
    const missed = partialOf({ unprocessed: two, unlocated: 0 }, { recovered: [], remaining: two, followUp: "read" })!;
    expect([missed.resolved, missed.tellRest, partialStatus(missed)]).toEqual([false, true, COPY.partialMissed]);
    // Not read yet, or failed: the pill waits (the later note has its own Try again).
    const pending = partialOf({ unprocessed: two, unlocated: 0 }, { recovered: [], remaining: two, followUp: "pending" })!;
    expect([pending.tellRest, partialStatus(pending)]).toEqual([false, COPY.partialPending]);
    const failed = partialOf({ unprocessed: two, unlocated: 0 }, { recovered: [], remaining: two, followUp: "failed" })!;
    expect([failed.tellRest, partialStatus(failed)]).toEqual([false, COPY.partialFailed]);
    // Unplaced things are never matched to a later note: all passages taken still leaves the note unresolved.
    const unplaced = partialOf({ unprocessed: two, unlocated: 1 }, { recovered: two, remaining: [], followUp: "read" })!;
    expect([unplaced.resolved, unplaced.tellRest, unplaced.unprocessed, partialStatus(unplaced)]).toEqual([false, true, [], COPY.partialUnplaced]);
    // Everything taken, nothing unplaced: resolved, no line.
    const done = partialOf({ unprocessed: two, unlocated: 0 }, { recovered: two, remaining: [], followUp: "read" })!;
    expect([done.resolved, done.tellRest, partialStatus(done)]).toEqual([true, false, null]);
  });

  it("recoveryOf reads the evidence only: the words in a read note, with a kept line on them", () => {
    const text = "Priya plays chess on Tuesdays. Priya grows tomatoes.";
    const chess = span(text, "Priya plays chess on Tuesdays");
    const tomatoes = span(text, "Priya grows tomatoes");
    const later = (over: Partial<Parameters<typeof recoveryOf>[2][number]>) => ({ state: "read" as const, text: "Priya plays chess on Tuesdays Priya grows tomatoes", kept: [{ start: 0, end: 29 }], ...over });
    expect(recoveryOf(text, [chess, tomatoes], [])).toEqual({ recovered: [], remaining: [chess, tomatoes], followUp: "none" });
    // The later note says both; a line rests on the chess words only.
    expect(recoveryOf(text, [chess, tomatoes], [later({})])).toEqual({ recovered: [chess], remaining: [tomatoes], followUp: "read" });
    // The later note says the words but kept nothing on them: not recovered.
    expect(recoveryOf(text, [chess, tomatoes], [later({ kept: [] })]).recovered).toEqual([]);
    // A line resting on other words of the later note proves nothing about these.
    expect(recoveryOf(text, [chess], [later({ text: "Priya got a dog. Priya plays chess on Tuesdays", kept: [{ start: 0, end: 15 }] })]).recovered).toEqual([]);
    // Said with different spacing or case: still the same words.
    expect(recoveryOf(text, [chess], [later({ text: "priya  plays chess\non Tuesdays", kept: [{ start: 0, end: 10 }] })]).recovered).toEqual([chess]);
    // Not read yet, or failed: nothing recovered, whatever its text says; pending outranks failed outranks read.
    expect(recoveryOf(text, [chess], [later({ state: "pending" })])).toEqual({ recovered: [], remaining: [chess], followUp: "pending" });
    expect(recoveryOf(text, [chess], [later({ state: "failed" }), later({})])).toEqual({ recovered: [chess], remaining: [], followUp: "failed" });
    expect(recoveryOf(text, [chess], [later({ state: "pending" }), later({})]).followUp).toBe("pending");
    // Its text gone (delete after): nothing to match.
    expect(recoveryOf(text, [chess], [later({ text: null })]).recovered).toEqual([]);
  });
});

describe("what a later note did, from the evidence only (founder review of PR #58)", () => {
  it("told but not read yet: the note says so, keeps its marks, and does not offer Tell the rest again", async () => {
    const w = await world();
    const first = await tell(w, TEN, THINGS, { context: w.priya });
    await tellRest(w, first, THINGS.slice(8), { run: false });
    expect((await liveLines(w)).length).toBe(8);

    const v = await review(w, first);
    expect(v.status).toBe(COPY.partialPending);
    expect(v.partial).toEqual(expect.objectContaining({ followUp: "pending", resolved: false, recovered: 0, tellRest: false }));
    expect(cardFor(v)!.partial).toEqual({ tellRest: false, resolved: false });
    const n = (await note(w, first))!;
    expect(n.partial).toEqual({ followUp: "pending", resolved: false, recovered: 0, unlocated: 0, tellRest: false });
    expect(n.runs!.filter((r) => r.unprocessed).length).toBe(2);
    expect(partialNoteLine(n.partial!, true)).toBe(NOTE_COPY.pending);
    // What is still not got to is unchanged.
    expect((await w.understanding.restOf(first))!.text).toBe(REST);

    // Then read and kept: answered.
    await w.understanding.run();
    expect((await review(w, first)).partial!.resolved).toBe(true);
    expect((await liveLines(w)).length).toBe(10);
  });

  it("the later note's understanding failed: said so, nothing claimed; Undo on it brings Tell the rest back", async () => {
    const w = await world();
    const uh = new Understanding(w.store, () => w.engine.sync(), new Gateway(w.gateway), { maxAttempts: 1, clock: () => w.server.clock });
    w.gateway.propose(TEN, proposals(THINGS));
    const c = await w.repos.captures.tell(TEN, { aiEnabled: true, timeZone: TZ, contextPersonId: w.priya.id });
    await uh.told(c.id);
    await uh.run();
    const rest = (await uh.restOf(c.id))!;
    w.gateway.propose(rest.text, proposals(THINGS.slice(8)));
    const second = await w.repos.captures.tell(rest.text, { aiEnabled: true, timeZone: TZ, contextPersonId: rest.personId ?? undefined, continuesCaptureId: c.id });
    await uh.told(second.id);
    w.gateway.failNext = { status: 503, error: "try_later" };
    await uh.run();
    expect((await uh.get(second.id))!.state).toBe("failed");

    const v = await review(w, c.id);
    expect(v.status).toBe(COPY.partialFailed);
    expect(v.partial).toEqual(expect.objectContaining({ followUp: "failed", resolved: false, recovered: 0, tellRest: false }));
    const n = (await note(w, c.id))!;
    expect(n.partial).toEqual(expect.objectContaining({ followUp: "failed", tellRest: false }));
    expect(n.runs!.filter((r) => r.unprocessed).length).toBe(2);
    expect(partialNoteLine(n.partial!, true)).toBe(NOTE_COPY.failed);
    expect((await liveLines(w)).length).toBe(8);

    // Undo on the failed later note: the first is as it was, with Tell the rest offered again.
    await uh.undo(second.id);
    const back = await review(w, c.id);
    expect([back.status, back.partial!.followUp, back.partial!.tellRest]).toEqual([COPY.partial, "none", true]);
    expect((await uh.restOf(c.id))!.text).toBe(REST);
    expect((await liveLines(w)).length).toBe(8);
  });

  it("the later note was read but was itself partial: only the passage a kept line rests on is answered", async () => {
    const w = await world();
    const first = await tell(w, TEN, THINGS, { context: w.priya });
    // The rest, understood with nine proposals on its first passage and the tomatoes past the limit.
    const chessEight = ["is good at chess", "plays on Tuesdays", "likes chess", "keeps Tuesdays for chess", "has a chess night", "plays chess weekly", "enjoys chess", "plays chess"]
      .map((t) => ({ statement: `Priya ${t}`, evidence: THINGS[8] }));
    await tellRest(w, first, [...chessEight, THINGS[9]]);

    const v = await review(w, first);
    expect(v.status).toBe(COPY.partialSome);
    expect(v.partial).toEqual({ unprocessed: [span(TEN, THINGS[9])], unlocated: 0, recovered: 1, followUp: "read", resolved: false, tellRest: true });
    const n = (await note(w, first))!;
    expect(n.runs!.filter((r) => r.unprocessed).map((r) => r.text.trim())).toEqual([THINGS[9]]);
    expect(partialNoteLine(n.partial!, true)).toBe(NOTE_COPY.some);
    // Tell the rest now holds only what is still not got to.
    expect(await w.understanding.restOf(first)).toEqual({ text: THINGS[9], personId: w.priya.id });
  });

  it("the later note was read but holds other words: nothing is answered, and it says so", async () => {
    const w = await world();
    const first = await tell(w, TEN, THINGS, { context: w.priya });
    await tellRest(w, first, ["Priya got a dog"], { text: "Priya got a dog." });
    expect((await liveLines(w)).length).toBe(9);

    const v = await review(w, first);
    expect(v.status).toBe(COPY.partialMissed);
    expect(v.partial).toEqual(expect.objectContaining({ recovered: 0, followUp: "read", resolved: false, tellRest: true }));
    const n = (await note(w, first))!;
    expect(n.runs!.filter((r) => r.unprocessed).length).toBe(2);
    expect(partialNoteLine(n.partial!, true)).toBe(NOTE_COPY.missed);
    expect((await w.understanding.restOf(first))!.text).toBe(REST);
  });

  it("the later note said the words but kept nothing on them: not answered", async () => {
    const w = await world();
    const first = await tell(w, TEN, THINGS, { context: w.priya });
    // The model proposes nothing for the rest (as it may): read, nothing kept, nothing recovered.
    await tellRest(w, first, []);
    expect((await liveLines(w)).length).toBe(8);
    const v = await review(w, first);
    expect([v.status, v.partial!.recovered, v.partial!.resolved, v.partial!.tellRest]).toEqual([COPY.partialMissed, 0, false, true]);
  });

  it("Undo on the later note after it answered the first: the first is unfinished again, with its own lines intact", async () => {
    const w = await world();
    const first = await tell(w, TEN, THINGS, { context: w.priya });
    const second = await tellRest(w, first, THINGS.slice(8));
    expect((await review(w, first)).partial!.resolved).toBe(true);

    await w.understanding.undo(second);
    expect((await liveLines(w)).length).toBe(8);
    const v = await review(w, first);
    expect([v.status, v.partial!.followUp, v.partial!.resolved, v.partial!.tellRest]).toEqual([COPY.partial, "none", false, true]);
    const n = (await note(w, first))!;
    expect(n.runs!.filter((r) => r.unprocessed).length).toBe(2);
    expect((await w.understanding.restOf(first))!.text).toBe(REST);
    // Told again, kept once more: still nothing twice.
    await tellRest(w, first, THINGS.slice(8));
    expect((await review(w, first)).partial!.resolved).toBe(true);
    expect(new Set((await liveLines(w)).map((l) => l.statement)).size).toBe(10);
  });

  it("a thing whose words could not be placed is never matched to a later note: the note stays unfinished, honestly", async () => {
    const w = await world();
    const nine = THINGS.slice(0, 9).map((t) => `${t}.`).join(" ");
    // The model's tenth proposal quotes words the note does not have.
    const first = await tell(w, nine, [...THINGS.slice(0, 9), { statement: "Priya runs marathons" }], { context: w.priya });
    expect((await w.repos.captures.get(first))!.coverage).toEqual({ v: 1, unprocessed: [span(nine, THINGS[8])], unlocated: 1 });
    expect(await w.understanding.restOf(first)).toEqual({ text: THINGS[8], personId: w.priya.id });

    await tellRest(w, first, [THINGS[8]]);
    const v = await review(w, first);
    expect(v.status).toBe(COPY.partialUnplaced);
    expect(v.partial).toEqual({ unprocessed: [], unlocated: 1, recovered: 1, followUp: "read", resolved: false, tellRest: true });
    const n = (await note(w, first))!;
    expect(n.runs!.some((r) => r.unprocessed)).toBe(false);
    expect(partialNoteLine(n.partial!, false)).toBe(NOTE_COPY.unplaced);
    // Nothing left to prefill; the pill opens an empty field about Priya.
    expect(await w.understanding.restOf(first)).toEqual({ text: "", personId: w.priya.id });
  });

  it("two things in one sentence: the one past the limit stays visible under the kept line's words until it is kept", async () => {
    const w = await world();
    const sentence = "Priya loves jazz and plays chess on Tuesdays";
    const text = [...THINGS.slice(1, 8), sentence].map((t) => `${t}.`).join(" ");
    const first = await tell(w, text, [...THINGS.slice(1, 8), { statement: "Priya loves jazz", evidence: sentence }, { statement: "Priya plays chess on Tuesdays", evidence: sentence }], { context: w.priya });
    expect((await liveLines(w)).map((l) => l.statement)).toContain("Priya loves jazz");
    expect((await liveLines(w)).map((l) => l.statement)).not.toContain("Priya plays chess on Tuesdays");
    expect((await w.repos.captures.get(first))!.coverage).toEqual({ v: 1, unprocessed: [span(text, sentence)], unlocated: 0 });

    // The Source view: the sentence is a kept line's words and holds something not got to; both are shown.
    const n = (await note(w, first))!;
    const both = n.runs!.filter((r) => r.marked && r.unprocessed);
    expect(both.map((r) => r.text)).toEqual([sentence]);
    expect(n.runs!.filter((r) => r.marked).length).toBe(8);
    expect((await review(w, first)).status).toBe(COPY.partial);
    expect(await w.understanding.restOf(first)).toEqual({ text: sentence, personId: w.priya.id });

    // Told again, the chess line is kept from the later note, on those words: answered.
    await tellRest(w, first, [{ statement: "Priya plays chess on Tuesdays", evidence: "plays chess on Tuesdays" }]);
    expect((await liveLines(w)).map((l) => l.statement)).toContain("Priya plays chess on Tuesdays");
    expect((await review(w, first)).partial!.resolved).toBe(true);
    expect((await note(w, first))!.runs!.some((r) => r.unprocessed)).toBe(false);
  });

  it("several people, no page: the rest is told about no one in particular, and each passage is answered by its own kept line", async () => {
    const w = await world();
    const mixed = [...THINGS.slice(0, 8), "Ben runs marathons", "Priya grows tomatoes"];
    const text = mixed.map((t) => `${t}.`).join(" ");
    const first = await tell(w, text, mixed.map((t) => ({ statement: t, person: t.startsWith("Ben") ? "Ben" : "Priya" })), { context: null });
    expect(await w.understanding.restOf(first)).toEqual({ text: "Ben runs marathons Priya grows tomatoes", personId: null });

    // Ben's part alone first: one passage answered, the other still marked and still Priya's to tell.
    await tellRest(w, first, [{ statement: "Ben runs marathons", person: "Ben" }], { text: "Ben runs marathons" });
    let v = await review(w, first);
    expect([v.status, v.partial!.recovered, v.partial!.unprocessed]).toEqual([COPY.partialSome, 1, [span(text, "Priya grows tomatoes")]]);
    expect(await w.understanding.restOf(first)).toEqual({ text: "Priya grows tomatoes", personId: null });
    // Then Priya's: answered whole. Lines: eight, Ben's, Priya's; none twice.
    await tellRest(w, first, [{ statement: "Priya grows tomatoes", person: "Priya" }]);
    v = await review(w, first);
    expect([v.status, v.partial!.resolved]).toEqual([null, true]);
    const lines = await liveLines(w);
    expect(lines.length).toBe(10);
    expect(lines.filter((l) => l.person_id === w.ben.id).map((l) => l.statement)).toEqual(["Ben runs marathons"]);
  });

  it("a pronoun in the rest: told from the page it came from, the line waits on its question before anything is answered", async () => {
    const w = await world();
    const things = [...THINGS.slice(0, 9), "She grows tomatoes"];
    const text = things.map((t) => `${t}.`).join(" ");
    const first = await tell(w, text, things.map((t) => (t.startsWith("She") ? { statement: t, person: "unknown", mention: "She" } : t)), { context: w.priya });
    expect(await w.understanding.restOf(first)).toEqual({ text: `${THINGS[8]} She grows tomatoes`, personId: w.priya.id });

    // The model files "She" as unknown: the line is held for "who?", not kept; the first note is not answered by it.
    const second = await tellRest(w, first, [THINGS[8], { statement: "She grows tomatoes", person: "unknown", mention: "She" }]);
    const row = (await w.understanding.get(second))!;
    // The model files "She" as unknown and the rest has no earlier "she": the line is held for "who?", not kept.
    expect(row.reading ? questionWaiting(row.reading) : false).toBe(true);
    // A question waits on the later note: not read yet, as far as the first note can say.
    const v = await review(w, first);
    expect([v.status, v.partial!.followUp, v.partial!.resolved, v.partial!.tellRest]).toEqual([COPY.partialPending, "pending", false, false]);
    await w.understanding.opened(second);
    await w.understanding.answer(second, [{ index: 0, person_id: w.priya.id }]);
    await w.understanding.run();
    // Answered: both passages have a kept line on them.
    const after = await review(w, first);
    expect([after.status, after.partial!.resolved, after.partial!.recovered]).toEqual([null, true, 2]);
    const lines = await liveLines(w);
    expect(lines.length).toBe(10);
    expect(lines.filter((l) => /tomatoes/u.test(l.statement)).map((l) => l.person_id)).toEqual([w.priya.id]);
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
    expect(flow.current!.draft(w.priya.id)).toBe(REST);

    w.gateway.propose(REST, proposals(THINGS.slice(8)));
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
