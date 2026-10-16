// The residence relation table (Phase 4B B3; brief §8, §21), class by cue,
// with the protected-line rule and the combining rules. Readings are made
// by hand here; the corpus (evals/semantic) runs the same table over the
// real place data. Run: deno test supabase/functions
import type { Candidate } from "./placeIndex.ts";
import { type CurrentResidence, decidePair, type FacetLike, pairClass, relateResidence } from "./relate.ts";
import type { Cue } from "./residence.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const US = "country:US";
const c = (ref: string, level: Candidate["level"], ...ancestors: string[]): Candidate => ({ ref, level, ancestors });
const P = {
  alameda: c("city:1", "city", "region:US.CA", US),
  oakland: c("city:2", "city", "region:US.CA", US),
  california: c("region:US.CA", "region", US),
  colorado: c("region:US.CO", "region", US),
  texas: c("region:US.TX", "region", US),
  parisFR: c("city:3", "city", "region:FR.11", "country:FR"),
  parisTX: c("city:4", "city", "region:US.TX", US),
  illinois: c("region:US.IL", "region", US),
  chicago: c("city:5", "city", "region:US.IL", US),
  pilsen: c("city:6", "city", "region:CZ.87", "country:CZ"),
  georgiaGE: c("country:GE", "country"),
  georgiaUS: c("region:US.GA", "region", US),
  france: c("country:FR", "country"),
  hollywoodFL: c("city:7", "city", "region:US.FL", US),
  portlandOR: c("city:8", "city", "region:US.OR", US),
  portlandME: c("city:9", "city", "region:US.ME", US),
  denver: c("city:10", "city", "region:US.CO", US),
};
function f(words: string, cands: Candidate[], usual: Candidate | null = cands.length === 1 ? cands[0] : null, pinned: Candidate | null = null): FacetLike {
  return { value_text: words, value_norm: words.toLowerCase(), place_ref: pinned?.ref ?? null, candidates: cands, usual_ref: usual?.ref ?? null };
}
const F = {
  alameda: f("Alameda", [P.alameda]),
  alamedaCA: f("Alameda, CA", [P.alameda], P.alameda, P.alameda),
  oakland: f("Oakland", [P.oakland]),
  california: f("California", [P.california]),
  colorado: f("Colorado", [P.colorado]),
  texas: f("Texas", [P.texas]),
  paris: f("Paris", [P.parisFR, P.parisTX], P.parisFR),
  illinois: f("Illinois", [P.illinois]),
  chicago: f("Chicago", [P.chicago]),
  pilsen: f("Pilsen", [P.pilsen]),
  georgia: f("Georgia", [P.georgiaGE, P.georgiaUS], null),
  france: f("France", [P.france]),
  bayArea: f("the Bay Area", []),
  logan: f("Logan Square", []),
  hollywood: f("Hollywood", [P.hollywoodFL]),
  hollywoodFL: f("Hollywood, FL", [P.hollywoodFL], P.hollywoodFL, P.hollywoodFL),
  portland: f("Portland", [P.portlandOR, P.portlandME], P.portlandOR),
  denver: f("Denver", [P.denver]),
};
const cue = (kind: Cue["kind"], text: string): Cue => ({ kind, start: 0, end: text.length, text });
const MOVED = [cue("change", "moved to")];
const ACTUALLY = [cue("correction", "Actually")];
const NOT_ALAMEDA = [cue("not", "not Alameda")];
const line = (id: string, facet: FacetLike, order = 0, protect = false): CurrentResidence => ({ id, facet, order, protected: protect });

Deno.test("pair classes, from the readings only (§8)", () => {
  eq(pairClass(F.alameda, F.alameda), "SAME");
  eq(pairClass(F.alamedaCA, F.alameda), "SAME", "the same usual reading");
  eq(pairClass(F.alameda, F.california), "E_CONTAINS_N", "California ⊇ Alameda (case A)");
  eq(pairClass(F.california, F.alameda), "N_CONTAINS_E", "case B");
  eq(pairClass(F.oakland, F.alameda), "DISJOINT");
  eq(pairClass(F.colorado, F.alameda), "DISJOINT");
  eq(pairClass(F.texas, F.paris), "AMBIGUOUS", "Paris, Texas is a reading");
  eq(pairClass(F.bayArea, F.alameda), "UNKNOWN");
  eq(pairClass(F.alameda, F.logan), "UNKNOWN");
  eq(pairClass(F.georgia, F.alameda), "AMBIGUOUS", "no usual reading: never DISJOINT");
  eq(pairClass(F.france, F.california), "DISJOINT", "two places abroad from each other, neither a city");
});

Deno.test("the B2 finding: a city abroad is AMBIGUOUS, never DISJOINT", () => {
  eq(pairClass(F.pilsen, F.illinois), "AMBIGUOUS", "'Pilsen' next to 'lives in Illinois'");
  eq(pairClass(F.pilsen, F.chicago), "AMBIGUOUS");
  eq(pairClass(F.chicago, F.pilsen), "AMBIGUOUS");
  eq(pairClass(F.chicago, F.illinois), "E_CONTAINS_N", "at home, the data is enough");
});

Deno.test("N14: a bare locality outside a broader residence is AMBIGUOUS, never DISJOINT", () => {
  // The rule, not one name: any city the user didn't qualify, read outside a region or country Kinship holds.
  eq(pairClass(F.hollywood, F.california), "AMBIGUOUS", "'Hollywood' next to 'lives in California' (Hollywood, FL in the data)");
  eq(pairClass(F.portland, F.colorado), "AMBIGUOUS", "'Portland' next to 'lives in Colorado'");
  eq(pairClass(F.denver, F.california), "AMBIGUOUS", "'Denver' next to 'lives in California'");
  eq(pairClass(F.chicago, F.texas), "AMBIGUOUS");
  // The user's own qualifier says which place it is: ordinary DISJOINT.
  eq(pairClass(F.hollywoodFL, F.california), "DISJOINT", "'Hollywood, FL' is the user's reading");
  // Unchanged: a region or city replacing a city, a region replacing a region, a city inside the region.
  eq(pairClass(F.colorado, F.alameda), "DISJOINT", "Alameda → 'lives in Colorado' replaces Alameda");
  eq(pairClass(F.oakland, F.alameda), "DISJOINT", "city for city");
  eq(pairClass(F.colorado, F.california), "DISJOINT", "region for region");
  eq(pairClass(F.denver, F.colorado), "E_CONTAINS_N");
  eq(pairClass(F.pilsen, F.illinois), "AMBIGUOUS", "Pilsen stays as it was");
  // So: no cue, two lines (California isn't closed); a change, one question; "not California", corrected.
  const ca = line("ca", F.california);
  eq(relateResidence({ facet: F.hollywood, cues: [] }, [ca], null), { outcome: "NEW" });
  const asked = relateResidence({ facet: F.hollywood, cues: MOVED }, [ca], null);
  eq(asked.outcome === "CONFLICT" ? [asked.asks.id, asked.closes, asked.stay] : asked, ["ca", ["ca"], "facet"]);
  const notCA = [cue("not", "not California")];
  eq(relateResidence({ facet: F.hollywood, cues: notCA }, [ca], null), { outcome: "SUPERSEDES", closes: ["ca"], transition: "corrected", cue: notCA[0] });
  eq(relateResidence({ facet: F.hollywoodFL, cues: [] }, [ca], null), { outcome: "SUPERSEDES", closes: ["ca"], transition: null, cue: null });
  eq(relateResidence({ facet: F.colorado, cues: [] }, [line("al", F.alameda)], null), { outcome: "SUPERSEDES", closes: ["al"], transition: null, cue: null });
});

Deno.test("the decision table, class by cue (§8)", () => {
  const e = (facet: FacetLike, protect = false) => line("e", facet, 0, protect);
  const act = (cls: Parameters<typeof decidePair>[0], cues: Cue[], facet: FacetLike, protect = false) => {
    const d = decidePair(cls, cues, e(facet, protect));
    return d.act === "close" || d.act === "model" ? `${d.act}:${d.transition}` : d.act === "keep" ? `keep:${d.refines}` : d.act === "ask" ? `ask:${d.stay}` : d.act;
  };
  eq([act("SAME", [], F.alameda), act("SAME", MOVED, F.alameda), act("SAME", ACTUALLY, F.alameda)], ["same", "same", "same"]);
  eq([act("E_CONTAINS_N", [], F.california), act("E_CONTAINS_N", MOVED, F.california), act("E_CONTAINS_N", ACTUALLY, F.california)],
    ["keep:true", "keep:false", "keep:false"]);
  eq([act("N_CONTAINS_E", [], F.alameda), act("N_CONTAINS_E", MOVED, F.alameda), act("N_CONTAINS_E", ACTUALLY, F.alameda)],
    ["keep:true", "ask:facet", "close:corrected"], "case B, case E");
  eq([act("DISJOINT", [], F.alameda), act("DISJOINT", MOVED, F.alameda), act("DISJOINT", NOT_ALAMEDA, F.alameda)],
    ["close:null", "close:changed", "close:corrected"], "CC-20 and cases C, D");
  eq([act("AMBIGUOUS", [], F.paris), act("AMBIGUOUS", MOVED, F.paris), act("AMBIGUOUS", ACTUALLY, F.paris),
    act("AMBIGUOUS", [cue("not", "not Paris")], F.paris)], ["keep:false", "ask:facet", "keep:false", "close:corrected"]);
  eq([act("UNKNOWN", [], F.logan), act("UNKNOWN", MOVED, F.logan), act("UNKNOWN", ACTUALLY, F.logan)],
    ["keep:false", "model:changed", "model:corrected"]);
});

Deno.test("a line the user edited (§21): asks with no cue, closes on the user's own cue", () => {
  const act = (cls: Parameters<typeof decidePair>[0], cues: Cue[], facet: FacetLike) => {
    const d = decidePair(cls, cues, line("e", facet, 0, true));
    return d.act === "close" || d.act === "model" ? `${d.act}:${d.transition}` : d.act === "ask" ? `ask:${d.stay}` : d.act;
  };
  eq(act("DISJOINT", [], F.alameda), "ask:words", "'lives in Colorado': still asks; Still there keeps only the new words");
  eq(act("DISJOINT", MOVED, F.alameda), "close:changed", "'moved to Colorado' closes it, history-eligible");
  eq(act("DISJOINT", NOT_ALAMEDA, F.alameda), "close:corrected", "'…, not Alameda' corrects it, never history");
  eq(act("UNKNOWN", [], F.logan), "keep", "the model's target alone: never");
  eq(relateResidence({ facet: F.alameda, cues: [] }, [line("e", F.alameda, 0, true)], null), { outcome: "NEW" },
    "the same place again: a new line, never merged into the user's");
});

Deno.test("'not <words>' corrects only the line those words name", () => {
  const cues = [cue("not", "not Berkeley")];
  eq(decidePair("DISJOINT", cues, line("e", F.alameda)).act, "close", "no other cue: a plain replacement");
  eq((decidePair("DISJOINT", cues, line("e", F.alameda)) as { transition: string | null }).transition, null);
  eq(decidePair("DISJOINT", cues, line("e", F.alameda, 0, true)).act, "ask", "and an edited line still asks");
});

Deno.test("combining: same wins, one question about the most specific line, closures most specific first", () => {
  const cal = line("cal", F.california, 1);
  const ala = line("ala", F.alameda, 0);
  eq(relateResidence({ facet: F.alameda, cues: [] }, [cal], null), { outcome: "REFINES" }, "case A");
  eq(relateResidence({ facet: F.colorado, cues: MOVED }, [cal, ala], null),
    { outcome: "SUPERSEDES", closes: ["ala", "cal"], transition: "changed", cue: MOVED[0] }, "California → Alameda → moved to Colorado");
  eq(relateResidence({ facet: F.oakland, cues: MOVED }, [cal, ala], null),
    { outcome: "SUPERSEDES", closes: ["ala"], transition: "changed", cue: MOVED[0] }, "moved within California: California stays");
  const asked = relateResidence({ facet: F.california, cues: MOVED }, [ala], null);
  eq(asked.outcome === "CONFLICT" ? [asked.asks.id, asked.closes, asked.stay] : asked, ["ala", ["ala"], "facet"], "case E");
  eq(relateResidence({ facet: F.california, cues: MOVED }, [cal, ala], null), { outcome: "SAME", target: "cal" }, "same wins over a question");
  eq(relateResidence({ facet: F.bayArea, cues: MOVED }, [line("logan", F.logan)], "logan").outcome, "SUPERSEDES",
    "an unknown place: the model's single target decides");
  eq(relateResidence({ facet: F.bayArea, cues: MOVED }, [line("logan", F.logan)], null), { outcome: "NEW" }, "and without it, fail open");
  eq(relateResidence({ facet: F.bayArea, cues: [] }, [line("logan", F.logan)], "logan"), { outcome: "NEW" }, "never without a cue");
  eq(relateResidence({ facet: F.colorado, cues: [] }, [], null), { outcome: "NEW" });
  // Ties among equally specific lines go to the newest.
  const old = line("old", F.oakland, 3);
  const recent = line("recent", F.alameda, 1);
  const both = relateResidence({ facet: F.colorado, cues: MOVED }, [old, recent], null);
  eq(both.outcome === "SUPERSEDES" ? both.closes : both, ["recent", "old"]);
});
