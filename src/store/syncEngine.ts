// SyncEngine: moves one user's changes between the device and Supabase
// (plan §11; Checkpoint A decisions CA-3 and CA-6).
//
// push        outbox ops in order. Inserts are idempotent by client id.
//             Updates carry base version + 1. A conflict is merged three ways
//             (merge.ts): non-overlapping edits are rebased and retried;
//             overlapping ones keep the server value and are recorded as
//             conflicts. A rule rejection is recorded and the row restored to
//             the server's version. Nothing is dropped or overwritten silently.
// pull        per table, rows with updated_at >= cursor - OVERLAP, keyset-paged
//             by (updated_at, key), de-duplicated by (key, version). The overlap
//             covers transactions that commit after rows stamped later.
// reconcile   periodically, the full (key, version) manifest per table: fetches
//             anything the overlap missed and drops local rows the server no
//             longer has. Correctness doesn't rest on the overlap alone.
// full resync when the last good sync is older than tombstone retention
//             (30 days), the local copy of synced rows is rebuilt from scratch.

import { threeWayMerge } from "./merge";
import { RemoteError, type Remote, type Row } from "./remote";
import { getMeta, setMeta } from "./schema";
import { PULL_ORDER, TOMBSTONE_RETENTION_MS, spec, writableFields, type MirroredTable } from "./tables";
import { parseOp, SOURCES_FIELD, writeMirror, type Data, type OutboxOp, type UserStore } from "./userStore";
import type { SqlExecutor, SqlValue } from "./sql";

export interface SyncOptions {
  /** How far before the cursor each pull starts again. */
  overlapMs?: number;
  pageSize?: number;
  /** How often to run the reconciliation pull. */
  reconcileEveryMs?: number;
  /** Rebase attempts per op per sync before giving up until next time. */
  maxRebases?: number;
}

export interface SyncReport {
  pushed: number;
  rebased: number;
  conflicts: number;
  rejected: number;
  pulled: number;
  reconciled: { fetched: number; dropped: number } | null;
  fullResync: boolean;
  offline: boolean;
}

const DEFAULTS: Required<SyncOptions> = {
  overlapMs: 5 * 60 * 1000,
  pageSize: 500,
  reconcileEveryMs: 24 * 60 * 60 * 1000,
  maxRebases: 3,
};

export class SyncEngine {
  private readonly opts: Required<SyncOptions>;
  private running: Promise<SyncReport> | null = null;

  constructor(
    private readonly store: UserStore,
    private readonly remote: Remote,
    opts: SyncOptions = {},
  ) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  /** One full cycle. Concurrent calls share the run in progress. */
  sync(): Promise<SyncReport> {
    if (!this.running) {
      this.running = this.cycle().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async cycle(): Promise<SyncReport> {
    const report: SyncReport = {
      pushed: 0, rebased: 0, conflicts: 0, rejected: 0, pulled: 0,
      reconciled: null, fullResync: false, offline: false,
    };
    try {
      if (await this.needsFullResync()) {
        await this.resetForFullResync();
        report.fullResync = true;
      }
      await this.push(report);
      for (const table of PULL_ORDER) report.pulled += await this.pull(table);
      if (report.fullResync || (await this.reconcileDue())) {
        report.reconciled = await this.reconcile();
      }
      await setMeta(this.store.db, "last_sync_ok_at", this.store.now());
    } catch (err) {
      if (!(err instanceof RemoteError && err.kind === "network")) throw err;
      report.offline = true;
    } finally {
      if (changedAnything(report)) this.store.notify();
    }
    return report;
  }

  // ─── Push ─────────────────────────────────────────────────────────────

  private async push(report: SyncReport): Promise<void> {
    const ops = await this.store.pendingOps();
    for (const op of ops) {
      await this.pushOp(op, report, 0);
    }
  }

  private async pushOp(op: OutboxOp, report: SyncReport, rebases: number): Promise<void> {
    try {
      let row: Row;
      if (op.kind === "insert" && op.tbl === "memory_items" && Array.isArray(op.patch[SOURCES_FIELD])) {
        row = await this.remote.insertMemoryItem(
          op.row_id, writableFields(op.tbl, op.patch, "insert"), op.patch[SOURCES_FIELD] as Data[],
        );
      } else if (op.kind === "insert") {
        row = await this.remote.insert(op.tbl, op.row_id, writableFields(op.tbl, op.patch, "insert"));
        // An existing row (e.g. settings created by the server first) that
        // doesn't carry what we sent: continue as an update on top of it.
        const unapplied = differingFields(op.patch, row, writableFields(op.tbl, op.patch, "update"));
        if (Object.keys(unapplied).length) {
          await this.afterSuccess(op, row, { convertTo: unapplied });
          report.pushed++;
          const next = await this.reloadOp(op.op_id);
          if (next) await this.pushOp(next, report, rebases);
          return;
        }
      } else {
        row = await this.remote.update(
          op.tbl, op.row_id, (op.base_version ?? 0) + 1, writableFields(op.tbl, op.patch, "update"),
        );
      }
      await this.afterSuccess(op, row, {});
      report.pushed++;
    } catch (err) {
      if (!(err instanceof RemoteError)) throw err;
      if (err.kind === "network") throw err;
      await this.store.db.run("UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE op_id = ?", [
        `${err.kind}${err.code ? ` ${err.code}` : ""}: ${err.message}`.slice(0, 500), op.op_id,
      ]);
      if (err.kind === "conflict" && op.kind === "update") {
        if (rebases >= this.opts.maxRebases) return; // try again next sync
        const rebasedOp = await this.mergeConflict(op, report);
        if (rebasedOp) {
          report.rebased++;
          await this.pushOp(rebasedOp, report, rebases + 1);
        }
        return;
      }
      // rejected or not_found: the write can't succeed as is. Record it,
      // drop the op, and show the server's truth again.
      report.rejected++;
      await this.recordAndRestore(op, `${err.kind}${err.code ? ` ${err.code}` : ""}`);
    }
  }

  /** Applies the server's row after a successful write, keeping newer local edits. */
  private async afterSuccess(op: OutboxOp, row: Row, how: { convertTo?: Data }): Promise<void> {
    const key = op.row_id;
    await this.store.db.transaction(async (tx) => {
      const current = await tx.get<{ patch: string }>("SELECT patch FROM outbox WHERE op_id = ?", [op.op_id]);
      const sentPatch = JSON.stringify(op.patch);
      let remaining: Data | null = null;
      if (how.convertTo) {
        remaining = how.convertTo;
      } else if (current && current.patch !== sentPatch) {
        // The user edited while this op was in flight: keep their newer patch.
        remaining = JSON.parse(current.patch) as Data;
      }
      if (remaining) {
        await tx.run(
          "UPDATE outbox SET kind = 'update', base_version = ?, base_data = ?, patch = ?, last_error = NULL WHERE op_id = ?",
          [row.version, JSON.stringify(row), JSON.stringify(remaining), op.op_id],
        );
      } else {
        await tx.run("DELETE FROM outbox WHERE op_id = ?", [op.op_id]);
      }
      await writeMirror(tx, op.tbl, key, { ...row, ...(remaining ?? {}) }, row.version, JSON.stringify(row));
    });
  }

  /** Conflict on update: three-way merge against the newer server row. */
  private async mergeConflict(op: OutboxOp, report: SyncReport): Promise<OutboxOp | null> {
    const [server] = await this.remote.fetchByKeys(op.tbl, [op.row_id]);
    if (!server) {
      report.rejected++;
      await this.recordAndRestore(op, "not_found");
      return null;
    }
    const base = op.base_data ?? {};
    const { rebased, conflicting } = threeWayMerge(base, op.patch, server);
    return this.store.db.transaction(async (tx) => {
      if (Object.keys(conflicting).length) {
        report.conflicts++;
        await recordConflict(tx, op, "concurrent_edit", conflicting, server, this.store.now());
      }
      if (Object.keys(rebased).length === 0) {
        await tx.run("DELETE FROM outbox WHERE op_id = ?", [op.op_id]);
        await writeMirror(tx, op.tbl, op.row_id, server, server.version, JSON.stringify(server));
        return null;
      }
      await tx.run(
        "UPDATE outbox SET base_version = ?, base_data = ?, patch = ? WHERE op_id = ?",
        [server.version, JSON.stringify(server), JSON.stringify(rebased), op.op_id],
      );
      await writeMirror(tx, op.tbl, op.row_id, { ...server, ...rebased }, server.version, JSON.stringify(server));
      const reloaded = await tx.get<Record<string, SqlValue>>("SELECT * FROM outbox WHERE op_id = ?", [op.op_id]);
      return reloaded ? parseOp(reloaded) : null;
    });
  }

  private async recordAndRestore(op: OutboxOp, reason: string): Promise<void> {
    let server: Row | undefined;
    try {
      [server] = await this.remote.fetchByKeys(op.tbl, [op.row_id]);
    } catch (err) {
      if (err instanceof RemoteError && err.kind === "network") throw err;
      server = undefined;
    }
    await this.store.db.transaction(async (tx) => {
      await recordConflict(tx, op, reason, op.patch, server ?? null, this.store.now());
      await tx.run("DELETE FROM outbox WHERE op_id = ?", [op.op_id]);
      if (server) {
        await writeMirror(tx, op.tbl, op.row_id, server, server.version, JSON.stringify(server));
      } else {
        await tx.run("DELETE FROM mirror WHERE tbl = ? AND id = ?", [op.tbl, op.row_id]);
      }
    });
  }

  private async reloadOp(opId: string): Promise<OutboxOp | null> {
    const r = await this.store.db.get<Record<string, SqlValue>>("SELECT * FROM outbox WHERE op_id = ?", [opId]);
    return r ? parseOp(r) : null;
  }

  // ─── Pull ─────────────────────────────────────────────────────────────

  private async pull(table: MirroredTable): Promise<number> {
    const state = await this.store.db.get<{ cursor: string | null }>(
      "SELECT cursor FROM sync_state WHERE tbl = ?", [table],
    );
    const since = state?.cursor
      ? new Date(Date.parse(state.cursor) - this.opts.overlapMs).toISOString()
      : null;
    let after: { updated_at: string; key: string } | null = null;
    let newest = state?.cursor ?? null;
    let applied = 0;
    const key = spec(table).key;
    for (;;) {
      const rows = await this.remote.changedSince(table, since, after, this.opts.pageSize);
      for (const row of rows) {
        if (await this.applyServerRow(table, row)) applied++;
        if (!newest || Date.parse(row.updated_at) > Date.parse(newest)) newest = row.updated_at;
      }
      if (rows.length < this.opts.pageSize) break;
      const last = rows[rows.length - 1];
      after = { updated_at: last.updated_at, key: String(last[key]) };
    }
    await this.store.db.run(
      `INSERT INTO sync_state (tbl, cursor, last_pull_at) VALUES (?, ?, ?)
       ON CONFLICT (tbl) DO UPDATE SET cursor = excluded.cursor, last_pull_at = excluded.last_pull_at`,
      [table, newest, this.store.now()],
    );
    return applied;
  }

  /** Applies one server row. Returns false if it was already known (same or newer version). */
  private async applyServerRow(table: MirroredTable, row: Row): Promise<boolean> {
    const key = String(row[spec(table).key]);
    return this.store.db.transaction(async (tx) => {
      const local = await tx.get<{ version: number }>(
        "SELECT version FROM mirror WHERE tbl = ? AND id = ?", [table, key],
      );
      if (local && local.version >= row.version) return false;
      const pending = await tx.get<{ patch: string }>(
        "SELECT patch FROM outbox WHERE tbl = ? AND row_id = ? ORDER BY seq DESC LIMIT 1", [table, key],
      );
      // Pending local edits stay visible on top of the newer server row;
      // their push will meet a version conflict and merge three ways.
      const overlay = pending ? (JSON.parse(pending.patch) as Data) : {};
      await writeMirror(tx, table, key, { ...row, ...overlay }, row.version, JSON.stringify(row));
      return true;
    });
  }

  // ─── Reconcile and full resync ────────────────────────────────────────

  private async reconcileDue(): Promise<boolean> {
    const last = await this.store.db.get<{ t: string | null }>("SELECT min(last_reconcile_at) AS t FROM sync_state");
    if (!last?.t) return true;
    return Date.parse(this.store.now()) - Date.parse(last.t) >= this.opts.reconcileEveryMs;
  }

  private async reconcile(): Promise<{ fetched: number; dropped: number }> {
    let fetched = 0;
    let dropped = 0;
    for (const table of PULL_ORDER) {
      const server = new Map<string, number>();
      let afterKey: string | null = null;
      for (;;) {
        const page = await this.remote.manifest(table, afterKey, this.opts.pageSize);
        for (const e of page) server.set(e.key, e.version);
        if (page.length < this.opts.pageSize) break;
        afterKey = page[page.length - 1].key;
      }
      const local = await this.store.db.all<{ id: string; version: number }>(
        "SELECT id, version FROM mirror WHERE tbl = ?", [table],
      );
      const localVersions = new Map(local.map((r) => [r.id, r.version]));
      const pendingInserts = new Set(
        (await this.store.db.all<{ row_id: string }>(
          "SELECT row_id FROM outbox WHERE tbl = ? AND kind = 'insert'", [table],
        )).map((r) => r.row_id),
      );

      // Rows the server has that we lack or hold an older version of.
      const missing = [...server.entries()]
        .filter(([k, v]) => (localVersions.get(k) ?? -1) < v)
        .map(([k]) => k);
      for (let i = 0; i < missing.length; i += 100) {
        for (const row of await this.remote.fetchByKeys(table, missing.slice(i, i + 100))) {
          if (await this.applyServerRow(table, row)) fetched++;
        }
      }
      // Rows we hold that the server no longer has (purged), unless they are
      // ours and not yet pushed.
      for (const r of local) {
        if (!server.has(r.id) && !pendingInserts.has(r.id)) {
          await this.store.db.run("DELETE FROM mirror WHERE tbl = ? AND id = ?", [table, r.id]);
          dropped++;
        }
      }
      await this.store.db.run(
        `INSERT INTO sync_state (tbl, last_reconcile_at) VALUES (?, ?)
         ON CONFLICT (tbl) DO UPDATE SET last_reconcile_at = excluded.last_reconcile_at`,
        [table, this.store.now()],
      );
    }
    return { fetched, dropped };
  }

  private async needsFullResync(): Promise<boolean> {
    const last = await getMeta(this.store.db, "last_sync_ok_at");
    if (!last) return false; // first sync: cursors are empty, so it pulls everything anyway
    return Date.parse(this.store.now()) - Date.parse(last) > TOMBSTONE_RETENTION_MS;
  }

  /** Drops synced rows (keeping unpushed local writes) and every cursor. */
  private async resetForFullResync(): Promise<void> {
    await this.store.db.transaction(async (tx) => {
      await tx.run("DELETE FROM mirror WHERE NOT EXISTS (SELECT 1 FROM outbox o WHERE o.tbl = mirror.tbl AND o.row_id = mirror.id)");
      await tx.run("DELETE FROM sync_state");
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function changedAnything(r: SyncReport): boolean {
  return r.pushed + r.rebased + r.conflicts + r.rejected + r.pulled > 0
    || r.fullResync || (r.reconciled?.fetched ?? 0) + (r.reconciled?.dropped ?? 0) > 0;
}

async function recordConflict(
  tx: SqlExecutor,
  op: OutboxOp,
  reason: string,
  patch: Data,
  server: Data | null,
  now: string,
): Promise<void> {
  await tx.run(
    "INSERT INTO conflicts (tbl, row_id, reason, local_patch, server_row, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [op.tbl, op.row_id, reason, JSON.stringify(patch), server ? JSON.stringify(server) : null, now],
  );
}

/** Fields in `sent` (restricted to `updatable`) whose value the row doesn't carry. */
function differingFields(sent: Data, row: Data, updatable: Data): Data {
  const out: Data = {};
  for (const k of Object.keys(updatable)) {
    if (JSON.stringify(sent[k] ?? null) !== JSON.stringify(row[k] ?? null)) out[k] = sent[k];
  }
  return out;
}
