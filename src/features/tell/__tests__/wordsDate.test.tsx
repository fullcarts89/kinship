// A words edit that names another day asks about it, in the same sheet (the redesign made "SUN, NOV 15" over
// "…moves in on November 22 · EDITED BY YOU" loud). Never silent; no new day, no extra step.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text, TextInput } from "react-native";
import { ItemSheet } from "@/features/person/ItemSheet";
import { dayNamedIn, proposedDay } from "../wordsDate";
import type { ItemLine } from "../reviewModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
const NOW = "2026-10-31T17:00:00Z";
const noop = () => undefined;

describe("reading a day in new words", () => {
  it("reads a month and day, a weekday, a relative day; nothing otherwise", () => {
    expect(dayNamedIn("Leo moves in on November 22", NOW, "America/Los_Angeles")).toBe("2026-11-22");
    expect(dayNamedIn("Leo moves in on Nov 22nd", NOW, "America/Los_Angeles")).toBe("2026-11-22");
    expect(dayNamedIn("Leo moves in on the 22nd of November", NOW, "America/Los_Angeles")).toBe("2026-11-22");
    expect(dayNamedIn("Leo moves in tomorrow", NOW, "America/Los_Angeles")).toBe("2026-11-01");
    expect(dayNamedIn("Leo moves in soon", NOW, "America/Los_Angeles")).toBeNull();
    expect(dayNamedIn("Leo has a new apartment", NOW, null)).toBeNull();
  });
  it("proposes only when the line has a day and the words name a different one", () => {
    const line = { when: { value: "2026-11-15" } };
    expect(proposedDay(line, "Leo moves in on November 22", NOW, "America/Los_Angeles")).toBe("2026-11-22");
    expect(proposedDay(line, "Leo moves in on November 15", NOW, "America/Los_Angeles")).toBeNull();
    expect(proposedDay(line, "Leo moves into the new place", NOW, "America/Los_Angeles")).toBeNull();
    expect(proposedDay({ when: null }, "Leo moves in on November 22", NOW, "America/Los_Angeles")).toBeNull();
  });
});

const line = {
  id: "m1", statement: "Leo moves in on November 15", person: { id: "leo", label: "Leo", changeable: true }, about: null, also: [], replaces: [],
  when: { label: "Sun, Nov 15", value: "2026-11-15", changeable: true }, kind: { value: "event", label: "Something coming up", changeable: true }, edited: false,
} as unknown as ItemLine;

function openWords(onCorrect: jest.Mock) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <ItemSheet item={{ line, provenance: "You told Kinship · Oct 8", noteId: "c1" }} visible people={[]} today="2026-10-31"
        onCorrect={onCorrect} onForget={noop} onSource={noop} onDismiss={noop} initialPane="words" />,
    );
  });
  return r;
}
const texts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter((s) => s.trim());
const type = (r: TestRenderer.ReactTestRenderer, words: string) => act(() => r.root.findAllByType(TextInput)[0].props.onChangeText(words));
const save = (r: TestRenderer.ReactTestRenderer) => act(() => r.root.find((n) => n.props.accessibilityLabel === "Save" && typeof n.props.onPress === "function").props.onPress());

it("a words edit naming a new day saves the words, then asks about the day with it pre-set; the date is not changed until confirmed", () => {
  const onCorrect = jest.fn();
  const r = openWords(onCorrect);
  type(r, "Leo moves in on November 22");
  save(r);
  expect(onCorrect).toHaveBeenCalledTimes(1);
  expect(onCorrect).toHaveBeenCalledWith("m1", { statement: "Leo moves in on November 22" });
  expect(texts(r).some((t) => t.startsWith("Is it now") && t.includes("Nov 22"))).toBe(true);
  // One tap on the pre-set day confirms it.
  act(() => r.root.find((n) => n.props.accessibilityLabel?.includes?.("November 22") && typeof n.props.onPress === "function").props.onPress());
  expect(onCorrect).toHaveBeenLastCalledWith("m1", { date: "2026-11-22" });
});

it("a words edit naming no new day is one step: saved, back to the line, no date question", () => {
  const onCorrect = jest.fn();
  const r = openWords(onCorrect);
  type(r, "Leo is moving into the new place");
  save(r);
  expect(onCorrect).toHaveBeenCalledTimes(1);
  expect(texts(r).some((t) => t.startsWith("Is it now"))).toBe(false);
});
