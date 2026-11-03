// The expanded moment (PR #77 §3–§4): its fixed order, ideas behind one explicit control (closed by
// default, hidden when there are none), "You could mention" never repeating what an idea quotes, "I did
// this" only for the user's own promise, Not now only for the poster's moment, and every way to act a
// hand-off that sends nothing.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { MomentFull } from "@/features/today/deck/MomentFull";
import type { MomentDetail } from "@/features/today/momentDetail";
import type { Idea } from "@/features/showingup/ideas";
import { SHOWING_UP_COPY } from "@/features/showingup/IdeasViews";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
let mockIdeas: Idea[] = [];
jest.mock("@/hooks/useIdeas", () => ({ usePersonIdeas: () => ({ ideas: mockIdeas, person: null, loading: false }) }));
jest.mock("@/platform/analytics", () => ({ ...jest.requireActual("@/platform/analytics"), track: jest.fn() }));

const noop = () => undefined;
const maya: MomentDetail = {
  key: "b1", type: "birthday", personId: "maya", personName: "Maya", itemId: null, line: "It's Maya's birthday.", hope: null,
  why: "It's Maya's birthday today.", when: "Sat, Nov 7", provenance: "From Contacts", noteId: null,
  reason: { id: "b1", type: "birthday", ask: "Did you wish Maya a happy birthday?", about: null, followUp: "", itemId: null },
  heading: "Message Maya", mention: ["Maya keeps talking about getting Ottolenghi's Comfort", "Maya started at the museum"], suggestion: null,
};
const book: Idea = {
  id: "gesture:m1", category: "gesture", title: "Something for Maya", ways: ["message", "call", "keep"], keep: "Something for Maya.", gesture: null,
  grounds: [{ itemId: "m1", quote: "Keeps talking about getting his new one, Comfort.", source: "From your note · Sep 12", noteId: "c1", line: "Maya keeps talking about getting Ottolenghi's Comfort" }],
};

function render(el: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const texts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter((s) => s.trim());
const byId = (r: TestRenderer.ReactTestRenderer, id: string) => r.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === "function" && n.parent?.props.testID !== id);
const full = (over: Partial<React.ComponentProps<typeof MomentFull>> = {}) => render(
  <MomentFull
    detail={maya} from={null} photoUri={null} whenLabel="Saturday · Sat, Nov 7" headline="Maya's birthday is Saturday." today="2026-11-02"
    onClose={noop} onMessage={noop} onCall={noop} onPerson={noop} onSource={noop}
    onKeep={async () => ({ undo: async () => undefined })} onBringBack={async () => undefined}
    {...over}
  />,
);

beforeEach(() => {
  mockIdeas = [];
});

it("reads in the fixed order: when, headline, the memory, why now, the source, the actions, the notebook", () => {
  const t = texts(full());
  const order = ["Saturday · Sat, Nov 7", "Maya's birthday is Saturday.", "It's Maya's birthday.", "It's Maya's birthday today.", "From Contacts", "Message Maya", "Open Maya's notebook"];
  const idx = order.map((s) => t.indexOf(s));
  expect(idx.every((i) => i >= 0)).toBe(true);
  expect([...idx].sort((a, b) => a - b)).toEqual(idx);
});

it("no ideas: no control at all (zero is an answer)", () => {
  expect(texts(full())).not.toContain(SHOWING_UP_COPY.toggle);
});

it("ideas stay closed until asked; opening shows each with its quote and source", () => {
  mockIdeas = [book];
  const r = full();
  expect(texts(r)).toContain(SHOWING_UP_COPY.toggle);
  expect(texts(r)).not.toContain("Something for Maya");
  act(() => byId(r, "ideas-toggle")[0].props.onPress());
  expect(texts(r)).toEqual(expect.arrayContaining(["Something for Maya", "“Keeps talking about getting his new one, Comfort.”", "From your note · Sep 12"]));
});

it("You could mention leaves out the line an idea already quotes", () => {
  mockIdeas = [book];
  const t = texts(full());
  expect(t).toContain("Maya started at the museum");
  expect(t).not.toContain("Maya keeps talking about getting Ottolenghi's Comfort");
});

it("I did this only for the user's own promise; Not now only for the poster's moment", () => {
  expect(byId(full(), "moment-did")).toHaveLength(0);
  expect(byId(full(), "moment-notnow")).toHaveLength(0);
  const did = jest.fn();
  const r = full({ onDid: did, onNotNow: noop });
  act(() => byId(r, "moment-did")[0].props.onPress());
  expect(did).toHaveBeenCalled();
  expect(byId(r, "moment-notnow")).toHaveLength(1);
});

it("Message and Call are the moment's hand-offs; an idea's carry its kind", () => {
  const message = jest.fn();
  const call = jest.fn();
  const r = full({ onMessage: message, onCall: call });
  act(() => byId(r, "moment-primary")[0].props.onPress());
  act(() => byId(r, "moment-call")[0].props.onPress());
  expect(message).toHaveBeenCalledWith();
  expect(call).toHaveBeenCalledWith();
});
