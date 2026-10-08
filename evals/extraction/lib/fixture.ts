// Eval fixtures for relationship_extract (plan §10). Written by the team from
// patterns, never taken from real users' data.

import type {
  Action,
  Certainty,
  DossierItem,
  ExtractionInput,
  Kind,
  ModelProposal,
  ProposedItem,
  Sensitivity,
  SubjectType,
} from "../../../supabase/functions/_shared/extraction/types.ts";
import type { Direction } from "../../../supabase/functions/_shared/extraction/dates.ts";
import {
  buildInput,
  type CaptureRow,
  type ItemRow,
  type PersonRow,
  type RelatedRow,
} from "../../../supabase/functions/_shared/extraction/context.ts";

export const SETS = ["core", "ambiguity", "dates", "sensitive", "adversarial", "merge"] as const;
export type SetName = (typeof SETS)[number];

export interface RosterDef {
  people: { key: string; name: string; full?: string; nick?: string[]; label?: string }[];
  related: { key: string; person: string; relation: string; name?: string }[];
}

export interface ExpectedItem {
  /** Exact words of the note this item rests on (used to match predictions). */
  evidence: string;
  kind: Kind | Kind[];
  /** Roster key, or "new:<Name>" for someone not on the roster (should be held). */
  person: string;
  /** One subject, or several when the note genuinely reads either way (documented per fixture). */
  subject?: SubjectType | SubjectType[];
  relation?: string;
  certainty?: Certainty | Certainty[];
  sensitivity?: Sensitivity | Sensitivity[];
  event_type?: string;
  goal_includes?: string;
  date?: string | null;
  date_end?: string | null;
  precision?: string;
  date_type?: "explicit" | "relative";
  /**
   * C-4: true when another ordinary reading of the date words is plausible,
   * so the item must be flagged, shown for confirmation and keep the user's
   * words as a hint; false when the date is clear and must not be flagged.
   */
  date_confirm?: boolean;
  /** "new" | "merge:m1" | "supersede:m1" | "resolves:m1", or any of a list. */
  action?: string | string[];
  statement_includes?: string[];
  statement_excludes?: string[];
  /** Must not be auto-saved (sensitive, reported, new person…). */
  not_auto?: boolean;
  /** Must be held for a question rather than saved. */
  held?: boolean;
  /** Optional: may be missed without hurting recall. */
  optional?: boolean;
  // Oracle hints (how a correct model would phrase its proposal).
  mention?: string;
  rname?: string;
  category?: string;
  recurrence?: string;
  anchor?: string;
  /** What a reasonable model would propose, when it differs from the expected outcome. */
  proposed_action?: string;
  /** The kind a model may wrongly propose ("promise" for "he's booking the flights", founder J11). */
  proposed_kind?: Kind;
  date_text?: string;
  dir?: Direction;
}

export interface MustNot {
  statement_matches?: string;
  person?: string;
  kind?: Kind;
  certainty?: Certainty;
  subject?: SubjectType;
  why: string;
}

export interface Fixture {
  id: string;
  set: SetName;
  tags: string[];
  note: string;
  at: string;
  tz: string | null;
  roster: string;
  context?: string | null;
  dossier?: (Omit<DossierItem, "id" | "related_key" | "status" | "user_state"> & {
    related_key?: string | null;
    status?: DossierItem["status"];
    user_state?: DossierItem["user_state"];
  })[];
  expect: {
    items: ExpectedItem[];
    clarify?: boolean;
    clarify_about?: "person" | "subject" | "new_person" | "date";
    must_not?: MustNot[];
    /** Instruction text in the note: no saved item may rest on it. */
    forbidden_evidence?: string[];
    /** Any saved item beyond the expected ones is an error. */
    exhaustive?: boolean;
  };
}

export async function loadRosters(dir: string): Promise<Record<string, RosterDef>> {
  return JSON.parse(await Deno.readTextFile(`${dir}/rosters.json`));
}

export async function loadFixtures(dir: string, sets: readonly string[]): Promise<Fixture[]> {
  const out: Fixture[] = [];
  for (const set of sets) {
    const text = await Deno.readTextFile(`${dir}/fixtures/${set}.jsonl`);
    for (const [i, line] of text.split("\n").entries()) {
      if (!line.trim() || line.trim().startsWith("//")) continue;
      try {
        const f = JSON.parse(line) as Fixture;
        if (f.set !== set) throw new Error(`set "${f.set}" in ${set}.jsonl`);
        out.push(f);
      } catch (err) {
        throw new Error(`${set}.jsonl line ${i + 1}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  const ids = new Set<string>();
  for (const f of out) {
    if (ids.has(f.id)) throw new Error(`duplicate fixture id ${f.id}`);
    ids.add(f.id);
  }
  return out;
}

/**
 * The model's input, built by the gateway's own context code (buildInput)
 * from rows shaped like the database's, so the eval exercises the same
 * minimal-context selection as production. Fixture keys become ids
 * ("p3" → "id-p3"); buildInput assigns its own prompt keys.
 */
export function toInput(f: Fixture, rosters: Record<string, RosterDef>): ExtractionInput {
  const r = rosters[f.roster];
  if (!r) throw new Error(`${f.id}: unknown roster ${f.roster}`);
  const capture: CaptureRow = {
    id: `cap-${f.id}`,
    raw_text: f.note.normalize("NFC"),
    occurred_at: f.at,
    time_zone: f.tz,
    context_person_id: f.context ? `id-${f.context}` : null,
  };
  const people: PersonRow[] = r.people.map((p, i) => ({
    id: `id-${p.key}`,
    display_name: p.name,
    full_name: p.full ?? null,
    nicknames: p.nick ?? [],
    relationship_label: p.label ?? null,
    state: "active",
    updated_at: `2026-09-${String(28 - (i % 28)).padStart(2, "0")}T00:00:00Z`,
  }));
  const related: RelatedRow[] = r.related.map((x) => ({ id: `id-${x.key}`, person_id: `id-${x.person}`, relation: x.relation, name: x.name ?? null }));
  const items: ItemRow[] = (f.dossier ?? []).map((d) => ({
    id: `id-${d.key}`,
    person_id: `id-${d.person_key}`,
    kind: d.kind,
    subject_type: d.subject_type,
    subject_related_id: d.related_key ? `id-${d.related_key}` : null,
    statement: d.statement,
    certainty: d.certainty,
    status: d.status ?? "active",
    user_state: d.user_state ?? "unreviewed",
    detail: d.detail,
  }));
  return buildInput(capture, people, related, items);
}

/** Fixture person key ("p3") of a planned item, or "new:<name>" / "unknown". */
export function fixtureKey(personId: string | null, newName: string | null): string {
  if (personId) return personId.replace(/^id-/, "");
  return newName ? `new:${newName}` : "unknown";
}

/**
 * What a perfect model would propose for this fixture. Running the pipeline
 * on it checks the fixtures and the deterministic code agree (a fixture
 * error found here costs nothing; one found in a paid run costs a run).
 */
/**
 * With `realistic`, phrase it the way the live model did in the smoke run
 * (founder review, stage 2): quotes carry their sentence punctuation,
 * relation words are normalised ("mom" → "mother"), and a note with two
 * people who fit is answered with low confidence plus a question. CI runs
 * both, so guard over-reach on real phrasing is caught for free.
 */
export function oracleProposal(f: Fixture, rosters: Record<string, RosterDef>, input: ExtractionInput, opts: { realistic?: boolean } = {}): ModelProposal {
  const realistic = !!opts.realistic;
  const NORMAL: Record<string, string> = { mom: "mother", dad: "father", mum: "mother", grandma: "grandmother" };
  // The live model often quotes the whole sentence ("Ben hates surprises, so
  // no surprise party."): extend a quote to its sentence end when no other
  // expected item's words lie in between.
  const note = f.note.normalize("NFC");
  const withStop = (ev: string) => {
    if (!realistic) return ev;
    const at = note.indexOf(ev);
    if (at < 0) return ev;
    const end = at + ev.length;
    const stop = note.slice(end).search(/[.!?\n]/);
    const sentenceEnd = stop < 0 ? note.length : end + stop + (note[end + stop] === "\n" ? 0 : 1);
    const others = [...f.expect.items.map((x) => x.evidence), ...(f.expect.forbidden_evidence ?? [])]
      .map((x) => note.indexOf(x)).filter((p) => p > at && p < sentenceEnd);
    if (others.length === 0 && !/[\n]/.test(note.slice(end, sentenceEnd))) return note.slice(at, sentenceEnd).trimEnd();
    const next = note[end];
    return next && /[.!?]/.test(next) ? ev + next : ev;
  };
  const asks = realistic && f.expect.clarify_about === "person";
  const people = rosters[f.roster].people;
  const promptKey = (fixtureKey: string) => input.roster.find((p) => p.id === `id-${fixtureKey}`)?.key ?? "unknown";
  const dossierKey = (fixtureKey: string) => input.dossier.find((d) => d.id === `id-${fixtureKey}`)?.key ?? fixtureKey;
  const items: ProposedItem[] = f.expect.items.map((e) => {
    const kind = e.proposed_kind ?? (Array.isArray(e.kind) ? e.kind[0] : e.kind);
    const isNew = e.person.startsWith("new:");
    const person = people.find((p) => p.key === e.person);
    const mention = e.mention ?? (isNew ? e.person.slice(4) : person && f.note.includes(person.name) ? person.name : null);
    const [act, target] = (e.proposed_action ?? (Array.isArray(e.action) ? e.action[0] : e.action) ?? "new").split(":");
    return {
      kind,
      person: isNew ? "new" : promptKey(e.person),
      person_mention: mention,
      subject: (Array.isArray(e.subject) ? e.subject[0] : e.subject) ?? (kind === "promise" ? "user" : "person"),
      related_relation: e.relation ? (realistic ? NORMAL[e.relation] ?? e.relation : e.relation) : null,
      related_name: e.rname ?? null,
      statement: e.evidence,
      evidence: [withStop(e.evidence)],
      certainty: (Array.isArray(e.certainty) ? e.certainty[0] : e.certainty) ?? "stated",
      sensitivity: (Array.isArray(e.sensitivity) ? e.sensitivity[0] : e.sensitivity) ?? "none",
      confidence: asks ? 0.4 : 0.95,
      date_text: e.date_text ?? null,
      date_direction: e.dir ?? "future",
      detail: {
        event_type: (e.event_type ?? (kind === "event" ? "other" : null)) as ProposedItem["detail"]["event_type"],
        event_goal: e.goal_includes ?? null,
        category: (e.category ?? (kind === "fact" ? "other" : null)) as ProposedItem["detail"]["category"],
        attribute: null,
        value: null,
        firmness: kind === "plan" ? "idea" : null,
        topic: null,
        place: null,
        milestone_type: null,
        recurrence: (e.recurrence ?? null) as ProposedItem["detail"]["recurrence"],
        anchor: e.anchor ?? null,
        aspect: kind === "context" ? "other" : null,
        time_of_day: null,
      },
      existing: { action: act as Action, target: target ? dossierKey(target) : null },
    };
  });
  const mention = f.expect.items.find((e) => e.mention)?.mention ?? null;
  return { items, needs_clarification: asks ? { about: "person", mention } : null };
}
