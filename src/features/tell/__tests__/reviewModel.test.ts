// The review in human words (plan §8; D1.4; stabilization Gate D): one
// consistent Kept card for whatever was kept, a sheet only when something
// needs the user ("One thing to check", and why), and one question at a time
// whose choices are the user's own people. No system vocabulary, ever.
import { answersFor, buildReview, COPY, openQuestions, type ReviewInput, type ReviewView } from "@/features/tell/reviewModel";
import { dayLabel, provenanceLine, whenLabel } from "@/features/memory/format";
import type { HeldAnswer, HeldItem } from "@/store/gateway";
import type { MemoryItem, Person } from "@/store/repositories";
import type { Reading, UnderstandingRow } from "@/store/understanding";

const TODAY = "2026-10-08";
const person = (id: string, display_name: string, extra: Partial<Person> = {}): Person =>
  ({ id, display_name, state: "active", birthday: null, birthday_source: null, version: 1, ...extra }) as Person;
const BEN = person("ben", "Ben");
const LEE = person("lee", "Sam", { relationship_label: "neighbor" });
const DIAZ = person("diaz", "Sam", { relationship_label: "climbing" });
const SARAH = person("sarah", "Sarah");

function row(state: UnderstandingRow["state"], reading: Partial<Reading> | null, extra: Partial<UnderstandingRow> = {}): UnderstandingRow {
  return {
    capture_id: "c1", state, answer: null, notice: null, attempts: 0, next_at: null, seen_at: null, understood_at: null, shown_at: null, first_request_at: null, request_at: null, server_ms: null, retries: null,
    created_at: "2026-10-08T21:14:00.000Z", updated_at: "2026-10-08T21:14:00.000Z",
    reading: reading ? { tier: "auto", saved: [], held: [], clarification: null, review_created_at: null, settled: true, ...reading } : null,
    ...extra,
  };
}

function item(id: string, over: Partial<MemoryItem>): MemoryItem {
  return {
    id, kind: "fact", person_id: "ben", statement: "x", detail: {}, certainty: "stated", status: "active",
    user_state: "unreviewed", subject_type: "person", subject_related_id: null, origin: "extracted", ...over,
  } as MemoryItem;
}

function held(over: Partial<HeldItem>): HeldItem {
  return {
    kind: "thread", person_id: null, new_person_name: null, subject_type: "person", related: null, statement: "x",
    detail: {}, certainty: "stated", sensitivity: "none", tier: "hold", flags: [], spans: [{ start: 0, end: 1, quote: "x" }], ...over,
  };
}

function view(note: string, r: UnderstandingRow, items: MemoryItem[] = [], people: Person[] = [BEN, LEE, DIAZ, SARAH], extra: Partial<ReviewInput> = {}): ReviewView {
  return buildReview({
    row: r, capture: { id: "c1", raw_text: note, context_person_id: null, status: "extracted" }, items, people,
    related: [], offline: false, today: TODAY, ...extra,
  });
}

const race = item("m1", {
  kind: "event", person_id: "ben", statement: "Ben runs Chicago Sunday",
  detail: { date: "2026-10-11", date_precision: "day", date_hint: "Sunday", event_type: "race", followup_policy: "after" },
});

it("Ben: everything clear, so the Kept card with Undo", () => {
  const v = view("Ben runs Chicago Sunday. He's hoping to break four hours.", row("review", { tier: "auto", saved: [{ id: "m1", tier: "auto" }] }), [race]);
  expect(v.mode).toBe("card");
  expect(v.heading).toBe("Kept for Ben");
  expect(v.summary).toBe("Kept: Ben runs Chicago Sunday · Sun, Oct 11");
  expect(v.canUndo).toBe(true);
  expect(v.lines[0]).toMatchObject({
    person: { id: "ben", label: "Ben", changeable: true },
    when: { label: "Sun, Oct 11", changeable: true },
    kind: { value: "event", label: "Something happening", changeable: true },
  });
});

it("two Sams: one question whose choices are the user's own Sams, told apart", () => {
  const sam = held({ statement: "Sam is redoing his kitchen", flags: ["person_ambiguous", "mid_confidence"],
    spans: [{ start: 0, end: 26, quote: "Sam is redoing his kitchen" }] });
  const v = view("Sam is redoing his kitchen.", row("review", { tier: "clarify", held: [sam], settled: false, review_created_at: "t" }));
  expect(v.mode).toBe("sheet");
  expect(v.heading).toBe("Your note"); // never "Kept" before anything is
  expect(v.lines).toEqual([]); // nothing is remembered yet
  expect(v.questions).toHaveLength(1);
  const [q] = v.questions;
  expect(q.prompt).toBe("Which Sam do you mean?");
  expect(q.reason).toBe("You have more than one Sam.");
  expect(q.about).toEqual(["Sam is redoing his kitchen"]);
  expect(q.choices.map((c) => c.label)).toEqual(["Sam (neighbor)", "Sam (climbing)", "Someone else"]);
  expect(q.skip.label).toBe("Don't keep this");
  const lee = q.choices[0];
  expect(answersFor(v.questions, {})).toBeNull();
  expect(answersFor(v.questions, { [q.key]: "answer" in lee ? lee.answer : {} })).toEqual([{ index: 0, person_id: "lee" }]);
  expect(answersFor(v.questions, { [q.key]: "skip" })).toEqual([{ index: 0, skip: true }]);
});

it("two items about the same Sam are one question", () => {
  const a = held({ statement: "Sam is redoing his kitchen", flags: ["person_ambiguous"], spans: [{ start: 0, end: 26, quote: "Sam is redoing his kitchen" }] });
  const b = held({ statement: "Sam got a new dog", flags: ["person_ambiguous"], spans: [{ start: 28, end: 45, quote: "Sam got a new dog" }] });
  const v = view("Sam is redoing his kitchen. Sam got a new dog.", row("review", { tier: "clarify", held: [a, b], settled: false, review_created_at: "t" }));
  expect(v.questions).toHaveLength(1);
  expect(v.questions[0].items).toEqual([0, 1]);
  expect(answersFor(v.questions, { q0: { person_id: "diaz" } })).toEqual([{ index: 0, person_id: "diaz" }, { index: 1, person_id: "diaz" }]);
});

it("Sarah or her sister: the relation offered is only ever the user's own word", () => {
  const note = "Sarah's sister has surgery Thursday.";
  const h = held({ kind: "event", person_id: "sarah", statement: "Sarah's sister has surgery Thursday", flags: ["subject_check", "sensitive"],
    spans: [{ start: 0, end: 35, quote: "Sarah's sister has surgery Thursday" }] });
  const asked = { about: "subject" as const, question: "Is this about Sarah, or Sarah's sister?", options: ["Sarah", "Sarah's sister"] };
  const v = view(note, row("review", { tier: "clarify", held: [h], clarification: asked, settled: false, review_created_at: "t" }));
  expect(v.questions[0].prompt).toBe("Is this about Sarah, or Sarah's sister?");
  expect(v.questions[0].choices.map((c) => ("answer" in c ? c.answer : c.pick))).toEqual([
    { subject: "person" }, { subject: "related", relation: "sister" }]);
  // "family" is the gateway's fallback word: not in the note, so not offered.
  const vague = view("Sarah has surgery Thursday.", row("review", {
    tier: "clarify", held: [h], settled: false, review_created_at: "t",
    clarification: { about: "subject", question: "Is this about Sarah, or Sarah's family?", options: ["Sarah", "Sarah's family"] },
  }));
  expect(vague.questions[0].choices.map((c) => c.label)).toEqual(["Yes, Sarah"]);
});

it("someone new, with no real date for a health event: three questions, one answer per item", () => {
  const h = held({ kind: "event", new_person_name: "Maya", statement: "Maya has surgery", sensitivity: "health",
    flags: ["new_person", "date_unresolved_sensitive", "sensitive"], spans: [{ start: 0, end: 16, quote: "Maya has surgery" }] });
  const v = view("Maya has surgery sometime soon.", row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }));
  expect(v.questions.map((q) => [q.type, q.prompt])).toEqual([["new_person", "Who is Maya?"], ["date", "When is it?"], ["keep", "Remember this?"]]);
  expect(v.questions[0].choices.map((c) => c.label)).toEqual(["Choose from Contacts", "Add Maya", "Someone already here"]);
  expect(v.questions[1].choices.map((c) => c.label)).toEqual(["Pick a date", "No date"]);
  expect(answersFor(v.questions, { q0: { new_person: true } })).toBeNull();
  expect(answersFor(v.questions, { q0: { new_person: true }, q1: { date: null } })).toBeNull();
  expect(answersFor(v.questions, { q0: { new_person: true }, q1: { date: null }, q2: {} })).toEqual([{ index: 0, new_person: true, date: null, accept: true }]);
  expect(answersFor(v.questions, { q0: "skip", q1: { date: "2026-10-15" }, q2: {} })).toEqual([{ index: 0, skip: true }]);
});

describe("a sensitive line: no other question is the yes (founder, 5 Nov 2026)", () => {
  const anna = person("anna", "Anna");
  const known = { person_id: "anna", statement: "Anna's sister has surgery", sensitivity: "health" as const, spans: [{ start: 0, end: 25, quote: "Anna's sister has surgery" }] };
  const earlier = [{ id: "m-old", statement: "Anna's sister is waiting on results" }];
  const cases: [string, Partial<HeldItem>, string, Omit<HeldAnswer, "index">][] = [
    ["date", { ...known, kind: "event", flags: ["date_unresolved_sensitive", "sensitive"] }, "Remember this about Anna?", { date: null }],
    ["about_whom", { ...known, kind: "event", flags: ["subject_check", "sensitive"] }, "Remember this?", { subject: "person" }],
    ["owner", { ...known, kind: "promise", flags: ["promise_owner", "sensitive"] }, "Remember this about Anna?", { owner: "user" }],
    ["replace", { ...known, kind: "fact", detail: { _replaces: earlier }, flags: ["update_check", "sensitive"] }, "Remember this about Anna?", { replaces: null }],
    ["residence", { ...known, kind: "fact", flags: ["residence_conflict", "sensitive"], still_in: { target_id: "alameda", words: "Alameda", stay: "facet" } }, "Remember this about Anna?", { moved: false }],
  ];
  const sheet = (h: HeldItem) => view("Anna's sister has surgery.", row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }), [], [anna, BEN]);

  it.each(cases)("%s, then 'Remember this?'; nothing is answered until the yes", (type, over, prompt, answer) => {
    const v = sheet(held(over));
    expect(v.questions.map((q) => [q.type, q.type === "keep" ? q.prompt : null])).toEqual([[type, null], ["keep", prompt]]);
    expect(v.questions[1].reason).toBe("This sounds personal, so I keep it only if you say so.");
    expect(answersFor(v.questions, { q0: answer })).toBeNull();
    expect(answersFor(v.questions, { q0: answer, q1: {} })).toEqual([{ index: 0, ...answer, accept: true }]);
    expect(answersFor(v.questions, { q0: "skip", q1: {} })).toEqual([{ index: 0, skip: true }]);
  });

  it.each(cases)("%s declined: 'Remember this?' isn't asked as well, whichever came first", (_type, over) => {
    const { questions } = sheet(held(over));
    expect(openQuestions(questions, { q0: "skip" })).toEqual([]);
    expect(answersFor(questions, { q0: "skip" })).toEqual([{ index: 0, skip: true }]);
    expect(openQuestions(questions, { q1: "skip" })).toEqual([]);
    expect(answersFor(questions, { q1: "skip" })).toEqual([{ index: 0, skip: true }]);
  });

  it("two lines: declining one leaves the other's questions, and only its own go", () => {
    const one = held({ ...cases[0][1], statement: "Anna has surgery", spans: [{ start: 0, end: 16, quote: "Anna has surgery" }] });
    const two = held({ ...cases[0][1], statement: "Anna's mom is visiting", spans: [{ start: 20, end: 42, quote: "Anna's mom is visiting" }] });
    const { questions } = view("Anna has surgery and Anna's mom is visiting.", row("review", { tier: "clarify", held: [one, two], settled: false, review_created_at: "t" }), [], [anna, BEN]);
    expect(questions.map((q) => [q.type, q.items])).toEqual([["date", [0]], ["date", [1]], ["keep", [0]], ["keep", [1]]]);
    const declined = { q1: "skip" as const };
    expect(openQuestions(questions, declined).map((q) => q.key)).toEqual(["q0", "q2"]);
    expect(answersFor(questions, declined)).toBeNull();
    expect(answersFor(questions, { ...declined, q0: { date: null }, q2: {} })).toEqual([{ index: 0, date: null, accept: true }, { index: 1, skip: true }]);
  });

  it("'Not sure' about one name in a line doesn't decline the line", () => {
    const sams = [person("s1", "Sam Lee"), person("s2", "Sam Diaz")];
    const h = held({ ...known, kind: "fact", flags: ["sensitive", "participant_ambiguous"], open_names: [{ text: "Sam", candidate_ids: ["s1", "s2"] }] });
    const { questions } = view("Anna's sister has surgery.", row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }), [], [anna, ...sams]);
    expect(questions.map((q) => q.type)).toEqual(["which_person", "keep"]);
    expect(openQuestions(questions, { q0: "skip" }).map((q) => q.type)).toEqual(["keep"]);
    expect(answersFor(questions, { q0: "skip" })).toBeNull();
    expect(answersFor(questions, { q0: "skip", q1: {} })).toEqual([{ index: 0, accept: true }]);
  });

  it.each(cases)("%s on a line that isn't waiting for a yes is still the one question", (type, over) => {
    const v = sheet(held({ ...over, sensitivity: "none", flags: over.flags!.filter((f) => f !== "sensitive") }));
    expect(v.questions.map((q) => q.type)).toEqual([type]);
  });
});

it("a light confirmation is the same Kept card (one contract); corrections show as the user's", () => {
  const ana = person("ana", "Ana");
  const lisbon = item("m2", { person_id: "ana", statement: "Ana might move to Lisbon", detail: { category: "home" }, user_state: "edited" });
  const v = view("Ana mentioned she might move to Lisbon.", row("review", { tier: "confirm", saved: [{ id: "m2", tier: "confirm" }], settled: false }), [lisbon], [ana]);
  expect(v.mode).toBe("card");
  expect(v.heading).toBe("Kept for Ana");
  expect(v.lines[0]).toMatchObject({ edited: true, when: null, kind: { label: "Something true" } });
});

it("says plainly what's happening: understanding, offline, kept, answering, changed elsewhere", () => {
  const note = "Ben runs Chicago Sunday.";
  expect(view(note, row("waiting", null)).status).toBe(COPY.understanding);
  expect(view(note, row("waiting", null), [], [BEN], { offline: true }).status).toBe("I'll understand this when you're online.");
  expect(view(note, row("waiting", null, { attempts: 2 })).status).toBe("Couldn't understand this yet. Your note is saved, and I'll try again.");
  expect(view(note, row("kept", null))).toMatchObject({ mode: "asWritten", status: "Kept as you wrote it." });
  expect(view(note, row("failed", null))).toMatchObject({ mode: "failed", status: "Couldn't understand this one. Your note is saved." });
  // Understood, no line kept: the note is kept on the page of whoever it names, in the user's words
  // (founder, 10 Nov 2026: every Tell is logged).
  expect(view(note, row("done", { tier: "nothing", saved: [], held: [] }))).toMatchObject({
    mode: "nothing", status: "Kept on Ben's page.", words: note, personIds: ["ben"] });
  const answering = view(note, row("answering", { tier: "clarify", held: [held({})], settled: false }), [], [BEN], { offline: true });
  expect(answering).toMatchObject({ mode: "sheet", answering: true, status: "I'll save your answer when you're online.", questions: [] });
  expect(view(note, row("review", { settled: true }, { notice: "changed_elsewhere" }), [race]).notice).toBe("This changed on another device.");
  expect(view(note, row("done", { settled: true, saved: [{ id: "m1", tier: "auto" }] }), [race]).mode).toBe("none");
});

it("never shows system vocabulary: tiers, scores, models, guards, tables or states", () => {
  const sam = held({ statement: "Sam is redoing his kitchen", flags: ["person_ambiguous", "mid_confidence"], spans: [{ start: 0, end: 26, quote: "Sam is redoing his kitchen" }] });
  const views = [
    view("Ben runs Chicago Sunday.", row("review", { tier: "auto", saved: [{ id: "m1", tier: "auto" }] }), [race]),
    view("Ben runs Chicago Sunday.", row("review", { tier: "confirm", saved: [{ id: "m1", tier: "confirm" }], settled: false }), [race]),
    view("Sam is redoing his kitchen.", row("review", { tier: "clarify", held: [sam], settled: false, review_created_at: "t" })),
    view("Sam is redoing his kitchen.", row("review", { tier: "unknown", held: [sam], settled: false }, { notice: "choose_again" })),
    view("x", row("waiting", null), [], [], { offline: true }),
    view("x", row("kept", null)),
  ];
  const strings: string[] = [];
  const collect = (v: unknown): void => {
    if (typeof v === "string") strings.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) if (!["id", "key", "value", "mode", "type"].includes(k)) collect(x);
    }
  };
  views.forEach(collect);
  expect(strings.length).toBeGreaterThan(20);
  for (const s of strings) {
    expect(s).not.toMatch(/\b(tier|auto|confirm\w*|hold|held|confidence|score|model|flag|guard|extract\w*|capture|pending|needs_review|unreviewed|status|subject|database|table|null|undefined|NaN)\b|0\.\d/i);
  }
});

describe("dates and sources in the user's terms", () => {
  it("shows a date only as precisely as it was said", () => {
    expect(dayLabel("2026-10-11", TODAY)).toBe("Sun, Oct 11");
    expect(dayLabel("2027-01-02", TODAY)).toBe("Sat, Jan 2, 2027");
    expect(whenLabel("event", { date: "2026-10-12", date_end: "2026-10-18", date_precision: "week" }, TODAY)).toBe("Week of Oct 12");
    expect(whenLabel("milestone", { date: "2024-01-01", date_end: "2024-12-31", date_precision: "year", date_hint: "in 2024" }, TODAY)).toBe("2024");
    expect(whenLabel("fact", { category: "home", date: "2026-09-01", date_end: "2026-09-30", date_precision: "month" }, TODAY)).toBe("September");
    expect(whenLabel("event", { event_type: "surgery", followup_policy: "both", date_precision: "unknown", date_hint: "next week sometime" }, TODAY))
      .toBe("“next week sometime”");
    expect(whenLabel("event", { event_type: "surgery", followup_policy: "both", date_precision: "unknown" }, TODAY)).toBe("No date yet");
    expect(whenLabel("plan", { firmness: "idea", when_hint: "this summer" }, TODAY)).toBe("“this summer”");
    expect(whenLabel("promise", { due_date: "2026-10-09" }, TODAY)).toBe("By Fri, Oct 9");
    expect(whenLabel("thread", { topic: "kitchen", followup_after_days: 42 }, TODAY)).toBeNull();
  });

  it("says where a memory came from", () => {
    const now = new Date("2026-10-09T12:00:00");
    const note = (created_at: string) => ({ source_kind: "capture", capture_id: "c", created_at });
    expect(provenanceLine([note("2026-10-08T21:14:00")], now)).toBe("You told Kinship · Oct 8");
    expect(provenanceLine([note("2026-09-29T10:00:00"), note("2026-10-08T21:14:00"), note("2026-10-01T09:00:00")], now))
      .toBe("You told Kinship · Oct 8 · and 2 other notes");
    expect(provenanceLine([note("2026-09-29T10:00:00"), { source_kind: "user_edit", capture_id: null, created_at: "2026-10-03T08:00:00" }], now))
      .toBe("Edited by you · Oct 3 · from your note, Sep 29");
    expect(provenanceLine([{ source_kind: "contacts", capture_id: null, created_at: "2026-10-03T08:00:00" }], now)).toBe("From Contacts");
  });
});

it("a sensitive reading waits for the user's yes: one question, their own words, who and when", () => {
  const h = held({ kind: "event", person_id: "sarah", statement: "Sarah has surgery Thursday", sensitivity: "health", tier: "confirm",
    flags: ["sensitive"], detail: { event_type: "surgery", followup_policy: "both", date: "2026-10-15", date_precision: "day" },
    spans: [{ start: 0, end: 26, quote: "Sarah has surgery Thursday" }] });
  const v = view("Sarah has surgery Thursday.", row("review", { tier: "confirm", held: [h], settled: false, review_created_at: "t" }));
  expect(v.mode).toBe("sheet");
  expect(v.lines).toEqual([]); // not shown as remembered
  expect(v.heading).toBe("Your note");
  const [q] = v.questions;
  expect([q.type, q.prompt, q.about, q.detail]).toEqual(["keep", "Remember this about Sarah?", ["Sarah has surgery Thursday"], "Sarah · Thu, Oct 15"]);
  expect(q.reason).toBe("This sounds personal, so I keep it only if you say so.");
  expect(q.choices.map((c) => c.label)).toEqual(["Remember"]);
  expect(answersFor(v.questions, {})).toBeNull();
  expect(answersFor(v.questions, { q0: {} })).toEqual([{ index: 0, accept: true }]);
  expect(answersFor(v.questions, { q0: "skip" })).toEqual([{ index: 0, skip: true }]);
});

it("a sensitive line and which Sam: who first, then the user's yes, never the name of a guess", () => {
  const h = held({ kind: "fact", person_id: "lee", statement: "Sam's dad has surgery next Friday", sensitivity: "health",
    flags: ["person_ambiguous", "sensitive"], spans: [{ start: 0, end: 32, quote: "Sam's dad has surgery next Friday" }] });
  const v = view("Sam's dad has surgery next Friday.", row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }));
  expect(v.questions.map((q) => [q.type, q.prompt, q.skip.label])).toEqual([
    ["which_person", "Which Sam do you mean?", "Don't keep this"], ["keep", "Remember this?", "Don't keep this"],
  ]);
  expect(v.questions[1].reason).toBe("This sounds personal, so I keep it only if you say so.");
  expect(v.questions[1].detail).toBeNull();
  expect(answersFor(v.questions, { q0: { person_id: "lee" } })).toBeNull();
  expect(answersFor(v.questions, { q0: { person_id: "lee" }, q1: {} })).toEqual([{ index: 0, person_id: "lee", accept: true }]);
  expect(answersFor(v.questions, { q0: { person_id: "lee" }, q1: "skip" })).toEqual([{ index: 0, skip: true }]);
  // A line that isn't waiting for a yes is still one question.
  const plain = view("Sam is redoing his kitchen.", row("review", { tier: "clarify", held: [held({ flags: ["person_ambiguous"] })], settled: false, review_created_at: "t" }));
  expect(plain.questions.map((q) => q.type)).toEqual(["which_person"]);
});

it("an ambiguous day: Remember, or pick the right day", () => {
  const h = held({ kind: "event", person_id: "ben", statement: "Ben runs Chicago Sunday", tier: "confirm", flags: ["date_ambiguous"],
    detail: { event_type: "race", followup_policy: "after", date: "2026-10-11", date_precision: "day" },
    spans: [{ start: 0, end: 23, quote: "Ben runs Chicago Sunday" }] });
  const v = view("Ben runs Chicago Sunday.", row("review", { tier: "confirm", held: [h], settled: false, review_created_at: "t" }));
  expect(v.questions[0].choices.map((c) => c.label)).toEqual(["Remember", "A different day"]);
  expect(answersFor(v.questions, { q0: { date: "2026-10-18" } })).toEqual([{ index: 0, accept: true, date: "2026-10-18" }]);
});

describe("stabilization Gate A/D: a view over the note, never blank, never \"Kept\" early", () => {
  it("what the reading saved but hasn't reached the phone yet is still understanding, never nothing", () => {
    const r = row("review", { tier: "clarify", saved: [{ id: "m9", tier: "confirm" }], settled: true, answered: [{ index: 0, person_id: "lee" }] });
    const v = view("Sam is redoing his kitchen.", r, [], [BEN, LEE, DIAZ], { missing: 1 });
    expect(v.mode).toBe("understanding");
    expect(v.status).toBe(COPY.understanding);
  });

  it("after an answer, what it kept is the card: \"Kept for Sam\"", () => {
    const kitchen = item("m9", { person_id: "lee", statement: "Sam is redoing his kitchen" });
    const r = row("review", { tier: "clarify", saved: [{ id: "m9", tier: "confirm" }], settled: true, answered: [{ index: 0, person_id: "lee" }] });
    const v = view("Sam is redoing his kitchen.", r, [kitchen], [BEN, LEE, DIAZ]);
    expect(v.mode).toBe("card");
    expect(v.heading).toBe("Kept for Sam (neighbor)");
  });

  it("a note told from someone's page isn't named for them before it's understood (H24): \"Your note\", still shown on Ben's page", () => {
    const sam = held({ statement: "He wants to go back in December", flags: ["pronoun_multiple"],
      spans: [{ start: 28, end: 59, quote: "He wants to go back in December" }] });
    const john = person("john", "John");
    const v = buildReview({
      row: row("review", { tier: "clarify", held: [sam], settled: false, review_created_at: "t" }),
      capture: { id: "c1", raw_text: "Ben and John went to Tahoe. He wants to go back in December.", context_person_id: "ben", status: "needs_review" },
      items: [], people: [BEN, john], related: [], offline: false, today: TODAY,
    });
    expect(v.heading).toBe("Your note");
    expect(v.personIds).toEqual(expect.arrayContaining(["ben", "john"]));
  });

  it("an unclear \"he\": quotes the sentence, and offers Ben, John, Both", () => {
    const john = person("john", "John");
    const h = held({ kind: "plan", statement: "He wants to go back to Tahoe in December", flags: ["pronoun_multiple"],
      spans: [{ start: 28, end: 59, quote: "He wants to go back in December" }] });
    const v = view("Ben and John went to Tahoe. He wants to go back in December.",
      row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }), [], [BEN, john]);
    const [q] = v.questions;
    expect(q.prompt).toBe("Who is “he”?");
    expect(q.about).toEqual(["He wants to go back in December"]);
    expect(q.choices.map((c) => c.label)).toEqual(["Ben", "John", "Both", "Someone else"]);
    const both = q.choices.find((c) => c.key === "both");
    expect(both && "answer" in both ? both.answer : null).toEqual({ person_id: "ben", also_person_ids: ["john"] });
  });

  it("someone the note names who isn't in People (\"my daughter Kaiya\") is offered by name", () => {
    const h = held({ kind: "tradition", statement: "You and your daughter Kaiya watch Spirited Away every Christmas", flags: [],
      spans: [{ start: 0, end: 49, quote: "Every Christmas, Kaiya and I watch Spirited Away" }] });
    const v = view("Every Christmas, Kaiya and I watch Spirited Away.",
      row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }), [], [BEN, SARAH]);
    const [q] = v.questions;
    expect(q.reason).toBe("Kaiya isn't in your people yet.");
    expect(q.choices.map((c) => c.label)).toEqual(["Add Kaiya", "Someone else"]);
    const add = q.choices[0];
    expect("answer" in add ? add.answer : null).toEqual({ new_person: true, new_person_name: "Kaiya" });
  });
});

it("I5: a memory shared by several people names them all: 'Kept for Susan Oxnard and Michelle Lee'", () => {
  const susan = person("susan", "Susan Oxnard");
  const michelle = person("michelle", "Michelle Lee");
  const trip = item("m9", { person_id: "susan", with_person_ids: ["michelle"], statement: "Susan and Michelle went to Disneyland", kind: "event", detail: { event_type: "trip" } });
  const v = view("Susan and Michelle went to Disneyland.", row("review", { tier: "auto", saved: [{ id: "m9", tier: "auto" }], settled: true }), [trip], [susan, michelle]);
  expect(v.mode).toBe("card");
  expect(v.heading).toBe("Kept for Susan Oxnard and Michelle Lee");
  // One person: as before.
  const solo = item("m10", { person_id: "susan", statement: "Susan went to Disneyland", kind: "event", detail: { event_type: "trip" } });
  expect(view("Susan went to Disneyland.", row("review", { tier: "auto", saved: [{ id: "m10", tier: "auto" }], settled: true }), [solo], [susan, michelle]).heading)
    .toBe("Kept for Susan Oxnard");
});

it("I11: a line whose own words name several people can be about all of them; a line naming one stays a single choice", () => {
  const susan = person("susan", "Susan Oxnard", { full_name: "Susan Oxnard" });
  const michelle = person("michelle", "Michelle Lee", { full_name: "Michelle Lee" });
  const trip = item("m11", { person_id: "susan", statement: "Susan and Michelle went to Disneyland", kind: "event", detail: { event_type: "trip" } });
  const v = view("Susan and Michelle went to Disneyland.", row("review", { tier: "auto", saved: [{ id: "m11", tier: "auto" }], settled: true }), [trip], [susan, michelle, BEN]);
  expect(v.lines[0].named).toEqual(["susan", "michelle"]);
  expect(v.lines[0].alsoIds).toEqual([]);
  const solo = item("m12", { person_id: "susan", statement: "Susan went to Disneyland", kind: "event", detail: { event_type: "trip" } });
  const one = view("Susan went to Disneyland.", row("review", { tier: "auto", saved: [{ id: "m12", tier: "auto" }], settled: true }), [solo], [susan, michelle, BEN]);
  expect(one.lines[0].named).toBeUndefined();
});

it("I3: a name that fits someone here and someone removed asks which, offering the removed one back; never 'Add'", () => {
  const kaiya2 = person("kaiya-2", "Kaiya", { relationship_label: "niece" });
  const removed = person("kaiya", "Kaiya", { relationship_label: "daughter", state: "archived" });
  const h = held({ statement: "Kaiya lost her first tooth", flags: ["person_ambiguous"], mention: "Kaiya", archived_ids: ["kaiya"],
    spans: [{ start: 0, end: 26, quote: "Kaiya lost her first tooth" }] });
  const v = view("Kaiya lost her first tooth.", row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }), [], [kaiya2, removed, BEN]);
  const q = v.questions[0];
  expect(q.prompt).toBe("Which Kaiya do you mean?");
  expect(q.choices.map((c) => c.label)).toEqual(["Kaiya (niece)", "Bring back Kaiya (daughter)", "Someone else"]);
  expect(q.choices[1]).toMatchObject({ answer: { person_id: "kaiya" }, restore: "kaiya" });
});

describe("J4: never 'nothing' for a memory Kinship couldn't place", () => {
  const raise = held({ kind: "fact", new_person_name: "Wifey", statement: "Wifey got a raise", flags: ["new_person", "own_words"],
    spans: [{ start: 0, end: 17, quote: "Wifey got a raise" }] });
  const asking = row("review", { tier: "clarify", held: [raise], settled: false, review_created_at: "t" });

  it("someone not in People: 'Who is Wifey?', with Add Wifey, anyone already here, and Don't keep this", () => {
    const v = view("Wifey got a raise.", asking);
    expect(v.mode).toBe("sheet");
    const [q] = v.questions;
    expect([q.prompt, q.reason, q.about]).toEqual(["Who is Wifey?", "Wifey isn't in your people yet.", ["Wifey got a raise"]]);
    expect(q.choices.map((c) => c.label)).toEqual(["Choose from Contacts", "Add Wifey", "Someone already here"]);
    expect(q.skip.label).toBe("Don't keep this");
  });

  it("told on someone's page: that person is offered first", () => {
    const loo = person("loo", "Loo Loo");
    const v = buildReview({
      row: asking, capture: { id: "c1", raw_text: "Wifey got a raise.", context_person_id: "loo", status: "extracted" },
      items: [], people: [loo, BEN], related: [], offline: false, today: TODAY,
    });
    const [q] = v.questions;
    expect(q.choices.map((c) => c.label)).toEqual(["Loo Loo", "Choose from Contacts", "Add Wifey", "Someone else"]);
    expect(q.choices[0]).toMatchObject({ answer: { person_id: "loo" } });
  });

  it("a note with nothing kept from it is still kept, in the user's words; the user's own 'Don't keep this' is 'Nothing kept'", () => {
    expect(view("testing", row("done", { tier: "nothing", saved: [], held: [] }))).toMatchObject({ status: "Kept your words.", words: "testing" });
    expect(COPY.nothing).not.toMatch(/saved/);
    const declined = view("Wifey got a raise.", row("review", { tier: "clarify", saved: [], held: [raise], settled: true, answered: [{ index: 0, skip: true }] }));
    expect([declined.mode, declined.status]).toEqual(["nothing", "Nothing kept from that one."]);
  });
});

describe("'Ben's cousin Zoe' with a Zoe in People: which one, never a guess", () => {
  const zoe = person("zoe", "Zoe", { full_name: "Zoe Kim" });
  const cousin = (over: Partial<HeldItem> = {}) => held({
    kind: "fact", person_id: "ben", subject_type: "related", related: { id: null, relation: "cousin", name: "Zoe" }, statement: "Zoe is moving to Denver",
    flags: ["person_disagreement"], candidate_ids: ["ben", "zoe"], spans: [{ start: 0, end: 36, quote: "Ben's cousin Zoe is moving to Denver" }], ...over,
  });
  const ask = (h: HeldItem, people: Person[]) =>
    view("Ben's cousin Zoe is moving to Denver.", row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }), [], people);

  it("what the words say, or the Zoe in People, by a name that tells them apart", () => {
    const [q] = ask(cousin(), [BEN, zoe]).questions;
    expect(q.prompt).toBe("Which Zoe do you mean?");
    expect(q.reason).toBe("You already have someone called Zoe.");
    expect(q.choices.map((c) => c.label)).toEqual(["Ben's cousin Zoe", "Zoe Kim", "Someone else"]);
    expect(q.choices.map((c) => ("answer" in c ? c.answer : null))).toEqual([{ person_id: "ben" }, { person_id: "zoe" }, null]);
  });

  it("with no full name to tell her by", () => {
    expect(ask(cousin(), [BEN, person("zoe", "Zoe")]).questions[0].choices[1].label).toBe("Zoe in your people");
  });

  it("a held relative without that doubt is asked as before", () => {
    const [q] = ask(cousin({ candidate_ids: undefined, flags: ["person_ambiguous"], related: { id: null, relation: "cousin", name: null } }), [BEN, zoe]).questions;
    expect(q.prompt).toBe("Who is this about?");
  });
});

describe("J1: 'Who is “he”?' offers exactly who it can mean", () => {
  const john = person("john", "John");
  const pedro = person("pedro", "Pedro");
  const susan = person("susan", "Susan Oxnard", { full_name: "Susan Oxnard" });
  const loves = (candidate_ids: string[]) => held({ kind: "fact", statement: "He loves Susan", flags: ["pronoun", "pronoun_multiple"], candidate_ids,
    spans: [{ start: 24, end: 38, quote: "He loves Susan" }] });

  it("the people named before 'he', then the page's person; never Susan, the one he loves", () => {
    const v = buildReview({
      row: row("review", { tier: "clarify", held: [loves(["john", "pedro"])], settled: false, review_created_at: "t" }),
      capture: { id: "c1", raw_text: "John visited yesterday. He loves Susan.", context_person_id: "pedro", status: "needs_review" },
      items: [], people: [john, pedro, susan], related: [], offline: false, today: TODAY,
    });
    const [q] = v.questions;
    expect(q.prompt).toBe("Who is “he”?");
    expect(q.choices.map((c) => c.label)).toEqual(["John", "Pedro", "Both", "Someone else"]);
  });

  it("no one it can mean (no page, no one named before it): only Choose who, never the object", () => {
    const h = held({ kind: "fact", statement: "He loves Susan", flags: ["pronoun", "person_ambiguous"], candidate_ids: [],
      spans: [{ start: 0, end: 14, quote: "He loves Susan" }] });
    const v = view("He loves Susan.", row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }), [], [john, pedro, susan]);
    const [q] = v.questions;
    expect(q.prompt).toBe("Who is “he”?");
    expect(q.choices.map((c) => c.label)).toEqual(["Choose who"]);
  });
});

describe("J11: 'Whose promise?' when a promise's owner is genuinely unclear", () => {
  const anna = person("anna", "Anna");
  const water = held({ kind: "promise", person_id: "anna", subject_type: "user", statement: "Anna asked you to water her plants while she's away", flags: ["promise_owner"],
    spans: [{ start: 0, end: 50, quote: "Anna asked me to water her plants while she's away" }] });

  it("asks whose it is, in the user's words, with Yours, Anna's and Don't keep this", () => {
    const v = view("Anna asked me to water her plants while she's away.", row("review", { tier: "clarify", held: [water], settled: false, review_created_at: "t" }), [], [anna, BEN]);
    const [q] = v.questions;
    expect([q.type, q.prompt, q.about]).toEqual(["owner", "Whose promise?", ["Anna asked you to water her plants while she's away"]]);
    expect(q.choices.map((c) => c.label)).toEqual(["Yours", "Anna's"]);
    expect(q.skip.label).toBe("Don't keep this");
    expect(answersFor(v.questions, { q0: { owner: "user" } })).toEqual([{ index: 0, owner: "user" }]);
  });
});

it("K4: a memory kept for several people names them in the order the line does, whoever it is filed on", () => {
  const anthony = person("at", "Anthony Test");
  const samEden = person("se", "Sam Eden");
  const chris = person("chris", "Chris");
  const note = "Anthony and Sam love ice skating with Chris";
  const line = item("m1", {
    person_id: "chris", with_person_ids: ["se", "at"], statement: note,
    person_mentions: [{ person_id: "chris", text: "Chris", name: "Chris" }, { person_id: "at", text: "Anthony", name: "Anthony Test" }, { person_id: "se", text: "Sam", name: "Sam Eden" }],
  });
  const v = view(note, row("review", { tier: "auto", saved: [{ id: "m1", tier: "auto" }] }), [line], [anthony, samEden, chris]);
  expect(v.heading).toBe("Kept for Anthony Test, Sam Eden and Chris");
});

describe("Phase 4B B3: the residence question (case E; founder CC-19, CC-24)", () => {
  const SUSAN = person("susan", "Susan Oxnard", { full_name: "Susan Oxnard" } as Partial<Person>);
  const moved = held({
    kind: "fact", person_id: "susan", statement: "Susan moved to California", detail: { category: "home" },
    flags: ["residence_conflict"], spans: [{ start: 0, end: 25, quote: "Susan moved to California" }],
    still_in: { target_id: "alameda", words: "Alameda", stay: "facet" },
  });
  const sheet = () => view("Susan moved to California.", row("review", { tier: "clarify", held: [moved], settled: false, review_created_at: "t" }),
    [], [SUSAN, BEN]);

  it("asks once, in the user's own words for both places, by name", () => {
    const v = sheet();
    expect(v.mode).toBe("sheet");
    expect(v.questions).toHaveLength(1);
    const [q] = v.questions;
    expect(q.type).toBe("residence");
    expect(q.prompt).toBe("Is Susan still in Alameda?");
    expect(q.reason).toBeNull();
    expect(q.about).toEqual(["Susan moved to California"]);
    expect(q.choices.map((c) => c.label)).toEqual(["Still there", "Susan moved"]);
    expect(q.skip.label).toBe("Don't keep this");
    // Never "Which Alameda?", never a pronoun, never a yes-question of its own.
    expect(JSON.stringify(v)).not.toMatch(/Which Alameda|She moved|He moved|They moved|Remember this/u);
  });

  it("each choice is the answer the gateway expects", () => {
    const [q] = sheet().questions;
    const pick = (key: string) => {
      const c = q.choices.find((x) => x.key === key)!;
      return answersFor([q], { [q.key]: "answer" in c ? c.answer : "skip" });
    };
    expect(pick("still")).toEqual([{ index: 0, moved: false }]);
    expect(pick("moved")).toEqual([{ index: 0, moved: true }]);
    expect(answersFor([q], { [q.key]: "skip" })).toEqual([{ index: 0, skip: true }]);
  });

  it("a line held for something else too is asked about that as well", () => {
    const both = held({ ...moved, flags: ["residence_conflict", "date_unresolved_sensitive"], kind: "event" });
    const v = view("Susan moved to California.", row("review", { tier: "clarify", held: [both], settled: false, review_created_at: "t" }), [], [SUSAN]);
    expect(v.questions.map((q) => q.type)).toEqual(["residence", "date"]);
  });
});

// CER-1 (31 Oct, WS-5's native journey): a told-again move against a line the user edited is held, and the
// user is asked whether it replaces that line; the answer is the line itself or "keep both".
it("a later note that updates the user's edited line asks 'Does this replace what you told me?', with that line and Keep both", () => {
  const edited = "Ben signed the lease on the apartment in Pilsen and moves in on November 22";
  const note = "Actually the Pilsen move slipped again, it's December 6 now.";
  const h = held({
    kind: "event", person_id: "ben", statement: "Ben's move to Pilsen slipped again; it's now December 6",
    detail: { date: "2026-12-06", date_precision: "day", event_type: "move", _replaces: [{ id: "m-edited", statement: edited }] },
    flags: ["protected_target", "update_check"], spans: [{ start: 9, end: 59, quote: note.slice(9, 59) }],
  });
  const v = view(note, row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }), [], undefined,
    { capture: { id: "c1", raw_text: note, context_person_id: "ben", status: "needs_review" } });
  const q = v.questions.find((x) => x.type === "replace")!;
  expect(q.prompt).toBe("Does this replace what you told me?");
  expect(q.choices.map((c) => [c.label, "answer" in c ? c.answer : null])).toEqual([[`Yes, replace: ${edited}`, { replaces: "m-edited" }], ["No, keep both", { replaces: null }]]);
  // The question quotes what the user said, never the statement's paraphrase.
  expect(q.about).toEqual([note.slice(9, 59)]);
  expect(v.questions.some((x) => /When is it/u.test(x.prompt))).toBe(false);
});

it("a told-again update from no page: 'Who is this about?' first with the candidate offered, then 'Does this replace what you told me?'; one answer carries both", () => {
  const edited = "Ben signed the lease on the apartment in Pilsen and moves in on November 22";
  const note = "Actually the Pilsen move slipped again, it's December 6 now.";
  const h = held({
    kind: "event", person_id: null, statement: "Ben's move to Pilsen slipped again; it's now December 6",
    detail: { date: "2026-12-06", date_precision: "day", event_type: "move", _replaces: [{ id: "m-edited", statement: edited }] },
    flags: ["person_ambiguous", "update_check", "protected_target"], candidate_ids: ["ben"], spans: [{ start: 9, end: 59, quote: note.slice(9, 59) }],
  });
  const v = view(note, row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }));
  expect(v.questions.map((q) => q.type)).toEqual(["which_person", "replace"]);
  const [who, replace] = v.questions;
  expect(who.prompt).toBe("Who is this about?");
  const ben = who.choices.find((c) => "answer" in c && c.answer.person_id === "ben")!;
  expect(ben).toBeTruthy();
  const yes = replace.choices.find((c) => "answer" in c && c.answer.replaces === "m-edited")!;
  expect(answersFor(v.questions, { [who.key]: "answer" in ben ? ben.answer : {} })).toBeNull();
  expect(answersFor(v.questions, { [who.key]: "answer" in ben ? ben.answer : {}, [replace.key]: "answer" in yes ? yes.answer : {} }))
    .toEqual([{ index: 0, person_id: "ben", replaces: "m-edited" }]);
});

describe("every Tell is logged (founder, 10 Nov 2026)", () => {
  const KAIYA = person("kaiya", "Kaiya", { relationship_label: "daughter" });
  const nothing = row("done", { tier: "nothing", saved: [], held: [] });
  const told = (note: string, context: string | null, people: Person[]) => buildReview({
    row: nothing, capture: { id: "c1", raw_text: note, context_person_id: context, status: "extracted" }, items: [], people,
    related: [], offline: false, today: TODAY,
  });

  it("told from someone's page: kept on their page, with the words, never 'Nothing to remember'", () => {
    const note = "She is the silliest little girl in the world and is very much into dressing up like princesses";
    const v = told(note, "kaiya", [BEN, KAIYA]);
    expect(v).toMatchObject({ mode: "nothing", status: "Kept on Kaiya's page.", words: note, personIds: ["kaiya"], canUndo: true });
    expect(JSON.stringify(v)).not.toMatch(/Nothing to remember/);
  });

  it("naming people in People: kept on each page, by their own names, any case", () => {
    expect(told("kaiya and ben were silly today", null, [BEN, KAIYA])).toMatchObject({ status: "Kept on Ben's and Kaiya's pages.", personIds: ["ben", "kaiya"] });
  });

  it("a name two people share places it on neither: never a guess", () => {
    expect(told("Sam was funny today", null, [BEN, LEE, DIAZ])).toMatchObject({ status: "Kept your words.", personIds: [] });
  });
});
