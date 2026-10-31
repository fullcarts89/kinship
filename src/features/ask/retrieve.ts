// Ask Kinship v1 (CC-25 shape; founder directive 30 Oct 2026, FD-30a; board B3
// "When did I last see Sam?"): grounded retrieval over the user's own memory,
// on the phone, with no model. A question typed into People's search field
// finds the lines that answer it, each still the line it is on the person's
// page, with its source. Nothing is synthesised, suggested, counted, ranked
// or invented; "nothing about that yet" is an answer (CC-28: a retrieved
// memory and a derived suggestion are different things, and v1 has no
// suggestions at all).
//
//   matching   the query is folded and tokenised (accents, case, possessives,
//              plurals); question and function words are dropped; a word that
//              names someone in People scopes the answer to them; the rest
//              must each be found in a line's own words, its detail (place,
//              topic, goal, attribute, value…), the related person it is about
//              ("sister", "Michelle"), or its residence reading ("Alameda,
//              California"). While the user is still typing, the last word may
//              be the start of one.
//   steering   "into / likes / enjoys" → interests and tastes; "when … see /
//              saw / met / talk" → the conversations the user confirmed (the
//              trail) and moments; "who … in <place>" / "lives" → residence
//              lines; "birthday" → the people with a birthday. A steer narrows;
//              when it would hide every match of the user's other words, the
//              plain matches stand (nothing known is hidden by a guess).
//   lines      active and resolved lines are current; a superseded line is
//              found only where the person's page would show it under Before
//              (recordSections.historyKind) and is marked earlier; retracted
//              and deleted lines never.
//   people     grouped by the person a line is filed on, in People's own
//              order (alphabetical), never ranked; remembered and paused
//              people last, their lines found because it is the user's memory,
//              with no proactive copy. Newest first within a person.
//   nothing    no content words → nothing asked; a name alone is People's own
//              filter; a named person with no matching line → an honest miss,
//              never a guess.
import { categoryOf } from "../../../supabase/functions/_shared/semantic/categories";
import { aliasesOf } from "../../../supabase/functions/_shared/extraction/names";
import { personLabel } from "@/features/tell/reviewModel";
import { historyKind } from "@/features/person/recordSections";
import { type ContactEventRow, trailFor } from "@/features/person/trail";
import type { TrailLine } from "@/features/person/portraitModel";
import { closedBy, type MemoryItem, peopleOf, type Person, type RelatedPerson } from "@/store/repositories";

export const ASK_COPY = {
  /** The section under the people results. */
  section: "In your memory",
  /** A question or statement that nothing answers. */
  nothing: "Nothing about that in your memory yet.",
  /** A named person with no line that answers (an honest miss). */
  nothingFor: (names: string) => `Kinship knows nothing about that for ${names} yet.`,
  /** "When did I last see Sam?" with no conversation recorded. */
  noConversations: (names: string) => `No conversation with ${names} recorded yet.`,
  /** The quiet mark over a superseded line. */
  earlier: "Earlier",
} as const;

/** Where a query word was found. */
export type AskWhere = "statement" | "detail" | "related" | "residence";

export interface AskMatch {
  item: MemoryItem;
  /** The person the line is filed on. */
  person: Person;
  /** The query's words the line answers, and where each was found; empty when a steer alone chose it. */
  why: { words: string[]; where: AskWhere[] };
  /** A superseded line the person's page shows under Before: shown only as earlier, never as current. */
  earlier: boolean;
}

export interface AskGroup {
  person: Person;
  /** Remembered or paused: found (it is the user's memory), shown last, nothing proactive. */
  quiet: boolean;
  /** Current lines newest first, then earlier lines newest first. */
  matches: AskMatch[];
  /** "When did I last see Sam?": the conversations the user confirmed with them, newest first (the trail's own words). */
  conversations: TrailLine[];
}

export interface AskAnswer {
  /** The query asks something beyond a name (People's own filter handles a name). */
  asked: boolean;
  /** The people the query names, for the People list. */
  named: Person[];
  groups: AskGroup[];
  /** "birthday": the people with one, in People's order (the person's own record; a contact birthday says "From Contacts"). */
  birthdays: Person[];
  /** When nothing answers: the honest line to show. */
  miss: string | null;
}

export interface AskInput {
  query: string;
  /** Everyone in People (archived and deleted people are left out here). */
  people: Person[];
  related: RelatedPerson[];
  /** Every memory line as the user reads it (voiced); retracted, deleted and ineligible superseded lines are left out here. */
  items: MemoryItem[];
  /** Each line's residence reading, by line id (MemoryRepo.residenceFacets). */
  facets: ReadonlyMap<string, { value_text: string; deleted_at?: unknown }>;
  /** The conversations the user confirmed (for "when did I last see…"). */
  contacts: ContactEventRow[];
  now: Date;
  /** The user's own words behind a line (its sources' quotes), for where it sits; optional. */
  quotesOf?: (itemId: string) => readonly string[];
}

// ─── Words ──────────────────────────────────────────────────────────────

/** Case, accents and curly apostrophes folded away. */
export function fold(s: string): string {
  return s.normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleLowerCase().replace(/[’‘`]/gu, "'");
}

/** "gifts" → "gift", "hobbies" → "hobby", "likes" → "like"; the same on both sides, so only sameness matters. */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith("s") && !/(?:ss|us|is)$/u.test(w)) return w.slice(0, -1);
  return w;
}

/** The words of a text, folded, possessives dropped, stemmed. */
export function words(s: string): string[] {
  return fold(s)
    .replace(/'s\b/gu, "")
    .replace(/s'(?=\s|$)/gu, "s")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(stem);
}

/** Question and function words, and the verbs a question about memory is asked with. */
const STOP = new Set([
  "a", "an", "the", "and", "or", "but", "not", "no", "any", "some", "all", "every", "each", "both", "either",
  "i", "me", "my", "mine", "we", "us", "our", "you", "your", "he", "him", "his", "she", "her", "it", "they", "them", "their",
  "this", "that", "these", "those", "there", "here", "who", "whom", "whose", "what", "which", "when", "where", "why", "how",
  "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did", "done", "doing", "have", "has", "had", "having",
  "can", "could", "would", "should", "will", "shall", "may", "might", "must",
  "of", "in", "on", "at", "to", "for", "from", "with", "about", "by", "up", "out", "over", "into", "onto", "off", "than", "then", "so", "if", "as",
  "know", "knew", "known", "mention", "mentioned", "say", "said", "tell", "told", "remember", "recall", "think",
  "again", "ever", "still", "also", "just", "now", "ago", "last", "recently", "lately", "yet", "already", "once",
  "thing", "things", "stuff", "anything", "something", "everything", "nothing", "one", "ones", "someone", "anyone", "else",
  "kinship", "time", "lot", "much", "many", "more", "most", "very", "really",
].map(stem));

/** "into", "likes", "enjoys", "loves": interests and tastes. */
const INTEREST = new Set(["into", "like", "liked", "enjoy", "enjoyed", "love", "loved", "interest", "interested", "hobby", "fan", "favorite", "favourite", "taste", "passion"].map(stem));
/** "see", "saw", "met", "talk", "call", "message": a conversation. */
const CONTACT = new Set(["see", "saw", "seen", "meet", "met", "talk", "talked", "spoke", "speak", "spoken", "call", "called", "message", "messaged", "text", "texted", "chat", "chatted", "reach", "reached", "touch", "visit", "visited", "hung", "hang", "catch", "caught"].map(stem));
/** "lives", "living", "based", "home": where someone lives. */
const RESIDENCE = new Set(["live", "lived", "living", "reside", "resides", "based", "home", "move", "moved", "hometown", "stay", "staying"].map(stem));
/** "in", "near", "around", "from": the place words a "who … in" question uses. */
const PLACE_PREPOSITION = new Set(["in", "near", "around", "from", "at"]);
const BIRTHDAY = new Set(["birthday", "bday", "born"].map(stem));

export type Steer = "interest" | "conversation" | "residence" | "birthday";

/** The user is still typing the last word: the query ends in a letter or digit (no space, no "?"). */
export function stillTyping(query: string): boolean {
  return /[\p{L}\p{N}]$/u.test(query);
}

/**
 * The query's words that carry its meaning, and the way it steers. A word
 * that names someone (`isName`, checked on every word before question words
 * are dropped, so Will and May can be asked about) is always content.
 */
export function parse(query: string, isName?: (word: string, prefix: boolean) => boolean): { content: string[]; steers: Set<Steer>; nameTokens: Set<string>; typing: boolean } {
  const raw = words(query);
  const typing = stillTyping(query);
  const last = raw.length - 1;
  const nameTokens = new Set<string>();
  if (isName) raw.forEach((w, i) => { if (isName(w, typing && i === last)) nameTokens.add(w); });
  const steers = new Set<Steer>();
  const has = (set: Set<string>) => raw.some((w) => !nameTokens.has(w) && set.has(w));
  if (has(INTEREST)) steers.add("interest");
  if (has(CONTACT) && raw.some((w) => w === "when" || w === "last" || w === "time" || w === "did" || w === "have" || w === "has")) steers.add("conversation");
  if (has(RESIDENCE) || (raw.includes("who") && raw.some((w) => PLACE_PREPOSITION.has(w)))) steers.add("residence");
  if (has(BIRTHDAY)) steers.add("birthday");
  const content = raw.filter((w) => nameTokens.has(w) || (!STOP.has(w) && !INTEREST.has(w) && !CONTACT.has(w) && !RESIDENCE.has(w) && w.length > 1));
  return { content, steers, nameTokens, typing };
}

/**
 * Whether the search field holds a name rather than a question (People's own
 * "No one called … yet" offer): one word, or up to three with no question word.
 */
export function looksLikeName(query: string): boolean {
  const raw = words(query);
  if (!raw.length || raw.length > 3) return false;
  if (raw.length === 1) return true;
  return raw.every((w) => !STOP.has(w) && !INTEREST.has(w) && !CONTACT.has(w) && !RESIDENCE.has(w) && !BIRTHDAY.has(w));
}

/** A query word is found among a text's words: the same word, or (the word still being typed) the start of one. */
function hit(text: readonly string[], q: string, prefix: boolean): boolean {
  return text.some((t) => t === q || (prefix && q.length >= 3 && t.startsWith(q)));
}

// ─── Lines ──────────────────────────────────────────────────────────────

/** The detail fields a question can be about (never dates, which the page already says). */
const DETAIL_FIELDS = ["place", "topic", "event_goal", "attribute", "value", "category", "event_type", "milestone_type", "season", "when_hint", "date_hint", "due_hint", "aspect", "relation", "name"] as const;

interface Indexed {
  item: MemoryItem;
  person: Person;
  earlier: boolean;
  statement: string[];
  detail: string[];
  related: string[];
  residence: string[];
}

function detailWords(detail: unknown): string[] {
  if (!detail || typeof detail !== "object") return [];
  const d = detail as Record<string, unknown>;
  return DETAIL_FIELDS.flatMap((k) => (typeof d[k] === "string" ? words(d[k] as string) : []));
}

function nameWords(p: Person): string[] {
  const names = [p.display_name, typeof p.full_name === "string" ? p.full_name : "", ...aliasesOf(p)];
  return [...new Set(names.flatMap(words))];
}

/**
 * Whether a closed line may be found: only where the person's page shows it
 * under Before (every live closer records a change, not sensitive, durable).
 */
export function earlierEligible(item: MemoryItem, all: readonly MemoryItem[], quotes: readonly string[]): boolean {
  if (item.status !== "superseded" || item.deleted_at) return false;
  const closers = all.filter((c) => !c.deleted_at && c.status !== "retracted" && closedBy(c).includes(item.id));
  return historyKind(item, categoryOf(item, quotes), closers.map((c) => ({ transition: ((c.detail ?? {}) as Record<string, unknown>).transition }))) !== null;
}

/** A line as a question can find it: current, or shown as earlier; never retracted or deleted. */
export function findable(item: MemoryItem, all: readonly MemoryItem[], quotes: readonly string[] = []): "current" | "earlier" | null {
  if (item.deleted_at) return null;
  if (item.status === "active" || item.status === "resolved") return "current";
  if (earlierEligible(item, all, quotes)) return "earlier";
  return null;
}

function categoryFor(item: MemoryItem, quotes: readonly string[]) {
  return categoryOf({ ...item, subject_type: typeof item.subject_type === "string" ? item.subject_type : null, detail: (item.detail ?? null) as Record<string, unknown> | null }, quotes);
}

const QUIET_STATES = new Set(["remembered", "paused"]);

function personOrder(a: Person, b: Person): number {
  const qa = QUIET_STATES.has(a.state) ? 1 : 0;
  const qb = QUIET_STATES.has(b.state) ? 1 : 0;
  return qa - qb || a.display_name.localeCompare(b.display_name) || a.id.localeCompare(b.id);
}

function newestFirst(a: MemoryItem, b: MemoryItem): number {
  return String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || a.id.localeCompare(b.id);
}

/** Several named people, as a sentence, each as the People list tells them apart: "Sam Doughty and Sam Eden". */
export function listNames(people: readonly Person[], all: readonly Person[]): string {
  const names = people.map((p) => personLabel(p, all as Person[]));
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const NOTHING: AskAnswer = { asked: false, named: [], groups: [], birthdays: [], miss: null };

/**
 * What the user's memory says about a question, or that it says nothing.
 * Pure: the hook supplies the lines (voiced), the people, the readings and
 * the conversations; nothing here reads a store or calls a model.
 */
export function ask(input: AskInput): AskAnswer {
  const people = input.people.filter((p) => !p.deleted_at && p.state !== "archived");
  const byId = new Map(people.map((p) => [p.id, p]));
  const quotesOf = input.quotesOf ?? (() => []);

  // Who the question names: a word that is one of someone's names, checked before question words are
  // dropped (Will, May). Only the word still being typed may be the start of a name ("Sam" asks about the
  // Sams once the sentence is finished, never about Samantha).
  const names = people.map((p) => ({ p, words: nameWords(p) }));
  const { content, steers, nameTokens, typing } = parse(input.query, (w, prefix) => names.some((n) => hit(n.words, w, prefix)));
  const last = content.length - 1;
  const named: Person[] = [];
  content.forEach((w, i) => {
    if (!nameTokens.has(w)) return;
    for (const n of names) if (hit(n.words, w, typing && i === last) && !named.includes(n.p)) named.push(n.p);
  });
  named.sort(personOrder);
  const rest = content.filter((w) => !nameTokens.has(w));
  const restLast = typing && rest.length > 0 && !nameTokens.has(content[last]);
  const prefix = (i: number) => restLast && i === rest.length - 1;

  // Nothing asked: no words beyond a name (People's own filter; the people named still go back so the
  // list keeps them). A steer with no one it is about ("who have I talked to lately") is a question
  // nothing answers, never a list across people.
  if (!rest.length && !steers.size) return { ...NOTHING, named };
  if (!rest.length && !named.length) return { ...NOTHING, asked: true, miss: ASK_COPY.nothing };

  const scope = new Set(named.map((p) => p.id));
  const indexed: Indexed[] = [];
  for (const item of input.items) {
    const person = byId.get(item.person_id);
    if (!person) continue;
    if (scope.size && !peopleOf(item).some((id) => scope.has(id))) continue;
    const state = findable(item, input.items, quotesOf(item.id));
    if (!state) continue;
    const rel = typeof item.subject_related_id === "string" ? input.related.find((r) => r.id === item.subject_related_id) : null;
    const facet = input.facets.get(item.id);
    indexed.push({
      item,
      person,
      earlier: state === "earlier",
      statement: words(item.statement),
      detail: detailWords(item.detail),
      related: rel ? words([rel.relation, rel.name ?? ""].join(" ")) : [],
      residence: facet && !facet.deleted_at && typeof facet.value_text === "string" ? words(facet.value_text) : [],
    });
  }

  const whereOf = (x: Indexed, w: string, p: boolean): AskWhere[] => {
    const out: AskWhere[] = [];
    if (hit(x.statement, w, p)) out.push("statement");
    if (hit(x.detail, w, p)) out.push("detail");
    if (hit(x.related, w, p)) out.push("related");
    if (hit(x.residence, w, p)) out.push("residence");
    return out;
  };
  const matchOn = (x: Indexed, every: boolean): AskMatch | null => {
    const found: string[] = [];
    const where = new Set<AskWhere>();
    rest.forEach((w, i) => {
      const at = whereOf(x, w, prefix(i));
      if (!at.length) return;
      found.push(w);
      at.forEach((a) => where.add(a));
    });
    if (every ? found.length < rest.length : found.length === 0) return null;
    return { item: x.item, person: x.person, why: { words: found, where: [...where] }, earlier: x.earlier };
  };

  // The lines the question's own words find: every word in one line; else, about a named person only,
  // any of them, and only when each word is in some line of theirs (a word no line of theirs has, or an
  // unknown name, is an honest miss, never other people's lines).
  let matches: AskMatch[];
  if (!rest.length) {
    matches = indexed.map((x) => ({ item: x.item, person: x.person, why: { words: [], where: [] }, earlier: x.earlier }));
  } else {
    matches = indexed.map((x) => matchOn(x, true)).filter((m): m is AskMatch => !!m);
    const eachSomewhere = rest.every((w, i) => indexed.some((x) => whereOf(x, w, prefix(i)).length > 0));
    if (!matches.length && rest.length > 1 && named.length && eachSomewhere) {
      matches = indexed.map((x) => matchOn(x, false)).filter((m): m is AskMatch => !!m);
    }
  }

  // A steer narrows; it never hides what the user's own words found.
  const narrow = (keep: (m: AskMatch) => boolean) => {
    const kept = matches.filter(keep);
    if (kept.length || !rest.length) matches = kept;
  };
  if (steers.has("interest")) {
    narrow((m) => ["interest", "preference"].includes(categoryFor(m.item, quotesOf(m.item.id))));
  }
  if (steers.has("residence")) {
    narrow((m) => categoryFor(m.item, quotesOf(m.item.id)) === "residence" || !!input.facets.get(m.item.id));
  }
  if (steers.has("conversation")) {
    narrow((m) => m.item.kind === "moment" || m.item.kind === "context");
  }

  // The conversations the user confirmed with the people named ("When did I last see Sam?").
  const conversations = new Map<string, TrailLine[]>();
  if (steers.has("conversation")) {
    for (const p of named) {
      const lines = trailFor(input.contacts, input.items, p, input.now);
      if (lines.length) conversations.set(p.id, lines);
    }
  }

  // The people with a birthday, in People's order (the person's own record, not a line).
  const birthdays = steers.has("birthday")
    ? (named.length ? named : [...people].sort(personOrder)).filter((p) => typeof p.birthday === "string" && !!p.birthday)
    : [];

  // Grouped by the person a line is filed on, in People's order; current lines first, newest first.
  const groups: AskGroup[] = [];
  const groupFor = (p: Person): AskGroup => {
    let g = groups.find((x) => x.person.id === p.id);
    if (!g) {
      g = { person: p, quiet: QUIET_STATES.has(p.state), matches: [], conversations: conversations.get(p.id) ?? [] };
      groups.push(g);
    }
    return g;
  };
  for (const m of matches) groupFor(m.person).matches.push(m);
  for (const [pid, lines] of conversations) {
    const p = byId.get(pid);
    if (p && lines.length) groupFor(p);
  }
  for (const g of groups) {
    g.matches.sort((a, b) => Number(a.earlier) - Number(b.earlier) || newestFirst(a.item, b.item));
  }
  groups.sort((a, b) => personOrder(a.person, b.person));

  const found = groups.length > 0 || birthdays.length > 0;
  // A lone word that names no one and finds nothing is not a question: People says "No one called … yet".
  if (!found && rest.length === 1 && !named.length && !steers.size) return NOTHING;
  let miss: string | null = null;
  if (!found) {
    miss = named.length
      ? steers.has("conversation") && !rest.length ? ASK_COPY.noConversations(listNames(named, people)) : ASK_COPY.nothingFor(listNames(named, people))
      : ASK_COPY.nothing;
  }
  return { asked: true, named, groups, birthdays, miss };
}
