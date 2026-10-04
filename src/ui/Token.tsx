// An understood word the user can change (plan §8, §18; System board): who,
// when, what kind. A solid 1.5 pt ochre underline marks it; the underline is
// not the only cue: it is a button with a label and a hint.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { maxScale, space, stroke, type } from "@/design/tokens";
import { usePalette } from "./theme";

export function Token({ value, what, onPress }: { value: string; what: string; onPress?: () => void }) {
  const p = usePalette();
  if (!onPress) {
    return (
      <Text maxFontSizeMultiplier={maxScale.text} style={[type.field, { color: p.inkQuiet }]} accessibilityLabel={`${what}: ${value}`}>
        {value}
      </Text>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${what}: ${value}`}
      accessibilityHint="Double-tap to change"
      onPress={onPress}
      hitSlop={{ top: space.m, bottom: space.m, left: space.xs, right: space.xs }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ borderBottomWidth: stroke.underline, borderBottomColor: p.ochre, paddingBottom: 1 }}>
        <Text maxFontSizeMultiplier={maxScale.text} style={[type.field, { color: p.inkBody }]}>{value}</Text>
      </View>
    </Pressable>
  );
}

/** Tokens in a line, separated by quiet middots. */
export function TokenRow({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.s, rowGap: space.xs }}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? (
            <Text style={[type.field, { color: p.inkQuiet }]} accessibilityElementsHidden importantForAccessibility="no">·</Text>
          ) : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}
