// Milestones as Today moments (founder H16) and N7. Recognised from the
// user's own words, with a day of their own, from three days before through
// the day; Today decides, once; never asked for a date, never inferred (a
// residence that changed is never a "move"), never a relative's. Good news
// dated only by a month or a year is not today's news.
import { buildToday, type TodayInput } from "../todayModel";
import { detailFor } from "../momentDetail";
import { milestoneIn, milestoneOf } from "../milestones";
import type { MemoryItem, Person } from "@/store/repositories";

const NOW = new Date(2026, 9, 12, 9, 0); // Monday Oct 12, 9am local
const TODAY = "2026-10-12";
const people = [
  { id: "anthony", display_name: "Anthony", state: "active" },
  { id: "ben", display_name: "Ben", state: "active" },
] as unknown as Person[];

function item(id: string, over: Partial<MemoryItem>): MemoryItem {
  return {
    id, kind: "event", person_id: "anthony", statement: "", detail: {}, certainty: "stated", status: "active", sensitivity: "none",
    user_state: "unreviewed", subject_type: "person", origin: "extracted", created_at: "2026-10-12T08:00:00Z", ...over,
  } as MemoryItem;
}
const dated = (date: string, precision = "day") => ({ date, date_precision: precision, event_type: "wedding", followup_policy: "before" });

function today(items: MemoryItem[], over: Partial<TodayInput> = {}, quotes: Record<string, string[]> = {}) {
  return buildToday({
    now: NOW, today: TODAY, items, people, reasons: [], local: {}, primaries: [], handoff: null, told: 3, questions: 0, toLookAt: 0,
    provenance: () => ({ line: "You told Kinship · Oct 8", noteId: "c1" }),
    // The note's own words: by default, the line's.
    quotes: (id) => quotes[id] ?? [items.find((m) => m.id === id)?.statement ?? ""],
    ...over,
  });
}

describe("H16: which words name a milestone", () => {
  it("the nine, said outright", () => {
    const said: [string, string][] = [
      ["Ben is getting engaged Saturday", "engagement"],
      ["Anthony and Natalia's wedding is Saturday", "wedding"],
      ["Ben starts his new job Monday", "new_job"],
      ["Ben's promotion is announced Friday", "promotion"],
      ["Ana's baby is due Thursday", "baby"],
      ["Josh graduates on Friday", "graduation"],
      ["Ben is closing on the new house Friday", "new_home"],
      ["Dad retires on Friday", "retirement"],
      ["Susan is moving to Denver on Saturday", "move"],
    ];
    for (const [words, type] of said) expect([words, milestoneIn(words)]).toEqual([words, type]);
  });

  it("never a residence, a hedge's opposite, or a word in passing", () => {
    for (const words of [
      "Susan lives in Colorado", "Susan lives in Alameda now", "Ben is a graduate student", "Ben is fully engaged at work",
      "The wedding is off", "Ben isn't moving to Denver", "Ben's not getting married",
    ]) expect([words, milestoneIn(words)]).toEqual([words, null]);
  });

  it("the user's own words must say it too, not only Kinship's line", () => {
    const line = item("w", { statement: "Anthony's wedding is Saturday", detail: dated("2026-10-17") });
    expect(milestoneOf(line, ["Anthony's big day is Saturday"])).toBeNull();
    expect(milestoneOf(line, ["Anthony's wedding is Saturday!"])).toBe("wedding");
    // A line the user wrote themselves is their words.
    expect(milestoneOf({ ...line, user_state: "user_authored" }, [])).toBe("wedding");
  });
});

describe("H16: a milestone moment, at the right time", () => {
  const wedding = (date: string, over: Partial<MemoryItem> = {}) =>
    item("w1", { statement: "Anthony and Natalia's wedding is Saturday", detail: dated(date), ...over });

  it("three days before: a moment in the user's words, anchored to Anthony, with Natalia's name kept", () => {
    const v = today([wedding("2026-10-15")]);
    expect(v.moment).toMatchObject({
      type: "milestone", reasonId: "milestone:w1:2026-10-15", personId: "anthony",
      statement: "Anthony and Natalia's wedding is Saturday", context: "Thursday · Thu, Oct 15",
      primary: { label: "Message Anthony" }, ask: "Did you reach Anthony about the wedding?",
    });
    expect(detailFor(v, "milestone:w1:2026-10-15", TODAY, () => "Anthony")).toMatchObject({ why: "It's on Thursday.", when: "Thu, Oct 15" });
  });

  it("on the day too; four days before, or after, it isn't a milestone moment", () => {
    expect(today([wedding("2026-10-12")]).moment).toMatchObject({ type: "milestone", context: "Today · Mon, Oct 12" });
    expect(today([wedding("2026-10-16")]).moment).toBeNull();
    expect(today([wedding("2026-10-11")]).moment?.type).not.toBe("milestone");
  });

  it("no day of its own (a month, a year, nothing): remembered quietly, no moment, nothing asked", () => {
    for (const d of [dated("2026-10-01", "month"), dated("2026-01-01", "year"), { event_type: "wedding", followup_policy: "before", date_precision: "unknown" }]) {
      const v = today([wedding("x", { detail: d })]);
      expect(v.moment).toBeNull();
      expect(v.quiet.filter((q) => q.kind === "question")).toEqual([]);
    }
  });

  it("never from a maybe or a wish, never a relative's, never a paused person's", () => {
    expect(today([wedding("2026-10-15", { certainty: "tentative" })]).moment).toBeNull();
    expect(today([wedding("2026-10-15", { certainty: "wished" })]).moment).toBeNull();
    expect(today([wedding("2026-10-15", { subject_type: "related", statement: "Anthony's sister's wedding is Saturday" })]).moment).toBeNull();
    const paused = [{ id: "anthony", display_name: "Anthony", state: "paused" }] as unknown as Person[];
    expect(today([wedding("2026-10-15")], { people: paused }).moment).toBeNull();
  });

  it("a residence change is never a move: only the note's own move words make one", () => {
    const lives = item("r1", { kind: "fact", person_id: "ben", statement: "Ben lives in Colorado", detail: { category: "home", date: "2026-10-13", date_precision: "day" } });
    expect(today([lives]).moment).toBeNull();
    const moving = item("r2", { person_id: "ben", statement: "Ben is moving to Denver on Wednesday", detail: { date: "2026-10-14", date_precision: "day", event_type: "move", followup_policy: "after" } });
    expect(today([moving]).moment).toMatchObject({ type: "milestone", ask: "Did you reach Ben about the move?" });
  });

  it("once: shown on an earlier day, it doesn't speak again; one moment per person a week", () => {
    const first = today([wedding("2026-10-15")]);
    expect(first.moment?.type).toBe("milestone");
    const next = today([wedding("2026-10-15")], { local: { "milestone:w1:2026-10-15": { firstShown: "2026-10-11" } } });
    expect(next.moment).toBeNull();
    const capped = today([wedding("2026-10-15")], { primaries: [{ personId: "anthony", reasonId: "news:x", day: "2026-10-10" }] });
    expect(capped.moment).toBeNull();
  });
});

describe("N7: good news needs to be today's news", () => {
  const promoted = (detail: Record<string, unknown>) =>
    item("n1", { kind: "fact", person_id: "ben", statement: "Ben got promoted", detail: { category: "work", ...detail } });

  it("told today with no date: today's news", () => {
    expect(today([promoted({})]).moment).toMatchObject({ type: "good_news", reasonId: "news:n1" });
  });

  it("dated by a year or a month (\"in 2024\", \"in October\"): never treated as today's", () => {
    expect(today([promoted({ date: "2024-01-01", date_precision: "year", date_hint: "in 2024" })]).moment).toBeNull();
    expect(today([promoted({ date: "2026-10-01", date_precision: "month", date_hint: "in October" })]).moment).toBeNull();
  });

  it("dated to the day: by that day", () => {
    expect(today([promoted({ date: "2026-10-11", date_precision: "day" })]).moment).toMatchObject({ type: "good_news", context: "Yesterday" });
    expect(today([promoted({ date: "2026-10-01", date_precision: "day" })]).moment).toBeNull();
  });
});
