import React from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils";
import Animated, {
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { animation } from "@design/tokens";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PageIndicatorProps {
  /** Total number of pages/steps */
  total: number;
  /** Current active page (0-indexed) */
  current: number;
  /** Additional className */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PageIndicator({ total, current, className }: PageIndicatorProps) {
  return (
    <View className={cn("flex-row items-center justify-center gap-sm", className)}>
      {Array.from({ length: total }).map((_, index) => (
        <Dot key={index} active={index === current} />
      ))}
    </View>
  );
}

// ─── Dot Sub-component ───────────────────────────────────────────────────────

function Dot({ active }: { active: boolean }) {
  return (
    <View
      className={cn(
        "h-[8px] rounded-full",
        active ? "w-[24px] bg-sage" : "w-[8px] bg-sage-pale"
      )}
    />
  );
}

export default PageIndicator;
