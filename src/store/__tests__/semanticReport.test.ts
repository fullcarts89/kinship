// The residence dry run's launch trigger (Phase 4B B6; brief §14): the app
// asks the gateway once, after the first sync that reaches the server, and
// never again once the server has answered. It is best effort and off the
// pass: nothing on the phone changes, nothing blocks a note, and a refusal
// or an outage only means the next launch asks once more.
import { Gateway } from "@/store/gateway";
import { repositoriesFor, type MemoryItem } from "@/store/repositories";
import { getMeta, prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { REPORT_META, Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { testPlaces } from "@/test-utils/places";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000b6";

async function world(server = new FakeServer()) {
  const gateway = new FakeGateway(server, A);
  gateway.places = testPlaces();
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  let n = 0;
  const store = new UserStore(db, A, { now: () => new Date(server.clock).toISOString(), newId: () => `0000000${++n % 10}-0000-4000-8000-${String(Date.now() + n).slice(-12)}` });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway), { clock: () => server.clock });
  return { server, gateway, db, store, engine, understanding, repos: repositoriesFor(store) };
}
type World = Awaited<ReturnType<typeof world>>;

async function pass(w: World) {
  await w.understanding.run();
  await w.understanding.reportSettled();
}
const snapshot = (w: World) => JSON.stringify([...w.server.table("memory_items").values(), ...w.server.table("memory_item_facets").values(), ...w.server.table("memory_item_sources").values()]);

describe("B6: the dry run is asked for once per account, off the pass", () => {
  it("the first pass asks once; later passes and a restart never ask again; nothing on the phone or the server changes", async () => {
    const w = await world();
    await w.repos.people.add({ display_name: "Susan" });
    const before = snapshot(w);
    await pass(w);
    expect(w.gateway.reportAsks).toBe(1);
    expect(await getMeta(w.db, REPORT_META)).toBe("residence/v1|places-2026.10");
    await pass(w);
    await pass(w);
    expect(w.gateway.reportAsks).toBe(1);
    // Opened again over the same store (a restart): the answer is remembered.
    const again = new Understanding(w.store, () => w.engine.sync(), new Gateway(w.gateway), { clock: () => w.server.clock });
    await again.run();
    await again.reportSettled();
    expect(w.gateway.reportAsks).toBe(1);
    expect(snapshot(w)).toBe(before);
    expect(((await w.store.list("memory_items")) as MemoryItem[]).length).toBe(0);
  });

  it("refused or unreachable: nothing recorded, no retry this process; the next process asks once more", async () => {
    const w = await world();
    w.gateway.reportFails = true;
    await pass(w);
    await pass(w);
    expect(w.gateway.reportAsks).toBe(1);
    expect(await getMeta(w.db, REPORT_META)).toBeNull();
    w.gateway.reportFails = false;
    const next = new Understanding(w.store, () => w.engine.sync(), new Gateway(w.gateway), { clock: () => w.server.clock });
    await next.run();
    await next.reportSettled();
    expect(w.gateway.reportAsks).toBe(2);
    expect(await getMeta(w.db, REPORT_META)).toBe("residence/v1|places-2026.10");
  });

  it("offline: the first pass asks nothing; once the server is reached, once", async () => {
    const w = await world();
    w.server.offline = true;
    await pass(w);
    expect([w.gateway.calls, w.gateway.reportAsks]).toEqual([[], 0]);
    w.server.offline = false;
    await pass(w);
    expect(w.gateway.reportAsks).toBe(1);
  });

  it("a second phone on the same account asks too (its own store), and the server answers that it already ran", async () => {
    const w = await world();
    await pass(w);
    const other = await world(w.server);
    await pass(other);
    expect(w.gateway.reports + other.gateway.reports).toBe(2);
    expect(await getMeta(other.db, REPORT_META)).toBe("residence/v1|places-2026.10");
  });
});
