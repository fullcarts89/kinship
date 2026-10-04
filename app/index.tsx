import { useEffect, useState } from "react";
import { useColorScheme, View } from "react-native";
import { Redirect } from "expo-router";
import { color } from "@/design/tokens";
import { buildEntryShell, readEntryShell, rememberEntryShell, type EntryShell } from "@/platform/entryShell";
import { followSystemAppearance } from "@/ui/appearance";
import { useAuth } from "@/providers";
import { hasCompletedOnboarding } from "@/lib/onboardingStatus";
import { useLaunchShell } from "@/hooks/useFlags";

/**
 * Entry Point
 *
 * Determines where to route the user on app launch:
 * - If Supabase is configured and no session → login screen
 * - First launch (onboarding never completed) → onboarding flow
 * - Otherwise → main app tabs, or the 2.0 shell when shell_v2 is on for
 *   this account (FLG-04; decided once per launch, unknown is 1.0)
 * - If Supabase is NOT configured (mock mode), auth is treated as
 *   signed-in, so mock users still get onboarding on first launch
 */
export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const shell = useLaunchShell(isAuthenticated ? (user?.id ?? null) : null);
  const [entry, setEntry] = useState<EntryShell | null>(() => buildEntryShell());
  const night = useColorScheme() === "dark";

  useEffect(() => {
    hasCompletedOnboarding().then(setOnboarded);
    if (!entry) void readEntryShell().then(setEntry);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This phone's sign-in look follows the shell its account uses.
  useEffect(() => {
    if (isAuthenticated && shell) {
      void rememberEntryShell(shell);
      followSystemAppearance(shell === "v2");
    }
  }, [isAuthenticated, shell]);

  // While deciding: 2.0's paper (no flash of 1.0's cream), else the splash.
  const deciding = entry === "v2" ? <View style={{ flex: 1, backgroundColor: night ? color.night.paper : color.light.paper }} /> : null;
  if (isLoading || onboarded === null) return deciding;

  // No session → login
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // Authenticated (or mock mode) → main app, in the shell this account uses.
  // 2.0 has no 1.0 onboarding: it asks only what it needs, in place.
  if (shell === null) return deciding;
  if (shell === "v2") return <Redirect href="/v2" />;

  // First launch → onboarding
  if (!onboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
