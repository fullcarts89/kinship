# Kinship Phase 0 Report

Branch `claude/gifted-pasteur-e2q0qu` · commits `8c294ec` → `cc13a5d` (base `24d2179`) · 2 Oct 2026

**Status (2 Oct 2026, closeout in progress):** the code is complete and the founder decisions F0-D1–F0-D10 are recorded. **The Phase 0 exit gate has NOT passed yet**: §17 lists what's open, and every open item needs a founder action. Phase 0 is not merged, and Phase 1 has not started.

---

## 1. Executive summary

Phase 0 made Kinship 1.0 trustworthy enough to build 2.0 on.

**Before Phase 0:**

- The public anon key could call the AI model.
- AI "consent" was a local toggle that the server ignored.
- Any user could attach records to another user's people.
- "Delete account" deleted nothing.
- A server error silently showed demo data, and new rows were saved under a fake user `u1`.
- Signing out left one account's data on the phone for the next one.
- Memories appeared on the lock screen.
- Photos pointed at a cache the OS clears.
- The app could write to the calendar, and it asked for permissions it never used.
- There were no tests and no CI.

**Now:**

- Every one of those is fixed and has an automated proof.
- The production database matches the repository migration for migration, shown by an identical schema fingerprint.
- Real account deletion was proven live against production.
- CI runs about 200 checks on every push:
  - 82 Jest tests;
  - 30 Deno tests;
  - 91 pgTAP assertions;
  - tsc, eslint, `deno check`.
- CI is green.

**Still needed from you (§13):**

1. Set the `ANTHROPIC_API_KEY` secret. AI has not worked in production without it.
2. Turn on leaked-password protection.
3. Decide on email confirmation.
4. Choose the analytics provider and create the Sentry project.
5. Approve closing the stale branches (DEL-04).
6. Do one device pass on a dev build.

---

## 2. Completion gate

| Gate item | Status | Proof |
|---|---|---|
| No demo-user fallback | ✅ | `src/hooks/__tests__/signedInData.test.tsx` (16 tests; 17 of the 18 new hook tests fail against the old hooks); `noPlaceholderUser.test.ts` |
| Local data isolation | ✅ | `src/lib/__tests__/localDataReset.test.ts` (10), `src/providers/__tests__/AuthProvider.signOut.test.tsx` (6) |
| Real account deletion and complete server deletion | ✅ live | pgTAP `40_delete_account` (19), Deno (7), Jest (6), plus the live production proof (§7) |
| Authenticated, quota-protected AI | ✅ live | Deno `ai-insight` (23), pgTAP `10_ai_usage` (12); live: no header, anon key and forged token all → 401 |
| Server-enforced consent | ✅ live | pgTAP `20_ai_consent` (14); Deno 403 tests; live: 403 `consent_required` before consent |
| Private lock screen | ✅ | `notificationPrivacy.test.ts` (4; all fail against the old code) |
| Calendar fixed | ✅ | `calendarEngine.test.ts` (4); ESLint bans `createEventAsync` |
| Durable photos | ✅ | `photoStorage.test.ts` (6) |
| Permissions removed | ✅ | `permissions.test.ts` (4) checks the fully resolved config |
| RLS | ✅ live | pgTAP `30_rls_isolation` (37; fails 11 checks without the migration); live cross-user probes |
| Toolchain advisories | ⚠️ partly | Production dependencies went from 2 critical + 11 high to 0 critical + 1 high. That high (`image-size` in Metro) needs an Expo SDK upgrade (§9). |
| CI green | ✅ | GitHub Actions runs 1–3 succeeded; the latest is [run 36943869502](https://github.com/fullcarts89/kinship/actions/runs/36943869502) at `cc13a5d` |
| Scrubbed crash reporting | ✅ code / ⏳ live | `crashScrubber.test.ts` (6). It stays off until you set a Sentry DSN. |

---

## 3. Per-ticket record

"Manual verification" means a check done by hand outside the automated tests. No iOS simulator or device was available in this environment, so on-device checks are listed in §13 as one founder pass.

### Foundations

| ID | Problem | Change | Files | Automated proof | Manual verification | Commit |
|---|---|---|---|---|---|---|
| OBS-01 | No test runner | jest-expo 54, `npm test`, `npm run typecheck`. The first tests found a real bug: an exact anniversary read as "around this time" after noon. | `package.json`, `src/lib/spotlightEngine.ts`, `src/lib/__tests__/spotlightEngine.test.ts` | 4 Jest tests | — | `d65a355` |
| P0-11 | The repo's migrations didn't match production, and there was no DB test harness | Migrations renamed to production's timestamps. The platform's `rls_auto_enable` function was reproduced. A throwaway Postgres + pgTAP harness with a Supabase stand-in was added. | `supabase/migrations/*`, `supabase/tests/**` | pgTAP `00_schema` (9) | The schema fingerprint of the repo build equals production's after every migration | `f82149c` |

### AI gateway and consent

**P0-01** · commits `26fb121` and `578e78c`

- **Problem:** the AI gateway accepted the public anon key and had no quota or input limits.
- **Change:**
  - Reviewed and merged `claude/wonderful-planck-inpeu9`.
  - Split the function into a testable `handler.ts`.
  - The anon key, anonymous users and expired sessions get 401; an Auth outage gets 500.
  - Atomic per-user daily quota (429 with `Retry-After`).
  - Size caps, generic errors, and no user text in logs.
  - The bundled developer key exists only in `__DEV__` builds.
- **Files:** `supabase/functions/ai-insight/*`, `20261001090000_ai_usage.sql`, `src/lib/aiInsightService.ts`
- **Automated proof:** Deno (18 at the time), pgTAP `10_ai_usage` (12)
- **Manual verification:** live probes. No header, the anon key and a forged token all get 401; GET gets 405.

**P0-07** · commit `99c60e3`

- **Problem:** AI consent was a local toggle the server never checked.
- **Change:**
  - New `user_settings` table: `ai_consent` defaults to false, is versioned and can be revoked.
  - The gateway returns 403 before it reads input or spends quota.
  - The app reads consent from the server and fails closed.
  - The D2 disclosure copy is in place.
- **Files:** `20261001100000_user_settings_ai_consent.sql`, `handler.ts`, `src/lib/aiPreferences.ts`, `app/settings/privacy.tsx`
- **Automated proof:** pgTAP `20_ai_consent` (14), 5 Deno tests, Jest `aiPreferences` (10)
- **Manual verification:** live. A call before consent got 403; after consent, the call passed the consent and quota checks.

### Database and accounts

**P0-13** · commit `3259c0d`

- **Problem:** there were six real cross-user holes. Another user could attach memories, interactions and promises to your people, and commit your people to their seasons.
- **Change:**
  - All 18 policies are now `TO authenticated` and use `(select auth.uid())`, with `WITH CHECK`.
  - Parent-ownership checks were added.
  - `rls_auto_enable` can no longer be executed by users.
- **Files:** `20261001110000_rls_hardening.sql`
- **Automated proof:** pgTAP `30_rls_isolation` (37)
- **Manual verification:** live. Attaching to another user's person gets 403 (42501).

**P0-05 / P0-06** · commit `09b1134`

- **Problem:** "Delete account" deleted nothing.
- **Change:**
  - `delete_user_account()` (service role only) deletes every user table, found at run time, and the auth user, then verifies nothing is left.
  - The `delete-account` edge function verifies the caller and removes their Storage files first.
  - The app wipes the device only after the server confirms.
- **Files:** `20261001120000_delete_user_account.sql`, `supabase/functions/delete-account/*`, `_shared/auth.ts`, `src/lib/accountDeletion.ts`, `app/settings/privacy.tsx`
- **Automated proof:** pgTAP `40_delete_account` (19), Deno (7), Jest (6)
- **Manual verification:** live end-to-end proof (§7)

**P0-04** · commit `119f2e8`

- **Problem:** the 2,420-line Account screen was a prototype. Its delete showed a thank-you and did nothing.
- **Change:** a real screen showing who is signed in, a real sign-out, and a route into the real deletion flow.
- **Files:** `app/settings/account.tsx`
- **Automated proof:** covered by the P0-06 and P0-03 tests
- **Manual verification:** device pass (§13)

### Device data

**P0-02** · commit `56334e8`

- **Problem:** a server error showed the demo garden, saved rows under `u1` on the device, and deleted locally only.
- **Change:**
  - Signed in, the hooks show server data or an error, and writes fail loudly.
  - `useMemory` now reads from the server.
  - The demo garden appears only in builds without a backend.
  - The screens that awaited without catching now say what failed.
- **Files:** `src/lib/dataMode.ts`, `src/hooks/use{Persons,Memories,Interactions,Promises,Season}.ts`, `src/services/memoryService.ts`, 4 screens
- **Automated proof:** `signedInData.test.tsx` (16), `demoMode.test.tsx`, `noPlaceholderUser.test.ts`
- **Manual verification:** device pass

**P0-03** · commit `7761c2d`

- **Problem:** signing out left the AI insight cache, growth points, photos-in-memory, the notification log, the export file and scheduled notifications (with names) on the phone.
- **Change:**
  - The wipe now covers all of it.
  - `claimDeviceFor(user)` records the account that owns the device's data, across restarts, and wipes when anyone else signs in.
  - `signOut` wipes before calling the server.
  - Auth events apply in order, and only after the wipe or claim has finished.
- **Files:** `src/lib/localDataReset.ts`, `src/providers/AuthProvider.tsx`, `app/settings/account.tsx` and 4 cache modules
- **Automated proof:** `localDataReset.test.ts`, `AuthProvider.signOut.test.tsx`
- **Manual verification:** device pass

**P0-15** · commit `b0b4372`

- **Problem:** photos were saved as picker-cache paths, which the OS clears.
- **Change:**
  - Every picked photo is copied to `documents/photos/<user>/<uuid>.<ext>`, and that path is what gets saved.
  - Photos are removed when another account claims the device, or when the account is deleted.
- **Files:** `src/lib/photoStorage.ts`, `src/lib/photoPicker.ts`, 4 screens
- **Automated proof:** `photoStorage.test.ts` (6)
- **Manual verification:** device pass

### Device privacy

**P0-08** · commit `c4ff075`

- **Problem:** seasons could write events to the calendar, and Home triggered the calendar permission prompt.
- **Change:** removed the calendar writer and its switch. Home only checks the permission; it never prompts.
- **Files:** `src/lib/seasonCalendar.ts` (deleted), `app/season/new.tsx`, `src/lib/calendarEngine.ts`, `eslint.config.js`
- **Automated proof:** `calendarEngine.test.ts` (4) and the lint rule
- **Manual verification:** lint rule checked against a probe file

**P0-09** · commit `8a3165c`

- **Problem:** the lock screen showed a memory's text and the person's name.
- **Change:** generic copy; the ids travel only in the notification's data.
- **Files:** `src/lib/notificationEngine.ts`, `notificationService.ts`
- **Automated proof:** `notificationPrivacy.test.ts` (4)
- **Manual verification:** —

**P0-10** · commit `90efabb`

- **Problem:** the app asked for contacts and calendar write access, the microphone, storage writes, photo-library writes, Face ID and Reminders.
- **Change:**
  - Least-privilege `app.json`, with blocked permissions and the plugin options that remove the unused strings.
  - `expo-media-library` removed.
- **Files:** `app.json`, `package.json`
- **Automated proof:** `permissions.test.ts` (4)
- **Manual verification:** —

**P0-12** · commit `2ea7d05`

- **Problem:** "Invite" told a person they had been added to someone's garden.
- **Change:** removed the action and `buildInviteMessage`.
- **Files:** `app/person/[id].tsx`, `src/lib/appLinks.ts`
- **Automated proof:** `noInvite.test.ts`
- **Manual verification:** —

### Toolchain and settings

**P0-16** · commit `3dfbe24`

- **Problem:** dependencies were behind SDK patch level, with critical and high advisories.
- **Change:**
  - `expo install --fix` (12 packages).
  - `npm audit fix`, plus in-range overrides for brace-expansion 1.x and postcss.
- **Files:** `package.json`, `package-lock.json`
- **Automated proof:** expo-doctor 18/18, `expo export --platform ios`
- **Manual verification:** —

**P0-14** · commit `c6eee93`

- **Problem:** leaked-password protection is off.
- **Change:** documented the setting with its exact location; changing it needs the dashboard.
- **Files:** `docs/ops/supabase-settings.md`
- **Automated proof:** none possible. The advisor still warns.
- **Manual verification:** **Founder action**

### Observability and cleanup

**OBS-02 / OBS-04** · commit `1617e66`

- **Problem:** there was no CI.
- **Change:** GitHub Actions with three jobs:
  - app: tsc, eslint, jest, and a report-only audit;
  - edge functions: `deno check`, `deno test`;
  - database: Postgres 16 + pgTAP.
- **Files:** `.github/workflows/ci.yml`
- **Automated proof:** runs 1–3 green
- **Manual verification:** making the checks required on main is a **Founder action**

**OBS-03** · commit `5c39de9`

- **Problem:** 37 lint errors.
- **Change:** escaped 30 JSX entities. The Deno resolver override landed with P0-01.
- **Files:** 14 screens
- **Automated proof:** `eslint .` reports 0 errors
- **Manual verification:** —

**OBS-05** · commit `d78abc3`

- **Problem:** there was no crash reporting.
- **Change:**
  - Sentry starts only with a DSN.
  - `beforeSend` and `beforeBreadcrumb` scrub events.
  - PII, screenshots and tracing are off.
  - Source-map auto-upload is disabled until the Sentry project exists.
- **Files:** `src/platform/crash*.ts`, `app/_layout.tsx`, `app.json`, `eas.json`, `.env.example`
- **Automated proof:** `crashScrubber.test.ts` (6). It caught the device-name leak during development.
- **Manual verification:** forced crash on a device is a **Founder action**

**OBS-06** · commit `cc13a5d`

- **Problem:** no analytics schema.
- **Change:**
  - Typed `track()` that accepts only the 20 events in plan §23.
  - Every prop is a closed union, a boolean or a bucket.
  - The sink is a no-op until a provider is chosen.
- **Files:** `src/platform/analytics.ts`, `aiPreferences.ts`, `accountDeletion.ts`
- **Automated proof:** `analytics.test.ts` (5), including a compile-time type test
- **Manual verification:** —

**DEL-01** · commit `2026f37`

- **Problem:** dead modules.
- **Change:** deleted 6 files (3,325 lines). `useVitality` is kept because it is in use (§11).
- **Automated proof:** tsc, jest

**DEL-02** · commit `75f88b6`

- **Problem:** a prototype notifications screen.
- **Change:** deleted the route, its stack entry and the Home bell.
- **Files:** `app/notifications.tsx` (deleted), `app/_layout.tsx`, `app/(tabs)/index.tsx`
- **Automated proof:** tsc (typed routes)

**DEL-03** · commit `1017a54`

- **Problem:** unused dependencies.
- **Change:** removed `react-native-worklets-core`. `expo-media-library` already went in P0-10.
- **Automated proof:** expo-doctor, `expo export`
- **Manual verification:** an EAS dev build is a **Founder action**

**DEL-05** · commit `44df847`

- **Problem:** 1.0 planning docs mixed in with the 2.0 docs.
- **Change:** `.planning/`, `PRD.md` and the old exports moved to `docs/archive/`; the README now points to the 2.0 docs.
- **Files:** `README.md`, `docs/archive/**`

**Not done in Phase 0:**

- **DEL-04** (close stale branches): waits for your approval (§13).
- **OBS-07** (server analytics sink): deferred (§11).

**Docs commits:**

- `8c294ec`: founder decisions D1–D13, Phase 0 authorization, regenerated complete plan.
- `8a5f52e`: Relationship Landscape earmarked as a post-validation exploration (no code).

---

## 4. Security before and after

| Area | Before Phase 0 | After |
|---|---|---|
| AI gateway | The public anon key reached the model; no quota; unbounded input; user text in logs | Verified user token required; anonymous and expired sessions refused; consent required; 50 calls/day atomic quota; size caps; generic errors; no content in logs |
| AI consent | Local toggle; the server never checked | Server-side, versioned, revocable, default off; the gateway returns 403 first |
| Developer API key | Could ship in release builds | Only in `__DEV__` |
| Cross-user writes | 6 holes (attach/re-parent onto another user's person or season) | Parent-ownership `WITH CHECK` on every child table |
| RLS policies | Roles `{public}`; `auth.uid()` evaluated per row; some had no `WITH CHECK` | `TO authenticated`, `(select auth.uid())`, `WITH CHECK` everywhere; structural tests stop regressions |
| `rls_auto_enable()` | Executable by anon and authenticated | Revoked |
| Account deletion | Fake | Server deletes all rows, the auth user and Storage files, and verifies; the app clears only after confirmation |
| Demo fallback | A server error showed demo people and saved under `u1` | Server data or an error only |
| Device data on sign-out | Left behind | Wiped. A different account claiming the device wipes everything, photos included. |
| Lock screen | Memory text and name | Generic copy |
| Calendar | Could write events; prompted from Home | Never writes (lint-enforced); prompts only from Garden Walk setup |
| Permissions | Contacts and calendar write, microphone, storage write, photo-library write, Face ID, Reminders | Contacts read, calendar read, camera, photo library read (+ Android `READ_EXTERNAL_STORAGE` for old Android); everything else blocked |
| Invite | Told people they'd been added | Removed |
| Crash reporting | None | Scrubbed Sentry, off until a DSN is set |
| Analytics | None | Closed, content-free schema; nothing sent until a provider is chosen |

---

## 5. Database and RLS state (production `kddpxiiyxgvjrtpdkvio`)

**Migrations applied and recorded (12):**

- `20260615161700` initial_schema
- `…161711` add_missing_columns
- `…161725` fix_memories_and_enums
- `…161737` add_person_interests
- `…161749` add_person_notes
- `…161805` promises
- `…161818` seasons
- `…161830` platform_rls_auto_enable
- `20261001090000` ai_usage
- `20261001100000` user_settings_ai_consent
- `20261001110000` rls_hardening
- `20261001120000` delete_user_account

**Schema parity:** after each production migration, the md5 fingerprint of production's catalog equalled the build from the repository: `3897f42d…` → `5b3064a7…` → `b7071cbb…` → `ec82f1d7…`.

**RLS:**

- RLS is on for all 10 public tables. New tables get it automatically via the `ensure_rls` event trigger.
- 18 user policies plus `user_settings` and `ai_usage`, all `TO authenticated`.
- The pgTAP suite proves that user B and anonymous visitors cannot read, update, delete, forge or re-parent user A's rows in any table.

**Functions:**

| Function | Who can execute it |
|---|---|
| `consume_ai_call` | authenticated (by design: counts the caller's own usage only) |
| `set_ai_consent` | Runs as the caller (SECURITY INVOKER) |
| `delete_user_account` | service_role only |
| `rls_auto_enable` | No user role |

---

## 6. AI gateway state, and auth and sign-out state

**AI gateway** (`ai-insight` v2, `verify_jwt` on). Guard order:

1. Method check: 405.
2. Authentication: 401, or 500 if Auth is down.
3. Consent: 403.
4. Input validation: 400.
5. Quota: 429 with `Retry-After`.
6. Model call: generic 500 on failure.

The model is called only after all of these pass. Settings: `AI_DAILY_LIMIT` (default 50), `AI_CONSENT_VERSION` (1), `AI_ALLOWED_ORIGINS` (none).

**`ANTHROPIC_API_KEY` is not set on the project.** Every consented call returns 500 until it is. Earlier production AI calls most likely never worked either.

**Auth and sign-out:**

- Sign-in methods: Apple, Google, email.
- On sign-out, from this device or elsewhere (revoked or expired session), the device is wiped:
  - on-device store, AI insight cache, notification log, growth, session photos map, consent copy, export file;
  - scheduled notifications are cancelled.
- When a different account signs in, or an unknown owner is found (an older build or a fresh install), the device is wiped first and other accounts' photos are deleted. This is recorded in the on-device owner record, so it survives restarts.
- The session is exposed to the UI only after the wipe or claim completes.

Kept on purpose:

- **Onboarding/orientation "seen" flags:** they hold no personal data.
- **The account's own photos on a plain sign-out:** there is no server copy in 1.0 (§10).

---

## 7. Deletion proof (live, production, 1 Oct 2026 23:30–23:35 UTC)

Throwaway user `7f2bbb1a-…`:

| Step | Request | Result |
|---|---|---|
| A | AI call before consent | 403 `consent_required` |
| B | `set_ai_consent(true,1)` | 200 |
| C | AI call after consent | Passed auth and consent; 500 from the missing `ANTHROPIC_API_KEY` |
| D | Create own person, memory, promise | 201 ×3 |
| E | Read others' persons | 0 rows |
| E | Attach a memory to another user's person | 403 (RLS) |
| E | Reset own `ai_usage` | 403 |
| E | Call `delete_user_account` directly | 403 |
| F1 | Delete without `{"confirm":true}` | 400 |
| F2 | Delete with the anon key | 401 |
| F3 | Delete, confirmed | 200 `deleted=true`. Removed: persons 1, memories 1, promises 1, `ai_usage` 1, `user_settings` 1, `auth_user` true |
| G | Same token afterwards: delete, AI call | 401 / 401 |
| G | Same token: read persons | `[]` |
| G | Password sign-in | 400 `invalid_credentials` |

**Database check afterwards:**

- 0 rows for that id in `auth.users`, `auth.identities`, `auth.sessions` and `auth.refresh_tokens`.
- 0 rows in all 8 public tables.
- The other account (1 user, 2 persons) was untouched.

---

## 8. CI and test state

GitHub Actions `CI` (`.github/workflows/ci.yml`) runs on pushes to `main` and `claude/**` and on every pull request. Runs 1–3 on this branch all succeeded; the latest, at `cc13a5d`, is [run 36943869502](https://github.com/fullcarts89/kinship/actions/runs/36943869502).

**Final results at `cc13a5d`:**

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | **0 errors**, 128 warnings (unused variables and stale disable directives in 1.0 screens; not errors) |
| `npm test` | 15 suites, **82 tests passed** |
| `deno test` (supabase/functions) | **30 passed** |
| `deno check` (both functions) | Clean |
| `supabase/tests/run-db-tests.sh` | 5 files, **91 assertions, PASS** |
| `npx expo-doctor` | 18/18 |
| `npx expo export --platform ios` | Bundles |
| `npm audit --omit=dev` | 0 critical, **1 high**, 20 moderate |
| `npm audit` | 0 critical, **1 high**, 22 moderate |

---

## 9. Remaining tooling vulnerabilities

| Package | Severity | Path | Why it remains |
|---|---|---|---|
| `image-size` 1.2.1 | High (DoS in JXL/HEIF/ICNS parsers) | `expo` → `@expo/metro` → `metro` | The only fix is image-size 2.x, a breaking API change for Metro 0.83. It parses the repo's own image assets at build time and is not in the app. Clears with the next Expo SDK upgrade. |
| 20 moderate | Moderate | Mostly Expo CLI and Metro build tooling | No in-range fixes; same SDK upgrade |

The CI audit step is report-only until the SDK upgrade.

---

## 10. Known risks

1. **AI is down in production** until you set `ANTHROPIC_API_KEY`. The app falls back to its non-AI copy.
2. **Existing 1.0 users must turn AI on again.** Consent now defaults to off (D3), so nobody has it until they opt in under Settings › Privacy & Data.
3. **Photos exist only on the phone.**
   - If the phone is lost, its photos are lost.
   - A different account signing in on the same phone deletes them.
   - A plain sign-out keeps them for the same account; the Account screen says so.
   - 2.0's private Storage bucket removes this risk.
4. **Email confirmation is off.** Someone could sign up with another person's address.
5. **Nothing has been checked on a device or simulator in this phase.** The hook, auth and photo changes are proven by unit tests and an iOS bundle export, but not on a device.
6. **`consume_ai_call` advisor warning:** accepted by design (it only counts the caller's own usage, which pgTAP proves).
7. **The deployed `ai-insight` is not quite the repo version:** it carries its own copy of `verifiedUserId` and moves to `_shared/auth.ts` at its next deploy. Its behaviour is the same.
8. **Phase 0 lives on this branch, not on `main`.** `main` is still at `5687ed7`. Merging is your call.

---

## 11. Deferred work

| Item | Why | When |
|---|---|---|
| OBS-07 server analytics sink | Needs the analytics provider choice. Its acceptance test ("Planner emits `push_sent`") needs the 2.0 planner. | After the provider decision; with the planner in Phase 1+ |
| DEL-04 close stale branches | Deleting remote branches needs your approval | On approval (§13) |
| P0-14 leaked-password protection | Dashboard-only setting | Founder action |
| Sentry live verification and source maps | Needs a Sentry project, DSN and `SENTRY_AUTH_TOKEN` | Founder action |
| Dev build (DEL-03) and the device pass | Needs EAS and a device | Founder action |
| `image-size` advisory | Needs an Expo SDK major upgrade | With the next SDK upgrade |
| 128 lint warnings | Not errors; in 1.0 screens that 2.0 rewrites | 2.0 rewrite |
| Unindexed `season_commitments` FKs and unused indexes (INFO) | Tables are replaced by the 2.0 schema | Phase 1 schema work |

---

## 12. Deviations from the plan

| Item | What I did differently, and why |
|---|---|
| **P0-11** | Renamed the baseline migrations to production's timestamps instead of moving them to `_legacy/`. The repo and production history now match exactly, and the fingerprint proves parity. |
| **Live end-to-end proofs** | Ran against production with `curl` and SQL instead of Maestro (no iOS simulator available). |
| **Second delete call** | Returns 401, not "200 no-op", because the user no longer exists. |
| **OBS-04** | CI uses the repo's pgTAP harness with a Supabase stand-in instead of `supabase start`. It needs no Docker and runs the same suites in about 15 seconds. |
| **P0-15 vs P0-03** | Sign-out keeps the account's own photos, scoped per account, instead of wiping them. Wiping would permanently lose photos that have no server copy. Another account claiming the device, or deleting the account, removes them. **Please confirm or overrule.** |
| **P0-02** | `src/data/mock.ts` is kept, but only for demo mode (builds without a backend), so UI work without Supabase still works. Signed-in builds can't reach it, and a test bans `user_id: "u1"`. |
| **DEL-01** | `useVitality.ts` is not dead (Home, People and the person screen use it), so it stays. |
| **P0-10** | Also removed `expo-media-library` (part of DEL-03) because its plugin added photo-write and media permissions. Also turned off the plugin-added microphone, Face ID and Reminders strings. |
| **OBS-06** | Built the client with a no-op sink instead of choosing PostHog or a first-party table: the plan leaves that choice open. |
| **OBS-05** | Scrubbing is stricter than plan §23's "strings over 20 characters". Only navigation and HTTP breadcrumbs are kept, and messages are redacted. |
| **P0-16** | One high advisory remains (§9); the acceptance criterion "audit clean" is not fully met. |

No product strategy was changed. D1–D13 are implemented as recorded wherever Phase 0 touched them (D2 disclosure copy, D3 consent).

---

## 13. Founder actions

1. **Supabase → Edge Functions → Secrets:** set `ANTHROPIC_API_KEY`.
2. **Supabase → Authentication → Email:** turn on "Prevent use of leaked passwords" (P0-14).
3. **Decide:** turn on email confirmation? (Recommended.)
4. **Confirm or overrule** the photo handling on sign-out (§12, P0-15).
5. **Choose the analytics provider** (PostHog with IP, autocapture and replay off, or a first-party table).
6. **Sentry:**
   - create the project and set `EXPO_PUBLIC_SENTRY_DSN`;
   - add organization and project to the plugin in `app.json`;
   - add `SENTRY_AUTH_TOKEN` as an EAS secret;
   - remove `SENTRY_DISABLE_AUTO_UPLOAD` from `eas.json`;
   - do one forced test crash.
7. **GitHub:** make the three CI checks required on `main`, and decide when to merge this branch.
8. **DEL-04:** approve closing these branches:
   - `claude/fervent-lovelace-szugz6`
   - `claude/hormozi-value-research-s592G`
   - `claude/review-kinship-history-P53d6`
   - `claude/brave-cori-514h7d`
   - `claude/wonderful-planck-inpeu9` (merged in P0-01)

   (`inspiring-ritchie` equals `main`; `tender-mendel` is listed for your review.)
9. **Device pass** on an EAS dev build:
   - sign in, add a person, memory and photo;
   - turn on airplane mode: errors appear and there is no demo garden;
   - sign out, then sign in as a second account: nothing of the first shows;
   - turn AI on, then off;
   - delete the account.

---

## 14. Phase 1 entry criteria

Phase 1 can start when:

- [ ] Items 1, 2 and 9 of §13 are done.
- [ ] Item 4 is answered.
- [ ] CI is required on `main` and this branch is merged (or you choose to keep Phase 1 on a branch from here).
- [ ] The AI gateway returns 200 for a consented user in production.
- [ ] The security advisor shows only the accepted `consume_ai_call` warning.
- [ ] The analytics provider is chosen. It is not blocking, but it is needed before the beta measures anything.

Already true:

- [x] Production schema equals the repository.
- [x] RLS and deletion are proven live.
- [x] CI is green.
- [x] Every Phase 0 trust item has an automated proof.

---

## 15. Commit range

`24d2179..cc13a5d` on `claude/gifted-pasteur-e2q0qu`:

| Commit | Ticket |
|---|---|
| `8c294ec` | docs: decisions D1–D13 |
| `d65a355` | OBS-01 |
| `f82149c` | P0-11 |
| `26fb121` | P0-01 merge |
| `578e78c` | P0-01 |
| `99c60e3` | P0-07 |
| `3259c0d` | P0-13 |
| `8a5f52e` | docs: Landscape earmark |
| `09b1134` | P0-05/P0-06 |
| `119f2e8` | P0-04 |
| `56334e8` | P0-02 |
| `7761c2d` | P0-03 |
| `c4ff075` | P0-08 |
| `8a3165c` | P0-09 |
| `90efabb` | P0-10 |
| `2ea7d05` | P0-12 |
| `b0b4372` | P0-15 |
| `3dfbe24` | P0-16 |
| `c6eee93` | P0-14 |
| `5c39de9` | OBS-03 |
| `2026f37` | DEL-01 |
| `75f88b6` | DEL-02 |
| `1017a54` | DEL-03 |
| `44df847` | DEL-05 |
| `1617e66` | OBS-02/OBS-04 |
| `d78abc3` | OBS-05 |
| `cc13a5d` | OBS-06 |

This report is committed on top.

---

## 16. Final Supabase advisor state (2 Oct 2026)

**Security:**

- `auth_leaked_password_protection` — WARN. Clears with founder action 2.
- `authenticated_security_definer_function_executable` on `consume_ai_call` — WARN, accepted by design (§5).
- The earlier `rls_auto_enable` warnings are gone.

**Performance (INFO only):**

- 2 unindexed foreign keys on `season_commitments`.
- 6 unused indexes.
- Auth connection pool is absolute (10).

None block Phase 1; the season tables are replaced in 2.0.


---

## 17. Closeout (F0-D1–F0-D10): exit-gate status

Closeout commits: `d3b42c8`…`86a6080` (and this report update).

| Gate | Status | Evidence |
|---|---|---|
| Anthropic key set | ❌ **Open** | Probes at 02:40, 02:41 and 02:45 UTC: the consented call returns 500. The function log shows the SDK found no credentials. The secret was saved as `kinship-production`; it must be named exactly `ANTHROPIC_API_KEY`. |
| Consented production AI call → 200 | ❌ Blocked by the key | — |
| Deployed `ai-insight` = repository source | ✅ | Deployed v4 from commit `d3b42c8`: shared auth module, pinned `@anthropic-ai/sdk@0.131.0` and `@supabase/supabase-js@2.117.2`. `get_edge_function` returns exactly the repo's `index.ts`, `handler.ts` and `_shared/auth.ts`; ezbr `f8be0932…`. (Platform version 3 appeared between my v2 and this v4; v4 supersedes it.) |
| Auth, consent and quota probes on v4 | ✅ | No header → 401; anon key → 401; forged JWT → 401; before consent → 403; bad input → 400 (no model call); after revoking → 403; GET → 405; `ai_usage` = 1 after one consented call. |
| No user content in logs | ✅ | The failure line contains only the user id and the SDK error. The test note ("Ben… Chicago… four hours") appears nowhere. |
| Account deletion still works | ✅ | Three throwaway probe accounts were deleted through `delete-account` (200; `auth_user` true; `ai_usage` and `user_settings` rows removed). |
| Leaked-password protection | ❌ **Founder action** | Dashboard only |
| Email confirmation | ⚠️ Code ready, setting off | Turning it on would have shown every new email sign-up a false "already registered" error. Fixed in `72d1927` (4 tests): new accounts get "Confirm your email" and the link returns to `kinship://login`. **Founder:** turn on "Confirm email" and add `kinship://login` to the redirect URLs. |
| PostHog configured per privacy rules | ⚠️ Code ready, off | `ac28b42`: direct capture-API sink with no SDK (the SDK sends the device name); exact-payload tests; lint guard; global switch off by default; `docs/ops/analytics.md`. **Founder:** create the project with the listed settings and provide the key. Analytics stays off until the payload is reviewed in PostHog's live events. |
| Sentry configured + real event inspected | ❌ **Founder action** | Needs the project, DSN, org/project slugs and auth token, then the device crash (`docs/ops/device-test-plan.md` H) |
| Physical-device pass, isolation, session revocation | ❌ **Founder action** | Procedure and result table: `docs/ops/device-test-plan.md` |
| Required CI checks protect `main` | ❌ **Founder action** | GitHub → Settings → Branches → `main` rule: require a PR and these status checks: `App (tsc, eslint, jest)`, `Edge functions (deno check, deno test)`, `Database (migrations + pgTAP)`. Also turn on "Do not allow bypassing". |
| CI green | ✅ | Runs 1–5 succeeded; run 6 was in progress when written |
| Branch disposition | ✅ recorded | `docs/ops/branch-disposition.md`. Deletions wait for the merge; `tender-mendel` (a superseded parallel attempt at P0-02/03/05) awaits your confirmation. |
| Phase 0 merged, CI green on `main`, prod = merged repo | ⏳ After the gates above | `main` (`5687ed7`) is an ancestor of this branch, so the merge will be conflict-free. |

The accepted `image-size` advisory (F0-D7) and the `consume_ai_call` advisor warning do not block the gate.
