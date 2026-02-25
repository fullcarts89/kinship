import React, { useCallback } from "react";
import { Pressable, Text, View, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";
import { colors } from "@design/tokens";
import type { IconComponent } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChipVariant = "default" | "outline";
export type ChipSize = "sm" | "md" | "lg";

export interface ChipProps extends Omit<PressableProps, "children"> {
  /** Chip text label */
  children: string;
  /** Whether the chip is in selected state */
  selected?: boolean;
  /** Visual variant when not selected */
  variant?: ChipVariant;
  /** Size preset */
  size?: ChipSize;
  /** Lucide icon component to render before the label */
  icon?: IconComponent;
  /** Additional className */
  className?: string;
  /** Called when chip is pressed (typically toggles selection) */
  onPress?: () => void;
}

// ─── Style Maps ──────────────────────────────────────────────────────────────

const sizeClasses: Record<
  ChipSize,
  { container: string; text: string; iconSize: number }
> = {
  sm: {
    container: "h-[28px] px-md",
    text: "text-xs font-sans-medium",
    iconSize: 12,
  },
  md: {
    container: "h-[34px] px-lg",
    text: "text-sm font-sans-medium",
    iconSize: 16,
  },
  lg: {
    container: "h-[40px] px-xl",
    text: "text-base font-sans-medium",
    iconSize: 18,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function Chip({
  children,
  selected = false,
  variant = "default",
  size = "md",
  icon: Icon,
  className,
  onPress,
  disabled,
  ...pressableProps
}: ChipProps) {
  const s = sizeClasses[size];

  // Resolve colors based on state
  const bgClass = selected
    ? "bg-sage"
    : variant === "outline"
      ? "bg-transparent"
      : "bg-sage-pale";

  const borderClass = selected
    ? "border-transparent"
    : variant === "outline"
      ? "border border-sage"
      : "border-transparent";

  const textClass = selected ? "text-white" : variant === "outline" ? "text-sage" : "text-warm-gray";

  const iconColor = selected
    ? colors.white
    : variant === "outline"
      ? colors.sage
      : colors.warmGray;

  return (
    <Pressable
      {...pressableProps}
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-center rounded-full",
        s.container,
        bgClass,
        borderClass,
        disabled && "opacity-disabled",
        className
      )}
      style={({ pressed }) =>
        pressed && !disabled
          ? { opacity: 0.8, transform: [{ scale: 0.97 }] }
          : undefined
      }
    >
      {Icon && (
        <View className="mr-xs">
          <Icon color={iconColor} size={s.iconSize} />
        </View>
      )}
      <Text className={cn(s.text, textClass)} numberOfLines={1}>
        {children}
      </Text>
    </Pressable>
  );
}

// ─── Convenience: Emotion Chip ───────────────────────────────────────────────

/**
 * EmotionChip — A Chip pre-configured for emotion selection.
 * Same API as Chip but with default size="md" and variant="default".
 */
export interface EmotionChipProps {
  /** Emotion label (e.g., "Grateful", "Connected") */
  emotion: string;
  /** Whether this emotion is currently selected */
  selected?: boolean;
  /** Called when tapped */
  onPress?: () => void;
  /** Optional icon */
  icon?: IconComponent;
  /** Additional className */
  className?: string;
}

export function EmotionChip({
  emotion,
  selected = false,
  onPress,
  icon,
  className,
}: EmotionChipProps) {
  return (
    <Chip
      selected={selected}
      onPress={onPress}
      icon={icon}
      size="md"
      className={className}
    >
      {emotion}
    </Chip>
  );
}

export default Chip;
