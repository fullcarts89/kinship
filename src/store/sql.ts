// The minimal SQL surface the 2.0 local store needs. The app uses
// expo-sqlite (SQLCipher) through expoSqlDb.ts; tests use sql.js through
// src/test-utils/sqljsDb.ts. Repositories and the sync engine see only this.

export type SqlValue = string | number | null;

export interface SqlExecutor {
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T | null>;
}

export interface SqlDb extends SqlExecutor {
  exec(sql: string): Promise<void>;
  /** Runs fn atomically: every write inside commits together or not at all. */
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
