// Founder invariant (D1 review): user-visible memory wording is grounded too,
// on every 2.0 surface: Today's moment, the Kept line, the hand-off, the
// review, the relationship page, People, What Kinship knows and the Source.
// The canonical Ben note never says "marathon", a distance or a time; the
// screens may format dates, punctuation and labels, but must not add a claim
// the memory or its note doesn't make: not from event_type, the goal, the
// place, or anything else structured.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { NoteView } from "@/features/person/NoteView";
import { PersonRecordView } from "@/features/person/PersonRecordView";
import { provenanceLine } from "@/features/memory/format";
import { PortraitView } from "@/features/person/PortraitView";
import { PeopleView } from "@/features/people/PeopleView";
import { ReviewSheet } from "@/features/tell/ReviewSheet";
import { KeptLine, TellDockView } from "@/features/tell/TellDock";
import { buildReview, itemLine } from "@/features/tell/reviewModel";
import { HandoffSheet } from "@/features/today/HandoffSheet";
import { TodayView } from "@/features/today/TodayView";
import { buildToday } from "@/features/today/todayModel";
import { runsOf } from "@/hooks/useV2";
import type { MemoryItem, Person } from "@/store/repositories";
import type { UnderstandingRow } from "@/store/understanding";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => { throw new Error("not used"); } }));

const NOTE = "Ben runs Chicago Sunday. He's hoping to break four hours.";
const TODAY = "2026-10-08";
const UNGROUNDED = /marathon|26\.2|4:00|sub-?4|\brace\b/i;

// The memory exactly as the pipeline writes it for this note (eval core-001,
// handler.test.ts "the vertical slice"): the note's own words, the goal kept
// in detail, the structured event type never in the statement.
const people = [{ id: "ben", display_name: "Ben", state: "active" }] as unknown as Person[];
const race = {
  id: "m1", kind: "event", person_id: "ben", statement: "Ben runs Chicago Sunday", status: "active", user_state: "unreviewed",
  subject_type: "person", subject_related_id: null, origin: "extracted", certainty: "stated",
  detail: { event_type: "race", followup_policy: "after", date_precision: "day", date: "2026-10-11", date_hint: "Sunday", event_goal: "break four hours" },
} as unknown as MemoryItem;

const row = (tier: "auto" | "confirm"): UnderstandingRow => ({
  capture_id: "c1", state: "review", answer: null, notice: null, attempts: 0, next_at: null, seen_at: null,
  created_at: "2026-10-08T21:14:00.000Z", updated_at: "2026-10-08T21:14:00.000Z",
  reading: { tier, saved: [{ id: "m1", tier }], held: [], clarification: null, review_created_at: null, settled: tier === "auto" },
});
const view = (tier: "auto" | "confirm") => buildReview({
  row: row(tier), capture: { id: "c1", raw_text: NOTE, context_person_id: null, status: tier === "auto" ? "extracted" : "needs_review" },
  items: [race], people, related: [], offline: false, today: TODAY,
});

function rendered(el: React.ReactElement): string[] {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  const out = tree.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);
  for (const n of tree.root.findAll((x) => typeof x.props.accessibilityLabel === "string")) out.push(n.props.accessibilityLabel as string);
  return out;
}
const noop = () => undefined;

it("Ben, everywhere it's shown: the note's words, a formatted date, and nothing it didn't say", () => {
  const summary = view("auto");
  const sheet = view("confirm");
  const line = itemLine(race, { people, related: [], today: TODAY });
  // Today, the day after: the follow-up for Ben's Sunday, phrased from templates and the note's own words.
  const today = buildToday({
    now: new Date(2026, 9, 12, 9, 0), today: "2026-10-12", items: [{ ...race, sensitivity: "none" } as MemoryItem], people,
    reasons: [{ id: "r1", person_id: "ben", type: "event_followup", window_start: new Date(2026, 9, 12).toISOString(),
      window_end: new Date(2026, 9, 14).toISOString(), score: 90, state: "candidate", dedupe_key: "event_followup:m1:2026-10-11" }],
    local: {}, primaries: [], handoff: null, told: 1, questions: 0, toLookAt: 0,
    provenance: () => ({ line: "You told Kinship · Oct 8", noteId: "c1" }),
  });
  expect(today.moment?.statement).toBe("How did it go for Ben?");
  const surfaces: Record<string, string[]> = {
    summary: [summary.summary ?? "", summary.heading],
    kept: rendered(<TellDockView tellOn draft="" onDraft={noop} onSend={noop} current="today" onGo={noop}
      line={<KeptLine text={summary.summary ?? ""} onOpen={noop} onUndo={noop} />} />),
    today: rendered(<TodayView view={today} afterReturn={null} onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop}
      onRemember={noop} onNothing={noop} onQuiet={noop} />),
    handoff: rendered(<HandoffSheet visible heading={today.moment?.heading ?? ""} personName="Ben" mention={today.moment?.mention ?? []}
      channels={["text", "call"]} ready onOpen={noop} onChooseContact={noop} onDismiss={noop} returnCheck />),
    portrait: rendered(<PortraitView personId="ben" name="Ben" label={null} remembered={false} comingUp={[]} youSaid={[]} between={[]} total={1}
      lately={[{ itemId: "m1", statement: race.statement, when: line.when?.label ?? null, provenance: "You told Kinship · Oct 8", noteId: "c1" }]}
      onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop} />),
    people: rendered(<PeopleView rows={[{ id: "ben", label: "Ben", line: race.statement, remembered: false }]} onOpen={noop} onAdd={async () => undefined} />),
    sheet: rendered(<ReviewSheet view={sheet} visible people={people} today={TODAY} onDismiss={noop} onDone={noop} onUndo={noop}
      onReject={noop} onCorrect={noop} onAnswer={noop} onOpenNote={noop} onActivity={noop} />),
    record: rendered(<PersonRecordView name="Ben" label={null} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop}
      lines={[{ line, provenance: provenanceLine([{ source_kind: "capture", capture_id: "c1", created_at: "2026-10-08T21:14:00" }], new Date("2026-10-09T12:00:00")), noteId: "c1", conflict: null }]} />),
    source: rendered(<NoteView onBack={noop} onPerson={noop} onDelete={noop} note={{
      runs: runsOf(NOTE, [{ start: 0, end: 23 }, { start: 25, end: 56 }]), quotes: [], arrived: "Typed · Oct 8, 9:14 pm",
      items: [{ id: "m1", statement: race.statement, person: "Ben", personId: "ben" }] }} />),
  };
  expect(summary.summary).toBe("Kept: Ben runs Chicago Sunday · Sun, Oct 11");
  for (const [surface, strings] of Object.entries(surfaces)) {
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) expect([surface, s, UNGROUNDED.test(s)]).toEqual([surface, s, false]);
    // Every surface that shows the memory shows it in the note's words (the hand-off lists other things to mention).
    if (surface !== "handoff") expect([surface, strings.some((s) => s.includes("Ben runs Chicago Sunday"))]).toEqual([surface, true]);
  }
  // The structured detail is never turned into words on screen.
  for (const strings of Object.values(surfaces)) {
    expect(strings.some((s) => /four hours/.test(s) && !NOTE.includes(s) && !/^“?Ben runs/.test(s))).toBe(false);
  }
});

it("the formatter adds only dates and labels: a statement is shown exactly as remembered", () => {
  const v = view("confirm");
  expect(v.lines.map((l) => l.statement)).toEqual(["Ben runs Chicago Sunday"]);
  expect(v.lines[0].when?.label).toBe("Sun, Oct 11");
  expect(v.lines[0].kind.label).toBe("Something happening");
});
