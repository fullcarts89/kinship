// Today (plan §13): one moment at most, chosen deterministically; silence is
// a valid answer; quiet lines are at most two, from different people; the
// return check is there as soon as the user is back, with its reason; copy is
// templates plus the user's own words.
import { buildToday, evidenceOf, relativeDay, THRESHOLD, type ReasonRow, type TodayInput } from "../todayModel";
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
  expect(v.dateLabel).toBe("Monday, 12 October");
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
  expect(v.quiet).toEqual([{ kind: "coming", label: "Tomorrow", text: "Maya's birthday", personId: "maya", itemId: null }]);
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
    expect(quiet({ items: [promise("2026-10-14")] }).quiet).toEqual([
      { kind: "coming", label: "Wednesday", text: "Josh said he'd send you his contractor's number", personId: "josh", itemId: "w1" }]);
    expect(quiet({ items: [promise("2026-10-10")] }).quiet).toEqual([
      { kind: "waiting", label: "Waiting on Josh", text: "Did Josh send it?", personId: "josh", itemId: "w1" }]);
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
