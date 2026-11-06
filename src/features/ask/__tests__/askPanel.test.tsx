// The placeable Ask pieces (WS-6): an explicit field of its own, the section for its words, taps that navigate.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { AskPanel, AskSectionView, ASK_FIELD } from "../AskSection";
import { ASK_COPY } from "../retrieve";
import { EMPTY_ASK, type AskView } from "../useAsk";

const mockPush = jest.fn();
let mockView: AskView = EMPTY_ASK;
jest.mock("expo-router", () => ({ router: { push: (h: string) => mockPush(h) } }));
jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("../useAsk", () => ({ ...jest.requireActual("../useAsk"), useAsk: () => mockView }));

const render = (el: React.ReactElement) => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};
const texts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter(Boolean);

it("AskPanel: its own field, then the honest miss for words nothing answers; no chat framing", () => {
  mockView = { ...EMPTY_ASK, query: "purple elephants", asked: true, miss: ASK_COPY.nothing };
  const onQuery = jest.fn();
  const r = render(<AskPanel initialQuery="purple elephants" onQuery={onQuery} />);
  const field = r.root.find((n) => n.props.accessibilityLabel === ASK_FIELD.label && typeof n.props.onChangeText === "function");
  expect(field.props.placeholder).toBe("Ask about someone's memory");
  act(() => field.props.onChangeText("Alameda"));
  expect(onQuery).toHaveBeenCalledWith("Alameda");
  expect(texts(r)).toEqual([ASK_COPY.section, ASK_COPY.nothing]);
});

it("AskSectionView: a line's words push its place on the person's page", () => {
  const view: AskView = {
    ...EMPTY_ASK, query: "Alameda", asked: true,
    groups: [{ personId: "susan", name: "Susan", href: "/v2/person/susan", quiet: false, conversations: [], rows: [{
      key: "k", earlier: false, href: "/v2/person/susan?item=s1",
      row: { line: { id: "s1", statement: "Susan lives in Alameda", person: { id: "susan", label: "Susan", changeable: true }, about: null, also: [], replaces: [], when: null, kind: { value: "fact", label: "x", changeable: true }, edited: false }, provenance: "You told Kinship · Oct 2", noteId: "n1", conflict: null },
    }] }],
  };
  const r = render(<AskSectionView view={view} />);
  act(() => r.root.find((n) => n.props.accessibilityLabel === "Susan lives in Alameda" && typeof n.props.onPress === "function").props.onPress());
  expect(mockPush).toHaveBeenCalledWith("/v2/person/susan?item=s1");
});
