/**
 * Installs the analytics provider (F0-D4). Product analytics are OFF unless
 * EXPO_PUBLIC_ANALYTICS_ENABLED is exactly "true" and a PostHog project key
 * is set; that switch disables the sink globally.
 *
 * EXPO_PUBLIC_ANALYTICS_SCOPE="performance" (the dogfood-v2 build) narrows
 * what can leave the phone to PERFORMANCE_EVENTS: Tell latency, failures,
 * retries and stalls. What is sent is documented in docs/ops/analytics.md.
 */

import { PERFORMANCE_EVENTS, setAnalyticsSink, type AnalyticsSink } from "@/platform/analytics";
import { createPostHogSink } from "@/platform/posthogSink";
import { startStallMonitor } from "@/platform/stallMonitor";

let stopStalls: (() => void) | null = null;

export function startAnalytics(env: Record<string, string | undefined> = {
  EXPO_PUBLIC_ANALYTICS_ENABLED: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED,
  EXPO_PUBLIC_ANALYTICS_SCOPE: process.env.EXPO_PUBLIC_ANALYTICS_SCOPE,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
}, options: { stalls?: boolean } = {}): boolean {
  stopStalls?.();
  stopStalls = null;
  const key = env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
  if (env.EXPO_PUBLIC_ANALYTICS_ENABLED !== "true" || !key) {
    setAnalyticsSink();
    return false;
  }
  const posthog = createPostHogSink({ apiKey: key, host: env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com" });
  setAnalyticsSink(env.EXPO_PUBLIC_ANALYTICS_SCOPE === "performance" ? performanceOnly(posthog) : posthog);
  if (options.stalls !== false) stopStalls = startStallMonitor();
  return true;
}

/** Drops every event that isn't performance telemetry. */
export function performanceOnly(inner: AnalyticsSink): AnalyticsSink {
  return {
    send(event, props) {
      if (PERFORMANCE_EVENTS.includes(event)) inner.send(event, props);
    },
  };
}
