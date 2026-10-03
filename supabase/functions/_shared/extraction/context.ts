// Builds the model's context from the user's own rows (loaded server-side
// under their RLS; never from the request body). Plan §9 limits: roster of
// at most 200 people (names, nicknames, labels, related people only; no
// phone numbers or emails), dossiers for at most 3 candidate people, at most
// 40 active items in total.

import { fold, nameKey, wordsOf } from "./lexicon.ts";
import type { DossierItem, ExtractionInput, RosterPerson, RosterRelated } from "./types.ts";

export const ROSTER_MAX = 200;
export const DOSSIER_PEOPLE_MAX = 3;
export const DOSSIER_ITEMS_MAX = 40;

export interface PersonRow {
  id: string;
  display_name: string;
  full_name: string | null;
  nicknames: string[] | null;
  relationship_label: string | null;
  state: string;
  updated_at?: string;
}
export interface RelatedRow {
  id: string;
  person_id: string;
  relation: string;
  name: string | null;
}
export interface ItemRow {
  id: string;
  person_id: string;
  kind: DossierItem["kind"];
  subject_type: DossierItem["subject_type"];
  subject_related_id: string | null;
  statement: string;
  certainty: DossierItem["certainty"];
  status: string;
  user_state: DossierItem["user_state"];
  detail: Record<string, unknown>;
  updated_at?: string;
}
export interface CaptureRow {
  id: string;
  raw_text: string;
  occurred_at: string;
  time_zone: string | null;
  context_person_id: string | null;
}

function namedIn(text: string): (p: PersonRow) => boolean {
  const noteWords = new Set(wordsOf(text).map(nameKey));
  return (p: PersonRow) =>
    [p.display_name, p.full_name ?? "", ...(p.nicknames ?? [])].filter(Boolean).some((n) => {
      const k = nameKey(n);
      return noteWords.has(k) || noteWords.has(k.split(/\s+/)[0]) || (k.includes(" ") && fold(text).includes(k));
    });
}

/** The roster in prompt order: mentioned and context people first, then the most recently touched. */
function orderRoster(capture: CaptureRow, people: PersonRow[]): PersonRow[] {
  const named = namedIn(capture.raw_text.normalize("NFC"));
  // Archived people are out of the conversation; everyone else may be meant.
  const live = people.filter((p) => p.state !== "archived");
  return [...live].sort((a, b) => {
    const score = (p: PersonRow) => (p.id === capture.context_person_id ? 2 : 0) + (named(p) ? 1 : 0);
    return score(b) - score(a) || (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
  }).slice(0, ROSTER_MAX);
}

/** The (at most 3) people whose existing memories the model may see. */
export function dossierPeople(capture: CaptureRow, people: PersonRow[]): string[] {
  const named = namedIn(capture.raw_text.normalize("NFC"));
  return orderRoster(capture, people)
    .filter((p) => p.id === capture.context_person_id || named(p))
    .slice(0, DOSSIER_PEOPLE_MAX)
    .map((p) => p.id);
}

export function buildInput(capture: CaptureRow, people: PersonRow[], related: RelatedRow[], items: ItemRow[]): ExtractionInput {
  const text = capture.raw_text.normalize("NFC");
  const ordered = orderRoster(capture, people);

  const roster: RosterPerson[] = ordered.map((p, i) => ({
    key: `p${i + 1}`,
    id: p.id,
    display_name: p.display_name,
    full_name: p.full_name,
    nicknames: p.nicknames ?? [],
    relationship_label: p.relationship_label,
  }));
  const keyOf = new Map(roster.map((r) => [r.id, r.key]));
  const rosterRelated: RosterRelated[] = related
    .filter((r) => keyOf.has(r.person_id))
    .map((r, i) => ({ key: `r${i + 1}`, id: r.id, person_key: keyOf.get(r.person_id)!, relation: r.relation, name: r.name }));
  const relatedKey = new Map(rosterRelated.map((r) => [r.id, r.key]));

  const candidateIds = new Set(dossierPeople(capture, people));
  const dossier: DossierItem[] = items
    .filter((m) => candidateIds.has(m.person_id) && (m.status === "active" || m.status === "resolved"))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, DOSSIER_ITEMS_MAX)
    .map((m, i) => ({
      key: `m${i + 1}`,
      id: m.id,
      person_key: keyOf.get(m.person_id)!,
      kind: m.kind,
      subject_type: m.subject_type,
      related_key: m.subject_related_id ? relatedKey.get(m.subject_related_id) ?? null : null,
      statement: m.statement,
      certainty: m.certainty,
      status: m.status as "active" | "resolved",
      user_state: m.user_state,
      detail: m.detail ?? {},
    }));

  return {
    capture: {
      id: capture.id,
      raw_text: text,
      occurred_at: capture.occurred_at,
      time_zone: capture.time_zone,
      context_person_key: capture.context_person_id ? keyOf.get(capture.context_person_id) ?? null : null,
    },
    roster,
    related: rosterRelated,
    dossier,
  };
}
