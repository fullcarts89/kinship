// Re-derivation after an edit (Phase 4B B3; brief §5, N13): the same reading
// a new note gets, from the user's own words for the line. Run: deno test supabase/functions
import { placeIndex } from "./places/dataset.ts";
import { type LineToRead, rederive, wordsOf } from "./rederive.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const PLACES = placeIndex();
const line = (over: Partial<LineToRead> = {}): LineToRead => ({
  id: "item-1", version: 3, kind: "fact", subject_type: "person", certainty: "stated", sensitivity: "none", with_person_ids: [],
  statement: "Susan lives in Alameda", user_state: "edited", ...over,
});

Deno.test("an edited line is read from what the user edited it to, never from the note it came from", () => {
  const w = rederive(line(), ["Susan lives in California"], PLACES)!;
  eq([w.memory_item_id, w.version, w.facets.length], ["item-1", 3, 1]);
  eq([w.facets[0].value_text, w.facets[0].usual_ref, w.facets[0].decided_by, w.facets[0].rule_version], ["Alameda", "city:5322737", "rule", "residence/v1"]);
  eq(wordsOf(line({ user_state: "user_authored" }), ["x"]), ["Susan lives in Alameda"]);
});

Deno.test("a line the user didn't edit (moved to someone else) is read from its notes' words", () => {
  const w = rederive(line({ user_state: "unreviewed", statement: "Lives in Alameda" }), ["", "Michelle lives in Alameda, CA"], PLACES)!;
  eq([w.facets[0].value_text, w.facets[0].place_ref], ["Alameda, CA", "city:5322737"]);
});

Deno.test("no reading when the words no longer say where someone lives, or the line can't carry one", () => {
  eq(rederive(line({ statement: "Susan loves Alameda" }), [], PLACES), null);
  eq(rederive(line({ statement: "Susan is staying in Alameda this week" }), [], PLACES), null, "a stay");
  eq(rederive(line({ statement: "Susan used to live in Alameda" }), [], PLACES), null);
  eq(rederive(line({ certainty: "reported" }), [], PLACES), null, "hedged");
  eq(rederive(line({ sensitivity: "health" }), [], PLACES), null);
  eq(rederive(line({ with_person_ids: ["p2"] }), [], PLACES), null, "shared");
  eq(rederive(line({ kind: "plan" }), [], PLACES), null);
});
