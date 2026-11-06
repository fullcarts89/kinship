// Type for the 2.0 shell (Electric Garden, FD-30b): Archivo Black for names,
// the statement and titles; Newsreader for what the user said; Instrument
// Sans for the machine. Every style comes from the token scale and grows with
// Dynamic Type, up to the limit set for it.
import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { maxScale, type } from "@/design/tokens";
import type { Palette } from "@/design/tokens";
import { usePalette } from "./theme";

export type Tone = keyof Pick<Palette, "ink" | "inkBody" | "inkQuiet" | "markText" | "brick" | "onInk">;

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

/** The one statement on Today (Archivo Black 40). */
export const Statement = make(type.statement, "ink", maxScale.display, "header");
/** A headline that isn't the moment: the promise, first use, a quiet day (Archivo Black 34). */
export const Display = make(type.display, "ink", maxScale.display, "header");
/** A person's name as a heading (Archivo Black 104; PosterName fits it to the page). */
export const Name = make(type.name, "ink", maxScale.poster, "header");
/** A page or sheet title (Archivo Black 26). */
export const Title = make(type.title, "ink", maxScale.display, "header");
/** A sheet's heading (Archivo Black 21). */
export const Heading = make(type.heading, "ink", maxScale.display, "header");
/** Items in briefs and setup (Newsreader 21/28). */
export const MomentText = make(type.moment, "ink", maxScale.text);
/** A remembered line: facts on a page, kept items (Newsreader 20/26). */
export const Line = make(type.line, "ink", maxScale.text);
/** The user's own words, or what Kinship says they said (Newsreader italic 21/27). */
export const Quote = make(type.quote, "ink", maxScale.text);
/** Today's greeting (Newsreader 18, quiet). */
export const Greeting = make(type.greeting, "inkQuiet", maxScale.text);
/** Titles of places and seasons. */
export const Italic = make(type.italic, "inkQuiet", maxScale.text);
/** Explanations (Instrument Sans 16/24). */
export const Body = make(type.body, "inkBody", maxScale.text);
/** The event under a statement ("Chicago Marathon · Sun, Oct 11"). Instrument Sans 600, 15. */
export const Context = make(type.context, "ink", maxScale.text);
/** Section labels: 11, caps, +16%. */
export const Label = make(type.label, "inkQuiet", maxScale.label);
/** Where something came from, in caps beside the lime dot (11, +14%). */
export const Source = make(type.source, "inkQuiet", maxScale.label);
/** A day in the week row ("WED 14"). */
export const Week = make(type.week, "ink", maxScale.label);
/** Small quiet text (12/16). */
export const Small = make(type.provenance, "inkQuiet", maxScale.text);
