/**
 * Memory Detail Screen
 *
 * Full detail view for a single memory. Shows photo (or gradient fallback),
 * person name, emotion chip, date, and full content text without truncation.
 *
 * Presented as a modal via memory/_layout.tsx (presentation: "modal").
 */
import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Share,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Send, Share2 } from "lucide-react-native";
import { useMemory, usePerson, useCreateInteraction } from "@/hooks";
import { MemoryShareCard } from "@/components/MemoryShareCard";
import { shareViewAsImage } from "@/lib/shareImage";
import { buildShareFooter } from "@/lib/appLinks";
import {
  emotionEmojis,
  formatEmotionLabel,
  formatMemoryDate,
  getMemoryDate,
} from "@/lib/formatters";
import { colors, fonts } from "@design/tokens";

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { memory, isLoading } = useMemory(id ?? "");
  const { person } = usePerson(memory?.person_id ?? "");
  const { createInteraction } = useCreateInteraction();
  const cardRef = useRef<View>(null);

  const firstName = person?.name.split(" ")[0];

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/people");
    }
  };

  const handleShare = async () => {
    if (!memory) return;
    const { success } = await shareViewAsImage(cardRef, "Share this memory");
    if (success) return;

    // Image capture failed — fall back to plain text share
    const personLine = person ? `A memory with ${person.name}` : "A memory";
    const dateLine = formatMemoryDate(getMemoryDate(memory));
    const message = `${personLine}\n\n${memory.content}\n\n${dateLine}\n\n${buildShareFooter()}`;
    try {
      await Share.share({ message });
    } catch {
      // user dismissed share sheet — no-op
    }
  };

  const handleSendToPerson = async () => {
    if (!memory || !person || !firstName) return;
    const { success } = await shareViewAsImage(cardRef, `Send to ${firstName}`);
    if (success) {
      // Sharing a memory with its subject is a reach-out — log it
      await createInteraction({
        person_id: person.id,
        type: "message",
        note: "Shared this memory with them",
      });
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
        {/* Offscreen share card — captured by shareViewAsImage */}
        <View
          style={{ position: "absolute", left: -9999, top: 0 }}
          pointerEvents="none"
        >
          <MemoryShareCard
            ref={cardRef}
            memory={memory}
            personName={person?.name ?? "someone you love"}
          />
        </View>

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

        {/* Share Button Overlay */}
        <Pressable
          onPress={handleShare}
          style={{
            position: "absolute",
            top: insets.top + 12,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Share2 color={colors.nearBlack} size={18} />
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
            {formatMemoryDate(getMemoryDate(memory))}
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

          {/* Send to {firstName} — share the card with the memory's subject */}
          {person && firstName && (
            <Pressable
              onPress={handleSendToPerson}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 32,
                backgroundColor: colors.sage,
                borderRadius: 100,
                paddingVertical: 14,
                paddingHorizontal: 24,
              }}
            >
              <Send color={colors.white} size={16} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 15,
                  color: colors.white,
                }}
              >
                Send to {firstName}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </>
  );
}
