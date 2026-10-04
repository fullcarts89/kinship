// A hairline-separated line: people, items, choices (plan §18).
import React from "react";
import { Pressable, View } from "react-native";
import { space, TOUCH } from "@/design/tokens";
import { Body, Small } from "./Text";
import { usePalette } from "./theme";

export function Row({
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityHint,
  selected = false,
}: {
  title: string;
  subtitle?: string | null;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
  selected?: boolean;
}) {
  const p = usePalette();
  const content = (
    <View
      style={{
        minHeight: TOUCH, paddingVertical: space.m, flexDirection: "row", alignItems: "center",
        borderBottomWidth: 1, borderBottomColor: p.hairline,
      }}
    >
      <View style={{ flex: 1 }}>
        <Body tone={selected ? "ochre" : "ink"}>{title}</Body>
        {subtitle ? <Small>{subtitle}</Small> : null}
      </View>
      {trailing}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}
