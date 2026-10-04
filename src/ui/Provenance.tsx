// "You told Kinship · Oct 8": where a memory came from. Opens the note.
import React from "react";
import { Pressable, Text } from "react-native";
import { type } from "@/design/tokens";
import { usePalette } from "./theme";

export function Provenance({ line, onPress }: { line: string; onPress?: () => void }) {
  const p = usePalette();
  const text = <Text style={[type.small, { color: p.inkSoft }]}>{line}</Text>;
  if (!onPress) return text;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={line} accessibilityHint="Opens the note" onPress={onPress} hitSlop={8}>
      {text}
    </Pressable>
  );
}
