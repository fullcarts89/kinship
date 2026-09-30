# Kinship 2.0 — Implementation Tickets

As of 30 September 2026 · Companion to `KINSHIP_2_EPICS.md`

Each ticket is sized for one engineer or one coding agent to implement and review on its own.

**Size:** S ≤ 1 day, M ≤ 3 days, L ≤ 5 days (anything larger was split).

**How to read a row:** "Depends" lists tickets that must be merged first. Tickets are ordered so that working top to bottom within a phase respects dependencies.

**Rules for every ticket:**
- One PR.
- `tsc`, lint and tests green.
- New behaviour has a test.
- No edits to a hotspot file owned by another workstream (Operationalization §32).
- Migrations only from W2.

---

## Phase 0 — Trust and observability (weeks 1–2)

### E00 Trust hardening

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| P0-01 | Merge `claude/wonderful-planck-inpeu9` into main; apply migration `008_ai_usage` to the live project; redeploy `ai-insight` with `verify_jwt` on | — | S | Deno tests: anon key, anonymous user and expired token → 401; oversize → 400; 51st call → 429. Live function version > 1 |
| P0-02 | Remove mock fallbacks and `u1` local saves from `usePersons`, `useMemories`, `useInteractions`; show explicit error/offline states; delete `src/data/mock.ts` | — | M | Jest: service throws → `error` set, list empty, no local write; grep shows no `mockPeople` |
| P0-03 | Sign-out wipes local JSON store, module caches, AI cache and in-memory arrays | — | S | Integration test: A creates, signs out, B signs in → 0 rows, store dir empty |
| P0-04 | Replace prototype `app/settings/account.tsx` with a minimal real screen: email, sign out, Delete account → P0-05 | P0-05 | M | Maestro: delete → signed out → sign-in with the same credentials fails |
| P0-05 | Add `supabase/functions/delete-account` (service role): all user rows in every table, storage prefix, auth user; returns counts; idempotent | P0-11 | M | Deno test with seeded user: counts 0 afterwards; second call 200 no-op |
| P0-06 | Route `app/settings/privacy.tsx` deletion to `delete-account`; show failures honestly | P0-05 | S | Unit: server error → error message, not "deleted" |
| P0-07 | Server-side AI consent: `user_settings(ai_consent bool default false, consent_version)` + RLS; `ai-insight` returns 403 without consent; `aiPreferences.ts` reads and writes the server value | P0-01, P0-11 | M | Deno: consent false → 403; reinstall keeps the value |
| P0-08 | Delete season calendar echoes (`seasonCalendar.ts` writer and its option in `season/new.tsx`); stop the Home path from requesting calendar permission | — | S | Lint rule bans `createEventAsync`; unit: Home suggestions never call `requestCalendarPermission` |
| P0-09 | Generic lock-screen copy for memory resurfacing; add an "outputs contain no capture text" test for every notification builder | — | S | Jest over all builders |
| P0-10 | Remove `WRITE_CONTACTS` and unused permission strings; add a permissions allowlist test | — | S | Config test passes |
| P0-11 | CLI-timestamped baseline migration capturing live state (including `rls_auto_enable`); move `001`–`007` to `_legacy/`; `supabase db reset` reproduces live | — | M | Schema diff live ↔ local = empty |
| P0-12 | Remove the Invite action and `buildInviteMessage` | — | S | Grep test in CI |
| P0-13 | Revoke `EXECUTE` on `rls_auto_enable` from anon and authenticated; rewrite all 18 policies with `(select auth.uid())`; add parent-ownership checks on `memories`, `interactions`, `promises`, `season_commitments` | P0-11 | M | pgTAP cross-user suite green; advisors clean |
| P0-14 | Enable leaked-password protection (Auth settings); record it in `docs/ops/supabase-settings.md` | — | S | Advisor clean |
| P0-15 | Copy picked photos into `Paths.document/photos/<uuid>.jpg` in 1.0 | — | S | Unit: returned URI is under the document dir |
| P0-16 | `npx expo install --fix` to SDK 54 patch level; `npm audit --omit=dev` free of high/critical | — | S | `expo-doctor` clean; audit clean |

### E01 CI, observability, analytics

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| OBS-01 | Add Jest (`jest-expo`) + `@testing-library/react-native`; first tests for `spotlightEngine` date logic | — | S | `npm test` runs locally and in CI |
| OBS-02 | GitHub Actions `ci.yml`: tsc, eslint, jest; required on main | OBS-01 | S | Branch protection shows the check |
| OBS-03 | Fix the 37 lint errors (unescaped entities; Deno import resolver config for `supabase/functions`) | — | S | `eslint .` 0 errors |
| OBS-04 | Add local Supabase + pgTAP + Deno tests to CI (`supabase start`, `supabase test db`, `deno test`) | P0-11 | M | CI runs P0-05/P0-13 tests |
| OBS-05 | Sentry (`@sentry/react-native`) with `beforeSend` scrubbing; source maps via EAS | — | M | Forced crash visible, no PII (scrubber unit test) |
| OBS-06 | Typed analytics client `src/platform/analytics.ts`: closed prop unions from §23; PostHog or first-party sink; IP/autocapture/replay off | — | M | Type test: string props fail to compile |
| OBS-07 | Server analytics sink for edge-function events (same schema) | OBS-06 | S | Planner emits `push_sent` |

### Deletions that ship in Phase 0

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| DEL-01 | Delete dead modules: `contextExtractor.ts`, `memorySelection.ts`, `growthStage.ts`, `MemoryCelebration.tsx`, `TendGardenSheet.tsx`, `useVitality.ts` (and barrel export), `src/stores/index.ts` | — | S | tsc green |
| DEL-02 | Delete `app/notifications.tsx`, its `Stack.Screen` and the Home link | — | S | tsc green; route gone |
| DEL-03 | Remove unused deps `react-native-worklets-core`, `expo-media-library`; cut a dev build | P0-16 | S | Dev build launches |
| DEL-04 | Close stale branches (`fervent-lovelace`, `hormozi-value-research`, `review-kinship-history`, `brave-cori`) with a note | — | S | Only main, active and v2 branches remain |
| DEL-05 | Move `.planning/`, old `docs/*` exports and `PRD.md` to `docs/archive/`; the README points to the 2.0 docs | — | S | README updated |

---

## Phase 1 — Foundations (weeks 2–4)

### E02 Feature flags

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| FLG-01 | Migration: `feature_flags`, `user_flag_overrides`, RPC `resolved_flags()` | P0-11 | S | pgTAP: user sees only resolved values |
| FLG-02 | `FlagRepo` (launch read, SQLite cache, foreground refresh) + `useFlag()` | FLG-01, DATA-02 | S | Jest: cache fallback; refresh |
| FLG-03 | `_shared/flags.ts` for edge functions | FLG-01 | S | Deno test |
| FLG-04 | Root shell switch in `app/index.tsx` on `shell_v2`; empty `app/(v2)/_layout.tsx` | FLG-02 | S | Toggling the flag switches shells on relaunch |

### E03 Schema v2

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| SCH-01 | Migration: shared trigger functions (`set_updated_at`, `bump_version`), `people`, `person_identities` (hashed values), `related_people` + RLS | P0-11 | M | pgTAP: RLS, triggers |
| SCH-02 | Migration: `captures` + RLS + status check + `retention` | SCH-01 | S | pgTAP |
| SCH-03 | Migration: `memory_items` (kind, subject, certainty, sensitivity, status, user_state, detail) + per-kind `CHECK` on `detail` | SCH-01 | M | pgTAP: invalid detail rejected per kind |
| SCH-04 | Migration: `memory_item_sources` + deferred constraint "an item must have ≥ 1 source at commit" + `memory_item_history` | SCH-03, SCH-02 | M | pgTAP: sourceless item insert fails at commit |
| SCH-05 | Migration: `reasons`, `reason_events`, `interactions` (v2) + RLS + indexes | SCH-03 | S | pgTAP |
| SCH-06 | Migration: `user_settings` (extend P0-07: timezone, brief day/time, quiet hours, lockscreen level, pause, retention), `consents`, `devices` | P0-07 | S | pgTAP |
| SCH-07 | Migration: `merges`, `extraction_feedback`, `person_insights`, `ai_calls` | SCH-03 | S | pgTAP |
| SCH-08 | Generate `src/types/database.generated.ts`; CI check that types are up to date | SCH-01…07 | S | CI fails on drift |
| SCH-09 | `packages/domain/schemas/*.ts` zod schemas per kind + a parity test against SQL checks | SCH-03 | M | Parity test green |
| SCH-10 | Deletion functions in SQL: `delete_capture(id)`, `delete_person(id, redact bool)`, following §5 semantics; extend `delete-account` for v2 tables | SCH-04, P0-05 | M | pgTAP scenario suite for every §5 rule |

### E04 Local store, repositories, sync

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| DATA-01 | Spike S-2: `expo-sqlite` with SQLCipher via config plugin on a dev build; measure open time; document | — | S | Written result; go/no-go |
| DATA-02 | `src/data/local/db.ts`: per-user DB file, key in SecureStore, local migrations runner, `wipe(userId)` | DATA-01 | M | Jest (better-sqlite3): migrate, wipe |
| DATA-03 | Local tables mirroring people, captures, memory_items, sources, reasons, interactions, settings, flags | DATA-02, SCH-08 | M | Jest |
| DATA-04 | Outbox: ordered, idempotent (client UUID), `base_version`, retry with backoff | DATA-03 | M | Jest: replay twice → one server row (fake server) |
| DATA-05 | `SyncEngine.pull()` per-table `updated_at` cursors, paging, tombstones, full resync if cursor > 30 days | DATA-03 | M | Jest suite |
| DATA-06 | `SyncEngine.push()` + version-conflict re-pull | DATA-04 | M | Jest: conflict path |
| DATA-07 | Realtime "changed" subscription triggers pull (no data in payload) | DATA-05 | S | Integration test |
| DATA-08 | Repositories: `PeopleRepo`, `CaptureRepo`, `MemoryRepo`, `ReasonRepo`, `SettingsRepo`, `InteractionRepo` (read APIs + change events) | DATA-03 | L | Jest per repo; no fallback branches |
| DATA-09 | `DataProvider` + auth lifecycle: open the DB on sign-in, wipe on sign-out, unregister push token | DATA-02, DATA-08 | S | Account-switch test (§26) |
| DATA-10 | ESLint rule: no `supabase` / `src/data/local` imports from `app/**` | DATA-08 | S | Lint fails on a violating fixture |

### E05 AI gateway

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| AI-01 | `ai-gateway` skeleton reusing P0-01 auth/validation/quota; consent check; capability registry; usage logging to `ai_calls` (no content) | P0-01, P0-07, SCH-07 | M | Deno: 401/403/429 paths |
| AI-02 | Deterministic date resolver in `packages/domain/dates/` (relative expressions, tz, DST, precision) | — | M | 200 table tests |
| AI-03 | Deterministic pre-pass: roster name/nickname matching, "my mom" relations, promise phrasing | SCH-09 | M | Jest |
| AI-04 | `relationship_extract` v1: structured output schema, prompt v1, span requirement, certainty and subject rules; Opus 5.5 at explicit low effort | AI-01, AI-02, AI-03, SCH-09 | L | Eval core+ambiguity ≥ thresholds (EVAL-04) |
| AI-05 | Grounding validator: spans exist, names ⊆ capture ∪ roster, no certainty upgrade | AI-04 | M | Deno: fabricated item dropped |
| AI-06 | `person_resolve`: deterministic stages, then model on ties (Haiku 4.5 candidate), question when the gap < 0.2 | AI-03 | M | Eval person set |
| AI-07 | `memory_merge`: deterministic similarity + model tie-break; supersede writes `valid_to` | AI-04, SCH-04 | M | Eval merge set |
| AI-08 | Write path: items + sources + history in one transaction; tier computation (`packages/domain/tiers.ts`) | AI-05, SCH-04 | M | pgTAP + Deno: all-or-nothing |
| AI-09 | `ai-worker`: pgmq consumer (`extract` queue), `pg_cron` schedule, retries ×3, `failed` status | AI-08 | M | Deno: offline capture processed |
| AI-10 | Tone guard: port the banned-word validator from `notificationEngine.ts` into `packages/domain/tone/` | — | S | Jest over the 1.0 banned list |
| AI-11 | Refusal handling + server-side fallback configuration; `failed_refused` status | AI-04 | S | Deno with a mocked refusal |
| AI-12 | Typed client `src/platform/aiGateway.ts` | AI-01 | S | Jest with a mocked fetch |

### E06 AI evaluations

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| EVAL-01 | Fixture schema + 120 core fixtures | SCH-09 | M | Validated by the zod schema |
| EVAL-02 | 60 ambiguity fixtures (all prompt examples + variants) and 40 sensitive fixtures | EVAL-01 | M | Reviewed by two people |
| EVAL-03 | 80 date, 20 adversarial and 40 merge fixtures | EVAL-01 | M | — |
| EVAL-04 | Runner `scripts/evals/run.ts` + deterministic graders + report (markdown) | AI-04 | M | Report lists every §10 metric |
| EVAL-05 | Tone judge (LLM rubric) with a 50-sample human calibration | EVAL-04 | S | Agreement ≥ 90% |
| EVAL-06 | `evals.yml`: on the `run-evals` label and nightly; posts a summary to the PR | EVAL-04, OBS-02 | S | Workflow green |
| EVAL-07 | Model comparison run: Opus 5.5 vs Sonnet 5.5 vs Haiku 4.5 per capability; cost/latency report for D12 | EVAL-06 | S | Report committed to `docs/evals/` |

### E07 Design system

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| DS-01 | `src/design/tokens.ts` (colour light/night, type, space, radius, motion, shadow) + `useTokens()` | — | S | Contrast unit test ≥ 4.5:1 for text pairs |
| DS-02 | Fonts: Newsreader (optical size) + Instrument Sans via `expo-font` | — | S | Renders in the lab |
| DS-03 | `Screen`, `Label`, `Pill` (primary/ghost/destructive; never truncates) | DS-01, DS-02 | M | a11y role tests; lab |
| DS-04 | `Row`, `QuietLine`, `Moment`, `Provenance` | DS-03 | M | Tests; lab |
| DS-05 | `Sheet` (360 ms spring, focus trap), `TellField` (input + mic slot) | DS-03 | M | Tests |
| DS-06 | `Token` + picker scaffolding (visual only; data in E10) | DS-04 | S | VoiceOver hint test |
| DS-07 | Reduce Motion support across motion tokens | DS-05 | S | Mocked `isReduceMotionEnabled` tests |
| DS-08 | `app/(v2)/_lab.tsx` hidden screen: all components, light/night, Dynamic Type preview | DS-03…07 | S | Lab sign-off on 3 devices |
| DS-09 | ESLint rules for v2 paths: no hex, no Card import, icon labels required | DS-01 | S | Lint fixtures |

### E08 Sprig

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| SPR-01 | Seeded PRNG + `fnv1a64(id)` seed; determinism test (Node vs Hermes) | — | S | CI via Hermes |
| SPR-02 | Generator: six form families, structure fully from the seed (Algorithm B) | SPR-01 | L | 100-seed sheet for design review |
| SPR-03 | `Sprig.tsx` (react-native-svg), LRU memo, decorative a11y | SPR-02, DS-01 | S | < 0.5 ms per sprig on SE (perf test) |
| SPR-04 | Golden raster tests (resvg) for 60 seeds + 500-seed path snapshots | SPR-02 | S | CI |
| SPR-05 | Marks (Algorithm C): node selection from moment id, detail variants, one flower rule; behind `sprig_marks` | SPR-02 | M | Area-variance property test < 3% for 0 → 50 marks |
| SPR-06 | Draw animation (strokeDashoffset 1.8 s, once) with Reduce Motion fade | SPR-03, DS-07 | S | Test |

---

## Phase 2 — Vertical slice (weeks 4–6), internal only

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| TELL-01 | `app/(v2)/tell.tsx` typed mode; `contextPersonId`; "Kept" < 100 ms via CaptureRepo | DS-05, DATA-08 | M | E2E: capture visible locally offline |
| TELL-02 | Online extraction call after sync + Realtime result delivery to the sheet | TELL-01, AI-08, DATA-07 | M | E2E: items appear < 7 s |
| TELL-03 | Offline path: "I'll understand this when you're online"; pgmq processing; "I understood 2 notes · Review" quiet line | TELL-02, AI-09 | S | Network-toggle fuzz test |
| EXT-01 | ExtractionSheet: statement list, tokens, ×, Done, auto-dismiss per tier | TELL-02, DS-06 | M | Tier tests |
| EXT-02 | PersonPicker + "New person" | EXT-01 | S | Writes a `user_edit` source |
| EXT-03 | DatePicker (day/week/month/season/no date) | EXT-01 | S | Same |
| EXT-04 | Relation and kind pickers ("It's a plan") | EXT-01 | S | Same |
| EXT-05 | Clarification question UI (one max) + dependent-item hold/release | EXT-01 | M | Tests per §8 |
| EXT-06 | Undo (8 s): deletes the capture and its items via `delete_capture` | EXT-01, SCH-10 | S | Test |
| PER-01 | `app/(v2)/person/[id].tsx` sections: Lately, Coming up, You said you'd, Between you; Sprig; no counts | DATA-08, DS-04, SPR-03 | M | Snapshot + a11y tests |
| PER-02 | `packages/domain/format/statement.ts`: certainty-aware copy, dates in words | SCH-09 | S | Table tests ("is thinking about", "may") |
| PER-03 | SourceView `app/(v2)/source/[captureId].tsx` with span highlight and sibling items | PER-01 | M | Test |
| RSN-01 | Candidate rules for `event_followup` + `upcoming_event` (windows per event type) | SCH-05, AI-02 | M | Table tests with fixed clocks |
| RSN-02 | Ranking + selection + "Nothing needs you today" threshold | RSN-01 | M | Tests |
| RSN-03 | `planner` function v0: recompute candidates for changed people; write `reasons` | RSN-02 | M | Deno |
| RSN-04 | `reason_generate` via Batch + grounding validator + template fallback | RSN-03, AI-05, AI-10 | M | Deno: an ungrounded headline is rejected → template |
| TDY-01 | `app/(v2)/(main)/today.tsx`: one Moment + ≤ 2 QuietLines + TellField (slice version) | RSN-03, DS-04 | M | View-model tests |
| HND-01 | `src/platform/handoff.ts` (sms, tel, facetime, whatsapp, mailto) + follow-up sheet | TDY-01 | S | URL tests |
| HND-02 | Return check line (10 min–12 h window) → interaction + reason done + "Anything worth remembering?" | HND-01, DATA-08 | S | Test: no Yes → no interaction |
| PUSH-01 | Push token registration + `devices`; a minimal `sender` for one Tier 1 push at `private` level (slice only) | SCH-06, RSN-03 | M | Device receives "Something for today" |
| SLICE-01 | Slice script + Maestro flow for §29; learnings doc `docs/slice-learnings.md` | all above | S | Demo recorded; 7 learning questions answered |

---

## Phase 3 — Core loop complete (weeks 6–9)

### Reasons, Today, notifications

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| RSN-05 | Birthday candidates (day before quiet line, day of primary) | RSN-02 | S | Tests incl. Feb 29 |
| RSN-06 | Promise candidates (2–4 days after; once) + Kept it / Let it go | RSN-02 | S | Tests |
| RSN-07 | Open-thread candidates (`followup_after_days`) + resolution when a later item answers it | RSN-02, AI-07 | M | Tests |
| RSN-08 | Plan/season candidates | RSN-02 | S | Tests |
| RSN-09 | Hard-time candidates (sensitivity rules, never cheerful copy) | RSN-02 | S | Tone tests |
| RSN-10 | "A year ago" secondary line (port `spotlightEngine` weighting) | RSN-02 | S | Ported tests pass |
| RSN-11 | Policy gate: person states (remembered/paused), 7-day person cap, muted types, feedback multipliers | RSN-02 | M | Tests |
| RSN-12 | Nightly planner schedule (`pg_cron`), per-timezone slots | RSN-03 | S | Deno with fixed clocks |
| TDY-02 | Today complete: all states, "Not now"/"Not helpful", review line, night palette, empty state | TDY-01, RSN-05…11 | M | E2E |
| NAV-01 | `app/(v2)/(main)/_layout.tsx`: Today · People + pinned TellField | TDY-02 | S | Test |
| PPL-01 | People screen: search-first, alphabetical, sprig + one live line; "Add from contacts" | NAV-01, SPR-03 | M | 500-person list scroll test (virtualized) |
| PUSH-02 | Planner → `notification_outbox` with tiers, budget (≤ 3 / 7 days), quiet hours, dedupe | PUSH-01, RSN-12 | M | Deno suite |
| PUSH-03 | `sender` batching, retries; `receipts` → disable bad tokens | PUSH-02 | M | Deno with fake Expo |
| PUSH-04 | Cancellation trigger + pre-send recheck | PUSH-02 | S | Test |
| PUSH-05 | Lock-screen levels + sensitive override + server-side banned-word check | PUSH-02, AI-10 | S | Test |
| PUSH-06 | Weekly brief push (Tier 2) + in-app brief list | PUSH-02 | M | Test on chosen day/time |
| PUSH-07 | Back-off after ignored pushes; "Pause everything" | PUSH-03 | S | Test |
| PUSH-08 | Notification permission ask after the first real moment | PUSH-01 | S | Test |
| HND-03 | WhatsApp `canOpenURL` + `LSApplicationQueriesSchemes`; channel list from the device contact | HND-01 | S | Device check |

### Person, onboarding, settings

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| PER-04 | What Kinship knows page: every item, edit, "Not this", delete, sources | PER-03 | M | Tests per §5 |
| PER-05 | Forget person (with redact option) + merge duplicates (undo 30 days) | PER-04, SCH-10 | M | pgTAP + E2E |
| PER-06 | Person states UI: Remembered / Paused (set only by the user; reversible; the only visual difference is one line; AI never proposes or sets them, D13) | PER-01 | S | Test: no reasons generated; no code path sets state from extraction |
| PER-07 | "Your story together" (history by year; no totals) | PER-01 | M | Snapshot |
| ONB-01 | Product promise screen → privacy-context screen → Sign in with Apple (D1 order; no anonymous path) | NAV-01 | S | E2E |
| ONB-02 | Privacy-context screen carries the D2 disclosure ("information you record about people may be processed by Kinship's AI provider…") and the single D3 AI consent choice; the choice is stored server-side and versioned right after sign-in; declining gives the non-AI experience with no re-asking | ONB-01, SCH-06 | S | Test: consent row written after sign-in; decline → gateway 403, no re-prompt |
| ONB-03 | Contacts multi-select with suggestions (favourites, family labels, has birthday); port `contacts.ts` normalization | ONB-01 | M | Handles 2,000 contacts smoothly |
| ONB-04 | "Already worth knowing" (birthdays within 14 days) + first Tell | ONB-03, TELL-01 | S | E2E |
| SET-01 | v2 Settings index (from the People header) | NAV-01 | S | — |
| SET-02 | Settings › Notifications (brief day/time, quiet hours, lock-screen level, pause) | SET-01, PUSH-05 | S | Test |
| SET-03 | Settings › What Kinship knows (sources with one-sentence explanations, the D2 AI-provider disclosure, AI consent, retention "delete my original notes after understanding") | SET-01 | M | Consent off → gateway 403 within 1 min |
| SET-04 | `export` function (all v2 tables → JSON, signed URL, 24 h) + UI | SCH-10 | M | Completeness test |
| SET-05 | v2 account screen wired to `delete-account` (v2 tables) | SCH-10 | S | E2E |
| SET-06 | "What we measure" page generated from the analytics schema | OBS-06 | S | — |
| FB-01 | Feedback affordances: useful? on ≤ 1 in 3 reasons; "Report something wrong" per item; shake-to-report with redaction | TDY-02, PER-04 | M | Events fire; no content in payloads |

### Quality gates for alpha

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| QA-01 | Maestro E2E: onboarding → Tell → confirm → person page → Today → hand-off → return check | Phase 3 tickets | M | Nightly green |
| QA-02 | Accessibility pass: VoiceOver script, Dynamic Type AX3 screenshots, contrast | Phase 3 UI | M | Checklist signed |
| QA-03 | Privacy review of data flows vs policy text; rewrite `privacy-policy.tsx`/`terms.tsx` for 2.0 | SET-03 | M | Signed off |
| DEL-10a | Point the 1.0 shell's deep links to v2 equivalents; set `shell_v2` default on for internal users | NAV-01 | S | — |

---

## Phases 4–5 — Alpha and beta (weeks 9–18)

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| BETA-01 | Screener, recruiting, consent and privacy explainer docs in `docs/beta/` | — | S | Reviewed |
| BETA-02 | Metrics dashboard: activation, North Star, quality, guardrails (§24) | OBS-07 | M | Live |
| BETA-03 | Wrong-subject triage runbook + per-case permission flow | FB-01 | S | Drill done |
| BETA-04 | TestFlight rings (internal, alpha, cohort 1) + flag allowlists | FLG-01 | S | — |
| BETA-05 | Week-8 gate report template (§30 criteria) | BETA-02 | S | — |
| BETA-06 | Late-beta pricing research (D10): interview script (unaided price after a moment; $2.99/$4.99/$7.99 reactions; annual vs monthly; continuous-subscription fit; worth paying for; cancel drivers) plus a realistic plan-choice screen behind a flag that records a choice and never charges | BETA-02 | M | Runs in beta weeks 6–8; findings in the gate report |
| VOX-01 | Spike: `expo-speech-recognition` on-device on the device matrix; document locale/device support | — | S | Matrix documented |
| VOX-02 | `src/platform/speech.ts`: `requiresOnDeviceRecognition`, interim results, support check, mic hidden when unsupported | VOX-01 | M | Airplane-mode test |
| VOX-03 | Listening screen (night palette, live underline of recognized names, stop, lock line) | VOX-02, TELL-01 | M | Starts < 300 ms |
| VOX-04 | Info.plist strings, plugin config, dev build + TestFlight build | VOX-02 | S | Build passes review |
| VOX-05 | Spike: iOS 26 `SpeechAnalyzer` native module (for Next) | VOX-02 | M | Go/no-go note |

---

## Phase 3–5 deletions

| ID | Ticket | Depends | Size | Done when |
|---|---|---|---|---|
| DEL-06 | ESLint `no-restricted-imports` banning 1.0 modules from v2 paths | DATA-10 | S | Lint fixture fails |
| DEL-10 | Delete the 1.0 shell by area (routes → components → engines/hooks/services → styling + deps + dev build), one PR each | `shell_v2` at 100% for 2 weeks | L (4 PRs) | Deletion-plan §2 items gone; tsc green; bundle report |
| DEL-11 | Remove the `shell_v2` flag and the root switch | DEL-10 | S | — |
| DEL-12 | Drop old tables and the `ai-insight` function (after a DB snapshot) | DEL-10 | S | Advisors clean; types regenerated |
| DEL-12a | Optional one-time importer from old tables for internal testers | SCH-10 | S | Run once, then deleted |

---

## Phase 6 — Next (after the beta gate; order set by evidence)

| ID | Ticket | Depends | Size |
|---|---|---|---|
| CAL-01 | Calendar platform module: selected calendars, 36 h scan, background refresh | Gate | M |
| CAL-02 | Attendee → person matching by identity hash and full name (never first name only) | CAL-01 | M |
| CAL-03 | `encounters` table + planned-encounter candidates | CAL-02, SCH-05 | S |
| CAL-04 | `interaction_brief` capability + eval set | CAL-03, AI-01 | M |
| CAL-05 | Brief sheet + Tier 1 push 60–90 min before ("Something for tonight") | CAL-04, PUSH-02 | M |
| CAL-06 | Post-encounter in-app prompt 2–3 h after | CAL-03 | S |
| RCN-01 | Rhythm computation into `person_insights` (≥ 3 confirmed contacts) | Gate | S |
| RCN-02 | Curated world-event calendar (sports seasons, holidays, school starts) + reconnect candidates | RCN-01 | M |
| RCN-03 | `reconnect_assist` openers on tap + eval | RCN-02 | M |
| GDN-01 | Garden view "Everyone" (alphabetical / circles) with sway | Gate, SPR-05 | M |
| GDN-02 | Turn on `sprig_marks` after interview evidence | GDN-01 | S |
| NAT-01 | App Intent "Tell Kinship" + Action Button via config plugin + App Group handoff | Gate | L |
| NAT-02 | Share Extension (text + on-device OCR; image not stored) | NAT-01 | L |
| ASK-01 | `retrieval_answer` + Ask field in People search | Gate | M |
| LTR-01 | `reflection_generate` + monthly letter screen | Gate | M |
