// A pending update whose base version is stale (the gateway advanced the capture while the phone's
// "Got it right" was waiting to sync) must rebase and land, in a bounded number of server calls, however
// often sync() is invoked. A local black-box burst on 31 Oct 2026 wrote tens of thousands of
// "version conflict on captures.<id> ... (current is 4, got 4)" lines a minute for such a write; this
// pins what the engine itself may send.
import { randomUUID } from "crypto";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { UserStore } from "@/store/userStore";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000d1";

async function phone() {
  const server = new FakeServer();
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { newId: randomUUID });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  return { server, store, repos: repositoriesFor(store), engine };
}

const updates = (server: FakeServer) => server.calls.filter((c) => /update/i.test(JSON.stringify(c))).length;

it("a feedback write against a capture the server advanced rebases once and lands; repeated syncs send nothing more", async () => {
  const { server, store, repos, engine } = await phone();
  const c = await repos.captures.tell("Ben runs Chicago Sunday.", { aiEnabled: true, timeZone: "America/Los_Angeles" });
  await engine.sync();
  const key = c.id;
  // The gateway extracted: the server row moves on (status, version) without this phone knowing yet.
  const row = server.table("captures").get(key)!;
  const advanced = { ...row, status: "extracted", version: (row.version as number) + 3 };
  server.table("captures").set(key, advanced);
  // The user taps "Got it right" on the phone's older mirror.
  await repos.captures.feedback(key, "right");
  const before = updates(server);
  for (let i = 0; i < 6; i++) await engine.sync();
  const sent = updates(server) - before;
  expect(sent).toBeLessThanOrEqual(4); // at most the first stale try plus its rebases, then nothing
  expect((await store.pendingOps()).length).toBe(0);
  expect((server.table("captures").get(key)!.feedback as { verdict?: string } | null)?.verdict).toBe("right");
  expect(server.table("captures").get(key)!.version).toBe((advanced.version as number) + 1);
});
