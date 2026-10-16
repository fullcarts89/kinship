// Checkpoint B proofs for the local store and sync engine: offline capture,
// idempotent writes, strict versions, three-way conflicts, incremental pulls
// with overlap, reconciliation, tombstones, purge, and full resync.
import { randomUUID } from "crypto";
import { RemoteError, type Remote } from "@/store/remote";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { PULL_ORDER, writableFields } from "@/store/tables";
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

describe("timestamps (device check B2)", () => {
  it("doesn't re-push when the server returns the same instant in another format", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const remote = new FakeRemote(server, A);
    // Postgres returns "+00:00" where the device sent "Z".
    const pgStyle = (row: Record<string, unknown>) => ({
      ...row,
      occurred_at: typeof row.occurred_at === "string"
        ? new Date(row.occurred_at).toISOString().replace("Z", "+00:00") : row.occurred_at,
    });
    const engine = new SyncEngine(d.store, {
      insert: async (t, k, f) => pgStyle(await remote.insert(t, k, f)) as never,
      update: async (t, k, v, f) => pgStyle(await remote.update(t, k, v, f)) as never,
      changedSince: remote.changedSince.bind(remote),
      manifest: remote.manifest.bind(remote),
      fetchByKeys: remote.fetchByKeys.bind(remote),
      insertMemoryItem: remote.insertMemoryItem.bind(remote),
    });
    const c = await d.store.create("captures", {
      source: "text", raw_text: "Ben runs Chicago Sunday.", status: "skipped", occurred_at: "2026-10-05T12:00:00.000Z",
    });
    const report = await engine.sync();
    expect(report.pushed).toBe(1);
    expect(server.table("captures").get(c.id as string)?.version).toBe(1);
    expect(server.calls.filter((x) => x.startsWith("update captures"))).toEqual([]);
  });
});

describe("one round trip per pull (founder K12)", () => {
  it("asks every table for its changes at once, then applies them in order; rows already known open no transaction", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const ben = await d.store.create("people", { display_name: "Ben" });
    await d.store.create("captures", { source: "text", raw_text: "Ben runs Chicago Sunday.", context_person_id: ben.id, status: "skipped" });
    await d.engine.sync();
    const remote = new FakeRemote(server, A);
    let inFlight = 0;
    let most = 0;
    const engine = new SyncEngine(d.store, {
      ...remote,
      insert: remote.insert.bind(remote),
      update: remote.update.bind(remote),
      changedSince: async (...args: Parameters<FakeRemote["changedSince"]>) => {
        inFlight++;
        most = Math.max(most, inFlight);
        await new Promise((res) => setTimeout(res, 5));
        try {
          return await remote.changedSince(...args);
        } finally {
          inFlight--;
        }
      },
      manifest: remote.manifest.bind(remote),
      fetchByKeys: remote.fetchByKeys.bind(remote),
      insertMemoryItem: remote.insertMemoryItem.bind(remote),
    });
    const transaction = jest.spyOn(d.db, "transaction");
    const report = await engine.sync();
    expect(most).toBeGreaterThan(5);
    // Ben and his note come back in the overlap window, already known at their versions.
    expect([report.pulled, transaction.mock.calls.length]).toEqual([0, 0]);
    // A newer version from the server is still applied.
    server.table("people").set(ben.id as string, { ...server.table("people").get(ben.id as string)!, display_name: "Benji", version: 2, updated_at: "2026-10-05T12:00:01.000Z" });
    expect((await engine.sync()).pulled).toBe(1);
    expect((await d.store.get("people", ben.id as string))?.display_name).toBe("Benji");
    transaction.mockRestore();
  });
});

describe("residence facets: pulled, never written (Phase 4B B2)", () => {
  const facet = (itemId: string) => ({
    memory_item_id: itemId, slot: "residence", value_text: "Alameda", value_norm: "alameda", place_ref: null,
    candidates: [], usual_ref: null, decided_by: "rule", rule_version: "residence/v1", dataset_version: "places-2026.10",
    deleted_at: null,
  });

  it("is server-written: the app can neither create nor change a facet", async () => {
    const server = new FakeServer();
    const d = await device(server);
    await expect(d.store.create("memory_item_facets", facet("m1"))).rejects.toThrow(/server-written/);
    await expect(d.store.update("memory_item_facets", "f1", { value_text: "Oakland" })).rejects.toThrow(/server-written/);
  });

  it("arrives after its line, and so does its tombstone", async () => {
    expect(PULL_ORDER.indexOf("memory_item_facets")).toBeGreaterThan(PULL_ORDER.indexOf("memory_items"));
    const server = new FakeServer();
    const d = await device(server);
    const ben = await d.store.create("people", { display_name: "Susan" });
    await d.engine.sync();
    server.serverWrite("memory_items", "m1", A, { person_id: ben.id, kind: "fact", statement: "Susan lives in Alameda",
      detail: { category: "home" }, status: "active", deleted_at: null });
    server.serverWrite("memory_item_facets", "f1", A, facet("m1"));
    await d.engine.sync();
    expect(await d.store.get("memory_item_facets", "f1")).toMatchObject({ memory_item_id: "m1", value_text: "Alameda" });
    // The line was edited: the server tombstoned its facet.
    server.serverWrite("memory_item_facets", "f1", A, { deleted_at: "2026-10-05T12:10:00.000Z" });
    await d.engine.sync();
    expect(await d.store.get("memory_item_facets", "f1")).toBeNull();
    expect(await d.store.list("memory_item_facets")).toEqual([]);
  });

  it("what a note closed rides the memory_items mirror and never leaves the phone", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const ben = await d.store.create("people", { display_name: "Susan" });
    await d.engine.sync();
    server.serverWrite("memory_items", "m2", A, { person_id: ben.id, kind: "fact", statement: "Susan moved to Colorado",
      detail: { category: "home", transition: "changed" }, status: "active", supersedes_id: "m1", closes_ids: ["m0"],
      resolves_id: null, deleted_at: null });
    await d.engine.sync();
    expect(await d.store.get("memory_items", "m2")).toMatchObject({ supersedes_id: "m1", closes_ids: ["m0"] });
    expect(Object.keys(writableFields("memory_items", { statement: "x", closes_ids: ["m9"], resolves_id: "m8" }, "update")))
      .toEqual(["statement"]);
    await d.store.update("memory_items", "m2", { statement: "Susan moved to Denver" });
    await d.engine.sync();
    expect(server.calls.filter((c) => c.startsWith("update memory_items"))).toHaveLength(1);
    expect(server.table("memory_items").get("m2")).toMatchObject({ statement: "Susan moved to Denver", closes_ids: ["m0"] });
  });

  // A build that knows the facets table can meet a server whose migration
  // isn't applied yet: the table reads as empty and the sync still succeeds
  // (fail open: every line shows as itself), so a first run never stalls.
  function withoutTable(server: FakeServer, missing: string): Remote {
    const remote = new FakeRemote(server, A);
    const gone = () => new RemoteError("rejected", `Could not find the table 'public.${missing}' in the schema cache`, "PGRST205");
    return {
      insert: remote.insert.bind(remote),
      update: remote.update.bind(remote),
      changedSince: async (table, ...rest) => {
        if (table === missing) throw gone();
        return remote.changedSince(table, ...rest);
      },
      manifest: async (table, ...rest) => {
        if (table === missing) throw gone();
        return remote.manifest(table, ...rest);
      },
      fetchByKeys: remote.fetchByKeys.bind(remote),
      insertMemoryItem: remote.insertMemoryItem.bind(remote),
    };
  }

  it("a server without the facets table yet still syncs everything else, first sync included", async () => {
    const server = new FakeServer();
    server.serverWrite("people", "p1", A, { display_name: "Susan", deleted_at: null });
    server.serverWrite("reasons", "r1", A, { person_id: "p1", type: "birthday", state: "candidate", deleted_at: null });
    const d = await device(server);
    const engine = new SyncEngine(d.store, withoutTable(server, "memory_item_facets"));
    const report = await engine.sync();
    expect(report).toMatchObject({ firstSync: true, offline: false });
    expect(report.reconciled).not.toBeNull();
    expect(await d.store.get("people", "p1")).toMatchObject({ display_name: "Susan" });
    expect(await d.store.get("reasons", "r1")).toMatchObject({ type: "birthday" });
    // Once the migration is applied, the facets arrive as usual.
    server.serverWrite("memory_item_facets", "f1", A, facet("m1"));
    await d.engine.sync();
    expect(await d.store.get("memory_item_facets", "f1")).toMatchObject({ value_text: "Alameda" });
  });

  it("a table the app relies on missing is still an error", async () => {
    const server = new FakeServer();
    const d = await device(server);
    const engine = new SyncEngine(d.store, withoutTable(server, "reasons"));
    await expect(engine.sync()).rejects.toThrow(/reasons/);
  });
});
