// A fine grain over the whole page, so paper, art and photo share one printed
// surface (Stage 1: a fractal-noise overlay). One small tile, repeated; its
// strength is a token (art.grain), lower at night. Off under Reduce
// Transparency, and never in the way of a touch or a screen reader.
import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Image, StyleSheet, View } from "react-native";
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
  if (off) return null;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Image
        source={gardenArt.grain}
        resizeMode="repeat"
        testID="garden-grain"
        style={[StyleSheet.absoluteFill, { opacity: opacity ?? (night ? art.grain.night : art.grain.opacity) }]}
      />
    </View>
  );
}
