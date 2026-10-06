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
import { needsAcceptance } from "../../supabase/functions/_shared/extraction/acceptance";
import { buildInput, type CaptureRow, type ItemRow, type PersonRow, type RelatedRow } from "../../supabase/functions/_shared/extraction/context";
import { planExtraction } from "../../supabase/functions/_shared/extraction/pipeline";
import { resolveHeld, type HeldItem as ResolveHeldItem } from "../../supabase/functions/_shared/extraction/resolve";
import type { ExtractionInput, ModelProposal } from "../../supabase/functions/_shared/extraction/types";

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
  /**
   * Notes read by the gateway's real pipeline: the model's reply is supplied
   * (there is no model in tests), and the gateway's own input builder and
   * planExtraction decide everything after it, as in production.
   */
  readonly proposals = new Map<string, (input: ExtractionInput) => ModelProposal>();
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

  /** Reads this note with the real pipeline, given the model's reply. */
  propose(note: string, reply: (input: ExtractionInput) => ModelProposal): void {
    this.proposals.set(note, reply);
  }

  private rows<T>(table: "people" | "related_people" | "memory_items"): T[] {
    return [...this.server.table(table).values()].filter((r) => r.user_id === this.userId && !r.deleted_at) as unknown as T[];
  }

  private pipeline(captureId: string, reply: (input: ExtractionInput) => ModelProposal): Script & { planned: Record<string, unknown>[]; known?: string[] } {
    const c = this.capture(captureId)!;
    const capture: CaptureRow = {
      id: captureId, raw_text: String(c.raw_text), occurred_at: String(c.occurred_at),
      time_zone: (c.time_zone as string | null) ?? null, context_person_id: (c.context_person_id as string | null) ?? null,
    };
    const input = buildInput(capture, this.rows<PersonRow>("people"), this.rows<RelatedRow>("related_people"), this.rows<ItemRow>("memory_items"));
    const outcome = planExtraction(input, reply(input));
    return { items: [], clarification: outcome.clarification, planned: outcome.items as unknown as Record<string, unknown>[], known: outcome.known };
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
    const reply = this.proposals.get(note);
    const script = reply ? this.pipeline(captureId, reply) : this.scripts.get(note);
    if (!script || script.declined) {
      this.write("captures", captureId, { status: "failed" });
      return ok({ status: "kept" });
    }
    const planned = "planned" in script ? (script.planned as Record<string, unknown>[]) : script.items.map((it) => this.plan(note, it));
    // As the gateway: a sensitive or ambiguous reading waits for the user's yes.
    const saved = planned.filter((p) => p.person_id && (p.tier === "auto" ||
      (p.tier === "confirm" && !needsAcceptance(p as unknown as { sensitivity: string; flags: string[] }))));
    const held = planned.filter((p) => !saved.includes(p));
    const written = saved.map((p) => this.writeItem(captureId, p));
    // The note's tier is the pipeline's (it doesn't know what the gateway holds back).
    const tier = planned.some((p) => p.tier === "hold") ? "clarify" : planned.length === 0 ? "nothing"
      : planned.every((p) => p.tier === "auto") ? "auto" : "confirm";
    this.write("captures", captureId, {
      status: tier === "auto" || tier === "nothing" ? "extracted" : "needs_review",
      extraction_version: "relationship_extract/v6+model",
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
      ...(knownOf(script).length ? { known: knownOf(script) } : {}),
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
    // A note read by the real pipeline is answered by the real resolve.ts,
    // as the gateway does (resolve_review), and written like write_extraction.
    if (this.proposals.has(note)) return this.realAnswer(captureId, note, review, answers);
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
      const flags = (item.flags as string[]) ?? [];
      const asks = !item.person_id || flags.some((f) => ["new_person", "person_ambiguous", "person_disagreement", "pronoun_multiple",
        "subject_check", "date_unresolved_sensitive"].includes(f));
      if (!asks && a.accept !== true) return refuse(400, "invalid_answer", "bad_answer");
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

  private realAnswer(captureId: string, note: string, review: StoredReview, answers: HeldAnswer[]): TransportReply {
    const people = this.rows<PersonRow & { state: string }>("people");
    const r = resolveHeld(review.items as unknown as ResolveHeldItem[], answers as never, {
      note,
      people: people.map((p) => ({ id: p.id, display_name: p.display_name, state: p.state ?? "active" })),
      related: this.rows<RelatedRow & { person_id: string }>("related_people").map((x) => ({ id: x.id, person_id: x.person_id, relation: x.relation, name: x.name ?? null })),
      existing: this.rows<Record<string, unknown>>("memory_items").filter((m) => m.status === "active").map((m) => ({
        id: String(m.id), person_id: String(m.person_id), kind: String(m.kind), subject_type: String(m.subject_type),
        subject_related_id: (m.subject_related_id as string | null) ?? null, statement: String(m.statement), status: String(m.status),
        user_state: String(m.user_state),
      })),
    });
    if ("fail" in r) return refuse(400, "invalid_answer", r.fail);
    const created: Record<string, string> = {};
    for (const np of r.newPeople) {
      created[np.ref] = this.writeNew("people", { display_name: np.display_name, state: "active", relationship_label: np.relationship_label ?? null });
    }
    const out: Record<string, unknown>[] = [];
    for (const it of r.items) {
      const personId = it.person_id.startsWith("new:") ? created[it.person_id] : it.person_id;
      const resolved = { ...it, person_id: personId };
      out.push({ ...resolved, id: this.writeItem(captureId, resolved as unknown as Record<string, unknown>), action: it.action.type });
    }
    this.reviews.delete(captureId);
    this.settle(captureId);
    return ok({ status: "resolved", saved: out, new_people: Object.values(created), skipped: r.skipped });
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
    // The gateway's write rules (write_extraction): merge adds a source to the
    // existing item; supersede writes a new item that replaces the old one
    // (kept, marked superseded, a fact's valid_to set); resolves closes an
    // open thread. A doubtful target (gone, user-edited, someone else's,
    // another subject) makes it a new item instead.
    const action = (p.action as { type?: string; target_id?: string | null } | undefined) ?? {};
    const target = action.target_id ? this.server.table("memory_items").get(action.target_id) : undefined;
    let type = action.type ?? "new";
    if (type !== "new" && (!target || target.deleted_at || target.user_id !== this.userId
      || ["edited", "user_authored"].includes(String(target.user_state)) || target.person_id !== p.person_id
      || target.subject_type !== p.subject_type
      || (type === "merge" && (target.kind !== p.kind || target.status !== "active"))
      || (type === "supersede" && !["active", "resolved"].includes(String(target.status)))
      || (type === "resolves" && (target.kind !== "thread" || target.status !== "active")))) type = "new";
    let itemId: string;
    if (type === "merge") {
      itemId = String(target!.id);
    } else {
      // A new relative is created on its person, as write_extraction does.
      const rel = p.related as { id: string | null; relation: string; name: string | null } | null;
      let relatedId = rel?.id ?? null;
      if (p.subject_type === "related" && rel && !relatedId) {
        relatedId = id("c");
        this.server.serverWrite("related_people", relatedId, this.userId, { person_id: p.person_id, relation: rel.relation, name: rel.name, promoted_person_id: null, deleted_at: null });
      }
      itemId = this.writeNew("memory_items", {
        kind: p.kind, person_id: p.person_id, subject_type: p.subject_type, subject_related_id: p.subject_type === "related" ? relatedId : null,
        statement: p.statement, detail: p.detail, certainty: p.certainty, sensitivity: p.sensitivity,
        extraction_confidence: p.confidence, status: "active", user_state: "unreviewed", origin: "extracted",
        supersedes_id: type === "supersede" ? target!.id : null, valid_from: null, valid_to: null, deleted_at: null,
        with_person_ids: Array.isArray(p.with_person_ids) ? p.with_person_ids : [],
      });
      if (type === "supersede") {
        this.write("memory_items", String(target!.id), {
          status: "superseded", ...(target!.kind === "fact" ? { valid_to: this.server.tick(0).slice(0, 10) } : {}),
        });
      }
      if (type === "resolves") this.write("memory_items", String(target!.id), { status: "resolved" });
    }
    // A relationship the note states, never over the user's own (write_extraction).
    for (const [pid, rel] of Object.entries((p.self_relations as Record<string, string> | undefined) ?? {})) {
      const person = this.server.table("people").get(pid);
      if (person && person.user_id === this.userId && !String(person.relationship_label ?? "").trim()) {
        this.server.serverWrite("people", pid, this.userId, { relationship_label: rel });
      }
    }
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

  private write(table: "captures" | "memory_items", key: string, fields: Record<string, unknown>): void {
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

function knownOf(script: unknown): string[] {
  const k = (script as { known?: unknown }).known;
  return Array.isArray(k) ? k.filter((x): x is string => typeof x === "string") : [];
}
