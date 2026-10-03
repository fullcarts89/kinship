// Deterministic date resolution (Checkpoint C). Expected days are written by
// hand from a calendar, not computed by the code under test.
// Run: deno test supabase/functions
import { type Direction, resolveDate } from "./dates.ts";

interface Vector {
  expr: string;
  at: string;
  tz: string | null;
  dir?: Direction;
  date: string | null;
  end?: string | null;
  precision: string;
  ambiguous?: boolean;
}

// Thursday 8 Oct 2026, 9:14 pm in Chicago (= Friday 02:14 UTC).
const THU = "2026-10-09T02:14:00Z";
const CHI = "America/Chicago";
// Friday 9 Oct 2026, 10:00 am in Chicago.
const FRI = "2026-10-09T15:00:00Z";
// Monday 28 Dec 2026, noon UTC.
const DEC28 = "2026-12-28T12:00:00Z";

const vectors: Vector[] = [
  // The vertical slice: "Ben runs Chicago Sunday", written Thursday night.
  { expr: "Sunday", at: THU, tz: CHI, dir: "future", date: "2026-10-11", precision: "day" },
  { expr: "Sunday", at: THU, tz: CHI, dir: "past", date: "2026-10-04", precision: "day" },
  { expr: "on Sunday", at: THU, tz: CHI, dir: "future", date: "2026-10-11", precision: "day" },
  { expr: "Sunday morning", at: THU, tz: CHI, dir: "future", date: "2026-10-11", precision: "day" },
  { expr: "this Friday", at: THU, tz: CHI, dir: "future", date: "2026-10-09", precision: "day" },
  { expr: "Thursday", at: THU, tz: CHI, dir: "future", date: "2026-10-08", precision: "day", ambiguous: true },
  { expr: "this coming Thursday", at: THU, tz: CHI, dir: "future", date: "2026-10-15", precision: "day" },
  // "next Friday" said on a Thursday: next week's Friday, flagged.
  { expr: "next Friday", at: THU, tz: CHI, dir: "future", date: "2026-10-16", precision: "day", ambiguous: true },
  { expr: "next Tuesday", at: THU, tz: CHI, dir: "future", date: "2026-10-13", precision: "day", ambiguous: false },
  { expr: "last Friday", at: THU, tz: CHI, dir: "past", date: "2026-10-02", precision: "day", ambiguous: false },
  { expr: "last Tuesday", at: THU, tz: CHI, dir: "past", date: "2026-09-29", precision: "day", ambiguous: true },
  { expr: "this past Tuesday", at: THU, tz: CHI, dir: "past", date: "2026-09-29", precision: "day", ambiguous: true },
  { expr: "Tues", at: THU, tz: CHI, dir: "future", date: "2026-10-13", precision: "day" },
  // Said on a Friday.
  { expr: "next Friday", at: FRI, tz: CHI, dir: "future", date: "2026-10-16", precision: "day", ambiguous: false },
  { expr: "Friday", at: FRI, tz: CHI, dir: "future", date: "2026-10-09", precision: "day", ambiguous: true },
  { expr: "Friday", at: FRI, tz: CHI, dir: "past", date: "2026-10-09", precision: "day", ambiguous: true },
  { expr: "Sunday", at: FRI, tz: CHI, dir: "future", date: "2026-10-11", precision: "day" },
  // Relative days.
  { expr: "today", at: THU, tz: CHI, date: "2026-10-08", precision: "day" },
  { expr: "tonight", at: THU, tz: CHI, date: "2026-10-08", precision: "day" },
  { expr: "tomorrow", at: THU, tz: CHI, date: "2026-10-09", precision: "day" },
  { expr: "Tomorrow night", at: THU, tz: CHI, date: "2026-10-09", precision: "day" },
  { expr: "yesterday", at: THU, tz: CHI, date: "2026-10-07", precision: "day" },
  { expr: "last night", at: THU, tz: CHI, date: "2026-10-07", precision: "day" },
  { expr: "the day after tomorrow", at: THU, tz: CHI, date: "2026-10-10", precision: "day" },
  { expr: "in 3 days", at: THU, tz: CHI, date: "2026-10-11", precision: "day" },
  { expr: "two days ago", at: THU, tz: CHI, date: "2026-10-06", precision: "day" },
  // Weekends and weeks.
  { expr: "this weekend", at: THU, tz: CHI, dir: "future", date: "2026-10-10", end: "2026-10-11", precision: "day" },
  { expr: "next weekend", at: THU, tz: CHI, dir: "future", date: "2026-10-17", end: "2026-10-18", precision: "day", ambiguous: true },
  { expr: "next week", at: THU, tz: CHI, date: "2026-10-12", end: "2026-10-18", precision: "week" },
  { expr: "last week", at: THU, tz: CHI, date: "2026-09-28", end: "2026-10-04", precision: "week" },
  { expr: "in two weeks", at: THU, tz: CHI, date: "2026-10-19", end: "2026-10-25", precision: "week" },
  // Months.
  { expr: "this month", at: THU, tz: CHI, date: "2026-10-01", end: "2026-10-31", precision: "month" },
  { expr: "next month", at: THU, tz: CHI, date: "2026-11-01", end: "2026-11-30", precision: "month" },
  { expr: "end of the month", at: THU, tz: CHI, date: "2026-10-25", end: "2026-10-31", precision: "week" },
  { expr: "the end of next month", at: THU, tz: CHI, date: "2026-11-24", end: "2026-11-30", precision: "week" },
  { expr: "March", at: THU, tz: CHI, dir: "future", date: "2027-03-01", end: "2027-03-31", precision: "month" },
  { expr: "in March", at: THU, tz: CHI, dir: "past", date: "2026-03-01", end: "2026-03-31", precision: "month" },
  { expr: "early November", at: THU, tz: CHI, dir: "future", date: "2026-11-01", end: "2026-11-07", precision: "week" },
  { expr: "mid March", at: THU, tz: CHI, dir: "future", date: "2027-03-11", end: "2027-03-20", precision: "week" },
  // Explicit dates and year rollover.
  { expr: "February 18", at: THU, tz: CHI, dir: "future", date: "2027-02-18", precision: "day" },
  { expr: "Feb 18th", at: THU, tz: CHI, dir: "future", date: "2027-02-18", precision: "day" },
  { expr: "Feb. 18, 2027", at: THU, tz: CHI, dir: "future", date: "2027-02-18", precision: "day" },
  { expr: "18 February", at: THU, tz: CHI, dir: "future", date: "2027-02-18", precision: "day" },
  { expr: "the 18th of February", at: THU, tz: CHI, dir: "future", date: "2027-02-18", precision: "day" },
  { expr: "October 11", at: THU, tz: CHI, dir: "future", date: "2026-10-11", precision: "day" },
  { expr: "October 1", at: THU, tz: CHI, dir: "future", date: "2027-10-01", precision: "day" },
  { expr: "October 1", at: THU, tz: CHI, dir: "past", date: "2026-10-01", precision: "day" },
  { expr: "2026-12-05", at: THU, tz: CHI, date: "2026-12-05", precision: "day" },
  { expr: "February 29", at: THU, tz: CHI, dir: "future", date: "2028-02-29", precision: "day" },
  { expr: "February 30", at: THU, tz: CHI, dir: "future", date: null, precision: "unknown" },
  { expr: "the 18th", at: THU, tz: CHI, dir: "future", date: "2026-10-18", precision: "day" },
  { expr: "the 3rd", at: THU, tz: CHI, dir: "future", date: "2026-11-03", precision: "day" },
  { expr: "the 3rd", at: THU, tz: CHI, dir: "past", date: "2026-10-03", precision: "day" },
  { expr: "10/11", at: THU, tz: CHI, dir: "future", date: "2026-10-11", precision: "day", ambiguous: true },
  { expr: "10/11", at: THU, tz: "Europe/London", dir: "future", date: "2026-11-10", precision: "day", ambiguous: true },
  { expr: "25/12", at: THU, tz: "Europe/London", dir: "future", date: "2026-12-25", precision: "day", ambiguous: false },
  { expr: "January 3", at: DEC28, tz: "UTC", dir: "future", date: "2027-01-03", precision: "day" },
  { expr: "next week", at: DEC28, tz: "UTC", date: "2027-01-04", end: "2027-01-10", precision: "week" },
  { expr: "next month", at: DEC28, tz: "UTC", date: "2027-01-01", end: "2027-01-31", precision: "month" },
  { expr: "this weekend", at: DEC28, tz: "UTC", dir: "future", date: "2027-01-02", end: "2027-01-03", precision: "day" },
  { expr: "New Year's Eve", at: DEC28, tz: "UTC", dir: "future", date: "2026-12-31", precision: "day" },
  { expr: "Christmas", at: DEC28, tz: "UTC", dir: "past", date: "2026-12-25", precision: "day" },
  { expr: "next year", at: DEC28, tz: "UTC", date: "2027-01-01", end: "2027-12-31", precision: "year" },
  // Ranges and weekday-qualified dates.
  { expr: "Feb 18–21", at: THU, tz: CHI, dir: "future", date: "2027-02-18", end: "2027-02-21", precision: "day" },
  { expr: "February 18 to 21", at: THU, tz: CHI, dir: "future", date: "2027-02-18", end: "2027-02-21", precision: "day" },
  { expr: "Dec 30 - Jan 2", at: THU, tz: CHI, dir: "future", date: "2026-12-30", end: "2027-01-02", precision: "day" },
  { expr: "Thursday the 15th", at: THU, tz: CHI, dir: "future", date: "2026-10-15", precision: "day", ambiguous: false },
  { expr: "Friday the 15th", at: THU, tz: CHI, dir: "future", date: "2026-10-15", precision: "day", ambiguous: true },
  { expr: "Sat, Feb 20", at: THU, tz: CHI, dir: "future", date: "2027-02-20", precision: "day", ambiguous: false },
  // Seasons (meteorological; southern hemisphere flips).
  { expr: "this winter", at: THU, tz: CHI, dir: "future", date: "2026-12-01", end: "2027-02-28", precision: "season" },
  { expr: "this winter", at: DEC28, tz: "UTC", dir: "future", date: "2026-12-01", end: "2027-02-28", precision: "season" },
  { expr: "this winter", at: THU, tz: "Australia/Sydney", dir: "future", date: "2027-06-01", end: "2027-08-31", precision: "season" },
  { expr: "next summer", at: THU, tz: CHI, dir: "future", date: "2027-06-01", end: "2027-08-31", precision: "season", ambiguous: false },
  { expr: "summer", at: THU, tz: CHI, dir: "past", date: "2026-06-01", end: "2026-08-31", precision: "season" },
  { expr: "in the fall", at: THU, tz: CHI, dir: "future", date: "2026-09-01", end: "2026-11-30", precision: "season" },
  // Holidays (US).
  { expr: "Thanksgiving", at: THU, tz: CHI, dir: "future", date: "2026-11-26", precision: "day" },
  { expr: "Christmas", at: THU, tz: CHI, dir: "future", date: "2026-12-25", precision: "day" },
  { expr: "Halloween", at: THU, tz: CHI, dir: "future", date: "2026-10-31", precision: "day" },
  { expr: "Easter", at: THU, tz: CHI, dir: "future", date: "2027-03-28", precision: "day" },
  { expr: "Mother's Day", at: THU, tz: CHI, dir: "future", date: "2027-05-09", precision: "day" },
  // DST: calendar days never shift. US DST starts Sun 8 Mar 2026, ends Sun 1 Nov 2026.
  { expr: "tomorrow", at: "2026-03-08T04:30:00Z", tz: "America/New_York", date: "2026-03-08", precision: "day" },
  { expr: "tomorrow", at: "2026-03-08T07:30:00Z", tz: "America/New_York", date: "2026-03-09", precision: "day" },
  { expr: "Sunday", at: "2026-03-08T07:30:00Z", tz: "America/New_York", dir: "future", date: "2026-03-08", precision: "day", ambiguous: true },
  { expr: "tomorrow", at: "2026-11-01T03:59:00Z", tz: "America/New_York", date: "2026-11-01", precision: "day" },
  { expr: "next week", at: "2026-11-01T05:30:00Z", tz: "America/New_York", date: "2026-11-02", end: "2026-11-08", precision: "week" },
  // Time zones: the same instant is a different day elsewhere.
  { expr: "tomorrow", at: THU, tz: "UTC", date: "2026-10-10", precision: "day" },
  { expr: "tomorrow", at: "2026-10-08T20:00:00Z", tz: "Asia/Tokyo", date: "2026-10-10", precision: "day" },
  { expr: "tomorrow", at: THU, tz: null, date: "2026-10-10", precision: "day", ambiguous: true },
  { expr: "tomorrow", at: THU, tz: "Not/AZone", date: "2026-10-10", precision: "day", ambiguous: true },
  // Vague or idiomatic: no date, never a guess.
  { expr: "sometime", at: THU, tz: CHI, date: null, precision: "unknown" },
  { expr: "sometime in November", at: THU, tz: CHI, dir: "future", date: "2026-11-01", end: "2026-11-30", precision: "month" },
  { expr: "around Christmas", at: THU, tz: CHI, dir: "future", date: "2026-12-25", precision: "day" },
  { expr: "soon", at: THU, tz: CHI, date: null, precision: "unknown" },
  { expr: "in a few weeks", at: THU, tz: CHI, date: null, precision: "unknown" },
  { expr: "the weekend after Thanksgiving", at: THU, tz: CHI, date: null, precision: "unknown" },
  { expr: "when he's back", at: THU, tz: CHI, date: null, precision: "unknown" },
];

Deno.test("date vectors", () => {
  const failures: string[] = [];
  for (const v of vectors) {
    const r = resolveDate(v.expr, v.at, v.tz, v.dir ?? "unclear");
    const want = { date: v.date, end: v.end ?? null, precision: v.precision };
    const got = { date: r.date, end: r.date_end, precision: r.precision };
    if (JSON.stringify(want) !== JSON.stringify(got)) {
      failures.push(`"${v.expr}" @${v.at} ${v.tz}: want ${JSON.stringify(want)} got ${JSON.stringify(got)} (${r.rule})`);
    }
    if (v.ambiguous !== undefined && r.ambiguous !== v.ambiguous) {
      failures.push(`"${v.expr}" @${v.at} ${v.tz}: ambiguous want ${v.ambiguous} got ${r.ambiguous}`);
    }
  }
  if (failures.length) throw new Error(`${failures.length}/${vectors.length} date vectors failed:\n${failures.join("\n")}`);
});

export const DATE_VECTOR_COUNT = vectors.length;
