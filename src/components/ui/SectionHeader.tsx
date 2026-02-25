import React from "react";
import { View, Text, Pressable } from "react-native";
import { cn } from "@/lib/utils";
import { colors } from "@design/tokens";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional action label (e.g., "See all") */
  actionLabel?: string;
  /** Called when action is tapped */
  onAction?: () => void;
  /** Additional className */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}: SectionHeaderProps) {
  return (
    <View className={cn("flex-row items-center justify-between mb-md", className)}>
      <View className="flex-1 mr-md">
        <Text className="text-lg font-sans-semibold text-near-black">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-sm font-sans text-warm-gray mt-2xs">
            {subtitle}
          </Text>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text className="text-sm font-sans-medium text-sage">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default SectionHeader;
