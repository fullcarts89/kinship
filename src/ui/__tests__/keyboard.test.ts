// The Tell field rises by exactly the part of it the keyboard covers. The
// founder build lifted Today's dock by the keyboard's whole height on top of a
// container that already ended above the home indicator, so the field floated
// with the tabs and a gap between it and the keyboard.
import { keyboardOverlap } from "../useKeyboardLift";

it("lifts by the overlap, not the keyboard's height", () => {
  // A dock ending at the very bottom of an 874 pt screen; a 336 pt keyboard.
  expect(keyboardOverlap(874, 874 - 336, 336)).toBe(336);
  // A dock that already ends 34 pt above the bottom (the home indicator).
  expect(keyboardOverlap(840, 874 - 336, 336)).toBe(302);
  // A view the keyboard doesn't reach doesn't move.
  expect(keyboardOverlap(400, 538, 336)).toBe(0);
});

it("without a measurement, falls back to the keyboard's height", () => {
  expect(keyboardOverlap(null, 538, 336)).toBe(336);
});
