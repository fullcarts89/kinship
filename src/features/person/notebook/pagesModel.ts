// A person's Pages (PR #77 §8, DN-4): the notes behind what Kinship keeps about them, in full and in the
// user's own words, newest first, with the times the user showed up for them between the notes. A pure
// function of the store's rows, read every time and never stored.
//
//   a note        every note that yielded a live line about this person (filed on them or shared with
//                 them), plus the note behind their relation when one is known. Only this person's
//                 lines are marked in it; other people's lines in the same note are not. A sensitive
//                 line is marked only once it is a line at all, which it is only after the user's yes
//                 (held readings are never memory). Retracted or deleted lines mark nothing.
//   an intention  a note Kinship never sent for understanding ("skipped") whose only lines are the
//                 user's own promises: "You saved this", not "You told Kinship".
//   showing up    a conversation the user confirmed (the trail), and a promise of theirs they kept.
//
// Nothing here counts, ranks or scores: the order is time, and nothing else.
import { codePointToUtf16 } from "../../../../supabase/functions/_shared/spans";

export interface PagesItem {
  id: string;
  kind: string;
  person_id: string;
  subject_type?: unknown;
  statement: string;
  status: string;
  sensitivity?: unknown;
  origin?: unknown;
  deleted_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  with_person_ids?: unknown;
}

export interface PagesSource {
  memory_item_id: string;
  capture_id?: string | null;
  source_kind: string;
  span_start?: unknown;
  span_end?: unknown;
  quote?: unknown;
  deleted_at?: unknown;
}

export interface PagesCapture {
  id: string;
  raw_text: string | null;
  status: string;
  created_at?: unknown;
  occurred_at?: unknown;
  deleted_at?: unknown;
}

/** A conversation the user confirmed: the trail's own words ("You messaged · Nov 4"), and when. */
export interface PagesConversation {
  id: string;
  label: string;
  about: string | null;
  at: string;
}

/** One of this person's kept words in a note, in UTF-16 offsets into the note's text. */
export interface PageSpan {
  start: number;
  end: number;
  itemId: string;
  /** A private line the user said yes to (lavender, never lime). */
  sensitive: boolean;
  /** The line's words, read to screen readers: "Shows the line: …". */
  statement?: string;
}

export interface NotePage {
  type: "note";
  key: string;
  captureId: string;
  at: string;
  /** The note's words; null once they were removed after it was understood. */
  text: string | null;
  /** The kept excerpts, when the words are gone. */
  quotes: string[];
  spans: PageSpan[];
  /** Saved from an idea ("Keep it in mind"), not told. */
  intention: boolean;
}

export interface ShowPage {
  type: "show";
  key: string;
  kind: "conversation" | "kept";
  at: string;
  title: string;
  about: string | null;
}

export type PageEntry = NotePage | ShowPage;
export type PagesRow = PageEntry | { type: "year"; key: string; year: number };

export const PAGES_COPY = {
  told: "You told Kinship",
  saved: "You saved this",
  find: (name: string) => `Find in ${name}'s pages`,
  nothingFound: "Nothing in these pages says that.",
  /** The note's words are gone (NoteView's own wording): only what the lines rest on stays. */
  removed: "You chose not to keep the note itself. These words from it stay with what they support:",
  keptIt: "You kept it",
} as const;

const live = (m: PagesItem) => (m.status === "active" || m.status === "resolved") && !m.deleted_at;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

function aboutThem(m: PagesItem, personId: string): boolean {
  return m.person_id === personId || (Array.isArray(m.with_person_ids) && m.with_person_ids.includes(personId));
}

/** The user's own promise ("Bring Rosa the good flour"), said as kept: "You kept it: bring Rosa the good flour". */
export function keptTitle(statement: string): string {
  const s = statement.trim().replace(/[.]$/u, "")
    .replace(/^You\s+(?:said|promised|offered)\s+(?:that\s+)?(?:you(?:['’]d|['’]ll|\s+would|\s+will)|to)\s+/u, "");
  if (!s) return PAGES_COPY.keptIt;
  // The line reads as the user's own to-do ("Bring…"): the verb goes lower case after the colon. A line
  // that starts with a name or "I" keeps its capital.
  const [first, ...rest] = s.split(/\s+/u);
  const verb = /^\p{Lu}\p{Ll}+$/u.test(first) && !/^(I|I['’]m|I['’]ll)$/u.test(first) ? first.toLocaleLowerCase() : first;
  return `${PAGES_COPY.keptIt}: ${[verb, ...rest].join(" ")}`;
}

/** Code-point span → UTF-16 range in `text`, or null when it doesn't fit the text. */
function utf16(text: string, start: unknown, end: unknown): [number, number] | null {
  if (typeof start !== "number" || typeof end !== "number" || end <= start) return null;
  try {
    const a = codePointToUtf16(text, start);
    const b = codePointToUtf16(text, end);
    return b > a ? [a, b] : null;
  } catch {
    return null;
  }
}

/** An intention note: never sent for understanding, and its only lines are the user's own promises. */
export function isIntention(capture: Pick<PagesCapture, "status">, lines: Pick<PagesItem, "kind" | "origin" | "subject_type">[]): boolean {
  return capture.status === "skipped" && lines.length > 0
    && lines.every((m) => m.kind === "promise" && m.origin === "user" && (m.subject_type === undefined || m.subject_type === null || m.subject_type === "user"));
}

export function buildPages(input: {
  personId: string;
  /** Every memory line (any person: an intention is judged by all of its note's lines). */
  items: PagesItem[];
  sources: PagesSource[];
  captures: PagesCapture[];
  conversations: PagesConversation[];
  /** The note behind their relation, when one is known. */
  labelNoteId?: string | null;
}): PageEntry[] {
  const { personId } = input;
  const byId = new Map(input.items.map((m) => [m.id, m]));
  const theirs = new Set(input.items.filter((m) => live(m) && aboutThem(m, personId)).map((m) => m.id));
  const captures = new Map(input.captures.filter((c) => !c.deleted_at).map((c) => [c.id, c]));
  const noteSources = input.sources.filter((s) => s.source_kind === "capture" && !s.deleted_at && typeof s.capture_id === "string");
  // The notes with a live line about them.
  const notes = new Set<string>();
  for (const s of noteSources) if (theirs.has(s.memory_item_id) && captures.has(s.capture_id as string)) notes.add(s.capture_id as string);
  if (input.labelNoteId && captures.has(input.labelNoteId)) notes.add(input.labelNoteId);

  const out: (PageEntry & { rank: number })[] = [];
  for (const id of notes) {
    const c = captures.get(id)!;
    const here = noteSources.filter((s) => s.capture_id === id);
    const lines = [...new Set(here.map((s) => s.memory_item_id))].map((i) => byId.get(i)).filter((m): m is PagesItem => !!m && !m.deleted_at && m.status !== "retracted");
    const spans: PageSpan[] = [];
    const quotes: string[] = [];
    for (const s of here) {
      if (!theirs.has(s.memory_item_id)) continue;
      const m = byId.get(s.memory_item_id)!;
      const q = str(s.quote);
      if (q && !quotes.includes(q)) quotes.push(q);
      if (!c.raw_text) continue;
      const r = utf16(c.raw_text, s.span_start, s.span_end);
      if (!r) continue;
      const sensitive = str(m.sensitivity) !== null && m.sensitivity !== "none";
      if (!spans.some((x) => x.start === r[0] && x.end === r[1] && x.itemId === m.id)) spans.push({ start: r[0], end: r[1], itemId: m.id, sensitive, statement: m.statement });
    }
    spans.sort((a, b) => a.start - b.start || b.end - a.end);
    out.push({
      type: "note", key: `note:${id}`, captureId: id, at: String(c.created_at ?? c.occurred_at ?? ""),
      text: c.raw_text ?? null, quotes: c.raw_text ? [] : quotes, spans, intention: isIntention(c, lines), rank: 0,
    });
  }
  for (const t of input.conversations) {
    out.push({ type: "show", key: `talk:${t.id}`, kind: "conversation", at: t.at, title: t.label, about: t.about, rank: 1 });
  }
  for (const m of input.items) {
    if (!(m.person_id === personId && m.kind === "promise" && m.status === "resolved" && !m.deleted_at)) continue;
    if (!(m.subject_type === undefined || m.subject_type === null || m.subject_type === "user")) continue;
    out.push({ type: "show", key: `kept:${m.id}`, kind: "kept", at: String(m.updated_at ?? m.created_at ?? ""), title: keptTitle(m.statement), about: null, rank: 2 });
  }
  // Newest first; on the same moment, what the user did before the note about it.
  out.sort((a, b) => b.at.localeCompare(a.at) || b.rank - a.rank || a.key.localeCompare(b.key));
  return out.map(({ rank: _rank, ...e }) => e as PageEntry);
}

function yearOf(iso: string): number | null {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? null : t.getFullYear();
}

/** Year dividers between the pages: none for this year's, one wherever the year changes after that. */
export function withYears(entries: PageEntry[], now: Date): PagesRow[] {
  const rows: PagesRow[] = [];
  let last = now.getFullYear();
  for (const e of entries) {
    const y = yearOf(e.at);
    if (y !== null && y !== last) {
      rows.push({ type: "year", key: `year:${y}:${e.key}`, year: y });
      last = y;
    }
    rows.push(e);
  }
  return rows;
}

/** Where `query` appears in `text`, ignoring case (UTF-16 ranges, never overlapping). */
export function findRanges(text: string, query: string): [number, number][] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  const t = text.toLocaleLowerCase();
  // Lower-casing changed the length (rare letters): nothing is marked rather than the wrong words.
  if (t.length !== text.length) return [];
  const out: [number, number][] = [];
  for (let i = t.indexOf(q); i !== -1; i = t.indexOf(q, i + q.length)) out.push([i, i + q.length]);
  return out;
}

/** "Find in Rosa's pages": the notes whose words say it; what the user did is set aside while finding. */
export function findInPages(entries: PageEntry[], query: string): PageEntry[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return entries;
  return entries.filter((e) => e.type === "note" && [e.text ?? "", ...e.quotes].some((w) => w.toLocaleLowerCase().includes(q)));
}

/**
 * Splits [0, length) at every layer's edges; each piece carries the layers that cover it whole. Pieces
 * covered by the same layers are joined. Used to draw a note with its kept words, the found words and
 * the words Kinship couldn't get to, all at once.
 */
export function segment<T>(length: number, layers: { start: number; end: number; data: T }[]): { start: number; end: number; on: T[] }[] {
  const ok = layers.filter((l) => l.start >= 0 && l.end <= length && l.end > l.start);
  const edges = [...new Set([0, length, ...ok.flatMap((l) => [l.start, l.end])])].sort((a, b) => a - b);
  const out: { start: number; end: number; on: T[] }[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const [a, b] = [edges[i], edges[i + 1]];
    const on = ok.filter((l) => l.start <= a && b <= l.end).map((l) => l.data);
    const prev = out[out.length - 1];
    if (prev && prev.on.length === on.length && prev.on.every((d, k) => d === on[k])) prev.end = b;
    else out.push({ start: a, end: b, on });
  }
  return out;
}

/** The kept span a piece of the note belongs to: the narrowest one covering it (the most specific line). */
export function narrowest(spans: PageSpan[]): PageSpan | null {
  return spans.reduce<PageSpan | null>((best, s) => (!best || s.end - s.start < best.end - best.start ? s : best), null);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Sun, Oct 4" (with the year when it isn't this year): a page's date, in local time. */
export function pageDay(iso: string, now: Date): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return `${DAYS[t.getDay()]}, ${MONTHS[t.getMonth()]} ${t.getDate()}${t.getFullYear() !== now.getFullYear() ? `, ${t.getFullYear()}` : ""}`;
}

/** "Sunday, October 4" (with the year when it isn't this year): the Source page's title. */
export function longDay(iso: string, now: Date): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return `${WEEKDAYS[t.getDay()]}, ${MONTHS_LONG[t.getMonth()]} ${t.getDate()}${t.getFullYear() !== now.getFullYear() ? `, ${t.getFullYear()}` : ""}`;
}

/** The date block of a Coming up row: "MON" over "Nov 16", from an ISO day. */
export function dateBlock(day: string): { weekday: string; date: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!m) return null;
  const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return { weekday: DAYS[t.getUTCDay()].toUpperCase(), date: `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}` };
}

/** The sentence a line was understood from: the note's sentence around the kept span, with the span inside it. */
export function sentenceAround(text: string, span: [number, number] | null): { text: string; mark: [number, number] | null } {
  if (!span) return { text, mark: null };
  const [a, b] = span;
  const before = text.slice(0, a);
  const stops = [...before.matchAll(/[.!?\n]\s/gu)];
  const start = stops.length ? (stops[stops.length - 1].index ?? 0) + stops[stops.length - 1][0].length : 0;
  const after = text.slice(b).search(/[.!?\n](\s|$)/u);
  const end = after === -1 ? text.length : b + after + 1;
  return { text: text.slice(start, end), mark: [a - start, b - start] };
}
