// A soft paper scrim behind text that sits over the garden's art (WS-5's walkthrough: the poster name and
// the Today statement lost legibility where petals crossed them). An elliptical fade from paper at the given
// strength to clear, with no edges: the art stays visible around the words, which sit on quiet ground.
// Decorative: hidden from screen readers, never in the way of a touch.
import React, { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { GUTTER, space } from "@/design/tokens";
import { usePalette } from "../theme";

export function TextScrim({ strength = 0.88, bleed = GUTTER + space.xl, center = 0.5 }: {
  strength?: number;
  /** How far it reaches past the content box on each side. */
  bleed?: number;
  /** Where the fade is densest, across the box (0 left, 1 right). */
  center?: number;
}) {
  const p = usePalette();
  const id = `scrim${useId().replace(/[^\w]/gu, "")}`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="text-scrim"
      style={{ position: "absolute", top: -space.xl, bottom: -space.xl, left: -bleed, right: -bleed }}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={p.paper} stopOpacity={strength} />
            <Stop offset="0.7" stopColor={p.paper} stopOpacity={strength * 0.9} />
            <Stop offset="1" stopColor={p.paper} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={`${center * 100}%`} cy="50%" rx="50%" ry="50%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
