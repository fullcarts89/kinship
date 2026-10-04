// Buttons (plan §18): 44 pt, the label is never cut off.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { space, TOUCH, type } from "@/design/tokens";
import { usePalette } from "./theme";

export function Pill({
  label,
  onPress,
  variant = "ghost",
  disabled = false,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "quiet" | "danger";
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const p = usePalette();
  const fill = variant === "primary" ? p.ochre : "transparent";
  const fg = variant === "primary" ? p.onOchre : variant === "quiet" ? p.inkSoft : variant === "danger" ? p.danger : p.ochre;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          minHeight: TOUCH, paddingHorizontal: space.l, borderRadius: TOUCH / 2, justifyContent: "center",
          alignItems: "center", backgroundColor: fill,
          borderWidth: variant === "ghost" ? 1 : 0, borderColor: p.hairline,
        }}
      >
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[type.label, { color: fg }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
