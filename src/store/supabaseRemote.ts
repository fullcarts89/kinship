// The sync engine's Remote over Supabase (PostgREST). Every request runs as
// the signed-in user, so RLS and the database rules (versions, ownership,
// provenance) apply exactly as the pgTAP suites prove.

import type { SupabaseClient } from "@supabase/supabase-js";
import { RemoteError, type ManifestEntry, type Remote, type Row } from "./remote";
import { spec, type MirroredTable } from "./tables";

interface PgError {
  code?: string;
  message: string;
}

/** Maps a PostgREST/Postgres error to what the sync engine should do. */
export function classifyError(error: PgError): RemoteError {
  const code = error.code ?? "";
  if (code === "40001") return new RemoteError("conflict", error.message, code);
  // Expired or missing session: retry once Auth has refreshed it.
  if (code === "PGRST301" || code === "PGRST302") return new RemoteError("network", error.message, code);
  if (/^(22|23|42|P0)/.test(code) || code.startsWith("PGRST")) {
    return new RemoteError("rejected", error.message, code);
  }
  // No code: the request never got an answer (offline, timeout).
  return new RemoteError("network", error.message, code || undefined);
}

export class SupabaseRemote implements Remote {
  constructor(private readonly client: SupabaseClient) {}

  async insert(table: MirroredTable, key: string, fields: Record<string, unknown>): Promise<Row> {
    const k = spec(table).key;
    const { data, error } = await this.client
      .from(table)
      .upsert({ ...fields, [k]: key }, { onConflict: k, ignoreDuplicates: true })
      .select();
    if (error) throw classifyError(error);
    if (data && data.length) return data[0] as Row;
    // Already there (an earlier attempt landed): return what the server has.
    const [existing] = await this.fetchByKeys(table, [key]);
    if (!existing) throw new RemoteError("rejected", `${table} ${key} exists but isn't visible`, "23505");
    return existing;
  }

  async update(table: MirroredTable, key: string, nextVersion: number, fields: Record<string, unknown>): Promise<Row> {
    const { data, error } = await this.client
      .from(table)
      .update({ ...fields, version: nextVersion })
      .eq(spec(table).key, key)
      .select();
    if (error) throw classifyError(error);
    if (!data || data.length === 0) throw new RemoteError("not_found", `${table} ${key} not found`);
    return data[0] as Row;
  }

  async changedSince(
    table: MirroredTable,
    since: string | null,
    after: { updated_at: string; key: string } | null,
    limit: number,
  ): Promise<Row[]> {
    const k = spec(table).key;
    let q = this.client.from(table).select("*");
    if (since) q = q.gte("updated_at", since);
    if (after) {
      q = q.or(`updated_at.gt."${after.updated_at}",and(updated_at.eq."${after.updated_at}",${k}.gt.${after.key})`);
    }
    const { data, error } = await q.order("updated_at", { ascending: true }).order(k, { ascending: true }).limit(limit);
    if (error) throw classifyError(error);
    return (data ?? []) as Row[];
  }

  async manifest(table: MirroredTable, afterKey: string | null, limit: number): Promise<ManifestEntry[]> {
    const s = spec(table);
    let q = this.client.from(table).select(s.tombstones ? `${s.key},version,deleted_at` : `${s.key},version`);
    if (afterKey) q = q.gt(s.key, afterKey);
    const { data, error } = await q.order(s.key, { ascending: true }).limit(limit);
    if (error) throw classifyError(error);
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
      key: String(r[s.key]),
      version: r.version as number,
      deleted_at: (r.deleted_at as string | null | undefined) ?? null,
    }));
  }

  async insertMemoryItem(key: string, item: Record<string, unknown>, sources: Record<string, unknown>[]): Promise<Row> {
    const { data, error } = await this.client.rpc("write_memory_item", {
      p_item: { ...item, id: key },
      p_sources: sources,
    });
    if (error) throw classifyError(error);
    return data as Row;
  }

  async fetchByKeys(table: MirroredTable, keys: string[]): Promise<Row[]> {
    if (keys.length === 0) return [];
    const { data, error } = await this.client.from(table).select("*").in(spec(table).key, keys);
    if (error) throw classifyError(error);
    return (data ?? []) as Row[];
  }
}
