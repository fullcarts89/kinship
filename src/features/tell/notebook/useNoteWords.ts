// The user's own words for the note under review, with what each phrase became (PR #77 §7, "Your
// words"): the note as told, each kept line's source span (memory_item_sources), each reading held
// for the user (its spans in the reading), and the words the understanding did not get to (Option
// A). Read from the store, never inferred; a phrase that can't be placed exactly is left plain.
import { codePointToUtf16 } from "../../../../supabase/functions/_shared/spans";
import { useV2Session } from "@/providers/V2SessionProvider";
import { useStoreQuery } from "@/hooks/useStoreQuery";
import { recoveryFor } from "@/hooks/useV2";
import type { MemoryItem, MemorySource } from "@/store/repositories";
import type { UserStore } from "@/store/userStore";
import type { Understanding } from "@/store/understanding";
import { partialOf } from "../reviewModel";
import type { WordMark } from "./words";

export interface NoteWords {
  captureId: string;
  /** The note as told; null once a "delete after" note has let its words go. */
  text: string | null;
  /** When it was told (for "Your words · Mon, Nov 2", and to read a day the user wrote). */
  toldAt: string | null;
  marks: WordMark[];
  /** Words the understanding did not get to, still not told again (UTF-16). */
  unprocessed: { start: number; end: number }[];
  /** Relationships said again that Kinship already holds (H17): shown as "Already known". */
  known: string[];
  /** The user's own words behind each line ("line:<id>") and held reading ("held:<index>"). */
  quotes: Record<string, string>;
}

/** Code points → a UTF-16 range in `text`, checked against the quote when there is one. */
function toRange(text: string, span: { start: number; end: number; quote?: string | null }): { start: number; end: number } | null {
  try {
    const start = codePointToUtf16(text, span.start);
    const end = codePointToUtf16(text, span.end);
    if (end > start && (!span.quote || text.slice(start, end) === span.quote)) return { start, end };
  } catch {
    // Not where it says: placed by its quote below, or not at all.
  }
  if (span.quote) {
    const at = text.indexOf(span.quote);
    if (at >= 0) return { start: at, end: at + span.quote.length };
  }
  return null;
}

export async function noteWordsFor(store: UserStore, understanding: Understanding, captureId: string): Promise<NoteWords | null> {
  const capture = (await store.get("captures", captureId)) as { raw_text: string | null; created_at?: unknown; occurred_at?: string; coverage?: { unprocessed: { start: number; end: number }[]; unlocated: number } | null } | null;
  if (!capture) return null;
  const text = typeof capture.raw_text === "string" ? capture.raw_text : null;
  const row = await understanding.get(captureId);
  const toldAt = typeof capture.created_at === "string" ? capture.created_at : capture.occurred_at ?? null;
  const out: NoteWords = { captureId, text, toldAt, marks: [], unprocessed: [], known: row?.reading?.known ?? [], quotes: {} };
  if (!text) return out;
  const people = (await store.list("people")) as { id: string; state?: string }[];
  const removedFromPeople = new Set(people.filter((p) => p.state === "archived").map((p) => p.id));
  const sources = ((await store.list("memory_item_sources")) as MemorySource[]).filter((s) => s.capture_id === captureId);
  for (const s of sources) {
    if (typeof s.span_start !== "number" || typeof s.span_end !== "number") continue;
    const item = (await store.get("memory_items", String(s.memory_item_id), { includeDeleted: true })) as MemoryItem | null;
    if (!item || removedFromPeople.has(item.person_id)) continue;
    const range = toRange(text, { start: s.span_start, end: s.span_end, quote: typeof s.quote === "string" ? s.quote : null });
    if (!range) continue;
    out.marks.push({
      key: `line:${item.id}:${range.start}`, target: { kind: "line", id: item.id }, personId: item.person_id ?? null, ...range,
      ...(item.status === "retracted" || item.deleted_at ? { gone: true } : {}),
    });
    out.quotes[`line:${item.id}`] ??= text.slice(range.start, range.end);
  }
  (row?.reading?.held ?? []).forEach((h, index) => {
    for (const span of h.spans ?? []) {
      const range = toRange(text, span);
      if (!range) continue;
      out.marks.push({ key: `held:${index}:${range.start}`, target: { kind: "held", index }, personId: h.person_id ?? null, ...range });
      out.quotes[`held:${index}`] ??= text.slice(range.start, range.end);
    }
  });
  const partial = partialOf(capture.coverage ?? row?.reading?.coverage ?? null, await recoveryFor(store, capture as never));
  for (const u of partial?.unprocessed ?? []) {
    const range = toRange(text, u);
    if (range) out.unprocessed.push(range);
  }
  return out;
}

/** The words for the note under review (null for none), re-read as the store changes. */
export function useNoteWords(captureId: string | null): NoteWords | null {
  const { store, understanding } = useV2Session();
  const q = useStoreQuery(store, async () => (captureId ? noteWordsFor(store, understanding, captureId) : null), [captureId]);
  return q.data && q.data.captureId === captureId ? q.data : null;
}
