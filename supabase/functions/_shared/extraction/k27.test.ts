// K27 (founder, 17–18 Oct): Kinship connects a later note to a pet it already knows.
//   1. "Chris has a dog named Fluffy" is kept as Chris's dog Fluffy, a related someone with the row the
//      words justify (never a person; never "a friend named Sam").
//   2. "Fluffy will make a full recovery", told about Chris, is Chris's line, not "Who is Fluffy?":
//      Fluffy is known from a related row, or from an existing line's own words (no migration needed);
//      never across people, never beside a namesake in People, never when two people have a Fluffy.
//   3. A known pet's recovery is never a person's health.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { petsNamedIn } from "./lexicon.ts";
import type { DossierItem, ExtractionInput, ModelProposal, ProposedItem, RosterRelated } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const ROSTER = [
  { key: "p1", id: "id-chris", display_name: "Chris", full_name: null, nicknames: [], relationship_label: null },
  { key: "p2", id: "id-ben", display_name: "Ben", full_name: "Ben Ortiz", nicknames: [], relationship_label: "college roommate" },
  { key: "p3", id: "id-sam", display_name: "Sam Eden", full_name: "Sam Eden", nicknames: [], relationship_label: null },
];
const FLUFFY_ROW: RosterRelated = { key: "r1", id: "id-r-fluffy", person_key: "p1", relation: "dog", name: "Fluffy" };
const FLUFFY_LINE: DossierItem = {
  key: "m1", id: "id-m-fluffy", person_key: "p1", kind: "fact", subject_type: "person", statement: "Chris has a dog named Fluffy",
  certainty: "stated", status: "active", user_state: "unreviewed", detail: { category: "pet" },
};
const VET_LINE: DossierItem = {
  key: "m2", id: "id-m-vet", person_key: "p1", kind: "event", subject_type: "person", statement: "Chris' dog Fluffy has a vet appointment",
  certainty: "stated", status: "active", user_state: "unreviewed", detail: { date: "2026-10-16", date_precision: "day", event_type: "medical", followup_policy: "both" },
};

function input(note: string, over: Partial<ExtractionInput> & { context?: string | null } = {}): ExtractionInput {
  const { context = null, ...rest } = over;
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-10-17T16:00:00Z", time_zone: "America/Los_Angeles", context_person_key: context },
    roster: ROSTER, related: [], dossier: [], ...rest,
  };
}
function item(over: Partial<ProposedItem>): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: "Chris", subject: "person", related_relation: null, related_name: null,
    statement: "", evidence: [], certainty: "stated", sensitivity: "none", confidence: 0.9, date_text: null, date_direction: "unclear",
    detail: {
      event_type: null, event_goal: null, category: "pet", attribute: null, value: null, firmness: null, topic: null,
      place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
    },
    existing: { action: "new", target: null }, ...over,
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[]) => planExtraction(inp, { items, needs_clarification: null } as ModelProposal);
const first = (out: ReturnType<typeof run>) => {
  const it = out.items[0];
  return it ? { tier: it.tier, person: it.person_id, newName: it.new_person_name, subject: it.subject_type, related: it.related, sensitivity: it.sensitivity, flags: it.flags, statement: it.statement } : null;
};

// ─── The words ───────────────────────────────────────────────────────────────

Deno.test("K27: the pets a line's own words name", () => {
  eq(petsNamedIn("Chris has a dog named Fluffy"), [{ relation: "dog", name: "Fluffy" }]);
  eq(petsNamedIn("They adopted a rescue cat called Mochi last spring"), [{ relation: "cat", name: "Mochi" }]);
  eq(petsNamedIn("Chris' dog Fluffy has a vet appointment", ["Chris"]), [{ relation: "dog", name: "Fluffy" }]);
  eq(petsNamedIn("Chris's dog Fluffy has a vet appointment", ["Chris"]), [{ relation: "dog", name: "Fluffy" }]);
  eq(petsNamedIn("Ben's dog Mochi has a vet appointment", ["Chris"]), [], "another owner's pet is not this person's");
  eq(petsNamedIn("Chris has a friend named Sam"), [], "a friend is a person, never a pet");
  eq(petsNamedIn("Chris has a dog named fluffy"), [], "a name is written as a name");
  eq(petsNamedIn("Chris has a dog"), [], "no name, no pet to know by name");
});

// ─── 1. "Chris has a dog named Fluffy" is Chris's dog Fluffy ─────────────────

Deno.test("K27 (1): a pet named outright is kept as the person's related someone, with the row the words justify, kept as before (auto)", () => {
  const note = "Chris has a dog named Fluffy";
  const out = run(input(note), [item({ statement: note, evidence: [note] })]);
  eq(first(out), {
    tier: "auto", person: "id-chris", newName: null, subject: "related", related: { id: null, relation: "dog", name: "Fluffy" },
    sensitivity: "none", flags: [], statement: "Chris has a dog named Fluffy",
  });
  // Told again with the row already there: the same row, never a second.
  const again = run(input(note, { related: [FLUFFY_ROW] }), [item({ statement: note, evidence: [note] })]);
  eq(first(again)?.related, { id: "id-r-fluffy", relation: "dog", name: "Fluffy" });
  // A person named the same way is never a pet: "a friend named Sam" stays the People path (Sam Eden).
  const friend = "Chris has a friend named Sam";
  const f = run(input(friend), [item({ statement: friend, evidence: [friend], detail: { ...item({}).detail, category: "other" } })]);
  eq([first(f)?.subject, first(f)?.related], ["person", null]);
});

// ─── 2. "Fluffy will make a full recovery", told about Chris ─────────────────

const NOTE = "Fluffy will make a full recovery";
const proposal = (person: string, mention: string | null, sensitivity: "none" | "health" = "none") =>
  item({ person, person_mention: mention, statement: "Chris' dog Fluffy will make a full recovery", evidence: [NOTE], sensitivity, detail: { ...item({}).detail, category: "pet" } });

Deno.test("K27 (2): the founder's case: Kinship knows Fluffy only from Chris's existing line; told about Chris, the line is Chris's, not 'Who is Fluffy?'", () => {
  // The live model's own shape (17 Oct): filed on Chris, mention "Fluffy", raised to health by the pipeline.
  for (const person of ["p1", "new", "unknown"]) {
    const out = run(input(NOTE, { context: "p1", dossier: [FLUFFY_LINE, VET_LINE] }), [proposal(person, "Fluffy")]);
    eq(out.clarification, null, person);
    eq(first(out), {
      tier: "confirm", person: "id-chris", newName: null, subject: "person", related: null, sensitivity: "none",
      flags: ["companion_matched"], statement: "Chris' dog Fluffy will make a full recovery",
    }, person);
    // The pet's name is never recorded as a word for Chris.
    eq(out.items[0].subject_words ?? null, null, person);
    eq((out.items[0].person_mentions ?? []).some((m) => /fluffy/iu.test(String(m.text))), false, person);
  }
});

Deno.test("K27 (2): the same from a related row alone, and from the vet line's possessive alone; also with no context when the note names Chris", () => {
  const fromRow = run(input(NOTE, { context: "p1", related: [FLUFFY_ROW] }), [proposal("p1", "Fluffy")]);
  eq([fromRow.clarification, first(fromRow)?.person, first(fromRow)?.flags], [null, "id-chris", ["companion_matched"]]);
  const fromVet = run(input(NOTE, { context: "p1", dossier: [VET_LINE] }), [proposal("p1", "Fluffy")]);
  eq([fromVet.clarification, first(fromVet)?.person], [null, "id-chris"]);
  const named = "Chris's Fluffy will make a full recovery";
  const namesChris = run(input(named, { dossier: [FLUFFY_LINE] }), [item({ person: "new", person_mention: "Fluffy", statement: "Chris' dog Fluffy will make a full recovery", evidence: [named] })]);
  eq([namesChris.clarification, first(namesChris)?.person], [null, "id-chris"]);
});

Deno.test("K27 (2) negatives: no owner in sight, two owners with a Fluffy, a Fluffy in People, a different name: asked or resolved as today", () => {
  // Told on Today with no one named and no context: the question, as today.
  const alone = run(input(NOTE, { dossier: [FLUFFY_LINE] }), [proposal("new", "Fluffy")]);
  eq([alone.tier, first(alone)?.newName, first(alone)?.flags.includes("new_person")], ["clarify", "Fluffy", true]);
  // Chris and Ben each have a dog named Fluffy: never a guess.
  const bensFluffy: DossierItem = { ...FLUFFY_LINE, key: "m9", id: "id-m-ben", person_key: "p2", statement: "Ben has a dog named Fluffy" };
  const two = run(input(NOTE, { context: "p1", dossier: [FLUFFY_LINE, bensFluffy] }), [proposal("p1", "Fluffy")]);
  eq([two.tier, first(two)?.newName], ["clarify", "Fluffy"]);
  // The owner is Ben, the note is about Chris, Ben isn't named: never across people.
  const bensOnly = run(input(NOTE, { context: "p1", dossier: [bensFluffy] }), [proposal("p1", "Fluffy")]);
  eq([bensOnly.tier, first(bensOnly)?.newName], ["clarify", "Fluffy"]);
  // A person in People called Fluffy: the People path decides, the pet never does.
  const fluffyPerson = { key: "p4", id: "id-fluffy", display_name: "Fluffy", full_name: null, nicknames: [], relationship_label: null };
  const inPeople = run(input(NOTE, { context: "p1", roster: [...ROSTER, fluffyPerson], dossier: [FLUFFY_LINE] }), [proposal("p4", "Fluffy")]);
  eq([inPeople.clarification, first(inPeople)?.person, first(inPeople)?.flags.includes("companion_matched")], [null, "id-fluffy", false]);
  // "Fluffie" is not Fluffy.
  const other = run(input("Fluffie will make a full recovery", { context: "p1", dossier: [FLUFFY_LINE] }), [item({ person: "new", person_mention: "Fluffie", statement: "Fluffie will make a full recovery", evidence: ["Fluffie will make a full recovery"] })]);
  eq([other.tier, first(other)?.newName], ["clarify", "Fluffie"]);
});

Deno.test("K27 (2): a related someone who is a person ('Ana', Priya's sister) named outright is her line, with her row; a pet's line stays the person's own", () => {
  const priya = { key: "p5", id: "id-priya", display_name: "Priya", full_name: null, nicknames: [], relationship_label: null };
  const ana: RosterRelated = { key: "r2", id: "id-r-ana", person_key: "p5", relation: "sister", name: "Ana" };
  const note = "Ana got the job in Lisbon";
  const out = run(input(note, { context: "p5", roster: [...ROSTER, priya], related: [ana] }), [item({ person: "p5", person_mention: "Ana", statement: "Priya's sister Ana got the job in Lisbon", evidence: [note], detail: { ...item({}).detail, category: "work" } })]);
  eq([out.clarification, first(out)?.person, first(out)?.subject, first(out)?.related], [null, "id-priya", "related", { id: "id-r-ana", relation: "sister", name: "Ana" }]);
  const vet = "Fluffy has a vet appointment on Friday";
  const pet = run(input(vet, { context: "p1", related: [FLUFFY_ROW] }), [item({ kind: "event", person: "p1", person_mention: "Fluffy", statement: "Chris' dog Fluffy has a vet appointment on Friday", evidence: [vet], date_text: "Friday", detail: { ...item({}).detail, category: null, event_type: "medical" } })]);
  eq([first(pet)?.subject, first(pet)?.related, first(pet)?.sensitivity], ["person", null, "none"], "a pet's event is the person's own line, so Today sees it (J9)");
});

// ─── 3. A known pet's recovery is never a person's health ────────────────────

Deno.test("K27 (3): a known pet's recovery is not health; a person's recovery, or a namesake in People, still is", () => {
  const pet = run(input(NOTE, { context: "p1", dossier: [FLUFFY_LINE] }), [proposal("p1", "Fluffy", "health")]);
  eq([first(pet)?.sensitivity, first(pet)?.flags.includes("sensitive")], ["none", false]);
  const person = "Chris will make a full recovery";
  const his = run(input(person, { context: "p1", dossier: [FLUFFY_LINE] }), [item({ statement: person, evidence: [person], sensitivity: "health", detail: { ...item({}).detail, category: "health" } })]);
  eq([first(his)?.sensitivity, first(his)?.flags.includes("sensitive")], ["health", true]);
  // Ben's dog is also called Sam, and Sam Eden is in People: "Sam will make a full recovery" on Ben's page stays health.
  const samDog: DossierItem = { ...FLUFFY_LINE, key: "m8", id: "id-m-samdog", person_key: "p2", statement: "Ben has a dog named Sam" };
  const sam = "Sam will make a full recovery";
  const namesake = run(input(sam, { context: "p2", dossier: [samDog] }), [item({ person: "p3", person_mention: "Sam", statement: sam, evidence: [sam], sensitivity: "health", detail: { ...item({}).detail, category: "health" } })]);
  eq(first(namesake)?.sensitivity, "health");
});

// ─── The whole sequence, as the pipeline would run it over an account ────────

Deno.test("K27 end to end: note 1 makes the row; note 2 lands on Chris from the row, or from the words alone when the row was never made", () => {
  const note1 = "Chris has a dog named Fluffy";
  const kept = run(input(note1), [item({ statement: note1, evidence: [note1] })]).items[0];
  eq([kept.subject_type, kept.related], ["related", { id: null, relation: "dog", name: "Fluffy" }]);
  // The account after note 1, with the row write_extraction makes; and an older account where note 1 was a plain fact.
  const withRow = input(NOTE, { context: "p1", related: [FLUFFY_ROW] });
  const withoutRow = input(NOTE, { context: "p1", dossier: [FLUFFY_LINE] });
  for (const inp of [withRow, withoutRow]) {
    const out = run(inp, [proposal("p1", "Fluffy", "health")]);
    eq([out.clarification, out.tier, first(out)?.person, first(out)?.sensitivity], [null, "confirm", "id-chris", "none"]);
  }
});
