// Checkpoint B proofs: per-user isolation, account switching, sign-out
// cleanup, and refusing to read files that aren't this user's or aren't
// encrypted with this user's key.
import { randomUUID } from "crypto";
import { deleteAllUserStores, EncryptionCheckFailed, openUserStore, storeFileName, type DevicePlatform } from "@/store/deviceStore";
import { SyncEngine } from "@/store/syncEngine";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { memoryFiles, openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";

/** A device with "encrypted" files: each file only opens with the key it was created with. */
function fakePlatform() {
  const keys = new Map<string, string>();
  const fileKeys = new Map<string, string>();
  const platform: DevicePlatform = {
    async openEncrypted(file, key) {
      const k = fileKeys.get(file);
      if (k && k !== key) throw new EncryptionCheckFailed("the key does not open this file");
      fileKeys.set(file, key);
      const db = await openSqlJsDb(file);
      return { ...db, close: async () => db.close() };
    },
    async deleteFile(file) {
      memoryFiles.delete(file);
      fileKeys.delete(file);
    },
    async listFiles() {
      return [...memoryFiles.keys()];
    },
    getKey: async (n) => keys.get(n) ?? null,
    setKey: async (n, v) => void keys.set(n, v),
    deleteKey: async (n) => void keys.delete(n),
    randomKeyHex: () => randomUUID().replace(/-/g, "").repeat(2),
  };
  return { platform, keys, fileKeys };
}

beforeEach(() => memoryFiles.clear());

it("gives each user their own file, and B never sees A's rows", async () => {
  const { platform } = fakePlatform();
  const server = new FakeServer();
  const a = await openUserStore(A, platform, { newId: randomUUID });
  await a.create("people", { display_name: "A's friend" });
  await new SyncEngine(a, new FakeRemote(server, A)).sync();
  await a.db.close();

  const b = await openUserStore(B, platform, { newId: randomUUID });
  await new SyncEngine(b, new FakeRemote(server, B)).sync();
  expect(await b.list("people")).toEqual([]);
  expect(await b.pendingOps()).toEqual([]);
  await b.db.close();
  expect([...memoryFiles.keys()].sort()).toEqual([storeFileName(A), storeFileName(B)].sort());
});

it("never reads a file bound to another user, even under that user's name", async () => {
  const { platform, keys } = fakePlatform();
  const a = await openUserStore(A, platform, { newId: randomUUID });
  await a.create("people", { display_name: "secret" });
  await a.db.close();
  // Someone copies A's file and key over B's names.
  memoryFiles.set(storeFileName(B), memoryFiles.get(storeFileName(A))!);
  keys.set(`kinship.dbkey.${B}`, keys.get(`kinship.dbkey.${A}`)!);
  const b = await openUserStore(B, platform, { newId: randomUUID });
  expect(await b.list("people")).toEqual([]);
});

it("starts clean when the key is gone (the file can't be read)", async () => {
  const { platform, keys } = fakePlatform();
  const a = await openUserStore(A, platform, { newId: randomUUID });
  await a.create("people", { display_name: "Ben" });
  await a.db.close();
  keys.clear();
  const again = await openUserStore(A, platform, { newId: randomUUID });
  expect(await again.list("people")).toEqual([]);
});

it("rebuilds rather than reads when the key doesn't open the file", async () => {
  const { platform, keys } = fakePlatform();
  const a = await openUserStore(A, platform, { newId: randomUUID });
  await a.create("people", { display_name: "Ben" });
  await a.db.close();
  keys.set(`kinship.dbkey.${A}`, "0".repeat(64));
  const again = await openUserStore(A, platform, { newId: randomUUID });
  expect(await again.list("people")).toEqual([]);
});

it("reopening for the same user keeps their data and queue (offline capture survives a restart)", async () => {
  const { platform } = fakePlatform();
  const a = await openUserStore(A, platform, { newId: randomUUID });
  await a.create("captures", { source: "text", raw_text: "Ben runs Chicago Sunday.", status: "skipped" });
  await a.db.close();
  const again = await openUserStore(A, platform, { newId: randomUUID });
  expect(await again.list("captures")).toHaveLength(1);
  expect(await again.pendingOps()).toHaveLength(1);
});

it("sign-out deletes every user's file and key", async () => {
  const { platform, keys } = fakePlatform();
  const a = await openUserStore(A, platform, { newId: randomUUID });
  await a.db.close();
  const b = await openUserStore(B, platform, { newId: randomUUID });
  await b.db.close();
  memoryFiles.set("unrelated.db", new Uint8Array());
  expect(await deleteAllUserStores(platform)).toBe(2);
  expect([...memoryFiles.keys()]).toEqual(["unrelated.db"]);
  expect(keys.size).toBe(0);
});

it("refuses a malformed user id as a file name", () => {
  expect(() => storeFileName("../../etc/passwd")).toThrow();
});

it("has no demo identity: a store only opens for a real account id", async () => {
  const { platform } = fakePlatform();
  for (const fake of ["u1", "demo", "", "00000000"]) {
    await expect(openUserStore(fake, platform)).rejects.toThrow(/not a user id/);
  }
  expect(memoryFiles.size).toBe(0);
});
