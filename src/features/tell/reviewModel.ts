// "Here's what I'll remember" (plan §8; Checkpoint D1) as plain data for the
// screen. Every string is human copy: the user sees what they said, who and
// when it's about, and at most one question at a time. Nothing names a tier,
// a score, a model, a guard or a table.
//
// One post-Tell contract (stabilization Gate D): every Tell ends in exactly
// one of these, in this order, and the copy never says "Kept" before
// something is kept:
//
//   understanding  "Understanding…" (or "I'll try again", or the answer saving)
//   card           kept: "Kept for Ben" and what was kept, tap to correct, Undo
//   sheet          needs the user: "One thing to check", and why
//   nothing        understood, nothing to remember: "Nothing to remember in
//                  that one." Only for a note with nothing in it (founder J4):
//                  a memory Kinship couldn't place is asked about, never this
//   failed         "Couldn't understand this one. Your note is saved."
//   asWritten      understanding is off or declined: kept as written
//
// The review is a view over the note's durable row (store/understanding.ts):
// a result still on its way from sync is "understanding", never "none", so a
// sheet can't blank out and close while it arrives.

import { voiced } from "@/features/memory/statements";
import type { HeldAnswer, HeldItem } from "@/store/gateway";
import { SWITCHABLE_KINDS, takesDate } from "@/store/memoryDetail";
import { closedBy, type MemoryItem, type Person, type RelatedPerson } from "@/store/repositories";
import type { FollowUpState, Recovery } from "@/store/followUp";
import { questionWaiting, type Notice, type UnderstandingRow } from "@/store/understanding";
import { kindLabel, promiseLabel, whenLabel } from "../memory/format";
import { selfRelationPhrase } from "../../../supabase/functions/_shared/extraction/lexicon";
import { aliasesOf, mentionsOf, shortName, usesName } from "../../../supabase/functions/_shared/extraction/names";
import { residenceQuestion } from "../../../supabase/functions/_shared/semantic/questions";

export interface ReviewInput {
  row: UnderstandingRow;
  /** The note as told (raw_text is null once a "delete after" note settles). */
  capture: {
    id: string; raw_text: string | null; context_person_id: string | null; status: string; feedback?: unknown;
    /** What the understanding did not get to (Option A), from the synced row; null when taken whole. */
    coverage?: { unprocessed: { start: number; end: number }[]; unlocated: number } | null;
    /**
     * What later notes ("Tell the rest") did for this one, from the evidence (store/followUp.ts):
     * which passages a read note's kept lines rest on, and the later notes' own state. Null when none.
     */
    recovery?: Recovery | null;
  } | null;
  /** The live items this note saved (Understanding.itemsFor). */
  items: MemoryItem[];
  /** Items the reading saved that haven't reached this phone yet (sync in flight). */
  missing?: number;
  /** What each superseded memory said, by id: "Updates: Sam is interviewing at Stripe". */
  earlier?: Record<string, string>;
  people: Person[];
  related: RelatedPerson[];
  offline: boolean;
  /** Today as an ISO day, for "this year" in dates. */
  today: string;
}

export type ReviewMode =
  /** Being understood (or waiting to be online, or its result still arriving). */
  | "understanding"
  /** Kept: "Kept for Ben" and the lines, to look over or correct; no tap needed. */
  | "card"
  /** Something needs the user: a question, or a change to explain. */
  | "sheet"
  /** Understood, and nothing in it to remember: the note itself is saved. */
  | "nothing"
  /** Understanding kept failing: the note itself is saved. */
  | "failed"
  /** Understanding is off or was declined: kept exactly as written. */
  | "asWritten"
  /** Nothing to show (finished). */
  | "none";

export interface ItemLine {
  id: string;
  statement: string;
  person: { id: string; label: string; changeable: boolean } | null;
  /** About someone close to the person: "Sarah's sister". */
  about: string | null;
  /** Others in People this one memory is also about ("John Oxnard"). */
  also: string[];
  /** Their ids, in the same order. */
  alsoIds?: string[];
  /**
   * When its own words name more than one person in People ("Susan and
   * Michelle went to Disneyland"), who it can be about: those people and
   * anyone it's about now. The correction offers only them (founder I11).
   */
  named?: string[];
  /**
   * The earlier memories this one replaced, in their words ("Sam is interviewing
   * at Stripe"): what it superseded, then every other line it closed with it
   * (Phase 4B B4). Empty when it replaced nothing.
   */
  replaces: string[];
  /** value: the exact day, when there is one (for the date picker). */
  when: { label: string; value: string | null; changeable: boolean } | null;
  kind: {
    value: string;
    label: string;
    changeable: boolean;
    /** Promises only: whose commitment it is, and the other person's first name. */
    owner?: { value: "user" | "person"; name: string | null };
  };
  /** Someone the line names who isn't in People yet ("Pedro"), to add (H21). */
  newcomers?: string[];
  /** Said as a possibility ("might be moving"): a quiet "Maybe", never a score (H29). */
  maybe?: boolean;
  /** The user already changed it. */
  edited: boolean;
  /** The words before the user's first edit, kept with the edit (H30). */
  editedFrom?: string | null;
}

/**
 * "keep": a sensitive or ambiguous reading that is not memory until the user says yes.
 * "owner": whose promise it is, when the words don't say (founder J11).
 */
export type QuestionType = "which_person" | "about_whom" | "new_person" | "owner" | "replace" | "residence" | "date" | "keep";

export type Choice =
  /** restore: someone removed from People, brought back before the answer is sent (founder I3). */
  | { key: string; label: string; answer: Omit<HeldAnswer, "index">; restore?: string }
  /** Opens the person list; the answer is { person_id }. */
  | { key: string; label: string; pick: "person" }
  /** Opens a date picker; the answer is { date }. */
  | { key: string; label: string; pick: "date" }
  /** The system contact picker (founder K25): the person that contact is, found or added once; the answer is { person_id }. */
  | { key: string; label: string; pick: "contact" };

export interface Question {
  key: string;
  type: QuestionType;
  prompt: string;
  /** Why Kinship needs the user for this, in plain words; null when the prompt says it. */
  reason: string | null;
  /** What the question decides, in the user's words. */
  about: string[];
  /** Who and when, for a reading waiting for the user's yes ("Sarah · Thu, Oct 15"). */
  detail: string | null;
  /** What a yes would replace, so the user knows Kinship is revising what it knew (H25). */
  replaces: string | null;
  /** The held items it answers. */
  items: number[];
  /**
   * For a question about someone else a line is about (founder K4): the name
   * it settles on each of those items ("Sam"). The pick fills only that name;
   * "Not sure" leaves it out and keeps the line.
   */
  slots?: Record<number, string>;
  choices: Choice[];
  skip: { key: string; label: string };
}

export interface ReviewView {
  /** The note this view is about (screens check it's the one they asked for). */
  captureId: string;
  mode: ReviewMode;
  heading: string;
  /** A quiet status under the heading. */
  status: string | null;
  /** Said once when the review changed under the user. */
  notice: string | null;
  /** The one-line summary for "summary" mode. */
  summary: string | null;
  lines: ItemLine[];
  questions: Question[];
  /** The answer is on its way (or waiting to be online). */
  answering: boolean;
  canUndo: boolean;
  /** Everyone this note is about so far: who its card or question belongs with. */
  personIds: string[];
  /** The user's "Got it right / Not quite" on this note, once given (H6). */
  feedback?: { verdict: "right" | "not_quite"; off?: string } | null;
  /**
   * The note held more than the understanding could take (Option A, founder 19 Oct): what it kept is
   * kept, the rest is marked in the Source view, and the card offers "Tell the rest". Never "Try again":
   * the same note would meet the same limit. `unprocessed`: the passages still not got to (one a later
   * note's kept line rests on is out of it). `recovered`: how many a later note took. `followUp`: the
   * later notes' own state, said plainly, never assumed. `resolved`: every passage was taken and nothing
   * was left unplaced, so the note is no longer unfinished. `tellRest`: the pill is offered (not while a
   * later note is still to be read, or failed and has its own Try again).
   */
  partial?: {
    unprocessed: { start: number; end: number }[];
    unlocated: number;
    recovered: number;
    followUp: FollowUpState;
    resolved: boolean;
    tellRest: boolean;
  } | null;
}

export const COPY = {
  understanding: "Understanding…",
  offline: "I'll understand this when you're online.",
  retrying: "Couldn't understand this yet. Your note is saved, and I'll try again.",
  arriving: "Understanding…",
  kept: "Kept as you wrote it.",
  // Founder J4: only for a note with nothing in it. "Your note is saved" is
  // gone: there is nowhere in the app to find a note that kept nothing.
  nothing: "Nothing to remember in that one.",
  /** The user's own "Don't keep this": nothing kept, never "nothing to remember". */
  notKept: "Nothing kept from that one.",
  failed: "Couldn't understand this one. Your note is saved.",
  /** Option A: the note held more than one understanding takes; the kept lines are kept, the rest is in the note. */
  partial: "Kinship couldn't get to all of it.",
  /** A later note tells the rest, but has not been read yet (kept, waiting, or being understood). */
  partialPending: "You told the rest in a later note. Kinship hasn't read it yet.",
  /** The later note's understanding failed; it offers Try again on its own card. */
  partialFailed: "Kinship couldn't read the note that told the rest. Try again from that note.",
  /** The later note was read and kept some of the passages, not all. */
  partialSome: "Some of it was kept from a later note. The rest still wasn't.",
  /** The later note was read, and none of its kept lines rest on the passages left out. */
  partialMissed: "Your later note didn't cover what was left out.",
  /** Only unplaced things remain: a later note can never be matched to them, so nothing is claimed. */
  partialUnplaced: "Part of this note couldn't be placed in its words, so Kinship can't tell if a later note covered it.",
  tellRest: "Tell the rest",
  tryAgain: "Try again",
  check: "One thing to check",
  notSure: "Not sure",
  answering: "Saving your answer…",
  answeringOffline: "I'll save your answer when you're online.",
  changedElsewhere: "This changed on another device.",
  chooseAgain: "That choice isn't available any more. Choose again.",
  skip: "Don't keep this",
  someoneElse: "Someone else",
  /** "Who is Matt?" → the user's own contact (founder K25, 16 Oct). */
  fromContacts: "Choose from Contacts",
  pickDate: "Pick a date",
  noDate: "No date",
  remember: "Here's what I'll remember",
  kept1: "Kept",
} as const;

const PERSON_FLAGS = ["person_ambiguous", "person_disagreement", "pronoun_multiple", "new_person", "person_archived"];

/**
 * The partial state, when the note was not taken whole: the passages still to mark, a count that cannot
 * be, and what later notes did, from the evidence only. A later note that is not read, or read without
 * a kept line on a passage, leaves that passage unresolved; a count of unplaced things is never resolved
 * by a later note (nothing can match them). Null for a note taken whole.
 */
export function partialOf(
  coverage: { unprocessed: { start: number; end: number }[]; unlocated: number } | null,
  recovery: Recovery | null,
): ReviewView["partial"] {
  if (!coverage) return null;
  const sound = (s: { start: number; end: number }) => Number.isInteger(s.start) && Number.isInteger(s.end) && s.end > s.start && s.start >= 0;
  const all = coverage.unprocessed.filter(sound);
  const unlocated = Number.isInteger(coverage.unlocated) ? Math.max(0, coverage.unlocated) : 0;
  if (!all.length && !unlocated) return null;
  const followUp = recovery?.followUp ?? "none";
  const recovered = recovery ? recovery.recovered.filter(sound) : [];
  const unprocessed = recovery
    ? all.filter((s) => !recovered.some((r) => r.start === s.start && r.end === s.end))
    : all;
  const resolved = followUp === "read" && unprocessed.length === 0 && unlocated === 0;
  return {
    unprocessed, unlocated, recovered: recovered.length, followUp, resolved,
    tellRest: !resolved && followUp !== "pending" && followUp !== "failed",
  };
}

/** The card's one line about a partial note: the state of the rest, never a claim beyond the evidence. */
export function partialStatus(partial: NonNullable<ReviewView["partial"]>): string | null {
  if (partial.resolved) return null;
  if (partial.followUp === "pending") return COPY.partialPending;
  if (partial.followUp === "failed") return COPY.partialFailed;
  if (partial.followUp === "read") {
    if (!partial.unprocessed.length) return COPY.partialUnplaced;
    return partial.recovered ? COPY.partialSome : COPY.partialMissed;
  }
  return COPY.partial;
}

export function buildReview(input: ReviewInput): ReviewView {
  const { row, capture, offline } = input;
  const context = capture?.context_person_id ?? null;
  const empty: ReviewView = {
    captureId: row.capture_id,
    mode: "none", heading: COPY.kept1, status: null, notice: noticeCopy(row.notice), summary: null,
    lines: [], questions: [], answering: false, canUndo: false, personIds: context ? [context] : [],
  };
  if (!capture) return empty;
  if (row.state === "waiting") {
    const status = offline ? COPY.offline : row.attempts > 0 ? COPY.retrying : COPY.understanding;
    return { ...empty, mode: "understanding", status, canUndo: true };
  }
  if (row.state === "kept") return { ...empty, mode: "asWritten", status: COPY.kept, canUndo: true };
  if (row.state === "failed") return { ...empty, mode: "failed", status: COPY.failed, canUndo: true };
  // A relationship said again that Kinship already holds (H17): said back, not kept twice.
  const known = row.reading?.known?.length ? `Already known: ${row.reading.known.join("; ")}.` : null;
  if (row.state === "done" && row.reading && row.reading.saved.length === 0 && row.reading.held.length === 0) {
    // Understood, nothing to remember: said once, never silence.
    return { ...empty, mode: "nothing", status: known ?? COPY.nothing, canUndo: true };
  }
  if (row.state === "done" || row.state === "closing" || !row.reading) return empty;

  const reading = row.reading;
  const note = input.capture?.raw_text ?? "";
  const lines = input.items.map((item) => {
    const line = itemLine(item, input);
    const newcomers = newcomersIn(line.statement, note, input.people);
    return newcomers.length ? { ...line, newcomers } : line;
  });
  const answering = row.state === "answering";
  // Held statements are read the way the user reads everything: as "you".
  const held = reading.held.map((h) => voiced(h));
  const questions = questionWaiting(reading) && !answering ? questionsFor(held, input) : [];
  const heading = headingFor(input, lines);
  const personIds = [...new Set([
    ...(context ? [context] : []),
    ...lines.map((l) => l.person?.id).filter((x): x is string => !!x),
    ...input.items.flatMap((m) => (Array.isArray(m.with_person_ids) ? m.with_person_ids : [])),
    ...held.map((h) => h.person_id).filter((x): x is string => !!x),
    ...questions.flatMap((q) => q.choices.flatMap((c) => ("answer" in c && c.answer.person_id ? [c.answer.person_id] : []))),
  ])];
  const fb = input.capture?.feedback as { verdict?: unknown; off?: unknown } | null | undefined;
  const feedback = fb && (fb.verdict === "right" || fb.verdict === "not_quite")
    ? { verdict: fb.verdict as "right" | "not_quite", ...(typeof fb.off === "string" ? { off: fb.off } : {}) } : null;
  // What the understanding did not get to (Option A): the synced row's word first, the reply's until it syncs.
  const partial = partialOf(capture.coverage ?? reading.coverage ?? null, capture.recovery ?? null);
  const partialLine = partial ? partialStatus(partial) : null;
  const base: ReviewView = {
    ...empty,
    feedback,
    heading,
    lines,
    questions,
    answering,
    status: answering ? (offline ? COPY.answeringOffline : COPY.answering) : partialLine ?? known,
    canUndo: true,
    personIds,
    partial,
  };
  if (answering || questions.length || row.notice || questionWaiting(reading)) return { ...base, mode: "sheet" };
  // What the reading saved is still on its way here: understanding, not empty.
  if ((input.missing ?? 0) > 0) return { ...base, mode: "understanding", status: COPY.arriving };
  // Answered, and the answer kept nothing ("Don't keep this").
  if (lines.length === 0) return { ...base, mode: "nothing", status: known ?? COPY.notKept };
  return { ...base, mode: "card", summary: summaryFor(lines) };
}

/**
 * The user's picks, one per question, as the gateway's answers (one per
 * held item). Null until every question has a pick. A skip on any question
 * about an item means that item isn't kept.
 */
export function answersFor(
  questions: Question[],
  picks: Record<string, Omit<HeldAnswer, "index"> | "skip">,
): HeldAnswer[] | null {
  const byItem = new Map<number, HeldAnswer>();
  for (const q of questions) {
    const pick = picks[q.key];
    if (pick === undefined) return null;
    for (const index of q.items) {
      const prev = byItem.get(index) ?? { index };
      if (prev.skip) continue;
      // "Which Sam?" about someone else the line is about (founder K4): only
      // that name is settled; "Not sure" (or a name not in People) leaves it out.
      const slot = q.slots?.[index];
      if (slot !== undefined) {
        if (pick !== "skip" && typeof pick.person_id === "string") {
          byItem.set(index, { ...prev, participants: [...(prev.participants ?? []), { text: slot, person_id: pick.person_id }] });
        } else byItem.set(index, prev);
        continue;
      }
      // A "keep" pick (Remember, or Remember on another day) is the user's explicit yes.
      byItem.set(index, pick === "skip" ? { index, skip: true } : { ...prev, ...(q.type === "keep" ? { accept: true as const } : {}), ...pick });
    }
  }
  return [...byItem.values()].sort((a, b) => a.index - b.index);
}

// ─── Lines ──────────────────────────────────────────────────────────────

/** One remembered item in the user's terms, with what they can change. */
export function itemLine(item: MemoryItem, input: Pick<ReviewInput, "people" | "related" | "today" | "earlier">): ItemLine {
  const person = input.people.find((p) => p.id === item.person_id);
  const related = item.subject_related_id ? input.related.find((r) => r.id === item.subject_related_id) : null;
  const when = whenLabel(item.kind, (item.detail ?? {}) as Record<string, unknown>, input.today);
  // Someone removed from People isn't shown with the others (founder I3).
  const alsoPeople = (Array.isArray(item.with_person_ids) ? item.with_person_ids : [])
    .map((id) => input.people.find((p) => p.id === id))
    .filter((p): p is Person => !!p && p.state !== "archived");
  // Who it can be about (founder I11): the people its words name, and anyone it's about now.
  const named = item.subject_type === "related" ? [] : [...new Set([
    ...(person ? [person.id] : []),
    ...alsoPeople.map((p) => p.id),
    ...input.people.filter((p) => p.state !== "archived" && namesIn(item.statement, p)).map((p) => p.id),
  ])];
  return {
    id: item.id,
    statement: item.statement,
    person: person
      ? { id: person.id, label: personLabel(person, input.people), changeable: item.subject_type !== "related" }
      : null,
    about: related && person ? aboutLabel(person.display_name, related) : null,
    also: alsoPeople.map((p) => personLabel(p, input.people)),
    alsoIds: alsoPeople.map((p) => p.id),
    ...(named.length > 1 ? { named } : {}),
    // Everything it replaced (Gate E; B4: every line a note closed), so the user can say no to any of it.
    replaces: closedBy(item).map((id) => input.earlier?.[id]).filter((s): s is string => typeof s === "string"),
    // Shown only when there is a time to show (an event without one says so).
    when: when ? { label: when, value: exactDay(item), changeable: takesDate(item.kind) } : null,
    kind: item.kind === "promise"
      ? {
        value: item.kind,
        label: promiseLabel(ownerOf(item), person ? shortName(person) : null),
        // Whose promise is the one thing about a promise the user can change (H28).
        changeable: true,
        owner: { value: ownerOf(item), name: person ? shortName(person) : null },
      }
      : {
        value: item.kind,
        label: kindLabel(item.kind),
        changeable: (SWITCHABLE_KINDS as readonly string[]).includes(item.kind) && item.subject_type !== "user",
      },
    edited: item.user_state === "edited",
    ...(item.certainty === "tentative" || item.certainty === "wished" ? { maybe: true } : {}),
  };
}

/** A promise is the user's unless it's plainly someone else's commitment to them. */
function ownerOf(item: MemoryItem): "user" | "person" {
  return item.subject_type === "person" ? "person" : "user";
}

function exactDay(item: MemoryItem): string | null {
  const d = (item.detail ?? {}) as Record<string, unknown>;
  const day = item.kind === "promise" ? d.due_date : d.date;
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function aboutLabel(personName: string, r: RelatedPerson): string {
  return r.name ? `${r.name} (${personName}'s ${r.relation})` : `${personName}'s ${r.relation}`;
}

/** A name, told apart from anyone else with the same name. */
export function personLabel(p: Person, people: Person[]): string {
  const twins = people.filter((o) => o.id !== p.id && fold(o.display_name) === fold(p.display_name));
  const label = typeof p.relationship_label === "string" && p.relationship_label ? p.relationship_label : null;
  if (twins.length === 0) return p.display_name;
  if (label) return `${p.display_name} (${label})`;
  const full = typeof p.full_name === "string" && p.full_name && p.full_name !== p.display_name ? p.full_name : null;
  return full ?? p.display_name;
}

/**
 * "Kept for Ben" only once something is kept for Ben; while nothing is kept
 * yet (a question first), "About Ben". Never "Kept" before it's true.
 */
function headingFor(input: ReviewInput, lines: ItemLine[]): string {
  const ids = new Set(lines.map((l) => l.person?.id).filter((x): x is string => !!x));
  if (ids.size === 1) {
    const p = input.people.find((x) => ids.has(x.id));
    // A memory shared by several people is kept for all of them (founder I5).
    const shared = [...new Set(input.items.filter((m) => m.person_id === p?.id)
      .flatMap((m) => (Array.isArray(m.with_person_ids) ? m.with_person_ids : [])))]
      .map((id) => input.people.find((x) => x.id === id))
      .filter((x): x is Person => !!x && x.id !== p?.id);
    // Said in the note's order, whoever the line is filed on ("Kept for Anthony Test, Sam Eden and Chris", founder K4).
    const at = (id: string) => Math.min(Number.MAX_SAFE_INTEGER, ...input.items.filter((m) => m.person_id === p?.id)
      .flatMap((m) => mentionsOf(m.person_mentions).filter((pm) => pm.person_id === id).map((pm) => m.statement.indexOf(pm.text)))
      .filter((i) => i >= 0));
    const inOrder = p ? [p, ...shared].map((x, i) => ({ x, i, at: at(x.id) })).sort((a, b) => a.at - b.at || a.i - b.i).map((e) => e.x) : [];
    if (p) return `Kept for ${listOf(inOrder.map((x) => personLabel(x, input.people)))}`;
  }
  if (lines.length) return COPY.remember;
  // Nothing kept yet: the note's subject isn't known, so never the page's
  // person ("About Susan" for a note about Natalia, founder H24).
  return "Your note";
}

/** "Susan", "Susan and Michelle", "Susan, Michelle and Sam". */
function listOf(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function summaryFor(lines: ItemLine[]): string {
  const [first] = lines;
  const when = first.when && first.when.label !== "No date yet" ? ` · ${first.when.label}` : "";
  return `Kept: ${first.statement}${when}${lines.length > 1 ? ` · +${lines.length - 1}` : ""}`;
}

function noticeCopy(n: Notice | null): string | null {
  return n === "changed_elsewhere" ? COPY.changedElsewhere : n === "choose_again" ? COPY.chooseAgain : null;
}

// ─── Questions ──────────────────────────────────────────────────────────

interface Need {
  type: QuestionType;
  group: string;
  prompt: string;
  reason: string | null;
  choices: Choice[];
  detail?: string | null;
  /** What the question shows as being decided: the statement, or the note's own sentence. */
  about?: string;
  /** Someone else the line is about, under this name (founder K4). */
  slot?: string;
  /** The skip, when it isn't "Don't keep this" (a name asked about on a line that is kept either way). */
  skipLabel?: string;
}

function questionsFor(held: HeldItem[], input: ReviewInput): Question[] {
  const groups = new Map<string, Question>();
  held.forEach((item, index) => {
    for (const need of needsOf(item, input)) {
      const about = need.about ?? item.statement;
      const target = item.action && ["supersede", "resolves"].includes(item.action.type) ? item.action.target_id : null;
      const replaces = target ? input.earlier?.[target] ?? null : null;
      const q = groups.get(need.group);
      if (q) {
        q.items.push(index);
        if (need.slot !== undefined) q.slots = { ...(q.slots ?? {}), [index]: need.slot };
        if (!q.about.includes(about)) q.about.push(about);
        q.replaces = q.replaces ?? replaces;
      } else {
        groups.set(need.group, {
          key: `q${groups.size}`, type: need.type, prompt: need.prompt, reason: need.reason, about: [about], items: [index],
          ...(need.slot !== undefined ? { slots: { [index]: need.slot } } : {}),
          choices: need.choices, skip: { key: "skip", label: need.skipLabel ?? (need.slot !== undefined ? COPY.notSure : COPY.skip) }, detail: need.detail ?? null, replaces,
        });
      }
    }
  });
  const order: QuestionType[] = ["which_person", "about_whom", "new_person", "owner", "replace", "residence", "date", "keep"];
  return [...groups.values()]
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
    .map((q, n) => ({ ...q, key: `q${n}` }));
}

const PRONOUN = /^(he|she|they|him|her|them|his|hers|their)$/iu;

/** The pronoun a "who?" is about ("he"), from the note's own words for the item. */
function pronounIn(item: HeldItem): string | null {
  for (const s of item.spans) {
    for (const w of s.quote.split(/[^\p{L}'’]+/u)) if (PRONOUN.test(w)) return w.toLowerCase();
  }
  return null;
}

/**
 * The name the note gives for someone who isn't in People yet ("my daughter
 * Kaiya", "Kaiya and I"). Only where the words say it's a person: after a
 * relation word, or alongside "I"/"me". "Spirited Away" is never a name.
 */
function unknownNames(item: HeldItem, people: Person[]): string[] {
  const known = new Set(people.flatMap(knownWords));
  const text = [item.statement, ...item.spans.map((s) => s.quote)].join(" . ");
  const NAME = "(\\p{Lu}[\\p{Ll}\\p{M}'’-]+)";
  const REL = "(?:daughter|son|kid|child|baby|wife|husband|partner|girlfriend|boyfriend|fianc[eé]e?|sister|brother|mom|mother|dad|father|grandma|grandpa|aunt|uncle|cousin|niece|nephew|friend|neighbou?r|boss|coworker|colleague|roommate)";
  const patterns = [
    new RegExp(`\\b${REL}\\s*,?\\s+${NAME}`, "gu"),
    new RegExp(`${NAME}\\s+and\\s+(?:I|me)\\b`, "gu"),
    new RegExp(`\\b(?:I|me|you)\\s+and\\s+${NAME}`, "gu"),
    new RegExp(`${NAME},\\s+(?:my|your)\\s+${REL}`, "gu"),
  ];
  const out: string[] = [];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const w = withoutPossessive(m[1]);
      const k = fold(w);
      if (known.has(k) || PRONOUN.test(k) || NOT_NAMES.has(k) || out.some((o) => fold(o) === k)) continue;
      out.push(w);
    }
  }
  return out;
}

/**
 * Someone a kept line names alongside the person it's filed on, who isn't in
 * People yet: "Susan is getting married to Pedro", "Anthony and Natalia are
 * moving", "moving to Seattle with Dana" (founder H21/H5). Only the shapes
 * that name a person, only names the note itself says, never a place or a
 * company ("interviewing with Box", "moving to Austin").
 */
export function newcomersIn(statement: string, note: string, people: Person[]): string[] {
  // Every name they go by, earlier names included ("Wifey" after a rename, founder I12).
  const known = new Set(people.flatMap(knownWords));
  const NAME = "(\\p{Lu}[\\p{Ll}\\p{M}'’-]+)";
  const patterns = [
    new RegExp(`\\b(?:married|marrying|engaged|wed|dating|seeing|divorcing|separated)\\s+(?:to|from)?\\s*${NAME}`, "gu"),
    new RegExp(`\\b(?:moving|living|traveling|travelling|going|staying|having a baby|expecting)\\b[^.!?]{0,40}?\\bwith\\s+${NAME}`, "gu"),
    new RegExp(`(?:^|[^\\p{L}])\\p{Lu}[\\p{Ll}\\p{M}'’-]+\\s+and\\s+${NAME}\\s+(?:are|were|have|had|got|just|will|went)\\b`, "gu"),
    new RegExp(`(?:^|[^\\p{L}])${NAME}\\s+and\\s+\\p{Lu}[\\p{Ll}\\p{M}'’-]+\\s+(?:are|were|have|had|got|just|will|went)\\b`, "gu"),
    // Someone the person reaches out to, tells, texts or meets (founder K6:
    // "Ben is thinking about reaching out to Josh about a job"): a person by
    // the shape of the words, one or two of them ("…to Josh and Maria").
    new RegExp(`\\b(?:${TO_SOMEONE})\\s+to\\s+${NAME}(?:\\s*(?:,|and|&)\\s*${NAME})?`, "gu"),
    new RegExp(`\\b(?:${SOMEONE})\\s+${NAME}(?:\\s*(?:,|and|&)\\s*${NAME})?`, "gu"),
  ];
  // Every shape but the first also fits a service ("called Delta", "traveling with Uber", "Ben and Google are…");
  // marrying, dating or divorcing someone doesn't ("Susan is getting married to Siri" is someone; reviewer C, r3).
  const servicesFrom = 1;
  const out: string[] = [];
  for (const [n, re] of patterns.entries()) {
    for (const m of statement.matchAll(re)) {
      for (const g of [m[1], m[2]]) {
        if (!g) continue;
        const w = withoutPossessive(g);
        const k = fold(w);
        if (known.has(k) || PRONOUN.test(k) || NOT_NAMES.has(k) || KIN_WORD.test(k) || (n >= servicesFrom && SERVICE_WORD.test(k)) ||
          (n >= patterns.length - 2 && ASSISTANT_WORD.test(k)) || out.some((o) => fold(o) === k)) continue;
        if (!new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "u").test(note)) continue;
        out.push(w);
      }
    }
  }
  return out;
}

/** "reaching out to", "talked to", "introduced Ben to", "wrote to": someone, never a place. */
const TO_SOMEONE = "reach(?:es|ed|ing)?\\s+out|talk(?:s|ed|ing)?|spoke|speak(?:s|ing)?|wr(?:ite|ites|ote|iting)|introduc(?:e|es|ed|ing)\\s+\\p{Lu}[\\p{Ll}\\p{M}'’-]+|apologi[sz](?:e|es|ed|ing)";
/** Verbs whose object is a person: "tell Josh", "texted Maria", "met Dana", "thank Sam". */
const SOMEONE = "(?:get|gets|got|getting)\\s+in\\s+touch\\s+with|contact|contacted|contacting|email|emailed|emailing|message|messaged|messaging|tell|tells|told|telling|text|texts|texted|texting|call|calls|called|calling|ask|asks|asked|asking|thank|thanks|thanked|thanking|congratulat(?:e|es|ed|ing)|invit(?:e|es|ed|ing)|hug|hugs|hugged|hugging|introduc(?:e|es|ed|ing)|meet|meets|met|meeting|visit(?:s|ed|ing)?\\s+with|hang(?:s|ing)?\\s+out\\s+with|hung\\s+out\\s+with|catch(?:es|ing)?\\s+up\\s+with|caught\\s+up\\s+with";
/** A relation said as a name ("tell Mom") or a title: never someone new to add. */
const KIN_WORD = /^(?:mom|mum|mother|mama|momma|mommy|dad|father|daddy|papa|grandma|grandmother|grandpa|grandfather|granny|nana|aunt|auntie|uncle|cousin|sis|bro|dr|doctor|mr|mrs|ms|miss|santa|god)$/u;
/** A name that is no one's when it is reached out to (a brand, a service): "called Delta", "emailed Google". */
/** An assistant's name, which is also a given name: never someone new when "asked" or "told", still someone to marry or move with (reviewer A, r4). */
const ASSISTANT_WORD = /^(?:alexa|siri)$/u;
const SERVICE_WORD = /^(?:congress|google|apple|amazon|microsoft|meta|facebook|instagram|netflix|uber|lyft|stripe|zoom|slack|delta|united|verizon|comcast|halloween|airbnb|tesla|target|support|walmart|costco|paypal|venmo|ups|fedex)$/u;

/** Someone removed from People offered back (I3); once brought back (the question re-read People), simply them. */
function backChoice(people: Person[]) {
  return (p: Person): Choice => p.state === "archived"
    ? { key: `back:${p.id}`, label: `Bring back ${personLabel(p, people)}`, answer: { person_id: p.id }, restore: p.id }
    : { key: `back:${p.id}`, label: personLabel(p, people), answer: { person_id: p.id } };
}

/** Why a name with one person left in People is asked: someone removed went by it too. */
function removedReason(name: string, removed: number): string {
  return removed > 1 ? `Others called ${name} were removed from People.` : `Another ${name} was removed from People.`;
}

/** A name without its possessive: "Chris's", "Chris’s" and "Chris'" are Chris (founder K7); "O'Connor" stays. */
function withoutPossessive(word: string): string {
  return word.replace(/['’]s$/u, "").replace(/(?<=s)['’]$/iu, "");
}

/** Capitalised words that start sentences or name things, never people. */
const NOT_NAMES = new Set([
  "i", "i'm", "i'd", "i'll", "i've", "my", "we", "our", "the", "a", "an", "and", "but", "so", "every", "each", "this", "that",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february", "march", "april",
  "may", "june", "july", "august", "september", "october", "november", "december", "christmas", "thanksgiving", "easter",
]);

function needsOf(item: HeldItem, input: ReviewInput): Need[] {
  const needs: Need[] = [];
  const note = input.capture?.raw_text ?? "";
  const personInQuestion = !item.person_id || PERSON_FLAGS.some((f) => item.flags.includes(f));
  if (personInQuestion) {
    if (!item.person_id && item.new_person_name && item.flags.includes("new_person")) {
      // Never "Add My daughter Kaiya" (founder H20): the name only, also for
      // readings held before the server understood the phrase.
      const name = selfRelationPhrase(item.new_person_name)?.name ?? item.new_person_name;
      // "Who is Wifey?" (founder J4): the person whose page it was told on,
      // someone new, or anyone already here. Never dropped as "nothing".
      const context = input.capture?.context_person_id
        ? input.people.find((p) => p.id === input.capture!.context_person_id && p.state !== "archived")
        : undefined;
      needs.push({
        type: "new_person",
        group: `new:${fold(name)}`,
        prompt: `Who is ${name}?`,
        reason: `${name} isn't in your people yet.`,
        // Founder K25 (16 Oct): someone already here first, then their own contact, then by name only.
        choices: [
          ...(context ? [{ key: `p:${context.id}`, label: personLabel(context, input.people), answer: { person_id: context.id } }] : []),
          { key: "contact", label: COPY.fromContacts, pick: "contact" as const },
          { key: "add", label: `Add ${name}`, answer: { new_person: true } },
          { key: "pick", label: context ? COPY.someoneElse : "Someone already here", pick: "person" as const },
        ],
      });
    } else if (item.flags.includes("person_archived") && item.archived_ids?.length) {
      // Someone the user removed from People (founder I3): offered back by
      // name, never "Add Kaiya" (a second Kaiya), never filed on a guess.
      const removed = item.archived_ids.map((id) => input.people.find((p) => p.id === id)).filter((p): p is Person => !!p);
      const name = item.mention ?? (removed[0] ? shortName(removed[0]) : "They");
      needs.push({
        type: "which_person",
        group: `removed:${item.archived_ids.join(",")}`,
        prompt: `${name} was removed from People.`,
        reason: null,
        choices: [
          ...removed.map((p) => ({
            key: `back:${p.id}`, label: removed.length > 1 ? `Bring back ${personLabel(p, input.people)}` : `Bring back ${shortName(p)}`,
            answer: { person_id: p.id }, restore: p.id,
          })),
          { key: "pick", label: COPY.someoneElse, pick: "person" as const },
        ],
      });
    } else {
      const candidates = candidatesFor(item, note, input.people);
      // Someone removed from People the name also fits (founder I3): asked, offered back.
      // Once brought back they are among the candidates: never offered twice (reviewer A, r5).
      const removedToo = (item.archived_ids ?? []).map((id) => input.people.find((p) => p.id === id))
        .filter((p): p is Person => !!p && !candidates.some((c) => c.id === p.id));
      const first = (p: Person) => p.display_name.trim().split(/\s+/u)[0];
      const named = [...candidates, ...removedToo];
      const shared = named.length > 1 && named.every((p) => fold(first(p)) === fold(first(named[0])))
        ? first(named[0])
        : null;
      // A held "he" the reading says who it can mean (founder J1) is asked as "he" too.
      const pronoun = item.flags.includes("pronoun_multiple") || (item.flags.includes("pronoun") && Array.isArray(item.candidate_ids))
        ? pronounIn(item) : null;
      // Someone the note names who isn't here yet ("my daughter Kaiya"): offered by name.
      const newNames = candidates.length === 0 ? unknownNames(item, input.people) : [];
      const choices: Choice[] = [
        ...candidates.map((p) => ({ key: `p:${p.id}`, label: personLabel(p, input.people), answer: { person_id: p.id } })),
        ...removedToo.map(backChoice(input.people)),
        // A pronoun that could be either of two people may be both of them.
        ...(pronoun && candidates.length === 2 && !shared
          ? [{ key: "both", label: "Both", answer: { person_id: candidates[0].id, also_person_ids: [candidates[1].id] } }]
          : []),
        ...newNames.slice(0, 2).map((n) => ({ key: `new:${fold(n)}`, label: `Add ${n}`, answer: { new_person: true as const, new_person_name: n } })),
        { key: "pick", label: candidates.length || newNames.length ? COPY.someoneElse : "Choose who", pick: "person" as const },
      ];
      const sentence = item.spans[0]?.quote?.trim();
      needs.push({
        type: "which_person",
        group: `who:${pronoun ?? ""}:${candidates.map((p) => p.id).sort().join(",")}`,
        prompt: pronoun ? `Who is “${pronoun}”?` : shared ? `Which ${shared} do you mean?` : "Who is this about?",
        reason: pronoun ? null
          : shared ? (candidates.length > 1 ? `You have more than one ${shared}.` : removedReason(shared, removedToo.length))
          : newNames.length ? `${newNames.join(" and ")} ${newNames.length > 1 ? "aren't" : "isn't"} in your people yet.`
          : "I couldn't tell who this is about.",
        choices,
        // The exact sentence being clarified, in the note's own words: for an
        // unclear "he", and for the mirror of a line already kept ("Which
        // Sam?" about "Michelle and Sam might be moving…", founder I10),
        // which is one memory, never shown as a second.
        about: (pronoun || item.twin_person_id) && sentence ? sentence : undefined,
        // That kept line stays either way: skipping only leaves this name out.
        ...(item.twin_person_id ? { skipLabel: COPY.notSure } : {}),
      });
    }
  }
  // Founder K4: someone else the line is about goes by a name two or more
  // people share ("Anthony and Sam love ice skating with Chris"). Asked on
  // its own, with every person the name can mean; never "Who is this about?"
  // for the whole line, and never narrowed.
  for (const open of Array.isArray(item.open_names) ? item.open_names : []) {
    if (!open?.text) continue;
    const live = input.people.filter((p) => p.state !== "archived");
    const meant = live.filter((p) => (open.candidate_ids ?? []).includes(p.id));
    // Someone removed from People went by it too (founder I3): offered back, and asked even with one person left.
    // Whatever their state now: brought back from this very question, it stays the same question, and its answer
    // stands (reviewer C, r3: the restore re-read People, the question changed, and the pick was lost).
    const removed = (open.archived_ids ?? []).map((id) => input.people.find((p) => p.id === id)).filter((p): p is Person => !!p);
    if (meant.length + removed.length < 2 || meant.length === 0) continue;
    needs.push({
      type: "which_person",
      group: `slot:${fold(open.text)}:${meant.map((p) => p.id).sort().join(",")}`,
      prompt: `Which ${open.text} do you mean?`,
      reason: meant.length > 1 ? `You have more than one ${open.text}.` : removedReason(open.text, removed.length),
      choices: [
        ...meant.map((p) => ({ key: `p:${p.id}`, label: personLabel(p, input.people), answer: { person_id: p.id } })),
        ...removed.map(backChoice(input.people)),
        { key: "pick", label: COPY.someoneElse, pick: "person" as const },
      ],
      about: item.spans[0]?.quote?.trim() || undefined,
      slot: open.text,
    });
  }
  if (!personInQuestion && item.flags.includes("subject_check") && item.person_id) {
    const person = input.people.find((p) => p.id === item.person_id);
    const name = person?.display_name ?? "them";
    const relation = relationFor(item, input, note);
    needs.push({
      type: "about_whom",
      group: `whom:${item.person_id}:${relation ?? ""}`,
      prompt: relation ? `Is this about ${name}, or ${name}'s ${relation}?` : `Is this about ${name}?`,
      reason: null,
      choices: relation
        ? [
            { key: "person", label: name, answer: { subject: "person" } },
            { key: "related", label: `${name}'s ${relation}`, answer: { subject: "related", relation } },
          ]
        : [{ key: "person", label: `Yes, ${name}`, answer: { subject: "person" } }],
    });
  }
  if (item.kind === "promise" && item.flags.includes("promise_owner")) {
    // Founder J11: someone commits to something here, or asks the user to,
    // but whose promise it is isn't plain. Asked, never guessed or dropped.
    const person = item.person_id ? input.people.find((p) => p.id === item.person_id) : undefined;
    needs.push({
      type: "owner",
      group: `owner:${item.statement}:${item.spans[0]?.start ?? 0}`,
      prompt: "Whose promise?",
      reason: null,
      choices: [
        { key: "yours", label: "Yours", answer: { owner: "user" } },
        { key: "theirs", label: person ? `${shortName(person)}'s` : "Theirs", answer: { owner: "person" } },
      ],
    });
  }
  if (item.flags.includes("update_check") && Array.isArray(item.detail?._replaces)) {
    // Gate E: this reads as an update to something earlier, and two fit.
    const offered = (item.detail._replaces as { id: string; statement: string }[]).filter((r) => r.id && r.statement);
    needs.push({
      type: "replace",
      group: `replace:${offered.map((r) => r.id).join(",")}`,
      prompt: "Does this replace one of these?",
      reason: "It sounds like news about something you told me before.",
      choices: [
        ...offered.map((r) => ({ key: `r:${r.id}`, label: r.statement, answer: { replaces: r.id } })),
        { key: "both", label: "No, keep both", answer: { replaces: null } },
      ],
    });
  }
  if (item.flags.includes("residence_conflict") && item.still_in?.words && item.person_id) {
    // Phase 4B B3 (case E; founder CC-19, CC-24): a new residence that may not
    // fit the one Kinship holds, where a wrong pick would show something
    // false. Asked once, in the user's own words for both places; never
    // "Which Alameda?". The name, never a guessed pronoun (CC-20).
    const person = input.people.find((p) => p.id === item.person_id);
    if (person) {
      const q = residenceQuestion(shortName(person), item.still_in.words);
      needs.push({
        type: "residence",
        group: `residence:${item.still_in.target_id}`,
        prompt: q.prompt,
        reason: null,
        choices: [
          { key: "still", label: q.stay, answer: { moved: false } },
          { key: "moved", label: q.moved, answer: { moved: true } },
        ],
      });
    }
  }
  if (item.flags.includes("date_unresolved_sensitive")) {
    needs.push({
      type: "date",
      group: `date:${item.statement}`,
      prompt: "When is it?",
      reason: "I couldn't tell which day.",
      choices: [
        { key: "pick", label: COPY.pickDate, pick: "date" },
        { key: "none", label: COPY.noDate, answer: { date: null } },
      ],
    });
  }
  // Held for the user's yes: asked even when a name in it is asked too ("Which Sam?" is never a yes to the memory).
  if (needs.every((n) => n.slot !== undefined) && item.person_id && !PERSON_FLAGS.some((f) => item.flags.includes(f))) {
    // Held only for the user's yes: sensitive, or a day that reads two ways.
    const person = input.people.find((p) => p.id === item.person_id);
    const when = whenLabel(item.kind, item.detail ?? {}, input.today);
    // A promise's day is its due date: one that reads two ways can be chosen too (founder K10).
    const ambiguousDay = item.flags.includes("date_ambiguous") && (typeof item.detail?.date === "string" || typeof item.detail?.due_date === "string");
    const sensitive = item.sensitivity !== "none" || item.flags.includes("sensitive") || item.flags.includes("sensitivity_raised");
    needs.push({
      type: "keep",
      group: `keep:${item.statement}:${item.spans[0]?.start ?? 0}`,
      prompt: person ? `Remember this about ${person.display_name}?` : "Remember this?",
      reason: item.flags.includes("relation_conflict") && person && typeof person.relationship_label === "string" && person.relationship_label
        ? `${shortName(person)} is your ${person.relationship_label} here. Keep this instead?`
        : ambiguousDay ? "That day could be read two ways."
        : sensitive ? "This sounds personal, so I keep it only if you say so."
        : null,
      detail: [person ? personLabel(person, input.people) : null, when].filter(Boolean).join(" · ") || null,
      choices: [
        { key: "yes", label: "Remember", answer: {} },
        ...(ambiguousDay ? [{ key: "day", label: "A different day", pick: "date" as const }] : []),
      ],
    });
  }
  return needs;
}

/**
 * The people the note could mean: when the reading names who it asks about
 * ("Sam" with two Sams), only the people that name can mean, never someone
 * else the sentence names (founder I10: never "Michelle Lee" for "which
 * Sam?"); else those whose name is in the item's words, else anyone named in
 * the note.
 */
function candidatesFor(item: HeldItem, note: string, people: Person[]): Person[] {
  const live = people.filter((p) => p.state !== "archived");
  // A held "he" says exactly who it can mean: people named before it, then
  // the page's person; never the sentence's object (founder J1).
  if (Array.isArray(item.candidate_ids)) {
    return item.candidate_ids.map((id) => live.find((p) => p.id === id)).filter((p): p is Person => !!p).slice(0, 4);
  }
  // The name the line asks about: "Which Anthony?" and "Which Sam?" are two
  // questions, each offering only the people that name can mean (founder I13).
  const open = new Set((item.open_names ?? []).map((o) => fold(o.text)));
  const asked = item.mention ?? mentionsOf(item.person_mentions).find((m) => m.person_id === null && !open.has(fold(m.text)))?.text;
  const mention = asked ? wordsOf(asked).join(" ") : "";
  if (mention) {
    const meant = live.filter((p) => nameForms(p).some((f) => f === mention || f.split(" ")[0] === mention));
    // With someone removed who fits too (founder I3), even one person here is a choice.
    if (meant.length > 1 || (meant.length === 1 && item.archived_ids?.length)) return meant.slice(0, 4);
  }
  const inWords = (text: string) => {
    const words = new Set(wordsOf(text));
    return live.filter((p) => {
      const name = wordsOf(p.display_name);
      return name.length > 0 && (name.every((w) => words.has(w)) || words.has(name[0]));
    });
  };
  // Everyone its words name, never cut short (founder K4: a fifth person, the
  // second Sam, was left off "Who is this about?").
  const fromItem = inWords(item.spans.map((s) => s.quote).join(" "));
  if (fromItem.length > 1) return fromItem.slice(0, 7);
  const fromNote = inWords(note);
  return fromNote.length > 1 ? fromNote.slice(0, 7) : fromItem.length ? fromItem : fromNote;
}

/** The relation word, only when it is the user's own (it must be in the note). */
function relationFor(item: HeldItem, input: ReviewInput, note: string): string | null {
  const words = new Set(wordsOf(note));
  const proposed = item.related?.relation ?? null;
  if (proposed && words.has(fold(proposed))) return proposed;
  const asked = input.row.reading?.clarification;
  const option = asked?.about === "subject" ? asked.options[1] : undefined;
  const m = option ? /'s\s+(.+)$/u.exec(option) : null;
  const rel = m?.[1]?.trim() ?? null;
  return rel && words.has(fold(rel)) ? rel : null;
}

function fold(s: string): string {
  return s.normalize("NFKC").toLowerCase();
}

/** Whether a statement names this person: any name they go by, or its first word, as a whole capitalised word. */
function namesIn(statement: string, p: Person): boolean {
  const forms = [p.display_name, typeof p.full_name === "string" ? p.full_name : "", ...aliasesOf(p)].filter(Boolean);
  return forms.some((f) => usesName(statement, f) || usesName(statement, f.trim().split(/\s+/u)[0] ?? ""));
}

/** The words of every name a person goes by. */
function knownWords(p: Person): string[] {
  return [p.display_name, typeof p.full_name === "string" ? p.full_name : "", ...aliasesOf(p)].flatMap(wordsOf);
}

/** A person's names as word runs: display name, full name, other names. */
function nameForms(p: Person): string[] {
  const others = Array.isArray(p.nicknames) ? p.nicknames.filter((n): n is string => typeof n === "string") : [];
  return [p.display_name, typeof p.full_name === "string" ? p.full_name : "", ...others]
    .map((n) => wordsOf(n).join(" ")).filter(Boolean);
}

function wordsOf(s: string): string[] {
  return (fold(s).match(/\p{L}[\p{L}\p{M}'’-]*/gu) ?? []).map(withoutPossessive);
}
