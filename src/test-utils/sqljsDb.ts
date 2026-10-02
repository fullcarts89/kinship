// sql.js (pure-JS SQLite) behind the store's SqlDb interface, for tests.
// Same SQL dialect as expo-sqlite on the device; no encryption (SQLCipher is
// a device concern, covered by the open-time check in openUserStore).

import type { SqlDb, SqlExecutor, SqlValue } from "@/store/sql";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJs = require("sql.js/dist/sql-asm.js") as () => Promise<SqlJsStatic>;

interface SqlJsStatement {
  bind(params: SqlValue[]): void;
  step(): boolean;
  getAsObject(): Record<string, SqlValue>;
  free(): void;
}
interface SqlJsDatabase {
  run(sql: string, params?: SqlValue[]): void;
  exec(sql: string): unknown;
  prepare(sql: string): SqlJsStatement;
  export(): Uint8Array;
  close(): void;
}
interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** In-memory "files" keyed by name, so tests can reopen or delete a user's store. */
export const memoryFiles = new Map<string, Uint8Array>();

export async function openSqlJsDb(name?: string): Promise<SqlDb & { persist(): void }> {
  sqlPromise ??= initSqlJs();
  const SQL = await sqlPromise;
  const raw = new SQL.Database(name ? memoryFiles.get(name) : undefined);
  let inTx = false;
  let queue: Promise<unknown> = Promise.resolve();

  const exec: SqlExecutor = {
    async run(sql, params = []) {
      raw.run(sql, params);
    },
    async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
      const stmt = raw.prepare(sql);
      try {
        stmt.bind(params);
        const out: T[] = [];
        while (stmt.step()) out.push(stmt.getAsObject() as T);
        return out;
      } finally {
        stmt.free();
      }
    },
    async get<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
      const rows = await exec.all<T>(sql, params);
      return rows[0] ?? null;
    },
  };

  // Same semantics as the device wrapper (wrapKeyedConnection): every
  // statement and transaction is queued on one connection, so code that
  // touches the outer db from inside a transaction deadlocks here too.
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const p = queue.then(task, task);
    queue = p.catch(() => undefined);
    return p;
  };
  const db: SqlDb & { persist(): void } = {
    run: (sql, params) => serial(() => exec.run(sql, params)),
    all: <T>(sql: string, params?: SqlValue[]) => serial(() => exec.all<T>(sql, params)),
    get: <T>(sql: string, params?: SqlValue[]) => serial(() => exec.get<T>(sql, params)),
    exec: (sql) => serial(async () => {
      raw.exec(sql);
    }),
    transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      return serial(async () => {
        if (inTx) throw new Error("nested transaction");
        inTx = true;
        raw.run("BEGIN");
        try {
          const result = await fn(exec);
          raw.run("COMMIT");
          return result;
        } catch (err) {
          raw.run("ROLLBACK");
          throw err;
        } finally {
          inTx = false;
        }
      });
    },
    close: () => serial(async () => {
      if (name) memoryFiles.set(name, raw.export());
      raw.close();
    }),
    persist() {
      if (name) memoryFiles.set(name, raw.export());
    },
  };
  return db;
}
