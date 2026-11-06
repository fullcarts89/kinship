// "You could mention" (founder K26, 17 Oct): up to two grounded talking
// points for a conversation the user is about to have, chosen by a small,
// deterministic preference, never by a model, a score or a guess about what
// matters to the relationship.
//
// The user has already decided to reach out (from a Moment, or from the
// person's page), so this may draw on more than Today's proactive rules let
// through: a wedding "this fall" with no day, an open thread, a plan, a pet's
// appointment. Today's own eligibility is untouched: nothing here makes a
// Moment, and an undated or seasonal line is a talking point, never an event
// with a day.
//
//   candidates  the person's current lines (active, theirs or shared with
//               them, not sensitive, not the user's own promise), while they
//               are still current: a dated event or milestone from a month
//               after its day to four months ahead; a seasonal, monthly or
//               yearly one while its span (plus a month) lasts; a plan while
//               it is ahead; anything undated told in the last four months
//   order       1. what the hand-off is about (the same relative, or a word
//                  the two lines share: "Fluffy"), 2. what is going on or
//                  coming up (a milestone, an event, a plan, an open thread),
//                  3. other current facts and shared context, 4. a memory
//                  shared with other People, only when it is about the
//                  hand-off's subject or nothing better is left. Within a
//                  tier, the nearest day first, then the newest told
//   words       the line as the page shows it, never rewritten: "this fall"
//               stays "this fall"
//   opener      one fixed sentence under the first line when it is a
//               milestone still ahead ("You could ask how the wedding plans
//               are going."), clearly a suggestion, never the user's words.
//               Copy is a proposal (approved-design-coverage.md)
//   none        is an answer: nothing is offered when nothing is useful

import type { MemoryItem, Person } from "@/store/repositories";
import { shortName } from "../../../supabase/functions/_shared/extraction/names";

export const MENTION_RULES = {
  /** At most this many lines. */
  max: 2,
  /** Undated lines count as current while told within this many days (the page's own "lately"). */
  latelyDays: 120,
  /** A dated event or milestone stays a talking point this long after its day. */
  recentDays: 30,
  /** And this far ahead. */
  aheadDays: 120,
  /** A seasonal, monthly or yearly line is current until this long after its span ends. */
  coarseGraceDays: 30,
} as const;

/** The suggested opener per milestone (copy is a proposal). */
export const MENTION_OPENERS: Record<string, string> = {
  wedding: "You could ask how the wedding plans are going.",
  engagement: "You could ask how the wedding plans are going.",
  new_job: "You could ask how the new job is going.",
  promotion: "You could ask how the new role is going.",
  new_home: "You could ask how the new place is.",
  move: "You could ask how the move is going.",
  baby: "You could ask how everyone is doing.",
};

export interface MentionInput {
  /** The person's lines, voiced as the page shows them (theirs and those shared with them). */
  items: MemoryItem[];
  person: Person;
  /** Today as an ISO day where the user is. */
  today: string;
  /** What the hand-off is about (a Moment's memory), when there is one. */
  about?: MemoryItem | null;
}

export interface Mentions {
  lines: string[];
  /** One suggested question under the first line, or none. */
  opener: string | null;
}

const COARSE = new Set(["week", "month", "season", "year"]);
const KINDS = new Set(["fact", "thread", "event", "plan", "milestone", "moment", "context", "tradition"]);
/** Words too common to say two lines are about the same thing. */
const STOP = new Set([
  "that", "with", "this", "have", "from", "about", "their", "they", "them", "will", "going", "been", "were", "what", "when", "your",
  "just", "like", "also", "some", "very", "more", "make", "made", "next", "last", "week", "month", "year", "today", "tomorrow", "named",
  "there", "here", "into", "over", "after", "before", "again", "still", "than", "then", "being", "does", "doing", "much", "many", "most",
  "said", "says", "told", "tell", "want", "wants", "would", "could", "should", "might", "getting", "really", "thing", "things", "time",
]);

function utc(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

function daysFrom(today: string, day: string): number {
  return Math.round((utc(day) - utc(today)) / 86_400_000);
}

function detailOf(m: MemoryItem): Record<string, unknown> {
  return (m.detail ?? {}) as Record<string, unknown>;
}

function dayField(d: Record<string, unknown>, key: string): string | null {
  const v = d[key];
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/u.test(v) ? v.slice(0, 10) : null;
}

/** The line's day, and whether it is only a season, a month, a week or a year (shared with suggestions.ts). */
export function timeOf(m: MemoryItem): { day: string | null; end: string | null; coarse: boolean } {
  const d = detailOf(m);
  const day = dayField(d, "date") ?? dayField(d, "due_date");
  const precision = typeof d.date_precision === "string" ? d.date_precision : null;
  return { day, end: dayField(d, "date_end"), coarse: !!day && !!precision && COARSE.has(precision) };
}

function toldDay(m: MemoryItem): string | null {
  const c = String(m.created_at ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/u.test(c) ? c : null;
}

/** Whether the line is still something to talk about today (its own time, in its own precision; shared with suggestions.ts). */
export function current(m: MemoryItem, today: string): boolean {
  const R = MENTION_RULES;
  const { day, end, coarse } = timeOf(m);
  const told = toldDay(m);
  const lately = !!told && daysFrom(today, told) >= -R.latelyDays && daysFrom(today, told) <= 0;
  if (!day) return lately;
  if (coarse) {
    // "This fall" lasts the season and a little after; never certain of a day it never had.
    const last = end ?? day;
    return daysFrom(today, last) >= -R.coarseGraceDays && daysFrom(today, day) <= R.aheadDays + 90;
  }
  const n = daysFrom(today, day);
  if (m.kind === "plan") return n >= 0 && n <= R.aheadDays;
  return n >= -R.recentDays && n <= R.aheadDays;
}

function nameWords(person: Person): Set<string> {
  const names = [person.display_name, shortName(person), String((person as { full_name?: unknown }).full_name ?? "")];
  const nick = (person as { nicknames?: unknown }).nicknames;
  if (Array.isArray(nick)) names.push(...nick.map(String));
  return new Set(names.flatMap((n) => n.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u)).filter(Boolean));
}

/** The words a line can be recognised by: four letters or more, not the person's name, not a common word. */
function tokens(statement: string, names: Set<string>): Set<string> {
  return new Set(
    statement.toLocaleLowerCase().replace(/[’']s\b/gu, "").split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 4 && !STOP.has(w) && !names.has(w)),
  );
}

function shared(m: MemoryItem, person: Person): boolean {
  return m.person_id !== person.id || (Array.isArray(m.with_person_ids) && m.with_person_ids.length > 0);
}

function tierOf(m: MemoryItem, person: Person, about: MemoryItem | null, aboutTokens: Set<string>, names: Set<string>): number {
  if (about) {
    const rel = (about as { subject_related_id?: unknown }).subject_related_id;
    const sameRelative = typeof rel === "string" && (m as { subject_related_id?: unknown }).subject_related_id === rel;
    const overlap = [...tokens(m.statement, names)].some((w) => aboutTokens.has(w));
    if (sameRelative || overlap) return 1;
  }
  if (shared(m, person)) return 4;
  if (m.kind === "milestone" || m.kind === "event" || m.kind === "plan" || m.kind === "thread") return 2;
  return 3;
}

/** Nearest day first (an undated line after every dated one), then the newest told. */
function nearerFirst(today: string): (a: MemoryItem, b: MemoryItem) => number {
  const distance = (m: MemoryItem) => {
    const { day } = timeOf(m);
    return day ? Math.abs(daysFrom(today, day)) : Number.POSITIVE_INFINITY;
  };
  return (a, b) => distance(a) - distance(b) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || a.id.localeCompare(b.id);
}

function openerFor(m: MemoryItem, today: string): string | null {
  if (m.kind !== "milestone") return null;
  const type = detailOf(m).milestone_type;
  const text = typeof type === "string" ? MENTION_OPENERS[type] : undefined;
  if (!text) return null;
  // Only while it is still ahead (a day that has passed is not "plans").
  const { day, coarse } = timeOf(m);
  if (day && !coarse && daysFrom(today, day) < 0) return null;
  return text;
}

export function mentionsFor(input: MentionInput): Mentions {
  const { person, today } = input;
  const about = input.about ?? null;
  const names = nameWords(person);
  const aboutTokens = about ? tokens(about.statement, names) : new Set<string>();
  const candidates = input.items.filter((m) =>
    m.id !== about?.id &&
    m.status === "active" && !m.deleted_at &&
    KINDS.has(m.kind) && m.subject_type !== "user" &&
    (m.sensitivity ?? "none") === "none" &&
    (m.person_id === person.id || (Array.isArray(m.with_person_ids) && m.with_person_ids.includes(person.id))) &&
    current(m, today) && m.statement.trim().length > 0
  );
  const by = nearerFirst(today);
  const ranked = candidates
    .map((m) => ({ m, tier: tierOf(m, person, about, aboutTokens, names) }))
    .sort((a, b) => a.tier - b.tier || by(a.m, b.m));
  const chosen: MemoryItem[] = [];
  for (const { m } of ranked) {
    if (chosen.length >= MENTION_RULES.max) break;
    if (chosen.some((c) => c.statement === m.statement)) continue;
    chosen.push(m);
  }
  return { lines: chosen.map((m) => m.statement), opener: chosen[0] ? openerFor(chosen[0], today) : null };
}
