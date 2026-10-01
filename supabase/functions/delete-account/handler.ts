// delete-account request handling (P0-05), separated from the Deno entry
// point so it can be tested with fakes.
//
// A signed-in user deletes their own account and everything Kinship holds
// for them. The caller must send {"confirm": true}. Order:
//   1. verify the caller from their access token                 → 401
//   2. remove their files from every Storage bucket ("<user id>/…")
//   3. delete every database row and the auth user in one transaction
//      (public.delete_user_account, which verifies nothing is left)
// The response says what was removed. Any failure is a 500, and the app
// tells the user the deletion did not complete; it never claims success.

import { bearerToken } from "../_shared/auth.ts";

export interface DeleteAccountDeps {
  /** Verified user id for a token, null if not allowed in; throws if Auth is down. */
  authenticate(token: string): Promise<string | null>;
  /** Removes every stored file under "<userId>/" in every bucket; returns how many. */
  removeStorage(userId: string): Promise<number>;
  /** Deletes all rows and the auth user; throws if anything is left behind. */
  deleteAccount(userId: string): Promise<Record<string, unknown>>;
}

export function createDeleteAccountHandler(deps: DeleteAccountDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    let userId: string | null = null;
    try {
      const token = bearerToken(req);
      userId = token ? await deps.authenticate(token) : null;
      if (!userId) return json({ error: "unauthorized" }, 401);

      let body: unknown = null;
      try {
        body = await req.json();
      } catch {
        // fall through to the confirmation check
      }
      if ((body as { confirm?: unknown } | null)?.confirm !== true) {
        return json({ error: "confirmation_required" }, 400);
      }

      const storageObjects = await deps.removeStorage(userId);
      const removed = await deps.deleteAccount(userId);
      console.log(`delete-account: deleted ${userId}`);
      return json({ deleted: true, storage_objects: storageObjects, removed }, 200);
    } catch (err) {
      console.error(`delete-account: deletion for ${userId ?? "unknown"} failed:`, err);
      return json({ error: "deletion_failed" }, 500);
    }
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
