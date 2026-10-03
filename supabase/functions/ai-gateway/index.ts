// Supabase Edge Function: ai-gateway (Kinship 2.0, plan §9).
//
// One authenticated entry point for narrow AI capabilities. Today:
// relationship_extract. Request handling and guard rails live in
// handler.ts; this file wires in Supabase Auth, the user's RLS-scoped reads,
// the service-role write functions and the Anthropic client.
//
// Deploy:  supabase functions deploy ai-gateway   (keep JWT verification on)
// Secrets: ANTHROPIC_API_KEY (shared with ai-insight)
// Optional: AI_DAILY_LIMIT (default 50), AI_CONSENT_VERSION (default 1),
//           AI_ALLOWED_ORIGINS
// The ai_extraction feature flag must be on for the caller; all flags start off.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";
import { verifiedUserId } from "../_shared/auth.ts";
import { anthropicCaller } from "../_shared/ai/model.ts";
import type { CaptureRow, ItemRow, PersonRow, RelatedRow } from "../_shared/extraction/context.ts";
import { createGateway, type GatewayCaller, type PendingReview, type ServiceOps } from "./handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: noSession });

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

Deno.serve(
  createGateway({
    authenticate,
    // One retry on a 5xx or timeout (plan §9); the capture is never lost.
    model: anthropicCaller(Deno.env.get("ANTHROPIC_API_KEY"), { maxRetries: 1 }),
    service: serviceOps(service),
    dailyLimit: positiveInt(Deno.env.get("AI_DAILY_LIMIT"), 50),
    consentVersion: positiveInt(Deno.env.get("AI_CONSENT_VERSION"), 1),
    allowedOrigins: (Deno.env.get("AI_ALLOWED_ORIGINS") ?? "").split(",").map((o) => o.trim()).filter(Boolean),
  }),
);

async function authenticate(token: string): Promise<GatewayCaller | null> {
  // Acts as the user: every read below goes through their RLS.
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: noSession,
  });
  const userId = verifiedUserId(await db.auth.getUser(token));
  if (!userId) return null;
  return {
    userId,
    async hasConsent(requiredVersion) {
      const { data, error } = await db.from("user_settings").select("ai_consent, ai_consent_version").eq("user_id", userId).maybeSingle();
      if (error) throw new Error("consent check failed");
      return data?.ai_consent === true && (data.ai_consent_version ?? 0) >= requiredVersion;
    },
    async consume(dailyLimit) {
      const { data, error } = await db.rpc("consume_ai_call", { daily_limit: dailyLimit });
      if (error) throw new Error("quota check failed");
      return data === true;
    },
    async flagEnabled(key) {
      const { data, error } = await db.rpc("my_flags");
      if (error) throw new Error("flag check failed");
      return ((data ?? []) as { key: string; enabled: boolean }[]).some((f) => f.key === key && f.enabled);
    },
    async loadCapture(id) {
      const { data, error } = await db.from("captures")
        .select("id, raw_text, occurred_at, time_zone, context_person_id")
        .eq("id", id).is("deleted_at", null).not("raw_text", "is", null).maybeSingle();
      if (error) throw new Error("capture read failed");
      return (data as CaptureRow | null) ?? null;
    },
    async loadPeople() {
      const [people, related] = await Promise.all([
        db.from("people").select("id, display_name, full_name, nicknames, relationship_label, state, updated_at").is("deleted_at", null).limit(1000),
        db.from("related_people").select("id, person_id, relation, name").is("deleted_at", null).limit(2000),
      ]);
      if (people.error || related.error) throw new Error("roster read failed");
      return { people: people.data as PersonRow[], related: related.data as RelatedRow[] };
    },
    async loadItems(personIds) {
      if (personIds.length === 0) return [];
      const { data, error } = await db.from("memory_items")
        .select("id, person_id, kind, subject_type, subject_related_id, statement, certainty, status, user_state, detail, updated_at")
        .in("person_id", personIds).is("deleted_at", null).in("status", ["active", "resolved"])
        .order("updated_at", { ascending: false }).limit(40);
      if (error) throw new Error("dossier read failed");
      return data as ItemRow[];
    },
    async loadReview(captureId) {
      const { data, error } = await db.from("capture_reviews").select("items, clarification").eq("capture_id", captureId).maybeSingle();
      if (error) throw new Error("review read failed");
      return (data as PendingReview | null) ?? null;
    },
  };
}

function serviceOps(db: SupabaseClient): ServiceOps {
  return {
    async claim(userId, captureId) {
      const { data, error } = await db.rpc("claim_capture_extraction", { p_user_id: userId, p_capture_id: captureId });
      if (error) throw new Error("claim failed");
      return data;
    },
    async release(userId, captureId, status) {
      const { error } = await db.rpc("release_capture_extraction", { p_user_id: userId, p_capture_id: captureId, p_status: status });
      if (error) throw new Error("release failed");
    },
    async write(userId, captureId, version, needsReview, items, review) {
      const { data, error } = await db.rpc("write_extraction_with_review", {
        p_user_id: userId,
        p_capture_id: captureId,
        p_extraction_version: version,
        p_needs_review: needsReview,
        p_items: items,
        p_review: review,
      });
      if (error) throw new Error(`write failed (${error.code ?? "?"})`);
      return data;
    },
    async log(row) {
      const { error } = await db.from("ai_calls").insert(row);
      if (error) throw new Error("log failed");
    },
  };
}
