/**
 * Account deletion (P0-05/P0-06).
 *
 * Calls the delete-account edge function, which verifies the caller and
 * removes their files, every database row and their sign-in identity. Only
 * when the server confirms does this wipe the device and sign out. If the
 * server can't confirm, nothing is cleared and the caller is told, so the
 * app never says "deleted" when it isn't.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { clearAllLocalUserData } from "@/lib/localDataReset";
import { removeAllPhotos } from "@/lib/photoStorage";
import { track } from "@/platform/analytics";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

const FAILED =
  "We couldn't delete your account just now, so nothing was removed. Check your connection and try again.";

export async function deleteAccount(): Promise<DeleteAccountResult> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: true },
      });
      if (error || data?.deleted !== true) return { ok: false, error: FAILED };
    } catch {
      return { ok: false, error: FAILED };
    }
    await clearAllLocalUserData();
    removeAllPhotos();
    // The account no longer exists, so only the local session can be ended.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    track("deletion_completed", { scope: "account" });
    return { ok: true };
  }
  // No backend (dev/demo build): everything lives on this device.
  await clearAllLocalUserData();
  removeAllPhotos();
  return { ok: true };
}
