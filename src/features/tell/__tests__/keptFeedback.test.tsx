// "Got it right / Not quite" on the Kept card (founder H6): quiet, and a
// "Not quite" asks only what was off, from fixed reasons.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { KeptCard } from "@/features/tell/TellDock";
import type { KeptCardState } from "@/features/tell/TellFlow";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const card: KeptCardState = {
  captureId: "c1", mode: "card", heading: "Kept for Ben", lines: [{ id: "m1", statement: "Ben got promoted" }], more: 0, status: null, personIds: ["ben"],
};
const noop = () => undefined;

function labels(r: TestRenderer.ReactTestRenderer): string[] {
  return r.root.findAll((n) => typeof n.props.accessibilityLabel === "string").map((n) => n.props.accessibilityLabel as string);
}

it("Got it right; or Not quite → what was off → one fixed reason", () => {
  const rate = jest.fn();
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<KeptCard card={card} onOpen={noop} onUndo={noop} onDismiss={noop} onRate={rate} />);
  });
  expect(labels(r)).toEqual(expect.arrayContaining(["Got it right", "Not quite"]));
  act(() => r.root.find((n) => n.props.accessibilityLabel === "Not quite" && typeof n.props.onPress === "function").props.onPress());
  expect(labels(r)).toEqual(expect.arrayContaining(["Wrong person", "Missed something", "Wrong relationship", "Wrong wording", "Other"]));
  act(() => r.root.find((n) => n.props.accessibilityLabel === "Wrong person" && typeof n.props.onPress === "function").props.onPress());
  expect(rate).toHaveBeenCalledWith("not_quite", "wrong_person");
  // Once given, it just says so.
  act(() => r.update(<KeptCard card={{ ...card, feedback: { verdict: "not_quite", off: "wrong_person" } }} onOpen={noop} onUndo={noop} onDismiss={noop} onRate={rate} />));
  expect(labels(r)).not.toContain("Not quite");
});
