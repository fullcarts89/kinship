/**
 * Crash reporting (OBS-05)
 *
 * Sentry starts only when EXPO_PUBLIC_SENTRY_DSN is set, so local and
 * test builds send nothing. Every event and breadcrumb goes through
 * crashScrubber first, and the SDK's own PII collection is off.
 */

import * as Sentry from "@sentry/react-native";
import { scrubBreadcrumbAtCapture, scrubEvent } from "@/platform/crashScrubber";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

let started = false;

export function startCrashReporting(): void {
  if (started || !DSN) return;
  started = true;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableCaptureFailedRequests: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event as any),
    beforeBreadcrumb: (crumb) => scrubBreadcrumbAtCapture(crumb as any) as any,
  });
}

export function isCrashReportingEnabled(): boolean {
  return started;
}
