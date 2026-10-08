// The Kept card's hierarchy (founder I4): what was kept → someone not in
// People yet ([Add Pedro] [Not now]) → Correct this · Undo → "Did Kinship get
// this right?". Real controls, the user's words, no guessed pronouns.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { KeptCard, KEPT_COPY } from "@/features/tell/TellDock";
import type { KeptCardState } from "@/features/tell/TellFlow";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const card: KeptCardState = {
  captureId: "c1", mode: "card", heading: "Kept for Susan Oxnard",
  lines: [{ id: "m1", statement: "Susan is getting married to Pedro in the fall" }, { id: "m2", statement: "Susan and Pedro are moving to Austin" }],
  more: 0, status: null, personIds: ["susan"], newcomers: [{ name: "Pedro", itemIds: ["m1", "m2"] }],
};
const noop = () => undefined;

/** Everything the card says, in reading order. */
function words(r: TestRenderer.ReactTestRenderer): string[] {
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter((s) => s.trim());
}
function pressable(r: TestRenderer.ReactTestRenderer, label: string) {
  return r.root.find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function");
}
function render(el: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}

describe("I4: the Kept card's hierarchy", () => {
  it("reads in the approved order, with no 'Tap a line to correct it.'", () => {
    const r = render(<KeptCard card={card} onOpen={noop} onUndo={noop} onDismiss={noop} onRate={noop} onAddNewcomer={noop} />);
    const said = words(r);
    const order = [
      "Kept for Susan Oxnard",
      "Susan is getting married to Pedro in the fall",
      "Pedro isn't in People yet",
      "Add them so this can appear on their page too.",
      "Add Pedro",
      "Not now",
      "Correct this",
      "Undo",
      "Did Kinship get this right?",
      "Got it right",
      "Not quite",
    ];
    expect(said.filter((w) => order.includes(w))).toEqual(order);
    expect(said.join(" ")).not.toMatch(/Tap a line/);
    // Kinship never guesses anyone's pronouns.
    expect(said.join(" ")).not.toMatch(/\b(him|his|her|hers|he|she)\b/i);
  });

  it("Add Pedro is a real button: one call with every line that names him, then the row goes", () => {
    const add = jest.fn();
    const r = render(<KeptCard card={card} onOpen={noop} onUndo={noop} onDismiss={noop} onRate={noop} onAddNewcomer={add} />);
    const button = pressable(r, KEPT_COPY.add("Pedro"));
    expect(button.props.accessibilityRole).toBe("button");
    act(() => button.props.onPress());
    expect(add).toHaveBeenCalledWith("Pedro", ["m1", "m2"]);
    expect(words(r)).not.toContain("Pedro isn't in People yet");
    // What was kept is untouched: Kept is done.
    expect(words(r)).toContain("Susan is getting married to Pedro in the fall");
  });

  it("Not now puts the offer away and changes nothing", () => {
    const add = jest.fn();
    const r = render(<KeptCard card={card} onOpen={noop} onUndo={noop} onDismiss={noop} onRate={noop} onAddNewcomer={add} />);
    act(() => pressable(r, `Not now: ${KEPT_COPY.add("Pedro")}`).props.onPress());
    expect(add).not.toHaveBeenCalled();
    expect(words(r)).not.toContain("Pedro isn't in People yet");
    // A new note brings its own offers back.
    act(() => r.update(<KeptCard card={{ ...card, captureId: "c2" }} onOpen={noop} onUndo={noop} onDismiss={noop} onRate={noop} onAddNewcomer={add} />));
    expect(words(r)).toContain("Pedro isn't in People yet");
  });

  it("Correct this opens what was kept; Undo forgets the note", () => {
    const open = jest.fn();
    const undo = jest.fn();
    const r = render(<KeptCard card={card} onOpen={open} onUndo={undo} onDismiss={noop} onRate={noop} onAddNewcomer={noop} />);
    act(() => pressable(r, "Correct this").props.onPress());
    expect(open).toHaveBeenCalledTimes(1);
    act(() => pressable(r, "Undo").props.onPress());
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("with nothing kept there's nothing to correct, only Undo; a question waiting shows neither; no one to add", () => {
    const nothing: KeptCardState = { ...card, mode: "nothing", heading: null, lines: [], status: "Nothing to remember in that one.", newcomers: undefined };
    let said = words(render(<KeptCard card={nothing} onOpen={noop} onUndo={noop} onDismiss={noop} onRate={noop} onAddNewcomer={noop} />));
    expect(said).toContain("Undo");
    expect(said).not.toContain("Correct this");
    expect(said).not.toContain("Did Kinship get this right?");
    const asking: KeptCardState = { ...card, mode: "sheet", heading: null, lines: [], status: "One thing to check about what you told me." };
    said = words(render(<KeptCard card={asking} onOpen={noop} onUndo={noop} onDismiss={noop} onRate={noop} onAddNewcomer={noop} />));
    expect(said).not.toContain("Undo");
    expect(said).not.toContain("Correct this");
    expect(said).not.toContain("Pedro isn't in People yet");
  });
});
