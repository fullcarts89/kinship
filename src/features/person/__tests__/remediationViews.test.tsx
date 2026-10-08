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
