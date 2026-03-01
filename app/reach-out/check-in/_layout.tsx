import { Stack } from "expo-router";
import { colors } from "@design/tokens";

/**
 * Check-In Stack Layout
 *
 * Nested stack inside the reach-out flow.
 * Provides a simple headerless stack for the post-reach-out check-in screen.
 */
export default function CheckInLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    />
  );
}
