/**
 * Unified Capture Flow — 2-Screen Memory Capture
 *
 * S1 (step 0): Capture — person selector, text input, photo, emotion chips
 * S2 (step 1): Saved — GardenRevealIllustration, confirmation, back to garden
 *
 * Flow:
 * S1 → S2: Tap "Save to garden" → auto-classifies + saves
 * S2 → Garden: Tap "Back to garden"
 *
 * Auto-classification:
 * - Has photo OR text ≥ 140 chars → meaningful (+3 growth points)
 * - Text 1-139 chars, no photo     → simple    (+2 growth points)
 *
 * The user never sees these categories. They just capture.
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
} from "react-native-reanimated";
import {
  Camera,
  X,
  Check,
  Mic,
  ChevronDown,
  Calendar,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { usePersons, useCreateMemory } from "@/hooks";
import { PressableScale } from "@/components/ui";
import {
  GardenRevealIllustration,
  SeedIllustration,
} from "@/components/illustrations";
import {
  recordMemoryGrowth,
  getTransitionToastMessage,
} from "@/lib/growthEngine";
import { showGrowthToast } from "@/components/ui/GrowthToast";
import { emotionList, formatEmotionLabel, formatMemoryDate } from "@/lib/formatters";
import type { Person } from "@/types/database";
import type { Emotion } from "@/types";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const borderClr = colors.border;

// ─── Auto-Classification ────────────────────────────────────────────────────

function classifyCapture(
  content: string,
  hasPhoto: boolean,
  emotion: Emotion | null
): "meaningful" | "simple" {
  if (hasPhoto) return "meaningful";
  if (content.length >= 140) return "meaningful";
  if (emotion !== null) return "meaningful";
  return "simple";
}

// ─── Reflection Prompt ──────────────────────────────────────────────────────
// A gentle, optional nudge that appears once the entry has some substance.
// Purely inspirational — never required, never blocks saving.

const REFLECTION_QUESTIONS = [
  "What made this moment different?",
  "What did they do that you want to remember?",
  "What did it feel like right afterward?",
  "What do you want to remember about this in a year?",
  "What did they say that stuck with you?",
] as const;

const EMOTION_QUESTION_INDEX: Partial<Record<Emotion, number>> = {
  grateful: 1,
  loved: 1,
  joyful: 2,
  connected: 2,
  nostalgic: 3,
  peaceful: 3,
  curious: 4,
  inspired: 4,
  proud: 4,
  hopeful: 4,
};

function getReflectionQuestion(
  emotion: Emotion | null,
  personId: string | null,
  contentLength: number
): string {
  // Emotion-specific question when one is selected
  if (emotion) {
    const idx = EMOTION_QUESTION_INDEX[emotion];
    if (idx !== undefined) return REFLECTION_QUESTIONS[idx];
  }
  // Otherwise pick deterministically — person id hash keeps it stable
  // across renders; content-length bucket as a last resort.
  if (personId) {
    let hash = 0;
    for (let i = 0; i < personId.length; i++) {
      hash = (hash * 31 + personId.charCodeAt(i)) | 0;
    }
    return REFLECTION_QUESTIONS[Math.abs(hash) % REFLECTION_QUESTIONS.length];
  }
  return REFLECTION_QUESTIONS[
    Math.floor(contentLength / 80) % REFLECTION_QUESTIONS.length
  ];
}

// ─── Person Selector Modal ──────────────────────────────────────────────────

function PersonSelectorModal({
  visible,
  persons,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  persons: Person[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
        onPress={onClose}
      >
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 24,
            maxHeight: "60%",
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: borderClr,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 22,
              color: nearBlack,
              marginBottom: 16,
            }}
          >
            Who is this about?
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {persons.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  onSelect(p.id);
                  onClose();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 14,
                  marginBottom: 6,
                  backgroundColor:
                    selectedId === p.id ? sagePale : "transparent",
                  borderWidth: selectedId === p.id ? 1 : 0,
                  borderColor: sageLight,
                }}
              >
                {/* Avatar */}
                <LinearGradient
                  colors={[sageLight, sage]}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      color: white,
                      fontFamily: fonts.sansSemiBold,
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.sansMedium,
                    fontSize: 16,
                    color: nearBlack,
                  }}
                >
                  {p.name}
                </Text>
                {selectedId === p.id && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: sage,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={14} color={white} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Date Picker Modal ─────────────────────────────────────────────────────

function DatePickerModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Build last 30 days as "earlier" options
  const earlierDates: Date[] = [];
  for (let i = 2; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    earlierDates.push(d);
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
        onPress={onClose}
      >
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 24,
            maxHeight: "60%",
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: borderClr,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 22,
              color: nearBlack,
              marginBottom: 16,
            }}
          >
            When did this happen?
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Today */}
            <Pressable
              onPress={() => { onSelect(today); onClose(); }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: 14,
                marginBottom: 6,
                backgroundColor: isSameDay(selectedDate, today) ? sagePale : "transparent",
                borderWidth: isSameDay(selectedDate, today) ? 1 : 0,
                borderColor: sageLight,
              }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 16, color: nearBlack }}>
                Today
              </Text>
              {isSameDay(selectedDate, today) && (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: sage, alignItems: "center", justifyContent: "center" }}>
                  <Check size={14} color={white} />
                </View>
              )}
            </Pressable>

            {/* Yesterday */}
            <Pressable
              onPress={() => { onSelect(yesterday); onClose(); }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: 14,
                marginBottom: 6,
                backgroundColor: isSameDay(selectedDate, yesterday) ? sagePale : "transparent",
                borderWidth: isSameDay(selectedDate, yesterday) ? 1 : 0,
                borderColor: sageLight,
              }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 16, color: nearBlack }}>
                Yesterday
              </Text>
              {isSameDay(selectedDate, yesterday) && (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: sage, alignItems: "center", justifyContent: "center" }}>
                  <Check size={14} color={white} />
                </View>
              )}
            </Pressable>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: borderClr, marginVertical: 8 }} />

            {/* Earlier dates */}
            {earlierDates.map((d) => {
              const selected = isSameDay(selectedDate, d);
              return (
                <Pressable
                  key={d.toISOString()}
                  onPress={() => { onSelect(d); onClose(); }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 14,
                    marginBottom: 4,
                    backgroundColor: selected ? sagePale : "transparent",
                    borderWidth: selected ? 1 : 0,
                    borderColor: sageLight,
                  }}
                >
                  <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: nearBlack }}>
                    {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                  {selected && (
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: sage, alignItems: "center", justifyContent: "center" }}>
                      <Check size={14} color={white} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── S1: Capture ────────────────────────────────────────────────────────────

function S1_Capture({
  photoUri,
  person,
  content,
  selectedEmotion,
  occurredAt,
  onPickPhoto,
  onRemovePhoto,
  onOpenPersonSelector,
  onOpenDatePicker,
  onChangeContent,
  onSelectEmotion,
  onSave,
  onCancel,
  isSaving,
}: {
  photoUri: string | null;
  person: Person | null;
  content: string;
  selectedEmotion: Emotion | null;
  occurredAt: Date;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onOpenPersonSelector: () => void;
  onOpenDatePicker: () => void;
  onChangeContent: (v: string) => void;
  onSelectEmotion: (e: Emotion | null) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const canSave = !!person && content.trim().length > 0;

  return (
    <>
      {/* Header — X close */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Pressable onPress={onCancel} hitSlop={12}>
          <X size={24} color={nearBlack} />
        </Pressable>
      </View>

      {/* Scrollable content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Title ─────────────────────────────────────── */}
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 28,
              color: nearBlack,
              marginBottom: 24,
              lineHeight: 34,
            }}
          >
            Capture a moment
          </Text>

          {/* ── Person Selector ────────────────────────────── */}
          <Pressable
            onPress={onOpenPersonSelector}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: white,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: borderClr,
              marginBottom: 16,
            }}
          >
            {person ? (
              <>
                <LinearGradient
                  colors={[sageLight, sage]}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: white,
                      fontFamily: fonts.sansSemiBold,
                    }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.sansMedium,
                    fontSize: 15,
                    color: nearBlack,
                  }}
                >
                  {person.name}
                </Text>
              </>
            ) : (
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: warmGray,
                }}
              >
                Select a person
              </Text>
            )}
            <ChevronDown size={18} color={warmGray} />
          </Pressable>

          {/* ── Date Selector ───────────────────────────────── */}
          <Pressable
            onPress={onOpenDatePicker}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: white,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: borderClr,
              marginBottom: 16,
            }}
          >
            <Calendar size={18} color={sage} style={{ marginRight: 10 }} />
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.sansMedium,
                fontSize: 15,
                color: nearBlack,
              }}
            >
              {formatMemoryDate(occurredAt.toISOString())}
            </Text>
            <ChevronDown size={18} color={warmGray} />
          </Pressable>

          {/* ── Content Input ──────────────────────────────── */}
          <RNTextInput
            placeholder="What's on your mind?"
            placeholderTextColor={warmGray + "88"}
            value={content}
            onChangeText={onChangeContent}
            multiline
            textAlignVertical="top"
            style={{
              fontFamily: fonts.sans,
              fontSize: 16,
              color: nearBlack,
              backgroundColor: white,
              borderRadius: 14,
              padding: 16,
              paddingTop: 16,
              borderWidth: 1,
              borderColor: borderClr,
              minHeight: 120,
              marginBottom: 16,
              lineHeight: 24,
            }}
          />

          {/* ── Reflection Prompt — gentle, optional ───────── */}
          {content.length > 40 && (
            <Animated.Text
              entering={FadeIn.duration(500)}
              style={{
                fontFamily: fonts.sans,
                fontStyle: "italic",
                fontSize: 13,
                color: warmGray,
                lineHeight: 18,
                marginTop: -6,
                marginBottom: 16,
                paddingHorizontal: 4,
              }}
            >
              {getReflectionQuestion(
                selectedEmotion,
                person?.id ?? null,
                content.length
              )}
            </Animated.Text>
          )}

          {/* ── Photo / Voice Row ─────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {/* Photo button */}
            {photoUri ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: sagePale,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: sageLight,
                }}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    marginRight: 10,
                  }}
                  resizeMode="cover"
                />
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 13,
                    color: sage,
                    marginRight: 10,
                  }}
                >
                  Photo added
                </Text>
                <Pressable onPress={onRemovePhoto} hitSlop={8}>
                  <X size={16} color={warmGray} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={onPickPhoto}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: borderClr,
                  backgroundColor: white,
                }}
              >
                <Camera size={18} color={sage} />
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 13,
                    color: nearBlack,
                  }}
                >
                  Add photo
                </Text>
              </Pressable>
            )}

            {/* Voice button — disabled placeholder */}
            <Pressable
              disabled
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: borderClr,
                backgroundColor: white,
                opacity: 0.45,
              }}
            >
              <Mic size={18} color={warmGray} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: warmGray,
                }}
              >
                Voice
              </Text>
            </Pressable>
          </View>

          {/* ── Emotion Chips ─────────────────────────────── */}
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 16,
              color: nearBlack,
              marginBottom: 12,
            }}
          >
            How does this feel?
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 32,
            }}
          >
            {emotionList.map((emotion) => {
              const isSelected = selectedEmotion === emotion;
              return (
                <PressableScale
                  key={emotion}
                  onPress={() =>
                    onSelectEmotion(isSelected ? null : emotion)
                  }
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 100,
                    backgroundColor: isSelected ? sage : sagePale,
                    borderWidth: isSelected ? 0 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 14,
                      color: isSelected ? white : warmGray,
                    }}
                  >
                    {formatEmotionLabel(emotion)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* ── Save Button ───────────────────────────────── */}
          <PressableScale
            onPress={onSave}
            disabled={!canSave || isSaving}
            haptic={true}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              opacity: canSave && !isSaving ? 1 : 0.5,
            }}
          >
            <LinearGradient
              colors={[sage, sageDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 16,
                alignItems: "center",
                borderRadius: 16,
                shadowColor: sage,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 18,
                elevation: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 16,
                  color: white,
                }}
              >
                {isSaving ? "Saving..." : "Save to garden"}
              </Text>
            </LinearGradient>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── S2: Saved Confirmation ─────────────────────────────────────────────────

function S2_Saved({
  personName,
  onBackToGarden,
}: {
  personName: string;
  onBackToGarden: () => void;
}) {
  // Planting sequence:
  //   1. A small seed drops from above and lands with a tiny squash (0–610ms)
  //   2. The seed fades out as the garden grows in its place (620–1100ms)
  //   3. Text and CTA stagger in beneath (950–1500ms)
  const seedTranslateY = useSharedValue(-60);
  const seedScale = useSharedValue(1);
  const seedOpacity = useSharedValue(0);
  const gardenScale = useSharedValue(0.7);
  const gardenOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Seed drops in — accelerating, like gravity
    seedOpacity.value = withTiming(1, { duration: 120 });
    seedTranslateY.value = withTiming(0, {
      duration: 450,
      easing: Easing.in(Easing.quad),
    });

    // ...lands with a quick squash
    seedScale.value = withDelay(
      450,
      withSequence(
        withTiming(0.82, { duration: 80 }),
        withTiming(1.05, { duration: 80 }),
        withTiming(1, { duration: 70 })
      )
    );

    // 2. Seed fades away as the garden grows from where it landed
    seedOpacity.value = withDelay(650, withTiming(0, { duration: 280 }));
    gardenOpacity.value = withDelay(620, withTiming(1, { duration: 320 }));
    gardenScale.value = withDelay(
      620,
      withSpring(1, { damping: 12, stiffness: 140 })
    );
  }, []);

  const seedStyle = useAnimatedStyle(() => ({
    opacity: seedOpacity.value,
    transform: [
      { translateY: seedTranslateY.value },
      { scale: seedScale.value },
    ],
  }));

  const gardenStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gardenScale.value }],
    opacity: gardenOpacity.value,
  }));

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      {/* Seed drop + garden grow */}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ alignItems: "center" }, gardenStyle]}>
          <GardenRevealIllustration size={200} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute" }, seedStyle]}
        >
          <SeedIllustration size={36} />
        </Animated.View>
      </View>

      {/* Text content — staggers in after the garden grows */}
      <Animated.View
        entering={FadeInUp.delay(950).duration(400)}
        style={{ alignItems: "center", marginTop: 28, width: "100%" }}
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 24,
            color: nearBlack,
            textAlign: "center",
            lineHeight: 30,
            marginBottom: 8,
          }}
        >
          Saved to your garden
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 16,
            color: warmGray,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 36,
          }}
        >
          with {personName}
        </Text>
      </Animated.View>

      {/* CTA — last to arrive */}
      <Animated.View
        entering={FadeInUp.delay(1100).duration(400)}
        style={{ width: "100%" }}
      >
        <PressableScale
          onPress={onBackToGarden}
          style={{ width: "100%", borderRadius: 16, overflow: "hidden" }}
        >
          <LinearGradient
            colors={[sage, sageDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 15,
              alignItems: "center",
              borderRadius: 16,
              shadowColor: sage,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.27,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 15,
                color: white,
              }}
            >
              Back to garden
            </Text>
          </LinearGradient>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function AddMemoryScreen() {
  const { personId: preselectedPersonId } = useLocalSearchParams<{
    personId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { persons } = usePersons();
  const { createMemory, isCreating } = useCreateMemory();

  // ── State ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0); // 0=Capture, 1=Saved
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(
    preselectedPersonId ?? persons[0]?.id ?? null
  );
  const [content, setContent] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  const selectedPerson = personId
    ? persons.find((p) => p.id === personId) ?? null
    : null;

  // Default person selection when persons load
  useEffect(() => {
    if (!personId && persons.length > 0) {
      setPersonId(preselectedPersonId ?? persons[0].id);
    }
  }, [persons, personId, preselectedPersonId]);

  // ── Image Picker ──────────────────────────────────────────────────────
  // No permission request needed — PHPickerViewController (iOS 14+) runs
  // in its own process and shows ALL albums/folders regardless of the
  // app's photo-library permission status.
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "livePhotos"],
        quality: 0.8,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
        // Compatible mode ensures HEIF/iCloud photos from Memories get transcoded
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(
        "Couldn't open photos",
        "Please check that Kinship has permission to access your photo library in Settings."
      );
    }
  }, []);

  // ── Save Memory ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!personId) return;

    setIsSaving(true);
    try {
      const memoryContent = content.trim() || "A moment shared together";

      const created = await createMemory({
        person_id: personId,
        content: memoryContent,
        emotion: selectedEmotion,
        photo_url: photoUri ?? null,
        occurred_at: occurredAt.toISOString(),
      });

      // Only award growth and advance to success if save actually succeeded
      if (!created) {
        Alert.alert("Error", "Failed to save memory. Please try again.");
        return;
      }

      // Record growth — meaningful gets +3, simple gets +2
      const transition = recordMemoryGrowth(personId, {
        emotion: selectedEmotion,
        content: memoryContent,
      });
      if (transition && selectedPerson) {
        transition.personName = selectedPerson.name;
        const toast = getTransitionToastMessage(transition);
        showGrowthToast(toast.text, toast.emoji);
      }

      setStep(1); // Show saved confirmation
    } catch (err: any) {
      const msg = err?.message ?? (typeof err === "string" ? err : "Something went wrong. Please try again.");
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false);
    }
  }, [personId, content, photoUri, selectedEmotion, createMemory, selectedPerson]);

  const handleBackToGarden = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flex: 1,
          backgroundColor: cream,
          paddingTop: insets.top,
          paddingBottom: step === 0 ? 0 : insets.bottom,
        }}
      >
        {step === 0 && (
          <S1_Capture
            photoUri={photoUri}
            person={selectedPerson}
            content={content}
            selectedEmotion={selectedEmotion}
            occurredAt={occurredAt}
            onPickPhoto={pickImage}
            onRemovePhoto={() => setPhotoUri(null)}
            onOpenPersonSelector={() => setShowPersonModal(true)}
            onOpenDatePicker={() => setShowDateModal(true)}
            onChangeContent={setContent}
            onSelectEmotion={setSelectedEmotion}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        )}

        {step === 1 && (
          <S2_Saved
            personName={selectedPerson?.name ?? "them"}
            onBackToGarden={handleBackToGarden}
          />
        )}
      </View>

      {/* Person selector modal */}
      <PersonSelectorModal
        visible={showPersonModal}
        persons={persons}
        selectedId={personId}
        onSelect={setPersonId}
        onClose={() => setShowPersonModal(false)}
      />

      {/* Date picker modal */}
      <DatePickerModal
        visible={showDateModal}
        selectedDate={occurredAt}
        onSelect={setOccurredAt}
        onClose={() => setShowDateModal(false)}
      />
    </>
  );
}
