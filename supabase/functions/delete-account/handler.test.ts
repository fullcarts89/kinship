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
