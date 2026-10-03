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
  subject?: SubjectType;
  relation?: string;
  certainty?: Certainty | Certainty[];
  sensitivity?: Sensitivity | Sensitivity[];
  event_type?: string;
  goal_includes?: string;
  date?: string | null;
  date_end?: string | null;
  precision?: string;
  date_type?: "explicit" | "relative";
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

export function toInput(f: Fixture, rosters: Record<string, RosterDef>): ExtractionInput {
  const r = rosters[f.roster];
  if (!r) throw new Error(`${f.id}: unknown roster ${f.roster}`);
  return {
    capture: {
      id: `cap-${f.id}`,
      raw_text: f.note.normalize("NFC"),
      occurred_at: f.at,
      time_zone: f.tz,
      context_person_key: f.context ?? null,
    },
    roster: r.people.map((p) => ({
      key: p.key,
      id: `id-${p.key}`,
      display_name: p.name,
      full_name: p.full ?? null,
      nicknames: p.nick ?? [],
      relationship_label: p.label ?? null,
    })),
    related: r.related.map((x) => ({ key: x.key, id: `id-${x.key}`, person_key: x.person, relation: x.relation, name: x.name ?? null })),
    dossier: (f.dossier ?? []).map((d) => ({
      ...d,
      id: `id-${d.key}`,
      related_key: d.related_key ?? null,
      status: d.status ?? "active",
      user_state: d.user_state ?? "unreviewed",
    })),
  };
}

/**
 * What a perfect model would propose for this fixture. Running the pipeline
 * on it checks the fixtures and the deterministic code agree (a fixture
 * error found here costs nothing; one found in a paid run costs a run).
 */
export function oracleProposal(f: Fixture, rosters: Record<string, RosterDef>): ModelProposal {
  const people = rosters[f.roster].people;
  const items: ProposedItem[] = f.expect.items.map((e) => {
    const kind = Array.isArray(e.kind) ? e.kind[0] : e.kind;
    const isNew = e.person.startsWith("new:");
    const person = people.find((p) => p.key === e.person);
    const mention = e.mention ?? (isNew ? e.person.slice(4) : person && f.note.includes(person.name) ? person.name : null);
    const [act, target] = (e.proposed_action ?? (Array.isArray(e.action) ? e.action[0] : e.action) ?? "new").split(":");
    return {
      kind,
      person: isNew ? "new" : e.person,
      person_mention: mention,
      subject: e.subject ?? (kind === "promise" ? "user" : "person"),
      related_relation: e.relation ?? null,
      related_name: e.rname ?? null,
      statement: e.evidence,
      evidence: [e.evidence],
      certainty: (Array.isArray(e.certainty) ? e.certainty[0] : e.certainty) ?? "stated",
      sensitivity: (Array.isArray(e.sensitivity) ? e.sensitivity[0] : e.sensitivity) ?? "none",
      confidence: 0.95,
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
      existing: { action: act as Action, target: target ?? null },
    };
  });
  return { items, needs_clarification: null };
}
