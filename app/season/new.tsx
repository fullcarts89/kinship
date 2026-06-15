/**
 * Begin a Season — choose up to five people to intentionally tend
 * for the coming months, each with a gentle rhythm.
 *
 * One screen, three internal steps (state-machine pattern like
 * onboarding, with direction-aware slide transitions):
 *   1. who    — multi-select up to MAX_TENDED_PEOPLE from the garden
 *   2. rhythm — per person, three human-labeled rhythm chips
 *   3. plant  — confirmation bed + opt-in calendar echo, then a
 *               quiet success moment
 *
 * Brand rules honored here (docs/SPEC_TENDING_SEASONS.md §3.3, §3.5):
 * numeric cadences are NEVER rendered — only RHYTHM_LABELS and
 * RHYTHM_DESCRIPTIONS; calendar echoes are off by default; nothing
 * here is framed as an obligation.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { Check, ChevronLeft, X, Sprout } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radii, shadows } from "@design/tokens";
import { PressableScale } from "@/components/ui";
import { usePersons, usePersonGrowth } from "@/hooks";
import { useActiveSeason, type BeginSeasonEntry } from "@/hooks/useSeason";
import {
  MAX_TENDED_PEOPLE,
  RHYTHM_LABELS,
  RHYTHM_DESCRIPTIONS,
  seasonNameFor,
} from "@/lib/seasonEngine";
import { writeSeasonEchoes } from "@/lib/seasonCalendar";
import LivingPlant from "@/components/LivingPlant";
import type { Person, SeasonCommitment, TendingRhythm } from "@/types/database";

// ─── Local token aliases ────────────────────────────────────────────────────

const sage = colors.sage;
const moss = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const borderClr = colors.border;

const RHYTHMS: TendingRhythm[] = ["often", "regularly", "now_and_then"];

// ─── Step machine ───────────────────────────────────────────────────────────

type SeasonStep = "who" | "rhythm" | "plant" | "planted";

const STEP_ORDER: Record<SeasonStep, number> = {
  who: 0,
  rhythm: 1,
  plant: 2,
  planted: 3,
};

const STEP_DURATION = 350;
const stepEasing = Easing.out(Easing.cubic);

/** Direction-aware slide pair, mirroring onboarding's step transitions. */
function stepTransition(direction: "forward" | "backward") {
  if (direction === "backward") {
    return {
      entering: SlideInLeft.duration(STEP_DURATION).easing(stepEasing),
      exiting: SlideOutRight.duration(STEP_DURATION).easing(stepEasing),
    };
  }
  return {
    entering: SlideInRight.duration(STEP_DURATION).easing(stepEasing),
    exiting: SlideOutLeft.duration(STEP_DURATION).easing(stepEasing),
  };
}

// ─── Shared bits ────────────────────────────────────────────────────────────

function PersonAvatar({ person, size = 44 }: { person: Person; size?: number }) {
  return (
    <LinearGradient
      colors={[sageLight, sage]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size * 0.4,
          color: white,
          fontFamily: fonts.sansSemiBold,
        }}
      >
        {person.name.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      haptic
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: disabled ? sageLight : sage,
        borderRadius: radii.lg,
        paddingVertical: 17,
        alignItems: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 16, color: white }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** One tended person's living plant, sized for the confirmation bed. */
function BedPlant({ person, size = 56 }: { person: Person; size?: number }) {
  const growth = usePersonGrowth(person.id);
  return (
    <View style={{ alignItems: "center", width: size + 12 }}>
      <LivingPlant stage={growth.stage} size={size} />
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 11,
          color: warmGray,
          marginTop: 4,
          maxWidth: size + 12,
        }}
      >
        {person.name.split(" ")[0]}
      </Text>
    </View>
  );
}

// ─── Step 1: Who are you tending? ───────────────────────────────────────────

const RELATIONSHIP_COLORS: Record<string, { bg: string; text: string }> = {
  friend: { bg: sagePale, text: moss },
  family: { bg: colors.goldPale, text: "#B88A30" },
  partner: { bg: colors.lavender + "33", text: "#7B6EC0" },
  colleague: { bg: colors.sky + "33", text: "#4A8BAD" },
  mentor: { bg: colors.peach + "33", text: "#9E5A3A" },
  acquaintance: { bg: "#F0EBE3", text: warmGray },
  neighbor: { bg: sagePale, text: moss },
  other: { bg: "#F0EBE3", text: warmGray },
};

function SelectablePersonRow({
  person,
  selected,
  onToggle,
}: {
  person: Person;
  selected: boolean;
  onToggle: () => void;
}) {
  const relColors =
    RELATIONSHIP_COLORS[person.relationship_type] || RELATIONSHIP_COLORS.other;
  const relLabel =
    person.relationship_type.charAt(0).toUpperCase() +
    person.relationship_type.slice(1);

  return (
    <PressableScale
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: selected ? sagePale : white,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? sage : borderClr,
      }}
    >
      <View style={{ marginRight: 14 }}>
        <PersonAvatar person={person} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 16,
            color: nearBlack,
            marginBottom: 3,
          }}
        >
          {person.name}
        </Text>
        <View
          style={{
            alignSelf: "flex-start",
            paddingVertical: 2,
            paddingHorizontal: 8,
            borderRadius: 100,
            backgroundColor: relColors.bg,
          }}
        >
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: relColors.text }}>
            {relLabel}
          </Text>
        </View>
      </View>

      {/* Selection mark */}
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? sage : "transparent",
          borderWidth: selected ? 0 : 1.5,
          borderColor: borderClr,
        }}
      >
        {selected && <Check size={15} strokeWidth={2.5} color={white} />}
      </View>
    </PressableScale>
  );
}

function WhoStep({
  persons,
  selectedIds,
  onToggle,
  onContinue,
  bottomInset,
}: {
  persons: Person[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
  bottomInset: number;
}) {
  const atCap = selectedIds.length >= MAX_TENDED_PEOPLE;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 27,
            lineHeight: 34,
            color: nearBlack,
            marginBottom: 8,
          }}
        >
          Who are you tending this season?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            lineHeight: 21,
            color: warmGray,
          }}
        >
          Choose up to five people to intentionally invest in — a small bed,
          deeply tended.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {persons.map((person, index) => (
          <Animated.View
            key={person.id}
            entering={FadeInUp.delay(Math.min(index, 12) * 30).duration(250)}
          >
            <SelectablePersonRow
              person={person}
              selected={selectedIds.includes(person.id)}
              onToggle={() => onToggle(person.id)}
            />
          </Animated.View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: bottomInset + 16 }}>
        {atCap && (
          <Animated.Text
            entering={FadeIn.duration(250)}
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: moss,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Five is plenty — small beds grow deepest
          </Animated.Text>
        )}
        <PrimaryButton
          label="Continue"
          onPress={onContinue}
          disabled={selectedIds.length === 0}
        />
      </View>
    </View>
  );
}

/** Quiet empty state when the garden has no one in it yet. */
function EmptyGarden({ bottomInset }: { bottomInset: number }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingBottom: bottomInset + 24,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: sagePale,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Sprout color={sage} size={32} strokeWidth={1.6} />
      </View>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 22,
          color: nearBlack,
          textAlign: "center",
          lineHeight: 28,
          marginBottom: 8,
        }}
      >
        Your garden is quiet
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          color: warmGray,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: 28,
          maxWidth: 260,
        }}
      >
        Plant a few people in your garden first — then a season can begin.
      </Text>
      <PressableScale
        onPress={() => router.replace("/(tabs)/add")}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 18,
          backgroundColor: sage,
        }}
      >
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: white }}>
          Add someone
        </Text>
      </PressableScale>
    </View>
  );
}

// ─── Step 2: How often feels right? ─────────────────────────────────────────

function RhythmCard({
  person,
  rhythm,
  onChange,
}: {
  person: Person;
  rhythm: TendingRhythm;
  onChange: (rhythm: TendingRhythm) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: white,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: borderClr,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <View style={{ marginRight: 12 }}>
          <PersonAvatar person={person} size={36} />
        </View>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: nearBlack }}>
          {person.name}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {RHYTHMS.map((r) => {
          const active = r === rhythm;
          return (
            <PressableScale
              key={r}
              onPress={() => onChange(r)}
              style={{
                borderRadius: 14,
                borderWidth: active ? 1.5 : 1,
                borderColor: active ? sage : borderClr,
                backgroundColor: active ? sagePale : white,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 14,
                  color: active ? moss : nearBlack,
                  marginBottom: 2,
                }}
              >
                {RHYTHM_LABELS[r]}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  lineHeight: 17,
                  color: warmGray,
                }}
              >
                {RHYTHM_DESCRIPTIONS[r]}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

function RhythmStep({
  selectedPersons,
  rhythms,
  onChangeRhythm,
  onContinue,
  bottomInset,
}: {
  selectedPersons: Person[];
  rhythms: Record<string, TendingRhythm>;
  onChangeRhythm: (personId: string, rhythm: TendingRhythm) => void;
  onContinue: () => void;
  bottomInset: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 27,
            lineHeight: 34,
            color: nearBlack,
            marginBottom: 8,
          }}
        >
          How often feels right?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            lineHeight: 21,
            color: warmGray,
          }}
        >
          A soft rhythm for each person — a feel, not a schedule.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {selectedPersons.map((person, index) => (
          <Animated.View
            key={person.id}
            entering={FadeInUp.delay(index * 50).duration(250)}
          >
            <RhythmCard
              person={person}
              rhythm={rhythms[person.id] ?? "regularly"}
              onChange={(r) => onChangeRhythm(person.id, r)}
            />
          </Animated.View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: bottomInset + 16 }}>
        <PrimaryButton label="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}

// ─── Step 3: Confirmation ───────────────────────────────────────────────────

function PlantStep({
  selectedPersons,
  echoToCalendar,
  onToggleEcho,
  onConfirm,
  isPlanting,
  bottomInset,
}: {
  selectedPersons: Person[];
  echoToCalendar: boolean;
  onToggleEcho: (value: boolean) => void;
  onConfirm: () => void;
  isPlanting: boolean;
  bottomInset: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 27,
            lineHeight: 34,
            color: nearBlack,
            marginBottom: 8,
          }}
        >
          Your {seasonNameFor()} bed
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            lineHeight: 21,
            color: warmGray,
            marginBottom: 24,
          }}
        >
          These are the people you'll be tending for the coming months.
        </Text>

        {/* The bed: chosen plants in a row */}
        <Animated.View
          entering={FadeInUp.duration(350)}
          style={{
            backgroundColor: white,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: borderClr,
            paddingVertical: 24,
            paddingHorizontal: 12,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 6,
            marginBottom: 20,
            ...shadows.card,
          }}
        >
          {selectedPersons.map((person) => (
            <BedPlant key={person.id} person={person} size={56} />
          ))}
        </Animated.View>

        {/* Opt-in calendar echo — off by default, never a time block */}
        <View
          style={{
            backgroundColor: white,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: borderClr,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 15,
                color: nearBlack,
                marginBottom: 3,
              }}
            >
              Echo to my calendar
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                lineHeight: 17,
                color: warmGray,
              }}
            >
              One gentle all-day note per rhythm — never a time block
            </Text>
          </View>
          <Switch
            value={echoToCalendar}
            onValueChange={onToggleEcho}
            trackColor={{ false: borderClr, true: sageLight }}
            thumbColor={echoToCalendar ? sage : white}
          />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: bottomInset + 16 }}>
        <PrimaryButton
          label={isPlanting ? "Planting..." : "Plant my season"}
          onPress={onConfirm}
          disabled={isPlanting}
        />
      </View>
    </View>
  );
}

// ─── Success moment ─────────────────────────────────────────────────────────

function PlantedMoment({ selectedPersons }: { selectedPersons: Person[] }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      <Animated.View
        entering={FadeInUp.duration(450).easing(stepEasing)}
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 6,
          marginBottom: 28,
        }}
      >
        {selectedPersons.map((person) => (
          <BedPlant key={person.id} person={person} size={56} />
        ))}
      </Animated.View>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(450).easing(stepEasing)}
        style={{
          fontFamily: fonts.serif,
          fontSize: 28,
          lineHeight: 36,
          color: nearBlack,
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        Your {seasonNameFor()} bed is planted.
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(380).duration(450).easing(stepEasing)}
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          lineHeight: 21,
          color: warmGray,
          textAlign: "center",
        }}
      >
        Tend it at your own pace — it grows with every moment you share.
      </Animated.Text>
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function NewSeasonScreen() {
  const insets = useSafeAreaInsets();
  const { persons } = usePersons();
  const { beginSeason } = useActiveSeason();

  const [step, setStep] = useState<SeasonStep>("who");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rhythms, setRhythms] = useState<Record<string, TendingRhythm>>({});
  const [echoToCalendar, setEchoToCalendar] = useState(false);
  const [isPlanting, setIsPlanting] = useState(false);

  const selectedPersons = selectedIds
    .map((id) => persons.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p));

  // Track step direction so transitions know which way to slide.
  const prevIndexRef = useRef(STEP_ORDER[step]);
  const stepIndex = STEP_ORDER[step];
  const direction = stepIndex >= prevIndexRef.current ? "forward" : "backward";
  useEffect(() => {
    prevIndexRef.current = stepIndex;
  }, [stepIndex]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  const handleBack = useCallback(() => {
    if (step === "rhythm") setStep("who");
    else if (step === "plant") setStep("rhythm");
    else handleClose();
  }, [step, handleClose]);

  const handleTogglePerson = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // The cap is a quiet wall: tapping a sixth person does nothing.
      if (prev.length >= MAX_TENDED_PEOPLE) return prev;
      return [...prev, id];
    });
  }, []);

  const handleChangeRhythm = useCallback((personId: string, rhythm: TendingRhythm) => {
    setRhythms((prev) => ({ ...prev, [personId]: rhythm }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (isPlanting || selectedIds.length === 0) return;
    setIsPlanting(true);
    const entries: BeginSeasonEntry[] = selectedIds.map((person_id) => ({
      person_id,
      rhythm: rhythms[person_id] ?? "regularly",
    }));
    try {
      const season = await beginSeason(entries);
      if (!season) return;

      // Opt-in calendar echoes — fire and forget; commitments are built
      // locally from the entries since writeSeasonEchoes only reads
      // person_id/rhythm and the season's dates.
      if (echoToCalendar) {
        const commitments: SeasonCommitment[] = entries.map((e, i) => ({
          id: `echo-${season.id}-${i}`,
          season_id: season.id,
          user_id: season.user_id,
          person_id: e.person_id,
          rhythm: e.rhythm,
          created_at: season.created_at,
        }));
        writeSeasonEchoes(season, commitments, persons).catch(() => {});
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStep("planted");
    } finally {
      setIsPlanting(false);
    }
  }, [isPlanting, selectedIds, rhythms, beginSeason, echoToCalendar, persons]);

  // Let the success moment breathe, then return home.
  useEffect(() => {
    if (step !== "planted") return;
    const timer = setTimeout(() => router.replace("/(tabs)"), 2600);
    return () => clearTimeout(timer);
  }, [step]);

  let content: React.ReactNode = null;
  switch (step) {
    case "who":
      content =
        persons.length === 0 ? (
          <EmptyGarden bottomInset={insets.bottom} />
        ) : (
          <WhoStep
            persons={persons}
            selectedIds={selectedIds}
            onToggle={handleTogglePerson}
            onContinue={() => setStep("rhythm")}
            bottomInset={insets.bottom}
          />
        );
      break;
    case "rhythm":
      content = (
        <RhythmStep
          selectedPersons={selectedPersons}
          rhythms={rhythms}
          onChangeRhythm={handleChangeRhythm}
          onContinue={() => setStep("plant")}
          bottomInset={insets.bottom}
        />
      );
      break;
    case "plant":
      content = (
        <PlantStep
          selectedPersons={selectedPersons}
          echoToCalendar={echoToCalendar}
          onToggleEcho={setEchoToCalendar}
          onConfirm={handleConfirm}
          isPlanting={isPlanting}
          bottomInset={insets.bottom}
        />
      );
      break;
    case "planted":
      content = <PlantedMoment selectedPersons={selectedPersons} />;
      break;
  }

  const { entering, exiting } = stepTransition(direction);

  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      {/* Header: back chevron + close — hidden during the success moment */}
      {step !== "planted" && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          <PressableScale
            onPress={handleBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: radii.full,
              backgroundColor: white,
              alignItems: "center",
              justifyContent: "center",
              ...shadows.soft,
            }}
          >
            <ChevronLeft size={20} color={warmGray} />
          </PressableScale>
          <PressableScale
            onPress={handleClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: radii.full,
              backgroundColor: white,
              alignItems: "center",
              justifyContent: "center",
              ...shadows.soft,
            }}
          >
            <X size={18} color={warmGray} />
          </PressableScale>
        </View>
      )}

      <Animated.View key={step} entering={entering} exiting={exiting} style={{ flex: 1 }}>
        {content}
      </Animated.View>
    </View>
  );
}
