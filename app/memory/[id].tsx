/**
 * Memory Detail Screen
 *
 * Full detail view for a single memory. Shows photo (or gradient fallback),
 * person name, emotion chip, date, and full content text without truncation.
 *
 * Presented as a modal via memory/_layout.tsx (presentation: "modal").
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft } from "lucide-react-native";
import { useMemory, usePerson } from "@/hooks";
import {
  emotionEmojis,
  formatEmotionLabel,
  formatRelativeDate,
} from "@/lib/formatters";
import { colors, fonts } from "@design/tokens";

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { memory, isLoading } = useMemory(id ?? "");
  const { person } = usePerson(memory?.person_id ?? "");

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/people");
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: colors.cream,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={colors.sage} size="large" />
        </View>
      </>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────────────────────

  if (!memory) {
    handleBack();
    return null;
  }

  // ─── Detail View ────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        {/* Photo Header */}
        {memory.photo_url ? (
          <Image
            source={{ uri: memory.photo_url }}
            style={{ height: 220, width: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[colors.sagePale, colors.sageLight + "88"]}
            style={{ height: 220, width: "100%" }}
          />
        )}

        {/* Back Button Overlay */}
        <Pressable
          onPress={handleBack}
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft color={colors.nearBlack} size={20} />
        </Pressable>

        {/* Content Area */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
        >
          {/* Person Name */}
          {person && (
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 14,
                color: colors.warmGray,
                marginBottom: 8,
              }}
            >
              A memory with {person.name}
            </Text>
          )}

          {/* Emotion Chip */}
          {memory.emotion && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 18 }}>
                {emotionEmojis[memory.emotion] ?? ""}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 14,
                  color: colors.warmGray,
                }}
              >
                {formatEmotionLabel(memory.emotion as any)}
              </Text>
            </View>
          )}

          {/* Date */}
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: colors.warmGray,
              marginBottom: 16,
            }}
          >
            {formatRelativeDate(memory.created_at)}
          </Text>

          {/* Full Content — no truncation */}
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 16,
              color: colors.nearBlack,
              lineHeight: 24,
            }}
          >
            {memory.content}
          </Text>
        </ScrollView>
      </View>
    </>
  );
}
