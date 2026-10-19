// The app's client for ai-gateway (plan §9; Checkpoint D1). Requests carry
// ids, never content: the gateway reads the note and the user's people
// itself, under their RLS.
//
//   understand(captureId)                 relationship_extract. One model run per
//                                         note, ever: asking again returns what
//                                         was understood ("done"), never a second run.
//   answer(captureId, reviewCreatedAt, a) resolve_review: the user's answer to what
//                                         was held, checked again by the gateway and
//                                         written without a model call. Idempotent.
//   close(captureId)                      close_review: nothing more to look at.
//   rederive(itemIds)                     the user changed these lines: any that had a residence
//                                         reading is read again from their own words (model-free,
//                                         Phase 4B B3; brief §5). Content-free reply.
//   report()                              the residence dry run over this account (Phase 4B B6;
//                                         brief §14): the gateway reads the account's own lines and
//                                         writes ids and buckets to its report tables. Model-free,
//                                         once per account and version pair. Content-free reply.
//
// Replies are typed. A refusal is a GatewayRefused (with the gateway's error
// code); a request that never got an answer is a GatewayUnreachable, which
// says nothing about whether the server acted: every request above is safe
// to repeat.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ItemTier = "auto" | "confirm" | "hold";

export interface ItemSpan {
  start: number;
  end: number;
  quote: string;
}

/** An item as the gateway presents it to its owner. */
export interface GatewayItem {
  kind: string;
  person_id: string | null;
  new_person_name: string | null;
  subject_type: string;
  related: { id: string | null; relation: string; name: string | null } | null;
  statement: string;
  detail: Record<string, unknown>;
  certainty: string;
  sensitivity: string;
  tier: ItemTier;
  flags: string[];
  spans: ItemSpan[];
}

/** Saved by the extraction: id of the memory item it was written as (or merged into). */
export interface SavedItem extends GatewayItem {
  id: string | null;
  action: string;
}

/** Waiting on the user's answer; never memory until they answer. */
export type HeldItem = GatewayItem & {
  /** What it would do to an existing memory once the user says yes (the gateway sends it). */
  action?: { type: string; target_id: string | null } | null;
  /** Others in People it is also about. */
  with_person_ids?: string[];
  /** The mirror of a line kept for this person from the same sentence: the answer joins it (founder I10). */
  twin_person_id?: string;
  /** The name it asks about ("Sam" with two Sams). */
  mention?: string;
  /** People removed from People the name fits: offered back, never re-created (founder I3). */
  archived_ids?: string[];
  /** For a held "he" or "she": exactly who it can mean, never the sentence's object (founder J1). */
  candidate_ids?: string[];
  /** Which words name whom; the open "who?" has the asked-about words with no person yet (founder I13). */
  person_mentions?: unknown;
  /** Others it is about whose name two or more people share, each asked on its own (founder K4). */
  open_names?: { text: string; candidate_ids: string[]; archived_ids?: string[] }[];
  /** "Is Susan still in Alameda?" (Phase 4B B3): the line it asks about, in that line's own words for the place. */
  still_in?: { target_id: string; words: string; stay?: string };
};

export interface Clarification {
  about: "person" | "subject" | "new_person" | "date";
  question: string;
  options: string[];
}

/** The user's answer to one held item (resolve.ts on the server checks it). */
export interface HeldAnswer {
  index: number;
  skip?: true;
  person_id?: string;
  /** "Both": the others it is also about (a shared memory, one source). */
  also_person_ids?: string[];
  new_person?: true;
  /** The name to add, when the reading didn't name the new person itself (it must be in the note). */
  new_person_name?: string;
  /** Which earlier memory this replaces (one of those offered), or null to keep both. */
  replaces?: string | null;
  subject?: "person" | "related";
  relation?: string;
  /** Whose promise it is (founder J11): the user's, or the person's. */
  owner?: "user" | "person";
  date?: string | null;
  /** "Remember this": the user's yes to a reading held for it. */
  accept?: true;
  /** "Which Sam?" for someone else the line is about (founder K4): that name, and who it is. */
  participants?: { text: string; person_id: string }[];
  /** "Is Susan still in Alameda?" (Phase 4B B3): true for "Susan moved", false for "Still there". */
  moved?: boolean;
}

/**
 * What the understanding did not get to (Option A, founder 19 Oct): "partial" with the note's own spans
 * it can mark and a count it cannot; "complete" when nothing was left out for want of room. Never a
 * claim that the note was understood whole.
 */
export interface Coverage {
  state: "complete" | "partial";
  unprocessed: { start: number; end: number }[];
  unlocated: number;
}

export type Understood =
  | {
      status: "extracted";
      tier: "auto" | "confirm" | "clarify" | "nothing";
      saved: SavedItem[];
      held: HeldItem[];
      clarification: Clarification | null;
      review_created_at: string | null;
      /** Relationships said again that Kinship already holds ("John is your brother"). */
      known?: string[];
      coverage: Coverage;
    }
  | {
      status: "done";
      held: HeldItem[];
      clarification: Clarification | null;
      review_created_at: string | null;
      /** The live lines the understanding saved, for a phone that lost the reply (Option A). */
      saved_ids: string[];
      coverage: Coverage;
    }
  | { status: "kept" };

const COMPLETE: Coverage = { state: "complete", unprocessed: [], unlocated: 0 };

/** The reply's coverage, when it has the shape; an older gateway's reply (none) reads as complete. */
function coverageOf(v: unknown): Coverage {
  if (!v || typeof v !== "object") return COMPLETE;
  const c = v as { state?: unknown; unprocessed?: unknown; unlocated?: unknown };
  const unprocessed = Array.isArray(c.unprocessed)
    ? c.unprocessed.filter((s): s is { start: number; end: number } =>
      !!s && typeof s === "object" && Number.isInteger((s as { start?: unknown }).start) && Number.isInteger((s as { end?: unknown }).end))
      .map((s) => ({ start: s.start, end: s.end }))
    : [];
  const unlocated = Number.isInteger(c.unlocated) ? Math.max(0, c.unlocated as number) : 0;
  return c.state === "partial" && (unprocessed.length || unlocated) ? { state: "partial", unprocessed, unlocated } : COMPLETE;
}

export interface ResolvedItem {
  id: string | null;
  action: string;
  kind: string;
  person_id: string | null;
  statement: string;
}

export type Answered =
  | { status: "resolved"; saved: ResolvedItem[]; new_people: string[]; skipped: number }
  | { status: "already_resolved" };

export type Closed = { status: "closed" | "nothing_waiting" };

/** Each line asked about: its reading written, unchanged, or dropped (none to read, or refused). */
export type Rederived = { status: "rederived"; results: { id: string; result: string }[] };
/** The dry run ran now, or had already run, at these versions (Phase 4B B6). */
export type Reported = { status: "reported" | "already_reported"; rule_version: string; dataset_version: string };

export type GatewayRefusal =
  | "unauthorized"
  | "consent_required"
  | "feature_disabled"
  | "invalid_request"
  | "not_found"
  | "in_progress"
  | "daily_limit_reached"
  | "try_later"
  | "internal_error"
  | "review_changed"
  | "not_waiting"
  | "invalid_answer";

const REFUSALS: readonly GatewayRefusal[] = [
  "unauthorized", "consent_required", "feature_disabled", "invalid_request", "not_found", "in_progress",
  "daily_limit_reached", "try_later", "internal_error", "review_changed", "not_waiting", "invalid_answer",
];

export class GatewayRefused extends Error {
  constructor(
    readonly refusal: GatewayRefusal,
    readonly httpStatus: number,
    /** resolve.ts's reason for an invalid answer (a fixed code, never content). */
    readonly reason: string | null = null,
    /** Seconds until a retry can work (daily limit). */
    readonly retryAfterS: number | null = null,
  ) {
    super(`ai-gateway refused: ${refusal}`);
  }
}

/** No answer came back. The server may or may not have acted. */
export class GatewayUnreachable extends Error {}

export interface TransportReply {
  status: number;
  body: unknown;
  retryAfter: string | null;
  /** ai-gateway's own time (its Server-Timing header), when it said. */
  serverMs?: number | null;
}

/** Posts one JSON body to ai-gateway as the signed-in user. Throws GatewayUnreachable when nothing came back. */
export interface GatewayTransport {
  post(body: Record<string, unknown>): Promise<TransportReply>;
}

export class Gateway {
  constructor(private readonly transport: GatewayTransport) {}

  /** ai-gateway's own time for the last reply, for latency telemetry only. */
  lastServerMs: number | null = null;

  async understand(captureId: string): Promise<Understood> {
    const body = await this.send({ capability: "relationship_extract", input_ref: { capture_id: captureId } });
    const status = body.status;
    if (status === "extracted") {
      return {
        status,
        tier: oneOf(body.tier, ["auto", "confirm", "clarify", "nothing"] as const, "confirm"),
        saved: arrayOf<SavedItem>(body.saved),
        held: arrayOf<HeldItem>(body.held),
        clarification: (body.clarification as Clarification | null) ?? null,
        review_created_at: typeof body.review_created_at === "string" ? body.review_created_at : null,
        ...(Array.isArray(body.known) ? { known: (body.known as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 5) } : {}),
        coverage: coverageOf(body.coverage),
      };
    }
    if (status === "done") {
      return {
        status,
        held: arrayOf<HeldItem>(body.held),
        clarification: (body.clarification as Clarification | null) ?? null,
        review_created_at: typeof body.review_created_at === "string" ? body.review_created_at : null,
        saved_ids: arrayOf<unknown>(body.saved_ids).filter((id): id is string => typeof id === "string"),
        coverage: coverageOf(body.coverage),
      };
    }
    if (status === "kept") return { status };
    throw new GatewayRefused("internal_error", 200);
  }

  async answer(captureId: string, reviewCreatedAt: string, answers: HeldAnswer[]): Promise<Answered> {
    const body = await this.send({
      capability: "relationship_extract",
      action: "resolve_review",
      input_ref: { capture_id: captureId },
      review_created_at: reviewCreatedAt,
      answers,
    });
    if (body.status === "resolved") {
      return {
        status: "resolved",
        saved: arrayOf<ResolvedItem>(body.saved),
        new_people: arrayOf<string>(body.new_people),
        skipped: typeof body.skipped === "number" ? body.skipped : 0,
      };
    }
    if (body.status === "already_resolved") return { status: "already_resolved" };
    throw new GatewayRefused("internal_error", 200);
  }

  async close(captureId: string): Promise<Closed> {
    const body = await this.send({ action: "close_review", input_ref: { capture_id: captureId } });
    if (body.status === "closed" || body.status === "nothing_waiting") return { status: body.status };
    throw new GatewayRefused("internal_error", 200);
  }

  async rederive(itemIds: string[]): Promise<Rederived> {
    const body = await this.send({ action: "rederive", input_ref: { memory_item_ids: itemIds } });
    if (body.status === "rederived") return { status: "rederived", results: arrayOf<{ id: string; result: string }>(body.results) };
    throw new GatewayRefused("internal_error", 200);
  }

  async report(): Promise<Reported> {
    const body = await this.send({ action: "semantic_report" });
    if (body.status === "reported" && body.summary && typeof body.summary === "object") {
      const s = body.summary as Record<string, unknown>;
      return { status: "reported", rule_version: String(s.rule_version ?? ""), dataset_version: String(s.dataset_version ?? "") };
    }
    if (body.status === "already_reported") {
      return { status: "already_reported", rule_version: String(body.rule_version ?? ""), dataset_version: String(body.dataset_version ?? "") };
    }
    throw new GatewayRefused("internal_error", 200);
  }

  private async send(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.lastServerMs = null;
    const reply = await this.transport.post(request);
    this.lastServerMs = reply.serverMs ?? null;
    const body = (reply.body && typeof reply.body === "object" ? reply.body : {}) as Record<string, unknown>;
    if (reply.status >= 200 && reply.status < 300) return body;
    const code = typeof body.error === "string" && (REFUSALS as readonly string[]).includes(body.error)
      ? (body.error as GatewayRefusal)
      // The platform's own JWT check answers 401 without our error shape.
      : reply.status === 401 ? "unauthorized" : reply.status >= 500 ? "try_later" : "internal_error";
    const retry = Number.parseInt(reply.retryAfter ?? "", 10);
    throw new GatewayRefused(
      code,
      reply.status,
      typeof body.reason === "string" ? body.reason : null,
      Number.isFinite(retry) && retry > 0 ? retry : null,
    );
  }
}

/**
 * The phone waits this long for one gateway reply. Above the gateway's own model deadline (45 s) with
 * room for its trips (Option A, founder 19 Oct): a phone that gave up at 30 s on a 39 s reply met a
 * "busy" claim on its retry and counted a slow success as a failure. The hosted runtime answers 504 at
 * 150 s, so 60 s is well inside what the server will hold a request for.
 */
export const GATEWAY_TIMEOUT_MS = 60_000;

/** ai-gateway over supabase-js: the user's session rides on every request. */
export function supabaseGatewayTransport(client: SupabaseClient, timeoutMs = GATEWAY_TIMEOUT_MS): GatewayTransport {
  return {
    async post(body) {
      const { data, error, response } = await client.functions.invoke("ai-gateway", { body, timeout: timeoutMs });
      const serverMs = serverTiming(response?.headers.get("Server-Timing") ?? null);
      if (!error) return { status: response?.status ?? 200, body: data, retryAfter: response?.headers.get("Retry-After") ?? null, serverMs };
      // An HTTP answer (any status) comes with its response; a relay error is the platform's.
      if (response && error.name === "FunctionsHttpError") {
        let parsed: unknown = null;
        try {
          parsed = await response.json();
        } catch {
          parsed = null;
        }
        return { status: response.status, body: parsed, retryAfter: response.headers.get("Retry-After"), serverMs };
      }
      // A request that ran out of time carries the abort as its context.
      const cause = (error as { context?: { name?: unknown } }).context?.name;
      throw new GatewayUnreachable(typeof cause === "string" && /timeout|abort/i.test(cause) ? "timeout" : error.name || "no answer");
    },
  };
}

/** `total;dur=1234` → 1234. */
export function serverTiming(header: string | null): number | null {
  const m = /(?:^|,)\s*total;dur=(\d+(?:\.\d+)?)/.exec(header ?? "");
  return m ? Math.round(Number(m[1])) : null;
}

function arrayOf<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
