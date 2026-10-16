// The place data's versioned format (Phase 4B, brief §6). One generated JSON
// per dataset version (places-YYYY.MM.json) beside this file, built by
// scripts/semantic/build-places.ts from pinned GeoNames dumps and a curated,
// reviewed alias list. It lives with the gateway and is never shipped in the
// app (metro.blocklist.js; app/__tests__/placesNotInApp.test.ts).
//
// Only what residence readings need: a place's name, ASCII name, first-level
// region, country and population. No alternate names, coordinates,
// geometry, counties, neighbourhoods or postal codes. The text a user sees is
// always their own words, never these names (brief §6, §12).
//
// A reference is "<level>:<id>", as memory_item_facets stores it
// (20261015090000):
//   country:<ISO 3166-1 alpha-2>     country:US
//   region:<country>.<admin-1 code>  region:US.CA
//   city:<GeoNames id>               city:5322737

export const ATTRIBUTION = "Place data from GeoNames (geonames.org), CC BY 4.0";
export const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

export type Level = "city" | "region" | "country";

/** One input dump, pinned so a rebuild from the same files is byte-identical. */
export interface Source {
  file: string;
  url: string;
  /** The day it was downloaded (GeoNames updates its dumps daily). */
  retrieved: string;
  bytes: number;
  sha256: string;
  /** For a zip: the file inside it that the build reads. */
  extracted?: { file: string; bytes: number; sha256: string };
}

export interface Table<Row> {
  columns: readonly string[];
  rows: Row[];
}

/** [ref, name, population] */
export type CountryRow = [string, string, number];
/** [ref, name, ascii name, country ref] */
export type RegionRow = [string, string, string, string];
/** [ref, name, ascii name, region ref | null, country ref, population] */
export type CityRow = [string, string, string, string | null, string, number];
/** [alias, ref] */
export type AliasRow = [string, string];

export interface Places {
  version: string;
  attribution: typeof ATTRIBUTION;
  licence: typeof LICENCE_URL;
  sources: Source[];
  countries: Table<CountryRow>;
  regions: Table<RegionRow>;
  cities: Table<CityRow>;
  aliases: Table<AliasRow>;
}

export const COLUMNS = {
  countries: ["ref", "name", "population"],
  regions: ["ref", "name", "ascii", "country"],
  cities: ["ref", "name", "ascii", "region", "country", "population"],
  aliases: ["alias", "ref"],
} as const;

const VERSION = /^places-[0-9]{4}\.[0-9]{2}$/;
const COUNTRY = /^country:[A-Z]{2}$/;
const REGION = /^region:[A-Z]{2}\.[A-Za-z0-9]{1,20}$/;
const CITY = /^city:[0-9]{1,12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const DAY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/** The same rule as public.place_ref_ok in the database. */
export function levelOf(ref: string): Level | null {
  if (COUNTRY.test(ref)) return "country";
  if (REGION.test(ref)) return "region";
  if (CITY.test(ref)) return "city";
  return null;
}

const text = (v: unknown, max = 200): v is string => typeof v === "string" && v.trim() !== "" && v.length <= max;
const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/**
 * Every way a dataset can be wrong, as messages (empty when it's sound):
 * the shape, unique refs in order, every region and city inside a country
 * (and region) that exists, and every alias naming one place that exists.
 */
export function checkPlaces(data: unknown): string[] {
  const errors: string[] = [];
  const d = data as Partial<Places>;
  if (typeof d !== "object" || d === null) return ["not an object"];
  if (typeof d.version !== "string" || !VERSION.test(d.version)) errors.push(`bad version ${String(d.version)}`);
  if (d.attribution !== ATTRIBUTION) errors.push("missing or changed attribution");
  if (d.licence !== LICENCE_URL) errors.push("missing or changed licence");
  if (!Array.isArray(d.sources) || d.sources.length === 0) errors.push("no pinned sources");
  for (const s of d.sources ?? []) {
    if (!text(s?.file) || !text(s?.url) || !DAY.test(String(s?.retrieved)) || !count(s?.bytes) || !SHA256.test(String(s?.sha256))) {
      errors.push(`bad source ${JSON.stringify(s)}`);
    }
    if (s?.extracted && (!text(s.extracted.file) || !count(s.extracted.bytes) || !SHA256.test(String(s.extracted.sha256)))) {
      errors.push(`bad extracted file in ${s.file}`);
    }
  }

  const refs = new Map<string, Level>();
  const table = <R extends unknown[]>(name: keyof typeof COLUMNS, check: (row: R) => string | null) => {
    const t = d[name] as Table<R> | undefined;
    if (!t || JSON.stringify(t.columns) !== JSON.stringify(COLUMNS[name]) || !Array.isArray(t.rows)) {
      errors.push(`${name}: bad table`);
      return;
    }
    let last = "";
    for (const row of t.rows) {
      const problem = Array.isArray(row) && row.length === COLUMNS[name].length ? check(row) : "bad row";
      if (problem) {
        errors.push(`${name}: ${problem} in ${JSON.stringify(row)}`);
        continue;
      }
      const key = String(row[0]);
      if (name !== "aliases") {
        if (refs.has(key)) errors.push(`${name}: duplicate ${key}`);
        refs.set(key, levelOf(key)!);
      }
      if (sortKey(key) <= last) errors.push(`${name}: out of order at ${key}`);
      last = sortKey(key);
    }
  };

  table<CountryRow>("countries", ([ref, name, pop]) =>
    levelOf(ref) !== "country" ? "bad ref" : !text(name, 200) ? "bad name" : !count(pop) ? "bad population" : null);
  table<RegionRow>("regions", ([ref, name, ascii, country]) =>
    levelOf(ref) !== "region" ? "bad ref" : !text(name) || !text(ascii) ? "bad name"
      : refs.get(country) !== "country" || !ref.startsWith(`region:${country.slice(8)}.`) ? "unknown country" : null);
  table<CityRow>("cities", ([ref, name, ascii, region, country, pop]) =>
    levelOf(ref) !== "city" ? "bad ref" : !text(name) || !text(ascii) ? "bad name"
      : refs.get(country) !== "country" ? "unknown country"
      : region !== null && (refs.get(region) !== "region" || !region.startsWith(`region:${country.slice(8)}.`)) ? "unknown region"
      : !count(pop) ? "bad population" : null);
  const seen = new Set<string>();
  table<AliasRow>("aliases", ([alias, ref]) => {
    if (!text(alias, 40)) return "bad alias";
    if (seen.has(alias.toLowerCase())) return "duplicate alias";
    seen.add(alias.toLowerCase());
    return refs.has(ref) ? null : "alias to an unknown place";
  });
  return errors;
}

/**
 * The dataset's one order, used by the build and checked here: countries and
 * regions by code, cities by GeoNames id as a number, aliases by alias.
 */
export function sortKey(key: string): string {
  const city = /^city:([0-9]+)$/.exec(key);
  return city ? `city:${city[1].padStart(12, "0")}` : key;
}
