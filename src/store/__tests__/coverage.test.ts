// What a note's understanding left out, read one way (Option A's unprocessed passages; CMR-1 C2's
// not_understood places): every place once, in the note's order, never words.
import { anythingLeftOut, leftOut, spansOf } from "@/store/coverage";

describe("leftOut", () => {
  it("is the unprocessed passages as given (one per lost proposal), then each not_understood place once", () => {
    const c = {
      unprocessed: [{ start: 40, end: 60 }, { start: 40, end: 60 }],
      unlocated: 0,
      not_understood: [{ start: 0, end: 16 }, { start: 31, end: 47 }, { start: 0, end: 16 }, { start: 40, end: 60 }],
    };
    expect(leftOut(c)).toEqual([{ start: 0, end: 16 }, { start: 31, end: 47 }, { start: 40, end: 60 }, { start: 40, end: 60 }]);
  });

  it("reads a row older than C2 (no not_understood), a reply with only not_understood, and nothing at all", () => {
    expect(leftOut({ unprocessed: [{ start: 3, end: 9 }], unlocated: 0 })).toEqual([{ start: 3, end: 9 }]);
    expect(leftOut({ unprocessed: [], unlocated: 0, not_understood: [{ start: 3, end: 9 }] })).toEqual([{ start: 3, end: 9 }]);
    expect(leftOut(null)).toEqual([]);
    expect(leftOut(undefined)).toEqual([]);
    expect(leftOut({ unprocessed: [], unlocated: 2 })).toEqual([]);
  });

  it("drops a span that is not sound, never inventing one", () => {
    expect(spansOf([{ start: 5, end: 2 }, { start: -1, end: 4 }, { start: 1.5, end: 4 }, { start: 2, end: 4 }, "x", null])).toEqual([{ start: 2, end: 4 }]);
    expect(leftOut({ unprocessed: [{ start: 9, end: 9 }], unlocated: 0, not_understood: [{ start: 0, end: 3 }] })).toEqual([{ start: 0, end: 3 }]);
  });
});

describe("anythingLeftOut", () => {
  it("is true for a place of either kind or a count, false for a note taken whole", () => {
    expect(anythingLeftOut({ unprocessed: [], unlocated: 0 })).toBe(false);
    expect(anythingLeftOut({ unprocessed: [], unlocated: 0, not_understood: [] })).toBe(false);
    expect(anythingLeftOut({ unprocessed: [{ start: 0, end: 2 }], unlocated: 0 })).toBe(true);
    expect(anythingLeftOut({ unprocessed: [], unlocated: 0, not_understood: [{ start: 0, end: 2 }] })).toBe(true);
    expect(anythingLeftOut({ unprocessed: [], unlocated: 1 })).toBe(true);
    expect(anythingLeftOut(null)).toBe(false);
  });
});
