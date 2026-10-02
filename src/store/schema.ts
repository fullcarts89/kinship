// The on-device schema (one SQLCipher file per user, plan §11).
//
// mirror   one row per synced server row: the server's columns as JSON, plus
//          the few fields sync and per-person reads need as real columns.
//          `data` is what the UI sees: the server row with any pending local
//          changes applied on top. `server_data` is the last row the server
//          confirmed, the base for three-way conflict merges.
// outbox   pending local writes, in order. One op per row at a time: further
//          edits to a row with a pending op merge into it (coalescing).
// sync_state  pull cursor and reconciliation time per table.
// conflicts   writes the server refused or that clashed with a newer server
//          change: kept and surfaced, never dropped silently.
// meta     owner user id (a file is only ever opened for its owner), schema
//          version, last full sync.

import type { SqlDb } from "./sql";

export const LOCAL_SCHEMA_VERSION = 1;

const DDL = `
CREATE TABLE IF NOT EXISTS mirror (
  tbl          TEXT NOT NULL,
  id           TEXT NOT NULL,
  version      INTEGER NOT NULL,
  updated_at   TEXT,
  deleted_at   TEXT,
  person_id    TEXT,
  data         TEXT NOT NULL,
  server_data  TEXT,
  PRIMARY KEY (tbl, id)
);
CREATE INDEX IF NOT EXISTS mirror_person_idx ON mirror (tbl, person_id);
CREATE TABLE IF NOT EXISTS outbox (
  seq           INTEGER PRIMARY KEY AUTOINCREMENT,
  op_id         TEXT NOT NULL UNIQUE,
  tbl           TEXT NOT NULL,
  row_id        TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('insert', 'update')),
  base_version  INTEGER,
  base_data     TEXT,
  patch         TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT
);
CREATE INDEX IF NOT EXISTS outbox_row_idx ON outbox (tbl, row_id);
CREATE TABLE IF NOT EXISTS sync_state (
  tbl               TEXT PRIMARY KEY,
  cursor            TEXT,
  last_pull_at      TEXT,
  last_reconcile_at TEXT
);
CREATE TABLE IF NOT EXISTS conflicts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tbl         TEXT NOT NULL,
  row_id      TEXT NOT NULL,
  reason      TEXT NOT NULL,
  local_patch TEXT NOT NULL,
  server_row  TEXT,
  created_at  TEXT NOT NULL,
  resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export class StoreOwnerMismatch extends Error {
  constructor() {
    super("local store belongs to a different account");
  }
}

/**
 * Creates or upgrades the schema and binds the file to its owner. A file
 * already bound to someone else is refused, never read.
 */
export async function prepareSchema(db: SqlDb, ownerUserId: string): Promise<void> {
  await db.exec(DDL);
  const owner = await db.get<{ value: string }>("SELECT value FROM meta WHERE key = 'owner_user_id'");
  if (owner && owner.value !== ownerUserId) throw new StoreOwnerMismatch();
  if (!owner) {
    await db.run("INSERT INTO meta (key, value) VALUES ('owner_user_id', ?)", [ownerUserId]);
  }
  await db.run(
    "INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    [String(LOCAL_SCHEMA_VERSION)],
  );
}

export async function getMeta(db: SqlDb, key: string): Promise<string | null> {
  return (await db.get<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]))?.value ?? null;
}

export async function setMeta(db: SqlDb, key: string, value: string): Promise<void> {
  await db.run(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}
