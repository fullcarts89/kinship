// Promise reasons (RSN-06) and open-thread reasons (RSN-07), WS-3 under FD-30e (CC-25 "Commit next"):
// the user's own promise with a day becomes Today's Moment on that day, and once more a few days
// later if still open; an open thread asks for one check-in the day after its own day, or a quiet
// while after it was told. The guilt firewall: no "still haven't", no overdue state, nothing daily;
// "Not now" and "Didn't happen" put a promise aside for good; Yes keeps it. Nothing sensitive, nothing
// about a relative, no one paused or remembered, nothing undated or coarse ever becomes a Moment.
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildToday, pageReasonFor, promiseAsk, promiseReasonId, promiseStatement, PROMISE_AGAIN_DAYS, PROMISE_WEIGHT, returnViewFor,
  THREAD_FOLLOWUP_DAYS, THREAD_WEIGHT, threadAsk, threadReasonId, threadWindow, THRESHOLD, type ReasonRow, type TodayInput,
} from "../todayModel";
import { detailFor } from "../momentDetail";
import type { MemoryItem, Person } from "@/store/repositories";

const NOW = new Date(2026, 10, 1, 9, 0); // Sunday Nov 1, 9am local
const TODAY = "2026-11-01";
const people = [
  { id: "sam", display_name: "Sam Eden", state: "active" },
  { id: "felix", display_name: "Felix", state: "active" },
  { id: "mina", display_name: "Mina", state: "active" },
  { id: "dad", display_name: "Dad", state: "paused" },
  { id: "gran", display_name: "Gran", state: "remembered" },
] as unknown as Person[];

function item(id: string, over: Partial<MemoryItem>): MemoryItem {
  return {
    id, kind: "promise", person_id: "sam", statement: "", detail: {}, certainty: "stated", status: "active", sensitivity: "none",
    user_state: "unreviewed", subject_type: "user", origin: "extracted", created_at: "2026-10-28T21:14:00Z", ...over,
  } as MemoryItem;
}
/** The line as the page voices it ("Bring Sam soup"), the way Today receives it. */
const soup = (due: string | null, over: Partial<MemoryItem> = {}) =>
  item("p1", { statement: "Bring Sam soup", detail: due ? { due_date: due } : {}, ...over });
const denver = (over: Partial<MemoryItem> = {}) =>
  item("t1", { kind: "thread", person_id: "felix", subject_type: "person", statement: "Felix is considering moving to Denver",
    detail: { topic: "moving to Denver", followup_after_days: 42 }, created_at: "2026-09-20T18:00:00Z", ...over });
const interview = (over: Partial<MemoryItem> = {}) =>
  item("t2", { kind: "thread", person_id: "mina", subject_type: "person", statement: "Mina has a job interview on Saturday",
    detail: { date: "2026-10-31", date_precision: "day" }, created_at: "2026-10-27T18:00:00Z", ...over });

function input(over: Partial<TodayInput> = {}): TodayInput {
  return {
    now: NOW, today: TODAY, items: [], people, local: {}, primaries: [], handoff: null, reasons: [],
    told: 3, questions: 0, toLookAt: 0, activated: true, provenance: () => ({ line: "You told Kinship · Oct 28", noteId: "c1" }),
    ...over,
  };
}
const at = (day: string, hour = 9) => new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), hour));
const on = (day: string, over: Partial<TodayInput> = {}) => buildToday(input({ today: day, now: at(day), ...over }));

describe("RSN-06: the user's own promise, on its day", () => {
  it("'You said you'd bring Sam soup.' · 'Today · Sun, Nov 1' · Message Sam, with the reason-linked return check", () => {
    const v = on(TODAY, { items: [soup(TODAY)] });
    expect(v.moment).toMatchObject({
      reasonId: promiseReasonId("p1", TODAY), type: "promise", personId: "sam", personName: "Sam", itemId: "p1",
      statement: "You said you'd bring Sam soup.", context: "Today · Sun, Nov 1", day: TODAY,
      primary: { label: "Message Sam" }, heading: "Message Sam",
      ask: "Did you bring Sam soup?", followUp: "", provenance: "You told Kinship · Oct 28", noteId: "c1",
    });
    expect(v.moment?.score).toBe(PROMISE_WEIGHT);
    // The Moment's own line is not also a Coming up line.
    expect(v.quiet).toEqual([]);
    expect(v.quietDay).toBe(false);
  });

  it("the words come from the line as kept; a line that already says 'You…' is left whole", () => {
    expect(promiseStatement("Send Ben my physio's number")).toBe("You said you'd send Ben my physio's number.");
    expect(promiseStatement("You owe Ben a coffee.")).toBe("You owe Ben a coffee.");
    expect(promiseAsk("Ben", "Send Ben my physio's number")).toBe("Did you send Ben my physio's number?");
    expect(promiseAsk("Ben", "You owe Ben a coffee")).toBe("Did you reach Ben?");
  });

  it("the detail says when it's for, never how late; the return check offers 'Didn't happen' only for a promise", () => {
    const v = on(TODAY, { items: [soup(TODAY)] });
    const d = detailFor(v, promiseReasonId("p1", TODAY), TODAY, () => "Sam");
    expect(d).toMatchObject({ type: "promise", line: "Bring Sam soup", why: "It's due today.", when: "Sun, Nov 1", heading: "Message Sam" });
    expect(d?.reason).toEqual({ id: promiseReasonId("p1", TODAY), type: "promise", ask: "Did you bring Sam soup?", about: "Bring Sam soup", followUp: "", itemId: "p1" });
    const h = { reasonId: promiseReasonId("p1", TODAY), personId: "sam", channel: "text" as const, at: NOW.toISOString(), type: "promise" as const, ask: "Did you bring Sam soup?", about: "Bring Sam soup", followUp: "", itemId: "p1" };
    expect(returnViewFor(h, people[0], NOW)).toMatchObject({ type: "promise", ask: "Did you bring Sam soup?", followUp: "" });
    // The question is there, with its reason, and the Moment isn't asked twice.
    const back = on(TODAY, { items: [soup(TODAY)], handoff: h, local: { [h.reasonId]: { acted: h.at } } });
    expect(back.returnCheck?.ask).toBe("Did you bring Sam soup?");
    expect(back.moment).toBeNull();
  });

  it("below an event's follow-up, a birthday and a milestone; above good news", () => {
    expect(PROMISE_WEIGHT).toBeLessThan(80);
    expect(PROMISE_WEIGHT).toBeLessThan(75); // good news; an unreviewed follow-up (90 × 0.85) too
    expect(PROMISE_WEIGHT).toBeGreaterThan(70); // a first day
    expect(THREAD_WEIGHT).toBeLessThan(PROMISE_WEIGHT);
    expect(THREAD_WEIGHT).toBeGreaterThanOrEqual(THRESHOLD);
    // Sam's birthday the same day takes the Moment; the promise is then a Coming up line for today.
    const sam = { ...people[0], birthday: "1990-11-01", birthday_source: "contacts" } as unknown as Person;
    const v = on(TODAY, { items: [soup(TODAY)], people: [sam, ...people.slice(1)] });
    expect(v.moment?.type).toBe("birthday");
    expect(v.quiet.map((q) => [q.kind, q.text])).toEqual([["coming", "Bring Sam soup"]]);
    // A server event follow-up outranks it.
    const race = item("e1", { kind: "event", subject_type: "person", statement: "Sam runs Chicago Saturday", detail: { date: "2026-10-31", date_precision: "day", event_type: "race", followup_policy: "after" } });
    const r: ReasonRow = { id: "r1", person_id: "sam", type: "event_followup", window_start: at(TODAY, 0).toISOString(), window_end: at("2026-11-03", 0).toISOString(), score: 90, state: "candidate", dedupe_key: "event_followup:e1:2026-10-31" };
    expect(on(TODAY, { items: [soup(TODAY), race], reasons: [r] }).moment?.type).toBe("event_followup");
  });

  it("once on its day; then quiet; then once more a few days later if still open; never daily, never after", () => {
    const shown = { [promiseReasonId("p1", TODAY)]: { firstShown: TODAY } };
    const primaries = [{ personId: "sam", reasonId: promiseReasonId("p1", TODAY), day: TODAY }];
    expect(on("2026-11-02", { items: [soup(TODAY)], local: shown, primaries }).moment).toBeNull();
    expect(on("2026-11-03", { items: [soup(TODAY)], local: shown, primaries }).moment).toBeNull();
    const again = on("2026-11-04", { items: [soup(TODAY)], local: shown, primaries });
    expect(again.moment).toMatchObject({ reasonId: promiseReasonId("p1", TODAY, true), statement: "You said you'd bring Sam soup.", context: "Sun, Nov 1" });
    expect(PROMISE_AGAIN_DAYS).toEqual([3, 5]);
    const d = detailFor(again, promiseReasonId("p1", TODAY, true), "2026-11-04", () => "Sam");
    expect(d?.why).toBe("It was due on Sunday.");
    // Spoken once more, it is done speaking.
    const shownAgain = { ...shown, [promiseReasonId("p1", TODAY, true)]: { firstShown: "2026-11-04" } };
    expect(on("2026-11-05", { items: [soup(TODAY)], local: shownAgain, primaries }).moment).toBeNull();
    expect(on("2026-11-06", { items: [soup(TODAY)], local: shownAgain, primaries }).moment).toBeNull();
    expect(on("2026-11-07", { items: [soup(TODAY)], local: shown, primaries }).moment).toBeNull();
    // Another Moment about Sam this week holds the second window (one primary per person per week).
    expect(on("2026-11-04", { items: [soup(TODAY)], local: shown, primaries: [{ personId: "sam", reasonId: "news:x", day: "2026-11-02" }] }).moment).toBeNull();
  });

  it("'Not now' or 'Didn't happen' puts it aside for good; a Yes keeps it; 'Not yet' lets it speak again in its windows", () => {
    const first = promiseReasonId("p1", TODAY);
    for (const aside of [{ dismissed: "x" }, { done: "x" }]) {
      expect(on(TODAY, { items: [soup(TODAY)], local: { [first]: aside } }).moment).toBeNull();
      expect(on("2026-11-04", { items: [soup(TODAY)], local: { [first]: aside } }).moment).toBeNull();
    }
    expect(on("2026-11-04", { items: [soup(TODAY)], local: { [first]: { firstShown: TODAY, notYet: "x" } } }).moment?.reasonId).toBe(promiseReasonId("p1", TODAY, true));
    // Kept (resolved after a Yes) or retracted: no Moment, no line.
    expect(on(TODAY, { items: [soup(TODAY, { status: "resolved" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [soup(TODAY, { status: "retracted", deleted_at: "x" } as Partial<MemoryItem>)] }).moment).toBeNull();
  });

  it("never: an undated promise, a month or a year, someone else's promise, a sensitive one, or someone paused or remembered", () => {
    expect(on(TODAY, { items: [soup(null)] }).moment).toBeNull();
    expect(on(TODAY, { items: [soup(null)] }).quiet).toEqual([]);
    expect(on(TODAY, { items: [soup("2026-11")] }).moment).toBeNull();
    expect(on(TODAY, { items: [soup(TODAY, { subject_type: "person", statement: "Sam said she'd bring you soup" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [soup(TODAY, { sensitivity: "health" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [soup(TODAY, { person_id: "dad" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [soup(TODAY, { person_id: "gran" })] }).moment).toBeNull();
    // Before its day it is a Coming up line, as before.
    expect(on("2026-10-30", { items: [soup(TODAY)] }).moment).toBeNull();
    expect(on("2026-10-30", { items: [soup(TODAY)] }).quiet.map((q) => q.text)).toEqual(["Bring Sam soup"]);
  });

  it("Message from Sam's page on the day carries Today's own reason, so a Yes keeps the promise and settles Today's line", () => {
    expect(pageReasonFor([soup(TODAY)], people[0], TODAY)).toEqual({
      id: promiseReasonId("p1", TODAY), type: "promise", ask: "Did you bring Sam soup?", about: "Bring Sam soup", followUp: "", itemId: "p1",
    });
    // Before its day the page's hand-off is the Coming up reason, as before (K23).
    expect(pageReasonFor([soup(TODAY)], people[0], "2026-10-30")).toMatchObject({ id: `coming:p1:${TODAY}`, type: "coming" });
  });
});

describe("RSN-07: an open thread, one check-in", () => {
  it("'Did Felix decide?' · the thread in the user's words · Ask Felix, a quiet while after it was told, once", () => {
    // Told Sep 20; the window opens 42 days later (Nov 1), for three days.
    expect(threadWindow(denver(), "2026-10-31")).toBeNull();
    expect(threadWindow(denver(), TODAY)).toEqual({ day: "2026-09-20", told: true });
    expect(threadWindow(denver(), "2026-11-03")).toEqual({ day: "2026-09-20", told: true });
    expect(threadWindow(denver(), "2026-11-04")).toBeNull();
    const v = on(TODAY, { items: [denver()] });
    expect(v.moment).toMatchObject({
      reasonId: threadReasonId("t1", "2026-09-20"), type: "thread", personName: "Felix", itemId: "t1",
      statement: "Did Felix decide?", context: "Felix is considering moving to Denver", primary: { label: "Ask Felix" }, heading: "Ask Felix",
      ask: "Did you ask Felix about it?", followUp: "Anything worth remembering from talking with Felix?", toldDay: true,
    });
    expect(v.moment?.score).toBe(THREAD_WEIGHT);
    const d = detailFor(v, threadReasonId("t1", "2026-09-20"), TODAY, () => "Felix");
    expect(d).toMatchObject({ line: "Felix is considering moving to Denver", why: "You told Kinship on Sun, Sep 20.", when: null });
    // Shown once, it never comes back; and the pipeline's own number is the fallback.
    const shown = { [threadReasonId("t1", "2026-09-20")]: { firstShown: TODAY } };
    expect(on("2026-11-02", { items: [denver()], local: shown }).moment).toBeNull();
    expect(on("2026-11-03", { items: [denver()], local: shown }).moment).toBeNull();
    expect(THREAD_FOLLOWUP_DAYS).toBe(42);
    const pipeline = readFileSync(join(__dirname, "../../../../supabase/functions/_shared/extraction/pipeline.ts"), "utf8");
    expect(pipeline).toMatch(/export const THREAD_FOLLOWUP_DAYS = 42;/u);
    // Without the line's own number, the fallback applies the same way.
    expect(threadWindow(denver({ detail: {} }), TODAY)).toEqual({ day: "2026-09-20", told: true });
  });

  it("a thread with its own day asks the day after, like an event's follow-up: 'Any news from Mina?'", () => {
    expect(threadWindow(interview(), "2026-10-31")).toBeNull();
    expect(threadWindow(interview(), TODAY)).toEqual({ day: "2026-10-31", told: false });
    expect(threadWindow(interview(), "2026-11-03")).toEqual({ day: "2026-10-31", told: false });
    expect(threadWindow(interview(), "2026-11-04")).toBeNull();
    const v = on(TODAY, { items: [interview()] });
    expect(v.moment).toMatchObject({
      reasonId: threadReasonId("t2", "2026-10-31"), type: "thread", statement: "Any news from Mina?",
      context: "Mina has a job interview on Saturday · Sat, Oct 31", primary: { label: "Ask Mina" }, toldDay: false,
    });
    expect(detailFor(v, threadReasonId("t2", "2026-10-31"), TODAY, () => "Mina")).toMatchObject({ why: "It was yesterday.", when: "Sat, Oct 31" });
    expect(threadAsk("Felix", "Felix might take the Denver job")).toBe("Did Felix decide?");
    expect(threadAsk("Mina", "Mina is looking for a new apartment")).toBe("Any news from Mina?");
  });

  it("below a promise; put aside, answered or resolved it stays quiet; never a sensitive, relative, coarse, paused or remembered one", () => {
    const both = on(TODAY, { items: [denver(), soup(TODAY, { person_id: "felix" })] });
    expect(both.moment?.type).toBe("promise");
    const id = threadReasonId("t1", "2026-09-20");
    for (const local of [{ dismissed: "x" }, { acted: "x" }, { done: "x" }]) expect(on(TODAY, { items: [denver()], local: { [id]: local } }).moment).toBeNull();
    expect(on(TODAY, { items: [denver({ status: "resolved" })] }).moment).toBeNull();
    // Hard times are RSN-09 (Alpha): never here, by the line's own sensitivity or its words.
    expect(on(TODAY, { items: [denver({ sensitivity: "health" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [denver({ statement: "Felix is deciding whether to have the surgery" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [denver({ statement: "Felix is thinking about a divorce" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [denver({ statement: "Felix is worried he'll be laid off" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [denver({ subject_type: "related", statement: "Felix's mom is considering moving to Denver" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [denver({ detail: { date: "2026-10-01", date_precision: "month" } })] }).moment).toBeNull();
    expect(on(TODAY, { items: [denver({ person_id: "dad" })] }).moment).toBeNull();
    expect(on(TODAY, { items: [denver({ person_id: "gran" })] }).moment).toBeNull();
    // A thread told 42 days ago whose words the user edited is the same thread: it asks once, in its window, unless replaced by a newer line.
    expect(on(TODAY, { items: [denver({ user_state: "edited" })] }).moment?.type).toBe("thread");
  });

  it("a quiet day stays quiet: nothing in its window, nothing to say", () => {
    const v = on("2026-10-15", { items: [denver(), interview(), soup(TODAY)] });
    expect(v.moment).toBeNull();
    expect(v.quiet).toEqual([]);
    expect(v.quietDay).toBe(true);
  });
});
