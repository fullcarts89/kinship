/**
 * Sign In Screen
 *
 * PRIMARY AUTHENTICATION SCREEN for returning users entering the app.
 * NOT a recovery screen.
 *
 * Design:
 * - SignInPlant illustration (140px) — single centered plant with
 *   subtle gentle sway and sparkle particles
 * - Headline: "Enter your garden" (clear, calm, inviting)
 * - Supporting: "Your relationships are here" — simple presence statement
 * - PRIMARY AUTH: Apple + Google social buttons (white bg, sageLight border)
 * - Divider with "or"
 * - SECONDARY: "Sign in with email" text link
 * - "Forgot password?" link at bottom
 *
 * ANIMATION:
 * - Plant sway: 4s ease-in-out infinite, subtle 0.5px translateX + 0.3deg rotate
 * - Sparkles: 2.5s fade 0.3→0.8 opacity, infinite
 *
 * TONE: This is normal app entry, NOT about returning after absence or recovery.
 */

import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, fonts } from "@design/tokens";
import { SingleSproutIllustration } from "@/components/illustrations";

// ─── Sparkle Particle ───────────────────────────────────────────────────────

function Sparkle({
  x,
  y,
  delay: sparkleDelay,
  size = 6,
}: {
  x: number;
  y: number;
  delay: number;
  size?: number;
}) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      sparkleDelay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1250, easing: Easing.inOut(Easing.ease) })
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
        {
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
        },
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

// ─── Apple Logo SVG ─────────────────────────────────────────────────────────

function AppleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="#1C1917"
      />
    </Svg>
  );
}

// ─── Google Logo SVG ────────────────────────────────────────────────────────

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  // ─── Plant sway animation (4s ease-in-out, subtle) ────────────────────
  const plantTranslateX = useSharedValue(0);
  const plantRotate = useSharedValue(0);

  useEffect(() => {
    plantTranslateX.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    plantRotate.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const plantSwayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: plantTranslateX.value },
      { rotate: `${plantRotate.value}deg` },
    ],
  }));

  // ─── Content fade-in ──────────────────────────────────────────────────
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);

  useEffect(() => {
    contentOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    contentTranslateY.value = withDelay(
      200,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const contentFadeStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cream,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* ─── Back button ──────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
          }}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <ChevronLeft color={colors.sage} size={20} />
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 15,
              color: colors.sage,
              marginLeft: 2,
            }}
          >
            Back
          </Text>
        </Pressable>
      </View>

      {/* ─── Main content ─────────────────────────────────────── */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 32,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* ─── Plant illustration with sparkles ─────────────── */}
        <View style={{ alignItems: "center", marginBottom: 32, height: 170, width: 170 }}>
          {/* Sparkle particles */}
          <Sparkle x={20} y={18} delay={0} size={10} />
          <Sparkle x={130} y={30} delay={600} size={8} />
          <Sparkle x={140} y={85} delay={1200} size={7} />
          <Sparkle x={10} y={95} delay={800} size={9} />
          <Sparkle x={75} y={5} delay={400} size={6} />

          {/* Swaying plant */}
          <Animated.View
            style={[
              {
                alignItems: "center",
                justifyContent: "center",
                marginTop: 15,
              },
              plantSwayStyle,
            ]}
          >
            <SingleSproutIllustration size={140} />
          </Animated.View>
        </View>

        {/* ─── Headline ─────────────────────────────────────── */}
        <Animated.View style={[{ alignItems: "center" }, contentFadeStyle]}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 30,
              color: colors.nearBlack,
              textAlign: "center",
              lineHeight: 38,
              marginBottom: 8,
            }}
          >
            Enter your garden
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              color: colors.warmGray,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 36,
            }}
          >
            Your relationships are here
          </Text>

          {/* ─── Continue with Apple ──────────────────────────── */}
          <Pressable
            onPress={() => {
              // TODO: Apple Sign In via expo-apple-authentication
              // After auth, show loading animation → tabs
              router.replace("/loading");
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              backgroundColor: colors.white,
              borderWidth: 1.5,
              borderColor: colors.sageLight,
              borderRadius: 16,
              paddingVertical: 15,
              marginBottom: 12,
            }}
          >
            <AppleLogo size={20} />
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: colors.nearBlack,
              }}
            >
              Continue with Apple
            </Text>
          </Pressable>

          {/* ─── Continue with Google ─────────────────────────── */}
          <Pressable
            onPress={() => {
              // TODO: Google Sign In via expo-auth-session
              // After auth, show loading animation → tabs
              router.replace("/loading");
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              backgroundColor: colors.white,
              borderWidth: 1.5,
              borderColor: colors.sageLight,
              borderRadius: 16,
              paddingVertical: 15,
              marginBottom: 24,
            }}
          >
            <GoogleLogo size={20} />
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: colors.nearBlack,
              }}
            >
              Continue with Google
            </Text>
          </Pressable>

          {/* ─── Divider ─────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              width: "100%",
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: colors.border,
              }}
            />
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                color: colors.warmGray,
                paddingHorizontal: 16,
              }}
            >
              or
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: colors.border,
              }}
            />
          </View>

          {/* ─── Sign in with email ──────────────────────────── */}
          <Pressable
            onPress={() => {
              // TODO: Navigate to email sign in form
              router.replace("/loading");
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 15,
                color: colors.sage,
                textAlign: "center",
              }}
            >
              Sign in with email
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* ─── Forgot password link ─────────────────────────────── */}
      <Animated.View style={[{ paddingBottom: 24, alignItems: "center" }, contentFadeStyle]}>
        <Pressable
          onPress={() => {
            // TODO: Navigate to forgot password screen
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
              textAlign: "center",
            }}
          >
            Forgot password?
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
