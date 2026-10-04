// An understood word (person, date, kind) the user can change (plan §8, §18).
// The dotted ochre underline is not the only cue: it is a button with a hint.
import React from "react";
import { Pressable, Text } from "react-native";
import { space, type } from "@/design/tokens";
import { usePalette } from "./theme";

export function Token({ value, what, onPress }: { value: string; what: string; onPress?: () => void }) {
  const p = usePalette();
  if (!onPress) {
    return <Text style={[type.small, { color: p.inkSoft }]}>{value}</Text>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${what}: ${value}`}
      accessibilityHint="Double-tap to change"
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: space.xs, right: space.xs }}
    >
      <Text
        style={[type.small, {
          color: p.ochre, textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: p.ochre,
        }]}
      >
        {value}
      </Text>
    </Pressable>
  );
}
