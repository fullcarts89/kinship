import React, { useCallback } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type ViewStyle,
  type PressableProps,
} from "react-native";
import { cn } from "@/lib/utils";
import { colors, opacity, animation } from "@design/tokens";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import type { IconComponent } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  /** Button text label */
  children: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Stretch to full container width */
  fullWidth?: boolean;
  /** Lucide icon component to render before the label */
  iconLeft?: IconComponent;
  /** Lucide icon component to render after the label */
  iconRight?: IconComponent;
  /** Additional className for the outer pressable */
  className?: string;
  /** Additional className for the label text */
  textClassName?: string;
}

// ─── Style Maps ──────────────────────────────────────────────────────────────

const variantStyles: Record<
  ButtonVariant,
  { base: string; pressed: string; text: string; textColor: string }
> = {
  primary: {
    base: "bg-sage",
    pressed: "bg-moss",
    text: "text-white",
    textColor: colors.white,
  },
  secondary: {
    base: "bg-sage-pale",
    pressed: "bg-sage-pale/80",
    text: "text-moss",
    textColor: colors.moss,
  },
  outline: {
    base: "bg-transparent border border-sage",
    pressed: "bg-sage-pale border border-sage",
    text: "text-sage",
    textColor: colors.sage,
  },
  ghost: {
    base: "bg-transparent",
    pressed: "bg-sage-pale",
    text: "text-sage",
    textColor: colors.sage,
  },
  destructive: {
    base: "bg-error",
    pressed: "bg-error/90",
    text: "text-white",
    textColor: colors.white,
  },
};

const sizeStyles: Record<
  ButtonSize,
  {
    container: string;
    text: string;
    iconSize: number;
  }
> = {
  sm: {
    container: "h-[36px] px-lg rounded-lg",
    text: "text-sm font-sans-semibold",
    iconSize: 16,
  },
  md: {
    container: "h-[48px] px-xl rounded-xl",
    text: "text-base font-sans-semibold",
    iconSize: 20,
  },
  lg: {
    container: "h-[56px] px-2xl rounded-xl",
    text: "text-lg font-sans-semibold",
    iconSize: 22,
  },
};

// ─── Animated Pressable ──────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Component ───────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  iconLeft: IconLeft,
  iconRight: IconRight,
  disabled,
  className,
  textClassName,
  onPressIn,
  onPressOut,
  ...pressableProps
}: ButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withTiming(animation.pressScale, {
        duration: animation.fast,
      });
      onPressIn?.(e);
    },
    [onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withTiming(1, { duration: animation.fast });
      onPressOut?.(e);
    },
    [onPressOut, scale]
  );

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <AnimatedPressable
      {...pressableProps}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, isDisabled && { opacity: opacity.disabled }]}
      className={cn(
        // Layout
        "flex-row items-center justify-center",
        s.container,
        fullWidth && "w-full",
        // Variant base style (pressed state handled via Pressable)
        v.base,
        className
      )}
    >
      {({ pressed }) => (
        <>
          {/* Pressed overlay */}
          {pressed && !isDisabled && (
            <View
              className={cn(
                "absolute inset-0",
                s.container,
                v.pressed
              )}
            />
          )}

          {/* Loading spinner */}
          {loading ? (
            <ActivityIndicator
              size="small"
              color={v.textColor}
              className="mr-sm"
            />
          ) : IconLeft ? (
            <View className="mr-sm">
              <IconLeft color={v.textColor} size={s.iconSize} />
            </View>
          ) : null}

          {/* Label */}
          <Text
            className={cn(s.text, v.text, textClassName)}
            numberOfLines={1}
          >
            {children}
          </Text>

          {/* Right icon */}
          {!loading && IconRight && (
            <View className="ml-sm">
              <IconRight color={v.textColor} size={s.iconSize} />
            </View>
          )}
        </>
      )}
    </AnimatedPressable>
  );
}

export default Button;
