/**
 * Your Garden — People Tab
 *
 * A living garden of connections, not a contact database.
 *
 * Sections:
 * 1. Header — "Your Garden" + connection count in growth language + Add button
 * 2. Living Garden Canopy — Horizontal scroll of plant cards with sway animation
 * 3. All People — Vertical list with color-coded labels, FadeInUp stagger
 *
 * Plant Evolution (growth-point-based via growthEngine, never regresses):
 *   Seed (0–1) → Sprout (2–4) → Young Plant (5–9) →
 *   Mature (10–16) → Blooming (17–26) → Established Tree (27+)
 */

import React, { useEffect, useMemo, useCallback, useState } from "react";
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeInUp,
} from "react-native-reanimated";
import {
  Plus,
  ChevronRight,
  Sprout,
  Users,
} from "lucide-react-native";
import { colors, fonts, shadows } from "@design/tokens";
import { Skeleton, ErrorState, EmptyState, FadeIn } from "@/components/ui";
import { usePersons, useMemories, useAllInteractions, useBootstrapGrowth } from "@/hooks";
import { relationshipLabels } from "@/lib/formatters";
import { getGrowthInfo, type GrowthStage } from "@/lib/growthEngine";
import type { Person, Memory } from "@/types/database";
import type { RelationshipType } from "@/types";
import {
  SingleSproutIllustration,
  SproutSmallIllustration,
  SmallGardenIllustration,
  FlourishingGardenIllustration,
  GardenRevealIllustration,
} from "@/components/illustrations";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Per-person color palette — cycled by person index for visual variety */
const PLANT_COLORS = [
  colors.sage,
  "#5E9EA0",
  colors.lavender,
  colors.peach,
  colors.gold,
  colors.sky,
];

/** Relationship type → accent color */
const RELATIONSHIP_COLORS: Record<string, string> = {
  friend: colors.sage,
  family: colors.moss,
  partner: colors.lavender,
  colleague: colors.peach,
  neighbor: colors.sky,
  mentor: colors.gold,
  acquaintance: colors.warmGray,
  other: colors.warmGray,
};

// ─── Growth Stage Emoji Map ──────────────────────────────────────────────────

/** Stage → emoji for display alongside labels in the garden. */
const STAGE_EMOJI: Record<GrowthStage, string> = {
  seed: "🌱",
  sprout: "🌿",
  youngPlant: "🪴",
  mature: "🌳",
  blooming: "🌸",
  tree: "🏡",
};

/** Render the appropriate plant illustration for a growth stage */
function GrowthIllustration({
  stage,
  size = 44,
}: {
  stage: GrowthStage;
  size?: number;
}) {
  switch (stage) {
    case "seed":
      return <SingleSproutIllustration size={size} />;
    case "sprout":
      return <SingleSproutIllustration size={size + 6} />;
    case "youngPlant":
      return <SproutSmallIllustration size={size + 4} />;
    case "mature":
      return <SmallGardenIllustration size={size + 6} />;
    case "blooming":
      return <FlourishingGardenIllustration size={size + 6} />;
    case "tree":
      return <GardenRevealIllustration size={size + 10} />;
  }
}

/** Get a growth-language description for the connection count */
function getGardenSubtitle(count: number): string {
  if (count === 0) return "Your garden awaits its first seed";
  if (count === 1) return "1 connection growing";
  if (count <= 3) return `${count} connections growing`;
  if (count <= 7) return `${count} connections blooming`;
  return `${count} connections flourishing`;
}

/** Build per-person memory count map */
function buildMemoryCountMap(memories: Memory[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const m of memories) {
    map[m.person_id] = (map[m.person_id] || 0) + 1;
  }
  return map;
}

/** Get an emotional context line based on memory count */
function getContextLine(memoryCount: number, name: string): string {
  if (memoryCount === 0) return "A new beginning";
  if (memoryCount === 1) return "Your first memory together";
  if (memoryCount <= 3) return `${memoryCount} memories shared`;
  if (memoryCount <= 10) return `${memoryCount} memories growing`;
  if (memoryCount <= 20) return `${memoryCount} beautiful memories`;
  return `${memoryCount} memories — deeply rooted`;
}

// ─── Skeleton Loading ───────────────────────────────────────────────────────

function GardenSkeleton({ topPad }: { topPad: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, paddingTop: topPad }}>
      <View style={{ paddingHorizontal: 24 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View>
            <Skeleton width={150} height={32} />
            <Skeleton width={120} height={14} className="mt-xs" />
          </View>
          <Skeleton width={40} height={40} circle />
        </View>
      </View>

      {/* Canopy skeleton */}
      <View style={{ paddingLeft: 24, marginBottom: 24 }}>
        <Skeleton width={130} height={18} className="mb-md" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ marginRight: 14, alignItems: "center" }}>
              <Skeleton width={72} height={72} borderRadius={16} />
              <Skeleton width={48} height={12} className="mt-xs" />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* List skeleton */}
      <View style={{ paddingHorizontal: 24 }}>
        <Skeleton width={90} height={18} className="mb-md" />
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Skeleton width={52} height={52} borderRadius={14} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Skeleton width={130} height={16} />
              <Skeleton width={80} height={12} className="mt-xs" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Canopy Plant Card ──────────────────────────────────────────────────────

const CanopyPlantCard = React.memo(function CanopyPlantCard({
  person,
  index,
}: {
  person: Person;
  index: number;
}) {
  const personColor = PLANT_COLORS[index % PLANT_COLORS.length];
  const growth = getGrowthInfo(person.id);
  const emoji = STAGE_EMOJI[growth.stage];

  // ─── Subtle sway animation (3–5s cycle, organic) ──────────────────────
  const sway = useSharedValue(0);
  const duration = 3000 + (index % 3) * 800; // Stagger: 3s, 3.8s, 4.6s

  useEffect(() => {
    sway.value = withDelay(
      index * 120,
      withRepeat(
        withSequence(
          withTiming(3.5, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-3.5, {
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
      onPress={() => router.push(`/person/${person.id}`)}
      style={{ alignItems: "center", marginRight: 14, width: 78 }}
    >
      {/* Plant circle container */}
      <Animated.View style={swayStyle}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            backgroundColor: `${personColor}11`,
            borderWidth: 1.5,
            borderColor: `${personColor}38`,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <GrowthIllustration stage={growth.stage} size={40} />
        </View>
      </Animated.View>

      {/* Name */}
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 12,
          color: colors.nearBlack,
          marginTop: 6,
          textAlign: "center",
          maxWidth: 72,
        }}
      >
        {person.name.split(" ")[0]}
      </Text>

      {/* Growth stage label */}
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          color: colors.warmGray,
          marginTop: 1,
          textAlign: "center",
        }}
      >
        {emoji} {growth.label}
      </Text>
    </Pressable>
  );
});

// ─── Person Row ─────────────────────────────────────────────────────────────

const PersonRow = React.memo(function PersonRow({
  person,
  memoryCount,
  index,
}: {
  person: Person;
  memoryCount: number;
  index: number;
}) {
  const personColor = PLANT_COLORS[index % PLANT_COLORS.length];
  const relColor =
    RELATIONSHIP_COLORS[person.relationship_type] || colors.warmGray;
  const growth = getGrowthInfo(person.id);
  const emoji = STAGE_EMOJI[growth.stage];
  const contextLine = getContextLine(memoryCount, person.name);

  // Pressed state: translateY -2px with enhanced shadow
  const [pressed, setPressed] = useState(false);

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => router.push(`/person/${person.id}`)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginHorizontal: 24,
          marginBottom: 8,
          backgroundColor: colors.white,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          transform: [{ translateY: pressed ? -2 : 0 }],
          ...(pressed ? shadows.card : shadows.soft),
        }}
      >
        {/* Avatar / Illustration container */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: `${personColor}11`,
            borderWidth: 1,
            borderColor: `${personColor}38`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LinearGradient
            colors={[`${personColor}30`, `${personColor}18`]}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: 14,
            }}
          />
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: colors.nearBlack,
                flex: 1,
              }}
            >
              {person.name}
            </Text>
            {/* Relationship badge */}
            <View
              style={{
                paddingVertical: 2,
                paddingHorizontal: 8,
                borderRadius: 10,
                backgroundColor: `${relColor}18`,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 11,
                  color: relColor,
                }}
              >
                {relationshipLabels[person.relationship_type]}
              </Text>
            </View>
          </View>

          {/* Context line */}
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: colors.warmGray,
              marginTop: 3,
            }}
          >
            {contextLine}
          </Text>
        </View>

        <ChevronRight
          color={colors.warmGray}
          size={16}
          style={{ opacity: 0.35, marginLeft: 8 }}
        />
      </Pressable>
    </Animated.View>
  );
});

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function YourGardenScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 16;
  const [refreshing, setRefreshing] = useState(false);

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

  const isLoading = personsLoading || memoriesLoading || interactionsLoading;
  const error = personsError || memoriesError;

  // Bootstrap growth points from existing data (runs once)
  useBootstrapGrowth(memories, allInteractions, isLoading);

  const memoryCountMap = useMemo(
    () => buildMemoryCountMap(memories),
    [memories]
  );

  // Sort people: highest growth points first (most evolved garden plants first)
  const sortedPersons = useMemo(
    () =>
      [...persons].sort(
        (a, b) => getGrowthInfo(b.id).points - getGrowthInfo(a.id).points
      ),
    [persons, memories, allInteractions]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPersons(), refetchMemories(), refetchInteractions()]);
    setRefreshing(false);
  }, [refetchPersons, refetchMemories, refetchInteractions]);

  // Refetch data whenever this tab gains focus (e.g. after adding a person)
  useFocusEffect(
    useCallback(() => {
      refetchPersons();
      refetchMemories();
      refetchInteractions();
    }, [refetchPersons, refetchMemories, refetchInteractions])
  );

  // ─── Loading ────────────────────────────────────────────────────────────

  if (isLoading) {
    return <GardenSkeleton topPad={topPad} />;
  }

  // ─── Error ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        <ErrorState
          message="Couldn't load your garden. Check your connection and try again."
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <FadeIn className="flex-1 bg-cream">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.sage}
            colors={[colors.sage]}
          />
        }
      >
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <View
          style={{
            paddingTop: topPad,
            paddingHorizontal: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 30,
                color: colors.nearBlack,
                lineHeight: 36,
              }}
            >
              Your Garden
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: colors.warmGray,
                marginTop: 4,
              }}
            >
              {getGardenSubtitle(persons.length)}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/add")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.sage,
              alignItems: "center",
              justifyContent: "center",
              ...shadows.soft,
            }}
          >
            <Plus color={colors.white} size={20} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* ─── Empty State ───────────────────────────────────────────────── */}
        {persons.length === 0 && (
          <View style={{ paddingHorizontal: 24 }}>
            <EmptyState
              icon={Sprout}
              title="Your garden awaits"
              message="Plant your first seed by adding someone you care about."
              actionLabel="Plant a seed"
              onAction={() => router.push("/(tabs)/add")}
            />
          </View>
        )}

        {persons.length > 0 && (
          <>
            {/* ─── Living Garden Canopy ──────────────────────────────────── */}
            <View style={{ marginBottom: 28 }}>
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 16,
                  color: colors.nearBlack,
                  paddingHorizontal: 24,
                  marginBottom: 14,
                }}
              >
                Garden Canopy
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingRight: 40 }}
              >
                {sortedPersons.map((person, i) => (
                  <CanopyPlantCard
                    key={person.id}
                    person={person}
                    index={i}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ─── Divider ──────────────────────────────────────────────── */}
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginHorizontal: 24,
                marginBottom: 20,
              }}
            />

            {/* ─── All People ───────────────────────────────────────────── */}
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: colors.nearBlack,
                paddingHorizontal: 24,
                marginBottom: 12,
              }}
            >
              All People
            </Text>

            {sortedPersons.map((person, i) => (
              <PersonRow
                key={person.id}
                person={person}
                memoryCount={memoryCountMap[person.id] || 0}
                index={i}
              />
            ))}
          </>
        )}
      </ScrollView>
    </FadeIn>
  );
}
