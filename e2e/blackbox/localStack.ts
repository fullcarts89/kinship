// The local Supabase stack (`npx supabase start`, `npx supabase functions
// serve ai-gateway --env-file supabase/functions/.env.replay.local`): local
// test accounts only, never production. Keys come from the gitignored
// supabase/.env.harness.local that `supabase status -o env` wrote.
import { readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { execFileSync } from "child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(): Record<string, string> {
  const text = readFileSync(join(__dirname, "../../supabase/.env.harness.local"), "utf8");
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/u);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const E = env();
export const API_URL = E.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):/u.test(API_URL)) throw new Error("the harness runs only against a local stack");
const SERVICE = E.SERVICE_ROLE_KEY;
const ANON = E.ANON_KEY;
const STUB = process.env.STUB_URL ?? "http://127.0.0.1:8790";
const GATEWAY = process.env.GATEWAY_URL;
if (GATEWAY && !/^http:\/\/(127\.0\.0\.1|localhost):/u.test(GATEWAY)) throw new Error("the harness runs only against a local gateway");

async function admin(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Every request a phone-like client made, in order (method and path; for latency breakdowns). */
export const requests: string[] = [];

/** A fresh local account, signed in through the real auth endpoint, with AI turned on for it alone. */
export async function localAccount(opts: { networkMs?: number } = {}): Promise<{ client: SupabaseClient; userId: string; email: string }> {
  const email = `e2e-${randomUUID()}@kinship.test`;
  const password = `pw-${randomUUID()}`;
  const user = await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }) as { id: string };
  // The flags a dogfood account has, for this local account alone (never global, never production).
  const keys = ["shell_v2", "memory_v2", "tell", "ai_extraction", "relationship_page_v2"];
  await admin("/rest/v1/feature_flags?on_conflict=key", {
    method: "POST", headers: { prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify(keys.map((key) => ({ key, description: "local harness", default_on: false, rollout_pct: 0 }))),
  });
  await admin("/rest/v1/user_flag_overrides", { method: "POST", body: JSON.stringify(keys.map((flag_key) => ({ user_id: user.id, flag_key, enabled: true }))) });
  // A phone's round trip to the server, when asked for (the local stack answers in a few ms).
  const slowFetch: typeof fetch = async (input, init) => {
    requests.push(`${init?.method ?? "GET"} ${String(input).replace(API_URL, "").split("?")[0]}`);
    await new Promise((res) => setTimeout(res, opts.networkMs));
    return fetch(input, init);
  };
  // A branch's own ai-gateway beside the shared `functions serve` (GATEWAY_URL, e.g. one run with
  // `deno run` from that branch, see e2e/README.md): only the gateway's requests go there.
  const viaGateway = (f: typeof fetch): typeof fetch => (input, init) =>
    f(String(input).startsWith(`${API_URL}/functions/v1/`) ? String(input).replace(`${API_URL}/functions/v1`, GATEWAY!) : input, init);
  const transport = opts.networkMs ? slowFetch : fetch;
  const client = createClient(API_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(opts.networkMs || GATEWAY ? { global: { fetch: GATEWAY ? viaGateway(transport) : transport } } : {}),
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, userId: user.id, email };
}

/** Which captured model reply the stub gives for this note. */
export async function useReply(note: string, label: string): Promise<void> {
  const res = await fetch(`${STUB}/__variant`, { method: "POST", body: JSON.stringify({ note, label }) });
  if (!res.ok) throw new Error(`stub: ${res.status}`);
}

/** Rows as the server holds them (service key; reading, for assertions only). */
export async function serverRows<T = Record<string, unknown>>(table: string, userId: string): Promise<T[]> {
  return await admin(`/rest/v1/${table}?user_id=eq.${userId}&select=*`) as T[];
}

/** The rows of a table whose `column` is one of `values` (the report table has no user column; Phase 4B B6). */
export async function serverRowsIn<T = Record<string, unknown>>(table: string, column: string, values: string[]): Promise<T[]> {
  if (!values.length) return [];
  for (const v of values) if (!/^[0-9a-f-]{36}$/u.test(v)) throw new Error("ids only");
  return await admin(`/rest/v1/${table}?${column}=in.(${values.join(",")})&select=*&order=${column}`) as T[];
}

/**
 * A shared line as an earlier build left it in this local test account: the
 * note, the memory and its source, in one transaction (every memory needs its
 * source). Local database container only; fixtures for this account only.
 */
export function legacyLine(userId: string, note: string, ownerId: string, withIds: string[], mentions: { person_id: string; text: string; name: string }[]): void {
  for (const id of [userId, ownerId, ...withIds]) if (!/^[0-9a-f-]{36}$/u.test(id)) throw new Error("ids only");
  const q = (t: string) => `$q$${t.replace(/\$q\$/gu, "")}$q$`;
  const sql = `begin;
with c as (
  insert into public.captures (user_id, source, raw_text, status, occurred_at, time_zone)
  values ('${userId}', 'text', ${q(note)}, 'extracted', '2026-10-12T20:00:00Z', 'America/Los_Angeles') returning id
), m as (
  insert into public.memory_items (user_id, kind, person_id, with_person_ids, statement, detail, origin, extraction_confidence, person_mentions)
  values ('${userId}', 'fact', '${ownerId}', array[${withIds.map((x) => `'${x}'`).join(",")}]::uuid[], ${q(note)},
    '{"category":"interest"}'::jsonb, 'extracted', 0.93, ${q(JSON.stringify(mentions))}::jsonb) returning id
)
insert into public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end, quote)
select '${userId}', m.id, c.id, 'capture', 0, ${note.length}, ${q(note)} from c, m;
commit;`;
  execFileSync("docker", ["exec", "-i", "supabase_db_kinship", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "ignore", "pipe"] });
}

/** Many earlier lines about these people (an account in use for weeks), each with its note: local fixtures only. */
export function manyLines(userId: string, personIds: string[], perPerson: number): void {
  for (const id of [userId, ...personIds]) if (!/^[0-9a-f-]{36}$/u.test(id)) throw new Error("ids only");
  const sql = `begin;
${personIds.map((pid) => `
with c as (
  insert into public.captures (user_id, source, raw_text, status, occurred_at, created_at, updated_at)
  select '${userId}', 'text', 'Earlier note ' || g, 'extracted', now() - (g || ' days')::interval, now() - (g || ' days')::interval, now() - (g || ' days')::interval
  from generate_series(1, ${perPerson}) g returning id, raw_text, created_at
), m as (
  insert into public.memory_items (user_id, kind, person_id, statement, detail, origin, extraction_confidence, created_at, updated_at)
  select '${userId}', 'fact', '${pid}', c.raw_text || ' about them', '{"category":"other"}'::jsonb, 'extracted', 0.9, c.created_at, c.created_at from c returning id, statement, created_at
)
insert into public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end, quote, created_at, updated_at)
select '${userId}', m.id, c.id, 'capture', 0, char_length(c.raw_text), c.raw_text, m.created_at, m.created_at from m join c on m.statement = c.raw_text || ' about them';`).join("\n")}
commit;`;
  execFileSync("docker", ["exec", "-i", "supabase_db_kinship", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "ignore", "pipe"] });
}

/**
 * A line an earlier day's note left in this local test account (the founder's account had 13 Oct's "call
 * John tonight" when 14 Oct's was told): the note, the memory and its source, in one transaction. Local
 * database container only.
 */
export function earlierLine(userId: string, line: { kind: string; personId: string; subject: string; statement: string; detail: Record<string, unknown>; at: string }): void {
  for (const id of [userId, line.personId]) if (!/^[0-9a-f-]{36}$/u.test(id)) throw new Error("ids only");
  const q = (t: string) => `$q$${t.replace(/\$q\$/gu, "")}$q$`;
  const sql = `begin;
with c as (
  insert into public.captures (user_id, source, raw_text, status, occurred_at, time_zone, created_at, updated_at)
  values ('${userId}', 'text', ${q(line.statement)}, 'extracted', ${q(line.at)}, 'America/Los_Angeles', ${q(line.at)}, ${q(line.at)}) returning id
), m as (
  insert into public.memory_items (user_id, kind, person_id, subject_type, statement, detail, origin, extraction_confidence, created_at, updated_at)
  values ('${userId}', ${q(line.kind)}, '${line.personId}', ${q(line.subject)}, ${q(line.statement)}, ${q(JSON.stringify(line.detail))}::jsonb, 'extracted', 0.93, ${q(line.at)}, ${q(line.at)}) returning id
)
insert into public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end, quote, created_at, updated_at)
select '${userId}', m.id, c.id, 'capture', 0, ${line.statement.length}, ${q(line.statement)}, ${q(line.at)}, ${q(line.at)} from c, m;
commit;`;
  execFileSync("docker", ["exec", "-i", "supabase_db_kinship", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "ignore", "pipe"] });
}

/**
 * How many rows every table of the local database holds (service role, the whole stack, not one account):
 * before and after a run that may write only its own tables, the counts of every other table must agree.
 * Local database container only.
 */
export function tableCounts(): Record<string, number> {
  const sql = `select json_object_agg(relname, n) from (
    select c.relname, (xpath('/row/n/text()', query_to_xml(format('select count(*) n from public.%I', c.relname), false, true, '')))[1]::text::int as n
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') t;`;
  const out = execFileSync("docker", ["exec", "-i", "supabase_db_kinship", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input: sql, stdio: ["pipe", "pipe", "pipe"] });
  return JSON.parse(out.toString().trim()) as Record<string, number>;
}
