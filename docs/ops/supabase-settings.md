# Supabase project settings

Project: `kddpxiiyxgvjrtpdkvio`. These are the settings that live outside the
migrations and edge-function code. They have to be set in the Supabase
Dashboard. Keep this file current whenever one changes.

## Required settings

| Setting | Where | Required value | State (2026-10-01) |
|---|---|---|---|
| Leaked-password protection (P0-14, F0-D3) | Authentication → Sign In / Providers → Email → "Prevent use of leaked passwords" | On | **On** (2 Oct 2026; `password123` rejected as pwned; advisor clear) |
| `ANTHROPIC_API_KEY` | Edge Functions → Secrets | Anthropic key for the ai-insight gateway | **Set** (2 Oct 2026). Consented production call → 200. The Anthropic account needs API credit (Plans & Billing); with none, calls fail with "credit balance is too low". |
| Session lifetime (low-friction sign-in) | Authentication → Sessions | **Time-box user sessions: off (never). Inactivity timeout: off (never). Single session per user: off.** The 1 h access-token (JWT) expiry stays at its default; the app renews it silently with the refresh token, so users stay signed in indefinitely. Turning on a time-box or inactivity timeout would force periodic re-sign-in. | Expected at defaults (all off). The founder confirms on the Sessions page. Device test F showed the app signs out only when the server session is gone. |
| `AI_DAILY_LIMIT` | Edge Functions → Secrets | Calls per user per UTC day (default 50 when unset) | Unset (default 50) |
| `AI_CONSENT_VERSION` | Edge Functions → Secrets | Must equal `AI_CONSENT_VERSION` in `src/lib/aiPreferences.ts` (1) | Unset (default 1) |
| `AI_ALLOWED_ORIGINS` | Edge Functions → Secrets | Comma-separated browser origins; empty for the native app | Unset (no browser origins) |
| JWT verification | Edge Functions → ai-insight, delete-account | On | On (both) |

## Recommended (decision for the founder)

| Setting | Where | Recommendation | State |
|---|---|---|---|
| Email confirmation (F0-D2) | Authentication → Sign In / Providers → Email → "Confirm email" | On | **On** (2 Oct 2026) |
| Redirect URLs | Authentication → URL Configuration | Includes `kinship://login` (confirmation links return to the app) | **Set** |
| Sign in with Apple | Authentication → Sign In / Providers → Apple | Enabled; Client IDs = `com.zenroost.kinship`; no OAuth secret (native ID-token flow only) | **Set** (2 Oct 2026) |
| Custom SMTP | Authentication → Emails → SMTP | Resend: `smtp.resend.com:465`, user `resend`, password = Resend API key (sending-only, zenroost.com); sender `Kinship <hello@zenroost.com>`; 60 s per-user interval | **Set** (2 Oct 2026). Domain zenroost.com verified in Resend: DKIM `resend._domainkey`, SPF via CNAMEs `send`/`rsend` → `*.forge.rmta.net`, DMARC `p=none`. The existing Google Workspace MX/SPF are unchanged. End-to-end delivery is proven by the device test's email sign-up. |
| Auth DB connections | Settings → Database → Auth pool | Percentage-based (performance advisor, INFO) | Absolute (10) |

## Advisor state after Phase 0 (2026-10-01)

Security:
- `auth_leaked_password_protection` (WARN): clears when the setting above is turned on.
- `authenticated_security_definer_function_executable` (WARN) on
  `public.consume_ai_call`: **accepted by design.** The gateway calls it
  with the user's own token, so it must be executable by `authenticated`.
  It only ever counts the caller's own usage (`auth.uid()`), and the usage
  table itself can't be written by users. Proven in
  `supabase/tests/database/10_ai_usage.sql`.

Performance (INFO only): two unindexed foreign keys on `season_commitments`,
and six unused indexes. Both are left alone: the 2.0 schema replaces these
tables.

## Applied migrations

`20260615161700` … `20260615161830` (baseline, renamed to timestamps in
P0-11), `20261001090000_ai_usage`, `20261001100000_user_settings_ai_consent`,
`20261001110000_rls_hardening`, `20261001120000_delete_user_account`.

## Deployed edge functions

| Function | Version | Notes |
|---|---|---|
| `ai-insight` | 4 | Auth, consent (403), validation, quota (429). Deployed from `d3b42c8`; identical to the repo (shared `_shared/auth.ts`, pinned SDKs). |
| `delete-account` | 1 | Service role is used only after verifying the caller's own token. |
