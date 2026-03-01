import { Redirect } from "expo-router";
import { useAuth } from "@/providers";

/**
 * Entry Point
 *
 * Determines where to route the user on app launch:
 * - If Supabase is configured and user has a valid session → tabs
 * - If Supabase is configured and no session → login screen
 * - If Supabase is NOT configured (mock mode) → tabs (dev workflow)
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  // Keep splash screen visible while checking persisted session
  if (isLoading) return null;

  // No session → login
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // Authenticated (or mock mode) → main app
  return <Redirect href="/(tabs)" />;
}
