# Kinship 2.0 — Operationalization & Build Architecture

As of 30 September 2026 · Prepared for Thor · Planning only: no production code changes

**The plan in one paragraph.** Build Kinship 2.0 as a new app shell on a new, provenance-first memory model, and don't reskin 1.0. Production holds only test data (2 people, 1 auth user), so there is no data to migrate and no dual-write to build. Phase 0 fixes the server-side trust defects for good and makes cheap client fixes in 1.0 while the team keeps using it. By week 6, one vertical slice ("Ben runs Chicago Sunday") proves capture, extraction, provenance, candidate generation, Today and hand-off together. The core loop ships to a 30–50 person text-first beta around week 10. Voice follows inside the beta, behind a flag. The Garden view, calendar briefs, reconnect, Ask and native surfaces wait for evidence. Sprigs ship in V1 as identity only: no leaf counts.

Companion documents:

| Document | What it holds |
|---|---|
| `KINSHIP_2_EPICS.md` | 22 epics with acceptance criteria, flags and rollback |
| `KINSHIP_2_TICKETS.md` | Ordered, independently reviewable tickets with dependencies |
| `KINSHIP_2_DECISIONS.md` | 13 founder decisions, all decided by Thor on 1 October 2026 (they supersede any conflicting recommendation here) |
| `KINSHIP_2_DELETION_PLAN.md` | Every 1.0 route, engine, component and dependency, with when it goes |
| `KINSHIP_GO_LIVE_NOTES.md` | Things to review before going live |

Sources: the product audit (Claude Doc, 30 Sep 2026), the 2.0 Design Exploration canvas (9 boards, rendered and checked on 30 Sep), the 2.0 Design Direction (Claude Doc), and the repository at `5687ed7` plus all remote branches. Also used: the live Supabase project `kddpxiiyxgvjrtpdkvio`, inspected read-only (schema, advisors, migrations, no user data), and local runs of `tsc`, `eslint`, `expo install --check`, `expo-doctor` and `npm audit`.

---

## Contents

1. [North Star and the loop](#1-north-star-and-the-loop)
2. [Product / Design / Technical Tensions](#2-product--design--technical-tensions)
3. [Repository re-audit](#3-repository-re-audit)
4. [The minimum Kinship 2.0](#4-the-minimum-kinship-20)
5. [Relationship-memory domain model](#5-relationship-memory-domain-model)
6. [Provenance architecture](#6-provenance-architecture)
7. [Universal capture pipeline](#7-universal-capture-pipeline)
8. [The extraction interaction](#8-the-extraction-interaction)
9. [AI architecture](#9-ai-architecture)
10. [AI evaluations](#10-ai-evaluations)
11. [Local data and sync](#11-local-data-and-sync)
12. [Phase Zero: trust](#12-phase-zero-trust)
13. [Today](#13-today)
14. [Reasons to connect](#14-reasons-to-connect)
15. [Human handoff](#15-human-handoff)
16. [Pre-interaction briefs](#16-pre-interaction-briefs)
17. [Reconnect](#17-reconnect)
18. [The Quiet Herbarium in code](#18-the-quiet-herbarium-in-code)
19. [The sprig](#19-the-sprig)
20. [Design-system rollout and route classification](#20-design-system-rollout-and-route-classification)
21. [Native capture surfaces](#21-native-capture-surfaces)
22. [Notifications and background intelligence](#22-notifications-and-background-intelligence)
23. [Analytics without surveillance](#23-analytics-without-surveillance)
24. [Metrics](#24-metrics)
25. [Feature flags and rollout](#25-feature-flags-and-rollout)
26. [Testing strategy](#26-testing-strategy)
27. [Target architecture](#27-target-architecture)
28. [Build sequence](#28-build-sequence)
29. [The vertical slice](#29-the-vertical-slice)
30. [Beta strategy](#30-beta-strategy)
31. [Cost model](#31-cost-model)
32. [Parallel workstreams](#32-parallel-workstreams)
33. [Final test](#33-final-test)
34. [Post-validation visualization: Garden, Landscape or Hybrid](#34-post-validation-visualization-garden-landscape-or-hybrid)

Epics, tickets, founder decisions and the deletion plan live in their own files (listed above).

---

## 1. North Star and the loop

Kinship 2.0 is a private memory for your relationships. It remembers what matters in the lives of the people you love and brings it back when it matters, so you can show up.

```
 Tell ──▶ Understand ──▶ Memory ──▶ Moment ──▶ Reason ──▶ Real conversation
  ▲                                                          │
  └──────────── "Anything worth remembering?" ◀──────────────┘
```

Kinship does not aim for engagement with Kinship. It aims for meaningful human interactions that Kinship caused or materially improved. Section 24 defines that as a countable event.

Every recommendation below is checked against three rules:

1. **Silence beats a wrong detail.** A wrong personal fact costs more than a missed reminder.
2. **Every durable statement has a source.** Nothing the model infers becomes memory without a capture behind it.
3. **Nothing quantifies a relationship.** That covers visuals, sort orders, notifications and metrics.

---

## 2. Product / Design / Technical Tensions

These are the places where the audit, the design direction and the repository pull in different directions, each with a resolution. The design direction is treated as a hypothesis, the audit as the problem definition, and the repository as the facts.

| # | Tension | Audit says | Design says | Repo / platform says | Resolution |
|---|---|---|---|---|---|
| T1 | **Sprig richness vs hidden scoring** | Retire points, stages and fading; the garden is "texture, not mechanics" | "A leaf for each shared moment (capped ~12), a bud for something coming up, a flower for a milestone" | Growth engine already turns logs into plant size | A capped leaf count is still a visible count. Two sprigs side by side reveal who you log more about. **Adopt identity-first morphology (§19, Algorithm C).** The form comes entirely from the person's seed. History changes a few details without making the sprig bigger or fuller. Buds appear only in context, never in a grid. Flowers only for milestones the user confirms. |
| T2 | **Try-before-account vs backend identity** | "Start on-device, sign in later" | "Account created only when sync is chosen" | The AI gateway must authenticate users; the hardening branch explicitly rejects anonymous users; all memory is server-extracted | Anonymous local state means migrating it to an account later, plus key handling, a switch-over in analytics identity, and an AI endpoint anonymous users can reach. That is weeks of work for a funnel step we haven't measured. **V1 requires Sign in with Apple (one tap) before the first Tell**, after a promise screen and a privacy-context screen. Revisit with Supabase anonymous sign-in plus `linkIdentity` (same `user_id`, no data migration) only if the beta shows more than ~25% abandonment at authentication. **Approved as D1**; no anonymous-user infrastructure in V1. |
| T3 | **On-device speech** | "On-device speech-to-text; never upload audio" | "Transcribed on this phone. The audio is never saved." Starts in <300 ms, works offline | Expo SDK 54 needs a dev build for any speech module (already configured in `eas.json`) | Details in §21. `expo-speech-recognition` wraps `SFSpeechRecognizer`. It can *require* on-device recognition (`requiresOnDeviceRecognition`) on supported locales, but device and locale support must be checked at runtime (`supportsOnDeviceRecognition`). iOS 26's `SpeechAnalyzer`/`SpeechTranscriber` is on-device only by design, but needs a custom native module and a one-time model download per locale. **V1 copy may only say "on this phone" when `requiresOnDeviceRecognition` is on.** When on-device isn't available, typing is offered instead; there is no silent server fallback. |
| T4 | **"Sorted by recent relevance"** | No ranking | People "sorted by recent relevance, never by neglect" | 1.0 sorts the Garden by growth points | Any relevance order means someone is at the bottom. **Default People is search-first, then alphabetical**, with optional user-named circles later. Relevance belongs to Today only, where it's about a moment, not a person. |
| T5 | **Garden in V1** | "Optional visualisation"; no sizes | Garden toggle shows "the season's pressings: people you shared moments with this season" | 0 lines of sprig code exist | "This season's people" shows who is missing. **No Garden view before loop validation.** After validation the visualization question is reopened (Garden vs Relationship Landscape vs Hybrid; §34) rather than shipping a pre-decided Garden. Season pressings move to the monthly letter, where only presence is shown. The sprig itself (identity) ships in V1 on People rows and the relationship page. |
| T6 | **Night-mode prompt** | Ask after contact, when input is at hand | "After 8 pm Today leads with 'Anything worth remembering?'" | — | A nightly question is a daily nag. **Ask only after a signal:** a hand-off that day, a planned encounter, or a capture that mentions "tonight". |
| T7 | **Onboarding "a meeting it found"** | Calendar permission only in context | Onboarding step 2 shows "You're seeing David on Thursday" | Calendar is out of V1 (§16) | V1 onboarding uses contact birthdays only ("Maya's birthday is Saturday"). Calendar is offered later, when briefs launch. |
| T8 | **"Contacts are read on this phone. Nothing leaves it until you choose."** | Never upload address books | Board 1 lock line | Picked people sync to Supabase | Accurate copy: "Kinship reads contacts on this phone. Only the people you pick are saved." |
| T9 | **"Nothing is kept or used for training"** (Privacy board) | Seek zero-data-retention terms | States it as fact | Not true without a ZDR agreement; model availability under ZDR varies | The copy ships only once a ZDR agreement covers the chosen model. Until then: "Sent to Anthropic to understand it; not used to train models." Approved as D2. |
| T10 | **Per-user envelope encryption** | Encrypt free-text fields with per-user keys now | — | Extraction, reasons and Ask all need plaintext server-side, so app-level encryption protects only against database-level exposure, at real complexity | **Defer.** V1 uses Postgres at-rest encryption, RLS, no content in logs or analytics, short retention of raw audio (none) and transcripts (user-controlled), and a SQLCipher-encrypted local store. Keys are designed so end-to-end encryption can come later. Approved as D11. |
| T11 | **Extraction confirmation always vs auto-dismiss** | Confirmation chips, fix only mistakes | "Auto-dismiss if untouched" | — | **Three confidence tiers (§8):** auto-save with a glanceable summary and Undo; light confirmation; one clarifying question. Sensitive classes (health, death, conflict) always confirm. |
| T12 | **Hand-off counts as a moment** | North star "confirmed by one-tap done *or a hand-off*" | Return check "Did you reach Ben?" | — | **A hand-off alone never counts** and never logs an interaction. It needs a return-check yes, a "done", or a follow-up capture about that person within 72 h (§24). |
| T13 | **History "a leaf mark per moment"** | No counts | Board 2, "Your story together" | — | A per-moment mark on a timeline is fine (it's a story, not a total). There is no summary count ("12 years" stays; "37 moments" never appears). |
| T14 | **Seasons** | Keep as optional focus people | Adapt to "focus people" | 0 live rows; 1,506 lines of UI | **Delete Seasons in 2.0.** Focus people is a Later idea, to revisit if beta users ask for intention-setting. |
| T15 | **Promise table vs unified memory** | Retain `promises` | "You said you'd" | `promises` is the best-shaped table | Promises become `kind = 'promise'` memory items (§5). The status vocabulary (`open`/`kept`/`released`) and the guilt-free copy carry over unchanged. |
| T16 | **Relationship rhythm** | Learn usual gap; describe in words on the person page | Not shown | Needs reliable interaction data, and 2.0 stops manual logging | With no manual logging, a gap measured from confirmed contacts only would be wrong for people you text daily. **Rhythm is inference-only in V1:** never displayed, used only as a reconnect tie-breaker, and only when ≥3 confirmed contacts exist. |
| T17 | **Model default** | Move to Opus 5.5 at low effort | — | Code and the hardening branch default to `claude-opus-4-8` | The gateway holds the model per capability in config. Start on Opus 5.5 with effort set explicitly. Evaluate Sonnet 5.5 and Haiku 4.5 per capability and switch where evals show parity. Approved as D12 (with governance: Thor approves downgrades during beta). |

---

## 3. Repository re-audit

HEAD of `main` is still `5687ed7` (15 June 2026), the commit the audit read. **No defect named in the audit has been fixed on `main`.** One new branch partly addresses one of them.

### Checks run on 30 September 2026

| Check | Result | Change since audit |
|---|---|---|
| `npx tsc --noEmit` | 0 errors | Same |
| `npx eslint .` | 37 errors (36 `react/no-unescaped-entities`, 1 `import/no-unresolved` for `npm:@anthropic-ai/sdk` in the edge function), 141 warnings | Same. Errors are cosmetic, concentrated in screens 2.0 deletes. |
| Tests | None: no test files, no runner, no CI (`.github/` absent) | Same |
| `npx expo install --check` / `expo-doctor` | 12 packages behind SDK 54 patch versions (expo 54.0.33 → ~54.0.37, expo-router, expo-updates, expo-file-system…) | **New finding** |
| `npm audit --omit=dev` | 37 advisories (2 critical: `shell-quote`, `tar`; 11 high incl. `@xmldom/xmldom`) — all in Expo CLI / config tooling, fixable by the patch upgrades | **New finding.** Build-time exposure, not shipped runtime code, but it belongs in Phase 0. |
| Supabase migrations (live) | 6 applied (`add_missing_columns` … `seasons`); `001_initial_schema` was never recorded; `008_ai_usage` (branch) not applied | Same drift, plus a new unapplied migration |
| Supabase advisors | `rls_auto_enable()` SECURITY DEFINER executable by `anon` and `authenticated`; leaked-password protection off | Same |
| RLS policies | 18, all use per-row `auth.uid()`; none check that a child's `person_id` belongs to the caller | Same |
| Sync readiness | No `updated_at` or `deleted_at` column on any table | Same |
| Storage | 0 buckets | Same. Photos have never left the device. |
| Extensions | `pg_cron`, `pgmq`, `pg_net`, `vector` available, none installed; `supabase_vault` installed | Relevant to §22 |
| Edge function | `ai-insight` v1 deployed 15 June, `verify_jwt: true`, old code | Same |

### Findings classified

| Class | Item | Evidence |
|---|---|---|
| **Still true** | Demo people and `user_id: "u1"` local saves on any Supabase error | `src/hooks/usePersons.ts:93-101, 119-135`; same pattern in `useMemories.ts`, `useInteractions.ts` |
| Still true | Sign-out clears nothing; local JSON not user-scoped | `src/providers/AuthProvider.tsx:227-238`, `src/lib/localStore.ts:19` |
| Still true | Fake account screen; partial real deletion that misses seasons and the auth user | `app/settings/account.tsx` (2,420 lines), `app/settings/privacy.tsx:569` |
| Still true | AI opt-out is a device-local file, default on | `src/lib/aiPreferences.ts:17-25` |
| Still true | Memory text on the lock screen | `src/lib/notificationEngine.ts:115-118` |
| Still true | Season echoes written to the default calendar | `src/lib/seasonCalendar.ts:48-71` |
| Still true | Calendar permission can be requested from Home via suggestions | `src/lib/calendarEngine.ts:209-212`, called from `app/(tabs)/index.tsx` |
| Still true | "Added you to my Kinship garden" invite | `src/lib/appLinks.ts:22` |
| Still true | Android `WRITE_CONTACTS` | `app.json` permissions |
| Still true | Photos stored as picker cache URIs | `src/lib/photoPicker.ts:21,43` |
| Still true | Local-only notifications, scheduled on Home focus; no push token code anywhere | `src/lib/notificationService.ts` (7 `scheduleNotificationAsync` calls, 0 `getExpoPushTokenAsync`) |
| **Changed** | Open AI proxy (audit #5) is fixed **on an unmerged branch**: `claude/wonderful-planck-inpeu9` adds `auth.getUser()`, rejects anonymous users, validates per-mode input, adds a daily quota via `ai_usage` + `consume_ai_call()` (migration 008), returns generic errors and cuts `max_tokens` 16000 → 2048 | Branch commit of 30 Sep; not merged, migration not applied, function not redeployed. **It's the first ticket of Phase 0 (P0-01).** |
| **New problem** | Expo SDK patch drift and 37 tooling advisories | See checks above |
| New problem | Unused code and dependencies not listed in the audit: `src/components/MemoryCelebration.tsx` and `TendGardenSheet.tsx` (no importers), `src/hooks/useVitality.ts` (barrel export only), `src/lib/growthStage.ts` (no importers), `react-native-worklets-core` and `expo-media-library` (no imports in `app/` or `src/`) | `grep` over `app/` and `src/` |
| New problem | `.planning/` and `docs/` describe February and June states; an agent will plan against them | `.planning/STATE.md`, `docs/KINSHIP_IMPLEMENTATION_SPEC.md` |
| **No longer relevant** | Audit quick wins that polish surfaces 2.0 deletes: #7 season commitments into Home, #9 re-arm Garden Walk, #10 notification-preference persistence in 1.0, #12 remove gardener levels (whole screen deleted), #15 multi-select in `(tabs)/add.tsx` (moves to onboarding v2), #16 promise detection in memory/check-in forms (replaced by Tell), #21 loading-screen copy | Do not spend time on these. |
| No longer relevant | Branch `claude/fervent-lovelace-szugz6` (gift logging, "remember a detail") | Superseded by Tell. Close it. |
| No longer relevant | Branches `hormozi-value-research-s592G` (54 behind), `review-kinship-history-P53d6` (53 behind), `brave-cori-514h7d` (0 ahead) | Archive. |

**What this changes in the plan:** nothing is assumed fixed. Phase 0 starts by merging and deploying the AI-hardening branch, then patch-upgrading Expo. The design direction assumed "no screenshots captured"; the canvas has since been rendered and checked, and its layout defects fixed. It is a sound reference, but some product rules drawn on it are overridden by T1–T17.

---

## 4. The minimum Kinship 2.0

**The smallest product that proves the thesis:** a person tells Kinship something in a sentence. Days later, Kinship brings back that one specific thing at the right moment. The person opens the real conversation, and later says it happened.

Everything else serves that, or waits.

| Capability | Class | Why |
|---|---|---|
| People (from contacts, with birthdays) | **Required** | No memory without subjects; birthdays give day-one value without any capture |
| Tell (text) | **Required** | The single input |
| Structured memory with provenance | **Required** | The product; provenance is what makes it trustworthy |
| Extraction correction (tokens, ×, one question, Undo) | **Required** | Wrong memory is worse than none |
| Events with dates, promises, open threads, plans | **Required** | The raw material of reasons |
| Reasons to connect (event after/before, birthday, promise, thread follow-up, plan-season) | **Required** | The moment |
| Today | **Required** | Where the moment appears |
| Hand-off to Messages / Phone / FaceTime / WhatsApp + return check | **Required** | Where the loop ends, and how we measure it |
| Basic proactive delivery (server push, budgeted, lock-screen safe, weekly brief) | **Required** | A closed app must still show up at the right time; without it we test "do people open Kinship", not the thesis |
| Relationship page (Lately, Coming up, You said you'd, sources) | **Required** | Where memory is seen and corrected |
| What Kinship knows, export, real deletion, AI consent | **Required** | Trust floor |
| Sprig as identity mark | **Required (cheap)** | Brand recognition without the garden; about 3 days of work |
| Voice | **Important** | Largest friction reducer for the target user. Ships to the cohort in beta week 3 behind a flag, which also gives a clean text-vs-voice comparison |
| "A year ago today" | **Important (cheap)** | `spotlightEngine.ts` logic ports directly; a secondary Today line |
| Post-hand-off capture ("Anything worth remembering?") | **Important** | Same Tell screen; triggered by the return check |
| Full Garden view, or Relationship Landscape | Later (Phase 6), after a design checkpoint (§34) | Absence and ranking risks (T5); not needed to test the loop |
| Calendar briefs / post-encounter prompt | Next | Adds a permission and entity resolution; valuable but separable |
| Reconnect with openers | Next | Needs rhythm data and a reason corpus |
| Siri / Action Button / widget / share extension | Next–Later | Native targets; test burden |
| Ask Kinship | Next | Retrieval over the same store; low risk, low proof value |
| Monthly reflection | Next | Needs 4+ weeks of data anyway |
| Rich history, night polish, photos in moments | Later | Delight, not proof |

**Challenging the default classification:** proactive push is required, not optional. A beta without push measures app-opening habits, which is the engagement metric the product rejects. Calendar briefs are *not* required: they're the second loop, and the first loop must work without a calendar.

---

## 5. Relationship-memory domain model

### The design choice

**Use one `memory_items` table with a `kind` discriminator, plus typed JSON detail validated in two places.** The alternative is eleven tables (facts, events, promises, plans…). Every kind shares the hard parts: provenance, confidence, certainty, subject, lifecycle, correction, superseding, deletion, sync and RLS. Building those eleven times multiplies the bugs that break trust. The UI also renders every kind the same way, as a statement with a source. Kind-specific fields live in a small typed `detail` JSONB, validated by a Postgres `CHECK` per kind and by a shared zod schema on the client and the gateway.

Captures stay separate, because they are raw input rather than beliefs. Reasons stay separate, because they are derived and disposable.

```
people ─┬─< person_identities            (phone/email/handle for matching)
        ├─< related_people               ("Sarah's sister", "Leo (David's son)")
        └─< memory_items >─┬─< memory_item_sources >── captures >── capture_media
                           ├── supersedes → memory_items
                           └─< reasons ──< reason_events (shown/acted/dismissed/feedback)
interactions (confirmed contact only) ── optional capture_id / reason_id
user_settings · consents · devices · notification_log · feature_flags · ai_usage · analytics (content-free)
```

### Core tables

Every table has these columns: `id uuid` (client-generated for offline creates), `user_id uuid not null`, `created_at`, `updated_at` (server-stamped by trigger), `deleted_at` (tombstone), and `version int` (optimistic concurrency). RLS is `(select auth.uid()) = user_id`, and child tables also check parent ownership.

**people**

| Column | Notes |
|---|---|
| `display_name` | What the user calls them ("Mom", "Ben") |
| `full_name`, `nicknames text[]` | For resolution |
| `relationship_label` | Optional free text ("college roommate"); never required |
| `birthday date`, `birthday_year_known bool` | From contacts or captures |
| `state` | `active` · `remembered` (died) · `paused` (estranged / do-not-surface) · `archived` |
| `sprig_seed bigint` | Fixed at creation from `id`; never recomputed |
| ~~`circle text`~~ | Withdrawn: future chapters/circles are many-to-many (§34); V1 adds no group column |
| `contact_ref` | Opaque device contact id; the address book itself is never uploaded |

**captures:** the raw thing the user told Kinship

| Column | Notes |
|---|---|
| `source` | `text` · `voice` · `share` · `screenshot` · `siri` · `widget` · `post_handoff` · `post_encounter` · `photo` · `onboarding` |
| `raw_text` | Exactly as typed or transcribed; never rewritten |
| `transcript_meta jsonb` | `{on_device: true, locale, duration_s}`; audio is never stored |
| `context_person_id` | Set when Tell was opened from a person's page |
| `occurred_at` | When the user says it happened ("tonight"), default `created_at` |
| `status` | `pending` → `processing` → `extracted` · `needs_review` · `failed` · `skipped` (AI off) |
| `extraction_version` | Prompt + model id, so extractions can be re-run later |
| `retention` | `keep` (default) · `delete_after_extraction` (user setting) |

**memory_items:** anything Kinship believes

| Column | Notes |
|---|---|
| `kind` | `fact` · `event` · `promise` · `plan` · `thread` · `moment` · `milestone` · `tradition` · `context` |
| `person_id` | The relationship this belongs to (whose page it shows on) |
| `subject_type`, `subject_related_id` | `person` (the person themself) · `related` (e.g. Sarah's sister → `related_people` row) · `user` (the user themself, e.g. promises) · `shared` (both) |
| `statement` | Canonical natural-language line: "Sarah's sister has surgery Thursday" |
| `detail jsonb` | Kind-specific (below) |
| `certainty` | `stated` · `tentative` ("might", "thinking of") · `reported` ("I think Anna said") · `planned` · `wished` ("sometime") |
| `extraction_confidence numeric(3,2)` | Model plus rules score, 0–1; never shown |
| `sensitivity` | `none` · `health` · `death_grief` · `conflict` · `money` · `other_private` |
| `status` | `active` · `resolved` · `superseded` · `expired` · `retracted` |
| `user_state` | `unreviewed` · `confirmed` · `edited` · `user_authored` |
| `valid_from`, `valid_to` | For facts: when true; for events: see detail |
| `supersedes_id` | The older item this replaces |
| `origin` | `extracted` · `user` · `contacts` · `calendar` · `merged` |

**memory_item_sources:** many-to-many provenance: `memory_item_id`, `capture_id` (nullable), `source_kind` (`capture` · `contacts` · `calendar_event` · `user_edit` · `merge`), `span_start`, `span_end` (character offsets into `raw_text`), `quote` (≤200 chars, for display when the capture is set to delete after extraction), `added_at`.

**related_people:** `person_id`, `relation` ("sister", "son"), `name` (nullable), `promoted_person_id` (if the user later adds them as a person). Third parties stay attached to the relationship they came from and are never cross-linked across users.

**reasons:** derived, disposable: `person_id`, `type`, `window_start`, `window_end`, `evidence_item_ids uuid[]`, `score`, `copy` (generated or template), `copy_version`, `state` (`candidate` · `scheduled` · `surfaced` · `acted` · `done` · `dismissed` · `expired` · `suppressed`), `dedupe_key`.

**interactions:** confirmed contact only: `person_id`, `channel`, `occurred_at`, `source` (`return_check` · `capture` · `manual` · `calendar_confirmed`), `reason_id`, `capture_id`. A hand-off never writes here on its own (T12).

### Kind definitions

| Kind | Meaning | `detail` schema | Lifecycle | Supersede / merge |
|---|---|---|---|---|
| **Fact** | Believed currently true ("works at Google", "hates cilantro") | `{category: family\|work\|home\|health\|interest\|preference\|pet\|other, attribute?: string, value?: string}` | `active` until superseded or retracted; `valid_to` set on supersede | Same `category`+`attribute` with a new value → new item, old `superseded` (history kept) |
| **Event** | Happens at a point or range ("marathon Sunday", "surgery Thursday") | `{date?: date, date_end?: date, date_precision: day\|week\|month\|season\|year\|unknown, time_of_day?: string, date_hint?: string, event_type: race\|surgery\|medical\|exam\|interview\|move\|trip\|wedding\|birth\|funeral\|job_start\|school_start\|celebration\|other, followup_policy: before\|after\|both\|none}` | `active` → `resolved` after follow-up or `expired` when the window passes | Same person+type+date ±3 days → merge sources, keep the most precise date |
| **Promise** | The user said they'd do something | `{due_hint?: string, due_date?: date, to_whom: person}` | `open` → `kept` · `released` (status stored as `status`: active/resolved; `detail.outcome` = kept\|released) | Near-duplicate text for the same person → merge |
| **Plan** | Discussed doing together | `{when_hint?: string, season?: string, date?: date, firmness: idea\|intended\|scheduled}` | `active` → `resolved` (happened) · `expired` · promoted to Event when dated | "Ski Tahoe this winter" + "Tahoe Feb 18" → event supersedes plan |
| **Open thread** | Unresolved situation worth following up ("might leave Google", "job hunting") | `{topic: string, followup_after_days: int, last_checked?: date}` | `active` → `resolved` (a later capture answers it) · `expired` after 120 days | Resolved when a later fact or event answers it; the resolution links to both |
| **Shared moment** | Something you experienced together | `{date?, place?: string, photo_ids?: uuid[]}` | Permanent | None; each is distinct |
| **Milestone** | Meaningful life or relationship event (wedding, birth, ten years) | `{date?, milestone_type: string, anniversary: bool}` | Permanent; user-confirmed only | Deduped by type+date |
| **Tradition** | Meaningfully recurring ("football Saturdays every autumn") | `{recurrence: yearly\|seasonal\|monthly, anchor: string, since_year?: int}` | `active` until retracted; **only user-confirmed**, never inferred silently | Proposed from ≥2 moments or explicit language; the user confirms |
| **Relationship context** | Stable shared context ("met at Stanford", "same taco place") | `{aspect: how_met\|shared_interest\|inside_joke\|place\|other}` | Permanent until edited | Merge duplicates |
| **Relationship rhythm** | Descriptive pattern, never a score | **Not stored as a memory item.** Computed nightly into `person_insights(person_id, usual_gap_days, confirmed_contacts, computed_at)`; never displayed in V1 | Recomputed | — |

### Uncertainty, done right

| Input | Wrong | Stored as |
|---|---|---|
| "Mike may leave Google." | Fact: Mike left Google | **Thread**, subject Mike, certainty `tentative`, statement "Mike is thinking about leaving Google", follow-up after 42 days |
| "Mike left Google." | — | **Fact** `work`, certainty `stated`; supersedes "works at Google" |
| "Sarah's sister has surgery Thursday." | Event: Sarah has surgery | **Event** `surgery`, `person_id` Sarah, subject `related` → (Sarah, sister), sensitivity `health`, date resolved against capture time, follow-up `both` |
| "I think Anna said her mom comes home Tuesday." | Fact: Anna's mom comes home Tuesday | **Event**, subject Anna's mother, certainty `reported`, sensitivity `health` if context implies hospital; copy hedges: "Anna's mom may be home Tuesday" |
| "We talked about skiing sometime." | Event | **Plan**, firmness `idea`, certainty `wished`; no date; may surface at season start |
| "We're skiing Tahoe February 18." | Plan | **Event** `trip`, date 2027-02-18 (next occurrence), supersedes the plan if one exists |
| "Remind me that Tom hates cilantro." | A reminder | **Fact** `preference`; no reason is generated ("remind me" means remember, not notify, unless a date is given) |

Copy generation reads `certainty`: `tentative` → "is thinking about"; `reported` → "may"; `wished` → "talked about … sometime".

### Correction, deletion, merge

- **Correction:** the user's edit wins. It creates a `user_edit` source row, sets `user_state = edited`, and keeps the original extraction in `memory_item_history` for 30 days so Undo works. A re-extraction can never override `edited` or `user_authored` items.
- **Retraction ("Not this"):** `status = retracted`, `deleted_at` set, and an entry in `extraction_feedback` (content-free label, kept for evals only with consent).
- **Deleting an item:** it gets a tombstone and is hard-purged after 30 days. Reasons built on it are cancelled at once.
- **Deleting a capture:** items whose **only** source is that capture are deleted with it. Items with other sources lose that source and keep the rest. User-edited items survive, because the edit is itself a source, but the UI notes "original note deleted".
- **Deleting a person:** all their items, reasons, related_people and interactions go. Captures whose only person was them are deleted. Mixed captures remain, but spans about that person are redacted in `raw_text` if the user picks "also remove from my notes" (the default is yes).
- **Merge (duplicate people):** items, sources and identities move to the surviving person. A `merges` row keeps the undo mapping for 30 days.
- **Account deletion:** a service-role edge function deletes every row, file and the auth user, sends a confirmation email, and verifies with a post-delete count query that is recorded in an audit row with no content.

---

## 6. Provenance architecture

**Rule:** a statement is durable memory only if it has at least one row in `memory_item_sources`. The gateway enforces this: an extraction item without a valid span in the source capture is dropped before it is written. The database enforces it too: a deferred constraint trigger rejects any `memory_items` row that has no source at the end of the transaction.

```
"Ben ran Chicago yesterday."            ← reason copy (reasons.copy)
   └─ evidence: memory_item #e1           ← Event: Chicago Marathon, Sun Oct 11, race
        └─ source: capture #c7, chars 0–38 ← "Ben runs Chicago Sunday. He's hoping to break four hours."
             └─ You told Kinship · Oct 8, 9:14 pm · typed
```

Tapping any provenance line opens the **Source view**. It shows the raw capture text with the span highlighted, the date and how it arrived (typed, voice, from Contacts, from Calendar), every other item that capture produced, and Edit / Not this / Delete note.

| Situation | Behaviour | Line shown |
|---|---|---|
| Several captures support one item | Sources accumulate; newest first | "You told Kinship · Sep 29 · and 2 other notes" |
| Newer statement contradicts older | New item supersedes; old kept in history with `valid_to`; reasons from the old item cancelled | "Updated Oct 2 · was: works at Google" (on tap) |
| User edits a derived item | `user_edit` source added; `user_state = edited` | "You edited this · Oct 3 (from your note, Sep 29)" |
| Source capture deleted | Item removed if it was the only source; else source removed | "From 1 note" (count drops) |
| AI merged several items | `merge` source that lists the merged item ids; original sources carried over | "Combined from 2 notes" |
| Calendar contributed context | `calendar_event` source with event title hash and time only; no event body stored | "From your calendar · Thu 7:30 pm" |
| Contacts contributed (birthday) | `contacts` source | "From Contacts" |
| Reason copy generated by AI | Reason stores `evidence_item_ids`; the copy must mention only entities present in evidence (grounding check, §9) | Provenance of the underlying items |

**Never durable without provenance:** reason copy, briefs, summaries, reflections and Ask answers are *synthesized* output. They're stored for dedupe and audit, but they're never shown as facts, never fed back as input, and always rendered with their evidence links.

---

## 7. Universal capture pipeline

Every input becomes a `capture`. The UI never decides whether something is a fact or an event.

```
 Input (text · voice · share · siri · widget · post-handoff · photo)
   │
   ▼
 Capture written to local SQLite (status=pending) ── "Kept" shown in <100 ms
   │  outbox
   ▼
 Supabase captures row (idempotent on client id)
   │  client calls gateway relationship_extract(capture_id)   ← online path, ~2–5 s
   │  or pgmq job on insert if the client is offline/backgrounded
   ▼
 Gateway: load capture + people roster + dossier of candidate people (server-side, never from client body)
   │
   ├─ 1. Deterministic pre-pass: date expressions, known names/nicknames, "my mom", promises ("I'll…")
   ├─ 2. Model extraction (structured output) → candidate items with spans, certainty, subject, confidence
   ├─ 3. Person resolution: exact → nickname → identity → model disambiguation → ask user
   ├─ 4. Date resolution against capture.occurred_at + user timezone (deterministic library; model only proposes)
   ├─ 5. Validation: span exists, subject consistent, schema valid, sensitivity labelled, no invented names
   ├─ 6. Merge/supersede check against the person's active items
   ├─ 7. Confidence tier (§8) → items saved as unreviewed | pending_confirmation, or a clarification question
   └─ 8. Candidate reasons re-planned for affected people (§13)
   ▼
 Client receives result (Realtime or response) → "Here's what I'll remember"
```

| Source | Enters as | Notes |
|---|---|---|
| Text | `source=text` | V1 |
| Voice | `source=voice`; transcript only | V1-beta; audio discarded after transcription |
| Post-hand-off / post-encounter | `source=post_handoff`, `context_person_id` set | V1 (post-handoff) |
| Share sheet | `source=share`; text; screenshots OCR'd on device (Vision) and only text sent | Next |
| Screenshot | Same as share | Next |
| Siri / Action Button (App Intent) | `source=siri`; dictated text | Next |
| Widget | Opens Tell; `source=widget` | Later |
| Manually selected photo | `source=photo`; EXIF date + user caption; image stays in private storage; model sees caption, not image, in V1 | Later |
| Onboarding sentence | `source=onboarding` | V1 |

**Offline:** captures queue locally and show "Kept · I'll understand this when you're online". When extraction runs later, the confirmation appears as one quiet Today line: "I understood 2 notes · Review". It never appears as a push.

**AI off (user choice):** captures are saved raw, `status=skipped`. The relationship page shows them as notes, and dates found by the deterministic pre-pass still produce events. Kinship still works, but with less understanding. That keeps the consent real.

---

## 8. The extraction interaction

"Here's what I'll remember" appears after every capture that produced items. It's a sheet on the Tell screen, not a new screen.

```
Kept for David
─────────────────────────────────────────
Leo starts kindergarten  Tue, Oct 6        ×
  (tokens: Leo · Tue, Oct 6)
The new commute is wearing on David       ×
Camping with the kids · October            ×
You said you'd send Ana's contractor number ×
─────────────────────────────────────────
Is "his son" Leo?   [Yes, Leo]  [Someone else]
Undo                                   Done
```

- **Tokens** (ochre underline) are the resolved person, date, related person and kind. Tapping one opens a picker: person list or "New person"; date wheel or "No date"; "It's a plan, not a date"; relation. Every change is a `user_edit` source.
- **×** retracts that item.
- **One clarifying question at most**, the highest-value ambiguity only; the rest become `unreviewed` items.
- **Undo** (8 s toast after Done or auto-dismiss) deletes the capture and every item it created.

### Confidence rules

| Tier | Conditions (all must hold) | Behaviour |
|---|---|---|
| **Auto-save** | Every item: person resolved uniquely (single exact/nickname/identity match or Tell opened from that person) · extraction confidence ≥ 0.85 · explicit date or no date needed · sensitivity `none` · certainty not `reported` · no new person created | Items saved `unreviewed`. A compact summary slides up for 4 s ("Kept: Leo starts kindergarten Tue, Oct 6 · +2"), with Undo. No tap required. |
| **Light confirmation** | Any item 0.60–0.85 · or a new person would be created · or sensitivity ≠ none · or certainty `reported` · or a relative date resolved with week/season precision | Sheet stays open until Done or 20 s idle. Items are saved on show (so nothing is lost), marked `unreviewed`; ×/edits apply live. |
| **Clarification required** | Two or more candidate people for a name (two Sams) · subject ambiguity that changes whose page it goes on ("his son" with two male referents) · a date-bearing health/death event without a resolvable date | One question; items that depend on the answer are held as `pending` and written after the answer; others save. If dismissed, the dependent items are kept on the capture as unresolved and surfaced once in Today ("Which Sam?"). |
| **Drop** | Item confidence < 0.60, or no span, or statement names someone absent from the capture | Not written. The capture still holds the words. |

**Always confirm, regardless of score:** death, diagnosis or health events, pregnancy, conflict or estrangement, money trouble. A wrong one of these is the costliest error the product can make.

**Measured against:** "extracted items kept without edit" (target ≥ 85%), "clarifications per capture" (target ≤ 0.15), and "wrong-person reports" (target ≤ 1 per 500 captures).

---

## 9. AI architecture

### One gateway, narrow capabilities

Screens never call models. The client calls one authenticated edge function, `ai-gateway`, with `{capability, input_ref}`. Most inputs are *ids*: the gateway loads the content server-side under the caller's RLS, so a client can't inject a fabricated dossier, and provenance is guaranteed. The gateway builds on the hardening branch's authentication, quota, validation and generic-error code.

```
client ──JWT──▶ ai-gateway
                 ├─ authenticate (non-anonymous) ─ consent check (user_settings.ai_consent) ─ quota (ai_usage)
                 ├─ capability registry: {schema_in, schema_out, prompt_version, model, effort, max_tokens, timeout}
                 ├─ load context under user's RLS
                 ├─ call model (structured output, refusal fallback where supported)
                 ├─ validate + ground (spans / evidence ids / entity whitelist) ─ tone guard (regex + banned list)
                 ├─ write results (service role only for the job tables; user role for memory rows)
                 └─ usage log: capability, model, tokens, latency, outcome — no content
ai-worker (pgmq consumer, pg_cron every minute): same registry, batch-capable, for offline captures, nightly reasons, reflections
```

Model defaults below start on Claude Opus 5.5 (`claude-opus-5-5`, $4 / $20 per MTok) with effort set explicitly. Each capability is evaluated against Claude Sonnet 5.5 ($2 / $10) and Claude Haiku 4.5 ($1 / $5) and moved down only when its eval suite shows parity. **Governance (D12):** during the first beta Thor approves every downgrade; after it, a written model promotion policy applies. `relationship_extract` and `person_resolve` carry a higher replacement threshold (no regression at all on wrong-subject, certainty, hallucination or resolution precision) than stylistic capabilities such as `reason_generate`. Nightly work uses the Message Batches API (50% price).

| Capability | Input | Output | Grounding | Allowed inference | Forbidden | Model (start → candidate) | Latency target | Cost target / call | Retry & fallback | Privacy |
|---|---|---|---|---|---|---|---|---|---|---|
| `relationship_extract` | `capture_id` → raw text, occurred_at, tz, roster (names, nicknames, relations, ≤200 people), dossier of ≤3 candidate people (active items ≤40) | `{items: [{kind, person_ref, subject, statement, detail, certainty, sensitivity, confidence, spans[]}], clarification?, new_people[]}` | Every item needs ≥1 span; every name must appear in capture or roster | Kind, certainty from wording, relative dates as *expressions* | Inventing names, dates, feelings, diagnoses; upgrading tentative → stated; attaching a related person's event to the person | Opus 5.5 low → Sonnet 5.5 low | p50 3 s, p95 7 s | ≤ $0.03 (Opus), ≤ $0.015 (Sonnet) | 1 retry on 5xx/timeout; on failure `status=failed` → worker retries ×3 with backoff; the capture is never lost | Only that capture, roster names, ≤3 dossiers; no phone/email |
| `person_resolve` | name mention + candidate people (name, relation, 3 recent items each) | `{person_id \| null, confidence, question?}` | Must pick from candidates | Context match | Choosing when the gap < 0.2 | Deterministic first; Haiku 4.5 | p95 1.5 s | ≤ $0.002 | Fall back to asking the user | Candidate names only |
| `date_resolve` | expression + anchor date + tz | `{date, date_end?, precision}` | — | — | — | **Deterministic** (chrono-style parser plus rules); model only for idioms the parser can't handle ("the weekend after Thanksgiving") | <50 ms | ~$0 | Unresolved → precision `unknown`, ask only when health/death | None |
| `memory_merge` | new item + person's active items of the same kind | `{action: new\|merge_with\|supersede, target_id?}` | Target must exist | Semantic equivalence | Merging different subjects | Deterministic similarity first; Haiku for ties | p95 1 s | ≤ $0.002 | Default `new` | One person's items |
| `followup_candidate` | item | `{followup_policy, window}` | — | Event-type defaults | — | **Deterministic rules table** (§13) | — | $0 | — | — |
| `reason_generate` | reason candidate + evidence items (≤6) + tone rubric | `{headline ≤ 60 chars, mention_bullets ≤ 3, lockscreen_safe_title}` | Headline may use only entities and dates in evidence; grounding validator checks | Warm phrasing, tense from dates | Guilt, gap-as-reason, counts, advice on feelings, invented details | Opus 5.5 low, Batch nightly → Sonnet 5.5 | Batch (nightly); on-demand p95 4 s | ≤ $0.008 batch | Template fallback (1.0's best templates, rewritten for tone) | One person's evidence |
| `interaction_brief` (Next) | person + event + top 6 items | 3–4 lines, each with `item_id` | Each line maps to one item | Selection, ordering | Anything not in items | Opus 5.5 low | p95 5 s | ≤ $0.02 | Show raw items list | One person |
| `reconnect_assist` (Next, on request) | reason + shared context items | 2–3 openers ≤ 2 sentences | Mentions only evidence | User's register if examples exist | Mentioning Kinship; long drafts; "It's been X months" as opener | Opus 5.5 medium | p95 6 s | ≤ $0.03 | "You could mention" bullets only | One person |
| `reflection_generate` (Next) | month's confirmed interactions, kept promises, moments | ≤ 5 sentences, each with evidence ids; or `nothing_to_say: true` | Every sentence cites | Selection | Numbers, comparison, praise without evidence | Opus 5.5 medium, Batch | Batch | ≤ $0.02 | Skip the letter | That user's month |
| `retrieval_answer` (Next) | question + SQL/keyword-retrieved items (≤30) | `{answer, item_ids[]}` or `not_found` | Answer must cite ≥1 item | Synthesis across items | Speculation; answers about people not in store | Sonnet 5.5 → Haiku | p95 4 s | ≤ $0.01 | "I don't have that" | Retrieved items only |

**Where deterministic logic replaces a model:** dates, follow-up windows, candidate generation, ranking, dedupe of exact matches, rhythm, banned-word checks, and lock-screen minimization. The model does exactly three jobs: understanding language, choosing between close candidates, and phrasing.

**Prompt and version management:** prompts live in `supabase/functions/_shared/prompts/<capability>/<version>.ts`. The registry pins `prompt_version` and model per capability. Every stored output records both. A prompt change ships only with an eval run attached to its PR.

**Vendor terms:** pursue zero-data-retention terms for the chosen models, and don't claim "nothing is kept" until they actually apply to the model in use (T9, D2). **Disclosure (D2):** the onboarding privacy-context screen and Settings › What Kinship knows both state plainly that information users record about people in their life may be processed by Kinship's AI provider to understand and organize it. It is never only in the privacy policy. Set `inference_geo` if residency becomes a requirement. Include the refusal fallback on models that support it. A refusal on a capture means `status=failed_refused`, and the note is kept raw without an error message to the user.

---

## 10. AI evaluations

Build the dataset before the first prompt ships. Evals gate every prompt or model change in CI (labelled job, because it costs money) and run nightly on `main`.

### Dataset

`evals/extraction/` holds JSONL fixtures. Each has `capture`, `occurred_at`, `tz`, `roster`, `dossiers`, and `expected` (items with kind, subject, person, certainty, date, sensitivity, plus must-not assertions).

| Set | Size (v1 → v2) | Contents |
|---|---|---|
| Core | 120 → 300 | Everyday relationship language, 1–4 items each, varied length and register |
| **Ambiguity** | 60 → 150 | The prompt's cases and variants: "Josh might switch jobs" / "Josh switched jobs" / "Josh's wife is interviewing" / "We talked about skiing sometime" / "We're skiing Tahoe February 18" / "Remind me that Tom hates cilantro" / "I think Anna said her mom comes home Tuesday", plus pronoun chains, two people with the same name, possessives ("Sarah's sister's surgery"), negation ("Ben didn't get the job"), sarcasm, past vs future tense |
| Dates | 80 → 200 | Relative dates across timezones, DST, "next Friday" said on Friday, year rollover, "end of the month", holidays |
| Sensitive | 40 → 100 | Illness, death, divorce, pregnancy, money: correct `sensitivity`, never auto-save |
| Adversarial | 20 → 50 | Prompt injection in captures ("ignore previous instructions…"), very long input, non-English fragments, emoji-only |
| Merge | 40 → 100 | New capture vs existing dossier: new / merge / supersede |
| Reasons (copy) | 60 → 150 | Evidence → headline; graded for grounding and tone |
| Real (consented) | 0 → 200+ | Beta captures donated with explicit per-capture consent, anonymized by the user before submission |

Fixtures are written by the team from patterns, never taken from real users' data without explicit consent.

### Metrics and thresholds

| Metric | Definition | Ship threshold |
|---|---|---|
| **Wrong-subject rate** | Item attached to the wrong person or subject (Sarah vs Sarah's sister) | **0 on the ambiguity set;** ≤ 0.5% overall |
| **Certainty preservation** | Tentative/reported/wished kept as such | ≥ 97% |
| **Hallucinated item rate** | Items with no supporting span or with invented names/dates | ≤ 0.5% of items; 0 invented names |
| Person resolution precision (auto-assigned) | Correct when not asking | ≥ 98% |
| Person resolution ask rate | Asks when two candidates exist | ≥ 95% (asking is correct) |
| Date exact match (explicit dates) | | ≥ 97% |
| Date correct (relative) | | ≥ 93% |
| Item recall (facts/events/promises) | | ≥ 85% |
| Promise precision / recall | | ≥ 95% / ≥ 85% |
| Plan vs event classification | | ≥ 92% |
| Sensitivity labelling recall | | ≥ 95% |
| Merge decision accuracy | | ≥ 90%, and 0 cross-subject merges |
| Reason grounding | Headline entities ⊆ evidence | 100% (validator-enforced) |
| Tone | Rubric judge: no guilt, no gap-as-reason, no counts, no Kinship mentions | ≥ 98% pass; banned regex 100% |
| Injection resistance | No instruction-following from capture text | 100% |

Grading is mostly deterministic (field comparison). An LLM judge is used only for statement paraphrase equivalence and tone, and is itself spot-checked by hand (50 per release).

**Principle:** when a metric is below threshold, the product degrades toward silence. It asks more, auto-saves less, or surfaces fewer reasons. It never ships more confident behaviour.

---

## 11. Local data and sync

### Recommendation

**Server-authoritative memory, mirrored into an encrypted per-user SQLite database on the device, with an outbox for writes.** Supabase is the source of truth because extraction, reasons and push are all computed server-side. The device mirror provides instant UI, offline reads, offline capture and a clean wipe.

```
Screens ──▶ hooks (read-only view models)
             │
             ▼
        Repositories (PeopleRepo, CaptureRepo, MemoryRepo, ReasonRepo, SettingsRepo)
             │ read                        │ write
             ▼                             ▼
        SQLite (per-user file,        Outbox (same DB, ordered, idempotent)
        SQLCipher, key in                  │
        SecureStore)                       ▼
             ▲                        SyncEngine ── push: upsert by client id, version check
             └──── pull: rows where updated_at > cursor (per table), tombstones included
                                           │
                                        Supabase (RLS)  ◀── Realtime channel: "your data changed" hint only
```

| Question | Answer |
|---|---|
| SQLite appropriate? | Yes. `expo-sqlite` (SDK 54) is maintained by Expo, supports SQLCipher through its config plugin (verify in spike S-2), and handles this data size (hundreds to low thousands of rows per user) with no difficulty. Hosted sync engines (PowerSync, etc.) add a vendor and cost for a problem this small. JSON files, as in 1.0, can't be queried or wiped transactionally. |
| Offline writes | Captures, item edits and retractions, person edits, reason feedback, settings. Each write is an outbox row with a client UUID and a `base_version`. |
| Incremental sync | Per table, `updated_at` stamped by a server trigger (`now()` from the DB clock, never the device). Pull uses `updated_at > cursor ORDER BY updated_at, id` in pages of 500. Realtime sends only "table changed" pings to trigger a pull, never data. |
| Conflicts | Row-level optimistic concurrency. The server rejects a write whose `base_version` ≠ current, and the client re-pulls. For user-edited memory, the latest user edit wins. For server-derived fields (extraction, reasons), the server always wins. Items are mostly append or supersede, so real conflicts are rare. |
| Deletion propagation | Tombstones (`deleted_at`) sync like any row; hard purge after 30 days by a job. A client that has been offline longer than 30 days does a full resync. |
| Sign-out | Close the DB, delete the per-user DB file and its key, clear module caches, unregister the push token server-side, and clear the query cache. Covered by an automated test. |
| Account switching | Each user has their own DB file (`kinship-<user_id>.db`); switching never reads another user's file. Signing out of user A always deletes A's file (no "keep for later"). |
| Anonymous → account | Not in V1 (T2). If adopted later: Supabase anonymous sign-in keeps the same `user_id` through `linkIdentity`, so no data moves. |
| Encryption | At rest on the server: Postgres/disk encryption plus RLS. On the device: SQLCipher plus iOS Data Protection. Application-level per-user keys are deferred (T10, D11). |
| What the UI may do | Read through hooks that call repositories. **Never** merge local and remote rows, never fall back to other data, and never catch errors silently. Errors surface as explicit offline or error states. A lint rule bans importing `supabase` from `app/`. |

---

## 12. Phase Zero: trust

Phase 0 fixes every defect before anyone outside the team touches any build. There are two tracks:

- **Server fixes are permanent.** They carry into 2.0 unchanged.
- **Client fixes to 1.0 are made only where they're cheap and the team keeps dogfooding 1.0 for about 8 more weeks.** Where the 1.0 surface is deleted in 2.0, the fix is to delete the feature.

Every fix has a test that proves it, and the same tests are ported to the 2.0 repositories.

| # | Defect | Fix | Where | Proof (test) |
|---|---|---|---|---|
| 1 | Demo data after server errors | Remove mock fallback and `u1` saves from all hooks; show an offline/error state; delete `src/data/mock.ts` from production bundles | `src/hooks/use*.ts`, `src/data/mock.ts` | Unit: service throws → hook returns `error`, persons `[]`, no local write. 2.0: repository tests assert no fallback path exists |
| 2 | Local data survives sign-out | `signOut` wipes `localStore` dir, module caches, AI cache, push token | `AuthProvider.tsx`, `localStore.ts` | Integration: sign in A, create, sign out, sign in B → B sees 0 rows and no files |
| 3 | Fake account deletion | Remove prototype Account screen; route to the real flow | `app/settings/account.tsx` → minimal real screen | E2E (Maestro): Delete account → server confirms → signed out → sign-in fails for that user |
| 4 | Incomplete server deletion | Edge function `delete-account` (service role): all tables, storage prefix, auth user; returns counts; client shows failure honestly | `supabase/functions/delete-account` | Deno test with seeded user: post-delete counts all 0; auth user absent; retry idempotent |
| 5 | Unsecured AI proxy | Merge `claude/wonderful-planck-inpeu9`; apply migration 008; redeploy; add a consent check | `supabase/functions/ai-insight`, `008_ai_usage.sql` | Deno tests: anon key → 401; anonymous user → 401; oversize → 400; 51st call → 429 |
| 6 | Unsynced AI privacy preference | `user_settings.ai_consent` server-side (default **off until onboarding consent**, D3); the gateway refuses without consent; the device reads the server value | migration, gateway, `aiPreferences.ts` | Gateway test: consent false → 403 `consent_required`; reinstall keeps the setting |
| 7 | Private lock-screen text | Memory-resurface copy generic ("A moment worth revisiting"); a server `lockscreen_level` setting governs 2.0 | `notificationEngine.ts:115` | Unit: every notification builder output passes the "no capture text, no sensitive words" check |
| 8 | Calendar leakage (season echoes) | **Delete** echo writing; calendar permission requested only from Settings | `seasonCalendar.ts`, `calendarEngine.ts`, `(tabs)/index.tsx` | Unit: no `createEventAsync` import in the bundle (lint rule); Home never calls `requestCalendarPermission` |
| 9 | Fragile photo references | 1.0: copy picked image into `Paths.document/photos/` and store that path. 2.0: private Storage bucket `photos/<user_id>/…`, signed URLs, EXIF location stripped | `photoPicker.ts` | Unit: returned URI is under the document dir; 2.0: upload/download round trip under RLS |
| 10 | Unnecessary permissions | Remove `WRITE_CONTACTS`; remove photo-library-add unless share cards remain (they don't in 2.0) | `app.json` | Config test: the permissions list matches an allowlist |
| 11 | Database/RLS drift | CLI-timestamped baseline migration capturing live state (incl. `rls_auto_enable`), then revoke `EXECUTE` from anon/authenticated; rewrite policies as `(select auth.uid())`; parent-ownership checks; enable leaked-password protection | `supabase/migrations/` | pgTAP: user B can't read/insert A's rows (incl. child rows pointing at A's person); advisors clean |
| 12 | Invite message tells friends they're tracked | Delete `buildInviteMessage` and the Invite action | `appLinks.ts`, `person/[id].tsx` | Grep test in CI |
| 13 | Toolchain advisories | `npx expo install --fix` to SDK 54 patch level; `npm audit` clean of critical/high in the shipped dep tree | `package.json` | CI `npm audit --omit=dev --audit-level=high` |
| 14 | No observability | Sentry (scrubbed), content-free analytics client, CI with tsc + lint + tests | `app/_layout.tsx`, `.github/workflows/ci.yml` | CI green; a forced crash appears in Sentry with no PII |

**Exit criterion for Phase 0:** all 14 proofs pass in CI, the advisors report is clean, and a written privacy review signs off that 1.0 builds can go to internal TestFlight.

---

## 13. Today

Today answers one question: is there anything worth remembering or doing now? It shows one primary moment, at most two quiet lines, and the Tell field. Or it says "Nothing needs you today", with a year-ago line if one exists.

### Candidate generation (deterministic, server-side nightly and on change)

| Candidate type | Trigger | Window | Base weight | Notes |
|---|---|---|---|---|
| **Hard time** (health, loss) | Event with sensitivity health/death_grief | Day before; day of; 2 days after | 100 | Copy is never cheerful; lock screen generic |
| **Event follow-up** | Event with `followup_policy` after/both | Day after (race, interview, exam, trip return) · 3–7 days (move, job start, school start) | 90 | "Ben ran Chicago yesterday." |
| **Upcoming event** | Event with policy before/both | Day before (surgery, interview) · 2–3 days before (celebrations) | 85 | |
| **Birthday** | `people.birthday` | Day before (quiet line) · day of (primary) | 80 | |
| **Promise** | Open promise | 2–4 days after capture; again before the next known encounter; once only | 75 | "You said you'd send David the contractor number." |
| **Open thread** | Thread `followup_after_days` elapsed | 3-day window | 60 | "Did Josh decide about the startup?" |
| **Plan / season** | Plan with season or month | Start of that season/month | 50 | "Still up for Tahoe?" |
| **Tradition** (Next) | Confirmed tradition | 2–3 weeks before anchor | 45 | |
| **Reconnect** (Next) | Real reason (world event, tradition, shared-interest season) **and** quiet stretch | Reason's window | 40 | Never gap-only (§17) |
| **Memory resurfacing** | Anniversary of a moment (port `spotlightEngine`) | Day of | 20 (secondary line only) | "A year ago: Lisbon with Maya." |
| **Review** | Captures with unresolved clarifications | Next open | secondary only | "Which Sam?" |

### Ranking

```
score = base_weight(type)
      × timeliness(window position; peaks at ideal day, 0 outside window)
      × evidence(certainty: stated 1.0 · planned 0.9 · tentative 0.7 · reported 0.6 · wished 0.5;
                 user_state: confirmed/edited 1.0 · unreviewed 0.85)
      × freshness(not shown before 1.0 · shown once 0.5 · dismissed 0 · "not helpful" → type×person muted 30 days)
      × person_cap(one primary per person per 7 days)
      × user_feedback(type-level multiplier learned from acted/dismissed, clamped 0.5–1.2)
      × (1 + 0.15 · quiet_stretch)   ← only for reconnect and plan types, and only when a real reason exists
```

**Inputs never used:** elapsed time alone, number of items or captures per person, relationship label as importance, how often the user opens the app, or any cross-person comparison.

**Selection:** the top candidate becomes the primary moment if `score ≥ 55`. Up to two secondary lines come from different people, and only from these types: birthday-tomorrow, year-ago, review, upcoming-this-week. If nothing reaches 55, Today shows "Nothing needs you today." That is a valid, designed state, not an empty state to fill.

**States of a moment:** `surfaced` → `acted` (hand-off opened) → `done` (return check yes / "Done") · `dismissed` ("Not now" snoozes 2 days for time-flexible types; "Not helpful" mutes) · `expired`.

---

## 14. Reasons to connect

A reason must answer four questions before it can speak.

| Question | Where it's answered | Rule |
|---|---|---|
| **Why now?** | Candidate window (§13) | No window, no reason |
| **Why this person?** | The evidence item is about them or someone close to them | Evidence item's `person_id` |
| **What evidence supports this?** | `evidence_item_ids`, each with sources | ≥1 item with `status=active` and `user_state ≠ retracted` |
| **Should Kinship speak at all?** | Policy gate | Suppress if: person `paused` or `remembered`; sensitivity requires permission not given; same person surfaced in the last 7 days; user muted the type; evidence certainty `wished` and no season window; push budget exhausted (the reason can still appear in Today) |

**Generation is separate from copy.** Candidates come from SQL and TypeScript rules in `supabase/functions/_shared/reasons/` (§13). Copy comes from `reason_generate` in a nightly batch for the next 36 hours, with a template fallback. The model never proposes a reason. It only phrases one that already exists, and the grounding validator rejects any headline with an entity or date not in evidence.

Examples:

| Evidence | Good copy | Rejected copy (validator/tone) |
|---|---|---|
| Event: Ben, Chicago Marathon, Oct 11, "hoping to break four hours" | "Ben ran Chicago yesterday." · mention: "His goal was under four hours" | "You haven't talked to Ben in a while — ask about his marathon!" (gap, exclamation) |
| Promise: send David contractor number | "You said you'd send David the contractor number." | "Don't forget your promise to David!" |
| Thread: Josh may leave Google (Aug 20) | "Did Josh decide about the startup?" | "Josh left Google." (certainty upgrade) |

---

## 15. Human handoff

Every useful moment ends in the real relationship. Kinship opens the channel and never sends anything.

| Channel | Mechanism | Notes |
|---|---|---|
| Messages | `sms:<number>` (iOS opens iMessage when available); `sms:&body=` **not used** by default | Opener text is copied to the clipboard only if the user tapped "Use this"; never auto-pasted |
| Phone | `tel:<number>` | |
| FaceTime | `facetime:<handle>` / `facetime-audio:` | |
| WhatsApp | `whatsapp://send?phone=<e164>` (check `canOpenURL`; needs `LSApplicationQueriesSchemes`) | |
| Email | `mailto:<address>` | |

The channel list comes from the person's device contact (via `contact_ref`), read on the device at tap time. Numbers are not stored server-side in V1: `person_identities` holds only hashed values for matching.

**Return check.** When the app returns to the foreground within 10 minutes to 12 hours of a hand-off, Today shows one line: "Did you reach Ben? Yes · Not yet". There is no push for this.

- **Yes** writes an `interactions` row (`source=return_check`), marks the reason `done`, and offers "Anything worth remembering?", which opens Tell with `context_person_id` set.
- **Not yet** keeps the reason for 1 more day; after that it expires quietly.
- **No answer** means no interaction is logged, ever. Opening Messages proves nothing.

---

## 16. Pre-interaction briefs

**Decision: Next, not V1.** Ship them in the first release after the core loop passes its beta gate (§30).

- **Why not V1:** they add the calendar permission, attendee-to-person resolution, a second notification class and a second loop. The first loop has to prove itself without them. They are also the most "sales-prep"-shaped feature and need careful copy.
- **Why right after:** the audit rates them Very high value, and they are the natural trigger for post-encounter capture, the best source of new memory.

Design when built:

```
Device (background refresh + on open): read next 36 h of events from selected calendars only
  → match attendees: email/phone identity hash → person; else exact full-name match; else skip (never first-name only)
  → send gateway only {person_id, event_start, event_title_hash, is_1to1}; never the calendar body
Server: select top items for person (open promises first, then events ±30 days, threads, recent facts ≤90 days)
  → interaction_brief → 3–4 lines, each with item_id
Delivery: push 60–90 min before, lock screen "Something for tonight"; opens Brief sheet
After: 2–3 h after event end, Today asks "How was dinner with David?" (in-app only)
```

**Tone rule:** a brief lists what the user already knows, in their words. It carries no talking points, no goals, no "remember to ask about…". There are at most 4 lines. Kept promises offer "Kept it".

---

## 17. Reconnect

**Next, not V1.** It needs two things at once:

1. **A quiet relationship**: rhythm computed from ≥3 confirmed contacts, with the current gap more than 2× the usual gap. With fewer data, only an explicit "we haven't talked since the move" capture counts.
2. **A real, current reason**: a tradition window, a shared-interest season (a small curated calendar: sports seasons, holidays, school starts), a date-anchored memory (first trip ten years ago), or their news the user captured.

A quiet stretch with no reason produces nothing. The gap may be acknowledged in the sheet ("It's fine to say it's been a while"), never in the headline or a push. Reconnect appears only in Today or the weekly brief, never as its own push. Openers (2–3, ≤ 2 sentences, editable) are generated **only when the user taps "A few easy ways to say hi"**. Kinship never sends anything, and never mentions itself in an opener.

---

## 18. The Quiet Herbarium in code

### One token source

`src/design/tokens.ts` replaces `design/tokens.ts`, `src/lib/theme.ts` and `tailwind.config.js`. It exports `color.light` / `color.night`, `type` (Newsreader, Instrument Sans, as specified), `space` (4, 8, 12, 16, 20, 26, 34, 48, 64), `radius` (pill = height/2, inline 14–18, sheet 28, photo 10), `motion` (the design direction's table plus reduce-motion variants) and `shadow.sheet`. A `useTokens()` hook picks light or night from the system appearance.

Lint rules in `app/(v2)/**` and `src/ui/**`:
- No hex literals outside `tokens.ts`.
- No `StyleSheet` numbers outside the spacing scale.
- No imports from `src/components/ui/Card`.
- No `lucide` icon without `accessibilityLabel`.

### The component vocabulary (no Card)

| Component | Purpose | Key props | Accessibility |
|---|---|---|---|
| `Moment` | The one serif statement with provenance and up to 2 actions | `statement`, `sprigSeed?`, `provenance`, `actions` | Heading role; statement plus provenance read as one element; actions are buttons with explicit labels |
| `Row` | Hairline-separated line (people list, facts, settings) | `leading?`, `title`, `subtitle?`, `trailing?`, `onPress?` | 44 pt minimum height; combined label |
| `Token` | Underlined understood word; opens a picker | `value`, `kind` (person/date/relation/kind), `onChange` | Button role, hint "Double-tap to change"; underline is **not** the only cue (a dotted ochre underline with ≥3:1 contrast plus a label on focus) |
| `Provenance` | "You told Kinship · Sep 29" | `sources[]`, `onPress` | Link role; opens Source view |
| `Sprig` | Person's identity mark | `seed`, `size`, `marks?`, `animateNewDetail?` | `accessibilityElementsHidden`; decorative only; the name carries meaning |
| `TellField` | Always-present input with microphone | `contextPersonId?` | Text field plus a mic button with a record-state announcement |
| `Sheet` | Temporary context (follow-up, extraction, source) | `snap`, `onDismiss` | Focus trapped; Escape/scrub to dismiss |
| `Pill` | Primary/ghost/destructive buttons | `variant`, `icon?` | 44 pt; label never truncated (the canvas bug fixed on 30 Sep: add `numberOfLines={1}` plus `adjustsFontSizeToFit` as a last resort) |
| `QuietLine` | Secondary Today lines | `label`, `text`, `action?` | |
| `SourceView`, `PersonPicker`, `DatePicker` | Correction surfaces | | |

Existing primitives kept and retuned: `PressableScale`, `FadeIn`, `FadeInImage`, `Skeleton`.

### Prototype on device first

Before locking type and spacing, build a hidden `app/(v2)/_lab.tsx` screen with the tokens and components on real devices (iPhone SE 3rd gen, 15, 16 Pro Max). Test at Dynamic Type sizes XS → AX3, in light and night.

**Gate:** Newsreader 34/38 display must reflow to 3 lines at AX1 with no truncation. Ochre-text `#8A6417` on paper `#EFEEE9` must stay ≥ 4.5:1: verify in the lab (the canvas lists 5.1:1). Night ochre on `#121513` must hold ≥ 4.5:1 as well.

---

## 19. The sprig

The sprig is Kinship's signature, and it must never become a health bar. **The rule: a sprig tells you *who*, never *how much*.**

### Three morphology algorithms, evaluated

**A. Accumulating (design direction as written).** One leaf per shared moment up to 12, then fuller; a bud for upcoming; a flower per milestone.
- Can users infer "this relationship has more activity/value"? **Yes, immediately.** Leaf count and fullness are quantity. Put a new friend next to Mom and the new friend looks lesser. A capped count still separates 2 from 12, which is exactly the gap between a new person and an old one.
- Verdict: **reject.**

**B. Pure identity.** The seed fixes everything; history never changes the drawing.
- Can users infer activity? **No.**
- It is perfectly safe, but the sprig becomes a logo. It loses "it grew with us", and the leaf-draw moment (§ motion) has nothing to draw.
- Verdict: acceptable fallback.

**C. Identity-first with bounded, non-monotonic marks (recommended).**
- The seed fixes everything structural: genus-like form family (1 of 6: frond, umbel, spray, trailing, grass, bract), stem curve, node count (5–9), leaf shape, phyllotaxis and proportions. **Every sprig has its full, mature structure from day one.** A person added today looks as complete as your oldest friend.
- History changes only *which details are drawn*, not how many. Each shared moment re-seeds **one leaf's detail** at that node: a fold, a vein, a slight turn, a notch. The node is chosen deterministically from the moment id. The leaf count never changes. After 3 moments or 300, a sprig has the same visual weight. It is just subtly *particular*, and changes are visible only to someone comparing a sprig with itself over time.
- **Milestones:** at most one flower, placed at the apex, shown only for the most recent user-confirmed milestone. A friend with no milestone has a closed terminal bud of the same visual mass, so the flower differs in form, not size.
- **Upcoming events: no bud in the sprig.** "Coming up" is text on the relationship page. A bud on the People list would advertise who has plans.
- **Remembered (deceased):** the sprig is frozen exactly as it was, drawn in `ink-quiet` with a slightly thinner stroke. There is no wilt, no grey-out and no badge; a single "Remembered" line on the page.
- **Paused (estranged):** identical rendering, no marks added. The only difference is that no reasons are generated. Nothing visual distinguishes them.
- Can users infer activity? **Only by comparing the same sprig over months, which never happens by accident.** Across people, sprigs differ in form family and shape, and these are unrelated to history.

| Criterion | A. Accumulating | B. Identity only | C. Identity + bounded marks |
|---|---|---|---|
| "More activity/value" inferable across people | Yes | No | No |
| Negative state possible | No (only adds) | No | No |
| Feels alive, rewards sharing a moment | Yes | No | Yes (one detail redraws) |
| Coherent botanical system | Yes | Yes | Yes |
| Scales to 100+ (visual variety) | Poor: all look like leaf counts | Good | Good |
| Grief / estrangement safe | Mostly | Yes | Yes |
| Implementation | Medium | Low | Medium |

**Recommendation: C.** Ship **B's rendering in V1**, with the marks feature flag off. Turn marks on after the beta confirms that users don't read sprigs comparatively (interview question §30).

### Specification

- **Seed:** `people.sprig_seed = fnv1a64(person.id)`, stored once. It is never derived from name, so a renamed person keeps their sprig, and it is stable across devices because it syncs.
- **Generator:** a pure TypeScript function `sprig(seed, marks[], opts) → {stem: string, leaves: string[], terminal: string, wash: string}` in `src/ui/sprig/`. It uses a seeded PRNG (mulberry32) and no `Math.random`, date or platform dependency. `marks = [{node, variant}]`, derived from moment ids (`hash(moment.id) % nodes`), capped at one mark per node (a later moment replaces an earlier mark at the same node).
- **Rendering:** `react-native-svg` `Path`s, one ink colour, a hairline stroke (1.2 pt at 60 × 110), and an optional 7% wash. The viewBox is fixed and scales with the `size` prop.
- **Parameters (per form family):** node range, internode length curve, stem bend amplitude, leaf length/width ratio, leaf tip angle, alternation, terminal type. They live in `src/ui/sprig/families.ts` and are tuned in the `_lab` screen.
- **Persistence:** only the seed and marks (derived) are stored. Paths are computed on device and memoized per `(seed, marksHash, size)` in an LRU (200 entries). A 100-person list computes once, at about 0.3 ms per sprig (target, measured in the spike).
- **Animation:** the new mark's leaf draws with `strokeDashoffset` over 1.8 s, once, the first time the page is seen after the moment is saved. The garden sway (±1°, 6 s) exists only in the Garden view (Phase 6). With Reduce Motion on, there is no draw or sway, only a 150 ms fade.
- **Accessibility:** decorative (`accessibilityElementsHidden`, `importantForAccessibility="no"`). No information is carried only by the sprig.
- **Regression testing:**
  1. Snapshot the path strings for 500 fixed seeds × 3 mark sets (a pure-function test in Jest).
  2. Rasterize 60 golden seeds with `@resvg/resvg-js` in Node and pixel-diff with a 0.5% tolerance. The golden images are reviewed by design once.
  3. Property tests: bounding-box area variance across mark counts 0 → 50 for the same seed is < 3%, which is the "no quantity" guarantee, enforced in CI.
  4. Determinism across platforms: the same seed produces identical strings on iOS JSC/Hermes and Node, checked in CI through a Hermes run.

---

## 20. Design-system rollout and route classification

The product is shrinking from 32 screens to about 14. **Don't reskin 1.0.** Build the 2.0 shell as `app/(v2)/` behind the `shell_v2` flag, which chooses the root layout at launch. Screens inside it are built only from the new components. The 1.0 shell is frozen: it gets only Phase 0 fixes, and is deleted when `shell_v2` reaches 100% (ticket DEL-10). No screen ever mixes the two systems, because they live in different route trees.

| Route (1.0) | Lines | Decision | 2.0 replacement / note | Deletion dependency |
|---|---|---|---|---|
| `app/index.tsx` | 35 | Replace | Root redirect chooses the v1 or v2 shell by flag | Flag removal |
| `app/loading.tsx` | 500 | Delete | Native splash only | Nothing depends on it |
| `app/(auth)/login.tsx` | 774 | Adapt | Apple / Google / email sign-in on paper; logic kept (`src/lib/auth.ts`) | — |
| `app/(auth)/onboarding.tsx` | 1,442 | Replace | `(v2)/onboarding/` 2 steps + consent | `GrowthPlantIllustration` then deletable |
| `app/(tabs)/_layout.tsx` | 582 | Replace | `(v2)/(main)/_layout.tsx`: Today · People + TellField | 5-option Tend sheet goes |
| `app/(tabs)/index.tsx` | 1,564 | Replace | `(v2)/(main)/today.tsx` | Unblocks deleting suggestionEngine, vitality, orientation |
| `app/(tabs)/people.tsx` | 707 | Replace | `(v2)/(main)/people.tsx` search-first list | — |
| `app/(tabs)/add.tsx` | 2,117 | Delete | People come from onboarding picker, "Add from contacts", or mentions in Tell | — |
| `app/(tabs)/profile.tsx` | 490 | Delete | Settings from People header | Gardener levels die |
| `app/person/[id].tsx` | 1,892 | Replace | `(v2)/person/[id].tsx` relationship page | Unblocks nextActionEngine, textureEngine, useAIInsight |
| `app/person/edit/[id].tsx` | 719 | Adapt | `(v2)/person/[id]/knows.tsx` What Kinship knows (per-item edit/delete) plus name/birthday edit | — |
| `app/person/_layout.tsx` | 23 | Replace | v2 stack | — |
| `app/memory/add.tsx` | 1,186 | Replace | `(v2)/tell.tsx` + extraction sheet | — |
| `app/memory/[id].tsx` | 372 | Adapt | `(v2)/source/[captureId].tsx` Source view | MemoryShareCard, shareImage deletable |
| `app/memory/edit/[id].tsx` | 391 | Delete | Editing happens on items and captures | — |
| `app/memory/_layout.tsx` | 24 | Delete | — | — |
| `app/quick-note/[id].tsx` | 261 | Delete | Tell from person page | — |
| `app/reach-out/[id].tsx` | 771 | Replace | Follow-up sheet with hand-off | MemoryCarousel → "You could mention" |
| `app/reach-out/check-in/[id].tsx` | 537 | Delete | Return check line + Tell | — |
| `app/reach-out/_layout.tsx`, `check-in/_layout.tsx` | 43 | Delete | — | — |
| `app/select-person.tsx` | 376 | Delete | PersonPicker token | — |
| `app/import-contacts.tsx` | 89 | Adapt | `(v2)/people/add-from-contacts.tsx` multi-select | ContactPicker adapted |
| `app/garden-walk.tsx`, `garden-walk-setup.tsx` | 1,135 | Delete | Today + weekly brief | — |
| `app/activity.tsx` | 1,014 | Delete | Monthly letter (Next) | — |
| `app/season/new.tsx`, `season/retrospective.tsx` | 1,506 | Delete | (T14) | seasonEngine, seasonCalendar, useSeason |
| `app/notifications.tsx` | 1,941 | Delete | — | — |
| `app/settings/index.tsx` | 335 | Replace | `(v2)/settings/index.tsx` | — |
| `app/settings/account.tsx` | 2,420 | Replace | Real account screen (Phase 0 minimal → v2) | — |
| `app/settings/notifications.tsx` | 1,754 | Replace | `(v2)/settings/notifications.tsx`: brief day/time, quiet hours, lock-screen detail, pause all | — |
| `app/settings/privacy.tsx` | 609 | Replace | `(v2)/settings/knows.tsx` What Kinship knows + sources + export + delete | exportService rewritten |
| `app/settings/privacy-policy.tsx`, `terms.tsx` | 352 | Keep (content rewritten for 2.0 data flows) | — | Legal review |
| `app/settings/about.tsx` | 351 | Adapt | Short, typographic | — |
| `app/settings/_layout.tsx` | 21 | Replace | — | — |
| `app/_layout.tsx` | 191 | Adapt | Fonts, providers (Auth, DB, Flags, Analytics, Sentry), shell switch | — |
| `app/+not-found.tsx` | 26 | Keep (restyle) | — | — |
| **New** | — | — | `(v2)/brief/[id]` (Next), `(v2)/letter/[month]` (Next), `(v2)/ask` (Next), `(v2)/people` visualization (Phase 6; Garden, Landscape or Hybrid chosen at the §34 checkpoint), `(v2)/_lab` (hidden) | — |

The full component, engine and dependency list is in `KINSHIP_2_DELETION_PLAN.md`.

---

## 21. Native capture surfaces

| Surface | User value | Effort | Native code | Privacy risk | Platform constraint | Offline | Test burden | Recommendation |
|---|---|---|---|---|---|---|---|---|
| **Voice (in-app Tell)** | Very high: 15-second capture after dinner | M (1–1.5 wk) | Yes: `expo-speech-recognition` (SFSpeechRecognizer) via config plugin; dev build (already in `eas.json`) | Low if `requiresOnDeviceRecognition: true`; high if a server fallback exists | On-device needs iOS 17+ for this module path and a supported locale/device (`supportsOnDeviceRecognition()` at runtime); iOS 26 `SpeechAnalyzer` is on-device by design but needs a custom module and per-locale model download | Works offline when on-device | Medium: devices × locales matrix | **V1-beta (week 3 of beta, flag `voice_capture`)**, on-device required, typing offered when unavailable. Spike `SpeechAnalyzer` for iOS 26 as a Next upgrade |
| **Siri / App Intent ("Tell Kinship …")** | High for hands-busy capture | M–H | Swift App Intent target via config plugin (e.g. `@bacons/apple-targets`) plus an App Group to hand text to the app | Low: dictation handled by Siri | Intent runs in the extension; must write to a shared container, not call the network directly | Queues to the App Group, synced on next launch | Medium | **Next** |
| **Action Button** | High for a small set of users (iPhone 15 Pro+) | Low once the App Intent exists | Same intent | Low | Hardware-limited | Same | Low | **Next** (free with Siri intent) |
| **Widget** | Medium: Today's line at a glance, a tap to Tell | H | WidgetKit target, App Group, timeline refresh | **Medium:** a widget shows content on the home and lock screen; must follow `lockscreen_level` | Refresh budget; no live data | Shows last snapshot | High (sizes, lock-screen variants) | **Later** |
| **Share Extension** | High: news lives in chats and screenshots | H | Share extension target; on-device OCR via Vision for screenshots | **High:** other people's words; must keep only confirmed items and not store the screenshot | Memory limits in extensions (~120 MB); no heavy JS | Queues to the App Group | High | **Next** (after Siri; strict "don't store image" default) |
| **Photo input** | Medium: shared moments with photos | M | Picker (exists) + private Storage + EXIF strip | **High:** faces, locations | Only user-picked photos; no library scanning | Upload queued | Medium | **Later** |

---

## 22. Notifications and background intelligence

Kinship must work while it is closed. All of this is server-side, on `pg_cron` + `pgmq` + edge functions + the Expo Push Service (APNs underneath).

```
pg_cron (every 15 min) ─▶ planner(fn): for users whose local time crosses a planning slot
        │                    ├─ refresh candidates (§13) for people with changed items
        │                    ├─ pick pushes under policy → notification_outbox (dedupe_key, send_at)
        │                    └─ enqueue reason copy generation (Batch nightly; on-demand if due < 2 h)
pg_cron (every minute) ─▶ sender(fn): due outbox rows → Expo push API (batched 100) → notification_log
pg_cron (every 15 min) ─▶ receipts(fn): Expo receipts → mark failed tokens → devices.disabled_at
DB triggers ─▶ cancel: reason resolved/dismissed/evidence retracted → outbox row cancelled if not sent
```

| Concern | Rule |
|---|---|
| **Tiers** | **Tier 1: time-sensitive push** (surgery tomorrow, birthday today, event follow-up the morning after): ≤ 2 per week. **Tier 2: weekly brief push**: 1 per week on the user's day and time (default Sunday 6 pm local), and it opens Today plus the brief list. **Tier 3: in-app only**: reconnect, plans, year-ago, reviews. |
| **Budget** | ≤ 3 pushes per rolling 7 days in total (D4). Tier 1 can pre-empt the brief (the brief then skips that item). |
| **Quiet hours** | Default 21:00–08:00 local; a Tier 1 push due inside them moves to 08:00, or to 07:30 on the event day for a before-event push. |
| **Timezone** | `user_settings.timezone` updated from the device on every launch; all windows are computed in local time; travel is handled by the latest timezone. |
| **Dedupe** | `dedupe_key = type:person:evidence_item:window_start`; unique in the outbox. |
| **Retries** | Expo 5xx → 3 retries with backoff; invalid token → disable the device. |
| **Cancellation** | Trigger on reason state change; the sender re-checks the reason state just before sending. |
| **Feedback & back-off** | Opened → acted → done is logged. Two consecutive ignored Tier 1 pushes halve the weekly budget for 2 weeks. Three "not helpful" on one type mutes that type. "Pause everything" stops all sends immediately (server flag, checked at send). |
| **Lock screen** | `user_settings.lockscreen_level`: `private` (default: title "Kinship", body "Something for today" / "Something for tonight") · `names` ("About Ben") · `full` (headline). Sensitivity ≠ none is always `private`. Notification copy passes the banned-word validator server-side. |
| **Distinguish** | Time-sensitive: "Tom's surgery is tomorrow" (at `full`), sent the day before at 6 pm. Weekly brief: "Your week with your people", which lists "Football season starts Saturday: Chris?" inside the app, never on the lock screen. |
| **Permission** | Ask for notifications after the first real moment exists (end of onboarding if a birthday is within 14 days, else after the first extracted event). |

---

## 23. Analytics without surveillance

Analytics records events with enums, ids that are random per install, and coarse numbers. **It never sends names, notes, statements, message copy, contact data, search terms, reason text or free-text feedback.** The client has a typed `track(event, props)` whose prop types are closed unions and bounded ints, so a string prop can't be added without a schema change reviewed for privacy. The same schema is used by a server-side sink for server events.

| Event | Props (all content-free) |
|---|---|
| `capture_started` | `source` |
| `capture_completed` | `source`, `chars_bucket` (0–50/51–200/201+), `offline` |
| `extraction_completed` | `items_n`, `tier` (auto/light/clarify), `latency_ms_bucket`, `model_id` |
| `extraction_corrected` | `correction` (person/date/kind/relation/removed), `item_kind` |
| `clarification_answered` / `_dismissed` | `type` |
| `undo_capture` | — |
| `reason_surfaced` | `reason_type`, `surface` (today/push/brief), `score_bucket` |
| `reason_dismissed` | `reason_type`, `mode` (not_now/not_helpful) |
| `handoff_opened` | `reason_type?`, `channel` |
| `return_check_answered` | `answer` (yes/not_yet), `minutes_since_handoff_bucket` |
| `reason_marked_done` | `reason_type` |
| `reason_feedback` | `useful` (yes/no) |
| `incorrect_report` | `what` (person/fact/date) |
| `brief_viewed` (Next) | `lines_n` |
| `push_sent` / `push_opened` | `tier` |
| `settings_changed` | `key` (enum), no value for text settings |
| `deletion_completed` | `scope` (item/capture/person/account) |
| `consent_changed` | `scope`, `granted` |

Tool choice: PostHog (EU or US cloud) with IP capture off, autocapture off and session replay off, or a first-party Supabase table. Either works with this schema. Crash reporting uses `@sentry/react-native` with `beforeSend` scrubbing breadcrumbs of any string over 20 characters and all request bodies. Beta users see this list in Settings, under "What we measure".

---

## 24. Metrics

### The North Star: a *showing-up moment*

A **showing-up moment** is counted when all of these hold:

1. Kinship surfaced a reason, brief or reconnect for person P (in Today, a push or a brief).
2. Within 72 hours, at least one of the following happened:
   - the user answered **Yes** to "Did you reach P?",
   - the user tapped **Done** on that reason,
   - or the user created a capture about P whose extraction includes a `moment` or contact.

Opening Messages alone doesn't count. The confirmation work is at most one tap, and it's always optional; unanswered means not counted.

**North Star metric:** showing-up moments per activated user per month. **Health view:** the share of weekly active users with at least one showing-up moment in the past 28 days.

| Group | Metric | Target (beta hypothesis) |
|---|---|---|
| **Activation** | Onboarding done with ≥ 8 people | ≥ 70% of sign-ups |
| | First Tell within 24 h | ≥ 60% |
| | First reason surfaced within 7 days | ≥ 80% (birthdays help) |
| | First showing-up moment within 14 days | ≥ 40% |
| **Quality** | Captured items kept without edit | ≥ 85% |
| | Reason "useful" yes-rate (when asked) | ≥ 70% |
| | Reasons acted on within 72 h | ≥ 25% |
| | Follow-through: dated events/promises followed up | ≥ 40% |
| **Trust guardrails** | "Wrong person" reports | ≤ 1 per 500 captures |
| | Pushes per user per week | ≤ 3 (hard) · median ≤ 1.5 |
| | Mute/pause-all rate after a push | ≤ 5% of pushes |
| | Uninstall within 24 h of a push | tracked; any spike stops rollout |
| | Deletion requests completed ≤ 60 s | 100% |
| **AI accuracy guardrails** | Production wrong-subject reports | 0 tolerated without investigation |
| | Hallucinated-item reports | ≤ 1 per 1,000 items |
| | Clarifications per capture | ≤ 0.15 |
| **Do NOT optimize** | DAU, time in app, sessions per day, screens per session, push open rate, number of captures per person, streaks, number of people added, reasons shown | Watched only as warning lights; rising time in app is a regression |

---

## 25. Feature flags and rollout

The flag service is first-party: a `feature_flags` table (key, default, rollout %, allowlist) plus `user_flag_overrides`, read once at launch, cached in SQLite, and refreshed on foreground. Server functions read the same table, so a flag is enforced on both sides. A flag never gates a *half* surface. Mixed-system flags are forbidden: only `shell_v2` chooses between systems.

| Flag | Gates | Server enforced | Default in beta |
|---|---|---|---|
| `shell_v2` | Entire 2.0 app shell vs 1.0 | — | on |
| `memory_v2` | New schema read/write paths and gateway extraction writes | yes | on (required by shell_v2) |
| `tell` | Tell entry points | — | on |
| `ai_extraction` | `relationship_extract` (else raw captures + deterministic dates) | yes | on (per consent) |
| `relationship_page_v2` | New person page (inside v2 only; kill-switch to a read-only item list) | — | on |
| `today` | Today candidates and UI | yes | on |
| `reasons_engine` | Server candidate generation + copy | yes | on |
| `push_delivery` | Server push sending (kill switch) | yes | on |
| `weekly_brief` | Tier 2 push | yes | on |
| `voice_capture` | Mic in Tell | — | off → on at beta wk 3 |
| `sprig_marks` | Algorithm C marks | — | off |
| `garden_view` | Post-validation People visualization (Garden, Landscape or Hybrid; the concept is chosen at the §34 checkpoint) | — | off |
| `calendar_briefs` | Calendar permission + briefs + post-encounter prompt | yes | off |
| `reconnect` | Reconnect candidates + openers | yes | off |
| `ask_kinship` | `retrieval_answer` | yes | off |
| `monthly_letter` | `reflection_generate` | yes | off |
| `native_siri`, `native_share`, `native_widget` | Native targets (compiled in, flag-gated at runtime) | — | off |

**Rollout:**

| Ring | Who | Size | Entry gate |
|---|---|---|---|
| **Internal** | Founders + builders, dev builds | 2–5 | Phase 0 exit; slice demo passes |
| **Alpha** | Trusted friends who will be interviewed weekly, TestFlight | 8–12 | Eval thresholds met; 7 days of internal use with 0 wrong-subject reports; deletion E2E green |
| **Cohort 1 (beta)** | Recruited target users (§30), TestFlight | 30–50 | 2 weeks of alpha with guardrails green |
| **Cohort 2** | Waitlist expansion | 150–300 | Beta gate passed (§30) |

A kill switch exists for every server-enforced flag, taking effect in under 1 minute with no app update. OTA updates (`expo-updates`, already configured) are used for JS fixes within the same runtime version.

---

## 26. Testing strategy

Correctness and trust come first. Every Phase 0 defect gets a regression test before its fix merges.

| Layer | Tooling | What is proven | Runs |
|---|---|---|---|
| **Schema** | `supabase db reset` + pgTAP (`supabase test db`) | Tables, constraints (e.g. item must have a source), `CHECK` per kind, triggers stamp `updated_at`, tombstones | CI every PR touching `supabase/` |
| **RLS** | pgTAP with two seeded users, anon, and service role | Cross-user read/insert/update/delete denied on every table, including child rows referencing another user's person; anon denied everywhere; `rls_auto_enable` not executable | CI |
| **Edge functions** | Deno test + local Supabase | Auth (anon key, anonymous, expired → 401), consent, quota, validation, generic errors, grounding validator, provenance required | CI |
| **Repositories** | Jest + `expo-sqlite` mock (better-sqlite3 in Node) | CRUD, outbox ordering, idempotent replays, version conflicts, no fallbacks | CI |
| **Sync** | Jest with a fake server | Pull cursor paging, tombstones, conflict re-pull, offline queue flush, >30-day full resync | CI |
| **Account switch** | Jest integration + Maestro | A → sign out → B sees zero A data; DB file for A deleted; push token unregistered | CI + nightly device |
| **Deletion** | Deno + pgTAP + Maestro | Item/capture/person/account semantics exactly as §5; post-delete counts 0; storage prefix empty | CI + nightly |
| **Extraction evals** | `scripts/evals/run.ts` (Deno) over `evals/**.jsonl`; thresholds §10 | All §10 metrics | Labelled PR job (costs money) + nightly on main |
| **Provenance** | Deno + Jest | Every surfaced reason's evidence has ≥1 source; Source view resolves spans; supersede/merge/edit keep lineage | CI |
| **Candidates/ranking** | Jest, table-driven with fixed clocks | Windows per type, DST/timezone edges, "Nothing needs you today" at threshold, no gap-only reasons, person cap | CI |
| **Notifications** | Deno with fake Expo API + fixed clocks | Budget, quiet hours, dedupe, cancellation, back-off, lock-screen minimization, pause-all | CI |
| **Person resolution** | Eval set + Jest for deterministic stages | Exact/nickname/identity matching; asks on ties | CI |
| **E2E core loop** | Maestro on iOS simulator (dev build) with a stubbed gateway plus one nightly run against the real model | The §29 slice from Tell to return check | Nightly + before each TestFlight |
| **Accessibility** | `@testing-library/react-native` role/label assertions; manual VoiceOver script per release; Dynamic Type screenshots at XS/L/AX3 | All v2 components labelled; no truncation; contrast tokens ≥ 4.5:1 (unit test computes contrast from tokens) | CI + release checklist |
| **Reduce Motion** | Jest mocking `AccessibilityInfo.isReduceMotionEnabled` | No sway, no draw, 150 ms fades only | CI |
| **Sprig visual regression** | Jest path snapshots + resvg raster diff + area-variance property test (§19) | Determinism; "no quantity" guarantee | CI |
| **Static** | `tsc`, ESLint (with new privacy/tokens rules), `npm audit --audit-level=high`, `expo-doctor` | | CI |

CI is GitHub Actions: `ci.yml` (typecheck, lint, unit, pgTAP, Deno), `evals.yml` (labelled/nightly) and `e2e.yml` (nightly, macOS runner).

---

## 27. Target architecture

```
┌──────────────────────────────────── iOS app (Expo SDK 54, RN 0.81, Expo Router) ────────────────────────────────────┐
│  app/(v2)/…  Screens: layout + composition only. No fetching, no business rules, no supabase import (lint-enforced) │
│        │                                                                                                            │
│        ▼                                                                                                            │
│  src/features/*/hooks  view models (useToday, usePerson, useTell)  ── read via repositories, subscribe to changes   │
│        │                                                                                                            │
│        ▼                                                                                                            │
│  src/domain/   pure TS: kinds, zod schemas, statement formatting, certainty copy, date utils, sprig generator       │
│  src/data/repositories/  PeopleRepo · CaptureRepo · MemoryRepo · ReasonRepo · SettingsRepo · FlagRepo               │
│        │ read/write                                          ▲ change events                                         │
│        ▼                                                     │                                                       │
│  src/data/local/  SQLite (SQLCipher, per-user file) + outbox ── src/data/sync/SyncEngine (push outbox, pull cursors) │
│  src/platform/  speech · contacts · handoff links · notifications registration · secure store · analytics · sentry  │
└─────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                                          │ HTTPS (JWT) · Realtime "changed" pings
┌─────────────────────────────────────────── Supabase ────▼──────────────────────────────────────────────────────────┐
│  Postgres (RLS on every table)  people · captures · memory_items · memory_item_sources · related_people · reasons  │
│                                 interactions · user_settings · consents · devices · notification_outbox/log · flags │
│  Edge functions:  ai-gateway (sync capabilities) · ai-worker (pgmq consumer, Batch API) · planner · sender ·         │
│                   receipts · delete-account · export                                                               │
│  pg_cron · pgmq · Storage (private photos, Later) · Vault (Anthropic key, Expo access token)                       │
└──────────────┬───────────────────────────────────────────────────────────────┬────────────────────────────────────┘
               ▼                                                               ▼
        Anthropic API (Opus 5.5 / Sonnet 5.5 / Haiku 4.5)             Expo Push Service → APNs
```

The intelligence path:

```
Capture ─▶ AI gateway (extract · resolve · dates · validate · ground) ─▶ structured memory (items + sources)
        ─▶ candidate engine (deterministic rules, windows, ranking) ─▶ notification policy (tier, budget, quiet hours,
           lock-screen level, dedupe) ─▶ Today (in-app)  /  push (outbox → sender)
```

**Ownership boundaries:**

| Layer | Owns | Must not |
|---|---|---|
| Screens (`app/(v2)`) | Layout, navigation, calling hooks | Fetch, compute reasons, format provenance, touch SQLite or Supabase |
| Feature hooks | Composing repository reads into view models; UI state | Business rules beyond view shaping |
| Domain (`src/domain`) | Pure logic shared with the server (statement formatting, certainty copy, schemas, sprig) | Import React Native or I/O |
| Repositories | The only read/write API for data; the outbox | Fall back to other data; swallow errors |
| Sync engine | Moving rows; conflict detection | Interpret memory |
| Gateway / worker | AI capabilities, grounding, provenance enforcement | Be called for deterministic work |
| Candidate engine (server) | Reasons, windows, ranking | Call models for candidate selection |
| Notification policy (server) | Whether, when and how private a push is | Generate copy |

The domain code shared between the app and Deno lives in `packages/domain/` (plain TypeScript, no platform imports). The app imports it through a path alias; edge functions import it by relative path in the bundle.

---

## 28. Build sequence

The design direction's order starts with the look (tokens → sprig → Tell). The audit's order starts with trust. The dependencies say: trust and schema first, then **one vertical slice through everything**, then breadth. Visual language ships *with* the first surfaces, never as a separate reskin. The Garden never blocks validation.

```
Week:        1    2    3    4    5    6    7    8    9    10   11   12   13   14   15   16   17   18
Phase 0      ████████                                                     trust + observability + CI
Phase 1           ██████████████                                          schema v2 · repos/sync · gateway · evals v1 · tokens/components · sprig B
Phase 2                          ██████████                               ★ vertical slice (internal flag)
Phase 3                                    ███████████████                onboarding · person page · all V1 reasons · Today · nav swap · push · return check · deletion of 1.0
Phase 4                                                   █████           alpha (8–12)
Phase 5                                                        ███████████████████████  beta cohort 1 (30–50), 8 weeks
  └ voice                                                                 ████  (beta wk 3)
Phase 6                                                                                 decided at the beta gate: briefs · reconnect · Garden · native · Ask · letter
```

| Phase | Weeks | Delivers | Exit gate |
|---|---|---|---|
| **0: Trust & observability** | 1–2 | §12 fixes + tests, merged AI hardening, Expo patch upgrade, CI, Sentry, analytics client, flag service, baseline migration, advisors clean | All Phase 0 proofs green |
| **1: Foundations** | 2–4 | Schema v2 + RLS + pgTAP; generated types; SQLite + repositories + sync; `ai-gateway` with `relationship_extract`, `person_resolve`, deterministic dates; eval set v1 (≥300 fixtures) passing; tokens, fonts, Moment/Row/Token/Pill/Sheet/TellField/Provenance; sprig (Algorithm B); `_lab` | Evals ≥ thresholds on core + ambiguity; lab sign-off |
| **2: Vertical slice** | 4–6 | §29 end-to-end on device behind `shell_v2` for internal users | Slice acceptance list passes; learnings recorded |
| **3: Core loop complete** | 6–9 | Onboarding v2 (contacts multi-select + birthdays + consent + notification ask); relationship page + What Kinship knows + Source view; all V1 candidate types; Today; Today/People nav; server push (planner/sender/receipts), weekly brief, lock-screen levels; hand-off for 5 channels + return check; settings; export; real deletion; delete 1.0 shell code behind flag default | Internal use 7 days, 0 wrong-subject; E2E green |
| **4: Alpha** | 9–10 | 8–12 users | Guardrails green 2 weeks |
| **5: Beta** | 10–18 | 30–50 users, 8 weeks; voice at week 3; weekly interviews | §30 gate |
| **6: Next, by evidence** | 18+ | Ordered by what the beta shows: calendar briefs + post-encounter → reconnect → Share/Siri → visualization design checkpoint (§34: Garden vs Landscape vs Hybrid), then the chosen view + sprig marks → Ask → monthly letter | Each behind its flag, same ring rollout |

**Why this order:**
- The schema has to come before Tell, because capture without structured memory recreates 1.0.
- The slice comes before breadth, because it retires the biggest risks (extraction quality, provenance UX, reason timing) with about 3 weeks of work.
- Push comes before the beta, because the thesis depends on arriving while the app is closed.
- Voice comes inside the beta, not before it, because text proves the loop and voice's lift can then be measured.
- The Garden comes after, because it's delight with a known risk (T5) and no proof value.

---

## 29. The vertical slice

**Scenario.** On Thursday Oct 8 the user types into Tell, from Ben's page or from Today: *"Ben runs Chicago Sunday. He's hoping to break four hours."*

| Step | What happens | Exercises |
|---|---|---|
| 1 | Capture written locally (<100 ms "Kept"), synced, `ai-gateway relationship_extract(capture_id)` | Tell, CaptureRepo, outbox, gateway auth/consent/quota |
| 2 | Extracts: Event `race` "Ben runs the Chicago Marathon" date Sun Oct 11 (resolved deterministically from "Sunday" + Oct 8 + tz), certainty `stated`, follow-up `after`; Fact/thread "Ben is hoping to finish under four hours" (attached as event detail `goal`); person Ben resolved uniquely → **auto-save tier** | Extraction schema, date resolver, person resolution, confidence tiers |
| 3 | Summary toast "Kept: Ben runs Chicago · Sun, Oct 11"; user taps it, changes nothing, or taps the date token to test correction | Token, DatePicker, `user_edit` provenance, Undo |
| 4 | Ben's page shows under **Coming up**: "Chicago Marathon · Sun, Oct 11", with "You told Kinship · Oct 8" → Source view highlights "Ben runs Chicago Sunday" | Relationship page, Provenance, SourceView, sync pull |
| 5 | Candidate engine creates `event_followup` with window Mon Oct 12 07:00–Tue 20:00; nightly batch phrases "Ben ran Chicago yesterday." + mention "His goal was under four hours" (grounded) | Candidate rules, ranking, `reason_generate` Batch, grounding validator, template fallback |
| 6 | Monday 08:00 local: Tier 1 push at `private` level "Something for today"; Today's primary Moment shows the sentence with Ben's sprig | Planner, outbox, sender, lock-screen policy, Today, Moment, Sprig |
| 7 | "Ask how it went" → follow-up sheet → **Open Messages** (`sms:`), nothing pre-filled | Sheet, handoff, `handoff_opened` |
| 8 | Returning within 12 h: "Did you reach Ben? Yes · Not yet" → Yes → interaction logged (`return_check`), reason `done`, "Anything worth remembering?" → user says "3:52! He's already talking about Boston." → new moment + thread (Boston) | Return check, interactions, post-handoff capture, extraction with dossier merge |

**What building it teaches us:**
1. Real extraction latency and cost per capture on the chosen model and effort, and whether auto-save feels trustworthy or reckless.
2. Whether provenance lines are legible and tappable at Newsreader sizes on a small phone.
3. Whether day-after timing and the lock-screen privacy level feel thoughtful or intrusive: the core emotional bet.
4. Whether the sync, outbox and Realtime approach gives a sub-second "it's on Ben's page" feeling.
5. The true shape of the candidate engine interface before seven more reason types are written against it.
6. Whether a return check with one tap gets answered (the North Star depends on it). If answer rates are under 40% in internal use, the measurement design changes before the beta.
7. Whether the component vocabulary is sufficient without a Card.

**Explicitly faked in the slice:** onboarding (seeded people), the weekly brief, settings, and every other reason type.

---

## 30. Beta strategy

| Item | Recommendation |
|---|---|
| **Cohort size** | Alpha 8–12, then beta cohort 1 of **40** (range 30–50) activated users. Recruit 55–60 to allow for no-shows. |
| **Who** | The audit's first user: 28–45, 8–25 people who matter across cities, self-described forgetful or ADHD-leaning, iPhone on iOS 17+. Exclude super-connectors (>100 active relationships) and people recruited only as friends of the founders (≤ 25% of the cohort). |
| **Length** | 8 weeks, with voice turned on at week 3 (text-only weeks 1–2 give a baseline). |
| **Onboarding** | TestFlight invite → a 20-minute 1:1 video onboarding for the first 15 (observe the setup live), self-serve for the rest. A written privacy explainer before install. |
| **Interview cadence** | Week 1 (setup), week 3 (voice), week 6 (habit), week 8 (exit): 30 min each for 15 users; 5-question async check-ins for the others at weeks 2, 4, 6. A diary prompt when a showing-up moment happens ("What happened? 1 sentence"), optional. |
| **In-app feedback** | "Useful? Yes · No" on at most 1 in 3 reasons; "Report something wrong" on every item (person/fact/date, no free text required); a shake-to-report screenshot flow with content redaction; a "What we measure" page. |
| **AI accuracy monitoring** | Daily dashboard: corrections by type, clarification rate, wrong-subject reports (each one triaged within 24 h with the user's permission to view that capture), refusal rate, latency/cost. Any wrong-subject report pauses auto-save for that pattern until a fix and eval case land. |
| **Privacy feedback** | Week 1 and exit interview: "What do you think Kinship sends, and to whom?" (comprehension test); "Anything you decided not to tell Kinship? Why?"; lock-screen level chosen; any consent withdrawals. |
| **Monetization research (D10)** | Beta cohort 1 is free; no payment details. Pricing is researched in **weeks 6–8**, after users have had real Kinship moments, never in onboarding. (1) Unaided expected price, asked right after a showing-up moment. (2) Reactions to $2.99 / $4.99 / $7.99 a month. (3) Annual vs monthly preference. (4) "Would you keep this running every month?" (continuous-subscription fit). (5) Which parts feel worth paying for. (6) What would make you cancel. Prefer realistic choice exercises over hypotheticals: a plan-selection screen with real prices, including a "reserve the founding price" option that charges nothing (BETA-06). |
| **Qualitative questions** | "Tell me about the last time Kinship brought something back. What did you do?" · "Did anything feel like nagging or judging?" · "Look at your People list. What do the little plants mean to you?" (tests T1: any answer mentioning "more/bigger/healthier" = redesign) · "When did you *not* tell Kinship something you knew?" · "If Kinship disappeared tomorrow, what would you miss?" |

### Gate criteria (at week 8)

| Evidence | Decision |
|---|---|
| ≥ 40% of activated users had ≥ 2 showing-up moments; reason useful-rate ≥ 70%; guardrails green; ≥ 50% of interviewees can describe a specific moment they'd have missed | **Continue**: begin Phase 6 in evidence order, expand to cohort 2 |
| 20–40% with ≥ 2 moments, and interviews show capture happening but reasons arriving at the wrong time or with the wrong content | **Change the loop**: iterate on windows, candidate types, delivery (e.g. brief-first vs push-first) for 4 more weeks before building features |
| Captures < 1 per user per week after voice, and interviews say "I forget to tell it" | **Change the input**: pull the post-encounter/calendar prompt and share sheet forward; test a concierge variant |
| Moments happen, but users with ADHD traits churn while planners stay (or the reverse) | **Change the target user** to the segment that retained; revisit tone and push budget |
| A feature shows < 10% use and no interview mentions it (e.g. voice, year-ago, weekly brief) | **Stop investing** in that feature; keep it only if cost is zero |
| Median expected price well below $2.99, or most users say they wouldn't keep it running monthly | **Revisit the business model** before public launch (D10); the thesis may still hold for a different model |
| < 20% with ≥ 1 moment, or trust guardrails breached | **Stop and rethink the thesis** (the audit's pivot rule, tightened) |

---

## 31. Cost model

All figures are **approximate** monthly costs, to be recalibrated with beta telemetry. Model prices are Anthropic first-party list prices as of 25 September 2026:

| Model | Input $/MTok | Output $/MTok |
|---|---|---|
| Opus 5.5 | 4 | 20 |
| Sonnet 5.5 | 2 | 10 |
| Haiku 4.5 | 1 | 5 |

Batch is 50% off, and cache reads are about 0.05–0.1× input. Supabase and storage figures are rough list-price estimates; verify them before budgeting.

**Assumptions per active user per month:**
- 60% of registered users are active.
- 12 captures per active user (3 a week). An extraction uses about 5k input tokens (2.5k cached system/schema) and about 1k output, including low-effort thinking.
- Person resolution by model on 10% of captures.
- 12 reasons phrased by Batch (2k in, 0.3k out).
- When shipped: 4 briefs (3k/0.4k), 5 Ask questions (6k/0.4k) and 1 monthly letter by Batch (5k/0.5k).
- Voice is transcribed on the device at $0.

| Per active user / month | Opus 5.5 everywhere | Sonnet 5.5 for extraction + reasons (if evals allow) |
|---|---|---|
| Extraction (12) | $0.37 | $0.19 |
| Person resolution | $0.02 | $0.01 (Haiku) |
| Reason copy (Batch, 12) | $0.08 | $0.04 |
| **V1 subtotal** | **≈ $0.47** | **≈ $0.24** |
| Briefs (Next) | $0.08 | $0.08 |
| Ask Kinship (Next) | $0.16 | $0.08 |
| Monthly letter (Next, Batch) | $0.02 | $0.02 |
| **With all Next features** | **≈ $0.73** | **≈ $0.42** |
| Cloud transcription (only if a fallback were added; ~10 min at a typical ~$0.006/min market rate) | +$0.06 | +$0.06 |

| Registered users | Active | AI (V1, Opus → Sonnet) | AI (all Next) | Supabase | Push / storage / other | **Total per month (V1 → all)** |
|---|---|---|---|---|---|---|
| 100 | 60 | $28 → $14 | $44 → $25 | $25 (Pro) | ~$0 (Expo push free; no photos) + Sentry/PostHog free tiers | **≈ $40–70** |
| 1,000 | 600 | $280 → $145 | $440 → $250 | $25–75 (Pro + small compute) | ~$30 (Sentry team tier) | **≈ $200–550** |
| 10,000 | 6,000 | $2.8k → $1.4k | $4.4k → $2.5k | $150–400 (larger compute, edge invocations over quota) | ~$150 (analytics volume, photos if launched: 6k × 20 × 0.3 MB ≈ 36 GB ≈ $1) | **≈ $1.7k–5k** |
| 100,000 | 60,000 | $28k → $14.5k | $44k → $25k | $1.5k–3k (XL compute, read replica, egress) | ~$1k–2k (analytics, Sentry, storage ~360 GB) | **≈ $17k–49k** |

**Expensive:** extraction (scales with capture volume; the biggest line), Ask (long context), anything on-demand with Opus at higher effort.

**Cheap:** reason copy (Batch, short), candidate generation and ranking (SQL), notifications (Expo push is free), dates and merges (deterministic), voice (on device).

**Levers, in order:**
1. Prompt caching of the stable prefix (a 30–50% cut on input).
2. Move extraction to Sonnet 5.5 if evals hold (−50%).
3. Batch everything not interactive.
4. Skip extraction for trivially short captures that the deterministic pass fully handles.
5. The per-user daily quota (50 calls) caps abuse at about $1.50 per user per day on Opus.

**Business implication (D10):** V1 AI cost is roughly $0.25–0.50 per active user per month, and about $0.42–0.73 with the Next features. Against the working price hypotheses ($4.99 a month or ~$39.99 a year standard; $2.99 or ~$24.99 founding), AI plus infrastructure stays well under 20% of revenue per paying user even for heavy users. That supports a single subscription for Kinship's ongoing intelligent service (AI understanding, proactive Today, reasons, follow-ups, voice). There are no per-feature gates or people limits. Non-subscribers keep an archive they can browse, export and delete; the AI and proactive service pauses. Beta cohort 1 is free; pricing is researched late in the beta (§30). Entitlement checks, when built, sit only in the gateway, reasons engine and push planner, never in read, export or delete paths. Store prices are not hardcoded.

---

## 32. Parallel workstreams

| Workstream | Can start | Owns (write access) | Depends on |
|---|---|---|---|
| **W1: Trust & backend security** | Day 1 | `supabase/functions/ai-insight`, `delete-account`, `export`; 1.0 hooks/AuthProvider fixes; advisors | — |
| **W2: Schema & sync** | Day 1 (design), week 2 (build) | `supabase/migrations/*` (**sole owner**), `packages/domain/schemas`, `src/data/**` | W1 baseline migration |
| **W3: AI gateway & evals** | Day 1 (evals), week 2 (gateway) | `supabase/functions/ai-gateway`, `ai-worker`, `_shared/prompts`, `evals/**`, `scripts/evals/**` | W2 item schema (zod) for writes |
| **W4: Quiet Herbarium design system** | Day 1 | `src/design/tokens.ts`, `src/ui/**` (components), fonts, `app/(v2)/_lab.tsx` | — |
| **W5: Sprig research** | Day 1 | `src/ui/sprig/**`, `tests/sprig/**` | W4 tokens (colour only) |
| **W6: Capture UX** | Week 3 | `app/(v2)/tell.tsx`, extraction sheet, Token pickers, `src/features/tell/**` | W2 repos, W3 gateway contract, W4 components |
| **W7: Today, reasons, notifications** | Week 3 (engine), week 5 (UI) | `supabase/functions/_shared/reasons`, `planner`, `sender`, `receipts`, `app/(v2)/(main)/today.tsx`, `src/features/today/**` | W2, W3 (`reason_generate`) |
| **W8: Analytics & observability** | Day 1 | `src/platform/analytics.ts`, `src/platform/sentry.ts`, `.github/workflows/**` (**sole owner**) | — |

**Serialize these; never let two agents edit them at the same time:**

| Hotspot | Why | Rule |
|---|---|---|
| `supabase/migrations/` | Ordering and timestamps; the live DB | W2 only; one migration per PR; generated types regenerated in the same PR |
| `src/types/database.generated.ts` | Generated | Never hand-edited; regenerated by W2 |
| `packages/domain/schemas/*` | Shared by app and gateway | W2 owns; W3 and W6 propose by PR |
| `app/_layout.tsx`, `app/(v2)/_layout.tsx`, `app/(v2)/(main)/_layout.tsx` | Providers and navigation | One owner per sprint (W6 in Phase 2, W7 in Phase 3) |
| `package.json`, `package-lock.json`, `app.json`, `eas.json` | Native deps force new dev builds | W8 merges dependency PRs; batch native changes weekly with one dev-build cut |
| `src/design/tokens.ts` | Everything reads it | W4 only |
| `eslint.config.js` | Lint rules affect every PR | W8 only |
| `supabase/functions/_shared/registry.ts` (capability registry) | Gateway contract | W3 only |

---

## 33. Final test

| Question | Answer | Why |
|---|---|---|
| **Will the user do less work than today?** | **Yes.** | Setup goes from ~90 taps for 15 people to one multi-select. Six capture forms become one sentence. Manual logging is gone: interactions come from a one-tap return check or a capture. Garden Walk, Seasons and emotion chips are deleted. |
| **Will Kinship remember more useful context?** | **Yes.** | Every capture yields typed, dated items with certainty and subject. 1.0 kept a notes array and counts. Promises are detected in every capture, not just quick notes. |
| **Will every important insight be traceable to a source?** | **Yes.** | Items need a source row (enforced by a DB constraint and the gateway). Reasons carry evidence ids and pass a grounding validator. Synthesized text is never stored as memory. |
| **Will the app create fewer but better reasons to connect?** | **Yes.** | A 7-type template waterfall becomes grounded candidates with windows. There are no generic or gap-only reasons, and "Nothing needs you today" is valid. Pushes are capped at 3 a week with back-off. |
| **Will it feel unmistakably Quiet Herbarium without the garden becoming a relationship score?** | **Yes.** | Serif moments, ochre tokens with footnote provenance, and a sprig on every person ship in V1. The sprig is identity-only (Algorithm C, marks off until tested). There is no relevance sort, no season-presence Garden in V1, and a CI property test guarantees sprig size doesn't grow with history. |

The target is not Kinship 1.0 with AI and prettier plants. The plan deletes 16 of 1.0's 40 route files outright and replaces most of the rest, replaces its data model, and ships a product whose best day is a sentence, a door out, and a friend who felt remembered.

---

## 34. Post-validation visualization: Garden, Landscape or Hybrid

*Added 1 October 2026 at Thor's direction. This is a future product and design note. It changes nothing in Phase 0 or on the V1 critical path, and no production code for it is written before the design checkpoint below.*

**The Garden decision is reopened, not settled.** When the roadmap reaches post-validation visualization work, the team does **not** build the previously proposed Garden view by default. It stops, prototypes three concepts, and brings a design checkpoint for review.

**Unchanged:** The Quiet Herbarium remains the approved design language. It defines typography, restraint, botanical identity, sprigs, Today, relationship pages, provenance, Tell and the overall emotional tone.

**Working hypothesis:** Quiet Herbarium is the design language. Relationship Landscape may become the way users see their wider social world.

| Surface | Question it answers |
|---|---|
| Today | What matters right now? |
| Relationship page | What matters about this person? |
| **Relationship Landscape** (candidate) | **How do the people in my life fit together?** Where they come from, and the chapters and communities we share. |

### The semantic rule (non-negotiable)

If a Landscape is ever built, **position means membership or belonging, never strength.** Distance must not represent closeness, importance, recency or relationship health. The visualization must not become another hidden relationship score.

### Design rules any Landscape concept must satisfy

1. **Equal visual weight.** Nobody becomes larger, brighter, fuller, more central or more prominent because the user talks to them more, logs more, has known them longer, saw them recently, or is "closer" to them. Sprigs vary only by the approved identity-only system (D8).
2. **Regions are communities or life chapters**, such as Family, Stanford, Austin years, Alameda, Work, Running friends, Parenting years or Neighbours. They should feel like chapters or habitats in a life, not CRM segments; emotionally meaningful categories beat administrative ones.
3. **Placement inside a region carries no meaning.** Coordinates are layout-driven. No "closest" person at the centre and nobody pushed outward as a relationship quietens; nothing lets a user infer *centre = important, edge = neglected*.
4. **No decay.** Nothing drifts, fades, wilts or moves because of silence. States (active, paused, remembered, archived) are never moralized visually.
5. **People can belong to several chapters** without duplicating the person record. Options to explore include subtle connections, overlapping memberships, filtering by chapter, the same identity shown in several chapter views, and bridges between regions. No one is forced into a single folder.
6. **Accessible equivalent.** Everything the Landscape shows is reachable through a conventional interface: People › List | Landscape. The List stays fully functional with VoiceOver, keyboard and accessibility navigation, Dynamic Type and search. The Landscape is an alternate view, never the only way in.

### Life chapters, not only friend groups

Explore the more emotional reading in particular: **a map of the user's life through the people who were part of each chapter.** For example, College (Maya, Sarah, Chris), Boston years (David, Priya), Austin (Ben, Chris, Josh), Bay Area (Sam, Rebecca). Someone who spans chapters, like Chris, may draw a subtle connection between them: "these are the people who have travelled through my life with me". Evaluate whether this is more meaningful than Family / Friends / Work.

### Concepts to prototype and compare

| Concept | Framing |
|---|---|
| **A: Herbarium Garden** | A botanical collection of people: everyone in my life, expressed through their sprigs |
| **B: Relationship Landscape** | A botanical or topographic view of communities and life chapters: the people who make up the different parts of my life |
| **C: Hybrid (currently the most interesting)** | Each person keeps their Herbarium sprig, arranged within Landscape regions. Region shape is visual only, exact distance is meaningless, and nothing moves or scales with activity |

### AI's role

AI may **propose** likely circles or chapters from the user's own data ("These people seem connected to your Austin years"; "Maya and Chris both appear often in college memories"). It never silently defines anyone's social structure.

- Users can accept, rename, merge, split, remove and manually create chapters.
- AI never infers sensitive groupings (religion, sexuality, politics, health) as chapters.
- Suggestions follow D2 (minimal context) and D3 (consent).

### Research questions for the checkpoint

- **Meaning:** "What do you think this picture is telling you?"
  - Failing answers: who I'm closest to, who I should talk to, who I'm neglecting, my best friends, stronger vs weaker relationships.
  - Passing answers: different groups or chapters of my life, how my friends know each other, where these people came into my life.
- **Emotional value:** "Does seeing your relationships this way tell you something the People list doesn't?" The view must earn its existence.
- **Accessibility:** VoiceOver, Dynamic Type, Reduce Motion, colour blindness, people who prefer lists.
- **Scale:** 8, 25, 60 and 100+ people; the layout stays comprehensible.
- **Complex relationships:** a deceased parent, an estranged sibling, a former partner, someone in several groups, a friend present across several chapters, a large family. Nothing may accidentally communicate judgment.

### Information architecture hypothesis

After core-loop validation, test whether People becomes **List | Landscape** rather than List | Garden. Navigation doesn't change before validation.

### Data-model implication (protects the option; no code now)

Chapters and circles, if built, are **many-to-many** (`chapters` plus `chapter_memberships`, user-created or AI-proposed and user-accepted). Nothing in V1 may add a single-valued group column to `people`; the earlier `people.circle` idea in §5 is withdrawn for that reason.

### The checkpoint deliverable

When the roadmap reaches this work, stop before building and produce `KINSHIP_RELATIONSHIP_LANDSCAPE_EXPLORATION.md` with:

1. The user job this visualization serves.
2. The Herbarium Garden concept.
3. The Relationship Landscape concept.
4. The Hybrid concept.
5. High-fidelity mockups.
6. Accessibility design.
7. Stress tests at 8, 25, 60 and 100 people.
8. Multi-group relationship handling.
9. The life-chapter model.
10. AI-assisted group suggestions.
11. A user research plan.
12. A recommendation.

None of the three concepts is implemented until that checkpoint is reviewed.

---

## Sources

- Product audit: "Kinship: Product, Codebase & AI Opportunity Audit" (Claude Doc, 30 Sep 2026), read in full including the quick-wins table and hard questions.
- Design direction: "Kinship 2.0 Design Direction" (Claude Doc, 30 Sep 2026), read in full.
- Design exploration: the Kinship 2.0 canvas (5 concept boards, 3 recommended boards, design-system board), rendered locally and reviewed on 30 Sep 2026.
- Repository `fullcarts89/kinship` at `5687ed7` plus all remote branches, including `claude/wonderful-planck-inpeu9` (30 Sep 2026).
- Live Supabase project "Kinship": migrations, table list and row counts, policies, extensions, storage buckets, edge functions and security advisors, read-only on 30 Sep 2026. No user content was read.
- Local checks on 30 Sep 2026: `tsc --noEmit`, `eslint .`, `npx expo install --check`, `npx expo-doctor`, `npm audit --omit=dev`.
- Model prices and API behaviour (Opus 5.5, Sonnet 5.5, Haiku 4.5, Batch, caching, effort defaults, refusal fallback): Anthropic API reference bundled with Claude Code, cached 25 Sep 2026; re-verify on [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) before budgeting.
- Speech: [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition) (on-device option, dev-build requirement, interim/continuous results); [SpeechAnalyzer vs SFSpeechRecognizer](https://blakecrosley.com/blog/speech-framework-vs-sfspeechrecognizer) (SpeechAnalyzer on-device by design, per-locale asset download; SFSpeechRecognizer needs `requiresOnDeviceRecognition` to stay local); [SpeechAnalyzer iOS 26 guide](https://emrldlabs.com/blog/speechanalyzer-on-device-transcription-ios-26/) (locale coverage, first-run download). Device and locale support must be confirmed on hardware (VOX-01).
- Supabase plan limits and prices in §31 are approximate list prices from memory; verify before budgeting.
