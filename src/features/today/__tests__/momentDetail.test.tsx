// The Moment detail (founder I1): tap a reason → see the reason. Built only
// from Today's own view (the stored reason or the memory a Coming up line
// cites, a deterministic day, fixed sentences); looked up again every time,
// so a retracted or replaced memory never leaves a stale detail behind; and
// never a sheet on a sheet.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { buildToday, type ReasonRow, type TodayInput } from "../todayModel";
import { detailFor, quietKey } from "../momentDetail";
import { MomentDetailSheet } from "../MomentDetailSheet";
import { TodayView } from "../TodayView";
import { afterSheets, openSheets, sheetClosed, sheetOpened } from "@/ui/sheetStack";
import type { MemoryItem, Person } from "@/store/repositories";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const NOW = new Date(2026, 9, 12, 9, 0); // Monday Oct 12, 9am local
const TODAY = "2026-10-12";
const people = [
  { id: "ben", display_name: "Ben Carter", state: "active" },
  { id: "josh", display_name: "Josh", state: "active" },
  { id: "maya", display_name: "Maya Okafor", state: "active", birthday: "1990-10-13", birthday_source: "contacts" },
] as unknown as Person[];
const nameOf = (id: string) => ({ ben: "Ben", josh: "Josh", maya: "Maya" } as Record<string, string>)[id] ?? null;

function item(id: string, over: Partial<MemoryItem>): MemoryItem {
  return {
    id, kind: "event", person_id: "ben", statement: "", detail: {}, certainty: "stated", status: "active", sensitivity: "none",
    user_state: "unreviewed", subject_type: "person", origin: "extracted", created_at: "2026-10-08T21:14:00Z", ...over,
  } as MemoryItem;
}
const race = item("m1", {
  statement: "Ben runs Chicago Sunday",
  detail: { date: "2026-10-11", date_precision: "day", event_type: "race", followup_policy: "after", event_goal: "break four hours" },
});
const interview = item("m2", { person_id: "josh", statement: "Josh has his interview Tuesday", detail: { date: "2026-10-13", date_precision: "day", event_type: "interview", followup_policy: "both" } });
const dinner = item("m3", { person_id: "josh", kind: "plan", statement: "Dinner with Josh on Wednesday", detail: { date: "2026-10-14", date_precision: "day", firmness: "scheduled" } });

const day = (d: number) => new Date(2026, 9, d).toISOString();
function reason(id: string, type: string, person: string, itemId: string, from: number, to: number, over: Partial<ReasonRow> = {}): ReasonRow {
  return { id, person_id: person, type, window_start: day(from), window_end: day(to), score: type === "event_followup" ? 90 : 85,
    state: "candidate", dedupe_key: `${type}:${itemId}:x`, ...over };
}
function input(over: Partial<TodayInput> = {}): TodayInput {
  return {
    now: NOW, today: TODAY, items: [race, interview], people, local: {}, primaries: [], handoff: null,
    told: 3, questions: 0, toLookAt: 0, provenance: (id) => ({ line: "You told Kinship · Oct 8", noteId: `note-${id}` }),
    reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14)],
    ...over,
  };
}
function words(t: TestRenderer.ReactTestRenderer): string[] {
  return t.root.findAllByType(Text).map((n) => [n.props.children].flat().join("")).filter((s) => s.trim());
}
const rendered: TestRenderer.ReactTestRenderer[] = [];
function render(el: React.ReactElement) {
  let t!: TestRenderer.ReactTestRenderer;
  act(() => {
    t = TestRenderer.create(el);
  });
  rendered.push(t);
  return t;
}
afterEach(() => {
  // Every sheet drawn here leaves, as it does on the phone.
  act(() => rendered.splice(0).forEach((t) => t.unmount()));
});
const noop = () => undefined;

describe("I1: a Today reason → its detail", () => {
  it("a follow-up: the memory itself, why now, when, its source, and what the hand-off carries", () => {
    const view = buildToday(input());
    expect(view.moment?.statement).toBe("How did it go for Ben?");
    const d = detailFor(view, view.moment!.reasonId, TODAY, nameOf)!;
    expect(d).toMatchObject({
      personId: "ben", personName: "Ben", itemId: "m1",
      line: "Ben runs Chicago Sunday",
      hope: "Ben was hoping to break four hours.",
      why: "It was yesterday.",
      when: "Sun, Oct 11",
      provenance: "You told Kinship · Oct 8", noteId: "note-m1",
      reason: { id: "r1", type: "event_followup", ask: "Did you ask Ben how it went?", about: "Ben runs Chicago Sunday" },
    });
  });

  it("an upcoming event says when it is", () => {
    const view = buildToday(input({ reasons: [reason("r2", "upcoming_event", "josh", "m2", 12, 13)] }));
    expect(detailFor(view, "r2", TODAY, nameOf)).toMatchObject({
      line: "Josh has his interview Tuesday", why: "It's tomorrow.", when: "Tue, Oct 13", reason: { id: "r2", type: "upcoming_event" },
    });
  });

  it("good news says whether the note dated it or only when it was told", () => {
    const promoted = item("n1", { kind: "fact", statement: "Ben got promoted", created_at: "2026-10-12T08:00:00Z", detail: { category: "work" } });
    const told = buildToday(input({ items: [promoted], reasons: [] }));
    expect(detailFor(told, "news:n1", TODAY, nameOf)).toMatchObject({ line: "Ben got promoted", why: "You told Kinship today.", when: null });
    const dated = item("n2", { kind: "event", statement: "Ben got promoted Sunday", detail: { date: "2026-10-11", date_precision: "day", event_type: "other" } });
    expect(detailFor(buildToday(input({ items: [dated], reasons: [] })), "news:n2", TODAY, nameOf))
      .toMatchObject({ why: "It happened yesterday.", when: "Sun, Oct 11" });
  });

  it("never shows ids, scores or machinery", () => {
    const view = buildToday(input());
    const d = detailFor(view, "r1", TODAY, nameOf)!;
    const said = words(render(<MomentDetailSheet detail={d} onDismiss={noop} onMessage={noop} onCall={noop} onPerson={noop} onSource={noop} />)).join(" ");
    expect(said).toContain("Ben runs Chicago Sunday");
    expect(said).toContain("It was yesterday.");
    expect(said).toContain("Sun, Oct 11");
    expect(said).toContain("You told Kinship · Oct 8");
    expect(said).not.toMatch(/\br1\b|m1|note-|score|\b\d+(\.\d+)?%|confidence|event_followup/u);
  });
});

describe("I1: Coming up and Waiting lines → the same detail", () => {
  it("a Coming up plan, a promise falling due, a birthday", () => {
    const promise = item("p1", { person_id: "ben", kind: "promise", subject_type: "user", statement: "You said you'd send Ben the restaurant", detail: { due_date: "2026-10-15" } });
    const view = buildToday(input({ items: [race, dinner, promise], reasons: [] }));
    const lines = view.quiet.filter((q) => q.kind === "coming");
    const byText = (t: string) => lines.find((q) => q.text === t)!;
    expect(detailFor(view, quietKey(byText("Dinner with Josh on Wednesday"))!, TODAY, nameOf)).toMatchObject({
      type: "coming", personName: "Josh", itemId: "m3", line: "Dinner with Josh on Wednesday", why: "It's on Wednesday.", when: "Wed, Oct 14",
      provenance: "You told Kinship · Oct 8", noteId: "note-m3",
    });
    expect(detailFor(view, quietKey(byText("You said you'd send Ben the restaurant"))!, TODAY, nameOf))
      .toMatchObject({ why: "It's due on Thursday.", reason: { type: "coming", about: "You said you'd send Ben the restaurant" } });
    expect(detailFor(view, quietKey(byText("Maya's birthday"))!, TODAY, nameOf))
      .toMatchObject({ itemId: null, line: "Maya's birthday", why: "Maya's birthday is tomorrow.", provenance: "From Contacts" });
  });

  it("someone's promise, a few days past due", () => {
    const owed = item("w1", { person_id: "josh", kind: "promise", subject_type: "person", statement: "Josh said he'd send you his contractor's number", detail: { due_date: "2026-10-10" } });
    const view = buildToday(input({ items: [owed], reasons: [] }));
    const waiting = view.quiet.find((q) => q.kind === "waiting")!;
    expect(detailFor(view, quietKey(waiting)!, TODAY, nameOf)).toMatchObject({
      type: "waiting", line: "Josh said he'd send you his contractor's number", why: "It was due on Saturday.", reason: { type: "waiting" },
    });
  });
});

describe("I1: never stale", () => {
  it("a Coming up memory retracted while its detail is open: the detail is gone", () => {
    const view = buildToday(input({ items: [dinner], reasons: [] }));
    const key = quietKey(view.quiet.find((q) => q.kind === "coming" && q.itemId === "m3")!)!;
    expect(detailFor(view, key, TODAY, nameOf)).not.toBeNull();
    const after = buildToday(input({ items: [{ ...dinner, status: "retracted", deleted_at: "2026-10-12T09:01:00Z" }], reasons: [] }));
    expect(detailFor(after, key, TODAY, nameOf)).toBeNull();
  });

  it("a reason suppressed (its memory replaced) while its detail is open: the detail is gone", () => {
    const view = buildToday(input());
    expect(detailFor(view, "r1", TODAY, nameOf)).not.toBeNull();
    expect(detailFor(buildToday(input({ reasons: [reason("r1", "event_followup", "ben", "m1", 12, 14, { state: "suppressed" })] })), "r1", TODAY, nameOf)).toBeNull();
    expect(detailFor(buildToday(input({ items: [{ ...race, status: "superseded" }] })), "r1", TODAY, nameOf)).toBeNull();
  });
});

describe("I1: on screen", () => {
  it("tapping the Moment's words opens its detail; its actions stay as they were", () => {
    const view = buildToday(input());
    const open = jest.fn();
    const primary = jest.fn();
    const t = render(
      <TodayView view={view} afterReturn={null} onPrimary={primary} onOpenMoment={open} onNotNow={noop} onProvenance={noop}
        onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} />,
    );
    act(() => t.root.find((n) => n.props.accessibilityLabel === "How did it go for Ben?" && typeof n.props.onPress === "function").props.onPress());
    expect(open).toHaveBeenCalledTimes(1);
    act(() => t.root.find((n) => n.props.accessibilityLabel === "Ask how it went" && typeof n.props.onPress === "function").props.onPress());
    expect(primary).toHaveBeenCalledTimes(1);
  });

  it("the detail offers Message, Call and View Ben", () => {
    const d = detailFor(buildToday(input()), "r1", TODAY, nameOf)!;
    const message = jest.fn();
    const call = jest.fn();
    const person = jest.fn();
    const source = jest.fn();
    const t = render(<MomentDetailSheet detail={d} onDismiss={noop} onMessage={message} onCall={call} onPerson={person} onSource={source} />);
    const press = (label: string) => act(() => t.root.find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function").props.onPress());
    press("Message");
    press("Call");
    press("View Ben");
    press("You told Kinship · Oct 8");
    expect([message, call, person].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
    expect(source).toHaveBeenCalledWith("note-m1");
  });

  it("never a sheet on a sheet: what follows the detail waits until it has left", () => {
    expect(openSheets()).toBe(0);
    sheetOpened(); // the detail, on its way out
    const next = jest.fn();
    afterSheets(next);
    expect(next).not.toHaveBeenCalled();
    sheetClosed();
    expect(next).toHaveBeenCalledTimes(1);
    // With nothing open, it runs at once.
    const now = jest.fn();
    afterSheets(now);
    expect(now).toHaveBeenCalledTimes(1);
  });
});
