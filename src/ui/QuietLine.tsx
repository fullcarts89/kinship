// A secondary line on Today (plan §13): a small caps label in ink over one
// serif line, with at most one quiet action. The week's rhythm under the
// moment (Stage 1): "WED 14 · Josh's interview". Never a badge, a count to
// clear, or urgency.
import React from "react";
import { View } from "react-native";
import { Pressable } from "./Pressable";
import { press, space, TOUCH } from "@/design/tokens";
import { Line, Small, Week } from "./Text";

export function QuietLine({
  label,
  text,
  action,
  onPress,
}: {
  label: string;
  text: string;
  /** A quiet action at the end of the line ("Answer", "Ideas →"). */
  action?: { label: string; onPress: () => void };
  /** The whole line opens something. */
  onPress?: () => void;
}) {
  const body = (
    <View style={{ flex: 1 }}>
      <Week>{label}</Week>
      <Line style={{ marginTop: space.xs }}>{text}</Line>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.m, minHeight: TOUCH }}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${text}`}
          onPress={onPress}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? press.surface : 1 })}
        >
          {body}
        </Pressable>
      ) : (
        <View style={{ flex: 1 }} accessible accessibilityLabel={`${label}: ${text}`}>{body}</View>
      )}
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          hitSlop={space.s}
          style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.link : 1 })}
        >
          <Small tone="ink">{action.label}</Small>
        </Pressable>
      ) : null}
    </View>
  );
}
