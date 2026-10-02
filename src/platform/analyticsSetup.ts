/**
 * Installs the analytics provider (F0-D4). Product analytics are OFF unless
 * EXPO_PUBLIC_ANALYTICS_ENABLED is exactly "true" and a PostHog project key
 * is set; that switch disables the sink globally. What is sent is
 * documented in docs/ops/analytics.md.
 */

import { setAnalyticsSink } from "@/platform/analytics";
import { createPostHogSink } from "@/platform/posthogSink";

export function startAnalytics(env: Record<string, string | undefined> = {
  EXPO_PUBLIC_ANALYTICS_ENABLED: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
}): boolean {
  const key = env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
  if (env.EXPO_PUBLIC_ANALYTICS_ENABLED !== "true" || !key) {
    setAnalyticsSink();
    return false;
  }
  setAnalyticsSink(
    createPostHogSink({ apiKey: key, host: env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com" })
  );
  return true;
}
