import { Stack } from "expo-router";
import { colors } from "@design/tokens";

/**
 * Settings Stack Layout
 *
 * Stack navigator for settings screens.
 * headerShown: false — each screen manages its own header/nav bar
 * to match the Figma Make design.
 */
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F0EC" },
        animation: "slide_from_right",
      }}
    />
  );
}
