// "From your note · Oct 8": where something came from (plan §6). The lime dot
// and a small tracked caps line in ink-quiet (Stage 1); one tap opens the
// source. The dot is the mark of something understood, never decoration.
import React from "react";
import { View } from "react-native";
import { Pressable } from "./Pressable";
import { press, size, space } from "@/design/tokens";
import { Source } from "./Text";
import { usePalette } from "./theme";

export function Provenance({ line, onPress, dot = true }: { line: string; onPress?: () => void; dot?: boolean }) {
  const p = usePalette();
  const content = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
      {dot ? <View style={{ width: size.dot, height: size.dot, borderRadius: size.dot / 2, backgroundColor: p.mark }} /> : null}
      <Source style={{ flexShrink: 1 }}>{line}</Source>
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
      style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? press.link : 1 })}
    >
      {content}
    </Pressable>
  );
}
