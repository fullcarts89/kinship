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
  - **One exception, dogfood performance scope only (founder CC-18, 7 Oct 2026):** performance events also carry the coarse build and platform (see below). Product analytics never do.
- **`distinct_id`** is a random UUID stored in the on-device store. The sign-out wipe deletes it, so two accounts on one phone never share an id. It is never linked to the Supabase user id.
- **`$process_person_profile: false`** means no person profiles. **`$geoip_disable: true`** means no location enrichment.

## Events and their allowed properties

From plan §23, defined in `AnalyticsEvents`:

| Event | Properties |
|---|---|
| `capture_started` | `source` (text/voice/share/screenshot/siri/widget/post_handoff/post_encounter/photo/onboarding) |
| `capture_completed` | `source`, `chars_bucket` (0-50/51-200/201+), `offline` (boolean) |
| `capture_abandoned` | `chars_bucket` (0-50/51-200/201+): the user left Tell with words not kept |
| `extraction_completed` | `items_n` (0–10), `tier` (auto/light/clarify/none), `latency_ms_bucket` (<1s/1-3s/3-10s/10s+), `model_id` (primary/fallback) |
| `review_item_shown` | `tier` (auto: saved quietly / light: shown to look over), `item_kind` |
| `review_item_accepted` | `tier` (auto/light), `item_kind`: confirmed with Done |
| `review_item_rejected` | `tier` (auto/light, or later: outside a review), `item_kind`: "Not this" |
| `extraction_corrected` | `correction` (person/date/kind/relation/statement), `item_kind`: a change to an extracted item |
| `clarification_shown`, `clarification_answered`, `clarification_dismissed` | `type` (person/relation/new_person/date/keep): what the held question was about (keep: a sensitive or ambiguous-day reading waiting for "Remember"), never its words |
| `review_left` | `how` (done/idle/dismissed), `question_waiting` (boolean) |
| `review_reopened` | `question_waiting` (boolean) |
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

`reason_type` is one of birthday/upcoming/follow_up/promise/anniversary/check_in/season/other (Today v0 sends upcoming and follow_up). `item_kind` is one of fact/event/promise/plan/thread/moment/milestone/tradition/context.

Wired in 1.0 today: `consent_changed` (AI consent) and `deletion_completed` (account).

Wired in the 2.0 shell (Checkpoint D1, internal only): `capture_started`, `capture_completed`, `capture_abandoned`, `extraction_completed`, the `review_*` and `clarification_*` events, `extraction_corrected`, `undo_capture`, and `deletion_completed` (`capture`). They fire from `src/store/understanding.ts` and the Tell screen; `src/store/__tests__/understanding.test.ts` checks that no event carries text, a name or an id.

## PostHog project configuration

**Project:** "Kinship beta" (id 641171) in organization "Kinship", **US cloud**. The app's host is `https://us.i.posthog.com`.

Applied 2 Oct 2026 through the PostHog API with a short-lived personal key. The founder deleted it on 2 Oct, and it now returns 401. Every value was read back from the API after the change. All of these were **on** by default, except IP anonymization and autocapture opt-out, which were off.

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
| PostHog features using third-party AI services | Organization → General | **Off** | ✅ founder, 2 Oct 2026 |
| AI training on anonymized data | Organization → General | **Off** | ✅ founder, 2 Oct 2026 |
| PostHog Desktop beta terms (extra processors) | Organization → General | Not accepted | ✅ |
| IP data capture default (new projects) | Organization → General | On | ✅ founder, 2 Oct 2026 |
| Data retention | Billing | Shortest available | Plan default: not configurable on the current plan (no retention option in Billing). Acceptable because events are content-free; revisit before launch. |
| Project API key | — | Goes into `EXPO_PUBLIC_POSTHOG_KEY` as an EAS environment variable; a public ingestion key | Known; not committed |

## Turning it on and off

- **Global switch:** `EXPO_PUBLIC_ANALYTICS_ENABLED`. Only the exact value `true` installs the sink, and only if `EXPO_PUBLIC_POSTHOG_KEY` is also set. Anything else, including unset, sends nothing.
- **Emergency stop for already-installed builds:** rotate or delete the PostHog project API key. Events with an invalid key are rejected.
- **Review before enabling:** after one internal build with analytics on, inspect PostHog's live events. Check every event against the payload above, then record the review here.

## Performance-only telemetry (dogfood-v2), founder CC-17, 6 Oct 2026

The `dogfood-v2` build sets `EXPO_PUBLIC_ANALYTICS_ENABLED=true` and `EXPO_PUBLIC_ANALYTICS_SCOPE=performance` (in `eas.json`). The PostHog key comes from the EAS environment variable `EXPO_PUBLIC_POSTHOG_KEY`, never the repo. No other build profile turns analytics on; `performanceTelemetry.test.ts` checks this.

**Purpose:** latency, lifecycle failures, retries, timeouts and freeze investigation. **Not** behavioural analytics.

**What the scope does:** it installs a filter (`performanceOnly` in `analyticsSetup.ts`) in front of the PostHog sink. Only the three events below can leave the phone.
- All other events are dropped on the device: review, clarification, Today, hand-off, settings, deletion and so on.
- That includes **`tell_feedback` ("Got it right / Not quite")**, which stays on the note only.

Each event has the envelope shown in "Exactly what one event contains": `api_key`, `event`, a random per-install `distinct_id`, `timestamp`, `$process_person_profile: false`, `$geoip_disable: true`. The properties are exactly these:

| Event | When | Properties (all closed values) |
|---|---|---|
| `tell_lifecycle` | Once per Tell, when its result is first on screen | `outcome` (kept / needs_input / nothing / failed)<br>`total_bucket`: Send → result visible<br>`sync_bucket`: Send → first gateway request (local save, note upload, queue)<br>`gateway_bucket`: the last request's round trip<br>`server_bucket`: time inside ai-gateway, from its `Server-Timing` header<br>`network_bucket`: round trip minus server<br>`render_bucket`: reading → on screen<br>`retries` (0–10)<br>`understood_bucket`, `shown_bucket`: the coarse originals<br>`understanding_bucket` (CC-18): Send tapped → "Understanding…" on screen; `not_shown` when the result came first; `unknown` when this launch didn't see the Send<br>`backgrounded` (CC-18): the app went to the background between Send and the result (`true` / `false` / `unknown`) |
| `tell_failure` | Each failed attempt to understand a Tell | `stage` (offline / timeout / server / limited / gave_up), `attempt` (0–10), `backgrounded` (CC-18, as above) |
| `app_stall` | The JavaScript thread was blocked ≥ 1 s while the app was in the foreground | `duration_bucket`, `tell_work` (boolean: was a Tell being processed) |

**On every performance event (CC-18, dogfood scope only):** the coarse build and platform, so a fix can be told from the build before it.
- `app_version`: the app's version (`1.0.0`);
- `build`: the build's short git commit, baked in by `app.config.ts` from EAS (`EAS_BUILD_GIT_COMMIT_HASH`), else `unknown`;
- `platform`: `ios` or `android`;
- `os_version`: the major OS version only (`26`).
- Never the device model or name, the exact OS build, or anything about the user. Added by `performanceOnly` (`src/platform/buildInfo.ts`); product analytics never carry them.

**Duration buckets:** <0.5s · 0.5-1s · 1-2s · 2-3s · 3-5s · 5-8s · 8-13s · 13-20s · 20-60s · 1-10m · 10m+. A stage that can't be measured is `unknown`, e.g. a reply without a Server-Timing header.

**What is never sent:** Tell text, memory text, names, contacts, relationship content, source content, location, ids of notes, people or memories, device name, screen names.
- Tests: `performanceTelemetry.test.ts` asserts no words, names or ids are in any sent payload. `understanding.test.ts` asserts every property is a closed token.

**Server side:** ai-gateway adds `Server-Timing: total;dur=<ms>` to every response. It carries no other information.

**Retention:** the PostHog plan default, as recorded above (not configurable on the current plan). Acceptable for dogfood because the events are content-free.

**Before enabling outside dogfood** (TestFlight, Alpha):
- re-review this field list and retention;
- record the review here.

**To stop it:**
- remove the two lines from `dogfood-v2` in `eas.json` and rebuild; or
- for builds already installed, rotate or delete the PostHog project key.
