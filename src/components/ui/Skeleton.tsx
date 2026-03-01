/**
 * Skeleton
 *
 * Animated shimmer placeholder for loading states.
 * Uses reanimated color interpolation — no LinearGradient dependency.
 */

import React, { useEffect } from "react";
import { type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { colors, radii } from "@design/tokens";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SkeletonProps {
  /** Width in pixels or percentage string */
  width: number | `${number}%`;
  /** Height in pixels */
  height: number;
  /** Corner radius (default: radii.sm = 8) */
  borderRadius?: number;
  /** Shortcut: sets borderRadius = height/2 */
  circle?: boolean;
  /** Additional NativeWind classes */
  className?: string;
}

// ─── Shimmer Colors ─────────────────────────────────────────────────────────

const COLOR_BASE = colors.sagePale;  // #EBF3EB
const COLOR_LIGHT = "#F5FAF5";

// ─── Component ──────────────────────────────────────────────────────────────

export function Skeleton({
  width,
  height,
  borderRadius = radii.sm,
  circle = false,
  className,
}: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLOR_BASE, COLOR_LIGHT]
    ),
  }));

  return (
    <Animated.View
      className={cn("overflow-hidden", className)}
      style={[
        animatedStyle,
        {
          width,
          height,
          borderRadius: circle ? height / 2 : borderRadius,
        },
      ]}
    />
  );
}

export default Skeleton;
