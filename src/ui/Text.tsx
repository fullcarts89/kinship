// Type for the 2.0 shell (Design Direction §H): serif speaks about people;
// sans runs the machine. Every style comes from the token scale and grows
// with Dynamic Type, up to the limit set for it.
import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { maxScale, type } from "@/design/tokens";
import type { Palette } from "@/design/tokens";
import { usePalette } from "./theme";

export type Tone = keyof Pick<Palette, "ink" | "inkBody" | "inkQuiet" | "ochreText" | "brick" | "onInk">;

function make(
  style: (typeof type)[keyof typeof type],
  defaultTone: Tone,
  scale: number,
  role?: TextProps["accessibilityRole"],
) {
  return function T({ tone, style: extra, ...rest }: TextProps & { tone?: Tone }) {
    const p = usePalette();
    return (
      <RNText
        accessibilityRole={role}
        maxFontSizeMultiplier={scale}
        {...rest}
        style={[style, { color: p[tone ?? defaultTone] }, extra]}
      />
    );
  };
}

/** The one moment on Today (Newsreader 34/38). */
export const Display = make(type.display, "ink", maxScale.display, "header");
/** A person's name on their page (Newsreader 40). */
export const Name = make(type.name, "ink", maxScale.display, "header");
/** A page or sheet title (Newsreader 30). */
export const Title = make(type.title, "ink", maxScale.display, "header");
/** A sheet's heading (Newsreader 24). */
export const Heading = make(type.heading, "ink", maxScale.display, "header");
/** Items in briefs and setup (Newsreader 21/28). */
export const MomentText = make(type.moment, "ink", maxScale.text);
/** A remembered line: facts on a page, kept items (Newsreader 19/26). */
export const Line = make(type.line, "ink", maxScale.text);
/** Today's greeting (Newsreader 18, quiet). */
export const Greeting = make(type.greeting, "inkQuiet", maxScale.text);
/** Titles of places and seasons. */
export const Italic = make(type.italic, "inkQuiet", maxScale.text);
/** Explanations (Instrument Sans 16/24). */
export const Body = make(type.body, "inkBody", maxScale.text);
/** Section labels: 11, caps, +14%. */
export const Label = make(type.label, "inkQuiet", maxScale.label);
/** Where something came from (12/16). */
export const Small = make(type.provenance, "inkQuiet", maxScale.text);
