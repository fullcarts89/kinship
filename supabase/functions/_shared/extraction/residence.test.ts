// pipeline.ts with residence (Phase 4B B3): relate.ts decides only for a
// line whose own words say where someone lives now; every other line, and
// every relation to a line that isn't a residence, keeps today's path.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import type { DossierItem, ExtractionInput, ModelProposal, PlannedItem, ProposedItem } from "./types.ts";
import { placeIndex } from "../semantic/places/dataset.ts";
import { residenceOf } from "../semantic/residence.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const PLACES = placeIndex();
const ROSTER = [
  { key: "p1", id: "id-susan", display_name: "Susan", full_name: null, nicknames: [], relationship_label: null },
  { key: "p2", id: "id-mike", display_name: "Mike", full_name: null, nicknames: [], relationship_label: null },
  { key: "p3", id: "id-sam-a", display_name: "Sam", full_name: "Sam Eden", nicknames: [], relationship_label: null },
  { key: "p4", id: "id-sam-b", display_name: "Sam", full_name: "Sam Doughty", nicknames: [], relationship_label: null },
];

/** A line Kinship holds for Susan, with its reading when the server derived one. */
function held(id: string, statement: string, over: Partial<DossierItem> = {}, read = true): DossierItem {
  const facet = read ? residenceOf(statement, [{ start: 0, end: Array.from(statement).length }], PLACES)?.facet ?? null : null;
  return {
    key: `m${id}`, id, person_key: "p1", kind: "fact", subject_type: "person", related_key: null, statement, certainty: "stated",
    status: "active", user_state: "unreviewed", detail: { category: "home" }, ...(facet ? { facet } : {}), ...over,
  };
}

function input(note: string, dossier: DossierItem[] = [], places = true): ExtractionInput {
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-10-16T17:00:00Z", time_zone: "America/Los_Angeles", context_person_key: null },
    roster: ROSTER, related: [], dossier, ...(places ? { places: PLACES } : {}),
  };
}

function item(statement: string, over: Partial<ProposedItem> = {}): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: "Susan", subject: "person", related_relation: null, related_name: null,
    statement, evidence: [statement], certainty: "stated", sensitivity: "none", confidence: 0.95, date_text: null, date_direction: "past",
    detail: {
      event_type: null, event_goal: null, category: "home", attribute: null, value: null, firmness: null, topic: null,
      place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
    },
    existing: { action: "new", target: null }, ...over,
  };
}
const plan = (inp: ExtractionInput, ...items: ProposedItem[]) => planExtraction(inp, { items, needs_clarification: null } as ModelProposal);
const one = (inp: ExtractionInput, it: ProposedItem): PlannedItem => plan(inp, it).items[0];
const words = (note: string, span: { start: number; end: number } | undefined) => span ? Array.from(note).slice(span.start, span.end).join("") : null;

Deno.test("a residence line carries its reading, in the note's own words", () => {
  const note = "Susan lives in Alameda, CA.";
  const it = one(input(note), item("Susan lives in Alameda, CA"));
  eq([it.facets?.[0].value_text, it.facets?.[0].place_ref, it.residence, it.tier], ["Alameda, CA", "city:5322737", "NEW", "auto"]);
});

Deno.test("without the place data, nothing is read as a residence and every line relates as before", () => {
  const note = "Susan moved to Colorado.";
  const it = one(input(note, [held("ala", "Susan lives in Alameda")], false),
    item("Susan moved to Colorado", { existing: { action: "supersede", target: "mala" } }));
  eq([it.facets, it.residence, it.action], [undefined, undefined, { type: "supersede", target_id: "ala" }]);
});

Deno.test("the table decides, not the model (cases A, C, D, E)", () => {
  const ala = held("ala", "Susan lives in Alameda");
  const cal = held("cal", "Susan lives in California");
  // A: refines, whatever the model says.
  const a = one(input("Susan lives in Alameda.", [cal]), item("Susan lives in Alameda", { existing: { action: "supersede", target: "mcal" } }));
  eq([a.residence, a.action.type], ["REFINES", "new"]);
  // C: a change, with the cue the database re-reads.
  const note = "Susan moved to Colorado.";
  const c = one(input(note, [ala]), item("Susan moved to Colorado"));
  eq([c.residence, c.action, c.detail.transition, words(note, c.cue)], ["SUPERSEDES", { type: "supersede", target_id: "ala" }, "changed", "moved to"]);
  // CC-20: no cue, current truth only.
  const plain = one(input("Susan lives in Colorado.", [ala]), item("Susan lives in Colorado"));
  eq([plain.residence, plain.action.target_id, plain.detail.transition, plain.cue], ["SUPERSEDES", "ala", undefined, undefined]);
  // D: corrected.
  const dNote = "Actually Susan lives in Oakland, not Alameda.";
  const d = one(input(dNote, [ala]), item("Susan lives in Oakland", { evidence: ["Susan lives in Oakland, not Alameda"] }));
  eq([d.residence, d.detail.transition, words(dNote, d.cue)], ["SUPERSEDES", "corrected", "not Alameda"]);
  // E: held with one question; nothing closes until the user answers.
  const e = one(input("Susan moved to California.", [ala]), item("Susan moved to California"));
  eq([e.residence, e.tier, e.flags.includes("residence_conflict"), e.action, e.still_in],
    ["CONFLICT", "hold", true, { type: "new", target_id: null }, { target_id: "ala", words: "Alameda", stay: "facet" }]);
  eq(plan(input("Susan moved to California.", [ala]), item("Susan moved to California")).clarification, null,
    "the question is the app's, from the line it asks about");
});

Deno.test("a line the user edited (§21)", () => {
  const ala = held("ala", "Susan lives in Alameda", { user_state: "edited" });
  const moved = one(input("Susan moved to Colorado.", [ala]), item("Susan moved to Colorado"));
  eq([moved.residence, moved.action.target_id, moved.detail.transition, moved.flags.includes("protected_target")], ["SUPERSEDES", "ala", "changed", false],
    "a change in the user's words closes it");
  const plain = one(input("Susan lives in Colorado.", [ala]), item("Susan lives in Colorado", { existing: { action: "supersede", target: "mala" } }));
  eq([plain.residence, plain.still_in?.stay, plain.action.type], ["CONFLICT", "words", "new"], "a plain replacement still asks");
  const written = held("ala", "Susan lives in Alameda", { user_state: "user_authored" });
  eq(one(input("Susan moved to Colorado.", [written]), item("Susan moved to Colorado")).action.target_id, "ala", "user_authored as edited");
});

Deno.test("only current residence lines of the same person and subject, never shared ones", () => {
  const mike = held("mike", "Mike lives in Alameda", { person_key: "p2" });
  const sister = held("sis", "Susan's sister lives in Alameda", { subject_type: "related", related_key: "r1" });
  const closed = held("old", "Susan lives in Alameda", { status: "resolved" });
  const it = one(input("Susan moved to Colorado.", [mike, sister, closed]), item("Susan moved to Colorado"));
  eq([it.residence, it.action.type], ["NEW", "new"]);
  // A line about two people has no reading, and one person's move never closes it, whatever the model says.
  const shared = held("both", "Susan and Mike live in Alameda", { shared: true, with_person_keys: ["p2"] }, false);
  const s = one(input("Susan moved to Colorado.", [shared]), item("Susan moved to Colorado", { existing: { action: "supersede", target: "mboth" } }));
  eq([s.residence, s.action.type], ["NEW", "new"]);
});

Deno.test("a residence told before B3 (no reading): the model may replace it as today, never with a place that fits it", () => {
  const cal = held("cal", "Susan lives in California", {}, false);
  const fits = one(input("Susan lives in Alameda.", [cal]), item("Susan lives in Alameda", { existing: { action: "supersede", target: "mcal" } }));
  eq([fits.action.type, fits.residence], ["new", "NEW"], "Alameda fits California: no supersession");
  const ala = held("ala", "Susan lives in Alameda", {}, false);
  const away = one(input("Susan moved to Colorado.", [ala]), item("Susan moved to Colorado", { existing: { action: "supersede", target: "mala" } }));
  eq([away.action, away.detail.transition, away.residence], [{ type: "supersede", target_id: "ala" }, "changed", "SUPERSEDES"],
    "a real move: today's supersession, recorded as the change the words say");
  const quiet = one(input("Susan moved to Colorado.", [ala]), item("Susan moved to Colorado"));
  eq([quiet.action.type, quiet.residence], ["new", "NEW"], "and nothing the model didn't propose");
  const paris = held("paris", "Susan lives in Paris", {}, false);
  const tx = one(input("Susan lives in Texas.", [paris]), item("Susan lives in Texas", { existing: { action: "supersede", target: "mparis" } }));
  eq(tx.action.type, "new", "never on a guess between two readings");
});

Deno.test("every other relation keeps today's path", () => {
  // A thread a residence closes is today's business; a line that isn't a residence too.
  const plan1 = held("plan", "Susan is not moving to Denver anymore", { kind: "fact" }, false);
  const it = one(input("Susan lives in Alameda.", [plan1]), item("Susan lives in Alameda"));
  eq([it.residence, it.action.type], ["NEW", "new"]);
  const job = held("job", "Susan works at Google", { detail: { category: "work" } }, false);
  const work = one(input("Susan works at Meta now.", [job]), item("Susan works at Meta now", {
    detail: { ...item("x").detail, category: "work" }, existing: { action: "supersede", target: "mjob" },
  }));
  eq([work.residence, work.facets, work.action], [undefined, undefined, { type: "supersede", target_id: "job" }]);
});

Deno.test("a residence whose person is still asked is never related: its words stay, with no reading", () => {
  const note = "Sam moved to Colorado.";
  const it = plan(input(note, []), item("Sam moved to Colorado", { person: "p3", person_mention: "Sam" })).items[0];
  eq([it.tier, it.facets, it.residence], ["hold", undefined, undefined]);
});

Deno.test("a hedge, a report or a plan is never a residence (the kept guards)", () => {
  const ala = held("ala", "Susan lives in Alameda");
  const cases: [string, Partial<ProposedItem>][] = [
    ["I think Susan lives in Oakland now.", { certainty: "tentative", evidence: ["I think Susan lives in Oakland now"] }],
    ["Ben said Susan moved to Denver.", { certainty: "reported", evidence: ["Ben said Susan moved to Denver"] }],
    ["Susan is moving to Oakland in August.", { kind: "plan", evidence: ["Susan is moving to Oakland in August"] }],
  ];
  for (const [note, over] of cases) {
    const it = plan(input(note, [ala]), item(note.replace(/\.$/, ""), over)).items[0];
    eq([it?.facets, it?.residence, it?.action.type], [undefined, undefined, "new"], note);
  }
});
