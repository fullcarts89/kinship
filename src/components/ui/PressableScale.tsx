/**
 * PressableScale
 *
 * The app-wide touch-feedback primitive: a Pressable that springs down
 * to ~0.95 scale while pressed and springs back on release, with an
 * optional light haptic tick on press.
 *
 * Calm-brand rules: never scales below 0.94, spring is soft (no wobble),
 * and haptics default OFF — enable `haptic` only for meaningful actions
 * (saving, planting, completing), not every list row.
 *
 * Drop-in replacement for Pressable:
 *   <PressableScale onPress={...} style={...}>...</PressableScale>
 */

import React, { useCallback } from "react";
import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const SPRING = { damping: 20, stiffness: 300, mass: 0.6 };

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  /** Scale while pressed. Keep within 0.94–0.98. */
  pressedScale?: number;
  /** Fire a light haptic tick on press-in. Reserve for meaningful actions. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function PressableScale({
  pressedScale = 0.95,
  haptic = false,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
      scale.value = withSpring(pressedScale, SPRING);
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      onPressIn?.(e);
    },
    [pressedScale, haptic, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
      scale.value = withSpring(1, SPRING);
      onPressOut?.(e);
    },
    [onPressOut]
  );

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export default PressableScale;
