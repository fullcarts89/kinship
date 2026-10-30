// A fine grain over the whole page, so paper, art and photo share one printed
// surface (Stage 1: a fractal-noise overlay). One small noise tile, laid in a
// grid over the page (a repeating image is not reliable on every renderer);
// its strength is a token (art.grain), lower at night. Off under Reduce
// Transparency, and never in the way of a touch or a screen reader.
import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { art } from "@/design/tokens";
import { useNight } from "../theme";
import { gardenArt } from "./assets";

/** True when the user asked for less transparency: the grain and the wash step aside. */
export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((on) => live && setReduce(!!on)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.("reduceTransparencyChanged", (on: boolean) => setReduce(!!on));
    return () => {
      live = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

export function Grain({ opacity }: { opacity?: number }) {
  const night = useNight();
  const off = useReduceTransparency();
  const { width, height } = useWindowDimensions();
  if (off) return null;
  const t = art.grain.tile;
  const cols = Math.ceil(width / t);
  const rows = Math.ceil(height / t);
  const tiles: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push({ x: c * t, y: r * t });
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="garden-grain"
      style={[StyleSheet.absoluteFill, { opacity: opacity ?? (night ? art.grain.night : art.grain.opacity), overflow: "hidden" }]}
    >
      {tiles.map((p) => (
        <Image key={`${p.x}-${p.y}`} source={gardenArt.grain} resizeMode="stretch" fadeDuration={0} style={{ position: "absolute", left: p.x, top: p.y, width: t, height: t }} />
      ))}
    </View>
  );
}
