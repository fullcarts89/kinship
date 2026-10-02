// 2.0 read hooks re-read on local writes and on sync, and surface errors
// rather than falling back to anything.
import { randomUUID } from "crypto";
import { useStoreQuery } from "@/hooks/useStoreQuery";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { UserStore } from "@/store/userStore";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { renderHook, settle } from "@/test-utils/renderHook";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000ab";

async function store() {
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  return new UserStore(db, A, { newId: randomUUID });
}

it("shows a new person as soon as it's written locally", async () => {
  const s = await store();
  const hook = await renderHook(() => useStoreQuery(s, (r) => r.people.list()));
  expect(hook.current().data).toEqual([]);
  await settle(async () => {
    await s.create("people", { display_name: "Ben" });
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(hook.current().data?.map((p) => p.display_name)).toEqual(["Ben"]);
});

it("shows rows that arrive by sync", async () => {
  const s = await store();
  const server = new FakeServer();
  server.serverWrite("people", "p1", A, { display_name: "Maya" });
  const hook = await renderHook(() => useStoreQuery(s, (r) => r.people.list()));
  await settle(async () => {
    await new SyncEngine(s, new FakeRemote(server, A)).sync();
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(hook.current().data?.map((p) => p.display_name)).toEqual(["Maya"]);
});

it("surfaces a read error instead of showing anything else", async () => {
  const s = await store();
  const hook = await renderHook(() => useStoreQuery(s, async () => {
    throw new Error("store unavailable");
  }));
  await settle(async () => new Promise((r) => setTimeout(r, 10)));
  expect(hook.current()).toMatchObject({ data: undefined, loading: false });
  expect(hook.current().error?.message).toBe("store unavailable");
});

it("with no signed-in store, shows nothing (no demo data)", async () => {
  const hook = await renderHook(() => useStoreQuery(null, (r) => r.people.list()));
  expect(hook.current()).toEqual({ data: undefined, error: null, loading: false });
});
