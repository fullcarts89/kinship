// "Here's what I'll remember" (plan §8; Checkpoint D1) as plain data for the
// screen. Every string is human copy: the user sees what they said, who and
// when it's about, and at most one question at a time. Nothing names a tier,
// a score, a model, a guard or a table; how sure the reading was only decides
// whether the review is a quiet summary or a sheet to look over.

import type { HeldAnswer, HeldItem } from "@/store/gateway";
import { SWITCHABLE_KINDS, takesDate } from "@/store/memoryDetail";
import type { MemoryItem, Person, RelatedPerson } from "@/store/repositories";
import { questionWaiting, type Notice, type UnderstandingRow } from "@/store/understanding";
import { kindLabel, whenLabel } from "../memory/format";

export interface ReviewInput {
  row: UnderstandingRow;
  /** The note as told (raw_text is null once a "delete after" note settles). */
  capture: { id: string; raw_text: string | null; context_person_id: string | null; status: string } | null;
  /** The live items this note saved (Understanding.itemsFor). */
  items: MemoryItem[];
  people: Person[];
  related: RelatedPerson[];
  offline: boolean;
  /** Today as an ISO day, for "this year" in dates. */
  today: string;
}

export type ReviewMode =
  /** Kept; being understood (or waiting to be online). */
  | "understanding"
  /** Everything was clear: a short line with Undo, no tap needed. */
  | "summary"
  /** Something to look over, a question, or a change to explain. */
  | "sheet"
  /** Kept exactly as written. */
  | "kept"
  /** Nothing to show. */
  | "none";

export interface ItemLine {
  id: string;
  statement: string;
  person: { id: string; label: string; changeable: boolean } | null;
  /** About someone close to the person: "Sarah's sister". */
  about: string | null;
  /** value: the exact day, when there is one (for the date picker). */
  when: { label: string; value: string | null; changeable: boolean } | null;
  kind: { value: string; label: string; changeable: boolean };
  /** The user already changed it. */
  edited: boolean;
}

/** "keep": a sensitive or ambiguous reading that is not memory until the user says yes. */
export type QuestionType = "which_person" | "about_whom" | "new_person" | "date" | "keep";

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
}

export const COPY = {
  understanding: "Understanding…",
  offline: "I'll understand this when you're online.",
  kept: "Kept as you wrote it.",
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
  const empty: ReviewView = {
    mode: "none", heading: COPY.kept1, status: null, notice: noticeCopy(row.notice), summary: null,
    lines: [], questions: [], answering: false, canUndo: false,
  };
  if (!capture) return empty;
  if (row.state === "waiting") {
    return { ...empty, mode: "understanding", status: offline ? COPY.offline : COPY.understanding, canUndo: true };
  }
  if (row.state === "kept") return { ...empty, mode: "kept", status: COPY.kept, canUndo: true };
  if (row.state === "done" || row.state === "closing" || !row.reading) return empty;

  const reading = row.reading;
  const lines = input.items.map((item) => itemLine(item, input));
  const answering = row.state === "answering";
  const questions = questionWaiting(reading) && !answering ? questionsFor(reading.held, input) : [];
  const heading = headingFor(input, lines);
  const base: ReviewView = {
    ...empty,
    heading,
    lines,
    questions,
    answering,
    status: answering ? (offline ? COPY.answeringOffline : COPY.answering) : null,
    canUndo: true,
  };
  if (answering || questions.length || row.notice || questionWaiting(reading)) return { ...base, mode: "sheet" };
  if (lines.length === 0) return { ...base, mode: "none" };
  const quiet = reading.tier === "auto" || (reading.tier === "unknown" && capture.status !== "needs_review");
  if (quiet && !reading.answered && lines.every((l) => !l.edited)) {
    return { ...base, mode: "summary", summary: summaryFor(lines) };
  }
  return { ...base, mode: "sheet" };
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
export function itemLine(item: MemoryItem, input: Pick<ReviewInput, "people" | "related" | "today">): ItemLine {
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
    // Shown only when there is a time to show (an event without one says so).
    when: when ? { label: when, value: exactDay(item), changeable: takesDate(item.kind) } : null,
    kind: {
      value: item.kind,
      label: kindLabel(item.kind),
      changeable: (SWITCHABLE_KINDS as readonly string[]).includes(item.kind) && item.subject_type !== "user",
    },
    edited: item.user_state === "edited",
  };
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

function headingFor(input: ReviewInput, lines: ItemLine[]): string {
  const ids = new Set(lines.map((l) => l.person?.id).filter((x): x is string => !!x));
  if (ids.size === 1) {
    const p = input.people.find((x) => ids.has(x.id));
    if (p) return `Kept for ${personLabel(p, input.people)}`;
  }
  if (ids.size === 0 && input.capture?.context_person_id) {
    const p = input.people.find((x) => x.id === input.capture?.context_person_id);
    if (p) return `Kept for ${personLabel(p, input.people)}`;
  }
  return lines.length ? COPY.remember : COPY.kept1;
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
  choices: Choice[];
  detail?: string | null;
}

function questionsFor(held: HeldItem[], input: ReviewInput): Question[] {
  const groups = new Map<string, Question>();
  held.forEach((item, index) => {
    for (const need of needsOf(item, input)) {
      const q = groups.get(need.group);
      if (q) {
        q.items.push(index);
        if (!q.about.includes(item.statement)) q.about.push(item.statement);
      } else {
        groups.set(need.group, {
          key: `q${groups.size}`, type: need.type, prompt: need.prompt, about: [item.statement], items: [index],
          choices: need.choices, skip: { key: "skip", label: COPY.skip }, detail: need.detail ?? null,
        });
      }
    }
  });
  const order: QuestionType[] = ["which_person", "about_whom", "new_person", "date", "keep"];
  return [...groups.values()]
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
    .map((q, n) => ({ ...q, key: `q${n}` }));
}

function needsOf(item: HeldItem, input: ReviewInput): Need[] {
  const needs: Need[] = [];
  const note = input.capture?.raw_text ?? "";
  const personInQuestion = !item.person_id || PERSON_FLAGS.some((f) => item.flags.includes(f));
  if (personInQuestion) {
    if (!item.person_id && item.new_person_name && item.flags.includes("new_person")) {
      const name = item.new_person_name;
      needs.push({
        type: "new_person",
        group: `new:${fold(name)}`,
        prompt: `Is ${name} someone new?`,
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
      const prompt = shared ? `Which ${shared} do you mean?` : "Who is this about?";
      needs.push({
        type: "which_person",
        group: `who:${candidates.map((p) => p.id).sort().join(",")}`,
        prompt,
        choices: [
          ...candidates.map((p) => ({ key: `p:${p.id}`, label: personLabel(p, input.people), answer: { person_id: p.id } })),
          { key: "pick", label: candidates.length ? COPY.someoneElse : "Choose who", pick: "person" as const },
        ],
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
      choices: relation
        ? [
            { key: "person", label: name, answer: { subject: "person" } },
            { key: "related", label: `${name}'s ${relation}`, answer: { subject: "related", relation } },
          ]
        : [{ key: "person", label: `Yes, ${name}`, answer: { subject: "person" } }],
    });
  }
  if (item.flags.includes("date_unresolved_sensitive")) {
    needs.push({
      type: "date",
      group: `date:${item.statement}`,
      prompt: "When is it?",
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
    needs.push({
      type: "keep",
      group: `keep:${item.statement}:${item.spans[0]?.start ?? 0}`,
      prompt: person ? `Remember this about ${person.display_name}?` : "Remember this?",
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
