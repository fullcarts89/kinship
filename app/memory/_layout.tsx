import { Stack } from "expo-router";
import { colors } from "@design/tokens";

/**
 * Memory Stack Layout
 *
 * Stack navigator for memory-related screens.
 * Presented as a modal over the tab bar.
 */
export default function MemoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.nearBlack,
        headerTitleStyle: { fontFamily: "DMSans", fontWeight: "600" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.cream },
        presentation: "modal",
      }}
    />
  );
}
