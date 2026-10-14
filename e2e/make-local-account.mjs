// Makes a local-stack test account for the simulator (never production): email + password written to the
// gitignored e2e/.captured/sim-account.local.json, the dogfood flags on for this account alone.
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
const env = Object.fromEntries(readFileSync(new URL("../supabase/.env.harness.local", import.meta.url), "utf8").split("\n")
  .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/u)).filter(Boolean).map((m) => [m[1], m[2]]));
if (!/^http:\/\/(127\.0\.0\.1|localhost):/u.test(env.API_URL)) throw new Error("local stack only");
const h = { apikey: env.SERVICE_ROLE_KEY, authorization: `Bearer ${env.SERVICE_ROLE_KEY}`, "content-type": "application/json" };
const email = `sim-${randomUUID().slice(0, 8)}@kinship.test`;
const password = `pw-${randomUUID()}`;
const user = await (await fetch(`${env.API_URL}/auth/v1/admin/users`, { method: "POST", headers: h, body: JSON.stringify({ email, password, email_confirm: true }) })).json();
const keys = ["shell_v2", "memory_v2", "tell", "ai_extraction", "relationship_page_v2"];
await fetch(`${env.API_URL}/rest/v1/feature_flags?on_conflict=key`, { method: "POST", headers: { ...h, prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(keys.map((key) => ({ key, description: "local harness", default_on: false, rollout_pct: 0 }))) });
await fetch(`${env.API_URL}/rest/v1/user_flag_overrides`, { method: "POST", headers: h, body: JSON.stringify(keys.map((flag_key) => ({ user_id: user.id, flag_key, enabled: true }))) });
mkdirSync(new URL("./.captured/", import.meta.url), { recursive: true });
writeFileSync(new URL("./.captured/sim-account.local.json", import.meta.url), JSON.stringify({ email, password, id: user.id }, null, 2));
console.log(`local account ready: ${email}`);
