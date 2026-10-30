// SUA-1 (FD-30d): one quiet "You could…" line beneath Message and Call, on the hand-off sheet and in
// the Moment detail. Small, quiet type, pressable as a link: clearly a suggestion, never the user's
// words, never a second primary action. A tap opens Messages with nothing pre-written. WS-3 adds the
// markup only; its look belongs to WS-2.
import React from "react";
import { View } from "react-native";
import { press, space } from "@/design/tokens";
import { Pressable } from "@/ui/Pressable";
import { Small } from "@/ui";
import type { Suggestion } from "./suggestions";

export function SuggestionLine({ suggestion, personName, onPress }: { suggestion: Suggestion | null | undefined; personName: string; onPress?: () => void }) {
  if (!suggestion) return null;
  return (
    <View style={{ marginTop: space.m }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={suggestion.text}
        accessibilityHint={`A suggestion. Opens a conversation with ${personName}`}
        onPress={onPress}
        hitSlop={{ top: space.s, bottom: space.s, left: 0, right: space.l }}
        style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? press.link : 1 })}
      >
        <Small>{suggestion.text}</Small>
      </Pressable>
    </View>
  );
}
