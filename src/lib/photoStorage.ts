/**
 * Photo Storage (P0-15)
 *
 * The image picker returns a URI in a temporary cache the OS may clear at
 * any time, which left saved memories and people pointing at missing files.
 * Every picked photo is now copied into the app's document directory, under
 * the signed-in account's folder, and that permanent path is what gets
 * saved:
 *
 *   <documents>/photos/<user id>/<uuid>.<ext>      ("local" without a backend)
 *
 * Photos never leave the device in 1.0 (a private Storage bucket arrives in
 * 2.0), so they are kept across sign-out and sign-in of the same account.
 * When a different account claims the device, every other account's photos
 * are deleted (see claimDeviceFor); deleting the account deletes them all.
 */

import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";

const PHOTOS_DIR = "photos";
const LOCAL_OWNER = "local";

function photosRoot(): Directory {
  return new Directory(Paths.document, PHOTOS_DIR);
}

async function currentOwner(): Promise<string> {
  if (!supabase) return LOCAL_OWNER;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? LOCAL_OWNER;
}

/**
 * Copies a freshly picked photo into permanent storage and returns the new
 * URI. Returns null if it can't be kept, so callers never save a path that
 * would break later.
 */
export async function keepPickedPhoto(pickedUri: string): Promise<string | null> {
  try {
    const source = new File(pickedUri);
    const ext = (source.extension || ".jpg").toLowerCase();
    const folder = new Directory(photosRoot(), await currentOwner());
    folder.create({ idempotent: true, intermediates: true });
    const target = new File(folder, `${Crypto.randomUUID()}${ext}`);
    source.copy(target);
    return target.uri;
  } catch {
    return null;
  }
}

/** Deletes the photos of every account except `keepOwner`. */
export function removePhotosExcept(keepOwner: string): void {
  try {
    const root = photosRoot();
    if (!root.exists) return;
    for (const entry of root.list()) {
      if (entry.name !== keepOwner) entry.delete();
    }
  } catch {
    // best-effort
  }
}

/** Deletes every stored photo on this device (account deletion). */
export function removeAllPhotos(): void {
  try {
    const root = photosRoot();
    if (root.exists) root.delete();
  } catch {
    // best-effort
  }
}
