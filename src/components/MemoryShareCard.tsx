/**
 * MemoryShareCard
 *
 * A designed, capture-ready card for sharing a memory as an image.
 * Rendered offscreen (or in a preview) and snapshotted with
 * shareViewAsImage — the artifact itself is the pitch, so it should
 * feel like a small gift, not an advert.
 *
 * Usage:
 *   const cardRef = useRef<View>(null);
 *   <View style={{ position: "absolute", left: -9999 }}>
 *     <MemoryShareCard ref={cardRef} memory={memory} personName={name} />
 *   </View>
 *   ...
 *   await shareViewAsImage(cardRef, "Share this memory");
 */

import React, { forwardRef } from "react";
import { View, Text, Image } from "react-native";
import { colors, fonts } from "@design/tokens";
import { SingleSproutIllustration } from "@/components/illustrations";
import { emotionEmojis, formatEmotionLabel, formatMemoryDate } from "@/lib/formatters";
import type { Memory } from "@/types/database";

const CARD_WIDTH = 360;

interface MemoryShareCardProps {
  memory: Memory;
  personName: string;
}

export const MemoryShareCard = forwardRef<View, MemoryShareCardProps>(
  function MemoryShareCard({ memory, personName }, ref) {
    const date = formatMemoryDate(memory.occurred_at || memory.created_at);
    const excerpt =
      memory.content.length > 220
        ? `${memory.content.slice(0, 217).trimEnd()}…`
        : memory.content;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: CARD_WIDTH,
          backgroundColor: colors.cream,
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {memory.photo_url ? (
          <Image
            source={{ uri: memory.photo_url }}
            style={{ width: "100%", height: 240 }}
            resizeMode="cover"
          />
        ) : null}

        <View style={{ padding: 24 }}>
          {memory.emotion ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                backgroundColor: colors.sagePale,
                borderRadius: 100,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 13 }}>
                {emotionEmojis[memory.emotion]}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: colors.moss,
                  marginLeft: 6,
                }}
              >
                {formatEmotionLabel(memory.emotion)}
              </Text>
            </View>
          ) : null}

          {excerpt ? (
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 19,
                lineHeight: 28,
                color: colors.nearBlack,
                marginBottom: 18,
              }}
            >
              “{excerpt}”
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 14,
            }}
          >
            <View style={{ flexShrink: 1, paddingRight: 12 }}>
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 14,
                  color: colors.nearBlack,
                }}
                numberOfLines={1}
              >
                A moment with {personName}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: colors.warmGray,
                  marginTop: 2,
                }}
              >
                {date} · Kept in Kinship 🌱
              </Text>
            </View>
            <SingleSproutIllustration size={40} />
          </View>
        </View>
      </View>
    );
  }
);
