// A secondary line with one optional action: never a badge, a count to clear,
// or urgency (plan §18).
import React from "react";
import { View } from "react-native";
import { space } from "@/design/tokens";
import { Pill } from "./Pill";
import { Small } from "./Text";

export function QuietLine({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, paddingVertical: space.xs }}>
      <Small style={{ flex: 1 }}>{text}</Small>
      {action ? <Pill variant="quiet" label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}
