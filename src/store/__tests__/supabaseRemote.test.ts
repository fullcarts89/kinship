// The PostgREST adapter: error mapping and the exact queries it sends.
import { RemoteError } from "@/store/remote";
import { classifyError, SupabaseRemote } from "@/store/supabaseRemote";

type Call = [string, ...unknown[]];

/** A chainable stand-in for supabase-js that records calls and returns a canned result. */
function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "upsert", "update", "eq", "gte", "gt", "or", "order", "limit", "in"]) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  const client = { from: (t: string) => (calls.push(["from", t]), builder) };
  return { client: client as never, calls };
}

describe("classifyError", () => {
  it.each([
    ["40001", "conflict"],
    ["23514", "rejected"],
    ["23503", "rejected"],
    ["42501", "rejected"],
    ["22023", "rejected"],
    ["PGRST204", "rejected"],
    ["PGRST301", "network"],
    ["", "network"],
  ])("%s → %s", (code, kind) => {
    expect(classifyError({ code, message: "x" }).kind).toBe(kind);
  });
});

it("updates with the version it writes and the key filter", async () => {
  const { client, calls } = fakeClient({ data: [{ id: "p1", version: 3, updated_at: "t" }], error: null });
  const row = await new SupabaseRemote(client).update("people", "p1", 3, { display_name: "Ben" });
  expect(row.version).toBe(3);
  expect(calls).toContainEqual(["update", { display_name: "Ben", version: 3 }]);
  expect(calls).toContainEqual(["eq", "id", "p1"]);
});

it("maps a stale version to a conflict", async () => {
  const { client } = fakeClient({ data: null, error: { code: "40001", message: "version conflict" } });
  await expect(new SupabaseRemote(client).update("people", "p1", 2, {})).rejects.toMatchObject({ kind: "conflict" });
});

it("treats an update that matched nothing as not found", async () => {
  const { client } = fakeClient({ data: [], error: null });
  await expect(new SupabaseRemote(client).update("people", "p1", 2, {})).rejects.toBeInstanceOf(RemoteError);
});

it("inserts idempotently (ON CONFLICT DO NOTHING on the key)", async () => {
  const { client, calls } = fakeClient({ data: [{ user_id: "u", version: 1, updated_at: "t" }], error: null });
  await new SupabaseRemote(client).insert("user_settings", "u", { time_zone: "UTC" });
  expect(calls).toContainEqual(["upsert", { time_zone: "UTC", user_id: "u" }, { onConflict: "user_id", ignoreDuplicates: true }]);
});

it("pulls with the overlap cursor and a (updated_at, key) keyset", async () => {
  const { client, calls } = fakeClient({ data: [], error: null });
  await new SupabaseRemote(client).changedSince("captures", "2026-10-05T11:55:00.000Z",
    { updated_at: "2026-10-05T12:00:00.000+00:00", key: "c1" }, 500);
  expect(calls).toEqual([
    ["from", "captures"],
    ["select", "*"],
    ["gte", "updated_at", "2026-10-05T11:55:00.000Z"],
    ["or", 'updated_at.gt."2026-10-05T12:00:00.000+00:00",and(updated_at.eq."2026-10-05T12:00:00.000+00:00",id.gt.c1)'],
    ["order", "updated_at", { ascending: true }],
    ["order", "id", { ascending: true }],
    ["limit", 500],
  ]);
});

it("reads a manifest without deleted_at for tables that have no tombstones", async () => {
  const { client, calls } = fakeClient({ data: [{ user_id: "u", version: 4 }], error: null });
  const m = await new SupabaseRemote(client).manifest("user_settings", null, 1000);
  expect(m).toEqual([{ key: "u", version: 4, deleted_at: null }]);
  expect(calls).toContainEqual(["select", "user_id,version"]);
});
