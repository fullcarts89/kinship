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
| **FD-30i · Model allocation (31 Oct)** | Founder, 31 Oct (78% of the weekly allowance used) | Coordinator on Sonnet 5.5; WS-1 Opus 5.5 for hard reasoning, Sonnet for routine; WS-2 Fable 5.1 only for new structural design, Sonnet for implementation; WS-3/5/6 Sonnet, Opus on demonstrated difficulty; WS-4 Opus for privacy/SQL/deletion decisions, Sonnet otherwise; Haiku 5.5 for isolated mechanical subtasks, never the sole reviewer of security-sensitive changes. Medium effort for routine work. Never reduce tests, native verification, security checks or acceptance criteria to save usage. Applied 31 Oct: WS-2/3/4/5/6 sessions set to Sonnet 5.5 at medium effort; the coordinator session must be switched by the founder in the model menu |
| **FD-30j · FD-30b is a structural redesign, not a reskin (31 Oct)** | Visual feedback on PR #71 relayed 31 Oct (comments 16:32–16:40 UTC), consistent with the founder's own FD-30i item 1 ("WS2's genuinely new structural product design") | WS-2's first pass (tokens, art, type, photo hero) is accepted as the foundation but is a reskin: Moment Detail, People, Person and Today kept the old template. WS-2 (Fable 5.1, high effort, 31 Oct) now redesigns structure surface by surface: Moment Detail, Today, Person, People (with an explicit Ask affordance, contract with WS-6), Tell/review/handoff; it may change layout, composition, component boundaries, interaction patterns and copy inside approved flows; truth/provenance/privacy, action contracts, accessibility and the other workstreams' props stay binding; evidence is native Release before/after pairs plus wireframe-level comparisons; FD-30b is not complete until visible in the real app. WS-5 batches integration of WS-2's surface commits and re-walks after the pass |
| **FD-30h · Success is judged at the integrated-app level** | Founder addition, 30 Oct (evening) | WS-5 must demonstrate the complete journey (onboarding → natural Tell → accurate memory → retrieval / person page → grounded Today opportunity → Showing-Up Action → hand-off → return check) with the actual model, matching gateway and database, on the native Release simulator; cross-workstream failures are fixed before any build reaches the founder; one coherent playable internal alpha, never four disconnected implementations |

## Workstreams

| WS | Scope | Session / branch | State |
|---|---|---|---|
| **WS-1 Extraction + memory** | #63 pronoun fix; "Tell the rest" fragment context; processing past the eight-item cap (FD-30c); realistic narrative corpus and live-model probe (`evals/narrative/`); dedupe/correction/Undo verification | coordinator session, `claude/kinship-end-to-end-completion-67e702` | core fixes built and live-tested 30 Oct; black-box pending |
| **WS-2 Electric Garden design system** | tokens, type, botanical art components, fluid photo mask, grain, dawn wash; re-skin Welcome/Setup, Today, People, Person, Tell/review, What Kinship knows, Moment detail, hand-off, Settings, empty/quiet/error states; light/dark, Reduce Motion, Dynamic Type | session `ws2-electric-garden`, branch `claude/ws2-electric-garden-5ec0d5`, PR #71 (draft) | complete for pass 1 at 68fe88b (31 Oct): every 2.0 surface, 976 tests, 21 native rows / 33 screenshots, five walk defects fixed; the review sheet and a kept card with lines not yet seen natively (WS-5) |
| **WS-3 Showing up: Today reasons, SUA-1, notification** | RSN-06 promise reasons, RSN-07 open-thread reasons in `todayModel.ts` + server candidates; SUA-1 gesture line under Message/Call on hand-off + Moment detail; one private local notification for the day's Moment with D4 caps; content-free analytics | session `ws3-showing-up`, branch `claude/ws3-showing-up-c2c5a0`, PR #69 (draft) | complete at 0f2eecd (31 Oct): four features, Jest 998, showingup.blackbox green on its own gateway; Paused/Remembered gate in; native rows by WS-5. Harness finding: a dropped first push under parallel PostgREST load leaves the capture insert in the outbox with no retry tick in the harness (the shared cause of "Understanding…" stalls); run suites one at a time |
| **WS-4 Alpha trust floor** | Remembered/Paused person controls (D13, PER-06); export (SET-04); delete-account v2 (SET-05); safe duplicate-person merge (PER-05); honours Remembered/Paused everywhere Today/reasons/notifications read people | session `ws4-trust-floor`, branch `claude/ws4-trust-floor-176a4a`, PR #70 (draft) | complete at 909907e (31 Oct); native walk by WS-5 |
| **WS-6 Ask Kinship v1 (WS-1's deliverable, FD-30g)** | grounded, model-free retrieval over the user's own memory from the People search field: matching lines grouped by person with their sources; "nothing about that yet" when none; never a chat | session `ws6-ask-kinship`, branch `claude/ws6-ask-kinship-72d73c`, PR #73 (draft) | complete at 759cf6b (31 Oct): WS-1 review of ten findings on PR #73 all fixed with tests; native walk by WS-5 |
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

**31 Oct, later:** `narrative.blackbox` 3/3 after the migration. k19 and today: the first case in each file times out at ~31 s when the machine is busy (load 20+) and passes alone (k19 "hand: on Chris" 6.9 s; today 2/2 in 3 s on the shared gateway, a control run): a harness cold-start flake, not a product defect; re-run a first-case timeout alone before counting it.

**31 Oct, midday:** WS-5's native journey (28 of 33 rows PASS on the integration build with the live model; `docs/product/alpha-walkthrough.md` on `claude/alpha-integration`) found one WS-1 defect: a told-again move was kept beside the user-edited one. Fixed at `8985610`: such an update is held and the phone asks "Does this replace what you told me?"; migration **`20261031100000_v2_user_chosen_closure.sql`** lets exactly the user's yes close the edited line (pgTAP 59 plan 34). Both 31 Oct migrations must reach production before the gateway deploy. Model allocation (FD-30i) applied: WS-2/3/4/5/6 on Sonnet 5.5 at medium effort.

**31 Oct, afternoon: local stack outage.** The Docker disk under Colima filled (the `supabase_db_kinship` container's json log reached 49 GB), so Postgres could not write and every REST call returned 503 until space is freed; the fix (emptying that one log file, no database data) needs the founder's explicit yes and was not performed by any session. The log is dominated by a burst at ~17:23 UTC of `version conflict on captures.<id> (current is 4, got 4)` from a PATCH setting `feedback` and `version` (the Kept card's "Got it right") by three e2e accounts. Findings: the product sync engine's conflict path is bounded (`maxRebases`; `src/store/__tests__/syncRetryBound.test.ts`, 1 test: a feedback write against a capture the server advanced rebases once and lands, repeated syncs send nothing more); WS-3's harness nudge is now bounded (bbcb03f); the likeliest source is stale sessions of finished black-box tests that keep running in the same jest process and re-push old capture updates; not proven. Hardening to propose after recovery: cap Docker log size for the Supabase containers.

Open in WS-1: re-run k19 and today black-box alone at normal load; a failed passage retold is judged by Option A's recovery accounting (ledger K31 note); review and integrate WS-6 (Ask v1) as WS-1's deliverable (FD-30g); a `narrative.blackbox.tsx` suite over the saved replies.

## WS-2 · Electric Garden

_Section owned by the WS-2 session._

## WS-3 · Showing up

_Section owned by the WS-3 session._

## WS-4 · Trust floor

_Section owned by the WS-4 session; its full record is `docs/agent-loop/ws4-trust-floor-handoff.md` on `claude/ws4-trust-floor-176a4a` (PR #70, head 909907e, 31 Oct): branch, migrations, tiers (Jest 103 suites, Deno 11, pgTAP 72/40/61/64/68, black-box trustfloor PASS), the exact native steps for WS-5, caveats, and the one-line Today hook (`isProactiveEligible` from `src/store/peopleStates.ts`; server `person_proactive(person_id, user_id)`). The "absent Storage counts as empty" tolerance lives only in the local runner `e2e/serve-delete-account.ts`; the deployed function fails loudly (Deno test). Readiness NOT READY._

## WS-5 · Integration

_Section owned by the WS-5 session, on `claude/alpha-integration`._

## WS-6 · Ask Kinship v1

_Section owned by the WS-6 session._

## Continuation prompt (for a new coordinator thread)

> Read `docs/agent-loop/PRODUCT_DELIVERY_HANDOFF.md` on `origin/claude/kinship-end-to-end-completion-67e702` first, then `CLAUDE.md` and the contract. Check each workstream branch's state (`git fetch --all`; the PRs listed in the handoff), continue the open WS-1 items on this branch, and run the integration step when WS-2..4 report. Do not restart the analysis; the decisions above govern.
