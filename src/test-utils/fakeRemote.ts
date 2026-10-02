// A server that behaves like Kinship's Postgres rules for sync purposes:
// rows owned per user, server-stamped updated_at, version + 1 on every write,
// 40001 on a stale version, idempotent inserts by client id, tombstones, and
// a 30-day purge. Shared by several FakeRemotes to model several users or
// devices. The real rules are proven on Postgres by the pgTAP suites.

import { RemoteError, type ManifestEntry, type Remote, type Row } from "@/store/remote";
import { spec, type MirroredTable } from "@/store/tables";

type Stored = Row & { user_id: string };

export class FakeServer {
  private tables = new Map<MirroredTable, Map<string, Stored>>();
  /** Server clock in ms; advanced on every write. */
  clock = Date.parse("2026-10-05T12:00:00.000Z");
  offline = false;
  /** Fail the next write whose fields match, with the given kind/code. */
  rejectNext: { table: MirroredTable; kind: "rejected" | "not_found"; code?: string } | null = null;
  calls: string[] = [];

  table(name: MirroredTable): Map<string, Stored> {
    let t = this.tables.get(name);
    if (!t) this.tables.set(name, (t = new Map()));
    return t;
  }

  tick(ms = 1000): string {
    this.clock += ms;
    return new Date(this.clock).toISOString();
  }

  /** Another device or a server job writes directly. */
  serverWrite(name: MirroredTable, key: string, userId: string, fields: Record<string, unknown>, stamp?: string): Stored {
    const t = this.table(name);
    const prev = t.get(key);
    const updated_at = stamp ?? this.tick();
    const row = {
      ...(prev ?? { created_at: updated_at }),
      ...fields,
      [spec(name).key]: key,
      user_id: userId,
      version: (prev?.version ?? 0) + 1,
      updated_at,
    } as Stored;
    t.set(key, row);
    return row;
  }

  /** Hard purge (what purge_tombstones does after 30 days). */
  purge(name: MirroredTable, key: string): void {
    this.table(name).delete(key);
  }
}

export class FakeRemote implements Remote {
  constructor(
    private readonly server: FakeServer,
    private readonly userId: string,
  ) {}

  private guard(op: string): void {
    this.server.calls.push(op);
    if (this.server.offline) throw new RemoteError("network", "offline");
  }

  private visible(name: MirroredTable): Stored[] {
    return [...this.server.table(name).values()].filter((r) => r.user_id === this.userId);
  }

  private rejection(name: MirroredTable): void {
    const r = this.server.rejectNext;
    if (r && r.table === name) {
      this.server.rejectNext = null;
      throw new RemoteError(r.kind, `refused (${r.code ?? r.kind})`, r.code);
    }
  }

  async insert(name: MirroredTable, key: string, fields: Record<string, unknown>): Promise<Row> {
    this.guard(`insert ${name} ${key}`);
    this.rejection(name);
    const existing = this.server.table(name).get(key);
    if (existing) {
      if (existing.user_id !== this.userId) throw new RemoteError("rejected", "duplicate key", "23505");
      return structuredClone(existing);
    }
    return structuredClone(this.server.serverWrite(name, key, this.userId, fields));
  }

  async update(name: MirroredTable, key: string, nextVersion: number, fields: Record<string, unknown>): Promise<Row> {
    this.guard(`update ${name} ${key} v${nextVersion}`);
    this.rejection(name);
    const row = this.server.table(name).get(key);
    if (!row || row.user_id !== this.userId) throw new RemoteError("not_found", "no such row");
    if (nextVersion !== row.version + 1) {
      throw new RemoteError("conflict", `current is ${row.version}, got ${nextVersion}`, "40001");
    }
    return structuredClone(this.server.serverWrite(name, key, this.userId, fields));
  }

  async changedSince(
    name: MirroredTable,
    since: string | null,
    after: { updated_at: string; key: string } | null,
    limit: number,
  ): Promise<Row[]> {
    this.guard(`pull ${name}`);
    const key = spec(name).key;
    return this.visible(name)
      .filter((r) => !since || Date.parse(r.updated_at) >= Date.parse(since))
      .sort((a, b) => cmp(a.updated_at, b.updated_at) || cmp(String(a[key]), String(b[key])))
      .filter((r) => !after || cmp(r.updated_at, after.updated_at) > 0
        || (r.updated_at === after.updated_at && cmp(String(r[key]), after.key) > 0))
      .slice(0, limit)
      .map((r) => structuredClone(r));
  }

  async manifest(name: MirroredTable, afterKey: string | null, limit: number): Promise<ManifestEntry[]> {
    this.guard(`manifest ${name}`);
    const key = spec(name).key;
    return this.visible(name)
      .map((r) => ({ key: String(r[key]), version: r.version, deleted_at: (r.deleted_at as string | null) ?? null }))
      .sort((a, b) => cmp(a.key, b.key))
      .filter((e) => !afterKey || cmp(e.key, afterKey) > 0)
      .slice(0, limit);
  }

  async insertMemoryItem(key: string, item: Record<string, unknown>, sources: Record<string, unknown>[]): Promise<Row> {
    this.guard(`insert memory_items ${key} +${sources.length} sources`);
    this.rejection("memory_items");
    if (sources.length === 0) throw new RemoteError("rejected", "a memory item needs at least one source", "23514");
    const existing = this.server.table("memory_items").get(key);
    if (existing) {
      if (existing.user_id !== this.userId) throw new RemoteError("rejected", "duplicate key", "23505");
      return structuredClone(existing);
    }
    const row = this.server.serverWrite("memory_items", key, this.userId, item);
    for (const s of sources) {
      const id = (s.id as string | undefined) ?? `${key}:${this.server.table("memory_item_sources").size}`;
      this.server.serverWrite("memory_item_sources", id, this.userId, { ...s, memory_item_id: key }, row.updated_at);
    }
    return structuredClone(row);
  }

  async fetchByKeys(name: MirroredTable, keys: string[]): Promise<Row[]> {
    this.guard(`fetch ${name}`);
    return keys
      .map((k) => this.server.table(name).get(k))
      .filter((r): r is Stored => !!r && r.user_id === this.userId)
      .map((r) => structuredClone(r));
  }
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
