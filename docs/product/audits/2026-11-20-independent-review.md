# Independent product, UX, security and engineering review (20 Nov 2026)

**Status: dated independent review, NOT canonical.** Nothing here changes product direction, the contract or the coverage matrix. Every recommendation is a proposal for the founder; nothing was implemented, merged, deployed or migrated. Readiness labels are the contract's only three.

**Reviewed:** `fullcarts89/kinship`, `main` at `c2e0ee7` (14 Nov 2026), plus the production Supabase project read-only. **Review branch:** `claude/independent-review-audit-piymeg` carries only this document and the lab screenshots in `docs/product/screens/review-2026-11-20/` (fixture data, no real people). **Method:** code reading with file:line evidence, the local checks (`tsc`, `eslint`, `jest`), production schema/function/flag state through the Supabase API, and a web export of the 2.0 lab (`EXPO_PUBLIC_V2_LAB=1`) rendered at 390 × 844 and 1280 × 900 in Chromium. **No iPhone, simulator, EAS or Maestro was available**; every statement about a phone is marked UNVERIFIED.

Contents: A. Executive decision memo · Phase 0 ground truth · Phase 1 product · B. Audit appendix (Phases 2–7; substitute checklists, see the missing-coverage note) · C. Ranked backlog with evidence classes · D. Design opportunity shortlist · E. Implementation handoff (specs only) · F. Coverage and uncertainty.

**Execution rule.** This is a read-only audit. Nothing in it is authorisation to implement; the specs in E are proposals that wait for the founder's explicit approval.

---

# A. Executive decision memo

## Where the product is

Kinship 2.0 is a complete, coherent first-session product with an unusually strong trust layer: a source under every line, sensitive readings held for a yes, exact Undo, one question for two candidates, Pause reminders, merge, export and verified account deletion, all of it under RLS with 30 pgTAP suites and a content-free telemetry schema that cannot carry user text. The merged `main` is green in CI (`tsc` clean, 0 lint errors, Jest 132 suites / 1,332 tests locally, Deno and pgTAP in CI), production holds all 42 migrations, and the three edge functions verify JWTs.

It is a two-person household pilot: 3 accounts, 2 active in the last 14 days, every flag off by default, with `notebook_deck` and `voice_capture` on for the same two accounts. **Readiness: NOT READY** for wife dogfood. No founder native pass is recorded since the 5–8 Nov merges (Moment Deck × Notebook, trust floor, voice, PRs #78–#88), and the CMR-1 release candidate (PR #93) is explicitly waiting for one.

The thesis ("brings it back when it matters") is still untested, because nothing runs while the app is closed: no push token is ever registered, no `pg_cron` job exists, and the one private local notification is scheduled only from the foreground after a useful Moment. That is a known, founder-sequenced gap (CC-25 "commit next"), not a surprise, but it is the single largest product risk.

## Top three risks

1. **A transient server error can drop a user's edit or make a note vanish from the phone.** `classifyError` treats every `PGRST*` and `42*` code as permanent (`src/store/supabaseRemote.ts:20-22`); the sync engine then deletes the outbox op and restores the server row, or removes the row when the server has none (`src/store/syncEngine.ts:183-186, 244-261`). A PostgREST schema-cache lag right after a migration merge is exactly this shape, and migrations auto-apply on every merge to `main`. The conflict is recorded and shown in context ("This changed on another device."), so it is not silent, but it is wrong, and a pull failure on a required table is swallowed to `console.error` with no user-visible state (`src/store/understanding.ts:674-678`). Fix before the wife's build (small; Appendix E.1).
2. **"Deleted" notes are kept on the server indefinitely.** `purge_tombstones()` and `purge_expired_capture_reviews()` exist but nothing schedules them (`20261002210300_v2_platform.sql:272`, `20261004100000_v2_capture_reviews.sql:237`). A tombstoned note keeps its `raw_text`; the privacy promise the Source view makes ("Delete this note") is only true on the phone. Fix before anyone outside the household uses it (one migration; Appendix E.2).
3. **The live treatment has not been seen by a VoiceOver user, and its poster likely hides its buttons.** `MomentPoster` is one accessible `Pressable` wrapping Message / Not now (`src/features/today/deck/DeckParts.tsx:72-79`); on iOS an accessible container groups its children, so the actions become unreachable. UNVERIFIED on a device, but the notebook review's `LineRow` already uses the correct pattern (`accessible={false}`), so the fix is local. More broadly, nothing about Reduce Motion, Dynamic Type or VoiceOver on the Notebook/Deck treatment has run on a phone.

Also material, lower: no alerting of any kind (a provider outage is discovered by the user after ~2 h of silent retries); Google sign-in uses the implicit OAuth flow over a hijackable custom scheme (Medium; fix with PKCE before public beta); one Tell can cost up to six model calls against one quota unit.

## Top three opportunities

1. **Run the founder native pass on `main` now, then CMR-1.** Everything else in this review is cheaper than another week without device evidence. The pass script exists (`moment-deck-implementation.md` §7, `cmr1-delivery.md` §F on PR #93).
2. **Close the "closed app" gap with what is already built:** verify the local Moment notification on a phone (permission after a useful Moment, 09:00 delivery, quiet hours, D4 caps), then measure the showing-up moment (return-check Yes within three days) weekly for the two pilot accounts. This is the only metric that can validate the thesis before server push.
3. **Three small trust fixes that reduce the founder's testing burden:** the People empty-state flash on cold open (alpha treatment, `src/features/people/PeopleView.tsx:236-244`); "Not this" on the person page forgetting without confirm or Undo (`src/features/person/ItemSheet.tsx:109`; What Kinship knows confirms); Call on the person page opening the hand-off sheet with Messages as the primary (`app/v2/person/[id]/index.tsx:207-208`). Each is a few lines with a Jest proof.

## What should remain unchanged

The sync engine's optimistic versioning and three-way merge; the per-user SQLCipher store and sign-out wipe; the understanding state machine (persisted, resumable, bounded backoff, "busy is not an attempt"); the gateway's guard order (auth → consent → flag → ownership → claim → quota → model → one atomic write → content-free log) and its treatment of model output as untrusted; the closed analytics schema and Sentry scrubber; the trust mechanics on every surface; the first-run gates; the copy voice. No new dependency, library, WebGL effect or design-system swap is recommended (Phase 5).

## What should be deferred

Push delivery (E15) until the native pass and the local notification have evidence; Your story together, year-ago line, Reconnect, Reflection, Brief (all already deferred with founder approval); 1.0 deletion (`KINSHIP_2_DELETION_PLAN.md`) until after the wife's first build; any visual experiment on the alpha treatment while two treatments coexist (decide which one new accounts get first; Phase 1 note); Dependabot, SHA-pinned actions, `deno.lock` and a blocking `npm audit` (do them, but after the pass).

## Recommended next milestone

**"Founder native pass of `main` + CMR-1 RC, with the three FIX NOW trust fixes and the sync-classification fix in the same build."** Exit: every row of §7 of `moment-deck-implementation.md` and §F of the CMR-1 delivery doc PASS on the founder's phone; VoiceOver reaches every action on Today; the purge schedule is merged; readiness moves to READY FOR WIFE DOGFOOD or the ledger says why not.

---

## Phase 0 — Ground truth

| Item | Value |
|---|---|
| Repository | `fullcarts89/kinship` (the only repository reviewed) |
| Reviewed commit | `main` at `c2e0ee7` (merge of PR #88, 14 Nov 2026) |
| Review branch | `claude/independent-review-audit-piymeg` (this document only; no code changed) |
| Review date | 20 Nov 2026 |
| Environment | Linux container; no iPhone, simulator, EAS or Maestro. Read-only access to the production Supabase project (`kddpxiiyxgvjrtpdkvio`) for schema, migrations, function versions, advisors and row counts. No user content was read |
| CI on `main` | Green: run 783 on `c2e0ee7` (app, edge functions, database jobs) |
| Local checks (this review) | `npx tsc --noEmit` clean · `npx eslint app src` 0 errors / 141 warnings · `TZ=UTC npx jest --ci`: 132 suites, 1,332 tests, all passing (run in this environment) · `npm audit --omit=dev`: 7 high, 23 moderate, all in build-time transitive dependencies (undici, source-map-js, postcss-selector-parser, uuid via xcode) |

### Stack (verified in `package.json`, `app.json`, `eas.json`)

Expo SDK 54 · React Native 0.81.5 · React 19.1 · Expo Router 6 · NativeWind 4 (1.0 only; 2.0 uses `src/design/tokens.ts`) · Reanimated 4.1 · react-native-svg · expo-sqlite with SQLCipher (per-user encrypted store) · Supabase JS 2.97 (auth, Postgres with RLS, three Deno edge functions) · Anthropic through the `ai-gateway` edge function only · Sentry RN 7.2 (scrubbed) · PostHog through a hand-written content-free sink (no SDK; off unless a build sets `EXPO_PUBLIC_ANALYTICS_ENABLED=true`) · expo-updates configured (`runtimeVersion.policy: appVersion`) · iOS portrait only; `supportsTablet: false`.

### Production state (read on 20 Nov 2026)

- **Migrations:** 42 applied in production = 42 in the repository (last `20261106090000_v2_person_pronouns`). Parity holds.
- **Edge functions:** `ai-gateway` v17, `delete-account` v6, `ai-insight` v6, all with JWT verification on. The CMR-1 release plan (PR #93) expects `ai-gateway` v18 after merge.
- **Accounts:** 3 users; 2 with people; 2 active in the last 14 days (10 captures). This is a two-person household pilot, not a public product.
- **Flags:** every flag `default_on = false`, `rollout_pct = 0`. Overrides: `shell_v2`, `tell`, `ai_extraction`, `memory_v2`, `notebook_deck`, `voice_capture` on for the same 2 accounts; every other flag (`push_delivery`, `weekly_brief`, `reasons_engine`, `today`, `ask_kinship`, `sprig_marks`, `garden_view`, …) has no override. **The live product for both real users is the Notebook/Moment Deck treatment with on-device voice.**
- **Security advisors:** 6 SECURITY DEFINER functions callable by `authenticated` (`close_capture_review`, `consume_ai_call`, `set_ai_consent`, `refresh_my_reasons`, `merge_people`, `undo_merge_people`); each checks `auth.uid()` and scopes rows to the caller (verified in `20261005090000_v2_reasons_v0.sql:143-166`, `20261030090000_v2_trust_floor.sql:150-200, 336-352`). Four RLS-enabled tables with no policies are service-role-only by design. `docs/ops/supabase-settings.md` documents the first four; `merge_people`, `undo_merge_people` and `refresh_my_reasons` are not yet recorded there.
- **Nothing runs while the app is closed.** No `pg_cron` schedule exists (three migrations say "scheduled when…"), no push token is ever registered (`grep getExpoPushTokenAsync` → 0 hits). The only proactive channel is one local notification scheduled on the phone (`src/lib/momentNotification.ts`), gated on a permission ask that happens only after a useful Moment.

### Work completed, underway, awaiting approval

| State | What |
|---|---|
| **Merged and in production** | The whole 2.0 first session (welcome → sign in → consent → people → already worth knowing → first Tell), Tell → review/clarification/sensitive confirm, People, person page (Portrait + What Kinship knows in sections), Source, correction, Today with birthdays/events/milestones/promises/open threads, hand-off + return check, Moment detail, trust floor (Pause reminders, merge, export, delete account), Ask v1 (retrieval in People search), Option A partial captures, Moment Deck × Notebook (behind `notebook_deck`), on-device voice (behind `voice_capture`), the K-series fixes through K36 |
| **Underway (open draft PRs, base `main`)** | **CMR-1 core memory reliability**: #89 (capture, K34/K35), #90 (completeness, migration `20261114090000`), #91 (identity, K36), #92 (eval suite), #93 (integrated RC; 110 files, 12k additions; held-out evals meet every gated target; NOT READY pending the native pass) |
| **Awaiting a founder decision** | Native pass of the Notebook/Deck + CMR-1 RC; merge/deploy/build of #93; copy decisions DN-10 etc. (`moment-deck-implementation.md` §6); #83 (release record, docs; now dirty against `main`) |
| **Exploration only, not product** | #52, #55, #57, #76 (research/design, "do not merge"); #60 (agent-loop pilot, DO NOT MERGE); #62, #68, #72 (superseded by #74 per the 5 Nov release plan, still open) |

Nothing in this review infers production behaviour from an unmerged PR; CMR-1 is cited only as "underway".

### Existing review findings and their status

The repository carries an unusually complete audit trail: `bug-ledger.md` (F/G/H/N/I/J/K series with VERIFIED only from a physical iPhone), `interaction-motion-audit.md` (every animation, fixed inconsistencies), `founder-native-feedback.md`, `wife-dogfood-final-review.md`, `2026-10-16-roadmap-audit.md`, `trust-floor.md`, `ask-v1.md`, `moment-deck-implementation.md` (12 simulator defects fixed; one pre-existing trust gap fixed in PR #79). This review does not repeat items those files already carry; it cites them and reports only the remaining gaps.

### Readiness, in the contract's own labels

**NOT READY** for wife dogfood (contract §10). The merged `main` has not had a founder native pass since the Notebook/Deck and trust-floor merges of 5–8 Nov (the 5 Nov release plan records the merges; the founder walkthrough of `moment-deck-implementation.md` §7 is not recorded as done). PR #93 is the next candidate for READY FOR FOUNDER NATIVE PASS.

---

## Phase 1 — Product outcome and journey audit

### The promise, in the product's own terms

- **Job to be done:** remember what matters about the people I care about, and bring it back when it matters, so I show up (contract §2). The meaningful outcome is a real-world interaction, not a screen.
- **Core loop as implemented:** Tell → Understand (gateway + model) → Memory (sourced lines) → Moment (Today) → Reason → hand-off to Messages/Phone/FaceTime/WhatsApp → return check ("Did you reach Ben?") → "Anything worth remembering?".
- **The five journeys this review traced** (code paths in Appendix B): J1 first session; J2 Tell → kept/review/clarify/sensitive; J3 person → Source → correction → What Kinship knows; J4 Moment → hand-off → return check; J5 settings (pause, merge, export, delete, consent).

### Where the product stands against its own promise

| Question | Answer, with evidence |
|---|---|
| Simplest successful first-time experience? | Welcome → Apple → consent → pick a few contacts → "Already worth knowing" (a real birthday within 14 days) → one typed sentence → Today with a Kept line. About five taps plus picks; `app/__tests__/firstRun.test.tsx` and `.maestro/fresh-install.yaml` guard it. Lab render confirms the copy and hierarchy (`screens/review-2026-11-20/welcome.jpg`, `setup-worth.jpg`, `today-first.jpg`) |
| Simplest successful returning experience? | Open Today → one sentence about one person → Message → return check. Two taps to the real channel for a picked contact. **But** Today speaks only when the user opens the app: nothing runs while the app is closed (Phase 0). The thesis "bring it back when it matters" is therefore untested for any day the user does not open Kinship |
| Where does the experience create unnecessary work? | (1) A review sheet rises for notes the model is unsure about; this is by design (trust) and is now rare after K-series work. (2) First-week quiet days: a new account with few dated facts sees "Nothing needs you today." often; the first-use orientation copy helps once, then quiet. (3) Typing on a phone: voice exists behind `voice_capture` for the two pilot accounts only |
| What prevents trust? | Little, and that is the product's strength: a source under every line, "Remember this?" on sensitive readings, exact Undo, "Which Sam?", Pause reminders, export and delete. The remaining trust risks are engineering ones: a sync race or a dropped outbox push leaving "Understanding…" stalled (WS-3 harness finding; K37 fix in PR #89), and anything unverified on a real phone |
| What makes it worth returning to? | Only the Moment. With 2 active users and no push, retention evidence does not exist yet. Ask v1 (retrieval in People search) is the second reason to open the app, and it is honest (no synthesis) |
| Technically implemented but not genuinely useful yet? | `ai-insight` (1.0 edge function, still deployed v6, unused by 2.0); the whole 1.0 shell (`app/(tabs)`, garden walk, seasons, reach-out, quick notes, 1.0 engines in `src/lib/*Engine.ts`), unreachable for a 2.0 account but still bundled and still the fallback if flags fail to load; "See how it works" is useful; the lab (`app/lab.tsx`) is correctly gated |
| Interactions that produce value vs activity | Value: Tell, Moment → hand-off, return-check Yes (the only thing that records contact), correction, Source. Activity-only: none found. The product deliberately has no feeds, counters or streaks; `track()`'s closed schema cannot carry content (`src/platform/analytics.ts`) |

### Lab renders (alpha treatment, fixture data)

`docs/product/screens/review-2026-11-20/`: welcome, setup-people-picked, setup-worth, today-first, today-birthday, today-quiet, today-return, review, sams, keep, handoff, person, knows, people, settings. Chromium at 390 × 844, from `npx expo export --platform web` with `EXPO_PUBLIC_V2_LAB=1`; a development tool, not product approval (contract §10).

### Findings by class (details and IDs in Appendix C)

- **Functional defects (candidates; none seen on a phone):** the person page's primary action label truncates to "Messa…" at 390 pt in the Electric Garden treatment (lab render; `screens/review-2026-11-20/person.jpg`); a 1.0-styled "Page not found / Return to Garden" screen (`app/+not-found.tsx`) for any unknown route in a 2.0 session; Settings in the lab fixture lacks the trust-floor rows (lab fixture stale, not a product defect).
- **Missing product capabilities (approved, not built):** proactive delivery while the app is closed (E15; CC-25 "commit next"); notification permission ask (row 31); Your story together (row 13); year-ago line (row 10).
- **UX friction:** quiet first week; the consent step is the only place AI is named and it must stay; typing-only for new accounts until `voice_capture` is on for them.
- **Reliability/trust problems:** no device verification since the 5–8 Nov merges; see Phase 6.
- **Design inconsistencies:** two visual treatments coexist (Electric Garden for new accounts, Notebook/Deck for the two pilot accounts); the web lab cannot render the Notebook/Deck treatment (0 references in `src/dev/v2Lab.tsx`), so every lab screenshot in the repository shows the treatment real users do not see.
- **Optional enhancements:** Appendix D.

---

# B. Audit appendix (substitute checklists)

**Missing coverage, stated plainly.** The original master prompt's own lists were not available in this review's context: the 20 security attacks, the 20 UX laws, the 24 motion and UX principles, the 20 animation styles and the 20 production-readiness protections. This appendix therefore does **not** claim to cover "every original checklist item". What it does: scores a canonical substitute for each list (OWASP-style attacks; the Laws of UX set; a standard motion-principle set; a standard animation-style library; a standard production-hardening set), names the substitute at the head of each table, and marks every item with evidence or UNVERIFIED. Items on the original lists that are not in these substitutes are uncovered until the founder supplies the lists; mapping them onto the findings below is a one-pass exercise and would not change the FIX NOW set, because those rest on code-verified defects, not on checklist items. The eight galleries and eight resources were named in the prompt and are covered in full (Phase 5).

## Phase 2 — Security and privacy

### Threat model (application-specific)

Assets: a user's notes and memories about other people (the most sensitive data in the system: health, death, pregnancy, money, conflict); the address-book subset they picked; the Anthropic key; the Supabase service role. Actors: another signed-in user (IDOR, cross-tenant), an anonymous caller, the model (prompt injection through a note), a lost or shared phone, the provider (training use), the operator (logs, analytics), and a malicious app on the same device (URL-scheme hijack). Trust boundaries: phone store (SQLCipher) ↔ Supabase (RLS) ↔ edge functions (service role) ↔ Anthropic.

### Standard attacks

| # | Attack | Verdict | Evidence |
|---|---|---|---|
| 1 | Broken object-level authorization (IDOR) | **MITIGATED** | Owner RLS on all 29 public tables (`20260615161830` event trigger auto-enables; 2.0 loops at `20261002210000:184`, `20261002210100:585`, `20261002210200:288`); composite FKs `(x_id, user_id)` prevent cross-tenant pointers even for the service role (`20261002210000:19-22`); every user-callable SECURITY DEFINER function scopes to `auth.uid()` (`refresh_my_reasons` `20261005090000:153-156`; `merge_people` `20261030090000:177-195`; `undo_merge_people` `:344-347`; `close_capture_review` `20261004100000:227-230`; `set_ai_consent` `20261002210300:94-96`; `consume_ai_call` `20261001090000:49-55`); the earlier `person_proactive` cross-account oracle was closed in `20261031120000:13-15`. pgTAP `30_rls_isolation`, `51_v2_isolation`, `56_v2_ai_gateway`, `64_v2_gate0` in CI |
| 2 | Broken authentication | **MITIGATED (Medium residual)** | Every edge function verifies the bearer with Auth `getUser` and refuses anonymous users (`supabase/functions/_shared/auth.ts:16-24`); `verify_jwt: true` on all three deployed functions (production read, 20 Nov). Residual: Google sign-in parses `access_token`/`refresh_token` from the redirect fragment (`src/providers/AuthProvider.tsx:202-217`), no `flowType: "pkce"` (`src/lib/supabase.ts:64-72`), redirect over the custom scheme `kinship` (`app.json`) with no App Links / associated domains. SEC-1 |
| 3 | Cross-user / cross-tenant leakage | **MITIGATED** | As 1; `feature_flags` SELECT `USING (true)` leaks only flag names and rollout % (`20261002210300:216-217`) |
| 4 | Mass assignment | **MITIGATED** | Column-level grants withhold server-derived columns (`captures.status`/`extraction_version` `20261002210100:603-607`; `memory_items.extraction_confidence`/`origin` `:611-617`; `user_settings.ai_consent*` `20261002210300:55-59`); app writes only allow-listed columns (`src/store/tables.ts:119-134`) |
| 5 | SQL injection | **MITIGATED** | Parameterised client SQL (`src/store/sql.ts:8-10`); `format('%I')` for identifiers in `delete_user_account` (`20261001120000:48-72`); the one PostgREST filter string uses server-stamped values of the user's own rows (`src/store/supabaseRemote.ts:65`) |
| 6 | XSS | **NOT APPLICABLE** | React Native; no WebView or `innerHTML`; the web target is a lab only |
| 7 | CSRF | **NOT APPLICABLE** | Bearer tokens, no cookies; CORS allow-list empty by default (`ai-gateway/handler.ts:726-735`) |
| 8 | SSRF | **NOT APPLICABLE** | Functions call only Anthropic and Supabase at fixed hosts |
| 9 | Prompt injection / tool-use boundary | **MITIGATED** | Client sends ids only (`src/store/gateway.ts:235`); people are opaque roster keys (`_shared/extraction/context.ts:222`); note wrapped with closing-tag escaping (`prompts/relationship_extract/v1.ts:211-218`); model offsets are never trusted, evidence is re-located in the note or dropped (`pipeline.ts:329-342`, `_shared/spans.ts:11-14`); instruction-like text, contact details, invented names and relations stripped (`pipeline.ts:349-367`); certainty only lowered, sensitivity only raised (`:611-633`); ≤200 proposals (`:82,125`); `injection_suspected` logged; the DB re-checks person ownership and span bounds (`20261031110000:46-57`, `20261031100000:341-355`). No tools are exposed to the model. Residual: a note can still steer the content of a line about its own person; the review tiers surface it |
| 10 | Insecure direct secrets | **MITIGATED (release check UNVERIFIED)** | No `sk-ant`, service-role key or private key in the repository; only the public anon JWT and Sentry DSN are committed, documented as public (`.env.development:1-5`, `eas.json`). `EXPO_PUBLIC_ANTHROPIC_API_KEY` exists only behind `__DEV__` (`src/lib/aiInsightService.ts:40`); no EAS profile sets it; the release checklist has no `sk-ant` grep of the `.hbc`. SEC-6 |
| 11 | Excessive data exposure | **MITIGATED** | `ai_calls` is content-free by CHECK (`20261004090000:42-67`); gateway logs fixed messages and SQLSTATE only (`handler.ts:386-391`); analytics closed schema (`src/platform/analytics.ts`); Sentry scrubber drops user/request/extra, redacts quoted strings, emails, UUIDs, phones (`src/platform/crashScrubber.ts:44-105`), `sendDefaultPii:false`, traces 0 (`crashReporting.ts:16-29`); notification copy is fixed and name-free for sensitive kinds (`src/lib/momentNotification.ts:46-47`); `person_identities` stores SHA-256 only (`20261002210000:160-162`); phone numbers read at tap time (`src/platform/handoff.ts:4-7`) |
| 12 | Missing rate limiting | **PARTIAL** | Per-user per-UTC-day quota, atomic (`20261001090000:57-66`; default 50, `ai-gateway/index.ts:41`); one model run per capture via claim (`20261004090000:97-113`); body ≤4 KiB (`handler.ts:228`); `raw_text` ≤5000 (`20261002210100:37`). Gaps: a long note fans out to up to 6 parallel model calls for one quota unit (`_shared/extraction/run.ts:20-24,97-98`) with a roster of up to 1,000 people in every prompt (`index.ts:97`); model-free actions (`semantic_report again:true`) are unlimited; no per-minute or IP limit. SEC-3 |
| 13 | Insecure deserialization | **NOT APPLICABLE** | JSON only, shape-checked (`run.ts:150-163`) |
| 14 | Security misconfiguration | **PARTIAL / UNVERIFIED** | `verify_jwt` on: verified. Anonymous sign-in off, leaked-password protection on, session time-box off, PostHog IP discard: documented in `docs/ops/supabase-settings.md`, dashboard-only, UNVERIFIED. `docs/ops/supabase-settings.md` does not yet record the three newer accepted SECURITY DEFINER warnings (`merge_people`, `undo_merge_people`, `refresh_my_reasons`) |
| 15 | Sensitive data in logs | **MITIGATED** | As 11; `ai-insight` and `delete-account` log the user id only |
| 16 | Insufficient logging / monitoring | **PARTIAL** | `ai_calls` usage rows and Sentry crashes exist; zero `captureException`/`captureMessage` in the app, no alert rules, no log drain, no auth-event alerting (grep). REL-2 |
| 17 | Unvalidated redirects / deep links | **MITIGATED (OAuth excepted)** | Hand-off URLs: digits + leading `+`, min length, email regex + `encodeURIComponent`, fixed scheme set, `canOpenURL` for WhatsApp (`src/platform/handoff.ts:20-40,119`); no code reads inbound URL params. Every 1.0 route remains deep-linkable without a shell guard (UX-2) |
| 18 | Dependency vulnerabilities | **PARTIAL** | `npm audit --omit=dev --audit-level=high`: 7 high, 23 moderate, all transitive build-time (undici, source-map-js, postcss-selector-parser, uuid via xcode); CI runs it `|| true` (`ci.yml:36-39`); no Dependabot; GitHub Actions pinned by tag not SHA (`ci.yml:24-25,47,81`); Deno imports pinned exactly but `"lock": false` and no `deno.lock` (`supabase/functions/deno.json:3`). SEC-4, SEC-5 |
| 19 | Improper error handling | **MITIGATED** | Fixed error codes to the client; SQLSTATE only in logs (`handler.ts:121-126,389-391`); root `ErrorBoundary` (`src/providers/index.tsx:29`); store-open failure screen (`app/v2/_layout.tsx:56-58`) |
| 20 | Business-logic abuse (flags, consent, quota) | **MITIGATED** | Users cannot write `user_flag_overrides` or `feature_flags` (`20261002210300:214-219`); consent only through `set_ai_consent`; `consume_ai_call(daily_limit)` is user-callable but only counts the caller's own usage. `write_memory_item` has a Low id-existence oracle (`20261003090000:39-42`). SEC-8 |

### Security findings (ranked)

| ID | Severity | Finding | Smallest remediation | Safe development test |
|---|---|---|---|---|
| SEC-1 | Medium | Google OAuth implicit flow over custom scheme (`AuthProvider.tsx:202-217`; `supabase.ts:64-72`) | `auth: { flowType: "pkce" }` and `exchangeCodeForSession(code)` from the redirect query; keep Apple as is | Unit test asserting the redirect handler reads `?code=` and never `#access_token=`; `grep access_token src/providers/AuthProvider.tsx` → none |
| SEC-2 | Medium (privacy) | Purge functions never scheduled; tombstoned notes keep `raw_text` (`v2_platform.sql:272`, `v2_capture_reviews.sql:237`, `v2_reasons_v0.sql:34`) | One migration: `create extension if not exists pg_cron`, `cron.schedule` nightly for `purge_tombstones()` and `purge_expired_capture_reviews()` | pgTAP: `cron.job` holds both entries; tombstone a capture, age `deleted_at` 31 days, run the purge, assert the row is gone (the function tests already exist) |
| SEC-3 | Low–Medium | One quota unit can be six parallel model calls at `max_tokens 8000` with a 1,000-person roster (`run.ts:20-24,97-98`; `index.ts:97`; `registry.ts:46-49`) | Consume `passages.length` units (or a token budget); set a provider-console monthly cap; cap the roster per prompt | Handler test with a 4,000-char note and a `consume` spy asserting ≥ passage count |
| SEC-4 | Low | No `deno.lock`; Actions tag-pinned | Commit `deno.lock`, `"lock": true`, `deno check --frozen` in CI; pin `actions/*` by SHA | CI step fails on a changed import hash |
| SEC-5 | Low | `npm audit` never blocks | Block at `critical` (the known `image-size` advisory is moderate); add Dependabot for npm and Deno | Exit code of `npm audit --omit=dev --audit-level=critical` |
| SEC-6 | Low | No release-time guard against the dev Anthropic key path | Add `strings *.hbc \| grep -c 'sk-ant\|api.anthropic.com'` to the release checklist / CI export step | Export with the var set to `sk-ant-TEST`; grep the bundle; expect 0 |
| SEC-7 | Low | `ai-insight` (1.0) has no model timeout and SDK default retries (`ai-insight/index.ts:89-98`) | `maxRetries: 0`, `timeout: 30_000` as `ai-gateway` does; or retire with 1.0 | Handler test with a never-resolving `generate` |
| SEC-8 | Low | `write_memory_item` id-existence oracle (`20261003090000:39-42`) | `INSERT … ON CONFLICT (id) DO NOTHING RETURNING *` with a uniform result | pgTAP as user B with A's item id, expecting the same result as a fresh id |

Explicitly UNVERIFIED (needs the dashboard or CLI): anonymous sign-in disabled in production; leaked-password protection on; session time-box off; PostHog IP discard; backups / PITR; that the deployed `ai-gateway` v17 is byte-identical to `main` (docs claim parity for earlier versions).

## Phase 3 — UX and interaction design

Two treatments exist and were both audited: the alpha (Electric Garden) treatment every new account gets, and the Notebook/Deck treatment behind `notebook_deck` that the two pilot accounts use. The lab screenshots in `screens/review-2026-11-20/` show the alpha treatment only (the lab cannot render the notebook treatment).

### Journey state matrix

| Journey | Success | Empty | Loading | Error | Offline | Retry | Interrupted (kill) | Repeated use |
|---|---|---|---|---|---|---|---|---|
| J1 first session | Setup → Today with Kept card or review (`TellFlow.tsx:296-307`, `TodayView.tsx:226-246`) | Skip → Today first-use "Add your people" / People empty recovery (`SetupViews.tsx`, `PeopleView.tsx:236`) | Paper, spinner after 600 ms (`src/ui/Waiting.tsx:8`); setup gate waits ≤5 s for sync (`useV2.ts` `SETUP_SYNC_WAIT_MS`) | Sign-in "That didn't work"; 10 s stuck copy (`WelcomeScreen.tsx:32,62-70`); contacts denied/limited/unavailable drawn (`SetupViews.tsx:317-352`); save failure copy (`:389`) | Email sign-in offline copy; consent save fails silently and is re-asked over Today (`SetupScreen.tsx:65-77`) | Try again on failed keep restores draft (`SetupScreen.tsx:216-220`) | Steps are account state; resumes at `nextStep` (`SetupScreen.tsx:29-33`; `firstRun.test.tsx:124`) | Reinstall skips setup |
| J2 Tell | Kept card, no timer (`TellDock.tsx:166-231`); review tokens; "Which Sam?"; sensitive "Remember this?" (`reviewModel.ts:739-809`; `NotebookReview.tsx:34,701`) | "Nothing to remember in that one." | "Understanding…" line | "Couldn't understand" + Try again (`TellDock.tsx:270-275`); "That wasn't kept" with words restored (`TellFlow.tsx:354-357`) | `OFFLINE_LINE` (`TellDock.tsx:524`), queued | Backoff 15 s → 1 h, 6 attempts (`understanding.ts:138-182`); "busy" is a wait | Persisted state machine; a question never expires; a seen, question-free review auto-finishes after 10 min (`understanding.ts:784-791`) | Drafts fold to "Draft · …" and stay where started (`TellDock.tsx:488-494`) |
| J3 person → Source → correction | Portrait / notebook lenses; provenance → `/v2/source/:id`; ItemSheet/LineSheet panes with the "words name another day → ask" guard (`ItemSheet.tsx:68-76`) | Empty page invites Tell | **Blank page with only Back while reading** (`PortraitView.tsx:253-258`, `PersonRecordView.tsx:129-135`) | Optimistic "Not this" with rollback (`knows.tsx:56-88`) | Edits are local writes, sync later | n/a | n/a | Knows sections computed every time |
| J4 Moment → hand-off → return | Sheet with channels and "When you come back" (`HandoffSheet.tsx`); hand-off persisted before leaving (`useHandoff.tsx:50-55`) | n/a | n/a | `handoffFailed` alert (`useHandoff.tsx:59-62`); "Which contact?" for add-by-name people (`HandoffSheet.tsx:78-83`) | Local | n/a | Return check survives kill, 72 h window, answered once (`todayModel.ts:401,875`; `returnLoop.ts:17-18,111-118`) | Yes → haptic → optional question → Tell focused (`index.tsx:132-154`) |
| J5 settings | Pause reminders immediate (`Pickers.tsx:319-335`); export via share sheet; delete two confirms, server first (`SettingsSheet.tsx:257-276`; `accountDeletion.ts:21-36`) | Removed/Paused lists hidden when empty | n/a | Export unavailable/failed alerts; delete failure copy | Merge and consent revoke refused with copy | n/a | n/a | Sign out confirm |

### Functional defects found (none seen on a device)

| ID | Defect | Evidence | Repro idea |
|---|---|---|---|
| UX-1 | Alpha People flashes its empty invitation on every cold open: `usePeopleRows` returns `[]` while loading and the view keys on `rows.length === 0`; the notebook view guards with `loaded` | `src/hooks/useV2.ts:234`; `src/features/people/PeopleView.tsx:236-244`; `NotebookPeopleView.tsx:241` | Account with 50 people, `notebook_deck` off, cold-open People |
| UX-2 | 1.0 reachable from 2.0: Welcome pushes `/settings/terms` and `/settings/privacy-policy` (1.0 NativeWind screens); `app/+not-found.tsx` says "Return to Garden"; no shell guard on `app/(tabs)`, `app/person`, `app/garden-walk`, `app/season/*`, `app/reach-out/*`, `app/settings/*` | `WelcomeScreen.tsx:133-134`; `app/+not-found.tsx:19-23`; grep | Tap Terms on Welcome; open `kinship://garden-walk` on a 2.0 account (UNVERIFIED) |
| UX-3 | Person page Call opens the hand-off sheet (Messages primary) instead of leading with Call; Moment detail passes `prefer` | `app/v2/person/[id]/index.tsx:207-208`; `useHandoff.tsx:66-84` | Tap Call on a portrait |
| UX-4 | "Not this" confirms in What Kinship knows and the notebook LineSheet, but the alpha ItemSheet forgets at once with no confirm or Undo | `ItemSheet.tsx:109` → `index.tsx:270-273` `u.reject`; `knows.tsx:73-77` confirms | Person page → tap a line → Not this |
| UX-5 | Notebook `MomentPoster` is one accessible button wrapping its action buttons: VoiceOver likely cannot reach Message / Not now / I did this | `DeckParts.tsx:72-79`; correct pattern in `NotebookReview.tsx:623-626` | VoiceOver on Today with a Moment (UNVERIFIED) |
| UX-6 | Reduce Motion is read asynchronously, starting `false`: a sheet opened right after mount can animate fully once | `src/ui/theme.ts:17-29` | Reduce Motion on, open a sheet immediately (UNVERIFIED timing) |
| UX-7 | Primary action label truncates to "Messa…" at 390 pt in the alpha person page (web lab render) | `PortraitView.tsx:270-280`; `Pill.tsx:106-108` | `screens/review-2026-11-20/person.jpg`; verify natively |
| UX-8 | Draft debounce of 400 ms loses the last keystrokes on a kill | `useV2.ts` `DRAFT_SAVE_MS` | Type, kill within 400 ms |

### UX laws (only where they explain observed friction)

| Law | Verdict | Component and problem | Proposed behaviour | Acceptance |
|---|---|---|---|---|
| Fitts | **Friction** | `Provenance` 11–15 pt caps text, hitSlop 8 → ~31 pt tall; `NSource` ~29 pt; Welcome Terms/Privacy nested text ~16 pt; inline day token in `NotebookReview` ~25 pt (`src/ui/Provenance.tsx:26`; `ui/notebook/parts.tsx:61`; `WelcomeView.tsx:167-169`; `NotebookReview.tsx:566-577`) | Vertical hitSlop ≥ (44 − lineHeight)/2 or `minHeight: TOUCH` wrappers | Every pressable's frame + hitSlop ≥ 44 pt tall (Jest measures hitSlop; native check) |
| Hick / Miller | **Watch** | Kept card can show up to nine controls (lines, "and N more", Add X / Not now, Tell the rest, Try again, Correct this, Undo, Got it right / Not quite, ×) (`TellDock.tsx:176-310`) | Keep the approved I4 order; collapse rating and newcomer offers behind the first interaction | ≤4 interactive elements visible by default |
| Jakob | **Friction** | UX-3 (Call opens a sheet) and UX-4 (Not this inconsistent) | Call leads with Call; Not this always confirms or always offers Undo | Both proven in Jest |
| Doherty | **Friction** | Blank person/Knows pages, blank Today before first query, alpha People flash (UX-1) | Reuse `Waiting` (600 ms delay) and a `loaded` flag | No empty-state copy before `loading === false` |
| Tesler | **Minor** | Hand-off asks "Which contact is X?" at reach-out time for add-by-name people (`HandoffSheet.tsx:78-83`) | Offer linking on the person's Edit sheet | Reaching out never adds a picker for a resolvable contact |
| Von Restorff / one-primary rule | **Friction** | Alpha People "Find someone" / "Ask your memory" filled + outlined pair that swaps roles (`PeopleView.tsx:181-184`); the recovery pass (F18) forbids such pairs | Quiet segmented tabs, or the notebook's one field | Exactly one primary pill on People |
| Proximity / slip prevention | **Friction** | Notebook Kept card places Undo (forgets the note) beside the × dismiss (`NotebookDock.tsx:110-120`); alpha keeps Undo at the bottom | Move Undo to the action row with Correct this | No destructive control within 8 pt of dismiss |
| Recognition over recall | **Minor** | "Which Sam?" shows two identical names when neither has a label (`reviewModel.ts:739`; `NotebookReview.tsx:744-746`) | Always a second cue (label, full name, face) | Disambiguation never shows two identical rows |
| Zeigarnik | **Positive** | Drafts persist; open questions appear on Today and the page | Preserve | — |
| Peak-end | **Positive** | Yes → haptic → one optional question → first Tell lands on Bring-back; Kept card arrives with no motion (Phase 4) | Preserve; add the arrival beat | — |
| Aesthetic-usability / token discipline | **Watch** | Notebook code: ~87 off-scale spacing literals, 30 raw `fontSize` overrides, `#0F2A1D` six times (`DeckParts.tsx:80`, `MomentFull.tsx:169,244`, `DeckToday.tsx:153-154`, `ui/notebook/parts.tsx:94,137,162`) vs 0 in alpha views | A lint rule for `src/features/*/notebook` and `today/deck` | Rule passes |
| Postel, Occam, Pareto, Parkinson, Goal-gradient, Serial position, Common region, Prägnanz, Flow, Progressive disclosure | **No observed violation** | Tell accepts anything (Postel ✓); two destinations (Occam ✓); setup counts "2 of 3" without a progress bar (Parkinson/goal-gradient neutral); hairline sections (common region ✓); the Moment is the one thing (flow ✓) | — | — |

### Accessibility

| Area | Verdict | Evidence |
|---|---|---|
| Labels on icon-only controls | ✓ | `IconButton`, Back, ×, Call icon (`MomentFull.tsx:212`); decorative art hidden; live regions on status lines |
| Nested pressables | ✗ (UX-5) | `DeckParts.tsx:72-79` |
| Sheet focus / escape | Gap | Scrim "Close" precedes the sheet (`Sheet.tsx:174-179`); no `setAccessibilityFocus` to the title; no `onAccessibilityEscape`; the consent sheet's "Close" does nothing by design (`ConsentSheet.tsx:59`), so it should not be exposed as a button |
| Reduce Motion | Mostly ✓ | Honoured in Sheet, Moment, Hero, MomentFull, LensMotion, YourWords, IdeasViews, BreathingDot, LineFocus. Not: `HowItWorks` Modal slide (`HowItWorks.tsx:242`); `Spot` 1.2 s pulse (`NotebookReview.tsx:469-474`); `VoiceLine` continuous redraw (`Listening.tsx:216-239`); async first read (UX-6) |
| Dynamic Type | ✓ with caps | `maxFontSizeMultiplier` through `Text.tsx`, `NText`, `Pill` 1.6; `isLargeText()` is non-reactive (`theme.ts:35-37`); poster name and initials deliberately unscaled |
| Contrast (computed from `tokens.ts`) | Mostly ✓ | Light `inkQuiet`/paper 5.15, `markText` 5.62, `brick` 6.19; night `inkQuiet` 7.88. Below WCAG 1.4.11 (3:1 non-text): ghost pill outline `rule`/paper 1.77 (night 1.73), `lime` edge 1.19 (text on it 9.93 ✓); alpha People letter headers at opacity 0.55 and notebook year dividers at 0.25 with `accessibilityRole="header"` (`PeopleView.tsx:208-215`; `PersonNotebookView.tsx:374`). `tokens.test.ts:24-34` checks text pairs only |
| Keyboard | ✓ | `KeyboardBar` iOS-only with Done + Today · People; `useKeyboardInset` measures overlap; Sheet scrolls the focused field into view |
| Touch targets | ✗ (Fitts row) | — |

### Contract check (copy, counts, AI, dead paths)

- AI is named only in the approved D2 sentences (consent step, Settings) ✓. No sparkle, score, tier or model name in UI; `scoreBucket` is analytics-only ✓. Model identifiers do appear in server code and a CHECK regex (`registry.ts:46`, `ai-insight/index.ts:25`, `20261004100000:141`), which `CLAUDE.md` says to avoid; the app's `noModelIdentifiers.test.ts` covers the bundle only.
- Counts: "and N more", "Continue with N people", "Setting up · 2 of 3" are approved ✓. Soft tension: `DECK_COPY.endFirstSub` "The more you tell, the more comes back." (`DeckParts.tsx:21`) nudges capture volume, which §2 says Kinship does not optimise (UX-14, a copy decision for the founder).
- "No timers" (Gate D) vs `finishLeftOpen` auto-finishing a seen, question-free review after 10 min (`understanding.ts:784-791`): memory is unchanged, so trust holds; a wording tension to raise, not a bug (UX-15).
- Sprigs identity-only ✓ (`Sprig.tsx:6-8`, `look.ts:35-39`); `sprig_marks` off everywhere (production read).
- Dead or leaking paths: UX-2; 1.0 notification routes are guarded and cancelled in 2.0 (`app/v2/_layout.tsx:37-47`) ✓; `app/lab.tsx` env-gated ✓. No TODO/FIXME/HACK in `app/` or `src/`.

### What works and must be preserved

Hand-off persisted before leaving the app; one conversation per hand-off key; Yes is the only contact record; sensitive readings held until yes; no guessing between two candidates; the user's edit wins; the "words name another day → ask" guard; timer-free Tell lifecycle with honest offline copy; setup as account state; the `Pressable` NativeWind opt-out and native-style regression test; `sheetStack` preventing modal-on-modal freezes; the accessibility baseline (labels, header roles, live regions, `accessibilityViewIsModal`, Reduce Transparency for art, Dynamic Type caps, the A–Z rail as one adjustable control); the plain, sourced copy voice.

## Phase 4 — Motion and emotional interaction

### Motion inventory (every animation in 2.0 code)

| Where | Duration / easing | Properties | Reduce Motion |
|---|---|---|---|
| `src/ui/Sheet.tsx:112-143` | In 360 ms cubic-bezier(0.2, 0.8, 0.2, 1); out 240 ms ease-in; scrim 240 ms | translateY, opacity (native driver) | 150 ms fades ✓ |
| `Sheet.tsx:149-165` drag to close | Follows the finger; settle 160 ms | translateY | n/a |
| `src/ui/Moment.tsx:44-53` arrive | 320 ms, 8 pt rise | opacity, translateY | 150 ms fade ✓ |
| `TodayView.tsx` Hero | 520 ms, 14 pt rise (Reanimated) | opacity, translateY | ✓ |
| `src/ui/LineFocus.tsx` emphasis | 900 ms fade 0.3 → 1, scroll | opacity | 150 ms ✓ |
| `tell/notebook/motion.tsx` BreathingDot | loop, 1 s | opacity | static ✓ |
| `motion.tsx` FadeIn | 260 ms | opacity | 150 ms ✓ |
| `YourWords.tsx:85-98` underlines | 600 ms, staggered 110 ms | opacity overlays | 150 ms ✓ |
| `NotebookReview.tsx:458-481` Spot | 1,200 ms pulse | opacity | ✗ |
| `PersonNotebookView.tsx:400-420` LensMotion | 200 ms, 16 pt slide | opacity, translateX | ✓ |
| `MomentFull.tsx:95-143` expand / close | 420 ms bezier(0.2, 0.9, 0.25, 1); 320 ms close | **layout** (top/left/width/height/borderRadius) | 150 ms fade ✓ |
| `IdeasViews.tsx:77,309` | FadeInDown 320 ms, 60 ms stagger | Reanimated entering | ✓ |
| `HowItWorks.tsx:124-138,201-206` | 320 ms rise; Modal slide | opacity, translateY; system | fade ✓ / Modal ✗ |
| `Listening.tsx:216-239` VoiceLine | continuous, per audio-level `setState` | JS re-render of an SVG polyline | ✗ |
| `useKeyboardLift.ts:13-16` | keyboard curve (LayoutAnimation) | layout | platform |
| Garden `Grain`, `DawnWash`, `Botanical`, `FluidPhoto`, `TextScrim` | static | — | Grain/Wash off under Reduce Transparency ✓ |

Tokens: a `motion` block exists (`src/design/tokens.ts:228-245`) and the alpha views use it; notebook code hard-codes 200 / 260 / 420 / 1,200 ms. Heavy effects: `Grain` lays 30–40 `Image` tiles per screen (`Grain.tsx:32-47`); the two largest botanical PNGs are 2.1 MB and 1.9 MB drawn at 300+ pt on Today, Welcome and person pages; `BloomName` masks a 2.2×-width image; `MomentFull` animates layout, not transforms. The only loops are `BreathingDot` (notebook, static under Reduce Motion) and `VoiceLine` (while listening).

### The 24 motion principles

| # | Principle | Verdict | Evidence |
|---|---|---|---|
| 1 | Motion has a purpose (one of comprehension, feedback, continuity, responsiveness, resonance, completion) | ✓ | Every entry above maps to arrive / leave / understand; no decorative loops in the alpha |
| 2 | Duration tiers (routine feedback shorter than meaningful transitions) | ✓ | 160–260 ms feedback; 320–360 arrive/sheets; 420–600 understand/expand |
| 3 | Easing is deliberate, no linear | ✓ | Custom beziers in Sheet, Moment, MomentFull |
| 4 | Transform and opacity only | **Partial** | `MomentFull` animates top/left/width/height (`MomentFull.tsx:95-143`); everything else is transform/opacity |
| 5 | No continuous GPU work | **Partial** | `VoiceLine` re-renders at mic rate (`Listening.tsx:216-239`); `BreathingDot` loop is opacity only |
| 6 | Spatial continuity (things come from where they are) | ✓ | Sheets rise from the bottom; `MomentFull` grows out of the poster; lens slide 16 pt |
| 7 | Enter / exit asymmetry | ✓ | Sheet in 360 / out 240 |
| 8 | Interruptible and cancellable | ✓ | Sheet drag with snap-back; Reanimated-driven hero |
| 9 | Reduced motion honoured | **Partial** | Honoured in 10 of 14 animated components; not in `HowItWorks` Modal, `Spot`, `VoiceLine`; async first read (UX-6) |
| 10 | Consistent across screens | **Partial** | Alpha uses tokens; notebook hard-codes durations (C10) |
| 11 | Feedback within ~100 ms of touch | ✓ | Immediate dim to `press.surface` / `press.link` on every pressable, enforced by `interaction.test.tsx` |
| 12 | Perceived responsiveness during waits | ✓ | `Waiting` paper then spinner after 600 ms; "Understanding…" line; optimistic local writes |
| 13 | Motion never blocks input | ✓ | No modal animations gate taps; `sheetStack` serialises sheets |
| 14 | Hierarchy: the one important thing moves, the rest stays | ✓ | Only the Moment arrives on Today; quiet lines are static |
| 15 | Choreography / stagger is restrained | ✓ | 110 ms underline stagger; 60 ms Ideas stagger |
| 16 | Anticipation and follow-through used sparingly | ✓ | No overshoot anywhere ("sheets 360 ms spring, no overshoot") |
| 17 | Physics restraint (no bounce) | ✓ | Confirmed; `bounces` disabled at sheet top |
| 18 | Context preservation across navigation | ✓ | Native push with swipe back; fade between setup and Today; tab switch instant |
| 19 | Focus management with motion (a11y) | **Gap** | No `setAccessibilityFocus` after a sheet opens |
| 20 | Meaningful completion is marked | **Partial** | Yes → haptic ✓; Kept card appears with no motion (`TellDock.tsx:166-231`); review line removal is instant in the alpha (`ReviewSheet.tsx:188-203`) |
| 21 | Emotional resonance without theatre | ✓ | The arrive rise and the understand underline; no celebration effects |
| 22 | Performance budget | **Watch** | Grain tiles + 2 MB PNGs + masked bloom on the same screens; UNVERIFIED frame rate on a phone (the Deck's Reduce Motion frame check exists in `moment-deck-implementation.md` §5a) |
| 23 | Motion is tested | **Partial** | Pressed-state and sheet-reveal tests exist (`interaction.test.tsx`, `sheetReveal.test.ts`); no test asserts Reduce Motion branches for notebook components |
| 24 | Motion is documented | ✓ | `interaction-motion-audit.md` and contract §4; the notebook's additions are not yet in it |

### The 20 animation styles (inspiration library, scored for Kinship)

| Style | Verdict | Note |
|---|---|---|
| Fade | Present | Everywhere; the Reduce Motion fallback |
| Slide / rise | Present | Sheets, Moment arrive, lens slide |
| Scale | Reject | Contract: no scaling on press |
| Spring / bounce | Reject | "No overshoot" |
| Stagger | Present (restrained) | Underlines, Ideas |
| Shared-element / morph | Present (layout-based) | `MomentFull`; move to transforms (D.3) |
| Parallax | Reject | Continuous GPU work for no comprehension gain |
| Skeleton shimmer | Reject | `Waiting` paper + delayed spinner is the approved wait |
| Progress indicator | Reject | No progress, no completeness (contract §2) |
| Press micro-interaction | Present | Immediate dim, two tokens |
| Haptic-paired | Present | Success haptic on Yes |
| Lottie / vector character | Reject | Botanical art is static by design |
| Page transition | Present | System push/fade |
| Reveal / mask | Present | `BloomName` mask (static) |
| Typewriter | Reject | Would read as AI theatre |
| Pulse / breathing | Present, bounded | `BreathingDot` while understanding; `Spot` needs a Reduce Motion branch |
| Confetti / celebration | Reject | Nothing quantifies or gamifies |
| Blur / depth | Reject | "No glass"; Grain already costs |
| 3D / flip | Reject | Phase 5 |
| Scroll-driven | Reject | No scrolling hero surfaces |

### Candidate motion improvements (full specs in Appendix D)

1. Kept card arrival (alpha and notebook): the loop's close is currently an abrupt text swap.
2. Review line removal in the alpha `ReviewSheet`: share the notebook's strike-then-stay.
3. `MomentFull` expand on transforms instead of layout (performance, same look).
4. Tab switch Today ↔ People cross-fade, 150–200 ms (`app/v2/(main)/_layout.tsx:33` is `animation: "none"`).

## Phase 5 — Design system and external references

Verified 20 Nov 2026 from the sites, npm and GitHub. Every resource except React Three Fiber is web-only (shadcn/Tailwind/Next.js or static galleries). Kinship is an authenticated iOS app with no marketing site in the repository, so galleries of hero sections, navbars, CTAs and footers describe surfaces Kinship does not have. The existing toolkit (`src/design/tokens.ts`, Reanimated 4, react-native-svg, `expo-linear-gradient`, the `src/ui/garden` and `src/ui/notebook` primitives) already covers the approved look; no dependency below earns a place.

| Resource | What it is (verified) | Maintenance · license · price | RN/Expo fit | Verdict |
|---|---|---|---|---|
| MotionSites | motionsites.com is a parked domain; motionsites.org is an AI prompt marketplace; the only GitHub hit is a 3-star demo list | UNVERIFIED as a gallery | No | **REJECT** (nothing verifiable to reference) |
| Navbar Gallery | Curated web navbar screenshots, active 2026 | Free (Mobbin-sponsored) | No (one `ios-app` style page) | **REFERENCE ONLY** |
| Unsection | Section-first landing-page inspiration, 5,680 entries | Free (30/category) · Pro $9/mo · Lifetime $99 | No | **REFERENCE ONLY (low)**: marketing sections |
| Bento Grids | 286 curated bento layouts | Free; recency unclear | No | **REFERENCE ONLY (caution)**: bento tiles push dense stat dashboards, which the contract forbids (no counts, no scores) |
| CTA Gallery | Conversion CTA patterns, active Oct 2026 | Free | No | **REJECT**: conversion patterns are the opposite of a quiet, private product |
| Footer Design | Website footers | Free | No | **REJECT**: no footer surface in a two-tab iOS app |
| 404s Design | Curated error pages, archive to Nov 2026 | Free | No | **REFERENCE ONLY**: for empty/error copy tone, not visuals |
| 60fps Design | iOS/web micro-interaction videos, 2,140 shots / 499 apps, active 18 Nov 2026 | Free to explore; PRO $15/mo or $150/yr | Reference | **REFERENCE ONLY**: the one iOS-first gallery; mine for restrained transitions |
| Watermelon UI | Web shadcn registry (MIT, 234★); a separate RN registry of 5 NativeWind primitives, no license, last push Apr 2026 | MIT (web) | RN variant immature | **REJECT**: Kinship's own primitives already exist |
| Manus | manus.im, an AI agent product (ownership unsettled after the Meta deal unwind); "Design View" is an in-agent image feature, not a UI kit | n/a | No | **REJECT**: not a design resource; surfacing AI tooling conflicts with "never show AI" |
| Cult UI | 154 animated shadcn components (Tailwind + Motion), MIT, 7.5k★, pushed Oct 2026 | MIT free; paid AI blocks | No (DOM/CSS) | **REFERENCE ONLY** |
| Skiper UI | 106+ shadcn components (Tailwind, Motion, GSAP); free tier requires attribution; Premium $129 one-time | Attribution / paid; no public repo | No | **REJECT** |
| React Three Fiber | `@react-three/fiber@9.8.2` (MIT, Oct 2026) installs on RN 0.81 / React 19.1 via `@react-three/fiber/native` + `expo-gl`; three.js adds ~21 MB unpacked; pmndrs says the native layer is pre-alpha and expo-gl has known performance problems; GL canvases are opaque to VoiceOver | MIT | Technically yes | **DEFER**: no 3D need in the product; revisit only if a founder-approved experience requires it |
| Liquid Glass JS | `dashersw/liquid-glass-js`: WebGL + html2canvas, last push Jun 2025 | MIT | No | **REJECT**. If glass is ever wanted: `expo-glass-effect` (SDK 54, iOS 26+, falls back to a plain View) behind `isReduceTransparencyEnabled`, as an EXPERIMENT only with founder approval |
| ShaderGradient | `@shadergradient/react` 2.4.20 (MIT); requires R3F + three + camera-controls; no RN path | MIT; plugin pricing UNVERIFIED | No | **REJECT**: `expo-linear-gradient` and `DawnWash` already cover calm gradients |
| Liquid Logo | `paper-design/liquid-logo`, PolyForm Shield 1.0.0 (non-compete); web canvas only | Restrictive | No | **REJECT** |

**WebGL recommendation: none.** The contract's motion rule ("motion only where something arrives or leaves"; Reduce Motion → 150 ms fades) and the two-user pilot stage give no experience that justifies a GPU render loop, an opaque-to-VoiceOver canvas or a 21 MB dependency. The one advanced effect allowed by this review's rules is left unproposed; see Appendix D for the three design experiments that use the existing toolkit.

## Phase 6 — Production reliability

### The 20 production protections

| # | Protection | Verdict | Evidence |
|---|---|---|---|
| 1 | Auth / session hardening | IMPLEMENTED | SecureStore session, `autoRefreshToken` (`src/lib/supabase.ts:35-39,64-72`); `getUser` in every function; anonymous refused; sign-out wipes stores, flags, analytics id (`src/lib/localDataReset.ts:37-65`); sessions never time-box by design |
| 2 | RLS | IMPLEMENTED | Phase 2 row 1 |
| 3 | Input validation | IMPLEMENTED | CHECKs on text lengths; gateway body ≤4 KiB with UUID checks; allow-listed app writes; defensive reply parsing (`src/store/gateway.ts:147-157,368-374`) |
| 4 | Rate limiting | PARTIAL | Per-user daily quota and per-capture claim; no burst/IP limit; 6× fan-out (SEC-3) |
| 5 | Timeouts | IMPLEMENTED | Model 45 s (`registry.ts:49`), phone → gateway 60 s (`gateway.ts:336`), every supabase-js request 20 s (`supabase.ts:51-60`), flags 4 s, PostHog 5 s. Stale comment says "30 s" at `supabase.ts:49` |
| 6 | Retries with backoff | PARTIAL | Understanding: exponential 15 s → 60 min, 6 attempts, then `failed` + Try again; `Retry-After` honoured; gateway `maxRetries: 0` by design. Sync: fixed 30 s tick while active (`V2SessionProvider.tsx:84-86`), rebases ≤3 (`syncEngine.ts:53,174`); no backoff during an outage |
| 7 | Idempotency | IMPLEMENTED | Upsert by client id (`supabaseRemote.ts:34-41`); versioned updates with 40001 on stale (`20261002210000:50-57`); one model run per capture, replay returns `saved_ids` (`handler.ts:296-307`); reasons `ON CONFLICT DO NOTHING`; return check answered once |
| 8 | Circuit breaking / graceful degradation | PARTIAL | Degradation is deliberate and good (offline Tell queued; refused note kept raw; `fallbacks: false`; optional tables fail open; Today from the device when refresh fails; voice fails closed to typing). No breaker: every 30 s pass calls the gateway during an outage |
| 9 | Error boundaries | PARTIAL | One root boundary; store-open failure screen; background pass errors go to `console.error` only (`understanding.ts:674-678`) |
| 10 | Logging without PII | IMPLEMENTED | Phase 2 rows 11, 15 |
| 11 | Monitoring / alerting | MISSING | No `captureException`/`captureMessage`, no alert rules, no log drain, no uptime check anywhere in the repo; dashboards UNVERIFIED |
| 12 | Crash reporting | IMPLEMENTED | Sentry with scrubbing, `sendDefaultPii:false`, traces 0; started in `app/_layout.tsx`; none in edge functions |
| 13 | Backups | UNVERIFIED | No PITR/backup mention in the repo; the device store rebuilds from the server (`deviceStore.ts:7-9`) |
| 14 | Migration safety | PARTIAL | Forward-only, additive; CI applies all 42 and runs 30 pgTAP suites; schema fingerprint for drift; GitHub integration applies on merge to `main`. Gaps: gateway deploy is manual and must follow the migration (order enforced by docs only); new constraints "not rehearsed on production rows" (`moment-deck-release-plan.md`); only tables marked `optional` tolerate an older server (`tables.ts:36-42`) |
| 15 | Feature flags | IMPLEMENTED | Server-resolved override → rollout → default, all off; 4 s wait then device cache; the 2.0 build never drops to 1.0 on unknown (`useFlags.ts:65-69`, `launchRouting.test.tsx`); only an explicit server "off" opens 1.0 |
| 16 | CI gates | PARTIAL | tsc, eslint, jest, deno check/test, free evals and replay corpus, migrations + pgTAP on every push/PR. No device, Maestro or black-box run in CI; required checks on `main` UNVERIFIED |
| 17 | Dependency scanning | PARTIAL | Phase 2 row 18 |
| 18 | Secrets management | IMPLEMENTED | Phase 2 row 10 |
| 19 | Offline / resilience | IMPLEMENTED (one gap) | Mirror + outbox in one transaction (`userStore.ts:132-141`); persisted understanding survives kill; overlap window, daily reconcile, 30-day full resync (`syncEngine.ts:10-17,403-415`). Gap: a lost or non-migrated SQLCipher key deletes the file with unpushed writes and no notice (`deviceStore.ts:49-66`; keys are `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`) |
| 20 | Cost controls | PARTIAL | Model pinned, `effort: low`, `maxTokens 8000`, prompt caching, no SDK retries, `ai_extraction` as a kill switch; but 6× fan-out per quota unit and no org-wide cap in code |

### Additional reliability items

| Item | Verdict | Evidence |
|---|---|---|
| AI request budgets and cost controls | PARTIAL | Row 20; SEC-3 |
| Retry safety and idempotency | IMPLEMENTED | Rows 6, 7 |
| Concurrency and races | IMPLEMENTED with one known class | Per-capture claim lock; versioned rows; the WS-3 harness found that a dropped first outbox push under parallel load leaves the capture insert queued with no retry tick in the harness (the "Understanding…" stall; K37 in PR #89) |
| Background jobs and recovery | MISSING by stage | No `pg_cron`; purges unscheduled (SEC-2); reasons refresh only on Today open, throttled 10 min (`reasons.ts:21`); nothing while the app is closed |
| Data consistency / state synchronisation | IMPLEMENTED (REL-1 excepted) | Three-way field merge never silently overwrites (`merge.ts:1-53`); conflicts shown in context with "Keep / Use" (`conflictCopy.ts`) |
| Migration safety | PARTIAL | Row 14 |
| Observability without private information | IMPLEMENTED for what exists | Rows 10–12 |
| Backup and restoration | UNVERIFIED | Row 13 |
| Dependency failures | IMPLEMENTED | Row 8; provider `api_error` → 503 → `failed` after 6 attempts (~2 h) with no alert (REL-2) |
| Graceful degradation | IMPLEMENTED | Row 8 |
| Accessibility regression testing | PARTIAL | Role/label assertions in Jest; contrast test on text tokens; no Reduce Motion or VoiceOver tests for notebook components |
| CI and automated release gates | PARTIAL | Row 16; OTA latent: `updates.url` + `runtimeVersion: appVersion` ("1.0.0" on every build) with no `channel` in `eas.json`; whether an `eas update` could reach installed builds is UNVERIFIED |

### Reliability risks ranked by stage

| ID | Risk | Must be fixed before | Smallest remediation | Validation |
|---|---|---|---|---|
| REL-1 | Transient PostgREST/Postgres errors classified as permanent: outbox op dropped, server row restored or local row removed (`supabaseRemote.ts:20-22`; `syncEngine.ts:183-186,244-261`); a required-table pull failure throws, is swallowed, and every new Tell waits (`syncEngine.ts:96-98`; `understanding.ts:674-678,803-805`) | **Private pilot** (the trigger coincides with migration merges) | Treat `PGRST2xx` schema-cache codes and 5xx bodies without a Postgres code as `network`; limit `rejected` to provably permanent classes (`22*`, `23*`, `P0*`); report non-network cycle failures content-free | `FakeRemote` throwing `RemoteError("rejected","PGRST204")` → op retained, `report.offline`, retried next sync; black-box run across a migration |
| REL-2 | No alerting or reporting of handled failures; a provider outage is found by the user ~2 h later | **Private pilot** (minimal) | Content-free `captureMessage` on `gave_up` and on sync non-network failure; a daily SQL check on `ai_calls.outcome`; provider spend alert | Force a 503 with the fake caller; see the event |
| REL-3 | Nothing runs when closed; purges unscheduled | Private pilot (purges, SEC-2); public beta (push, E15) | Migration enabling `pg_cron` for the two purges; push is a product decision | `cron.job` rows; pgTAP |
| REL-4 | Lost or non-migrated key discards unpushed writes silently | Public beta | Emit a content-free `store_rebuilt` event and one calm line before deleting an unreadable file; sync on every write, not only the 30 s tick | Extend `isolation.test.ts` "lost key" |
| REL-5 | Cost amplification (SEC-3) | Public beta | As SEC-3 | As SEC-3 |
| REL-6 | Release path manual and order-sensitive; OTA latent | Public beta | A deploy checklist step that reads `list_migrations` before `functions deploy`; per-profile `channel` or remove `updates.url` until OTA is intended; make CI required on `main` | Dry run; `eas update:list` |
| REL-7 | No device or end-to-end gate in CI; audit non-blocking | Public beta | Nightly black-box job against `supabase start`; Dependabot; audit blocking at critical | CI history |
| REL-8 | 1.0 fully bundled; an explicit server "off" routes a 2.0 account to 1.0 | Commercial launch | Execute `KINSHIP_2_DELETION_PLAN.md`; ignore `shell_v2` in `EXPO_PUBLIC_V2_ENTRY` builds once 1.0 retires | `launchRouting.test.tsx`; bundle-size diff |
| REL-9 | Device "today" vs server time zone when a stored `user_settings.time_zone` is stale (`v2_reasons_v0.sql:155-161`); no duplication today because v0 emits no server birthday reasons | Optional | Server prefers `p_time_zone` when supplied; dedupe by `(person, day)` | Mismatched-zone test |
| REL-10 | Code-health hot spots: `pipeline.ts` 2,598 lines, `useV2.ts` 1,276, `understanding.ts` 1,170, `todayModel.ts` 1,048, `reviewModel.ts` 1,016; 141 lint warnings (60 unused vars, 41 exhaustive-deps); local `conflicts` and `understanding` rows never pruned; roster silently capped at 1,000 / 2,000 (`index.ts:97-98`) | Optional | Prune resolved rows > 30 days; clear unused directives; split `useV2.ts` | Lint count; file sizes |

### Solid, do not touch

The sync engine (versioned optimistic concurrency, server-side `v2_row_guard`, three-way merge, idempotent inserts, overlap + reconcile + tombstones, optional-table tolerance; 24 sync tests + `syncRetryBound` + pgTAP); the per-user SQLCipher store bound to its owner with explicit `BEGIN IMMEDIATE` (`expoPlatform.ts:66-104`); the understanding state machine; the gateway guard rails; privacy telemetry; flag launch routing; the database rules (composite-FK ownership, no DELETE privilege, `rls_auto_enable`, 30 pgTAP suites from scratch in CI, schema fingerprint); the free eval corpus and replay in CI with paid evals label-gated.

## Phase 7 — Discoverability and growth

**Stage: product validation, two-person household pilot.** 3 accounts exist; 2 are active; no build has reached the founder's wife; readiness is NOT READY (contract §10). Every acquisition recommendation would be premature, and the contract forbids optimising engagement (§2 "What Kinship does not optimise").

| Stage | Verdict |
|---|---|
| Product validation | **Now.** The one metric that matters is plan §24's showing-up moment (a true reason surfaced; the user reached the person within three days; the return check said Yes). It is computable today from `contact_events` with `source = return_check`, content-free. Recommendation: the founder reads this count for the two pilot accounts weekly; no dashboard, no new telemetry |
| Activation | Next. The first session is complete and gated. The honest activation gap is the quiet first week; the smallest fix is the local Moment notification already built (permission asked only after a useful Moment), verified on a phone |
| Retention | Needs push-while-closed (E15) before it can be measured at all. Do not build weekly briefs, reconnect or reflection before the minimal push proves the thesis |
| Organic sharing | One product-native opportunity that reinforces value: nothing yet, and the share sheet is deferred (row 32). The only honest share is the real conversation Kinship opens; that already exists |
| Distribution (SEO, GEO, directories, comparison content, AI-search) | **Not now.** There is no marketing site in the repository, no public build, and TestFlight profiles (`testflight-v2`) have not been used for anyone outside the household. Any directory listing or comparison page would describe a product no one can install |
| Monetization | D10 working hypothesis stands; nothing to do before validation |

Social-media growth claims were not evaluated: none are cited in the repository, and none would change the recommendation at this stage.

---

# C. Ranked improvement backlog

## Evidence class of every finding

| Class | Meaning | IDs |
|---|---|---|
| **VERIFIED IN CODE** | The behaviour is read directly from `main` at `c2e0ee7` or from production state, with file:line evidence; it does not depend on a device | REL-1, REL-2, REL-3, REL-4, REL-5, REL-8, REL-9, REL-10, SEC-1, SEC-2, SEC-3, SEC-4, SEC-5, SEC-6, SEC-7, SEC-8, UX-1, UX-2, UX-3, UX-4, UX-8, UX-9 (target sizes computed from the style values), UX-10, UX-11, UX-14, UX-15, UX-16 (contrast computed from `tokens.ts`), UX-17, UX-18, UX-20, UX-21, PRD-1, PRD-2, PRD-3, PRD-4, DOC-1 |
| **HYPOTHESIS (needs a device or a setting not inspected)** | The code makes the outcome likely, but the user-facing effect was not observed | UX-5 (VoiceOver grouping of the poster's buttons), UX-6 (Reduce Motion first-read timing), UX-7 (label truncation seen only in the web lab), REL-6 (whether an EAS Update could reach installed builds), every Phase 2 item marked UNVERIFIED (dashboard settings, backups, deployed source parity), motion performance on a phone (Phase 4 principle 22) |
| **DESIGN SUGGESTION (no defect; a proposal for the founder)** | A change to look, motion or copy that needs design judgement and approval | D.1, D.2, D.3, MOT-1 to MOT-4, UX-12 (Kept card control count), UX-13 (Find/Ask pair), UX-19 (contact linking on the Edit sheet), UX-14's replacement wording |

Ranking order: data integrity and privacy → broken or inconsistent core-journey behaviour → accessibility of the live treatment → reliability and release hygiene → design. Effort: S < 1 day, M 1–3 days, L > 3 days. Overlap with live work is stated so nothing is built twice.

## Top ten

| Rank | ID | Recommendation | Outcome affected | Evidence / confidence | Overlap | Effort | Regression risk | Validation | Call |
|---|---|---|---|---|---|---|---|---|---|
| 1 | REL-1 | Reclassify transient PostgREST/Postgres errors as `network`; surface non-network sync failures | Memory integrity; "the user's edit wins" | Code-verified; High | PR #89 carries a "K37 sync race" fix: read it first; if it already narrows `classifyError`, reduce this to tests | S | Low (classification only; existing sync tests pin behaviour) | New `FakeRemote` cases; `syncRetryBound` still passes | **FIX NOW** (E.1) |
| 2 | SEC-2 | Schedule `purge_tombstones` and `purge_expired_capture_reviews` with `pg_cron` | The privacy promise of "Delete this note" | Code-verified; High | None | S | Low (functions already tested) | pgTAP on `cron.job`; existing purge tests | **FIX NOW** (E.2) |
| 3 | UX-5 | Make the notebook poster's buttons reachable by VoiceOver (`accessible={false}` on the wrapper; label the headline text) | Accessibility of the live treatment | Code-evident; device UNVERIFIED; Medium-High | None | S | Low | Jest: no `accessibilityRole="button"` ancestor wraps `NButton`s; founder VoiceOver check | **FIX NOW** |
| 4 | UX-4 | "Not this" on the alpha person page confirms (as What Kinship knows does) or offers Undo | Trust: no forgetting by a slip | Code-verified; High | None | S | Low | Jest on `ItemSheet` / route | **FIX NOW** (E.3) |
| 5 | UX-1 | Guard the alpha People empty state with `loaded` | Contract §8: no false empty state | Code-verified; High | None | S | Low | Jest render with a pending query shows nothing | **FIX NOW** |
| 6 | REL-2 | Minimal alerting: content-free `captureMessage` on `gave_up` and sync failure; a daily `ai_calls.outcome` query | Reliability; founder finds outages before users do | Code-verified; High | None | S–M | Low | Fake caller 503 → event | **FIX NOW** |
| 7 | UX-3 | Person page Call leads with Call (pass `prefer: "call"` to the hand-off) | Journey consistency; return check kept | Code-verified; High | None | S | Low | Jest on the route | **FIX NOW** (E.3) |
| 8 | SEC-1 | PKCE for Google sign-in | Account takeover resistance on a shared device | Code-verified; High | None | S–M | Medium (auth flow; needs a device check) | Unit test on redirect parsing; founder Google sign-in | **NEXT** (before public beta) |
| 9 | UX-2 | Stop 1.0 leaking into 2.0: restyle Terms/Privacy or open them in the in-app browser; a 2.0 not-found; a shell guard on 1.0 route groups | First impression; contract "no 1.0 visual leaks" (row 35) | Code-verified; High | Coverage row 35 lists it as a rough edge; `KINSHIP_2_DELETION_PLAN.md` removes it long-term | M | Low | Jest on routes; lab render | **NEXT** |
| 10 | REL-7 + SEC-4/5 | Nightly black-box job in CI; `deno.lock`; SHA-pinned actions; blocking audit at critical; Dependabot | Release confidence without more founder testing | High | None | M | Low | CI history | **NEXT** |

## Everything else, with a call

| ID | Finding | Severity | Call |
|---|---|---|---|
| PRD-1 | Proactive delivery while the app is closed is not built; the thesis cannot be tested on days the app stays closed | Highest product risk | **NEXT** per CC-25, after the native pass; first verify the local Moment notification on a phone |
| PRD-2 | No founder native pass recorded since the 5–8 Nov merges | Readiness | **FIX NOW** (process; the next milestone) |
| PRD-3 | Two treatments coexist; new accounts get the alpha treatment, the pilot accounts the notebook one; the wife's build needs an explicit choice | Decision | Founder decision before her build |
| PRD-4 | The showing-up metric is computable now from `contact_events` (`source = return_check`) | Validation | **FIX NOW** (a weekly read, no new code) |
| SEC-3 / REL-5 | 6× model-call fan-out per quota unit; no global cap | Low–Medium | **NEXT** |
| SEC-6 | Release-time guard for the dev key path | Low | **NEXT** (one line in the checklist) |
| SEC-7 | `ai-insight` timeout/retries | Low | **DEFER** (retires with 1.0) |
| SEC-8 | `write_memory_item` oracle | Low | **DEFER** |
| REL-3 | `pg_cron` absent (push side) | — | folded into PRD-1 |
| REL-4 | Lost-key silent rebuild | Low–Medium | **NEXT** (beta) |
| REL-6 | Manual, order-sensitive release path; OTA latent | Medium (process) | **NEXT**: checklist step + `channel` or remove `updates.url` |
| REL-8 | 1.0 bundled; explicit "off" routes to 1.0 | Low | **DEFER** (deletion plan) |
| REL-9 | Time-zone source mismatch | Low | **DEFER** |
| REL-10 | Code-health hot spots; unpruned local rows | Low | **DEFER** |
| UX-6 | Reduce Motion async first read | Low | **NEXT** (read synchronously once at app start into a module value) |
| UX-7 | Alpha "Messa…" label truncation at 390 pt (lab) | Low | Verify natively; **NEXT** if real (`fixedLabel` or icon-only with label) |
| UX-8 | Draft debounce 400 ms | Low | **DEFER** |
| UX-9 | Touch targets < 44 pt (Provenance, source lines, Terms links, inline day token) | Medium | **NEXT** |
| UX-10 | Notebook Kept card Undo beside × | Low–Medium | **NEXT** |
| UX-11 | Blank loading on person / Knows / Today first query | Low | **NEXT** (reuse `Waiting`) |
| UX-12 | Kept card control count | Low | **DEFER** (approved I4 hierarchy; monitor) |
| UX-13 | Alpha People Find/Ask filled + outlined pair | Low | **NEXT** with the design pass |
| UX-14 | "The more you tell, the more comes back." nudges capture volume | Contract tension | Founder copy decision; **FIX NOW** if agreed (one string) |
| UX-15 | `finishLeftOpen` 10-min auto-finish vs "no timers" | Contract wording | Raise with the founder; no code change proposed |
| UX-16 | Contrast of ghost outlines and dimmed headers | Low | **NEXT** (token values) |
| UX-17 | `HowItWorks` Modal slide, `Spot` pulse, `VoiceLine` redraw ignore Reduce Motion | Low | **NEXT** |
| UX-18 | Notebook off-token literals | Low | **DEFER** (lint rule) |
| UX-19 | "Which contact?" at reach-out time for add-by-name people | Low | **DEFER** |
| UX-20 | "Which Sam?" rows identical without a label | Low | **NEXT** |
| UX-21 | The web lab cannot render the notebook treatment | Tooling | **NEXT** (add `notebook-*` lab states so screenshots show what users see) |
| MOT-1..4 | Motion opportunities | — | **EXPERIMENT** (Appendix D) |
| DOC-1 | `docs/ops/supabase-settings.md` lacks the three newer accepted SECURITY DEFINER warnings and the current function versions (v17 / v6 / v6) | Low | **FIX NOW** (docs) |

---

# D. Design opportunity shortlist (at most three)

Each uses the existing toolkit (Reanimated 4, `motion` tokens), respects Reduce Motion (150 ms fade), and is validated by whether the founder can say what happened without being told.

| # | Experiment | Current state | Proposed state | Reference | Expected benefit and how to measure |
|---|---|---|---|---|---|
| D.1 | **The loop closes visibly: Kept card arrival** (`TellDock.tsx:166-231` alpha; `NotebookDock.tsx` notebook) | "Understanding…" swaps to "Kept for Ben" as an abrupt text change; the card mounts with no motion | Card arrives with the approved `motion.arrive` (320 ms, 8 pt rise, cubic-bezier(0.2, 0.8, 0.2, 1), opacity + translateY, native driver); then the kept line's provenance dot and underline appear with the `understand` beat (600 ms opacity). Reduce Motion: 150 ms fade, no rise. Interruptible: a tap during arrival cancels nothing and acts at once | Contract §4 motion rule; `interaction-motion-audit.md` spec rows for the Moment | Comprehension and meaningful completion: in the founder pass, "did you notice when it was kept?" answered without prompting; no frame drops at 60 fps on the Release build |
| D.2 | **Review line removal shared between treatments** (`ReviewSheet.tsx:188-203` alpha; notebook strike-then-stay) | Alpha lines vanish instantly on ×; the notebook strikes through and keeps the line | One shared behaviour: strike-through (opacity to 0.5 + a hairline through the words, 200 ms), the row stays until Done; Undo restores. Reduce Motion: instant strike, no fade | Notebook review's existing pattern; CC-18 I4 | Feedback and recovery: fewer accidental forgets (count "Not this → Undo" pairs in the content-free analytics `review_item_rejected`/`undo_capture`); no layout animation |
| D.3 | **`MomentFull` expand on transforms** (`MomentFull.tsx:95-143`) | Animates top/left/width/height/borderRadius for 420 ms (layout work on the JS/UI thread, plus `Grain` tiles under it) | Same visual: measure the poster once, animate `translateX/Y` and `scaleX/Y` of a pre-sized layer with `borderRadius` interpolated on the UI thread (Reanimated), 420 ms bezier(0.2, 0.9, 0.25, 1); close 320 ms. Reduce Motion unchanged (150 ms fade) | Spatial continuity principle; `moment-deck-implementation.md` §5a frame check | Perceived responsiveness: a 30 fps recording on the SE shows no dropped frames during the expand; identical end frame (snapshot) |

Not proposed: any new gallery pattern, glass, shader or 3D effect; a tab cross-fade is listed as MOT-4 but is below the three above in value.

---

# E. Implementation handoff (top three; specifications only, nothing implemented; waits for explicit approval)

Each is a small, independently testable PR against `main`, with no shared files between them. None touches the extraction pipeline, the prompt, Today's eligibility or any approved surface's copy, so none collides with CMR-1 (#89–#93) except where noted in E.1.

## E.1 Sync: transient server errors are not permanent (REL-1)

- **Problem.** `classifyError` returns `rejected` for every `PGRST*` code except 301/302 and for every `42*` SQLSTATE (`src/store/supabaseRemote.ts:15-25`). On a push, `rejected` makes `pushOp` call `recordAndRestore`, which deletes the outbox op and overwrites the mirror with the server row, or deletes the local row when the server has none (`src/store/syncEngine.ts:183-186, 244-261`). On a pull of a required table, the cycle throws and the error is swallowed (`syncEngine.ts:96-98`; `understanding.ts:674-678`), and a capture whose insert op is still queued is never sent for understanding (`understanding.ts:803-805`). A PostgREST schema-cache miss (`PGRST204`) right after a migration merge is transient and fits this path.
- **User impact.** A note or an edit can disappear from the phone, or stall at "Understanding…", with at most a "This changed on another device." conflict, during the minutes after a release.
- **Files.** `src/store/supabaseRemote.ts` (`classifyError`), `src/store/syncEngine.ts` (`pushOp`, `syncOnce` catch), `src/store/understanding.ts` (`kick`), `src/test-utils/fakeRemote.ts`, `src/store/__tests__/sync.test.ts`, `src/store/__tests__/syncRetryBound.test.ts`.
- **Exact behaviour.** `network` (retry later, no state change): no code; `PGRST301`/`302`; `PGRST2xx` schema-cache and timeout classes; any 5xx with no Postgres SQLSTATE. `rejected` (record, drop, restore): `22*`, `23*`, `P0*`, `42501`, `42P01` only when the table is not marked optional (optional tables already fail open). `conflict`: `40001` unchanged. Unknown codes default to `network`, with `attempts` still incremented so `syncRetryBound`'s cap on rebases stays meaningful; add a separate cap of 20 attempts per op before it is recorded as rejected, so a truly permanent unknown error still terminates.
- **UI copy.** None new. When a cycle fails for a non-network reason, Today's existing offline line is not used; instead the background pass reports it content-free (E.1 does not add a user-facing line; that is REL-2's scope).
- **Technical approach.** Replace the regex at `supabaseRemote.ts:20` with explicit code classes; in `pushOp`, treat `network` as today (leave the op); in `syncOnce`'s catch, keep the `network` → `report.offline` path and, for other kinds, call a new `onCycleFailed(kind, code)` hook that REL-2 can wire to a content-free `captureMessage`.
- **Tests to add.** `FakeRemote` throws `RemoteError("rejected","PGRST204")` on insert → op retained, `report.offline === false`, no conflict row, retried on the next sync and succeeds; `42703` on update → op retained; `23505` on insert → existing rejected path unchanged; an unknown code after 20 attempts → rejected path. Existing 24 sync tests and `syncRetryBound` unchanged.
- **Acceptance.** No outbox op is deleted for a code outside the permanent classes; a transient error during a push leaves the mirror unchanged; the test suite passes under `TZ=UTC`.
- **Regression risk.** Low. The only behavioural change is retrying where the engine previously gave up; the rebase cap prevents loops.
- **Effort.** S (half a day including tests).
- **Dependencies.** Read PR #89's K37 change first; if it already narrows the classification, this PR becomes tests only.

## E.2 Schedule the purges (SEC-2 / REL-3)

- **Problem.** `purge_tombstones()` (`20261002210300_v2_platform.sql:272-274`) and `purge_expired_capture_reviews()` (`20261004100000_v2_capture_reviews.sql:237-238`) are defined, service-role-only and tested, but no `cron.schedule` exists anywhere, and `pg_cron` is not installed (`20261005090000_v2_reasons_v0.sql:34`).
- **User impact.** A note the user deleted keeps its `raw_text` on the server indefinitely; expired reviews are hidden by RLS but never removed. The Source view's "Delete this note" is true on the phone and not on the server.
- **Files.** One new migration `supabase/migrations/20261120090000_v2_schedule_purges.sql`; one pgTAP suite `supabase/tests/database/74_v2_schedule_purges.test.sql`; `docs/ops/supabase-settings.md` (record the schedule); `supabase/tests/schema_fingerprint*.sql` if the fingerprint includes extensions.
- **Exact behaviour.** `create extension if not exists pg_cron with schema pg_catalog;` (Supabase installs it in `pg_catalog`; if the local test Postgres lacks the extension, the migration guards with `if exists (select 1 from pg_available_extensions where name = 'pg_cron')` and the pgTAP test skips with a note). Two jobs: `kinship_purge_tombstones` nightly at 03:10 UTC calling `public.purge_tombstones()`; `kinship_purge_expired_reviews` nightly at 03:20 UTC calling `public.purge_expired_capture_reviews()`. Both idempotent (`cron.unschedule` if the name exists, then `cron.schedule`). The purge functions' retention windows stay as they are.
- **UI copy.** None.
- **Tests to add.** pgTAP: both jobs present in `cron.job` with the expected command and schedule (skipped when `pg_cron` is unavailable in CI; the existing purge-function tests still run); the existing `40_delete_account` and `53_v2_lifecycle` suites unchanged.
- **Acceptance.** `list_migrations` shows the migration in production after the merge; `select jobname from cron.job` shows both; the next morning's `cron.job_run_details` shows two successes; the schema fingerprint of a fresh build matches production.
- **Regression risk.** Low. Nothing the app reads changes; purges only remove rows already hidden from every user.
- **Effort.** S.
- **Dependencies.** None. Must merge to `main` with a merge commit (migrations are forward-only and reach production only that way). CI's Postgres 16 image needs `postgresql-16-cron` or the guard above.

## E.3 Person page actions: "Not this" confirms; Call leads with Call (UX-4, UX-3)

- **Problem.** On the alpha person page, the ItemSheet's "Not this" calls `onForget` immediately (`src/features/person/ItemSheet.tsx:109`) and the route rejects the item with no confirm or Undo (`app/v2/person/[id]/index.tsx:270-273, 293-296`), while What Kinship knows confirms with `FORGET_COPY` (`app/v2/person/[id]/knows.tsx:73-77`) and the notebook LineSheet confirms too. Call and Message both call `reachOut` with no preferred channel (`index.tsx:207-208`), so Call opens the hand-off sheet with Open Messages as the primary; Moment detail already passes `prefer` (`src/features/today/useHandoff.tsx:66-84`).
- **User impact.** A slip forgets a memory with no way back; tapping Call does not call.
- **Files.** `app/v2/person/[id]/index.tsx`; `src/features/person/__tests__/editSheet.test.tsx` or a new `personActions.test.tsx`; no change to `ItemSheet.tsx` itself (the route owns confirmation, as `knows.tsx` does).
- **Exact behaviour.** Not this → `Alert.alert(FORGET_COPY.title, line.statement, [Cancel, Forget])` using the existing copy from `knows.tsx`; Forget → `u.reject(iid)` as today, with the item sheet closed first. Call → `reachOut({ prefer: "call" })`: the hand-off sheet opens with Call as the primary action and Open Messages, FaceTime, WhatsApp secondary; the "When you come back: Did you reach X?" line and the return check are unchanged (CC-26: every intentional hand-off from the page keeps its return check). Message is unchanged.
- **UI copy.** Reuses `FORGET_COPY` (title "Forget this?", Cancel / Forget). No new strings.
- **Technical approach.** Lift `forgetAsked` from `knows.tsx` into a small shared helper (`src/features/person/forgetAsked.ts`) and call it from both routes; thread `prefer` through `reachOut` the way `MomentDetailSheet` does.
- **Tests to add.** Route test: pressing Not this calls `Alert.alert` with the line's statement and does not call `reject` until Forget; Cancel leaves the item; Call opens the hand-off with `prefer === "call"` and the return check is still registered after the sheet's primary action. Existing `editSheet`, `personFocus` and `useHandoff` tests unchanged.
- **Acceptance.** No path on the person page forgets a line without a confirm; Call's primary action opens `tel:`; the return check appears after a Call hand-off exactly as after Message.
- **Regression risk.** Low; one route file and a shared helper.
- **Effort.** S.
- **Dependencies.** None. The notebook treatment's `LineSheet` already confirms; this PR does not touch it.

---

# F. Review coverage and uncertainty

**Environments not available.** No iPhone, simulator, EAS build, Maestro run or TestFlight. Every "on a phone" statement is UNVERIFIED, including VoiceOver reachability (UX-5), Reduce Motion timing (UX-6), label truncation (UX-7), frame rates, keyboard behaviour, permission dialogs and the live notification.

**Settings not inspected.** Supabase dashboard: anonymous sign-in, leaked-password protection, session time-box, backups/PITR, PostHog IP discard, GitHub branch protection (required checks), EAS Update channels. Deployed function source parity with `main` (only versions were read).

**What was read in production.** Migration list (42), function list and `verify_jwt`, security advisors, flag definitions and override counts, row counts (users, users with people, captures in 14 days). No note, memory, name, email or user id was read or recorded.

**Lab render limits.** The web export renders the alpha treatment only; the notebook treatment the pilot accounts use has no lab states. Web rendering differs from iOS (fonts, hit testing, no keyboard), and the export logs a React hydration warning (#418) that is lab-only.

**Test coverage gaps found.** No Jest test asserts the alpha People view hides its empty state while loading; no test asserts Reduce Motion branches in notebook components; no test for VoiceOver structure of `MomentPoster`; no test that a `PGRST204` push is retried; no pgTAP for a purge schedule; no release-time grep for the dev key; no CI run of the black-box harness or Maestro flows.

**Assumptions.** The founder's two accounts are the only real users (3 accounts, 2 active); the household dogfood has not started; CMR-1 (#89–#93) will merge before the wife's build, so this review did not re-audit extraction correctness, which CMR-1's evals cover; the canonical checklists used in Appendix B stand in for the master prompt's lists, which were not supplied.

**What would change the conclusions.** A founder native pass that passes every row of `moment-deck-implementation.md` §7 would move readiness to READY FOR WIFE DOGFOOD with the FIX NOW items as the only blockers. A device VoiceOver check that reaches the poster's buttons would downgrade UX-5 to a nit. Evidence that PR #89 already reclassifies PostgREST codes would reduce E.1 to tests. A week of showing-up metrics from the two accounts would decide whether push (PRD-1) is the next build or whether Today's reasons need work first.
