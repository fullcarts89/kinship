// "Tell the rest" (Option A, founder 19 Oct 2026; reviews of PR #58): what a later note did for a
// partial one, as far as the phone can show it. A later note's existence proves nothing, and neither
// does repeating a passage: "Priya loves jazz and plays chess on Tuesdays" told again and read as
// "Priya loves jazz" once more has not remembered the chess. So a passage the first note did not get to
// counts as told again only when
//   - the first note kept nothing on those words (one sentence, one thing: the loss is the only thing there),
//   - exactly one proposal was lost on those words (the coverage keeps one span per lost proposal), and
//   - a later note that was read holds those words with a live kept line resting on them that is not one
//     of the first note's own lines (not the same memory, not the same words as a line it kept).
// Anything less is said as it is: not read yet, failed, read with nothing new on those words, or read with
// something new kept on words that held more than one thing ("uncertain": kept something, Kinship cannot
// tell whether it was what it missed). Option A has no item-level record of which thing each proposal was;
// that is Option B's accounting, and this module never guesses at it.
import { utf16ToCodePoint } from "../../supabase/functions/_shared/spans";
import type { Capture, MemoryItem, MemorySource } from "./repositories";
import type { UserStore } from "./userStore";

export interface Span {
  start: number;
  end: number;
}

/** A live kept line and the words of one note it rests on. */
export interface KeptLine extends Span {
  itemId: string;
  statement: string;
}

/** The later notes, summed up: none; one still to be read; one that failed; read. */
export type FollowUpState = "none" | "pending" | "failed" | "read";

/** A later note linked to a partial one, as the phone has it. */
export interface FollowUpNote {
  state: "pending" | "failed" | "read";
  /** Its words (NFC); null once its text is gone. */
  text: string | null;
  /** The live kept lines resting on its words. */
  kept: KeptLine[];
}

/** The first note's own live kept lines, on its own words. */
export interface FirstNote {
  kept: KeptLine[];
}

export type PassageState =
  /** A read later note kept a line on these words that is not one of the first note's, and these words held one lost thing and nothing kept: answered. */
  | "recovered"
  /** A read later note kept something new on these words, but they held more than one thing: kept something, not provably what was missed. */
  | "uncertain"
  /** No read later note kept anything new on these words. */
  | "missed";

export interface Passage {
  span: Span;
  /** How many proposals were lost on these words. */
  lost: number;
  /** The first note kept a line on these words too (a compound sentence). */
  shared: boolean;
  state: PassageState;
}

export interface Recovery {
  passages: Passage[];
  /** Distinct passages answered. */
  recovered: Span[];
  /** Distinct passages still not answered (missed or uncertain), in the note's order. */
  remaining: Span[];
  /** How many of the remaining are "kept something, not provably what was missed". */
  uncertain: number;
  followUp: FollowUpState;
}

const fold = (s: string) => s.normalize("NFC").toLowerCase().replace(/[’‘`]/gu, "'").replace(/\s+/gu, " ").trim();
const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

/**
 * Which of a partial note's passages a later note demonstrably answered, from the words of the notes
 * and the lines resting on them. Pure. `text` is the first note's words (NFC); `unprocessed` its
 * coverage spans, one per lost proposal (the same span twice means two things lost on those words).
 */
export function recoveryOf(text: string, unprocessed: Span[], first: FirstNote, followUps: FollowUpNote[]): Recovery {
  const followUp: FollowUpState = followUps.length === 0
    ? "none"
    : followUps.some((f) => f.state === "pending")
    ? "pending"
    : followUps.some((f) => f.state === "failed")
    ? "failed"
    : "read";
  const chars = Array.from(text.normalize("NFC"));
  const read = followUps.filter((f) => f.state === "read" && f.text);
  const own = new Set(first.kept.map((k) => k.itemId));
  const ownWords = new Set(first.kept.map((k) => fold(k.statement)));
  // One passage per distinct span, counting how many proposals were lost on it.
  const passages: Passage[] = [];
  for (const span of [...unprocessed].sort((a, b) => a.start - b.start || a.end - b.end)) {
    const same = passages.find((p) => p.span.start === span.start && p.span.end === span.end);
    if (same) same.lost++;
    else passages.push({ span: { start: span.start, end: span.end }, lost: 1, shared: first.kept.some((k) => overlaps(k, span)), state: "missed" });
  }
  for (const p of passages) {
    const words = chars.slice(p.span.start, p.span.end).join("").trim();
    const fresh = words ? read.some((f) => keptNewOn(f, words, (line) => !own.has(line.itemId) && !ownWords.has(fold(line.statement)))) : false;
    p.state = !fresh ? "missed" : (!p.shared && p.lost === 1) ? "recovered" : "uncertain";
  }
  return {
    passages,
    recovered: passages.filter((p) => p.state === "recovered").map((p) => p.span),
    remaining: passages.filter((p) => p.state !== "recovered").map((p) => p.span),
    uncertain: passages.filter((p) => p.state === "uncertain").length,
    followUp,
  };
}

/** The later note says these words, and a kept line that passes `isNew` rests on them (any part of them). */
function keptNewOn(note: FollowUpNote, passage: string, isNew: (line: KeptLine) => boolean): boolean {
  const text = (note.text ?? "").normalize("NFC");
  const words = passage.normalize("NFC").split(/\s+/u).filter(Boolean);
  const candidates = note.kept.filter(isNew);
  if (!words.length || !candidates.length) return false;
  const re = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+"), "giu");
  for (const m of text.matchAll(re)) {
    if (m.index === undefined) continue;
    let at: Span;
    try {
      at = { start: utf16ToCodePoint(text, m.index), end: utf16ToCodePoint(text, m.index + m[0].length) };
    } catch {
      continue;
    }
    if (candidates.some((k) => overlaps(k, at))) return true;
  }
  return false;
}

/** The live kept lines resting on one note's words (a retracted or deleted line rests on nothing). */
export async function keptLinesOf(store: UserStore, captureId: string): Promise<KeptLine[]> {
  const out: KeptLine[] = [];
  for (const s of ((await store.list("memory_item_sources")) as MemorySource[]).filter((x) => x.capture_id === captureId)) {
    const item = (await store.get("memory_items", String(s.memory_item_id))) as MemoryItem | null;
    if (!item || item.status === "retracted" || item.deleted_at) continue;
    if (typeof s.span_start === "number" && typeof s.span_end === "number" && s.span_end > s.span_start) {
      out.push({ start: s.span_start, end: s.span_end, itemId: item.id, statement: item.statement });
    }
  }
  return out;
}

/** The later notes linked to this one ("Tell the rest"), live, each with its state and the lines its words hold. */
export async function followUpsOf(store: UserStore, captureId: string): Promise<FollowUpNote[]> {
  const later = ((await store.list("captures")) as Capture[]).filter((c) => c.continues_capture_id === captureId && !c.deleted_at);
  if (!later.length) return [];
  const out: FollowUpNote[] = [];
  for (const c of later) {
    const row = await store.db.get<{ state: string; reading: string | null }>("SELECT state, reading FROM understanding WHERE capture_id = ?", [c.id]);
    const reading = row?.reading ? (JSON.parse(row.reading) as { held?: unknown[]; settled?: boolean }) : null;
    // A question still waiting on the later note (or an answer on its way): not settled, so not read.
    const asked = (row?.state === "answering") || (!!reading && !reading.settled && Array.isArray(reading.held) && reading.held.length > 0);
    const state: FollowUpNote["state"] = row?.state === "failed" || c.status === "failed"
      ? "failed"
      : asked
      ? "pending"
      : c.status === "extracted" || c.status === "needs_review" || c.status === "skipped"
      ? "read"
      : "pending";
    out.push({ state, text: c.raw_text ?? null, kept: state === "read" ? await keptLinesOf(store, c.id) : [] });
  }
  return out;
}
