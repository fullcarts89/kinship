/**
 * Quick Note — jot something down about a person before it slips away.
 *
 * Built for the moment right after (or during) a conversation: one
 * autofocused field, one save. Saves as a reflection on the person's
 * history (interaction with a note), so it earns gentle growth and
 * shows up in their timeline.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { X, PenLine } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radii, shadows } from "@design/tokens";
import { PressableScale } from "@/components/ui";
import { usePerson, useCreateInteraction } from "@/hooks";
import { recordReflectionGrowth, getTransitionToastMessage } from "@/lib/growthEngine";
import { showGrowthToast } from "@/components/ui/GrowthToast";

export default function QuickNoteScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person } = usePerson(id);
  const { createInteraction, isCreating } = useCreateInteraction();
  const [note, setNote] = useState("");

  const firstName = person?.name.split(" ")[0] ?? "them";

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = note.trim();
    if (!trimmed || !person) return;
    try {
      await createInteraction({
        person_id: person.id,
        type: "other",
        note: trimmed,
      });
      const transition = recordReflectionGrowth(person.id);
      if (transition) {
        const toast = getTransitionToastMessage({
          ...transition,
          personName: person.name.split(" ")[0],
        });
        showGrowthToast(toast.text, toast.emoji);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // Saved locally at worst — never trap the user in a quick flow.
    }
    handleClose();
  }, [note, person, createInteraction, handleClose]);

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
              <PenLine size={18} color={colors.sage} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: colors.sage,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Quick note
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

          <Animated.View entering={FadeInUp.delay(80).duration(300)} style={{ flex: 1 }}>
            <RNTextInput
              autoFocus
              multiline
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
              placeholder={`"${firstName} mentioned their sister's wedding is in June..."`}
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
              Saved to {firstName}'s history — details, plans, little things
              worth holding onto.
            </Text>
          </Animated.View>

          <PressableScale
            haptic
            disabled={!note.trim() || isCreating}
            onPress={handleSave}
            style={{
              backgroundColor: note.trim() ? colors.sage : colors.sageLight,
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
              {isCreating ? "Saving..." : "Save note"}
            </Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
