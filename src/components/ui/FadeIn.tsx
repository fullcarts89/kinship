/**
 * FadeIn
 *
 * Lightweight reanimated wrapper that fades in (and optionally slides up)
 * its children on mount. Supports delay for stagger effects.
 */

import React, { useEffect } from "react";
import { type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { animation } from "@design/tokens";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FadeInProps {
  children: React.ReactNode;
  /** Delay in ms before animation starts (for stagger) */
  delay?: number;
  /** Duration in ms (default: animation.normal = 250ms) */
  duration?: number;
  /** Slide up from 8px below (default: true) */
  slideUp?: boolean;
  /** Additional NativeWind classes */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FadeIn({
  children,
  delay = 0,
  duration = animation.normal,
  slideUp = true,
  className,
}: FadeInProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slideUp ? 8 : 0);

  useEffect(() => {
    const timingConfig = { duration, easing: Easing.out(Easing.ease) };

    opacity.value = withDelay(delay, withTiming(1, timingConfig));
    if (slideUp) {
      translateY.value = withDelay(delay, withTiming(0, timingConfig));
    }
  }, [delay, duration, slideUp, opacity, translateY]);

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View className={cn(className)} style={animatedStyle}>
      {children}
    </Animated.View>
  );
}

export default FadeIn;
