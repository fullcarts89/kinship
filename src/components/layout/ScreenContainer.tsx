import React from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ViewProps,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScreenContainerProps {
  children: React.ReactNode;
  /** Enable vertical scrolling (default: true) */
  scroll?: boolean;
  /** Apply default horizontal padding (24px). Pass false for full-bleed. */
  padded?: boolean;
  /** Apply safe area top inset (default: true) */
  safeTop?: boolean;
  /** Apply safe area bottom inset (default: true) */
  safeBottom?: boolean;
  /** Wrap in KeyboardAvoidingView for forms (default: false) */
  keyboardAvoiding?: boolean;
  /** Additional className for the outermost container */
  className?: string;
  /** Additional className for the scroll content */
  contentClassName?: string;
  /** ScrollView props when scroll=true */
  scrollViewProps?: Omit<ScrollViewProps, "children" | "className">;
  /** View props when scroll=false */
  viewProps?: Omit<ViewProps, "children" | "className">;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  safeTop = true,
  safeBottom = true,
  keyboardAvoiding = false,
  className,
  contentClassName,
  scrollViewProps,
  viewProps,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = safeTop ? insets.top + 16 : 16;
  const paddingBottom = safeBottom ? insets.bottom + 16 : 16;

  const content = scroll ? (
    <ScrollView
      {...scrollViewProps}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop,
        paddingBottom,
        paddingHorizontal: padded ? 24 : 0,
        flexGrow: 1,
      }}
      className={contentClassName}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      {...viewProps}
      className={cn("flex-1", contentClassName)}
      style={{
        paddingTop,
        paddingBottom,
        paddingHorizontal: padded ? 24 : 0,
      }}
    >
      {children}
    </View>
  );

  const container = (
    <View className={cn("flex-1 bg-cream", className)}>
      {content}
    </View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {container}
      </KeyboardAvoidingView>
    );
  }

  return container;
}

export default ScreenContainer;
