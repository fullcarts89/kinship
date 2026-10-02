// Founder conflict policy (Checkpoint B review):
//   different fields → merged silently; same field → both values kept, the
//   first-accepted one canonical, the other a choice; identical values → no
//   conflict; resolving → one deterministic final state; human wording only.
import { randomUUID } from "crypto";
import { CONFLICT_TITLE, describeConflict } from "@/store/conflictCopy";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { UserStore } from "@/store/userStore";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000c1";

/** Two devices of the same user against one server. */
async function twoDevices() {
  const server = new FakeServer();
  const device = async () => {
    const db = await openSqlJsDb();
    await prepareSchema(db, A);
    const store = new UserStore(db, A, { newId: randomUUID });
    return { store, repos: repositoriesFor(store), engine: new SyncEngine(store, new FakeRemote(server, A)) };
  };
  const phone = await device();
  const ipad = await device();
  // A shared memory: "Mike may leave Google".
  const mike = await phone.repos.people.add({ display_name: "Mike" });
  const item = await phone.repos.memory.remember({
    kind: "thread", person_id: mike.id, statement: "Mike may leave Google",
    detail: { topic: "leaving Google", followup_after_days: 42 }, certainty: "tentative",
  }, { userAuthored: true });
  await phone.engine.sync();
  await ipad.engine.sync();
  return { server, phone, ipad, itemId: item.id };
}

it("merges edits to different fields without asking", async () => {
  const { server, phone, ipad, itemId } = await twoDevices();
  await phone.store.update("memory_items", itemId, { statement: "Mike is thinking about leaving Google" });
  await ipad.store.update("memory_items", itemId, { certainty: "reported" });
  await phone.engine.sync();
  await ipad.engine.sync();
  expect(server.table("memory_items").get(itemId)).toMatchObject({
    statement: "Mike is thinking about leaving Google", certainty: "reported",
  });
  expect(await phone.store.conflicts()).toEqual([]);
  expect(await ipad.store.conflicts()).toEqual([]);
});

it("keeps both values when the same field is edited on two devices", async () => {
  const { server, phone, ipad, itemId } = await twoDevices();
  await phone.store.update("memory_items", itemId, { statement: "Mike left Google" });
  await ipad.store.update("memory_items", itemId, { statement: "Mike may leave Google in spring" });
  await phone.engine.sync(); // accepted first: canonical for now
  await ipad.engine.sync();
  expect(server.table("memory_items").get(itemId)?.statement).toBe("Mike left Google");
  const [c] = await ipad.store.conflicts();
  expect(c.local_patch).toEqual({ statement: "Mike may leave Google in spring" }); // nothing lost
  expect((await ipad.store.get("memory_items", itemId))?.statement).toBe("Mike left Google");
});

it("doesn't raise a pointless conflict when both devices made the same change", async () => {
  const { server, phone, ipad, itemId } = await twoDevices();
  await phone.store.update("memory_items", itemId, { statement: "Mike left Google" });
  await ipad.store.update("memory_items", itemId, { statement: "Mike left Google" });
  await phone.engine.sync();
  await ipad.engine.sync();
  expect(await ipad.store.conflicts()).toEqual([]);
  expect(await ipad.store.pendingOps()).toEqual([]);
  expect(server.table("memory_items").get(itemId)?.statement).toBe("Mike left Google");
});

it.each(["keep_current", "use_mine"] as const)("resolving with %s gives one final state everywhere", async (choice) => {
  const { server, phone, ipad, itemId } = await twoDevices();
  await phone.store.update("memory_items", itemId, { statement: "Mike left Google" });
  await ipad.store.update("memory_items", itemId, { statement: "Mike may leave Google" + " in spring" });
  await phone.engine.sync();
  await ipad.engine.sync();
  const [c] = await ipad.store.conflicts();
  await ipad.store.resolveConflict(c.id, choice);
  await ipad.engine.sync();
  await phone.engine.sync();
  const expected = choice === "keep_current" ? "Mike left Google" : "Mike may leave Google in spring";
  expect(server.table("memory_items").get(itemId)?.statement).toBe(expected);
  expect((await ipad.store.get("memory_items", itemId))?.statement).toBe(expected);
  expect((await phone.store.get("memory_items", itemId))?.statement).toBe(expected);
  expect(await ipad.store.conflicts()).toEqual([]);
  expect(await phone.store.conflicts()).toEqual([]);
  await expect(ipad.store.resolveConflict(c.id, choice)).rejects.toThrow(/already made/);
});

it("puts the choice in human words", async () => {
  const { phone, ipad, itemId } = await twoDevices();
  await phone.store.update("memory_items", itemId, { statement: "Mike left Google" });
  await ipad.store.update("memory_items", itemId, { statement: "Mike may leave Google soon" });
  await phone.engine.sync();
  await ipad.engine.sync();
  const [c] = await ipad.store.conflicts();
  const [choice] = describeConflict(c, await ipad.store.get("memory_items", itemId));
  expect(choice).toEqual({
    field: "statement",
    title: "This changed on another device.",
    keep: { label: "Keep", value: "“Mike left Google”" },
    use: { label: "Use", value: "“Mike may leave Google soon”" },
  });
  const words = `${CONFLICT_TITLE} ${choice.keep.label} ${choice.use.label}`.toLowerCase();
  for (const jargon of ["version", "conflict", "server", "local", "merge", "optimistic", "sync", "error"]) {
    expect(words).not.toContain(jargon);
  }
});
