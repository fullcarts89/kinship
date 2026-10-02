// Checkpoint B: the repositories end to end against the fake server:
// "Ben runs Chicago Sunday" told offline, remembered with exact provenance,
// corrected, synced; NFC; code-point spans; refusing to guess.
import { randomUUID } from "crypto";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { UserStore } from "@/store/userStore";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000aa";

async function setup() {
  const server = new FakeServer();
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { newId: randomUUID, now: () => "2026-10-08T21:14:00.000Z" });
  return { server, store, repos: repositoriesFor(store), engine: new SyncEngine(store, new FakeRemote(server, A)) };
}

it("tells, remembers and syncs Ben's race with exact provenance, offline first", async () => {
  const { server, repos, engine } = await setup();
  server.offline = true;
  const ben = await repos.people.add({ display_name: "Ben" });
  const note = "Ben runs Chicago Sunday. He's hoping to break four hours.";
  const capture = await repos.captures.tell(note, { contextPersonId: ben.id, timeZone: "America/Chicago", aiEnabled: false });
  const race = await repos.memory.remember({
    kind: "event", person_id: ben.id, statement: "Ben runs the Chicago Marathon on Sunday",
    detail: { date: "2026-10-11", date_precision: "day", event_type: "race", followup_policy: "after",
      event_goal: "under four hours" },
  }, { captureId: capture.id, quote: "Ben runs Chicago Sunday." });

  // Visible at once, offline.
  expect((await repos.memory.forPerson(ben.id)).map((m) => m.statement)).toEqual(["Ben runs the Chicago Marathon on Sunday"]);
  const [src] = await repos.memory.sourcesFor(race.id);
  expect(src).toMatchObject({ capture_id: capture.id, span_start: 0, span_end: 24 });

  server.offline = false;
  await engine.sync();
  expect(server.table("people").get(ben.id)).toBeDefined();
  expect(server.table("captures").get(capture.id)?.status).toBe("skipped");
  expect(server.table("memory_items").get(race.id)?.detail).toMatchObject({ event_goal: "under four hours" });
  const serverSources = [...server.table("memory_item_sources").values()].filter((s) => s.memory_item_id === race.id);
  expect(serverSources).toHaveLength(1);
  expect(serverSources[0]).toMatchObject({ span_start: 0, span_end: 24 });
  expect(server.calls.some((c) => c.startsWith(`insert memory_items ${race.id} +1 sources`))).toBe(true);
});

it("stores captured text in NFC", async () => {
  const { repos } = await setup();
  const decomposed = "Zoë's café";
  const c = await repos.captures.tell(decomposed, { aiEnabled: false });
  expect(c.raw_text).toBe("Zoë's café");
  expect(c.raw_text).not.toBe(decomposed);
});

it("derives code-point spans for emoji text and converts UI selections", async () => {
  const { repos } = await setup();
  const ben = await repos.people.add({ display_name: "Ben" });
  const c = await repos.captures.tell("Ben 🏃‍♂️ ran Chicago 🎉 in 3:58!", { aiEnabled: false });
  const m1 = await repos.memory.remember({ kind: "moment", person_id: ben.id, statement: "ran Chicago" },
    { captureId: c.id, quote: "ran Chicago 🎉" });
  expect((await repos.memory.sourcesFor(m1.id))[0]).toMatchObject({ span_start: 9, span_end: 22 });
  // The same words selected in the UI: UTF-16 [10, 24) (the runner emoji is 5 UTF-16 units, 4 code points).
  const m2 = await repos.memory.remember({ kind: "moment", person_id: ben.id, statement: "ran Chicago" },
    { captureId: c.id, utf16Selection: { start: 10, end: 24 } });
  expect((await repos.memory.sourcesFor(m2.id))[0]).toMatchObject({ span_start: 9, span_end: 22 });
});

it("refuses to remember from evidence it can't find exactly once", async () => {
  const { repos } = await setup();
  const sam = await repos.people.add({ display_name: "Sam" });
  const c = await repos.captures.tell("Sam called. Later Sam texted.", { aiEnabled: false });
  await expect(repos.memory.remember({ kind: "fact", person_id: sam.id, statement: "x", detail: { category: "other" } },
    { captureId: c.id, quote: "Sam" })).rejects.toThrow(/ambiguous/);
  await expect(repos.memory.remember({ kind: "fact", person_id: sam.id, statement: "x", detail: { category: "other" } },
    { captureId: c.id, quote: "Samantha" })).rejects.toThrow(/not_found/);
  expect(await repos.memory.forPerson(sam.id)).toEqual([]);
});

it("a correction is the user's edit, with its own source, and wins on sync", async () => {
  const { server, repos, engine } = await setup();
  const ben = await repos.people.add({ display_name: "Ben" });
  const c = await repos.captures.tell("Ben runs Chicago Sunday.", { aiEnabled: false });
  const race = await repos.memory.remember({
    kind: "event", person_id: ben.id, statement: "Ben runs Chicago",
    detail: { date_precision: "day", event_type: "race", followup_policy: "after" },
  }, { captureId: c.id, quote: "Ben runs Chicago Sunday." });
  await engine.sync();
  await repos.memory.correct(race.id, { statement: "Ben runs the Chicago Marathon on Sunday, Oct 11" });
  await engine.sync();
  expect(server.table("memory_items").get(race.id)).toMatchObject({
    statement: "Ben runs the Chicago Marathon on Sunday, Oct 11", user_state: "edited", version: 2,
  });
  const kinds = [...server.table("memory_item_sources").values()]
    .filter((s) => s.memory_item_id === race.id).map((s) => s.source_kind).sort();
  expect(kinds).toEqual(["capture", "user_edit"]);
});

it("'Not this' retracts and removes", async () => {
  const { server, repos, engine } = await setup();
  const ben = await repos.people.add({ display_name: "Ben" });
  const m = await repos.memory.remember({ kind: "fact", person_id: ben.id, statement: "hates cilantro",
    detail: { category: "preference" } }, { userAuthored: true });
  await engine.sync();
  await repos.memory.retract(m.id);
  expect(await repos.memory.forPerson(ben.id)).toEqual([]);
  await engine.sync();
  expect(server.table("memory_items").get(m.id)).toMatchObject({ status: "retracted" });
  expect(server.table("memory_items").get(m.id)?.deleted_at).toBeTruthy();
});

it("contact is only recorded as confirmed contact", async () => {
  const { repos } = await setup();
  const ben = await repos.people.add({ display_name: "Ben" });
  await expect(repos.contacts.confirm({ person_id: ben.id, channel: "text", source: "return_check" }))
    .rejects.toThrow(/names its reason/);
  await repos.contacts.confirm({ person_id: ben.id, channel: "call", source: "manual" });
  expect(await repos.contacts.forPerson(ben.id)).toHaveLength(1);
});

it("settings are created once, then updated with versions", async () => {
  const { server, repos, engine } = await setup();
  await repos.settings.update({ time_zone: "America/Chicago" });
  await engine.sync();
  await repos.settings.update({ push_enabled: true });
  await engine.sync();
  expect(server.table("user_settings").get(A)).toMatchObject({ time_zone: "America/Chicago", push_enabled: true, version: 2 });
  expect(server.calls).toContain(`update user_settings ${A} v2`);
});
