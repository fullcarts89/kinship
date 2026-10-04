// The review sheet does what its words say: a choice answers the question,
// × forgets the item, a token opens the right picker and saves the change,
// Done is Done. What it renders never includes system vocabulary. (Look:
// board 1, "Kept for David · Here's what I'll remember.")
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { ReviewSheet, type ReviewSheetProps } from "@/features/tell/ReviewSheet";
import { buildReview } from "@/features/tell/reviewModel";
import type { HeldItem } from "@/store/gateway";
import type { MemoryItem, Person } from "@/store/repositories";
import type { UnderstandingRow } from "@/store/understanding";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const TODAY = "2026-10-08";
const people = [
  { id: "ben", display_name: "Ben", state: "active" },
  { id: "lee", display_name: "Sam", state: "active", relationship_label: "neighbor" },
  { id: "diaz", display_name: "Sam", state: "active", relationship_label: "climbing" },
] as unknown as Person[];

const row = (reading: Partial<NonNullable<UnderstandingRow["reading"]>>): UnderstandingRow => ({
  capture_id: "c1", state: "review", answer: null, notice: null, attempts: 0, next_at: null, seen_at: null,
  created_at: "2026-10-08T21:14:00.000Z", updated_at: "2026-10-08T21:14:00.000Z",
  reading: { tier: "confirm", saved: [], held: [], clarification: null, review_created_at: "t", settled: false, ...reading },
});

const race = {
  id: "m1", kind: "event", person_id: "ben", statement: "Ben runs Chicago Sunday", status: "active",
  user_state: "unreviewed", subject_type: "person", subject_related_id: null, origin: "extracted", certainty: "stated",
  detail: { date: "2026-10-11", date_precision: "day", event_type: "race", followup_policy: "after" },
} as unknown as MemoryItem;

const sam: HeldItem = {
  kind: "thread", person_id: null, new_person_name: null, subject_type: "person", related: null,
  statement: "Sam is redoing his kitchen", detail: {}, certainty: "stated", sensitivity: "none", tier: "hold",
  flags: ["person_ambiguous"], spans: [{ start: 0, end: 26, quote: "Sam is redoing his kitchen" }],
};

function render(note: string, r: UnderstandingRow, items: MemoryItem[]) {
  const view = buildReview({
    row: r, capture: { id: "c1", raw_text: note, context_person_id: null, status: "needs_review" }, items, people,
    related: [], offline: false, today: TODAY,
  });
  const props: ReviewSheetProps = {
    view, visible: true, people, today: TODAY,
    onDismiss: jest.fn(), onDone: jest.fn(), onUndo: jest.fn(), onReject: jest.fn(), onCorrect: jest.fn(),
    onAnswer: jest.fn(), onOpenNote: jest.fn(), onActivity: jest.fn(),
  };
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<ReviewSheet {...props} />);
  });
  return { tree, props };
}

function press(tree: TestRenderer.ReactTestRenderer, label: string) {
  const target = tree.root.find((n: ReactTestInstance) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function");
  act(() => target.props.onPress());
}

function texts(tree: TestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);
}

it("two Sams: choosing one answers the question, once, with that Sam", () => {
  const { tree, props } = render("Sam is redoing his kitchen.", row({ tier: "clarify", held: [sam] }), []);
  // One question and nothing kept yet: the question is the whole sheet.
  expect(texts(tree)).toEqual(expect.arrayContaining(["Which Sam do you mean?", "“Sam is redoing his kitchen”"]));
  expect(texts(tree)).not.toContain("Done");
  press(tree, "Sam (neighbor)");
  expect(props.onAnswer).toHaveBeenCalledWith([{ index: 0, person_id: "lee" }]);
  expect(props.onActivity).toHaveBeenCalled();
});

it("'Someone else' opens the user's own people, and the pick is the answer", () => {
  const { tree, props } = render("Sam is redoing his kitchen.", row({ tier: "clarify", held: [sam] }), []);
  press(tree, "Someone else");
  press(tree, "Ben");
  expect(props.onAnswer).toHaveBeenCalledWith([{ index: 0, person_id: "ben" }]);
});

it("an item: × forgets it, its date token opens a calendar, Done is Done", () => {
  const { tree, props } = render("Ben runs Chicago Sunday.", row({ saved: [{ id: "m1", tier: "confirm" }] }), [race]);
  press(tree, "Not this: Ben runs Chicago Sunday");
  expect(props.onReject).toHaveBeenCalledWith("m1");
  press(tree, "When: Sun, Oct 11");
  press(tree, "Monday, October 12, 2026");
  expect(props.onCorrect).toHaveBeenCalledWith("m1", { date: "2026-10-12" });
  press(tree, "What: Something happening");
  press(tree, "A plan");
  expect(props.onCorrect).toHaveBeenCalledWith("m1", { kind: "plan" });
  press(tree, "Done");
  expect(props.onDone).toHaveBeenCalled();
});

it("renders no system vocabulary", () => {
  for (const { tree } of [
    render("Sam is redoing his kitchen.", row({ tier: "clarify", held: [sam] }), []),
    render("Ben runs Chicago Sunday.", row({ saved: [{ id: "m1", tier: "confirm" }] }), [race]),
  ]) {
    for (const t of texts(tree)) {
      expect(t).not.toMatch(/\b(tier|auto|confirm\w*|hold|confidence|score|model|flag|extract\w*|capture|pending|unreviewed|status|subject|null|undefined)\b|0\.\d/i);
    }
  }
});
