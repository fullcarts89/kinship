import { Stack } from "expo-router";
import { colors } from "@design/tokens";

/**
 * Person Stack Layout
 *
 * Stack navigator for person-related screens.
 * Pushed over the tab bar.
 */
export default function PersonLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.nearBlack,
        headerTitleStyle: { fontFamily: "DMSans", fontWeight: "600" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    />
  );
}
