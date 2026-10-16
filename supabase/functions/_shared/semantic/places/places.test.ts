// The committed place data (Phase 4B B2, brief §6): sound, attributed,
// pinned, and reading the brief's places the way §7 and §8 expect. Built by
// scripts/semantic/build-places.ts; its own tests run on fixture dumps.
import places from "./places-2026.10.json" with { type: "json" };
import { ATTRIBUTION, checkPlaces, type CityRow, type Places } from "./format.ts";

const p = places as unknown as Places;

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const named = (name: string) => p.cities.rows.filter((r: CityRow) => r[1] === name || r[2] === name);
const alias = (a: string) => p.aliases.rows.find((r) => r[0] === a)?.[1];

Deno.test("places-2026.10 is sound, attributed and pinned to its dumps", () => {
  eq(checkPlaces(p), []);
  eq(p.version, "places-2026.10");
  eq(p.attribution, ATTRIBUTION);
  eq(p.sources.map((s) => s.url), [
    "https://download.geonames.org/export/dump/countryInfo.txt",
    "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
    "https://download.geonames.org/export/dump/cities15000.zip",
  ]);
  eq(p.sources.every((s) => /^[0-9a-f]{64}$/.test(s.sha256) && s.retrieved === "2026-10-16"), true, "pinned");
});

Deno.test("the brief's places read as the brief expects", () => {
  // Alameda, CA is one reading; "CA" qualifies it as California (§7).
  eq(named("Alameda").map((r) => r[3]), ["region:US.CA"]);
  eq(alias("CA"), "region:US.CA");
  // Paris is ambiguous: France or Texas (§8 AMBIGUOUS; never "Paris, Texas" unasked).
  eq(named("Paris").map((r) => r[3]), ["region:FR.11", "region:US.TX"]);
  // More than five Springfields: the words only (§5).
  eq(named("Springfield").length > 5, true, "too many readings");
  // Not in the data: UNKNOWN, fail open (§8).
  eq([named("Bay Area").length, named("Logan Square").length], [0, 0]);
  // Containment the composition relies on (§9): Alameda and Oakland in California, in the United States.
  eq(named("Oakland").map((r) => [r[3], r[4]]), [["region:US.CA", "country:US"]]);
  eq(p.regions.rows.find((r) => r[0] === "region:US.CA")?.slice(1), ["California", "California", "country:US"]);
});

Deno.test("each curated alias names the place it should", () => {
  const city = (ref: string | undefined) => p.cities.rows.find((r) => r[0] === ref)?.[1];
  eq([city(alias("NYC")), city(alias("SF")), city(alias("LA"))], ["New York City", "San Francisco", "Los Angeles"]);
  eq([alias("DC"), alias("UK"), alias("US"), alias("USA"), alias("TX")],
    ["region:US.DC", "country:GB", "country:US", "country:US", "region:US.TX"]);
  eq(alias("LA") === "region:US.LA", false, "LA is Los Angeles, not Louisiana");
});
