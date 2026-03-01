/**
 * MemoryCelebration — Reusable celebration screen shown after adding a memory.
 *
 * Displays either:
 * - Full-bleed photo background with dark gradient + white text (when photoUri provided)
 * - Light sage gradient background with dark text (no photo)
 *
 * Includes a fun animated particle burst of floating leaves and sparkles.
 */
import React, { useEffect } from "react";
import { View, Text, Image, Pressable, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { colors, fonts } from "@design/tokens";
import { SeedIllustration } from "@/components/illustrations";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const gold = colors.gold;
const goldLight = colors.goldLight;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;

// ─── Animated Particle ──────────────────────────────────────────────────────

function CelebrationParticle({
  delay,
  startX,
  startY,
  driftX,
  driftY,
  size,
  color,
  shape,
}: {
  delay: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  size: number;
  color: string;
  shape: "circle" | "leaf";
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const rotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(1800, withTiming(0, { duration: 600 }))
      )
    );
    translateY.value = withDelay(
      delay,
      withTiming(driftY, { duration: 2700, easing: Easing.out(Easing.cubic) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(driftX, { duration: 2700, easing: Easing.out(Easing.cubic) })
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.back(3)) }),
        withDelay(1400, withTiming(0.5, { duration: 600 }))
      )
    );
    rotation.value = withDelay(
      delay,
      withTiming(
        (Math.random() - 0.5) * 180,
        { duration: 2700, easing: Easing.out(Easing.cubic) }
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: startY,
          width: size,
          height: shape === "leaf" ? size * 0.6 : size,
          borderRadius: shape === "leaf" ? size * 0.3 : size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

// ─── Particle Field ─────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  delay: 100 + Math.random() * 600,
  startX: SCREEN_W * 0.3 + Math.random() * SCREEN_W * 0.4,
  startY: SCREEN_H * 0.28 + Math.random() * 40,
  driftX: (Math.random() - 0.5) * SCREEN_W * 0.8,
  driftY: -40 - Math.random() * SCREEN_H * 0.35,
  size: 6 + Math.random() * 8,
  color: [sage, sageLight, gold, goldLight, sageDark, "#F4B89E"][
    Math.floor(Math.random() * 6)
  ],
  shape: (i % 3 === 0 ? "circle" : "leaf") as "circle" | "leaf",
}));

// ─── Pulsing Ring ───────────────────────────────────────────────────────────

function PulsingRing() {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(200, withTiming(0.35, { duration: 500 }));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 2,
          borderColor: gold,
        },
        ringStyle,
      ]}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface MemoryCelebrationProps {
  personName: string;
  photoUri?: string | null;
  memoryCount?: number;
  onContinue: () => void;
}

export function MemoryCelebration({
  personName,
  photoUri,
  memoryCount = 1,
  onContinue,
}: MemoryCelebrationProps) {
  const insets = useSafeAreaInsets();
  const hasPhoto = !!photoUri;

  // Colors based on background type
  const headlineColor = hasPhoto ? white : nearBlack;
  const bodyColor = hasPhoto ? "rgba(255,255,255,0.82)" : warmGray;
  const badgeBg = hasPhoto ? "rgba(0,0,0,0.35)" : sagePale;
  const badgeBorder = hasPhoto ? "rgba(255,255,255,0.2)" : sageLight;
  const badgeTextColor = hasPhoto ? white : sageDark;
  const pillBg = hasPhoto ? "rgba(122,158,126,0.55)" : sagePale;
  const pillBorder = hasPhoto ? "rgba(255,255,255,0.18)" : sageLight;
  const pillTextColor = hasPhoto ? white : sageDark;
  const footerColor = hasPhoto ? "rgba(255,255,255,0.55)" : warmGray;

  // Fade in
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    contentOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    contentTranslateY.value = withDelay(
      300,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const memoryLabel =
    memoryCount === 1
      ? "Your first memory together — the foundation of your garden"
      : `Memory #${memoryCount} — your garden grows stronger`;

  const growLabel =
    memoryCount === 1
      ? `Beginning to grow · ${memoryCount} memory`
      : `Growing · ${memoryCount} memories`;

  const footerText =
    "Each memory you save becomes part of the living story of your friendship.";

  return (
    <View style={{ flex: 1 }}>
      {/* Background */}
      {hasPhoto ? (
        <Image
          source={{ uri: photoUri! }}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
          resizeMode="cover"
        />
      ) : null}

      {/* Gradient overlay */}
      <LinearGradient
        colors={
          hasPhoto
            ? ["rgba(0,0,0,0.35)", "rgba(0,0,0,0.65)", "rgba(0,0,0,0.82)"]
            : [sagePale, cream, cream]
        }
        locations={hasPhoto ? [0, 0.5, 1] : [0, 0.4, 1]}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      />

      {/* Particles */}
      {PARTICLES.map((p) => (
        <CelebrationParticle key={p.id} {...p} />
      ))}

      {/* Content */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 28,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* MEMORY ADDED badge */}
        <View
          style={{
            paddingVertical: 5,
            paddingHorizontal: 14,
            borderRadius: 100,
            backgroundColor: badgeBg,
            borderWidth: 1,
            borderColor: badgeBorder,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: gold,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 11,
              letterSpacing: 1.2,
              color: badgeTextColor,
              textTransform: "uppercase",
            }}
          >
            Memory added
          </Text>
        </View>

        {/* Illustration in frosted circle */}
        <Animated.View style={contentStyle}>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <PulsingRing />
            <View
              style={{
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: hasPhoto
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(122,158,126,0.12)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: hasPhoto
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(122,158,126,0.2)",
              }}
            >
              <SeedIllustration size={78} />
            </View>
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View
          style={[{ alignItems: "center", marginTop: 28 }, contentStyle]}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 28,
              color: headlineColor,
              textAlign: "center",
              lineHeight: 34,
              marginBottom: 10,
            }}
          >
            Your connection with{"\n"}
            {personName} is growing
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: bodyColor,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 20,
              maxWidth: 280,
            }}
          >
            {memoryLabel}
          </Text>

          {/* Growth pill */}
          <View
            style={{
              paddingVertical: 7,
              paddingHorizontal: 16,
              borderRadius: 100,
              backgroundColor: pillBg,
              borderWidth: 1,
              borderColor: pillBorder,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              marginBottom: 36,
            }}
          >
            <Text style={{ fontSize: 13 }}>{"\uD83C\uDF31"}</Text>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: pillTextColor,
              }}
            >
              {growLabel}
            </Text>
          </View>

          {/* Continue button */}
          <Pressable
            onPress={onContinue}
            style={{ width: "100%", borderRadius: 18, overflow: "hidden" }}
          >
            <LinearGradient
              colors={[sage, sageDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 15,
                alignItems: "center",
                borderRadius: 18,
                shadowColor: sage,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.27,
                shadowRadius: 18,
                elevation: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 15,
                  color: white,
                }}
              >
                Continue
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Footer wisdom */}
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: footerColor,
              textAlign: "center",
              lineHeight: 19,
              marginTop: 20,
              maxWidth: 260,
            }}
          >
            {footerText}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
