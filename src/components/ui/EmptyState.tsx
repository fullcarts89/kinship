/**
 * EmptyState
 *
 * Parameterized empty state with icon, title, message, and optional CTA.
 * Drop-in replacement for inline EmptyGardenState / EmptyPeopleState.
 */

import React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";
import { colors } from "@design/tokens";
import { Button } from "./Button";
import type { IconComponent } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  /** Lucide icon to render inside circle */
  icon: IconComponent;
  /** Headline */
  title: string;
  /** Supporting message */
  message: string;
  /** CTA button label */
  actionLabel?: string;
  /** CTA callback */
  onAction?: () => void;
  /** Background color for icon circle */
  iconBgColor?: string;
  /** Icon color */
  iconColor?: string;
  /** Additional NativeWind classes */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  iconBgColor = colors.sagePale,
  iconColor = colors.sage,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn("items-center justify-center py-4xl", className)}>
      <View
        className="w-[80px] h-[80px] rounded-full items-center justify-center mb-xl"
        style={{ backgroundColor: iconBgColor }}
      >
        <Icon color={iconColor} size={36} />
      </View>
      <Text className="font-serif text-2xl text-near-black text-center mb-sm">
        {title}
      </Text>
      <Text className="font-sans text-base text-warm-gray text-center px-xl mb-xl">
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button onPress={onAction}>{actionLabel}</Button>
      )}
    </View>
  );
}

export default EmptyState;
