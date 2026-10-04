// Temporary context over a screen (plan §18; board 2): the review, a
// correction, the hand-off. The surface, 28 pt corners at the top, a
// grabber, the one sheet shadow. Slides up; with Reduce Motion it fades.
// Panes replace a sheet's content: there is never a sheet on a sheet.
import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUTTER, radius, shadow, size, space } from "@/design/tokens";
import { useReduceMotion, usePalette } from "./theme";

export function Sheet({
  visible,
  onDismiss,
  children,
  label,
  footer,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Read by screen readers when the sheet opens. */
  label: string;
  /** Pinned under the scrolling content (the sheet's main action). */
  footer?: React.ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  return (
    <Modal visible={visible} transparent animationType={reduce ? "fade" : "slide"} onRequestClose={onDismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onDismiss} style={{ flex: 1, backgroundColor: p.scrim }} />
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[shadow.sheet, {
            maxHeight: "88%", backgroundColor: p.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
            paddingTop: space.m, paddingBottom: space.m + insets.bottom,
          }]}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              alignSelf: "center", width: size.grabber.width, height: size.grabber.height, borderRadius: radius.grabber,
              backgroundColor: p.rule, marginBottom: space.xl,
            }}
          />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: space.s }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: GUTTER, paddingTop: space.m }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
