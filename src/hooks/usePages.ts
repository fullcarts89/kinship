// The notebook's reads (PR #77; founder directive 2 Nov 2026), from the user's store the way the 2.0
// hooks read it (useV2.ts): a person's Pages, what the Now lens needs to know about each of its lines,
// the line sheet's note and kind, and the Source page's kept words by line and person. Everything
// re-reads when the store changes; nothing here writes.
import { useV2Session } from "@/providers/V2SessionProvider";
import { kindLabel, promiseLabel } from "@/features/memory/format";
import { voiced } from "@/features/memory/statements";
import { trailFor, type ContactEventRow } from "@/features/person/trail";
import { nextBirthday } from "@/features/setup/setupModel";
import { buildPages, isIntention, sentenceAround, type PageEntry, type PagesCapture, type PagesConversation, type PagesItem, type PagesSource } from "@/features/person/notebook/pagesModel";
import { repositoriesFor, type Capture, type MemoryItem, type Person } from "@/store/repositories";
import { quietNotesIn } from "@/store/understanding";
import { keptOnPeople } from "@/features/tell/keptOn";
import type { UserStore } from "@/store/userStore";
import { codePointToUtf16 } from "../../supabase/functions/_shared/spans";
import { shortName } from "../../supabase/functions/_shared/extraction/names";
import { useStoreQuery } from "./useStoreQuery";

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const live = (m: MemoryItem) => (m.status === "active" || m.status === "resolved") && !m.deleted_at;
const sensitiveOf = (m: MemoryItem) => typeof m.sensitivity === "string" && m.sensitivity !== "none";

function utf16Range(text: string, start: unknown, end: unknown): [number, number] | null {
  if (typeof start !== "number" || typeof end !== "number" || end <= start) return null;
  try {
    const r: [number, number] = [codePointToUtf16(text, start), codePointToUtf16(text, end)];
    return r[1] > r[0] ? r : null;
  } catch {
    return null;
  }
}

// ─── Pages ──────────────────────────────────────────────────────────────

/** A person's Pages from the store (the hook and tests share it). */
export async function pagesFor(store: UserStore, personId: string, now: Date): Promise<PageEntry[]> {
  const repos = repositoriesFor(store);
  const people = await repos.people.list();
  const person = people.find((p) => p.id === personId && !p.deleted_at) ?? null;
  if (!person) return [];
  const items = ((await store.list("memory_items")) as MemoryItem[]).map((m) => voiced(m, people));
  const sources = (await store.list("memory_item_sources")) as unknown as PagesSource[];
  const captures = (await repos.captures.list()) as unknown as PagesCapture[];
  const contacts = (await repos.contacts.forPerson(personId)) as unknown as ContactEventRow[];
  const about = (await repos.memory.aboutPerson(personId)).map((m) => voiced(m, people));
  const at = new Map(contacts.map((c) => [c.id, c.occurred_at]));
  const conversations: PagesConversation[] = trailFor(contacts, about, person, now)
    .map((t) => ({ id: t.id, label: t.label, about: t.about, at: at.get(t.id) ?? "" }));
  // Notes that kept no line, on the page of whoever they're about (founder, 10 Nov 2026: every Tell is logged).
  const settledQuiet = await quietNotesIn(store);
  const withLine = new Set(sources.filter((s) => s.source_kind === "capture" && !s.deleted_at && typeof s.capture_id === "string").map((s) => s.capture_id as string));
  const quietNotes = (captures as unknown as Capture[])
    .filter((c) => !c.deleted_at && !withLine.has(c.id) && c.raw_text && (settledQuiet.has(c.id) || c.status === "skipped" || c.status === "failed"))
    .filter((c) => keptOnPeople(c, people).includes(personId))
    .map((c) => c.id);
  return buildPages({ personId, items: items as unknown as PagesItem[], sources, captures, conversations, quietNotes });
}

export function usePages(personId: string): { entries: PageEntry[]; loading: boolean } {
  const { store } = useV2Session();
  const q = useStoreQuery(store, () => pagesFor(store, personId, new Date()), [personId]);
  return { entries: q.data ?? [], loading: !q.data };
}

// ─── What the Now lens shows with a line ────────────────────────────────

export interface LineFact {
  /** A private line the user said yes to: "Private · you said yes", never its note. */
  sensitive: boolean;
  /** The exact day, when the line has one (a Coming up row's date block). */
  day: string | null;
}

/** Per line about them (and "birthday"): whether it is private, and its exact day. */
export async function lineFactsFor(store: UserStore, personId: string, now: Date): Promise<Record<string, LineFact>> {
  const repos = repositoriesFor(store);
  const person = (await repos.people.list()).find((p) => p.id === personId && !p.deleted_at) ?? null;
  const out: Record<string, LineFact> = {};
  for (const m of await repos.memory.aboutPerson(personId)) {
    if (!live(m)) continue;
    const d = (m.detail ?? {}) as Record<string, unknown>;
    const precision = typeof d.date_precision === "string" ? d.date_precision : "day";
    const raw = typeof d.date === "string" ? d.date : typeof d.due_date === "string" ? d.due_date : null;
    const day = raw && precision === "day" && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
    out[m.id] = { sensitive: sensitiveOf(m), day };
  }
  if (person?.birthday) out.birthday = { sensitive: false, day: nextBirthday(String(person.birthday), isoDay(now)) };
  return out;
}

export function useLineFacts(personId: string): Record<string, LineFact> {
  const { store } = useV2Session();
  const q = useStoreQuery(store, () => lineFactsFor(store, personId, new Date()), [personId]);
  return q.data ?? {};
}

/** Their Contacts birthday, whenever it is (the sparse page's one row). */
export function contactsBirthday(person: Person | null, today: string): string | null {
  if (!person?.birthday || person.birthday_source !== "contacts") return null;
  return nextBirthday(String(person.birthday), today);
}

// ─── The line sheet ─────────────────────────────────────────────────────

export interface LineDetail {
  itemId: string;
  /** "Something you said you'd do", "Something true"… */
  kindLabel: string;
  /** The user's own promise, still open: "I did this" is offered. */
  openOwnPromise: boolean;
  promise: boolean;
  sensitive: boolean;
  /** Whose line it is, the way Kinship says their name. */
  first: string | null;
  /** The note's sentence the line rests on, with its kept words; null when there is no note. */
  quote: { text: string; mark: [number, number] | null } | null;
}

/** The notebook's words for a line's kind (PR #77 lineSheet), else the built label. */
export function notebookKindLabel(m: { kind: string; subject_type?: unknown }, first: string | null): string {
  const own = m.subject_type === undefined || m.subject_type === null || m.subject_type === "user";
  switch (m.kind) {
    case "fact": return "Something true";
    case "event": return "Something happening";
    case "plan": return "A plan";
    case "promise": return own ? "Something you said you'd do" : promiseLabel("person", first);
    case "thread": return "Something ongoing";
    case "context": return "Something that matters to them";
    default: return kindLabel(m.kind);
  }
}

export async function lineDetailFor(store: UserStore, itemId: string): Promise<LineDetail | null> {
  const repos = repositoriesFor(store);
  const item = await repos.memory.get(itemId);
  if (!item || !live(item)) return null;
  const people = await repos.people.list();
  const person = people.find((p) => p.id === item.person_id) ?? null;
  const first = person ? shortName(person) || person.display_name : null;
  const notes = (await repos.memory.sourcesFor(itemId))
    .filter((s) => s.source_kind === "capture" && typeof s.capture_id === "string" && !s.deleted_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  let quote: LineDetail["quote"] = null;
  const newest = notes[0];
  if (newest) {
    const c = await repos.captures.get(String(newest.capture_id));
    const text = c?.raw_text ?? null;
    if (text) quote = sentenceAround(text, utf16Range(text, newest.span_start, newest.span_end));
    else if (typeof newest.quote === "string" && newest.quote) quote = { text: newest.quote, mark: [0, newest.quote.length] };
  }
  const own = item.subject_type === undefined || item.subject_type === null || item.subject_type === "user";
  return {
    itemId,
    kindLabel: notebookKindLabel(item, first),
    promise: item.kind === "promise",
    openOwnPromise: item.kind === "promise" && own && item.status === "active",
    sensitive: sensitiveOf(item),
    first,
    quote,
  };
}

export function useLineDetail(itemId: string | null): LineDetail | null {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async () => (itemId ? lineDetailFor(store, itemId) : null), [itemId]);
  return q.data ?? null;
}

// ─── The Source page ────────────────────────────────────────────────────

export interface SourceSpan {
  start: number;
  end: number;
  itemId: string;
  personId: string;
  sensitive: boolean;
}

export interface SourceKept {
  itemId: string;
  statement: string;
  personId: string;
  person: string;
  sensitive: boolean;
  /** A later note replaced it (H25): it stays, marked. */
  updated: boolean;
}

export interface SourcePage {
  at: string;
  intention: boolean;
  spans: SourceSpan[];
  kept: SourceKept[];
}

/** The Source page's kept words, by line and person (UTF-16, into the note's own text). */
export async function sourcePageFor(store: UserStore, captureId: string): Promise<SourcePage | null> {
  const repos = repositoriesFor(store);
  const capture = await repos.captures.get(captureId);
  if (!capture) return null;
  const people = await repos.people.list();
  const rows = ((await store.list("memory_item_sources")) as unknown as PagesSource[])
    .filter((s) => s.capture_id === captureId && s.source_kind === "capture" && !s.deleted_at);
  const spans: SourceSpan[] = [];
  const kept: SourceKept[] = [];
  const lines: MemoryItem[] = [];
  for (const s of rows) {
    const stored = await repos.memory.get(s.memory_item_id);
    if (!stored || stored.status === "retracted" || stored.deleted_at) continue;
    const p = people.find((x) => x.id === stored.person_id);
    // Removed from People (founder I3): what was only about them is out of sight with them.
    if (p?.state === "archived") continue;
    if (!lines.some((m) => m.id === stored.id)) lines.push(stored);
    const item = voiced(stored, people);
    if (!kept.some((k) => k.itemId === item.id)) {
      kept.push({
        itemId: item.id, statement: item.statement, personId: item.person_id, person: p ? shortName(p) || p.display_name : "",
        sensitive: sensitiveOf(item), updated: item.status === "superseded",
      });
    }
    // Only a live line marks the note (a replaced one is listed, not marked).
    if (!live(stored) || !capture.raw_text) continue;
    const r = utf16Range(capture.raw_text, s.span_start, s.span_end);
    if (r) spans.push({ start: r[0], end: r[1], itemId: item.id, personId: item.person_id, sensitive: sensitiveOf(item) });
  }
  // In the note's own order: the marks from its start, the lines by where their words begin.
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const first = (id: string) => spans.find((s) => s.itemId === id)?.start ?? Number.MAX_SAFE_INTEGER;
  kept.sort((a, b) => first(a.itemId) - first(b.itemId));
  return {
    at: String(capture.created_at ?? capture.occurred_at ?? ""),
    intention: isIntention(capture, lines),
    spans,
    kept,
  };
}

export function useSourcePage(captureId: string): SourcePage | null {
  const { store } = useV2Session();
  const q = useStoreQuery(store, () => sourcePageFor(store, captureId), [captureId]);
  return q.data ?? null;
}
