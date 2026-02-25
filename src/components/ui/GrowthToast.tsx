/**
 * Growth Toast
 *
 * Lightweight custom toast for plant growth stage transitions.
 * Uses module-level state + listener pattern (matching useOrientation)
 * so any code path can trigger a toast without prop drilling.
 *
 * Mount <GrowthToastOverlay /> once in the root layout.
 * Call showGrowthToast(text, emoji) from anywhere.
 *
 * Animation: slide in from top (300ms) → hold (2400ms) → fade out (300ms).
 * Style: warm sagePale background, sage text, rounded, soft shadow.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { fonts } from "@design/tokens";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = "#7A9E7E";
const sagePale = "#EBF3EB";
const sageLight = "#C8DEC9";
const nearBlack = "#1C1917";

// ─── Module-level Toast Queue ───────────────────────────────────────────────

interface ToastMessage {
  id: number;
  text: string;
  emoji: string;
}

let _toastQueue: ToastMessage[] = [];
let _toastIdCounter = 0;
const _toastListeners = new Set<() => void>();

/**
 * Show a growth toast. Can be called from anywhere
 * (save handlers, hooks, etc.).
 */
export function showGrowthToast(
  text: string,
  emoji: string = "\uD83C\uDF3F"
): void {
  _toastIdCounter += 1;
  _toastQueue.push({ id: _toastIdCounter, text, emoji });
  _toastListeners.forEach((fn) => fn());
}

function consumeToast(): ToastMessage | null {
  return _toastQueue.shift() ?? null;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Global toast overlay — mount once in root layout.
 * Renders above all screens at the top of the viewport.
 */
export function GrowthToastOverlay() {
  const insets = useSafeAreaInsets();
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation values
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleDismiss = useCallback(() => {
    setCurrentToast(null);
    setIsAnimating(false);
  }, []);

  const showNextToast = useCallback(() => {
    const next = consumeToast();
    if (!next) return;

    setCurrentToast(next);
    setIsAnimating(true);

    // Reset
    translateY.value = -60;
    opacity.value = 0;

    // Slide in
    translateY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });

    // After hold time, fade out
    opacity.value = withDelay(
      2700, // 300ms enter + 2400ms hold
      withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
    );
    translateY.value = withDelay(
      2700,
      withTiming(-20, {
        duration: 300,
        easing: Easing.in(Easing.ease),
      })
    );

    // Clean up after full animation (3000ms total)
    setTimeout(() => {
      handleDismiss();
    }, 3100);
  }, [handleDismiss]);

  // Subscribe to new toasts
  useEffect(() => {
    const listener = () => {
      if (!isAnimating) {
        showNextToast();
      }
    };
    _toastListeners.add(listener);
    return () => {
      _toastListeners.delete(listener);
    };
  }, [isAnimating, showNextToast]);

  // When current toast finishes, check if there are more queued
  useEffect(() => {
    if (!isAnimating && _toastQueue.length > 0) {
      // Small delay between consecutive toasts
      const timer = setTimeout(showNextToast, 200);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, showNextToast]);

  if (!currentToast) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: insets.top + 8,
          left: 24,
          right: 24,
          zIndex: 10000,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View
        style={{
          backgroundColor: sagePale,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: sageLight,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: nearBlack,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <Text style={{ fontSize: 18, marginRight: 10 }}>
          {currentToast.emoji}
        </Text>
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 14,
            color: sage,
            flex: 1,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {currentToast.text}
        </Text>
      </View>
    </Animated.View>
  );
}
