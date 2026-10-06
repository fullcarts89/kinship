// ai-gateway request handling (plan §9), separated from the Deno entry point
// (index.ts) so it can be tested with fake auth, data, model and writes.
//
// The client sends {capability, input_ref}. Inputs are ids: the gateway loads
// the note and the user's own people under their RLS, so a client can never
// hand the model a fabricated dossier.
//
// Guard rails, in order:
//   1. signed-in, non-anonymous user                                  → 401
//   2. current AI consent (D3)                                        → 403 consent_required
//   3. valid body, known capability                                   → 400
//   4. the capability's server feature flag (all off until beta)      → 403 feature_disabled
//   5. the capture is the caller's, live, with its text               → 404
//   6. one extraction per capture: a retry after success costs nothing → 200 done / 409 in_progress
//   7. daily quota                                                    → 429 (capture handed back)
//   8. model → deterministic pipeline → one atomic write
//   9. content-free usage log, whatever happened
// A refused note is kept raw, quietly. Other model failures: 503, retry later.
//
// The held items' review (C-2, Checkpoint D1) has two more actions, neither
// of which calls the model:
//   resolve_review  the user's answer, applied to the stored interpretation
//                   and checked again (resolve.ts), written in one
//                   transaction; consent and the flag still apply, because
//                   the answer turns an AI reading into memory
//   close_review    "not now" for everything held: only the signed-in owner

import { bearerToken } from "../_shared/auth.ts";
import type { ModelCaller, StructuredResult } from "../_shared/ai/model.ts";
import { type Capability, CAPABILITIES } from "../_shared/ai/registry.ts";
import { buildInput, type CaptureRow, dossierPeople, type ItemRow, type PersonRow, type RelatedRow } from "../_shared/extraction/context.ts";
import { needsAcceptance } from "../_shared/extraction/acceptance.ts";
import { type HeldAnswer, type HeldItem, resolveHeld, type ResolvedItem } from "../_shared/extraction/resolve.ts";
import { runExtraction } from "../_shared/extraction/run.ts";
import type { DropReason, ExtractionOutcome, PlannedItem } from "../_shared/extraction/types.ts";

export interface GatewayCaller {
  userId: string;
  hasConsent(requiredVersion: number): Promise<boolean>;
  consume(dailyLimit: number): Promise<boolean>;
  flagEnabled(key: string): Promise<boolean>;
  /** Under the caller's RLS: null unless it is theirs and live. */
  loadCapture(id: string): Promise<CaptureRow | null>;
  loadPeople(): Promise<{ people: PersonRow[]; related: RelatedRow[] }>;
  loadItems(personIds: string[]): Promise<ItemRow[]>;
  /** Under the caller's RLS: the held items and question still waiting on this capture (C-2). */
  loadReview(captureId: string): Promise<StoredReview | null>;
  /** As the user: dismiss what's held ("not now"); false when nothing was waiting. */
  closeReview(captureId: string): Promise<boolean>;
}

/** What waits for the user's answer; never memory until they answer (C-2). */
export interface PendingReview {
  items: ReturnType<typeof present>[];
  clarification: ExtractionOutcome["clarification"];
}

/** A pending review as stored; created_at identifies the version the user answers. */
export interface StoredReview {
  items: HeldItem[];
  clarification: ExtractionOutcome["clarification"];
  created_at: string;
}

/** A database refusal, by SQLSTATE (never its message: messages may echo data). */
export class ServiceError extends Error {
  constructor(readonly code: string) {
    super(`service error ${code}`);
  }
}

export interface WriteItem {
  kind: string;
  person_id: string;
  subject_type: string;
  related: PlannedItem["related"];
  statement: string;
  detail: Record<string, unknown>;
  certainty: string;
  sensitivity: string;
  confidence: number;
  spans: { start: number; end: number }[];
  action: PlannedItem["action"];
  with_person_ids?: string[];
  self_relations?: Record<string, string>;
}

export interface CallLog {
  capability: string;
  model: string;
  prompt_version: string;
  eval_version: string;
  outcome: StructuredResult["outcome"];
  result: ExtractionOutcome["tier"] | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  latency_ms: number;
  items_saved: number;
  items_held: number;
  items_dropped: number;
  drop_reasons: Partial<Record<DropReason, number>>;
  injection_suspected: boolean;
}

/** Service-role operations; every one is scoped to the verified user id. */
export interface ServiceOps {
  claim(userId: string, captureId: string): Promise<"claimed" | "done" | "busy" | "missing">;
  release(userId: string, captureId: string, status: "failed" | "pending"): Promise<void>;
  /** Saved items, plus the held items and question when something waits on the user, in one transaction. */
  write(
    userId: string,
    captureId: string,
    version: string,
    needsReview: boolean,
    items: WriteItem[],
    review: PendingReview | null,
  ): Promise<{ id: string; action: string }[]>;
  log(row: CallLog): Promise<void>;
  /** The answered review, written and closed in one transaction (resolve_capture_review). */
  resolve(
    userId: string,
    captureId: string,
    reviewCreatedAt: string,
    items: ResolvedItem[],
    newPeople: { ref: string; display_name: string; relationship_label?: string }[],
  ): Promise<{ status: "resolved" | "already_resolved"; items?: { id: string; action: string }[]; people?: Record<string, string> }>;
}

export interface GatewayDeps {
  authenticate(token: string): Promise<GatewayCaller | null>;
  model: ModelCaller;
  service: ServiceOps;
  dailyLimit: number;
  consentVersion: number;
  allowedOrigins: string[];
  capabilities?: Record<string, Capability>;
}

const BODY_LIMIT = 4 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ANSWERS = 8;

export function createGateway(deps: GatewayDeps): (req: Request) => Promise<Response> {
  const caps = deps.capabilities ?? CAPABILITIES;
  return async (req) => {
    const cors = corsHeaders(req, deps.allowedOrigins);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

    let claimed: { userId: string; captureId: string } | null = null;
    try {
      const token = bearerToken(req);
      const caller = token ? await deps.authenticate(token) : null;
      if (!caller) return json({ error: "unauthorized" }, 401, cors);

      const body = await readBody(req);
      const captureId = (body?.input_ref as Record<string, unknown> | undefined)?.capture_id;
      // "Not now" needs nothing but the owner: no consent, flag or model.
      if (body?.action === "close_review") {
        if (typeof captureId !== "string" || !UUID.test(captureId)) return json({ error: "invalid_request" }, 400, cors);
        const closed = await caller.closeReview(captureId);
        return json({ status: closed ? "closed" : "nothing_waiting" }, 200, cors);
      }
      if (!(await caller.hasConsent(deps.consentVersion))) return json({ error: "consent_required" }, 403, cors);
      if (!body) return json({ error: "invalid_request" }, 400, cors);
      const cap = caps[String(body.capability ?? "relationship_extract")];
      if (!cap || cap.name !== "relationship_extract" || typeof captureId !== "string" || !UUID.test(captureId)) {
        return json({ error: "invalid_request" }, 400, cors);
      }
      if (body.action !== undefined && body.action !== "resolve_review") return json({ error: "invalid_request" }, 400, cors);
      if (body.action === undefined && body.capability === undefined) return json({ error: "invalid_request" }, 400, cors);
      if (!(await caller.flagEnabled(cap.flag))) return json({ error: "feature_disabled" }, 403, cors);
      if (body.action === "resolve_review") return await resolveReview(deps, caller, captureId, body, cors);

      const capture = await caller.loadCapture(captureId);
      if (!capture) return json({ error: "not_found" }, 404, cors);

      const claim = await deps.service.claim(caller.userId, captureId);
      if (claim === "missing") return json({ error: "not_found" }, 404, cors);
      if (claim === "done") {
        // Reopened after a restart: the stored question, never a second model run.
        const review = await caller.loadReview(captureId);
        return json({
          status: "done",
          held: review?.items ?? [],
          clarification: review?.clarification ?? null,
          review_created_at: review?.created_at ?? null,
        }, 200, cors);
      }
      if (claim === "busy") return json({ error: "in_progress" }, 409, cors);
      claimed = { userId: caller.userId, captureId };

      if (!(await caller.consume(deps.dailyLimit))) {
        await deps.service.release(caller.userId, captureId, "pending");
        claimed = null;
        return json({ error: "daily_limit_reached" }, 429, { ...cors, "Retry-After": String(secondsUntilUtcMidnight()) });
      }

      const { people, related } = await caller.loadPeople();
      const items = await caller.loadItems(dossierPeople(capture, people, related));
      const input = buildInput(capture, people, related, items);
      const run = await runExtraction(input, cap, deps.model);
      const version = `${cap.promptVersion}+${cap.model}`;

      if (!run.outcome) {
        await deps.service.release(caller.userId, captureId, "failed");
        claimed = null;
        await safeLog(deps, logRow(cap, run.call, null));
        // A declined note is simply kept as written (plan §9): no error to show.
        if (run.call.outcome === "refused") return json({ status: "kept" }, 200, cors);
        return json({ error: "try_later" }, 503, cors);
      }

      const outcome = run.outcome;
      // Saved now: clear items, and "look over" items whose misreading wouldn't
      // damage trust. Everything else waits for the user (acceptance.ts).
      const toSave = outcome.items.filter((i) =>
        (i.tier === "auto" || (i.tier === "confirm" && !needsAcceptance(i))) && i.person_id
      );
      const held = outcome.items.filter((i) => !toSave.includes(i));
      const review: PendingReview | null = held.length ? { items: held.map(present), clarification: outcome.clarification } : null;
      const written = await deps.service.write(
        caller.userId,
        captureId,
        version,
        review !== null || (outcome.tier !== "auto" && outcome.tier !== "nothing"),
        toSave.map(toWriteItem),
        review,
      );
      claimed = null;
      await safeLog(deps, logRow(cap, run.call, outcome));
      // The stored review's version, so the answer can say which one it answers.
      const stored = review ? await caller.loadReview(captureId) : null;

      return json({
        status: "extracted",
        tier: outcome.tier,
        extraction_version: version,
        saved: toSave.map((i, n) => ({ ...present(i), id: written[n]?.id ?? null, action: written[n]?.action ?? i.action.type })),
        held: held.map(present),
        clarification: outcome.clarification,
        review_created_at: stored?.created_at ?? null,
        ...(outcome.known?.length ? { known: outcome.known } : {}),
      }, 200, cors);
    } catch (err) {
      if (claimed) await deps.service.release(claimed.userId, claimed.captureId, "failed").catch(() => undefined);
      // Never log content: the error class and message only (ours, not the note's).
      console.error(`ai-gateway: request failed: ${err instanceof Error ? err.name : "error"}`);
      return json({ error: "internal_error" }, 500, cors);
    }
  };
}

function toWriteItem(i: PlannedItem): WriteItem {
  return {
    kind: i.kind,
    person_id: i.person_id!,
    subject_type: i.subject_type,
    related: i.related,
    statement: i.statement,
    detail: i.detail,
    certainty: i.certainty,
    sensitivity: i.sensitivity,
    confidence: i.confidence,
    spans: i.spans.map((s) => ({ start: s.start, end: s.end })),
    action: i.action,
    ...(i.with_person_ids?.length ? { with_person_ids: i.with_person_ids } : {}),
    ...(i.self_relations && Object.keys(i.self_relations).length ? { self_relations: i.self_relations } : {}),
  };
}

/**
 * What the "Here's what I'll remember" sheet needs (the user's own content,
 * to the user). Held items are stored in this shape; confidence and the
 * proposed action travel with them so an answer is written exactly like any
 * extraction (the database checks the action's target again).
 */
function present(i: PlannedItem) {
  return {
    kind: i.kind,
    person_id: i.person_id,
    new_person_name: i.new_person_name,
    subject_type: i.subject_type,
    related: i.related,
    statement: i.statement,
    detail: i.detail,
    certainty: i.certainty,
    sensitivity: i.sensitivity,
    confidence: i.confidence,
    action: i.action,
    tier: i.tier,
    flags: i.flags,
    spans: i.spans,
    ...(i.with_person_ids?.length ? { with_person_ids: i.with_person_ids } : {}),
    ...(i.self_relations && Object.keys(i.self_relations).length ? { self_relations: i.self_relations } : {}),
  };
}

/** The user's answer to what was held: checked, written and closed, no model call. */
async function resolveReview(
  deps: GatewayDeps,
  caller: GatewayCaller,
  captureId: string,
  body: Record<string, unknown>,
  cors: Record<string, string>,
): Promise<Response> {
  const answers = body.answers;
  const createdAt = body.review_created_at;
  if (!Array.isArray(answers) || answers.length > MAX_ANSWERS || typeof createdAt !== "string" || !createdAt) {
    return json({ error: "invalid_request" }, 400, cors);
  }
  const capture = await caller.loadCapture(captureId);
  if (!capture) return json({ error: "not_found" }, 404, cors);
  const review = await caller.loadReview(captureId);
  // Answered already (a retry after a lost reply), dismissed or expired.
  if (!review) return json({ status: "already_resolved" }, 200, cors);
  if (Date.parse(review.created_at) !== Date.parse(createdAt)) return json({ error: "review_changed" }, 409, cors);

  const { people, related } = await caller.loadPeople();
  const chosen = new Set<string>();
  for (const a of answers as HeldAnswer[]) if (typeof a?.person_id === "string") chosen.add(a.person_id);
  for (const i of review.items) if (i.person_id) chosen.add(i.person_id);
  const existing = chosen.size ? await caller.loadItems([...chosen].filter((id) => people.some((p) => p.id === id))) : [];
  const resolution = resolveHeld(review.items, answers as HeldAnswer[], {
    note: capture.raw_text.normalize("NFC"),
    people: people.map((p) => ({ id: p.id, display_name: p.display_name, state: p.state })),
    related,
    existing: existing.map((m) => ({
      id: m.id, person_id: m.person_id, kind: m.kind, subject_type: m.subject_type,
      subject_related_id: m.subject_related_id, statement: m.statement, status: m.status, user_state: m.user_state,
    })),
  });
  if ("fail" in resolution) return json({ error: "invalid_answer", reason: resolution.fail }, 400, cors);

  try {
    const out = await deps.service.resolve(caller.userId, captureId, review.created_at, resolution.items, resolution.newPeople);
    if (out.status === "already_resolved") return json({ status: "already_resolved" }, 200, cors);
    const created = out.people ?? {};
    return json({
      status: "resolved",
      saved: resolution.items.map((it, n) => ({
        kind: it.kind,
        person_id: it.person_id.startsWith("new:") ? created[it.person_id] ?? null : it.person_id,
        subject_type: it.subject_type,
        related: it.related,
        statement: it.statement,
        detail: it.detail,
        certainty: it.certainty,
        sensitivity: it.sensitivity,
        spans: it.spans,
        id: out.items?.[n]?.id ?? null,
        action: out.items?.[n]?.action ?? it.action.type,
      })),
      new_people: Object.values(created),
      skipped: resolution.skipped,
    }, 200, cors);
  } catch (err) {
    if (!(err instanceof ServiceError)) throw err;
    // The review or the note changed under the answer: show it again.
    if (err.code === "40001") return json({ error: "review_changed" }, 409, cors);
    if (err.code === "P0002") return json({ error: "not_found" }, 404, cors);
    if (err.code === "55000") return json({ error: "not_waiting" }, 409, cors);
    // A chosen person was deleted meanwhile, or a span no longer fits.
    if (err.code === "23503" || err.code === "23514" || err.code === "22023") return json({ error: "invalid_answer" }, 409, cors);
    throw err;
  }
}

function logRow(cap: Capability, call: StructuredResult, outcome: ExtractionOutcome | null): CallLog {
  const drops: Partial<Record<DropReason, number>> = {};
  for (const d of outcome?.dropped ?? []) drops[d.reason] = (drops[d.reason] ?? 0) + 1;
  const saved = outcome?.items.filter((i) => i.tier !== "hold").length ?? 0;
  return {
    capability: cap.name,
    model: cap.model,
    prompt_version: cap.promptVersion,
    eval_version: cap.evalVersion,
    outcome: call.outcome,
    result: outcome?.tier ?? null,
    input_tokens: call.usage.input,
    output_tokens: call.usage.output,
    cache_read_tokens: call.usage.cacheRead,
    cache_write_tokens: call.usage.cacheWrite,
    latency_ms: call.latencyMs,
    items_saved: saved,
    items_held: (outcome?.items.length ?? 0) - saved,
    items_dropped: outcome?.dropped.length ?? 0,
    drop_reasons: drops,
    injection_suspected: outcome?.injection_suspected ?? false,
  };
}

async function safeLog(deps: GatewayDeps, row: CallLog): Promise<void> {
  try {
    await deps.service.log(row);
  } catch {
    console.error("ai-gateway: usage log write failed");
  }
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  if (Number(req.headers.get("Content-Length")) > BODY_LIMIT) return null;
  let raw = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  for await (const chunk of req.body ?? []) {
    bytes += chunk.byteLength;
    if (bytes > BODY_LIMIT) return null;
    raw += decoder.decode(chunk, { stream: true });
  }
  raw += decoder.decode();
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function corsHeaders(req: Request, allowedOrigins: string[]): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (!origin || !allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

function secondsUntilUtcMidnight(now = new Date()): number {
  return Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000);
}
