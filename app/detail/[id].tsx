/**
 * Remember a Detail — capture a structured fact about a person.
 *
 * A close cousin of Quick Note, but for the durable facts of a relationship:
 * hometown, favorite things, family, important dates, preferences. The user
 * picks a category, types the detail, and saves. Details live on the person
 * (as a categorized entry in `notes`) and group into a "Things I know" card.
 *
 * Unlike a free-form quick note, a remembered detail grows the plant a little
 * (+1) — noticing what matters is itself a form of tending.
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
import { X, Lightbulb } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radii, shadows } from "@design/tokens";
import { PressableScale } from "@/components/ui";
import { usePerson, useUpdatePerson } from "@/hooks";
import {
  recordNoteGrowth,
  getTransitionToastMessage,
} from "@/lib/growthEngine";
import { showGrowthToast } from "@/components/ui/GrowthToast";
import type { NoteCategory } from "@/types";

// Categories the user can tag a detail with, in display order.
const CATEGORIES: { value: NoteCategory; label: string }[] = [
  { value: "hometown", label: "Hometown" },
  { value: "favorite", label: "Favorite" },
  { value: "family", label: "Family" },
  { value: "important_date", label: "Important date" },
  { value: "preference", label: "Preference" },
  { value: "other", label: "Other" },
];

// A gentle, category-specific placeholder for the input.
const PLACEHOLDERS: Record<NoteCategory, string> = {
  hometown: "Grew up in Asheville, NC",
  favorite: "Favorite food is Thai green curry",
  family: "Has two younger sisters, Mia and Jo",
  important_date: "Work anniversary is in October",
  preference: "Prefers tea over coffee",
  other: "Something worth holding onto",
};

export default function RememberDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person } = usePerson(id);
  const { updatePerson, isUpdating } = useUpdatePerson();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<NoteCategory>("other");

  const firstName = person?.name.split(" ")[0] ?? "them";

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !person) return;
    try {
      await updatePerson(person.id, {
        notes: [
          ...(person.notes ?? []),
          { text: trimmed, category, created_at: new Date().toISOString() },
        ],
      });
      // A remembered detail grows the plant a little.
      const transition = recordNoteGrowth(person.id);
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
  }, [text, category, person, updatePerson, handleClose]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 24,
          }}
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
              <Lightbulb size={18} color={colors.sage} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: colors.sage,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Remember a detail
              </Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 26,
                lineHeight: 33,
                color: colors.nearBlack,
                marginBottom: 16,
              }}
            >
              What do you want to remember about {firstName}?
            </Text>
          </Animated.View>

          {/* Category chips */}
          <Animated.View entering={FadeInUp.delay(60).duration(300)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              style={{ marginBottom: 16, flexGrow: 0 }}
            >
              {CATEGORIES.map((c) => {
                const active = c.value === category;
                return (
                  <PressableScale
                    key={c.value}
                    onPress={() => setCategory(c.value)}
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
                      {c.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(300)} style={{ flex: 1 }}>
            <RNTextInput
              autoFocus
              multiline
              textAlignVertical="top"
              value={text}
              onChangeText={setText}
              placeholder={`"${PLACEHOLDERS[category]}..."`}
              placeholderTextColor={colors.warmGray}
              style={{
                backgroundColor: colors.white,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: radii.lg,
                paddingHorizontal: 18,
                paddingVertical: 16,
                fontFamily: fonts.sans,
                fontSize: 16,
                lineHeight: 23,
                color: colors.nearBlack,
                minHeight: 130,
              }}
            />
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                color: colors.warmGray,
                marginTop: 10,
                lineHeight: 18,
              }}
            >
              Saved to {firstName}&apos;s profile under things you know about them.
            </Text>
          </Animated.View>

          <PressableScale
            haptic
            disabled={!text.trim() || isUpdating}
            onPress={handleSave}
            style={{
              backgroundColor: text.trim() ? colors.sage : colors.sageLight,
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
              {isUpdating ? "Saving..." : "Save detail"}
            </Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
