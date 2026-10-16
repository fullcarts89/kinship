// How a new residence relates to the ones Kinship already holds (Phase 4B
// B3; brief §8, §21; founder CC-19, CC-20, CC-24).
//
// It runs for a new residence observation N against each current residence
// line E of the same person, subject and related person (the caller picks
// them: active, with a live facet, so stated, unshared and not sensitive).
// Each pair gets a class from the readings, the note gets cues from the
// user's words, and the pair's decision comes from the table:
//
//   class \ cue   none                  change                correction
//   SAME          same (merge)          same                  same
//   E ⊇ N         keep (refines)        keep (moved within E) keep
//   N ⊇ E         keep (refines, B)     ask (case E)          close, corrected
//   DISJOINT      close, no transition  close, changed (C)    close, corrected (D)
//   AMBIGUOUS     keep (two lines)      ask                   close, corrected if N
//                                                             says "not <E's words>"
//   UNKNOWN       keep (fail open)      the model's target,   the model's target,
//                                       as changed            as corrected
//
// A line the user edited or wrote (protected) is never closed silently: with
// no cue a DISJOINT pair asks instead (§8 guard 3, kept for that case only
// by §21); with a change or correction in the user's words it closes as any
// line would (CC-24). Never the same line twice: a protected SAME is a new
// line (the database never merges into one).
//
// Combining the pairs: any "same" is the same fact (nothing changes); else
// any "ask" holds the line with one question about the most specific line
// it asks about; else the lines to close are closed, the most specific
// first; lines that contain N stay current.
//
// One thing the brief's table doesn't say, from the B2 finding (§20): the
// place data has no neighbourhoods, and a neighbourhood can share its name
// with a city abroad ("Pilsen", Chicago, reads as Plzeň next to "lives in
// Illinois"). A city read in another country than the other line's place is
// therefore AMBIGUOUS, never DISJOINT: two lines without a cue, one question
// with a change. Proposed in docs (brief §22); the founder decides.
//
// Pure: no I/O, no model.

import type { Candidate } from "./placeIndex.ts";
import type { Cue, ResidenceFacet } from "./residence.ts";

export type PairClass = "SAME" | "E_CONTAINS_N" | "N_CONTAINS_E" | "DISJOINT" | "AMBIGUOUS" | "UNKNOWN";

/** The facet fields a relation reads (as stored, or as just derived). */
export type FacetLike = Pick<ResidenceFacet, "value_text" | "value_norm" | "place_ref" | "candidates" | "usual_ref">;

/** A current residence line of the same person and subject. */
export interface CurrentResidence {
  id: string;
  facet: FacetLike;
  /** Edited or written by the user. */
  protected: boolean;
  /** Its place in the dossier, newest first (ties among equally specific lines go to the newest). */
  order: number;
}

export type Outcome = "NEW" | "SAME" | "REFINES" | "SUPERSEDES" | "CONFLICT";
export type Transition = "changed" | "corrected" | null;

export type Decision =
  | { outcome: "NEW" | "REFINES" }
  | { outcome: "SAME"; target: string }
  | {
    outcome: "SUPERSEDES";
    /** The lines to close, the most specific first: the first is supersedes_id. */
    closes: string[];
    transition: Transition;
    /** The cue in the user's words that justifies the closure (the database re-reads it). */
    cue: Cue | null;
  }
  | {
    outcome: "CONFLICT";
    /** The line the question is about ("Is Susan still in Alameda?"): the most specific one. */
    asks: CurrentResidence;
    /** What "She moved" closes, the most specific first (the asked line first). */
    closes: string[];
    /** "Still there": N keeps its facet (it composes, or the user's answer could pin it), or only its words. */
    stay: "facet" | "words";
  };

const LEVEL_RANK: Record<string, number> = { city: 0, region: 1, country: 2 };

function reading(f: FacetLike, ref: string | null): Candidate | null {
  return ref ? f.candidates.find((c) => c.ref === ref) ?? null : null;
}

/** The reading a facet is taken as: the pinned one, else the usual one (§7). */
export function usualReading(f: FacetLike): Candidate | null {
  return reading(f, f.place_ref) ?? reading(f, f.usual_ref);
}

/** a strictly contains b. */
function contains(a: Candidate, b: Candidate): boolean {
  return b.ancestors.includes(a.ref);
}

function compatible(a: Candidate, b: Candidate): boolean {
  return a.ref === b.ref || contains(a, b) || contains(b, a);
}

function countryOf(c: Candidate): string {
  return c.level === "country" ? c.ref : c.ancestors.find((a) => a.startsWith("country:")) ?? c.ref;
}

/** The pair's class, from the readings only (brief §8). */
export function pairClass(n: FacetLike, e: FacetLike): PairClass {
  if (n.value_norm === e.value_norm) return "SAME";
  if (n.place_ref && n.place_ref === e.place_ref) return "SAME";
  if (!n.candidates.length || !e.candidates.length) return "UNKNOWN";
  const un = usualReading(n);
  const ue = usualReading(e);
  if (un && ue) {
    if (un.ref === ue.ref) return "SAME";
    if (contains(ue, un)) return "E_CONTAINS_N";
    if (contains(un, ue)) return "N_CONTAINS_E";
    // Incompatible as usually read: is another reading of either compatible?
    const other = n.candidates.some((cn) => e.candidates.some((ce) => compatible(cn, ce)));
    if (other) return "AMBIGUOUS";
    // A city abroad may be a neighbourhood the data doesn't know (B2 finding: "Pilsen").
    if (countryOf(un) !== countryOf(ue) && (un.level === "city" || ue.level === "city")) return "AMBIGUOUS";
    return "DISJOINT";
  }
  // No usual reading on one side: containment only when every pairing agrees.
  const pairs = n.candidates.flatMap((cn) => e.candidates.map((ce) => [cn, ce] as const));
  if (pairs.every(([cn, ce]) => contains(ce, cn))) return "E_CONTAINS_N";
  if (pairs.every(([cn, ce]) => contains(cn, ce))) return "N_CONTAINS_E";
  return "AMBIGUOUS";
}

type PairCue = "none" | "change" | "correction";

/**
 * The note's cue for this pair: "not <words>" corrects only the line whose
 * own words for the place follow it, compared as the database compares them
 * (edited_line_closure_ok: case-insensitive, the words as written).
 */
export function namesLine(c: Cue, e: Pick<FacetLike, "value_text">): boolean {
  return c.kind === "not" && c.text.toLowerCase().includes(e.value_text.toLowerCase());
}

function cueFor(cues: readonly Cue[], e: FacetLike): { kind: PairCue; cue: Cue | null } {
  const named = cues.find((c) => namesLine(c, e));
  if (named) return { kind: "correction", cue: named };
  const corr = cues.find((c) => c.kind === "correction");
  if (corr) return { kind: "correction", cue: corr };
  const change = cues.find((c) => c.kind === "change");
  if (change) return { kind: "change", cue: change };
  return { kind: "none", cue: null };
}

type PairDecision =
  | { act: "same" }
  | { act: "keep"; refines: boolean }
  | { act: "close"; transition: Transition; cue: Cue | null }
  | { act: "ask"; stay: "facet" | "words" }
  | { act: "model"; transition: Transition; cue: Cue };

/** One pair, by the table above. */
export function decidePair(cls: PairClass, cues: readonly Cue[], e: CurrentResidence): PairDecision {
  const { kind, cue } = cueFor(cues, e.facet);
  switch (cls) {
    case "SAME":
      return { act: "same" };
    case "E_CONTAINS_N":
      return { act: "keep", refines: kind === "none" };
    case "N_CONTAINS_E":
      if (kind === "none") return { act: "keep", refines: true };
      if (kind === "change") return { act: "ask", stay: "facet" };
      return { act: "close", transition: "corrected", cue };
    case "DISJOINT":
      if (kind === "none") return e.protected ? { act: "ask", stay: "words" } : { act: "close", transition: null, cue: null };
      return { act: "close", transition: kind === "change" ? "changed" : "corrected", cue };
    case "AMBIGUOUS":
      if (kind === "change") return { act: "ask", stay: "facet" };
      // Corrected only when N says "not <E's words>"; "actually" alone can't say which of two readings was wrong.
      if (kind === "correction" && cue?.kind === "not") return { act: "close", transition: "corrected", cue };
      return { act: "keep", refines: false };
    case "UNKNOWN":
      if (kind === "none" || !cue) return { act: "keep", refines: false };
      return { act: "model", transition: kind === "change" ? "changed" : "corrected", cue };
  }
}

function specificity(e: CurrentResidence): number {
  const u = usualReading(e.facet);
  // Words the data doesn't know ("Logan Square") are taken as the most specific: neighbourhoods are.
  return u ? LEVEL_RANK[u.level] ?? 0 : e.facet.candidates.length ? LEVEL_RANK[e.facet.candidates[0].level] ?? 0 : -1;
}

function mostSpecificFirst(a: CurrentResidence, b: CurrentResidence): number {
  return specificity(a) - specificity(b) || a.order - b.order;
}

/**
 * N against every current residence line. `modelTarget` is the model's single
 * proposed supersede target (validated by the caller as today's: same person
 * and subject); it decides only for lines whose place is unknown.
 */
export function relateResidence(
  n: { facet: FacetLike; cues: readonly Cue[] },
  current: readonly CurrentResidence[],
  modelTarget: string | null,
): Decision {
  const decided = current.map((e) => ({ e, d: decidePair(pairClass(n.facet, e.facet), n.cues, e) }));

  const same = decided.find((x) => x.d.act === "same");
  if (same) return same.e.protected ? { outcome: "NEW" } : { outcome: "SAME", target: same.e.id };

  const asking = decided.filter((x) => x.d.act === "ask").sort((a, b) => mostSpecificFirst(a.e, b.e));
  const closing = decided.filter((x) =>
    x.d.act === "close" || (x.d.act === "model" && x.e.id === modelTarget)
  );
  if (asking.length) {
    const first = asking[0];
    const others = [...asking.slice(1), ...closing].map((x) => x.e).sort(mostSpecificFirst);
    return {
      outcome: "CONFLICT",
      asks: first.e,
      closes: [first.e.id, ...others.map((e) => e.id)],
      stay: asking.some((x) => x.d.act === "ask" && x.d.stay === "words") ? "words" : "facet",
    };
  }
  if (closing.length) {
    const ordered = closing.sort((a, b) => mostSpecificFirst(a.e, b.e));
    // One note, one cue: the transition is the note's, and the cue the one that names the first line closed.
    const lead = ordered[0].d as Extract<PairDecision, { act: "close" | "model" }>;
    return { outcome: "SUPERSEDES", closes: ordered.map((x) => x.e.id), transition: lead.transition, cue: lead.cue };
  }
  if (decided.some((x) => x.d.act === "keep" && x.d.refines)) return { outcome: "REFINES" };
  return { outcome: "NEW" };
}
