// A stand-in for ai-gateway over FakeServer, reproducing what the app relies
// on (the gateway's and database's own rules are proven by the Deno and pgTAP
// suites):
//   * one model run per note: readings are scripted by the note's text; asking
//     again answers "done" with the stored question, never a second run;
//   * saved items written with their sources (span + quote) and the note's
//     status, so they reach the device by ordinary sync;
//   * held items stored as a review identified by created_at; an answer is
//     applied once (a retry is "already_resolved"), checked against that
//     created_at and against the note's words;
//   * closing settles the note (and drops its text with delete_after_extraction).
// It can lose a reply after acting, go offline, or refuse like the gateway.

import { GatewayUnreachable, type Clarification, type GatewayTransport, type HeldAnswer, type TransportReply } from "@/store/gateway";
import type { FakeServer } from "./fakeRemote";

export interface ScriptedItem {
  kind: string;
  statement: string;
  /** Evidence: an exact quote of the note. */
  quote: string;
  tier: "auto" | "confirm" | "hold";
  person_id?: string | null;
  new_person_name?: string | null;
  detail?: Record<string, unknown>;
  flags?: string[];
  sensitivity?: string;
  certainty?: string;
  subject_type?: string;
}

export interface Script {
  items: ScriptedItem[];
  clarification?: Clarification | null;
  /** The model declined the note. */
  declined?: boolean;
}

interface StoredReview {
  items: Record<string, unknown>[];
  clarification: Clarification | null;
  created_at: string;
}

let counter = 0;
const id = (prefix: string) => `${prefix}0000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

export class FakeGateway implements GatewayTransport {
  readonly scripts = new Map<string, Script>();
  readonly reviews = new Map<string, StoredReview>();
  readonly calls: string[] = [];
  modelRuns = 0;
  offline = false;
  consent = true;
  flagOn = true;
  /** Act, then lose the reply; "and_go_offline" also drops the connection for good. */
  loseNextReply: boolean | "and_go_offline" = false;
  /** Answer the next request with this HTTP failure instead of acting. */
  failNext: { status: number; error: string } | null = null;

  constructor(
    private readonly server: FakeServer,
    private readonly userId: string,
  ) {}

  script(note: string, script: Script): void {
    this.scripts.set(note, script);
  }

  async post(body: Record<string, unknown>): Promise<TransportReply> {
    const kind = body.action === "close_review" ? "close" : body.action === "resolve_review" ? "answer" : "understand";
    this.calls.push(kind);
    if (this.offline) throw new GatewayUnreachable("offline");
    if (this.failNext) {
      const f = this.failNext;
      this.failNext = null;
      return { status: f.status, body: { error: f.error }, retryAfter: f.status === 429 ? "3600" : null };
    }
    const reply = this.handle(kind, body);
    if (this.loseNextReply) {
      if (this.loseNextReply === "and_go_offline") {
        this.offline = true;
        this.server.offline = true;
      }
      this.loseNextReply = false;
      throw new GatewayUnreachable("reply lost");
    }
    return reply;
  }

  // ─── The gateway's behaviour ──────────────────────────────────────────

  private handle(kind: "close" | "answer" | "understand", body: Record<string, unknown>): TransportReply {
    const captureId = String((body.input_ref as Record<string, unknown> | undefined)?.capture_id ?? "");
    if (kind === "close") {
      const capture = this.capture(captureId);
      const waiting = this.reviews.delete(captureId) || capture?.status === "needs_review";
      if (capture && waiting) this.settle(captureId);
      return ok({ status: waiting && capture ? "closed" : "nothing_waiting" });
    }
    if (!this.consent) return refuse(403, "consent_required");
    if (!this.flagOn) return refuse(403, "feature_disabled");
    const capture = this.capture(captureId);
    if (!capture || capture.raw_text == null) return refuse(404, "not_found");
    if (kind === "answer") return this.answer(captureId, body);

    if (capture.status === "extracted" || capture.status === "needs_review") {
      const review = this.reviews.get(captureId);
      return ok({ status: "done", held: review?.items ?? [], clarification: review?.clarification ?? null, review_created_at: review?.created_at ?? null });
    }
    if (capture.status === "processing") return refuse(409, "in_progress");

    this.modelRuns++;
    const note = String(capture.raw_text);
    const script = this.scripts.get(note);
    if (!script || script.declined) {
      this.write("captures", captureId, { status: "failed" });
      return ok({ status: "kept" });
    }
    const planned = script.items.map((it) => this.plan(note, it));
    const saved = planned.filter((p) => p.tier !== "hold" && p.person_id);
    const held = planned.filter((p) => !saved.includes(p));
    const written = saved.map((p) => this.writeItem(captureId, p));
    const tier = held.length ? "clarify" : saved.length === 0 ? "nothing" : saved.every((p) => p.tier === "auto") ? "auto" : "confirm";
    this.write("captures", captureId, {
      status: tier === "auto" || tier === "nothing" ? "extracted" : "needs_review",
      extraction_version: "relationship_extract/v5+model",
    });
    let createdAt: string | null = null;
    if (held.length) {
      createdAt = this.server.tick(1);
      this.reviews.set(captureId, { items: held, clarification: script.clarification ?? null, created_at: createdAt });
    }
    return ok({
      status: "extracted",
      tier,
      saved: saved.map((p, n) => ({ ...p, id: written[n], action: "new" })),
      held,
      clarification: held.length ? (script.clarification ?? null) : null,
      review_created_at: createdAt,
    });
  }

  private answer(captureId: string, body: Record<string, unknown>): TransportReply {
    const review = this.reviews.get(captureId);
    if (!review) return ok({ status: "already_resolved" });
    if (Date.parse(String(body.review_created_at)) !== Date.parse(review.created_at)) return refuse(409, "review_changed");
    const capture = this.capture(captureId)!;
    if (capture.status !== "needs_review") return refuse(409, "not_waiting");
    const note = String(capture.raw_text);
    for (const item of review.items) {
      for (const s of item.spans as { start: number; end: number; quote: string }[]) {
        if (note.slice(s.start, s.end) !== s.quote) return refuse(409, "review_changed");
      }
    }
    const answers = body.answers as HeldAnswer[];
    if (!Array.isArray(answers) || answers.length !== review.items.length) return refuse(400, "invalid_answer", "unanswered");
    const created: Record<string, string> = {};
    const out: Record<string, unknown>[] = [];
    let skipped = 0;
    for (const a of answers) {
      const item = review.items[a.index];
      if (!item) return refuse(400, "invalid_answer", "bad_answer");
      if (a.skip) {
        skipped++;
        continue;
      }
      let personId = (item.person_id as string | null) ?? null;
      if (a.person_id) {
        const p = this.server.table("people").get(a.person_id);
        if (!p || p.user_id !== this.userId || p.deleted_at) return refuse(409, "invalid_answer");
        personId = a.person_id;
      } else if (a.new_person) {
        const name = String(item.new_person_name ?? "");
        if (!name) return refuse(400, "invalid_answer", "bad_answer");
        created[name] ??= this.writeNew("people", { display_name: name, state: "active" });
        personId = created[name];
      }
      if (!personId) return refuse(400, "invalid_answer", "unanswered");
      const detail = { ...(item.detail as Record<string, unknown>) };
      if ("date" in a) {
        delete detail.date;
        delete detail.date_end;
        if (a.date) {
          detail.date = a.date;
          detail.date_precision = "day";
        } else {
          detail.date_precision = "unknown";
        }
      }
      const resolved = { ...item, person_id: personId, detail };
      out.push({ ...resolved, id: this.writeItem(captureId, resolved), action: "new" });
    }
    this.reviews.delete(captureId);
    this.settle(captureId);
    return ok({ status: "resolved", saved: out, new_people: Object.values(created), skipped });
  }

  // ─── Writes, as write_extraction makes them ──────────────────────────

  private plan(note: string, it: ScriptedItem): Record<string, unknown> & { tier: string; person_id: string | null } {
    const start = note.indexOf(it.quote);
    if (start < 0) throw new Error(`scripted quote not in the note: ${it.quote}`);
    return {
      kind: it.kind,
      person_id: it.person_id ?? null,
      new_person_name: it.new_person_name ?? null,
      subject_type: it.subject_type ?? (it.kind === "promise" ? "user" : "person"),
      related: null,
      statement: it.statement,
      detail: it.detail ?? {},
      certainty: it.certainty ?? "stated",
      sensitivity: it.sensitivity ?? "none",
      confidence: it.tier === "auto" ? 0.92 : 0.75,
      action: { type: "new", target_id: null },
      tier: it.tier,
      flags: it.flags ?? [],
      spans: [{ start, end: start + it.quote.length, quote: it.quote }],
    };
  }

  private writeItem(captureId: string, p: Record<string, unknown>): string {
    const itemId = this.writeNew("memory_items", {
      kind: p.kind, person_id: p.person_id, subject_type: p.subject_type, subject_related_id: null,
      statement: p.statement, detail: p.detail, certainty: p.certainty, sensitivity: p.sensitivity,
      extraction_confidence: p.confidence, status: "active", user_state: "unreviewed", origin: "extracted",
      supersedes_id: null, valid_from: null, valid_to: null, deleted_at: null,
    });
    for (const s of p.spans as { start: number; end: number; quote: string }[]) {
      this.writeNew("memory_item_sources", {
        memory_item_id: itemId, capture_id: captureId, source_kind: "capture",
        span_start: s.start, span_end: s.end, quote: s.quote, meta: null, deleted_at: null,
      });
    }
    return itemId;
  }

  private settle(captureId: string): void {
    const c = this.capture(captureId);
    if (!c || c.status !== "needs_review") return;
    this.write("captures", captureId, {
      status: "extracted",
      ...(c.retention === "delete_after_extraction" ? { raw_text: null } : {}),
    });
  }

  private capture(captureId: string): Record<string, unknown> | null {
    const c = this.server.table("captures").get(captureId);
    return c && c.user_id === this.userId && !c.deleted_at ? c : null;
  }

  private write(table: "captures", key: string, fields: Record<string, unknown>): void {
    this.server.serverWrite(table, key, this.userId, fields);
  }

  private writeNew(table: "people" | "memory_items" | "memory_item_sources", fields: Record<string, unknown>): string {
    const key = id(table === "people" ? "e" : table === "memory_items" ? "f" : "d");
    this.server.serverWrite(table, key, this.userId, fields);
    return key;
  }
}

function ok(body: unknown): TransportReply {
  return { status: 200, body, retryAfter: null };
}

function refuse(status: number, error: string, reason?: string): TransportReply {
  return { status, body: reason ? { error, reason } : { error }, retryAfter: null };
}
