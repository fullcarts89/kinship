// A hairline-separated line (plan §18): people, items, choices. Lists are
// hairlines, not cards.
import React from "react";
import { View } from "react-native";
import { Pressable } from "./Pressable";
import { font as type, height, press, space, TOUCH } from "@/design/tokens";
import { Body, Italic, Small } from "./Text";
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
  serifSubtitle = false,
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
  /** The subtitle is the user's own words (a person's live line): Newsreader italic. */
  serifSubtitle?: boolean;
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
        <Body tone={selected ? "markText" : "ink"} style={{ fontFamily: type.sansMedium }}>{title}</Body>
        {subtitle ? (serifSubtitle ? <Italic numberOfLines={2}>{subtitle}</Italic> : <Small numberOfLines={2}>{subtitle}</Small>) : null}
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
      style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
    >
      {content}
    </Pressable>
  );
}
