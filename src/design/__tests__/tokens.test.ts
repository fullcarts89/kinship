// E07 gate, computed from the tokens: every text pair reads at ≥ 4.5:1 (WCAG
// AA) in light and night, and the lime mark (the provenance dot, the
// understood-word underline) reaches the 3:1 a non-text cue needs on paper
// and on the surface. The palette is the Electric Garden one (FD-30b).
import { color, sectionAccent, space, type Palette } from "@/design/tokens";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ["ink", "paper"], ["ink", "surface"], ["inkBody", "paper"], ["inkBody", "surface"],
  ["inkQuiet", "paper"], ["inkQuiet", "surface"], ["markText", "paper"], ["markText", "surface"],
  ["onInk", "ink"], ["brick", "paper"], ["brick", "surface"],
];

it.each(["light", "night"] as const)("%s text pairs are at least 4.5:1", (mode) => {
  const p = color[mode];
  for (const [fg, bg] of TEXT_PAIRS) {
    expect([mode, fg, bg, contrast(p[fg], p[bg]) >= 4.5]).toEqual([mode, fg, bg, true]);
  }
});

it.each(["light", "night"] as const)("%s the lime mark is at least 3:1 against paper and surface", (mode) => {
  const p = color[mode];
  expect(contrast(p.mark, p.paper)).toBeGreaterThanOrEqual(3);
  expect(contrast(p.mark, p.surface)).toBeGreaterThanOrEqual(3);
});

it("the palette is the Electric Garden one (FD-30b): leaf-green ink, lime mark, the five accents", () => {
  expect(color.light).toMatchObject({
    paper: "#F6F3EC", ink: "#0B2A1D", mark: "#4C9418", lime: "#BDF24E", bloom: "#FF4FA3", sunset: "#FF6A2B", lavender: "#CDBBFF", butter: "#FFE86A",
  });
  expect(color.night).toMatchObject({ paper: "#0A1A12", ink: "#EEF3EA", mark: "#BDF24E" });
  // The art stays vivid at night: the accents are the same colours.
  for (const k of ["lime", "bloom", "sunset", "lavender", "butter"] as const) expect(color.night[k]).toBe(color.light[k]);
});

it("section dots take fixed accents, never the ink and never by history", () => {
  const accents = new Set(Object.values(sectionAccent));
  expect(accents.has("ink" as never)).toBe(false);
  expect(accents.size).toBe(Object.keys(sectionAccent).length);
});

it("spacing is the approved 4-pt scale", () => {
  expect(Object.values(space)).toEqual([4, 8, 12, 16, 20, 26, 34, 48, 64]);
});
