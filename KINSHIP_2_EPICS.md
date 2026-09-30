# Kinship 2.0 — Epics

As of 30 September 2026 · Companion to `KINSHIP_2_OPERATIONALIZATION.md` (§ numbers below refer to it) and `KINSHIP_2_TICKETS.md`

There are 22 detailed epics (E00–E21) for Phases 0–5 and the first Phase 6 feature, plus five outlined Phase 6 epics. Complexity is S (≤ 1 week, one engineer), M (1–3 weeks) or L (3+ weeks).

| Epic | Name | Phase | Workstream | Complexity | Depends on |
|---|---|---|---|---|---|
| E00 | Trust hardening | 0 | W1 | M | — |
| E01 | CI, observability, analytics | 0 | W8 | M | — |
| E02 | Feature flags | 0–1 | W8 | S | E03 (table) |
| E03 | Schema v2, RLS, generated types | 1 | W2 | L | E00 (baseline) |
| E04 | Local store, repositories, sync | 1 | W2 | L | E03 |
| E05 | AI gateway | 1 | W3 | L | E00, E03 |
| E06 | AI evaluation harness | 1 | W3 | M | — (fixtures), E05 (runner) |
| E07 | Quiet Herbarium design system | 1 | W4 | M | — |
| E08 | Sprig | 1 | W5 | M | E07 tokens |
| E09 | Tell and the capture pipeline | 2 | W6 | M | E04, E05, E07 |
| E10 | Extraction confirmation and correction | 2 | W6 | M | E09 |
| E11 | Relationship page, provenance, What Kinship knows | 2–3 | W6 | L | E04, E07, E08 |
| E12 | Candidate and reasons engine | 2–3 | W7 | L | E03, E05 |
| E13 | Today and navigation v2 | 2–3 | W7 | M | E12, E07 |
| E14 | Hand-off and return check | 2–3 | W7 | S | E13 |
| E15 | Server notifications and weekly brief | 3 | W7 | L | E12, E03 |
| E16 | Onboarding v2 | 3 | W6 | M | E04, E07, E08 |
| E17 | Settings, export, account deletion (v2) | 3 | W1 | M | E00, E04 |
| E18 | Voice capture | 5 | W6 | M | E09 |
| E19 | Legacy deletion | 0 + 3–5 | all | M | E13, E16, E17 |
| E20 | Beta program operations | 4–5 | founders + W8 | M | E01, E15 |
| E21 | Calendar briefs and post-encounter prompt | 6 | W7 | L | Beta gate |

---

## E00 — Trust hardening

- **Objective:** close every trust defect from the audit before anyone outside the team uses a build (§12).
- **User outcome:** no strangers in your garden, no data left behind after sign-out, deletion that deletes, and no private text on the lock screen.
- **Architecture:**
  - Server fixes are permanent: gateway hardening, `delete-account`, RLS baseline, advisors.
  - 1.0 client fixes are made only where cheap; features that 2.0 deletes anyway are deleted now.
- **Files likely affected:** `supabase/functions/ai-insight/index.ts`, `supabase/migrations/` (new baseline, `008_ai_usage`), `supabase/functions/delete-account/` (new), `src/hooks/use{Persons,Memories,Interactions}.ts`, `src/data/mock.ts`, `src/providers/AuthProvider.tsx`, `src/lib/localStore.ts`, `src/lib/aiPreferences.ts`, `src/lib/notificationEngine.ts`, `src/lib/seasonCalendar.ts`, `src/lib/calendarEngine.ts`, `src/lib/appLinks.ts`, `src/lib/photoPicker.ts`, `app/settings/account.tsx`, `app/settings/privacy.tsx`, `app.json`, `package.json`.
- **Schema changes:**
  - Baseline migration capturing live state.
  - Revoke `EXECUTE` on `rls_auto_enable`.
  - Rewrite policies with `(select auth.uid())` and parent-ownership checks.
  - `ai_usage` table + `consume_ai_call()`.
  - `user_settings(ai_consent, consent_version)`.
- **AI changes:** merge `claude/wonderful-planck-inpeu9`; consent check; model moved to config.
- **UI changes:** 1.0 error and offline states; a minimal real account screen; generic lock-screen copy.
- **Privacy implications:** strictly positive. AI consent becomes server-side and explicit.
- **Dependencies:** none.
- **Testing:** every row of §12 has a proof test (Deno, pgTAP, Jest, Maestro).
- **Acceptance criteria:**
  - All 14 Phase 0 proofs pass in CI.
  - Supabase advisors report no security warnings.
  - `npm audit --omit=dev --audit-level=high` is clean.
  - A written privacy review signs off.
- **Feature flag:** none (fixes are unconditional).
- **Rollback:** each fix is its own PR and revertible. The migration baseline is additive; the policy rewrite has a down migration that restores the old policies.
- **Complexity:** M.

## E01 — CI, observability, analytics

- **Objective:** make it possible to know whether anything works, without collecting relationship content.
- **User outcome:** none directly. Users benefit from fewer crashes and from "What we measure" transparency.
- **Architecture:**
  - GitHub Actions: `ci.yml` (typecheck, lint, Jest, pgTAP, Deno), `evals.yml`, `e2e.yml`.
  - Sentry with scrubbing.
  - A typed `track()` client with closed prop types (§23) and a server-side sink.
- **Files likely affected:** `.github/workflows/*.yml` (new), `app/_layout.tsx`, `src/platform/analytics.ts`, `src/platform/sentry.ts`, `eslint.config.js`, `package.json` (jest-expo, @testing-library/react-native, @sentry/react-native, posthog-react-native or a first-party client), `jest.config.js`.
- **Schema changes:** optional `analytics_events` table if first-party (no content columns).
- **AI changes:** none.
- **UI changes:** Settings › What we measure (v2).
- **Privacy implications:** the event schema is privacy-reviewed. There are no string props. IP capture, autocapture and session replay are off.
- **Dependencies:** none.
- **Testing:**
  - A type test proving `track()` rejects string props.
  - A Sentry `beforeSend` scrubber unit test.
- **Acceptance criteria:**
  - CI is required on `main`.
  - A forced crash appears in Sentry with no PII.
  - The event catalogue in §23 is implemented as types.
- **Feature flag:** `analytics_enabled` (server kill switch).
- **Rollback:** disable the flag; remove the SDK.
- **Complexity:** M.

## E02 — Feature flags

- **Objective:** make every major system independently switchable, and enforceable server-side (§25).
- **User outcome:** safe rollout; problems can be switched off without an app update.
- **Architecture:**
  - Tables `feature_flags` and `user_flag_overrides`.
  - `FlagRepo` reads at launch, caches in SQLite, and refreshes on foreground.
  - A server helper `flag(user, key)` for edge functions.
- **Files likely affected:** `supabase/migrations/*_feature_flags.sql`, `src/data/repositories/FlagRepo.ts`, `supabase/functions/_shared/flags.ts`, `app/index.tsx` (shell switch).
- **Schema changes:** two tables. Read access for authenticated users on their own resolved flags through an RPC; writes via service role only.
- **AI changes:** the gateway checks `ai_extraction`.
- **UI changes:** none (the hidden `_lab` shows flags).
- **Privacy implications:** none.
- **Dependencies:** E03 migration conventions.
- **Testing:** percentage rollout determinism; override precedence; kill switch takes effect in under 60 s.
- **Acceptance criteria:** all flags in §25 exist; `shell_v2` switches the root layout at launch.
- **Feature flag:** n/a.
- **Rollback:** defaults are compiled in; the table can be empty.
- **Complexity:** S.

## E03 — Schema v2, RLS, generated types

- **Objective:** a provenance-first relationship memory in Postgres (§5).
- **User outcome:** everything Kinship says can be traced and corrected.
- **Architecture:**
  - Tables `people`, `person_identities`, `related_people`, `captures`, `memory_items`, `memory_item_sources`, `memory_item_history`, `reasons`, `reason_events`, `interactions` (v2), `user_settings`, `consents`, `devices`, `notification_outbox`, `notification_log`, `merges`, `extraction_feedback`, `person_insights`.
  - Triggers for `updated_at`, `version` and the item-must-have-source constraint.
- **Files likely affected:** `supabase/migrations/<ts>_v2_*.sql`, `supabase/tests/*.sql` (pgTAP), `packages/domain/schemas/*.ts` (zod), `src/types/database.generated.ts`.
- **Schema changes:** all of the above. New tables only; the old tables stay until DEL-12.
- **AI changes:** none (the schemas are consumed by E05).
- **UI changes:** none.
- **Privacy implications:**
  - RLS on every table; parent-ownership checks on children.
  - The `sensitivity` column enables policy.
  - No phone or email plaintext in `person_identities` (hashed).
- **Dependencies:** E00 baseline migration.
- **Testing:** pgTAP for constraints, triggers and RLS (two users, anon, service role); zod ↔ SQL `CHECK` parity test.
- **Acceptance criteria:**
  - `supabase db reset` is clean.
  - pgTAP passes.
  - Generated types compile.
  - Advisors are clean.
  - Every kind's `detail` validates in both SQL and zod.
- **Feature flag:** `memory_v2`.
- **Rollback:** tables are new; a down migration drops them (no user data before alpha).
- **Complexity:** L.

## E04 — Local store, repositories, sync

- **Objective:** one data path. The UI never merges local and remote data (§11).
- **User outcome:** instant, offline-capable, and never shows someone else's data.
- **Architecture:**
  - `expo-sqlite` with SQLCipher, in a per-user file.
  - Repositories and an outbox.
  - A `SyncEngine` that pulls by `updated_at` cursors and uses Realtime pings.
  - Sign-out wipe.
- **Files likely affected:** `src/data/local/{db.ts,migrations/*.ts}`, `src/data/repositories/*.ts`, `src/data/sync/SyncEngine.ts`, `src/providers/DataProvider.tsx`, `src/providers/AuthProvider.tsx`, `app.json` (expo-sqlite plugin), `eslint.config.js` (ban `supabase` imports in `app/`).
- **Schema changes:** a local mirror of the E03 tables (subset of columns).
- **AI changes:** none.
- **UI changes:** offline and error states in the kit.
- **Privacy implications:** encrypted device store; deterministic wipe; no cross-user files.
- **Dependencies:** E03.
- **Testing:** repository, sync and account-switch suites (§26).
- **Acceptance criteria:**
  - Create offline, then go online: the row appears server-side exactly once.
  - Sign out A, sign in B: zero rows of A, and A's DB file is gone.
  - Tombstones propagate.
  - A 30-day-stale client performs a full resync.
- **Feature flag:** `memory_v2`.
- **Rollback:** the v2 shell is behind `shell_v2`; delete the DB file on rollback.
- **Complexity:** L.

## E05 — AI gateway

- **Objective:** one authenticated, consent-aware, quota-limited, grounded path to models (§9).
- **User outcome:** understanding that is accurate, private and cannot be abused.
- **Architecture:**
  - `ai-gateway` (synchronous capabilities) and `ai-worker` (pgmq + Batch).
  - A capability registry.
  - Validators for spans, entities, evidence and tone.
  - Usage logs without content.
- **Files likely affected:** `supabase/functions/ai-gateway/`, `supabase/functions/ai-worker/`, `supabase/functions/_shared/{auth,quota,registry,grounding,tone,prompts/*}.ts`, `packages/domain/schemas/extraction.ts`, `src/platform/aiGateway.ts`.
- **Schema changes:** `ai_usage` (from E00), `ai_calls` (capability, model, tokens, latency, outcome; no content), `pgmq` queue `extract`, `pg_cron` worker schedule.
- **AI changes:**
  - Capabilities: `relationship_extract`, `person_resolve`, `memory_merge`, `reason_generate` (V1); `interaction_brief`, `reconnect_assist`, `reflection_generate`, `retrieval_answer` (Next).
  - Opus 5.5 at explicit effort.
  - Refusal fallback where supported.
- **UI changes:** none.
- **Privacy implications:** only the §D2 slice is sent; inputs are loaded server-side by id; the consent gate is enforced.
- **Dependencies:** E00 (hardening), E03.
- **Testing:**
  - Deno: auth, consent, quota, validation, grounding.
  - A contract test that every capability's output schema round-trips.
- **Acceptance criteria:**
  - Anon or anonymous callers get 401.
  - No consent gets 403.
  - Items without spans are dropped.
  - The reason grounding validator rejects out-of-evidence entities.
  - p95 latency is inside target on staging.
- **Feature flag:** `ai_extraction`, per capability.
- **Rollback:** flag off, which leaves raw captures plus deterministic dates.
- **Complexity:** L.

## E06 — AI evaluation harness

- **Objective:** measure extraction and reason quality before relying on them (§10).
- **User outcome:** fewer wrong details.
- **Architecture:** JSONL fixtures, a Deno runner that calls capability code with a model override, deterministic graders plus a tone judge, and an HTML/markdown report.
- **Files likely affected:** `evals/{extraction,dates,sensitive,adversarial,merge,reasons}/*.jsonl`, `scripts/evals/run.ts`, `scripts/evals/graders/*.ts`, `.github/workflows/evals.yml`.
- **Schema changes:** none.
- **AI changes:** establishes the thresholds that gate every prompt or model change.
- **UI changes:** none.
- **Privacy implications:** fixtures are synthetic. Real captures are used only with explicit per-capture consent.
- **Dependencies:** fixtures none; the runner needs the E05 registry.
- **Testing:** grader unit tests; a known-bad model output fails.
- **Acceptance criteria:**
  - ≥ 300 v1 fixtures.
  - Every §10 metric is computed.
  - The labelled CI job posts a report to the PR.
  - A nightly job runs on `main`.
- **Feature flag:** n/a.
- **Rollback:** n/a.
- **Complexity:** M.

## E07 — Quiet Herbarium design system

- **Objective:** one token source and a typographic component set with no Card (§18).
- **User outcome:** calm, legible, recognizably Kinship; accessible at every text size.
- **Architecture:**
  - `src/design/tokens.ts` with `useTokens()`.
  - Fonts Newsreader and Instrument Sans via `expo-font`.
  - Components: Moment, Row, Token, Provenance, TellField, Sheet, Pill, QuietLine, Label, Screen.
  - A `_lab` screen.
- **Files likely affected:** `src/design/tokens.ts`, `src/ui/*.tsx`, `app/(v2)/_lab.tsx`, `app/_layout.tsx` (fonts), `package.json` (`@expo-google-fonts/newsreader`, `@expo-google-fonts/instrument-sans`), `eslint.config.js` (no hex in v2).
- **Schema changes:** none.
- **AI changes:** none.
- **UI changes:** the new kit.
- **Privacy implications:** none.
- **Dependencies:** none.
- **Testing:**
  - Contrast test computed from tokens (≥ 4.5:1 for text pairs).
  - Role and label tests.
  - Dynamic Type screenshots.
  - Reduce Motion tests.
- **Acceptance criteria:**
  - The lab passes on SE, 15 and 16 Pro Max at XS → AX3, light and night.
  - No hex literal outside tokens.
  - Pills never truncate.
- **Feature flag:** `shell_v2` (the kit is used only inside v2).
- **Rollback:** n/a (additive).
- **Complexity:** M.

## E08 — Sprig

- **Objective:** a deterministic botanical identity for each person that can never read as a score (§19).
- **User outcome:** each person has a mark that is theirs; nobody looks "less".
- **Architecture:**
  - A pure generator `sprig(seed, marks, opts)`.
  - Six form families.
  - `react-native-svg` rendering.
  - LRU memoization.
  - Draw animation with Reduce Motion handling.
- **Files likely affected:** `src/ui/sprig/{generator.ts,families.ts,prng.ts,Sprig.tsx}`, `tests/sprig/*`, `scripts/sprig-golden.ts`.
- **Schema changes:** `people.sprig_seed` (E03).
- **AI changes:** none. AI may be used offline to *explore* shapes; outputs become parameters, never images.
- **UI changes:** a Sprig on People rows, the relationship page and Today.
- **Privacy implications:** none.
- **Dependencies:** E07 colours.
- **Testing:** path snapshots, resvg golden diff, the area-variance property test (< 3%), Hermes/Node determinism.
- **Acceptance criteria:**
  - 500 seeds render distinct and coherent sprigs (design review of a 100-seed sheet).
  - Under 0.5 ms per sprig on an iPhone SE.
  - The property test passes.
  - Marks are implemented but off.
- **Feature flag:** `sprig_marks` (off).
- **Rollback:** render Algorithm B only.
- **Complexity:** M.

## E09 — Tell and the capture pipeline

- **Objective:** one input for everything (§7).
- **User outcome:** tell Kinship a sentence; it's kept instantly, even offline.
- **Architecture:**
  - Tell screen and TellField.
  - `CaptureRepo` and the outbox.
  - A gateway call once synced; a pgmq fallback.
  - Realtime result delivery.
- **Files likely affected:** `app/(v2)/tell.tsx`, `src/features/tell/*`, `src/data/repositories/CaptureRepo.ts`, `supabase/functions/ai-gateway/capabilities/relationship_extract.ts`, a `captures` insert trigger → pgmq.
- **Schema changes:** none beyond E03.
- **AI changes:** `relationship_extract` in production.
- **UI changes:** the Tell screen (typed), "Kept" feedback, offline "I'll understand this when you're online".
- **Privacy implications:** raw text is stored per the user's retention setting; the lock line on screen explains it.
- **Dependencies:** E04, E05, E07.
- **Testing:** outbox and offline tests; E2E capture → items; latency telemetry.
- **Acceptance criteria:**
  - "Kept" appears in under 100 ms.
  - Online extraction p95 is under 7 s.
  - Offline captures extract within 1 minute of reconnecting.
  - No capture is ever lost (fuzz test with network toggling).
- **Feature flag:** `tell`, `ai_extraction`.
- **Rollback:** flags off; captures remain as raw notes.
- **Complexity:** M.

## E10 — Extraction confirmation and correction

- **Objective:** "Here's what I'll remember", with the confidence tiers (§8).
- **User outcome:** fix only what's wrong, in one tap, and undo anything.
- **Architecture:**
  - An extraction sheet.
  - Token pickers (person, date, relation, kind).
  - Clarification question.
  - Undo.
  - Tier logic shared in `packages/domain/tiers.ts`.
- **Files likely affected:** `src/features/tell/ExtractionSheet.tsx`, `src/ui/Token.tsx`, `src/features/pickers/*`, `src/data/repositories/MemoryRepo.ts`, `packages/domain/tiers.ts`.
- **Schema changes:** uses `memory_item_history`, `extraction_feedback`.
- **AI changes:** the clarification question is produced by extraction; answers are re-applied deterministically.
- **UI changes:** the sheet, pickers and Undo toast.
- **Privacy implications:** sensitive items always confirm.
- **Dependencies:** E09.
- **Testing:**
  - Tier table tests.
  - Correction writes a `user_edit` source.
  - Undo removes the capture and all its items.
  - Accessibility: tokens are operable with VoiceOver.
- **Acceptance criteria:**
  - All §8 tiers behave as specified.
  - At most 1 question.
  - Undo within 8 s restores prior state.
  - `extraction_corrected` events fire.
- **Feature flag:** `tell`.
- **Rollback:** force the light-confirmation tier for all captures.
- **Complexity:** M.

## E11 — Relationship page, provenance, What Kinship knows

- **Objective:** a page that answers "who are they to me, right now?", with every line sourced (§6).
- **User outcome:** trust through visible sources; correct anything at item level.
- **Architecture:**
  - `app/(v2)/person/[id].tsx` with sections Lately, Coming up, You said you'd, Between you.
  - Story (history) sub-page.
  - SourceView.
  - Knows page (edit, delete, forget person, merge).
- **Files likely affected:** `app/(v2)/person/[id].tsx`, `app/(v2)/person/[id]/{knows,story}.tsx`, `app/(v2)/source/[captureId].tsx`, `src/features/person/*`, `src/ui/Provenance.tsx`, `packages/domain/format/statement.ts`.
- **Schema changes:** none.
- **AI changes:** none. Statements come from items; there is no generated summary in V1.
- **UI changes:** new screens.
- **Privacy implications:** deletion semantics exactly as §5; "forget this person" redacts spans.
- **Dependencies:** E04, E07, E08.
- **Testing:** provenance tests; deletion semantics; accessibility; Dynamic Type.
- **Acceptance criteria:**
  - Every rendered item has a tappable source.
  - Delete-capture and delete-person behave per §5.
  - No counts are shown anywhere.
- **Feature flag:** `relationship_page_v2`.
- **Rollback:** kill switch to a read-only item list.
- **Complexity:** L.

## E12 — Candidate and reasons engine

- **Objective:** grounded, well-timed reasons from structured memory (§13–14).
- **User outcome:** Kinship speaks rarely and specifically.
- **Architecture:**
  - Deterministic candidate rules and ranking in `packages/domain/reasons/`, run server-side on item change and nightly.
  - `reason_generate` by Batch, with template fallback.
  - A policy gate.
- **Files likely affected:** `packages/domain/reasons/{rules,windows,rank,policy,templates,anniversary}.ts`, `supabase/functions/planner/`, `supabase/functions/ai-worker/capabilities/reason_generate.ts`.
- **Schema changes:** uses `reasons` and `reason_events`; indexes on `(user_id, state, window_start)`.
- **AI changes:** `reason_generate` plus the grounding validator.
- **UI changes:** none (consumed by E13 and E15).
- **Privacy implications:** sensitive evidence is excluded from prompts unless allowed (D2); lock-screen titles are generated separately.
- **Dependencies:** E03, E05.
- **Testing:** table-driven window and ranking tests with fixed clocks, DST and timezones; "no gap-only reason" property; grounding.
- **Acceptance criteria:**
  - Each V1 type produces the expected windows.
  - "Nothing needs you today" below threshold.
  - Person cap enforced.
  - The template fallback covers every type.
- **Feature flag:** `reasons_engine`.
- **Rollback:** templates only.
- **Complexity:** L.

## E13 — Today and navigation v2

- **Objective:** one moment, two quiet lines, Tell; a two-item bar (§13).
- **User outcome:** open, see the one thing, act, leave.
- **Architecture:** the `app/(v2)/(main)/_layout.tsx` tab bar (Today, People) with TellField; the Today screen reads `ReasonRepo`; the People screen is search-first and alphabetical.
- **Files likely affected:** `app/(v2)/(main)/{_layout,today,people}.tsx`, `src/features/today/*`, `src/features/people/*`, `src/data/repositories/ReasonRepo.ts`.
- **Schema changes:** none.
- **AI changes:** none.
- **UI changes:** Today, People, the empty state, night palette.
- **Privacy implications:** none.
- **Dependencies:** E12, E07.
- **Testing:** view-model tests (one primary, ≤ 2 secondary from different people); E2E.
- **Acceptance criteria:**
  - Matches board 1 of the canvas, with the button-wrap fix.
  - People has no relevance sort.
  - A reason dismissed via "Not now" returns only per its snooze rules.
- **Feature flag:** `today`, `shell_v2`.
- **Rollback:** `shell_v2` off.
- **Complexity:** M.

## E14 — Hand-off and return check

- **Objective:** end every moment in the real conversation, and measure honestly (§15).
- **User outcome:** one tap to Messages, Phone, FaceTime, WhatsApp or email; one tap to say it happened.
- **Architecture:** `src/platform/handoff.ts` (channels from the device contact, `canOpenURL`); a follow-up sheet; the return-check line on foreground.
- **Files likely affected:** `src/platform/handoff.ts`, `src/features/followup/*`, `app.json` (`LSApplicationQueriesSchemes`: `whatsapp`), `src/data/repositories/InteractionRepo.ts`.
- **Schema changes:** uses `interactions` (source `return_check`).
- **AI changes:** none in V1 (ideas are evidence bullets).
- **UI changes:** the follow-up sheet and return-check line.
- **Privacy implications:** phone numbers are read on the device at tap time and not uploaded.
- **Dependencies:** E13.
- **Testing:** URL construction per channel; no interaction logged without a Yes; E2E.
- **Acceptance criteria:**
  - All 5 channels open where installed.
  - The return check appears only between 10 minutes and 12 hours after a hand-off.
  - Opening a channel never writes an interaction.
- **Feature flag:** `today`.
- **Rollback:** hide the return check.
- **Complexity:** S.

## E15 — Server notifications and weekly brief

- **Objective:** Kinship works while closed, within a strict budget (§22).
- **User outcome:** the right nudge on the right morning, never on the lock screen in detail unless chosen.
- **Architecture:** Expo push token registration; `devices`; `planner`, `sender` and `receipts` functions on `pg_cron`; `notification_outbox` and `notification_log`; the policy module.
- **Files likely affected:** `src/platform/push.ts`, `supabase/functions/{planner,sender,receipts}/`, `packages/domain/notify/{policy,budget,quiet,lockscreen}.ts`, migrations enabling `pg_cron`, `pgmq`, `pg_net`.
- **Schema changes:** `devices`, `notification_outbox`, `notification_log`; `user_settings` gains brief time, quiet hours, lockscreen level and pause.
- **AI changes:** none (copy from E12).
- **UI changes:** the notification permission ask after the first real moment; Settings › Notifications.
- **Privacy implications:** lock-screen minimization defaults to `private`; sensitive is always `private`.
- **Dependencies:** E12, E03.
- **Testing:** budget, quiet hours, dedupe, cancellation, back-off, pause, timezone and DST (§26).
- **Acceptance criteria:**
  - Never more than 3 pushes in any rolling 7 days per user.
  - Quiet hours are honoured.
  - A resolved reason's push is cancelled.
  - Pause takes effect immediately.
  - The weekly brief arrives on the chosen day and time.
- **Feature flag:** `push_delivery`, `weekly_brief`.
- **Rollback:** kill switch (sender stops).
- **Complexity:** L.

## E16 — Onboarding v2

- **Objective:** real value in under 3 minutes (§4, T2, T7, T8).
- **User outcome:** pick your people, see something already worth knowing, tell one thing.
- **Architecture:**
  - Two promise screens.
  - Sign in with Apple.
  - AI consent screen.
  - Contacts multi-select with suggestions (favourites, family labels, birthdays).
  - "Already worth knowing" from birthdays.
  - The first Tell.
  - Notification ask when a moment exists.
- **Files likely affected:** `app/(v2)/onboarding/*`, `src/platform/contacts.ts` (ported normalization), `src/features/onboarding/*`, `src/components/ContactPicker.tsx` → `src/features/onboarding/PeoplePicker.tsx`.
- **Schema changes:** `people.contact_ref`, `consents`.
- **AI changes:** the first Tell uses `relationship_extract`.
- **UI changes:** boards 1–2 of the canvas, with the T7 and T8 copy fixes.
- **Privacy implications:** only picked people are saved; the contact list never leaves the device.
- **Dependencies:** E04, E07, E08, E05 (consent).
- **Testing:** E2E onboarding; the picker handles 2,000 contacts smoothly; consent persisted server-side.
- **Acceptance criteria:**
  - Median onboarding under 3 minutes in alpha.
  - ≥ 8 people picked median.
  - Birthdays imported.
  - No calendar prompt.
- **Feature flag:** `shell_v2`.
- **Rollback:** n/a (v2 only).
- **Complexity:** M.

## E17 — Settings, export, account deletion (v2)

- **Objective:** visible trust (§12, board 3 "What Kinship knows").
- **User outcome:** see sources, switch them, export everything, delete everything.
- **Architecture:** v2 settings screens; an `export` function (JSON of every table, a signed URL, 24 h expiry); `delete-account` (from E00).
- **Files likely affected:** `app/(v2)/settings/*`, `supabase/functions/export/`, `supabase/functions/delete-account/`.
- **Schema changes:** none.
- **AI changes:** the AI consent toggle is wired to the server.
- **UI changes:** settings screens.
- **Privacy implications:** core trust surface.
- **Dependencies:** E00, E04.
- **Testing:** export completeness (every table); deletion E2E; consent revocation stops the gateway within 1 minute.
- **Acceptance criteria:**
  - The export includes captures, items, sources, reasons, interactions and settings.
  - Deletion completes in under 60 s and is verified.
  - Each source has a one-sentence explanation.
- **Feature flag:** `shell_v2`.
- **Rollback:** n/a.
- **Complexity:** M.

## E18 — Voice capture

- **Objective:** a 15-second spoken Tell with on-device transcription (§21, D5).
- **User outcome:** say it after dinner; see the words underline as Kinship understands.
- **Architecture:**
  - `expo-speech-recognition` with `requiresOnDeviceRecognition: true`, interim results and a runtime support check.
  - Full-screen listening in night palette.
  - Transcript → Tell pipeline.
- **Files likely affected:** `src/platform/speech.ts`, `app/(v2)/tell.tsx` (listening mode), `app.json` (plugin, `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`), `package.json`.
- **Schema changes:** `captures.transcript_meta`.
- **AI changes:** none (same extraction).
- **UI changes:** the listening screen (board 1, 4th phone).
- **Privacy implications:** audio is never stored; the "on this phone" copy appears only when on-device recognition is active; the mic is hidden when it's unsupported.
- **Dependencies:** E09; a new dev build.
- **Testing:** device matrix (SE on iOS 17, 15 on iOS 18, 16 Pro on iOS 26) × en-US/en-GB; interruption (a call arrives); permission denial.
- **Acceptance criteria:**
  - Recording starts in under 300 ms.
  - Works in airplane mode on supported devices.
  - No network request carries audio (proxy check).
- **Feature flag:** `voice_capture`.
- **Rollback:** flag off.
- **Complexity:** M.

## E19 — Legacy deletion

- **Objective:** Kinship 2.0 contains less code and fewer concepts (see `KINSHIP_2_DELETION_PLAN.md`).
- **User outcome:** a smaller, faster, more coherent app.
- **Architecture:**
  - Phase 0 deletions.
  - An import-ban lint rule for v2.
  - DEL-10: 1.0 shell removal by area.
  - DEL-12: old tables and the old function.
- **Files likely affected:** all of the deletion plan.
- **Schema changes:** drop old tables (DEL-12).
- **AI changes:** remove `ai-insight`.
- **UI changes:** none visible (v2 already live).
- **Privacy implications:** old tables with notes JSON go.
- **Dependencies:** E13, E16, E17 live at 100%.
- **Testing:** `tsc`, lint, full test suite and E2E after each deletion PR; a bundle-size report.
- **Acceptance criteria:**
  - No file in the deletion plan remains.
  - Dependencies removed.
  - App code under 12k lines.
  - Cold start is faster than 1.0 (measured).
- **Feature flag:** removal of `shell_v2`.
- **Rollback:** git revert of the deletion PRs within the 2-week window; a DB snapshot before DEL-12.
- **Complexity:** M.

## E20 — Beta program operations

- **Objective:** learn whether the thesis holds (§30).
- **User outcome:** testers are heard; their data is safe.
- **Architecture:**
  - Recruiting screener.
  - TestFlight groups per ring.
  - An interview calendar.
  - In-app feedback (useful? / report wrong / shake-to-report with redaction).
  - A metrics dashboard.
  - A wrong-subject triage runbook.
- **Files likely affected:** `src/features/feedback/*`, `docs/beta/{screener,interview-guide,triage-runbook,privacy-explainer}.md`, dashboard config.
- **Schema changes:** `extraction_feedback`, `reason_events.feedback`.
- **AI changes:** feedback loops into eval fixtures, with consent.
- **UI changes:** feedback affordances; "What we measure".
- **Privacy implications:** captures are viewed only with per-case user permission; there is a privacy comprehension test.
- **Dependencies:** E01, E15.
- **Testing:** dry run with the alpha.
- **Acceptance criteria:**
  - 40 activated users.
  - Interview completion ≥ 80% for the 15 interviewees.
  - The gate report is produced at week 8.
- **Feature flag:** n/a.
- **Rollback:** n/a.
- **Complexity:** M.

## E21 — Calendar briefs and post-encounter prompt (first Phase 6 epic)

- **Objective:** the encounter loop: a brief before and one question after (§16).
- **User outcome:** arrive present; remember afterwards in 15 seconds.
- **Architecture:**
  - A device-side calendar scan (selected calendars, 36 h ahead).
  - Identity-based attendee matching.
  - The server `interaction_brief`.
  - A Tier 1 push 60–90 minutes before.
  - An in-app "How was dinner?" after.
- **Files likely affected:** `src/platform/calendar.ts`, `supabase/functions/ai-gateway/capabilities/interaction_brief.ts`, `app/(v2)/brief/[id].tsx`, `packages/domain/reasons/rules.ts` (planned encounter).
- **Schema changes:** `encounters(person_id, starts_at, title_hash, source)`.
- **AI changes:** `interaction_brief`.
- **UI changes:** the Brief sheet (canvas board 2, 1st phone).
- **Privacy implications:** only the matched event's person and time reach the server; the permission is asked when the user enables briefs.
- **Dependencies:** passing the beta gate; E15.
- **Testing:** matching (never first-name-only); lock-screen copy; brief grounding.
- **Acceptance criteria:**
  - Briefs are useful (≥ 70% yes).
  - 0 wrong-person briefs in alpha.
  - Post-encounter captures ≥ 1 per user per week among users who enable it.
- **Feature flag:** `calendar_briefs`.
- **Rollback:** flag off; the permission stays granted but unused.
- **Complexity:** L.

---

## Phase 6 epics, outlined (detailed after the beta gate)

| Epic | Objective | Key constraint | Flag |
|---|---|---|---|
| E22 Reconnect | A real reason plus a quiet stretch → Today/brief card; openers on tap | Never gap-only; never a push; rhythm needs ≥ 3 confirmed contacts | `reconnect` |
| E23 Garden view + sprig marks | "Everyone", alphabetical or by circle; turn on Algorithm C marks | No season-presence view; the area-variance test stays in CI | `garden_view`, `sprig_marks` |
| E24 Native capture (Siri App Intent + Action Button, then Share Extension) | Capture from anywhere | App Group handoff; the share extension doesn't store images by default | `native_siri`, `native_share` |
| E25 Ask Kinship | Cited answers from the user's own memory | Not a chat; `not_found` is preferred to guessing | `ask_kinship` |
| E26 Monthly letter | Five true sentences, skipped in thin months | No numbers; presence only | `monthly_letter` |
