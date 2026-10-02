// The one open 2.0 store, for whoever is signed in. Switching accounts
// closes the previous user's store before opening the next; sign-out closes
// it and deletes every user's file and key.

import { deleteAllUserStores, openUserStore, type DevicePlatform } from "./deviceStore";
import { expoPlatform } from "./expoPlatform";
import type { UserStore } from "./userStore";

let active: UserStore | null = null;
let opening: Promise<UserStore> | null = null;

export async function storeForUser(userId: string, platform: DevicePlatform = expoPlatform()): Promise<UserStore> {
  if (active?.userId === userId) return active;
  if (opening) await opening.catch(() => undefined);
  if (active?.userId === userId) return active;
  await closeActiveStore();
  opening = openUserStore(userId, platform);
  try {
    active = await opening;
    return active;
  } finally {
    opening = null;
  }
}

export async function closeActiveStore(): Promise<void> {
  const s = active;
  active = null;
  if (s) await s.db.close();
}

/** Sign-out and account deletion: nothing of any account's 2.0 data stays on the device. */
export async function wipeAllStores(platform: DevicePlatform = expoPlatform()): Promise<number> {
  await closeActiveStore();
  return deleteAllUserStores(platform);
}
