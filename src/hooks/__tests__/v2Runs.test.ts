// The Source view marks the evidence spans of a note: spans are code points
// (CA-4), the screen slices UTF-16, and overlapping spans merge.
import { runsOf } from "@/hooks/useV2";

it("marks each memory's evidence in the note, emoji and all", () => {
  const note = "Ben 🏃‍♂️ ran Chicago 🎉 in 3:58!";
  // "ran Chicago 🎉" is code points [9, 22).
  expect(runsOf(note, [{ start: 9, end: 22 }])).toEqual([
    { text: "Ben 🏃‍♂️ ", marked: false },
    { text: "ran Chicago 🎉", marked: true },
    { text: " in 3:58!", marked: false },
  ]);
});

it("merges overlapping evidence and keeps the note's words intact", () => {
  const note = "Ben runs Chicago Sunday. He's hoping to break four hours.";
  const runs = runsOf(note, [{ start: 25, end: 56 }, { start: 0, end: 24 }, { start: 4, end: 16 }]);
  expect(runs.map((r) => r.text).join("")).toBe(note);
  expect(runs.filter((r) => r.marked).map((r) => r.text)).toEqual(["Ben runs Chicago Sunday.", "He's hoping to break four hours"]);
});
