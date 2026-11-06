// The two-item bar: Today and People, words only, the current one in ink with
// a short rule under it (Stage 1: Instrument Sans 600, 15).
import React from "react";
import { Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { height, maxScale, press, space, TOUCH, type } from "@/design/tokens";
import { usePalette } from "./theme";

export type NavKey = "today" | "people";

export function NavBar({ current, onGo, compact }: {
  current: NavKey;
  onGo: (to: NavKey) => void;
  /** On the keyboard's bar (founder I6): the same two words, in a shorter row. */
  compact?: boolean;
}) {
  const p = usePalette();
  const item = (key: NavKey, label: string) => {
    const on = key === current;
    return (
      <Pressable
        key={key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={() => !on && onGo(key)}
        style={({ pressed }) => ({
          minHeight: TOUCH, minWidth: TOUCH + space.l, alignItems: "center", justifyContent: compact ? "center" : "flex-start",
          paddingTop: compact ? 0 : space.m, opacity: pressed ? press.link : 1,
        })}
      >
        <View style={{ borderBottomWidth: on ? 2 : 0, borderBottomColor: p.ink, paddingBottom: space.xs }}>
          <Text maxFontSizeMultiplier={maxScale.label} style={[type.nav, { color: on ? p.ink : p.inkQuiet }]}>{label}</Text>
        </View>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={{ minHeight: compact ? TOUCH : height.nav, flexDirection: "row", justifyContent: "center", gap: space.x5 }}>
      {item("today", "Today")}
      {item("people", "People")}
    </View>
  );
}
