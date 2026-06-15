import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/providers";
import { hasCompletedOnboarding } from "@/lib/onboardingStatus";

/**
 * Entry Point
 *
 * Determines where to route the user on app launch:
 * - If Supabase is configured and no session → login screen
 * - First launch (onboarding never completed) → onboarding flow
 * - Otherwise → main app tabs
 * - If Supabase is NOT configured (mock mode), auth is treated as
 *   signed-in, so mock users still get onboarding on first launch
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    hasCompletedOnboarding().then(setOnboarded);
  }, []);

  // Keep splash screen visible while checking persisted state
  if (isLoading || onboarded === null) return null;

  // No session → login
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // First launch → onboarding
  if (!onboarded) return <Redirect href="/(auth)/onboarding" />;

  // Authenticated (or mock mode) → main app
  return <Redirect href="/(tabs)" />;
}
