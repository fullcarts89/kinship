// The notebook review's plain helpers (PR #77 §7): the words split into runs that always join back
// into the whole note, the header's cap, a line's day as said or exact, and "a day you wrote".
import type { ItemLine } from "../reviewModel";
import { dayWrittenIn } from "../wordsDate";
import { dayInSentence, groupLines, isAsSaid, questionsPhrase, reviewCap, toldOn, wordRuns, type WordMark } from "../notebook/words";

const NOTE = "Lunch with Priya today, she's back from Lisbon for good. Then Sam called, she got the promotion.";
const mark = (key: string, phrase: string, extra: Partial<WordMark> = {}): WordMark => {
  const start = NOTE.indexOf(phrase);
  return { key, target: { kind: "line", id: key }, personId: "p", start, end: start + phrase.length, ...extra };
};

describe("wordRuns", () => {
  it("joins back into the whole note, nothing dropped, each phrase on its own", () => {
    const runs = wordRuns(NOTE, [mark("a", "she's back from Lisbon for good"), mark("b", "she got the promotion")]);
    expect(runs.map((r) => r.text).join("")).toBe(NOTE);
    expect(runs.filter((r) => r.mark).map((r) => r.text)).toEqual(["she's back from Lisbon for good", "she got the promotion"]);
  });

  it("where phrases overlap, the most specific one, and a kept line before a removed one", () => {
    const runs = wordRuns(NOTE, [
      mark("wide", "Lunch with Priya today, she's back from Lisbon for good", { gone: true }),
      mark("narrow", "back from Lisbon"),
    ]);
    expect(runs.find((r) => r.text === "back from Lisbon")?.mark?.key).toBe("narrow");
    expect(runs.find((r) => r.text.startsWith("Lunch"))?.mark?.key).toBe("wide");
    expect(runs.map((r) => r.text).join("")).toBe(NOTE);
  });

  it("marks the words the understanding did not get to, and survives spans past the end", () => {
    const at = NOTE.indexOf("Then Sam");
    const runs = wordRuns(NOTE, [{ ...mark("x", "Lunch"), end: 9999 }], [{ start: at, end: NOTE.length }]);
    expect(runs.map((r) => r.text).join("")).toBe(NOTE);
    expect(runs.some((r) => r.unprocessed)).toBe(true);
  });
});

const line = (id: string, personId: string | null, label?: string): ItemLine => ({
  id, statement: id, person: personId ? { id: personId, label: label ?? personId, changeable: true } : null,
  about: null, also: [], replaces: [], when: null, kind: { value: "fact", label: "Something true", changeable: false }, edited: false,
});

describe("the header", () => {
  const first = (id: string) => ({ priya: "Priya", josh: "Josh", sam: "Sam" }[id] ?? null);
  it("says who it was kept for, and how many questions, in words", () => {
    expect(reviewCap([line("a", "priya"), line("b", "josh"), line("c", "priya")], first, 1, "Your note")).toBe("Kept for Priya and Josh · one question");
    expect(reviewCap([line("a", "priya"), line("b", "sam"), line("c", "josh")], first, 0, "Your note")).toBe("Kept for Priya, Sam and Josh");
    expect(reviewCap([], first, 2, "Your note")).toBe("Your note · two questions");
  });
  it("never says Kept before something is kept", () => {
    expect(reviewCap([], first, 0, "Your note")).toBe("Your note");
  });
  it("counts in words", () => {
    expect(questionsPhrase(1)).toBe("one question");
    expect(questionsPhrase(3)).toBe("three questions");
    expect(questionsPhrase(42)).toBe("a few questions");
  });
});

it("one group per person, in order, and a line about no one last", () => {
  const groups = groupLines([line("a", null), line("b", "priya"), line("c", "josh"), line("d", "priya")]);
  expect(groups.map((g) => [g.personId, g.lines.map((l) => l.id)])).toEqual([["priya", ["b", "d"]], ["josh", ["c"]], [null, ["a"]]]);
});

describe("a line's day", () => {
  const TODAY = "2026-11-02";
  it("is as said when Kinship holds no exact day, or words for it", () => {
    expect(isAsSaid({ label: "“mid-month”", value: null, changeable: true }, TODAY)).toBe(true);
    expect(isAsSaid({ label: "November", value: "2026-11-01", changeable: true }, TODAY)).toBe(true);
    expect(isAsSaid({ label: "Sun, Nov 15", value: "2026-11-15", changeable: true }, TODAY)).toBe(false);
    expect(isAsSaid({ label: "By Fri, Nov 6", value: "2026-11-06", changeable: true }, TODAY)).toBe(false);
    expect(isAsSaid(null, TODAY)).toBe(false);
  });
  it("is the token inside its sentence when the sentence says it", () => {
    expect(dayInSentence("Priya is moving to Oakland mid-November.", "“mid-November”")).toEqual({ start: 27, end: 39 });
    expect(dayInSentence("Josh's interview moved.", "Thu, Nov 5")).toBeNull();
  });
  it("a day the user wrote is offered from their own words, read from when they told it", () => {
    expect(dayWrittenIn("Moving into a place in Oakland on the 15th I think? or mid-month", "2026-11-02T18:00:00.000Z", "America/Los_Angeles"))
      .toEqual({ date: "2026-11-15", words: "on the 15th" });
    expect(dayWrittenIn("or mid-month anyway", "2026-11-02T18:00:00.000Z", "America/Los_Angeles")).toBeNull();
  });
});

it("the day a note was told, as the review's cap says it", () => {
  const now = new Date(2026, 10, 2, 12);
  expect(toldOn(new Date(2026, 10, 2, 9, 30).toISOString(), now)).toBe("Mon, Nov 2");
  expect(toldOn(new Date(2025, 11, 14, 9).toISOString(), now)).toBe("Sun, Dec 14, 2025");
  expect(toldOn(null, now)).toBeNull();
});
