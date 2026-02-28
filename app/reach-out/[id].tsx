import React, { useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
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
  MessageCircle,
  Phone,
  Users,
  Video,
  X,
} from "lucide-react-native";
import { fonts } from "@design/tokens";
import {
  Skeleton,
  ErrorState,
} from "@/components/ui";
import {
  usePerson,
  usePersonMemories,
  usePersonInteractions,
  useCreateInteraction,
} from "@/hooks";
import { PlantBridgeIllustration } from "@/components/illustrations";
import { MemoryCarousel } from "@/components/MemoryCarousel";
import { getReachOutActions } from "@/lib/reachOutActionEngine";
import type { Person, Interaction } from "@/types/database";
import type { InteractionType } from "@/types";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = "#7A9E7E";
const sageLight = "#C8DEC9";
const cream = "#FDF7ED";
const nearBlack = "#1C1917";
const warmGray = "#78716C";
const white = "#FFFFFF";
const borderColor = "#E8E4DD";

// ─── Icon Mapping ───────────────────────────────────────────────────────────

function getActionIcon(type: InteractionType) {
  switch (type) {
    case "call":
      return Phone;
    case "video":
      return Video;
    case "in_person":
      return Users;
    case "message":
    default:
      return MessageCircle;
  }
}

// ─── Bridge Screen (Screen 1) ───────────────────────────────────────────────

function BridgeScreen({
  person,
  interactions,
  onChannelSelected,
  onDismiss,
}: {
  person: Person;
  interactions: Interaction[];
  onChannelSelected: (channelType: InteractionType) => void;
  onDismiss: () => void;
}) {
  const { memories } = usePersonMemories(person.id);

  // Filter memories to past year, sorted most recent first (REACH-01)
  const recentMemories = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return memories
      .filter((m) => new Date(m.created_at) >= oneYearAgo)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [memories]);

  const hasMemories = recentMemories.length > 0;

  // Get contextual action options (REACH-02)
  const actions = useMemo(
    () => getReachOutActions(person, interactions),
    [person, interactions]
  );

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

        {/* Memory Carousel — swipeable recent memories (REACH-01) */}
        {hasMemories && (
          <Animated.View style={[{ marginBottom: 20, marginHorizontal: -20 }, memoryCardStyle]}>
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
              Moments you've shared
            </Text>
            <MemoryCarousel memories={recentMemories} />
          </Animated.View>
        )}

        {/* Fallback when no memories exist */}
        {!hasMemories && (
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

        {/* Primary Text — varies by context */}
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
          {hasMemories
            ? "A moment to reconnect"
            : interactions.length > 0
              ? `Stay connected with ${person.name}`
              : "Sometimes the simplest reach-out matters most"}
        </Text>

        {/* Spacer to push actions to bottom */}
        <View style={{ flex: 1 }} />

        {/* Contextual Action Buttons (REACH-02) */}
        <View style={{ marginBottom: 16 }}>
          {actions.map((action, index) => {
            const IconComponent = getActionIcon(action.type);

            if (action.isPrimary) {
              return (
                <Pressable
                  key={action.type}
                  onPress={() => onChannelSelected(action.type)}
                  style={{
                    backgroundColor: sage,
                    borderRadius: 16,
                    paddingVertical: 18,
                    paddingHorizontal: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    shadowColor: sage,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: 4,
                    marginBottom: 10,
                  }}
                >
                  <IconComponent size={18} color={white} />
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontFamily: fonts.sansSemiBold,
                        fontSize: 16,
                        color: white,
                      }}
                    >
                      {action.label}
                    </Text>
                    {action.sublabel && (
                      <Text
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 12,
                          color: "rgba(255,255,255,0.8)",
                          marginTop: 2,
                        }}
                      >
                        {action.sublabel}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={action.type}
                onPress={() => onChannelSelected(action.type)}
                style={{
                  backgroundColor: white,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: index < actions.length - 1 ? 8 : 0,
                }}
              >
                <IconComponent size={16} color={warmGray} />
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: nearBlack,
                  }}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ReachOutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { person, isLoading, error, refetch } = usePerson(id ?? "");
  const { interactions } = usePersonInteractions(id ?? "");
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
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/people")} hitSlop={12}>
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

  const handleChannelSelected = async (channelType: InteractionType) => {
    try {
      await createInteraction({
        person_id: person.id,
        type: channelType,
      });
    } catch {
      // Silent fail
    }
    // Navigate directly to check-in — no intermediate screen (REACH-03)
    router.replace(`/reach-out/check-in/${person.id}`);
  };

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/people");
    }
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

        {/* Bridge Screen */}
        <BridgeScreen
          person={person}
          interactions={interactions}
          onChannelSelected={handleChannelSelected}
          onDismiss={handleDismiss}
        />
      </View>
    </>
  );
}
