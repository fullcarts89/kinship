// Supabase Edge Function: ai-insight
//
// Server-side proxy for Kinship's AI signal boosting. Holds the
// Anthropic API key (set via `supabase secrets set ANTHROPIC_API_KEY=...`)
// so it never ships in the app bundle. Request handling and its guard
// rails live in handler.ts; this file wires in Supabase Auth, the quota
// RPC and the Anthropic client.
//
// Deploy:  supabase functions deploy ai-insight   (keep JWT verification on)
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optional: AI_MODEL, AI_DAILY_LIMIT (default 50), AI_CONSENT_VERSION
//           (default 1), AI_ALLOWED_ORIGINS

import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import {
  type Caller,
  createHandler,
  MAX_OUTPUT_TOKENS,
  type ModelRequest,
  positiveInt,
  verifiedUserId,
} from "./handler.ts";

const MODEL = Deno.env.get("AI_MODEL") ?? "claude-opus-4-8";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

Deno.serve(
  createHandler({
    authenticate,
    generate,
    /** Model calls each signed-in user may make per UTC day. */
    dailyLimit: positiveInt(Deno.env.get("AI_DAILY_LIMIT"), 50),
    /** Raise when what is sent to the AI provider changes materially. */
    consentVersion: positiveInt(Deno.env.get("AI_CONSENT_VERSION"), 1),
    /**
     * The native app makes no CORS requests, so by default no browser origin
     * is allowed. A web build would list its origin(s) here, comma-separated.
     */
    allowedOrigins: (Deno.env.get("AI_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  }),
);

// ─── Auth ───────────────────────────────────────────────────────────────────

/**
 * Resolves the caller from their Supabase access token. Null for anything
 * that isn't a signed-in, non-anonymous user — including the anon key,
 * which carries no user. The returned client acts as that user, so the
 * quota RPC runs under their identity and RLS.
 */
async function authenticate(token: string): Promise<Caller | null> {
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const userId = verifiedUserId(await db.auth.getUser(token));
  if (!userId) return null;
  return {
    userId,
    async hasConsent(requiredVersion: number) {
      const { data, error } = await db
        .from("user_settings")
        .select("ai_consent, ai_consent_version")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`consent check failed: ${error.message}`);
      return data?.ai_consent === true && (data.ai_consent_version ?? 0) >= requiredVersion;
    },
    async consume(dailyLimit: number) {
      const { data: allowed, error } = await db.rpc("consume_ai_call", {
        daily_limit: dailyLimit,
      });
      if (error) throw new Error(`quota check failed: ${error.message}`);
      return allowed === true;
    },
  };
}

// ─── Model call ─────────────────────────────────────────────────────────────

/** One structured-output call. Null when the model declines or runs out of room. */
async function generate({ system, schema, content }: ModelRequest): Promise<unknown> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema },
    },
    system,
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") return null;
  if (response.stop_reason === "max_tokens") {
    console.warn("ai-insight: output hit max_tokens; returning no result");
    return null;
  }
  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? JSON.parse(block.text) : null;
}

