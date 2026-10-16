// The semantic corpus for residence (Phase 4B B3; brief §15; founder
// CC-19, CC-20, CC-24): fixtures/residence.jsonl, free and deterministic.
//
// Each sequence goes through the gateway's own code: the oracle model
// proposal (the fixture's item, as a correct model would phrase it) →
// planExtraction (pipeline.ts, with residence.ts and relate.ts and the
// committed place data) → the held question and resolveHeld when it asks →
// the database's write rules (write_extraction, resolve_capture_review and
// the restore trigger, as 20261015090000 and 20261016090000 make them; the
// pgTAP suites prove the database itself) → the end state on each page.
//
// A page's lines are read the way the brief's composition (§9, B5) would
// read them: current residence lines that form a containing chain are one
// line in their own words ("Lives in Alameda, California"), anything else
// stays its own line; a closed line is history only when its closer records
// a change (§11). That reading is the corpus's expectation of B5, used only
// to check that B3 leaves exactly the lines it needs; it is not the product's
// composer, which B5 builds.
//
// Zero tolerance, each counted and failing the run (CC-19, CC-20): incorrect
// supersession, wrong SAME, incorrect refinement, an unsupported composed
// fact, lost provenance, temporal contradiction, unsupported history,
// certainty upgrade, cross-person contamination. A missed refinement is
// reported, not failed. What a later step delivers is listed in DEFERRED and
// reported, never silently skipped.
//
//   deno test --allow-read --config evals/deno.json evals/semantic

import { placeIndex } from "../../supabase/functions/_shared/semantic/places/dataset.ts";
import { planExtraction } from "../../supabase/functions/_shared/extraction/pipeline.ts";
import { buildInput, type FacetRow, type ItemRow, type PersonRow, type RelatedRow } from "../../supabase/functions/_shared/extraction/context.ts";
import { type HeldItem, resolveHeld, type ResolvedItem } from "../../supabase/functions/_shared/extraction/resolve.ts";
import type { Certainty, Kind, ModelProposal, PlannedItem, ProposedItem, SubjectType } from "../../supabase/functions/_shared/extraction/types.ts";
import { shortName } from "../../supabase/functions/_shared/extraction/names.ts";
import { type FacetLike, pairClass, usualReading } from "../../supabase/functions/_shared/semantic/relate.ts";
import { residenceEligible } from "../../supabase/functions/_shared/semantic/residence.ts";
import { rederive } from "../../supabase/functions/_shared/semantic/rederive.ts";
import { residenceQuestion } from "../../supabase/functions/_shared/semantic/questions.ts";

// ─── The corpus ───────────────────────────────────────────────────────────────

interface NoteStep {
  note: string;
  item: {
    statement: string;
    evidence: string;
    kind?: Kind;
    certainty?: Certainty;
    subject?: SubjectType;
    related?: { relation: string; name: string | null };
    with?: string[];
    person?: string;
  };
  model?: { action: "new" | "merge" | "supersede"; target?: number };
  protect?: boolean;
  answer?: "still_there" | "she_moved";
  expect: {
    facet?: boolean;
    outcome?: string;
    closes?: number[];
    transition?: string | null;
    question?: string;
    choices?: string[];
    value_text?: string;
    resolved?: boolean;
    candidates?: number;
    after_answer?: { facet: boolean };
  };
}
interface UndoStep {
  undo: number;
  expect: { restored?: number[] };
}
interface MoveStep {
  correct_person: { step: number; to: string };
  expect: Record<string, never>;
}
/**
 * The user edits a line's words (What Kinship knows): its reading is tombstoned at once (the B2 trigger) and,
 * when the app reports the edit (the default), read again (§5, N13). Unreported, the next Tell reads it.
 */
interface EditStep {
  edit: { step: number; statement: string; report?: boolean };
  expect: { facet?: boolean; value_text?: string };
}
type Step = NoteStep | UndoStep | MoveStep | EditStep;
interface Page {
  current?: string[];
  history?: string[];
  portrait?: string[];
  sources?: number;
  active?: string[];
  related?: Record<string, string[]>;
}
interface Fixture {
  id: string;
  title: string;
  tags: string[];
  people: string[];
  steps: Step[];
  expect: { pages: Record<string, Page>; must_not?: string[] };
}

const FILE = new URL("./fixtures/residence.jsonl", import.meta.url);
const TEXT = Deno.readTextFileSync(FILE);
const FIXTURES: Fixture[] = TEXT.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const PLACES = placeIndex();

/** What a later step of Phase 4B delivers: reported, never failed (and never silently skipped). */
const DEFERRED: Record<string, string> = {};

// ─── A small database, with write_extraction's rules ─────────────────────────

interface Row {
  id: string;
  person_id: string;
  kind: string;
  subject_type: string;
  subject_related_id: string | null;
  statement: string;
  certainty: string;
  sensitivity: string;
  status: "active" | "superseded" | "resolved";
  user_state: string;
  detail: Record<string, unknown>;
  supersedes_id: string | null;
  /** The other lines it closed (B4). */
  closes_ids: string[];
  with_person_ids: string[];
  deleted: boolean;
  version: number;
  /** The notes (steps) it has a source in. */
  steps: number[];
  tick: number;
}
interface Facet extends FacetLike {
  item: string;
  live: boolean;
}
interface Source {
  item: string;
  step: number;
  quote: string;
  /** A user_edit source: the words are the line's own, as the user edited it. */
  edit?: true;
}

class World {
  people: PersonRow[];
  related: RelatedRow[] = [];
  rows: Row[] = [];
  facets: Facet[] = [];
  sources: Source[] = [];
  notes = new Map<number, string>();
  /** The line each note step wrote (or merged into). */
  wrote = new Map<number, string>();
  tick = 0;

  constructor(names: string[]) {
    this.people = names.map((n) => ({
      id: `person-${n.toLowerCase()}`, display_name: n, full_name: null, nicknames: [], relationship_label: null, state: "active",
    }));
  }

  personId(name: string): string {
    return `person-${name.toLowerCase()}`;
  }

  row(id: string): Row | undefined {
    return this.rows.find((r) => r.id === id);
  }

  liveFacet(id: string): Facet | undefined {
    return this.facets.find((f) => f.item === id && f.live);
  }

  input(step: number, note: string) {
    const live = this.rows.filter((r) => !r.deleted && (r.status === "active" || r.status === "resolved"));
    // The safety net (§5): a line here that lost its reading and has none now is read again first.
    for (const r of live) if (!this.liveFacet(r.id) && this.facets.some((f) => f.item === r.id)) this.reread(r.id);
    const items: ItemRow[] = live.map((r) => ({
      id: r.id, person_id: r.person_id, kind: r.kind as ItemRow["kind"], subject_type: r.subject_type as ItemRow["subject_type"],
      subject_related_id: r.subject_related_id, statement: r.statement, certainty: r.certainty as ItemRow["certainty"], status: r.status,
      user_state: r.user_state as ItemRow["user_state"], detail: r.detail, updated_at: String(r.tick).padStart(6, "0"),
      with_person_ids: r.with_person_ids,
    }));
    const facets: FacetRow[] = this.facets.filter((f) => f.live).map((f) => ({
      memory_item_id: f.item, slot: "residence", value_text: f.value_text, value_norm: f.value_norm, place_ref: f.place_ref,
      candidates: f.candidates, usual_ref: f.usual_ref,
    }));
    const capture = {
      id: `capture-${step}`, raw_text: note, occurred_at: `2026-10-16T17:${String(step).padStart(2, "0")}:00Z`,
      time_zone: "America/Los_Angeles", context_person_id: null,
    };
    return { ...buildInput(capture, this.people, this.related, items, facets), places: PLACES };
  }

  /**
   * write_extraction for one item (20261015090000, 20261016090000): the
   * target re-checked, an edited line closed only on the user's own
   * evidence, every other closure (closes, B4) re-checked the same way and
   * applied with it, the reading kept only on a new line, in its own words.
   */
  write(step: number, it: PlannedItem | ResolvedItem, answered: string | null): { id: string; action: string; closes: string[] } {
    const note = this.notes.get(step)!;
    const relatedId = this.relatedFor(it);
    let action = it.action.type;
    const target = it.action.target_id ? this.row(it.action.target_id) : undefined;
    if (action !== "new") {
      const protectedTarget = target && (target.user_state === "edited" || target.user_state === "user_authored");
      if (!target || target.deleted || target.person_id !== it.person_id || target.subject_type !== it.subject_type ||
          target.subject_related_id !== relatedId ||
          (protectedTarget && !(action === "supersede" && this.editedLineClosure(note, it, target, answered))) ||
          (action === "merge" && (target.kind !== it.kind || target.status !== "active")) ||
          (action === "supersede" && !["active", "resolved"].includes(target.status))) action = "new";
    }
    // The other lines it closes: each re-checked as the target is, a doubtful one dropped; at most 8, in order.
    const closes: string[] = [];
    if (action !== "merge" && Array.isArray(it.closes)) {
      for (const cid of it.closes) {
        if (closes.length >= 8) break;
        if (closes.includes(cid) || (action === "supersede" && cid === target!.id)) continue;
        const c = this.row(cid);
        if (!c || c.deleted || c.person_id !== it.person_id || c.subject_type !== it.subject_type || c.subject_related_id !== relatedId ||
            !["active", "resolved"].includes(c.status)) continue;
        if ((c.user_state === "edited" || c.user_state === "user_authored") && !this.editedLineClosure(note, it, c, answered)) continue;
        closes.push(cid);
      }
    }
    let id: string;
    if (action === "merge") {
      id = target!.id;
    } else {
      id = `item-${step}-${this.rows.length + 1}`;
      this.rows.push({
        id, person_id: it.person_id!, kind: it.kind, subject_type: it.subject_type, subject_related_id: relatedId,
        statement: it.statement, certainty: it.certainty, sensitivity: it.sensitivity, status: "active", user_state: "unreviewed",
        detail: { ...it.detail }, supersedes_id: action === "supersede" ? target!.id : null, closes_ids: closes,
        with_person_ids: it.with_person_ids ?? [], deleted: false, version: 1, steps: [], tick: ++this.tick,
      });
      // The apply triggers: what it replaces and every line it closes leave current truth (facets untouched).
      if (action === "supersede") target!.status = "superseded";
      for (const cid of closes) this.row(cid)!.status = "superseded";
      const facet = (it.facets ?? []).find((f) => f.slot === "residence");
      const row = this.row(id)!;
      if (facet && residenceEligible(row) && it.spans.some((s) => s.quote.includes(facet.value_text))) {
        this.facets.push({ ...facet, item: id, live: true });
      }
    }
    const row = this.row(id)!;
    for (const s of it.spans) this.sources.push({ item: id, step, quote: s.quote });
    if (!row.steps.includes(step)) row.steps.push(step);
    row.tick = ++this.tick;
    return { id, action, closes };
  }

  private relatedFor(it: PlannedItem | ResolvedItem): string | null {
    if (it.subject_type !== "related" || !it.related) return null;
    if (it.related.id) return it.related.id;
    const found = this.related.find((r) => r.person_id === it.person_id && r.relation === it.related!.relation);
    if (found) return found.id;
    const id = `related-${this.related.length + 1}`;
    this.related.push({ id, person_id: it.person_id!, relation: it.related.relation, name: it.related.name });
    return id;
  }

  /** edited_line_closure_ok (20261016090000), as the database reads it. */
  private editedLineClosure(note: string, it: PlannedItem | ResolvedItem, target: Row, answered: string | null): boolean {
    const transition = it.detail?.transition;
    if (transition !== "changed" && transition !== "corrected") return false;
    const facet = this.liveFacet(target.id);
    if (!facet || target.kind !== "fact" || target.with_person_ids.length) return false;
    if (!residenceEligible({ ...it, with_person_ids: it.with_person_ids ?? [] }) || !(it.facets ?? []).some((f) => f.slot === "residence")) return false;
    if (transition === "changed" && answered === target.id) return true;
    const cue = it.cue;
    if (!cue || !it.spans.some((s) => cue.start >= s.start && cue.end <= s.end)) return false;
    const words = Array.from(note).slice(cue.start, cue.end).join("").replace(/\s+/gu, " ").trim().toLowerCase();
    if (transition === "changed") {
      return /^((has|have|had|just|recently|finally|since) )*(moved|relocated)( back)?( from [^.,;:!?]{1,60})? to$/u.test(words) ||
        /^now (lives|living|resides|residing|is based|based|is living) in$/u.test(words) ||
        /^(lives|live|living|resides|reside|residing|is based|are based|based|is living|are living) in .{1,100} now$/u.test(words);
    }
    return /^(actually|i was wrong|i meant|correction)$/u.test(words) || (/^not /u.test(words) && words.includes(facet.value_text.toLowerCase()));
  }

  /**
   * Undo of a note: its own lines go; what they replaced and every line they
   * closed comes back, each unless another live line still closes it (the
   * restore trigger, 20261015090000; brief §10).
   */
  undo(step: number): void {
    for (const r of this.rows) {
      if (r.deleted || !(r.steps.length === 1 && r.steps[0] === step)) continue;
      r.deleted = true;
      for (const f of this.facets) if (f.item === r.id) f.live = false;
      for (const closed of [r.supersedes_id, ...r.closes_ids]) {
        const t = closed ? this.row(closed) : undefined;
        if (t && !t.deleted && t.status === "superseded" && !this.closedBy(t.id).some((o) => o.id !== r.id)) t.status = "active";
      }
    }
  }

  /** The live lines that replace or close this one. */
  closedBy(id: string): Row[] {
    return this.rows.filter((o) => !o.deleted && (o.supersedes_id === id || o.closes_ids.includes(id)));
  }

  /**
   * I13: the line moves to someone else, and names them (the app's correction: an edit); its reading is
   * tombstoned at once (the B2 trigger), and the app reports the edit (§5).
   */
  move(id: string, to: string): void {
    const r = this.row(id)!;
    const from = this.people.find((p) => p.id === r.person_id)?.display_name;
    r.person_id = this.personId(to);
    this.edit(id, from ? r.statement.replace(from, to) : r.statement, true, 0);
  }

  /** The user's edit (MemoryRepo.correct): the words change, the line is edited, its reading is tombstoned. */
  edit(id: string, statement: string, report: boolean, step: number): void {
    const r = this.row(id)!;
    r.statement = statement;
    r.user_state = "edited";
    r.version++;
    // Its user_edit source: the line's words are now the user's own (provenance).
    this.sources.push({ item: id, step, quote: statement, edit: true });
    for (const f of this.facets) if (f.item === id) f.live = false;
    if (report) this.reread(id);
  }

  /** Re-derivation (rederive.ts, as the gateway runs it) and write_facets' re-checks (20261015090000). */
  reread(id: string): void {
    const r = this.row(id)!;
    if (r.deleted || this.liveFacet(id) || !this.facets.some((f) => f.item === id)) return;
    const quotes = this.sources.filter((s) => s.item === id && !s.edit).map((s) => s.quote);
    const w = rederive({ ...r, with_person_ids: r.with_person_ids }, quotes, PLACES);
    const facet = w?.facets[0];
    if (!w || w.version !== r.version || !facet || !residenceEligible(r)) return;
    const own = r.user_state === "edited" || r.user_state === "user_authored"
      ? r.statement.includes(facet.value_text)
      : quotes.some((q) => q.includes(facet.value_text));
    if (own) this.facets.push({ ...facet, item: id, live: true });
  }

  /** The current residence lines of one person and subject (active, with a live reading). */
  current(personId: string, subject = "person", relatedId: string | null = null): Row[] {
    return this.rows.filter((r) =>
      !r.deleted && r.status === "active" && r.kind === "fact" && r.person_id === personId && r.subject_type === subject &&
      r.subject_related_id === relatedId && this.liveFacet(r.id)
    );
  }
}

// ─── The corpus's reading of a page (what B5 must be able to compose) ─────────

const RANK: Record<string, number> = { city: 0, region: 1, country: 2 };
function rank(f: FacetLike): number {
  const u = usualReading(f);
  return u ? RANK[u.level] : -1;
}

function render(w: World, rows: Row[]): { lines: string[]; groups: Row[][] } {
  const sorted = [...rows].sort((a, b) => rank(w.liveFacet(a.id)!) - rank(w.liveFacet(b.id)!) || b.tick - a.tick);
  const chain = sorted.length > 1 && sorted.slice(0, -1).every((r, i) => {
    const cls = pairClass(w.liveFacet(r.id)!, w.liveFacet(sorted[i + 1].id)!);
    return cls === "E_CONTAINS_N" || cls === "SAME";
  });
  const groups = chain ? [sorted] : sorted.map((r) => [r]);
  const lines = groups.map((g) => {
    const words: string[] = [];
    g.forEach((r, i) => {
      if (i > 0 && pairClass(w.liveFacet(g[i - 1].id)!, w.liveFacet(r.id)!) === "SAME") return;
      words.push(w.liveFacet(r.id)!.value_text);
    });
    return `Lives in ${words.join(", ")}`;
  });
  return { lines, groups };
}

/** A closed residence line is history only when its live closer records a change (§11, CC-20). */
function history(w: World, personId: string): string[] {
  return w.rows.filter((r) => !r.deleted && r.status === "superseded" && r.person_id === personId && r.subject_type === "person" &&
    w.liveFacet(r.id) && w.closedBy(r.id).some((c) => c.detail.transition === "changed"))
    .map((r) => `Previously lived in ${w.liveFacet(r.id)!.value_text}`);
}

// ─── Running a fixture ────────────────────────────────────────────────────────

const ZERO = [
  "incorrect_supersession", "wrong_same", "incorrect_refinement", "unsupported_composed_fact", "lost_provenance",
  "temporal_contradiction", "unsupported_history", "certainty_upgrade", "cross_person_contamination",
] as const;
type Metric = (typeof ZERO)[number];

interface Result {
  id: string;
  failures: string[];
  metrics: Partial<Record<Metric, string[]>>;
  deferred: string[];
  missedRefinements: string[];
}

const CERTAINTY_RANK: Record<string, number> = { stated: 3, planned: 2, reported: 1, tentative: 1, wished: 0 };

function outcomeOf(item: PlannedItem): string {
  if (item.residence) return item.residence;
  return item.action.type === "merge" ? "SAME" : item.action.type === "supersede" ? "SUPERSEDES" : "NEW";
}

function proposal(f: Fixture, step: NoteStep, w: World, input: ReturnType<World["input"]>): ModelProposal {
  const name = step.item.person ?? f.people[0];
  const key = input.roster.find((r) => r.display_name === name)?.key ?? "unknown";
  const kind = step.item.kind ?? "fact";
  const target = step.model?.target ? w.wrote.get(step.model.target) : undefined;
  const item: ProposedItem = {
    kind, person: key, person_mention: step.note.includes(name) ? name : null, subject: step.item.subject ?? "person",
    related_relation: step.item.related?.relation ?? null, related_name: step.item.related?.name ?? null,
    statement: step.item.statement, evidence: [step.item.evidence], certainty: step.item.certainty ?? "stated", sensitivity: "none",
    confidence: 0.95, date_text: null, date_direction: "past",
    detail: {
      event_type: null, event_goal: null, category: kind === "fact" ? "home" : null, attribute: null, value: null,
      firmness: kind === "plan" ? "intended" : null, topic: null, place: null, milestone_type: null, recurrence: null, anchor: null,
      aspect: null, time_of_day: null,
    },
    existing: step.model
      ? { action: step.model.action, target: target ? input.dossier.find((d) => d.id === target)?.key ?? null : null }
      : { action: "new", target: null },
  };
  return { items: [item], needs_clarification: null };
}

function heldOf(item: PlannedItem): HeldItem {
  return {
    kind: item.kind, person_id: item.person_id, new_person_name: item.new_person_name, subject_type: item.subject_type,
    related: item.related, statement: item.statement, detail: item.detail, certainty: item.certainty, sensitivity: item.sensitivity,
    confidence: item.confidence, action: item.action, tier: item.tier, flags: item.flags, spans: item.spans,
    ...(item.with_person_ids?.length ? { with_person_ids: item.with_person_ids } : {}),
    ...(item.facets?.length ? { facets: item.facets } : {}),
    ...(item.cue ? { cue: item.cue } : {}),
    ...(item.still_in ? { still_in: item.still_in } : {}),
  };
}

function run(f: Fixture): Result {
  const res: Result = { id: f.id, failures: [], metrics: {}, deferred: [], missedRefinements: [] };
  const fail = (m: string) => res.failures.push(m);
  const metric = (m: Metric, what: string, key?: string) => {
    if (key && DEFERRED[key]) return void res.deferred.push(`${key}: ${DEFERRED[key]}`);
    (res.metrics[m] ??= []).push(what);
  };
  const w = new World(f.people);

  f.steps.forEach((step, n) => {
    const at = n + 1;
    const tag = `${f.id}#${at}`;
    if ("undo" in step) {
      w.undo(step.undo);
      for (const s of step.expect.restored ?? []) {
        const r = w.row(w.wrote.get(s)!);
        if (r?.status !== "active" || r.deleted) fail(`${tag}: step ${s}'s line is not back after Undo`);
      }
      return;
    }
    if ("correct_person" in step) {
      w.move(w.wrote.get(step.correct_person.step)!, step.correct_person.to);
      return;
    }
    if ("edit" in step) {
      const id = w.wrote.get(step.edit.step)!;
      w.edit(id, step.edit.statement, step.edit.report ?? true, at);
      const facet = w.liveFacet(id);
      if (step.expect.facet !== undefined && !!facet !== step.expect.facet) fail(`${tag}: after the edit, facet ${!!facet}, expected ${step.expect.facet}`);
      if (step.expect.value_text !== undefined && facet?.value_text !== step.expect.value_text) {
        fail(`${tag}: after the edit, words ${facet?.value_text}, expected ${step.expect.value_text}`);
      }
      return;
    }
    w.notes.set(at, step.note);
    const input = w.input(at, step.note);
    const outcome = planExtraction(input, proposal(f, step, w, input));
    const item = outcome.items[0];
    if (!item) return fail(`${tag}: nothing kept (${outcome.dropped.map((d) => d.reason).join(", ")})`);
    const e = step.expect;
    const got = outcomeOf(item);
    const facet = item.facets?.[0];

    // ── The step's own expectations ──
    if (e.facet !== undefined && !!facet !== e.facet) fail(`${tag}: facet ${!!facet}, expected ${e.facet}`);
    if (e.outcome && got !== e.outcome) fail(`${tag}: ${got}, expected ${e.outcome}`);
    if (got === "SAME" && e.outcome !== "SAME") metric("wrong_same", tag);
    if (got === "REFINES" && e.outcome !== "REFINES") metric("incorrect_refinement", tag);
    if (e.outcome === "REFINES" && got === "NEW") res.missedRefinements.push(tag);
    if (e.value_text !== undefined && facet?.value_text !== e.value_text) fail(`${tag}: words ${facet?.value_text}, expected ${e.value_text}`);
    if (e.resolved !== undefined && !!facet?.place_ref !== e.resolved) fail(`${tag}: resolved ${!!facet?.place_ref}, expected ${e.resolved}`);
    if (e.candidates !== undefined && facet?.candidates.length !== e.candidates) {
      fail(`${tag}: ${facet?.candidates.length} readings, expected ${e.candidates}`);
    }
    if (facet && item.certainty !== "stated") metric("certainty_upgrade", `${tag}: a reading on a ${item.certainty} line`);
    if (CERTAINTY_RANK[item.certainty] > CERTAINTY_RANK[step.item.certainty ?? "stated"]) metric("certainty_upgrade", tag);
    if (e.question !== undefined || e.choices !== undefined) {
      const person = w.people.find((p) => p.id === item.person_id);
      const q = item.still_in && person ? residenceQuestion(shortName(person), item.still_in.words) : null;
      if (!item.flags.includes("residence_conflict") || item.tier !== "hold") fail(`${tag}: not held for the residence question`);
      if (e.question !== undefined && q?.prompt !== e.question) fail(`${tag}: asked ${JSON.stringify(q?.prompt)}, expected ${JSON.stringify(e.question)}`);
      if (e.choices && JSON.stringify(q ? [q.stay, q.moved] : null) !== JSON.stringify(e.choices)) {
        fail(`${tag}: choices ${JSON.stringify(q && [q.stay, q.moved])}, expected ${JSON.stringify(e.choices)}`);
      }
    }

    // ── Written (or answered), as the database writes it ──
    let written: { id: string; action: string; closes: string[] } | null = null;
    let closer: PlannedItem | ResolvedItem = item;
    if (item.tier === "hold") {
      if (!step.answer) return;
      const r = resolveHeld([heldOf(item)], [{ index: 0, moved: step.answer === "she_moved" }], {
        note: step.note,
        people: w.people.map((p) => ({ id: p.id, display_name: p.display_name, state: p.state })),
        related: w.related,
        existing: [],
      });
      if ("fail" in r) return fail(`${tag}: the answer was refused (${r.fail})`);
      closer = r.items[0];
      if (e.after_answer && !!closer.facets?.length !== e.after_answer.facet) fail(`${tag}: after the answer, facet ${!!closer.facets?.length}`);
      written = w.write(at, closer, step.answer === "she_moved" ? closer.action.target_id : null);
    } else {
      written = w.write(at, item, null);
    }
    w.wrote.set(at, written.id);
    if (step.protect) w.row(written.id)!.user_state = "edited";

    // ── What it closed: what it replaced, then every other line it closed (B4), the most specific first ──
    const closed = [...(written.action === "supersede" ? [closer.action.target_id!] : []), ...written.closes];
    // A question's "Susan moved" closes the line the question named (checked above, by its words) and what the
    // question carried with it; nothing else does.
    const expected = (e.closes ?? []).map((s) => w.wrote.get(s) ?? "");
    const allowed = e.outcome === "CONFLICT"
      ? (step.answer === "she_moved" && item.still_in ? [item.still_in.target_id, ...(item.still_in.closes ?? [])] : [])
      : expected;
    for (const id of closed) {
      if (!allowed.includes(id)) metric("incorrect_supersession", `${tag}: closed ${w.row(id)?.statement}`);
      const t = w.row(id)!;
      if (t.person_id !== closer.person_id || t.subject_type !== closer.subject_type) metric("cross_person_contamination", tag);
    }
    if (e.closes && (e.outcome !== "CONFLICT" || step.answer === "she_moved")) {
      if (JSON.stringify(closed) !== JSON.stringify(expected)) {
        fail(`${tag}: closed ${JSON.stringify(closed.map((id) => w.row(id)?.statement))}, expected steps ${JSON.stringify(e.closes)}`);
      }
    }
    const transition = (closer.detail?.transition as string | undefined) ?? null;
    if (e.transition !== undefined && closed.length && transition !== e.transition) fail(`${tag}: transition ${transition}, expected ${e.transition}`);
    if (closed.length && transition === "changed" && !(e.transition === "changed" || step.answer === "she_moved")) {
      metric("unsupported_history", `${tag}: closed as a change without the user's evidence`);
    }

    // ── After every step: never two current places Kinship knows can't both be true ──
    for (const p of w.people) {
      const cur = w.current(p.id);
      for (let i = 0; i < cur.length; i++) {
        for (let j = i + 1; j < cur.length; j++) {
          // Both ways: a pair is a contradiction only when neither reading could hold with the other (N14 is one-way).
          const [a, b] = [w.liveFacet(cur[i].id)!, w.liveFacet(cur[j].id)!];
          if (pairClass(a, b) === "DISJOINT" && pairClass(b, a) === "DISJOINT") {
            metric("temporal_contradiction", `${tag}: ${cur[i].statement} / ${cur[j].statement}`, `${tag}:contradiction`);
          }
        }
      }
    }
  });

  // ── The end state, page by page ──
  const pagesKey = `${f.id}:pages`;
  const pageFail = (m: string) => (DEFERRED[pagesKey] ? res.deferred.push(`${pagesKey}: ${DEFERRED[pagesKey]} (${m})`) : fail(m));
  const shown: string[] = [];
  for (const [name, page] of Object.entries(f.expect.pages)) {
    const pid = w.personId(name);
    const { lines, groups } = render(w, w.current(pid));
    const past = history(w, pid);
    shown.push(...lines, ...past);
    if (page.current && JSON.stringify([...lines].sort()) !== JSON.stringify([...page.current].sort())) {
      pageFail(`${f.id} ${name}: current ${JSON.stringify(lines)}, expected ${JSON.stringify(page.current)}`);
    }
    if (page.history && JSON.stringify([...past].sort()) !== JSON.stringify([...page.history].sort())) {
      pageFail(`${f.id} ${name}: history ${JSON.stringify(past)}, expected ${JSON.stringify(page.history)}`);
    }
    if (page.sources !== undefined) {
      const steps = new Set(w.sources.filter((s) => (groups[0] ?? []).some((r) => r.id === s.item)).map((s) => s.step));
      if (steps.size !== page.sources) pageFail(`${f.id} ${name}: ${steps.size} notes behind the line, expected ${page.sources}`);
    }
    if (page.active) {
      const active = w.rows.filter((r) => !r.deleted && r.status === "active" && (r.person_id === pid || r.with_person_ids.includes(pid)))
        .map((r) => r.statement);
      for (const s of page.active) if (!active.includes(s)) pageFail(`${f.id} ${name}: "${s}" is not current`);
    }
    for (const [relation, want] of Object.entries(page.related ?? {})) {
      const rel = w.related.find((r) => r.person_id === pid && r.relation === relation);
      const got = rel ? render(w, w.current(pid, "related", rel.id)).lines : [];
      shown.push(...got);
      if (JSON.stringify(got) !== JSON.stringify(want)) pageFail(`${f.id} ${name}'s ${relation}: ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
    // Composed lines say only what the members' own words say.
    for (const [i, g] of groups.entries()) {
      const parts = lines[i].replace(/^Lives in /u, "");
      const words = g.map((r) => w.liveFacet(r.id)!.value_text);
      if (!words.some((x) => parts.startsWith(x)) || parts.split(", ").some((p) => !words.some((x) => x.split(", ").includes(p)))) {
        metric("unsupported_composed_fact", `${f.id} ${name}: ${lines[i]}`);
      }
      for (const r of g) {
        if (!w.sources.some((s) => s.item === r.id && s.quote.includes(w.liveFacet(r.id)!.value_text))) metric("lost_provenance", `${f.id}: ${r.statement}`);
      }
    }
  }
  for (const bad of f.expect.must_not ?? []) {
    if (shown.some((l) => l.includes(bad))) pageFail(`${f.id}: "${bad}" is shown`);
  }
  return res;
}

// ─── The tests ────────────────────────────────────────────────────────────────

const RESULTS = FIXTURES.map(run);

Deno.test("semantic corpus: the fixtures are frozen in the manifest", async () => {
  const manifest = JSON.parse(Deno.readTextFileSync(new URL("./MANIFEST.json", import.meta.url)));
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(TEXT));
  const sha = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (manifest.files?.["fixtures/residence.jsonl"] !== sha || manifest.counts?.residence !== FIXTURES.length) {
    throw new Error(`fixtures/residence.jsonl changed (${FIXTURES.length} sequences, ${sha}): refreeze evals/semantic/MANIFEST.json`);
  }
});

Deno.test("semantic corpus: every sequence comes out as its fixture says", () => {
  const failures = RESULTS.flatMap((r) => r.failures);
  if (failures.length) throw new Error(`${failures.length} expectations not met:\n${failures.join("\n")}`);
});

Deno.test("semantic corpus: zero tolerance (CC-19, CC-20)", () => {
  const counts = Object.fromEntries(ZERO.map((m) => [m, RESULTS.flatMap((r) => r.metrics[m] ?? [])]));
  const bad = Object.entries(counts).filter(([, v]) => v.length);
  if (bad.length) throw new Error(bad.map(([m, v]) => `${m}: ${v.length}\n  ${v.join("\n  ")}`).join("\n"));
});

Deno.test("semantic corpus: what later steps deliver is reported, never silently skipped", () => {
  const deferred = RESULTS.flatMap((r) => r.deferred);
  const missed = RESULTS.flatMap((r) => r.missedRefinements);
  console.log(`  ${FIXTURES.length} sequences; deferred: ${deferred.length}; missed refinements (reported): ${missed.length}`);
  for (const d of new Set(deferred)) console.log(`    deferred ${d}`);
  for (const m of missed) console.log(`    missed refinement ${m}`);
  // Every entry in DEFERRED is still needed: a later step that delivers it removes it.
  const used = new Set(deferred.map((d) => d.split(": ")[0].replace(/ .*/u, "")));
  const stale = Object.keys(DEFERRED).filter((k) => !used.has(k));
  if (stale.length) throw new Error(`no longer deferred, remove from DEFERRED: ${stale.join(", ")}`);
});
