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
| GitHub integration: production branch | Project Settings → Integrations → GitHub | **`main`**. Merging a reviewed PR to `main` is what deploys new migrations; no other branch may be production. | **`main`** (set by the founder 2 Oct 2026, 21:08 UTC). It had been `claude/gifted-pasteur-e2q0qu`, which let a push of the Checkpoint A migrations apply them to production before review (see `docs/phase1/checkpoint-a-schema-review.md` §7). |
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

- `authenticated_security_definer_function_executable` (WARN) on
  `public.set_ai_consent` (since Checkpoint A): **accepted by design.** It
  writes the caller's own consent and the append-only consent ledger, which
  users can't write directly. It acts only on `auth.uid()`.

Performance (INFO only): two unindexed foreign keys on `season_commitments`,
and six unused indexes. Both are left alone: the 2.0 schema replaces these
tables.

## Applied migrations

`20260615161700` … `20260615161830` (baseline, renamed to timestamps in
P0-11), `20261001090000_ai_usage`, `20261001100000_user_settings_ai_consent`,
`20261001110000_rls_hardening`, `20261001120000_delete_user_account`.

Kinship 2.0 (Checkpoint A), applied 2 Oct 2026 21:01 UTC by the GitHub
integration (early; see the review doc): `20261002210000_v2_foundation`,
`20261002210100_v2_captures_memory`, `20261002210200_v2_reasons_connections`,
`20261002210300_v2_platform`. Pending, deploys on merge to `main`:
`20261002220000_v2_supersede_cycles`, `20261002230000_v2_review_amendments`.

**OPS-1 (operational invariant, CA-9):** migrations reach production only
through a reviewed PR merged to `main`. The GitHub integration's production
branch stays `main`; nobody applies schema changes by hand.

## Deployed edge functions

| Function | Version | Notes |
|---|---|---|
| `ai-insight` | 4 | Auth, consent (403), validation, quota (429). Deployed from `d3b42c8`; identical to the repo (shared `_shared/auth.ts`, pinned SDKs). |
| `delete-account` | 5 (platform) | Service role is used only after verifying the caller's own token. Redeployed from `main` (`7c57259`) on 2 Oct 2026; ezbr `c77ab4b0…`. |
