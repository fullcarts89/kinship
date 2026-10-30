// delete-account: the real dependencies, composed once (P0-05; SET-05).
// index.ts serves them on the platform; e2e/serve-delete-account.ts serves
// the same function on a local port for the black-box harness, so the
// phone-side flow is proven against the function as deployed.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";
import { verifiedUserId } from "../_shared/auth.ts";
import type { DeleteAccountDeps } from "./handler.ts";

export function realDeps(admin: SupabaseClient): DeleteAccountDeps {
  return {
    authenticate: async (token) => verifiedUserId(await admin.auth.getUser(token)),
    removeStorage: (userId) => removeStorage(admin, userId),
    deleteAccount: async (userId) => {
      const { data, error } = await admin.rpc("delete_user_account", { target: userId });
      if (error) throw new Error(`delete_user_account failed: ${error.message}`);
      return data as Record<string, unknown>;
    },
  };
}

/** Removes every object under "<userId>/" in every bucket. */
async function removeStorage(admin: SupabaseClient, userId: string): Promise<number> {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw new Error(`listing buckets failed: ${error.message}`);
  let removed = 0;
  for (const bucket of buckets ?? []) {
    const paths = await listAll(admin, bucket.id, userId);
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error: rmError } = await admin.storage.from(bucket.id).remove(batch);
      if (rmError) throw new Error(`removing files failed: ${rmError.message}`);
      removed += batch.length;
    }
  }
  return removed;
}

/** Every file path under a folder, recursively. */
async function listAll(admin: SupabaseClient, bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset });
    if (error) throw new Error(`listing files failed: ${error.message}`);
    for (const entry of data ?? []) {
      const path = `${folder}/${entry.name}`;
      // Folders come back without an id.
      if (entry.id === null) paths.push(...(await listAll(admin, bucket, path)));
      else paths.push(path);
    }
    if (!data || data.length < 1000) break;
  }
  return paths;
}
