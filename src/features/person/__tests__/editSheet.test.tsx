// The person's Edit sheet (founder, 5 Nov 2026): their name and pronouns, and one Pause reminders switch
// where Pause and Hold as remembered were. Nothing asks over the sheet, so nothing can be lost behind it.
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { Switch, Text, TextInput } from "react-native";
import { NamePane } from "@/features/tell/Pickers";
import { SettingsSheetView } from "@/features/people/SettingsSheet";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const noop = () => undefined;

function render(el: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const texts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join(""));
const button = (r: TestRenderer.ReactTestRenderer, label: string): ReactTestInstance =>
  r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")[0];
const press = (r: TestRenderer.ReactTestRenderer, label: string) => act(() => button(r, label).props.onPress());

function pane(over: Partial<React.ComponentProps<typeof NamePane>> = {}) {
  const calls = { pause: jest.fn(), resume: jest.fn(), pronouns: jest.fn(), save: jest.fn() };
  const r = render(
    <NamePane initial="Natalia" short="Natalia" state="active" pronouns={null} onSave={calls.save} onCancel={noop}
      onPause={calls.pause} onResume={calls.resume} onPronouns={calls.pronouns} onMerge={noop} onRemove={noop} {...over} />,
  );
  return { r, calls };
}

describe("Pause reminders", () => {
  it("is the one control: no Pause, no Hold as remembered", () => {
    const { r } = pane();
    expect(texts(r)).toContain("Pause reminders");
    expect(texts(r).join(" ")).not.toMatch(/remembered/iu);
    expect(r.root.findAllByType(Switch)).toHaveLength(1);
  });

  it("turns on and off at once, with no question over the sheet", () => {
    const { r, calls } = pane();
    act(() => r.root.findByType(Switch).props.onValueChange(true));
    expect(calls.pause).toHaveBeenCalledTimes(1);
    const held = pane({ state: "paused" });
    expect(held.r.root.findByType(Switch).props.value).toBe(true);
    act(() => held.r.root.findByType(Switch).props.onValueChange(false));
    expect(held.calls.resume).toHaveBeenCalledTimes(1);
  });

  it("reads the same for someone an earlier build held as remembered, and can be turned off", () => {
    const { r, calls } = pane({ state: "remembered" });
    expect(r.root.findByType(Switch).props.value).toBe(true);
    act(() => r.root.findByType(Switch).props.onValueChange(false));
    expect(calls.resume).toHaveBeenCalledTimes(1);
  });

  it("isn't offered for someone removed from People", () => {
    const { r } = pane({ state: "archived" });
    expect(r.root.findAllByType(Switch)).toHaveLength(0);
  });
});

describe("pronouns", () => {
  const save = (r: TestRenderer.ReactTestRenderer) => press(r, "Save");

  it("opens with the keyboard down, so the sheet's controls aren't covered", () => {
    const { r } = pane();
    expect(r.root.findByProps({ accessibilityLabel: "Their name" }).props.autoFocus).toBe(false);
  });

  it("saves a choice, and Save stays off until something changed", () => {
    const { r, calls } = pane();
    expect(button(r, "Save").props.disabled).toBeTruthy();
    press(r, "she/her");
    expect(button(r, "Save").props.disabled).toBeFalsy();
    save(r);
    expect(calls.pronouns).toHaveBeenCalledWith("she/her");
    expect(calls.save).not.toHaveBeenCalled();
  });

  it("tapping the current choice clears it", () => {
    const { r, calls } = pane({ pronouns: "he/him" });
    press(r, "he/him");
    save(r);
    expect(calls.pronouns).toHaveBeenCalledWith(null);
  });

  it("takes the user's own words, and opens on them when that's what was saved", () => {
    const { r, calls } = pane();
    press(r, "Other");
    const field = r.root.findByProps({ accessibilityLabel: "Their pronouns" });
    expect(field.props.maxLength).toBe(40);
    act(() => field.props.onChangeText(" ze/zir "));
    save(r);
    expect(calls.pronouns).toHaveBeenCalledWith("ze/zir");
    const again = pane({ pronouns: "ze/zir" });
    expect(again.r.root.findAllByType(TextInput).map((t) => t.props.value)).toContain("ze/zir");
  });

  it("a name change and a pronouns change both save", () => {
    const { r, calls } = pane();
    press(r, "they/them");
    act(() => r.root.findByProps({ accessibilityLabel: "Their name" }).props.onChangeText("Nat"));
    save(r);
    expect(calls.pronouns).toHaveBeenCalledWith("they/them");
    expect(calls.save).toHaveBeenCalledWith("Nat");
  });

  it("isn't offered where only the name is being corrected", () => {
    const r = render(<NamePane initial="Natalia" onSave={noop} onCancel={noop} />);
    expect(texts(r)).toContain("Their name");
    expect(texts(r)).not.toContain("Pronouns");
    expect(r.root.findByProps({ accessibilityLabel: "Their name" }).props.autoFocus).toBe(true);
  });
});

describe("Settings", () => {
  const settings = (over: object = {}) => {
    const onDismiss = jest.fn();
    const r = render(<SettingsSheetView visible understanding onUnderstanding={noop} onSignOut={noop} onDismiss={onDismiss} {...over} />);
    return { r, onDismiss };
  };

  it("closes from its X", () => {
    const { r, onDismiss } = settings();
    press(r, "Close Settings");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("lists paused reminders by name, with Resume, whichever state an older row holds", () => {
    const onResume = jest.fn(() => Promise.resolve());
    const { r } = settings({ onResume, held: [{ id: "a", name: "Ana", state: "paused" }, { id: "b", name: "Bo", state: "remembered" }] });
    expect(texts(r)).toContain("Paused reminders");
    expect(texts(r).join(" ")).not.toMatch(/remembered/iu);
    press(r, "Resume Bo");
    expect(onResume).toHaveBeenCalledWith("b");
  });
});
