// Today (plan §13): one moment at most, chosen deterministically; silence is
// a valid answer; quiet lines are at most two, from different people; the
// return check is there as soon as the user is back, with its reason; copy is
// templates plus the user's own words.
import { buildToday, evidenceOf, isLocalReason, pageHandoffFor, pageReasonFor, relativeDay, returnViewFor, THRESHOLD, type ReasonRow, type TodayInput } from "../todayModel";
import type { MemoryItem, Person } from "@/store/repositories";

const NOW = new Date(2026, 9, 12, 9, 0); // Monday Oct 12, 9am local
const people = [
  { id: "ben", display_name: "Ben Carter", state: "active" },
  { id: "josh", display_name: "Josh", state: "active" },
  { id: "sarah", display_name: "Sarah", state: "active" },
  { id: "dad", display_name: "Dad", state: "paused" },
] as unknown as Person[];

function item(id: string, over: Partial<MemoryItem>): MemoryItem {
  return {
    id, kind: "event", person_id: "ben", statement: "", detail: {}, certainty: "stated", status: "active", sensitivity: "none",
    user_state: "unreviewed", subject_type: "person", origin: "extracted", created_at: "2026-10-08T21:14:00Z", ...over,
  } as MemoryItem;
}

const race = item("m1", { statement: "Ben runs Chicago Sunday", detail: { date: "2026-10-11", date_precision: "day", event_type: "race", followup_policy: "after" } });
const interview = item("m2", { person_id: "josh", statement: "Josh has his interview Tuesday", detail: { date: "2026-10-13", date_precision: "day", event_type: "interview", followup_policy: "both" } });

const day = (d: number) => new Date(2026, 9, d).toISOString();
function reason(id: string, type: string, person: string, itemId: string, from: number, to: number, over: Partial<ReasonRow> = {}): ReasonRow {
  return { id, person_id: person, type, window_start: day(from), window_end: day(to), score: type === "event_followup" ? 90 : 85,
    state: "candidate", dedupe_key: `${type}:${itemId}:x`, ...over };
}

function input(over: Partial<TodayInput> = {}): TodayInput {
  return {
    now: NOW, today: "2026-10-12", items: [race, interview], people, local: {}, primaries: [], handoff: null,
    told: 3, questions: 0, toLookAt: 0, provenance: () => ({ line: "You told Kinship · Oct 8", noteId: "c1" }),
    reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14), reason("r2", "upcoming_event", "josh", "m2", 12, 13)],
    ...over,
  };
}

it("one moment: the highest-scoring reason that can speak, in grounded words", () => {
  const v = buildToday(input());
  expect(v.moment).toMatchObject({
    reasonId: "r1", personName: "Ben", statement: "How did it go for Ben?", context: "Ben runs Chicago Sunday · Sun, Oct 11",
    provenance: "You told Kinship · Oct 8", noteId: "c1", primary: { label: "Ask how it went" }, heading: "Ask Ben how it went",
  });
  expect(v.quietDay).toBe(false);
});

it("an upcoming event speaks in the user's words with the day", () => {
  const v = buildToday(input({ reasons: [reason("r2", "upcoming_event", "josh", "m2", 12, 13)] }));
  expect(v.moment).toMatchObject({ statement: "Josh has his interview Tuesday", context: "Tomorrow · Tue, Oct 13", primary: { label: "Message Josh" } });
});

it("silence is a designed state: nothing below the threshold, nothing manufactured", () => {
  // Shown on an earlier day, a follow-up's freshness halves it below 55.
  const v = buildToday(input({ reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14)], local: { r1: { firstShown: "2026-10-11" } }, items: [race] }));
  expect(v.moment).toBeNull();
  expect(v.quietDay).toBe(true);
  expect(v.quiet).toEqual([]);
  expect(90 * 0.85 * 0.5).toBeLessThan(THRESHOLD);
});

it("never speaks outside a reason's window, or about retracted, sensitive or coarse evidence", () => {
  expect(buildToday(input({ reasons: [reason("r1", "event_followup", "ben", "m1", 13, 15)] })).moment).toBeNull();
  expect(buildToday(input({ items: [{ ...race, status: "retracted" }], reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14)] })).moment).toBeNull();
  expect(buildToday(input({ items: [{ ...race, sensitivity: "health" }], reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14)] })).moment).toBeNull();
  expect(buildToday(input({ items: [{ ...race, detail: { ...race.detail, date_precision: "month" } }], reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14)] })).moment).toBeNull();
});

it("a paused person, a dismissed, acted or done reason, a suppressed one: none speak", () => {
  const dad = item("m9", { person_id: "dad", statement: "Dad has a race", detail: { date: "2026-10-11", date_precision: "day", followup_policy: "after" } });
  expect(buildToday(input({ items: [dad], reasons: [reason("r9", "event_followup", "dad", "m9", 12, 14)] })).moment).toBeNull();
  for (const local of [{ dismissed: "x" }, { acted: "x" }, { done: "x" }]) {
    expect(buildToday(input({ reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14)], local: { r1: local } })).moment).toBeNull();
  }
  expect(buildToday(input({ reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14, { state: "suppressed" })] })).moment).toBeNull();
});

it("one primary per person per week", () => {
  const v = buildToday(input({
    reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14)],
    primaries: [{ personId: "ben", reasonId: "rOld", day: "2026-10-08" }],
  }));
  expect(v.moment).toBeNull();
});

it("evidence weighs in: a reading the user confirmed outranks an unreviewed one", () => {
  const confirmed = { ...interview, user_state: "confirmed" };
  const v = buildToday(input({
    items: [race, confirmed],
    reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14, { score: 85 }), reason("r2", "upcoming_event", "josh", "m2", 12, 13)],
  }));
  expect(v.moment?.reasonId).toBe("r2");
});

it("Coming up: everything in the next seven days by date, your promises too; past three, 'and N more', never dropped (H26, H27)", () => {
  const promise = (id: string, person: string, subject: "user" | "person", statement: string, due: string) =>
    item(id, { kind: "promise", person_id: person, subject_type: subject, statement, detail: { due_date: due } });
  const yours = promise("p1", "sarah", "user", "You said you'd send Sarah the restaurant", "2026-10-14");
  const tylers = promise("p2", "josh", "person", "Josh promised to send you his contractor's number", "2026-10-16");
  const games = item("e1", { person_id: "sarah", statement: "Sarah wants to play games with you Saturday", detail: { date: "2026-10-17", date_precision: "day" } });
  const zoo = item("e2", { person_id: "ben", statement: "You and Ben are going to the zoo", detail: { date: "2026-10-18", date_precision: "day" } });
  const v = buildToday(input({ reasons: [], items: [interview, yours, tylers, games, zoo], questions: 1 }));
  const [question, ...rest] = v.quiet;
  expect(question).toMatchObject({ kind: "question" });
  expect(rest.slice(0, 3).map((q) => q.text)).toEqual([
    "Josh has his interview Tuesday",                     // Tue
    "You said you'd send Sarah the restaurant",           // Wed: the user's own promise
    "Josh promised to send you his contractor's number",  // Fri: the same person twice is fine
  ]);
  const more = rest[3];
  expect(more).toMatchObject({ kind: "more", text: "and 2 more" });
  expect(more.kind === "more" ? more.rest.map((q) => q.text) : []).toEqual([
    "Sarah wants to play games with you Saturday",
    "You and Ben are going to the zoo", // still there after Tyler's promise arrived
  ]);
});

it("the return check: there as soon as the user is back, with its reason, until answered (H10, H18)", () => {
  const at = (mins: number) => new Date(NOW.getTime() - mins * 60_000).toISOString();
  const h = (mins: number, answered?: "yes") => ({
    reasonId: "news:n1", personId: "ben", channel: "text" as const, at: at(mins), answered,
    ask: "Did you congratulate Ben on the promotion?", about: "Ben was promoted", followUp: "Anything worth remembering from congratulating Ben?",
  });
  expect(buildToday(input({ handoff: h(0) })).returnCheck).toEqual({
    personId: "ben", personName: "Ben", reasonId: "news:n1", channel: "text",
    ask: "Did you congratulate Ben on the promotion?", about: "Ben was promoted", followUp: "Anything worth remembering from congratulating Ben?",
  });
  expect(buildToday(input({ handoff: h(48 * 60) })).returnCheck?.ask).toBe("Did you congratulate Ben on the promotion?");
  expect(buildToday(input({ handoff: h(73 * 60) })).returnCheck).toBeNull();
  expect(buildToday(input({ handoff: h(0, "yes") })).returnCheck).toBeNull();
});

it("every moment knows how to ask about itself afterwards, without guessing", () => {
  const promoted = item("n1", { kind: "fact", statement: "Ben was promoted", detail: { category: "work", date: "2026-10-11", date_precision: "day" } });
  const v = buildToday(input({ reasons: [], items: [promoted] }));
  expect([v.moment?.ask, v.moment?.followUp]).toEqual(["Did you congratulate Ben on the promotion?", "Anything worth remembering from congratulating Ben?"]);
  expect(buildToday(input()).moment?.ask).toBe("Did you ask Ben how it went?");
});

it("reads the evidence id from the reason's dedupe key", () => {
  expect(evidenceOf(reason("r", "event_followup", "ben", "abc", 1, 2))).toBe("abc");
  expect(evidenceOf({ ...reason("r", "birthday", "ben", "x", 1, 2), dedupe_key: "birthday" })).toBeNull();
});

it("speaks of days the way people do", () => {
  expect(relativeDay("2026-10-12", "2026-10-12")).toBe("Today");
  expect(relativeDay("2026-10-13", "2026-10-12")).toBe("Tomorrow");
  expect(relativeDay("2026-10-11", "2026-10-12")).toBe("Yesterday");
  expect(relativeDay("2026-10-16", "2026-10-12")).toBe("Friday");
  expect(relativeDay("2026-10-30", "2026-10-12")).toBe("Fri, Oct 30");
});

it("a greeting and a date, and no system vocabulary anywhere", () => {
  const v = buildToday(input());
  expect(v.dateLabel).toBe("Monday, Oct 12");
  expect(v.greeting).toBe("Good morning.");
  const m = v.moment!;
  const shown = [v.dateLabel, v.greeting, m.statement, m.context, m.provenance, m.primary.label, m.primary.hint, m.heading,
    ...m.mention, ...v.quiet.flatMap((q) => [q.label, q.text, "action" in q ? q.action : ""])];
  for (const s of shown) expect(String(s)).not.toMatch(/\b(score|tier|reason|candidate|model|AI|confidence|extract\w*|algorithm)\b/i);
});

// ─── Birthdays (from Contacts) and first use vs a quiet day (contract §8) ─

const maya = { id: "maya", display_name: "Maya Okafor", state: "active", birthday: "1991-10-12", birthday_source: "contacts" } as unknown as Person;
const quietInput = (over: Partial<TodayInput> = {}) => input({ reasons: [], items: [], ...over });

it("a birthday today is the moment, from Contacts, with a way to reach them", () => {
  const v = buildToday(quietInput({ people: [...people, maya] }));
  expect(v.moment).toMatchObject({
    type: "birthday", personId: "maya", statement: "It's Maya's birthday.", provenance: "From Contacts", itemId: null,
    primary: { label: "Message Maya" }, heading: "Wish Maya a happy birthday",
  });
  expect(v.quietDay).toBe(false);
  expect(v.firstUse).toBeNull();
});

it("a birthday this week is a quiet line; tomorrow says Tomorrow", () => {
  const soon = { ...maya, birthday: "1991-10-13" } as Person;
  const v = buildToday(quietInput({ people: [...people, soon] }));
  expect(v.moment).toBeNull();
  expect(v.quiet).toEqual([{
    kind: "coming", label: "Tomorrow", text: "Maya's birthday", personId: "maya", itemId: null,
    day: "2026-10-13", due: false, hope: null, provenance: "From Contacts", noteId: null,
  }]);
});

it("no birthday reasons for remembered or paused people (D13), or a birthday without a source", () => {
  for (const state of ["remembered", "paused"]) {
    expect(buildToday(quietInput({ people: [{ ...maya, state } as Person] })).moment).toBeNull();
  }
  expect(buildToday(quietInput({ people: [{ ...maya, birthday_source: null } as unknown as Person] })).moment).toBeNull();
});

it("a birthday put aside with Not now doesn't come back that day", () => {
  const v = buildToday(quietInput({ people: [maya], local: { "birthday:maya:2026-10-12": { dismissed: "2026-10-12T08:00:00Z" } } }));
  expect(v.moment).toBeNull();
});

it("first use is not a quiet day: nothing told yet → Today explains itself", () => {
  const v = buildToday(quietInput({ told: 0 }));
  expect(v.quietDay).toBe(false);
  expect(v.firstUse).toEqual({ hasPeople: true });
  const empty = buildToday(quietInput({ people: [], told: 0 }));
  expect(empty.firstUse).toEqual({ hasPeople: false });
  expect(empty.quietDay).toBe(false);
});

it("an account in use with nothing to say: Nothing needs you today", () => {
  const v = buildToday(quietInput({ told: 4 }));
  expect(v.firstUse).toBeNull();
  expect(v.quietDay).toBe(true);
});

describe("stabilization Gate G: Today reflects what's open, and good news", () => {
  const quiet = (over: Partial<TodayInput> = {}) => buildToday(input({ reasons: [], items: [], ...over }));

  it("never 'Nothing needs you today' while Kinship waits on the user; each question by name", () => {
    const v = quiet({
      activated: true,
      pending: [
        { captureId: "c1", kind: "question", label: "A question", text: "Which Sam do you mean?", action: "Answer" },
        { captureId: "c2", kind: "understanding", label: "Understanding", text: "A note about Tyler", action: null },
      ],
    });
    expect(v.quietDay).toBe(false);
    expect(v.waiting).toBe("one");
    expect(v.quiet.map((q) => [q.kind, q.text])).toEqual([["question", "Which Sam do you mean?"], ["understanding", "A note about Tyler"]]);
    expect(quiet({ activated: true, pending: [] }).quietDay).toBe(true);
  });

  it("a moment still comes first; then what's waiting; first use only when nothing waits", () => {
    const withMoment = buildToday(input({ pending: [{ captureId: "c1", kind: "question", label: "A question", text: "Which Sam do you mean?", action: "Answer" }] }));
    expect(withMoment.moment).not.toBeNull();
    expect(withMoment.waiting).toBeNull();
    const firstUse = quiet({ activated: false, pending: [{ captureId: "c1", kind: "question", label: "A question", text: "Is Kaiya someone new?", action: "Answer" }] });
    expect([firstUse.firstUse, firstUse.waiting]).toEqual([null, "one"]);
  });

  it("good news from yesterday: 'Congratulate Ben'; never a relative's news, never a negation", () => {
    const promoted = item("n1", { kind: "fact", statement: "Ben was promoted", detail: { category: "work", date: "2026-10-11", date_precision: "day" } });
    const v = quiet({ items: [promoted] });
    expect(v.moment).toMatchObject({ type: "good_news", statement: "Ben was promoted", context: "Yesterday", primary: { label: "Congratulate Ben" } });
    const anas = item("n2", { kind: "event", subject_type: "related", statement: "Ben's sister Ana had a baby", detail: { event_type: "birth", date: "2026-10-12", date_precision: "day" } });
    expect(quiet({ items: [anas] }).moment).toBeNull();
    const notIt = item("n3", { kind: "fact", statement: "Ben didn't get promoted", detail: { category: "work", date: "2026-10-11", date_precision: "day" } });
    expect(quiet({ items: [notIt] }).moment).toBeNull();
    const old = item("n4", { kind: "fact", statement: "Ben was promoted", detail: { category: "work", date: "2026-10-01", date_precision: "day" } });
    expect(quiet({ items: [old] }).moment).toBeNull();
  });

  it("a first day, on the day: 'Message Josh'", () => {
    const start = item("s1", { person_id: "josh", statement: "Josh starts his new job", detail: { event_type: "job_start", followup_policy: "after", date: "2026-10-12", date_precision: "day" } });
    expect(quiet({ items: [start] }).moment).toMatchObject({ type: "starts_today", statement: "Josh starts his new job", context: "Today · Mon, Oct 12", primary: { label: "Message Josh" } });
  });

  it("someone's promise: coming up on its day, then one gentle 'Did Josh send it?'", () => {
    const promise = (due: string) => item("w1", { kind: "promise", person_id: "josh", subject_type: "person",
      statement: "Josh said he'd send you his contractor's number", detail: { due_date: due } });
    expect(quiet({ items: [promise("2026-10-14")] }).quiet).toEqual([{
      kind: "coming", label: "Wednesday", text: "Josh said he'd send you his contractor's number", personId: "josh", itemId: "w1",
      day: "2026-10-14", due: true, hope: null, provenance: "You told Kinship · Oct 8", noteId: "c1",
    }]);
    expect(quiet({ items: [promise("2026-10-10")] }).quiet).toEqual([{
      kind: "waiting", label: "Waiting on Josh", text: "Did Josh send it?", personId: "josh", itemId: "w1",
      memory: "Josh said he'd send you his contractor's number", day: "2026-10-10", provenance: "You told Kinship · Oct 8", noteId: "c1",
    }]);
  });
});

it("first sign-in on a phone: until the account's data is here, Today guesses nothing (H9)", () => {
  // An existing account, before its first sync: no people, no notes yet on this phone.
  const before = buildToday(input({ reasons: [], items: [], people: [], told: 0, activated: false, dataKnown: false }));
  expect([before.firstUse, before.quietDay, before.unknown]).toEqual([null, false, true]);
  // After the first sync: its real Today.
  const after = buildToday(input({ reasons: [], items: [race], told: 3, activated: true, dataKnown: true }));
  expect([after.firstUse, after.unknown]).toEqual([null, undefined]);
  // A genuinely new account (its own record says so) still gets first use.
  expect(buildToday(input({ reasons: [], items: [], people: [], told: 0, activated: false })).firstUse).toEqual({ hasPeople: false });
});

describe("J9: a pet's vet visit is not a person's health (founder, 8 Oct)", () => {
  const mochi = item("p1", { statement: "Ben's dog Mochi has a vet appointment", sensitivity: "health", subject_type: "related",
    detail: { date: "2026-10-16", date_precision: "day", event_type: "medical", followup_policy: "both" } });
  const bens = item("p2", { statement: "Ben has a doctor's appointment", sensitivity: "health",
    detail: { date: "2026-10-15", date_precision: "day", event_type: "medical", followup_policy: "both" } });

  it("Mochi's vet appointment is on Today's Coming up, as on Ben's page, even kept as health before the pet rule", () => {
    const v = buildToday(input({ items: [mochi, bens], reasons: [] }));
    expect(v.quiet.map((q) => q.text)).toEqual(["Ben's dog Mochi has a vet appointment"]);
  });

  it("it can be Today's moment too, like anything else; a person's own appointment never", () => {
    const pet = buildToday(input({ items: [mochi], reasons: [reason("r5", "upcoming_event", "ben", "p1", 12, 16)] }));
    expect(pet.moment?.statement).toBe("Ben's dog Mochi has a vet appointment");
    const own = buildToday(input({ items: [bens], reasons: [reason("r6", "upcoming_event", "ben", "p2", 12, 15)] }));
    expect(own.moment).toBeNull();
  });
});

describe("K20: what the user means to do today is on Today, however it was kept (founder, 14 Oct)", () => {
  const john = { id: "john", display_name: "John", state: "active" } as unknown as Person;
  const tonight = (kind: string, detail: Record<string, unknown>, subject = "user") =>
    item(`j-${kind}`, { kind: kind as MemoryItem["kind"], person_id: "john", subject_type: subject as MemoryItem["subject_type"], statement: "You need to call John tonight", detail });
  const shapes = {
    promise: tonight("promise", { due_date: "2026-10-12", due_hint: "tonight" }),
    plan: tonight("plan", { date: "2026-10-12", firmness: "planned", when_hint: "tonight" }),
    event: tonight("event", { date: "2026-10-12", date_precision: "day", event_type: "other", followup_policy: "none", time_of_day: "night" }),
  };
  const today = (m: MemoryItem, over: Partial<TodayInput> = {}) =>
    buildToday(input({ items: [m], people: [...people, john], reasons: [], ...over }));
  const johnLine = (v: ReturnType<typeof buildToday>) => v.quiet.find((q) => q.kind === "coming" && q.personId === "john");

  it.each(Object.entries(shapes))("%s: a Today line about John, and never the quiet day", (_kind, m) => {
    const v = today(m);
    expect(johnLine(v)).toMatchObject({ label: "Today", text: "You need to call John tonight", itemId: m.id, day: "2026-10-12" });
    expect([v.quietDay, v.firstUse]).toEqual([false, null]);
  });

  it("someone else's event on its day stays the Moment's: not a Coming up line", () => {
    const race = item("r", { person_id: "john", statement: "John runs a race today", detail: { date: "2026-10-12", date_precision: "day", event_type: "race", followup_policy: "after" } });
    expect(johnLine(today(race))).toBeUndefined();
    expect(johnLine(today({ ...race, detail: { ...race.detail, date: "2026-10-13" } }))).toMatchObject({ label: "Tomorrow" });
  });

  it.each(Object.entries(shapes))("%s: after Yes it has been done, on this phone or any other; Not yet keeps it", (_kind, m) => {
    const key = `coming:${m.id}:2026-10-12`;
    expect(johnLine(today(m, { local: { [key]: { acted: "x", done: "x" } } }))).toBeUndefined();
    expect(johnLine(today(m, { contacts: [{ person_id: "john", memory_item_id: m.id, occurred_at: new Date(2026, 9, 12, 8).toISOString() }] }))).toBeUndefined();
    expect(johnLine(today(m, { local: { [key]: { acted: "x", notYet: "x" } } }))).toBeDefined();
    // A conversation on another day about it, or one taken back ("Not this"), doesn't settle today's.
    expect(johnLine(today(m, { contacts: [{ person_id: "john", memory_item_id: m.id, occurred_at: new Date(2026, 9, 10, 8).toISOString() }] }))).toBeDefined();
    expect(johnLine(today(m, { contacts: [{ person_id: "john", memory_item_id: m.id, occurred_at: new Date(2026, 9, 12, 8).toISOString(), deleted_at: "x" }] }))).toBeDefined();
  });

  it("yesterday's 'call John tonight' is not today's", () => {
    expect(johnLine(today({ ...shapes.promise, detail: { due_date: "2026-10-11" } }))).toBeUndefined();
    expect(johnLine(today({ ...shapes.plan, detail: { date: "2026-10-11", firmness: "planned" } }))).toBeUndefined();
  });
});

describe("K23: Message or Call from a person's page gets the same return question (founder, 14 Oct)", () => {
  const john = { id: "john", display_name: "John", state: "active" } as unknown as Person;
  const own = (id: string, kind: string, detail: Record<string, unknown>, over: Partial<MemoryItem> = {}) =>
    item(id, { kind: kind as MemoryItem["kind"], person_id: "john", subject_type: "user", statement: `You said ${id}`, detail, ...over });

  it("what the user means to do today comes first, with Today's own key for it, so a Yes settles Today's line too", () => {
    const items = [own("later", "promise", { due_date: "2026-10-20" }), own("tonight", "plan", { date: "2026-10-12", firmness: "intended" })];
    expect(pageReasonFor(items, john, "2026-10-12")).toEqual({
      id: "coming:tonight:2026-10-12", type: "coming", ask: "Did you reach John?", about: "You said tonight",
      followUp: "Anything worth remembering from talking with John?", itemId: "tonight",
    });
  });

  it("else the open 'You said you'd' nearest its day, a promise asking nothing more after a Yes", () => {
    const items = [own("undated", "promise", {}), own("friday", "promise", { due_date: "2026-10-16" }), own("yesterday", "promise", { due_date: "2026-10-11" })];
    expect(pageReasonFor(items, john, "2026-10-12")).toMatchObject({ id: "coming:yesterday:2026-10-11", itemId: "yesterday", followUp: "" });
    expect(pageReasonFor([own("undated", "promise", {})], john, "2026-10-12")).toMatchObject({ id: "coming:undated:2026-10-12" });
  });

  it("nothing to act on is no reason: someone else's promise, a fact, a sensitive or retracted line", () => {
    expect(pageReasonFor([
      own("theirs", "promise", { due_date: "2026-10-12" }, { subject_type: "person" }),
      own("fact", "fact", {}),
      own("health", "promise", { due_date: "2026-10-12" }, { sensitivity: "health" }),
      own("gone", "promise", { due_date: "2026-10-12" }, { status: "retracted" }),
      own("ben", "promise", { due_date: "2026-10-12" }, { person_id: "ben" }),
    ], john, "2026-10-12")).toBeNull();
  });

  it("the return question is the same wherever the hand-off started; never for someone paused, or after three days", () => {
    const h = { reasonId: "coming:tonight:2026-10-12", personId: "john", channel: "text" as const, at: NOW.toISOString(), ask: "Did you reach John?", about: "You said tonight", followUp: "" };
    expect(returnViewFor(h, john, NOW)).toMatchObject({ ask: "Did you reach John?", about: "You said tonight", personName: "John" });
    expect(buildToday(input({ handoff: h, people: [...people, john] })).returnCheck).toEqual(returnViewFor(h, john, NOW));
    expect(returnViewFor({ ...h, answered: "yes" }, john, NOW)).toBeNull();
    expect(returnViewFor(h, { ...john, state: "paused" } as Person, NOW)).toBeNull();
    expect(returnViewFor(h, john, new Date(NOW.getTime() + 73 * 3_600_000))).toBeNull();
  });
});

describe("H4: once the first Tell is memory, Today shows how Kinship brings things back (founder CC-17, CC-20)", () => {
  const maya = { id: "maya", display_name: "Maya Okafor", state: "active" } as unknown as Person;
  const ACTIVATED = new Date(2026, 9, 12, 8, 55).toISOString();
  const told = new Date(2026, 9, 12, 8, 54).toISOString();
  const job = item("job", { person_id: "maya", statement: "Maya starts her new job on Monday", created_at: told,
    detail: { date: "2026-10-19", date_precision: "day", event_type: "job_start", followup_policy: "after" } });
  const fact = item("fact", { kind: "fact", person_id: "maya", statement: "Maya loves pottery", created_at: told, detail: { category: "interest" } });
  const view = (items: MemoryItem[], bringBack: TodayInput["bringBack"]) =>
    buildToday(input({ items, people: [...people, maya], reasons: [], bringBack })).bringBack;

  it("with the user's own first Tell when it has a day still to come: their words, when it comes back, the question after", () => {
    expect(view([job], { activatedAt: ACTIVATED, seen: false })).toEqual({
      kind: "own", personId: "maya", personName: "Maya", statement: "Maya starts her new job on Monday", day: "2026-10-19", when: "Around Mon, Oct 19",
    });
    const soon = { ...job, detail: { ...job.detail, date: "2026-10-14" } };
    expect(view([soon], { activatedAt: ACTIVATED, seen: false })).toMatchObject({ kind: "own", when: "Around Wednesday" });
  });

  it("else the one grounded example: a first Tell with no day, a past day, or lines told long before", () => {
    expect(view([fact], { activatedAt: ACTIVATED, seen: false })).toEqual({ kind: "example" });
    expect(view([{ ...job, detail: { ...job.detail, date: "2026-10-01" } }], { activatedAt: ACTIVATED, seen: false })).toEqual({ kind: "example" });
    expect(view([{ ...job, created_at: "2026-09-01T10:00:00Z" }], { activatedAt: ACTIVATED, seen: false })).toEqual({ kind: "example" });
  });

  it("once: never after Got it, before the first Tell is memory, or for an account long in use", () => {
    expect(view([job], { activatedAt: ACTIVATED, seen: true })).toBeNull();
    expect(view([job], { activatedAt: null, seen: false })).toBeNull();
    expect(view([job], { activatedAt: "2026-10-01T10:00:00Z", seen: false })).toBeNull();
    expect(view([job], undefined)).toBeNull();
  });
});

describe("K28: Message or Call from a person's page with nothing to act on (founder, 17 Oct)", () => {
  const susan = { id: "susan", display_name: "Susan", state: "active" } as unknown as Person;
  const wedding = item("wedding", {
    kind: "milestone", person_id: "susan", statement: "Susan is getting married to Pedro in the fall",
    detail: { milestone_type: "wedding", date: "2026-09-01", date_end: "2026-11-30", date_precision: "season" },
  });

  it("carries the page's own return check and nothing else: no reason, no memory, no Moment kind", () => {
    expect(pageHandoffFor([wedding], susan, "2026-10-12")).toEqual({
      id: "page:susan", type: "page", ask: "Did you reach Susan?", followUp: "Anything worth remembering from talking with Susan?",
    });
    expect(isLocalReason("page:susan")).toBe(true); // nothing is said to the server about it
  });

  it("with something to act on, K23's reason as before: never turned into a generic hand-off", () => {
    const tonight = item("tonight", { kind: "plan", person_id: "susan", subject_type: "user", statement: "You said tonight", detail: { date: "2026-10-12", firmness: "intended" } });
    expect(pageHandoffFor([wedding, tonight], susan, "2026-10-12")).toMatchObject({ id: "coming:tonight:2026-10-12", type: "coming", itemId: "tonight" });
  });

  it("never for someone paused, remembered, removed or deleted", () => {
    for (const over of [{ state: "paused" }, { state: "remembered" }, { state: "archived" }, { deleted_at: "2026-10-01T00:00:00Z" }]) {
      expect(pageHandoffFor([wedding], { ...susan, ...over } as Person, "2026-10-12")).toBeNull();
    }
  });

  it("Today shows the page hand-off's return check, with nothing it was about, and the wedding is no Moment", () => {
    const h = {
      reasonId: "page:susan", personId: "susan", channel: "text" as const, at: NOW.toISOString(), type: "page" as const,
      ask: "Did you reach Susan?", followUp: "Anything worth remembering from talking with Susan?",
    };
    const v = buildToday(input({ handoff: h, items: [wedding], people: [...people, susan] }));
    expect(v.returnCheck).toMatchObject({ ask: "Did you reach Susan?", about: null, followUp: "Anything worth remembering from talking with Susan?", personName: "Susan" });
    expect(v.moment?.personId).not.toBe("susan"); // a season is never a Moment (H16: a day is needed)
    expect(returnViewFor({ ...h, answered: "yes" }, susan, NOW)).toBeNull();
  });
});
