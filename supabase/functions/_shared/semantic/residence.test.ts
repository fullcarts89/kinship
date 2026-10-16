// Residence, read from the user's own words (Phase 4B B3; brief §5, §7),
// with the committed place data. Run: deno test supabase/functions
import { placeIndex } from "./places/dataset.ts";
import { foldPlace } from "./placeIndex.ts";
import { MAX_CANDIDATES, type Residence, residenceEligible, residenceOf, RULE_VERSION } from "./residence.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const PLACES = placeIndex();
const whole = (note: string) => [{ start: 0, end: Array.from(note).length }];
const read = (note: string) => residenceOf(note, whole(note), PLACES);
const words = (note: string) => read(note)?.facet.value_text ?? null;
/** The note's own characters at a cue (what the database re-reads). */
const at = (note: string, r: Residence | null, kind: string) => {
  const c = r?.cues.find((x) => x.kind === kind);
  return c ? Array.from(note).slice(c.start, c.end).join("") : null;
};

Deno.test("the wording that says where someone lives now", () => {
  for (const [note, place] of [
    ["Susan lives in Alameda.", "Alameda"],
    ["Susan is living in Alameda with her wife.", "Alameda"],
    ["Susan is based in Denver for work.", "Denver"],
    ["Susan resides in Boston", "Boston"],
    ["Susan moved to Colorado!", "Colorado"],
    ["Susan has moved to New York City.", "New York City"],
    ["Susan relocated to Paris, Texas.", "Paris, Texas"],
    ["Susan now lives in Seattle", "Seattle"],
    ["Susan lives in Oakland now.", "Oakland"],
    ["Susan's sister lives in Denver.", "Denver"],
    ["Susan lives in St. Louis and loves it.", "St. Louis"],
    ["Susan lives in the Bay Area.", "the Bay Area"],
    ["Susan lives in Logan Square, near the park.", "Logan Square"],
    ["Susan moved from Alameda to Denver.", "Denver"],
  ] as const) eq(words(note), place, note);
});

Deno.test("never a residence (§5, case F): stays, the past, plans, negations, addresses", () => {
  for (const note of [
    "Susan is staying in Denver this week.", "Susan is visiting Alameda.", "Susan lives in Denver until June.",
    "Susan is living in Paris for the summer.", "Susan lives in Denver this weekend.", "Susan is in town in Boston.",
    "Susan grew up in Austin.", "Susan used to live in Boston.", "Susan lived in Boston.", "Susan is from Ohio.",
    "Susan was born in Lyon.", "Susan is moving to Oakland in August.", "Susan wants to move to Oakland.",
    "Susan might move to Oakland.", "Susan doesn't live in Oakland.", "Susan no longer lives in Oakland.",
    "Susan never lived in Oakland.", "Susan lives at 12 Elm Street.", "Susan lives in apartment 4B.", "Susan lives in a van.",
    "Susan lives in her parents' house.", "Susan lives in fear of spiders.",
  ]) eq(read(note), null, note);
});

Deno.test("the value is the note's own characters, cut where the place ends", () => {
  eq(words("Susan lives in Alameda, CA."), "Alameda, CA", "a trailing region belongs to it");
  eq(words("Susan lives in Alameda, and she loves it."), "Alameda", "but not a clause");
  eq(words("Susan has moved back to Washington, D.C."), "Washington, D.C.");
  eq(words("Susan lives in Bosnia and Herzegovina."), "Bosnia and Herzegovina", "a longer name the data knows wins");
  eq(words("susan lives in alameda"), "alameda", "lower case is read when the data knows the place");
  eq(read("Susan lives in Alameda with Jo.")?.value, { start: 15, end: 22 });
  // Code points, as Postgres counts them: an emoji before the place is one.
  const note = "🏡 Susan lives in Alameda.";
  const r = residenceOf(note, whole(note), PLACES);
  eq(Array.from(note).slice(r!.value.start, r!.value.end).join(""), "Alameda");
});

Deno.test("only the item's own spans are read", () => {
  const note = "Susan lives in Alameda. Ben moved to Denver.";
  const r = residenceOf(note, [{ start: 24, end: 43 }], PLACES);
  eq(r?.facet.value_text, "Denver");
  eq(residenceOf(note, [{ start: 0, end: 3 }], PLACES), null, "a span with no residence in it");
});

Deno.test("readings: by population, narrowed by a qualifier, too many is the words only (§5, §7)", () => {
  const ala = read("Susan lives in Alameda.")!.facet;
  eq([ala.candidates.length, ala.usual_ref, ala.place_ref], [1, "city:5322737", null], "one reading is the usual one, never pinned");
  const ca = read("Susan lives in Alameda, CA.")!.facet;
  eq([ca.place_ref, ca.decided_by], ["city:5322737", "rule"], "a qualifier in the same note pins it");
  const paris = read("Susan lives in Paris.")!.facet;
  eq([paris.candidates.map((c) => c.ref), paris.usual_ref], [["city:2988507", "city:4717560"], "city:2988507"], "Paris, France usually");
  eq(read("Susan relocated to Paris, Texas.")!.facet.place_ref, "city:4717560");
  const col = read("Susan moved to Colorado.")!.facet;
  eq([col.usual_ref, col.candidates.length], ["region:US.CO", 2], "the state, five times the town in Brazil");
  const spring = read("Susan lives in Springfield.")!.facet;
  eq([spring.candidates, spring.usual_ref], [[], null], `more than ${MAX_CANDIDATES} readings: the words only`);
  eq(read("Susan lives in Springfield, IL.")!.facet.place_ref, "city:4250542", "unless the note narrows them");
  const geo = read("Susan lives in Georgia.")!.facet;
  eq([geo.candidates.length, geo.usual_ref], [2, null], "no reading clearly the usual one");
  const bay = read("Susan lives in the Bay Area.")!.facet;
  eq([bay.candidates, bay.value_norm], [[], "bay area"], "a name the data doesn't know keeps its words");
  eq([ala.rule_version, ala.dataset_version, ala.slot], [RULE_VERSION, "places-2026.10", "residence"]);
  eq(read("Susan lives in Pilsen.")!.facet.usual_ref, "city:3068160", "the B2 finding: Pilsen reads as Plzeň");
});

Deno.test("an alias counts only as written, in capitals", () => {
  eq(read("Susan lives in NYC.")!.facet.usual_ref, "city:5128581");
  eq(read("Susan lives in LA.")!.facet.usual_ref, "city:5368361", "LA is Los Angeles");
  eq(read("Susan lives in OR.")!.facet.usual_ref, "region:US.OR");
  eq(read("Susan lives in or near Boston."), null, "never the word 'or'");
});

Deno.test("cues: a change, a correction, or 'not <words>', in the note's own characters", () => {
  const cases: [string, string, string][] = [
    ["Susan moved to Colorado.", "change", "moved to"],
    ["Susan has moved back to Alameda.", "change", "has moved back to"],
    ["Susan relocated to Denver.", "change", "relocated to"],
    ["Susan now lives in Denver.", "change", "now lives in"],
    ["Susan lives in Oakland now.", "change", "lives in Oakland now"],
    ["Susan moved from Alameda to Denver.", "change", "moved from Alameda to"],
    ["Actually Susan lives in Oakland.", "correction", "Actually"],
    ["Susan lives in Oakland, not Alameda.", "not", "not Alameda"],
    ["Susan lives in Oakland, not in Alameda.", "not", "not in Alameda"],
    ["Correction: Susan lives in Oakland.", "correction", "Correction"],
  ];
  for (const [note, kind, cue] of cases) eq(at(note, read(note), kind), cue, note);
  eq(read("Susan lives in Alameda.")!.cues, [], "a plain statement has none");
  const both = read("Actually Susan lives in Oakland, not Alameda.")!;
  eq(both.cues.map((c) => c.kind), ["not", "correction"]);
});

Deno.test("eligibility: as public.residence_facet_eligible", () => {
  const fact = { kind: "fact", subject_type: "person", certainty: "stated", sensitivity: "none", with_person_ids: [] };
  eq(residenceEligible(fact), true);
  eq(residenceEligible({ ...fact, subject_type: "related" }), true);
  for (const bad of [{ kind: "plan" }, { subject_type: "user" }, { subject_type: "shared" }, { certainty: "reported" },
    { certainty: "tentative" }, { sensitivity: "health" }, { with_person_ids: ["mike"] }]) {
    eq(residenceEligible({ ...fact, ...bad }), false, JSON.stringify(bad));
  }
});

Deno.test("folding, as value_norm keeps it", () => {
  eq(foldPlace("Zürich, ZH"), "zurich zh");
  eq(foldPlace("St. Louis"), "st louis");
  eq(foldPlace("  São   Paulo "), "sao paulo");
});
