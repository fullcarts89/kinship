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
import { type CaptureRow, type FacetRow, type ItemRow, type PersonRow, type RelatedRow, withLineNames } from "../_shared/extraction/context.ts";
import { placeIndex } from "../_shared/semantic/places/dataset.ts";
import { type LineToRead, MAX_REREAD } from "../_shared/semantic/rederive.ts";
import type { ReportItem } from "../_shared/semantic/report.ts";
import { createGateway, type GatewayCaller, ServiceError, type ServiceOps, type StoredReview } from "./handler.ts";

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
    places: placeIndex(),
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
      const [people, related, mentions] = await Promise.all([
        db.from("people").select("id, display_name, full_name, nicknames, relationship_label, state, updated_at").is("deleted_at", null).limit(1000),
        db.from("related_people").select("id, person_id, relation, name").is("deleted_at", null).limit(2000),
        // The words people's own lines use for them (founder I12). Optional:
        // without it, names are matched as before.
        db.from("memory_items").select("person_mentions").is("deleted_at", null).neq("person_mentions", "[]").limit(2000),
      ]);
      if (people.error || related.error) throw new Error("roster read failed");
      const rows = mentions.error ? [] : (mentions.data ?? []) as { person_mentions?: unknown }[];
      return { people: withLineNames(people.data as PersonRow[], rows), related: related.data as RelatedRow[] };
    },
    async loadItems(personIds, opts) {
      if (personIds.length === 0) return [];
      const ids = personIds.filter((id) => /^[0-9a-f-]{36}$/iu.test(id));
      if (ids.length === 0) return [];
      const base = db.from("memory_items")
        .select("id, person_id, kind, subject_type, subject_related_id, statement, certainty, status, user_state, detail, updated_at, with_person_ids");
      const whose = opts?.shared ? base.or(`person_id.in.(${ids.join(",")}),with_person_ids.ov.{${ids.join(",")}}`) : base.in("person_id", ids);
      const { data, error } = await whose.is("deleted_at", null).in("status", ["active", "resolved"])
        .order("updated_at", { ascending: false }).limit(opts?.shared ? 80 : 40);
      if (error) throw new Error("dossier read failed");
      return data as ItemRow[];
    },
    async loadFacets(itemIds) {
      const ids = itemIds.filter((id) => /^[0-9a-f-]{36}$/iu.test(id));
      if (ids.length === 0) return [];
      const { data, error } = await db.from("memory_item_facets")
        .select("memory_item_id, slot, value_text, value_norm, place_ref, candidates, usual_ref")
        .in("memory_item_id", ids).is("deleted_at", null).limit(200);
      // Unread, the note is understood without residence at all (never as if no line had one).
      if (error) return null;
      return data as FacetRow[];
    },
    async loadUnread(itemIds) {
      const ids = itemIds.filter((id) => /^[0-9a-f-]{36}$/iu.test(id));
      if (ids.length === 0) return [];
      // Lines B3 has read: a residence reading, tombstoned, and none live now.
      const facets = await db.from("memory_item_facets").select("memory_item_id, deleted_at")
        .in("memory_item_id", ids).eq("slot", "residence").limit(1000);
      if (facets.error) throw new Error("facets read failed");
      const rows = (facets.data ?? []) as { memory_item_id: string; deleted_at: string | null }[];
      const live = new Set(rows.filter((r) => !r.deleted_at).map((r) => r.memory_item_id));
      const unread = [...new Set(rows.filter((r) => r.deleted_at && !live.has(r.memory_item_id)).map((r) => r.memory_item_id))].slice(0, MAX_REREAD);
      if (unread.length === 0) return [];
      const [items, sources] = await Promise.all([
        db.from("memory_items")
          .select("id, version, kind, subject_type, certainty, sensitivity, with_person_ids, statement, user_state")
          .in("id", unread).is("deleted_at", null).neq("status", "retracted"),
        db.from("memory_item_sources").select("memory_item_id, quote").in("memory_item_id", unread).is("deleted_at", null).limit(500),
      ]);
      if (items.error || sources.error) throw new Error("lines read failed");
      const quotes = (sources.data ?? []) as { memory_item_id: string; quote: string | null }[];
      return ((items.data ?? []) as LineToRead[]).map((line) => ({
        line,
        quotes: quotes.filter((q) => q.memory_item_id === line.id && q.quote).map((q) => q.quote!),
      }));
    },
    async loadLinesPage(afterId, limit) {
      // Every live line of theirs, by id (uuid order), a page at a time (Phase 4B B6).
      let q = db.from("memory_items")
        .select("id, person_id, kind, subject_type, subject_related_id, statement, certainty, sensitivity, status, user_state, detail, with_person_ids, supersedes_id, closes_ids, created_at")
        .is("deleted_at", null).neq("status", "retracted").order("id", { ascending: true }).limit(limit);
      if (afterId) q = q.gt("id", afterId);
      const { data, error } = await q;
      if (error) throw new Error("lines read failed");
      return (data ?? []) as ReportItem[];
    },
    async loadQuotes(itemIds) {
      const ids = itemIds.filter((id) => /^[0-9a-f-]{36}$/iu.test(id));
      const out: Record<string, string[]> = {};
      if (ids.length === 0) return out;
      const { data, error } = await db.from("memory_item_sources").select("memory_item_id, quote")
        .in("memory_item_id", ids).is("deleted_at", null).limit(ids.length * 10);
      if (error) throw new Error("sources read failed");
      for (const r of (data ?? []) as { memory_item_id: string; quote: string | null }[]) {
        if (r.quote) (out[r.memory_item_id] ??= []).push(r.quote);
      }
      return out;
    },
    async loadRemoved(captureId) {
      const sources = await db.from("memory_item_sources").select("memory_item_id").eq("capture_id", captureId).limit(200);
      if (sources.error) throw new Error("sources read failed");
      const ids = [...new Set(((sources.data ?? []) as { memory_item_id: string }[]).map((r) => r.memory_item_id))];
      if (ids.length === 0) return [];
      // Removed by the user ("Not this"), or replaced by a later note: an answer never brings back its old words
      // (reviewers A, r3 and r4).
      const { data, error } = await db.from("memory_items").select("person_id, statement")
        .in("id", ids).or("deleted_at.not.is.null,status.eq.superseded");
      if (error) throw new Error("removed read failed");
      return data as { person_id: string; statement: string }[];
    },
    async loadReview(captureId) {
      const { data, error } = await db.from("capture_reviews").select("items, clarification, created_at").eq("capture_id", captureId).maybeSingle();
      if (error) throw new Error("review read failed");
      return (data as StoredReview | null) ?? null;
    },
    async closeReview(captureId) {
      const { data, error } = await db.rpc("close_capture_review", { p_capture_id: captureId });
      if (error) throw new Error("close failed");
      return data === true;
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
    async writeFacets(userId, items) {
      const { data, error } = await db.rpc("write_facets", { p_user_id: userId, p_items: items });
      if (error) throw new Error(`facets write failed (${error.code ?? "?"})`);
      return (data ?? []) as { id: string; result: string }[];
    },
    async log(row) {
      const { error } = await db.from("ai_calls").insert(row);
      if (error) throw new Error("log failed");
    },
    async reportRan(userId, ruleVersion, datasetVersion) {
      const { data, error } = await db.from("semantic_runs").select("ran_at")
        .match({ user_id: userId, mode: "report", rule_version: ruleVersion, dataset_version: datasetVersion }).maybeSingle();
      if (error) throw new Error("runs read failed");
      return (data as { ran_at: string } | null)?.ran_at ?? null;
    },
    async writeReport(userId, ruleVersion, datasetVersion, itemIds, rows) {
      // The two report tables only (brief §14; B6): ids, buckets and versions. Earlier rows for these lines
      // at these versions go first; the new rows are upserted on the table's key (a retry writes the same
      // set again); the run is recorded last, so an interrupted run is never marked complete.
      const chunk = 100;
      for (let i = 0; i < itemIds.length; i += chunk) {
        const { error } = await db.from("residence_backfill_report").delete()
          .in("memory_item_id", itemIds.slice(i, i + chunk)).match({ rule_version: ruleVersion, dataset_version: datasetVersion });
        if (error) throw new Error("report clear failed");
      }
      for (let i = 0; i < rows.length; i += chunk) {
        const { error } = await db.from("residence_backfill_report").upsert(
          rows.slice(i, i + chunk).map((r) => ({ memory_item_id: r.memory_item_id, bucket: r.bucket, rule_version: ruleVersion, dataset_version: datasetVersion })),
          { onConflict: "memory_item_id,bucket,rule_version,dataset_version" },
        );
        if (error) throw new Error("report write failed");
      }
      const { error } = await db.from("semantic_runs").upsert(
        { user_id: userId, mode: "report", rule_version: ruleVersion, dataset_version: datasetVersion, ran_at: new Date().toISOString() },
        { onConflict: "user_id,mode,rule_version,dataset_version" },
      );
      if (error) throw new Error("run record failed");
    },
    async resolve(userId, captureId, reviewCreatedAt, items, newPeople) {
      const { data, error } = await db.rpc("resolve_capture_review", {
        p_user_id: userId,
        p_capture_id: captureId,
        p_review_created_at: reviewCreatedAt,
        p_items: items,
        p_new_people: newPeople,
      });
      if (error) throw new ServiceError(error.code ?? "unknown");
      return data;
    },
  };
}
