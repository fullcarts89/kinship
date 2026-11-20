// CMR-1 evaluation corpus: natural narratives with per-fact ledgers (Core Memory Reliability,
// workstream D). Every person here is invented; nothing is taken from a real account.
//
// A narrative is one or more Tells (steps) by the same user against one roster. Each fact in its
// ledger names the exact words it rests on, who it is about, what the product should do with it
// (its disposition), what question if any is legitimate, whether Today may ever use it (Showing Up
// eligibility, docs/product/today-eligibility.md) and whether a careful reader would call it
// meaningful or incidental.

import type {
  Certainty,
  DossierItem,
  ExtractionInput,
  ExtractionOutcome,
  Kind,
  PlannedItem,
  Sensitivity,
  SubjectType,
} from "../../../supabase/functions/_shared/extraction/types.ts";
import type { Direction } from "../../../supabase/functions/_shared/extraction/dates.ts";
import {
  buildInput,
  type CaptureRow,
  type EarlierNote,
  type ItemRow,
  type PersonRow,
  type RelatedRow,
} from "../../../supabase/functions/_shared/extraction/context.ts";
import { codePointLength, utf16ToCodePoint } from "../../../supabase/functions/_shared/spans.ts";

export const CATEGORIES = [
  "everyday",
  "tender",
  "friends",
  "worklife",
  "celebrations",
  "preferences",
  "sensitive",
  "commitments",
  "multiperson",
  "relatives_pets",
  "voice_long",
  "repetition",
  "sequences",
  "no_person",
  "no_memory",
  "names",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DISPOSITIONS = ["retained", "dedup", "clarify", "confirm", "declined", "excluded", "not_understood_recoverable"] as const;
export type Disposition = (typeof DISPOSITIONS)[number];
export const CLARIFICATIONS = ["none", "which-person", "who-is-new", "sensitive-confirm", "date", "whose-promise"] as const;
export type ClarificationKind = (typeof CLARIFICATIONS)[number];
export type Split = "dev" | "heldout";

export interface RosterDef {
  people: { key: string; name: string; full?: string; nick?: string[]; label?: string }[];
  related: { key: string; person: string; relation: string; name?: string }[];
}

export interface Step {
  note: string;
  at: string;
  /** Roster key of the page the Tell was opened from; null for a general Tell. */
  context: string | null;
  /** "Tell the rest": this step continues the previous one (its words are context, never evidence). */
  continues?: boolean;
}

export interface Fact {
  id: string;
  /** Which step's note the span is in (default 0). */
  step: number;
  /** Exact words of the note this fact rests on. */
  span: string;
  /** Which occurrence when the words appear more than once (1-based; default 1, and then the span must be unique). */
  nth?: number;
  /** Roster key, "new:<Name>", "user" (the user's own promise or news) or "none". */
  subject: string;
  /** Whose page it files on when the subject is the user or a related someone (defaults to the subject's key). Any of a list. */
  on: string[];
  subject_type: SubjectType[];
  relation?: string[];
  rname?: string;
  /** Others the one memory is also about (roster keys); matching tolerates either as the filed person. */
  with?: string[];
  kind: Kind[];
  disposition: Disposition[];
  clarification: ClarificationKind[];
  /** For which-person: the only people the question may offer. */
  candidates?: string[];
  /** Showing Up: true/false by the product rules, null when the ledger does not judge it. */
  eligible: boolean | null;
  why?: string;
  meaningful: boolean;
  /** May appear or not; never counted for recall, precision or loss. */
  optional: boolean;
  statement?: string;
  certainty?: Certainty[];
  sensitivity?: Sensitivity[];
  date_text?: string;
  dir?: Direction;
  /** The resolved day the product should keep (checked when given). */
  date?: string;
  event_type?: string[];
  category?: string;
  mention?: string | null;
  /** "new", "merge:<fact id>", "supersede:<fact id>", "resolves:<fact id>", any of a list. */
  action?: string[];
  /** This fact repeats an earlier fact (same note or an earlier step): one memory, never two. */
  dedup_of?: string;
  /** How a real model has been seen to shape this proposal (used only with --realistic). */
  oracle_shape?: Record<string, unknown>;
}

export interface Narrative {
  id: string;
  category: Category;
  split: Split;
  roster: string;
  source: "typed" | "voice";
  tz: string;
  steps: Step[];
  facts: Fact[];
  /** The note contains instructions to the AI; injection_suspected should be true. */
  injection?: boolean;
  /** Roster keys no saved line may be filed on (namesakes, idioms, places that share a name). */
  must_not_people?: string[];
  notes?: string;
}

const asList = <T>(v: T | T[] | undefined): T[] | undefined => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/** Raw JSON shape, with every list-or-scalar field accepted either way. */
function normaliseFact(raw: Record<string, unknown>, id: string): Fact {
  const subject = String(raw.subject ?? "none");
  const subjectType = asList(raw.subject_type as SubjectType | SubjectType[]) ?? (subject === "user" ? ["user"] : ["person"]);
  const on = asList(raw.on as string | string[]) ?? (subject.startsWith("p") || subject.startsWith("new:") ? [subject] : []);
  const f: Fact = {
    id: String(raw.id),
    step: Number(raw.step ?? 0),
    span: String(raw.span),
    nth: raw.nth === undefined ? undefined : Number(raw.nth),
    subject,
    on,
    subject_type: subjectType,
    relation: asList(raw.relation as string | string[]),
    rname: raw.rname as string | undefined,
    with: raw.with as string[] | undefined,
    kind: asList(raw.kind as Kind | Kind[]) ?? ["fact"],
    disposition: asList(raw.disposition as Disposition | Disposition[]) ?? ["retained"],
    clarification: asList(raw.clarification as ClarificationKind | ClarificationKind[]) ?? ["none"],
    candidates: raw.candidates as string[] | undefined,
    eligible: raw.eligible === undefined ? false : (raw.eligible as boolean | null),
    why: raw.why as string | undefined,
    meaningful: raw.meaningful === undefined ? true : !!raw.meaningful,
    optional: !!raw.optional,
    statement: raw.statement as string | undefined,
    certainty: asList(raw.certainty as Certainty | Certainty[]),
    sensitivity: asList(raw.sensitivity as Sensitivity | Sensitivity[]),
    date_text: raw.date_text as string | undefined,
    dir: raw.dir as Direction | undefined,
    date: raw.date as string | undefined,
    event_type: asList(raw.event_type as string | string[]),
    category: raw.category as string | undefined,
    mention: raw.mention as string | null | undefined,
    action: asList(raw.action as string | string[]),
    dedup_of: raw.dedup_of as string | undefined,
    oracle_shape: raw.oracle_shape as Record<string, unknown> | undefined,
  };
  for (const d of f.disposition) if (!DISPOSITIONS.includes(d)) throw new Error(`${id}/${f.id}: unknown disposition ${d}`);
  for (const c of f.clarification) if (!CLARIFICATIONS.includes(c)) throw new Error(`${id}/${f.id}: unknown clarification ${c}`);
  if (f.disposition.includes("clarify") && f.clarification.every((c) => c === "none")) throw new Error(`${id}/${f.id}: clarify needs a clarification kind`);
  if (f.clarification.some((c) => c !== "none") && !f.disposition.some((d) => d === "clarify" || d === "confirm")) {
    throw new Error(`${id}/${f.id}: a clarification kind needs disposition clarify or confirm`);
  }
  return f;
}

function normalise(raw: Record<string, unknown>, file: string): Narrative {
  const id = String(raw.id);
  if (!raw.category || !CATEGORIES.includes(raw.category as Category)) throw new Error(`${file} ${id}: unknown category ${raw.category}`);
  if (raw.split !== "dev" && raw.split !== "heldout") throw new Error(`${file} ${id}: split must be dev or heldout`);
  const steps: Step[] = Array.isArray(raw.steps)
    ? (raw.steps as Record<string, unknown>[]).map((s) => ({
      note: String(s.note),
      at: String(s.at ?? raw.at),
      context: (s.context === undefined ? (raw.context as string | null | undefined) ?? null : s.context) as string | null,
      continues: !!s.continues,
    }))
    : [{ note: String(raw.note), at: String(raw.at), context: (raw.context as string | null | undefined) ?? null }];
  if (steps.some((s) => !s.note || !s.at || s.at === "undefined")) throw new Error(`${file} ${id}: every step needs a note and a time`);
  const facts = ((raw.facts as Record<string, unknown>[]) ?? []).map((f) => normaliseFact(f, id));
  const ids = new Set<string>();
  for (const f of facts) {
    if (ids.has(f.id)) throw new Error(`${id}: duplicate fact id ${f.id}`);
    ids.add(f.id);
    if (f.step >= steps.length) throw new Error(`${id}/${f.id}: step ${f.step} does not exist`);
    if (f.dedup_of && !facts.some((o) => o.id === f.dedup_of)) throw new Error(`${id}/${f.id}: dedup_of ${f.dedup_of} is not a fact here`);
    for (const a of f.action ?? []) {
      const target = a.split(":")[1];
      if (target && !facts.some((o) => o.id === target)) throw new Error(`${id}/${f.id}: action ${a} names no fact here`);
    }
  }
  return {
    id,
    category: raw.category as Category,
    split: raw.split,
    roster: String(raw.roster),
    source: (raw.source as "typed" | "voice") ?? "typed",
    tz: String(raw.tz),
    steps,
    facts,
    injection: !!raw.injection,
    must_not_people: raw.must_not_people as string[] | undefined,
    notes: raw.notes as string | undefined,
  };
}

export async function loadRosters(dir: string): Promise<Record<string, RosterDef>> {
  return JSON.parse(await Deno.readTextFile(`${dir}/rosters.json`));
}

export async function loadCorpus(dir: string, categories: readonly string[] = CATEGORIES): Promise<Narrative[]> {
  const out: Narrative[] = [];
  for (const cat of categories) {
    const file = `corpus/${cat}.jsonl`;
    const text = await Deno.readTextFile(`${dir}/${file}`);
    for (const [i, line] of text.split("\n").entries()) {
      if (!line.trim() || line.trim().startsWith("//")) continue;
      try {
        const n = normalise(JSON.parse(line), file);
        if (n.category !== cat) throw new Error(`category "${n.category}" in ${file}`);
        out.push(n);
      } catch (err) {
        throw new Error(`${file} line ${i + 1}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  const ids = new Set<string>();
  for (const n of out) {
    if (ids.has(n.id)) throw new Error(`duplicate narrative id ${n.id}`);
    ids.add(n.id);
  }
  return out;
}

export interface Span {
  start: number;
  end: number;
}

/** Where a fact's words are in its step's note, as a code-point span; throws when the ledger is wrong. */
export function locateFact(n: Narrative, f: Fact): Span {
  const note = n.steps[f.step].note.normalize("NFC");
  const needle = f.span.normalize("NFC");
  const starts: number[] = [];
  for (let i = note.indexOf(needle); i !== -1; i = note.indexOf(needle, i + 1)) starts.push(i);
  if (!starts.length) throw new Error(`${n.id}/${f.id}: span "${f.span}" is not in step ${f.step}'s note`);
  const nth = f.nth ?? 1;
  if (starts.length > 1 && f.nth === undefined) throw new Error(`${n.id}/${f.id}: span "${f.span}" occurs ${starts.length} times; give nth`);
  if (nth > starts.length) throw new Error(`${n.id}/${f.id}: span occurs ${starts.length} times, nth ${nth}`);
  const at = starts[nth - 1];
  return { start: utf16ToCodePoint(note, at), end: utf16ToCodePoint(note, at + needle.length) };
}

/** Every check a ledger must pass before anything runs: spans, rosters, people, lengths. */
export function validateCorpus(corpus: Narrative[], rosters: Record<string, RosterDef>): string[] {
  const problems: string[] = [];
  for (const n of corpus) {
    const r = rosters[n.roster];
    if (!r) {
      problems.push(`${n.id}: unknown roster ${n.roster}`);
      continue;
    }
    const keys = new Set(r.people.map((p) => p.key));
    const check = (k: string | undefined, what: string) => {
      if (k && k.startsWith("p") && !keys.has(k)) problems.push(`${n.id}: ${what} ${k} is not on roster ${n.roster}`);
    };
    for (const s of n.steps) check(s.context ?? undefined, "context");
    for (const k of n.must_not_people ?? []) check(k, "must_not_people");
    for (const f of n.facts) {
      try {
        locateFact(n, f);
      } catch (err) {
        problems.push(err instanceof Error ? err.message : String(err));
      }
      if (!(f.subject === "user" || f.subject === "none" || f.subject.startsWith("new:") || keys.has(f.subject))) {
        problems.push(`${n.id}/${f.id}: subject ${f.subject} is not on roster ${n.roster}`);
      }
      for (const k of f.on) if (!k.startsWith("new:")) check(k, `on`);
      for (const k of f.with ?? []) check(k, "with");
      for (const k of f.candidates ?? []) check(k, "candidates");
      if (f.subject_type.includes("related") && !f.relation && !f.rname) problems.push(`${n.id}/${f.id}: related needs a relation`);
    }
    if (n.category === "voice_long") {
      for (const [i, s] of n.steps.entries()) {
        if (codePointLength(s.note) <= 700) problems.push(`${n.id} step ${i}: a long transcript must be over 700 characters (${codePointLength(s.note)})`);
      }
    }
    if (n.source === "voice") {
      for (const [i, s] of n.steps.entries()) if (/[A-Z]/.test(s.note.replace(/\bI\b|\bI'/g, ""))) problems.push(`${n.id} step ${i}: a voice-style note has no capitals`);
    }
  }
  return problems;
}

// ─── The model's input for a step, built by the gateway's own context code ────

export interface StepState {
  /** Lines kept by earlier steps, as rows the gateway would have written. */
  items: ItemRow[];
  related: RelatedRow[];
  /** Fact id → the memory id its kept line was written as (for merge/supersede targets). */
  memoryOf: Map<string, string>;
  /** The previous step, for "Tell the rest". */
  previous: { note: string; personId: string | null } | null;
}

export function freshState(): StepState {
  return { items: [], related: [], memoryOf: new Map(), previous: null };
}

export function peopleRows(r: RosterDef): PersonRow[] {
  return r.people.map((p, i) => ({
    id: `id-${p.key}`,
    display_name: p.name,
    full_name: p.full ?? null,
    nicknames: p.nick ?? [],
    relationship_label: p.label ?? null,
    state: "active",
    updated_at: `2026-10-${String(28 - (i % 28)).padStart(2, "0")}T00:00:00Z`,
  }));
}

export function relatedRows(r: RosterDef): RelatedRow[] {
  return r.related.map((x) => ({ id: `id-${x.key}`, person_id: `id-${x.person}`, relation: x.relation, name: x.name ?? null }));
}

/** The gateway's context builder; the runner can pass another tree's (`--shared`) to grade one model output through two pipelines. */
export type BuildInput = typeof buildInput;

export function stepInput(n: Narrative, stepIndex: number, rosters: Record<string, RosterDef>, state: StepState, build: BuildInput = buildInput): ExtractionInput {
  const r = rosters[n.roster];
  const step = n.steps[stepIndex];
  const capture: CaptureRow = {
    id: `cap-${n.id}-s${stepIndex}`,
    raw_text: step.note.normalize("NFC"),
    occurred_at: step.at,
    time_zone: n.tz,
    context_person_id: step.context ? `id-${step.context}` : null,
  };
  const earlier: EarlierNote | null = step.continues && state.previous ? { raw_text: state.previous.note, person_id: state.previous.personId } : null;
  return build(capture, peopleRows(r), [...relatedRows(r), ...state.related], state.items, [], earlier);
}

/**
 * What the gateway would hold after this step, as the next step's dossier: every kept line
 * (auto or confirm) becomes a row; a merge adds none; a supersede or resolve closes its target.
 */
export function advance(n: Narrative, stepIndex: number, outcome: ExtractionOutcome | null, state: StepState, factOf: (item: PlannedItem) => string | null): StepState {
  const items = state.items.map((x) => ({ ...x }));
  const related = [...state.related];
  const memoryOf = new Map(state.memoryOf);
  const step = n.steps[stepIndex];
  let personForNext: string | null = step.context ? `id-${step.context}` : null;
  if (outcome) {
    const kept = outcome.items.filter((i) => (i.tier === "auto" || i.tier === "confirm") && i.person_id);
    if (!personForNext) {
      const people = new Set(kept.map((i) => i.person_id));
      if (people.size === 1) personForNext = [...people][0]!;
    }
    kept.forEach((it, k) => {
      if (it.action.type === "merge" && it.action.target_id) {
        const f = factOf(it);
        if (f) memoryOf.set(f, it.action.target_id);
        return;
      }
      if ((it.action.type === "supersede" || it.action.type === "resolves") && it.action.target_id) {
        const t = items.find((x) => x.id === it.action.target_id);
        if (t) t.status = "resolved";
      }
      let relatedId = it.related?.id ?? null;
      if (it.related && !relatedId) {
        relatedId = `id-rel-${n.id}-s${stepIndex}-${k}`;
        related.push({ id: relatedId, person_id: it.person_id!, relation: it.related.relation, name: it.related.name });
      }
      const id = `id-mem-${n.id}-s${stepIndex}-${k}`;
      items.push({
        id,
        person_id: it.person_id!,
        kind: it.kind,
        subject_type: it.subject_type,
        subject_related_id: relatedId,
        statement: it.statement,
        certainty: it.certainty,
        status: "active",
        user_state: "unreviewed",
        detail: it.detail,
        updated_at: step.at,
        with_person_ids: it.with_person_ids ?? null,
      });
      const f = factOf(it);
      if (f) memoryOf.set(f, id);
    });
  }
  return { items, related, memoryOf, previous: { note: step.note, personId: personForNext } };
}

/** The dossier key the model would see for a memory id, in this step's input. */
export function dossierKey(input: ExtractionInput, memoryId: string): string | null {
  return input.dossier.find((d: DossierItem) => d.id === memoryId)?.key ?? null;
}
