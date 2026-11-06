// Type for the notebook (PR #77 proto.css), from the same three families as Electric Garden:
// Archivo Black for headlines and names, Newsreader for the user's words and remembered lines,
// Instrument Sans for the machine. Every variant grows with Dynamic Type up to its role's limit;
// headlines wrap, never truncate.
import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { font, maxScale } from "@/design/tokens";
import { usePalette } from "../theme";
import { useNotebookPalette } from "./theme";

const dsp = (size: number, leading = 0.95, track = -0.02): TextStyle => ({
  fontFamily: font.poster, fontSize: size, lineHeight: Math.round(size * leading), letterSpacing: size * track,
});
const serif = (size: number, leading = 1.4, italic = false): TextStyle => ({
  fontFamily: italic ? font.serifItalic : font.serif, fontSize: size, lineHeight: Math.round(size * leading),
});
const sans = (size: number, weight: "400" | "500" | "600" | "700" = "400", leading = 1.35): TextStyle => ({
  fontFamily: weight === "700" ? font.sansBold : weight === "600" ? font.sansSemi : weight === "500" ? font.sansMedium : font.sans,
  fontSize: size, lineHeight: Math.round(size * leading),
});
const caps = (size: number, track: number, weight: "600" | "700" = "600"): TextStyle => ({
  ...sans(size, weight, 1.25), letterSpacing: size * track, textTransform: "uppercase",
});

/** The variants, named by role and size as the prototype sets them. */
export const NT = {
  /** Headline on a poster, a moment, People's title. */
  poster: dsp(40),
  hero: dsp(44),
  moment: dsp(36),
  title: dsp(30),
  sheetTitle: dsp(27, 1.02),
  /** A person's name on their page. */
  name: dsp(52, 0.9),
  /** A deck card's day; a group header; a year divider. */
  cardWhen: dsp(24, 1),
  group: dsp(20, 1),
  quietTitle: dsp(46),
  /** Serif: what the user said and what Kinship remembers. */
  serif23: serif(23, 1.35),
  serif21: serif(21, 1.4),
  serif20: serif(20, 1.4),
  serif19: serif(19, 1.35),
  serif18: serif(18, 1.4),
  serif17: serif(17, 1.4),
  serif16: serif(16, 1.42),
  /** The user's own words, quoted. */
  quote19: serif(19, 1.4, true),
  quote18: serif(18, 1.35, true),
  quote15: serif(15.5, 1.4, true),
  quote14: serif(14, 1.35, true),
  /** The machine. */
  button: sans(16, "600", 1.2),
  buttonSmall: sans(14.5, "600", 1.2),
  strong16: sans(16, "600", 1.25),
  strong15: sans(15, "600", 1.3),
  strong14: sans(14.5, "600", 1.2),
  body15: sans(15, "500", 1.4),
  body16: sans(16, "400", 1.4),
  small: sans(13.5, "400", 1.35),
  fine: sans(13, "400", 1.45),
  tag: sans(11.5, "600", 1.2),
  /** Caps: section labels, the date, a source. */
  cap: caps(11, 0.14),
  source: caps(10.5, 0.12),
  category: caps(10.5, 0.12, "700"),
  dayCap: caps(10.5, 0.1, "700"),
} as const;

export type NVariant = keyof typeof NT;

const SCALE: Record<NVariant, number> = Object.fromEntries(
  (Object.keys(NT) as NVariant[]).map((k) => [
    k,
    ["poster", "hero", "moment", "title", "sheetTitle", "name", "cardWhen", "group", "quietTitle"].includes(k)
      ? maxScale.display
      : ["cap", "source", "category", "dayCap", "tag"].includes(k)
        ? maxScale.label
        : maxScale.text,
  ]),
) as Record<NVariant, number>;

export type NTone = "ink" | "ink2" | "quiet" | "onPhoto" | "onPhotoQuiet" | "held" | "yours" | "replace" | "known" | "onInk";

export function NText({ v, tone = "ink", color, style, ...rest }: TextProps & { v: NVariant; tone?: NTone; color?: string }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const c = color ?? {
    ink: p.ink, ink2: n.ink2, quiet: n.quiet, onPhoto: n.onPhoto, onPhotoQuiet: n.onPhotoQuiet, held: n.held,
    yours: n.yoursText, replace: n.replaceText, known: n.knownText, onInk: p.onInk,
  }[tone];
  const header = ["poster", "hero", "moment", "title", "sheetTitle", "name", "quietTitle"].includes(v);
  return (
    <RNText
      accessibilityRole={header ? "header" : undefined}
      maxFontSizeMultiplier={SCALE[v]}
      {...rest}
      style={[NT[v], { color: c }, style]}
    />
  );
}

export { RNText };
