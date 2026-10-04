// E07 gate, computed from the tokens: every text pair reads at ≥ 4.5:1 (WCAG
// AA) in light and night, including the ochre text on paper the plan singles
// out (#8A6417 on #EFEEE9), and ochre marks (underlines, dots) reach the 3:1
// a non-text cue needs. The scale is exactly the approved one.
import { color, space, type Palette } from "@/design/tokens";

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
  ["inkQuiet", "paper"], ["inkQuiet", "surface"], ["ochreText", "paper"], ["ochreText", "surface"],
  ["onInk", "ink"], ["brick", "paper"], ["brick", "surface"],
];

it.each(["light", "night"] as const)("%s text pairs are at least 4.5:1", (mode) => {
  const p = color[mode];
  for (const [fg, bg] of TEXT_PAIRS) {
    expect([mode, fg, bg, contrast(p[fg], p[bg]) >= 4.5]).toEqual([mode, fg, bg, true]);
  }
});

it.each(["light", "night"] as const)("%s ochre marks are at least 3:1 against paper and surface", (mode) => {
  const p = color[mode];
  expect(contrast(p.ochre, p.paper)).toBeGreaterThanOrEqual(3);
  expect(contrast(p.ochre, p.surface)).toBeGreaterThanOrEqual(3);
});

it("ochre text on paper passes, narrowly: 4.6:1, not the 5.1:1 the design canvas lists", () => {
  const ratio = contrast(color.light.ochreText, color.light.paper);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
  expect(ratio).toBeCloseTo(4.62, 2);
});

it("the palette is the approved Quiet Herbarium token table", () => {
  expect(color.light).toMatchObject({
    paper: "#EFEEE9", surface: "#F7F6F2", ink: "#1D221E", inkQuiet: "#5E645D", hairline: "#D6D5CD",
    ochre: "#A87A22", ochreText: "#8A6417", brick: "#9A3B2A",
  });
  expect(color.night).toMatchObject({
    paper: "#121513", surface: "#1A1E1B", ink: "#E6E4DC", inkQuiet: "#8E968B", hairline: "#2C322D",
    ochre: "#D9B25A", ochreText: "#D9B25A", brick: "#D98A77",
  });
});

it("spacing is the approved 4-pt scale", () => {
  expect(Object.values(space)).toEqual([4, 8, 12, 16, 20, 26, 34, 48, 64]);
});
