// Builds the model's context from the user's own rows (loaded server-side
// under their RLS; never from the request body).
//
// D2 (minimal context): the model sees only the people needed to resolve
// this note: those it names (any name, nickname or first name, accents
// ignored), the person whose page it was written on, and people a family
// word in it could mean ("my mom" → whoever is Mom). Never the whole list.
// For each: names, nicknames, relationship label and related people; never
// phone numbers, emails or addresses. Dossiers: at most 3 of those people,
// at most 40 active items in total (plan §9).
//
// Someone the note names who isn't on the list stays unknown to the model,
// which proposes "new"; the pipeline then asks rather than guessing.

import { fold, kinshipReference, nameKey, relationKey, wordsOf } from "./lexicon.ts";
import { mentionsOf } from "./names.ts";
import type { DossierItem, ExtractionInput, RosterPerson, RosterRelated } from "./types.ts";

export const ROSTER_MAX = 30;
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
  /**
   * Words this person's own lines use for them (memory_items.person_mentions,
   * founder I12): "Wifey" for someone since renamed "Loo Loo". A later note
   * that says them finds this person; never anyone else's.
   */
  mention_names?: string[];
  /** Of those, the words recorded under an earlier name of theirs. */
  earlier_names?: string[];
}

/** The names a person goes by, or that their lines use for them. */
function namesOf(p: PersonRow): string[] {
  return [p.display_name, p.full_name ?? "", ...(p.nicknames ?? []), ...(p.mention_names ?? [])].filter(Boolean);
}

/**
 * The people, each with the words their own lines use for them (founder
 * I12), from those lines' recorded mentions: all of them, and those recorded
 * under an earlier name (the name they went by then isn't theirs now).
 */
export function withLineNames<P extends PersonRow>(people: P[], rows: { person_mentions?: unknown }[]): P[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const found = new Map<string, { names: Map<string, string>; earlier: Map<string, string> }>();
  for (const row of rows) {
    for (const m of mentionsOf(row.person_mentions)) {
      const p = m.person_id ? byId.get(m.person_id) : undefined;
      if (!p) continue;
      const entry = found.get(p.id) ?? { names: new Map<string, string>(), earlier: new Map<string, string>() };
      const k = fold(m.text.trim());
      entry.names.set(k, m.text.trim());
      if (m.name === null || m.name !== p.display_name.trim()) entry.earlier.set(k, m.text.trim());
      found.set(p.id, entry);
    }
  }
  return people.map((p) => {
    const e = found.get(p.id);
    return e ? { ...p, mention_names: [...e.names.values()].slice(0, 10), earlier_names: [...e.earlier.values()].slice(0, 10) } : p;
  });
}

/** The words their lines use for them that aren't already a name of theirs (for matching and "also called"). */
function lineNames(p: PersonRow): string[] {
  const own = new Set([p.display_name, p.full_name ?? "", ...(p.nicknames ?? [])].filter(Boolean)
    .flatMap((n) => [fold(n.trim()), fold(n.trim().split(/\s+/u)[0])]));
  const out = new Map<string, string>();
  for (const n of p.mention_names ?? []) {
    const k = fold(n.trim());
    if (!k || own.has(k) || out.has(k)) continue;
    out.set(k, n.trim());
  }
  return [...out.values()].slice(0, 10);
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
  with_person_ids?: string[] | null;
}
/** A residence facet as the gateway reads it (memory_item_facets, Phase 4B B3): live ones only. */
export interface FacetRow {
  memory_item_id: string;
  slot: string;
  value_text: string;
  value_norm: string;
  place_ref: string | null;
  candidates: unknown;
  usual_ref: string | null;
  deleted_at?: string | null;
}
export interface CaptureRow {
  id: string;
  raw_text: string;
  occurred_at: string;
  time_zone: string | null;
  context_person_id: string | null;
  /** What an earlier understanding did not get to (Option A); null or absent when none. */
  coverage?: unknown;
  /** The note this one tells the rest of (Option A); null or absent when none. */
  continues_capture_id?: string | null;
}

/** The earlier note a continuation carries on from (CER-1): its words, and who it was about. */
export interface EarlierNote {
  raw_text: string;
  /** The person the earlier note was told about, or the one person all its kept lines were about. */
  person_id: string | null;
}

function namedIn(text: string): (p: PersonRow) => boolean {
  const noteWords = new Set(wordsOf(text).map(nameKey));
  return (p: PersonRow) =>
    namesOf(p).some((n) => {
      const k = nameKey(n);
      return noteWords.has(k) || noteWords.has(k.split(/\s+/)[0]) || (k.includes(" ") && fold(text).includes(k));
    });
}

/** Family words in the note ("mom", "grandma", "sister"). */
function kinWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of wordsOf(text)) {
    const k = kinshipReference(w);
    if (k) out.add(k);
  }
  return out;
}

/** The people this note could be about, context person first, then named, then family words. */
function orderRoster(capture: CaptureRow, people: PersonRow[], related: RelatedRow[]): PersonRow[] {
  const text = capture.raw_text.normalize("NFC");
  const nameMatch = namedIn(text);
  // "Leo broke his arm": Leo is David's son, so David is in the conversation.
  const viaRelated = new Set(
    related.filter((r) => r.name && nameMatch({ id: "", display_name: r.name, full_name: null, nicknames: [], relationship_label: null, state: "active" }))
      .map((r) => r.person_id),
  );
  const named = (p: PersonRow) => nameMatch(p) || viaRelated.has(p.id);
  const kin = kinWords(text);
  const kinMatch = (p: PersonRow) =>
    kin.size > 0 && [p.display_name, ...(p.nicknames ?? []), ...(p.mention_names ?? []), ...wordsOf(p.relationship_label ?? "")]
      .some((n) => kin.has(relationKey(n)));
  // Archived people are out of the conversation; everyone else may be meant.
  const score = (p: PersonRow) => (p.id === capture.context_person_id ? 4 : 0) + (named(p) ? 2 : 0) + (kinMatch(p) ? 1 : 0);
  return people
    .filter((p) => p.state !== "archived" && score(p) > 0)
    .sort((a, b) => score(b) - score(a) || (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, ROSTER_MAX);
}

/** The (at most 3) people whose existing memories the model may see. */
export function dossierPeople(capture: CaptureRow, people: PersonRow[], related: RelatedRow[]): string[] {
  const nameMatch = namedIn(capture.raw_text.normalize("NFC"));
  const viaRelated = new Set(
    related.filter((r) => r.name && nameMatch({ id: "", display_name: r.name, full_name: null, nicknames: [], relationship_label: null, state: "active" }))
      .map((r) => r.person_id),
  );
  return orderRoster(capture, people, related)
    .filter((p) => p.id === capture.context_person_id || nameMatch(p) || viaRelated.has(p.id))
    .slice(0, DOSSIER_PEOPLE_MAX)
    .map((p) => p.id);
}

/**
 * The capture as the roster and dossier should read it when it continues an earlier note (CER-1): the
 * earlier words count for who is in the conversation, and its person is this note's context person when
 * this one has none. The note's own text is untouched: evidence is located in it alone.
 */
export function withEarlier(capture: CaptureRow, earlier: EarlierNote | null): CaptureRow {
  if (!earlier) return capture;
  return {
    ...capture,
    raw_text: earlier.raw_text.trim() ? `${earlier.raw_text.normalize("NFC")}\n${capture.raw_text.normalize("NFC")}` : capture.raw_text,
    context_person_id: capture.context_person_id ?? earlier.person_id ?? null,
  };
}

export function buildInput(
  capture: CaptureRow,
  people: PersonRow[],
  related: RelatedRow[],
  items: ItemRow[],
  facets: FacetRow[] = [],
  earlier: EarlierNote | null = null,
): ExtractionInput {
  const text = capture.raw_text.normalize("NFC");
  // A note that tells the rest of an earlier one (CER-1): the people of both notes are in the
  // conversation, and the earlier note's person stands in when this one was told from no page.
  const scope = withEarlier(capture, earlier);
  const ordered = orderRoster(scope, people, related);

  // Removed from People (founder I3): never the model's; code checks names against them.
  const archived = people.filter((p) => p.state === "archived")
    .map((p) => ({ id: p.id, display_name: p.display_name, full_name: p.full_name, nicknames: p.nicknames ?? [] }));
  const roster: RosterPerson[] = ordered.map((p, i) => {
    const lines = lineNames(p);
    const earlier = [...new Set([...(p.nicknames ?? []), ...(p.earlier_names ?? [])])];
    return {
      key: `p${i + 1}`,
      id: p.id,
      display_name: p.display_name,
      full_name: p.full_name,
      nicknames: p.nicknames ?? [],
      relationship_label: p.relationship_label,
      ...(lines.length ? { line_names: lines } : {}),
      ...(earlier.length ? { earlier_names: earlier } : {}),
    };
  });
  const keyOf = new Map(roster.map((r) => [r.id, r.key]));
  const rosterRelated: RosterRelated[] = related
    .filter((r) => keyOf.has(r.person_id))
    .map((r, i) => ({ key: `r${i + 1}`, id: r.id, person_key: keyOf.get(r.person_id)!, relation: r.relation, name: r.name }));
  const relatedKey = new Map(rosterRelated.map((r) => [r.id, r.key]));

  const candidateIds = new Set(dossierPeople(scope, people, related));
  // Each line's live residence reading, when the server derived one (code only; never in the prompt).
  const facetOf = new Map(facets
    .filter((f) => f.slot === "residence" && !f.deleted_at && Array.isArray(f.candidates))
    .map((f) => [f.memory_item_id, {
      value_text: f.value_text, value_norm: f.value_norm, place_ref: f.place_ref ?? null,
      candidates: f.candidates as NonNullable<DossierItem["facet"]>["candidates"], usual_ref: f.usual_ref ?? null,
    }]));
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
      ...(Array.isArray(m.with_person_ids) && m.with_person_ids.some((id) => keyOf.has(id))
        ? { with_person_keys: m.with_person_ids.filter((id) => keyOf.has(id)).map((id) => keyOf.get(id)!) }
        : {}),
      ...(Array.isArray(m.with_person_ids) && m.with_person_ids.length ? { shared: true } : {}),
      ...(facetOf.has(m.id) ? { facet: facetOf.get(m.id)! } : {}),
    }));

  return {
    capture: {
      id: capture.id,
      raw_text: text,
      occurred_at: capture.occurred_at,
      time_zone: capture.time_zone,
      context_person_key: scope.context_person_id ? keyOf.get(scope.context_person_id) ?? null : null,
      ...(earlier?.raw_text.trim() ? { earlier_text: earlier.raw_text.normalize("NFC").slice(0, 4000) } : {}),
    },
    roster,
    related: rosterRelated,
    dossier,
    ...(archived.length ? { archived } : {}),
  };
}
