/**
 * Notification System — 9-Screen Flow
 *
 * Four paired flows (lock screen → detail) plus an in-app notification archive.
 *
 * § 1-2 · Memory Resurfacing — past moment resurfaces on lock screen → full-bleed memory view
 * § 3-4 · Memory Capture — gentle prompt after shared moment → photo save sheet
 * § 5-6 · Identity Reinforcement — affirms who you're becoming → garden reflection
 * § 7-8 · Opportunity Suggestion — relational opening → person suggestion card
 * § 9   · Garden Reflections — in-app notification archive (default entry)
 *
 * Tone philosophy: never gap-shaming, never urgency, never guilt. Always optional,
 * always gentle, always framed as the memory itself — not the absence.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { ArrowLeft, Leaf, ChevronRight, Camera } from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { FadeIn } from "@/components/ui";
import {
  GardenRevealIllustration,
  SproutSmallIllustration,
  PlantGrowthLeavesIllustration,
  PlantRingIllustration,
} from "@/components/illustrations";

// ─── Constants ──────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get("window");

const LOCK_BG =
  "https://images.unsplash.com/photo-1669492961902-bf7b0fae83de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const MEMORY_PHOTO =
  "https://images.unsplash.com/photo-1716850724755-21a55ab68f25?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const COFFEE_PHOTO =
  "https://images.unsplash.com/photo-1699981369183-9d6e13ecff1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";

// Local aliases from design tokens
const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const cream = colors.cream;
const gold = colors.gold;
const goldLight = colors.goldLight;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;

// ─── Insets type ────────────────────────────────────────────────────────────

type Insets = { top: number; bottom: number };

// ─── Animation Wrappers ────────────────────────────────────────────────────

function GentleFloat({
  children,
  duration = 5000,
  amplitude = 5,
  style,
}: {
  children: React.ReactNode;
  duration?: number;
  amplitude?: number;
  style?: any;
}) {
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(-amplitude, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[style, animStyle]}>{children}</Animated.View>
  );
}

function PulsingDot({ color, size = 6 }: { color: string; size?: number }) {
  const opacity = useSharedValue(0.55);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1250 }),
        withTiming(0.55, { duration: 1250 })
      ),
      -1
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1250 }),
        withTiming(1, { duration: 1250 })
      ),
      -1
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function SageBtn({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={{ width: "100%" }}>
      <LinearGradient
        colors={[sage, sageDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 15,
          borderRadius: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          shadowColor: sage,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 6,
        }}
      >
        {icon}
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 15,
            color: white,
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function TxtLink({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ paddingVertical: 8 }}>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          color: warmGray,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Lock Screen Shell ──────────────────────────────────────────────────────

function LockScreenShell({
  notification,
  insets,
}: {
  notification: React.ReactNode;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0D0C" }}>
      {/* Blurred wallpaper */}
      <Image
        source={{ uri: LOCK_BG }}
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ scale: 1.1 }] },
        ]}
        blurRadius={12}
        resizeMode="cover"
      />

      {/* Dark gradient overlay */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.08)",
          "rgba(0,0,0,0.18)",
          "rgba(0,0,0,0.42)",
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Content layer */}
      <View style={{ flex: 1 }}>
        {/* Dynamic Island */}
        <View style={{ alignItems: "center", paddingTop: insets.top - 8 }}>
          <View
            style={{
              width: 126,
              height: 37,
              borderRadius: 20,
              backgroundColor: "#050705",
            }}
          />
        </View>

        {/* Time */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 78,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: -2,
            }}
          >
            9:41
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 16,
              color: "rgba(255,255,255,0.65)",
              marginTop: 5,
              letterSpacing: 0.1,
            }}
          >
            Monday, 23 February
          </Text>
        </View>

        {/* Center spacer */}
        <View style={{ flex: 1 }} />

        {/* Notification */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
          <FadeIn delay={300} duration={700}>
            {notification}
          </FadeIn>
        </View>

        {/* Bottom controls */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 44,
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>{"\uD83D\uDD26"}</Text>
          </View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Camera size={18} color="white" />
          </View>
        </View>

        {/* Home indicator */}
        <View style={{ alignItems: "center", paddingBottom: 10 }}>
          <View
            style={{
              width: 134,
              height: 5,
              borderRadius: 100,
              backgroundColor: "rgba(255,255,255,0.38)",
            }}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Lock Notification Card ─────────────────────────────────────────────────

function LockNotif({ body, sub }: { body: string; sub?: string }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(28,26,24,0.62)",
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
      }}
    >
      {/* App row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          marginBottom: 9,
        }}
      >
        <LinearGradient
          colors={[sage, sageDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: sageDark,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }}
        >
          <Leaf size={13} strokeWidth={2.25} color={white} />
        </LinearGradient>
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 13,
            color: "rgba(255,255,255,0.9)",
            flex: 1,
          }}
        >
          Kinship
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            fontStyle: "italic",
          }}
        >
          now
        </Text>
      </View>

      {/* Body */}
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 18,
          color: "rgba(255,255,255,0.96)",
          lineHeight: 22.5,
          marginBottom: sub ? 4 : 0,
        }}
      >
        {body}
      </Text>
      {sub && (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 13.5,
            color: "rgba(255,255,255,0.58)",
            lineHeight: 20,
          }}
        >
          {sub}
        </Text>
      )}

      {/* Expand hint */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          marginTop: 11,
        }}
      >
        <View
          style={{
            height: 1,
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        />
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 10,
            color: "rgba(255,255,255,0.32)",
          }}
        >
          tap to open
        </Text>
        <View
          style={{
            height: 1,
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        />
      </View>
    </View>
  );
}

// ─── Garden Reflection Card ─────────────────────────────────────────────────

function GardenReflectionCard({
  thumb,
  headline,
  sub,
  when,
  accentColor,
  onPress,
}: {
  thumb: "memory" | "identity" | "opportunity";
  headline: string;
  sub: string;
  when: string;
  accentColor: string;
  onPress?: () => void;
}) {
  const thumbContent: Record<string, React.ReactNode> = {
    memory: (
      <View>
        <Image
          source={{ uri: MEMORY_PHOTO }}
          style={{ width: 52, height: 52, borderRadius: 14 }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[gold, "#B88A30"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: 18,
            height: 18,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          }}
        >
          <Text style={{ fontSize: 8 }}>{"\u2726"}</Text>
        </LinearGradient>
      </View>
    ),
    identity: (
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: sagePale,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 26 }}>{"\uD83C\uDF3F"}</Text>
      </View>
    ),
    opportunity: (
      <View>
        <Image
          source={{ uri: COFFEE_PHOTO }}
          style={{ width: 52, height: 52, borderRadius: 14 }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[sage, sageDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: 18,
            height: 18,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Leaf size={9} strokeWidth={2.5} color={white} />
        </LinearGradient>
      </View>
    ),
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 13,
        paddingHorizontal: 16,
        backgroundColor: white,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#F0EBE3",
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {thumbContent[thumb]}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fonts.sansBold,
            fontSize: 10,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: 0.7,
            marginBottom: 3,
          }}
        >
          {when}
        </Text>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 15,
            color: nearBlack,
            lineHeight: 19.5,
            marginBottom: 2,
          }}
        >
          {headline}
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: warmGray,
            lineHeight: 17,
          }}
        >
          {sub}
        </Text>
      </View>
      <ChevronRight size={13} strokeWidth={2} color="#D4CFC8" />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Lock Screen · Memory Resurfacing
// ═══════════════════════════════════════════════════════════════════════════

function S1_LockMemoryResurfacing({
  onTap,
  insets,
}: {
  onTap: () => void;
  insets: Insets;
}) {
  return (
    <Pressable onPress={onTap} style={{ flex: 1 }}>
      <LockScreenShell
        insets={insets}
        notification={
          <LockNotif body="One year ago with Jake" sub="A beautiful moment" />
        }
      />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Memory Resurfaced View
// ═══════════════════════════════════════════════════════════════════════════

function S2_MemoryResurfacedView({
  onReachOut,
  onClose,
  insets,
}: {
  onReachOut: () => void;
  onClose: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: nearBlack }}>
      {/* Full-bleed photo */}
      <Image
        source={{ uri: MEMORY_PHOTO }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.05)",
          "rgba(5,14,8,0.34)",
          "rgba(5,14,8,0.90)",
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Back button */}
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 22 }}>
        <Pressable
          onPress={onClose}
          style={{
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 12,
            paddingVertical: 7,
            paddingHorizontal: 14,
            alignSelf: "flex-start",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {"\u2190"} Back
          </Text>
        </Pressable>
      </View>

      {/* Centered plant growth + text */}
      <View
        style={{
          position: "absolute",
          top: SCREEN_H * 0.22,
          left: 0,
          right: 0,
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <FadeIn delay={100} duration={1200}>
          <PlantGrowthLeavesIllustration size={200} />
        </FadeIn>
        <FadeIn delay={1300} duration={1200}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 34,
              color: white,
              textAlign: "center",
              lineHeight: 41,
              marginTop: 4,
            }}
          >
            {"This moment\nwith Jake"}
          </Text>
        </FadeIn>
        <FadeIn delay={1800} duration={1200}>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: "rgba(255,255,255,0.58)",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            One year ago today
          </Text>
        </FadeIn>
      </View>

      {/* Resurfaced label */}
      <View
        style={{
          position: "absolute",
          bottom: 130,
          left: 24,
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
        }}
      >
        <PulsingDot color={goldLight} size={6} />
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 11,
            color: "rgba(240,219,160,0.88)",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Resurfaced memory
        </Text>
      </View>

      {/* Actions */}
      <View
        style={{
          position: "absolute",
          bottom: 44,
          left: 24,
          right: 24,
          gap: 10,
        }}
      >
        <SageBtn label="Reach out" onPress={onReachOut} />
        <Pressable
          onPress={onClose}
          style={{
            paddingVertical: 13,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 14,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            Close
          </Text>
        </Pressable>
      </View>

      {/* Bottom shimmer */}
      <View
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 48,
            height: 2,
            borderRadius: 100,
            backgroundColor: "rgba(200,222,201,0.35)",
          }}
        />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 3 — Lock Screen · Memory Capture Prompt
// ═══════════════════════════════════════════════════════════════════════════

function S3_LockMemoryCapturePrompt({
  onTap,
  insets,
}: {
  onTap: () => void;
  insets: Insets;
}) {
  return (
    <Pressable onPress={onTap} style={{ flex: 1 }}>
      <LockScreenShell
        insets={insets}
        notification={
          <LockNotif
            body="You shared something today"
            sub="Want to save the moment?"
          />
        }
      />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 4 — Smart Memory Capture (bottom sheet)
// ═══════════════════════════════════════════════════════════════════════════

function S4_SmartMemoryCapture({
  onSave,
  onDismiss,
  insets,
}: {
  onSave: () => void;
  onDismiss: () => void;
  insets: Insets;
}) {
  const [selected, setSelected] = useState("Jake");
  const people = ["Jake", "Emma", "Mom"];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(12,10,8,0.70)",
        justifyContent: "flex-end",
      }}
    >
      {/* Bottom sheet */}
      <View
        style={{
          backgroundColor: white,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: "hidden",
        }}
      >
        {/* Photo thumbnail */}
        <View>
          <Image
            source={{ uri: MEMORY_PHOTO }}
            style={{ width: "100%", height: 188 }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.30)"]}
            locations={[0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              width: 30,
              height: 30,
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Camera size={14} strokeWidth={2} color={white} />
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {/* Sprout + headline */}
          <View
            style={{
              alignItems: "center",
              paddingTop: 16,
              paddingBottom: 14,
            }}
          >
            <GentleFloat duration={4000}>
              <SproutSmallIllustration size={58} />
            </GentleFloat>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 26,
                color: nearBlack,
                textAlign: "center",
                lineHeight: 31,
                marginTop: 10,
                marginBottom: 5,
              }}
            >
              Save this moment?
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: warmGray,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              Moments you capture will bloom again.
            </Text>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "#F0EBE3",
              marginBottom: 14,
            }}
          />

          {/* Who were you with */}
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 11,
              color: warmGray,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              marginBottom: 10,
            }}
          >
            Who were you with?
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 9,
              marginBottom: 22,
            }}
          >
            {people.map((p) => (
              <Pressable
                key={p}
                onPress={() => setSelected(p)}
                style={{ flex: 1 }}
              >
                {selected === p ? (
                  <LinearGradient
                    colors={[sage, sageDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 10,
                      alignItems: "center",
                      borderRadius: 100,
                      shadowColor: sage,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansSemiBold,
                        fontSize: 14,
                        color: white,
                      }}
                    >
                      {p}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      paddingVertical: 10,
                      alignItems: "center",
                      borderRadius: 100,
                      borderWidth: 1.5,
                      borderColor: "#E8E0D6",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 14,
                        color: nearBlack,
                      }}
                    >
                      {p}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <SageBtn label={`Save with ${selected}`} onPress={onSave} />
          <View style={{ alignItems: "center", marginTop: 4 }}>
            <TxtLink label="Not now" onPress={onDismiss} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 5 — Lock Screen · Identity Reinforcement
// ═══════════════════════════════════════════════════════════════════════════

function S5_LockIdentityReinforcement({
  onTap,
  insets,
}: {
  onTap: () => void;
  insets: Insets;
}) {
  return (
    <Pressable onPress={onTap} style={{ flex: 1 }}>
      <LockScreenShell
        insets={insets}
        notification={
          <LockNotif
            body="You've been showing up beautifully"
            sub="Your garden is growing"
          />
        }
      />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 6 — Identity Reflection Screen
// ═══════════════════════════════════════════════════════════════════════════

function S6_IdentityReflection({
  onContinue,
  insets,
}: {
  onContinue: () => void;
  insets: Insets;
}) {
  return (
    <LinearGradient
      colors={[sagePale, cream]}
      locations={[0, 0.6]}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 28,
          paddingTop: insets.top,
        }}
      >
        {/* Gold glow behind illustration */}
        <View
          style={{
            position: "relative",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <View
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: goldLight,
              opacity: 0.27,
              top: -4,
              alignSelf: "center",
            }}
          />
          <GentleFloat duration={5000}>
            <GardenRevealIllustration size={192} />
          </GentleFloat>
        </View>

        {/* Identity label */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            marginBottom: 14,
          }}
        >
          <PulsingDot color={sage} size={8} />
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 11,
              color: sage,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Your garden
          </Text>
        </View>

        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
            textAlign: "center",
            lineHeight: 35,
            marginBottom: 12,
            maxWidth: 280,
          }}
        >
          You've shared meaningful moments recently.
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 15,
            color: warmGray,
            textAlign: "center",
            lineHeight: 24.5,
            marginBottom: 38,
            maxWidth: 270,
          }}
        >
          Your presence matters. The people in your garden feel it.
        </Text>

        <Pressable onPress={onContinue}>
          <LinearGradient
            colors={[sage, sageDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              paddingVertical: 14,
              paddingHorizontal: 36,
              borderRadius: 18,
              shadowColor: sage,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 6,
            }}
          >
            <Leaf size={15} strokeWidth={2} color={white} />
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
      </View>

      {/* Soft ground indicator */}
      <View
        style={{ alignItems: "center", paddingBottom: insets.bottom + 12 }}
      >
        <View
          style={{
            width: 48,
            height: 4,
            borderRadius: 100,
            backgroundColor: sageLight,
            opacity: 0.5,
          }}
        />
      </View>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 7 — Lock Screen · Opportunity Suggestion
// ═══════════════════════════════════════════════════════════════════════════

function S7_LockOpportunitySuggestion({
  onTap,
  insets,
}: {
  onTap: () => void;
  insets: Insets;
}) {
  return (
    <Pressable onPress={onTap} style={{ flex: 1 }}>
      <LockScreenShell
        insets={insets}
        notification={
          <LockNotif
            body="Jake might enjoy seeing you"
            sub="It might be nice to reconnect"
          />
        }
      />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 8 — Opportunity Suggestion Screen
// ═══════════════════════════════════════════════════════════════════════════

function S8_OpportunitySuggestion({
  onReachOut,
  onBack,
  insets,
}: {
  onReachOut: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      {/* Back nav */}
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 22 }}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} color={sage} />
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: sage,
            }}
          >
            Back
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 26,
        }}
      >
        {/* Jake avatar with plant ring */}
        <View
          style={{
            position: "relative",
            width: 100,
            height: 100,
            marginBottom: 22,
          }}
        >
          <LinearGradient
            colors={[sage, sageDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: sage,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 28,
              elevation: 8,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 38,
                color: white,
              }}
            >
              J
            </Text>
          </LinearGradient>

          {/* Animated plant ring */}
          <GentleFloat
            duration={5000}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <PlantRingIllustration size={100} />
          </GentleFloat>

          {/* Kinship badge */}
          <LinearGradient
            colors={[sage, sageDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: cream,
              shadowColor: sage,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            }}
          >
            <Leaf size={12} strokeWidth={2.5} color={white} />
          </LinearGradient>
        </View>

        {/* Name */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 24,
            color: nearBlack,
            marginBottom: 4,
          }}
        >
          Jake
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 13,
            color: warmGray,
            marginBottom: 28,
          }}
        >
          Close friend {"\u00B7"} since 2019
        </Text>

        {/* Suggestion card */}
        <View
          style={{
            width: "100%",
            backgroundColor: white,
            borderRadius: 24,
            padding: 20,
            paddingBottom: 22,
            borderWidth: 1,
            borderColor: "#F0EBE3",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 20,
            elevation: 4,
            marginBottom: 22,
          }}
        >
          {/* Label */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                backgroundColor: sagePale,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Leaf size={12} strokeWidth={2} color={sage} />
            </View>
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 11,
                color: sage,
                textTransform: "uppercase",
                letterSpacing: 0.7,
              }}
            >
              A gentle thought
            </Text>
          </View>

          {/* Headline */}
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 22,
              color: nearBlack,
              lineHeight: 27.5,
              marginBottom: 8,
            }}
          >
            {"It might be nice\nto reconnect."}
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: warmGray,
              lineHeight: 23,
            }}
          >
            You and Jake tend to enjoy just being in the same room. No plans
            needed.
          </Text>
        </View>

        <View style={{ width: "100%", gap: 10, alignItems: "center" }}>
          <SageBtn label="Reach out" onPress={onReachOut} />
          <TxtLink label="Not now" onPress={onBack} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 9 — In-App Notification Center: Garden Reflections
// ═══════════════════════════════════════════════════════════════════════════

function S9_NotificationCenter({
  onBack,
  onOpenMemory,
  onOpenIdentity,
  onOpenOpportunity,
  insets,
}: {
  onBack: () => void;
  onOpenMemory: () => void;
  onOpenIdentity: () => void;
  onOpenOpportunity: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F3E8" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 22,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <Pressable onPress={onBack} hitSlop={12}>
            <ArrowLeft size={18} strokeWidth={2} color={warmGray} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 24,
                color: nearBlack,
                lineHeight: 26,
              }}
            >
              Garden Reflections
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                color: warmGray,
                marginTop: 2,
              }}
            >
              Moments worth revisiting.
            </Text>
          </View>
          <LinearGradient
            colors={[sage, sageDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Leaf size={16} strokeWidth={2} color={white} />
          </LinearGradient>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 22 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Recently */}
        <Text
          style={{
            fontFamily: fonts.sansBold,
            fontSize: 10,
            color: warmGray,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            paddingVertical: 10,
            paddingLeft: 4,
          }}
        >
          Recently
        </Text>

        <GardenReflectionCard
          thumb="memory"
          headline="This moment with Jake"
          sub="One year ago today — a dinner worth keeping."
          when="Recently"
          accentColor="#B88A30"
          onPress={onOpenMemory}
        />
        <GardenReflectionCard
          thumb="identity"
          headline="You've been showing up beautifully."
          sub="Your garden is quietly growing."
          when="Recently"
          accentColor={sage}
          onPress={onOpenIdentity}
        />

        {/* Earlier */}
        <Text
          style={{
            fontFamily: fonts.sansBold,
            fontSize: 10,
            color: warmGray,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            paddingVertical: 10,
            paddingLeft: 4,
          }}
        >
          Earlier
        </Text>

        <GardenReflectionCard
          thumb="opportunity"
          headline="Jake might enjoy seeing you."
          sub="It might be nice to reconnect."
          when="Earlier"
          accentColor={sage}
          onPress={onOpenOpportunity}
        />
        <GardenReflectionCard
          thumb="memory"
          headline="A moment with Emma"
          sub="Earlier this season — coffee and a long conversation."
          when="Earlier"
          accentColor="#B88A30"
          onPress={onOpenMemory}
        />

        {/* This week */}
        <Text
          style={{
            fontFamily: fonts.sansBold,
            fontSize: 10,
            color: warmGray,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            paddingVertical: 10,
            paddingLeft: 4,
          }}
        >
          This week
        </Text>

        <GardenReflectionCard
          thumb="identity"
          headline="You shared something together."
          sub="A quiet morning that meant something."
          when="This week"
          accentColor={sage}
          onPress={onOpenIdentity}
        />
        <GardenReflectionCard
          thumb="opportunity"
          headline="Mom might love to hear from you."
          sub="Whenever feels right — no rush."
          when="This week"
          accentColor={sage}
          onPress={onOpenOpportunity}
        />

        {/* Footer note */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            paddingVertical: 10,
            paddingLeft: 4,
            alignItems: "flex-start",
          }}
        >
          <View style={{ marginTop: 1 }}>
            <Leaf size={12} strokeWidth={1.75} color={warmGray} />
          </View>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: warmGray,
              lineHeight: 19,
              flex: 1,
            }}
          >
            Kinship surfaces these gently — never as reminders. Dismiss anytime.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — Notification System Router
// ═══════════════════════════════════════════════════════════════════════════

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  // Default to Screen 9 (Garden Reflections) when entering from the app
  const [step, setStep] = useState(8);

  const screenInsets: Insets = {
    top: insets.top,
    bottom: insets.bottom,
  };

  switch (step) {
    case 0:
      return (
        <S1_LockMemoryResurfacing
          insets={screenInsets}
          onTap={() => setStep(1)}
        />
      );
    case 1:
      return (
        <S2_MemoryResurfacedView
          insets={screenInsets}
          onReachOut={() => setStep(8)}
          onClose={() => setStep(8)}
        />
      );
    case 2:
      return (
        <S3_LockMemoryCapturePrompt
          insets={screenInsets}
          onTap={() => setStep(3)}
        />
      );
    case 3:
      return (
        <S4_SmartMemoryCapture
          insets={screenInsets}
          onSave={() => setStep(1)}
          onDismiss={() => setStep(8)}
        />
      );
    case 4:
      return (
        <S5_LockIdentityReinforcement
          insets={screenInsets}
          onTap={() => setStep(5)}
        />
      );
    case 5:
      return (
        <S6_IdentityReflection
          insets={screenInsets}
          onContinue={() => setStep(8)}
        />
      );
    case 6:
      return (
        <S7_LockOpportunitySuggestion
          insets={screenInsets}
          onTap={() => setStep(7)}
        />
      );
    case 7:
      return (
        <S8_OpportunitySuggestion
          insets={screenInsets}
          onReachOut={() => setStep(8)}
          onBack={() => setStep(8)}
        />
      );
    case 8:
      return (
        <S9_NotificationCenter
          insets={screenInsets}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/profile");
            }
          }}
          onOpenMemory={() => setStep(1)}
          onOpenIdentity={() => setStep(5)}
          onOpenOpportunity={() => setStep(7)}
        />
      );
    default:
      return null;
  }
}
