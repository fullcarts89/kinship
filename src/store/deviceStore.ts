// Opening, isolating and deleting each user's on-device store (plan §11).
//
//   * One SQLCipher file per user: kinship-<user id>.db. Switching accounts
//     never opens another user's file.
//   * Each file has its own random 256-bit key in the iOS Keychain / Android
//     Keystore (SecureStore, this-device-only, after first unlock).
//   * A file is bound to its owner (meta.owner_user_id). A mismatch, a lost
//     key, or a file that isn't really encrypted is never read: the file is
//     deleted and rebuilt from the server, which is the source of truth.
//   * Sign-out deletes every user's file and key (deleteAllUserStores).
//
// The platform calls are injected (DevicePlatform) so the rules are tested
// without native modules; expoPlatform() supplies the real ones.

import { prepareSchema, StoreOwnerMismatch } from "./schema";
import type { SqlDb } from "./sql";
import { UserStore, type StoreDeps } from "./userStore";

export interface DevicePlatform {
  /** Opens (or creates) an encrypted file with a raw hex key, verifying encryption. */
  openEncrypted(fileName: string, keyHex: string): Promise<SqlDb>;
  deleteFile(fileName: string): Promise<void>;
  listFiles(): Promise<string[]>;
  getKey(keyName: string): Promise<string | null>;
  setKey(keyName: string, value: string): Promise<void>;
  deleteKey(keyName: string): Promise<void>;
  randomKeyHex(): string;
}

const FILE_PREFIX = "kinship-";
const FILE_SUFFIX = ".db";

export function storeFileName(userId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("not a user id");
  return `${FILE_PREFIX}${userId}${FILE_SUFFIX}`;
}

function keyName(userId: string): string {
  return `kinship.dbkey.${userId}`;
}

export async function openUserStore(
  userId: string,
  platform: DevicePlatform,
  deps: StoreDeps = {},
): Promise<UserStore> {
  const file = storeFileName(userId);
  let key = await platform.getKey(keyName(userId));
  if (!key) {
    // No key: whatever file exists is unreadable. Start clean.
    await platform.deleteFile(file);
    key = platform.randomKeyHex();
    await platform.setKey(keyName(userId), key);
  }

  let db: SqlDb;
  try {
    db = await platform.openEncrypted(file, key);
    await prepareSchema(db, userId);
  } catch (err) {
    if (!(err instanceof StoreOwnerMismatch || err instanceof EncryptionCheckFailed)) throw err;
    // Never read a file that isn't this user's or isn't properly encrypted.
    await platform.deleteFile(file);
    db = await platform.openEncrypted(file, key);
    await prepareSchema(db, userId);
  }
  return new UserStore(db, userId, deps);
}

/** Deletes every user's store and key on this device (sign-out, account deletion). */
export async function deleteAllUserStores(platform: DevicePlatform): Promise<number> {
  const files = (await platform.listFiles()).filter((f) => f.startsWith(FILE_PREFIX) && f.endsWith(FILE_SUFFIX));
  for (const f of files) {
    await platform.deleteFile(f);
    await platform.deleteKey(keyName(f.slice(FILE_PREFIX.length, -FILE_SUFFIX.length)));
  }
  return files.length;
}

export class EncryptionCheckFailed extends Error {
  constructor(detail: string) {
    super(`local store is not encrypted: ${detail}`);
  }
}
