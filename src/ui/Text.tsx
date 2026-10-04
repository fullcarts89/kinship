// Type for the 2.0 shell: one serif statement voice, a plain sans for the rest.
import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { type } from "@/design/tokens";
import type { Palette } from "@/design/tokens";
import { usePalette } from "./theme";

type Tone = keyof Pick<Palette, "ink" | "inkSoft" | "ochre" | "danger">;

function make(style: (typeof type)[keyof typeof type], defaultTone: Tone, role?: TextProps["accessibilityRole"]) {
  return function T({ tone, style: extra, ...rest }: TextProps & { tone?: Tone }) {
    const p = usePalette();
    return <RNText accessibilityRole={role} {...rest} style={[style, { color: p[tone ?? defaultTone] }, extra]} />;
  };
}

/** A screen's title. */
export const Display = make(type.display, "ink", "header");
/** The one serif statement: what Kinship remembers, as the user would say it. */
export const Statement = make(type.statement, "ink");
export const Body = make(type.body, "ink");
export const Label = make(type.label, "ink");
export const Small = make(type.small, "inkSoft");
