// UserStore: one signed-in user's on-device data (plan §11, Checkpoint B).
//
// Reads come from the mirror. Writes change the mirror and queue an outbox
// op in the same transaction, so the UI updates instantly, works offline, and
// a crash can never leave a change shown but unqueued (or queued but unshown).
//
// Versions (CA-3) are carried here, never by screens: an update op records
// the server version it was based on, and the sync engine sends base + 1.

import { spec, writableFields, type MirroredTable } from "./tables";
import type { SqlDb, SqlExecutor, SqlValue } from "./sql";

export type Data = Record<string, unknown>;

interface MirrorRow {
  tbl: string;
  id: string;
  version: number;
  updated_at: string | null;
  deleted_at: string | null;
  person_id: string | null;
  data: string;
  server_data: string | null;
}

export interface OutboxOp {
  seq: number;
  op_id: string;
  tbl: MirroredTable;
  row_id: string;
  kind: "insert" | "update";
  base_version: number | null;
  base_data: Data | null;
  patch: Data;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

export interface Conflict {
  id: number;
  tbl: MirroredTable;
  row_id: string;
  reason: string;
  local_patch: Data;
  server_row: Data | null;
  created_at: string;
}

export class StoreWriteError extends Error {}

/** Outbox-only field carrying a new memory item's sources. Never sent as a column. */
export const SOURCES_FIELD = "__sources";

export interface StoreDeps {
  now?: () => string;
  newId?: () => string;
}

export class UserStore {
  readonly now: () => string;
  private readonly newId: () => string;
  private readonly listeners = new Set<() => void>();

  constructor(
    readonly db: SqlDb,
    readonly userId: string,
    deps: StoreDeps = {},
  ) {
    this.now = deps.now ?? (() => new Date().toISOString());
    this.newId = deps.newId ?? defaultUuid;
  }

  // ─── Change notifications (hooks re-read; they never merge data themselves) ─

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    for (const l of [...this.listeners]) l();
  }

  // ─── Reads ────────────────────────────────────────────────────────────

  async get(table: MirroredTable, key: string, opts: { includeDeleted?: boolean } = {}): Promise<Data | null> {
    const row = await this.db.get<MirrorRow>("SELECT * FROM mirror WHERE tbl = ? AND id = ?", [table, key]);
    if (!row || (row.deleted_at && !opts.includeDeleted)) return null;
    return JSON.parse(row.data) as Data;
  }

  async list(
    table: MirroredTable,
    opts: { personId?: string; includeDeleted?: boolean } = {},
  ): Promise<Data[]> {
    const where = ["tbl = ?"];
    const params: SqlValue[] = [table];
    if (opts.personId !== undefined) {
      where.push("person_id = ?");
      params.push(opts.personId);
    }
    if (!opts.includeDeleted) where.push("deleted_at IS NULL");
    const rows = await this.db.all<MirrorRow>(
      `SELECT * FROM mirror WHERE ${where.join(" AND ")} ORDER BY id`,
      params,
    );
    return rows.map((r) => JSON.parse(r.data) as Data);
  }

  // ─── Writes ───────────────────────────────────────────────────────────

  /** Creates a row locally and queues it. Returns the row as the UI sees it. */
  async create(table: MirroredTable, fields: Data): Promise<Data> {
    const s = spec(table);
    if (!s.appInsert) throw new StoreWriteError(`${table} is server-written`);
    if (table === "memory_items") throw new StoreWriteError("use createMemoryItem: a memory needs its sources");
    this.assertWritable(table, fields, "insert");
    const key = s.key === "user_id" ? this.userId : (fields.id as string | undefined) ?? this.newId();
    const now = this.now();
    const row: Data = {
      ...fields,
      [s.key]: key,
      ...(s.key === "id" ? { user_id: this.userId } : {}),
      created_at: now,
      updated_at: now,
      version: 0, // not on the server yet
      ...(s.tombstones ? { deleted_at: (fields.deleted_at as string | null | undefined) ?? null } : {}),
    };
    await this.db.transaction(async (tx) => {
      const existing = await tx.get<MirrorRow>("SELECT * FROM mirror WHERE tbl = ? AND id = ?", [table, key]);
      if (existing) throw new StoreWriteError(`${table} ${key} already exists`);
      await writeMirror(tx, table, key, row, 0, null);
      await tx.run(
        `INSERT INTO outbox (op_id, tbl, row_id, kind, base_version, base_data, patch, created_at)
         VALUES (?, ?, ?, 'insert', NULL, NULL, ?, ?)`,
        [this.newId(), table, key, JSON.stringify(writableFields(table, row, "insert")), now],
      );
    });
    this.notify();
    return row;
  }

  /**
   * Creates a memory item with its sources (provenance, plan §6). The item
   * and sources are one queued write: the server creates them in one
   * transaction (write_memory_item). At least one source is required.
   */
  async createMemoryItem(fields: Data, sources: Data[]): Promise<Data> {
    if (sources.length === 0) throw new StoreWriteError("a memory item needs at least one source");
    this.assertWritable("memory_items", fields, "insert");
    for (const s of sources) {
      this.assertWritable("memory_item_sources", s, "insert");
    }
    const key = (fields.id as string | undefined) ?? this.newId();
    const now = this.now();
    const item: Data = {
      subject_type: "person", detail: {}, certainty: "stated", sensitivity: "none",
      status: "active", user_state: "unreviewed",
      ...fields, id: key, user_id: this.userId, created_at: now, updated_at: now, version: 0, deleted_at: null,
    };
    const sourceRows: Data[] = sources.map((s) => ({
      ...s, id: (s.id as string | undefined) ?? this.newId(), memory_item_id: key, user_id: this.userId,
      created_at: now, updated_at: now, version: 0, deleted_at: null,
    }));
    await this.db.transaction(async (tx) => {
      await writeMirror(tx, "memory_items", key, item, 0, null);
      for (const s of sourceRows) await writeMirror(tx, "memory_item_sources", s.id as string, s, 0, null);
      await tx.run(
        `INSERT INTO outbox (op_id, tbl, row_id, kind, base_version, base_data, patch, created_at)
         VALUES (?, 'memory_items', ?, 'insert', NULL, NULL, ?, ?)`,
        [this.newId(), key, JSON.stringify({
          ...writableFields("memory_items", item, "insert"),
          [SOURCES_FIELD]: sourceRows.map((s) => ({ id: s.id, ...writableFields("memory_item_sources", s, "insert") })),
        }), now],
      );
    });
    this.notify();
    return item;
  }

  /** Changes a row locally and queues the change (merged into any pending op). */
  async update(table: MirroredTable, key: string, patch: Data): Promise<Data> {
    const s = spec(table);
    if (!s.appUpdate) throw new StoreWriteError(`${table} is server-written`);
    this.assertWritable(table, patch, "update");
    const result = await this.db.transaction(async (tx) => {
      const current = await tx.get<MirrorRow>("SELECT * FROM mirror WHERE tbl = ? AND id = ?", [table, key]);
      if (!current) throw new StoreWriteError(`${table} ${key} is not in the local store`);
      const data = { ...(JSON.parse(current.data) as Data), ...patch };
      await writeMirror(tx, table, key, data, current.version, current.server_data);

      const pending = await tx.get<{ op_id: string; kind: string; patch: string }>(
        "SELECT op_id, kind, patch FROM outbox WHERE tbl = ? AND row_id = ? ORDER BY seq DESC LIMIT 1",
        [table, key],
      );
      if (pending) {
        const merged = { ...(JSON.parse(pending.patch) as Data), ...patch };
        await tx.run("UPDATE outbox SET patch = ? WHERE op_id = ?", [JSON.stringify(merged), pending.op_id]);
      } else {
        await tx.run(
          `INSERT INTO outbox (op_id, tbl, row_id, kind, base_version, base_data, patch, created_at)
           VALUES (?, ?, ?, 'update', ?, ?, ?, ?)`,
          [this.newId(), table, key, current.version, current.server_data, JSON.stringify(patch), this.now()],
        );
      }
      return data;
    });
    this.notify();
    return result;
  }

  /** Deletes a row: a tombstone that syncs like any change. */
  async remove(table: MirroredTable, key: string): Promise<void> {
    if (!spec(table).tombstones) throw new StoreWriteError(`${table} rows are not deleted individually`);
    await this.update(table, key, { deleted_at: this.now() });
  }

  // ─── Outbox and conflicts (used by the sync engine and the UI) ────────

  async pendingOps(): Promise<OutboxOp[]> {
    const rows = await this.db.all<Record<string, SqlValue>>("SELECT * FROM outbox ORDER BY seq");
    return rows.map(parseOp);
  }

  async conflicts(): Promise<Conflict[]> {
    const rows = await this.db.all<Record<string, SqlValue>>(
      "SELECT * FROM conflicts WHERE resolved_at IS NULL ORDER BY id",
    );
    return rows.map((r) => ({
      id: r.id as number,
      tbl: r.tbl as MirroredTable,
      row_id: r.row_id as string,
      reason: r.reason as string,
      local_patch: JSON.parse(r.local_patch as string) as Data,
      server_row: r.server_row ? (JSON.parse(r.server_row as string) as Data) : null,
      created_at: r.created_at as string,
    }));
  }

  async resolveConflict(id: number): Promise<void> {
    await this.db.run("UPDATE conflicts SET resolved_at = ? WHERE id = ?", [this.now(), id]);
  }

  private assertWritable(table: MirroredTable, fields: Data, op: "insert" | "update"): void {
    const allowed = writableFields(table, fields, op);
    const refused = Object.keys(fields).filter(
      (k) => !(k in allowed) && !(op === "insert" && k === "id"),
    );
    if (refused.length) {
      throw new StoreWriteError(`${table}: the app cannot ${op} ${refused.join(", ")}`);
    }
  }
}

// ─── Helpers shared with the sync engine ────────────────────────────────

export async function writeMirror(
  tx: SqlExecutor,
  table: MirroredTable,
  key: string,
  data: Data,
  version: number,
  serverData: string | null,
): Promise<void> {
  const s = spec(table);
  const personId = s.personColumn ? ((data[s.personColumn] as string | null | undefined) ?? null) : null;
  await tx.run(
    `INSERT INTO mirror (tbl, id, version, updated_at, deleted_at, person_id, data, server_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (tbl, id) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at, person_id = excluded.person_id, data = excluded.data,
       server_data = excluded.server_data`,
    [
      table, key, version,
      (data.updated_at as string | null | undefined) ?? null,
      (data.deleted_at as string | null | undefined) ?? null,
      personId, JSON.stringify(data), serverData,
    ],
  );
}

export function parseOp(r: Record<string, SqlValue>): OutboxOp {
  return {
    seq: r.seq as number,
    op_id: r.op_id as string,
    tbl: r.tbl as MirroredTable,
    row_id: r.row_id as string,
    kind: r.kind as "insert" | "update",
    base_version: (r.base_version as number | null) ?? null,
    base_data: r.base_data ? (JSON.parse(r.base_data as string) as Data) : null,
    patch: JSON.parse(r.patch as string) as Data,
    created_at: r.created_at as string,
    attempts: r.attempts as number,
    last_error: (r.last_error as string | null) ?? null,
  };
}

function defaultUuid(): string {
  // expo-crypto in the app; Node's crypto in tests. Both are RFC 4122 v4.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomUUID } = require("expo-crypto") as { randomUUID: () => string };
  return randomUUID();
}
