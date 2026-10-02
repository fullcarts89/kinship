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

/**
 * Device privacy check for F0-D5 (dev builds only). Throws an unhandled
 * error whose message and console breadcrumb deliberately contain a note,
 * a name and an email, so the event that reaches Sentry can be inspected
 * to confirm the scrubber removed them.
 */
export function sendPrivacyTestCrash(): void {
  if (!__DEV__ || !started) return;
  console.log('Saving note for Maya: "her biopsy came back and she is scared"');
  setTimeout(() => {
    throw new Error(
      'Kinship privacy test crash: saving "Maya\'s biopsy came back" for thor@example.com'
    );
  }, 0);
}
