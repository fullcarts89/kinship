// Checkpoint D1: Tell → understand → review → memory, through kills,
// offline stretches, lost replies and changes made on another device.
// The gateway is FakeGateway (scripted readings over FakeServer); its real
// rules are proven by the Deno and pgTAP suites.
import { randomUUID } from "crypto";
import { setAnalyticsSink } from "@/platform/analytics";
import { Gateway } from "@/store/gateway";
import { repositoriesFor, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway, type Script } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000d1";
const BEN_NOTE = "Ben runs Chicago Sunday. He's hoping to break four hours.";
const SAM_NOTE = "Sam is redoing his kitchen.";

let clock = Date.parse("2026-10-08T21:14:00.000Z");
const now = () => new Date(clock).toISOString();
const later = (ms: number) => {
  clock += ms;
};

const events: [string, Record<string, unknown>][] = [];
beforeEach(() => {
  events.length = 0;
  setAnalyticsSink({ send: (e, p) => events.push([e, p]) });
});
afterAll(() => setAnalyticsSink());

type Device = Awaited<ReturnType<typeof open>>;

async function open(server: FakeServer, gateway: FakeGateway, file: string) {
  const db = await openSqlJsDb(file);
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { now, newId: randomUUID });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway), { clock: () => clock });
  return { db, store, engine, understanding, repos: repositoriesFor(store) };
}

/** Kill and relaunch: every committed write survives; nothing held in memory does. */
async function relaunch(d: Device, server: FakeServer, gateway: FakeGateway, file: string): Promise<Device> {
  d.db.persist();
  return open(server, gateway, file);
}

async function world() {
  const server = new FakeServer();
  const gateway = new FakeGateway(server, A);
  const file = `d1-${randomUUID()}`;
  const d = await open(server, gateway, file);
  return { server, gateway, file, d };
}

async function tell(d: Device, note: string): Promise<string> {
  const c = await d.repos.captures.tell(note, { aiEnabled: true, timeZone: "America/Chicago" });
  await d.understanding.told(c.id);
  return c.id;
}

const benScript = (ben: Person): Script => ({
  items: [{
    kind: "event", statement: "Ben runs the Chicago Marathon on Sunday", quote: "Ben runs Chicago Sunday.", tier: "auto",
    person_id: ben.id,
    detail: { date: "2026-10-11", date_precision: "day", date_hint: "Sunday", event_type: "race", followup_policy: "after",
      event_goal: "break four hours" },
  }],
});

const samScript: Script = {
  items: [{
    kind: "thread", statement: "Sam is redoing his kitchen", quote: "Sam is redoing his kitchen", tier: "hold",
    person_id: null, flags: ["person_ambiguous", "mid_confidence"],
    detail: { topic: "redoing his kitchen", followup_after_days: 42 },
  }],
  clarification: { about: "person", question: "Which Sam do you mean?", options: ["Sam (neighbor)", "Sam (climbing)", "Someone else"] },
};

async function twoSams(d: Device) {
  const lee = await d.repos.people.add({ display_name: "Sam", relationship_label: "neighbor" });
  const diaz = await d.repos.people.add({ display_name: "Sam", relationship_label: "climbing" });
  await d.engine.sync();
  return { lee, diaz };
}

function serverItems(server: FakeServer) {
  return [...server.table("memory_items").values()].filter((m) => !m.deleted_at);
}

describe("Ben runs Chicago Sunday", () => {
  it("is kept offline, understood once online, and remembered on Ben's record with its source, across relaunches", async () => {
    const { server, gateway, file, d: first } = await world();
    let d = first;
    const ben = await d.repos.people.add({ display_name: "Ben" });
    await d.engine.sync();
    gateway.script(BEN_NOTE, benScript(ben));

    server.offline = true;
    gateway.offline = true;
    const captureId = await tell(d, BEN_NOTE);
    await d.understanding.run();
    expect(d.understanding.offline).toBe(true);
    expect((await d.understanding.get(captureId))?.state).toBe("waiting");
    expect((await d.repos.captures.get(captureId))?.raw_text).toBe(BEN_NOTE);

    // Killed while offline: the note and its place in line survive.
    d = await relaunch(d, server, gateway, file);
    expect((await d.understanding.get(captureId))?.state).toBe("waiting");
    expect((await d.store.pendingOps()).some((op) => op.row_id === captureId)).toBe(true);

    server.offline = false;
    gateway.offline = false;
    await d.understanding.run();
    const row = await d.understanding.get(captureId);
    expect(row?.state).toBe("review");
    expect(row?.reading?.tier).toBe("auto");
    const [race] = await d.repos.memory.forPerson(ben.id);
    expect(race).toMatchObject({ statement: "Ben runs the Chicago Marathon on Sunday", user_state: "unreviewed", origin: "extracted" });
    expect(race.detail).toMatchObject({ date: "2026-10-11", date_precision: "day", event_goal: "break four hours" });
    const [source] = await d.repos.memory.sourcesFor(race.id);
    expect(source).toMatchObject({ capture_id: captureId, source_kind: "capture", span_start: 0, span_end: 24, quote: "Ben runs Chicago Sunday." });

    await d.understanding.opened(captureId);
    await d.understanding.finish(captureId, "idle");
    expect((await d.understanding.get(captureId))?.state).toBe("done");

    d = await relaunch(d, server, gateway, file);
    await d.understanding.run();
    expect((await d.repos.memory.forPerson(ben.id)).map((m) => m.statement)).toEqual(["Ben runs the Chicago Marathon on Sunday"]);
    expect(gateway.modelRuns).toBe(1);
    expect(gateway.calls).toEqual(["understand"]); // auto: nothing to settle, nothing asked twice
    expect(server.table("captures").get(captureId)?.status).toBe("extracted");
  });

  it("recovers a reading whose reply was lost (extraction finished while the app was away)", async () => {
    const { server, gateway, file, d: first } = await world();
    let d = first;
    const ben = await d.repos.people.add({ display_name: "Ben" });
    await d.engine.sync();
    gateway.script(BEN_NOTE, benScript(ben));
    const captureId = await tell(d, BEN_NOTE);
    gateway.loseNextReply = true;
    await d.understanding.run();
    expect((await d.understanding.get(captureId))?.state).toBe("waiting");
    expect(serverItems(server)).toHaveLength(1); // the server did the work

    d = await relaunch(d, server, gateway, file);
    await d.understanding.run();
    const row = await d.understanding.get(captureId);
    expect(row?.state).toBe("review");
    expect((await d.understanding.itemsFor(captureId, row!.reading)).map((m) => m.statement)).toEqual(["Ben runs the Chicago Marathon on Sunday"]);
    expect(gateway.modelRuns).toBe(1); // asked again, answered "done": never a second run
  });

  it("Undo takes the note and what it created; Ben's record is as before", async () => {
    const { server, gateway, d } = await world();
    const ben = await d.repos.people.add({ display_name: "Ben" });
    await d.engine.sync();
    gateway.script(BEN_NOTE, benScript(ben));
    const captureId = await tell(d, BEN_NOTE);
    await d.understanding.run();
    await d.understanding.undo(captureId);
    await d.understanding.run();
    expect(await d.repos.memory.forPerson(ben.id)).toEqual([]);
    expect(await d.repos.captures.get(captureId)).toBeNull();
    expect(serverItems(server)).toEqual([]);
    expect(server.table("captures").get(captureId)?.deleted_at).toBeTruthy();
    expect(events.map(([e]) => e)).toContain("undo_capture");
  });

  it("corrections are the user's word: an edit source, the item marked edited, and valid detail", async () => {
    const { server, gateway, d } = await world();
    const ben = await d.repos.people.add({ display_name: "Ben" });
    const josh = await d.repos.people.add({ display_name: "Josh" });
    await d.engine.sync();
    gateway.script(BEN_NOTE, benScript(ben));
    const captureId = await tell(d, BEN_NOTE);
    await d.understanding.run();
    const [race] = await d.understanding.itemsFor(captureId, (await d.understanding.get(captureId))!.reading);

    await d.understanding.correct(race.id, { date: "2026-10-12" });
    await d.understanding.correct(race.id, { statement: "Ben runs the Chicago Marathon" });
    await d.understanding.correct(race.id, { kind: "plan" });
    await d.understanding.correct(race.id, { person_id: josh.id });
    await d.understanding.run();

    const onServer = server.table("memory_items").get(race.id)!;
    expect(onServer).toMatchObject({ kind: "plan", person_id: josh.id, statement: "Ben runs the Chicago Marathon", user_state: "edited" });
    // The user's day carried over into the plan; the old "Sunday" went with the date change.
    expect(onServer.detail).toEqual({ firmness: "intended", date: "2026-10-12" });
    const edits = (await d.repos.memory.sourcesFor(race.id)).filter((s) => s.source_kind === "user_edit");
    expect(edits.length).toBeGreaterThanOrEqual(1);
    expect(await d.repos.memory.forPerson(ben.id)).toEqual([]);
    expect(events.filter(([e]) => e === "extraction_corrected").map(([, p]) => p.correction)).toEqual(["date", "statement", "kind", "person"]);
  });
});

describe("two Sams", () => {
  it("asks which Sam, remembers nothing until answered, then remembers it for that Sam only", async () => {
    const { server, gateway, file, d: first } = await world();
    let d = first;
    const { lee, diaz } = await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();

    let row = await d.understanding.get(captureId);
    expect(row?.state).toBe("review");
    expect(row?.reading?.held).toHaveLength(1);
    expect(row?.reading?.clarification?.question).toBe("Which Sam do you mean?");
    expect(await d.repos.memory.forPerson(lee.id)).toEqual([]);
    expect(await d.repos.memory.forPerson(diaz.id)).toEqual([]);
    expect(serverItems(server)).toEqual([]);

    // Killed before answering: the question is still there, from the device.
    d = await relaunch(d, server, gateway, file);
    row = await d.understanding.get(captureId);
    expect(row?.reading?.held).toHaveLength(1);
    await d.understanding.opened(captureId);
    await d.understanding.answer(captureId, [{ index: 0, person_id: lee.id }]);
    await d.understanding.run();

    expect((await d.repos.memory.forPerson(lee.id)).map((m) => m.statement)).toEqual(["Sam is redoing his kitchen"]);
    expect(await d.repos.memory.forPerson(diaz.id)).toEqual([]);
    row = await d.understanding.get(captureId);
    expect(row?.state).toBe("review"); // still on screen: the answer's result is shown
    expect(row?.reading?.settled).toBe(true);
    await d.understanding.finish(captureId, "done");
    await d.understanding.run();
    expect((await d.repos.memory.forPerson(lee.id))[0].user_state).toBe("confirmed");
    expect(server.table("captures").get(captureId)?.status).toBe("extracted");
    expect(gateway.modelRuns).toBe(1);
    expect(gateway.calls).toEqual(["understand", "answer"]);
    expect(events.filter(([e]) => e.startsWith("clarification_"))).toEqual([
      ["clarification_shown", { type: "person" }],
      ["clarification_answered", { type: "person" }],
    ]);
  });

  it("an answer whose reply was lost is delivered once, and nothing is written twice", async () => {
    const { server, gateway, file, d: first } = await world();
    let d = first;
    const { lee } = await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    gateway.loseNextReply = "and_go_offline";
    await d.understanding.answer(captureId, [{ index: 0, person_id: lee.id }]);
    await d.understanding.run();
    expect((await d.understanding.get(captureId))?.state).toBe("answering"); // kept until the gateway confirms
    expect(serverItems(server)).toHaveLength(1); // though the server already acted on it

    d = await relaunch(d, server, gateway, file);
    server.offline = false;
    gateway.offline = false;
    await d.understanding.run();
    const row = await d.understanding.get(captureId);
    expect(row?.state).toBe("done");
    expect(row?.notice).toBeNull();
    expect(serverItems(server)).toHaveLength(1);
    expect((await d.repos.memory.forPerson(lee.id)).map((m) => m.statement)).toEqual(["Sam is redoing his kitchen"]);
  });

  it("an answer given offline waits on the device and is sent when online", async () => {
    const { server, gateway, file, d: first } = await world();
    let d = first;
    const { diaz } = await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    server.offline = true;
    gateway.offline = true;
    await d.understanding.answer(captureId, [{ index: 0, person_id: diaz.id }]);
    await d.understanding.run();
    d = await relaunch(d, server, gateway, file);
    expect((await d.understanding.get(captureId))?.answer?.answers).toEqual([{ index: 0, person_id: diaz.id }]);
    server.offline = false;
    gateway.offline = false;
    await d.understanding.run();
    expect((await d.repos.memory.forPerson(diaz.id)).map((m) => m.statement)).toEqual(["Sam is redoing his kitchen"]);
  });

  it("answered differently on another device: that answer stands, and the user is told", async () => {
    const { server, gateway, d } = await world();
    const { lee, diaz } = await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    const row = await d.understanding.get(captureId);
    // The other device answers first.
    await gateway.post({ action: "resolve_review", capability: "relationship_extract", input_ref: { capture_id: captureId },
      review_created_at: row!.reading!.review_created_at, answers: [{ index: 0, person_id: diaz.id }] });

    await d.understanding.opened(captureId);
    await d.understanding.answer(captureId, [{ index: 0, person_id: lee.id }]);
    await d.understanding.run();
    const after = await d.understanding.get(captureId);
    expect(after?.notice).toBe("changed_elsewhere");
    expect(await d.repos.memory.forPerson(lee.id)).toEqual([]);
    expect((await d.repos.memory.forPerson(diaz.id)).map((m) => m.statement)).toEqual(["Sam is redoing his kitchen"]);
    expect(serverItems(server)).toHaveLength(1);
  });

  it("the note changed on another device: the answer isn't applied to different words", async () => {
    const { server, gateway, d } = await world();
    const { lee } = await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    server.serverWrite("captures", captureId, A, { raw_text: "Sam (Lee) is redoing his kitchen." });
    await d.understanding.opened(captureId);
    await d.understanding.answer(captureId, [{ index: 0, person_id: lee.id }]);
    await d.understanding.run();
    const row = await d.understanding.get(captureId);
    expect(row?.notice).toBe("changed_elsewhere");
    expect(row?.reading?.held).toEqual([]);
    expect(serverItems(server)).toEqual([]);
    expect(server.table("captures").get(captureId)?.status).toBe("extracted"); // settled, kept as written
  });

  it("someone removed meanwhile: asked again, nothing written", async () => {
    const { server, gateway, d } = await world();
    const { lee } = await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    server.serverWrite("people", lee.id, A, { deleted_at: now() });
    await d.understanding.answer(captureId, [{ index: 0, person_id: lee.id }]);
    await d.understanding.run();
    const row = await d.understanding.get(captureId);
    expect([row?.state, row?.notice, row?.reading?.held.length]).toEqual(["review", "choose_again", 1]);
    expect(serverItems(server)).toEqual([]);
  });

  it("a question is never closed on the user's behalf, however long it waits", async () => {
    const { gateway, d } = await world();
    await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    await d.understanding.opened(captureId);
    await d.understanding.finish(captureId, "dismissed");
    later(7 * 24 * 60 * 60_000);
    await d.understanding.run();
    expect((await d.understanding.get(captureId))?.state).toBe("review");
    expect(gateway.calls).toEqual(["understand"]);
  });

  it("leaving with the question unanswered keeps it waiting, quietly, to reopen", async () => {
    const { gateway, d } = await world();
    await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    await d.understanding.opened(captureId);
    await d.understanding.finish(captureId, "dismissed");
    expect((await d.understanding.get(captureId))?.state).toBe("review");
    expect((await d.understanding.open()).map((r) => r.capture_id)).toEqual([captureId]);
    await d.understanding.opened(captureId);
    expect(events.filter(([e]) => e === "review_left" || e === "review_reopened")).toEqual([
      ["review_left", { how: "dismissed", question_waiting: true }],
      ["review_reopened", { question_waiting: true }],
    ]);
    expect(gateway.calls).toEqual(["understand"]); // no close: the question is still the user's
  });

  it("'Don't keep this' remembers nothing and settles the note", async () => {
    const { server, gateway, d } = await world();
    await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    await d.understanding.answer(captureId, [{ index: 0, skip: true }]);
    await d.understanding.run();
    expect(serverItems(server)).toEqual([]);
    expect(server.table("captures").get(captureId)?.status).toBe("extracted");
    expect(events.filter(([e]) => e === "clarification_dismissed")).toEqual([["clarification_dismissed", { type: "person" }]]);
  });
});

describe("a light confirmation", () => {
  const note = "Ana mentioned she might move to Lisbon.";
  const anaScript = (ana: Person): Script => ({
    items: [{ kind: "fact", statement: "Ana might move to Lisbon", quote: "she might move to Lisbon", tier: "confirm",
      person_id: ana.id, certainty: "tentative", detail: { category: "home" } }],
  });

  it("is saved on show; Done confirms it and settles the note, even across a dropped connection and a relaunch", async () => {
    const { server, gateway, file, d: first } = await world();
    let d = first;
    const ana = await d.repos.people.add({ display_name: "Ana" });
    await d.engine.sync();
    gateway.script(note, anaScript(ana));
    const captureId = await tell(d, note);
    await d.understanding.run();
    const [item] = await d.repos.memory.forPerson(ana.id);
    expect(item.user_state).toBe("unreviewed"); // saved on show: nothing is lost if the sheet is ignored
    expect(server.table("captures").get(captureId)?.status).toBe("needs_review");

    await d.understanding.opened(captureId);
    server.offline = true;
    gateway.offline = true;
    await d.understanding.finish(captureId, "done");
    await d.understanding.run();
    expect((await d.understanding.get(captureId))?.state).toBe("closing");
    d = await relaunch(d, server, gateway, file);
    server.offline = false;
    gateway.offline = false;
    await d.understanding.run();
    expect(server.table("memory_items").get(item.id)?.user_state).toBe("confirmed");
    expect(server.table("captures").get(captureId)?.status).toBe("extracted");
    expect((await d.understanding.get(captureId))?.state).toBe("done");
    expect(events.filter(([e]) => e === "review_item_accepted")).toEqual([["review_item_accepted", { tier: "light", item_kind: "fact" }]]);
  });

  it("left open when the app was killed: finished as left after a while, so the server isn't kept waiting", async () => {
    const { server, gateway, file, d: first } = await world();
    let d = first;
    const ana = await d.repos.people.add({ display_name: "Ana" });
    await d.engine.sync();
    gateway.script(note, anaScript(ana));
    const captureId = await tell(d, note);
    await d.understanding.run();
    await d.understanding.opened(captureId);
    d = await relaunch(d, server, gateway, file); // killed with the sheet open
    await d.understanding.run();
    expect((await d.understanding.get(captureId))?.state).toBe("review"); // too soon
    later(11 * 60_000);
    await d.understanding.run();
    expect((await d.understanding.get(captureId))?.state).toBe("done");
    expect(server.table("captures").get(captureId)?.status).toBe("extracted");
    const [item] = await d.repos.memory.forPerson(ana.id);
    expect(item.user_state).toBe("unreviewed"); // left as saved, not confirmed on the user's behalf
    expect(events.filter(([e]) => e === "review_left")).toEqual([["review_left", { how: "idle", question_waiting: false }]]);
  });

  it("'Not this' retracts the item", async () => {
    const { server, gateway, d } = await world();
    const ana = await d.repos.people.add({ display_name: "Ana" });
    await d.engine.sync();
    gateway.script(note, anaScript(ana));
    const captureId = await tell(d, note);
    await d.understanding.run();
    const [item] = await d.repos.memory.forPerson(ana.id);
    await d.understanding.reject(item.id, captureId);
    await d.understanding.finish(captureId, "done");
    await d.understanding.run();
    expect(await d.repos.memory.forPerson(ana.id)).toEqual([]);
    expect(server.table("memory_items").get(item.id)).toMatchObject({ status: "retracted" });
    expect(events.filter(([e]) => e === "review_item_rejected")).toEqual([["review_item_rejected", { tier: "light", item_kind: "fact" }]]);
  });
});

describe("sensitive notes are handled conservatively", () => {
  it("a health event without a real date is held until the user says when, or that there's no date", async () => {
    const { server, gateway, d } = await world();
    const grandma = await d.repos.people.add({ display_name: "Grandma" });
    await d.engine.sync();
    const note = "Grandma goes in for surgery next week sometime.";
    gateway.script(note, {
      items: [{ kind: "event", statement: "Grandma has surgery", quote: "Grandma goes in for surgery next week", tier: "hold",
        person_id: grandma.id, sensitivity: "health", flags: ["date_unresolved_sensitive", "sensitive"],
        detail: { event_type: "surgery", followup_policy: "both", date_precision: "unknown", date_hint: "next week sometime" } }],
      clarification: { about: "date", question: "When is it?", options: ["Pick a date", "No date"] },
    });
    const captureId = await tell(d, note);
    await d.understanding.run();
    expect(serverItems(server)).toEqual([]);
    await d.understanding.answer(captureId, [{ index: 0, date: null }]);
    await d.understanding.run();
    const [surgery] = await d.repos.memory.forPerson(grandma.id);
    expect(surgery).toMatchObject({ sensitivity: "health" });
    expect(surgery.detail).toMatchObject({ date_precision: "unknown" });
    expect(surgery.detail).not.toHaveProperty("date");
  });

  it("a dated health event is shown to look over, never saved quietly", async () => {
    const { server, gateway, d } = await world();
    const sarah = await d.repos.people.add({ display_name: "Sarah" });
    await d.engine.sync();
    const note = "Sarah has surgery Thursday.";
    gateway.script(note, {
      items: [{ kind: "event", statement: "Sarah has surgery Thursday", quote: "Sarah has surgery Thursday", tier: "confirm",
        person_id: sarah.id, sensitivity: "health", flags: ["sensitive"],
        detail: { event_type: "surgery", followup_policy: "both", date: "2026-10-15", date_precision: "day", date_hint: "Thursday" } }],
    });
    const captureId = await tell(d, note);
    await d.understanding.run();
    const row = await d.understanding.get(captureId);
    expect(row?.reading?.tier).toBe("confirm");
    expect(row?.reading?.saved).toEqual([{ id: expect.any(String), tier: "confirm" }]);
    expect(server.table("captures").get(captureId)?.status).toBe("needs_review");
  });
});

describe("notes that aren't understood are kept as written", () => {
  it("a declined note is kept, and the model is never asked again", async () => {
    const { gateway, d } = await world();
    const captureId = await tell(d, "asdf qwer");
    gateway.script("asdf qwer", { items: [], declined: true });
    await d.understanding.run();
    await d.understanding.run();
    expect((await d.understanding.get(captureId))?.state).toBe("kept");
    expect(gateway.modelRuns).toBe(1);
  });

  it("without AI consent nothing is sent to the model, and nothing retries", async () => {
    const { gateway, d } = await world();
    gateway.consent = false;
    const captureId = await tell(d, BEN_NOTE);
    await d.understanding.run();
    await d.understanding.run();
    expect((await d.understanding.get(captureId))?.state).toBe("kept");
    expect(gateway.modelRuns).toBe(0);
    expect(gateway.calls).toEqual(["understand"]);
  });

  it("server trouble is retried with growing waits, then the note is kept as written", async () => {
    const { gateway, d } = await world();
    const captureId = await tell(d, BEN_NOTE);
    for (let i = 0; i < 6; i++) {
      gateway.failNext = { status: 503, error: "try_later" };
      await d.understanding.run();
      const row = await d.understanding.get(captureId);
      if (i < 5) {
        expect([row?.state, row?.attempts]).toEqual(["waiting", i + 1]);
        await d.understanding.run(); // not due yet: no call
        expect(gateway.calls).toHaveLength(i + 1);
        later(Date.parse(row!.next_at!) - clock);
      }
    }
    expect((await d.understanding.get(captureId))?.state).toBe("kept");
  });

  it("the user's answer is never dropped, however long the server has trouble", async () => {
    const { gateway, d } = await world();
    const { lee } = await twoSams(d);
    gateway.script(SAM_NOTE, samScript);
    const captureId = await tell(d, SAM_NOTE);
    await d.understanding.run();
    await d.understanding.answer(captureId, [{ index: 0, person_id: lee.id }]);
    for (let i = 0; i < 10; i++) {
      gateway.failNext = { status: 500, error: "internal_error" };
      await d.understanding.run();
      const row = await d.understanding.get(captureId);
      expect(row?.state).toBe("answering");
      later(Date.parse(row!.next_at!) - clock);
    }
    await d.understanding.run();
    expect((await d.repos.memory.forPerson(lee.id))).toHaveLength(1);
  });
});

describe("analytics", () => {
  it("say what happened without a word of content: no text, names or ids", async () => {
    const { gateway, d } = await world();
    const ben = await d.repos.people.add({ display_name: "Ben" });
    const { lee } = await twoSams(d);
    await d.engine.sync();
    gateway.script(BEN_NOTE, benScript(ben));
    gateway.script(SAM_NOTE, samScript);
    const benNote = await tell(d, BEN_NOTE);
    const samNote = await tell(d, SAM_NOTE);
    await d.understanding.run();
    await d.understanding.opened(benNote);
    const [race] = await d.understanding.itemsFor(benNote, (await d.understanding.get(benNote))!.reading);
    await d.understanding.correct(race.id, { date: "2026-10-12" });
    await d.understanding.finish(benNote, "done");
    await d.understanding.opened(samNote);
    await d.understanding.answer(samNote, [{ index: 0, person_id: lee.id }]);
    await d.understanding.run();
    await d.understanding.undo(samNote);
    await d.understanding.run();

    expect(events.length).toBeGreaterThan(5);
    const forbidden = [BEN_NOTE, SAM_NOTE, "Ben", "Sam", "Chicago", "kitchen", ben.id, lee.id, benNote, samNote, race.id];
    for (const [name, props] of events) {
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === "boolean") continue;
        if (typeof value === "number") {
          expect(Number.isInteger(value) && value >= 0 && value <= 10).toBe(true);
          continue;
        }
        expect(typeof value).toBe("string");
        expect(value).toMatch(/^[a-z_<>0-9+-]{1,16}$/);
        for (const f of forbidden) expect(String(value)).not.toContain(f);
        if (key !== "model_id") expect(`${name}.${key}`).not.toMatch(/text|name|note|statement|quote|person|capture|_id$/);
      }
    }
  });
});
