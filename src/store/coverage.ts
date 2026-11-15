// What one note's understanding left out, as the gateway records it on the capture (Option A, founder
// 19 Oct 2026; CMR-1 C2, no silent loss), read one way by every screen:
//
//   unprocessed      passages whose model call failed (a timeout, an error, a refusal): one span per
//                    lost proposal, so the same span twice means two things lost there (followUp.ts
//                    counts them). Kept exactly as given.
//   not_understood   the places of proposals the understanding read but could keep nothing from, one
//                    entry per lost proposal per place where its words were found (CMR-1 C2). The phone
//                    marks each place once: identical spans are one, and a place already in
//                    `unprocessed` is not marked twice.
//   unlocated        a count of lost proposals whose words could not be found at all (no place to mark).
//
// Offsets only (code points into the note's text), never words. Both kinds are marked the same way,
// and both are what "Tell the rest" offers to tell again: the copy stays Option A's.

export interface Span {
  start: number;
  end: number;
}

/** The coverage shape on a capture row and in the gateway's reply (either may lack `not_understood`). */
export interface NoteCoverage {
  unprocessed: Span[];
  unlocated: number;
  not_understood?: Span[];
}

const sound = (s: unknown): s is Span =>
  !!s && typeof s === "object" && Number.isInteger((s as Span).start) && Number.isInteger((s as Span).end)
  && (s as Span).start >= 0 && (s as Span).end > (s as Span).start;

/** The spans in `raw`, when it holds a list of sound ones. */
export function spansOf(raw: unknown): Span[] {
  return Array.isArray(raw) ? raw.filter(sound).map((s) => ({ start: s.start, end: s.end })) : [];
}

/**
 * Every place the understanding left out, in the note's order: `unprocessed` as given, then each
 * `not_understood` place once (identical spans are one; one already among the unprocessed is not
 * repeated). Empty for a note taken whole, or no coverage at all.
 */
export function leftOut(c: NoteCoverage | null | undefined): Span[] {
  if (!c) return [];
  const out = spansOf(c.unprocessed);
  const seen = new Set(out.map((s) => `${s.start}-${s.end}`));
  for (const s of spansOf(c.not_understood)) {
    const key = `${s.start}-${s.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end);
}

/** Whether a coverage says anything at all was left out (a place, or a count). */
export function anythingLeftOut(c: NoteCoverage | null | undefined): boolean {
  return !!c && (leftOut(c).length > 0 || (Number.isInteger(c.unlocated) && c.unlocated > 0));
}
