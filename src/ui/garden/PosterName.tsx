// A person's name at poster scale (Stage 1: "Archivo Black at 120 pt for the
// name … a 12:1 ratio to the labels"). It is fitted to the page: one line when
// the name allows, two lines for a long name, never smaller than `min`, never
// cut off, and it does not grow with Dynamic Type (it is already the biggest
// thing on the page). Without a photo it can be filled with the bloom.
import React, { useState } from "react";
import { Text, useWindowDimensions, View, type TextStyle } from "react-native";
import { GUTTER, posterMetrics, press, type } from "@/design/tokens";
import { Pressable } from "../Pressable";
import { usePalette } from "../theme";
import { BloomName } from "./BloomName";

/** Archivo Black's average advance, as a share of the size, for mixed-case names. */
const ADVANCE = 0.66;

/** The size and lines a name takes to fit `width`. */
export function fitPoster(name: string, width: number, max: number, min: number): { fontSize: number; lines: string[] } {
  const clean = name.trim().replace(/\s+/gu, " ");
  const oneLine = width / (Math.max(1, clean.length) * ADVANCE);
  const words = clean.split(" ");
  if (oneLine >= min || words.length === 1) return { fontSize: Math.max(min, Math.min(max, oneLine)), lines: [clean] };
  // Two lines: as even as the words allow; the longer line sets the size.
  let best: string[] = [clean];
  let bestLen = clean.length;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const len = Math.max(a.length, b.length);
    if (len < bestLen) {
      bestLen = len;
      best = [a, b];
    }
  }
  const twoLines = width / (bestLen * ADVANCE);
  return { fontSize: Math.max(min, Math.min(max, twoLines)), lines: best };
}

export function posterStyle(fontSize: number): TextStyle {
  return {
    fontFamily: type.poster.fontFamily,
    fontSize,
    lineHeight: Math.round(fontSize * posterMetrics.leading),
    letterSpacing: posterMetrics.tracking * fontSize,
  };
}

export function PosterName({ name, max = type.poster.fontSize, min = 44, fill = "ink", onPress, accessibilityLabel, accessibilityHint, width: given }: {
  name: string;
  max?: number;
  min?: number;
  /** "bloom": the name filled with the hero bloom (no photo). */
  fill?: "ink" | "bloom";
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** The width to fit; the page minus its gutters when not given. */
  width?: number;
}) {
  const p = usePalette();
  const { width: page } = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);
  const width = given ?? measured ?? page - 2 * GUTTER;
  const { fontSize, lines } = fitPoster(name, width, max, min);
  const style = posterStyle(fontSize);
  const height = (style.lineHeight as number) * lines.length;
  const body = fill === "bloom"
    ? <BloomName lines={lines} textStyle={style} width={width} height={height} />
    : (
      <Text accessibilityRole="header" maxFontSizeMultiplier={1} style={[style, { color: p.ink, width }]}>
        {lines.join("\n")}
      </Text>
    );
  const content = (
    <View onLayout={given ? undefined : (e) => setMeasured(e.nativeEvent.layout.width)} style={{ width: given, alignSelf: given ? "flex-start" : "stretch" }}>
      {body}
    </View>
  );
  if (!onPress) {
    return fill === "bloom"
      ? <View accessible accessibilityRole="header" accessibilityLabel={accessibilityLabel ?? name}>{content}</View>
      : content;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
    >
      {content}
    </Pressable>
  );
}
