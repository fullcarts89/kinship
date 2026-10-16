// The place data build (Phase 4B B2, brief §6), on hand-made fixture dumps in
// the GeoNames format (scripts/semantic/places/fixtures; invented ids and
// round numbers, not GeoNames data). Free and model-free.
//   deno test --allow-read --config scripts/deno.json scripts/semantic
import { checkPlaces, type Places } from "../../supabase/functions/_shared/semantic/places/format.ts";
import { type AliasInput, buildPlaces, type Files, main, renderPlaces, resolveAliases } from "./build-places.ts";

const HERE = new URL("./", import.meta.url).pathname;
const FIX = `${HERE}places/fixtures`;

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function ok(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}
async function throws(f: () => unknown, pattern: RegExp, msg: string): Promise<void> {
  try {
    await f();
  } catch (e) {
    if (pattern.test(String((e as Error).message))) return;
    throw new Error(`${msg}: threw ${String((e as Error).message)}`);
  }
  throw new Error(`${msg}: did not throw`);
}

const read = (p: string) => Deno.readTextFile(p);

/** The CLI over an in-memory copy of the fixture folder. */
async function memory(overrides: Record<string, string> = {}) {
  const store = new Map<string, Uint8Array>();
  for (const f of ["countryInfo.txt", "admin1CodesASCII.txt", "cities15000.txt", "sources.json", "aliases.json", "expected.json"]) {
    store.set(`${FIX}/${f}`, await Deno.readFile(`${FIX}/${f}`));
  }
  for (const [f, text] of Object.entries(overrides)) store.set(`${FIX}/${f}`, new TextEncoder().encode(text));
  const logs: string[] = [];
  const files: Files = {
    read: (p) => {
      const b = store.get(p);
      return b ? Promise.resolve(b) : Promise.reject(new Error(`no such file ${p}`));
    },
    write: (p, t) => {
      store.set(p, new TextEncoder().encode(t));
      return Promise.resolve();
    },
    log: (l) => logs.push(l),
  };
  const text = (f: string) => new TextDecoder().decode(store.get(`${FIX}/${f}`));
  return { files, logs, text };
}
const ARGS = ["--dumps", FIX, "--pins", `${FIX}/sources.json`, "--aliases", `${FIX}/aliases.json`, "--out", `${FIX}/out.json`];

async function fixtureInput(shuffle = false) {
  const pins = JSON.parse(await read(`${FIX}/sources.json`));
  const order = (t: string) => {
    if (!shuffle) return t;
    const ls = t.split("\n").filter((l) => l !== "");
    return [...ls.filter((l) => l.startsWith("#")), ...ls.filter((l) => !l.startsWith("#")).reverse()].join("\n") + "\n";
  };
  return {
    version: pins.version,
    sources: pins.sources,
    countryInfo: order(await read(`${FIX}/countryInfo.txt`)),
    admin1: order(await read(`${FIX}/admin1CodesASCII.txt`)),
    cities: order(await read(`${FIX}/cities15000.txt`)),
    aliases: (JSON.parse(await read(`${FIX}/aliases.json`)) as { aliases: AliasInput[] }).aliases,
  };
}

Deno.test("the pinned fixture dumps build exactly the committed output", async () => {
  const m = await memory();
  eq(await main(ARGS, m.files), 0, "exit code");
  eq(m.text("out.json"), await read(`${FIX}/expected.json`), "golden output");
  ok(/4 countries, 8 regions, 10 cities, 6 aliases/.test(m.logs.join("\n")), m.logs.join("\n"));
});

Deno.test("the same dumps give the same bytes, whatever order their rows come in", async () => {
  const a = renderPlaces(buildPlaces(await fixtureInput()).places);
  const b = renderPlaces(buildPlaces(await fixtureInput(true)).places);
  eq(a, b);
  eq(a, await read(`${FIX}/expected.json`));
});

Deno.test("only name, ASCII name, region, country and population leave the dumps", async () => {
  const out = await read(`${FIX}/expected.json`);
  const rows = out.slice(out.indexOf('"countries"'));
  // Alternate names, coordinates, feature codes, time zones, dates (the columns below rule out the rest).
  for (const gone of ["Alamida", "Paree", "Parigi", "Big Apple", "Washington DC", "37.5", "-122.5", "PPLC", "America/", "Europe/", "2026-01-01"]) {
    ok(!rows.includes(gone), `${gone} must not be in the place data`);
  }
  const p = JSON.parse(out) as Places;
  eq(p.cities.columns, ["ref", "name", "ascii", "region", "country", "population"]);
  eq(p.regions.columns, ["ref", "name", "ascii", "country"]);
  eq(p.countries.columns, ["ref", "name", "population"]);
});

Deno.test("neighbourhoods and places that are gone are left out, and nothing hangs off an unknown country", async () => {
  const { places, report } = buildPlaces(await fixtureInput());
  const names = places.cities.rows.map((r) => r[1]);
  ok(!names.includes("Logan Square"), "a section of a city (PPLX) is not a place in v1");
  ok(!names.includes("Old Town"), "a historical place is not a place people live in");
  ok(!names.includes("Atlantis"), "a city of a country not in the data is skipped");
  ok(!places.regions.rows.some((r) => r[0] === "region:ZZ.01"), "so is a region of one");
  eq(report.skipped, { regions_unknown_country: 1, cities_excluded_feature: 2, cities_unknown_country: 1 });
  eq(places.cities.rows.find((r) => r[1] === "Montréal"), ["city:9000008", "Montréal", "Montreal", null, "country:CA", 1700000],
    "a city whose region isn't in the data keeps its country");
  eq(places.cities.rows.find((r) => r[0] === "city:9000012")?.[2], "Saint-Etienne-du-Test", "an ASCII name when the dump has none");
  // Two Alamedas and two Parises: the data keeps both readings (brief §7).
  eq(places.cities.rows.filter((r) => r[1] === "Alameda").map((r) => r[3]), ["region:US.CA", "region:US.NM"]);
  eq(places.cities.rows.filter((r) => r[1] === "Paris").map((r) => r[4]), ["country:FR", "country:US"]);
});

Deno.test("a dump that doesn't match its pin stops the build", async () => {
  const cities = await read(`${FIX}/cities15000.txt`);
  const m = await memory({ "cities15000.txt": cities.replace("78000", "78001") });
  await throws(() => main(ARGS, m.files), /cities15000\.txt doesn't match its pin/, "a changed dump");
  ok(!m.logs.some((l) => l.includes("→")), "and nothing is written");
});

Deno.test("--pin records a new version's dumps, and the next build checks against them", async () => {
  const cities = await read(`${FIX}/cities15000.txt`);
  const m = await memory({ "cities15000.txt": cities.replace("78000", "78001") });
  eq(await main([...ARGS, "--pin", "2026-10-15"], m.files), 0);
  const pins = JSON.parse(m.text("sources.json"));
  eq(pins.sources.map((s: { retrieved: string }) => s.retrieved), ["2026-10-15", "2026-10-15", "2026-10-15"]);
  ok(pins.sources[2].sha256 !== JSON.parse(await read(`${FIX}/sources.json`)).sources[2].sha256, "the new checksum is recorded");
  eq(await main(ARGS, m.files), 0, "the pinned dumps build again");
  ok(m.text("out.json").includes('"Alameda","Alameda","region:US.CA","country:US",78001]'), "with the new data");
});

Deno.test("--check says whether the committed file is what the pinned dumps build", async () => {
  const out = [...ARGS.slice(0, -1), `${FIX}/expected.json`];
  const m = await memory();
  eq(await main([...out, "--check"], m.files), 0);
  const stale = await memory({ "expected.json": (await read(`${FIX}/expected.json`)).replace("78000", "79000") });
  eq(await main([...out, "--check"], stale.files), 1);
});

Deno.test("every alias names exactly one place, or the build stops", async () => {
  const { places } = buildPlaces(await fixtureInput());
  const countries = new Set(places.countries.rows.map((r) => r[0]));
  const regions = new Set(places.regions.rows.map((r) => r[0]));
  const run = (a: AliasInput[]) => () => resolveAliases(a, countries, regions, places.cities.rows);
  eq(run([{ alias: "NYC", country: "US", region: "NY", city: "New York City" }])(), [["NYC", "city:9000006"]]);
  eq(run([{ alias: "CA", country: "US", region: "CA" }])(), [["CA", "region:US.CA"]], "CA is California");
  await throws(run([{ alias: "Paris", country: "US", region: "ZZ", city: "Paris" }]), /unknown region/, "an unknown region");
  await throws(run([{ alias: "ZZ", country: "ZZ" }]), /unknown country/, "an unknown country");
  await throws(run([{ alias: "Bay Area", country: "US", region: "CA", city: "Bay Area" }]), /exactly one city, found 0/,
    "a name that isn't a place in the data");
  await throws(run([{ alias: "NYC", country: "US", city: "New York City" }]), /without its region/, "a city needs its region");
  await throws(run([{ alias: "TX", country: "US", region: "TX" }, { alias: "tx", country: "US", region: "TX" }]), /listed twice/,
    "an alias is listed once, whatever its case");
  const twins = [...places.cities.rows, ["city:9000099", "Oakland", "Oakland", "region:US.CA", "country:US", 1] as typeof places.cities.rows[0]];
  await throws(() => resolveAliases([{ alias: "Oak", country: "US", region: "CA", city: "Oakland" }], countries, regions, twins),
    /exactly one city, found 2/, "an alias never guesses between two places");
});

Deno.test("the curated alias list is well formed", async () => {
  const list = (JSON.parse(await read(`${HERE}places/aliases.json`)) as { aliases: AliasInput[] }).aliases;
  const lower = list.map((a) => a.alias.toLowerCase());
  eq(new Set(lower).size, lower.length, "each alias once");
  for (const a of list) {
    ok(/^[A-Z]{2}$/.test(a.country), `${a.alias}: a country code`);
    if (a.region && !a.city && /^[A-Z]{2}$/.test(a.alias) && a.country === "US") eq(a.region, a.alias, `${a.alias}: a state's own code`);
  }
  eq(list.find((a) => a.alias === "CA"), { alias: "CA", country: "US", region: "CA", note: "California, never Canada" });
  eq(list.find((a) => a.alias === "LA")?.city, "Los Angeles", "LA is Los Angeles (brief §6)");
  for (const unknown of ["bay area", "logan square", "pilsen"]) ok(!lower.includes(unknown), `${unknown} stays outside the data`);
});

Deno.test("an unsound dataset is refused", async () => {
  const good = JSON.parse(await read(`${FIX}/expected.json`)) as Places;
  eq(checkPlaces(good), []);
  const bad = (f: (p: Places) => void) => {
    const p = structuredClone(good);
    f(p);
    return checkPlaces(p);
  };
  ok(bad((p) => (p.attribution = "x" as never)).length > 0, "attribution is required");
  ok(bad((p) => (p.sources = [])).length > 0, "pinned sources are required");
  ok(bad((p) => (p.cities.rows[0][3] = "region:US.ZZ")).some((e) => e.includes("unknown region")), "a city's region exists");
  ok(bad((p) => p.cities.rows.reverse()).some((e) => e.includes("out of order")), "rows are in the one order");
  ok(bad((p) => (p.aliases.rows[0][1] = "city:1")).some((e) => e.includes("unknown place")), "an alias names a place in the data");
  ok(bad((p) => p.cities.rows.push([...p.cities.rows[9]])).some((e) => e.includes("duplicate") || e.includes("out of order")),
    "a place appears once");
});
