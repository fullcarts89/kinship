// The real delete-account function on a local port, for the black-box
// harness (the shared `functions serve` runs ai-gateway alone). Same handler,
// same dependencies as supabase/functions/delete-account/index.ts; keys from
// the gitignored supabase/.env.harness.local. Local stack only.
//
//   deno run --config e2e/deno.json --allow-net --allow-env --allow-read e2e/serve-delete-account.ts
//   DELETE_ACCOUNT_URL=http://127.0.0.1:8792 npx jest -c e2e/jest.blackbox.config.js e2e/blackbox/trustfloor.blackbox.tsx
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { realDeps } from "../supabase/functions/delete-account/deps.ts";
import { createDeleteAccountHandler } from "../supabase/functions/delete-account/handler.ts";

const text = await Deno.readTextFile(new URL("../supabase/.env.harness.local", import.meta.url));
const env: Record<string, string> = {};
for (const line of text.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/u);
  if (m) env[m[1]] = m[2];
}
if (!/^http:\/\/(127\.0\.0\.1|localhost):/u.test(env.API_URL ?? "")) throw new Error("local stack only");
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const port = Number(Deno.env.get("DELETE_ACCOUNT_PORT") ?? "8792");
const deps = realDeps(admin);
// The local stack may run without its Storage service (it is among the stopped containers on this Mac).
// Kinship 2.0 keeps no files in Storage (photos are 1.0 and device-only), so for the harness alone a
// Storage API that is not there counts as "nothing to remove"; any other Storage failure still fails the
// deletion, as deployed. Stated in the log each time it happens.
Deno.serve({ port, hostname: "127.0.0.1" }, createDeleteAccountHandler({
  ...deps,
  removeStorage: async (userId) => {
    try {
      return await deps.removeStorage(userId);
    } catch (err) {
      if (err instanceof Error && /name resolution failed|ECONNREFUSED|fetch failed/u.test(err.message)) {
        console.warn("serve-delete-account: the local Storage service is not running; treating it as empty (local stack only)");
        return 0;
      }
      throw err;
    }
  },
}));
