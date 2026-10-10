// The keyboard's own bar (founder I6): Done on every multi-line box, and
// Today · People on Today's and People's boxes, so the keyboard never needs a
// tap on blank space or content to go away and the two destinations stay a
// tap away while typing.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Keyboard, TextInput } from "react-native";
import { KeyboardBar, TellField } from "@/ui";
import { PeopleView } from "@/features/people/PeopleView";
import { WordsPane } from "@/features/tell/Pickers";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

function render(el: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  return tree;
}
const pressable = (t: TestRenderer.ReactTestRenderer, label: string) =>
  t.root.find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function");
/** Each text box names a keyboard bar that is drawn next to it. */
function barsOf(t: TestRenderer.ReactTestRenderer) {
  const accessories = t.root.findAll((n) => typeof n.type === "string" && typeof n.props.nativeID === "string" && n.props.nativeID.startsWith("kinship-keyboard-"));
  return t.root.findAllByType(TextInput).map((input) => ({
    id: input.props.inputAccessoryViewID as string | undefined,
    drawn: accessories.some((a) => a.props.nativeID === input.props.inputAccessoryViewID),
  }));
}
const noop = () => undefined;

afterEach(() => jest.restoreAllMocks());

describe("I6: the keyboard's bar", () => {
  it("Done puts the keyboard away", () => {
    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(noop);
    const t = render(<KeyboardBar id="kinship-keyboard-x" />);
    act(() => pressable(t, "Done").props.onPress());
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("on Today and People it carries the two destinations: a tap puts the keyboard away and goes there", () => {
    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(noop);
    const go = jest.fn();
    const t = render(<KeyboardBar id="kinship-keyboard-x" nav={{ current: "today", onGo: go }} />);
    act(() => pressable(t, "People").props.onPress());
    expect(dismiss).toHaveBeenCalled();
    expect(go).toHaveBeenCalledWith("people");
  });

  it("the Tell field, People's search, the words editor each carry their own bar", () => {
    for (const t of [
      render(<TellField value="Ben's knee is better" onChange={noop} onSend={noop} />),
      render(<PeopleView rows={[]} onOpen={noop} onAdd={() => Promise.resolve()} onGo={noop} />),
      render(<WordsPane initial="Ben got the job" onSave={noop} onCancel={noop} />),
    ]) {
      const bars = barsOf(t);
      expect(bars.length).toBeGreaterThan(0);
      for (const b of bars) {
        expect(b.id).toMatch(/^kinship-keyboard-/u);
        expect(b.drawn).toBe(true);
      }
    }
  });

  it("People's search carries Today · People; the words editor only Done", () => {
    const labels = (t: TestRenderer.ReactTestRenderer) =>
      t.root.findAll((n) => typeof n.type === "string" && typeof n.props.accessibilityLabel === "string").map((n) => n.props.accessibilityLabel as string);
    expect(labels(render(<PeopleView rows={[]} onOpen={noop} onAdd={() => Promise.resolve()} onGo={noop} />)))
      .toEqual(expect.arrayContaining(["Today", "People", "Done"]));
    const words = labels(render(<WordsPane initial="Ben got the job" onSave={noop} onCancel={noop} />));
    expect(words).toContain("Done");
    expect(words).not.toContain("Today");
  });
});
