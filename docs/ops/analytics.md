# Product analytics (PostHog), F0-D4

The beta uses PostHog only through the typed, content-free client. Analytics stays **off** until the configuration below has been reviewed and `EXPO_PUBLIC_ANALYTICS_ENABLED=true` is set for a build.

## How events flow

```
product code → track(event, props)   src/platform/analytics.ts  (closed schema; compile-time enforced)
             → analytics sink         src/platform/posthogSink.ts (installed only by analyticsSetup.ts)
             → PostHog capture API    POST {host}/i/v0/e/
```

Guards:

- **No SDK.** ESLint rejects `posthog-react-native`, `posthog-js` and `posthog-node` anywhere. It also rejects importing `createPostHogSink` outside `src/platform/analyticsSetup.ts`.
- **Why no SDK:** the PostHog React Native SDK attaches device and app properties automatically, including the device name (usually the owner's name), and ships autocapture and session-replay code.
- **Compile-time schema.** The `@ts-expect-error` type tests in `src/platform/__tests__/analytics.test.ts` fail `tsc` if free text, unknown props or unknown events ever become sendable.

## Exactly what one event contains

```json
{
  "api_key": "<project key>",
  "event": "consent_changed",
  "distinct_id": "<random id for this install>",
  "timestamp": "2026-10-02T10:00:00.000Z",
  "properties": {
    "scope": "ai_processing",
    "granted": true,
    "$process_person_profile": false,
    "$geoip_disable": true
  }
}
```

- **Nothing else is sent.** That includes names, emails, phone numbers, note or memory text, contact names, relationship content, free-form values, AI prompts or outputs, device names, app versions and screen names. `src/platform/__tests__/posthogSink.test.ts` asserts the exact payload.
- **`distinct_id`** is a random UUID stored in the on-device store. The sign-out wipe deletes it, so two accounts on one phone never share an id. It is never linked to the Supabase user id.
- **`$process_person_profile: false`** means no person profiles. **`$geoip_disable: true`** means no location enrichment.

## Events and their allowed properties

From plan §23, defined in `AnalyticsEvents`:

| Event | Properties |
|---|---|
| `capture_started` | `source` (text/voice/share/screenshot/siri/widget/post_handoff/post_encounter/photo/onboarding) |
| `capture_completed` | `source`, `chars_bucket` (0-50/51-200/201+), `offline` (boolean) |
| `extraction_completed` | `items_n` (0–10), `tier` (auto/light/clarify), `latency_ms_bucket` (<1s/1-3s/3-10s/10s+), `model_id` (primary/fallback) |
| `extraction_corrected` | `correction` (person/date/kind/relation/removed), `item_kind` (fact/plan/promise/moment/preference) |
| `clarification_answered`, `clarification_dismissed` | `type` (person/date/kind) |
| `undo_capture` | none |
| `reason_surfaced` | `reason_type`, `surface` (today/push/brief), `score_bucket` (low/mid/high) |
| `reason_dismissed` | `reason_type`, `mode` (not_now/not_helpful) |
| `handoff_opened` | `reason_type` (optional), `channel` (text/call/facetime/whatsapp/email/in_person/other) |
| `return_check_answered` | `answer` (yes/not_yet), `minutes_since_handoff_bucket` (<15/15-60/1-6h/6h+) |
| `reason_marked_done` | `reason_type` |
| `reason_feedback` | `useful` (yes/no) |
| `incorrect_report` | `what` (person/fact/date) |
| `brief_viewed` | `lines_n` (0–10) |
| `push_sent`, `push_opened` | `tier` (quiet/normal/important) |
| `settings_changed` | `key` (ai_consent/notifications/garden_walk/calendar_matching/quiet_hours/appearance); never the value |
| `deletion_completed` | `scope` (item/capture/person/account) |
| `consent_changed` | `scope` (ai_processing/analytics/notifications), `granted` (boolean) |

`reason_type` is one of birthday/follow_up/promise/anniversary/check_in/season/other.

Wired in 1.0 today: `consent_changed` (AI consent) and `deletion_completed` (account).

## PostHog project configuration

**Project:** "Kinship beta" (id 641171) in organization "Kinship", **US cloud**. The app's host is `https://us.i.posthog.com`.

Applied 2 Oct 2026 through the PostHog API with a short-lived personal key. The founder deleted it on 3 Oct, and it now returns 401. Every value was read back from the API after the change. All of these were **on** by default, except IP anonymization and autocapture opt-out, which were off.

| Setting | API field | Value | State |
|---|---|---|---|
| Discard / anonymize client IPs | `anonymize_ips` | `true` | ✅ read back |
| Autocapture | `autocapture_opt_out` | `true` (off) | ✅ |
| Exception autocapture | `autocapture_exceptions_opt_in` | `false` | ✅ (Sentry handles errors) |
| Web vitals | `autocapture_web_vitals_opt_in` | `false` | ✅ |
| Console-log capture | `capture_console_log_opt_in` | `false` | ✅ |
| Performance / network capture | `capture_performance_opt_in` | `false` | ✅ |
| Dead clicks | `capture_dead_clicks` | `false` | ✅ |
| Heatmaps | `heatmaps_opt_in` | `false` | ✅ |
| Session replay | `session_recording_opt_in` | `false` | ✅ |
| Surveys | `surveys_opt_in` | `false` | ✅ |
| Person profiles | Not set at project level; every event sends `$process_person_profile: false` | — | ✅ by payload |
| PostHog features using third-party AI services | Organization → General | **Off** | ✅ founder, 3 Oct 2026 |
| AI training on anonymized data | Organization → General | **Off** | ✅ founder, 3 Oct 2026 |
| PostHog Desktop beta terms (extra processors) | Organization → General | Not accepted | ✅ |
| IP data capture default (new projects) | Organization → General | On | ✅ founder, 3 Oct 2026 |
| Data retention | Billing | Shortest available | Plan default: not configurable on the current plan (no retention option in Billing). Acceptable because events are content-free; revisit before launch. |
| Project API key | — | Goes into `EXPO_PUBLIC_POSTHOG_KEY` as an EAS environment variable; a public ingestion key | Known; not committed |

## Turning it on and off

- **Global switch:** `EXPO_PUBLIC_ANALYTICS_ENABLED`. Only the exact value `true` installs the sink, and only if `EXPO_PUBLIC_POSTHOG_KEY` is also set. Anything else, including unset, sends nothing.
- **Emergency stop for already-installed builds:** rotate or delete the PostHog project API key. Events with an invalid key are rejected.
- **Review before enabling:** after one internal build with analytics on, inspect PostHog's live events. Check every event against the payload above, then record the review here.
