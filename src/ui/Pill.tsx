// Buttons (Design Direction §H, System board): pills, height / 2.
//   primary   ink fill, the one action that matters on a screen
//   ghost     a hairline outline
//   quiet     text only, for secondary actions in a line
//   danger    brick text in a faint outline, for destructive actions
// At least 44 pt to touch; the label is never cut off (it shrinks a little as
// a last resort, the canvas's button-wrap fix).
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { height as H, maxScale, radius, size as SIZE, space, TOUCH, type } from "@/design/tokens";
import { usePalette } from "./theme";

export type PillVariant = "primary" | "ghost" | "quiet" | "danger";

export function Pill({
  label,
  onPress,
  variant = "ghost",
  size = "regular",
  icon,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: PillVariant;
  /** regular: 48 pt (the boards' buttons); small: 44 pt (inline choices). */
  size?: "regular" | "small";
  /** A Lucide icon, drawn at 1.8 stroke in the label's colour. */
  icon?: (props: { color: string; size: number; strokeWidth: number }) => React.ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Layout only (flex, alignSelf). */
  style?: ViewStyle;
}) {
  const p = usePalette();
  const h = size === "regular" ? H.button : H.small;
  const fg = variant === "primary" ? p.onInk : variant === "quiet" ? p.inkQuiet : variant === "danger" ? p.brick : p.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={variant === "quiet" ? space.s : space.xs}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.72 : 1 }, style]}
    >
      <View
        style={{
          minHeight: variant === "quiet" ? TOUCH : h,
          paddingHorizontal: variant === "quiet" ? space.xs : size === "regular" ? space.xl : space.l,
          borderRadius: radius.pill(h),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space.s,
          backgroundColor: variant === "primary" ? p.ink : "transparent",
          borderWidth: variant === "ghost" || variant === "danger" ? 1 : 0,
          borderColor: variant === "danger" ? p.hairline : p.rule,
        }}
      >
        {icon ? icon({ color: fg, size: SIZE.icon, strokeWidth: 1.8 }) : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={maxScale.label}
          style={[type.button, { color: fg }]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
