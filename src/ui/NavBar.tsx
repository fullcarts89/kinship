// The two-item bar (Design Direction §H; board 1): Today and People, words
// only, the current one in ink with a hairline under it.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { height, maxScale, space, stroke, TOUCH, type } from "@/design/tokens";
import { usePalette } from "./theme";

export type NavKey = "today" | "people";

export function NavBar({ current, onGo }: { current: NavKey; onGo: (to: NavKey) => void }) {
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
        style={{ minHeight: TOUCH, minWidth: TOUCH + space.l, alignItems: "center", paddingTop: space.m }}
      >
        <View style={{ borderBottomWidth: on ? stroke.underline : 0, borderBottomColor: p.ink, paddingBottom: space.xs - 1 }}>
          <Text maxFontSizeMultiplier={maxScale.label} style={[type.nav, { color: on ? p.ink : p.inkQuiet }]}>{label}</Text>
        </View>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={{ minHeight: height.nav, flexDirection: "row", justifyContent: "center", gap: space.x4 }}>
      {item("today", "Today")}
      {item("people", "People")}
    </View>
  );
}
