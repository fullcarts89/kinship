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
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Settings } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  FadeInUp,
} from "react-native-reanimated";
import { colors, fonts } from "@design/tokens";
import { Skeleton, ErrorState, FadeIn } from "@/components/ui";
import { OrientationOverlay } from "@/components/OrientationOverlay";
import type { HighlightRect } from "@/components/OrientationOverlay";
import { usePersons, useMemories, useAllInteractions, useAllVitalities } from "@/hooks";
import { useBootstrapGrowth } from "@/hooks/useGrowth";
import VitalPlant from "@/components/VitalPlant";
import GrowthPlantIllustration from "@/components/GrowthPlantIllustration";
import { useOrientation, ORIENTATION_STEP_SCREEN } from "@/hooks/useOrientation";
import { getGrowthInfo } from "@/lib/growthEngine";
import type { GrowthStage } from "@/lib/growthEngine";
import { formatRelativeDate, formatMemoryDate, getMemoryDate, emotionEmojis } from "@/lib/formatters";
import { generateSuggestions } from "@/lib/suggestionEngine";
import type { IntelligentSuggestion, SuggestionType } from "@/lib/suggestionEngine";
import { getRecentCalendarMatches } from "@/lib/calendarEngine";
import type { CalendarMatch } from "@/lib/calendarEngine";
import {
  GardenRevealIllustration,
  WateringIllustration,
} from "@/components/illustrations";
import type { Person, Memory } from "@/types/database";

// ─── Design Tokens (local refs) ─────────────────────────────────────────────

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const gold = colors.gold;
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


// ─── Swaying Garden Plant ───────────────────────────────────────────────────

/**
 * Animated potted plant — each person is a plant in the garden.
 * Uses actual plant illustrations based on growth stage.
 * Sway animation is now handled by VitalPlant (vitality-aware).
 */
function SwayingPlant({
  person,
  index,
  vitalityScore,
  onPress,
}: {
  person: Person;
  index: number;
  vitalityScore: number;
  onPress: () => void;
}) {
  const stage = getGrowthInfo(person.id).stage;

  return (
    <Pressable
      onPress={onPress}
      style={{ alignItems: "center", marginRight: 18, width: 72 }}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 20,
          backgroundColor: sagePale,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: sageLight,
        }}
      >
        <VitalPlant
          vitalityScore={vitalityScore}
          size={44}
          index={index}
          staggerDelay={0}
        >
          <GrowthPlantIllustration stage={stage} size={44} />
        </VitalPlant>
      </View>
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

// ─── Garden Summary Card ────────────────────────────────────────────────────

function GardenSummaryCard({
  personCount,
  memoryCount,
  interactionCount,
}: {
  personCount: number;
  memoryCount: number;
  interactionCount: number;
}) {
  const stats = [
    { value: personCount, label: personCount === 1 ? "seed planted" : "seeds planted" },
    { value: memoryCount, label: memoryCount === 1 ? "moment saved" : "moments saved" },
    { value: interactionCount, label: interactionCount === 1 ? "connection made" : "connections made" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: borderClr,
        paddingVertical: 14,
        paddingHorizontal: 8,
        marginBottom: 20,
        shadowColor: nearBlack,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {stats.map((stat, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            alignItems: "center",
            borderRightWidth: i < stats.length - 1 ? 1 : 0,
            borderRightColor: borderClr,
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 20,
              color: sage,
              lineHeight: 24,
            }}
          >
            {stat.value}
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              color: warmGray,
              textAlign: "center",
              marginTop: 2,
              lineHeight: 14,
            }}
          >
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
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
        onPress={() => router.push(`/memory/${memory.id}`)}
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
        {/* Photo or gradient header */}
        {memory.photo_url ? (
          <Image
            source={{ uri: memory.photo_url }}
            style={{ height: 140, width: "100%" }}
            resizeMode="cover"
          />
        ) : (
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
        )}
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
              {formatMemoryDate(getMemoryDate(memory))}
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

// ─── Suggestion Type Icons & Navigation ─────────────────────────────────────

const SUGGESTION_ICON: Record<SuggestionType, string> = {
  birthday_upcoming: "\uD83C\uDF82",    // 🎂
  memory_resurface: "\uD83D\uDCAD",     // 💭
  drift_reconnect: "\uD83C\uDF3F",      // 🌿
  post_event_capture: "\uD83D\uDCF8",   // 📸
  general_reach_out: "\uD83D\uDC8C",    // 💌
};

function handleSuggestionPress(suggestion: IntelligentSuggestion) {
  switch (suggestion.type) {
    case "birthday_upcoming":
      router.push(`/reach-out/${suggestion.personId}`);
      break;
    case "post_event_capture":
      router.push(`/memory/add?personId=${suggestion.personId}`);
      break;
    case "memory_resurface":
    case "drift_reconnect":
    case "general_reach_out":
    default:
      router.push(`/person/${suggestion.personId}`);
      break;
  }
}

// ─── Dynamic Suggestion Card ────────────────────────────────────────────────

/**
 * Dynamically generated suggestion card from the suggestion engine.
 * Shows an icon, reason text, and navigates on tap.
 * Uses FadeInUp stagger animation for a gentle entrance.
 */
function DynamicSuggestionCard({
  suggestion,
  index,
}: {
  suggestion: IntelligentSuggestion;
  index: number;
}) {
  const icon = SUGGESTION_ICON[suggestion.type] ?? "\uD83D\uDC8C";

  return (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(400)}>
      <Pressable
        onPress={() => handleSuggestionPress(suggestion)}
        style={{
          backgroundColor: white,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: borderClr,
          padding: 16,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          shadowColor: nearBlack,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Icon circle */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: sagePale,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>

        {/* Reason text */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 14,
              color: nearBlack,
              lineHeight: 20,
            }}
            numberOfLines={3}
          >
            {suggestion.reason}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
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

  // Vitality scores for all persons (used by plant carousel)
  const personIds = useMemo(() => persons.map((p) => p.id), [persons]);
  const vitalities = useAllVitalities(personIds, memories, allInteractions);

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

  // Spotlight memory: rotates daily, only shows memories 7+ days old (INTL-04)
  const spotlightMemory = useMemo(() => {
    if (memories.length === 0) return null;
    const now = Date.now();
    const MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const eligible = memories.filter(
      (m) => now - new Date(m.occurred_at || m.created_at).getTime() >= MIN_AGE_MS
    );
    if (eligible.length === 0) return null;
    const dayIdx = Math.floor(now / 86400000);
    return eligible[dayIdx % eligible.length];
  }, [memories]);

  // Calendar matches for post-event suggestions (Tier 2)
  const [calendarMatches, setCalendarMatches] = useState<CalendarMatch[]>([]);

  useEffect(() => {
    if (persons.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const matches = await getRecentCalendarMatches(persons);
        if (!cancelled) setCalendarMatches(matches);
      } catch {
        // Calendar unavailable or permission denied — fail gracefully
      }
    })();

    return () => { cancelled = true; };
  }, [persons]);

  // Dynamic suggestions from the suggestion engine (ranked, deduped, max 3)
  const suggestions = useMemo(
    () => generateSuggestions(persons, memories, allInteractions, calendarMatches, 3),
    [persons, memories, allInteractions, calendarMatches]
  );

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
            <Animated.View
              entering={FadeInUp.duration(400)}
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
                  <Bell size={16} strokeWidth={2} color={sage} />
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
                  <Settings size={16} strokeWidth={2} color={sage} />
                </Pressable>
              </View>
            </Animated.View>

            {/* ─── Your Living Garden ───────────────────────────── */}
            {hasPeople ? (
              <Animated.View entering={FadeInUp.delay(100).duration(400)}>
                <SectionLabel
                  text="Your living garden"
                  subtitle="Each plant grows as you add memories together"
                />

                {/* Garden Summary Card */}
                <GardenSummaryCard
                  personCount={persons.length}
                  memoryCount={memories.length}
                  interactionCount={allInteractions.length}
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
                        vitalityScore={vitalities[p.id]?.score ?? 1.0}
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
              </Animated.View>
            ) : (
              /* Empty garden — first-time CTA */
              <Animated.View entering={FadeInUp.delay(100).duration(400)}>
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
              </Animated.View>
            )}

            {/* ─── A Moment Worth Revisiting ──────────────────── */}
            {spotlightMemory && (
              <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                <SectionLabel text="A moment worth revisiting" />
                <MemorySpotlight
                  memory={spotlightMemory}
                  person={personsMap.get(spotlightMemory.person_id)}
                />
              </Animated.View>
            )}

            {/* ─── Gentle Suggestions ─────────────────────────── */}
            {hasPeople && (
              <Animated.View entering={FadeInUp.delay(300).duration(400)}>
                <SectionLabel
                  text="Gentle suggestions"
                  subtitle="No pressure — just warm invitations"
                />
                {suggestions.length > 0 ? (
                  <>
                    {suggestions.map((suggestion, i) => (
                      <DynamicSuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        index={i}
                      />
                    ))}
                    {/* Preview Garden Walk link */}
                    <Pressable
                      onPress={() => router.push("/garden-walk")}
                      style={{
                        alignSelf: "center",
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        marginTop: 4,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 13,
                          color: sage,
                          textDecorationLine: "underline",
                          textDecorationColor: sage + "66",
                        }}
                      >
                        Preview Garden Walk
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <View
                    style={{
                      backgroundColor: white,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: borderClr,
                      paddingVertical: 28,
                      paddingHorizontal: 20,
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 14,
                        color: warmGray,
                        textAlign: "center",
                        lineHeight: 20,
                      }}
                    >
                      Your garden is growing. Capture more moments to see
                      personalized suggestions here.
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Empty memories placeholder */}
            {hasPeople && memories.length === 0 && (
              <Animated.View entering={FadeInUp.delay(300).duration(400)}>
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
              </Animated.View>
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
