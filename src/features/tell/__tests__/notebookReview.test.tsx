// The notebook review (PR #77 §7; flag `notebook_deck`) does what the review always did, drawn as
// the prototype draws it: the header says who it was kept for and how many questions; "Your words"
// underlines each phrase in its person's colour and finds its line; "Who is this about?" answers
// with that person, never a guess; a personal reading is kept only on "Keep it"; × is "Not this";
// the sentence edits in place and the user's words go through the correction path; the day token
// offers as said, a day the user wrote, or another day; Done, Undo this note.
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { Animated, Text } from "react-native";
import { NotebookReview, NOTEBOOK_REVIEW_COPY, type NotebookReviewProps } from "../notebook/NotebookReview";
import type { NoteWords } from "../notebook/useNoteWords";
import { buildReview } from "../reviewModel";
import type { HeldItem } from "@/store/gateway";
import type { MemoryItem, Person } from "@/store/repositories";
import type { UnderstandingRow } from "@/store/understanding";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/hooks/usePersonPortrait", () => ({ usePersonPortrait: () => ({ uri: null, ready: true, pick: async () => undefined, remove: async () => undefined }) }));
let mockReduce = false;
jest.mock("@/ui/theme", () => ({ ...jest.requireActual("@/ui/theme"), useReduceMotion: () => mockReduce }));

const TODAY = "2026-11-02";
const TOLD = "2026-11-02T18:00:00.000Z";
const NOTE = "Lunch with Priya today, she's back from Lisbon for good!! Moving into a place in Oakland on the 15th I think? or mid-November anyway. "
  + "Her mom's knee surgery went fine. Then Sam called, she got the promotion!!! Oh and Josh, his interview got moved to Thursday at 10.";

const people = [
  { id: "priya", display_name: "Priya", full_name: "Priya Shah", state: "active", relationship_label: "Friend from your Lisbon year" },
  { id: "josh", display_name: "Josh", state: "active" },
  { id: "lee", display_name: "Sam", full_name: "Sam Delgado", state: "active", relationship_label: "pottery studio" },
  { id: "diaz", display_name: "Sam", state: "active", relationship_label: "Josh's friend from work" },
] as unknown as Person[];

const item = (id: string, person: string, statement: string, extra: Partial<MemoryItem> = {}) => ({
  id, kind: "fact", person_id: person, statement, status: "active", user_state: "unreviewed", subject_type: "person",
  subject_related_id: null, origin: "extracted", certainty: "stated", detail: {}, ...extra,
} as unknown as MemoryItem);

const back = item("m1", "priya", "Priya is back from Lisbon for good");
const moving = item("m2", "priya", "Priya is moving into a place in Oakland mid-November", { kind: "event", detail: { date_hint: "mid-November" } } as Partial<MemoryItem>);
const interview = item("m3", "josh", "Josh's interview moved to Thu, Nov 5 at 10:00", { kind: "event", detail: { date: "2026-11-05", date_precision: "day" } } as Partial<MemoryItem>);

const span = (quote: string) => ({ start: [...NOTE.slice(0, NOTE.indexOf(quote))].length, end: [...NOTE.slice(0, NOTE.indexOf(quote) + quote.length)].length, quote });
const samHeld: HeldItem = {
  kind: "milestone", person_id: null, new_person_name: null, subject_type: "person", related: null,
  statement: "Sam got the promotion", detail: {}, certainty: "stated", sensitivity: "none", tier: "hold",
  flags: ["person_ambiguous"], spans: [span("Then Sam called, she got the promotion!!!")], mention: "Sam",
};
const momHeld: HeldItem = {
  kind: "fact", person_id: "priya", new_person_name: null, subject_type: "person", related: null,
  statement: "Priya's mom had knee surgery, and it went fine", detail: {}, certainty: "stated", sensitivity: "health", tier: "hold",
  flags: ["sensitive"], spans: [span("Her mom's knee surgery went fine.")],
};

const row = (held: HeldItem[]): UnderstandingRow => ({
  capture_id: "c1", state: "review", answer: null, notice: null, attempts: 0, next_at: null, seen_at: null, understood_at: null, shown_at: null,
  first_request_at: null, request_at: null, server_ms: null, retries: null, created_at: TOLD, updated_at: TOLD,
  reading: { tier: held.length ? "clarify" : "confirm", saved: [{ id: "m1", tier: "auto" }, { id: "m2", tier: "auto" }, { id: "m3", tier: "auto" }], held, clarification: null, review_created_at: "t", settled: false },
});

const at = (phrase: string) => ({ start: NOTE.indexOf(phrase), end: NOTE.indexOf(phrase) + phrase.length });
function wordsFor(extra: Partial<NoteWords> = {}): NoteWords {
  return {
    captureId: "c1", text: NOTE, toldAt: TOLD, unprocessed: [], known: [],
    marks: [
      { key: "line:m1", target: { kind: "line", id: "m1" }, personId: "priya", ...at("she's back from Lisbon for good") },
      { key: "line:m2", target: { kind: "line", id: "m2" }, personId: "priya", ...at("Moving into a place in Oakland on the 15th I think? or mid-November anyway.") },
      { key: "held:0", target: { kind: "held", index: 0 }, personId: null, ...at("Then Sam called, she got the promotion!!!") },
      { key: "line:m3", target: { kind: "line", id: "m3" }, personId: "josh", ...at("his interview got moved to Thursday at 10") },
    ],
    quotes: {
      "line:m1": "she's back from Lisbon for good",
      "line:m2": "Moving into a place in Oakland on the 15th I think? or mid-November anyway.",
      "line:m3": "his interview got moved to Thursday at 10",
      "held:0": "Then Sam called, she got the promotion!!!",
      "held:1": "Her mom's knee surgery went fine.",
    },
    ...extra,
  };
}

function render(held: HeldItem[] = [samHeld, momHeld], words: NoteWords | null = wordsFor(), items = [back, moving, interview]) {
  const view = buildReview({
    row: row(held), capture: { id: "c1", raw_text: NOTE, context_person_id: null, status: "needs_review" }, items, people,
    related: [], offline: false, today: TODAY,
  });
  const props: NotebookReviewProps = {
    view, people, today: TODAY, words,
    onDismiss: jest.fn(), onDone: jest.fn(), onUndo: jest.fn(), onReject: jest.fn(), onCorrect: jest.fn(),
    onAnswer: jest.fn(), onOpenNote: jest.fn(), onActivity: jest.fn(),
  };
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<NotebookReview {...props} />);
  });
  mounted.push(tree);
  return { tree, props };
}
const mounted: TestRenderer.ReactTestRenderer[] = [];
afterEach(() => {
  // Unmounted, every underline and pulse stops with it.
  for (const t of mounted.splice(0)) act(() => t.unmount());
});

function all(tree: TestRenderer.ReactTestRenderer, label: string) {
  return tree.root.findAll((n: ReactTestInstance) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function");
}
function press(tree: TestRenderer.ReactTestRenderer, label: string) {
  const [target] = all(tree, label);
  if (!target) throw new Error(`nothing to press: ${label}`);
  act(() => target.props.onPress());
}
function texts(tree: TestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map((t) => [t.props.children].flat().filter((c) => typeof c === "string").join("")).filter((s) => s.trim());
}

beforeEach(() => {
  mockReduce = false;
});

it("composes as the prototype: who it was kept for and one question each, the title, your words, needs you, a group per person", () => {
  const { tree } = render();
  const said = texts(tree);
  expect(said).toEqual(expect.arrayContaining([
    "Kept for Priya and Josh · two questions",
    NOTEBOOK_REVIEW_COPY.title,
    "Your words · Mon, Nov 2",
    "Who is this about?",
    "Which Sam do you mean?",
    "Needs your yes",
    "Priya's mom had knee surgery, and it went fine",
    "Priya Shah",
    "Friend from your Lisbon year",
    "Josh",
    "Priya is back from Lisbon for good",
    // The user's own words for what is asked, never the reading's paraphrase in quotation marks.
    "“Then Sam called, she got the promotion!!!”",
    NOTEBOOK_REVIEW_COPY.done,
    NOTEBOOK_REVIEW_COPY.undo,
  ]));
  // Who it's about comes before a yes for anything personal; groups come after both.
  const order = ["Who is this about?", "Needs your yes", "Priya Shah", "Josh"];
  expect(said.filter((s) => order.includes(s))).toEqual(order);
  // The day sits in its sentence as a token (a dotted underline), the sentence whole for VoiceOver.
  expect(all(tree, "Josh's interview moved to Thu, Nov 5 at 10:00").length).toBeGreaterThan(0);
  expect(all(tree, "When: Thu, Nov 5").length).toBeGreaterThan(0);
  expect(said).not.toContain("“Sam got the promotion”");
  // No AI look, nothing counted about anyone.
  for (const t of said) expect(t).not.toMatch(/\b(tier|confidence|score|model|AI|extract\w*|pending|unreviewed)\b|0\.\d/);
});

it("two people a name can mean: one question, the people with their faces and how they know them; the pick is the answer", () => {
  const { tree, props } = render([samHeld]);
  // Two Sams read by their full names where there is one (PR #77 review-j2.jpg), with how they know them.
  expect(texts(tree)).toEqual(expect.arrayContaining(["Sam Delgado", "pottery studio", "Sam", "Josh's friend from work"]));
  press(tree, "Sam (pottery studio)");
  expect(props.onAnswer).toHaveBeenCalledWith([{ index: 0, person_id: "lee" }]);
  // Answered says so, in the user's words.
  expect(texts(tree)).toEqual(expect.arrayContaining([NOTEBOOK_REVIEW_COPY.answered, "“Then Sam called, she got the promotion!!!” is Sam (pottery studio)."]));
});

it("a personal reading is memory only on Keep it; Don't keep keeps nothing; both answers go together", () => {
  const yes = render();
  press(yes.tree, "Sam (Josh's friend from work)");
  // Not sent until every question has its answer (as built).
  expect(yes.props.onAnswer).not.toHaveBeenCalled();
  press(yes.tree, NOTEBOOK_REVIEW_COPY.keepIt);
  expect(yes.props.onAnswer).toHaveBeenCalledWith([{ index: 0, person_id: "diaz" }, { index: 1, accept: true }]);

  const no = render([momHeld]);
  press(no.tree, NOTEBOOK_REVIEW_COPY.dontKeep);
  expect(no.props.onAnswer).toHaveBeenCalledWith([{ index: 0, skip: true }]);
  expect(texts(no.tree)).toContain("You said don’t keep it.");
});

it("× is Not this: the line stays, struck through and not kept, with no way to pretend it's back", () => {
  const { tree, props } = render([]);
  press(tree, "Not this: Priya is back from Lisbon for good");
  expect(props.onReject).toHaveBeenCalledWith("m1");
  // The store drops it; the review keeps showing it, struck through.
  act(() => tree.update(<NotebookReview {...props} view={{ ...props.view, lines: props.view.lines.filter((l) => l.id !== "m1") }} />));
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === "Not kept: Priya is back from Lisbon for good").length).toBeGreaterThan(0);
  expect(all(tree, "Not this: Priya is back from Lisbon for good")).toHaveLength(0);
});

it("the sentence edits in place, from the user's own words, through the correction path", () => {
  const { tree, props } = render([]);
  press(tree, "Priya is back from Lisbon for good");
  expect(texts(tree)).toContain("From your words: “she's back from Lisbon for good”");
  const field = tree.root.find((n) => n.props.accessibilityLabel === "The words for this line" && typeof n.props.onChangeText === "function");
  act(() => field.props.onChangeText("Priya moved back from Lisbon for good"));
  press(tree, "Save");
  expect(props.onCorrect).toHaveBeenCalledWith("m1", { statement: "Priya moved back from Lisbon for good" });
});

it("Cancel leaves the words as they were", () => {
  const { tree, props } = render([]);
  press(tree, "Priya is back from Lisbon for good");
  press(tree, "Cancel");
  expect(props.onCorrect).not.toHaveBeenCalled();
  expect(texts(tree)).not.toContain("From your words: “she's back from Lisbon for good”");
});

it("the day token: as you said it first (kept as said), a day you wrote, then another day", () => {
  const { tree, props } = render([]);
  expect(texts(tree)).toContain(NOTEBOOK_REVIEW_COPY.asSaid);
  press(tree, "When: “mid-November”");
  const said = texts(tree);
  expect(said).toEqual(expect.arrayContaining([NOTEBOOK_REVIEW_COPY.asSaidOption, "Sun, Nov 15", NOTEBOOK_REVIEW_COPY.wroteOption("on the 15th"), NOTEBOOK_REVIEW_COPY.anotherDay]));
  expect(said.indexOf(NOTEBOOK_REVIEW_COPY.asSaidOption)).toBeLessThan(said.indexOf("Sun, Nov 15"));
  // As you said it changes nothing.
  press(tree, `“mid-November”. ${NOTEBOOK_REVIEW_COPY.asSaidOption}`);
  expect(props.onCorrect).not.toHaveBeenCalled();
  press(tree, "When: “mid-November”");
  press(tree, `Sun, Nov 15. ${NOTEBOOK_REVIEW_COPY.wroteOption("on the 15th")}`);
  expect(props.onCorrect).toHaveBeenCalledWith("m2", { date: "2026-11-15" });
  // Another day… is the calendar, as built.
  press(tree, "When: “mid-November”");
  press(tree, NOTEBOOK_REVIEW_COPY.anotherDay);
  press(tree, "Friday, November 20, 2026");
  expect(props.onCorrect).toHaveBeenCalledWith("m2", { date: "2026-11-20" });
});

it("a day the user didn't write is never offered as one", () => {
  const { tree } = render([]);
  press(tree, "When: Thu, Nov 5");
  // "Thursday" is the day the line already has: nothing new to offer.
  expect(texts(tree)).toEqual(expect.arrayContaining([NOTEBOOK_REVIEW_COPY.asItIs, NOTEBOOK_REVIEW_COPY.anotherDay]));
  expect(texts(tree).some((t) => t.startsWith("You wrote"))).toBe(false);
});

it("a phrase finds its line; a line lights its phrase", () => {
  const { tree } = render([]);
  // Underlined phrases are links that say which line they show (spec §10).
  const phrase = all(tree, "Shows the line: Priya is back from Lisbon for good");
  expect(phrase.length).toBeGreaterThan(0);
  expect(() => act(() => phrase[0].props.onPress())).not.toThrow();
  // Tapping the line's body lights its phrase in Your words.
  const body = tree.root.findAll((n) => n.props.accessible === false && typeof n.props.onPress === "function");
  act(() => body[0].props.onPress());
  const lit = tree.root.findAll((n) => n.props.accessibilityLabel === "Shows the line: Priya is back from Lisbon for good" && n.props.style?.backgroundColor);
  expect(lit.length).toBeGreaterThan(0);
});

it("long words fold to five lines with Show all of it", () => {
  const { tree } = render([]);
  const folded = tree.root.findAll((n) => n.type === Text && n.props.numberOfLines === 5);
  expect(folded.length).toBeGreaterThan(0);
  press(tree, "Show all of it");
  expect(tree.root.findAll((n) => n.type === Text && n.props.numberOfLines === 5)).toHaveLength(0);
  expect(all(tree, "Show less").length).toBeGreaterThan(0);
  expect(all(tree, "Show all of it")).toHaveLength(0);
});

it("words the understanding did not get to stay, grey and dotted; nothing is dropped", () => {
  const rest = at("Oh and Josh, his interview got moved to Thursday at 10.");
  const { tree } = render([], wordsFor({ marks: wordsFor().marks.filter((m) => m.key !== "line:m3"), unprocessed: [rest] }));
  const dotted = tree.root.findAll((n) => n.type === Text && n.props.style?.textDecorationStyle === "dotted");
  expect(dotted.map((n) => [n.props.children].flat().join(""))).toContain("Oh and Josh, his interview got moved to Thursday at 10.");
});

it("Done leaves an unanswered question waiting; with nothing to ask, Done is Done; Undo this note is the exact Undo", () => {
  const waiting = render();
  press(waiting.tree, NOTEBOOK_REVIEW_COPY.done);
  expect(waiting.props.onDismiss).toHaveBeenCalled();
  expect(waiting.props.onDone).not.toHaveBeenCalled();

  const clear = render([]);
  press(clear.tree, NOTEBOOK_REVIEW_COPY.done);
  expect(clear.props.onDone).toHaveBeenCalled();
  press(clear.tree, NOTEBOOK_REVIEW_COPY.undo);
  expect(clear.props.onUndo).toHaveBeenCalled();
});

describe("the underlines arrive one after another", () => {
  afterEach(() => jest.restoreAllMocks());
  const underlineTimings = () => {
    const timing = jest.spyOn(Animated, "timing");
    render([]);
    return timing.mock.calls.map(([, c]) => c as { duration?: number; delay?: number }).filter((c) => c.duration === 600 || c.duration === 150);
  };

  it("600 ms each, 110 ms apart, in the order the user wrote them", () => {
    const calls = underlineTimings();
    expect(calls.map((c) => [c.duration, c.delay])).toEqual([[600, 0], [600, 110], [600, 220], [600, 330]]);
  });

  it("Reduce Motion: one 150 ms fade, no sweep", () => {
    mockReduce = true;
    const calls = underlineTimings();
    expect(calls.map((c) => [c.duration, c.delay])).toEqual([[150, 0], [150, 0], [150, 0], [150, 0]]);
  });
});
