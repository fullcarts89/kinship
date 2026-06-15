/**
 * Season Retrospective
 *
 * Shown when a tending season's end date has passed. A warm look back
 * at what grew: the tended plants, what actually happened with each
 * person, and one quiet reflection paragraph (AI when available).
 *
 * Hard rules (SPEC_TENDING_SEASONS §3.5):
 * - Report only what HAPPENED — never what didn't.
 * - A person with no activity simply isn't listed. Never "0".
 * - If little happened, say less. Never manufacture positivity.
 *
 * Closes with the renewal choice: begin a new season, or rest.
 * "Gardens rest too."
 */
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Alert, Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { router, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { PressableScale, Skeleton } from "@/components/ui";
import { colors, fonts } from "@design/tokens";
import {
  usePersons,
  useMemories,
  useAllInteractions,
  useActiveSeason,
  usePersonGrowth,
} from "@/hooks";
import { generateSeasonReflection } from "@/lib/aiInsightService";
import { shareViewAsImage } from "@/lib/shareImage";
import LivingPlant from "@/components/LivingPlant";
import { SmallGardenIllustration } from "@/components/illustrations";
import type { Memory, Person, Season } from "@/types/database";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = colors.sage;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const sageDark = colors.moss;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const borderClr = colors.border;

// The season route group is registered elsewhere; typed routes pick these
// up once the files exist. Cast keeps tsc honest in the meantime.
const SEASON_NEW_HREF = "/season/new" as unknown as Href;

const FALLBACK_REFLECTION = "A season tended at your own pace.";

// ─── Helpers ────────────────────────────────────────────────────────────────

interface TendedPersonStats {
  person: Person;
  memoriesKept: number;
  momentsShared: number;
}

/** Warm line for a person — only ever called when something happened. */
function warmLineFor(stats: TendedPersonStats): string {
  const { person, memoriesKept, momentsShared } = stats;
  const mem =
    memoriesKept > 0
      ? `${memoriesKept} ${memoriesKept === 1 ? "memory" : "memories"} kept`
      : null;
  const mom =
    momentsShared > 0
      ? `${momentsShared} ${momentsShared === 1 ? "moment" : "moments"} shared`
      : null;
  const parts = [mem, mom].filter(Boolean);
  return `${parts.join(" and ")} with ${person.name}`;
}

function excerptOf(memory: Memory): string {
  return memory.content.length > 90
    ? `${memory.content.slice(0, 87).trimEnd()}…`
    : memory.content;
}

// ─── Tended Plant ───────────────────────────────────────────────────────────

function TendedPlant({ person }: { person: Person }) {
  const growth = usePersonGrowth(person.id);

  return (
    <View style={{ alignItems: "center", width: 68 }}>
      <LivingPlant stage={growth.stage} size={56} />
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 12,
          color: nearBlack,
          marginTop: 4,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {person.name}
      </Text>
    </View>
  );
}

// ─── Empty State (deep link / stale nav) ────────────────────────────────────

function NoSeasonState() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 32 }}>
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
        Nothing to look back on just yet
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
        When a tending season comes to its close, its story will be waiting here.
      </Text>
      <PressableScale
        onPress={() => router.replace("/(tabs)")}
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
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: white }}>
          Back to your garden
        </Text>
      </PressableScale>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SeasonRetrospectiveScreen() {
  const insets = useSafeAreaInsets();
  const { endedSeason, commitments, completeSeason, isLoading: seasonLoading } =
    useActiveSeason();
  const { persons } = usePersons();
  const { memories, isLoading: memoriesLoading } = useMemories();
  const { interactions, isLoading: interactionsLoading } = useAllInteractions();

  // Hold the season steady through completion — completeSeason refetches
  // and clears endedSeason a beat before router.replace lands, and we
  // don't want the retrospective to flash away mid-goodbye.
  const lastEndedRef = useRef<Season | null>(null);
  if (endedSeason) lastEndedRef.current = endedSeason;
  const season = endedSeason ?? lastEndedRef.current;

  const dataLoading = seasonLoading || memoriesLoading || interactionsLoading;

  const personsMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons]
  );

  // ── What happened, per tended person, within the season window ──
  const tendedStats = useMemo<TendedPersonStats[]>(() => {
    if (!season) return [];
    const start = new Date(season.starts_at).getTime();
    const end = new Date(season.ends_at).getTime();
    const inWindow = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= start && t <= end;
    };
    return commitments
      .map((c) => {
        const person = personsMap.get(c.person_id);
        if (!person) return null;
        const memoriesKept = memories.filter(
          (m) => m.person_id === c.person_id && inWindow(m.created_at)
        ).length;
        const momentsShared = interactions.filter(
          (i) => i.person_id === c.person_id && inWindow(i.created_at)
        ).length;
        return { person, memoriesKept, momentsShared };
      })
      .filter((s): s is TendedPersonStats => s !== null);
  }, [season, commitments, personsMap, memories, interactions]);

  // Only people where something actually happened get a line. A person
  // with nothing simply isn't listed — never "0".
  const happenedStats = useMemo(
    () => tendedStats.filter((s) => s.memoriesKept + s.momentsShared > 0),
    [tendedStats]
  );

  // Up to 3 short memory excerpts across tended people, from the window.
  const sampleMemories = useMemo<string[]>(() => {
    if (!season) return [];
    const start = new Date(season.starts_at).getTime();
    const end = new Date(season.ends_at).getTime();
    const tendedIds = new Set(commitments.map((c) => c.person_id));
    return memories
      .filter((m) => {
        const t = new Date(m.created_at).getTime();
        return tendedIds.has(m.person_id) && t >= start && t <= end;
      })
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 3)
      .map(excerptOf);
  }, [season, commitments, memories]);

  // ── AI reflection (one quiet paragraph, or the heuristic line) ──
  const [reflection, setReflection] = useState<string | null>(null);
  const [reflectionReady, setReflectionReady] = useState(false);
  const reflectionRequestedRef = useRef(false);

  useEffect(() => {
    if (!season || dataLoading || reflectionRequestedRef.current) return;
    reflectionRequestedRef.current = true;
    // Nothing happened all season → say less; never name the absence.
    if (happenedStats.length === 0) {
      setReflectionReady(true);
      return;
    }
    let cancelled = false;
    generateSeasonReflection({
      seasonName: season.name,
      people: happenedStats.map((s) => ({
        name: s.person.name,
        memoriesKept: s.memoriesKept,
        momentsShared: s.momentsShared,
      })),
      sampleMemories,
    }).then((text) => {
      if (cancelled) return;
      setReflection(text);
      setReflectionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [season, dataLoading, happenedStats, sampleMemories]);

  // ── Share card ──
  const cardRef = useRef<View>(null);

  const handleShare = useCallback(async () => {
    const result = await shareViewAsImage(cardRef, "Share this season");
    if (!result.success && result.error) {
      Alert.alert(
        "Couldn't share just yet",
        "Your season is safe and sound here — sharing didn't work this time."
      );
    }
  }, []);

  // ── Renewal ──
  const [closing, setClosing] = useState<"new" | "rest" | null>(null);

  const handleBeginNew = useCallback(async () => {
    const s = lastEndedRef.current;
    if (!s || closing) return;
    setClosing("new");
    try {
      await completeSeason(s.id);
      router.replace(SEASON_NEW_HREF);
    } catch {
      setClosing(null);
    }
  }, [closing, completeSeason]);

  const handleRest = useCallback(async () => {
    const s = lastEndedRef.current;
    if (!s || closing) return;
    setClosing("rest");
    try {
      await completeSeason(s.id);
      router.replace("/(tabs)");
    } catch {
      setClosing(null);
    }
  }, [closing, completeSeason]);

  const reflectionText = reflection ?? FALLBACK_REFLECTION;

  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24 }}>
          {/* Back */}
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)");
            }}
            hitSlop={12}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: white,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <ChevronLeft size={20} color={warmGray} />
          </Pressable>

          {dataLoading && !season ? (
            <View style={{ gap: 14 }}>
              <Skeleton width="70%" height={32} borderRadius={8} />
              <Skeleton width="50%" height={18} borderRadius={8} />
              <Skeleton width="100%" height={120} borderRadius={16} />
              <Skeleton width="100%" height={94} borderRadius={16} />
            </View>
          ) : !season ? (
            <NoSeasonState />
          ) : (
            <>
              {/* Capture-ready card: title → plants → warm lines → reflection */}
              <Animated.View entering={FadeInUp.duration(400)}>
                <View
                  ref={cardRef}
                  collapsable={false}
                  style={{
                    backgroundColor: cream,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: borderClr,
                    overflow: "hidden",
                    padding: 24,
                  }}
                >
                  {/* Header */}
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 30,
                      color: nearBlack,
                      lineHeight: 36,
                    }}
                  >
                    {season.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 15,
                      color: warmGray,
                      marginTop: 6,
                      lineHeight: 22,
                    }}
                  >
                    a look back at what grew
                  </Text>

                  {/* The tended plants */}
                  {tendedStats.length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 22,
                      }}
                    >
                      {tendedStats.map((s) => (
                        <TendedPlant key={s.person.id} person={s.person} />
                      ))}
                    </View>
                  )}

                  {/* Only what happened — never what didn't */}
                  {happenedStats.length > 0 && (
                    <View style={{ marginTop: 20, gap: 10 }}>
                      {happenedStats.map((s) => (
                        <View
                          key={s.person.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>🌿</Text>
                          <Text
                            style={{
                              flex: 1,
                              fontFamily: fonts.sansMedium,
                              fontSize: 14,
                              color: nearBlack,
                              lineHeight: 21,
                            }}
                          >
                            {warmLineFor(s)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* One quiet reflection */}
                  {reflectionReady && (
                    <View
                      style={{
                        backgroundColor: sagePale,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: sageLight,
                        paddingVertical: 18,
                        paddingHorizontal: 20,
                        marginTop: 22,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.serif,
                          fontStyle: "italic",
                          fontSize: 16,
                          color: sageDark,
                          lineHeight: 25,
                          textAlign: "center",
                        }}
                      >
                        {reflectionText}
                      </Text>
                    </View>
                  )}

                  {/* Footer */}
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      color: warmGray,
                      marginTop: 20,
                    }}
                  >
                    Kept in Kinship 🌱
                  </Text>
                </View>
              </Animated.View>

              {/* Share — outside the captured card */}
              <Animated.View
                entering={FadeInUp.delay(120).duration(400)}
                style={{ alignItems: "center", marginTop: 14 }}
              >
                <PressableScale
                  onPress={handleShare}
                  style={{
                    backgroundColor: white,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: borderClr,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansSemiBold,
                      fontSize: 14,
                      color: sageDark,
                    }}
                  >
                    Share this season
                  </Text>
                </PressableScale>
              </Animated.View>

              {/* Renewal */}
              <Animated.View
                entering={FadeInUp.delay(240).duration(400)}
                style={{ marginTop: 40, opacity: closing ? 0.6 : 1 }}
              >
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 22,
                    color: nearBlack,
                    textAlign: "center",
                    marginBottom: 20,
                    lineHeight: 28,
                  }}
                >
                  Begin a new season?
                </Text>

                <PressableScale
                  onPress={handleBeginNew}
                  style={{
                    backgroundColor: sage,
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: "center",
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
                    Begin a new season
                  </Text>
                </PressableScale>

                <PressableScale
                  onPress={handleRest}
                  style={{
                    backgroundColor: white,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: borderClr,
                    paddingVertical: 15,
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansSemiBold,
                      fontSize: 15,
                      color: nearBlack,
                    }}
                  >
                    Rest for now
                  </Text>
                </PressableScale>

                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    color: warmGray,
                    textAlign: "center",
                    marginTop: 10,
                    lineHeight: 19,
                  }}
                >
                  Gardens rest too.
                </Text>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
