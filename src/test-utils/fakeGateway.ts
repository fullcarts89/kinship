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
import { buildInput, type CaptureRow, type FacetRow, type ItemRow, type PersonRow, type RelatedRow, withLineNames } from "../../supabase/functions/_shared/extraction/context";
import { mentionsOf, type PersonMention } from "../../supabase/functions/_shared/extraction/names";
import { planExtraction } from "../../supabase/functions/_shared/extraction/pipeline";
import { resolveHeld, type HeldItem as ResolveHeldItem } from "../../supabase/functions/_shared/extraction/resolve";
import type { ExtractionInput, ModelProposal } from "../../supabase/functions/_shared/extraction/types";
import type { PlaceIndex } from "../../supabase/functions/_shared/semantic/placeIndex";
import { residenceEligible } from "../../supabase/functions/_shared/semantic/residence";
import { type LineToRead, rederive } from "../../supabase/functions/_shared/semantic/rederive";

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
  /** ai-gateway's own time to report (Server-Timing), and a hook run while the request is "in flight". */
  serverMs: number | null = null;
  onCall: (() => void) | null = null;
  /** Holds every request until it resolves: a slow network. */
  pause: Promise<void> | null = null;
  /** Place data for residence readings (Phase 4B B3): the gateway's own; tests hand it a small fixture. */
  places: PlaceIndex | null = null;

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

  private rows<T>(table: "people" | "related_people" | "memory_items" | "memory_item_facets"): T[] {
    return [...this.server.table(table).values()].filter((r) => r.user_id === this.userId && !r.deleted_at) as unknown as T[];
  }

  private pipeline(captureId: string, reply: (input: ExtractionInput) => ModelProposal): Script & { planned: Record<string, unknown>[]; known?: string[] } {
    const c = this.capture(captureId)!;
    const capture: CaptureRow = {
      id: captureId, raw_text: String(c.raw_text), occurred_at: String(c.occurred_at),
      time_zone: (c.time_zone as string | null) ?? null, context_person_id: (c.context_person_id as string | null) ?? null,
    };
    // As the gateway loads them: each person with the words their own lines use for them (founder I12).
    const people = withLineNames(this.rows<PersonRow>("people"), this.rows<{ person_mentions?: unknown }>("memory_items"));
    // The safety net (§5): a line that lost its reading to an edit nobody reported is read again first.
    if (this.places) this.reread(this.rows<{ id: string }>("memory_items").map((m) => m.id));
    const facets = this.places ? this.rows<FacetRow>("memory_item_facets") : [];
    const input = {
      ...buildInput(capture, people, this.rows<RelatedRow>("related_people"), this.rows<ItemRow>("memory_items"), facets),
      ...(this.places ? { places: this.places } : {}),
    };
    const outcome = planExtraction(input, reply(input));
    return { items: [], clarification: outcome.clarification, planned: outcome.items as unknown as Record<string, unknown>[], known: outcome.known };
  }

  async post(body: Record<string, unknown>): Promise<TransportReply> {
    const kind = body.action === "close_review" ? "close" : body.action === "resolve_review" ? "answer" : body.action === "rederive" ? "rederive" : "understand";
    this.calls.push(kind);
    this.onCall?.();
    if (this.pause) await this.pause;
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
    return this.serverMs === null ? reply : { ...reply, serverMs: this.serverMs };
  }

  // ─── The gateway's behaviour ──────────────────────────────────────────

  private handle(kind: "close" | "answer" | "understand" | "rederive", body: Record<string, unknown>): TransportReply {
    if (kind === "rederive") {
      const ids = (body.input_ref as Record<string, unknown> | undefined)?.memory_item_ids;
      if (!Array.isArray(ids) || ids.length === 0 || ids.length > 20) return refuse(400, "invalid_request");
      return ok({ status: "rederived", results: this.reread(ids as string[]) });
    }
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
        // As resolve_capture_review: code points, and the stored quote is at most 200 of them (reviewer A, r4).
        if (Array.from(note).slice(s.start, s.end).slice(0, 200).join("") !== s.quote) return refuse(409, "review_changed");
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

  private removedFrom(captureId: string): { person_id: string; statement: string }[] {
    const all = (t: "memory_items" | "memory_item_sources") => [...this.server.table(t).values()].filter((r) => r.user_id === this.userId) as Record<string, unknown>[];
    const ids = new Set(all("memory_item_sources").filter((x) => x.capture_id === captureId).map((x) => x.memory_item_id));
    return all("memory_items")
      .filter((m) => ids.has(m.id) && (m.deleted_at || m.status === "superseded"))
      .map((m) => ({ person_id: String(m.person_id), statement: String(m.statement) }));
  }

  private realAnswer(captureId: string, note: string, review: StoredReview, answers: HeldAnswer[]): TransportReply {
    const people = withLineNames(this.rows<PersonRow & { state: string }>("people"), this.rows<{ person_mentions?: unknown }>("memory_items"));
    const r = resolveHeld(review.items as unknown as ResolveHeldItem[], answers as never, {
      note,
      people: people.map((p) => ({
        id: p.id, display_name: p.display_name, state: p.state ?? "active", full_name: p.full_name, nicknames: p.nicknames,
        mention_names: p.mention_names ?? null, earlier_names: p.earlier_names ?? null,
      })),
      related: this.rows<RelatedRow & { person_id: string }>("related_people").map((x) => ({ id: x.id, person_id: x.person_id, relation: x.relation, name: x.name ?? null })),
      existing: this.rows<Record<string, unknown>>("memory_items").filter((m) => m.status === "active" && !m.deleted_at).map((m) => ({
        id: String(m.id), person_id: String(m.person_id), kind: String(m.kind), subject_type: String(m.subject_type),
        subject_related_id: (m.subject_related_id as string | null) ?? null, statement: String(m.statement), status: String(m.status),
        user_state: String(m.user_state), detail: (m.detail as Record<string, unknown> | null) ?? null,
        with_person_ids: Array.isArray(m.with_person_ids) ? (m.with_person_ids as string[]) : null,
      })),
      // As the gateway's loadRemoved: this capture's lines the user has since removed.
      removed: this.removedFrom(captureId),
    });
    if ("fail" in r) return refuse(400, "invalid_answer", r.fail);
    const created: Record<string, string> = {};
    for (const np of r.newPeople) {
      created[np.ref] = this.writeNew("people", { display_name: np.display_name, state: "active", relationship_label: np.relationship_label ?? null });
    }
    // "Susan moved" may close the line the stored question asked about (resolve_capture_review, §21 b).
    const sig = (spans: unknown) => (Array.isArray(spans) ? spans as { start: number; end: number }[] : [])
      .map((x) => `${x.start}-${x.end}`).sort().join(",");
    const answered = r.items.filter((it) => it.action.type === "supersede" && it.detail?.transition === "changed" &&
      review.items.some((h) => Array.isArray(h.flags) && (h.flags as string[]).includes("residence_conflict") &&
        (h.still_in as { target_id?: string } | undefined)?.target_id === it.action.target_id && h.person_id === it.person_id &&
        sig(h.spans) === sig(it.spans)))
      .map((it) => it.action.target_id!);
    const out: Record<string, unknown>[] = [];
    for (const it of r.items) {
      const personId = it.person_id.startsWith("new:") ? created[it.person_id] : it.person_id;
      // Words for someone added in this answer name them by their new id (resolve_capture_review).
      const words = (it.person_mentions ?? []).map((m) => (m.person_id?.startsWith("new:") ? { ...m, person_id: created[m.person_id] ?? m.person_id } : m));
      const resolved = { ...it, person_id: personId, ...(words.length ? { person_mentions: words } : {}) };
      out.push({ ...resolved, id: this.writeItem(captureId, resolved as unknown as Record<string, unknown>, answered), action: it.action.type });
    }
    this.reviews.delete(captureId);
    this.settle(captureId);
    return ok({ status: "resolved", saved: out, new_people: Object.values(created), skipped: r.skipped });
  }

  // ─── Writes, as write_extraction makes them ──────────────────────────

  private plan(note: string, it: ScriptedItem): Record<string, unknown> & { tier: string; person_id: string | null } {
    const at = note.indexOf(it.quote);
    if (at < 0) throw new Error(`scripted quote not in the note: ${it.quote}`);
    // Code points, and at most 200 of them, as the real pipeline writes a span (reviewer A, r5).
    const start = Array.from(note.slice(0, at)).length;
    const quote = Array.from(it.quote).slice(0, 200).join("");
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
      spans: [{ start, end: start + Array.from(it.quote).length, quote }],
    };
  }

  /**
   * Re-derivation (rederive.ts, as the gateway runs it) and write_facets' re-checks: of these lines, each that
   * had a residence reading and has none now is read again from the user's own words. Per line, the result.
   */
  readonly rereads: string[] = [];
  private reread(ids: string[]): { id: string; result: string }[] {
    if (!this.places) return [];
    const facets = [...this.server.table("memory_item_facets").values()].filter((f) => f.user_id === this.userId);
    const out: { id: string; result: string }[] = [];
    for (const itemId of ids) {
      const mine = facets.filter((f) => f.memory_item_id === itemId && f.slot === "residence");
      if (!mine.length || mine.some((f) => !f.deleted_at)) continue;
      const m = this.server.table("memory_items").get(itemId);
      if (!m || m.user_id !== this.userId || m.deleted_at || m.status === "retracted") continue;
      const quotes = [...this.server.table("memory_item_sources").values()]
        .filter((q) => q.memory_item_id === itemId && !q.deleted_at && typeof q.quote === "string").map((q) => String(q.quote));
      const w = rederive(m as unknown as LineToRead, quotes, this.places);
      const f = w?.facets[0];
      if (!w || !f) continue;
      const own = ["edited", "user_authored"].includes(String(m.user_state)) ? String(m.statement).includes(f.value_text) : quotes.some((q) => q.includes(f.value_text));
      if (!own) {
        out.push({ id: itemId, result: "dropped" });
        continue;
      }
      this.rereads.push(itemId);
      this.server.serverWrite("memory_item_facets", id("b"), this.userId, { memory_item_id: itemId, ...f, deleted_at: null });
      out.push({ id: itemId, result: "written" });
    }
    return out;
  }

  /**
   * May this item close `target`, a line the user edited or wrote (§21)? A
   * residence line closed on a change or correction cue in the note's own
   * characters inside the item's span, or the stored question's "Susan
   * moved" (edited_line_closure_ok, 20261016090000).
   */
  private editedLineClosure(captureId: string, p: Record<string, unknown>, target: Record<string, unknown>, answered: string[]): boolean {
    const transition = (p.detail as Record<string, unknown> | undefined)?.transition;
    if (transition !== "changed" && transition !== "corrected") return false;
    const facets = Array.isArray(p.facets) ? p.facets as { slot?: string }[] : [];
    if (!residenceEligible(p as never) || !facets.some((f) => f.slot === "residence")) return false;
    const facet = [...this.server.table("memory_item_facets").values()]
      .find((f) => f.memory_item_id === target.id && f.user_id === this.userId && !f.deleted_at);
    if (!facet || target.kind !== "fact" || (Array.isArray(target.with_person_ids) && target.with_person_ids.length)) return false;
    if (transition === "changed" && answered.includes(String(target.id))) return true;
    const cue = p.cue as { start?: number; end?: number } | undefined;
    const spans = (p.spans as { start: number; end: number }[]) ?? [];
    if (!cue || typeof cue.start !== "number" || typeof cue.end !== "number" || cue.end <= cue.start) return false;
    if (!spans.some((sp) => cue.start! >= sp.start && cue.end! <= sp.end)) return false;
    const words = Array.from(String(this.capture(captureId)?.raw_text ?? "")).slice(cue.start, cue.end).join("").replace(/\s+/gu, " ").trim().toLowerCase();
    if (transition === "changed") {
      return /^((has|have|had|just|recently|finally|since) )*(moved|relocated)( back)?( from [^.,;:!?]{1,60})? to$/u.test(words) ||
        /^now (lives|living|resides|residing|is based|based|is living) in$/u.test(words) ||
        /^(lives|live|living|resides|reside|residing|is based|are based|based|is living|are living) in .{1,100} now$/u.test(words);
    }
    return /^(actually|i was wrong|i meant|correction)$/u.test(words) ||
      (/^not /u.test(words) && words.includes(String(facet.value_text).toLowerCase()));
  }

  private writeItem(captureId: string, p: Record<string, unknown>, answered: string[] = []): string {
    // The gateway's write rules (write_extraction): merge adds a source to the
    // existing item; supersede writes a new item that replaces the old one
    // (kept, marked superseded, a fact's valid_to set); resolves closes an
    // open thread. A doubtful target (gone, user-edited, someone else's,
    // another subject) makes it a new item instead.
    const action = (p.action as { type?: string; target_id?: string | null } | undefined) ?? {};
    const target = action.target_id ? this.server.table("memory_items").get(action.target_id) : undefined;
    let type = action.type ?? "new";
    if (type !== "new" && (!target || target.deleted_at || target.user_id !== this.userId
      || (["edited", "user_authored"].includes(String(target.user_state)) &&
        !(type === "supersede" && this.editedLineClosure(captureId, p, target, answered)))
      || target.person_id !== p.person_id
      || target.subject_type !== p.subject_type
      || (type === "merge" && (target.kind !== p.kind || target.status !== "active"))
      || (type === "supersede" && !["active", "resolved"].includes(String(target.status)))
      || (type === "resolves" && (target.kind !== "thread" || target.status !== "active")))) type = "new";
    let itemId: string;
    // Which words name whom: only the people the item is about (write_extraction).
    const about = [p.person_id, ...(Array.isArray(p.with_person_ids) ? p.with_person_ids as string[] : [])];
    const mentions = mentionsOf(p.person_mentions).filter((m) => m.person_id && about.includes(m.person_id)).slice(0, 8);
    if (type === "merge") {
      itemId = String(target!.id);
      // A merge adds its people to the memory merged into (write_extraction),
      // and their words when the memory's own words name them too.
      const add = (Array.isArray(p.with_person_ids) ? p.with_person_ids as string[] : []).filter((x) => x !== target!.person_id);
      const had = Array.isArray(target!.with_person_ids) ? target!.with_person_ids as string[] : [];
      const haveWords = mentionsOf(target!.person_mentions);
      const addWords = mentions.filter((m) => !haveWords.some((h) => h.person_id === m.person_id) && String(target!.statement).includes(m.text));
      if (add.some((x) => !had.includes(x)) || addWords.length) {
        this.write("memory_items", itemId, {
          with_person_ids: [...new Set([...had, ...add])],
          ...(addWords.length ? { person_mentions: [...haveWords, ...addWords].slice(0, 8) as PersonMention[] } : {}),
        });
      }
    } else {
      // A new relative is created on its person, as write_extraction does.
      const rel = p.related as { id: string | null; relation: string; name: string | null } | null;
      let relatedId = rel?.id ?? null;
      if (p.subject_type === "related" && rel && !relatedId) {
        relatedId = id("c");
        this.server.serverWrite("related_people", relatedId, this.userId, { person_id: p.person_id, relation: rel.relation, name: rel.name, promoted_person_id: null, deleted_at: null });
      }
      // The other lines it closes (closes, Phase 4B B4): each re-checked as the target is (the user's, live,
      // same person and subject, current; an edited line only on the user's own cue), at most 8, in order.
      const closes: string[] = [];
      for (const cid of Array.isArray(p.closes) ? (p.closes as unknown[]) : []) {
        if (closes.length >= 8 || typeof cid !== "string" || closes.includes(cid) || (type === "supersede" && cid === target!.id)) continue;
        const c = this.server.table("memory_items").get(cid);
        if (!c || c.deleted_at || c.user_id !== this.userId || c.person_id !== p.person_id || c.subject_type !== p.subject_type
          || (c.subject_related_id ?? null) !== (p.subject_type === "related" ? relatedId : null)
          || !["active", "resolved"].includes(String(c.status))
          || (["edited", "user_authored"].includes(String(c.user_state)) && !this.editedLineClosure(captureId, p, c, answered))) continue;
        closes.push(cid);
      }
      itemId = this.writeNew("memory_items", {
        kind: p.kind, person_id: p.person_id, subject_type: p.subject_type, subject_related_id: p.subject_type === "related" ? relatedId : null,
        statement: p.statement, detail: p.detail, certainty: p.certainty, sensitivity: p.sensitivity,
        extraction_confidence: p.confidence, status: "active", user_state: "unreviewed", origin: "extracted",
        supersedes_id: type === "supersede" ? target!.id : null, closes_ids: closes, valid_from: null, valid_to: null, deleted_at: null,
        with_person_ids: Array.isArray(p.with_person_ids) ? p.with_person_ids : [],
        person_mentions: mentions,
      });
      // The apply triggers: what it replaces and every line it closes leave current truth (their facets stay).
      for (const closed of [...(type === "supersede" ? [String(target!.id)] : []), ...closes]) {
        const c = this.server.table("memory_items").get(closed)!;
        this.write("memory_items", closed, {
          status: "superseded", ...(c.kind === "fact" ? { valid_to: this.server.tick(0).slice(0, 10) } : {}),
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
    // Its residence reading: only on a line written as new that may carry one, in its own words (write_extraction).
    const facet = Array.isArray(p.facets) ? (p.facets as Record<string, unknown>[]).find((f) => f.slot === "residence") : undefined;
    if (facet && type !== "merge" && residenceEligible(p as never) &&
        (p.spans as { quote: string }[]).some((sp) => sp.quote.includes(String(facet.value_text)))) {
      this.server.serverWrite("memory_item_facets", id("b"), this.userId, {
        memory_item_id: itemId, slot: "residence", value_text: facet.value_text, value_norm: facet.value_norm,
        place_ref: facet.place_ref ?? null, candidates: facet.candidates ?? [], usual_ref: facet.usual_ref ?? null,
        decided_by: facet.decided_by, rule_version: facet.rule_version, dataset_version: facet.dataset_version ?? null, deleted_at: null,
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
