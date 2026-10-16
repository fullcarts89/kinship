// The composer (Phase 4B B5; brief §9, §11): what a page says for a person's
// current residence lines, from their readings alone. Readings are made by
// hand here, as relate.test.ts makes them; the corpus (evals/semantic) runs
// the same composer over lines the real pipeline wrote. Run: deno test supabase/functions
import type { Candidate } from "./placeIndex.ts";
import { COMPOSE_RULE_VERSION, type ComposeMember, composeResidence, currentResidence, historyEligible, residenceGroupKey } from "./compose.ts";

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
  us: c(US, "country"),
  alamedaCounty: c("city:5", "city", "region:US.CA", US),
};
let n = 0;
function m(words: string, cands: Candidate[], opts: { usual?: Candidate | null; pinned?: Candidate | null; told?: string; id?: string; dataset?: string | null } = {}): ComposeMember {
  const usual = opts.usual === undefined ? (cands.length === 1 ? cands[0] : null) : opts.usual;
  return {
    id: opts.id ?? `item-${++n}`,
    facet: {
      value_text: words, value_norm: words.toLowerCase(), place_ref: opts.pinned?.ref ?? null, candidates: cands, usual_ref: usual?.ref ?? null,
      dataset_version: opts.dataset === undefined ? "places-2026.10" : opts.dataset,
    },
    told: opts.told ?? `2026-10-${String(10 + n).padStart(2, "0")}T12:00:00Z`,
  };
}
const texts = (r: ReturnType<typeof composeResidence>) => r.lines.map((l) => l.text);

Deno.test("California then Alameda: one line, the most specific first, both members", () => {
  const california = m("California", [P.california], { told: "2026-09-03T12:00:00Z" });
  const alameda = m("Alameda", [P.alameda, P.alamedaCounty], { usual: P.alameda, told: "2026-10-02T12:00:00Z" });
  const r = composeResidence([california, alameda]);
  eq(texts(r), ["Lives in Alameda, California"]);
  eq(r.lines[0].memberIds, [alameda.id, california.id], "members");
  eq(r.lines[0].words, ["Alameda", "California"]);
  eq([r.lines[0].rule_version, r.lines[0].dataset_versions, r.degraded], [COMPOSE_RULE_VERSION, ["places-2026.10"], false]);
});

Deno.test("Alameda then California: the same line, whichever was told first", () => {
  const alameda = m("Alameda", [P.alameda], { told: "2026-09-03T12:00:00Z" });
  const california = m("California", [P.california], { told: "2026-10-02T12:00:00Z" });
  eq(texts(composeResidence([alameda, california])), ["Lives in Alameda, California"]);
  eq(texts(composeResidence([california, alameda])), ["Lives in Alameda, California"]);
});

Deno.test("one line renders alone, in its own words: 'Alameda, CA' stays 'Alameda, CA'", () => {
  const r = composeResidence([m("Alameda, CA", [P.alameda], { pinned: P.alameda })]);
  eq(texts(r), ["Lives in Alameda, CA"]);
  eq(r.lines[0].memberIds.length, 1);
  eq(composeResidence([]).lines, []);
});

Deno.test("the same reading from several notes is said once, and every note stays a member", () => {
  const a1 = m("Alameda", [P.alameda], { told: "2026-10-01T12:00:00Z" });
  const a2 = m("alameda", [P.alameda], { told: "2026-10-05T12:00:00Z" });
  const r = composeResidence([a1, a2]);
  eq(texts(r), ["Lives in alameda"], "the newest line's words");
  eq(r.lines[0].memberIds, [a2.id, a1.id]);
  // With a broader line too: said once, three members.
  const ca = m("California", [P.california], { told: "2026-10-03T12:00:00Z" });
  const r3 = composeResidence([a1, ca, a2]);
  eq(texts(r3), ["Lives in alameda, California"]);
  eq(r3.lines[0].memberIds, [a2.id, a1.id, ca.id]);
});

Deno.test("an unknown place never composes: each line its own, not degraded", () => {
  const bay = m("the Bay Area", [], { usual: null });
  const ca = m("California", [P.california]);
  const r = composeResidence([ca, bay]);
  eq(texts(r).sort(), ["Lives in California", "Lives in the Bay Area"]);
  eq(r.degraded, false);
});

Deno.test("an ambiguous pair never composes (Paris + Texas is never 'Paris, Texas'), not degraded", () => {
  const paris = m("Paris", [P.parisFR, P.parisTX], { usual: P.parisFR });
  const texas = m("Texas", [P.texas]);
  const r = composeResidence([paris, texas]);
  eq(texts(r).sort(), ["Lives in Paris", "Lives in Texas"]);
  eq(r.degraded, false);
});

Deno.test("disjoint current lines fail open, apart, and are reported as degraded (never merged)", () => {
  const alameda = m("Alameda", [P.alameda]);
  const colorado = m("Colorado", [P.colorado]);
  const r = composeResidence([alameda, colorado]);
  eq(texts(r).sort(), ["Lives in Alameda", "Lives in Colorado"]);
  eq(r.degraded, true);
  // Three lines, one bad pair: nothing composes, not even the good pair.
  const ca = m("California", [P.california]);
  const r3 = composeResidence([alameda, m("Oakland", [P.oakland]), ca]);
  eq(texts(r3).sort(), ["Lives in Alameda", "Lives in California", "Lives in Oakland"]);
  eq(r3.degraded, true);
});

Deno.test("a three-level chain composes; a reading the data pinned by the user's qualifier keeps its words", () => {
  const r = composeResidence([m("United States", [P.us]), m("California", [P.california]), m("Alameda", [P.alameda])]);
  eq(texts(r), ["Lives in Alameda, California, United States"]);
  // "Alameda, CA" beside "California": both the user's words, as said (brief §9: never "California" for "CA").
  const q = composeResidence([m("Alameda, CA", [P.alameda], { pinned: P.alameda }), m("California", [P.california])]);
  eq(texts(q), ["Lives in Alameda, CA, California"]);
});

Deno.test("no word is ever added: every rendered word is a member's own value_text", () => {
  const members = [m("Alameda", [P.alameda]), m("California", [P.california]), m("Oakland", [P.oakland])];
  for (const line of composeResidence(members).lines) {
    const own = members.filter((x) => line.memberIds.includes(x.id)).map((x) => x.facet.value_text);
    for (const w of line.words) if (!own.includes(w)) throw new Error(`invented ${w}`);
    eq(line.text, `Lives in ${line.words.join(", ")}`);
  }
});

Deno.test("history: the same words under 'Previously lived in'; only a change makes a closed line history", () => {
  const r = composeResidence([m("California", [P.california]), m("Alameda", [P.alameda])], { previous: true });
  eq(texts(r), ["Previously lived in Alameda, California"]);
  eq(historyEligible([{ transition: "changed" }]), true);
  eq(historyEligible([{ transition: "completed" }]), true);
  eq(historyEligible([{ transition: "cancelled" }]), true);
  eq(historyEligible([{ transition: "corrected" }]), false, "a correction is never history");
  eq(historyEligible([{ transition: "progress" }]), false);
  eq(historyEligible([{ transition: null }]), false, "a plain replacement (no cue) is never history");
  eq(historyEligible([{}]), false, "a supersession from before 4B is never history");
  eq(historyEligible([]), false, "nothing live replaces it");
  eq(historyEligible([{ transition: "changed" }, { transition: "corrected" }]), false, "one closer says it was never true");
});

Deno.test("only a current, stated, unshared, non-sensitive fact with a live reading is read; groups never cross people or subjects", () => {
  const base = { status: "active", kind: "fact", subject_type: "person", certainty: "stated", sensitivity: "none", with_person_ids: [] as string[] };
  const facet = { slot: "residence", deleted_at: null };
  eq(currentResidence(base, facet), true);
  eq(currentResidence({ ...base, status: "superseded" }, facet), false, "closed");
  eq(currentResidence({ ...base, deleted_at: "2026-10-16" }, facet), false, "removed");
  eq(currentResidence({ ...base, certainty: "tentative" }, facet), false, "a hedge");
  eq(currentResidence({ ...base, sensitivity: "health" }, facet), false, "sensitive");
  eq(currentResidence({ ...base, with_person_ids: ["other"] }, facet), false, "shared");
  eq(currentResidence(base, null), false, "no reading");
  eq(currentResidence(base, { ...facet, deleted_at: "2026-10-16" }), false, "a tombstoned reading");
  eq(residenceGroupKey({ person_id: "p1", subject_type: "person" }) === residenceGroupKey({ person_id: "p2", subject_type: "person" }), false);
  eq(residenceGroupKey({ person_id: "p1", subject_type: "person" }) === residenceGroupKey({ person_id: "p1", subject_type: "related", subject_related_id: "r1" }), false);
  eq(residenceGroupKey({ person_id: "p1", subject_type: "related", subject_related_id: "r1" }), residenceGroupKey({ person_id: "p1", subject_type: "related", subject_related_id: "r1" }));
});

Deno.test("deterministic: the same members in any order give the same line", () => {
  const members = [m("California", [P.california], { told: "2026-09-01T12:00:00Z" }), m("Alameda", [P.alameda], { told: "2026-10-01T12:00:00Z" }), m("United States", [P.us], { told: "2026-08-01T12:00:00Z" })];
  const a = composeResidence(members);
  const b = composeResidence([...members].reverse());
  eq(a, b);
});
