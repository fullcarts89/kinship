// The palette for the current appearance (plan §18: light or night from the
// system), and the user's Reduce Motion setting. The 2.0 shell follows the
// system appearance (app/v2/_layout.tsx); 1.0 is pinned to light.
import { useEffect, useState } from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";
import { color, type Palette } from "@/design/tokens";

export function useNight(): boolean {
  return useColorScheme() === "dark";
}

export function usePalette(): Palette {
  return useNight() ? color.night : color.light;
}

/** True when the user asked for less motion: everything becomes a 150 ms fade. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((on) => live && setReduce(!!on)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (on: boolean) => setReduce(!!on));
    return () => {
      live = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}
