// Place readings for residence (Phase 4B B3; brief §5–§7), from a place
// dataset in the versioned format of places/format.ts.
//
// A name is looked up by its folded form (case, accents and punctuation
// ignored) among countries, first-level regions and cities, by name and
// ASCII name; a curated alias ("CA", "NYC") only as written, in capitals,
// since several are also English words ("IN", "OR", "ME"). Each reading is
// {ref, level, ancestors}, exactly as memory_item_facets stores a candidate,
// so the phone can read containment without the place data.
//
// Readings are ordered by population, the usual reading's measure (§7).
// Regions have none in the data: a region counts the people of its cities
// in the data, which is enough to say that "Colorado" is the state long
// before it is the town in Brazil, and never more than that.
//
// Pure, no I/O. The data itself is loaded only by the gateway
// (places/dataset.ts); the app never has it (brief §6).

import type { Level, Places } from "./places/format.ts";

export interface Candidate {
  ref: string;
  level: Level;
  /** What contains it, nearest first: a city's region (when known) and country, a region's country. */
  ancestors: string[];
}

export interface Reading extends Candidate {
  population: number;
}

export interface PlaceIndex {
  /** The dataset version, as facets record it ("places-2026.10"). */
  version: string;
  /** Every reading of these words, most populous first; [] when the data doesn't know them. */
  readings(words: string): Reading[];
  /** One place by its reference, or null. */
  get(ref: string): Reading | null;
}

/** Case-, accent- and punctuation-folded words, as value_norm keeps them. */
export function foldPlace(words: string): string {
  return words.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase()
    .replace(/['’‘`.]/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

/** The words without a leading "the" ("the Bay Area" is "bay area"). */
export function withoutThe(folded: string): string {
  return folded.replace(/^the /u, "");
}

export function buildPlaceIndex(data: Places): PlaceIndex {
  const byRef = new Map<string, Reading>();
  const byName = new Map<string, string[]>();
  const byAlias = new Map<string, string>();
  const add = (name: string, ref: string) => {
    const k = foldPlace(name);
    if (!k) return;
    const list = byName.get(k) ?? [];
    if (!list.includes(ref)) list.push(ref);
    byName.set(k, list);
  };

  for (const [ref, name, population] of data.countries.rows) {
    byRef.set(ref, { ref, level: "country", ancestors: [], population });
    add(name, ref);
  }
  const regionPeople = new Map<string, number>();
  for (const [, , , region, , population] of data.cities.rows) {
    if (region) regionPeople.set(region, (regionPeople.get(region) ?? 0) + population);
  }
  for (const [ref, name, ascii, country] of data.regions.rows) {
    byRef.set(ref, { ref, level: "region", ancestors: [country], population: regionPeople.get(ref) ?? 0 });
    add(name, ref);
    add(ascii, ref);
  }
  for (const [ref, name, ascii, region, country, population] of data.cities.rows) {
    byRef.set(ref, { ref, level: "city", ancestors: region ? [region, country] : [country], population });
    add(name, ref);
    add(ascii, ref);
  }
  for (const [alias, ref] of data.aliases.rows) byAlias.set(alias, ref);

  const sorted = (refs: string[]) =>
    refs.map((r) => byRef.get(r)).filter((r): r is Reading => !!r)
      .sort((a, b) => b.population - a.population || a.ref.localeCompare(b.ref));

  return {
    version: data.version,
    get: (ref) => byRef.get(ref) ?? null,
    readings(words) {
      const trimmed = words.trim();
      // An alias only as written, in capitals ("CA", "D.C."): never "ok" or "me".
      const alias = byAlias.get(trimmed.replace(/\./gu, ""));
      if (alias && /^[A-Z.]{2,5}$/u.test(trimmed)) return sorted([alias]);
      const k = foldPlace(trimmed);
      const refs = byName.get(k) ?? byName.get(withoutThe(k)) ?? [];
      return sorted(refs);
    },
  };
}
