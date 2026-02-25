/**
 * ErrorState
 *
 * Reusable error display with optional retry button.
 * Supports full-size (centered) and compact (inline) variants.
 */

import React from "react";
import { View, Text } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { colors } from "@design/tokens";
import { Button } from "./Button";
import type { IconComponent } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ErrorStateProps {
  /** Error message to display */
  message?: string;
  /** Retry callback — shows retry button if provided */
  onRetry?: () => void;
  /** Custom icon (default: AlertTriangle) */
  icon?: IconComponent;
  /** Compact inline layout for section-level errors */
  compact?: boolean;
  /** Additional NativeWind classes */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ErrorState({
  message = "Something went wrong",
  onRetry,
  icon: Icon = AlertTriangle,
  compact = false,
  className,
}: ErrorStateProps) {
  if (compact) {
    return (
      <View className={cn("flex-row items-center py-lg px-md", className)}>
        <View className="w-[36px] h-[36px] rounded-full bg-error-pale items-center justify-center mr-md">
          <Icon color={colors.error} size={18} />
        </View>
        <Text className="font-sans text-sm text-warm-gray flex-1">
          {message}
        </Text>
        {onRetry && (
          <Button variant="outline" size="sm" onPress={onRetry}>
            Retry
          </Button>
        )}
      </View>
    );
  }

  return (
    <View className={cn("items-center justify-center py-4xl px-xl", className)}>
      <View className="w-[56px] h-[56px] rounded-full bg-error-pale items-center justify-center mb-xl">
        <Icon color={colors.error} size={26} />
      </View>
      <Text className="font-sans text-base text-warm-gray text-center mb-xl">
        {message}
      </Text>
      {onRetry && (
        <Button variant="outline" size="sm" onPress={onRetry}>
          Try again
        </Button>
      )}
    </View>
  );
}

export default ErrorState;
