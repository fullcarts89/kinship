// The review in human words (plan §8; D1.4; stabilization Gate D): one
// consistent Kept card for whatever was kept, a sheet only when something
// needs the user ("One thing to check", and why), and one question at a time
// whose choices are the user's own people. No system vocabulary, ever.
import { answersFor, buildReview, COPY, type ReviewInput, type ReviewView } from "@/features/tell/reviewModel";
import { dayLabel, provenanceLine, whenLabel } from "@/features/memory/format";
import type { HeldItem } from "@/store/gateway";
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
    capture_id: "c1", state, answer: null, notice: null, attempts: 0, next_at: null, seen_at: null, understood_at: null, shown_at: null,
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

it("someone new, with no real date for a health event: two questions, one answer per item", () => {
  const h = held({ kind: "event", new_person_name: "Maya", statement: "Maya has surgery", sensitivity: "health",
    flags: ["new_person", "date_unresolved_sensitive", "sensitive"], spans: [{ start: 0, end: 16, quote: "Maya has surgery" }] });
  const v = view("Maya has surgery sometime soon.", row("review", { tier: "clarify", held: [h], settled: false, review_created_at: "t" }));
  expect(v.questions.map((q) => [q.type, q.prompt])).toEqual([["new_person", "Is Maya someone new?"], ["date", "When is it?"]]);
  expect(v.questions[0].choices.map((c) => c.label)).toEqual(["Add Maya", "Someone already here"]);
  expect(v.questions[1].choices.map((c) => c.label)).toEqual(["Pick a date", "No date"]);
  expect(answersFor(v.questions, { q0: { new_person: true } })).toBeNull();
  expect(answersFor(v.questions, { q0: { new_person: true }, q1: { date: null } })).toEqual([{ index: 0, new_person: true, date: null }]);
  expect(answersFor(v.questions, { q0: "skip", q1: { date: "2026-10-15" } })).toEqual([{ index: 0, skip: true }]);
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
  // Understood, nothing to remember: said, never silence.
  expect(view(note, row("done", { tier: "nothing", saved: [], held: [] }))).toMatchObject({
    mode: "nothing", status: "Nothing to remember in that one. Your note is saved." });
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

  it("a note told from someone's page is about them until it's understood: \"About Ben\", and it belongs on Ben's page", () => {
    const sam = held({ statement: "He wants to go back in December", flags: ["pronoun_multiple"],
      spans: [{ start: 28, end: 59, quote: "He wants to go back in December" }] });
    const john = person("john", "John");
    const v = buildReview({
      row: row("review", { tier: "clarify", held: [sam], settled: false, review_created_at: "t" }),
      capture: { id: "c1", raw_text: "Ben and John went to Tahoe. He wants to go back in December.", context_person_id: "ben", status: "needs_review" },
      items: [], people: [BEN, john], related: [], offline: false, today: TODAY,
    });
    expect(v.heading).toBe("About Ben");
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
