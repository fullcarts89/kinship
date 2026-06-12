/**
 * Quick Note — jot something down about a person before it slips away.
 *
 * Built for the moment right after (or during) a conversation: one
 * autofocused field, one save. Notes are PROFILE FACTS ("sister's
 * wedding is in June"), not history events — they live on the person
 * and show up on their profile, with no growth mechanics. This also
 * fits someone you literally just met.
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
import { usePerson, useUpdatePerson, useCreatePromise } from "@/hooks";
import { extractPromiseFromText, isAIConfigured } from "@/lib/aiInsightService";
import { Alert } from "react-native";

export default function QuickNoteScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person } = usePerson(id);
  const { updatePerson, isUpdating } = useUpdatePerson();
  const { createPromise, isCreating } = useCreatePromise();
  const [note, setNote] = useState("");
  const [isPromise, setIsPromise] = useState(false);
  const isSaving = isUpdating || isCreating;

  const firstName = person?.name.split(" ")[0] ?? "them";

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = note.trim();
    if (!trimmed || !person) return;
    try {
      if (isPromise) {
        await createPromise({
          person_id: person.id,
          text: trimmed,
          source: "manual",
        });
      } else {
        await updatePerson(person.id, {
          notes: [
            ...(person.notes ?? []),
            { text: trimmed, created_at: new Date().toISOString() },
          ],
        });
        // AI signal: a note may contain a commitment worth holding onto.
        // Proposal only — nothing is ever auto-created; slow or failed
        // extraction just skips the prompt.
        if (isAIConfigured()) {
          const extraction = await Promise.race([
            extractPromiseFromText(trimmed, person.name),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
          if (extraction?.is_promise && extraction.promise_text) {
            const promiseText = extraction.promise_text;
            const dueHint = extraction.due_hint;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            Alert.alert(
              "Sounds like a promise",
              `"${promiseText}" — hold onto it?`,
              [
                { text: "Just a note", style: "cancel", onPress: handleClose },
                {
                  text: "Hold onto it",
                  onPress: async () => {
                    await createPromise({
                      person_id: person.id,
                      text: promiseText,
                      due_hint: dueHint,
                      source: "ai_suggested",
                    });
                    handleClose();
                  },
                },
              ]
            );
            return;
          }
        }
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // Saved locally at worst — never trap the user in a quick flow.
    }
    handleClose();
  }, [note, person, isPromise, updatePerson, createPromise, handleClose]);

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
            <PressableScale
              onPress={() => setIsPromise((v) => !v)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                backgroundColor: isPromise ? colors.sage : colors.white,
                borderWidth: 1.5,
                borderColor: isPromise ? colors.sage : colors.border,
                borderRadius: 100,
                paddingVertical: 8,
                paddingHorizontal: 14,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: isPromise ? colors.white : colors.warmGray,
                }}
              >
                {"\uD83E\uDD1D"} This is a promise I made
              </Text>
            </PressableScale>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                color: colors.warmGray,
                marginTop: 10,
                lineHeight: 18,
              }}
            >
              {isPromise
                ? `Held for you — it'll resurface gently when it can help.`
                : `Saved to ${firstName}'s profile — details, plans, little things worth holding onto.`}
            </Text>
          </Animated.View>

          <PressableScale
            haptic
            disabled={!note.trim() || isSaving}
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
              {isSaving ? "Saving..." : isPromise ? "Hold onto it" : "Save note"}
            </Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
