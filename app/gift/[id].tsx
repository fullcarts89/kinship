/**
 * Log a Gift — record a gift the user gave to, or received from, a person.
 *
 * Captures the direction (gave/received), what it was, an optional occasion,
 * and an optional note. Gifts live on the person's timeline and help the user
 * remember what was exchanged and reciprocate thoughtfully. Logging a gift is
 * a real act of care, so it grows the plant (+2).
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { X, Gift as GiftIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radii, shadows } from "@design/tokens";
import { PressableScale } from "@/components/ui";
import { usePerson, useCreateGift } from "@/hooks";
import {
  recordGiftGrowth,
  getTransitionToastMessage,
} from "@/lib/growthEngine";
import { showGrowthToast } from "@/components/ui/GrowthToast";
import type { GiftDirection } from "@/types";

// Common occasions, in display order. Optional — none can be selected.
const OCCASIONS = ["Wedding", "Birthday", "Holiday", "Just because", "Other"];

export default function LogGiftScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person } = usePerson(id);
  const { createGift, isCreating } = useCreateGift();
  const [direction, setDirection] = useState<GiftDirection>("given");
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const firstName = person?.name.split(" ")[0] ?? "them";

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || !person) return;
    try {
      await createGift({
        person_id: person.id,
        title: trimmed,
        direction,
        occasion,
        note: note.trim() || null,
      });
      const transition = recordGiftGrowth(person.id);
      if (transition) {
        transition.personName = person.name;
        const toast = getTransitionToastMessage(transition);
        showGrowthToast(toast.text, toast.emoji);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // Saved locally at worst — never trap the user in a quick flow.
    }
    handleClose();
  }, [title, direction, occasion, note, person, createGift, handleClose]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 24,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Close */}
          <PressableScale
            onPress={handleClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: radii.full,
              backgroundColor: colors.white,
              alignItems: "center",
              justifyContent: "center",
              ...shadows.soft,
              marginBottom: 20,
            }}
          >
            <X size={20} color={colors.warmGray} />
          </PressableScale>

          <Animated.View entering={FadeInUp.duration(300)}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <GiftIcon size={18} color={colors.sage} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: colors.sage,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Log a gift
              </Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 26,
                lineHeight: 33,
                color: colors.nearBlack,
                marginBottom: 20,
              }}
            >
              A gift between you and {firstName}
            </Text>
          </Animated.View>

          {/* Direction toggle */}
          <Animated.View
            entering={FadeInUp.delay(60).duration(300)}
            style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}
          >
            {([
              { value: "given" as GiftDirection, label: "I gave" },
              { value: "received" as GiftDirection, label: "I received" },
            ]).map((opt) => {
              const active = opt.value === direction;
              return (
                <PressableScale
                  key={opt.value}
                  onPress={() => setDirection(opt.value)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    backgroundColor: active ? colors.sage : colors.white,
                    borderWidth: 1.5,
                    borderColor: active ? colors.sage : colors.border,
                    borderRadius: radii.lg,
                    paddingVertical: 14,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansSemiBold,
                      fontSize: 15,
                      color: active ? colors.white : colors.warmGray,
                    }}
                  >
                    {opt.label}
                  </Text>
                </PressableScale>
              );
            })}
          </Animated.View>

          {/* What was the gift */}
          <Animated.View entering={FadeInUp.delay(120).duration(300)}>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: colors.warmGray,
                marginBottom: 8,
              }}
            >
              What was it?
            </Text>
            <RNTextInput
              autoFocus
              value={title}
              onChangeText={setTitle}
              placeholder="A stand mixer, a handwritten letter..."
              placeholderTextColor={colors.warmGray}
              style={{
                backgroundColor: colors.white,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: radii.lg,
                paddingHorizontal: 18,
                paddingVertical: 14,
                fontFamily: fonts.sans,
                fontSize: 16,
                color: colors.nearBlack,
                marginBottom: 20,
              }}
            />
          </Animated.View>

          {/* Occasion chips */}
          <Animated.View entering={FadeInUp.delay(180).duration(300)}>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: colors.warmGray,
                marginBottom: 8,
              }}
            >
              Occasion (optional)
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {OCCASIONS.map((o) => {
                const active = o === occasion;
                return (
                  <PressableScale
                    key={o}
                    onPress={() => setOccasion(active ? null : o)}
                    style={{
                      backgroundColor: active ? colors.sage : colors.white,
                      borderWidth: 1.5,
                      borderColor: active ? colors.sage : colors.border,
                      borderRadius: 100,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: 13,
                        color: active ? colors.white : colors.warmGray,
                      }}
                    >
                      {o}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>

          {/* Optional note */}
          <Animated.View entering={FadeInUp.delay(240).duration(300)} style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: colors.warmGray,
                marginBottom: 8,
              }}
            >
              Note (optional)
            </Text>
            <RNTextInput
              multiline
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
              placeholder="They loved it / a thank-you to remember..."
              placeholderTextColor={colors.warmGray}
              style={{
                backgroundColor: colors.white,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: radii.lg,
                paddingHorizontal: 18,
                paddingVertical: 14,
                fontFamily: fonts.sans,
                fontSize: 16,
                lineHeight: 23,
                color: colors.nearBlack,
                minHeight: 90,
                marginBottom: 20,
              }}
            />
          </Animated.View>

          <PressableScale
            haptic
            disabled={!title.trim() || isCreating}
            onPress={handleSave}
            style={{
              backgroundColor: title.trim() ? colors.sage : colors.sageLight,
              borderRadius: radii.lg,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: colors.white,
              }}
            >
              {isCreating ? "Saving..." : "Save gift"}
            </Text>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
