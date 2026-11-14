// Your words (CMR-1): the notes about no one in People, on notebook paper, newest first, with Find; a
// note opens its Source page. Nothing counted, ranked or marked; never an empty destination from People.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text, TextInput } from "react-native";
import type { WordsNote } from "@/hooks/usePages";
import { WORDS_COPY, WordsView } from "../notebook/WordsView";
import { NotebookPeopleView } from "../notebook/NotebookPeopleView";
import { buildTiles, comingUpForThem, nameWordsOf } from "../notebook/peopleIndexModel";
import type { Person } from "@/store/repositories";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/hooks/usePersonPortrait", () => ({ usePersonPortrait: () => ({ uri: null, ready: true, pick: jest.fn(), remove: jest.fn() }) }));

const rendered: TestRenderer.ReactTestRenderer[] = [];
function render(el: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  rendered.push(r);
  return r;
}
afterEach(() => act(() => rendered.splice(0).forEach((r) => r.unmount())));
const textsOf = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().filter((c) => typeof c === "string").join("")).filter(Boolean);
const NOW = new Date("2026-11-14T12:00:00");

const note = (captureId: string, text: string, at: string, outcome: WordsNote["outcome"] = "nothing"): WordsNote => ({
  outcome,
  page: { type: "note", key: `note:${captureId}`, captureId, at, text, quotes: [], spans: [], intention: false },
});
const NOTES = [
  note("c2", "a quiet evening on the porch", "2026-11-13T20:00:00"),
  note("c1", "lol ok", "2026-11-10T09:00:00", "failed"),
  note("c0", "that song from the wedding", "2025-08-02T09:00:00"),
];

describe("Your words", () => {
  it("says what is here, shows each note in full on notebook paper, newest first, with year breaks, and opens one", () => {
    const opened: string[] = [];
    const r = render(<WordsView notes={NOTES} loading={false} now={NOW} onBack={() => undefined} onOpen={(id) => opened.push(id)} />);
    const shown = textsOf(r);
    expect(shown.slice(0, 2)).toEqual([WORDS_COPY.title, WORDS_COPY.about]);
    expect(shown).toEqual(expect.arrayContaining(["a quiet evening on the porch", "lol ok", "that song from the wedding", "2025"]));
    expect(shown.indexOf("a quiet evening on the porch")).toBeLessThan(shown.indexOf("lol ok"));
    expect(shown.indexOf("lol ok")).toBeLessThan(shown.indexOf("that song from the wedding"));
    expect(shown).toContain("Fri, Nov 13 · You told Kinship");
    // Nothing marked, nothing counted, nothing that names a tier or a failure on the page itself.
    expect(shown.join(" ")).not.toMatch(/\d+ notes|\bfailed\b|\bnothing\b|\bunfiled\b|\bAI\b|\btier\b/iu);
    act(() => r.root.findAll((x) => x.props.testID === "words-c1" && typeof x.props.onPress === "function")[0].props.onPress());
    expect(opened).toEqual(["c1"]);
  });

  it("Find keeps the notes that say it", () => {
    const r = render(<WordsView notes={NOTES} loading={false} now={NOW} onBack={() => undefined} onOpen={() => undefined} />);
    const field = r.root.findByType(TextInput);
    expect(field.props.placeholder).toBe(WORDS_COPY.find);
    act(() => field.props.onChangeText("WEDDING"));
    // The found words are marked, so the note's text comes in pieces.
    const shown = textsOf(r).join("");
    expect(shown).toContain("that song from the wedding");
    expect(shown).not.toContain("lol ok");
    act(() => field.props.onChangeText("nothing like it"));
    expect(textsOf(r)).toContain("Nothing in these pages says that.");
  });

  it("with nothing here: says so, without a field; while loading, says nothing yet", () => {
    const r = render(<WordsView notes={[]} loading={false} now={NOW} onBack={() => undefined} onOpen={() => undefined} />);
    expect(textsOf(r)).toContain(WORDS_COPY.empty);
    expect(r.root.findAllByType(TextInput)).toHaveLength(0);
    const r2 = render(<WordsView notes={[]} loading now={NOW} onBack={() => undefined} onOpen={() => undefined} />);
    expect(textsOf(r2)).not.toContain(WORDS_COPY.empty);
  });
});

describe("the row on People", () => {
  const ben = { id: "ben", display_name: "Ben", state: "active", birthday: null, birthday_source: null, version: 1, full_name: null, nicknames: [] } as unknown as Person;
  const props = (over: Record<string, unknown>) => ({
    loaded: true, people: [ben], tiles: buildTiles([ben]), band: comingUpForThem({ people: [ben], items: [], today: "2026-11-14" }), names: nameWordsOf([ben]),
    today: "2026-11-14", onOpen: () => undefined, onAdd: async () => undefined, onHit: () => undefined, ...over,
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it("leads to Your words only when there is something there, and says no count", () => {
    const opened = jest.fn();
    const r = render(<NotebookPeopleView {...props({ hasWords: true, onWords: opened })} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    const row = r.root.findAll((x) => x.props.testID === "people-words" && typeof x.props.onPress === "function")[0];
    expect(row.props.accessibilityLabel).toBe(WORDS_COPY.row);
    expect(textsOf(r)).toEqual(expect.arrayContaining([WORDS_COPY.row, WORDS_COPY.rowHint]));
    expect(textsOf(r).join(" ")).not.toMatch(/\d+ notes?/u);
    act(() => row.props.onPress());
    expect(opened).toHaveBeenCalledTimes(1);

    const r2 = render(<NotebookPeopleView {...props({ hasWords: false, onWords: opened })} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(r2.root.findAll((x) => x.props.testID === "people-words")).toHaveLength(0);
  });
});
