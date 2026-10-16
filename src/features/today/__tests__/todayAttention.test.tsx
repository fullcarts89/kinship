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

// K24 (founder, 16 Oct): while a note is being understood, asked about or kept, the Tell dock alone says so.
// Today never shows a second "Understanding…" as its headline (the K19 headline is gone), and a quiet day's
// "Nothing needs you today." waits until the note settles; whatever Today really has stays.
function shown(view: TodayViewModel, attention: boolean): string[] {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <TodayView view={view} afterReturn={null} attention={attention} settling={false}
        onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} />,
    );
  });
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat().join(""));
}

it("K24: a quiet day while a note is read: the date and greeting only, never a headline saying Understanding", () => {
  expect(shown(quiet, true)).toEqual(["Tuesday, 6 October", "Good morning."]);
  // Settled: Today recomputes as usual.
  expect(shown(quiet, false)).toEqual(["Tuesday, 6 October", "Good morning.", "Nothing needs you today."]);
});

it("K24: with something on Today, it stays while a note is read", () => {
  const busy: TodayViewModel = {
    ...quiet, quietDay: false,
    quiet: [{ kind: "coming", label: "Tomorrow", text: "Call Matt", personId: "matt", itemId: "m", day: "2026-10-07", due: true, hope: null, provenance: null, noteId: null }],
  };
  expect(shown(busy, true)).toEqual(["Tuesday, 6 October", "Good morning.", "Tomorrow", "Call Matt"]);
  expect(shown(busy, true).filter((t) => /Understanding/u.test(t))).toEqual([]);
});
