// SUA-1, the gesture line (CC-28's first probe; authorised as a limited, non-commercial prototype by
// FD-30d, 30 Oct 2026): one quiet, fixed-template "You could…" line beneath Message and Call on the
// hand-off sheet and in the Moment detail, for a small set of grounded contexts. The user has already
// decided to reach out; this suggests one thoughtful thing the conversation could be for. It is
// deterministic, from the person's current lines by the same preference "You could mention" uses
// (mentions.ts), never a model, a score, a shop or a provider.
//
//   contexts   a milestone or celebration ahead → a plan ("invite them to dinner") or help (a move, a
//              new home, a baby); an event ahead the user knows about → company; good news → a note; an
//              interest of theirs, in the user's own words, when a shared plan is what the hand-off is
//              about → an activity together. An open promise of the user's own → nothing (the promise
//              is the action).
//   excluded   any sensitive line (by label or by wording), any relative's line, anyone remembered or
//              paused, anything retracted, superseded, expired or no longer current.
//   a tap      opens the same hand-off (Messages), with nothing pre-written (D9). Never a shop.
//   measured   gesture_shown / gesture_tapped / gesture_outcome with a closed kind, content-free
//              (src/platform/analytics.ts). What Kinship suggested, what the user initiated and what they
//              confirmed stay three different things.
//   copy       SUGGESTION_COPY, fixed templates in the K26 register: clearly a suggestion, never the
//              user's words, never a second primary action. A proposal for the founder's review.
//   none       is an answer.

import { milestoneIn, type MilestoneType } from "./milestones";
import { current, timeOf } from "./mentions";
import { GOOD_NEWS, NOT_NEWS } from "./goodNews";
import { wordingSensitivities } from "../../../supabase/functions/_shared/extraction/lexicon";
import type { MemoryItem, Person } from "@/store/repositories";

export type GestureKind = "plan" | "help" | "company" | "note" | "activity";

export interface Suggestion {
  kind: GestureKind;
  /** The line as shown ("You could invite them to dinner."). */
  text: string;
  /** The one optional question after a Yes that followed a tap ("Did you make a plan?"), content-free. */
  outcomeAsk: string;
}

/**
 * The fixed templates (a proposal for the founder's review, approved-design-coverage.md). `activity`
 * carries the interest in the user's own words ("You could suggest doing pottery together.").
 */
export const SUGGESTION_COPY = {
  plan: "You could invite them to dinner.",
  help: "You could offer to help.",
  company: "You could ask if they'd like company.",
  note: "You could send a note.",
  activity: (interest: string) => `You could suggest doing ${interest} together.`,
} as const;

/** After a Yes that followed a tap: one optional question, Yes · Not yet, recorded as the kind alone. */
export const OUTCOME_ASK: Record<GestureKind, string> = {
  plan: "Did you make a plan?",
  help: "Did you offer to help?",
  company: "Did you ask if they'd like company?",
  note: "Did you send a note?",
  activity: "Did you make a plan?",
};

/** Which milestones ahead call for a plan, and which for help (a proposal). */
const MILESTONE_GESTURE: Record<MilestoneType, "plan" | "help"> = {
  wedding: "plan", engagement: "plan", graduation: "plan", retirement: "plan", promotion: "plan", new_job: "plan",
  new_home: "help", move: "help", baby: "help",
};

/** The limit on an interest said back in the user's words. */
const INTEREST_MAX = 30;

export interface SuggestionInput {
  /** The person's lines, voiced as the page shows them (theirs and those shared with them). */
  items: MemoryItem[];
  person: Person;
  /** Today as an ISO day where the user is. */
  today: string;
  /** What the hand-off is about (a Moment's memory), when there is one. */
  about?: MemoryItem | null;
  /** The note's own words behind an item (its sources' quotes): an interest is said only in those. */
  quotes?: (itemId: string) => string[];
}

function detailOf(m: MemoryItem): Record<string, unknown> {
  return (m.detail ?? {}) as Record<string, unknown>;
}

function daysFrom(today: string, day: string): number {
  const utc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((utc(day) - utc(today)) / 86_400_000);
}

/** Theirs, or shared with them; never a relative's, never the user's own line. */
function theirs(m: MemoryItem, person: Person): boolean {
  const subject = m.subject_type;
  if (subject !== undefined && subject !== "person" && subject !== "shared") return false;
  return m.person_id === person.id || (Array.isArray(m.with_person_ids) && m.with_person_ids.includes(person.id));
}

function usable(m: MemoryItem, person: Person, today: string): boolean {
  return m.status === "active" && !m.deleted_at && theirs(m, person) &&
    (m.sensitivity ?? "none") === "none" && wordingSensitivities(m.statement).length === 0 &&
    m.statement.trim().length > 0 && current(m, today);
}

/** A milestone still ahead (its day, or a season or month not yet over, or no day at all). */
function milestoneAhead(m: MemoryItem, today: string): MilestoneType | null {
  if (m.kind !== "milestone" && m.kind !== "event" && m.kind !== "plan") return null;
  const d = detailOf(m);
  const named = typeof d.milestone_type === "string" && d.milestone_type in MILESTONE_GESTURE ? (d.milestone_type as MilestoneType) : milestoneIn(m.statement);
  if (!named) return null;
  const { day, coarse } = timeOf(m);
  if (day && !coarse && daysFrom(today, day) < 0) return null;
  return named;
}

/** An event ahead, the person's own (tomorrow or later), that the user knows about. */
function eventAhead(m: MemoryItem, today: string): boolean {
  if (m.kind !== "event") return false;
  const { day, coarse } = timeOf(m);
  return !!day && !coarse && daysFrom(today, day) >= 1;
}

function goodNews(m: MemoryItem): boolean {
  return ["fact", "milestone", "event", "moment"].includes(m.kind) && GOOD_NEWS.test(m.statement) && !NOT_NEWS.test(m.statement);
}

/** An interest of theirs, in the user's own words (the note's quote must say it), short and plain. */
function interestOf(m: MemoryItem, quotes: string[]): string | null {
  if (m.kind !== "fact") return null;
  const d = detailOf(m);
  if (d.category !== "interest" && d.category !== "preference") return null;
  const value = typeof d.value === "string" ? d.value.trim().replace(/[.!]+$/u, "") : "";
  if (!value || value.length > INTEREST_MAX || !/^[\p{L}\p{N}][\p{L}\p{N}' -]*$/u.test(value) || /^\p{Lu}/u.test(value)) return null;
  const said = (t: string) => t.toLocaleLowerCase().includes(value.toLocaleLowerCase());
  return quotes.some(said) ? value : null;
}

function gestureFor(m: MemoryItem, today: string): { kind: GestureKind } | null {
  const milestone = milestoneAhead(m, today);
  if (milestone) return { kind: MILESTONE_GESTURE[milestone] };
  if (eventAhead(m, today)) return { kind: "company" };
  if (goodNews(m)) return { kind: "note" };
  return null;
}

function nearerFirst(today: string): (a: MemoryItem, b: MemoryItem) => number {
  const distance = (m: MemoryItem) => {
    const { day } = timeOf(m);
    return day ? Math.abs(daysFrom(today, day)) : Number.POSITIVE_INFINITY;
  };
  return (a, b) => distance(a) - distance(b) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || a.id.localeCompare(b.id);
}

function make(kind: GestureKind, interest?: string): Suggestion {
  const text = kind === "activity" ? SUGGESTION_COPY.activity(interest ?? "") : SUGGESTION_COPY[kind];
  return { kind, text, outcomeAsk: OUTCOME_ASK[kind] };
}

/**
 * The one suggestion for this hand-off, or null. What the hand-off is about decides first; else the
 * person's current lines, nearest day first, the first that fits.
 */
export function suggestionFor(input: SuggestionInput): Suggestion | null {
  const { person, today } = input;
  if (person.state !== "active" || person.deleted_at) return null;
  const about = input.about ?? null;
  // An open promise of the user's own: the promise is the action; nothing is added to it.
  if (about && about.kind === "promise") return null;
  if (about && about.status === "active" && !about.deleted_at && (about.sensitivity ?? "none") !== "none") return null;
  // A shared plan being made: an interest of theirs, in the user's own words, to do together.
  if (about && about.kind === "plan" && about.status === "active" && !about.deleted_at && (about.subject_type === "shared" || (Array.isArray(about.with_person_ids) && about.with_person_ids.length > 0))) {
    const interests = input.items
      .filter((m) => usable(m, person, today) && m.person_id === person.id)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    for (const m of interests) {
      const interest = interestOf(m, input.quotes?.(m.id) ?? []);
      if (interest) return make("activity", interest);
    }
  }
  if (about && usable(about, person, today)) {
    const g = gestureFor(about, today);
    if (g) return make(g.kind);
  }
  const candidates = input.items.filter((m) => m.id !== about?.id && usable(m, person, today)).sort(nearerFirst(today));
  for (const m of candidates) {
    const g = gestureFor(m, today);
    if (g) return make(g.kind);
  }
  return null;
}
