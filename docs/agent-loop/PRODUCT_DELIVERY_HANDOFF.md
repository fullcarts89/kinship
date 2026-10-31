# Kinship alpha delivery: coordination and handoff

**Started 30 Oct 2026** under the founder's end-to-end completion directive (issue #64, PR #68's
`CER-1-core-experience-recovery.md`) and the same-day instruction to run the work as a continuous,
multi-thread project: parallel implementation sessions at workstream boundaries, integration
coordinated from one place, shared decisions kept in this file and on GitHub.

This file is the durable record. Every session updates its own section when it stops or hands off;
the coordinator keeps the top current. Readiness stays **NOT READY** until the integrated release
candidate passes live-model and native-simulator checks (readiness labels: contract §10).

## Governing sources (unchanged)

`CLAUDE.md` → `docs/product/KINSHIP_2_PRODUCT_CONTRACT.md` → `approved-design-coverage.md` →
`KINSHIP_2_DECISIONS.md` (CC-25, CC-26, CC-27, CC-28, D9b) → `KINSHIP_2_COMPLETE_PLAN.md`.
Founder-directed changes recorded by this effort (new, 30 Oct 2026):

| Decision | Source | Effect |
|---|---|---|
| **FD-30a · Build the whole alpha, not milestones** | Founder directive 30 Oct (#64, PR #68) | Continuous implementation across threads; no research-only deliverables; no routine approval requests. Production (merge to `main`, migrations, gateway deploy, flags, device install) still waits for the founder's explicit yes |
| **FD-30b · Electric Garden (Direction A, PR #57 Stage 1) is the visual direction to build** | Founder directive 30 Oct §3 | Supersedes the Quiet Herbarium's visual system (contract §4 tokens, type scale, "no gradients") as the *look*; keeps its experience rules (source on every statement, one primary action, hairline rows where boxes would add nothing, quiet sensitive states, no counts/scores). Must be logged in `approved-design-coverage.md` as a founder override |
| **FD-30c · Long notes are processed, not pushed back** | Founder directive 30 Oct §2 | Supersedes Option A's "Tell the rest" as the *only* answer: if the eight-item cap blocks ordinary language, implement a sound way to process more (bounded per-call, provenance kept, no silent loss). D9b's no-silent-loss rule stands |
| **FD-30d · SUA-1 prototype authorised** | Founder directive 30 Oct §4B | A limited, non-commercial, fixed-template, source-grounded suggestion layer for the release candidate; not SUA-2–7, not commerce, not production rollout |
| **FD-30e · Promise + open-thread reasons, minimal private notification, alpha trust floor** | Founder directive 30 Oct §4A/D/E (CC-25 Commit-next, now authorised) | Build RSN-06, RSN-07, the one private Moment notification, Remembered/Paused controls, export, delete-account v2, safe duplicate handling |
| **FD-30f · Integration runs from the start** | Founder addition, 30 Oct (evening) | WS-5 is active now: completed changes merge incrementally into `claude/alpha-integration`, cross-workstream conflicts are resolved there, the combined app is tested continuously; WS-5 owns final product coherence and assigns integration defects back to the responsible workstream |
| **FD-30g · Ask Kinship v1 belongs to WS-1** | Founder addition, 30 Oct (evening) | A bounded, source-grounded Ask v1 after core extraction and memory reliability: natural questions answered from stored memories, sources cited, unknowns reported honestly; never a generic chatbot. Executed in the `ws6-ask-kinship` session as WS-1's deliverable, reviewed and integrated by the coordinator |
| **FD-30h · Success is judged at the integrated-app level** | Founder addition, 30 Oct (evening) | WS-5 must demonstrate the complete journey (onboarding → natural Tell → accurate memory → retrieval / person page → grounded Today opportunity → Showing-Up Action → hand-off → return check) with the actual model, matching gateway and database, on the native Release simulator; cross-workstream failures are fixed before any build reaches the founder; one coherent playable internal alpha, never four disconnected implementations |

## Workstreams

| WS | Scope | Session / branch | State |
|---|---|---|---|
| **WS-1 Extraction + memory** | #63 pronoun fix; "Tell the rest" fragment context; processing past the eight-item cap (FD-30c); realistic narrative corpus and live-model probe (`evals/narrative/`); dedupe/correction/Undo verification | coordinator session, `claude/kinship-end-to-end-completion-67e702` | core fixes built and live-tested 30 Oct; black-box pending |
| **WS-2 Electric Garden design system** | tokens, type, botanical art components, fluid photo mask, grain, dawn wash; re-skin Welcome/Setup, Today, People, Person, Tell/review, What Kinship knows, Moment detail, hand-off, Settings, empty/quiet/error states; light/dark, Reduce Motion, Dynamic Type | session `ws2-electric-garden`, branch `claude/ws2-electric-garden-5ec0d5`, PR #71 (draft) | started 30 Oct |
| **WS-3 Showing up: Today reasons, SUA-1, notification** | RSN-06 promise reasons, RSN-07 open-thread reasons in `todayModel.ts` + server candidates; SUA-1 gesture line under Message/Call on hand-off + Moment detail; one private local notification for the day's Moment with D4 caps; content-free analytics | session `ws3-showing-up`, branch `claude/ws3-showing-up-c2c5a0`, PR #69 (draft) | started 30 Oct |
| **WS-4 Alpha trust floor** | Remembered/Paused person controls (D13, PER-06); export (SET-04); delete-account v2 (SET-05); safe duplicate-person merge (PER-05); honours Remembered/Paused everywhere Today/reasons/notifications read people | session `ws4-trust-floor`, branch `claude/ws4-trust-floor-176a4a`, PR #70 (draft) | started 30 Oct |
| **WS-6 Ask Kinship v1 (WS-1's deliverable, FD-30g)** | grounded, model-free retrieval over the user's own memory from the People search field: matching lines grouped by person with their sources; "nothing about that yet" when none; never a chat | session `ws6-ask-kinship`, own worktree from `main` | started 30 Oct |
| **WS-5 Integration + release candidate (FD-30f/h)** | integration branch `claude/alpha-integration` (merge commits of WS-1, 2, 3, 4, 6 as they land), combined Jest/Deno/tsc/eslint, black-box + live-model runs, Release simulator pass of the whole journey, `alpha-walkthrough.md`, `alpha-acceptance-scenarios.md`, defects routed to owners by PR comment and session message | session `ws5-integration`, own worktree from `main` | started 30 Oct (evening) |

### Ownership of files (to avoid two writers)

- WS-1: `supabase/functions/**`, `evals/**`, `src/store/understanding.ts`, `src/store/followUp.ts`, `src/store/gateway.ts`, `src/features/tell/reviewModel.ts` (logic only).
- WS-2: `src/design/tokens.ts`, `src/ui/**`, every `*.tsx` view under `src/features/**` and `app/v2/**`, `assets/**`, `app/_layout.tsx` (fonts). It keeps every view's props and callbacks so logic workstreams need no view changes beyond new props.
- WS-3: `src/features/today/todayModel.ts`, `mentions.ts`, `milestones.ts`, `momentDetail.ts`, `useHandoff.tsx`, `src/store/reasons*.ts`, `src/store/returnLoop.ts`, `src/lib/notification*.ts`, `src/platform/analytics.ts`, a migration for server candidates if needed; adds props to `HandoffSheet`/`MomentDetailSheet`/`TodayView` but leaves their styling to WS-2 (small, clearly marked additions only).
- WS-4: `src/store/repositories.ts` (person state, merge), `src/store/schema.ts`/`tables.ts`/`syncEngine.ts` for new columns, `src/lib/exportService.ts`, `src/lib/accountDeletion.ts`, `supabase/functions/delete-account/**`, migrations, `src/features/people/SettingsSheet.tsx` and `app/v2/person/[id]/*` logic for the state control (styling by WS-2).
- Shared docs (`approved-design-coverage.md`, `bug-ledger.md`, this file): each session appends its own section; never rewrites another's.

### Integration rules

1. Every workstream branches from `main` at `f55f331` (Option A merged) or later; PRs target `main`; **nobody merges to `main`** (migrations reach production on merge).
2. WS-5 merges workstream branches into `claude/alpha-integration` with merge commits for combined testing, incrementally as they land; conflicts are resolved there (logic from WS-3/4/6, styling from WS-2) and defects fed back to the owning branch by a PR comment and a message to the owning session. The coordinator tells WS-5 when a workstream lands.
3. Migrations are forward-only and additive; a session that adds one says so in its section and in its PR, and applies it to the shared local stack (`npx supabase migration up --local`) only after checking nobody else is mid-run.
4. The shared local stack (`npx supabase status`), the shared `functions serve` and the stub on :8790 are never stopped; a branch's own gateway runs on another port (`e2e/README.md`). Never kill by port.
5. Evidence tiers are reported apart (UNIT · INTEGRATION · BLACK-BOX · LIVE-MODEL · NATIVE-SIMULATOR · FOUNDER-DEVICE). Nothing is "ready" from screenshots.
6. **One Release simulator build at a time on this Mac** (30 Oct, evening: three concurrent `xcodebuild`s put the load average at 150–250 and every timing-based black-box suite timed out). WS-5 owns the simulator build and the native journey; WS-3 and WS-4 report their native rows as covered by WS-5's journey, with the exact steps to walk; WS-2 may build for design verification but only when `pgrep -x xcodebuild` finds none running; WS-5 takes the next free window. Black-box suites run one at a time; a ~32 s timeout under load is re-run alone before it counts as a defect.

## Baseline (30 Oct 2026, `main` f55f331)

- Jest: 101 suites / 964 tests pass (`TZ=UTC`). Deno: 462 pass. (`npx tsc --noEmit`, `npx eslint app src` run per PR.)
- Local stack up (db, auth, rest, kong, edge runtime); iPhone 18 Pro simulator booted; production ai-gateway v16 = `main` f55f331.
- Known open defects: #63 ("Who is he?"), the "Tell the rest" fragment → "Nothing to remember", K29 (`mentions.ts` evening defect, ledger), N18 (season-only milestone leaves the page), the eight-item cap drops the tail of dense notes.

## WS-1 · Extraction + memory (coordinator)

**Branch `claude/kinship-end-to-end-completion-67e702`** (from `main` f55f331), **PR #72 (draft)**. State on 30 Oct 2026, evening:

Built:
- **#63 / K30, "Who is he?"** `someoneElseBefore` replaces `noOneElseBefore` in `pipeline.ts`: only another person before the pronoun (a name not in People, or someone the writer introduces by relation, of a gender the pronoun can mean) makes "he"/"she" ambiguous; the subject's relatives, pets, acronyms, places and lower-cased words do not; the rule now applies with or without a page. Two padded mention shapes fixed from the live run: "he loves" is the pronoun; "His sister Carla" with subject related is Leo's sister Carla. J1's cases unchanged.
- **FD-30c, long notes.** The eight-item cap is gone (`MAX_PROPOSALS = 200` guards a runaway list only). `run.ts` understands a note past 700 characters in passages of ~450 characters, one model call each in parallel (≤ 6), every call seeing the whole note (prompt **v7**: `<passage>`, `<earlier_part>`); proposals are merged and judged as one note. A failed passage is recorded as `coverage.unprocessed` (Option A's surfaces: "Kinship couldn't get to all of it", Tell the rest, the dotted marks), so nothing is ever silent.
- **K31, "Tell the rest" fragment.** The gateway loads the note a continuation continues (`captures.continues_capture_id`, already in the schema), sends it as `<earlier_part>` context (never evidence), and uses its page, else the one person all its kept lines are about (`loadSavedPeople`, index.ts), as the continuation's context person.
- **Probe:** `evals/narrative/` (`live.ts`, `corpus.json`, `rosters.json`): the CER-1 corpus plus a three-passage narrative and two continuation fragments, run through the real prompt, live model and pipeline; saves raw proposals for fixtures.

Evidence (30 Oct): UNIT Deno 475 (new `narrative.test.ts` 13, handler FD-30c/CER-1), Jest (see the PR); INTEGRATION oracle 416/416, realistic oracle, baseline replay all PASS; LIVE-MODEL `evals/narrative` s63/s1 (no question, every line on the person), s12 (11/11 kept), s13 (19 lines from three passages in ~13 s); BLACK-BOX against this branch's gateway on the local stack (30 Oct): k27 2/2, k28 3/3, k20 22/22, removal 3/3, k4 34/36 in the full run (the two failures were 30 s reading timeouts at ~32 s under load, load average ~10 with four sessions building; each failing case passes alone in ~6 s); more suites listed below as they run. NATIVE-SIMULATOR: WS-5. Readiness NOT READY.

Later on 30 Oct: WS-5's integration probe found three deviations from the ledger (PR #72 comment); two fixed in `71775ab` (s5: a stated date beside "next Thursday" resolves to the day and the sister's surgery holds as sensitive instead of asking "When is it?"; s9: "his roommate" as a mention resolves through the pronoun), the third (s4: the model never proposes the keys sentence) is a model omission recorded as a known limit. Black-box b3 20/20, b4 5/5, b5 4/4, b7b8 4/4, k4legacy 18/18, k25 3/3, dates 2/2, h4 2/2; k19 (2) and today (1 of 2) timed out at ~32 s with the machine at load average 100–200 (several sessions building at once) and are to be re-run alone when the load is down, not yet judged. The narrative replies are in `e2e/replies/narrative-*.json`; the per-fact ledger is `evals/narrative/ledger.json`.

**Coordinator thread paused at the usage limit (30 Oct, ~16:10 PDT).** Last WS-1 result: `narrative.blackbox` (d529b24) against this branch's gateway: the #63 Pablo case PASSES through the real screens; the Mina (s12) and Leo (s13) cases FAIL with "Couldn't understand this yet" on the card, i.e. the gateway returned an error for those replayed notes (the live-model runs of the same notes passed), so the fault is in the replay path, most likely the stub's reply mapping for the saved `@Name` keys or the passage calls each receiving the full 19-item proposal; to diagnose, run that suite alone and read the branch gateway's log (`ai-gateway: request failed`) and the stub's output. Sessions WS-2 (PR #71), WS-3 (#69), WS-4 (#70), WS-5 (#74, integration) and WS-6 (Ask v1) were running at the pause; WS-5 had merged WS-1 through 5557dae and WS-4 f4a8819 and was waiting for a build window. The next coordinator thread: read this file, `list_sessions {linked: true}`, then message WS-5 to re-merge WS-1 (ec2dbad) and continue the journey walk.

**31 Oct, morning:** the `narrative.blackbox` failures were the database, not the replay: `write_extraction` and `resolve_capture_review` still refused more than eight items (Checkpoint C's ceiling), so the gateway threw on the eleven-item and nineteen-item notes. Migration **`20261031090000_v2_many_items_per_note.sql`** re-creates both functions with the ceiling at 200 items (the pipeline's `MAX_PROPOSALS`) and 50 new people; forward-only, no data change; applied to the shared local stack by psql (WS-5's `migration up` on the integration branch will record it). This migration must reach production (merge to `main`) **before** the gateway is deployed from this work, like Option A's.

Open in WS-1: re-run k19 and today black-box alone at normal load; a failed passage retold is judged by Option A's recovery accounting (ledger K31 note); review and integrate WS-6 (Ask v1) as WS-1's deliverable (FD-30g); a `narrative.blackbox.tsx` suite over the saved replies.

## WS-2 · Electric Garden

**Branch** `claude/ws2-electric-garden-5ec0d5` · **PR** #71 (draft, against `main`; do not merge) · **commit** see the PR's head. Worktree session WS-2, started 30 Oct.

**Built (FD-30b):**
- `src/design/tokens.ts` rewritten for Electric Garden: warm paper, leaf-green ink, a lime `mark` / `markText` for everything understood (the ochre tokens are gone from the 2.0 shell), the five art accents, a night set that keeps the art vivid; the poster type scale (Archivo Black names / statement / titles, Newsreader italic for the user's words, Instrument Sans 400–700 for the machine); motion (hero 520 ms, arrive 320, sheets 360, Reduce Motion → 150 ms fades), depth (sheet and field lifts), art tokens. Contrast gates updated; every pair passes.
- `assets/images/garden/` with `PROVENANCE.md`; `src/ui/garden/` (Botanical, DawnWash, Grain, FluidPhoto, BloomName, PosterName, SectionDot); primitives re-skinned (Screen art slot + grain, Provenance lime caps, Tell field as the one raised surface, pills, bar, rows, sprig as a two-colour identity mark).
- Screens: Welcome, See how it works, Setup (all steps), Today (moment with photo or bloom-filled name, quiet day, first use, bring back, return check, week), People, Person portrait, What Kinship knows, Tell dock / sheet / review / Kept card / clarification / correction, Source, Moment detail, hand-off, Settings. Every prop, callback, copy string, test id and accessibility label kept; tests updated only where they asserted on styles (tokens).
- A user-chosen photo per person, local-only (`src/lib/personPhotos.ts`, `src/hooks/usePersonPortrait.ts`), "Add a photo" on the person's page; shown in the person's hero and Today's hero for that person; never synced, never inferred from, never on a sensitive line, no store schema change.
- Docs: `approved-design-coverage.md` "Electric Garden (FD-30b)" (each surface's treatment and the Quiet Herbarium rule it replaces; what is not faithful and why); contract §4 note.

**New props other workstreams may see (additive, optional):** `TodayView.photoUri`, `TodayView.dayKind` (a model that knows a day is difficult can say so; the view never infers it), `PortraitView.photoUri` / `onPhoto`. `Row.serifSubtitle`. `Screen.art` / `grain`. `Botanical`, `DawnWash` etc. exported from `@/ui`.

**Other workstreams' files touched, visually only:** `src/features/today/TodayView.tsx` (WS-2 owns views; WS-3 adds props), `src/features/people/SettingsSheet.tsx` (none beyond tokens), `app/v2/(main)/index.tsx` and `app/v2/person/[id]/index.tsx` (the photo hook wired in).

**Not built / known defects:** see the PR's evidence section, kept current. The poster split (the name at 120 pt, the statement's remainder under it) applies only when the statement opens with the person's name followed by a space; otherwise the whole statement sits under the name. The e2e black-box helpers that look for a statement as one Text node will see the split for such statements; the accessibility label is always the whole statement.

**Evidence:** UNIT: `TZ=UTC npx jest` 964 / 964, `tsc` and `eslint` clean at each push. NATIVE-SIMULATOR: the Release simulator walk and its screenshots under `docs/product/screens/electric-garden/`, reported row by row in the PR. Readiness: **NOT READY** (the integrated candidate decides).

## WS-3 · Showing up

_Section owned by the WS-3 session. Branch `claude/ws3-showing-up-c2c5a0` (from `main` f55f331), draft PR #69, never merged by this session. Last commit: `30186ba (this section's commit follows it)`._

### What was built (FD-30d, FD-30e)

| Item | Where | State |
|---|---|---|
| **RSN-06 promise reasons** | `src/features/today/todayModel.ts` (`PROMISE_WEIGHT` 74, `PROMISE_AGAIN_DAYS` [3, 5], `promiseReasonId`, `promiseStatement`, `promiseAsk`); `momentDetail.ts` (why-now); `returnLoop.ts` (a Yes keeps the promise: `MemoryRepo.resolve`); `reasonLocal.ts` + `TodayView.tsx` + `PortraitView.tsx` ("Didn't happen" = `put_aside`); `pageReasonFor` (the page's Message on the day carries the promise reason) | Built; UNIT, BLACK-BOX |
| **RSN-07 open-thread reasons** | `todayModel.ts` (`THREAD_WEIGHT` 65, `THREAD_FOLLOWUP_DAYS` 42 = the pipeline's, `THREAD_WINDOW_DAYS` 3, `threadWindow`, `threadAsk`); sensitive wording excluded via the pipeline's `wordingSensitivities` | Built; UNIT, BLACK-BOX |
| **SUA-1 suggestion line** | `src/features/today/suggestions.ts` (`SUGGESTION_COPY`, `OUTCOME_ASK`, `suggestionFor`), `SuggestionLine.tsx` (markup only), props on `HandoffSheet`, `MomentDetailSheet`, `TodayView`, `PortraitView`; `useHandoff.tsx` (tap → Messages, `gesture` on the reason); `MomentView.suggestion` / `MomentDetail.suggestion`; `usePersonReturn` for the page; analytics `gesture_shown` / `gesture_tapped` / `gesture_outcome` | Built; UNIT, BLACK-BOX |
| **Private Moment notification** | `src/lib/momentNotification.ts` (pure planner + expo-notifications adapter + permission moment + device record), `useV2.ts` (`todayInputFor`, `momentFor`, `planMomentNotification`, `useNotificationSetting`, the permission ask after the first Yes / first hand-off), `app/v2/(main)/index.tsx` (plans on open and on background), `app/v2/_layout.tsx` (tap → Today), Settings › Notifications (`SettingsSheet.tsx`, `people.tsx`) | Built; UNIT (planner, scheduler flow, permission moment). Not exercised on the simulator yet: see below |
| **Copy per kind** | `localCopy` in `todayModel.ts` (promise, thread; the existing kinds unchanged), `returnCopy` | Built |
| **Migration** | `supabase/migrations/20261030120000_v2_showing_up_moment_types.sql`: additive, `contact_events.moment_type` accepts `promise` and `thread`. Applied to the shared local stack (it was already present when this session checked; the DB name matches) | Needs `main` to reach production |
| **Docs** | `today-eligibility.md` (rows, the suggestion line, the notification), `approved-design-coverage.md` (WS-3 section, rows citing FD-30d/e, copy proposals), `docs/ops/analytics.md`, `e2e/README.md` | Done |

### Evidence by tier

- **UNIT:** `npx jest` (TZ=UTC): 105 suites / 998 tests pass (30 Oct). New suites: `showingUp.test.ts` (RSN-06/07: windows, weights, once-only, put aside/kept, exclusions, quiet day), `suggestions.test.ts`, `suggestionLine.test.tsx` (sheets, tap, measured apart, after-Yes question, "Didn't happen" only for a promise), `momentNotification.test.ts` (planner rules, scheduler flow, permission moment); analytics type tests for the new events. `npx tsc --noEmit` clean; `npx eslint app src` 0 errors.
- **INTEGRATION:** the return-loop state machine (`returnStates.test.ts`) and K20 (`todayModel.test.ts`) updated for a due-today promise being the Moment.
- **BLACK-BOX:** `e2e/blackbox/showingup.blackbox.tsx` against the shared local stack and the shared gateway (`kinship-phase4-handoff-2bb8b3`'s `functions serve`, its stub in replay): **FAIL, unresolved (30 Oct).** Four runs: the first with the shared gateway's stub down (its isolates are terminated for wall clock: `host.docker.internal:8790` unreachable; a replay stub was started on :8790 from this checkout and left running), then through the WS-1 gateway on :8000 + stub :8791 at load averages 150–344 (three Release builds at once). In every run the server extracted the note within ~300 ms (`captures.status = extracted`, one source) but the harness app stayed at "Understanding…" for 120 s, so neither scenario reached the Moment. A control run of a previously passing suite (`k19`) was attempted but `timeout` is not on macOS (exit 127) and the budget ran out before a rerun. **Next for whoever picks this up:** run `k19.blackbox.tsx` on this branch with the same ports; if it also stalls, the cause is the environment (load / the shared stack), rerun `showingup.blackbox.tsx` once quiet; if `k19` passes, suspect this branch's Today screen additions (`planNotification` after `refresh`, `todayInputFor`) and bisect from `30186ba`.
- **LIVE-MODEL:** not run (no new model inputs: the promise uses the captured K20 reply; the thread and the wedding are earlier-day lines).
- **NATIVE-SIMULATOR:** **covered by WS-5's journey** (coordinator's rule, 30 Oct: WS-5 owns the Release build and the native pass; WS-3 built Release once, `BUILD SUCCEEDED`, and did not drive it: the booted iPhone 18 Pro carried another session's live account). The exact steps for WS-5, on a local test account whose People include John and Felix, with John and Felix as contacts with numbers (`xcrun simctl addmedia booted john.vcf`):
  1. **Promise Moment.** Select the stub's reply `hand: promise` for "I need to call John tonight" (`POST /__variant`), tell it from Today's dock. Expect Today: "You said you'd call John tonight." · "Today · <date>" · **Message John** · Not now; no "Today · Call John tonight" quiet line as well. Tap the words → the detail says "It's due today." and shows no "You could…" line. **Message** → Messages opens. Back: "Did you call John tonight?" with **Yes · Not yet · Didn't happen**. Not yet → the Moment returns. Message John → the sheet (heading "Message John", no "You could…" line) → Open Messages → back → **Yes**: no "Anything worth remembering?"; the Moment is gone; John's page has no "You said you'd"; What Kinship knows still lists "Call John tonight"; server `contact_events` has one row with `moment_type = 'promise'`, the promise's `memory_items.status = 'resolved'`. Then, on a fresh account, the same note and **Didn't happen**: nothing recorded, the Moment gone, John's page still "You said you'd · Call John tonight".
  2. **Open-thread check-in.** Seed, via `earlierLine` (local DB), a thread for Felix told 42 days ago ("Felix is considering moving to Denver", detail `{topic, followup_after_days: 42}`) and a milestone ten days ahead ("Felix is getting married next month", `milestone_type wedding`, day-precise). Relaunch. Expect Today: "Did Felix decide?" · "Felix is considering moving to Denver" · **Ask Felix**; the wedding is no Moment. Detail: "You told Kinship on <day>." and the line "You could invite them to dinner."
  3. **Suggestion line.** Ask Felix → the sheet: "You could mention · Felix is getting married next month", "You could ask how the wedding plans are going.", the channels, and beneath them **"You could invite them to dinner."** in small quiet type (a link, not a pill). Tap it → Messages opens with nothing pre-written. Back: "Did you ask Felix about it?" (no "Didn't happen") → Yes → **"Did you make a plan?"** Yes · Not yet → Yes → "Anything worth remembering from talking with Felix?" → Nothing today. Server: one `contact_events` row, `moment_type = 'thread'`; the thread still active. Next open: the check-in does not return.
  4. **Notification.** Before step 1's first Yes, Settings › Notifications reads "Paused" (switch off). On the first Yes (or the first Message from a Moment), iOS asks for notification permission once; Allow → Settings reads "On". Then set the simulator clock aside: with a Moment Today would select for the next 09:00 (e.g. John's promise told before 09:00, or Priya's birthday tomorrow from Contacts), background the app and run `xcrun simctl … ` is not needed: check the pending request with `xcrun simctl spawn booted log stream --predicate 'subsystem == "com.apple.usernotifications"'`, or simply advance to 09:00 and expect one banner: **"Kinship" · "Something worth knowing about John today."** (never the memory). Tap it → Today opens (the `moment_v2` payload). Settings › Notifications → Paused → background → no banner at the next 09:00. Second day: with two put aside in a row, none for a week (hard to stage; UNIT covers it). Relaunch twice on the same day → still one pending request (idempotent).
- **FOUNDER-DEVICE:** not run. Readiness: **NOT READY**.

### What works

- A promise of the user's with a day is Today's Moment on its day, once more in days 3–5 after if still open, never daily; Yes keeps it (status resolved; it leaves "You said you'd", stays in What Kinship knows); "Didn't happen" and "Not now" put it aside; nothing undated, coarse, sensitive, someone else's or about someone paused/remembered ever speaks.
- A thread asks once: the day after its own day, or 42 days after it was told; sensitive threads (by label or wording) never.
- The suggestion line appears beneath the channels on the sheet and in the detail only when a context fits, never for a promise; a tap opens Messages with nothing pre-written; shown / tapped / outcome measured apart, content-free.
- The notification planner holds D4's caps, quiet hours, back-off, the pause, idempotence; the permission ask fires only after the first Yes or first Moment acted on.

### What does not (yet), and behaviour changes to look at

- **K20's "I need to call John tonight" is now Today's Moment on the day** ("You said you'd call John tonight." · Message John; return question "Did you call John tonight?") instead of a "Today · Call John tonight" quiet line. RSN-06 as specified; the K20 black-box helpers accept both forms. The founder should see it on the device.
- **The notification's selection runs Today for 09:00 of the next day with this phone's state at planning time.** A note told after planning (or a server reason that arrives overnight) can change what Today shows in the morning; the notification stays private and generic, so nothing wrong is promised, but it may fire on a day Today then shows something else. Re-planning on every open and background keeps this small.
- **Permission on the simulator:** the system prompt and delivery need a native build; the scheduling path is covered at UNIT with a fake scheduler. See the NATIVE-SIMULATOR line above for what was and wasn't seen.
- The "activity" suggestion needs a fact with `category` interest/preference and a `value` the note's quote contains; the current pipeline sets `value` only when grounded, so it will be rare until extraction fills it more often.
- No change to extraction or the gateway. No server push. No commerce.

### Open questions for the founder (copy proposals, all marked in the coverage doc)

1. Promise Moment: "You said you'd <line>." and the question "Did you <line>?"; the third answer "Didn't happen".
2. Thread Moment: "Did Felix decide?" / "Any news from Mina?", "Ask Felix", "Did you ask Felix about it?"; the 42-day window (the pipeline's number) and the 3-day width.
3. `SUGGESTION_COPY` and which milestones mean a plan vs help; "You could ask if they'd like company." for any event ahead (a race?); `OUTCOME_ASK`.
4. Notification: "Kinship" · "Something worth knowing about Ben today."; 09:00; the Settings line "One private note on a day Kinship has something for you…".
5. Whether a promise's second window (days 3–5) is wanted at all, or once on the day is enough.

## WS-4 · Trust floor

_Section owned by the WS-4 session; its full record is `docs/agent-loop/ws4-trust-floor-handoff.md` on `claude/ws4-trust-floor-176a4a` (PR #70, head 909907e, 31 Oct): branch, migrations, tiers (Jest 103 suites, Deno 11, pgTAP 72/40/61/64/68, black-box trustfloor PASS), the exact native steps for WS-5, caveats, and the one-line Today hook (`isProactiveEligible` from `src/store/peopleStates.ts`; server `person_proactive(person_id, user_id)`). The "absent Storage counts as empty" tolerance lives only in the local runner `e2e/serve-delete-account.ts`; the deployed function fails loudly (Deno test). Readiness NOT READY._

## WS-5 · Integration

**Branch `claude/alpha-integration`** (from `main` f55f331), **PR #74 (draft, "do not merge")**; its description is the running status. Session WS-5, started 30 Oct 2026 (evening). Readiness **NOT READY**.

### Pass 1 (30 Oct, 22:30–23:30 UTC)

Merged, with merge commits, in the handoff's order:

| WS | Branch | Head | Merge commit | Conflicts |
|---|---|---|---|---|
| WS-1 | `claude/kinship-end-to-end-completion-67e702` | `fe98c00` | `0ae5ebf` | none |
| WS-4 | `claude/ws4-trust-floor-176a4a` | `5c5180b` | `ae4c94b` | none |
| WS-3 | `claude/ws3-showing-up-c2c5a0` | `a21438e` | `304deac` | none |
| WS-2 | `claude/ws2-electric-garden-5ec0d5` | `7061603` | `46b419c` | `TodayView.tsx` (WS-3's `afterGesture` guard folded into WS-2's `quietDay` variable; glue), this file (coordinator's version with WS-2's section inserted) |

Glue on the integration branch only: the two conflict resolutions above; `npm install` for WS-2's two new packages (`@expo-google-fonts/archivo-black`, `@react-native-masked-view/masked-view`). Nothing of any workstream's logic changed here.

Migrations applied to the shared local stack (`npx supabase migration up --local`, 30 Oct 22:50 UTC), both checked additive and forward-only: `20261030090000_v2_trust_floor.sql` (WS-4: `person_proactive`, `people_merges`, `merge_people` / `undo_merge_people`, the facet tombstone re-checked, one FK made deferrable) and `20261030120000_v2_showing_up_moment_types.sql` (WS-3: `promise`, `thread` in `contact_events.moment_type`).

Combined checks (UNIT · INTEGRATION):

| Check | Result |
|---|---|
| `TZ=UTC npx jest` | PASS 106 suites / 1011 tests (`firstRun.test.tsx` among them) |
| `deno test supabase/functions` | PASS 475 |
| `npx tsc --noEmit` | FAIL, 23 errors, all in WS-4's `5c5180b` (`peopleStates.ts`, `peopleMerge.ts`, `trustFloor.test.ts`: `deleted_at` missing on `Person`/`MemoryItem`, `Data` not exported). Routed: comment on #70, message to the WS-4 session. WS-4 answered that `f4a8819` typechecks; merged in pass 2 |
| `npx eslint app src` | PASS (0 errors, the pre-existing warnings) |
| free evals: oracle, realistic | 100% on every gate (416 cases) |
| free evals: baseline replay (`2026-10-06T02-38-45-opus-5-5-low-v6-run`) | as the baseline (expected items 119/120 and 87/89; must-not 0) |

Live-model probe (LIVE-MODEL): `evals/narrative/live.ts`, all 15 corpus scenarios, page and general modes, compared by hand with `ledger.json`. 13 of 15 agree in both modes (s12 11/11; s13 19/19 from three passages in ~13 s; s14/s15 continuation context). Three extraction-side deviations routed to WS-1 (comment on #72, message to the coordinator): **s4** the model never proposes the two keys facts (silent model-side loss, both modes); **s5** the stated-date surgery line is held with "When is it?" instead of the sensitive confirm; **s9** general Tell asks "Who is this about?" for the roommate line (confirm on the page).

Black-box (BLACK-BOX), this branch's own stub on :8793 and gateway on :8010 (WS-4's `serve-delete-account.ts` holds 127.0.0.1:8792; the coordinator holds 8791/8000), one suite at a time:

| Suite | Result |
|---|---|
| `k27` | PASS 2/2 |
| `k28` | FAIL 2/3: the sparse-profile hand-off and the Fluffy follow-up time out (~32 s); the Susan/Pedro flow passes. Run at 22:57 UTC; a sibling session reports the K26 case failing on `main` in the evening (time dependency); re-run in pass 2 and against `main` before routing |
| `k20`, `k4`, `removal`, `narratives` | running (pass 1) |
| `trustfloor` (WS-4), `showingup` (WS-3, not yet on the branch), WS-6's | after their merges |

NATIVE-SIMULATOR: the Release simulator build of pass 1 (`ios/build`, e2e-sim env) in progress; the journey walk follows (`docs/product/alpha-walkthrough.md`, screenshots under `docs/product/screens/alpha-rc/`). `docs/product/alpha-acceptance-scenarios.md` written (eight founder scenarios).

### Routed defects

| To | Where | What |
|---|---|---|
| WS-4 | #70 comment, session message | `5c5180b` fails tsc (23 errors, own files). Answered: `f4a8819` typechecks |
| WS-1 | #72 comment, coordinator message | live probe s4 (two facts never proposed), s5 (date question on a stated sensitive date), s9 (who-question as a general Tell) |

### Build for the founder (prepared, not run)

From a clean checkout of `claude/alpha-integration` under the home directory, per the local-build memory note (Xcode 27; the October EAS quota resets 1 Nov):

```bash
SENTRY_DISABLE_AUTO_UPLOAD=true npx eas-cli build --local --profile dogfood-v2 --platform ios --non-interactive --output ~/kinship-alpha-rc.ipa
```

Check the bundle before any install: `strings` on the `.hbc` for the production URL and the new copy, never a model identifier. Install only on the founder's yes: `xcrun devicectl device install app --device <UDID> <ipa>`.

**External blockers (each needs the founder's explicit yes; no session does them):** the production `ai-gateway` must be deployed from the merged code (prompt v7, passages, continuation context, K27/K31) before the app's new understanding works on a phone; both migrations reach production only on merge to `main`; the device install itself.

### Passes 2–3 (30 Oct, 23:30–00:15 UTC)

Merged: WS-4 `f4a8819` (`2e2c9ff`; four conflicts with WS-2 resolved as glue: logic/props from WS-4, layout from WS-2; `tsconfig.json` excludes WS-4's Deno-only `e2e/serve-delete-account.ts`), WS-1 `5557dae` (`0b3b06f`, the s5/s9 fixes), WS-4 `7718f6a` (`00d76b5`), WS-1 `d529b24` (`c068667`, `narrative.blackbox.tsx`). tsc and eslint clean, Deno 480, Jest 107/1015 at pass 2. A Release simulator build of `c068667` is ready (`ios/build/…/Kinship.app`), pointed at a harness-only proxy on :54398 (ai-gateway → this branch's live-model gateway :8011, delete-account → :8794, the rest → :54321), with a fresh local account and two contacts on the simulator. The journey itself was **not walked**: this WS-5 session stopped at its usage limit with the Jest + black-box chain running. The full hand-over (ports, PIDs, files, next steps) is in the sessions' shared notes folder, `ws5-integration-handover.md`.

### Open in WS-5

The Release-simulator journey with the live model (after WS-4 leaves the iPhone 18 Pro); the walkthrough and screenshots; the serialized black-box set and the live-probe re-run after `5557dae`; WS-3/WS-6 heads when they land, WS-2 last; the PR description after each pass.

## WS-6 · Ask Kinship v1

**Branch `claude/ws6-ask-kinship-72d73c`** (from `main` f55f331), **PR #73 (draft)**. Session `ws6-ask-kinship`. State on 30 Oct 2026: built, tested at UNIT and through a real store; lab screenshots; NATIVE-SIMULATOR not run. Readiness **NOT READY**. Full write-up: `docs/product/ask-v1.md`; coverage row 22 and its WS-6 section.

Built (no model calls, no server changes, no migrations):
- `src/features/ask/retrieve.ts` (pure): a question's words folded and stemmed, question words dropped, a name scoping to its person, steers (interests; conversations; residence; birthday) that narrow but never hide what the words found; every remaining word must be in a line's own words, its detail (place, topic, goal, attribute, value…), its related person, or its residence reading, else any word when there were several. Active and resolved lines; superseded only where the page shows them under Before (marked Earlier); retracted never. Grouped by person in People's order, remembered/paused last; newest first within a person. Honest misses: "Kinship knows nothing about that for John yet." / "Nothing about that in your memory yet." / "No conversation with Sam recorded yet." No content words → nothing; a name alone → People's own filter.
- `src/features/ask/useAsk.ts`: reads the store (`recordFor` per matched person, so a found line is the page's line: same words, composed residence line, provenance, note; `personFocusHref` for the tap). An account with no one in People asks nothing.
- `src/features/ask/AskResults.tsx`: **"In your memory"** under the people results; each line with its person and source (tap → the Source view; composed → `ComposedSheet`, whose Edit / Not this go to What Kinship knows); the trail's own lines for "When did I last see Sam?"; one quiet line when nothing answers. VoiceOver labels on every row; Dynamic Type through the shared text components.
- `src/features/people/PeopleView.tsx`: a minimal, marked block (`onQuery`, `memory`, `initialQuery` for the lab): a question keeps the people it names and shows the section; a name keeps "No one called … yet"; an empty account never sees the section. `app/v2/(main)/people.tsx` wires `useAsk` and the sheet. **WS-2:** restyle `AskResults` and this block; props and copy are the contract.
- Lab states `#ask`, `#ask-earlier`, `#ask-sam`, `#ask-into`, `#ask-nothing`, `#ask-miss` (`src/dev/v2Lab.tsx`); screens in `docs/product/screens/ws6/`.

What Ask v1 answers: the CC-25 examples ("What is John into?", "What gift did Susan mention?", "Who do I know in Alameda?", "Alameda"), board B3's "When did I last see Sam?" (the trail, newest first, never a count or "days since"), places from residence readings, related people by name or relation, detail fields, plurals, possessives, accents, the word being typed as a prefix, birthdays from the person's record. What it declines: synthesis (CC-25 "only if needed", not built), suggestions (CC-28, separate brief), chat, ranking, anything not a stored line, general-world questions, a steer with no one it is about.

Evidence (30 Oct): UNIT Jest 103 suites / 1011 tests (`TZ=UTC`; +2 suites, +47 tests over the baseline), `npx tsc --noEmit` and `npx eslint app src` clean; `firstRun.test.tsx` green; INTEGRATION the hook's read through a real sql.js store with lines remembered through the repositories; LAB screenshots (web, fixtures); BLACK-BOX, LIVE-MODEL (n/a: no model), NATIVE-SIMULATOR not run. Readiness NOT READY.

Tooling for WS-5 (the web lab): `metro.config.js` registers `wasm` as an asset extension (expo-sqlite's web worker imports its `.wasm`; without it no web bundle resolves); `.claude/launch.json` `expo-web-lab` sets the lab flag and leaves Supabase unconfigured (`https://your-project.invalid`), because `web.output: "static"` renders every route in Node at dev time and the Supabase client's SecureStore session restore crashes there. Pitfall: a lab run writes the gitignored `expo-env.d.ts`, whose Expo types bring Node's `setTimeout` into the program and make `npx tsc --noEmit` fail on a pre-existing line in `src/hooks/useV2.ts` (`timer = setTimeout(...)`, line ~1000: `Timeout` vs `number`); delete `expo-env.d.ts` before type-checking, or fix that line (shared file, not WS-6's). Typed routes are on, so a dynamic deep link is pushed as `href as Href`.

Known gaps / for the integration step: no native pass (type the test queries into People on a local test account seeded through the real Tell flow, `e2e/README.md`); verbs are not stemmed ("skate" ≠ "skating"); WS-4's Remembered/Paused state is read from `people.state` only (nothing else assumed); WS-2 restyle pending. Conflicts to expect on merge: `PeopleView.tsx` (WS-2 restyle) and `people.tsx` (WS-4 settings), both small, clearly marked blocks.

## Continuation prompt (for a new coordinator thread)

> Read `docs/agent-loop/PRODUCT_DELIVERY_HANDOFF.md` on `origin/claude/kinship-end-to-end-completion-67e702` first, then `CLAUDE.md` and the contract. Check each workstream branch's state (`git fetch --all`; the PRs listed in the handoff), continue the open WS-1 items on this branch, and run the integration step when WS-2..4 report. Do not restart the analysis; the decisions above govern.
