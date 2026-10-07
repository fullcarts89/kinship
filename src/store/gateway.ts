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
  date?: string | null;
  /** "Remember this": the user's yes to a reading held for it. */
  accept?: true;
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
    }
  | { status: "done"; held: HeldItem[]; clarification: Clarification | null; review_created_at: string | null }
  | { status: "kept" };

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
      };
    }
    if (status === "done") {
      return {
        status,
        held: arrayOf<HeldItem>(body.held),
        clarification: (body.clarification as Clarification | null) ?? null,
        review_created_at: typeof body.review_created_at === "string" ? body.review_created_at : null,
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

/** ai-gateway over supabase-js: the user's session rides on every request. */
export function supabaseGatewayTransport(client: SupabaseClient, timeoutMs = 30_000): GatewayTransport {
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
