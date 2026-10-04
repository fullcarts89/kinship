// A 2.0 screen: paper, a quiet header, and room for the content.
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, TOUCH } from "@/design/tokens";
import { Label } from "./Text";
import { usePalette } from "./theme";

export function Screen({
  children,
  title,
  left,
  right,
  footer,
}: {
  children: React.ReactNode;
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** Pinned under the scrolling content (e.g. the Tell field). */
  footer?: React.ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: p.paper, paddingTop: insets.top }}>
      <View style={{ minHeight: TOUCH, flexDirection: "row", alignItems: "center", paddingHorizontal: space.l }}>
        <View style={{ flex: 1, alignItems: "flex-start" }}>{left}</View>
        {title ? <Label accessibilityRole="header">{title}</Label> : null}
        <View style={{ flex: 1, alignItems: "flex-end" }}>{right}</View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.x4 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: space.xl, paddingBottom: space.m + insets.bottom }}>{footer}</View> : null}
    </View>
  );
}
