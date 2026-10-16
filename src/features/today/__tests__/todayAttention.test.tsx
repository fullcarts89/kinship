// Today never says "Nothing needs you today" while something on screen wants
// the user's attention (founder H19: a Kept card was showing under it).
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { TodayView } from "@/features/today/TodayView";
import type { TodayView as TodayViewModel } from "@/features/today/todayModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;
const quiet: TodayViewModel = {
  dateLabel: "Tuesday, 6 October", greeting: "Good morning.", returnCheck: null, moment: null, quiet: [], quietDay: true, waiting: null, firstUse: null,
};

function texts(attention: boolean): string[] {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <TodayView view={quiet} afterReturn={null} attention={attention} settling={false}
        onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} />,
    );
  });
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat().join(""));
}

it("a quiet day says so, but not while a Kept card is up", () => {
  expect(texts(false)).toContain("Nothing needs you today.");
  expect(texts(true)).not.toContain("Nothing needs you today.");
});

// K19 (founder device check, 14 Oct): after reopening, Today was only "Wednesday, 14 October" and "Good
// afternoon." while a note's card was up. Today now says where the note is, then shows the result.
function shown(attention: boolean, telling: "understanding" | "asking" | "done" | null): string[] {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <TodayView view={quiet} afterReturn={null} attention={attention} telling={telling} settling={false}
        onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} />,
    );
  });
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat().join(""));
}

it("K19: never only a date and a greeting while a note is understood, asked about or kept", () => {
  expect(shown(true, "understanding")).toEqual(["Tuesday, 6 October", "Good morning.", "Understanding…"]);
  expect(shown(true, "asking")).toEqual(["Tuesday, 6 October", "Good morning.", "One thing to check."]);
  expect(shown(true, "done")).toEqual(["Tuesday, 6 October", "Good morning.", "Nothing else needs you today."]);
  expect(shown(true, null)).toContain("Nothing else needs you today.");
  expect(shown(false, null)).toEqual(["Tuesday, 6 October", "Good morning.", "Nothing needs you today."]);
});
