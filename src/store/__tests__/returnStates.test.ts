// The return loop as a state machine (founder K3, N6, I2; the verification
// addendum's paths 1–10), through the real device record (ReasonLocal), the
// return-loop steps Today's actions use, the encrypted store, sync and the
// Today model. Paths 11 and 12 (N8's exact Undo of a reason, another live
// closer) are database rules: pgTAP 60 and 66.
import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import { buildToday, waitingReasonId, type ContactRow, type ReasonRow, type TodayInput } from "@/features/today/todayModel";
import { buildPortrait } from "@/features/person/portraitModel";
import { reachedAbout, trailFor, type ContactEventRow } from "@/features/person/trail";
import { ReasonLocal } from "@/store/reasonLocal";
import type { ReasonEvent } from "@/store/reasons";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { answerReturn, cancelHandOff, conversationId, forgetConversation, handOff, handoffFor, type ReturnLoopDeps } from "@/store/returnLoop";
import { acceptLink, portraitFor } from "@/hooks/useV2";
import { detailFor, quietKey } from "@/features/today/momentDetail";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { UserStore } from "@/store/userStore";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000f7";
const NOW = new Date(2026, 9, 12, 9, 0); // Monday Oct 12, 9am local

const tyler = { id: "tyler", display_name: "Tyler Shaffer", state: "active" } as unknown as Person;
const josh = { id: "josh", display_name: "Josh", state: "active" } as unknown as Person;
const promise = {
  id: "p1", kind: "promise", person_id: "tyler", subject_type: "person", statement: "Tyler said he'd send you his contractor's number",
  detail: { due_date: "2026-10-09" }, certainty: "stated", status: "active", sensitivity: "none", user_state: "unreviewed", origin: "extracted",
  created_at: "2026-10-06T18:00:00Z",
} as unknown as MemoryItem;
const interview = {
  id: "e1", kind: "event", person_id: "josh", subject_type: "person", statement: "Josh has his interview Tuesday",
  detail: { date: "2026-10-13", date_precision: "day", event_type: "interview", followup_policy: "both" }, certainty: "stated", status: "active",
  sensitivity: "none", user_state: "unreviewed", origin: "extracted", created_at: "2026-10-08T18:00:00Z",
} as unknown as MemoryItem;
const reasonRow = (state: string): ReasonRow => ({
  id: "r1", person_id: "josh", type: "upcoming_event", window_start: new Date(2026, 9, 12).toISOString(), window_end: new Date(2026, 9, 13).toISOString(),
  score: 85, state, dedupe_key: "upcoming_event:e1:2026-10-13",
});
const WAITING = waitingReasonId("p1", "2026-10-09");

let n = 0;
/** A phone; a new one seeds the people, a reopened one or a second phone has them from before or from sync. */
async function phone(server: FakeServer, file = `rs-${randomUUID()}`, seed = true, clock = () => NOW) {
  const db = await openSqlJsDb(file);
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { now: () => clock().toISOString(), newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}` });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  if (seed) {
    await store.create("people", { id: "tyler", display_name: "Tyler Shaffer", state: "active" });
    await store.create("people", { id: "josh", display_name: "Josh", state: "active" });
  }
  const events: { reasonId: string; event: ReasonEvent }[] = [];
  const local = new ReasonLocal(store);
  const repos = repositoriesFor(store);
  const deps: ReturnLoopDeps = { local, contacts: repos.contacts, record: (reasonId, event) => events.push({ reasonId, event }), now: clock };
  return { db, store, engine, local, repos, deps, events, file };
}
type Phone = Awaited<ReturnType<typeof phone>>;

async function contactsOn(p: Phone): Promise<ContactRow[]> {
  return (await p.store.list("contact_events")) as unknown as ContactRow[];
}

async function today(p: Phone, over: Partial<TodayInput> = {}) {
  const s = await p.local.read();
  return buildToday({
    now: NOW, today: "2026-10-12", reasons: [], items: [promise, interview], people: [tyler, josh], local: s.local, primaries: s.primaries,
    handoff: s.handoff, told: 2, questions: 0, toLookAt: 0, provenance: () => null, activated: true, contacts: await contactsOn(p), ...over,
  });
}
const waitingLine = (v: ReturnType<typeof buildToday>) => v.quiet.find((q) => q.kind === "waiting") ?? null;
const fromWaiting = { reasonId: WAITING, personId: "tyler", channel: "text" as const, type: "waiting" as const, itemId: "p1", ask: "Did you reach Tyler?", followUp: "" };

describe("K3: 'Waiting on Tyler' → Message → Yes → nothing worth remembering", () => {
  it("path 1: the conversation is recorded once, about the promise, and Waiting never comes back, after a sync, on reopen, or on another phone", async () => {
    const server = new FakeServer();
    let p = await phone(server);
    expect(waitingLine(await today(p))).toMatchObject({ label: "Waiting on Tyler", itemId: "p1" });

    await handOff(p.deps, fromWaiting);
    const away = await today(p);
    expect(waitingLine(away)).toBeNull(); // handed off: the return question asks instead
    expect(away.returnCheck).toMatchObject({ ask: "Did you reach Tyler?", followUp: "" });
    expect(await contactsOn(p)).toEqual([]); // opening Messages is not a conversation

    const h = await answerReturn(p.deps, "yes");
    expect(h?.followUp).toBe(""); // a promise's logistics: "Anything worth remembering?" isn't asked
    const recorded = await contactsOn(p);
    expect(recorded.map((c) => [c.person_id, c.memory_item_id, (c as unknown as Record<string, unknown>).moment_type, (c as unknown as Record<string, unknown>).source]))
      .toEqual([["tyler", "p1", "waiting", "return_check"]]);
    expect(p.events).toEqual([]); // a Moment made on the phone has no server reason to record
    const after = await today(p);
    expect([waitingLine(after), after.returnCheck]).toEqual([null, null]);

    // "Nothing worth remembering" changes none of this; nor do two syncs and a relaunch.
    await p.engine.sync();
    await p.engine.sync();
    p.db.persist();
    p = await phone(server, p.file, false);
    await p.engine.sync();
    expect(waitingLine(await today(p))).toBeNull();
    expect([...server.table("contact_events").values()]).toHaveLength(1);

    // Another phone, with none of this device's record: the synced conversation is enough.
    const other = await phone(server, undefined, false);
    await other.engine.sync();
    expect(waitingLine(await today(other))).toBeNull();
  });

  it("path 3: Messages opened, never answered: nothing is recorded, and after three days the question lapses without one", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    expect((await today(p)).returnCheck).not.toBeNull();
    const later = await today(p, { now: new Date(NOW.getTime() + 73 * 3600_000) });
    expect(later.returnCheck).toBeNull();
    expect(await contactsOn(p)).toEqual([]);
  });

  it("path 4: the app killed in Messages: the question waits on reopen", async () => {
    let p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    p.db.persist();
    p = await phone(new FakeServer(), p.file, false);
    expect((await today(p)).returnCheck).toMatchObject({ reasonId: WAITING });
  });

  it("paths 5 and 6: Yes, then a force quit before any sync, and a second Yes from a repeated tap: one conversation", async () => {
    const server = new FakeServer();
    let p = await phone(server);
    await handOff(p.deps, fromWaiting);
    const [a, b] = await Promise.all([answerReturn(p.deps, "yes"), answerReturn(p.deps, "yes")]);
    expect([!!a, !!b].sort()).toEqual([false, true]);
    expect(await answerReturn(p.deps, "yes")).toBeNull();
    p.db.persist();
    p = await phone(server, p.file, false);
    expect(await contactsOn(p)).toHaveLength(1);
    expect(waitingLine(await today(p))).toBeNull();
    await p.engine.sync();
    await p.engine.sync();
    expect([...server.table("contact_events").values()]).toHaveLength(1);
  });
});

describe("N6: a server Moment → Message → Not yet → sync", () => {
  it("path 2: it speaks again, whether the sync brings back 'acted' (Not yet not yet heard) or 'surfaced' (the migration's answer)", async () => {
    const p = await phone(new FakeServer());
    expect((await today(p, { reasons: [reasonRow("surfaced")] })).moment?.reasonId).toBe("r1");
    await handOff(p.deps, { reasonId: "r1", personId: "josh", channel: "text", type: "upcoming_event", itemId: "e1", ask: "Did you reach Josh?" });
    expect((await today(p, { reasons: [reasonRow("acted")] })).moment).toBeNull(); // away: the return question asks
    await answerReturn(p.deps, "not_yet");
    expect(p.events.map((e) => e.event)).toEqual(["acted", "return_not_yet"]);
    expect(await contactsOn(p)).toEqual([]);
    expect((await today(p, { reasons: [reasonRow("acted")] })).moment?.reasonId).toBe("r1");
    expect((await today(p, { reasons: [reasonRow("surfaced")] })).moment?.reasonId).toBe("r1");
  });

  it("path 7: Not yet twice: one Moment, nothing recorded", async () => {
    const p = await phone(new FakeServer());
    for (let i = 0; i < 2; i++) {
      await handOff(p.deps, { reasonId: "r1", personId: "josh", channel: "text", type: "upcoming_event", itemId: "e1" });
      await answerReturn(p.deps, "not_yet");
    }
    const v = await today(p, { reasons: [reasonRow("acted")] });
    expect(v.moment?.reasonId).toBe("r1");
    expect(await contactsOn(p)).toEqual([]);
  });

  it("path 8: Yes after an earlier Not yet: one conversation, about the interview, and the Moment is done", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, { reasonId: "r1", personId: "josh", channel: "text", type: "upcoming_event", itemId: "e1" });
    await answerReturn(p.deps, "not_yet");
    await handOff(p.deps, { reasonId: "r1", personId: "josh", channel: "call", type: "upcoming_event", itemId: "e1" });
    await answerReturn(p.deps, "yes");
    const recorded = (await contactsOn(p)) as unknown as Record<string, unknown>[];
    expect(recorded.map((c) => [c.channel, c.reason_id, c.memory_item_id, c.moment_type])).toEqual([["call", "r1", "e1", "upcoming_event"]]);
    expect((await today(p, { reasons: [reasonRow("done")] })).moment).toBeNull();
    expect((await today(p, { reasons: [reasonRow("acted")] })).moment).toBeNull(); // done on this phone, whatever the server says
  });

  it("paths 9 and 10: put aside, or expired: a sync and a stale 'Not yet' never reopen it", async () => {
    const p = await phone(new FakeServer());
    await p.local.dismissed("r1", NOW.toISOString());
    expect((await today(p, { reasons: [reasonRow("dismissed")] })).moment).toBeNull();
    const q = await phone(new FakeServer());
    await handOff(q.deps, { reasonId: "r1", personId: "josh", channel: "text", type: "upcoming_event", itemId: "e1" });
    await answerReturn(q.deps, "not_yet");
    expect((await today(q, { reasons: [reasonRow("expired")] })).moment).toBeNull();
    expect((await today(q, { reasons: [reasonRow("suppressed")] })).moment).toBeNull();
  });
});

describe("I2: the trail", () => {
  it("manual Message, Call, Video and In person each record one conversation; the trail says how and when, newest first, three on the page, every one in What Kinship knows", async () => {
    const p = await phone(new FakeServer());
    for (const channel of ["text", "call", "video", "in_person"] as const) await p.repos.contacts.confirm({ person_id: "tyler", channel, source: "manual" });
    await handOff(p.deps, fromWaiting);
    await answerReturn(p.deps, "yes");
    const rows = (await contactsOn(p)) as unknown as ContactEventRow[];
    expect(rows).toHaveLength(5);
    const trail = trailFor(rows.map((r, i) => ({ ...r, occurred_at: new Date(2026, 9, 7 + i, 12).toISOString() })), [promise], tyler, NOW);
    expect(trail.map((t) => [t.label, t.about])).toEqual([
      ["You messaged · Oct 11", "Tyler said he'd send you his contractor's number"],
      ["You saw Tyler · Oct 10", null],
      ["You had a video call · Oct 9", null],
      ["You called · Oct 8", null],
      ["You messaged · Oct 7", null],
    ]);
    const page = buildPortrait({ person: tyler, items: [], today: "2026-10-12", trail });
    expect(page.trail).toHaveLength(3);
    expect(page.more).toBe(true);
    expect(JSON.stringify(page)).not.toMatch(/last contacted|times|streak/i);
  });

  it("'Not this' takes a conversation recorded by mistake off the trail; a retracted memory is no longer what it was about", async () => {
    const p = await phone(new FakeServer());
    const c = await p.repos.contacts.confirm({ person_id: "tyler", channel: "text", source: "return_check", moment_type: "waiting", memory_item_id: "p1" });
    await p.repos.contacts.forget(String(c.id));
    expect(trailFor((await contactsOn(p)) as unknown as ContactEventRow[], [promise], tyler, NOW)).toEqual([]);
    const row = { id: "c9", person_id: "tyler", channel: "text", occurred_at: NOW.toISOString(), memory_item_id: "p1" };
    expect(trailFor([row], [{ ...promise, status: "retracted" } as MemoryItem], tyler, NOW).map((t) => t.about)).toEqual([null]);
  });

  it("a return check still names what it answered", async () => {
    const p = await phone(new FakeServer());
    await expect(p.repos.contacts.confirm({ person_id: "tyler", channel: "text", source: "return_check" })).rejects.toThrow();
  });
});

describe("K2: someone else's promise, due Fri Oct 9, by calendar day where the user is", () => {
  const page = (day: string, item: Partial<MemoryItem> = {}, reached?: Set<string>) => {
    const it = { ...promise, ...item } as MemoryItem;
    const p = buildPortrait({ person: tyler, items: [{ item: it, provenance: "You told Kinship · Oct 6", noteId: "c1", when: "By Fri, Oct 9" }], today: day, reached });
    return { coming: p.comingUp.map((l) => l.when), lately: p.lately.map((l) => l.when) };
  };

  it("Coming up through its day; from the day after, never Coming up: Lately as 'Waiting on Tyler' for a month, then only What Kinship knows", () => {
    expect(page("2026-10-08")).toEqual({ coming: ["By Fri, Oct 9"], lately: [] });
    expect(page("2026-10-09")).toEqual({ coming: ["By Fri, Oct 9"], lately: [] });
    expect(page("2026-10-10")).toEqual({ coming: [], lately: ["Waiting on Tyler"] });
    expect(page("2026-10-12")).toEqual({ coming: [], lately: ["Waiting on Tyler"] });
    expect(page("2026-11-08")).toEqual({ coming: [], lately: ["Waiting on Tyler"] });
    expect(page("2026-11-09")).toEqual({ coming: [], lately: [] });
  });

  it("reached about it since: no 'Waiting'; resolved or cancelled: not on the page at all", () => {
    expect(page("2026-10-12", {}, new Set(["p1"]))).toEqual({ coming: [], lately: [null] });
    expect(page("2026-10-12", { status: "resolved" })).toEqual({ coming: [], lately: [] });
    expect(page("2026-10-12", { status: "superseded" })).toEqual({ coming: [], lately: [] });
  });

  it("no day, or only a month or a year: never a 'past its day' state", () => {
    expect(page("2026-10-12", { detail: {} })).toEqual({ coming: [], lately: ["By Fri, Oct 9"] });
    for (const precision of ["month", "year"]) {
      expect(page("2026-10-12", { detail: { due_date: "2026-10-01", date_precision: precision } })).toEqual({ coming: [], lately: ["By Fri, Oct 9"] });
    }
  });

  it("Today: Coming up on its day (\"Today\"), Waiting on days 1–3 after, then nothing; never 'overdue', 'late' or a count", () => {
    const at = (d: number) => buildToday({
      now: new Date(2026, 9, d, 21, 30), today: `2026-10-${String(d).padStart(2, "0")}`, reasons: [], items: [promise], people: [tyler],
      local: {}, primaries: [], handoff: null, told: 1, questions: 0, toLookAt: 0, provenance: () => null, activated: true, contacts: [],
    }).quiet.map((q) => `${q.kind}:${q.label}:${q.text}`);
    expect(at(8)).toEqual(["coming:Tomorrow:Tyler said he'd send you his contractor's number"]);
    expect(at(9)).toEqual(["coming:Today:Tyler said he'd send you his contractor's number"]);
    for (const d of [10, 11, 12]) expect(at(d)).toEqual(["waiting:Waiting on Tyler:Did Tyler send it?"]);
    expect(at(13)).toEqual([]);
    expect(JSON.stringify([8, 9, 10, 11, 12, 13].map(at))).not.toMatch(/overdue|late|days? ago|still haven/i);
  });
});

describe("reviewers C, D, E (13 Oct): the return loop's edges", () => {
  it("C1: never 'Waiting on …' on the page of someone remembered or paused", () => {
    for (const state of ["remembered", "paused"]) {
      const p = buildPortrait({ person: { ...tyler, state } as Person, items: [{ item: promise, provenance: "x", noteId: null, when: "By Fri, Oct 9" }], today: "2026-10-12" });
      expect([state, p.lately.map((l) => l.when)]).toEqual([state, [null]]);
    }
  });

  it("C3: a Yes is dated when Kinship opened the conversation, not when it was answered", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    const later = { ...p.deps, now: () => new Date(NOW.getTime() + 2 * 86_400_000) };
    await answerReturn(later, "yes");
    expect((await contactsOn(p)).map((c) => c.occurred_at)).toEqual([NOW.toISOString()]);
  });

  it("C3: handed off from Coming up before the day, the return question asks; 'Waiting on' never asks the same at once", async () => {
    const p = await phone(new FakeServer());
    await handOff({ ...p.deps, now: () => new Date(2026, 9, 8, 9) }, { reasonId: "coming:p1:2026-10-09", personId: "tyler", channel: "text", type: "coming", itemId: "p1", followUp: "" });
    const v = await today(p, { now: new Date(2026, 9, 10, 9), today: "2026-10-10" });
    expect(v.returnCheck).not.toBeNull();
    expect(waitingLine(v)).toBeNull();
  });

  it("C4: 'Not this' on the conversation brings Waiting back, on this phone as on any other", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    await answerReturn(p.deps, "yes");
    expect(waitingLine(await today(p))).toBeNull();
    const [c] = await contactsOn(p) as unknown as { id: string }[];
    await p.repos.contacts.forget(c.id);
    await p.local.reopenWaiting("p1");
    expect(waitingLine(await today(p))).toMatchObject({ label: "Waiting on Tyler" });
  });

  it("C5: every write to the device's record is one at a time: a 'shown' racing an answer never undoes it", async () => {
    for (const answer of ["yes", "not_yet"] as const) {
      const p = await phone(new FakeServer());
      await handOff(p.deps, { reasonId: "r1", personId: "josh", channel: "text", type: "upcoming_event", itemId: "e1" });
      await Promise.all([p.local.shown("r1", "josh", "2026-10-12"), answerReturn(p.deps, answer), p.local.shown("r2", "josh", "2026-10-12")]);
      const r1 = (await p.local.read()).local.r1;
      expect([answer, r1.firstShown, answer === "yes" ? r1.done : r1.notYet]).toEqual([answer, "2026-10-12", NOW.toISOString()]);
      if (answer === "not_yet") expect(r1.acted).toBeUndefined();
    }
  });

  it("C6: the other app never opened: the Moment speaks again, also after a sync brings back 'acted'", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, { reasonId: "r1", personId: "josh", channel: "text", type: "upcoming_event", itemId: "e1" });
    await cancelHandOff(p.deps, "r1");
    expect(p.events.map((e) => e.event)).toEqual(["acted", "return_not_yet"]);
    expect((await today(p, { reasons: [reasonRow("acted")] })).moment?.reasonId).toBe("r1");
  });

  it("E2: 'Waiting on Tyler' through its real detail: the hand-off carries the promise and asks nothing after", async () => {
    const p = await phone(new FakeServer());
    const v = await today(p);
    const d = detailFor(v, quietKey(waitingLine(v)!)!, "2026-10-12", () => "Tyler")!;
    await handOff(p.deps, { reasonId: d.reason.id, personId: d.personId, channel: "text", type: d.reason.type, itemId: d.reason.itemId, ask: d.reason.ask, about: d.reason.about, followUp: d.reason.followUp });
    expect((await today(p)).returnCheck).toMatchObject({ reasonId: WAITING, followUp: "" });
    await answerReturn(p.deps, "yes");
    expect((await contactsOn(p)).map((c) => [c.memory_item_id, (c as unknown as Record<string, unknown>).moment_type])).toEqual([["p1", "waiting"]]);
  });

  it("E9: the app closed after the conversation was written but before the answer was kept: asked again, still one conversation", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    const h = (await p.local.read()).handoff!;
    await p.repos.contacts.confirm({ id: conversationId(h), person_id: "tyler", channel: "text", source: "return_check", moment_type: "waiting", memory_item_id: "p1", occurred_at: h.at });
    expect((await today(p)).returnCheck).not.toBeNull();
    expect(await answerReturn(p.deps, "yes")).not.toBeNull();
    expect(await contactsOn(p)).toHaveLength(1);
  });

  it("E11/E12: a promise with only words for its day never waits; the return question is there at 71 hours", async () => {
    const p = await phone(new FakeServer());
    const vague = { ...promise, detail: { due_hint: "in October" } } as MemoryItem;
    expect(waitingLine(await today(p, { items: [vague] }))).toBeNull();
    await handOff(p.deps, fromWaiting);
    expect((await today(p, { now: new Date(NOW.getTime() + 71 * 3600_000) })).returnCheck).not.toBeNull();
  });

  it("D: the trail says what a conversation was about only when that memory is about this person", () => {
    const row = { id: "c1", person_id: "tyler", channel: "text", occurred_at: NOW.toISOString(), memory_item_id: "e1" };
    expect(trailFor([row], [interview], tyler, NOW).map((t) => t.about)).toEqual([null]);
    expect(trailFor([{ ...row, memory_item_id: "p1" }], [promise], tyler, NOW).map((t) => t.about)).toEqual([promise.statement]);
  });
});

describe("reviewer C, round 2 (13 Oct)", () => {
  it("N1: a Yes written just before the app closed, then 'Not yet': no conversation is left, and Waiting asks again", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    const h = (await p.local.read()).handoff!;
    await p.repos.contacts.confirm({ id: conversationId(h), person_id: "tyler", channel: "text", source: "return_check", moment_type: "waiting", memory_item_id: "p1", occurred_at: h.at });
    await answerReturn(p.deps, "not_yet");
    expect(await contactsOn(p).then((cs) => cs.filter((c) => !c.deleted_at))).toEqual([]);
    expect(waitingLine(await today(p))).toMatchObject({ label: "Waiting on Tyler" });
  });

  it("N2: the same, then 'Not this' on it, then Yes: the answer is kept, nothing throws, no second row", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    const h = (await p.local.read()).handoff!;
    await p.repos.contacts.confirm({ id: conversationId(h), person_id: "tyler", channel: "text", source: "return_check", moment_type: "waiting", memory_item_id: "p1", occurred_at: h.at });
    await p.repos.contacts.forget(conversationId(h));
    await expect(answerReturn(p.deps, "yes")).resolves.not.toBeNull();
    expect((await today(p)).returnCheck).toBeNull();
  });

  it("N3: a conversation with Tyler never stops 'Waiting on Sam' after the promise is moved to Sam", async () => {
    const p = await phone(new FakeServer());
    const moved = { ...promise, person_id: "josh" } as MemoryItem;
    const contacts: ContactRow[] = [{ person_id: "tyler", memory_item_id: "p1", occurred_at: NOW.toISOString() }];
    expect(waitingLine(await today(p, { items: [moved], contacts }))).toMatchObject({ label: "Waiting on Josh" });
  });
});

describe("reviewer E, round 2 (13 Oct): the paths only the screens took", () => {
  it("Today's own hand-off: a Waiting and a due Coming up ask nothing after a Yes; a Moment asks 'Anything worth remembering?'; each carries its memory", async () => {
    // Waiting on Tyler (due Oct 9; Monday Oct 12).
    const p = await phone(new FakeServer());
    const v = await today(p);
    const w = detailFor(v, quietKey(waitingLine(v)!)!, "2026-10-12", () => "Tyler")!;
    await handOff(p.deps, handoffFor(w.personId, "text", w.reason));
    expect((await today(p)).returnCheck).toMatchObject({ reasonId: WAITING, followUp: "" });
    expect((await answerReturn(p.deps, "yes"))?.followUp).toBe("");

    // Coming up on its day (Friday Oct 9).
    const fri = new Date(2026, 9, 9, 9);
    const q = await phone(new FakeServer(), undefined, true, () => fri);
    const cv = await today(q, { now: fri, today: "2026-10-09" });
    const coming = cv.quiet.find((x) => x.kind === "coming" && x.itemId === "p1")!;
    const c = detailFor(cv, quietKey(coming)!, "2026-10-09", () => "Tyler")!;
    await handOff(q.deps, handoffFor(c.personId, "call", c.reason));
    expect((await today(q, { now: fri, today: "2026-10-09" })).returnCheck).toMatchObject({ followUp: "" });
    expect((await answerReturn(q.deps, "yes"))?.followUp).toBe("");
    expect((await contactsOn(q)).map((x) => x.memory_item_id)).toEqual(["p1"]);

    // A server Moment (Josh's interview tomorrow).
    const r = await phone(new FakeServer());
    const mv = await today(r, { reasons: [reasonRow("surfaced")] });
    const m = detailFor(mv, mv.moment!.reasonId, "2026-10-12", () => "Josh")!;
    await handOff(r.deps, handoffFor(m.personId, "text", m.reason));
    expect((await today(r, { reasons: [reasonRow("acted")] })).returnCheck?.followUp).toMatch(/^Anything worth remembering/);
    expect((await answerReturn(r.deps, "yes"))?.followUp).toMatch(/^Anything worth remembering/);
    expect((await contactsOn(r)).map((x) => x.memory_item_id)).toEqual(["e1"]);
  });

  it("'Waiting on Tyler' put aside on this phone (Not now), or answered here, stays gone even with no conversation synced yet", async () => {
    const p = await phone(new FakeServer());
    await p.local.dismissed(WAITING, NOW.toISOString());
    expect(waitingLine(await today(p, { contacts: [] }))).toBeNull();
    const q = await phone(new FakeServer());
    await handOff(q.deps, fromWaiting);
    await answerReturn(q.deps, "yes");
    expect(waitingLine(await today(q, { contacts: [] }))).toBeNull();
  });

  it("N2: the conversation is written before the answer is kept: a failed write keeps the question, and nothing is recorded", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    const failing = { ...p.deps, contacts: Object.assign(Object.create(p.repos.contacts), { confirm: () => Promise.reject(new Error("disk full")) }) };
    await expect(answerReturn(failing, "yes")).rejects.toThrow("disk full");
    expect((await p.local.read()).handoff?.answered).toBeUndefined();
    expect((await today(p)).returnCheck).toMatchObject({ reasonId: WAITING });
    expect(await contactsOn(p)).toEqual([]);
  });

  it("N4: a Yes two days later is dated when Kinship opened the conversation, with the phone's clock moving on", async () => {
    let at = NOW;
    const p = await phone(new FakeServer(), undefined, true, () => at);
    await handOff(p.deps, fromWaiting);
    at = new Date(NOW.getTime() + 2 * 86_400_000);
    await answerReturn(p.deps, "yes");
    expect((await contactsOn(p)).map((c) => c.occurred_at)).toEqual([NOW.toISOString()]);
  });

  it("N7: 'Not this' through the app's own step brings Waiting back", async () => {
    const p = await phone(new FakeServer());
    await handOff(p.deps, fromWaiting);
    await answerReturn(p.deps, "yes");
    expect(waitingLine(await today(p))).toBeNull();
    const [c] = await contactsOn(p) as unknown as { id: string }[];
    await forgetConversation(p.deps, c.id);
    expect(waitingLine(await today(p))).toMatchObject({ label: "Waiting on Tyler" });
  });

  it("C4b, N10: on the page, only a conversation with Tyler about the promise, on or after its day, ends 'Waiting on Tyler'", async () => {
    const p = await phone(new FakeServer());
    await p.repos.memory.remember({ id: "p1", kind: "promise", person_id: "tyler", statement: promise.statement, detail: { due_date: "2026-10-09" } }, { userAuthored: true });
    const waiting = async () => (await portraitFor(p.repos, tyler, NOW)).lately.some((l) => l.when === "Waiting on Tyler");
    expect(await waiting()).toBe(true);
    await p.repos.contacts.confirm({ person_id: "josh", channel: "text", source: "manual", memory_item_id: "p1", occurred_at: NOW.toISOString() });
    expect(await waiting()).toBe(true);
    await p.repos.contacts.confirm({ person_id: "tyler", channel: "text", source: "manual", memory_item_id: "p1", occurred_at: new Date(2026, 9, 8, 12).toISOString() });
    expect(await waiting()).toBe(true);
    await p.repos.contacts.confirm({ person_id: "tyler", channel: "text", source: "manual", memory_item_id: "p1", occurred_at: new Date(2026, 9, 10, 12).toISOString() });
    expect(await waiting()).toBe(false);
  });
});

describe("reviewer C, round 3 (13 Oct): every field of the hand-off, and the link Yes", () => {
  it("handoffFor: an empty ask or about is no ask or about; \"\" for followUp stays; type, item and channel carried", () => {
    const h = handoffFor("tyler", "call", { id: WAITING, type: "waiting", ask: "", about: "", followUp: "", itemId: "p1" });
    expect(h).toEqual({ reasonId: WAITING, personId: "tyler", channel: "call", type: "waiting", itemId: "p1", ask: undefined, about: undefined, followUp: "" });
    expect(handoffFor("anthony", "text", { id: "r2", type: "upcoming_event", ask: "Did you reach Anthony about the wedding?", about: "Anthony's wedding", followUp: "Anything?", itemId: "e9" }))
      .toEqual({ reasonId: "r2", personId: "anthony", channel: "text", type: "upcoming_event", itemId: "e9", ask: "Did you reach Anthony about the wedding?", about: "Anthony's wedding", followUp: "Anything?" });
    expect(handoffFor("josh", "text", { id: "r1", type: "upcoming_event", about: null })).toEqual({
      reasonId: "r1", personId: "josh", channel: "text", type: "upcoming_event", itemId: null, ask: undefined, about: undefined, followUp: undefined,
    });
  });

  it("the return question asks in the detail's own words, about its memory, and the conversation records which kind of Moment it was", async () => {
    const p = await phone(new FakeServer());
    const v = await today(p);
    const w = detailFor(v, quietKey(waitingLine(v)!)!, "2026-10-12", () => "Tyler")!;
    await handOff(p.deps, handoffFor(w.personId, "text", w.reason));
    expect((await today(p)).returnCheck).toMatchObject({ ask: "Did you reach Tyler?", about: promise.statement });
    await answerReturn(p.deps, "yes");
    expect((await contactsOn(p)).map((c) => [(c as unknown as Record<string, unknown>).moment_type, (c as unknown as Record<string, unknown>).source])).toEqual([["waiting", "return_check"]]);
  });

  it("acceptLink: Yes adds them to the memory beside everyone already on it, once; a related person becomes them", async () => {
    const p = await phone(new FakeServer());
    const item = await p.repos.memory.remember({ kind: "fact", person_id: "tyler", statement: "Tyler and Ana went to Tahoe with Josh", with_person_ids: ["ana"] }, { userAuthored: true });
    const link = { key: "k", kind: "item" as const, targetId: item.id, prompt: "Is this the Josh in …?" };
    await acceptLink(p.store, "josh", link);
    await acceptLink(p.store, "josh", link);
    expect(((await p.store.get("memory_items", item.id)) as MemoryItem).with_person_ids).toEqual(["ana", "josh"]);
    const rel = await p.store.create("related_people", { person_id: "tyler", relation: "brother", name: "Josh" });
    await acceptLink(p.store, "josh", { key: "r", kind: "related", targetId: String(rel.id), prompt: "Is this Tyler's brother Josh?" });
    expect(((await p.store.get("related_people", String(rel.id))) as Record<string, unknown>).promoted_person_id).toBe("josh");
  });
});

describe("reviewer E, round 2 (13 Oct): reachedAbout on its own", () => {
  it("only a conversation with the promise's own person, about it, on or after its day; never one deleted", () => {
    const day = (iso: string) => iso.slice(0, 10);
    const row = (over: Partial<ContactEventRow>): ContactEventRow =>
      ({ id: "c", person_id: "tyler", channel: "text", occurred_at: "2026-10-10T12:00:00Z", memory_item_id: "p1", ...over }) as ContactEventRow;
    expect([...reachedAbout([row({ person_id: "josh" })], [promise], day)]).toEqual([]);
    expect([...reachedAbout([row({ occurred_at: "2026-10-08T12:00:00Z" })], [promise], day)]).toEqual([]);
    expect([...reachedAbout([row({ memory_item_id: "e1" })], [promise], day)]).toEqual([]);
    expect([...reachedAbout([row({ deleted_at: "2026-10-11T00:00:00Z" } as Partial<ContactEventRow>)], [promise], day)]).toEqual([]);
    expect([...reachedAbout([row({})], [promise], day)]).toEqual(["p1"]);
  });
});

describe("reviewer E, round 2 (13 Oct): days are the phone's own, never UTC (K2, K3)", () => {
  // A time zone is the process's own (Jest's process.env is a copy): the probe runs in a Jest of its own, in each zone.
  it.each(["Pacific/Kiritimati", "Pacific/Pago_Pago"])("in %s", (zone) => {
    const out = execFileSync(process.execPath, [require.resolve("jest/bin/jest"), "--ci", "--no-cache", "--testMatch", "**/timeZones.probe.ts", "src/test-utils/timeZones.probe.ts"], {
      env: { ...process.env, TZ: zone }, cwd: path.resolve(__dirname, "../../.."), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    void out;
  }, 120_000);
});
