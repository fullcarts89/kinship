// Ideas for showing up (PR #77 §4; founder directive 2 Nov 2026). Deterministic, from what the user told
// Kinship and nothing else: no model, no score, no shop, no guess about what anyone needs.
//
//   where        only behind an explicit control, inside an expanded Moment and on a person's Now lens;
//                never on Today's card, in a notification, on the lock screen or in a widget.
//   grounding    every idea quotes the memory it came from, in the user's own words, with its source;
//                an idea with no grounding is not shown. A birthday from Contacts grounds only the
//                birthday's own idea, and says "From Contacts".
//   exclusions   SUA-1's: anything sensitive (by label or by wording), a relative's line, anyone
//                remembered or paused, anything retracted, superseded, expired or no longer current. The
//                one exception is the user's own open promise: it is their word, and it leads.
//   titles       Option A (DN-6, the founder's "start with A"): a fixed template per category, never in
//                the user's voice; the quote under it is theirs.
//   order        the user's own promise first, then what the Moment is about, then the newest told.
//   count        0–3. Zero is an answer: the control isn't shown.
//   ways         Message / Call (hand-offs; nothing written or sent), Keep it in mind (an intention, or a
//                day added to the user's own promise), Nothing to set (it already comes back on its day).
//                Help me start (DN-8), Find it (DN-16) and Write a card stay out until decided.
import { shortName } from "../../../supabase/functions/_shared/extraction/names";
import { wordingSensitivities } from "../../../supabase/functions/_shared/extraction/lexicon";
import { current } from "@/features/today/mentions";
import { eventAhead, goodNews, interestOf, MILESTONE_GESTURE, milestoneAhead, theirs, usable, type GestureKind } from "@/features/today/suggestions";
import type { IdeaCategoryName } from "@/platform/analytics";
import { isProactiveEligible } from "@/store/peopleStates";
import type { MemoryItem, Person } from "@/store/repositories";

export type IdeaCategory = IdeaCategoryName;

/** The category as the card says it (always with words; the tint is never the only signal). */
export const CATEGORY_LABEL: Record<IdeaCategory, string> = {
  gesture: "A gesture",
  celebrate: "Celebrate",
  together: "Time together",
  help: "Practical help",
  follow_through: "Follow through",
  message: "Message",
  check_in: "Check in",
};

export type IdeaWay = "message" | "call" | "keep" | "onday";

export interface IdeaGround {
  /** The memory, or null for a birthday from Contacts. */
  itemId: string | null;
  /** The user's own words behind it (the note's span), else the line as kept. */
  quote: string;
  /** "From your note · Oct 8", "From Contacts". */
  source: string;
  /** The line as the page shows it (what "You could mention" would have said). */
  line?: string;
  noteId: string | null;
  contacts?: boolean;
}

export interface Idea {
  id: string;
  category: IdeaCategory;
  title: string;
  grounds: IdeaGround[];
  ways: IdeaWay[];
  /** The user's own open promise this idea is about: Keep it in mind adds a day to it instead of a new line. */
  promise?: { itemId: string; statement: string; due: string | null };
  /** The words "Keep it in mind" starts from (the user changes them); never sent anywhere. */
  keep: string;
  /** The SUA-1 kind a hand-off from this idea carries, so a Yes may ask its one content-free question. */
  gesture: GestureKind | null;
}

export interface IdeasInput {
  person: Person;
  /** The person's lines (theirs, shared with them, and the user's own promises about them), voiced. */
  items: MemoryItem[];
  today: string;
  /** What the Moment is about, when the ideas open inside one. */
  about?: MemoryItem | null;
  /** The Moment is their birthday, or it is within the next week (from Contacts). */
  birthday?: { day: string } | null;
  quotes: (itemId: string) => string[];
  provenance: (itemId: string) => { line: string; noteId: string | null } | null;
}

export const IDEAS_MAX = 3;

/** The templates (Option A): plain, never the user's voice, never a promise of what anyone feels. */
export function ideaTitle(category: IdeaCategory, name: string, value?: string | null): string {
  switch (category) {
    case "follow_through": return "Follow through on what you said";
    case "celebrate": return `Celebrate with ${name}`;
    case "help": return `Offer ${name} a hand`;
    case "together": return value ? `Suggest doing ${value} together` : `Make time with ${name}`;
    case "message": return `Send ${name} a note`;
    case "check_in": return `Ask ${name} how it's going`;
    case "gesture": return `Something for ${name}`;
  }
}

const GESTURE_OF: Record<IdeaCategory, GestureKind | null> = {
  celebrate: "plan", help: "help", together: "company", message: "note", gesture: null, follow_through: null, check_in: null,
};

function ownOpenPromise(m: MemoryItem, person: Person): boolean {
  return m.kind === "promise" && m.subject_type === "user" && m.status === "active" && !m.deleted_at &&
    (m.person_id === person.id || (Array.isArray(m.with_person_ids) && m.with_person_ids.includes(person.id)));
}

function sentence(s: string): string {
  const t = s.trim();
  if (!t) return t;
  const first = t.charAt(0).toLocaleUpperCase() + t.slice(1);
  return /[.!?…”"]$/u.test(first) ? first : `${first}.`;
}

function groundOf(m: MemoryItem, input: IdeasInput): IdeaGround | null {
  const p = input.provenance(m.id);
  if (!p) return null;
  const words = input.quotes(m.id).find((q) => q.trim().length > 0);
  return { itemId: m.id, quote: sentence(words ?? m.statement), source: p.line, noteId: p.noteId, line: m.statement };
}

/** Which idea a line grounds, if any (one per line). */
function categoryOf(m: MemoryItem, input: IdeasInput): { category: IdeaCategory; value?: string | null } | null {
  const { today } = input;
  const milestone = milestoneAhead(m, today);
  if (milestone) return { category: MILESTONE_GESTURE[milestone] === "help" ? "help" : "celebrate" };
  if (eventAhead(m, today)) return { category: "message" };
  if (goodNews(m)) return { category: "celebrate" };
  const interest = interestOf(m, input.quotes(m.id));
  if (interest) return { category: "together", value: interest };
  const d = (m.detail ?? {}) as Record<string, unknown>;
  if (m.kind === "fact" && (d.category === "interest" || d.category === "preference") && input.quotes(m.id).length) return { category: "gesture" };
  if (m.kind === "thread") return { category: "check_in" };
  return null;
}

function keepWords(category: IdeaCategory, name: string, value?: string | null): string {
  switch (category) {
    case "celebrate": return `Celebrate with ${name}.`;
    case "help": return `Offer ${name} a hand.`;
    case "together": return value ? `Suggest doing ${value} with ${name}.` : `Make time with ${name}.`;
    case "message": return `Send ${name} a note.`;
    case "check_in": return `Ask ${name} how it's going.`;
    case "gesture": return `Something for ${name}.`;
    case "follow_through": return "";
  }
}

/**
 * The ideas for this person (and Moment), or none. Pure: the same lines give the same ideas.
 */
export function ideasFor(input: IdeasInput): Idea[] {
  const { person, today } = input;
  // D13: nobody remembered, paused or removed gets an idea, as they get no reason.
  if (!isProactiveEligible(person)) return [];
  const name = shortName(person) || person.display_name;
  const about = input.about ?? null;
  const out: Idea[] = [];
  const used = new Set<string>();

  // 1. The user's own open promises: their word comes first (sensitive or not: it is theirs, already on their page).
  const promises = input.items.filter((m) => ownOpenPromise(m, person))
    .sort((a, b) => (a.id === about?.id ? -1 : b.id === about?.id ? 1 : 0) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  for (const m of promises) {
    if (out.length >= IDEAS_MAX) break;
    const g = groundOf(m, input);
    if (!g) continue;
    const due = typeof (m.detail as Record<string, unknown> | undefined)?.due_date === "string" ? String((m.detail as Record<string, unknown>).due_date) : null;
    out.push({
      id: `promise:${m.id}`, category: "follow_through", title: ideaTitle("follow_through", name), grounds: [g],
      ways: ["message", "call", "keep"], promise: { itemId: m.id, statement: m.statement, due }, keep: m.statement, gesture: null,
    });
    used.add(m.id);
  }

  // 2. Their birthday, when the Moment is it or it is close: it already comes back on the day.
  if (input.birthday && out.length < IDEAS_MAX) {
    out.push({
      id: `birthday:${person.id}:${input.birthday.day}`, category: "celebrate", title: `Wish ${name} a happy birthday on the day`,
      grounds: [{ itemId: null, quote: `${name}'s birthday.`, source: "From Contacts", noteId: null, contacts: true }],
      ways: ["onday", "message"], keep: `Wish ${name} a happy birthday.`, gesture: null,
    });
  }

  // 3. Their current lines: what the Moment is about first, then the newest told. SUA-1's exclusions.
  const lines = input.items
    .filter((m) => !used.has(m.id) && usable(m, person, today) && theirs(m, person) && current(m, today) && wordingSensitivities(m.statement).length === 0)
    .sort((a, b) => (a.id === about?.id ? -1 : b.id === about?.id ? 1 : 0) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || a.id.localeCompare(b.id));
  const categories = new Set<string>();
  for (const m of lines) {
    if (out.length >= IDEAS_MAX) break;
    const c = categoryOf(m, input);
    if (!c) continue;
    // One idea per category and wording: two "Celebrate with Sam" would only repeat.
    const key = `${c.category}:${c.value ?? ""}`;
    if (categories.has(key)) continue;
    const g = groundOf(m, input);
    if (!g) continue;
    categories.add(key);
    out.push({
      id: `${c.category}:${m.id}`, category: c.category, title: ideaTitle(c.category, name, c.value), grounds: [g],
      ways: ["message", "call", "keep"], keep: keepWords(c.category, name, c.value), gesture: c.value ? "activity" : GESTURE_OF[c.category],
    });
  }
  return out;
}

/** The memories the ideas quote: "You could mention" leaves them out, so nothing is said twice. */
export function groundedIds(ideas: Idea[]): Set<string> {
  return new Set(ideas.flatMap((i) => i.grounds.map((g) => g.itemId).filter((id): id is string => !!id)));
}

/** A day's lead time for the day chips: the next few days, then the user's own pick. */
export function keepDays(today: string, count = 3): { day: string; label: string }[] {
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const base = Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
  const out: { day: string; label: string }[] = [];
  for (let n = 1; out.length < count && n <= 7; n += n === 1 ? 1 : 2) {
    const d = new Date(base + n * 86_400_000);
    out.push({ day: d.toISOString().slice(0, 10), label: n === 1 ? "Tomorrow" : WEEKDAYS[d.getUTCDay()] });
  }
  return out;
}
