/**
 * Post-Reach-Out Check-In Screen
 *
 * Shown after a user completes a reach-out. Gently asks how it went
 * with an emoji reaction row and optional one-line note.
 *
 * Saves a `check_in` interaction and awards +1 growth point
 * via the reflection path. Navigates back to the garden on completion.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePerson, useCreateInteraction } from "@/hooks";
import {
  emotionList,
  emotionEmojis,
  formatEmotionLabel,
} from "@/lib/formatters";
import {
  recordReflectionGrowth,
  getTransitionToastMessage,
} from "@/lib/growthEngine";
import { showGrowthToast } from "@/components/ui/GrowthToast";
import {
  requestNotificationPermissions,
  schedulePostReachOutCapturePrompt,
} from "@/lib/notificationService";
import { RestingPlantIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui";
import { colors, fonts } from "@design/tokens";
import type { Emotion } from "@/types";

// ─── Emoji → Emotion Mapping ──────────────────────────────────────────────

/**
 * Canonical emotion options \u2014 sourced from the app-wide taxonomy in
 * src/lib/formatters.ts so emoji and labels stay consistent everywhere.
 */
const REACTIONS: Emotion[] = emotionList;

// ─── Screen ───────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // ─── Hooks (before any early returns) ───────────────────────────────────
  const { person, isLoading } = usePerson(id ?? "");
  const { createInteraction } = useCreateInteraction();

  // ─── Local state ────────────────────────────────────────────────────────
  const [selectedEmotion, setSelectedEmotion] =
    useState<Emotion | null>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: colors.cream,
            paddingTop: insets.top,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Skeleton width={140} height={140} borderRadius={20} />
          <Skeleton
            width={220}
            height={28}
            borderRadius={8}
            className="mt-lg"
          />
        </View>
      </>
    );
  }

  // ─── Not found — navigate back gracefully ───────────────────────────────
  if (!person) {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/people");
    }
    return null;
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSaveAndReturn = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const hasReaction = selectedEmotion !== null;
    const hasNote = note.trim().length > 0;
    let saved = false;

    try {
      // Create a check_in interaction
      const created = await createInteraction({
        person_id: person.id,
        type: "check_in",
        emotion: selectedEmotion,
        note: note.trim() || null,
      });
      saved = created != null;

      // Only award growth if save succeeded AND user provided input
      if (created && (hasReaction || hasNote)) {
        const transition = recordReflectionGrowth(person.id);
        if (transition) {
          transition.personName = person.name;
          const toast = getTransitionToastMessage(transition);
          showGrowthToast(toast.text, toast.emoji);
        }
      }
    } catch {
      // Silent fail — the interaction is best-effort
    }

    if (!saved) {
      navigateBack();
      return;
    }

    // Gentle delayed nudge (~3h) to capture a memory while it's fresh.
    // Asking for permission here is intentional — it's the most
    // contextual moment. Fire-and-forget; the service caps cadence.
    const firstName = person.name.split(" ")[0];
    requestNotificationPermissions()
      .then((granted) => {
        if (granted) {
          return schedulePostReachOutCapturePrompt(person.id, firstName);
        }
      })
      .catch(() => {});

    // Brief, skippable choice — capture now, or be done
    setIsSaving(false);
    setIsSaved(true);
  };

  const handleCaptureMoment = () => {
    router.replace(`/memory/add?personId=${person.id}`);
  };

  const handleSkip = () => {
    navigateBack();
  };

  const navigateBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/people");
    }
  };

  // ─── Saved — brief, skippable bridge to memory capture ─────────────────

  if (isSaved) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: colors.cream,
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
            alignItems: "center",
          }}
        >
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ marginBottom: 28 }}>
              <RestingPlantIllustration size={140} />
            </View>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 28,
                color: colors.nearBlack,
                textAlign: "center",
                lineHeight: 36,
                marginBottom: 12,
                maxWidth: 300,
              }}
            >
              Tucked away
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 15,
                color: colors.warmGray,
                textAlign: "center",
                lineHeight: 22,
                maxWidth: 300,
              }}
            >
              If a moment with {person.name} feels worth keeping, now's a
              lovely time.
            </Text>
          </View>

          {/* Capture a moment — primary */}
          <Pressable
            onPress={handleCaptureMoment}
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: colors.sage,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              marginBottom: 14,
              shadowColor: colors.sage,
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
                color: colors.white,
              }}
            >
              Capture a memory from this
            </Text>
          </Pressable>

          {/* Done — secondary */}
          <Pressable onPress={navigateBack} style={{ padding: 12 }}>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 15,
                color: colors.warmGray,
              }}
            >
              Done
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.cream }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
            alignItems: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Illustration */}
          <View style={{ marginBottom: 28 }}>
            <RestingPlantIllustration size={140} />
          </View>

          {/* Headline */}
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 28,
              color: colors.nearBlack,
              textAlign: "center",
              lineHeight: 36,
              marginBottom: 32,
              maxWidth: 300,
            }}
          >
            How'd it go with {person.name}?
          </Text>

          {/* Emoji Reaction Row */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
              marginBottom: 28,
              maxWidth: 360,
            }}
          >
            {REACTIONS.map((emotion) => {
              const isSelected = selectedEmotion === emotion;
              return (
                <Pressable
                  key={emotion}
                  accessibilityLabel={formatEmotionLabel(emotion)}
                  onPress={() =>
                    setSelectedEmotion(isSelected ? null : emotion)
                  }
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: isSelected
                      ? colors.sage
                      : colors.border,
                    backgroundColor: isSelected
                      ? colors.sagePale
                      : colors.white,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>
                    {emotionEmojis[emotion]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Optional Note Input */}
          <TextInput
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              fontFamily: fonts.sans,
              fontSize: 16,
              color: colors.nearBlack,
              marginBottom: 32,
            }}
            placeholder="Anything worth remembering?"
            placeholderTextColor={colors.warmGray}
            value={note}
            onChangeText={setNote}
            maxLength={200}
            returnKeyType="done"
          />

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Save & Return Button */}
          <Pressable
            onPress={handleSaveAndReturn}
            disabled={isSaving}
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: colors.sage,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              marginBottom: 14,
              opacity: isSaving ? 0.6 : 1,
              shadowColor: colors.sage,
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
                color: colors.white,
              }}
            >
              {isSaving ? "Saving..." : "Save & Return"}
            </Text>
          </Pressable>

          {/* Skip */}
          <Pressable
            onPress={handleSkip}
            style={{ padding: 12 }}
          >
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 15,
                color: colors.warmGray,
              }}
            >
              Skip for now
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
