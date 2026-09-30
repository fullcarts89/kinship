/**
 * Account Service
 *
 * Permanently deletes the signed-in account. The delete_account() database
 * function (supabase/migrations/008_delete_account.sql) removes the auth
 * user, and every Kinship table cascades from it — one call, all or
 * nothing.
 */

import { supabase } from "@/lib/supabase";

export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase.rpc("delete_account");
  if (error) throw new Error(error.message || "Account deletion failed");
}
