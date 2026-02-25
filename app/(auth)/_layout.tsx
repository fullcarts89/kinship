import { Stack } from "expo-router";

/**
 * Auth Layout
 *
 * Stack navigator for authentication flows.
 * No header or tab bar visible during onboarding/login.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FDF7ED" },
        animation: "slide_from_right",
      }}
    />
  );
}
