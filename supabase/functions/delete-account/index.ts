// Supabase Edge Function: delete-account (P0-05)
//
// Deletes the calling user's account and all of their data. Uses the
// service role (provided by the platform as SUPABASE_SERVICE_ROLE_KEY) only
// after the caller's own token has been verified, and only for that user.
//
// Deploy: supabase functions deploy delete-account   (keep JWT verification on)
// Needs migration 20261001120000_delete_user_account.sql.

import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { verifiedUserId } from "../_shared/auth.ts";
import { createDeleteAccountHandler } from "./handler.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

Deno.serve(
  createDeleteAccountHandler({
    authenticate: async (token) => verifiedUserId(await admin.auth.getUser(token)),
    removeStorage,
    deleteAccount: async (userId) => {
      const { data, error } = await admin.rpc("delete_user_account", { target: userId });
      if (error) throw new Error(`delete_user_account failed: ${error.message}`);
      return data as Record<string, unknown>;
    },
  }),
);

/** Removes every object under "<userId>/" in every bucket. */
async function removeStorage(userId: string): Promise<number> {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw new Error(`listing buckets failed: ${error.message}`);
  let removed = 0;
  for (const bucket of buckets ?? []) {
    const paths = await listAll(bucket.id, userId);
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
async function listAll(bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset });
    if (error) throw new Error(`listing files failed: ${error.message}`);
    for (const entry of data ?? []) {
      const path = `${folder}/${entry.name}`;
      // Folders come back without an id.
      if (entry.id === null) paths.push(...(await listAll(bucket, path)));
      else paths.push(path);
    }
    if (!data || data.length < 1000) break;
  }
  return paths;
}
