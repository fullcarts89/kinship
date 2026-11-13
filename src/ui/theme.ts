// The palette for the current appearance (plan §18: light or night from the
// system), and the user's Reduce Motion setting. The 2.0 shell follows the
// system appearance (app/v2/_layout.tsx); 1.0 is pinned to light.
import { useEffect, useState } from "react";
import { AccessibilityInfo, PixelRatio, useColorScheme } from "react-native";
import { color, type Palette } from "@/design/tokens";

export function useNight(): boolean {
  return useColorScheme() === "dark";
}

export function usePalette(): Palette {
  return useNight() ? color.night : color.light;
}

// The setting as last read, shared by every component. The system only answers
// asynchronously, so a hook that started from `false` began every arrival at
// full motion and only switched to the fade once the answer came back: with
// Reduce Motion on, the rise or slide was partly visible. The setting is asked
// for once when this module loads (long before the first screen animates) and
// kept current, so a component mounts already knowing it.
let lastKnownReduce = false;
let primed = false;
function primeReduceMotion(): void {
  if (primed) return;
  primed = true;
  AccessibilityInfo.isReduceMotionEnabled?.().then((on) => { lastKnownReduce = !!on; }).catch(() => undefined);
  AccessibilityInfo.addEventListener?.("reduceMotionChanged", (on: boolean) => { lastKnownReduce = !!on; });
}
primeReduceMotion();

/** True when the user asked for less motion: everything becomes a 150 ms fade. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(lastKnownReduce);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((on) => {
        lastKnownReduce = !!on;
        if (live) setReduce(!!on);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (on: boolean) => {
      lastKnownReduce = !!on;
      setReduce(!!on);
    });
    return () => {
      live = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

/**
 * True at the larger Dynamic Type sizes (xxxLarge and the accessibility sizes): rows of actions stack and
 * pill labels wrap instead of shrinking, so nothing is cut off or left blank.
 */
export function isLargeText(): boolean {
  return PixelRatio.getFontScale() > 1.35;
}
