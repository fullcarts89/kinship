/**
 * Weekly Garden Digest
 *
 * Replaces the Activity tab placeholder.
 * Shows a warm weekly roundup: memories captured, people tended,
 * and relationships that saw activity this week.
 *
 * Tone: calm reflection, never a productivity dashboard.
 * "Look how much you've grown your garden this week."
 */
import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { colors, fonts } from "@design/tokens";
import { usePersons, useMemories, useAllInteractions } from "@/hooks";
import { formatRelativeDate, formatMemoryDate, getMemoryDate, emotionEmojis, relationshipLabels } from "@/lib/formatters";
import { getGrowthInfo } from "@/lib/growthEngine";
import GrowthPlantIllustration from "@/components/GrowthPlantIllustration";
import { SmallGardenIllustration } from "@/components/illustrations";
import type { Memory, Interaction } from "@/types/database";
import { useCallback } from "react";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = colors.sage;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const sageDark = colors.moss;
const gold = colors.gold;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const borderClr = colors.border;

// ─── Helpers ────────────────────────────────────────────────────────────────

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isThisWeek(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < ONE_WEEK_MS;
}

function getWeekSummaryPhrase(memCount: number, interactionCount: number): string {
  const total = memCount + interactionCount;
  if (total === 0) return "Your garden is waiting for you";
  if (total >= 8) return "A rich week in your garden";
  if (total >= 4) return "Your garden is blooming";
  if (total >= 2) return "Your garden is growing";
  return "A quiet week of tending";
}

// ─── Memory Card ────────────────────────────────────────────────────────────

function DigestMemoryCard({ memory, personName }: { memory: Memory; personName: string }) {
  const emoji = memory.emotion ? emotionEmojis[memory.emotion] ?? "🌿" : "🌿";

  return (
    <Pressable
      onPress={() => router.push(`/memory/${memory.id}`)}
      style={{
        backgroundColor: white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: borderClr,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      {memory.photo_url ? (
        <Image
          source={{ uri: memory.photo_url }}
          style={{ height: 100, width: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[sagePale, sageLight + "55"]}
          style={{
            height: 52,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 22, opacity: 0.6 }}>{emoji}</Text>
        </LinearGradient>
      )}
      <View style={{ padding: 14 }}>
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 14,
            color: nearBlack,
            lineHeight: 20,
            marginBottom: 6,
          }}
          numberOfLines={2}
        >
          {memory.content}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: warmGray }}>
            with {personName}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: warmGray }}>
            {formatMemoryDate(getMemoryDate(memory))}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Interaction Row ─────────────────────────────────────────────────────────

const INTERACTION_EMOJI: Record<string, string> = {
  message: "💬",
  call: "📞",
  video: "📹",
  in_person: "🤝",
  gift: "🎁",
  letter: "✉️",
  social_media: "📱",
  check_in: "🌿",
  other: "💌",
};

function InteractionRow({
  interaction,
  personName,
}: {
  interaction: Interaction;
  personName: string;
}) {
  const emoji = INTERACTION_EMOJI[interaction.type] ?? "💌";

  return (
    <Pressable
      onPress={() => router.push(`/person/${interaction.person_id}`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: borderClr,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: sagePale,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: nearBlack }}>
          {personName}
        </Text>
        {interaction.note ? (
          <Text
            style={{ fontFamily: fonts.sans, fontSize: 12, color: warmGray, marginTop: 2 }}
            numberOfLines={1}
          >
            {interaction.note}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: warmGray }}>
        {formatRelativeDate(interaction.created_at)}
      </Text>
    </Pressable>
  );
}

// ─── Tended Plant Row ────────────────────────────────────────────────────────

function TendedPlantRow({
  personId,
  personName,
  activityCount,
}: {
  personId: string;
  personName: string;
  activityCount: number;
}) {
  const growth = getGrowthInfo(personId);

  return (
    <Pressable
      onPress={() => router.push(`/person/${personId}`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: borderClr,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: sagePale,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GrowthPlantIllustration stage={growth.stage} size={32} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: nearBlack }}>
          {personName}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: warmGray, marginTop: 2 }}>
          {growth.label} · {activityCount} {activityCount === 1 ? "moment" : "moments"} this week
        </Text>
      </View>
      <Text style={{ fontSize: 16 }}>🌱</Text>
    </Pressable>
  );
}

// ─── Empty Week State ────────────────────────────────────────────────────────

function EmptyWeekState() {
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 48,
        paddingHorizontal: 32,
      }}
    >
      <SmallGardenIllustration size={120} />
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 22,
          color: nearBlack,
          textAlign: "center",
          marginTop: 20,
          marginBottom: 10,
          lineHeight: 30,
        }}
      >
        Your garden is waiting
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 15,
          color: warmGray,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: 28,
        }}
      >
        Capture a memory or reach out to someone to see your week here.
      </Text>
      <Pressable
        onPress={() => router.push("/memory/add")}
        style={{
          backgroundColor: sage,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 28,
          shadowColor: sage,
          shadowOffset: { width: 0, height: 4 },
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
          Capture a moment
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { persons } = usePersons();
  const { memories, refetch: refetchMemories } = useMemories();
  const { interactions, refetch: refetchInteractions } = useAllInteractions();

  useFocusEffect(
    useCallback(() => {
      refetchMemories();
      refetchInteractions();
    }, [refetchMemories, refetchInteractions])
  );

  const personsMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons]
  );

  // Filter to this week (use occurred_at for memories)
  const weekMemories = useMemo(
    () => memories
      .filter((m) => isThisWeek(getMemoryDate(m)))
      .sort((a, b) => new Date(getMemoryDate(b)).getTime() - new Date(getMemoryDate(a)).getTime()),
    [memories]
  );

  const weekInteractions = useMemo(
    () => interactions.filter((i) => isThisWeek(i.created_at)),
    [interactions]
  );

  // People who had activity this week (deduplicated, with counts)
  const tendedPersons = useMemo(() => {
    const countMap = new Map<string, number>();
    weekMemories.forEach((m) => countMap.set(m.person_id, (countMap.get(m.person_id) ?? 0) + 1));
    weekInteractions.forEach((i) => countMap.set(i.person_id, (countMap.get(i.person_id) ?? 0) + 1));
    return Array.from(countMap.entries())
      .map(([id, count]) => ({ id, count, person: personsMap.get(id) }))
      .filter((e) => !!e.person)
      .sort((a, b) => b.count - a.count);
  }, [weekMemories, weekInteractions, personsMap]);

  const totalWeekActivity = weekMemories.length + weekInteractions.length;
  const summaryPhrase = getWeekSummaryPhrase(weekMemories.length, weekInteractions.length);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const dateRange = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24 }}>
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(400)} style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                color: warmGray,
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {dateRange}
            </Text>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 30,
                color: nearBlack,
                lineHeight: 36,
              }}
            >
              Your week in
            </Text>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 30,
                color: sage,
                lineHeight: 36,
              }}
            >
              the garden
            </Text>
            {totalWeekActivity > 0 && (
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: warmGray,
                  marginTop: 8,
                  lineHeight: 22,
                }}
              >
                {summaryPhrase}
              </Text>
            )}
          </Animated.View>

          {totalWeekActivity === 0 ? (
            <EmptyWeekState />
          ) : (
            <>
              {/* Week at a Glance */}
              <Animated.View entering={FadeInUp.delay(80).duration(400)} style={{ marginBottom: 28 }}>
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: white,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: borderClr,
                    paddingVertical: 16,
                  }}
                >
                  {[
                    { value: tendedPersons.length, label: tendedPersons.length === 1 ? "person\ntended" : "people\ntended" },
                    { value: weekMemories.length, label: weekMemories.length === 1 ? "memory\ncaptured" : "memories\ncaptured" },
                    { value: weekInteractions.length, label: weekInteractions.length === 1 ? "connection\nmade" : "connections\nmade" },
                  ].map((stat, i, arr) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        borderRightWidth: i < arr.length - 1 ? 1 : 0,
                        borderRightColor: borderClr,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.sansSemiBold,
                          fontSize: 26,
                          color: sage,
                          lineHeight: 30,
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
                          marginTop: 4,
                          lineHeight: 15,
                        }}
                      >
                        {stat.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>

              {/* Plants tended this week */}
              {tendedPersons.length > 0 && (
                <Animated.View entering={FadeInUp.delay(160).duration(400)} style={{ marginBottom: 28 }}>
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 20,
                      color: nearBlack,
                      marginBottom: 4,
                    }}
                  >
                    Plants you tended
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: warmGray,
                      marginBottom: 14,
                    }}
                  >
                    Relationships that saw care this week
                  </Text>
                  {tendedPersons.map((entry) => (
                    <TendedPlantRow
                      key={entry.id}
                      personId={entry.id}
                      personName={entry.person!.name}
                      activityCount={entry.count}
                    />
                  ))}
                </Animated.View>
              )}

              {/* Memories this week */}
              {weekMemories.length > 0 && (
                <Animated.View entering={FadeInUp.delay(240).duration(400)} style={{ marginBottom: 28 }}>
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 20,
                      color: nearBlack,
                      marginBottom: 4,
                    }}
                  >
                    Moments captured
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: warmGray,
                      marginBottom: 14,
                    }}
                  >
                    Moments from this week
                  </Text>
                  {weekMemories.map((memory) => {
                    const person = personsMap.get(memory.person_id);
                    return (
                      <DigestMemoryCard
                        key={memory.id}
                        memory={memory}
                        personName={person?.name ?? "Someone"}
                      />
                    );
                  })}
                </Animated.View>
              )}

              {/* Interactions this week */}
              {weekInteractions.length > 0 && (
                <Animated.View entering={FadeInUp.delay(320).duration(400)} style={{ marginBottom: 28 }}>
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 20,
                      color: nearBlack,
                      marginBottom: 4,
                    }}
                  >
                    Connections made
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: warmGray,
                      marginBottom: 14,
                    }}
                  >
                    Reach-outs and check-ins this week
                  </Text>
                  {weekInteractions.map((interaction) => {
                    const person = personsMap.get(interaction.person_id);
                    return (
                      <InteractionRow
                        key={interaction.id}
                        interaction={interaction}
                        personName={person?.name ?? "Someone"}
                      />
                    );
                  })}
                </Animated.View>
              )}

              {/* Warm closing line */}
              <Animated.View entering={FadeInUp.delay(400).duration(400)}>
                <View
                  style={{
                    backgroundColor: sagePale,
                    borderRadius: 16,
                    paddingVertical: 20,
                    paddingHorizontal: 20,
                    borderWidth: 1,
                    borderColor: sageLight,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 14,
                      color: sageDark,
                      textAlign: "center",
                      lineHeight: 21,
                    }}
                  >
                    Every moment you capture is a small act of love. Your garden noticed. 🌿
                  </Text>
                </View>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
