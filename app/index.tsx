import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
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

  useEffect(() => {
    hasCompletedOnboarding().then(setOnboarded);
  }, []);

  // Keep splash screen visible while checking persisted state
  if (isLoading || onboarded === null) return null;

  // No session → login
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // First launch → onboarding
  if (!onboarded) return <Redirect href="/(auth)/onboarding" />;

  // Authenticated (or mock mode) → main app, in the shell this account uses
  if (shell === null) return null;
  return <Redirect href={shell === "v2" ? "/v2" : "/(tabs)"} />;
}
