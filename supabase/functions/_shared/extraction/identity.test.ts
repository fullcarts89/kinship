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
  // A lead in lower case that the note writes neither as a name nor as a word ("will", the model never referring to
  // it) is neither: never saved on Ben as his (review of #91), held with Ben offered so the user decides.
  const lower = run(input("ben said will is visiting friday", [BEN]), [item({ person: "p3", person_mention: "ben", statement: "Will is visiting Friday", evidence: ["will is visiting friday"], date_text: "friday" })]);
  eq(lower.items.map((i) => [i.person_id, i.new_person_name, i.tier, i.flags.includes("person_ambiguous"), i.candidate_ids]), [[null, null, "hold", true, ["ben"]]]);
  eq(lower.clarification?.question, "Who is this about?");
  // But a continuation clause's own first word ("…and works at apple") is that clause's verb, never such a lead.
  const verb = run(input("ben is settling in well in paris and works at apple", [BEN]), [item({ person: "p3", person_mention: "ben", statement: "Works at Apple", evidence: ["works at apple"] })]);
  eq(verb.items.map(shape), [["ben", null, "auto", "Ben works at Apple"]]);
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
  // Two people with the same display name and no label are told apart by their full names (review of #91).
  eq([out.items[0].person_id, out.items[0].tier, out.clarification], [null, "hold", { about: "person", question: "Which Sam do you mean?", options: ["Sam Lee", "Samantha Diaz", "Someone else"] }]);
  const voice = run(input("sam is moving to denver", [SAM_LEE, SAM_DIAZ, BEN]), [item({ person: "p7", person_mention: "sam", statement: "Sam is moving to Denver", evidence: ["sam is moving to denver"] })]);
  eq(voice.clarification?.options, ["Sam Lee", "Samantha Diaz", "Someone else"]);
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

// ─── Review of #91: a real name is never voided into a word; an unnamed someone never drops a named line ────────

Deno.test("review 1: a name the note also uses as a word elsewhere is still a name (Will, Hope, May at a sentence start; voice 'maya')", () => {
  for (const page of [null, "p3"]) {
    for (const [note, name] of [
      ["Will is visiting Friday. He will stay with us.", "Will"],
      ["Hope is coming Friday. I hope she stays the weekend.", "Hope"],
      ["May is visiting next week, she may stay a while", "May"],
      ["Grace is coming Friday. Say grace before dinner.", "Grace"],
    ] as const) {
      const out = run(input(note, [BEN], page), [item({ person: "new", person_mention: name, statement: `${name} is visiting Friday`, evidence: [note.split(/[.,]/u)[0]] })]);
      eq(out.items.map((i) => [i.person_id, i.new_person_name, i.tier]), [[null, name, "hold"]], `${note} (page ${page})`);
      eq(out.clarification?.question, `Is ${name} someone new?`, note);
    }
    for (const [note, quote] of [["i told ben maya is coming friday", "maya is coming friday"], ["ben told me that maya got engaged", "maya got engaged"]] as const) {
      const out = run(input(note, [BEN], page), [item({ person: "new", person_mention: "maya", statement: "Maya is coming Friday", evidence: [quote] })]);
      eq(out.items.map((i) => [i.person_id, i.new_person_name, i.tier]), [[null, "Maya", "hold"]], `${note} (page ${page})`);
      ok(!out.items.some((i) => i.person_id === "ben"), `never Ben's: ${note}`);
    }
  }
});

Deno.test("review 2: someone unnamed in a line the model filed on a person its sentence names is theirs, for a glance; unnamed alone keeps nothing", () => {
  for (const page of [null, "p3"]) {
    const told = run(input("Someone at work told Ben he's getting promoted", [BEN], page), [item({ person: "p3", person_mention: "Someone at work", statement: "Ben is getting promoted", evidence: ["Someone at work told Ben he's getting promoted"] })]);
    eq(told.items.map((i) => [i.person_id, i.tier, i.flags.includes("subject_moved")]), [["ben", "confirm", true]], `told (page ${page})`);
    const friend = run(input("Ben said a friend of his is getting married", [BEN], page), [item({ person: "p3", person_mention: "a friend", statement: "A friend of Ben's is getting married", evidence: ["a friend of his is getting married"] })]);
    eq(friend.items.map((i) => [i.person_id, i.tier]), [["ben", "confirm"]], `friend (page ${page})`);
    const coworker = run(input("A coworker of Ben's got promoted", [BEN], page), [item({ person: "p3", person_mention: "A coworker", subject: "related", related_relation: "coworker", related_name: null, statement: "Ben's coworker got promoted", evidence: ["A coworker of Ben's got promoted"] })]);
    eq(coworker.items.map((i) => [i.person_id, i.subject_type]), [["ben", "related"]], `coworker (page ${page})`);
    const cake = run(input("Everyone at the party loved Ben's cake", [BEN], page), [item({ person: "p3", person_mention: "Everyone", statement: "Everyone loved Ben's cake", evidence: ["Everyone at the party loved Ben's cake"] })]);
    eq(cake.items.map((i) => i.person_id), ["ben"], `cake (page ${page})`);
    const baby = run(input("Someone at work is having a baby.", [BEN], page), [item({ person: "new", person_mention: "Someone at work", statement: "Someone at work is having a baby", evidence: ["Someone at work is having a baby"] })]);
    eq([baby.items.length, baby.dropped.map((d) => d.reason)], [0, ["no_one_named"]], `baby (page ${page})`);
  }
});

Deno.test("review 4: a subject-less sentence after one about a person follows that person, named in front; after two, it is asked", () => {
  for (const [person, mention] of [["p3", "Ben"], ["unknown", null]] as const) {
    const out = run(input("Ben came over. Has been sore all week.", [BEN, WILL]), [item({ person, person_mention: mention, statement: "Has been sore all week", evidence: ["Has been sore all week"] })]);
    eq(out.items.map(shape), [["ben", null, person === "unknown" ? "auto" : "auto", "Ben has been sore all week"]], `${person}/${mention}`);
  }
  const two = run(input("Ben and Will came over. Has been sore all week.", [BEN, WILL]), [item({ person: "unknown", person_mention: null, statement: "Has been sore all week", evidence: ["Has been sore all week"] })]);
  eq([two.items[0].person_id, two.items[0].tier, two.items[0].candidate_ids], [null, "hold", ["ben", "will"]]);
});

// ─── CMR-1 round 2: pronouns grounded by the sentence; spoken forms; promises; relatives ──────────────────────

const MOM = person("p30", "mom", "Mom", { full_name: "Dolores Hart", relationship_label: "mother" });
const DAD = person("p31", "dad", "Dad", { full_name: "Raymond Hart", relationship_label: "father" });
const SEUN = person("p32", "seun", "Seun", { full_name: "Oluwaseun Adebayo", relationship_label: "college friend" });
const PRIYANKA = person("p33", "priyanka", "Priyanka", { full_name: "Priyanka Raman", relationship_label: "best friend" });
const HYUNWOO = person("p34", "hyunwoo", "Hyun-woo", { full_name: "Hyun-woo Park", relationship_label: "climbing partner" });
const MATEO_N = person("p35", "mateo-n", "Mateo", { full_name: "Mateo Vargas", relationship_label: "neighbor" });
const MATEO_C = person("p36", "mateo-c", "Mateo", { full_name: "Mateo Lindgren", relationship_label: "coworker" });
const TOMASZ = person("p37", "tomasz", "Tomasz", { full_name: "Tomasz Nowak", relationship_label: "client" });
const AUSTIN = person("p38", "austin", "Austin", { full_name: "Austin Reyes", relationship_label: "neighbor" });
const MERCY = person("p39", "mercy", "Mercy", { full_name: "Mercy Achieng", relationship_label: "coworker" });
const AMARA = person("p40", "amara", "Amara", { full_name: "Amara Nwosu", relationship_label: "mentor" });
const INGRID = person("p41", "ingrid", "Ingrid", { full_name: "Ingrid Solberg", relationship_label: "friend" });
const PARIS = person("p42", "paris", "Paris", { full_name: "Paris Okafor", relationship_label: "friend from yoga" });
const MARK = person("p43", "mark", "Mark", { full_name: "Mark Hart", relationship_label: "brother" });

Deno.test("pronouns: a gender the user's relationship words give rules a candidate out ('Dad says she isn't sleeping' is Mom)", () => {
  const note = "Mom's biopsy results come back Thursday. She's trying to stay calm but Dad says she isn't sleeping.";
  const out = run(input(note, [MOM, DAD], "p30"), [item({ person: "p30", person_mention: "she", statement: "Mom isn't sleeping, Dad says", evidence: ["Dad says she isn't sleeping"], sensitivity: "health" })]);
  eq(out.items.map((i) => [i.person_id, i.flags.includes("pronoun_multiple")]), [["mom", false]]);
  eq(out.clarification, null);
  // The same with no page.
  const general = run(input(note, [MOM, DAD]), [item({ person: "p30", person_mention: "she", statement: "Mom isn't sleeping, Dad says", evidence: ["Dad says she isn't sleeping"], sensitivity: "health" })]);
  eq(general.items.map((i) => i.person_id), ["mom"]);
});

Deno.test("pronouns: the person named nearest as a subject grounds 'he' across sentences; an object or a pair does not", () => {
  const note = "so i had the long overdue dinner with seun and priyanka last night. seun is doing ok considering, he said the first few weeks after his dad were a blur. priyanka has news too, she got the senior counsel role. um she also mentioned her knee is acting up again.";
  const out = run(input(note, [SEUN, PRIYANKA]), [
    item({ person: "p32", person_mention: "he", statement: "The first few weeks after Seun's dad were a blur", evidence: ["the first few weeks after his dad were a blur"] }),
    item({ person: "p33", person_mention: "she", statement: "Priyanka got the senior counsel role", evidence: ["she got the senior counsel role"] }),
    item({ person: "p33", person_mention: "her", statement: "Priyanka's knee is acting up again", evidence: ["her knee is acting up again"], sensitivity: "health" }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.tier === "hold"]), [["seun", false], ["priyanka", false], ["priyanka", false]]);
  eq(out.clarification, null);
  // The model's other candidate is asked about beside the grounded one, never followed alone.
  const wrong = run(input(note, [SEUN, PRIYANKA]), [item({ person: "p33", person_mention: "he", statement: "The first few weeks after Priyanka's dad were a blur", evidence: ["the first few weeks after his dad were a blur"] })]);
  eq([wrong.items[0].tier, wrong.items[0].candidate_ids], ["hold", ["seun", "priyanka"]]);
  // Genuine ambiguity still asks: the nearest name is an object, or one of a pair (J1, K30 kept).
  const told = run(input("Ben told Will he's moving to Austin.", [BEN, WILL]), [item({ kind: "event", person: "p3", person_mention: "he", statement: "Ben is moving to Austin", evidence: ["he's moving to Austin"] })]);
  eq([told.items[0].tier, told.items[0].candidate_ids], ["hold", ["ben", "will"]]);
  const pair = run(input("Ben and Will went climbing. He fell.", [BEN, WILL]), [item({ person: "p3", person_mention: "He", statement: "Ben fell", evidence: ["He fell"] })]);
  eq([pair.items[0].tier, pair.items[0].candidate_ids], ["hold", ["ben", "will"]]);
  // "Lars more than anyone though; he's not sleeping" is Lars; "Paris was lovely, Ingrid says. She…" is Ingrid, never the friend Paris.
  const lars = person("p44", "lars", "Lars", { relationship_label: "coworker" });
  const felipe = person("p45", "felipe", "Felipe", { relationship_label: "coworker" });
  const stressed = run(input("Lars is stressed about the migration. Felipe is stressed about the migration too. Lars more than anyone though; he's not sleeping.", [lars, felipe]), [item({ person: "p44", person_mention: "he's", statement: "Lars is not sleeping", evidence: ["he's not sleeping"] })]);
  eq(stressed.items.map((i) => [i.person_id, i.tier === "hold"]), [["lars", false]]);
  const ingrid = run(input("Paris was lovely, Ingrid says. She and Sofie did the Musée d'Orsay twice.", [INGRID, PARIS]), [item({ kind: "moment", person: "p41", person_mention: "She", statement: "Ingrid and Sofie did the Musée d'Orsay twice", evidence: ["She and Sofie did the Musée d'Orsay twice"] })]);
  eq(ingrid.items.map((i) => [i.person_id, i.tier === "hold"]), [["ingrid", false]]);
  eq(ingrid.clarification, null);
});

Deno.test("pronouns: two Mateos, told on one Mateo's page: the page settles the name, so 'He' is him, no question", () => {
  const out = run(input("Mateo handed in his notice today. He's going freelance in the new year.", [MATEO_N, MATEO_C], "p36"), [
    item({ person: "p36", person_mention: "Mateo", statement: "Mateo handed in his notice today", evidence: ["Mateo handed in his notice today"] }),
    item({ kind: "event", person: "p36", person_mention: "He", statement: "Mateo is going freelance in the new year", evidence: ["He's going freelance in the new year"], date_text: "in the new year" }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.tier === "hold"]), [["mateo-c", false], ["mateo-c", false]]);
  eq(out.clarification, null);
});

Deno.test("pronouns: a 'he' with no one in People before it rides the new person the model named ('Ravi got the job… He starts in two weeks')", () => {
  const note = "Ravi got the job at the hospital. He starts in two weeks.";
  const out = run(input(note, []), [
    item({ person: "new", person_mention: "Ravi", statement: "Ravi got the job at the hospital", evidence: ["Ravi got the job at the hospital"] }),
    item({ kind: "event", person: "new", person_mention: "He", statement: "Ravi starts in two weeks", evidence: ["He starts in two weeks"], date_text: "in two weeks" }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.new_person_name, i.tier]), [[null, "Ravi", "hold"], [null, "Ravi", "hold"]]);
  eq(out.clarification?.question, "Is Ravi someone new?");
  const boston = run(input("Oyelaran from the gym is running Boston in April. Said she'd love company on long runs.", [MOM, DAD]), [
    item({ kind: "event", person: "new", person_mention: "Oyelaran", statement: "Oyelaran from the gym is running Boston in April", evidence: ["Oyelaran from the gym is running Boston in April"], date_text: "in April" }),
    item({ person: "new", person_mention: "she", statement: "Oyelaran said she'd love company on long runs", evidence: ["Said she'd love company on long runs"] }),
  ]);
  eq(boston.items.map((i) => [i.new_person_name, i.tier]), [["Oyelaran", "hold"], ["Oyelaran", "hold"]], "a race and a sentence-initial 'Said' are no one else");
});

Deno.test("spoken forms: 'shes'/'hes' are the pronoun, 'moms'/'noors' the possessive, 'hyun woo' is Hyun-woo", () => {
  const shes = run(input("amara's husband had a stroke on monday he's stable now shes at the hospital most days", [AMARA]), [item({ person: "p40", person_mention: "shes", statement: "Amara is at the hospital most days", evidence: ["shes at the hospital most days"] })]);
  eq(shes.items.map((i) => [i.person_id, i.new_person_name, i.tier === "hold"]), [["amara", null, false]]);
  noOneCalled(shes, "Shes");
  const hes = run(input("exit chat with tomasz today he said the move came together fast and hes doing drinks on the twenty sixth", [TOMASZ]), [item({ kind: "event", person: "p37", person_mention: "hes", statement: "Tomasz is doing drinks on the twenty sixth", evidence: ["hes doing drinks on the twenty sixth"] })]);
  eq(hes.items.map((i) => [i.person_id, i.new_person_name]), [["tomasz", null]]);
  noOneCalled(hes, "Hes");
  const moms = run(input("moms seventieth is coming up on the fourteenth of december grace wants to do a surprise lunch", [MOM, DAD], "p30"), [item({ kind: "event", person: "p30", person_mention: "moms", statement: "Mom's seventieth is coming up on the fourteenth of December", evidence: ["moms seventieth is coming up on the fourteenth of december"] })]);
  eq(moms.items.map((i) => [i.person_id, i.new_person_name, i.tier === "hold"]), [["mom", null, false]]);
  noOneCalled(moms, "Moms");
  const noors = run(input("noors birthday is the second of january she said she never does anything for it", [person("p46", "noor", "Noor", { full_name: "Noor Haddad" })], "p46"), [item({ person: "p46", person_mention: "noors", statement: "Noor's birthday is the second of January", evidence: ["noors birthday is the second of january"] })]);
  eq(noors.items.map((i) => [i.person_id, i.new_person_name, i.tier === "hold"]), [["noor", null, false]]);
  noOneCalled(noors, "Noors");
  const hyun = run(input("ok so hyun woo and i are climbing at the gym thursday", [HYUNWOO]), [item({ kind: "event", subject: "shared", person: "p34", person_mention: "hyun woo", statement: "You and Hyun-woo are climbing at the gym Thursday", evidence: ["hyun woo and i are climbing at the gym thursday"], date_text: "thursday" })]);
  // "Thursday" leaves the words once the day is kept (Gate F temporal), as for any line.
  eq(hyun.items.map((i) => [i.person_id, i.new_person_name, i.tier === "hold", i.statement]), [["hyunwoo", null, false, "You and Hyun-woo are climbing at the gym"]]);
  const him = run(input("Hyun-woo's lending me his crash pad for the Bishop trip, and I owe him a belay session in return before Christmas.", [HYUNWOO], "p34"), [item({ kind: "promise", subject: "user", person: "p34", person_mention: "him", statement: "You owe Hyun-woo a belay session in return before Christmas", evidence: ["I owe him a belay session in return before Christmas"], date_text: "before Christmas" })]);
  eq(him.items.map((i) => [i.person_id, i.tier === "hold"]), [["hyunwoo", false]], "a 'climbing partner' is not a wife: 'him' is him");
});

Deno.test("K27 in a story: a known pet named as a line's lead never becomes someone new ('biscuit is getting old mark says he struggles with the stairs')", () => {
  const related = [{ key: "r1", id: "rel-biscuit", person_key: "p43", relation: "dog", name: "Biscuit" }];
  const note = "biscuit is getting old mark says he struggles with the stairs now and they might get him a ramp";
  const out = run(input(note, [MARK, MOM], null, { related }), [
    item({ person: "p43", person_mention: "biscuit", statement: "Biscuit is getting old", evidence: ["biscuit is getting old"] }),
    item({ person: "p43", person_mention: "he", statement: "Biscuit struggles with the stairs now", evidence: ["he struggles with the stairs now"] }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.new_person_name, i.tier === "hold"]), [["mark", null, false], ["mark", null, false]]);
  noOneCalled(out, "Biscuit");
});

Deno.test("relatives: a relation named elsewhere in the sentence is no candidate for a line plainly about the person or the user", () => {
  const shower = run(input("Mercy's baby shower is on the 28th. The team is pitching in for the stroller she picked.", [MERCY]), [item({ kind: "event", person: "p39", person_mention: "Mercy's", statement: "Mercy's baby shower is on the 28th", evidence: ["Mercy's baby shower is on the 28th"], date_text: "the 28th" })]);
  eq(shower.items.map((i) => [i.person_id, i.flags.includes("subject_check")]), [["mercy", false]], "a baby shower names an occasion, not a baby");
  const seun = "seun's dad passed away on sunday the funeral is next saturday in houston he's flying out tomorrow i want to send flowers";
  const flying = run(input(seun, [SEUN]), [
    item({ kind: "event", person: "p32", person_mention: "he's", statement: "Seun is flying out tomorrow", evidence: ["he's flying out tomorrow"], date_text: "tomorrow" }),
    item({ kind: "promise", subject: "user", person: "p32", person_mention: null, statement: "You want to send flowers", evidence: ["i want to send flowers"] }),
  ]);
  eq(flying.items.map((i) => [i.person_id, i.flags.includes("subject_check")]), [["seun", false], ["seun", false]]);
  // The line's own words say it: still asked.
  const sister = run(input("Sarah's sister has surgery Thursday", [SARAH]), [item({ kind: "event", person: "p9", person_mention: "Sarah's", statement: "Sarah has surgery Thursday", evidence: ["has surgery Thursday"], date_text: "Thursday", sensitivity: "health" })]);
  eq(sister.items.map((i) => i.flags.includes("subject_check")), [true]);
});

Deno.test("promises: the user's own note to self without 'I'; someone's offer to the user; a request not yet accepted", () => {
  const promised = run(input("Promised Tomasz the revised proposal by Wednesday.", [TOMASZ], "p37"), [item({ kind: "promise", subject: "user", person: "p37", person_mention: "Tomasz", statement: "You promised Tomasz the revised proposal by Wednesday", evidence: ["Promised Tomasz the revised proposal by Wednesday"], date_text: "by Wednesday" })]);
  eq(promised.items.map((i) => [i.kind, i.subject_type, i.tier === "hold"]), [["promise", "user", false]]);
  eq(promised.clarification, null);
  const owe = run(input("Still owe Tomasz the revised proposal, due Wednesday.", [TOMASZ]), [item({ kind: "promise", subject: "user", person: "p37", person_mention: "Tomasz", statement: "You still owe Tomasz the revised proposal", evidence: ["Still owe Tomasz the revised proposal, due Wednesday"], date_text: "Wednesday" })]);
  eq(owe.items.map((i) => [i.subject_type, i.tier === "hold"]), [["user", false]]);
  const offered = run(input("Ran into Austin at the farmers market. He's growing dahlias now and offered to split some tubers with me in spring.", [AUSTIN]), [item({ kind: "promise", person: "p38", person_mention: "He", statement: "Austin offered to split some tubers with you in spring", evidence: ["offered to split some tubers with me in spring"], date_text: "in spring" })]);
  eq(offered.items.map((i) => [i.person_id, i.subject_type, i.tier === "hold"]), [["austin", "person", false]], "their offer to you is their promise");
  const cake = run(input("Toby turns seven on November 21. Grace is doing a dinosaur party at the park and asked if I can bring the cake.", [person("p47", "grace", "Grace", { relationship_label: "sister" })]), [item({ kind: "promise", subject: "user", person: "p47", person_mention: "Grace", statement: "Grace asked if you can bring the cake", evidence: ["asked if I can bring the cake"] })]);
  eq(cake.items.map((i) => [i.tier, i.flags.includes("promise_owner")]), [["hold", true]], "a request not yet accepted: whose promise is asked (J11)");
  eq(cake.clarification, null, "the app asks 'Whose promise?' itself; never 'When is it?'");
  const accepted = run(input("jordan asked if i'd help with the slideshow which fine", [JORDAN]), [item({ kind: "promise", subject: "user", person: "p6", person_mention: "jordan", statement: "You'll help Jordan with the slideshow", evidence: ["jordan asked if i'd help with the slideshow which fine"] })]);
  eq(accepted.items.map((i) => [i.subject_type, i.tier === "hold"]), [["user", false]], "accepted ('which fine'): the user's promise");
});

Deno.test("places: 'Johns Hopkins' after 'at' is a place, not someone else before a subject-less sentence", () => {
  const florence = person("p48", "florence", "Florence", { full_name: "Florence Mensah", relationship_label: "cousin" });
  const out = run(input("Florence Mensah got into the residency at Johns Hopkins. Starts July.", [florence]), [item({ kind: "event", person: "p48", person_mention: null, statement: "Florence starts July", evidence: ["Starts July"], date_text: "July" })]);
  eq(out.items.map((i) => [i.person_id, i.tier === "hold"]), [["florence", false]]);
});

// ─── Review of #91, round 2 ──────────────────────────────────────────────────────────────────────

Deno.test("r2-1: the nearest subject grounds a pronoun only when the model chose them too; the model's 'unknown' between two people is asked, nearest first", () => {
  const SAM = person("p50", "sam", "Sam");
  for (const [note, roster, quote] of [
    ["Ben said Sam got the job. He's thrilled for him.", [BEN, SAM], "He's thrilled for him"],
    ["Priya called. Raj is sick. She's worried.", [person("p51", "priya", "Priya"), person("p52", "raj", "Raj")], "She's worried"],
    ["Ben thinks Sam is overworked. He wants to talk to him.", [BEN, SAM], "He wants to talk to him"],
  ] as const) {
    const out = run(input(note, [...roster]), [item({ person: "unknown", person_mention: quote.split(/['’\s]/u)[0], statement: quote.replace(/['’]s/u, " is"), evidence: [quote] })]);
    eq([out.items[0].person_id, out.items[0].tier, (out.items[0].candidate_ids ?? []).length], [null, "hold", 2], note);
    eq(out.items[0].candidate_ids?.[0], roster[1].id, `${note}: the nearest subject is offered first`);
  }
  // The model chose the nearest subject: grounded, no question.
  const chosen = run(input("Ben said Sam got the job. He's thrilled for him.", [BEN, SAM]), [item({ person: "p50", person_mention: "He", statement: "Sam is thrilled", evidence: ["He's thrilled for him"] })]);
  eq(chosen.items.map((i) => [i.person_id, i.tier === "hold"]), [["sam", false]]);
  // One person before it: still them, whatever the model said.
  const maya = person("p53", "maya", "Maya");
  const garden = run(input("Maya visited her mom. She loved the garden.", [maya, BEN]), [item({ person: "p53", person_mention: "She", statement: "Maya loved the garden", evidence: ["She loved the garden"] })]);
  eq(garden.items.map((i) => [i.person_id, i.tier === "hold"]), [["maya", false]]);
});

Deno.test("r2-2: a relationship label's head word says the gender, never its possessor ('sister's boyfriend' is a man)", () => {
  const benSbf = { ...BEN, relationship_label: "sister's boyfriend" };
  const out = run(input("Ben and Will went climbing. He fell.", [benSbf, WILL]), [item({ person: "p4", person_mention: "He", statement: "Will fell", evidence: ["He fell"] })]);
  // A pair: still asked with both offered (a pronoun hold keeps the model's person until the answer, as J1 does); never a confirm save on Will.
  eq([out.items[0].tier, out.items[0].flags.includes("pronoun_multiple"), out.items[0].candidate_ids], ["hold", true, ["ben", "will"]], "a pair: still asked, Ben not ruled out");
  const rose = person("p54", "rose", "Rose", { relationship_label: "mom's friend" });
  const wine = run(input("Rose and Will came by. He brought wine.", [rose, WILL]), [item({ person: "p4", person_mention: "He", statement: "Will brought wine", evidence: ["He brought wine"] })]);
  eq([wine.items[0].tier, wine.items[0].flags.includes("pronoun_multiple"), wine.items[0].candidate_ids], ["hold", true, ["rose", "will"]], "'mom's friend' says nothing about Rose");
  const nana = person("p55", "nana", "Nana");
  const guy = person("p56", "guy", "Guy");
  // "Nana" says she is a woman when the label is silent; "Guy" says nothing to code, so "She" after the pair is still asked,
  // while "He" can only be Guy.
  const pie = run(input("Guy and Nana visited. She made pie.", [guy, nana]), [item({ person: "p55", person_mention: "She", statement: "Nana made pie", evidence: ["She made pie"] })]);
  eq([pie.items[0].tier, pie.items[0].candidate_ids], ["hold", ["guy", "nana"]]);
  const fence = run(input("Guy and Nana visited. He fixed the fence.", [guy, nana]), [item({ person: "p56", person_mention: "He", statement: "Guy fixed the fence", evidence: ["He fixed the fence"] })]);
  eq(fence.items.map((i) => [i.person_id, i.tier === "hold"]), [["guy", false]]);
});

Deno.test("r2-3: a pronoun clause right after the relative's clause may be the relative's: asked (product judgement, founder to confirm); not after a death", () => {
  for (const [note, statement, sensitivity] of [
    ["Sarah's sister got engaged, she's over the moon", "Sarah is over the moon", "none"],
    ["Sarah's sister has surgery Friday, she's nervous", "Sarah is nervous", "health"],
    ["Sarah's sister has surgery Friday. She's nervous.", "Sarah is nervous", "health"],
    ["Sarah's sister got engaged and she's over the moon", "Sarah is over the moon", "none"],
  ] as const) {
    const quote = note.match(/[Ss]he['’]s [a-z ]+/u)![0].replace(/\.$/u, "");
    const out = run(input(note, [SARAH]), [item({ person: "p9", person_mention: quote.split(/['’]/u)[0], statement, evidence: [quote], sensitivity })]);
    eq([out.items[0].person_id, out.items[0].flags.includes("subject_check"), out.items[0].tier], ["sarah", true, "hold"], note);
    eq(out.clarification?.question, "Is this about Sarah, or Sarah's sister?", note);
  }
  // A brother is never "she".
  const brother = run(input("Sarah's brother got engaged, she's over the moon", [SARAH]), [item({ person: "p9", person_mention: "she", statement: "Sarah is over the moon", evidence: ["she's over the moon"] })]);
  eq(brother.items.map((i) => [i.person_id, i.flags.includes("subject_check")]), [["sarah", false]]);
  // Founder, 15 Nov 2026: a relative who has died is still someone the user talks about; no blanket rule. The model's
  // filing on the living person stands for a glance only when the clause's action is plainly a living person's
  // (a future time word, travel: "he's flying out tomorrow"); without such a cue it is asked, never guessed.
  const seun = run(input("seun's dad passed away on sunday the funeral is next saturday in houston he's flying out tomorrow", [SEUN]), [item({ kind: "event", person: "p32", person_mention: "he's", statement: "Seun is flying out tomorrow", evidence: ["he's flying out tomorrow"], date_text: "tomorrow" })]);
  eq(seun.items.map((i) => [i.person_id, i.tier, i.flags.includes("subject_check"), i.flags.includes("subject_after_loss")]), [["seun", "confirm", false, true]]);
  eq(seun.clarification, null);
  const ok = run(input("seun's dad passed away on sunday, he's doing ok considering", [SEUN]), [item({ person: "p32", person_mention: "he's", statement: "Seun is doing ok considering", evidence: ["he's doing ok considering"] })]);
  eq([ok.items[0].person_id, ok.items[0].tier, ok.items[0].flags.includes("subject_check")], ["seun", "hold", true], "no cue: asked");
  eq(ok.clarification?.question, "Is this about Seun, or Seun's dad?");
  // "Grandma passed away in March. She loved her garden.": she is Grandma, no question.
  const grandma = person("p63", "grandma", "Grandma", { full_name: "Rose Hart", relationship_label: "grandmother" });
  const garden = run(input("Grandma passed away in March. She loved her garden.", [grandma, BEN]), [item({ person: "p63", person_mention: "She", statement: "Grandma loved her garden", evidence: ["She loved her garden"] })]);
  eq(garden.items.map((i) => [i.person_id, i.tier === "hold", i.flags.includes("subject_check")]), [["grandma", false, false]]);
  eq(garden.clarification, null);
  // The same about a person's relative, filed as the model read it (Mom's mother, a related line): kept as filed, no question.
  const mother = run(input("Mom's mother passed away in March. She loved her garden.", [MOM]), [item({ person: "p30", person_mention: "She", subject: "related", related_relation: "mother", related_name: null, statement: "Mom's mother loved her garden", evidence: ["She loved her garden"] })]);
  eq(mother.items.map((i) => [i.person_id, i.subject_type, i.tier === "hold"]), [["mom", "related", false]]);
});

Deno.test("r2-4: a companion whose name someone in People also goes by is asked, never moved to the namesake (K27); a lower-case voice note still files on the owner", () => {
  const MAX_FRIEND = person("p57", "max", "Max", { relationship_label: "friend" });
  const related = [{ key: "r1", id: "rel-max", person_key: "p43", relation: "dog", name: "Max" }];
  const note = "max is getting old mark says he struggles with the stairs";
  const both = run(input(note, [MARK, MAX_FRIEND], null, { related }), [item({ person: "p43", person_mention: "he", statement: "Max struggles with the stairs", evidence: ["he struggles with the stairs"] })]);
  eq([both.items[0].person_id, both.items[0].tier, both.items[0].flags.includes("person_disagreement"), both.items[0].candidate_ids], [null, "hold", true, ["mark", "max"]]);
  const alone = run(input(note, [MARK], null, { related }), [item({ person: "p43", person_mention: "he", statement: "Max struggles with the stairs", evidence: ["he struggles with the stairs"] })]);
  eq(alone.items.map((i) => [i.person_id, i.new_person_name, i.tier === "hold"]), [["mark", null, false]]);
  eq(alone.clarification, null);
});

Deno.test("r2-5: a hyphenated name's first word is not that name ('Mary' with Mary and Mary-Kate is Mary); said aloud without the hyphen it is still found", () => {
  const MARY = person("p58", "mary", "Mary");
  const MARYKATE = person("p59", "mary-kate", "Mary-Kate");
  const mary = run(input("Mary is visiting Friday", [MARY, MARYKATE]), [item({ kind: "event", person: "p58", person_mention: "Mary", statement: "Mary is visiting Friday", evidence: ["Mary is visiting Friday"], date_text: "Friday" })]);
  eq(mary.items.map((i) => [i.person_id, i.tier === "hold"]), [["mary", false]]);
  const mk = run(input("Mary-Kate is visiting Friday", [MARY, MARYKATE]), [item({ kind: "event", person: "p59", person_mention: "Mary-Kate", statement: "Mary-Kate is visiting Friday", evidence: ["Mary-Kate is visiting Friday"], date_text: "Friday" })]);
  eq(mk.items.map((i) => [i.person_id, i.tier === "hold"]), [["mary-kate", false]]);
  const spoken = run(input("mary kate is visiting friday", [MARY, MARYKATE]), [item({ kind: "event", person: "p59", person_mention: "mary kate", statement: "Mary-Kate is visiting Friday", evidence: ["mary kate is visiting friday"], date_text: "friday" })]);
  eq(spoken.items.map((i) => [i.person_id, i.tier === "hold"]), [["mary-kate", false]]);
  const jean = run(input("Jean got the job", [person("p60", "jean", "Jean"), person("p61", "jean-luc", "Jean-Luc")]), [item({ person: "p60", person_mention: "Jean", statement: "Jean got the job", evidence: ["Jean got the job"] })]);
  eq(jean.items.map((i) => [i.person_id, i.tier === "hold"]), [["jean", false]]);
});

Deno.test("r3: nothing is kept between requests: a hyphenated name in one call never changes how a space-named person is read in the next", () => {
  // Call 1: Hyun-woo Park, said aloud without the hyphen.
  const first = run(input("ok so hyun woo and i are climbing at the gym thursday", [HYUNWOO]), [item({ kind: "event", subject: "shared", person: "p34", person_mention: "hyun woo", statement: "You and Hyun-woo are climbing at the gym Thursday", evidence: ["hyun woo and i are climbing at the gym thursday"], date_text: "thursday" })]);
  eq(first.items.map((i) => i.person_id), ["hyunwoo"]);
  // Call 2, another account: someone literally named "Hyun woo Park" (a space), named by first name before "He".
  const spaced = person("p62", "hyun-space", "Hyun woo Park", { full_name: "Hyun woo Park" });
  const second = run(input("Hyun called yesterday. He got the job.", [spaced, BEN]), [item({ person: "p62", person_mention: "He", statement: "Hyun got the job", evidence: ["He got the job"] })]);
  eq(second.items.map((i) => [i.person_id, i.tier === "hold"]), [["hyun-space", false]], "his first name still names him");
  // And the other way round: the space-named person first, then the hyphenated one.
  const third = run(input("ok so hyun woo and i are climbing at the gym thursday", [HYUNWOO]), [item({ kind: "event", subject: "shared", person: "p34", person_mention: "hyun woo", statement: "You and Hyun-woo are climbing at the gym Thursday", evidence: ["hyun woo and i are climbing at the gym thursday"], date_text: "thursday" })]);
  eq(third.items.map((i) => i.person_id), ["hyunwoo"]);
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
