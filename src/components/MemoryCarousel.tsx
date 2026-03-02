/**
 * Memory Carousel
 *
 * A horizontally swipeable carousel of memory cards for the reach-out flow.
 * Shows memory content, emotion tags, photos, and relative dates.
 *
 * Expects memories to be pre-filtered and pre-sorted (most recent first).
 * Does NOT render if the array is empty — the parent handles the empty state.
 */

import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Dimensions,
  Image,
  type ViewStyle,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fonts } from "@design/tokens";
import { emotionEmojis, formatEmotionLabel, formatMemoryDate, getMemoryDate } from "@/lib/formatters";
import type { Memory } from "@/types/database";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = "#7A9E7E";
const sagePale = "#EBF3EB";
const sageLight = "#C8DEC9";
const nearBlack = "#1C1917";
const warmGray = "#78716C";
const white = "#FFFFFF";

// ─── Layout Constants ───────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

// ─── Props ──────────────────────────────────────────────────────────────────

interface MemoryCarouselProps {
  memories: Memory[];
  style?: ViewStyle;
}

// ─── Memory Card ────────────────────────────────────────────────────────────

function MemoryCard({ memory }: { memory: Memory }) {
  const hasPhoto = !!memory.photo_url;

  return (
    <View
      style={{
        width: CARD_WIDTH,
        marginRight: CARD_GAP,
      }}
    >
      <LinearGradient
        colors={hasPhoto ? ["rgba(0,0,0,0.05)", "rgba(0,0,0,0.25)"] : [sagePale, sageLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          width: "100%",
          minHeight: 160,
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Background photo if available */}
        {hasPhoto && (
          <Image
            source={{ uri: memory.photo_url! }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 20,
            }}
            resizeMode="cover"
          />
        )}

        {/* Content overlay */}
        <View
          style={{
            flex: 1,
            padding: 16,
            justifyContent: "space-between",
          }}
        >
          {/* Emotion tag */}
          {memory.emotion && (
            <View
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: hasPhoto ? "rgba(255,255,255,0.9)" : white,
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 12,
                gap: 4,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 13 }}>
                {emotionEmojis[memory.emotion] ?? ""}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 12,
                  color: sage,
                }}
              >
                {formatEmotionLabel(memory.emotion)}
              </Text>
            </View>
          )}

          {/* Memory content */}
          <Text
            numberOfLines={3}
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              lineHeight: 22,
              color: hasPhoto ? white : nearBlack,
              flex: 1,
              marginBottom: 8,
              ...(hasPhoto && {
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }),
            }}
          >
            {memory.content}
          </Text>

          {/* Date */}
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: hasPhoto ? "rgba(255,255,255,0.85)" : warmGray,
              ...(hasPhoto && {
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }),
            }}
          >
            {formatMemoryDate(getMemoryDate(memory))}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Dot Indicator ──────────────────────────────────────────────────────────

function DotIndicator({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  if (count <= 1) return null;

  // Show at most 5 dots for many memories
  const maxDots = 5;
  const showDots = Math.min(count, maxDots);

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 12,
        gap: 6,
      }}
    >
      {Array.from({ length: showDots }).map((_, i) => {
        const isActive = i === activeIndex || (i === maxDots - 1 && activeIndex >= maxDots);
        return (
          <View
            key={i}
            style={{
              width: isActive ? 8 : 6,
              height: isActive ? 8 : 6,
              borderRadius: isActive ? 4 : 3,
              backgroundColor: isActive ? sage : sageLight,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function MemoryCarousel({ memories, style }: MemoryCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
  });

  if (memories.length === 0) return null;

  return (
    <View style={style}>
      <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemoryCard memory={item} />}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingLeft: CARD_HORIZONTAL_PADDING,
          paddingRight: CARD_HORIZONTAL_PADDING - CARD_GAP,
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        initialNumToRender={3}
        windowSize={5}
      />
      <DotIndicator count={memories.length} activeIndex={activeIndex} />
    </View>
  );
}
