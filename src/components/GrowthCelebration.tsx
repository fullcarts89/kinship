/**
 * GrowthCelebration
 *
 * A quiet celebration overlay played when a relationship crosses a growth
 * stage: a soft sage glow ring expands and fades while three tiny leaves
 * drift upward and dissolve. Renders absolutely over a plant of the given
 * size; plays once per mount of `trigger=true`.
 *
 * Deliberately restrained — an exhale, not a firework.
 */

import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { colors } from "@design/tokens";

const RING_DURATION = 900;
const LEAF_DURATION = 1400;

function TinyLeaf({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path d="M1 6 C2 2 7 1 9 2 C9 6 5 9 2 8 C1.5 7.5 1 6.8 1 6" fill={color} />
    </Svg>
  );
}

function RisingLeaf({
  trigger,
  delay,
  startX,
  drift,
  size,
  color,
}: {
  trigger: boolean;
  delay: number;
  startX: number;
  drift: number;
  size: number;
  color: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      progress.value = 0;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: LEAF_DURATION, easing: Easing.out(Easing.quad) })
      );
    }
  }, [trigger, delay]);

  const style = useAnimatedStyle(() => ({
    opacity:
      progress.value < 0.15
        ? progress.value / 0.15
        : 1 - Math.max(0, (progress.value - 0.5) / 0.5),
    transform: [
      { translateY: -progress.value * 38 },
      { translateX: Math.sin(progress.value * Math.PI * 2) * drift },
      { rotate: `${progress.value * 70 - 35}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", bottom: "38%", left: startX }, style]}
    >
      <TinyLeaf size={size} color={color} />
    </Animated.View>
  );
}

export interface GrowthCelebrationProps {
  /** Plays the celebration while true (rising edge starts it). */
  trigger: boolean;
  /** The plant's rendered size — the overlay matches it. */
  size: number;
}

export function GrowthCelebration({ trigger, size }: GrowthCelebrationProps) {
  const ring = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      ring.value = 0;
      ring.value = withSequence(
        withTiming(1, { duration: RING_DURATION, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [trigger]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - ring.value),
    transform: [{ scale: 0.55 + ring.value * 0.75 }],
  }));

  if (!trigger) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Expanding glow ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: size * 0.45,
            borderWidth: Math.max(2, size * 0.03),
            borderColor: colors.sageLight,
          },
          ringStyle,
        ]}
      />
      {/* Three drifting leaves */}
      <RisingLeaf trigger={trigger} delay={0} startX={size * 0.32} drift={5} size={Math.max(8, size * 0.12)} color={colors.sage} />
      <RisingLeaf trigger={trigger} delay={180} startX={size * 0.52} drift={-6} size={Math.max(7, size * 0.1)} color={colors.sageLight} />
      <RisingLeaf trigger={trigger} delay={340} startX={size * 0.66} drift={4} size={Math.max(6, size * 0.09)} color={colors.gold} />
    </View>
  );
}

export default GrowthCelebration;
