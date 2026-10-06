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
//   nothing        understood, nothing to remember: "Your note is saved."
//   failed         "Couldn't understand this one. Your note is saved."
//   asWritten      understanding is off or declined: kept as written
//
// The review is a view over the note's durable row (store/understanding.ts):
// a result still on its way from sync is "understanding", never "none", so a
// sheet can't blank out and close while it arrives.

import { voiced } from "@/features/memory/statements";
import type { HeldAnswer, HeldItem } from "@/store/gateway";
import { SWITCHABLE_KINDS, takesDate } from "@/store/memoryDetail";
import type { MemoryItem, Person, RelatedPerson } from "@/store/repositories";
import { questionWaiting, type Notice, type UnderstandingRow } from "@/store/understanding";
import { kindLabel, promiseLabel, whenLabel } from "../memory/format";
import { selfRelationPhrase } from "../../../supabase/functions/_shared/extraction/lexicon";

export interface ReviewInput {
  row: UnderstandingRow;
  /** The note as told (raw_text is null once a "delete after" note settles). */
  capture: { id: string; raw_text: string | null; context_person_id: string | null; status: string } | null;
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
  /** The earlier memory this one updates, in its words ("Sam is interviewing at Stripe"). */
  replaces: string | null;
  /** value: the exact day, when there is one (for the date picker). */
  when: { label: string; value: string | null; changeable: boolean } | null;
  kind: {
    value: string;
    label: string;
    changeable: boolean;
    /** Promises only: whose commitment it is, and the other person's first name. */
    owner?: { value: "user" | "person"; name: string | null };
  };
  /** The user already changed it. */
  edited: boolean;
}

/** "keep": a sensitive or ambiguous reading that is not memory until the user says yes. */
export type QuestionType = "which_person" | "about_whom" | "new_person" | "replace" | "date" | "keep";

export type Choice =
  | { key: string; label: string; answer: Omit<HeldAnswer, "index"> }
  /** Opens the person list; the answer is { person_id }. */
  | { key: string; label: string; pick: "person" }
  /** Opens a date picker; the answer is { date }. */
  | { key: string; label: string; pick: "date" };

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
  /** The held items it answers. */
  items: number[];
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
}

export const COPY = {
  understanding: "Understanding…",
  offline: "I'll understand this when you're online.",
  retrying: "Couldn't understand this yet. Your note is saved, and I'll try again.",
  arriving: "Understanding…",
  kept: "Kept as you wrote it.",
  nothing: "Nothing to remember in that one. Your note is saved.",
  failed: "Couldn't understand this one. Your note is saved.",
  check: "One thing to check",
  notSure: "Not sure",
  answering: "Saving your answer…",
  answeringOffline: "I'll save your answer when you're online.",
  changedElsewhere: "This changed on another device.",
  chooseAgain: "That choice isn't available any more. Choose again.",
  skip: "Don't keep this",
  someoneElse: "Someone else",
  pickDate: "Pick a date",
  noDate: "No date",
  remember: "Here's what I'll remember",
  kept1: "Kept",
} as const;

const PERSON_FLAGS = ["person_ambiguous", "person_disagreement", "pronoun_multiple", "new_person"];

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
  if (row.state === "done" && row.reading && row.reading.saved.length === 0 && row.reading.held.length === 0) {
    // Understood, nothing to remember: said once, never silence.
    return { ...empty, mode: "nothing", status: COPY.nothing, canUndo: true };
  }
  if (row.state === "done" || row.state === "closing" || !row.reading) return empty;

  const reading = row.reading;
  const lines = input.items.map((item) => itemLine(item, input));
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
  const base: ReviewView = {
    ...empty,
    heading,
    lines,
    questions,
    answering,
    status: answering ? (offline ? COPY.answeringOffline : COPY.answering) : null,
    canUndo: true,
    personIds,
  };
  if (answering || questions.length || row.notice || questionWaiting(reading)) return { ...base, mode: "sheet" };
  // What the reading saved is still on its way here: understanding, not empty.
  if ((input.missing ?? 0) > 0) return { ...base, mode: "understanding", status: COPY.arriving };
  // Answered, and the answer kept nothing ("Don't keep this").
  if (lines.length === 0) return { ...base, mode: "nothing", status: COPY.nothing };
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
  return {
    id: item.id,
    statement: item.statement,
    person: person
      ? { id: person.id, label: personLabel(person, input.people), changeable: item.subject_type !== "related" }
      : null,
    about: related && person ? aboutLabel(person.display_name, related) : null,
    also: (Array.isArray(item.with_person_ids) ? item.with_person_ids : [])
      .map((id) => input.people.find((p) => p.id === id))
      .filter((p): p is Person => !!p)
      .map((p) => personLabel(p, input.people)),
    replaces: typeof item.supersedes_id === "string" ? input.earlier?.[item.supersedes_id] ?? null : null,
    // Shown only when there is a time to show (an event without one says so).
    when: when ? { label: when, value: exactDay(item), changeable: takesDate(item.kind) } : null,
    kind: item.kind === "promise"
      ? {
        value: item.kind,
        label: promiseLabel(ownerOf(item), person ? firstName(person.display_name) : null),
        // Whose promise is the one thing about a promise the user can change (H28).
        changeable: true,
        owner: { value: ownerOf(item), name: person ? firstName(person.display_name) : null },
      }
      : {
        value: item.kind,
        label: kindLabel(item.kind),
        changeable: (SWITCHABLE_KINDS as readonly string[]).includes(item.kind) && item.subject_type !== "user",
      },
    edited: item.user_state === "edited",
  };
}

/** A promise is the user's unless it's plainly someone else's commitment to them. */
function ownerOf(item: MemoryItem): "user" | "person" {
  return item.subject_type === "person" ? "person" : "user";
}

function firstName(name: string): string {
  return name.trim().split(/\s+/u)[0] ?? name;
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
    if (p) return `Kept for ${personLabel(p, input.people)}`;
  }
  if (lines.length) return COPY.remember;
  const context = input.capture?.context_person_id ? input.people.find((x) => x.id === input.capture?.context_person_id) : null;
  return context ? `About ${personLabel(context, input.people)}` : "Your note";
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
}

function questionsFor(held: HeldItem[], input: ReviewInput): Question[] {
  const groups = new Map<string, Question>();
  held.forEach((item, index) => {
    for (const need of needsOf(item, input)) {
      const about = need.about ?? item.statement;
      const q = groups.get(need.group);
      if (q) {
        q.items.push(index);
        if (!q.about.includes(about)) q.about.push(about);
      } else {
        groups.set(need.group, {
          key: `q${groups.size}`, type: need.type, prompt: need.prompt, reason: need.reason, about: [about], items: [index],
          choices: need.choices, skip: { key: "skip", label: COPY.skip }, detail: need.detail ?? null,
        });
      }
    }
  });
  const order: QuestionType[] = ["which_person", "about_whom", "new_person", "replace", "date", "keep"];
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
  const known = new Set(people.flatMap((p) => wordsOf(p.display_name)));
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
      const w = m[1].replace(/['’]s$/u, "");
      const k = fold(w);
      if (known.has(k) || PRONOUN.test(k) || NOT_NAMES.has(k) || out.some((o) => fold(o) === k)) continue;
      out.push(w);
    }
  }
  return out;
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
      needs.push({
        type: "new_person",
        group: `new:${fold(name)}`,
        prompt: `Is ${name} someone new?`,
        reason: `${name} isn't in your people yet.`,
        choices: [
          { key: "add", label: `Add ${name}`, answer: { new_person: true } },
          { key: "pick", label: "Someone already here", pick: "person" },
        ],
      });
    } else {
      const candidates = candidatesFor(item, note, input.people);
      const first = (p: Person) => p.display_name.trim().split(/\s+/u)[0];
      const shared = candidates.length > 1 && candidates.every((p) => fold(first(p)) === fold(first(candidates[0])))
        ? first(candidates[0])
        : null;
      const pronoun = item.flags.includes("pronoun_multiple") ? pronounIn(item) : null;
      // Someone the note names who isn't here yet ("my daughter Kaiya"): offered by name.
      const newNames = candidates.length === 0 ? unknownNames(item, input.people) : [];
      const choices: Choice[] = [
        ...candidates.map((p) => ({ key: `p:${p.id}`, label: personLabel(p, input.people), answer: { person_id: p.id } })),
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
          : shared ? `You have more than one ${shared}.`
          : newNames.length ? `${newNames.join(" and ")} ${newNames.length > 1 ? "aren't" : "isn't"} in your people yet.`
          : "I couldn't tell who this is about.",
        choices,
        // The exact sentence being clarified, in the note's own words.
        about: pronoun && sentence ? sentence : undefined,
      });
    }
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
  if (needs.length === 0 && item.person_id) {
    // Held only for the user's yes: sensitive, or a day that reads two ways.
    const person = input.people.find((p) => p.id === item.person_id);
    const when = whenLabel(item.kind, item.detail ?? {}, input.today);
    const ambiguousDay = item.flags.includes("date_ambiguous") && typeof item.detail?.date === "string";
    const sensitive = item.sensitivity !== "none" || item.flags.includes("sensitive") || item.flags.includes("sensitivity_raised");
    needs.push({
      type: "keep",
      group: `keep:${item.statement}:${item.spans[0]?.start ?? 0}`,
      prompt: person ? `Remember this about ${person.display_name}?` : "Remember this?",
      reason: ambiguousDay ? "That day could be read two ways."
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

/** The people the note could mean: those whose name is in the item's words, else anyone named in the note. */
function candidatesFor(item: HeldItem, note: string, people: Person[]): Person[] {
  const live = people.filter((p) => p.state !== "archived");
  const inWords = (text: string) => {
    const words = new Set(wordsOf(text));
    return live.filter((p) => {
      const name = wordsOf(p.display_name);
      return name.length > 0 && (name.every((w) => words.has(w)) || words.has(name[0]));
    });
  };
  const fromItem = inWords(item.spans.map((s) => s.quote).join(" "));
  if (fromItem.length > 1) return fromItem.slice(0, 4);
  const fromNote = inWords(note);
  return fromNote.length > 1 ? fromNote.slice(0, 4) : fromItem.length ? fromItem : fromNote;
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

function wordsOf(s: string): string[] {
  return (fold(s).match(/\p{L}[\p{L}\p{M}'’-]*/gu) ?? []).map((w) => w.replace(/['’]s$/u, ""));
}
