// One piece of the garden's art, placed bigger than the page and cut by its
// edges (Stage 1: "the art occupies one corner and leaves the rest as warm
// off-white"). Positions are given for a 393 pt page and scaled to the real
// width, so the composition holds on a small iPhone and a large one.
import React from "react";
import { Image, type ImageStyle, useWindowDimensions, View } from "react-native";
import { artAspect, gardenArt, type GardenArt } from "./assets";

/** The page width the compositions were drawn for. */
export const DESIGN_WIDTH = 393;

export interface BotanicalProps {
  art: GardenArt;
  /** Width in design points (scaled to the page). */
  width: number;
  /** Offsets in design points; one of left or right. */
  top: number;
  left?: number;
  right?: number;
  rotate?: number;
  flip?: boolean;
  opacity?: number;
  zIndex?: number;
  /** Fades the piece behind quiet states (an empty page, a setup step). */
  dim?: boolean;
  style?: ImageStyle;
}

export function Botanical({ art, width, top, left, right, rotate = 0, flip = false, opacity = 1, zIndex, dim = false, style }: BotanicalProps) {
  const { width: page } = useWindowDimensions();
  const k = page / DESIGN_WIDTH;
  const w = width * k;
  const h = w * artAspect[art];
  const transform = [{ rotate: `${rotate}deg` }, ...(flip ? [{ scaleX: -1 }] : [])];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute", width: w, height: h, top: top * k,
        ...(left !== undefined ? { left: left * k } : {}), ...(right !== undefined ? { right: right * k } : {}),
        transform, opacity: dim ? opacity * 0.55 : opacity, zIndex,
      }}
    >
      <Image source={gardenArt[art]} resizeMode="contain" testID={`botanical-`} style={[{ width: w, height: h }, style]} />
    </View>
  );
}
