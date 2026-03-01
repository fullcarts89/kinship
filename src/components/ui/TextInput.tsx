import React, { useState } from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  type TextInputProps as RNTextInputProps,
} from "react-native";
import { cn } from "@/lib/utils";
import { colors, fonts } from "@design/tokens";
import type { IconComponent } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TextInputProps extends Omit<RNTextInputProps, "className"> {
  /** Label shown above the input */
  label?: string;
  /** Helper text shown below the input */
  helperText?: string;
  /** Error message (replaces helperText, turns border red) */
  error?: string;
  /** Lucide icon to show on the left side */
  iconLeft?: IconComponent;
  /** Additional className for the outer container */
  className?: string;
  /** Additional className for the input field */
  inputClassName?: string;
  /** Use multiline text area style */
  multiline?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TextInput({
  label,
  helperText,
  error,
  iconLeft: IconLeft,
  className,
  inputClassName,
  multiline = false,
  onFocus,
  onBlur,
  ...inputProps
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;
  const borderColor = hasError
    ? "border-error"
    : isFocused
      ? "border-sage"
      : "border-sage-pale";

  return (
    <View className={cn("w-full", className)}>
      {/* Label */}
      {label && (
        <Text className="text-sm font-sans-medium text-near-black mb-sm">
          {label}
        </Text>
      )}

      {/* Input Container */}
      <View
        className={cn(
          "flex-row items-center bg-white rounded-md border px-lg",
          borderColor,
          multiline ? "min-h-[120px] items-start pt-md" : "h-[48px]"
        )}
      >
        {IconLeft && (
          <View className="mr-md">
            <IconLeft
              color={hasError ? colors.error : isFocused ? colors.sage : colors.warmGray}
              size={20}
            />
          </View>
        )}

        <RNTextInput
          {...inputProps}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          placeholderTextColor={colors.warmGray}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 16,
              color: colors.nearBlack,
              paddingVertical: multiline ? 0 : undefined,
              minHeight: multiline ? 96 : undefined,
            },
          ]}
          className={inputClassName}
        />
      </View>

      {/* Helper / Error Text */}
      {(helperText || error) && (
        <Text
          className={cn(
            "text-xs font-sans mt-xs",
            hasError ? "text-error" : "text-warm-gray"
          )}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

export default TextInput;
