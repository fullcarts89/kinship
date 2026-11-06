// A field low in a sheet is brought above the keyboard (native pass, 3 Nov 2026: "Keep it in mind"'s
// words and its button sat under the keyboard). The sheet scrolls only by what the keyboard covers,
// plus room for the action after the field; a field already in view stays where it is.
import { revealBy } from "../Sheet";

it("scrolls by what the keyboard covers, plus room for the action after it", () => {
  // The sheet's visible content ends at 520 pt; the field ends at 760 pt.
  expect(revealBy(760, 520, 88)).toBe(328);
});

it("leaves a field already in view alone", () => {
  expect(revealBy(400, 520)).toBe(0);
  expect(revealBy(520, 520)).toBe(0);
});
