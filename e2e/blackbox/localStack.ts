// The local Supabase stack (`npx supabase start`, `npx supabase functions
// serve ai-gateway --env-file supabase/functions/.env.replay.local`): local
// test accounts only, never production. Keys come from the gitignored
// supabase/.env.harness.local that `supabase status -o env` wrote.
import { readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
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

async function admin(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** A fresh local account, signed in through the real auth endpoint, with AI turned on for it alone. */
export async function localAccount(): Promise<{ client: SupabaseClient; userId: string; email: string }> {
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
  const client = createClient(API_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
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
