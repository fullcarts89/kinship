// A 2.0 screen (board 1): paper, the 26 pt gutter, content that starts
// close under the status bar, and an optional pinned footer (the Tell field
// and the two-item bar on Today and People; actions on a person's page).
import React from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
import { Pressable } from "./Pressable";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUTTER, press, size, space, TOUCH } from "@/design/tokens";
import { usePalette } from "./theme";

export function Screen({
  children,
  onBack,
  right,
  footer,
  scroll = true,
}: {
  children: React.ReactNode;
  /** Shows a back control (the system's swipe works too). */
  onBack?: () => void;
  right?: React.ReactNode;
  /** Pinned under the content. */
  footer?: React.ReactNode;
  scroll?: boolean;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const header = onBack || right ? (
    <View style={{ minHeight: TOUCH, flexDirection: "row", alignItems: "center", paddingHorizontal: space.m }}>
      <View style={{ flex: 1, alignItems: "flex-start" }}>
        {onBack ? <BackButton onPress={onBack} /> : null}
      </View>
      <View style={{ flex: 1, alignItems: "flex-end" }}>{right}</View>
    </View>
  ) : null;
  const body = { paddingHorizontal: GUTTER, paddingTop: header ? space.xs : space.l, paddingBottom: space.x4 };
  return (
    <View style={{ flex: 1, backgroundColor: p.paper, paddingTop: insets.top }}>
      {header}
      {scroll ? (
        // A tap on anything that isn't a control, or a drag, puts the keyboard away.
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          {children}
        </ScrollView>
      ) : (
        <Pressable accessible={false} onPress={Keyboard.dismiss} style={[{ flex: 1 }, body]}>{children}</Pressable>
      )}
      {footer ? <View style={{ paddingBottom: insets.bottom }}>{footer}</View> : null}
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      hitSlop={space.s}
      style={({ pressed }) => ({ width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center", opacity: pressed ? press.link : 1 })}
    >
      <ChevronLeft color={p.ink} size={size.iconLarge} strokeWidth={1.8} />
    </Pressable>
  );
}

/** A round icon-only button (the Tell microphone's slot, search, settings). */
export function IconButton({
  label,
  onPress,
  children,
  filled = false,
  diameter = TOUCH,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  filled?: boolean;
  diameter?: number;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={Math.max(0, (TOUCH - diameter) / 2)}
      style={({ pressed }) => ({
        width: diameter, height: diameter, borderRadius: diameter / 2, alignItems: "center", justifyContent: "center",
        backgroundColor: filled ? p.ink : "transparent", opacity: pressed ? press.surface : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
