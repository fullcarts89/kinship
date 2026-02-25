import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, Stack, router } from "expo-router";
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
import {
  ChevronLeft,
  MessageCircle,
  Phone,
  Video,
  X,
} from "lucide-react-native";
import { fonts } from "@design/tokens";
import {
  Skeleton,
  ErrorState,
  FadeIn,
} from "@/components/ui";
import {
  usePerson,
  usePersonMemories,
  useCreateInteraction,
} from "@/hooks";
import { PlantBridgeIllustration } from "@/components/illustrations";
import {
  getBestMemoryForReachOut,
  getMemoryContextLabel,
} from "@/lib/memorySelection";
import type { Person } from "@/types/database";
import type { Emotion } from "@/types";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = "#7A9E7E";
const sageDark = "#4A7055";
const sagePale = "#EBF3EB";
const sageLight = "#C8DEC9";
const cream = "#FDF7ED";
const nearBlack = "#1C1917";
const warmGray = "#78716C";
const white = "#FFFFFF";
const borderColor = "#E8E4DD";

// ─── Bridge Screen (Screen 1) ───────────────────────────────────────────────

function BridgeScreen({
  person,
  onChannelSelected,
  onDismiss,
}: {
  person: Person;
  onChannelSelected: () => void;
  onDismiss: () => void;
}) {
  const { memories } = usePersonMemories(person.id);
  const recentMemory = getBestMemoryForReachOut(memories);
  const memoryLabel = recentMemory ? getMemoryContextLabel(recentMemory) : null;

  const suggestedOpenings = [
    "This made me think of you",
    "I loved this day",
    "How have you been?",
  ];

  // ─── Entrance animation (fade + rise + scale) ──────────────────────────
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(24);
  const contentScale = useSharedValue(0.98);

  // ─── Memory card delayed reveal ────────────────────────────────────────
  const memoryOpacity = useSharedValue(0);
  const memoryScale = useSharedValue(0.96);

  // ─── Plant breathing animation ─────────────────────────────────────────
  const plantBreath = useSharedValue(1);

  useEffect(() => {
    // Content entrance
    const enterConfig = { duration: 400, easing: Easing.out(Easing.cubic) };
    contentOpacity.value = withTiming(1, enterConfig);
    contentTranslateY.value = withTiming(0, enterConfig);
    contentScale.value = withTiming(1, enterConfig);

    // Memory card — delayed reveal
    const cardConfig = { duration: 200, easing: Easing.out(Easing.ease) };
    memoryOpacity.value = withDelay(100, withTiming(1, cardConfig));
    memoryScale.value = withDelay(100, withTiming(1, cardConfig));

    // Plant breathing — infinite
    plantBreath.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateY: contentTranslateY.value },
      { scale: contentScale.value },
    ],
  }));

  const memoryCardStyle = useAnimatedStyle(() => ({
    opacity: memoryOpacity.value,
    transform: [{ scale: memoryScale.value }],
  }));

  const plantBreathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plantBreath.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, entranceStyle]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingBottom: 32,
          paddingTop: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Person Avatar */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <LinearGradient
            colors={[sageLight, sage]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: white,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 36 }}>
              {person.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>

        {/* Memory Preview with Context Label */}
        {recentMemory && (
          <Animated.View style={[{ marginBottom: 20 }, memoryCardStyle]}>
            {/* Context label */}
            {memoryLabel && (
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: warmGray,
                  textAlign: "center",
                  marginBottom: 8,
                  letterSpacing: 0.2,
                }}
              >
                {memoryLabel}
              </Text>
            )}
            <LinearGradient
              colors={[sagePale, sageLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: "100%",
                height: 180,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Text style={{ fontSize: 64, opacity: 0.6 }}>{"\uD83D\uDCF8"}</Text>
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  backgroundColor: "rgba(255,255,255,0.95)",
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 11,
                    color: warmGray,
                  }}
                  numberOfLines={1}
                >
                  {recentMemory.content.slice(0, 40)}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Fallback when no memories exist */}
        {!recentMemory && (
          <Animated.View style={[{ marginBottom: 20 }, memoryCardStyle]}>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                color: warmGray,
                textAlign: "center",
                marginBottom: 8,
                letterSpacing: 0.2,
              }}
            >
              A small hello can mean a lot
            </Text>
          </Animated.View>
        )}

        {/* Plant Bridge Illustration — with breathing animation */}
        <Animated.View style={[{ alignItems: "center", marginBottom: 16 }, plantBreathStyle]}>
          <PlantBridgeIllustration size={64} />
        </Animated.View>

        {/* Primary Text */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 22,
            color: nearBlack,
            lineHeight: 29,
            textAlign: "center",
            paddingHorizontal: 16,
            marginBottom: 24,
          }}
        >
          {recentMemory
            ? "This moment could mean something to them"
            : "Sometimes the simplest reach-out matters most"}
        </Text>

        {/* Suggested Opening Chips */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 11,
              color: warmGray,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Suggested opening
          </Text>
          <View style={{ gap: 8 }}>
            {suggestedOpenings.map((text, i) => (
              <Pressable
                key={i}
                onPress={onChannelSelected}
                style={{
                  backgroundColor: i === 0 ? sagePale : white,
                  borderWidth: 1,
                  borderColor: i === 0 ? sage : borderColor,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: nearBlack,
                  }}
                >
                  "{text}"
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Spacer to push actions to bottom */}
        <View style={{ flex: 1 }} />

        {/* Contact Action Buttons */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Message - Primary */}
            <Pressable
              onPress={onChannelSelected}
              style={{
                flex: 1,
                backgroundColor: sage,
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                shadowColor: sage,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <MessageCircle size={18} color={white} />
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 16,
                  color: white,
                }}
              >
                Message
              </Text>
            </Pressable>

            {/* Phone */}
            <Pressable
              onPress={onChannelSelected}
              style={{
                backgroundColor: white,
                borderWidth: 1,
                borderColor: sage + "44",
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Phone size={18} color={sage} />
            </Pressable>

            {/* Video */}
            <Pressable
              onPress={onChannelSelected}
              style={{
                backgroundColor: white,
                borderWidth: 1,
                borderColor: sage + "44",
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Video size={18} color={sage} />
            </Pressable>
          </View>
        </View>

        {/* Not now */}
        <Pressable onPress={onDismiss} style={{ alignItems: "center", padding: 12 }}>
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 15,
              color: warmGray,
            }}
          >
            Not now
          </Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Passive Follow-Up Screen (Screen 2) ────────────────────────────────────

function PassiveFollowUpScreen({
  personId,
  onSaveMemory,
  onDismiss,
}: {
  personId: string;
  onSaveMemory: () => void;
  onDismiss: () => void;
}) {
  return (
    <FadeIn className="flex-1">
      <LinearGradient
        colors={[cream, sagePale]}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        {/* Plant Bridge Illustration */}
        <PlantBridgeIllustration size={120} />

        {/* Headline */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
            textAlign: "center",
            lineHeight: 36,
            marginTop: 32,
            marginBottom: 16,
            maxWidth: 280,
          }}
        >
          Moments like this continue to grow
        </Text>

        {/* Subtext */}
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 16,
            color: warmGray,
            textAlign: "center",
            lineHeight: 24,
            marginBottom: 40,
            maxWidth: 260,
          }}
        >
          Capture it while it's still fresh
        </Text>

        {/* Save Memory Button */}
        <Pressable
          onPress={onSaveMemory}
          style={{
            backgroundColor: sage,
            borderRadius: 16,
            paddingVertical: 18,
            paddingHorizontal: 48,
            alignItems: "center",
            marginBottom: 14,
            shadowColor: sage,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 17,
              color: white,
            }}
          >
            Save Memory
          </Text>
        </Pressable>

        {/* Maybe Later */}
        <Pressable onPress={onDismiss} style={{ padding: 12 }}>
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 15,
              color: warmGray,
            }}
          >
            Maybe later
          </Text>
        </Pressable>
      </LinearGradient>
    </FadeIn>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ReachOutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<"bridge" | "followup">("bridge");

  const { person, isLoading, error, refetch } = usePerson(id ?? "");
  const { createInteraction } = useCreateInteraction();

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: cream,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              paddingHorizontal: 24,
              paddingTop: 12,
            }}
          >
            <Skeleton width={22} height={22} borderRadius={4} />
          </View>
          <View style={{ paddingHorizontal: 24, alignItems: "center", paddingTop: 24 }}>
            <Skeleton width={96} height={96} circle />
            <Skeleton width={200} height={180} borderRadius={20} className="mt-lg" />
          </View>
        </View>
      </>
    );
  }

  // ─── Error / Not Found ───────────────────────────────────────────────────
  if (error || !person) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: cream,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              paddingHorizontal: 24,
              paddingTop: 12,
            }}
          >
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <X color={warmGray} size={22} />
            </Pressable>
          </View>
          <ErrorState
            message={error ? "Couldn't load this person." : "Person not found."}
            onRetry={refetch}
          />
        </View>
      </>
    );
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleChannelSelected = async () => {
    // Simulate opening external app, then show follow-up
    try {
      await createInteraction({
        person_id: person.id,
        type: "message",
      });
    } catch {
      // Silent fail
    }
    setPhase("followup");
  };

  const handleSaveMemory = () => {
    router.replace(`/memory/add?personId=${person.id}`);
  };

  const handleDismiss = () => {
    router.back();
  };

  // ─── Content ─────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flex: 1,
          backgroundColor: cream,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Header */}
        {phase === "bridge" && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 4,
            }}
          >
            <Pressable onPress={handleDismiss} hitSlop={12}>
              <X color={warmGray} size={22} />
            </Pressable>
          </View>
        )}

        {/* Screens */}
        {phase === "bridge" ? (
          <BridgeScreen
            person={person}
            onChannelSelected={handleChannelSelected}
            onDismiss={handleDismiss}
          />
        ) : (
          <PassiveFollowUpScreen
            personId={id ?? ""}
            onSaveMemory={handleSaveMemory}
            onDismiss={handleDismiss}
          />
        )}
      </View>
    </>
  );
}
