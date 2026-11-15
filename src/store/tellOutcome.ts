// What came of a Tell, read one way everywhere (CMR-1, Core Memory Reliability; founder, 10 Nov 2026:
// "This needs to be logged every time"). A retained note must be findable whatever its understanding
// did, so nothing decides where a note shows from this phone's transient state alone.
//
// Two sources, one answer:
//
//   the server     `captures.understanding`, written by the gateway once it has understood a note
//                  (the shared contract with the gateway, CMR-1 Workstream C). It is the truth across
//                  phones. NULL (or absent, before its migration is applied) means not yet understood,
//                  or a row older than the column.
//   this phone     the `understanding` state machine row (store/understanding.ts), which knows the
//                  same thing sooner, and alone when the server has not said yet.
//   the row itself a capture pulled from another phone with no local row and no column still says
//                  what happened by its status (`failed`, `skipped`, `extracted`, `needs_review`).
//
// The words are the gateway's:
//   kept      at least one line was written from the note
//   nothing   understanding ran and kept nothing: the note stays as words
//   partial   some kept, with passages not got to or things unplaced (Option A)
//   held      a question is waiting for the user
//   declined  the user declined the reading ("Don't keep this"); the note itself remains
//   failed    understanding failed
// plus the phone's own "pending": told, not understood yet.
import type { UnderstandingRow } from "./understanding";
import { anythingLeftOut, type NoteCoverage } from "./coverage";

export const UNDERSTANDING_VALUES = ["kept", "nothing", "partial", "held", "declined", "failed"] as const;
export type Understanding = (typeof UNDERSTANDING_VALUES)[number];
export type TellOutcome = Understanding | "pending";

/** The columns of a capture row the outcome is read from (a synced `captures` row has them all). */
export interface OutcomeCapture {
  status: string;
  /** The server's word (nullable; absent before the migration). */
  understanding?: unknown;
  /** Option A / CMR-1 C2: what the understanding did not get to or kept nothing from; null when the note was taken whole. */
  coverage?: NoteCoverage | null;
}

/** The server's column, when it holds one of its words. */
export function serverUnderstanding(capture: OutcomeCapture): Understanding | null {
  const v = capture.understanding;
  return typeof v === "string" && (UNDERSTANDING_VALUES as readonly string[]).includes(v) ? (v as Understanding) : null;
}

/** Whether a coverage says anything was left out (a passage not got to, a place kept nothing from, or a count). */
function partialCoverage(c: OutcomeCapture["coverage"]): boolean {
  return anythingLeftOut(c);
}

/**
 * The reading the user turned down: every held item answered "Don't keep this", nothing saved. The row
 * records it durably (`reading.declined`, set when the answer lands); the answer itself is also read, for
 * the moment between landing and the next pull.
 */
export function declinedReading(row: UnderstandingRow | null): boolean {
  const r = row?.reading;
  if (!r || r.saved.length > 0 || r.held.length > 0) return false;
  if (r.declined === true) return true;
  return Array.isArray(r.answered) && r.answered.length > 0 && r.answered.every((a) => a.skip === true);
}

/** A question is waiting for the user on this phone's row. */
function questionOpen(local: UnderstandingRow | null): boolean {
  const r = local?.reading;
  return !!r && local?.state === "review" && !r.settled && r.held.length > 0;
}

/**
 * What came of this Tell. `lines` is how many live memory lines rest on the note on this phone (its
 * sources, less retracted and deleted lines), for a settled note the server has not labelled.
 *
 * Precedence (agreed with the gateway, CMR-1): a question still held wins. The server writes `held`
 * whenever a live review waits; should this phone hold a question the server's word has not caught up
 * with, the question still wins here.
 */
export function tellOutcome(capture: OutcomeCapture, local: UnderstandingRow | null, lines = 0): TellOutcome {
  if (questionOpen(local)) return "held";
  const server = serverUnderstanding(capture);
  if (server) return server;
  if (local) {
    switch (local.state) {
      case "waiting":
      case "answering":
        return "pending";
      case "kept":
        // Understanding off, or declined by the model: the note stays as words.
        return "nothing";
      case "failed":
        return "failed";
      case "review":
      case "closing":
      case "done": {
        const r = local.reading;
        if (!r) return local.state === "done" ? (lines ? "kept" : "nothing") : "pending";
        if (!r.settled && r.held.length > 0) return "held";
        if (declinedReading(local)) return "declined";
        // Anything left out (a passage not got to, a place kept nothing from, a count) is partial, whether or
        // not a line was kept (the gateway's rule, CMR-1 C2).
        if (partialCoverage(capture.coverage ?? r.coverage ?? null)) return "partial";
        if (r.saved.length === 0 && r.held.length === 0 && lines === 0) return "nothing";
        return "kept";
      }
    }
  }
  // Told on another phone (or before this phone kept rows): the synced row's own status.
  switch (capture.status) {
    case "failed":
      return "failed";
    case "skipped":
      return lines ? "kept" : "nothing";
    case "needs_review":
      return "held";
    case "extracted":
      return partialCoverage(capture.coverage ?? null) ? "partial" : lines ? "kept" : "nothing";
    default:
      return "pending";
  }
}

/**
 * The note's understanding is over, one way or another: it can be found where its words belong (a
 * person's Pages, or Your words). A note still being understood, or holding a question, is accounted
 * for by the open-notes machinery instead (Today's quiet line, the person page's waiting rows), never
 * placed on a page before Kinship knows who it is about (founder H24).
 */
export function settled(outcome: TellOutcome): boolean {
  return outcome !== "pending" && outcome !== "held";
}
