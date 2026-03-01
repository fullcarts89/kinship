import { Stack } from "expo-router";
import { colors } from "@design/tokens";

/**
 * Reach Out Stack Layout
 *
 * Stack navigator for the reach-out flow.
 * Presented as a modal.
 */
export default function ReachOutLayout() {
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
