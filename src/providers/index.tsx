import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./ThemeProvider";
import { AuthProvider } from "./AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * AppProviders
 *
 * Composes all application-level providers in the correct nesting order.
 * Wraps the entire app in the root layout.
 *
 * Order matters:
 * 1. SafeAreaProvider — provides safe area insets
 * 2. ThemeProvider — design tokens and theme state
 * 3. AuthProvider — authentication state
 * 4. ErrorBoundary — catches unexpected render crashes
 */

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export { AuthProvider, useAuth } from "./AuthProvider";
export { ThemeProvider, useTheme } from "./ThemeProvider";

export default AppProviders;
