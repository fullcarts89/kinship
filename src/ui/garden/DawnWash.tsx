// The kind of day, as light (Stage 1: "a soft radial wash fades into the
// paper by mid-screen; it is the kind of day"). Joyful days are warm and
// high; a quiet day is cooler and lower; a difficult one cooler and lower
// still. The plants never change with it. At night the wash is quieter so
// the art stays the vivid thing. Off under Reduce Transparency.
import React, { useId } from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { art, type Palette } from "@/design/tokens";
import { useNight, usePalette } from "../theme";
import { useReduceTransparency } from "./Grain";

export type DayKind = "joyful" | "warm" | "quiet" | "difficult";

interface Light { c: keyof Palette; cx: number; cy: number; rx: number; ry: number; a: number }

/** Where each light sits, as a share of the wash's width and height, with its own radius in points. */
const LIGHTS: Record<DayKind, Light[]> = {
  joyful: [
    { c: "sunset", cx: 0.92, cy: 0.08, rx: 210, ry: 180, a: 0.42 },
    { c: "bloom", cx: 0.7, cy: 0.3, rx: 190, ry: 165, a: 0.3 },
    { c: "lavender", cx: 0.1, cy: 0.36, rx: 160, ry: 150, a: 0.45 },
    { c: "butter", cx: 0.3, cy: 0.06, rx: 130, ry: 110, a: 0.5 },
  ],
  warm: [
    { c: "butter", cx: 0.85, cy: 0.06, rx: 200, ry: 170, a: 0.45 },
    { c: "sunset", cx: 0.65, cy: 0.28, rx: 170, ry: 150, a: 0.22 },
    { c: "lavender", cx: 0.08, cy: 0.34, rx: 160, ry: 150, a: 0.35 },
  ],
  quiet: [
    { c: "lavender", cx: 0.86, cy: 0.08, rx: 230, ry: 200, a: 0.44 },
    { c: "butter", cx: 0.12, cy: 0.22, rx: 180, ry: 160, a: 0.3 },
    { c: "lime", cx: 0.62, cy: 0.42, rx: 150, ry: 130, a: 0.14 },
  ],
  difficult: [
    { c: "lavender", cx: 0.88, cy: 0.06, rx: 230, ry: 200, a: 0.3 },
    { c: "lime", cx: 0.1, cy: 0.3, rx: 150, ry: 140, a: 0.1 },
  ],
};

/** How high the wash reaches, and how strong it is, by kind of day. */
export const WASH: Record<DayKind, { height: number; opacity: number }> = {
  joyful: { height: art.wash.height, opacity: art.wash.opacity },
  warm: { height: art.wash.height, opacity: 0.8 },
  quiet: { height: Math.round(art.wash.height * 0.78), opacity: 0.75 },
  difficult: { height: Math.round(art.wash.height * 0.7), opacity: 0.6 },
};

export function DawnWash({ kind, height }: { kind: DayKind; height?: number }) {
  const p = usePalette();
  const night = useNight();
  const off = useReduceTransparency();
  const { width } = useWindowDimensions();
  const id = useId().replace(/[^\w]/gu, "");
  if (off) return null;
  const h = height ?? WASH[kind].height;
  const opacity = WASH[kind].opacity * (night ? art.wash.night : 1);
  const lights = LIGHTS[kind];
  return (
    <Svg
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      width={width}
      height={h}
      style={{ position: "absolute", top: 0, left: 0, opacity }}
      testID={`dawn-wash-${kind}`}
    >
      <Defs>
        {lights.map((l, i) => (
          <RadialGradient key={i} id={`${id}w${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={p[l.c]} stopOpacity={l.a} />
            <Stop offset="0.72" stopColor={p[l.c]} stopOpacity={0} />
          </RadialGradient>
        ))}
        <LinearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.5" stopColor={p.paper} stopOpacity={0} />
          <Stop offset="1" stopColor={p.paper} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      {lights.map((l, i) => (
        <Ellipse key={i} cx={l.cx * width} cy={l.cy * h} rx={l.rx} ry={l.ry} fill={`url(#${id}w${i})`} />
      ))}
      <Rect x={0} y={0} width={width} height={h} fill={`url(#${id}fade)`} />
    </Svg>
  );
}
