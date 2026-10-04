// Today's reasons on the device: the refresh asks the server at most every
// ten minutes (and never blocks Today offline); this device remembers what was
// shown, put aside and handed off; only a "Yes" records a connection.
import { randomUUID } from "crypto";
import { ReasonLocal } from "@/store/reasonLocal";
import { Reasons, type ReasonsTransport } from "@/store/reasons";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-000000000001";

async function store() {
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  return new UserStore(db, A, { newId: randomUUID, now: () => "2026-10-12T14:00:00.000Z" });
}

it("refreshes at most every ten minutes, then syncs; offline it changes nothing", async () => {
  let t = 0;
  const calls: string[] = [];
  const transport: ReasonsTransport = {
    refresh: async (tz) => {
      calls.push(`refresh:${tz}`);
      if (t === 99) throw new Error("offline");
    },
    record: async () => undefined,
  };
  const sync = jest.fn(async () => undefined);
  const r = new Reasons(transport, sync, () => t);
  await r.refresh({ timeZone: "America/Chicago" });
  t = 5 * 60_000;
  await r.refresh();
  expect(calls).toEqual(["refresh:America/Chicago"]);
  expect(sync).toHaveBeenCalledTimes(1);
  await r.refresh({ force: true });
  expect(calls.length).toBe(2);
  t = 99;
  await expect(r.refresh({ force: true })).resolves.toBeUndefined();
  expect(sync).toHaveBeenCalledTimes(2);
});

it("a server event that fails never breaks the app", () => {
  const r = new Reasons({ refresh: async () => undefined, record: async () => Promise.reject(new Error("offline")) }, async () => undefined);
  expect(() => r.record("r1", "acted", "text")).not.toThrow();
});

it("remembers shown, dismissed and handed-off reasons, and the last hand-off", async () => {
  const s = await store();
  const local = new ReasonLocal(s);
  await local.shown("r1", "ben", "2026-10-12");
  await local.shown("r1", "ben", "2026-10-13"); // first shown stays the first day
  await local.dismissed("r2", "2026-10-12T15:00:00Z");
  await local.handedOff({ reasonId: "r3", personId: "josh", channel: "call", at: "2026-10-12T16:00:00Z" });
  const state = await local.read();
  expect(state.local).toEqual({
    r1: { firstShown: "2026-10-12" }, r2: { dismissed: "2026-10-12T15:00:00Z" }, r3: { acted: "2026-10-12T16:00:00Z" },
  });
  expect(state.primaries).toEqual([{ personId: "ben", reasonId: "r1", day: "2026-10-12" }]);
  expect(state.handoff).toEqual({ reasonId: "r3", personId: "josh", channel: "call", at: "2026-10-12T16:00:00Z" });
});

it("'Not yet' lets the reason speak again; 'Yes' marks it done", async () => {
  const s = await store();
  const local = new ReasonLocal(s);
  await local.handedOff({ reasonId: "r3", personId: "josh", channel: "call", at: "2026-10-12T16:00:00Z" });
  await local.answered("not_yet", "2026-10-12T17:00:00Z");
  expect((await local.read()).local.r3).toEqual({});
  await local.handedOff({ reasonId: "r3", personId: "josh", channel: "call", at: "2026-10-12T18:00:00Z" });
  await local.answered("yes", "2026-10-12T19:00:00Z");
  const state = await local.read();
  expect(state.local.r3.done).toBe("2026-10-12T19:00:00Z");
  expect(state.handoff?.answered).toBe("yes");
});

it("opening a channel records nothing; a return-check contact must name its reason", async () => {
  const s = await store();
  const local = new ReasonLocal(s);
  await local.handedOff({ reasonId: "r3", personId: "josh", channel: "text", at: "2026-10-12T16:00:00Z" });
  expect(await s.list("contact_events")).toEqual([]);
  await expect(repositoriesFor(s).contacts.confirm({ person_id: "josh", channel: "text", source: "return_check" })).rejects.toThrow();
});
