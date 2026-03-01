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
  recordReflectionGrowth,
  getTransitionToastMessage,
} from "@/lib/growthEngine";
import { showGrowthToast } from "@/components/ui/GrowthToast";
import { RestingPlantIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui";
import { colors, fonts } from "@design/tokens";
import type { Emotion } from "@/types";

// ─── Emoji → Emotion Mapping ──────────────────────────────────────────────

interface ReactionOption {
  emoji: string;
  emotion: Emotion;
  label: string;
}

const REACTIONS: ReactionOption[] = [
  { emoji: "\uD83D\uDE0A", emotion: "connected", label: "Connected" },
  { emoji: "\u2764\uFE0F", emotion: "loved", label: "Loved" },
  { emoji: "\uD83C\uDF31", emotion: "hopeful", label: "Hopeful" },
  { emoji: "\u2728", emotion: "inspired", label: "Inspired" },
  { emoji: "\uD83E\uDD17", emotion: "grateful", label: "Grateful" },
];

// ─── Screen ───────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // ─── Hooks (before any early returns) ───────────────────────────────────
  const { person, isLoading } = usePerson(id ?? "");
  const { createInteraction } = useCreateInteraction();

  // ─── Local state ────────────────────────────────────────────────────────
  const [selectedReaction, setSelectedReaction] =
    useState<ReactionOption | null>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

    const hasReaction = selectedReaction !== null;
    const hasNote = note.trim().length > 0;

    try {
      // Create a check_in interaction
      const created = await createInteraction({
        person_id: person.id,
        type: "check_in",
        emotion: selectedReaction?.emotion ?? null,
        note: note.trim() || null,
      });

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

    navigateBack();
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
              justifyContent: "center",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {REACTIONS.map((reaction) => {
              const isSelected =
                selectedReaction?.emotion === reaction.emotion;
              return (
                <Pressable
                  key={reaction.emotion}
                  onPress={() =>
                    setSelectedReaction(
                      isSelected ? null : reaction
                    )
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
                  <Text style={{ fontSize: 24 }}>{reaction.emoji}</Text>
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
