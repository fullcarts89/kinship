// Changing an item's kind or date keeps its detail valid for the database.
// RULES mirrors memory_detail_ok (supabase/migrations/20261004110000_v2_temporal_detail.sql):
// allowed and required keys per kind, and a date range needs its start.
import { detailForKind, isIsoDay, SWITCHABLE_KINDS, takesDate, withDate } from "@/store/memoryDetail";

const RULES: Record<string, { allowed: string[]; required: string[] }> = {
  fact: { allowed: ["category", "attribute", "value", "date", "date_end", "date_precision", "date_hint"], required: ["category"] },
  event: { allowed: ["date", "date_end", "date_precision", "time_of_day", "date_hint", "event_type", "followup_policy", "event_goal"],
    required: ["date_precision", "event_type", "followup_policy"] },
  promise: { allowed: ["due_hint", "due_date", "outcome"], required: [] },
  plan: { allowed: ["when_hint", "season", "date", "firmness"], required: ["firmness"] },
  thread: { allowed: ["topic", "followup_after_days", "last_checked", "date_hint"], required: ["topic", "followup_after_days"] },
  moment: { allowed: ["date", "date_end", "date_precision", "date_hint", "place", "photo_ids"], required: [] },
  milestone: { allowed: ["date", "date_end", "date_precision", "date_hint", "milestone_type", "anniversary"],
    required: ["milestone_type", "anniversary"] },
};

function valid(kind: string, d: Record<string, unknown>): boolean {
  const r = RULES[kind];
  return Object.keys(d).every((k) => r.allowed.includes(k) && d[k] !== undefined)
    && r.required.every((k) => k in d)
    && (!("date_end" in d) || "date" in d)
    && Object.entries(d).every(([k, v]) => !["date", "date_end", "due_date"].includes(k) || isIsoDay(String(v)));
}

const SAMPLES: Record<string, Record<string, unknown>> = {
  fact: { category: "home", date: "2026-09-01", date_end: "2026-09-30", date_precision: "month", date_hint: "last month" },
  event: { event_type: "race", followup_policy: "after", date: "2026-10-11", date_precision: "day", date_hint: "Sunday", event_goal: "sub 4" },
  plan: { firmness: "idea", when_hint: "this summer", season: "summer" },
  thread: { topic: "kitchen", followup_after_days: 42, date_hint: "for a while" },
  moment: { date: "2026-10-03", date_end: "2026-10-04", date_precision: "week", date_hint: "last weekend", place: "the lake" },
  milestone: { milestone_type: "graduation", anniversary: false, date: "2024-01-01", date_end: "2024-12-31", date_precision: "year", date_hint: "in 2024" },
  promise: { due_hint: "by Friday", due_date: "2026-10-09" },
};

it("every kind switch yields detail the database accepts, keeping what still applies", () => {
  for (const [from, detail] of Object.entries(SAMPLES)) {
    for (const to of SWITCHABLE_KINDS) {
      const out = detailForKind(from, detail, to, "Sam is redoing his kitchen");
      expect([from, to, valid(to, out)]).toEqual([from, to, true]);
    }
  }
  // The day survives event → plan; the user's words survive where no day exists.
  expect(detailForKind("event", SAMPLES.event, "plan", "x")).toEqual({ firmness: "intended", date: "2026-10-11", when_hint: "Sunday" });
  expect(detailForKind("plan", SAMPLES.plan, "event", "x")).toEqual({
    event_type: "other", followup_policy: "after", date_hint: "this summer", date_precision: "unknown" });
  // A year stays a year: a plan can't hold a range, so it keeps the words instead of inventing a day.
  expect(detailForKind("milestone", SAMPLES.milestone, "plan", "x")).toEqual({ firmness: "intended", when_hint: "in 2024" });
  expect(detailForKind("fact", SAMPLES.fact, "thread", "Ana moved to Lisbon")).toEqual({
    topic: "Ana moved to Lisbon", followup_after_days: 14, date_hint: "last month" });
});

it("sets or clears a date the way each kind keeps it, never inventing one", () => {
  for (const kind of ["fact", "event", "moment", "milestone", "plan", "promise"]) {
    expect(takesDate(kind)).toBe(true);
    const set = withDate(kind, SAMPLES[kind], "2026-10-12");
    const cleared = withDate(kind, SAMPLES[kind], null);
    expect([kind, valid(kind, set), valid(kind, cleared)]).toEqual([kind, true, true]);
    expect(JSON.stringify(cleared)).not.toMatch(/2026-|2024-/);
  }
  expect(withDate("event", SAMPLES.event, null)).toEqual({ event_type: "race", followup_policy: "after", event_goal: "sub 4", date_precision: "unknown" });
  expect(withDate("promise", SAMPLES.promise, "2026-10-12")).toEqual({ due_date: "2026-10-12" });
  expect(() => withDate("event", SAMPLES.event, "2026-02-30")).toThrow();
  expect(() => withDate("thread", SAMPLES.thread, "2026-10-12")).toThrow();
  expect(takesDate("thread")).toBe(false);
});
