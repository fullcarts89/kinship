// A 2.0 screen (Electric Garden): paper under everything, the art placed
// bigger than the page and cut by its edges (`art`, behind the content, under
// the status bar), the 26 pt gutter, a fine grain over the whole page, and an
// optional pinned footer (the Tell field and the two-item bar on Today and
// People; actions on a person's page).
import React from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
import { Pressable } from "./Pressable";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUTTER, press, size, space, TOUCH } from "@/design/tokens";
import { Grain } from "./garden/Grain";
import { usePalette } from "./theme";

export function Screen({
  children,
  onBack,
  right,
  footer,
  scroll = true,
  scrollRef,
  art,
  grain = true,
}: {
  children: React.ReactNode;
  /** The page's scroll view, to land on one line (founder I1). */
  scrollRef?: React.Ref<ScrollView>;
  /** Shows a back control (the system's swipe works too). */
  onBack?: () => void;
  right?: React.ReactNode;
  /** Pinned under the content. */
  footer?: React.ReactNode;
  scroll?: boolean;
  /** The garden: a wash and botanicals behind the content, from the page's top edge, scrolling with it. */
  art?: React.ReactNode;
  grain?: boolean;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const hasHeader = !!(onBack || right);
  const header = hasHeader ? (
    <View
      style={{
        position: "absolute", top: insets.top, left: 0, right: 0, zIndex: 2,
        minHeight: TOUCH, flexDirection: "row", alignItems: "center", paddingHorizontal: space.m,
      }}
    >
      <View style={{ flex: 1, alignItems: "flex-start" }}>
        {onBack ? <BackButton onPress={onBack} /> : null}
      </View>
      <View style={{ flex: 1, alignItems: "flex-end" }}>{right}</View>
    </View>
  ) : null;
  const body = {
    flexGrow: 1,
    paddingHorizontal: GUTTER,
    paddingTop: insets.top + (hasHeader ? TOUCH + space.xs : space.l),
    paddingBottom: space.x4,
  };
  const content = (
    <>
      {art ? <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>{art}</View> : null}
      {children}
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      {header}
      {scroll ? (
        // A tap on anything that isn't a control, or a drag, puts the keyboard away.
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          {content}
        </ScrollView>
      ) : (
        <Pressable accessible={false} onPress={Keyboard.dismiss} style={[{ flex: 1 }, body]}>{content}</Pressable>
      )}
      {footer ? <View style={{ paddingBottom: insets.bottom }}>{footer}</View> : null}
      {grain ? <Grain /> : null}
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
      <ChevronLeft color={p.ink} size={size.iconLarge} strokeWidth={2.2} />
    </Pressable>
  );
}

/** A round icon-only button (the Tell field's send, search, settings). */
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
