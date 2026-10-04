// "You told Kinship · Sep 29": where something came from (plan §6; boards 2
// and System). A small ochre dot and a quiet line; one tap opens the source.
import React from "react";
import { Pressable, View } from "react-native";
import { size, space } from "@/design/tokens";
import { Small } from "./Text";
import { usePalette } from "./theme";

export function Provenance({ line, onPress, dot = true }: { line: string; onPress?: () => void; dot?: boolean }) {
  const p = usePalette();
  const content = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
      {dot ? <View style={{ width: size.dot, height: size.dot, borderRadius: size.dot / 2, backgroundColor: p.ochre }} /> : null}
      <Small style={{ flexShrink: 1 }}>{line}</Small>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={line}
      accessibilityHint="Opens where this came from"
      onPress={onPress}
      hitSlop={{ top: space.s, bottom: space.s, left: 0, right: space.l }}
      style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}
