// A remembered line can be corrected, not only forgotten (founder native pass
// F5). The words were changeable only by tapping them, which nothing on screen
// said; now every line says "Edit", and the Forget question reads Cancel /
// Forget (it used to say "Keep it", the Tell button's words).
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { ITEM_COPY, ItemSheet } from "@/features/person/ItemSheet";
import { FORGET_COPY, PersonRecordView } from "@/features/person/PersonRecordView";
import type { ItemLine } from "@/features/tell/reviewModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const line: ItemLine = {
  id: "m1", statement: "John is your brother", person: { id: "john", label: "John Oxnard", changeable: true }, about: null, also: [], replaces: null, when: null,
  kind: { value: "fact", label: "Something true", changeable: true }, edited: false,
};
function render(el: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  return tree;
}
const button = (t: TestRenderer.ReactTestRenderer, label: string) =>
  t.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")[0];

it("What Kinship knows: every line has Edit, which opens the words", () => {
  const onChange = jest.fn();
  const t = render(<PersonRecordView name="John Oxnard" label={null} onBack={jest.fn()} onChange={onChange} onForget={jest.fn()}
    onSource={jest.fn()} onSettle={jest.fn()} lines={[{ line, provenance: "You told Kinship · Oct 5", noteId: "c1", conflict: null }]} />);
  act(() => button(t, "Edit: John is your brother").props.onPress());
  expect(onChange).toHaveBeenCalledWith(line, "words");
  expect(button(t, "Not this: John is your brother")).toBeTruthy();
});

it("the line's own sheet says 'Edit the words', and it opens them for editing", () => {
  const t = render(<ItemSheet item={{ line, provenance: "You told Kinship · Oct 5", noteId: "c1" }} visible people={[]} today="2026-10-05"
    onCorrect={jest.fn()} onForget={jest.fn()} onSource={jest.fn()} onDismiss={jest.fn()} />);
  act(() => button(t, ITEM_COPY.edit).props.onPress());
  const input = t.root.findAll((n) => String(n.type) === "TextInput")[0];
  expect(input.props.value ?? input.props.defaultValue).toBe("John is your brother");
});

it("forgetting asks with Cancel / Forget", () => {
  expect(FORGET_COPY).toEqual({ title: "Forget this?", cancel: "Cancel", forget: "Forget" });
});
