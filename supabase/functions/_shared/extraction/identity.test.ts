// Identity resolution (CMR-1 B; founder K36, 14 Nov 2026: "Who is Has?"). The boundary these tests pin:
// the model proposes who a line refers to (person_mention) and writes the line in its own words; code
// validates each referent against the note's own words and never makes a person out of a word the note
// writes only as a word, never moves a line on the strength of a generated statement alone, and never
// gives an uncertain line a sure subject. When model and evidence disagree, both are offered; when the
// note itself settles it (the sentence's subject, the page), no one is asked. Every proposal shape here is
// one the live model has given (kseries, narrative) or the founder's own (K36). Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { resolveHeld, type HeldItem } from "./resolve.ts";
import { asName, leadingName, neverAName, statementNames, withSubject } from "./voice.ts";
import type { ExtractionInput, ModelProposal, PlannedItem, ProposedItem, RosterPerson } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}
function ok(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const person = (key: string, id: string, name: string, more: Partial<RosterPerson> = {}): RosterPerson =>
  ({ key, id, display_name: name, full_name: null, nicknames: [], relationship_label: null, ...more });

const KAIYA = person("p1", "kaiya", "Kaiya", { relationship_label: "daughter" });
const KRYSTAL = person("p2", "krystal", "Krystal", { relationship_label: "wife" });
const BEN = person("p3", "ben", "Ben", { full_name: "Ben Oxnard" });
const WILL = person("p4", "will", "Will Park", { full_name: "Will Park" });
const MAY = person("p5", "may", "May", { relationship_label: "friend" });
const JORDAN = person("p6", "jordan", "Jordan", { relationship_label: "friend" });
const SAM_LEE = person("p7", "sam-lee", "Sam", { full_name: "Sam Lee" });
const SAM_DIAZ = person("p8", "sam-diaz", "Sam", { full_name: "Samantha Diaz", nicknames: ["Sammy"] });
const SARAH = person("p9", "sarah", "Sarah");
const ZOE = person("p10", "zoe", "Zoe", { relationship_label: "neighbor" });
const NGUYEN = person("p11", "nguyen", "Nguyen", { relationship_label: "coworker" });
const XIOMARA = person("p12", "xiomara", "Xiomara");
const SAOIRSE = person("p13", "saoirse", "Saoirse");

function input(note: string, roster: RosterPerson[], page: string | null = null, extra: Partial<ExtractionInput> = {}): ExtractionInput {
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-11-14T18:00:00Z", time_zone: "America/Los_Angeles", context_person_key: page },
    roster, related: [], dossier: [], ...extra,
  };
}

const NO_DETAIL = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
function item(over: Omit<Partial<ProposedItem>, "detail"> & { detail?: Partial<ProposedItem["detail"]> }): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: null, subject: "person", related_relation: null, related_name: null,
    statement: "x", evidence: ["x"], certainty: "stated", sensitivity: "none", confidence: 0.92, date_text: null,
    date_direction: "unclear", existing: { action: "new", target: null }, ...over,
    detail: { ...NO_DETAIL, ...(over.detail ?? {}) } as ProposedItem["detail"],
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[], asked: ModelProposal["needs_clarification"] = null) =>
  planExtraction(inp, { items, needs_clarification: asked } as ModelProposal);
const asHeld = (p: PlannedItem) => JSON.parse(JSON.stringify(p)) as HeldItem;
const shape = (i: PlannedItem) => [i.person_id, i.new_person_name, i.tier, i.statement];
const noOneCalled = (out: ReturnType<typeof run>, word: string) => {
  for (const i of out.items) {
    ok((i.new_person_name ?? "").toLowerCase() !== word.toLowerCase(), `never someone new called "${word}": ${JSON.stringify(i.new_person_name)}`);
    ok(!(i.person_mentions ?? []).some((m) => m.text.toLowerCase() === word.toLowerCase()), `"${word}" is never recorded as anyone's words`);
  }
  ok(!new RegExp(`\\b${word}\\b`, "iu").test(JSON.stringify(out.clarification ?? "")), `no question about "${word}"`);
};

// ─── K36: "Kaiya has not been sleeping very well and has been very clingy to my wife Krystal" ─────

const K36 = "Kaiya has not been sleeping very well and has been very clingy to my wife Krystal";
const SLEEP = "has not been sleeping very well";
const CLINGY = "has been very clingy to my wife Krystal";
const sleeping = (person: string, mention: string | null) =>
  item({ person, person_mention: mention, statement: "Kaiya has not been sleeping very well", evidence: [`Kaiya ${SLEEP}`], detail: { category: "health" } });
/** The model's second line, without its subject (founder device, 14 Nov 2026). */
const clingy = (person: string, mention: string | null, statement = "Has been very clingy to your wife Krystal") =>
  item({ person, person_mention: mention, statement, evidence: [CLINGY], detail: { category: "other" } });

Deno.test("K36 (#88 concern 4/5): the founder's shape, Kaiya in People: both lines hers, named in front, no question, nothing lost", () => {
  for (const page of [null, "p1"]) {
    for (const roster of [[KAIYA], [KAIYA, KRYSTAL], [KAIYA, KRYSTAL, BEN]]) {
      const out = run(input(K36, roster, page), [sleeping("p1", "Kaiya"), clingy("p1", "Kaiya")]);
      eq(out.dropped, [], "nothing dropped");
      eq(out.items.map((i) => [i.person_id, i.new_person_name, i.tier === "hold"]), [["kaiya", null, false], ["kaiya", null, false]], `page ${page}, ${roster.length} people`);
      eq(out.items[1].statement, "Kaiya has been very clingy to your wife Krystal");
      eq(out.clarification, null, "no question at all");
      noOneCalled(out, "Has");
    }
  }
});

Deno.test("K36 (#88 concern 4): the model gives 'has' as who it's about: still Kaiya's, named in front, never 'Has', never 'Who is this about?'", () => {
  for (const page of [null, "p1"]) {
    for (const roster of [[KAIYA], [KAIYA, KRYSTAL], [KAIYA, KRYSTAL, BEN]]) {
      for (const mention of ["has", "Has", "has been"]) {
        const out = run(input(K36, roster, page), [sleeping("p1", "Kaiya"), clingy("new", mention)]);
        eq(out.dropped, [], "nothing dropped");
        eq(out.items.map((i) => [i.person_id, i.new_person_name, i.tier === "hold"]), [["kaiya", null, false], ["kaiya", null, false]], `page ${page}, ${roster.length} people, "${mention}"`);
        eq(out.items[1].statement, "Kaiya has been very clingy to your wife Krystal");
        eq(out.clarification, null, "no question at all");
        noOneCalled(out, "Has");
      }
    }
  }
});

Deno.test("K36: the clingy line alone, as the model's whole answer, on Kaiya's page and from a general Tell", () => {
  const onPage = run(input(K36, [KAIYA, KRYSTAL], "p1"), [clingy("new", "has")]);
  eq(onPage.items.map(shape), [["kaiya", null, "confirm", "Kaiya has been very clingy to your wife Krystal"]]);
  const general = run(input(K36, [KAIYA, KRYSTAL]), [clingy("unknown", null)]);
  eq(general.items.map(shape), [["kaiya", null, "confirm", "Kaiya has been very clingy to your wife Krystal"]], "the sentence's subject, with no page");
  eq(general.clarification, null);
});

Deno.test("K36 (#88 concern 4, general Tell): Kaiya not in People yet: both lines wait on one 'Is Kaiya someone new?', the clingy line named, and the answer adds her once", () => {
  for (const second of [clingy("new", "Kaiya"), clingy("new", "has"), clingy("unknown", null)]) {
    const out = run(input(K36, [KRYSTAL, BEN]), [sleeping("new", "Kaiya"), second]);
    eq(out.dropped, [], "nothing dropped");
    eq(out.items.map((i) => [i.person_id, i.new_person_name, i.tier]), [[null, "Kaiya", "hold"], [null, "Kaiya", "hold"]], second.person_mention ?? "null");
    eq(out.items[1].statement, "Kaiya has been very clingy to your wife Krystal", "the held line still says who it is about");
    eq(out.clarification, { about: "new_person", question: "Is Kaiya someone new?", options: ["Add Kaiya", "Someone already here"] });
    noOneCalled(out, "Has");
    // The answer: one Kaiya, both lines hers, in words that name her.
    const ctx = { note: K36, people: [KRYSTAL, BEN].map((p) => ({ id: p.id, display_name: p.display_name, state: "active" })), related: [], existing: [] };
    const r = resolveHeld(out.items.map(asHeld), [{ index: 0, new_person: true, accept: true }, { index: 1, new_person: true, accept: true }], ctx);
    if ("fail" in r) throw new Error(r.fail);
    eq(r.newPeople.map((p) => [p.display_name, p.relationship_label ?? null]), [["Kaiya", null]], "added once");
    eq(r.items.map((i) => [i.person_id, i.statement]), [["new:0", "Kaiya has not been sleeping very well"], ["new:0", "Kaiya has been very clingy to your wife Krystal"]]);
  }
});

Deno.test("K36 (voice): the same note with no capitals and no punctuation", () => {
  const note = "kaiya has not been sleeping very well and has been very clingy to my wife krystal";
  const second = (person: string, mention: string | null) =>
    item({ person, person_mention: mention, statement: "Has been very clingy to your wife Krystal", evidence: ["has been very clingy to my wife krystal"] });
  for (const [person, mention] of [["p1", "kaiya"], ["new", "has"], ["unknown", null]] as const) {
    const out = run(input(note, [KAIYA, KRYSTAL]), [
      item({ person: "p1", person_mention: "kaiya", statement: "Kaiya has not been sleeping very well", evidence: ["kaiya has not been sleeping very well"] }),
      second(person, mention),
    ]);
    eq(out.items.map((i) => [i.person_id, i.new_person_name]), [["kaiya", null], ["kaiya", null]], `${person}/${mention}`);
    // The negation guard reads an unpunctuated transcript as one clause, so the line keeps the note's own words
    // ("krystal" as written; J4, grounding block): still Kaiya's, still named in front.
    ok(/^Kaiya has been very clingy to your wife krystal$/iu.test(out.items[1].statement), out.items[1].statement);
    eq(out.clarification, null);
    noOneCalled(out, "Has");
  }
});

Deno.test("K36: the model files the clingy clause on Krystal (the sentence's object): model and sentence disagree, so both are offered, never one followed", () => {
  const out = run(input(K36, [KAIYA, KRYSTAL]), [sleeping("p1", "Kaiya"), clingy("p2", "has")]);
  const [, line] = out.items;
  eq([line.person_id, line.tier, line.flags.includes("person_disagreement"), line.candidate_ids], [null, "hold", true, ["kaiya", "krystal"]]);
  eq(line.statement, "Has been very clingy to your wife Krystal", "#88 concern 3: a line still in question gets no sure subject");
  eq(out.clarification?.question, "Who is this about?");
  eq(out.clarification?.options, ["Kaiya (daughter)", "Krystal (wife)", "Someone else"]);
  noOneCalled(out, "Has");
});

Deno.test("K36 (#88 concern 3): 'Kaiya's mom has not been sleeping… and has been clingy': Kaiya's, asked 'Kaiya or Kaiya's mom?', and no name is put in front meanwhile", () => {
  const note = "Kaiya's mom has not been sleeping very well and has been very clingy to my wife Krystal";
  const out = run(input(note, [KAIYA, KRYSTAL]), [clingy("new", "has")]);
  const [line] = out.items;
  eq([line.person_id, line.tier, line.flags.includes("subject_check")], ["kaiya", "hold", true]);
  eq(line.statement, "Has been very clingy to your wife Krystal", "never 'Kaiya has been…' while it may be her mom's");
  eq(out.clarification?.question, "Is this about Kaiya, or Kaiya's mom?");
});

Deno.test("K36 (#88 concern 3): a line filed on a person named only in another sentence is not given their name, and the conflict is asked", () => {
  const note = `${K36}. Ben called.`;
  const out = run(input(note, [KAIYA, KRYSTAL, BEN]), [clingy("p3", "Ben")]);
  const [line] = out.items;
  eq([line.person_id, line.tier, line.flags.includes("person_disagreement"), line.candidate_ids], [null, "hold", true, ["kaiya", "ben"]]);
  ok(!/^Ben\b/.test(line.statement), `no sure subject: ${line.statement}`);
  eq(out.clarification?.question, "Who is this about?");
});

Deno.test("K36 (#88 concern 3): a 'he' two people could be gets no name in front while it is asked", () => {
  const note = "Ben and Will went climbing. He has been sore all week.";
  const out = run(input(note, [BEN, WILL]), [item({ person: "p3", person_mention: "He", statement: "Has been sore all week", evidence: ["He has been sore all week"] })]);
  const [line] = out.items;
  eq([line.tier, line.flags.includes("pronoun_multiple")], ["hold", true]);
  eq(line.statement, "Has been sore all week");
});

Deno.test("K36 (#88 concern 1): preventing 'Has' never relies on the list: a verb the list lacks is a word when the note writes it as one", () => {
  // "fusses" is in no list; the note writes it right after "Kaiya", so it is her verb, never a person.
  const note = "Kaiya fusses at bedtime and fusses at the sitter too";
  const out = run(input(note, [KAIYA]), [item({ person: "new", person_mention: "fusses", statement: "Fusses at the sitter too", evidence: ["fusses at the sitter too"] })]);
  eq(out.items.map(shape), [["kaiya", null, "confirm", "Kaiya fusses at the sitter too"]]);
  noOneCalled(out, "Fusses");
  // And as the first word of a generated statement, filed on her by the model (grounded: her sentence): no "Fusses" to ask about.
  const lead = run(input(note, [KAIYA, BEN]), [item({ person: "p1", person_mention: "Kaiya", statement: "Fusses at the sitter too", evidence: ["fusses at the sitter too"] })]);
  eq(lead.items.map(shape), [["kaiya", null, "auto", "Kaiya fusses at the sitter too"]]);
});

// ─── #88 concern 2: a lower-case word never becomes a person ─────────────────────────────────────

Deno.test("#88 concern 2: verbs, nouns, places, organisations, objects, 'mom', 'the dog', 'work' given as who it's about are never someone new", () => {
  const note = "kaiya went to the park with the dog and loves the swings at work. ben is settling in well in paris and works at apple";
  const roster = [KAIYA, BEN];
  for (const w of ["went", "park", "the dog", "dog", "loves", "swings", "work", "and", "very", "mom", "the", "with"]) {
    const out = run(input(note, roster), [item({ person: "new", person_mention: w, statement: "Loves the swings at work", evidence: ["loves the swings at work"] })]);
    eq(out.items.length, 1, `"${w}": the fact is kept or held, never dropped`);
    noOneCalled(out, w);
    ok(out.items[0].person_id === "kaiya" || out.items[0].tier === "hold", `"${w}": Kaiya's, or held for a question: ${JSON.stringify(shape(out.items[0]))}`);
  }
  for (const w of ["paris", "apple", "Paris", "Apple"]) {
    const out = run(input(note, roster), [item({ person: "new", person_mention: w, statement: "Works at Apple", evidence: ["works at apple"] })]);
    noOneCalled(out, w);
    eq(out.items.map((i) => [i.person_id, i.new_person_name]), [["ben", null]], `"${w}" is a place or a company; the clause is Ben's`);
  }
});

Deno.test("#88 concern 2: a lower-case name is still a name ('pedro' is Pedro), said back capitalised", () => {
  const note = "talked with ben. pedro is getting married in june. oluwaseun got the promotion";
  const pedro = run(input(note, [BEN]), [item({ person: "new", person_mention: "pedro", statement: "Pedro is getting married in June", evidence: ["pedro is getting married in june"], date_text: "in june" })]);
  eq(pedro.items.map((i) => [i.new_person_name, i.tier]), [["Pedro", "hold"]]);
  eq(pedro.clarification?.question, "Is Pedro someone new?");
  const olu = run(input(note, [BEN]), [item({ person: "new", person_mention: "oluwaseun", statement: "Oluwaseun got the promotion", evidence: ["oluwaseun got the promotion"] })]);
  eq(olu.items.map((i) => [i.new_person_name, i.tier]), [["Oluwaseun", "hold"]]);
});

// ─── The boundary: a generated statement never makes a person on its own ─────────────────────────

Deno.test("refileBySubject: a statement's first word moves a line only when the note itself writes it as a name", () => {
  // The founder's case: "my brother John" is the note's own capital mid-sentence: moved (or Add John).
  const warhammer = "Ben wants to play the new warhammer game with me and my brother John on weekends.";
  const john = run(input(warhammer, [BEN]), [item({ person: "p3", person_mention: "Ben", statement: "John is your brother", evidence: ["my brother John"] })]);
  eq(john.items.map((i) => [i.person_id, i.new_person_name, i.tier]), [[null, "John", "hold"]]);
  // A word the note writes only in lower case never does, whatever the model capitalised.
  const refuses = run(input("Kaiya refuses to nap and keeps everyone up", [KAIYA, BEN]), [item({ person: "p1", person_mention: "Kaiya", statement: "Keeps everyone up", evidence: ["keeps everyone up"] })]);
  eq(refuses.items.map(shape), [["kaiya", null, "auto", "Kaiya keeps everyone up"]]);
  // Nor a month or a weekday the note capitalises ("May 2").
  const may = run(input("Anna's birthday is May 2, Ben reminded me.", [BEN]), [item({ person: "p3", person_mention: "Ben", statement: "May 2 is Anna's birthday", evidence: ["Anna's birthday is May 2"] })]);
  eq(may.items.map((i) => [i.person_id, i.new_person_name]), [["ben", null]]);
  noOneCalled(may, "May");
  // A name in lower case the model never referred to stays where the model filed it (a known limit, never a wrong person).
  const lower = run(input("ben said will is visiting friday", [BEN]), [item({ person: "p3", person_mention: "ben", statement: "Will is visiting Friday", evidence: ["will is visiting friday"], date_text: "friday" })]);
  eq(lower.items.map((i) => [i.person_id, i.new_person_name]), [["ben", null]]);
});

Deno.test("refileBySubject: a name the user wrote mid-sentence moves the line to that person in People, or asks to add them", () => {
  const note = "Ben said Will is visiting Friday.";
  const known = run(input(note, [BEN, WILL]), [item({ person: "p3", person_mention: "Ben", statement: "Will is visiting Friday", evidence: ["Will is visiting Friday"], date_text: "Friday" })]);
  eq(known.items.map((i) => [i.person_id, i.flags.includes("subject_moved"), i.tier]), [["will", true, "confirm"]]);
  const fresh = run(input(note, [BEN]), [item({ person: "p3", person_mention: "Ben", statement: "Will is visiting Friday", evidence: ["Will is visiting Friday"], date_text: "Friday" })]);
  eq(fresh.items.map((i) => [i.person_id, i.new_person_name, i.tier]), [[null, "Will", "hold"]]);
});

// ─── Names that are ordinary words ───────────────────────────────────────────────────────────────

Deno.test("Will, May, Mark, Grace, Hope: a capital the user wrote mid-sentence is a name however common the word", () => {
  for (const name of ["May", "Will", "Mark", "Grace", "Hope"]) {
    const note = `Talked with ${name} about her trip to Lisbon.`;
    const out = run(input(note, [BEN]), [item({ person: "new", person_mention: name, statement: `${name} is planning a trip to Lisbon`, evidence: [`Talked with ${name} about her trip to Lisbon`] })]);
    eq(out.items.map((i) => [i.new_person_name, i.tier]), [[name, "hold"]], name);
    eq(out.clarification?.question, `Is ${name} someone new?`);
  }
});

Deno.test("May the friend and May the month: 'in May' links no one; 'with May' is her", () => {
  const month = run(input("Ben is visiting in May", [BEN, MAY]), [item({ kind: "event", person: "p3", person_mention: "Ben", statement: "Ben is visiting in May", evidence: ["Ben is visiting in May"], date_text: "in May" })]);
  eq(month.items.map((i) => [i.person_id, i.with_person_ids ?? []]), [["ben", []]]);
  const friend = run(input("Ben went hiking with May", [BEN, MAY]), [item({ person: "p3", person_mention: "Ben", statement: "Ben went hiking with May", evidence: ["Ben went hiking with May"] })]);
  eq(friend.items.map((i) => [i.person_id, i.with_person_ids ?? []]), [["ben", ["may"]]]);
  const lower = run(input("talked with may about her trip", [BEN]), [item({ person: "new", person_mention: "may", statement: "May is planning a trip", evidence: ["talked with may about her trip"] })]);
  eq(lower.items.map((i) => i.new_person_name), ["May"], "a lower-case name is still a name");
});

Deno.test("'I hope Ben got the job', with a Hope in People: a word written as a word links no one (K4, kept)", () => {
  const hope = person("p20", "hope", "Hope");
  const out = run(input("I hope Ben got the job", [BEN, hope]), [item({ person: "p3", person_mention: "Ben", statement: "Ben got the job", evidence: ["I hope Ben got the job"] })]);
  eq(out.items.map((i) => [i.person_id, i.with_person_ids ?? []]), [["ben", []]]);
});

// ─── Uncommon and culturally diverse names ───────────────────────────────────────────────────────

Deno.test("Nguyen, Oluwaseun, Saoirse, Xiomara, Bartholomew: new, as written or in lower case; as a line's lead when the user capitalised them", () => {
  for (const name of ["Nguyen", "Oluwaseun", "Saoirse", "Xiomara", "Bartholomew"]) {
    const note = `${name} got the promotion at work.`;
    eq(run(input(note, [BEN]), [item({ person: "new", person_mention: name, statement: `${name} got the promotion`, evidence: [`${name} got the promotion`] })]).items.map((i) => i.new_person_name), [name], name);
    const lower = note.toLowerCase();
    eq(run(input(lower, [BEN]), [item({ person: "new", person_mention: name.toLowerCase(), statement: `${name} got the promotion`, evidence: [`${name.toLowerCase()} got the promotion`] })]).items.map((i) => i.new_person_name), [name], lower);
    const lead = run(input(`Ben said ${name} is moving to Austin.`, [BEN]), [item({ person: "p3", person_mention: "Ben", statement: `${name} is moving to Austin`, evidence: [`${name} is moving to Austin`] })]);
    eq(lead.items.map((i) => [i.person_id, i.new_person_name]), [[null, name]], `${name} as the lead`);
    const known = run(input(`${name} got the promotion at work.`, [BEN, person("p30", "them", name)]), [item({ person: "p30", person_mention: name, statement: `${name} got the promotion`, evidence: [`${name} got the promotion`] })]);
    eq(known.items.map((i) => [i.person_id, i.tier]), [["them", "auto"]], `${name} in People`);
  }
});

// ─── Possessives, shared names, relatives ────────────────────────────────────────────────────────

Deno.test("possessives: 'Sam's mom' names Sam and asks 'Sam or Sam's mom?'; with two Sams, 'Which Sam?'; 'Chris' dog' is Chris (K7)", () => {
  const one = run(input("Sam's mom is visiting next week", [SAM_LEE, BEN]), [item({ person: "p7", person_mention: "Sam's", statement: "Sam's mom is visiting next week", evidence: ["Sam's mom is visiting next week"], date_text: "next week" })]);
  eq(one.items.map((i) => [i.person_id, i.tier, i.flags.includes("subject_check")]), [["sam-lee", "hold", true]]);
  eq(one.clarification?.question, "Is this about Sam, or Sam's mom?");
  const two = run(input("Sam's mom is visiting next week", [SAM_LEE, SAM_DIAZ]), [item({ person: "p7", person_mention: "Sam's", statement: "Sam's mom is visiting next week", evidence: ["Sam's mom is visiting next week"], date_text: "next week" })]);
  eq([two.items[0].person_id, two.items[0].flags.includes("person_ambiguous"), two.clarification?.question], [null, true, "Which Sam do you mean?"]);
  noOneCalled(two, "Sam's");
  const chris = person("p21", "chris", "Chris");
  const dog = run(input("Chris' dog Fluffy has a vet appointment on Friday", [chris]), [item({ kind: "event", person: "new", person_mention: "Chris'", statement: "Chris' dog Fluffy has a vet appointment on Friday", evidence: ["Chris' dog Fluffy has a vet appointment on Friday"], date_text: "Friday", detail: { event_type: "medical" } })]);
  eq(dog.items.map((i) => [i.person_id, i.new_person_name, i.tier !== "hold"]), [["chris", null, true]]);
});

Deno.test("two people share a name: asked, never guessed, with both offered; 'Which Sam?' only for a shared name", () => {
  const out = run(input("Sam is moving to Denver", [SAM_LEE, SAM_DIAZ, BEN]), [item({ person: "p7", person_mention: "Sam", statement: "Sam is moving to Denver", evidence: ["Sam is moving to Denver"] })]);
  eq([out.items[0].person_id, out.items[0].tier, out.clarification], [null, "hold", { about: "person", question: "Which Sam do you mean?", options: ["Sam", "Sam", "Someone else"] }]);
  // A name no two people share is never asked as "Which X?": the question is who it is about.
  const one = run(input("Pedro is moving to Denver", [BEN]), [item({ person: "unknown", person_mention: null, statement: "Pedro is moving to Denver", evidence: ["Pedro is moving to Denver"] })], { about: "person", mention: null });
  ok(!/^Which/.test(one.clarification?.question ?? ""), `never "Which Pedro?": ${one.clarification?.question}`);
});

Deno.test("a new person who shares a name with someone in People: the model's 'new' lands on that person for a glance, never silently (K7 precedent)", () => {
  const out = run(input("Met a new guy Ben at climbing, he's moving to Denver", [BEN]), [item({ person: "new", person_mention: "Ben", statement: "Ben is moving to Denver", evidence: ["he's moving to Denver"] })]);
  eq(out.items.map((i) => [i.person_id, i.new_person_name, i.tier, i.flags.includes("subject_moved")]), [["ben", null, "confirm", true]]);
});

Deno.test("a new person who shares a name with someone's relative: asked, never silently the relative; named beside the relative's person, the relative (K27)", () => {
  const related = [{ key: "r1", id: "rel-zoe", person_key: "p9", relation: "sister", name: "Zoe" }];
  const alone = run(input("Zoe is starting school Monday", [SARAH, BEN], null, { related }), [item({ kind: "event", person: "new", person_mention: "Zoe", statement: "Zoe is starting school Monday", evidence: ["Zoe is starting school Monday"], date_text: "Monday", detail: { event_type: "school_start" } })]);
  eq(alone.items.map((i) => [i.person_id, i.new_person_name, i.tier]), [[null, "Zoe", "hold"]]);
  const withSarah = run(input("Sarah said Zoe is starting school Monday", [SARAH, BEN], null, { related }), [item({ kind: "event", person: "new", person_mention: "Zoe", statement: "Zoe is starting school Monday", evidence: ["Zoe is starting school Monday"], date_text: "Monday", detail: { event_type: "school_start" } })]);
  eq(withSarah.items.map((i) => [i.person_id, i.subject_type, i.related?.id, i.flags.includes("companion_matched")]), [["sarah", "related", "rel-zoe", true]]);
  // Both a Zoe in People and Sarah's sister Zoe: "Sarah's cousin Zoe…" is asked, never the Zoe in People on a guess.
  const both = run(input("Sarah's cousin Zoe is moving to Denver", [SARAH, ZOE]), [item({ person: "p10", person_mention: "Zoe", statement: "Zoe is moving to Denver", evidence: ["Sarah's cousin Zoe is moving to Denver"] })]);
  eq(both.items.map((i) => [i.person_id, i.subject_type, i.tier, i.candidate_ids]), [["sarah", "related", "hold", ["sarah", "zoe"]]]);
});

Deno.test("children, spouses and relatives: 'my wife Krystal', 'my daughter Kaiya', 'my sister', 'his mom Carla'", () => {
  const wife = run(input("My wife Krystal got a promotion", [KAIYA, KRYSTAL]), [item({ person: "new", person_mention: "my wife Krystal", statement: "Krystal got a promotion", evidence: ["My wife Krystal got a promotion"] })]);
  eq(wife.items.map((i) => [i.person_id, i.new_person_name]), [["krystal", null]]);
  const daughter = run(input("My daughter Kaiya starts kindergarten Tuesday", [KAIYA, KRYSTAL]), [item({ kind: "event", person: "new", person_mention: "My daughter Kaiya", statement: "Kaiya starts kindergarten Tuesday", evidence: ["My daughter Kaiya starts kindergarten Tuesday"], date_text: "Tuesday", detail: { event_type: "school_start" } })]);
  eq(daughter.items.map((i) => [i.person_id, i.new_person_name]), [["kaiya", null]]);
  const sister = person("p22", "lena", "Lena", { relationship_label: "sister" });
  const bySister = run(input("My sister is visiting next week", [BEN, sister]), [item({ person: "unknown", person_mention: "my sister", statement: "Your sister is visiting next week", evidence: ["My sister is visiting next week"], date_text: "next week" })]);
  eq(bySister.items.map((i) => [i.person_id, i.new_person_name]), [["lena", null]]);
  const noSister = run(input("My sister is visiting next week", [BEN]), [item({ person: "new", person_mention: "my sister", statement: "Your sister is visiting next week", evidence: ["My sister is visiting next week"], date_text: "next week" })]);
  eq(noSister.items.map((i) => [i.person_id, i.new_person_name, i.tier]), [[null, null, "hold"]], "an unnamed relative is asked about, never 'My Sister'");
  const carla = run(input("His mom Carla is visiting next week", [BEN], "p3"), [item({ kind: "event", person: "p3", person_mention: "his mom Carla", subject: "related", related_relation: "mom", related_name: "Carla", statement: "Ben's mom Carla is visiting next week", evidence: ["His mom Carla is visiting next week"], date_text: "next week", detail: { event_type: "trip" } })]);
  eq(carla.items.map((i) => [i.person_id, i.subject_type, i.related?.relation, i.related?.name, i.new_person_name]), [["ben", "related", "mom", "Carla", null]]);
});

// ─── Pronouns and subject-less clauses across sentences ──────────────────────────────────────────

Deno.test("a story of several sentences: pronouns and subject-less clauses follow the person, on a page or not", () => {
  const note = "Saoirse came by for dinner. She loves Lisbon and has been planning a trip there, but hasn't booked anything yet. Keeps saying next spring.";
  for (const page of [null, "p13"]) {
    const out = run(input(note, [SAOIRSE, BEN], page), [
      item({ person: "p13", person_mention: "She", statement: "Saoirse loves Lisbon", evidence: ["She loves Lisbon"] }),
      item({ kind: "thread", person: "new", person_mention: "has", statement: "Has been planning a trip to Lisbon", evidence: ["has been planning a trip there"], detail: { topic: "a trip to Lisbon" } }),
      item({ kind: "thread", person: "unknown", person_mention: null, statement: "Hasn't booked anything yet", evidence: ["hasn't booked anything yet"], detail: { topic: "booking" } }),
    ]);
    eq(out.items.map((i) => [i.person_id, i.new_person_name]), [["saoirse", null], ["saoirse", null], ["saoirse", null]], `page ${page}`);
    eq(out.items.map((i) => i.statement), ["Saoirse loves Lisbon", "Saoirse has been planning a trip to Lisbon", "Saoirse hasn't booked anything yet"]);
    eq(out.clarification, null);
    noOneCalled(out, "Has");
  }
});

Deno.test("two people in one story: each clause lands on its own person, a place is never someone, and nothing is asked", () => {
  const note = "Had dinner with Nguyen and Xiomara. Nguyen just got back from Hanoi and has been jet-lagged all week; Xiomara is starting her residency in July.";
  const out = run(input(note, [NGUYEN, XIOMARA, BEN]), [
    item({ person: "p11", person_mention: "Nguyen", statement: "Nguyen just got back from Hanoi", evidence: ["Nguyen just got back from Hanoi"] }),
    item({ person: "new", person_mention: "has", statement: "Has been jet-lagged all week", evidence: ["has been jet-lagged all week"] }),
    item({ kind: "event", person: "p12", person_mention: "Xiomara", statement: "Xiomara is starting her residency in July", evidence: ["Xiomara is starting her residency in July"], date_text: "in July", detail: { event_type: "job_start" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.new_person_name]), [["nguyen", null], ["nguyen", null], ["xiomara", null]]);
  eq(out.items[1].statement, "Nguyen has been jet-lagged all week");
  eq(out.clarification, null);
  noOneCalled(out, "Hanoi");
});

Deno.test("genuine ambiguity still asks: a clause after two people, a 'he' after two people, a shared name", () => {
  const two = run(input("Ben and Will went climbing, and has been sore all week", [BEN, WILL]), [item({ person: "new", person_mention: "has", statement: "Has been sore all week", evidence: ["has been sore all week"] })]);
  eq([two.items[0].person_id, two.items[0].tier, two.items[0].candidate_ids], [null, "hold", ["ben", "will"]]);
  eq(two.clarification?.question, "Who is this about?");
  eq(two.items[0].statement, "Has been sore all week", "no sure subject while it is asked");
  const he = run(input("Ben and Will went climbing. He has been sore all week.", [BEN, WILL]), [item({ person: "unknown", person_mention: "He", statement: "He has been sore all week", evidence: ["He has been sore all week"] })]);
  eq([he.items[0].person_id, he.items[0].tier, he.items[0].candidate_ids], [null, "hold", ["ben", "will"]]);
  const intro = run(input("My neighbor came over and has been talking about his dog", [BEN], "p3"), [item({ person: "unknown", person_mention: null, statement: "Has been talking about his dog", evidence: ["has been talking about his dog"] })]);
  eq([intro.items[0].person_id, intro.items[0].tier], [null, "hold"], "someone the writer introduces by relation is no one in People: asked, never the page");
});

Deno.test("told on someone else's page: the sentence's subject wins over the page when the model couldn't tell; the model's choice of the page is asked beside it", () => {
  const unsure = run(input(K36, [KAIYA, KRYSTAL], "p2"), [clingy("unknown", null)]);
  eq(unsure.items.map(shape), [["kaiya", null, "confirm", "Kaiya has been very clingy to your wife Krystal"]]);
  const page = run(input(K36, [KAIYA, KRYSTAL], "p2"), [clingy("p2", "has")]);
  eq([page.items[0].person_id, page.items[0].tier, page.items[0].candidate_ids], [null, "hold", ["kaiya", "krystal"]]);
});

// ─── Places and organisations that look like names ───────────────────────────────────────────────

Deno.test("Jordan the place and Jordan the person: 'in Jordan' links no one; 'with Jordan' and 'Jordan is…' are the friend", () => {
  const place = run(input("Ben spent a week in Jordan", [BEN, JORDAN]), [item({ person: "p3", person_mention: "Ben", statement: "Ben spent a week in Jordan", evidence: ["Ben spent a week in Jordan"] })]);
  eq(place.items.map((i) => [i.person_id, i.with_person_ids ?? []]), [["ben", []]]);
  const friend = run(input("Ben went hiking with Jordan", [BEN, JORDAN]), [item({ person: "p3", person_mention: "Ben", statement: "Ben went hiking with Jordan", evidence: ["Ben went hiking with Jordan"] })]);
  eq(friend.items.map((i) => [i.person_id, i.with_person_ids ?? []]), [["ben", ["jordan"]]]);
  const subject = run(input("Jordan is moving to Paris", [BEN, JORDAN]), [item({ person: "p6", person_mention: "Jordan", statement: "Jordan is moving to Paris", evidence: ["Jordan is moving to Paris"] })]);
  eq(subject.items.map((i) => [i.person_id, i.new_person_name, i.with_person_ids ?? []]), [["jordan", null, []]]);
  noOneCalled(subject, "Paris");
  // "Apple" given as who it's about: a company, never someone new; the line is held for a yes about Ben, whom its
  // words lead with (as for any name the model didn't commit to, K7), never lost.
  const apple = run(input("Ben works at Apple now", [BEN]), [item({ person: "new", person_mention: "Apple", statement: "Ben works at Apple now", evidence: ["Ben works at Apple now"] })]);
  eq(apple.items.map((i) => [i.person_id, i.new_person_name, i.tier, i.subject_words]), [[null, null, "hold", "Ben"]]);
  noOneCalled(apple, "Apple");
});

Deno.test("someone the note leaves unnamed ('someone at work', 'a friend') is no one to file on: nothing kept, no dead-end question, never the page's person", () => {
  for (const [note, mention] of [
    ["Someone at work is having a baby.", "Someone at work"],
    ["Had coffee with a friend from college, she just moved to Austin.", "a friend"],
    ["A coworker of Ben's got promoted.", "A coworker"],
  ] as const) {
    for (const page of [null, "p3"]) {
      const asItem = run(input(note, [BEN], page), [item({ person: "new", person_mention: mention, statement: note.replace(/\.$/u, ""), evidence: [note.replace(/\.$/u, "")] })]);
      eq([asItem.items.length, asItem.tier, asItem.dropped.map((d) => d.reason), asItem.clarification], [0, "nothing", ["no_one_named"], null], `${note} (page ${page})`);
      // The live shape for such a note: the model keeps nothing and asks about the words (adv-033 in the approved baseline).
      const asked = run(input(note, [BEN], page), [], { about: "person", mention });
      eq([asked.items.length, asked.tier, asked.clarification], [0, "nothing", null], `${note} asked (page ${page})`);
    }
  }
  // A named person beside them is still theirs: "Ben and a coworker went to lunch" is Ben's.
  const ben = run(input("Ben and a coworker went to lunch", [BEN]), [item({ person: "p3", person_mention: "Ben", statement: "Ben and a coworker went to lunch", evidence: ["Ben and a coworker went to lunch"] })]);
  eq(ben.items.map((i) => [i.person_id, i.tier]), [["ben", "auto"]]);
});

// ─── voice.ts units ──────────────────────────────────────────────────────────────────────────────

Deno.test("voice.ts: leadingName refuses everyday words and pairs; asName capitalises; withSubject prepends only for an elided start", () => {
  eq(leadingName("Has been very clingy to your wife Krystal"), null);
  eq(leadingName("Keeps everyone up"), null);
  eq(leadingName("You and Ben are skiing"), null);
  eq(leadingName("Ben and Sam went climbing"), null);
  eq(leadingName("John is your brother"), "John");
  eq(leadingName("Chris' dog died"), "Chris");
  eq(asName("pedro"), "Pedro");
  eq(asName("sean o'connor"), "Sean O'connor");
  eq(asName("Kaiya"), "Kaiya");
  eq(neverAName("has"), true);
  eq(neverAName("Will"), false, "a word that is also a name is left to the note's own words");
  eq(withSubject("Has been very clingy to your wife Krystal", "Kaiya", ["Kaiya"]), "Kaiya has been very clingy to your wife Krystal");
  eq(withSubject("Kaiya has been very clingy", "Kaiya", ["Kaiya"]), "Kaiya has been very clingy", "already named");
  eq(withSubject("You told Kaiya a story", "Kaiya", ["Kaiya"]), "You told Kaiya a story", "'You' is a subject");
  eq(withSubject("His mom is visiting", "Kaiya", ["Kaiya"]), "His mom is visiting", "'His' is a subject");
  eq(withSubject("Fusses at the sitter", "Kaiya", ["Kaiya"]), "Fusses at the sitter", "a verb the list lacks is left to the pipeline's own reading");
  eq(withSubject("Fusses at the sitter", "Kaiya", ["Kaiya"], (w) => w === "Fusses"), "Kaiya fusses at the sitter");
  eq(statementNames("Kaiya's mom is visiting", ["Kaiya"]), true);
});
