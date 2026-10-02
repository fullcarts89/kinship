// What the sync engine needs from the server. SupabaseRemote implements it
// over PostgREST; tests use FakeRemote, which reproduces the database's
// rules (versions, server clock, tombstones, ownership) that the pgTAP
// suites prove on real Postgres.

import type { MirroredTable } from "./tables";

export type Row = Record<string, unknown> & { version: number; updated_at: string };

export interface ManifestEntry {
  key: string;
  version: number;
  deleted_at: string | null;
}

/** Why a write failed. Decides what the engine does next. */
export type RemoteErrorKind =
  | "conflict" // 40001: the row changed since we read it
  | "rejected" // a rule refused the write (check, FK, privilege); retrying won't help
  | "not_found" // the row isn't visible (deleted, purged, or never existed)
  | "network"; // transient; retry later

export class RemoteError extends Error {
  constructor(
    readonly kind: RemoteErrorKind,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export interface Remote {
  /**
   * Creates a row. Idempotent: if a row with this key already exists
   * (an earlier attempt succeeded but the reply was lost), returns it.
   */
  insert(table: MirroredTable, key: string, fields: Record<string, unknown>): Promise<Row>;
  /** Updates a row, stating the version it writes (base + 1). */
  update(table: MirroredTable, key: string, nextVersion: number, fields: Record<string, unknown>): Promise<Row>;
  /** Rows changed at or after `since`, ordered by (updated_at, key), keyset-paged. */
  changedSince(
    table: MirroredTable,
    since: string | null,
    after: { updated_at: string; key: string } | null,
    limit: number,
  ): Promise<Row[]>;
  /** Every row's key and version, keyset-paged by key (for reconciliation). */
  manifest(table: MirroredTable, afterKey: string | null, limit: number): Promise<ManifestEntry[]>;
  fetchByKeys(table: MirroredTable, keys: string[]): Promise<Row[]>;
  /**
   * Creates a memory item together with its sources in one server transaction
   * (provenance is checked at commit). Idempotent by the item id.
   */
  insertMemoryItem(key: string, item: Record<string, unknown>, sources: Record<string, unknown>[]): Promise<Row>;
}
