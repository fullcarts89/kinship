import { Redirect } from "expo-router";

/**
 * Entry Point
 *
 * Determines where to route the user on app launch:
 * - Always opens directly to the main app (tabs)
 * - Sign-in is only required when Supabase auth is connected
 *   and the user has no valid session
 *
 * When auth is wired up:
 * - Check session from AuthProvider
 * - If valid session exists → go to tabs (no sign-in needed)
 * - If no session → redirect to /(auth)/login
 */
export default function Index() {
  // TODO: When Supabase auth is connected, uncomment:
  // const { isAuthenticated, isLoading } = useAuth();
  // if (isLoading) return null; // splash screen still showing
  // if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // For now, always go straight to the app — no sign-in required
  return <Redirect href="/(tabs)" />;
}
