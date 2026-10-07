// Resolving a held extraction (founder decision C-2, Checkpoint D1).
//
// A held item waits in capture_reviews for one answer: which person, whether
// it is about the person or their relative, whether to add someone new, or
// what date a health event is on. This file applies the user's answer to the
// stored interpretation and checks it again, deterministically:
//
//   * the answer may settle only what the item was held for, and only with
//     values the review allows: one of the user's own people, the new name
//     the note itself gave, a relation word the note itself uses, a real
//     calendar date;
//   * every held item gets an answer (or is skipped), so nothing is saved on
//     a guess and nothing is silently lost;
//   * a merge or supersede the pipeline proposed survives only when the
//     answer left the person and subject as they were (the database checks
//     the target again before writing); a new duplicate of something the
//     person already has merges into it instead.
//
// No model is called: the model's proposal already passed pipeline.ts, and
// the answer changes only who or when, never the words.

import { fold, kinshipReference, mirrorBag, relationKey, selfRelationPhrase, statedSelfRelations, wordsOf } from "./lexicon.ts";
import { withSpokenName, withSpokenNames } from "./voice.ts";
import { shortName } from "./names.ts";
import { threadTarget } from "./threads.ts";
import type { Flag } from "./types.ts";

/** A held item as stored in capture_reviews (the gateway's presentation of a PlannedItem). */
export interface HeldItem {
  kind: string;
  person_id: string | null;
  new_person_name: string | null;
  subject_type: string;
  related: { id: string | null; relation: string; name: string | null } | null;
  statement: string;
  detail: Record<string, unknown>;
  certainty: string;
  sensitivity: string;
  confidence?: number | null;
  action?: { type: string; target_id: string | null } | null;
  tier: string;
  flags: Flag[];
  spans: { start: number; end: number; quote: string }[];
  with_person_ids?: string[];
  self_relations?: Record<string, string>;
  /** The kept line from the same sentence this one mirrors, by its person (founder I10). */
  twin_person_id?: string;
  /** The name it asks about ("Sam"). */
  mention?: string;
}

/** The user's answer for one held item. */
export interface HeldAnswer {
  index: number;
  /** Don't remember this one. */
  skip?: boolean;
  /** Which of the user's people it is about. */
  person_id?: string;
  /** "Both": the others it is also about (the user's own people); one memory, one source. */
  also_person_ids?: string[];
  /** Add the person the note named (only the name the note gave). */
  new_person?: boolean;
  /** The name to add when the reading didn't name them itself; it must be in the note. */
  new_person_name?: string;
  /** Which earlier memory this replaces (one of those offered), or null for "keep both". */
  replaces?: string | null;
  /** About the person, or about the person's relative. */
  subject?: "person" | "related";
  /** The relation word, from the user's own words ("sister"). */
  relation?: string;
  /** The day a held health or loss event is on; null for "no date". Or the right day for an ambiguous date. */
  date?: string | null;
  /** "Remember this": keep the item as proposed (required when nothing else is asked). */
  accept?: boolean;
}

export interface ResolvePerson {
  id: string;
  display_name: string;
  state: string;
  /** For saying their name as Kinship does (names.ts shortName). */
  full_name?: string | null;
  nicknames?: string[] | null;
}
export interface ResolveRelated {
  id: string;
  person_id: string;
  relation: string;
  name: string | null;
}
export interface ResolveExisting {
  id: string;
  person_id: string;
  kind: string;
  subject_type: string;
  subject_related_id: string | null;
  statement: string;
  status: string;
  /** Edited or written by the user: never updated by a reading. */
  user_state?: string;
}

export interface ResolveContext {
  /** The note as stored (NFC): a relation answer must be the user's own word. */
  note: string;
  people: ResolvePerson[];
  related: ResolveRelated[];
  /** The chosen people's active memories, for exact-duplicate merges. */
  existing: ResolveExisting[];
}

/** One item for write_extraction; person_id may be "new:<n>", a person the RPC creates first. */
export interface ResolvedItem {
  kind: string;
  person_id: string;
  subject_type: string;
  related: { id: string | null; relation: string; name: string | null } | null;
  statement: string;
  detail: Record<string, unknown>;
  certainty: string;
  sensitivity: string;
  confidence: number | null;
  spans: { start: number; end: number; quote: string }[];
  action: { type: string; target_id: string | null };
  with_person_ids?: string[];
  self_relations?: Record<string, string>;
}

export interface Resolution {
  items: ResolvedItem[];
  /** People to add; relationship_label only when the note states it to the user ("my daughter Kaiya"). */
  newPeople: { ref: string; display_name: string; relationship_label?: string }[];
  skipped: number;
}

export type ResolveFailure =
  | "unanswered" // a held item has no answer
  | "bad_answer" // the answer doesn't fit what the item was held for
  | "unknown_person" // not one of the user's people (or archived)
  | "relation_not_in_note" // the relation isn't the user's own word
  | "bad_date";

const PERSON_FLAGS: Flag[] = ["new_person", "person_ambiguous", "person_disagreement", "pronoun_multiple"];
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function resolveHeld(held: HeldItem[], answers: HeldAnswer[], ctx: ResolveContext): Resolution | { fail: ResolveFailure } {
  if (!Array.isArray(answers) || answers.length !== held.length) return { fail: answers?.length < held.length ? "unanswered" : "bad_answer" };
  const byIndex = new Map<number, HeldAnswer>();
  for (const a of answers) {
    if (!a || !Number.isInteger(a.index) || a.index < 0 || a.index >= held.length || byIndex.has(a.index)) return { fail: "bad_answer" };
    byIndex.set(a.index, a);
  }

  const items: ResolvedItem[] = [];
  const newPeople: Resolution["newPeople"] = [];
  const stated = statedSelfRelations(ctx.note);
  let skipped = 0;
  // Mirrors whose kept line is waiting in this same review: joined at the end.
  const joins: { owner: string; bag: string; people: string[]; alone: ResolvedItem }[] = [];

  for (const [index, item] of held.entries()) {
    const a = byIndex.get(index);
    if (!a) return { fail: "unanswered" };
    if (a.skip === true) {
      if (a.person_id !== undefined || a.new_person !== undefined || a.subject !== undefined || a.date !== undefined || a.accept !== undefined ||
          a.also_person_ids !== undefined || a.replaces !== undefined) return { fail: "bad_answer" };
      skipped++;
      continue;
    }

    const flags = new Set(item.flags ?? []);
    const needsPerson = item.person_id === null || PERSON_FLAGS.some((f) => flags.has(f));
    // Held only for the user's yes (a sensitive or ambiguous reading): nothing is
    // written on silence or on an empty answer.
    const asksSomething = needsPerson || flags.has("subject_check") || flags.has("date_unresolved_sensitive") || flags.has("update_check");
    if (a.accept !== undefined && a.accept !== true) return { fail: "bad_answer" };
    if (!asksSomething && a.accept !== true) return { fail: "bad_answer" };

    // ── Who ──
    let personId: string;
    if (needsPerson) {
      if ((a.person_id === undefined) === (a.new_person !== true)) return { fail: "bad_answer" }; // exactly one
      if (a.new_person === true) {
        // The name the reading gave, or one the user picked from the note's own words ("Add Kaiya").
        const offered = typeof a.new_person_name === "string" ? a.new_person_name.trim() : "";
        if (offered && (offered.length > 60 || !new RegExp(`(^|[^\\p{L}])${escapeRe(offered)}([^\\p{L}]|$)`, "u").test(ctx.note))) {
          return { fail: "bad_answer" };
        }
        // "My daughter Kaiya" is SELF → daughter → Kaiya: the person is "Kaiya"
        // (founder H20), even for a reading held before that was understood.
        const raw = item.new_person_name?.trim() || offered;
        const phrase = raw ? selfRelationPhrase(raw) : null;
        const name = phrase?.name ?? raw;
        if (!name) return { fail: "bad_answer" };
        let ref = newPeople.find((p) => fold(p.display_name) === fold(name))?.ref;
        if (!ref) {
          ref = `new:${newPeople.length}`;
          const rel = stated.find((r) => fold(r.name) === fold(name))?.relation ?? phrase?.relation;
          newPeople.push({ ref, display_name: name, ...(rel ? { relationship_label: rel } : {}) });
        }
        personId = ref;
      } else {
        const p = ctx.people.find((x) => x.id === a.person_id);
        if (!p || p.state === "archived") return { fail: "unknown_person" };
        personId = p.id;
      }
    } else {
      // The pipeline already knew who; the answer may only repeat it.
      if (a.new_person !== undefined || a.also_person_ids !== undefined || (a.person_id !== undefined && a.person_id !== item.person_id)) {
        return { fail: "bad_answer" };
      }
      const p = ctx.people.find((x) => x.id === item.person_id);
      if (!p || p.state === "archived") return { fail: "unknown_person" };
      personId = p.id;
    }

    // ── About whom ──
    let subjectType = item.subject_type;
    let related = item.related;
    if (flags.has("subject_check")) {
      if (a.subject === "person") {
        if (a.relation !== undefined) return { fail: "bad_answer" };
        subjectType = "person";
        related = null;
      } else if (a.subject === "related") {
        const relation = typeof a.relation === "string" ? a.relation.trim() : "";
        const own = new Set(wordsOf(ctx.note));
        if (!relation || relation.length > 50 || !own.has(fold(relation)) || !kinshipReference(relation)) {
          return { fail: "relation_not_in_note" };
        }
        subjectType = "related";
        const rows = personId.startsWith("new:") ? [] : ctx.related.filter((r) =>
          r.person_id === personId && relationKey(r.relation) === relationKey(relation)
        );
        related = rows.length === 1
          ? { id: rows[0].id, relation: rows[0].relation, name: rows[0].name }
          : { id: null, relation: fold(relation), name: null };
      } else {
        return { fail: "bad_answer" };
      }
    } else if (a.subject !== undefined || a.relation !== undefined) {
      return { fail: "bad_answer" };
    }

    // ── When (a held health or loss event without a date) ──
    let detail = { ...item.detail };
    if (flags.has("date_unresolved_sensitive")) {
      if (!("date" in a) || item.kind !== "event") return { fail: "bad_answer" };
      if (a.date === null) {
        delete detail.date;
        delete detail.date_end;
        detail = { ...detail, date_precision: "unknown" };
      } else if (typeof a.date === "string" && validDay(a.date)) {
        delete detail.date_end;
        detail = { ...detail, date: a.date, date_precision: "day" };
      } else {
        return { fail: "bad_date" };
      }
    } else if (flags.has("date_ambiguous") && a.date !== undefined) {
      // The user picks the right day for a date that could be read two ways.
      if (typeof a.date !== "string" || !validDay(a.date) || !("date" in detail)) return { fail: "bad_date" };
      delete detail.date_end;
      detail = item.kind === "plan" ? { ...detail, date: a.date } : { ...detail, date: a.date, date_precision: "day" };
    } else if (a.date !== undefined) {
      return { fail: "bad_answer" };
    }

    // ── Also about ("Both") ──
    let withPeople = (item.with_person_ids ?? []).filter((id) => id !== personId);
    if (a.also_person_ids !== undefined) {
      if (!Array.isArray(a.also_person_ids) || a.also_person_ids.length > 7 || personId.startsWith("new:")) return { fail: "bad_answer" };
      for (const id of a.also_person_ids) {
        const p = ctx.people.find((x) => x.id === id);
        if (!p || p.state === "archived") return { fail: "unknown_person" };
      }
      withPeople = [...new Set([...withPeople, ...a.also_person_ids])].filter((id) => id !== personId);
    }

    // The user just said who "he" is: the line says so ("John wants to go
    // back…"), never a "He" the page can't explain (Gate B).
    // Said as Kinship says each name: "Ben" from "Ben Oxnard", a chosen "Cutie Pie" whole (founder I12).
    const spoken = (id: string) => {
      const p = ctx.people.find((x) => x.id === id);
      return p ? shortName(p) : undefined;
    };
    const chosenName = needsPerson
      ? (personId.startsWith("new:") ? newPeople.find((p) => p.ref === personId)?.display_name : spoken(personId))
      : null;
    // The user said who: the line names them ("Ben and John want to go back…" for Both).
    const alsoNames = (a.also_person_ids ?? []).map(spoken).filter((n): n is string => !!n);
    const statement = chosenName && subjectType !== "related"
      ? (alsoNames.length ? withSpokenNames(item.statement, [chosenName, ...alsoNames]) : withSpokenName(item.statement, chosenName))
      : item.statement;

    // ── Existing memory ──
    // A merge or supersede was worked out for the item as held; once the
    // person or subject changes, it no longer applies.
    const unchanged = personId === item.person_id && subjectType === item.subject_type &&
      (related?.id ?? null) === (item.related?.id ?? null);
    let action = unchanged && item.action && ["new", "merge", "supersede", "resolves"].includes(item.action.type)
      ? { type: item.action.type, target_id: item.action.target_id ?? null }
      : { type: "new", target_id: null };
    // "Which one does this replace?" (Gate E): one of those offered, or neither.
    const offeredTargets = Array.isArray(detail._replaces) ? (detail._replaces as { id: string }[]).map((r) => r.id) : [];
    delete detail._replaces;
    if (flags.has("update_check")) {
      if (a.replaces === undefined) return { fail: "bad_answer" };
      if (a.replaces === null) {
        action = { type: "new", target_id: null };
        delete detail.transition;
      } else {
        if (!offeredTargets.includes(a.replaces)) return { fail: "bad_answer" };
        // A change of the story replaces the earlier line, linked (founder H25).
        action = { type: "supersede", target_id: a.replaces };
      }
    } else if (a.replaces !== undefined) {
      return { fail: "bad_answer" };
    }
    // Who it's about was only just settled ("which Sam?"): does it update one
    // of that person's memories? ("Sam got the Stripe job" after "Sam is
    // interviewing at Stripe"), checked now that it's known (Gate E).
    if (action.type === "new" && needsPerson && !personId.startsWith("new:") && !flags.has("update_check")) {
      const p = ctx.people.find((x) => x.id === personId);
      const candidates = ctx.existing.filter((m) =>
        m.person_id === personId && m.subject_type === subjectType && (m.subject_related_id ?? null) === (related?.id ?? null) &&
        m.user_state !== "edited" && m.user_state !== "user_authored"
      );
      const match = item.certainty === "tentative" || item.certainty === "wished"
        ? null
        : threadTarget(item.statement, candidates, p ? [p.display_name] : []);
      if (match && !("ambiguous" in match)) {
        action = { type: match.action, target_id: match.target };
        detail = { ...detail, transition: match.transition };
      }
    }
    if (action.type === "new" && !personId.startsWith("new:")) {
      // The same thing, already remembered for this person, is one memory.
      const twin = ctx.existing.find((m) =>
        m.person_id === personId && m.status === "active" && m.kind === item.kind && m.subject_type === subjectType &&
        (m.subject_related_id ?? null) === (related?.id ?? null) && fold(m.statement).trim() === fold(item.statement).trim()
      );
      if (twin) action = { type: "merge", target_id: twin.id };
    }

    const resolved: ResolvedItem = {
      kind: item.kind,
      person_id: personId,
      subject_type: subjectType,
      related: subjectType === "related" ? related : null,
      statement,
      detail,
      certainty: item.certainty,
      sensitivity: item.sensitivity,
      confidence: typeof item.confidence === "number" ? item.confidence : null,
      spans: item.spans.map((s) => ({ start: s.start, end: s.end, quote: s.quote })),
      action,
      ...(withPeople.length ? { with_person_ids: withPeople } : {}),
      ...(item.self_relations && !personId.startsWith("new:") ? { self_relations: item.self_relations } : {}),
    };

    // ── The mirror of a kept line (founder I10, H13) ──
    // "Sam might be moving… with Michelle", held only for which Sam, next to
    // "Michelle might be moving… with Sam" kept from the same sentence: the
    // answer joins that line, one memory, never a second copy.
    const owner = needsPerson && typeof item.twin_person_id === "string" && !personId.startsWith("new:") &&
        item.twin_person_id !== personId && ctx.people.some((p) => p.id === item.twin_person_id && p.state !== "archived")
      ? item.twin_person_id
      : null;
    if (owner) {
      const bag = mirrorBag(item.statement);
      const joiners = [...new Set([personId, ...withPeople])].filter((id) => id !== owner);
      const kept = ctx.existing.find((m) =>
        m.person_id === owner && m.status === "active" && m.subject_type === subjectType && sameFamily(m.kind, item.kind) &&
        m.user_state !== "edited" && m.user_state !== "user_authored" && mirrorBag(m.statement) === bag
      );
      // Standing alone (the kept line is gone, or was edited), it is still shared with them.
      const alone: ResolvedItem = { ...resolved, with_person_ids: [...new Set([...withPeople, owner])].filter((id) => id !== personId) };
      if (kept) {
        items.push({
          ...resolved, kind: kept.kind, person_id: owner, statement: kept.statement,
          action: { type: "merge", target_id: kept.id }, with_person_ids: joiners,
        });
      } else if (held.some((g, gi) => gi !== index && g.person_id === owner && mirrorBag(g.statement) === bag && byIndex.get(gi)?.skip !== true)) {
        joins.push({ owner, bag, people: joiners, alone });
      } else {
        items.push(alone);
      }
      continue;
    }
    items.push(resolved);
  }

  // The kept line was itself waiting for a yes in this review: one memory.
  for (const j of joins) {
    const line = items.find((i) => i.person_id === j.owner && mirrorBag(i.statement) === j.bag);
    if (!line) {
      items.push(j.alone);
      continue;
    }
    line.with_person_ids = [...new Set([...(line.with_person_ids ?? []), ...j.people])].filter((id) => id !== line.person_id);
  }
  return { items, newPeople, skipped };
}

/** Something that happened, however it was filed (as the pipeline's twin check). */
function sameFamily(a: string, b: string): boolean {
  const happened = ["event", "fact", "moment"];
  return a === b || (happened.includes(a) && happened.includes(b));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validDay(s: string): boolean {
  const m = s.match(ISO_DAY);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}
