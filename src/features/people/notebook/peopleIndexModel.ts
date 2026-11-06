// People as an index (PR #77 interaction spec §9; prototype app.js renderPeople, tileHTML, comingFor,
// relDay, markQ), as pure functions over the real people and memory lines:
//
//   the band      "Coming up for them": people with a dated, non-sensitive line of their own or a
//                 sourced birthday in the next 14 days, ordered by date only, each once at their
//                 soonest day. Never a relative's line, never anything sensitive (by label or by
//                 wording), never anything retracted, superseded or expired, never anyone paused,
//                 remembered or removed (D13: isProactiveEligible)
//   the tiles     everyone, A–Z by the name Kinship says (names.ts shortName); the full name only
//                 where two people share it; one distinguishing line, never invented: the relation
//                 the user gave them, else their birthday from Contacts, else "Added from Contacts",
//                 else nothing
//   the search    the found words marked in a line (Ask v1's own word folding, retrieve.ts), and where
//                 a found line leads: that note in their notebook's Pages, else that line in Knows
//
// Nothing here counts, ranks or scores a relationship. Order is the alphabet, or the calendar.
import { shortName, aliasesOf } from "../../../../supabase/functions/_shared/extraction/names";
import { wordingSensitivities } from "../../../../supabase/functions/_shared/extraction/lexicon";
import { fold, parse, stillTyping, words } from "@/features/ask/retrieve";
import type { AskView } from "@/features/ask/useAsk";
import { timeOf } from "@/features/today/mentions";
import { dayMonth, nextBirthday } from "@/features/setup/setupModel";
import { isProactiveEligible } from "@/store/peopleStates";
import { type MemoryItem, peopleOf, type Person } from "@/store/repositories";

/** The words the index says (the prototype's copy). */
export const INDEX_COPY = {
  title: "People",
  search: "Find someone, or something you told Kinship",
  band: "Coming up for them",
  everyone: "Everyone",
  people: "People",
  found: "In what you told Kinship",
  addedFromContacts: "Added from Contacts",
  birthday: (day: string) => `Birthday ${day}`,
  earlier: "Earlier",
  noOne: (name: string) => `No one called “${name}” yet.`,
  add: (name: string) => `Add ${name}`,
  empty: "The people you care about will be here. Bring them in from your contacts, or add someone by name.",
  addFromContacts: "Add from contacts",
  addByName: "Add by name",
  rail: "Jump to a letter",
} as const;

/** How far ahead the band looks, in days (spec §9). */
export const BAND_DAYS = 14;

// ─── Days ───────────────────────────────────────────────────────────────

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function utc(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

function daysFrom(today: string, day: string): number {
  return Math.round((utc(day) - utc(today)) / 86_400_000);
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/u;

/** The band's chip: "Today", "Tomorrow", "Sat" within the week, else "Nov 16" (prototype relDay). */
export function bandDayLabel(day: string, today: string): string {
  const n = daysFrom(today, day);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n > 1 && n < 7) return WEEKDAY_SHORT[new Date(utc(day)).getUTCDay()];
  return dayMonth(day);
}

/** The same day, said whole for VoiceOver: "today", "tomorrow", "Saturday", "November 16". */
export function bandDaySpoken(day: string, today: string): string {
  const n = daysFrom(today, day);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n > 1 && n < 7) return WEEKDAY_LONG[new Date(utc(day)).getUTCDay()];
  const month = new Date(utc(day)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `${month} ${Number(day.slice(8, 10))}`;
}

// ─── The band ───────────────────────────────────────────────────────────

export interface BandEntry {
  personId: string;
  /** The name Kinship says (shortName). */
  name: string;
  /** The ISO day. */
  day: string;
  /** "Tomorrow", "Sat", "Nov 16". */
  label: string;
  /** What puts them here: a line of theirs, or their birthday. */
  from: "line" | "birthday";
  /** The line, when it is one. */
  itemId: string | null;
}

/** The kinds that are something coming up in someone's life (the Portrait's Coming up kinds). */
const COMING_KINDS = new Set(["event", "plan", "milestone", "promise"]);

/** A line that may put someone in the band: theirs, current, dated to a day, never sensitive. */
function bandLine(m: MemoryItem): boolean {
  if (m.status !== "active" || m.deleted_at) return false;
  if (!COMING_KINDS.has(m.kind)) return false;
  const subject = typeof m.subject_type === "string" ? m.subject_type : "person";
  // A relative's line ("Michelle's sister Ana") never; a promise only when it is theirs, not the user's
  // own ("You said you'd" is not something coming up for them).
  if (subject === "related") return false;
  if (m.kind === "promise" ? subject !== "person" : subject === "user") return false;
  if ((typeof m.sensitivity === "string" ? m.sensitivity : "none") !== "none") return false;
  if (wordingSensitivities(m.statement).length) return false;
  return m.statement.trim().length > 0;
}

/** A birthday with a source (Contacts, a note, the user's own edit): never one of unknown origin. */
function sourcedBirthday(p: Person): string | null {
  if (typeof p.birthday !== "string" || !ISO_DAY.test(p.birthday)) return null;
  if (p.birthday_source !== "contacts" && p.birthday_source !== "capture" && p.birthday_source !== "user_edit") return null;
  return p.birthday.slice(0, 10);
}

/**
 * "Coming up for them" (spec §9): each eligible person once, at their soonest dated, non-sensitive
 * line or sourced birthday in the next BAND_DAYS days, ordered by that day only (a shared day goes
 * by name, so the order never moves).
 */
export function comingUpForThem(input: { people: readonly Person[]; items: readonly MemoryItem[]; today: string }): BandEntry[] {
  const { today } = input;
  const eligible = new Map(input.people.filter((p) => isProactiveEligible(p)).map((p) => [p.id, p]));
  const soonest = new Map<string, { day: string; from: "line" | "birthday"; itemId: string | null }>();
  const offer = (personId: string, day: string, from: "line" | "birthday", itemId: string | null) => {
    const n = daysFrom(today, day);
    if (n < 0 || n > BAND_DAYS) return;
    const had = soonest.get(personId);
    if (!had || day < had.day) soonest.set(personId, { day, from, itemId });
  };
  for (const m of input.items) {
    if (!bandLine(m)) continue;
    const { day, coarse } = timeOf(m);
    if (!day || coarse) continue;
    for (const id of new Set(peopleOf(m))) if (eligible.has(id)) offer(id, day, "line", m.id);
  }
  for (const p of eligible.values()) {
    const b = sourcedBirthday(p);
    if (b) offer(p.id, nextBirthday(b, today), "birthday", null);
  }
  return [...soonest.entries()]
    .map(([personId, s]) => {
      const p = eligible.get(personId)!;
      return { personId, name: shortName(p) || p.display_name, day: s.day, label: bandDayLabel(s.day, today), from: s.from, itemId: s.itemId };
    })
    .sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name) || a.personId.localeCompare(b.personId));
}

// ─── The tiles ──────────────────────────────────────────────────────────

export interface TileData {
  id: string;
  /** The name on the tile: the first name, or the full name where two people share it. */
  name: string;
  /** The one distinguishing line, or nothing. */
  line: string | null;
  /** The letter break it sits under. */
  letter: string;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The name Kinship says for someone (names.ts shortName). */
export function sayName(p: Person): string {
  return shortName(p) || p.display_name;
}

/** The full name, as far as Kinship knows it. */
function fullName(p: Person): string {
  return str(p.full_name) ?? p.display_name;
}

/**
 * The name on someone's tile: the name Kinship says ("Ben"), or the full name where someone else in
 * People is said the same way ("Sam Doughty", "Sam Eden"); where even that is shared, the relation
 * the user gave them tells them apart ("Sam Eden (work)"), as the People list always has.
 */
export function tileName(p: Person, people: readonly Person[]): string {
  const said = fold(sayName(p));
  const twins = people.filter((o) => o.id !== p.id && fold(sayName(o)) === said);
  if (!twins.length) return sayName(p);
  const full = fullName(p);
  const label = str(p.relationship_label);
  if (twins.some((o) => fold(fullName(o)) === fold(full)) && label) return `${full} (${label})`;
  return full;
}

/** Someone the user picked from Contacts (addPicked keeps the contact and the full name it gave). */
function addedFromContacts(p: Person): boolean {
  return !!str(p.contact_ref) && !!str(p.full_name);
}

/**
 * The one line under a tile, never invented (spec §9): the relation the user told Kinship ("Your
 * neighbor, two doors down"), else the birthday Contacts gave ("Birthday Nov 7"), else "Added from
 * Contacts" for someone picked from Contacts, else nothing (someone added by name).
 */
export function distinguishingLine(p: Person): string | null {
  const label = str(p.relationship_label);
  if (label) return label;
  if (p.birthday_source === "contacts" && typeof p.birthday === "string" && ISO_DAY.test(p.birthday)) return INDEX_COPY.birthday(dayMonth(p.birthday));
  if (addedFromContacts(p)) return INDEX_COPY.addedFromContacts;
  return null;
}

/** The letter break a name sits under: its first letter, accents folded; "#" for anything else. */
export function letterOf(name: string): string {
  const first = Array.from(fold(name.trim()))[0] ?? "";
  return /\p{L}/u.test(first) ? first.toLocaleUpperCase() : "#";
}

/** Everyone in People (held people too, with no marker; D13), A–Z by the name on their tile. */
export function buildTiles(people: readonly Person[]): TileData[] {
  const inPeople = people.filter((p) => !p.deleted_at && p.state !== "archived");
  return inPeople
    .map((p) => ({ id: p.id, name: tileName(p, inPeople), line: distinguishingLine(p), letter: letterOf(sayName(p)) }))
    .sort((a, b) => {
      // "#" after Z, as an index does.
      const ha = a.letter === "#" ? 1 : 0;
      const hb = b.letter === "#" ? 1 : 0;
      return ha - hb || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
}

/** Tiles in rows of `columns`, for a virtualized list. */
export function rowsOf<T>(items: readonly T[], columns: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += columns) out.push(items.slice(i, i + columns));
  return out;
}

export interface TileSection {
  key: string;
  /** The letter break, when the index shows them. */
  letter: string | null;
  rows: TileData[][];
}

/** Whether the index shows letter breaks and the A–Z rail (above about 25 people). */
export function showsLetters(count: number, above: number): boolean {
  return count > above;
}

/** The index's sections: one per letter with breaks, else one. */
export function tileSections(tiles: readonly TileData[], columns: number, letters: boolean): TileSection[] {
  if (!letters) return tiles.length ? [{ key: "everyone", letter: null, rows: rowsOf(tiles, columns) }] : [];
  const groups = new Map<string, TileData[]>();
  for (const t of tiles) groups.set(t.letter, [...(groups.get(t.letter) ?? []), t]);
  return [...groups.entries()].map(([letter, list]) => ({ key: `letter:${letter}`, letter, rows: rowsOf(list, columns) }));
}

// ─── Search ─────────────────────────────────────────────────────────────

/** The people a search finds by name (People's own filter, with every name they go by). */
export function nameMatches(people: readonly Person[], query: string): Set<string> {
  const q = fold(query.trim());
  const out = new Set<string>();
  if (!q) return out;
  for (const p of people) {
    const names = [p.display_name, str(p.full_name) ?? "", ...aliasesOf(p)];
    if (names.some((n) => fold(n).includes(q))) out.add(p.id);
  }
  return out;
}

export interface Part {
  text: string;
  /** One of the words searched for (marked in the find colour). */
  found: boolean;
}

/**
 * A line with the words a search found in it marked, by Ask v1's own reading of words (folded,
 * possessives dropped, stemmed; the last word still being typed may be the start of one). Names are
 * not marked: the face and the source already say who.
 */
export function markFound(text: string, query: string, names: ReadonlySet<string> = new Set()): Part[] {
  const { content } = parse(query);
  const wanted = content.filter((w) => !names.has(w));
  if (!wanted.length) return text ? [{ text, found: false }] : [];
  const typing = stillTyping(query);
  const last = wanted[wanted.length - 1];
  const finds = (w: string) => wanted.includes(w) || (typing && last.length >= 3 && w.startsWith(last));
  const parts: Part[] = [];
  let at = 0;
  for (const m of text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu)) {
    const [w] = words(m[0]);
    if (!w || !finds(w)) continue;
    const start = m.index ?? 0;
    if (start > at) parts.push({ text: text.slice(at, start), found: false });
    parts.push({ text: m[0], found: true });
    at = start + m[0].length;
  }
  if (at < text.length) parts.push({ text: text.slice(at), found: false });
  return parts;
}

/** Every word of everyone's names, folded as Ask reads them (so a search for "Sam's" marks nothing of Sam). */
export function nameWordsOf(people: readonly Person[]): Set<string> {
  const out = new Set<string>();
  for (const p of people) for (const n of [p.display_name, str(p.full_name) ?? "", ...aliasesOf(p)]) for (const w of words(n)) out.add(w);
  return out;
}

/** Where a found line leads: the note it came from in their notebook's Pages, else that line in Knows. */
export function notebookHref(personId: string, noteId: string | null, itemId: string): string {
  const base = `/v2/person/${personId}`;
  return noteId ? `${base}?lens=pages&note=${encodeURIComponent(noteId)}` : `${base}?lens=knows&item=${encodeURIComponent(itemId)}`;
}

export interface Hit {
  key: string;
  personId: string;
  kind: "line" | "conversation" | "birthday";
  /** The words shown, as the person's page shows them. */
  text: string;
  /** A superseded line the page shows under Before. */
  earlier: boolean;
  /** Its when ("Sun, Nov 8"), what a conversation was about, or what it replaced. */
  notes: string[];
  /** "Ben · You told Kinship · Oct 8"; null for a conversation (its words say when). */
  source: string | null;
  sourceKind: "note" | "contacts" | "yours";
  href: string;
}

function sourceKindOf(provenance: string): Hit["sourceKind"] {
  if (provenance === "From Contacts") return "contacts";
  if (/^(Edited by you|You added this)/u.test(provenance)) return "yours";
  return "note";
}

/**
 * Ask v1's answer (useAsk, unchanged) as the index's hits, in its own order: people in People's order,
 * each person's conversations and then lines, then birthdays. Every hit keeps its source.
 */
export function hitsOf(view: AskView): Hit[] {
  if (!view.asked) return [];
  const out: Hit[] = [];
  for (const g of view.groups) {
    for (const t of g.conversations) {
      out.push({ key: `c:${g.personId}:${t.id}`, personId: g.personId, kind: "conversation", text: t.label, earlier: false, notes: t.about ? [t.about] : [], source: null, sourceKind: "note", href: g.href });
    }
    for (const r of g.rows) {
      const row = r.row;
      const text = row.composed ? row.composed.text : row.display ?? row.line.statement;
      // A composed line goes to its first note (the most specific line's), as the page lists them.
      const noteId = row.noteId ?? row.composed?.members.map((m) => m.row.noteId).find((n): n is string => !!n) ?? null;
      const itemId = row.composed ? row.composed.memberIds[0] : row.line.id;
      const when = row.history ? row.history.when : row.line.when?.label ?? null;
      out.push({
        key: `l:${g.personId}:${r.key}`,
        personId: g.personId,
        kind: "line",
        text,
        earlier: r.earlier,
        notes: [...(when ? [when] : []), ...row.line.replaces.map((b) => `Before: ${b}`)],
        source: `${g.name} · ${row.provenance}`,
        sourceKind: sourceKindOf(row.provenance),
        href: notebookHref(g.personId, noteId, itemId),
      });
    }
  }
  for (const b of view.birthdays) {
    out.push({
      key: `b:${b.personId}`, personId: b.personId, kind: "birthday", text: b.text, earlier: false, notes: [],
      source: b.provenance, sourceKind: b.provenance === "From Contacts" ? "contacts" : b.noteId ? "note" : "yours",
      href: b.noteId ? notebookHref(b.personId, b.noteId, "birthday") : b.href,
    });
  }
  return out;
}
