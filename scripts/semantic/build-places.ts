// Builds the place data for residence readings (Phase 4B, brief §6) from
// pinned GeoNames dumps and the curated alias list:
//
//   supabase/functions/_shared/semantic/places/places-<YYYY.MM>.json
//
// Inputs (download.geonames.org/export/dump/, CC BY 4.0):
//   countryInfo.txt        countries (ISO code, name, population)
//   admin1CodesASCII.txt   first-level regions (code, name, ASCII name)
//   cities15000.zip        cities of about 15,000 people or more; the build
//                          reads the cities15000.txt inside it
// Kept: name, ASCII name, admin-1, country and population. Nothing else
// (no alternate names, coordinates, counties, neighbourhoods, postal codes).
//
// Reproducible and diffable:
//   * every dump is pinned in scripts/semantic/places/sources.json (URL, the
//     day it was downloaded, size, SHA-256); a build refuses dumps that don't
//     match their pins, so the same dumps always give the same bytes;
//   * rows are sorted and written one per line, so a new version's diff
//     reads place by place.
//
// Usage (from the repository root):
//   # a new version: download the three dumps into one folder, unzip
//   # cities15000.zip there, set "version" in sources.json, then record the pins
//   deno run --allow-read --allow-write scripts/semantic/build-places.ts --dumps <folder> --pin <YYYY-MM-DD>
//   # rebuild from the pinned dumps (fails if any dump differs)
//   deno run --allow-read --allow-write scripts/semantic/build-places.ts --dumps <folder>
//   # check the committed JSON is exactly what the pinned dumps build
//   deno run --allow-read scripts/semantic/build-places.ts --dumps <folder> --check
// Options: --pins <sources.json> --aliases <aliases.json> --out <file>.

import {
  type AliasRow, ATTRIBUTION, type CityRow, checkPlaces, COLUMNS, type CountryRow, LICENCE_URL, type Places,
  type RegionRow, sortKey, type Source,
} from "../../supabase/functions/_shared/semantic/places/format.ts";

/** Not places people live in: a section of a place (a neighbourhood), or one that is gone. */
export const EXCLUDED_FEATURES = new Set(["PPLX", "PPLH", "PPLQ", "PPLW", "PPLCH"]);

/** A curated alias: a country, a region of it, or one city in a region. */
export interface AliasInput {
  alias: string;
  country: string;
  region?: string;
  city?: string;
  note?: string;
}

/** A dump as sources.json lists it; unpinned (null) until --pin records it. */
export type Pin = Omit<Source, "retrieved" | "bytes" | "sha256"> & {
  retrieved: string | null;
  bytes: number | null;
  sha256: string | null;
};

export interface Pins {
  version: string;
  sources: Pin[];
}

export interface BuildInput {
  version: string;
  sources: Source[];
  countryInfo: string;
  admin1: string;
  cities: string;
  aliases: AliasInput[];
}

export interface BuildReport {
  countries: number;
  regions: number;
  cities: number;
  aliases: number;
  skipped: { regions_unknown_country: number; cities_excluded_feature: number; cities_unknown_country: number };
}

const lines = (text: string) => text.split(/\r?\n/).filter((l) => l.trim() !== "" && !l.startsWith("#"));
const int = (s: string | undefined) => {
  const n = Number.parseInt(s ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
/** The ASCII name when GeoNames gives none: the name without its accents, if that is ASCII. */
const asciiOf = (ascii: string, name: string) => {
  if (ascii.trim() !== "") return ascii.trim();
  const plain = name.normalize("NFD").replace(/\p{M}/gu, "");
  return /^[\x20-\x7e]+$/.test(plain) ? plain : name;
};
const byKey = <R extends unknown[]>(a: R, b: R) => {
  const x = sortKey(String(a[0]));
  const y = sortKey(String(b[0]));
  return x < y ? -1 : x > y ? 1 : 0;
};

/** The dataset from the dumps' text. Pure: the same input always gives the same output. */
export function buildPlaces(input: BuildInput): { places: Places; report: BuildReport } {
  const skipped = { regions_unknown_country: 0, cities_excluded_feature: 0, cities_unknown_country: 0 };

  const countries: CountryRow[] = [];
  for (const l of lines(input.countryInfo)) {
    const c = l.split("\t");
    if (!/^[A-Z]{2}$/.test(c[0] ?? "") || !(c[4] ?? "").trim()) throw new Error(`countryInfo: bad row ${JSON.stringify(l)}`);
    countries.push([`country:${c[0]}`, c[4].trim(), int(c[7])]);
  }
  const countryRefs = new Set(countries.map((r) => r[0]));

  const regions: RegionRow[] = [];
  for (const l of lines(input.admin1)) {
    const c = l.split("\t");
    const m = /^([A-Z]{2})\.([A-Za-z0-9]{1,20})$/.exec(c[0] ?? "");
    if (!m || !(c[1] ?? "").trim()) throw new Error(`admin1CodesASCII: bad row ${JSON.stringify(l)}`);
    const country = `country:${m[1]}`;
    if (!countryRefs.has(country)) {
      skipped.regions_unknown_country++;
      continue;
    }
    regions.push([`region:${c[0]}`, c[1].trim(), asciiOf(c[2] ?? "", c[1].trim()), country]);
  }
  const regionRefs = new Set(regions.map((r) => r[0]));

  const cities: CityRow[] = [];
  for (const l of lines(input.cities)) {
    const c = l.split("\t");
    if (c.length < 15 || !/^[0-9]{1,12}$/.test(c[0]) || !c[1].trim()) throw new Error(`cities: bad row ${JSON.stringify(l.slice(0, 80))}`);
    if (EXCLUDED_FEATURES.has(c[7])) {
      skipped.cities_excluded_feature++;
      continue;
    }
    const country = `country:${c[8]}`;
    if (!countryRefs.has(country)) {
      skipped.cities_unknown_country++;
      continue;
    }
    const region = `region:${c[8]}.${c[10]}`;
    cities.push([`city:${c[0]}`, c[1].trim(), asciiOf(c[2], c[1].trim()), regionRefs.has(region) ? region : null, country, int(c[14])]);
  }

  const aliases = resolveAliases(input.aliases, countryRefs, regionRefs, cities);

  countries.sort(byKey);
  regions.sort(byKey);
  cities.sort(byKey);
  aliases.sort(byKey);
  const places: Places = {
    version: input.version,
    attribution: ATTRIBUTION,
    licence: LICENCE_URL,
    sources: input.sources,
    countries: { columns: COLUMNS.countries, rows: countries },
    regions: { columns: COLUMNS.regions, rows: regions },
    cities: { columns: COLUMNS.cities, rows: cities },
    aliases: { columns: COLUMNS.aliases, rows: aliases },
  };
  const errors = checkPlaces(places);
  if (errors.length) throw new Error(`the built dataset is not sound:\n${errors.slice(0, 20).join("\n")}`);
  return {
    places,
    report: { countries: countries.length, regions: regions.length, cities: cities.length, aliases: aliases.length, skipped },
  };
}

/** Each alias names exactly one place in the data, or the build stops. */
export function resolveAliases(
  input: AliasInput[], countries: Set<string>, regions: Set<string>, cities: CityRow[],
): AliasRow[] {
  const out: AliasRow[] = [];
  const seen = new Set<string>();
  for (const a of input) {
    const what = JSON.stringify(a);
    if (typeof a.alias !== "string" || a.alias.trim() !== a.alias || a.alias.length < 1 || a.alias.length > 40) {
      throw new Error(`alias: bad alias ${what}`);
    }
    if (seen.has(a.alias.toLowerCase())) throw new Error(`alias: ${a.alias} is listed twice`);
    seen.add(a.alias.toLowerCase());
    const country = `country:${a.country}`;
    if (!countries.has(country)) throw new Error(`alias: ${a.alias} names an unknown country (${what})`);
    if (a.city !== undefined && a.region === undefined) throw new Error(`alias: ${a.alias} names a city without its region`);
    let ref = country;
    if (a.region !== undefined) {
      ref = `region:${a.country}.${a.region}`;
      if (!regions.has(ref)) throw new Error(`alias: ${a.alias} names an unknown region (${what})`);
    }
    if (a.city !== undefined) {
      const matches = cities.filter((c) => c[4] === country && c[3] === ref && (c[1] === a.city || c[2] === a.city));
      if (matches.length !== 1) {
        throw new Error(`alias: ${a.alias} must name exactly one city, found ${matches.length} (${what})`);
      }
      ref = matches[0][0];
    }
    out.push([a.alias, ref]);
  }
  return out;
}

/** Deterministic text: sorted rows, one per line, so versions diff place by place. */
export function renderPlaces(p: Places): string {
  const rows = (t: { columns: readonly string[]; rows: unknown[][] }) =>
    `{"columns": ${JSON.stringify(t.columns)}, "rows": [\n${t.rows.map((r) => `    ${JSON.stringify(r)}`).join(",\n")}\n  ]}`;
  return [
    "{",
    `  "version": ${JSON.stringify(p.version)},`,
    `  "attribution": ${JSON.stringify(p.attribution)},`,
    `  "licence": ${JSON.stringify(p.licence)},`,
    `  "sources": [\n${p.sources.map((s) => `    ${JSON.stringify(s)}`).join(",\n")}\n  ],`,
    `  "countries": ${rows(p.countries)},`,
    `  "regions": ${rows(p.regions)},`,
    `  "cities": ${rows(p.cities)},`,
    `  "aliases": ${rows(p.aliases)}`,
    "}",
    "",
  ].join("\n");
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** What the CLI touches, so the tests can run it in memory. */
export interface Files {
  read(path: string): Promise<Uint8Array>;
  write(path: string, text: string): Promise<void>;
  log(line: string): void;
}

const ROLES = { countryInfo: /^countryInfo\.txt$/, admin1: /^admin1CodesASCII\.txt$/, cities: /^cities[0-9]+\.(zip|txt)$/ } as const;

/**
 * The pinned dumps' text. With `pinDay`, records each dump's size and
 * checksum (and the day) as the new pins instead of checking them.
 */
export async function readPinned(files: Files, dumps: string, pins: Pins, pinDay: string | null) {
  const sources: Source[] = [];
  const text: Partial<Record<keyof typeof ROLES, string>> = {};
  for (const role of Object.keys(ROLES) as (keyof typeof ROLES)[]) {
    const pin = pins.sources.find((s) => ROLES[role].test(s.file));
    if (!pin) throw new Error(`sources: no pin for ${role}`);
    const bytes = await files.read(`${dumps}/${pin.file}`);
    const source: Source = { file: pin.file, url: pin.url, retrieved: pin.retrieved ?? "", bytes: bytes.length, sha256: await sha256(bytes) };
    let readable = bytes;
    if (pin.extracted) {
      readable = await files.read(`${dumps}/${pin.extracted.file}`);
      source.extracted = { file: pin.extracted.file, bytes: readable.length, sha256: await sha256(readable) };
    }
    if (pinDay) {
      source.retrieved = pinDay;
    } else {
      const same = pin.retrieved !== null && pin.bytes === source.bytes && pin.sha256 === source.sha256
        && (!pin.extracted || (pin.extracted.bytes === source.extracted?.bytes && pin.extracted.sha256 === source.extracted?.sha256));
      if (!same) {
        throw new Error(`${pin.file} doesn't match its pin (got ${source.bytes} bytes, sha256 ${source.sha256}). ` +
          "Rebuild from the pinned dumps, or pin a new version with --pin <day>.");
      }
    }
    sources.push(source);
    text[role] = new TextDecoder("utf-8", { fatal: true }).decode(readable);
  }
  return { sources, text: text as Record<keyof typeof ROLES, string> };
}

const ROOT = new URL("../../", import.meta.url).pathname;

export async function main(args: string[], files: Files): Promise<number> {
  const opt = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] ?? null : null;
  };
  const dumps = opt("--dumps");
  if (!dumps) {
    files.log("usage: build-places.ts --dumps <folder> [--pin <YYYY-MM-DD>] [--check] [--pins f] [--aliases f] [--out f]");
    return 2;
  }
  const pinDay = opt("--pin");
  if (pinDay !== null && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(pinDay)) {
    files.log("--pin takes the day the dumps were downloaded, YYYY-MM-DD");
    return 2;
  }
  const pinsPath = opt("--pins") ?? `${ROOT}scripts/semantic/places/sources.json`;
  const aliasesPath = opt("--aliases") ?? `${ROOT}scripts/semantic/places/aliases.json`;
  const decode = (b: Uint8Array) => new TextDecoder().decode(b);
  const pins = JSON.parse(decode(await files.read(pinsPath))) as Pins;
  const out = opt("--out") ?? `${ROOT}supabase/functions/_shared/semantic/places/${pins.version}.json`;
  const aliases = (JSON.parse(decode(await files.read(aliasesPath))) as { aliases: AliasInput[] }).aliases;

  const { sources, text } = await readPinned(files, dumps, pins, pinDay);
  const { places, report } = buildPlaces({
    version: pins.version, sources, countryInfo: text.countryInfo, admin1: text.admin1, cities: text.cities, aliases,
  });
  const rendered = renderPlaces(places);

  if (args.includes("--check")) {
    const committed = decode(await files.read(out));
    if (committed !== rendered) {
      files.log(`${out} is not what the pinned dumps build`);
      return 1;
    }
    files.log(`${out} matches the pinned dumps`);
    return 0;
  }
  if (pinDay) {
    const pinned: Pins = { ...pins, sources: sources.map((s) => ({ ...s })) };
    await files.write(pinsPath, `${JSON.stringify(pinned, null, 2)}\n`);
    files.log(`pinned ${sources.length} dumps in ${pinsPath}`);
  }
  await files.write(out, rendered);
  files.log(`${places.version}: ${report.countries} countries, ${report.regions} regions, ${report.cities} cities, ` +
    `${report.aliases} aliases; skipped ${JSON.stringify(report.skipped)}; ${rendered.length} bytes → ${out}`);
  return 0;
}

if (import.meta.main) {
  const code = await main(Deno.args, {
    read: (p) => Deno.readFile(p),
    write: (p, t) => Deno.writeTextFile(p, t),
    log: (l) => console.log(l),
  });
  Deno.exit(code);
}
