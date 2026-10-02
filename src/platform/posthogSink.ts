/**
 * PostHog sink for the typed analytics client (F0-D4)
 *
 * Deliberately not the PostHog SDK: the SDK attaches device and app
 * properties automatically (including the device's name, which is often
 * its owner's name) and carries autocapture and session-replay code. This
 * sink sends exactly the event and the schema props that `track()` allows,
 * plus two PostHog control flags, to PostHog's capture endpoint:
 *
 *   { api_key, event, distinct_id, timestamp,
 *     properties: { ...schema props, $process_person_profile: false, $geoip_disable: true } }
 *
 * - distinct_id is a random id for this install. It lives in the on-device
 *   store, so the sign-out wipe resets it and two accounts on one phone are
 *   never linked.
 * - No person profiles, no GeoIP lookup. Client IPs are discarded by the
 *   project setting documented in docs/ops/analytics.md.
 * - Fire-and-forget with a timeout; failures are dropped, never retried or
 *   stored.
 *
 * Only src/platform/analyticsSetup.ts may install it (ESLint enforces).
 */

import * as Crypto from "expo-crypto";
import { loadCollection, saveCollection } from "@/lib/localStore";
import type { AnalyticsEventName, AnalyticsSink } from "@/platform/analytics";

const INSTALL_ID_KEY = "analytics-install-id";
const TIMEOUT_MS = 5000;

export interface PostHogConfig {
  apiKey: string;
  /** e.g. https://us.i.posthog.com or https://eu.i.posthog.com */
  host: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

let installId: Promise<string> | null = null;

/** Forget the cached install id (the stored one goes with the sign-out wipe). */
export function resetAnalyticsInstallId(): void {
  installId = null;
}

function getInstallId(): Promise<string> {
  if (!installId) {
    installId = loadCollection<string>(INSTALL_ID_KEY).then(([stored]) => {
      if (stored) return stored;
      const fresh = Crypto.randomUUID();
      saveCollection(INSTALL_ID_KEY, [fresh]);
      return fresh;
    });
  }
  return installId;
}

export function createPostHogSink(config: PostHogConfig): AnalyticsSink {
  const doFetch = config.fetchImpl ?? fetch;
  const now = config.now ?? (() => new Date());
  const endpoint = `${config.host.replace(/\/+$/, "")}/i/v0/e/`;

  return {
    send(event: AnalyticsEventName, props: Record<string, string | number | boolean>) {
      const timestamp = now().toISOString();
      void getInstallId()
        .then((distinctId) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
          return doFetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: config.apiKey,
              event,
              distinct_id: distinctId,
              timestamp,
              properties: { ...props, $process_person_profile: false, $geoip_disable: true },
            }),
            signal: controller.signal,
          }).finally(() => clearTimeout(timer));
        })
        .catch(() => {
          // Analytics never breaks the app and never queues user data.
        });
    },
  };
}
