// E07 gate, computed from the tokens: every text pair reads at ≥ 4.5:1
// (WCAG AA) in light and night, including the ochre on paper the plan
// singles out (#8A6417 on #EFEEE9).
import { color, type Palette } from "@/design/tokens";

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
  ["ink", "paper"], ["ink", "surface"], ["inkSoft", "paper"], ["inkSoft", "surface"],
  ["ochre", "paper"], ["ochre", "surface"], ["onOchre", "ochre"], ["danger", "paper"], ["danger", "surface"],
  ["ink", "mark"],
];

it.each(["light", "night"] as const)("%s text pairs are at least 4.5:1", (mode) => {
  const p = color[mode];
  for (const [fg, bg] of TEXT_PAIRS) {
    expect([mode, fg, bg, contrast(p[fg], p[bg]) >= 4.5]).toEqual([mode, fg, bg, true]);
  }
});

it("ochre on paper passes, narrowly: 4.6:1, not the 5.1:1 the design canvas lists", () => {
  const ratio = contrast(color.light.ochre, color.light.paper);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
  expect(ratio).toBeCloseTo(4.62, 2);
});
