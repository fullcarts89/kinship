/**
 * Loading Screen — "Returning to your garden"
 *
 * 4-stage plant growth animation over 3.2s, then auto-navigates to Home.
 * Used after sign-in, during app init, or any moment the app needs to prepare data.
 *
 * Stages:
 *   1. Seed (0–800ms)     — Seed pulses gently (scale 1.0→1.08)
 *   2. Sprout (800–1600ms) — Stem grows upward, small leaves appear
 *   3. Leaves Open (1600–2400ms) — Leaves unfold, sparkle appears
 *   4. Plant Rests (2400–3200ms) — Full plant with gentle sway + sparkles
 *
 * Rotating subtitles cycle every ~1s underneath "Returning to your garden":
 *   "Pruning relationships", "Watering friendships", "Giving memories sunlight", etc.
 *
 * TONE: Garden metaphor, NOT a technical spinner. Gentle, organic, warm.
 * NEVER: spinners, progress bars, "Loading...", "Please wait"
 */

import React, { useEffect, useState, useRef } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import Svg, { Path, Circle, Ellipse, Rect, G } from "react-native-svg";
import { colors, fonts } from "@design/tokens";

// ─── Rotating subtitle messages ──────────────────────────────────────────────

const SUBTITLES = [
  "Pruning relationships",
  "Watering friendships",
  "Giving memories sunlight",
  "Tending to your garden",
  "Growing connections",
  "Planting good intentions",
];

// ─── Sparkle ─────────────────────────────────────────────────────────────────

function Sparkle({
  x,
  y,
  delay: sparkleDelay,
  size = 8,
}: {
  x: number;
  y: number;
  delay: number;
  size?: number;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      sparkleDelay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { position: "absolute", left: x, top: y, width: size, height: size },
        sparkleStyle,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 12 12">
        <Path
          d="M6 0 L7 4.5 L12 6 L7 7.5 L6 12 L5 7.5 L0 6 L5 4.5 Z"
          fill={colors.gold}
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Stage 1: Seed ───────────────────────────────────────────────────────────

function SeedStage({ size }: { size: number }) {
  const s = size;
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ alignItems: "center" }, pulseStyle]}>
      <Svg width={s} height={s} viewBox="0 0 120 120">
        {/* Soil mound */}
        <Ellipse cx={60} cy={95} rx={40} ry={12} fill="#C97A5E" opacity={0.6} />
        <Ellipse cx={60} cy={92} rx={35} ry={10} fill="#C97A5E" />
        {/* Seed */}
        <Ellipse cx={60} cy={78} rx={10} ry={13} fill="#4A7055" />
        <Ellipse cx={58} cy={76} rx={4} ry={6} fill="#7A9E7E" opacity={0.5} />
      </Svg>
    </Animated.View>
  );
}

// ─── Stage 2: Sprout ─────────────────────────────────────────────────────────

function SproutStage({ size }: { size: number }) {
  const s = size;
  const stemHeight = useSharedValue(0);
  const leafScale = useSharedValue(0);

  useEffect(() => {
    stemHeight.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    leafScale.value = withDelay(
      300,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(2)) })
    );
  }, []);

  const stemStyle = useAnimatedStyle(() => ({
    opacity: stemHeight.value,
    transform: [{ scaleY: stemHeight.value }],
  }));

  const leafStyle = useAnimatedStyle(() => ({
    opacity: leafScale.value,
    transform: [{ scale: leafScale.value }],
  }));

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={s} height={s} viewBox="0 0 120 120">
        {/* Soil mound */}
        <Ellipse cx={60} cy={95} rx={40} ry={12} fill="#C97A5E" opacity={0.6} />
        <Ellipse cx={60} cy={92} rx={35} ry={10} fill="#C97A5E" />
      </Svg>
      {/* Animated stem */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: size * 0.22,
            width: 4,
            height: size * 0.35,
            backgroundColor: "#7A9E7E",
            borderRadius: 2,
            alignSelf: "center",
            transformOrigin: "bottom",
          },
          stemStyle,
        ]}
      />
      {/* Animated leaves */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: size * 0.48,
            alignSelf: "center",
          },
          leafStyle,
        ]}
      >
        <Svg width={40} height={30} viewBox="0 0 40 30">
          {/* Left leaf */}
          <Path
            d="M20 25 Q8 18 10 8 Q16 14 20 20"
            fill="#7A9E7E"
            stroke="#4A7055"
            strokeWidth={0.5}
          />
          {/* Right leaf */}
          <Path
            d="M20 25 Q32 18 30 8 Q24 14 20 20"
            fill="#C8DEC9"
            stroke="#7A9E7E"
            strokeWidth={0.5}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Stage 3: Leaves Open ────────────────────────────────────────────────────

function LeavesOpenStage({ size }: { size: number }) {
  const s = size;
  const leafSpread = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);

  useEffect(() => {
    leafSpread.value = withTiming(1, {
      duration: 600,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
    sparkleOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 300 })
    );
  }, []);

  const leftLeafStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-25 * leafSpread.value}deg` }],
    opacity: 0.3 + 0.7 * leafSpread.value,
  }));

  const rightLeafStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${25 * leafSpread.value}deg` }],
    opacity: 0.3 + 0.7 * leafSpread.value,
  }));

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={s} height={s} viewBox="0 0 120 120">
        {/* Pot */}
        <Rect x={38} y={88} width={44} height={22} rx={4} fill="#C97A5E" />
        <Rect x={42} y={84} width={36} height={8} rx={3} fill="#C97A5E" />
        <Rect x={42} y={84} width={36} height={4} rx={2} fill="#D4A853" opacity={0.3} />
        {/* Stem */}
        <Rect x={58} y={42} width={4} height={46} rx={2} fill="#7A9E7E" />
      </Svg>
      {/* Left leaf group — animated spread */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: size * 0.25,
            left: size * 0.2,
            transformOrigin: "right bottom",
          },
          leftLeafStyle,
        ]}
      >
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Path
            d="M34 34 Q4 26 2 2 Q20 10 34 34"
            fill="#7A9E7E"
            stroke="#4A7055"
            strokeWidth={0.5}
          />
          <Path d="M30 30 Q12 22 8 6" stroke="#C8DEC9" strokeWidth={1} fill="none" />
        </Svg>
      </Animated.View>
      {/* Right leaf group — animated spread */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: size * 0.2,
            right: size * 0.2,
            transformOrigin: "left bottom",
          },
          rightLeafStyle,
        ]}
      >
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Path
            d="M2 34 Q32 26 34 2 Q16 10 2 34"
            fill="#C8DEC9"
            stroke="#7A9E7E"
            strokeWidth={0.5}
          />
          <Path d="M6 30 Q24 22 28 6" stroke="#EBF3EB" strokeWidth={1} fill="none" />
        </Svg>
      </Animated.View>
      {/* Top sparkle */}
      <Animated.View
        style={{
          position: "absolute",
          top: size * 0.1,
          alignSelf: "center",
        }}
      >
        <Sparkle x={0} y={0} delay={0} size={12} />
      </Animated.View>
    </View>
  );
}

// ─── Stage 4: Plant Rests (full plant with sway) ─────────────────────────────

function PlantRestsStage({ size }: { size: number }) {
  const s = size;
  const sway = useSharedValue(0);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: sway.value },
      { rotate: `${sway.value * 0.6}deg` },
    ],
  }));

  return (
    <View style={{ alignItems: "center", width: s, height: s }}>
      {/* Sparkles */}
      <Sparkle x={10} y={15} delay={0} size={10} />
      <Sparkle x={s - 24} y={25} delay={500} size={8} />
      <Sparkle x={s / 2 - 4} y={5} delay={250} size={7} />
      <Sparkle x={18} y={s * 0.45} delay={750} size={6} />
      <Sparkle x={s - 30} y={s * 0.5} delay={1000} size={9} />

      <Animated.View style={swayStyle}>
        <Svg width={s} height={s} viewBox="0 0 140 140">
          {/* Pot */}
          <Rect x={42} y={100} width={56} height={28} rx={5} fill="#C97A5E" />
          <Rect x={46} y={95} width={48} height={10} rx={4} fill="#C97A5E" />
          <Rect x={46} y={95} width={48} height={5} rx={3} fill="#D4A853" opacity={0.3} />
          {/* Soil */}
          <Ellipse cx={70} cy={97} rx={22} ry={4} fill="#4A7055" opacity={0.4} />
          {/* Main stem */}
          <Rect x={68} y={38} width={4} height={60} rx={2} fill="#7A9E7E" />
          {/* Branch stems */}
          <Path d="M70 65 Q50 55 40 40" stroke="#7A9E7E" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M70 55 Q90 45 100 30" stroke="#7A9E7E" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M70 78 Q45 72 35 62" stroke="#7A9E7E" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {/* Large leaves */}
          <Ellipse cx={38} cy={36} rx={16} ry={10} fill="#7A9E7E" transform="rotate(-30 38 36)" />
          <Ellipse cx={102} cy={27} rx={16} ry={10} fill="#C8DEC9" transform="rotate(25 102 27)" />
          <Ellipse cx={32} cy={58} rx={14} ry={9} fill="#C8DEC9" transform="rotate(-20 32 58)" />
          {/* Small accent leaves */}
          <Ellipse cx={68} cy={34} rx={10} ry={7} fill="#4A7055" opacity={0.7} transform="rotate(-10 68 34)" />
          <Ellipse cx={85} cy={50} rx={9} ry={6} fill="#7A9E7E" transform="rotate(15 85 50)" />
          {/* Leaf veins */}
          <Path d="M30 36 L46 36" stroke="#4A7055" strokeWidth={0.5} opacity={0.4} />
          <Path d="M94 27 L110 27" stroke="#7A9E7E" strokeWidth={0.5} opacity={0.4} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Main Loading Screen ─────────────────────────────────────────────────────

export default function LoadingScreen() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState(0); // 0–3
  const [subtitleIndex, setSubtitleIndex] = useState(0);

  // Text animation
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(10);

  useEffect(() => {
    textOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    textTranslateY.value = withDelay(
      200,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  // Progress through 4 stages
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 1600),
      setTimeout(() => setStage(3), 2400),
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Rotate subtitles every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % SUBTITLES.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const plantSize = 160;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cream,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Plant illustration — stages */}
      <View
        style={{
          width: plantSize,
          height: plantSize,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        {stage === 0 && <SeedStage size={plantSize} />}
        {stage === 1 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <SproutStage size={plantSize} />
          </Animated.View>
        )}
        {stage === 2 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <LeavesOpenStage size={plantSize} />
          </Animated.View>
        )}
        {stage === 3 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <PlantRestsStage size={plantSize} />
          </Animated.View>
        )}
      </View>

      {/* "Returning to your garden" */}
      <Animated.View style={[{ alignItems: "center" }, textStyle]}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 24,
            color: colors.nearBlack,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Returning to your garden
        </Text>

        {/* Rotating subtitle */}
        <View style={{ height: 22, overflow: "hidden" }}>
          <Animated.View
            key={subtitleIndex}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: colors.warmGray,
                textAlign: "center",
              }}
            >
              {SUBTITLES[subtitleIndex]}
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
