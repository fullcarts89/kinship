/**
 * Today Dashboard — Home Screen
 *
 * "This must feel like a calm, living garden — NOT a productivity dashboard."
 * "Every element invites reflection and connection. No metrics, no guilt,
 *  no tasks. Just warm possibilities and gentle invitations to nurture."
 *
 * Sections:
 * 1. Time-aware greeting header with notification/settings icons
 * 2. Your Living Garden — potted plant carousel (each plant = a person, swaying)
 * 3. A Moment Worth Revisiting — featured memory spotlight
 * 4. Gentle Suggestions — invitational cards, never directive
 * 5. Plant a Seed FAB — floating action button to add a new person
 *
 * Animations:
 * - Plant sway: 2-3s ease-in-out loop, ±3deg rotation, living-breathing feel
 * - Memory card: gentle fade-in (600ms, translateY 10→0)
 * - FAB gentle pulse
 * - Content fade-in on load
 */
import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Leaf } from "lucide-react-native";
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
import { Skeleton, ErrorState, FadeIn } from "@/components/ui";
import { OrientationOverlay } from "@/components/OrientationOverlay";
import type { HighlightRect } from "@/components/OrientationOverlay";
import { usePersons, useMemories, useAllInteractions } from "@/hooks";
import { useBootstrapGrowth } from "@/hooks/useGrowth";
import { useOrientation, ORIENTATION_STEP_SCREEN } from "@/hooks/useOrientation";
import { getGrowthInfo } from "@/lib/growthEngine";
import type { GrowthStage } from "@/lib/growthEngine";
import { formatRelativeDate } from "@/lib/formatters";
import {
  GardenRevealIllustration,
  WateringIllustration,
  SingleSproutIllustration,
  SproutSmallIllustration,
  SmallGardenIllustration,
  FlourishingGardenIllustration,
  SunlightIllustration,
} from "@/components/illustrations";
import type { Person, Memory } from "@/types/database";

// ─── Design Tokens (local refs) ─────────────────────────────────────────────

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
const peach = colors.peach;
const lavender = colors.lavender;
const borderClr = colors.border;

/** Per-person accent colors, cycled for visual variety */
const PLANT_COLORS = [sage, "#5E9EA0", lavender, peach, gold, colors.sky];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", emoji: "\u2600\uFE0F" };
  if (h < 17) return { text: "Good afternoon", emoji: "\uD83C\uDF24\uFE0F" };
  return { text: "Good evening", emoji: "\uD83C\uDF19" };
}

function getGardenPhrase(pCount: number, mCount: number): string {
  if (pCount === 0) return "is waiting";
  if (pCount >= 3 && mCount > 3) return "is thriving";
  if (mCount > 0) return "is blooming";
  if (pCount >= 2) return "is growing";
  return "has a new sprout";
}

function daysSince(d: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  );
}

const emotionEmojis: Record<string, string> = {
  grateful: "\uD83D\uDE4F",
  connected: "\uD83D\uDCAB",
  curious: "\uD83D\uDD2E",
  joyful: "\uD83D\uDE0A",
  nostalgic: "\uD83C\uDF05",
  proud: "\u2B50",
  peaceful: "\uD83C\uDF38",
  inspired: "\u2728",
  hopeful: "\uD83C\uDF31",
  loved: "\uD83D\uDC9B",
};

// ─── Growth Illustration Picker ──────────────────────────────────────────────

/** Pick the right potted-plant illustration for a person's growth stage */
function GrowthPlantIllustration({
  stage,
  size = 48,
}: {
  stage: GrowthStage;
  size?: number;
}) {
  switch (stage) {
    case "seed":
      return <SingleSproutIllustration size={size} />;
    case "sprout":
      return <SproutSmallIllustration size={size + 6} />;
    case "youngPlant":
      return <SmallGardenIllustration size={size + 4} />;
    case "mature":
      return <FlourishingGardenIllustration size={size + 6} />;
    case "blooming":
      return <FlourishingGardenIllustration size={size + 10} />;
    case "tree":
      return <GardenRevealIllustration size={size + 14} />;
  }
}

// ─── Swaying Garden Plant ───────────────────────────────────────────────────

/**
 * Animated potted plant — each person is a plant in the garden.
 * Uses actual plant illustrations based on growth stage.
 * Sways gently like a plant in the breeze (2-3s ease-in-out loop).
 */
function SwayingPlant({
  person,
  index,
  onPress,
}: {
  person: Person;
  index: number;
  onPress: () => void;
}) {
  const stage = getGrowthInfo(person.id).stage;
  const sway = useSharedValue(0);
  const duration = 2400 + (index % 3) * 400; // 2.4s, 2.8s, 3.2s cycle

  useEffect(() => {
    sway.value = withDelay(
      index * 180,
      withRepeat(
        withSequence(
          withTiming(3, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-3, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );
  }, []);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sway.value}deg` }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={{ alignItems: "center", marginRight: 18, width: 72 }}
    >
      <Animated.View
        style={[
          {
            width: 68,
            height: 68,
            borderRadius: 20,
            backgroundColor: sagePale,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: sageLight,
          },
          swayStyle,
        ]}
      >
        <GrowthPlantIllustration stage={stage} size={44} />
      </Animated.View>
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 12,
          color: nearBlack,
          textAlign: "center",
          marginTop: 8,
          maxWidth: 72,
        }}
        numberOfLines={1}
      >
        {person.name.split(" ")[0]}
      </Text>
    </Pressable>
  );
}

// ─── Plant a Seed FAB ───────────────────────────────────────────────────────

/** Floating action button with gentle pulse animation */
function PlantASeedFAB({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1.04, {
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1.0, {
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 24,
          right: 20,
          zIndex: 10,
        },
        pulseStyle,
      ]}
    >
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={[gold, "#B88A30"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 18,
            shadowColor: gold,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 16 }}>{"\uD83C\uDF31"}</Text>
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 13,
              color: white,
            }}
          >
            Plant a seed
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Memory Spotlight ───────────────────────────────────────────────────────

/**
 * A Moment Worth Revisiting — single featured memory, large emotional card.
 * "This is a warm invitation to reflect, never a task."
 * Animation: gentle fade-in (600ms, translateY 10→0)
 */
function MemorySpotlight({
  memory,
  person,
}: {
  memory: Memory;
  person: Person | undefined;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(
      400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      400,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const fadeUpStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!person) return null;

  const headerEmoji = memory.emotion
    ? emotionEmojis[memory.emotion] || "\uD83D\uDCF8"
    : "\uD83D\uDCF8";

  return (
    <Animated.View style={fadeUpStyle}>
      <Pressable
        onPress={() => router.push(`/person/${person.id}`)}
        style={{
          backgroundColor: white,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: borderClr,
          overflow: "hidden",
          marginBottom: 20,
          shadowColor: nearBlack,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        {/* Gradient header */}
        <LinearGradient
          colors={[sagePale, sageLight + "66"]}
          style={{
            height: 72,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 28, opacity: 0.5 }}>{headerEmoji}</Text>
        </LinearGradient>
        <View style={{ padding: 16 }}>
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 15,
              color: nearBlack,
              lineHeight: 22,
              marginBottom: 8,
            }}
            numberOfLines={2}
          >
            {memory.content}
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text
              style={{ fontFamily: fonts.sans, fontSize: 13, color: warmGray }}
            >
              with {person.name}
            </Text>
            <Text
              style={{ fontFamily: fonts.sans, fontSize: 13, color: warmGray }}
            >
              {formatRelativeDate(memory.created_at)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionLabel({
  text,
  subtitle,
}: {
  text: string;
  subtitle?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 20,
          color: nearBlack,
        }}
      >
        {text}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 13,
            color: warmGray,
            marginTop: 4,
            lineHeight: 18,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ─── Gentle Suggestion Card ─────────────────────────────────────────────────

/**
 * Invitational suggestion cards — never directive.
 * Language: "You could…", "Maybe…", never "You should…"
 * Always dismissible. No due dates, no guilt metrics.
 */
function GentleSuggestionCard({
  person,
  variant,
}: {
  person: Person;
  variant: "reconnect" | "memory" | "warmth";
}) {
  const firstName = person.name.split(" ")[0];

  const config = {
    reconnect: {
      colors: [goldLight + "88", peach + "44"] as [string, string],
      borderColor: goldLight,
      illustration: <SunlightIllustration size={56} />,
      label: "A gentle thought",
      text: `Maybe reach out to ${firstName}? No rush — whenever feels right.`,
      cta: "Say hello",
    },
    memory: {
      colors: [sagePale, sageLight + "66"] as [string, string],
      borderColor: sageLight,
      illustration: <SmallGardenIllustration size={56} />,
      label: "Plant a memory",
      text: `You could add a moment with ${firstName} — even a small one.`,
      cta: "Add moment",
    },
    warmth: {
      colors: [colors.lavender + "33", sagePale] as [string, string],
      borderColor: colors.lavender + "55",
      illustration: <SingleSproutIllustration size={50} />,
      label: "Growing together",
      text: `${firstName}'s plant could use a little sunlight \u2600\uFE0F`,
      cta: "Visit",
    },
  }[variant];

  return (
    <LinearGradient
      colors={config.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 20,
        padding: 16,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: config.borderColor,
      }}
    >
      <View style={{ width: 56, alignItems: "center" }}>
        {config.illustration}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: warmGray,
            marginBottom: 3,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {config.label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 14,
            color: nearBlack,
            lineHeight: 20,
            marginBottom: 10,
          }}
        >
          {config.text}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => router.push(`/person/${person.id}`)}
            style={{
              backgroundColor: sage,
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 12,
                color: white,
              }}
            >
              {config.cta}
            </Text>
          </Pressable>
          <Pressable
            style={{
              backgroundColor: "transparent",
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#E8E0D6",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                color: warmGray,
              }}
            >
              Not now
            </Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Skeleton Loading ───────────────────────────────────────────────────────

function GardenSkeleton() {
  return (
    <View style={{ paddingHorizontal: 24 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <View>
          <Skeleton width={120} height={16} />
          <View style={{ height: 8 }} />
          <Skeleton width={180} height={32} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Skeleton width={36} height={36} circle />
          <Skeleton width={36} height={36} circle />
        </View>
      </View>
      <Skeleton width="100%" height={200} borderRadius={24} />
      <View style={{ height: 20 }} />
      <Skeleton width="100%" height={120} borderRadius={20} />
      <View style={{ height: 16 }} />
      <Skeleton width="100%" height={100} borderRadius={20} />
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function GardenScreen() {
  const insets = useSafeAreaInsets();
  const {
    persons,
    isLoading: personsLoading,
    error: personsError,
    refetch: refetchPersons,
  } = usePersons();
  const {
    memories,
    isLoading: memoriesLoading,
    error: memoriesError,
    refetch: refetchMemories,
  } = useMemories();
  const {
    interactions: allInteractions,
    isLoading: interactionsLoading,
    refetch: refetchInteractions,
  } = useAllInteractions();

  // Bootstrap growth store from existing data on first load
  const isLoading = personsLoading || memoriesLoading || interactionsLoading;
  useBootstrapGrowth(memories, allInteractions, isLoading);

  const [refreshing, setRefreshing] = useState(false);

  // ── Orientation ─────────────────────────────────────────────────────
  const orientation = useOrientation();
  const gardenHeroRef = useRef<View>(null);
  const firstPlantRef = useRef<View>(null);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);

  // Whether this screen should show an orientation step
  const showOrientation =
    orientation.isActive &&
    ORIENTATION_STEP_SCREEN[orientation.currentStep] === "home";

  // Measure the target element whenever the step changes
  useEffect(() => {
    if (!showOrientation) {
      setHighlightRect(null);
      return;
    }

    // Small delay to ensure layout is complete
    const timer = setTimeout(() => {
      const ref =
        orientation.currentStep === 1 ? gardenHeroRef : firstPlantRef;
      if (ref.current) {
        ref.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHighlightRect({
              x,
              y,
              width,
              height,
              borderRadius: orientation.currentStep === 1 ? 20 : 20,
            });
          }
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [showOrientation, orientation.currentStep]);

  // Orientation step configs for Home screen
  const orientationSteps: Record<
    number,
    { title: string; body: string; primaryLabel: string; cardPosition: "above" | "below" | "center" }
  > = {
    1: {
      title: "This is your living garden",
      body: "Each plant reflects a relationship in your life. It grows as you share moments together.",
      primaryLabel: "Continue",
      cardPosition: "below",
    },
    2: {
      title: "Each plant has a story",
      body: "Tap any plant to explore memories, reflections, and ways to reach out.",
      primaryLabel: "Continue",
      cardPosition: "below",
    },
  };

  const handleOrientationAdvance = async () => {
    if (orientation.currentStep === 2 && persons.length > 0) {
      // Navigate to first person's profile before advancing
      // Step 3 will show there
      await orientation.advance();
      router.push(`/person/${persons[0].id}`);
    } else {
      await orientation.advance();
    }
  };

  const error = personsError || memoriesError;

  // ── Derived data ──────────────────────────────────────────────────────
  const personsMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons]
  );

  const greeting = useMemo(() => getGreeting(), []);

  const gardenPhrase = useMemo(
    () => getGardenPhrase(persons.length, memories.length),
    [persons.length, memories.length]
  );

  // Spotlight memory: rotates daily
  const spotlightMemory = useMemo(() => {
    if (memories.length === 0) return null;
    const dayIdx = Math.floor(Date.now() / 86400000);
    return memories[dayIdx % memories.length];
  }, [memories]);

  // Gentle suggestions: pick up to 3 people who could use attention
  const suggestions = useMemo(() => {
    if (persons.length === 0) return [];
    const variants: Array<"reconnect" | "memory" | "warmth"> = [
      "reconnect",
      "memory",
      "warmth",
    ];
    // Sort by most days since last memory
    const withGap = persons
      .map((p) => {
        const pm = memories.filter((m) => m.person_id === p.id);
        const lastDate =
          pm.length > 0
            ? Math.max(...pm.map((m) => new Date(m.created_at).getTime()))
            : new Date(p.created_at).getTime();
        return { person: p, daysAgo: daysSince(new Date(lastDate).toISOString()) };
      })
      .filter((x) => x.daysAgo > 2)
      .sort((a, b) => b.daysAgo - a.daysAgo);
    return withGap.slice(0, 3).map((item, i) => ({
      person: item.person,
      variant: variants[i % variants.length],
    }));
  }, [persons, memories]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPersons(), refetchMemories(), refetchInteractions()]);
    setRefreshing(false);
  }, [refetchPersons, refetchMemories, refetchInteractions]);

  const handleRetry = useCallback(() => {
    refetchPersons();
    refetchMemories();
    refetchInteractions();
  }, [refetchPersons, refetchMemories, refetchInteractions]);

  // Refetch data whenever this tab gains focus (e.g. after adding a person)
  useFocusEffect(
    useCallback(() => {
      refetchPersons();
      refetchMemories();
      refetchInteractions();
    }, [refetchPersons, refetchMemories, refetchInteractions])
  );

  const hasPeople = persons.length > 0;

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: cream }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GardenSkeleton />
      </ScrollView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: cream }}>
        <ErrorState
          message="Couldn't load your garden. Check your connection and try again."
          onRetry={handleRetry}
        />
      </View>
    );
  }

  // ── Content ───────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 140,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!showOrientation}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={sage}
            colors={[sage]}
          />
        }
      >
        <FadeIn>
          <View style={{ paddingHorizontal: 24 }}>
            {/* ─── Header ─────────────────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: warmGray,
                    marginBottom: 4,
                  }}
                >
                  {greeting.text} {greeting.emoji}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 30,
                    color: nearBlack,
                    lineHeight: 36,
                  }}
                >
                  Your garden
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 30,
                    color: sage,
                    lineHeight: 36,
                  }}
                >
                  {gardenPhrase}
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", gap: 10, paddingTop: 4 }}
              >
                {/* Notifications */}
                <Pressable
                  onPress={() => router.push("/notifications")}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: sagePale,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Leaf size={16} strokeWidth={2} color={sage} />
                </Pressable>
                {/* Settings */}
                <Pressable
                  onPress={() => router.push("/settings")}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: sagePale,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{"\uD83D\uDC64"}</Text>
                </Pressable>
              </View>
            </View>

            {/* ─── Your Living Garden ───────────────────────────── */}
            {hasPeople ? (
              <>
                <SectionLabel
                  text="Your living garden"
                  subtitle="Each plant grows as you add memories together"
                />

                {/* Garden illustration hero — orientation Step 1 target */}
                <View
                  ref={gardenHeroRef}
                  style={{ alignItems: "center", marginBottom: 12 }}
                >
                  <GardenRevealIllustration size={180} />
                </View>

                {/* Interactive plant avatars — each plant = a person */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  scrollEnabled={!showOrientation}
                  contentContainerStyle={{
                    paddingRight: 8,
                    paddingBottom: 4,
                    paddingLeft: 4,
                  }}
                  style={{ marginBottom: 6 }}
                >
                  {persons.map((p, i) => (
                    <View
                      key={p.id}
                      ref={i === 0 ? firstPlantRef : undefined}
                      collapsable={false}
                    >
                      <SwayingPlant
                        person={p}
                        index={i}
                        onPress={() => router.push(`/person/${p.id}`)}
                      />
                    </View>
                  ))}
                </ScrollView>

                {/* Swipe hint */}
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 11,
                    color: warmGray,
                    textAlign: "center",
                    marginBottom: 28,
                    opacity: 0.6,
                  }}
                >
                  {"\u2190"} Swipe to explore {"\u2192"}
                </Text>
              </>
            ) : (
              /* Empty garden — first-time CTA */
              <Pressable onPress={() => router.push("/(tabs)/add")}>
                <LinearGradient
                  colors={[white, sagePale]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 24,
                    padding: 28,
                    borderWidth: 1,
                    borderColor: sage + "22",
                    alignItems: "center",
                    marginBottom: 24,
                    shadowColor: sage,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.15,
                    shadowRadius: 24,
                    elevation: 6,
                  }}
                >
                  <WateringIllustration size={140} />
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 22,
                      color: nearBlack,
                      textAlign: "center",
                      marginTop: 16,
                      marginBottom: 8,
                    }}
                  >
                    Plant your first seed
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 14,
                      color: warmGray,
                      textAlign: "center",
                      marginBottom: 20,
                    }}
                  >
                    Add someone special to start growing your garden
                  </Text>
                  <View
                    style={{
                      backgroundColor: sage,
                      borderRadius: 14,
                      paddingVertical: 13,
                      paddingHorizontal: 24,
                      shadowColor: sage,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.25,
                      shadowRadius: 12,
                      elevation: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansSemiBold,
                        fontSize: 15,
                        color: white,
                      }}
                    >
                      Add a person
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            )}

            {/* ─── A Moment Worth Revisiting ──────────────────── */}
            {spotlightMemory && (
              <>
                <SectionLabel text="A moment worth revisiting" />
                <MemorySpotlight
                  memory={spotlightMemory}
                  person={personsMap.get(spotlightMemory.person_id)}
                />
              </>
            )}

            {/* ─── Gentle Suggestions ─────────────────────────── */}
            {suggestions.length > 0 && (
              <>
                <SectionLabel
                  text="Gentle suggestions"
                  subtitle="No pressure — just warm invitations"
                />
                {suggestions.map(({ person, variant }) => (
                  <GentleSuggestionCard
                    key={person.id}
                    person={person}
                    variant={variant}
                  />
                ))}
              </>
            )}

            {/* Empty memories placeholder */}
            {hasPeople && memories.length === 0 && (
              <View
                style={{
                  backgroundColor: white,
                  borderRadius: 20,
                  paddingVertical: 36,
                  paddingHorizontal: 24,
                  borderWidth: 1,
                  borderColor: borderClr,
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: warmGray,
                  }}
                >
                  Your memories will appear here
                </Text>
              </View>
            )}
          </View>
        </FadeIn>
      </ScrollView>

      {/* ─── Plant a Seed FAB ──────────────────────────────── */}
      {!showOrientation && (
        <PlantASeedFAB onPress={() => router.push("/(tabs)/add")} />
      )}

      {/* ─── Orientation Overlay (Steps 1–2) ──────────────── */}
      {showOrientation && orientationSteps[orientation.currentStep] && (
        <OrientationOverlay
          isOpen
          step={orientation.currentStep}
          totalSteps={orientation.totalSteps}
          highlightRect={highlightRect}
          title={orientationSteps[orientation.currentStep].title}
          body={orientationSteps[orientation.currentStep].body}
          primaryLabel={orientationSteps[orientation.currentStep].primaryLabel}
          cardPosition={orientationSteps[orientation.currentStep].cardPosition}
          onPrimary={handleOrientationAdvance}
          onSkip={orientation.skip}
        />
      )}
    </View>
  );
}
