// "Tell the rest" (Option A, founder 19 Oct 2026; review of PR #58): what a later note did for a
// partial one, as far as the phone can show it. A later note's existence proves nothing. A passage the
// first note did not get to counts as told again only when a later note that was read holds those
// words and one of its kept lines rests on them; everything else stays unresolved, visibly, with the
// later note's own state said plainly (not read yet, failed, read but not covering these words).
import { utf16ToCodePoint } from "../../supabase/functions/_shared/spans";
import type { Capture, MemoryItem } from "./repositories";
import type { UserStore } from "./userStore";

export interface Span {
  start: number;
  end: number;
}

/** The later notes, summed up: none; one still to be read; one that failed; read. */
export type FollowUpState = "none" | "pending" | "failed" | "read";

/** A later note linked to a partial one, as the phone has it. */
export interface FollowUpNote {
  state: "pending" | "failed" | "read";
  /** Its words (NFC); null once its text is gone. */
  text: string | null;
  /** The spans (code points into `text`) its live kept lines rest on. */
  kept: Span[];
}

export interface Recovery {
  /** Passages of the first note a later note's kept line rests on: told again, and kept. */
  recovered: Span[];
  /** Passages still not got to, in the note's order. */
  remaining: Span[];
  followUp: FollowUpState;
}

/**
 * Which of a partial note's passages a later note demonstrably took, from the words of the notes and
 * the spans its lines rest on. Pure. `text` is the first note's words (NFC); `unprocessed` its spans.
 */
export function recoveryOf(text: string, unprocessed: Span[], followUps: FollowUpNote[]): Recovery {
  const followUp: FollowUpState = followUps.length === 0
    ? "none"
    : followUps.some((f) => f.state === "pending")
    ? "pending"
    : followUps.some((f) => f.state === "failed")
    ? "failed"
    : "read";
  const chars = Array.from(text.normalize("NFC"));
  const read = followUps.filter((f) => f.state === "read" && f.text);
  const recovered: Span[] = [];
  const remaining: Span[] = [];
  for (const span of [...unprocessed].sort((a, b) => a.start - b.start || a.end - b.end)) {
    const passage = chars.slice(span.start, span.end).join("").trim();
    (passage && read.some((f) => holds(f, passage)) ? recovered : remaining).push(span);
  }
  return { recovered, remaining, followUp };
}

/** The later note says these words, and one of its kept lines rests on them (any part of them). */
function holds(note: FollowUpNote, passage: string): boolean {
  const text = (note.text ?? "").normalize("NFC");
  const words = passage.normalize("NFC").split(/\s+/u).filter(Boolean);
  if (!words.length || !note.kept.length) return false;
  const re = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+"), "giu");
  for (const m of text.matchAll(re)) {
    if (m.index === undefined) continue;
    let start: number;
    let end: number;
    try {
      start = utf16ToCodePoint(text, m.index);
      end = utf16ToCodePoint(text, m.index + m[0].length);
    } catch {
      continue;
    }
    if (note.kept.some((k) => k.start < end && start < k.end)) return true;
  }
  return false;
}

/** The later notes linked to this one ("Tell the rest"), live, each with its state and the spans its kept lines rest on. */
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
    const kept: Span[] = [];
    if (state === "read") {
      for (const s of (await store.list("memory_item_sources")).filter((x) => x.capture_id === c.id && !x.deleted_at)) {
        const item = (await store.get("memory_items", String(s.memory_item_id))) as MemoryItem | null;
        if (!item || item.status === "retracted" || item.deleted_at) continue;
        if (typeof s.span_start === "number" && typeof s.span_end === "number" && s.span_end > s.span_start) kept.push({ start: s.span_start, end: s.span_end });
      }
    }
    out.push({ state, text: c.raw_text ?? null, kept });
  }
  return out;
}
