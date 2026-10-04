// Temporary context over a screen: the review, a picker, a note (plan §18).
import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, space } from "@/design/tokens";
import { usePalette } from "./theme";

export function Sheet({
  visible,
  onDismiss,
  children,
  label,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Read by screen readers when the sheet opens. */
  label: string;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onDismiss} style={{ flex: 1, backgroundColor: p.scrim }} />
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={{
            maxHeight: "86%", backgroundColor: p.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
            paddingTop: space.l, paddingHorizontal: space.xl, paddingBottom: space.l + insets.bottom,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
