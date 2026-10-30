// A section's dot (Stage 1: "pink, orange, lavender and butter live only in
// the art and the section dots"), beside its caps label. The accent is fixed
// by the section's name (tokens.sectionAccent); nothing about the person or
// their history changes it.
import React from "react";
import { View } from "react-native";
import { type Palette, sectionAccent, size, space } from "@/design/tokens";
import { Label } from "../Text";
import { usePalette } from "../theme";

export type SectionKey = keyof typeof sectionAccent;

export function SectionDot({ accent, small = false }: { accent: keyof Palette; small?: boolean }) {
  const p = usePalette();
  const d = small ? size.dot : size.sectionDot;
  return <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: p[accent] }} />;
}

/** A caps label with its section's dot before it. */
export function SectionLabel({ section, accent, children, header = true }: {
  section?: SectionKey;
  /** A palette colour, when the label isn't one of the fixed sections. */
  accent?: keyof Palette;
  children: string;
  header?: boolean;
}) {
  const c = accent ?? (section ? sectionAccent[section] : "mark");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
      <SectionDot accent={c} />
      <Label tone="inkQuiet" accessibilityRole={header ? "header" : undefined}>{children}</Label>
    </View>
  );
}
