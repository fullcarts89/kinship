// The real DevicePlatform: expo-sqlite built with SQLCipher (app.json
// plugin "useSQLCipher"), keys in SecureStore, random keys from expo-crypto.
// Native modules are required lazily so importing the store in tests or in
// the 1.0 app never touches them until a 2.0 store is actually opened.

import { EncryptionCheckFailed, type DevicePlatform } from "./deviceStore";
import type { SqlDb, SqlExecutor, SqlValue } from "./sql";

/* eslint-disable @typescript-eslint/no-require-imports */
const sqlite = () => require("expo-sqlite") as typeof import("expo-sqlite");
const secureStore = () => require("expo-secure-store") as typeof import("expo-secure-store");
const crypto = () => require("expo-crypto") as typeof import("expo-crypto");
/* eslint-enable @typescript-eslint/no-require-imports */

export function expoPlatform(): DevicePlatform {
  return {
    async openEncrypted(fileName, keyHex) {
      if (!/^[0-9a-f]{64}$/.test(keyHex)) throw new Error("bad key");
      const db = await sqlite().openDatabaseAsync(fileName);
      // The key must be the first statement on the connection.
      await db.execAsync(`PRAGMA key = "x'${keyHex}'";`);
      const cipher = await db.getFirstAsync<{ cipher_version: string }>("PRAGMA cipher_version;");
      if (!cipher?.cipher_version) {
        await db.closeAsync();
        throw new EncryptionCheckFailed("SQLCipher is not active");
      }
      try {
        await db.getFirstAsync("SELECT count(*) FROM sqlite_master;");
      } catch {
        await db.closeAsync();
        throw new EncryptionCheckFailed("the key does not open this file");
      }
      await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
      return wrapKeyedConnection(db);
    },
    async deleteFile(fileName) {
      try {
        await sqlite().deleteDatabaseAsync(fileName);
      } catch {
        // Not there (or already closed and removed): nothing to delete.
      }
    },
    async listFiles() {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Directory } = require("expo-file-system") as typeof import("expo-file-system");
      const dir = new Directory(sqlite().defaultDatabaseDirectory);
      return dir.exists ? dir.list().map((e) => e.name) : [];
    },
    getKey: (name) => secureStore().getItemAsync(name),
    setKey: (name, value) =>
      secureStore().setItemAsync(name, value, {
        keychainAccessible: secureStore().AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      }),
    deleteKey: (name) => secureStore().deleteItemAsync(name),
    randomKeyHex() {
      return Array.from(crypto().getRandomBytes(32), (b) => b.toString(16).padStart(2, "0")).join("");
    },
  };
}

type ExpoDb = Pick<
  Awaited<ReturnType<typeof import("expo-sqlite").openDatabaseAsync>>,
  "runAsync" | "getAllAsync" | "getFirstAsync" | "execAsync" | "closeAsync"
>;

/**
 * Wraps one keyed connection. Transactions run on THAT connection with
 * explicit BEGIN/COMMIT: expo-sqlite's withExclusiveTransactionAsync opens a
 * second connection, which never receives the SQLCipher key (and is rightly
 * refused). Writes are queued so no statement lands inside another caller's
 * open transaction.
 */
export function wrapKeyedConnection(db: ExpoDb): SqlDb {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const p = queue.then(task, task);
    queue = p.catch(() => undefined);
    return p;
  };
  const direct: SqlExecutor = {
    async run(sql, params: SqlValue[] = []) {
      await db.runAsync(sql, params);
    },
    all: <T>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
    get: <T>(sql: string, params: SqlValue[] = []) => db.getFirstAsync<T>(sql, params),
  };
  return {
    run: (sql, params) => serial(() => direct.run(sql, params)),
    all: <T>(sql: string, params?: SqlValue[]) => serial(() => direct.all<T>(sql, params)),
    get: <T>(sql: string, params?: SqlValue[]) => serial(() => direct.get<T>(sql, params)),
    exec: (sql) => serial(() => db.execAsync(sql)),
    transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      return serial(async () => {
        await db.execAsync("BEGIN IMMEDIATE;");
        try {
          const result = await fn(direct);
          await db.execAsync("COMMIT;");
          return result;
        } catch (err) {
          await db.execAsync("ROLLBACK;").catch(() => undefined);
          throw err;
        }
      });
    },
    close: () => serial(() => db.closeAsync()),
  };
}
