/**
 * Onboarding Status
 *
 * Persists whether the user has completed the first-launch onboarding
 * flow, using expo-secure-store (matching the orientation pattern).
 * The entry redirect (app/index.tsx) routes new users to onboarding
 * exactly once per install.
 */

import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "kinship.onboarding.status";

export async function hasCompletedOnboarding(): Promise<boolean> {
  // Dev builds replay onboarding on every launch so the flow is easy to
  // iterate on. Release builds show it exactly once per install.
  if (__DEV__) return false;
  try {
    return (await SecureStore.getItemAsync(STORAGE_KEY)) === "completed";
  } catch {
    // If storage is unavailable, err on the side of not re-showing
    // onboarding — a blank flow is worse than skipping it.
    return true;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, "completed");
  } catch {
    // best-effort
  }
}
