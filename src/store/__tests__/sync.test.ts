// Checkpoint B proofs for the local store and sync engine: offline capture,
// idempotent writes, strict versions, three-way conflicts, incremental pulls
// with overlap, reconciliation, tombstones, purge, and full resync.
import { randomUUID } from "crypto";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { UserStore } from "@/store/userStore";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const DAY = 24 * 60 * 60 * 1000;

async function device(server: FakeServer, userId = A, start = "2026-10-05T12:00:00.000Z") {
  const db = await openSqlJsDb();
  await prepareSchema(db, userId);
  let clock = Date.parse(start);
  const store = new UserStore(db, userId, { now: () => new Date(clock).toISOString(), newId: randomUUID });
  const remote = new FakeRemote(server, userId);
  const engine = new SyncEngine(store, remote);
  return {
    db, store, engine,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe("offline writes", () => {
  it("shows a capture immediately and queues it while offline", async () => {
    const server = new FakeServer();
    const d = await device(server);
    server.offline = true;
    const person = await d.store.create("people", { display_name: "Ben" });
    await d.store.create("captures", {
      source: "text", raw_text: "Ben runs Chicago Sunday.", context_person_id: person.id, status: "skipped",
    });
    expect(await d.store.list("people")).toHaveLength(1);
    expect(await d.store.list("captures", { personId: person.id as string })).toHaveLength(1);

    const report = await d.engine.sync();
    expect(report.offline).toBe(true);
    expect(await d.store.pendingOps()).toHaveLength(2);
    expect(server.table("people").size).toBe(0);

    server.offline = false;
    await d.engine.sync();
    expect(await d.store.pendingOps()).toHaveLength(0);
    expect(server.table("people").get(person.id as string)?.display_name).toBe("Ben");
    expect((await d.store.get("people", person.id as string))?.version).toBe(1);
  });

  it("is idempotent when an insert reached the server but the reply was lost", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const person = await d.store.create("people", { display_name: "Ben" });
    // The server already has it (first attempt landed; the reply never came back).
    server.serverWrite("people", person.id as string, A, { display_name: "Ben" });
    const report = await d.engine.sync();
    expect(report.rejected).toBe(0);
    expect(server.table("people").size).toBe(1);
    expect(server.table("people").get(person.id as string)?.version).toBe(1);
    expect(await d.store.pendingOps()).toHaveLength(0);
  });

  it("coalesces several edits to one row into a single queued write", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const p = await d.store.create("people", { display_name: "Ben" });
    await d.engine.sync();
    await d.store.update("people", p.id as string, { display_name: "Benjamin" });
    await d.store.update("people", p.id as string, { relationship_label: "running buddy" });
    const ops = await d.store.pendingOps();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: "update", base_version: 1,
      patch: { display_name: "Benjamin", relationship_label: "running buddy" } });
  });

  it("keeps an edit made while the previous write was in flight", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const p = await d.store.create("people", { display_name: "Ben" });
    // Make the user edit land between "sent" and "reply".
    const remote = new FakeRemote(server, A);
    const engine = new SyncEngine(d.store, {
      ...remote,
      insert: async (t, k, f) => {
        const row = await remote.insert(t, k, f);
        await d.store.update("people", p.id as string, { display_name: "Benji" });
        return row;
      },
      update: remote.update.bind(remote),
      changedSince: remote.changedSince.bind(remote),
      manifest: remote.manifest.bind(remote),
      fetchByKeys: remote.fetchByKeys.bind(remote),
      insertMemoryItem: remote.insertMemoryItem.bind(remote),
    });
    await engine.sync();
    expect((await d.store.get("people", p.id as string))?.display_name).toBe("Benji");
    await d.engine.sync();
    expect(server.table("people").get(p.id as string)?.display_name).toBe("Benji");
    expect(await d.store.pendingOps()).toHaveLength(0);
  });
});

describe("strict versions and conflicts (CA-3)", () => {
  it("sends the version it read + 1, never a bare overwrite", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const p = await d.store.create("people", { display_name: "Ben" });
    await d.engine.sync();
    await d.store.update("people", p.id as string, { display_name: "Benjamin" });
    await d.engine.sync();
    expect(server.calls).toContain(`update people ${p.id} v2`);
  });

  it("rebases an edit to a field the other device didn't touch", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const p = await d.store.create("people", { display_name: "Ben" });
    await d.engine.sync();
    server.serverWrite("people", p.id as string, A, { relationship_label: "neighbour" }); // other device
    await d.store.update("people", p.id as string, { display_name: "Benjamin" });
    const report = await d.engine.sync();
    expect(report.rebased).toBe(1);
    expect(report.conflicts).toBe(0);
    const row = server.table("people").get(p.id as string);
    expect(row).toMatchObject({ display_name: "Benjamin", relationship_label: "neighbour", version: 3 });
    expect(await d.store.get("people", p.id as string)).toMatchObject({
      display_name: "Benjamin", relationship_label: "neighbour", version: 3,
    });
  });

  it("never silently overwrites: a clash keeps the server value and records the conflict", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const p = await d.store.create("people", { display_name: "Ben" });
    await d.engine.sync();
    server.serverWrite("people", p.id as string, A, { display_name: "Ben K." }); // other device
    await d.store.update("people", p.id as string, { display_name: "Benjamin" });
    const report = await d.engine.sync();
    expect(report.conflicts).toBe(1);
    expect(server.table("people").get(p.id as string)?.display_name).toBe("Ben K.");
    expect((await d.store.get("people", p.id as string))?.display_name).toBe("Ben K.");
    const [c] = await d.store.conflicts();
    expect(c).toMatchObject({ tbl: "people", row_id: p.id, reason: "concurrent_edit",
      local_patch: { display_name: "Benjamin" } });
    expect(await d.store.pendingOps()).toHaveLength(0);
  });

  it("records a write the server's rules refuse and restores the server's row", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const p = await d.store.create("people", { display_name: "Ben" });
    await d.engine.sync();
    await d.store.update("people", p.id as string, { display_name: "x".repeat(500) });
    server.rejectNext = { table: "people", kind: "rejected", code: "23514" };
    const report = await d.engine.sync();
    expect(report.rejected).toBe(1);
    expect((await d.store.get("people", p.id as string))?.display_name).toBe("Ben");
    expect((await d.store.conflicts())[0]).toMatchObject({ reason: "rejected 23514" });
  });

  it("refuses to queue fields the app may not write", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const c = await d.store.create("captures", { source: "text", raw_text: "x", status: "pending" });
    await expect(d.store.update("captures", c.id as string, { status: "extracted" })).rejects.toThrow(/cannot update status/);
    await expect(d.store.create("reasons", { type: "birthday" })).rejects.toThrow(/server-written/);
    await expect(d.store.update("people", "nope", { display_name: "x" })).rejects.toThrow(/not in the local store/);
  });
});

describe("pulls, overlap and reconciliation (CA-6)", () => {
  it("pulls only changes, and skips versions it already has", async () => {
    const server = new FakeServer();
    const d = await device(server);
    server.serverWrite("people", "p1", A, { display_name: "Maya" });
    expect((await d.engine.sync()).pulled).toBe(1);
    expect((await d.engine.sync()).pulled).toBe(0); // the overlap re-reads p1 but (id, version) dedupes it
    server.serverWrite("people", "p1", A, { display_name: "Maya R." });
    expect((await d.engine.sync()).pulled).toBe(1);
    expect((await d.store.get("people", "p1"))?.display_name).toBe("Maya R.");
  });

  it("catches a transaction that committed late, inside the overlap window", async () => {
    const server = new FakeServer();
    const d = await device(server);
    server.serverWrite("people", "p1", A, { display_name: "Maya" });
    await d.engine.sync();
    const cursor = server.table("people").get("p1")!.updated_at;
    // Stamped 2 minutes before the cursor, committed only now.
    server.serverWrite("people", "p2", A, { display_name: "Late" },
      new Date(Date.parse(cursor) - 2 * 60 * 1000).toISOString());
    await d.engine.sync();
    expect((await d.store.get("people", "p2"))?.display_name).toBe("Late");
  });

  it("the reconciliation pull catches what even the overlap missed", async () => {
    const server = new FakeServer();
    const d = await device(server);
    server.serverWrite("people", "p1", A, { display_name: "Maya" });
    await d.engine.sync();
    const cursor = server.table("people").get("p1")!.updated_at;
    server.serverWrite("people", "p3", A, { display_name: "Very late" },
      new Date(Date.parse(cursor) - 60 * 60 * 1000).toISOString());
    await d.engine.sync();
    expect(await d.store.get("people", "p3")).toBeNull(); // outside the overlap
    d.advance(DAY + 1);
    const report = await d.engine.sync();
    expect(report.reconciled?.fetched).toBe(1);
    expect((await d.store.get("people", "p3"))?.display_name).toBe("Very late");
  });

  it("propagates tombstones both ways", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const p = await d.store.create("people", { display_name: "Ben" });
    await d.engine.sync();
    await d.store.remove("people", p.id as string);
    expect(await d.store.list("people")).toHaveLength(0);
    await d.engine.sync();
    expect(server.table("people").get(p.id as string)?.deleted_at).toBeTruthy();

    server.serverWrite("people", "p9", A, { display_name: "Gone soon" });
    await d.engine.sync();
    server.serverWrite("people", "p9", A, { deleted_at: new Date(server.clock).toISOString() });
    await d.engine.sync();
    expect(await d.store.get("people", "p9")).toBeNull();
    expect(await d.store.get("people", "p9", { includeDeleted: true })).not.toBeNull();
  });

  it("drops rows the server purged, but never an unpushed local row", async () => {
    const server = new FakeServer();
    const d = await device(server);
    server.serverWrite("people", "p1", A, { display_name: "Old" });
    await d.engine.sync();
    server.purge("people", "p1");
    server.offline = true;
    const mine = await d.store.create("people", { display_name: "New, offline" });
    server.offline = false;
    d.advance(DAY + 1);
    // Push the new row first, then reconcile: p1 gone, mine kept.
    const report = await d.engine.sync();
    expect(report.reconciled?.dropped).toBe(1);
    expect(await d.store.get("people", "p1", { includeDeleted: true })).toBeNull();
    expect(await d.store.get("people", mine.id as string)).not.toBeNull();
  });

  it("keeps pending local edits visible over a newer pulled row", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const p = await d.store.create("people", { display_name: "Ben" });
    await d.engine.sync();
    server.offline = true;
    await d.store.update("people", p.id as string, { display_name: "Benjamin" });
    server.offline = false;
    server.serverWrite("people", p.id as string, A, { relationship_label: "neighbour" });
    await d.engine.sync();
    expect(await d.store.get("people", p.id as string)).toMatchObject({
      display_name: "Benjamin", relationship_label: "neighbour",
    });
  });

  it("does a full resync after being offline longer than tombstone retention", async () => {
    const server = new FakeServer();
    const d = await device(server);
    server.serverWrite("people", "p1", A, { display_name: "Maya" });
    server.serverWrite("people", "p2", A, { display_name: "Sam" });
    await d.engine.sync();
    // While away: p2 deleted and purged; p3 created long ago relative to any cursor.
    server.purge("people", "p2");
    server.serverWrite("people", "p3", A, { display_name: "Ana" }, "2026-01-01T00:00:00.000Z");
    d.advance(31 * DAY);
    const report = await d.engine.sync();
    expect(report.fullResync).toBe(true);
    expect((await d.store.list("people")).map((r) => r.display_name).sort()).toEqual(["Ana", "Maya"]);
  });
});

describe("settings", () => {
  it("turns a create into an update when the server already made the row", async () => {
    const server = new FakeServer();
    // set_ai_consent created the settings row on the server first.
    server.serverWrite("user_settings", A, A, { ai_consent: true, push_enabled: false });
    const d = await device(server);
    await d.store.create("user_settings", { time_zone: "America/Chicago" });
    await d.engine.sync();
    expect(server.table("user_settings").get(A)).toMatchObject({ time_zone: "America/Chicago", ai_consent: true });
    expect(await d.store.pendingOps()).toHaveLength(0);
  });
});
