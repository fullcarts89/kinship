/**
 * VitalPlant
 *
 * A wrapper component that renders a plant illustration with vitality-based
 * visual modifiers. Vitality does NOT change the illustration (growth stage
 * determines that). Instead it applies:
 *
 * 1. Opacity reduction for dormant/resting plants
 * 2. A semi-transparent cream overlay to desaturate lower-vitality plants
 * 3. Sway animation parameters that slow and diminish with lower vitality
 *
 * Use this component everywhere a plant is rendered instead of rendering
 * the illustration directly.
 */

import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { colors } from "@design/tokens";
import {
  getVitalityLevel,
  getSwayParams,
  getOverlayOpacity,
  type VitalityLevel,
} from "@/lib/vitalityEngine";
import { usePersonGrowth } from "@/hooks/useGrowth";
import { GrowthCelebration } from "@/components/GrowthCelebration";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VitalPlantProps {
  /** The plant illustration to render (a React component accepting `size` prop) */
  children: React.ReactNode;
  /** Vitality score (0.0 to 1.0) */
  vitalityScore: number;
  /** Plant illustration size — used for the overlay dimensions */
  size: number;
  /** Optional stagger delay for carousel (ms) */
  staggerDelay?: number;
  /** Optional index for varied sway timing */
  index?: number;
  /**
   * Optional person ID. When provided, the plant plays a brief
   * celebratory pulse right after that person crosses a growth stage —
   * a quiet visual response, never a banner or a number.
   */
  personId?: string;
}

// ─── Vitality opacity based on level ────────────────────────────────────────

function getPlantOpacity(level: VitalityLevel): number {
  switch (level) {
    case "vibrant":
      return 1.0;
    case "healthy":
      return 1.0;
    case "resting":
      return 0.85;
    case "dormant":
      return 0.7;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function VitalPlant({
  children,
  vitalityScore,
  size,
  staggerDelay = 0,
  index = 0,
  personId,
}: VitalPlantProps) {
  const level = getVitalityLevel(vitalityScore);
  const { amplitude, duration } = getSwayParams(level);
  const plantOpacity = getPlantOpacity(level);
  const overlayOpacity = getOverlayOpacity(vitalityScore);

  // ─── Sway animation ────────────────────────────────────────────────────
  const sway = useSharedValue(0);

  // Vary duration slightly per index for organic feel
  const swayDuration = duration + (index % 3) * 200;

  useEffect(() => {
    sway.value = withDelay(
      staggerDelay + index * 120,
      withRepeat(
        withSequence(
          withTiming(amplitude, {
            duration: swayDuration,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-amplitude, {
            duration: swayDuration,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );
  }, [amplitude, swayDuration, staggerDelay, index]);

  // ─── Stage-transition pulse ────────────────────────────────────────────
  // Hook runs unconditionally (rules of hooks); an empty ID is inert.
  const { justTransitioned } = usePersonGrowth(personId ?? "");
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (personId && justTransitioned) {
      pulse.value = withSequence(
        withTiming(1.07, { duration: 350, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.cubic) })
      );
    }
  }, [justTransitioned, personId]);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sway.value}deg` }, { scale: pulse.value }],
  }));

  return (
    <Animated.View
      style={[
        swayStyle,
        {
          opacity: plantOpacity,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {/* The plant illustration */}
      {children}

      {/* Cream overlay for desaturation — lower vitality = more washed out */}
      {overlayOpacity > 0.01 && (
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.cream,
            opacity: overlayOpacity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Stage-transition celebration: glow ring + drifting leaves */}
      {personId ? (
        <GrowthCelebration trigger={justTransitioned} size={size} />
      ) : null}
    </Animated.View>
  );
}
