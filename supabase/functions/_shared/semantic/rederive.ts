// Reading a line's residence again after it changed (Phase 4B B3; brief §5;
// founder CC-20, CC-24). Deterministic and model-free: the same reading as a
// new note gets (residence.ts), from the user's own words for the line.
//
//   when    a line that had a residence reading, lost it because the line
//           changed (the B2 trigger tombstones it at once), and has none now:
//           the app reports the edit (the gateway's `rederive`), and the next
//           Tell about that person reads any such line it finds (the safety
//           net). Only lines B3 has read: never a line told before B3, which
//           waits for the report-only run and the founder's stop (§14, B6)
//   words   a line the user edited or wrote: its statement, the user's own
//           words now. Any other line: the quotes of its notes
//   write   write_facets (20261015090000) re-checks everything: the version
//           read, the line still eligible, the place words in those same
//           words; a reading the user chose is never replaced
//
// So "Susan lives in California", edited to "Susan lives in Alameda", reads
// as Alameda again, and a later "Susan moved to Colorado" can close it
// (§21). The line's provenance is untouched: the facet is a reading of it,
// and the edit, its source and its history stay as the user left them.

import type { PlaceIndex } from "./placeIndex.ts";
import { residenceEligible, residenceOf, type ResidenceFacet } from "./residence.ts";

/** A line as write_facets checks it. */
export interface LineToRead {
  id: string;
  version: number;
  kind: string;
  subject_type: string;
  certainty: string;
  sensitivity: string;
  with_person_ids?: readonly string[] | null;
  statement: string;
  user_state: string;
}

/** One item of write_facets' p_items. */
export interface FacetWrite {
  memory_item_id: string;
  version: number;
  facets: ResidenceFacet[];
}

/** The most lines one report or one Tell reads again. */
export const MAX_REREAD = 20;

/** The user's own words for a line: what they wrote or edited it to, else what their notes said. */
export function wordsOf(line: Pick<LineToRead, "statement" | "user_state">, quotes: readonly string[]): string[] {
  if (line.user_state === "edited" || line.user_state === "user_authored") return [line.statement];
  return quotes.filter((q) => q.trim().length > 0);
}

/** The line's residence reading, read again; null when its words no longer say one (it stays without). */
export function rederive(line: LineToRead, quotes: readonly string[], places: PlaceIndex): FacetWrite | null {
  if (!residenceEligible(line)) return null;
  for (const words of wordsOf(line, quotes)) {
    const text = words.normalize("NFC");
    const found = residenceOf(text, [{ start: 0, end: Array.from(text).length }], places);
    if (found) return { memory_item_id: line.id, version: line.version, facets: [found.facet] };
  }
  return null;
}
