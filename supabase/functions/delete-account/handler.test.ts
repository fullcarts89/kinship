// P0-05 proofs for delete-account. Run: deno test supabase/functions
import { createDeleteAccountHandler, type DeleteAccountDeps } from "./handler.ts";

function assertEquals<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

function fakes(opts: { user?: string | null; storageFails?: boolean; dbFails?: boolean } = {}) {
  const calls: string[] = [];
  const deps: DeleteAccountDeps = {
    authenticate: () => Promise.resolve(opts.user === undefined ? "u1" : opts.user),
    removeStorage: (id) => {
      calls.push(`storage:${id}`);
      return opts.storageFails ? Promise.reject(new Error("storage down")) : Promise.resolve(2);
    },
    deleteAccount: (id) => {
      calls.push(`db:${id}`);
      return opts.dbFails
        ? Promise.reject(new Error("account deletion incomplete: persons"))
        : Promise.resolve({ auth_user: true, tables: { persons: 2 } });
    },
  };
  return { deps, calls };
}

function post(body: unknown, auth = true): Request {
  return new Request("http://localhost/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer jwt" } : {}) },
    body: JSON.stringify(body),
  });
}

async function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const { log, error } = console;
  console.log = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { log, error });
  }
}

Deno.test("no token → 401, nothing deleted", async () => {
  const f = fakes();
  const res = await createDeleteAccountHandler(f.deps)(post({ confirm: true }, false));
  assertEquals(res.status, 401);
  assertEquals(f.calls, []);
});

Deno.test("anon key / deleted or expired user (authenticate → null) → 401, nothing deleted", async () => {
  const f = fakes({ user: null });
  const res = await createDeleteAccountHandler(f.deps)(post({ confirm: true }));
  assertEquals(res.status, 401);
  assertEquals(f.calls, []);
});

Deno.test("missing confirmation → 400, nothing deleted", async () => {
  const f = fakes();
  const res = await createDeleteAccountHandler(f.deps)(post({}));
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: "confirmation_required" });
  assertEquals(f.calls, []);
});

Deno.test("deletes storage then the account, only for the verified caller", async () => {
  const f = fakes({ user: "user-123" });
  const res = await quiet(() => createDeleteAccountHandler(f.deps)(post({ confirm: true, user_id: "someone-else" })));
  assertEquals(res.status, 200);
  assertEquals(f.calls, ["storage:user-123", "db:user-123"]);
  const body = await res.json();
  assertEquals(body.deleted, true);
  assertEquals(body.storage_objects, 2);
});

Deno.test("storage failure → 500 and the account is NOT deleted (can retry)", async () => {
  const f = fakes({ storageFails: true });
  const res = await quiet(() => createDeleteAccountHandler(f.deps)(post({ confirm: true })));
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: "deletion_failed" });
  assertEquals(f.calls, ["storage:u1"]);
});

Deno.test("incomplete database deletion → 500, never reported as deleted", async () => {
  const f = fakes({ dbFails: true });
  const res = await quiet(() => createDeleteAccountHandler(f.deps)(post({ confirm: true })));
  assertEquals(res.status, 500);
  assertEquals((await res.json()).deleted, undefined);
});

Deno.test("GET → 405", async () => {
  const f = fakes();
  const res = await createDeleteAccountHandler(f.deps)(new Request("http://localhost/delete-account"));
  assertEquals(res.status, 405);
});

// ─── Delete account v2 (SET-05; FD-30e): the 2.0 tables ──────────────────────
// The database function removes every row in every public table with a
// user_id (found at run time) and the auth user, and raises if anything is
// left; the handler relays exactly what was removed and never claims success
// it was not given. Covered on real Postgres by pgTAP 40 and 72; here, the
// handler's contract around it.

const V2_TABLES = ["people", "related_people", "person_identities", "captures", "memory_items", "memory_item_sources",
  "memory_item_history", "memory_item_facets", "capture_reviews", "reasons", "reason_evidence", "reason_events", "contact_events",
  "consents", "devices", "notification_log", "user_flag_overrides", "ai_calls", "semantic_runs", "people_merges", "user_settings"];

Deno.test("v2: relays per-table counts for every 2.0 table the database removed, and that the auth user is gone", async () => {
  const calls: string[] = [];
  const tables = Object.fromEntries(V2_TABLES.map((t) => [t, 1]));
  const deps: DeleteAccountDeps = {
    authenticate: () => Promise.resolve("user-v2"),
    removeStorage: () => Promise.resolve(0),
    deleteAccount: (id) => {
      calls.push(id);
      return Promise.resolve({ auth_user: true, tables });
    },
  };
  const res = await quiet(() => createDeleteAccountHandler(deps)(post({ confirm: true })));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.deleted, true);
  assertEquals(body.removed.auth_user, true);
  for (const t of V2_TABLES) assertEquals(body.removed.tables[t], 1, t);
  assertEquals(calls, ["user-v2"]);
});

Deno.test("v2: a database answer that reports leftovers is a failure, never 'deleted'", async () => {
  const deps: DeleteAccountDeps = {
    authenticate: () => Promise.resolve("user-v2"),
    removeStorage: () => Promise.resolve(0),
    deleteAccount: () => Promise.reject(new Error("account deletion incomplete: people_merges, memory_items")),
  };
  const res = await quiet(() => createDeleteAccountHandler(deps)(post({ confirm: true })));
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: "deletion_failed" });
});

Deno.test("v2: the response never carries user content (only table names and counts)", async () => {
  const deps: DeleteAccountDeps = {
    authenticate: () => Promise.resolve("user-v2"),
    removeStorage: () => Promise.resolve(3),
    deleteAccount: () => Promise.resolve({ auth_user: true, tables: { people: 2, captures: 4 } }),
  };
  const res = await quiet(() => createDeleteAccountHandler(deps)(post({ confirm: true })));
  const text = await res.text();
  assertEquals(/raw_text|statement|display_name/u.test(text), false, "no content fields");
  assertEquals(JSON.parse(text).storage_objects, 3);
});

Deno.test("deployed path: an unreachable Storage service fails the deletion loudly; no row and no auth user is touched", async () => {
  // The local harness runner (e2e/serve-delete-account.ts) may treat an absent Storage as empty, for the
  // local stack alone. The function as deployed never does: photos left behind would be a silent breach.
  const calls: string[] = [];
  const deps: DeleteAccountDeps = {
    authenticate: () => Promise.resolve("user-v2"),
    removeStorage: () => Promise.reject(new Error("listing buckets failed: name resolution failed")),
    deleteAccount: (id) => {
      calls.push(`db:${id}`);
      return Promise.resolve({ auth_user: true, tables: {} });
    },
  };
  const res = await quiet(() => createDeleteAccountHandler(deps)(post({ confirm: true })));
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: "deletion_failed" });
  assertEquals(calls, [], "the database function is never reached");
});
