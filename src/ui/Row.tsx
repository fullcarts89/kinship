// A hairline-separated line (plan §18): people, items, choices. Lists are
// hairlines, not cards.
import React from "react";
import { Pressable, View } from "react-native";
import { height, space, TOUCH } from "@/design/tokens";
import { Body, Small } from "./Text";
import { usePalette } from "./theme";

export function Row({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  accessibilityHint,
  selected = false,
  first = false,
}: {
  title: string;
  /** One live line under the title (12, quiet). */
  subtitle?: string | null;
  /** A sprig, usually. */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
  selected?: boolean;
  /** Draws the hairline above, for the first row of a list. */
  first?: boolean;
}) {
  const p = usePalette();
  const content = (
    <View
      style={{
        minHeight: leading ? height.row : TOUCH + space.s,
        paddingVertical: space.s,
        flexDirection: "row",
        alignItems: "center",
        gap: space.m,
        borderBottomWidth: 1,
        borderTopWidth: first ? 1 : 0,
        borderColor: p.hairline,
      }}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <Body tone={selected ? "ochreText" : "ink"}>{title}</Body>
        {subtitle ? <Small numberOfLines={2}>{subtitle}</Small> : null}
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
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      {content}
    </Pressable>
  );
}
