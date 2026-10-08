// Gate 0 remediation on screen (founder native findings of 7 Oct; decisions
// of 8 Oct): the pickers, the Kept card, sheets and Today, rendered.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert, TextInput } from "react-native";
import type { Person } from "@/store/repositories";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;
const person = (id: string, display_name: string, extra: Partial<Person> = {}) =>
  ({ id, display_name, state: "active", birthday: null, birthday_source: null, version: 1, ...extra }) as Person;
const pressables = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && typeof n.props.onPress === "function");
const labels = (r: TestRenderer.ReactTestRenderer) => pressables(r).map((n) => String(n.props.accessibilityLabel));
const press = (r: TestRenderer.ReactTestRenderer, label: string) => act(() => pressables(r).find((n) => n.props.accessibilityLabel === label)!.props.onPress());

describe("J2: correcting who a line is about to someone not in People", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PersonPane } = require("@/features/tell/Pickers") as typeof import("@/features/tell/Pickers");
  const ppl = [person("ben", "Ben Oxnard", { full_name: "Ben Oxnard" }), person("susan", "Susan Oxnard"), person("kaiya", "Kaiya", { state: "archived" })];

  function pane(onAdd: (name: string, bringBack?: string) => void) {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<PersonPane people={ppl} title="Who is this about?" current="ben" onPick={noop} onCancel={noop} onAdd={onAdd} />);
    });
    const type = (q: string) => act(() => r.root.findByType(TextInput).props.onChangeText(q));
    return { r, type };
  }

  it("a typed name that matches no one offers 'Add Josh'; one tap adds him", () => {
    const add = jest.fn();
    const { r, type } = pane(add);
    type("Josh");
    expect(r.root.findAll((n) => n.props.children === "No one by that name yet.").length).toBeGreaterThan(0);
    expect(labels(r)).toContain("Add Josh");
    press(r, "Add Josh");
    expect(add).toHaveBeenCalledWith("Josh");
  });

  it("never offered for someone already here", () => {
    const { r, type } = pane(jest.fn());
    type("Susan Oxnard");
    expect(labels(r).filter((l) => l.startsWith("Add "))).toEqual([]);
    type("ben");
    expect(labels(r).filter((l) => l.startsWith("Add "))).toEqual([]);
  });

  it("a name someone removed from People goes by offers them back first (founder I3)", () => {
    const add = jest.fn();
    const alert = jest.spyOn(Alert, "alert").mockImplementation(noop);
    const { r, type } = pane(add);
    type("Kaiya");
    press(r, "Add Kaiya");
    const buttons = alert.mock.calls[0][2]!;
    expect(alert.mock.calls[0][0]).toBe("Kaiya was removed from People.");
    expect(buttons.map((b) => b.text)).toEqual(["Cancel", "Add someone new", "Bring back Kaiya"]);
    act(() => buttons[2].onPress!());
    expect(add).toHaveBeenCalledWith("Kaiya", "kaiya");
    alert.mockRestore();
  });
});

describe("J6: every kept line can be looked at from the Kept card", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { KeptCard } = require("@/features/tell/TellDock") as typeof import("@/features/tell/TellDock");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cardFor } = require("@/features/tell/TellFlow") as typeof import("@/features/tell/TellFlow");
  const statements = ["John likes to play dress up", "Ben likes to play dress up", "John is thinking about quitting dress up", "Ben is thinking about quitting dress up"];
  const view = {
    captureId: "c1", mode: "card", heading: "Here's what I'll remember", status: null, notice: null, summary: null, questions: [], answering: false,
    canUndo: true, personIds: ["john", "ben"], feedback: null,
    lines: statements.map((statement, i) => ({ id: `m${i}`, statement })),
  } as unknown as import("@/features/tell/reviewModel").ReviewView;

  it("'and 1 more' is a button that opens the rest in place, each line as tappable as the first three", () => {
    const card = cardFor(view)!;
    const open = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<KeptCard card={card} onOpen={open} onUndo={noop} onDismiss={noop} />);
    });
    expect(labels(r)).not.toContain(statements[3]);
    const more = pressables(r).find((n) => n.props.accessibilityLabel === "and 1 more")!;
    expect(more.props.accessibilityRole).toBe("button");
    press(r, "and 1 more");
    expect(labels(r)).toEqual(expect.arrayContaining(statements));
    expect(labels(r)).not.toContain("and 1 more");
    press(r, statements[3]);
    expect(open).toHaveBeenCalled();
  });
});

describe("J5: a sheet closes on a downward drag from anywhere, once its content is at the top", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Sheet, takesDrag, dragCloses } = require("@/ui/Sheet") as typeof import("@/ui/Sheet");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ScrollView, Text } = require("react-native") as typeof import("react-native");

  it("a downward drag is the sheet's while its content is at the top; scrolled content scrolls first; sideways or upward never", () => {
    expect(takesDrag(true, 0, 24)).toBe(true);
    expect(takesDrag(false, 0, 24)).toBe(false);
    expect(takesDrag(true, 40, 20)).toBe(false);
    expect(takesDrag(true, 0, -24)).toBe(false);
    expect(dragCloses(120, 0.1)).toBe(true);
    expect(dragCloses(30, 1.4)).toBe(true);
    expect(dragCloses(30, 0.2)).toBe(false);
  });

  it("the whole sheet listens, not only the grabber; the content says when it's at the top", () => {
    const dismiss = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<Sheet visible onDismiss={dismiss} label="Ben starts a new job"><Text>Edit the words</Text></Sheet>);
    });
    const surface = r.root.find((n) => n.props.accessibilityViewIsModal === true && n.props.accessibilityLabel === "Ben starts a new job");
    expect(typeof surface.props.onMoveShouldSetResponderCapture).toBe("function");
    const scroll = r.root.findByType(ScrollView);
    expect(typeof scroll.props.onScroll).toBe("function");
    expect(scroll.props.bounces).toBe(false);
    act(() => r.unmount());
  });
});
