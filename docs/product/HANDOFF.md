# Kinship: session handoff (7 Oct 2026)

> **Addendum, 19 Oct 2026, evening: NATIVE-SIMULATOR run for B7/B8 (PR #56, `26a8a90`), rows 1, 2, 4 and 6 PASS, row 3 PASS except step 3; not merged; no deploy; no install; B9 NOT STARTED.** This supersedes the addenda below where they differ.
> - **How:** a Release simulator build of the branch against the local stack and **this branch's own gateway** (the app has no gateway override, so `EXPO_PUBLIC_SUPABASE_URL` was pointed at a harness-only proxy on :54399 that sends `/functions/v1/*` to :8000 and the rest to :54321); the stub on :8791 in record mode (live model, 9 calls); a fresh local account with the founder's People plus Susan and Dana. Brief §26 and §27 NATIVE-SIMULATOR rows; screenshots `docs/product/screens/b7b8-sim/`. Row 5 (real people) is the founder's and was not run.
> - **Two things for the founder:** (1) row 3 step 3: the provenance under a composed Before line ("Previously lived in Alameda, California") opens B5's sheet of its notes, not the Source view of the move's note (the single-line `HistoryRow` does open the closer's note); the brief's choice 3, the PR text and the checklist say the note, the brief's §27 "What B8 is" and choice 4 say the sheet: **fixed after the run and re-verified on the simulator: PASS** (`9e775c4` rebuilt; the provenance under "Previously lived in Oakland, California" opens the Source view of the "moved to Colorado" note, the line's words still open the sheet; `screens/b7b8-sim/row3-step3-provenance-after-fix.png`). (2) Under a current line with two "Before:" lines ("Moved to Colorado" after California + Alameda) the Edit and Not this pills render at a tiny font, reproducibly; one "Before:" line renders fine; cause: `Pill`'s auto-shrink misfiring on a re-layout; **fixed in the parent session** (the quiet pill no longer auto-shrinks and keeps its width; the provenance wraps instead; `pillActions.test.tsx`), **simulator re-run on `6b0ca4d`: PASS in all three cases** (default iPhone 18 Pro, compact iPhone 17e, and accessibility-extra-large text: pills full size, the provenance in full, wrapping under large text; `screens/b7b8-sim/pills-after-fix-{default,compact,large-text}.png`). No product code changed in this (simulator) session.
> - **Local stack:** the shared `functions serve` and the stub on :8790 untouched; this session's stub, gateway and proxy stopped by PID afterwards; the local DB gained only the simulator test account's rows.
> - **Readiness: NOT READY** (unchanged).

> **Addendum, 19 Oct 2026, later still: Phase 4B B7 and B8 BUILT on `claude/phase4b-b7-b8` (one PR against `main`, from `2c2e596`); not merged; no deploy; no build; B9 NOT STARTED.** This supersedes the addenda below where they differ.
> - **What changed (app only; no migration, no gateway change, nothing persisted):** **B7**, the Portrait's Lately shows one valid chain of residence lines as one line, the most specific line's own words ("Susan lives in Alameda"), dated by the chain's newest member; fail open to every line without a chain (brief §26; `relationship-page-rules.md`). **B8**, What Kinship knows in the approved sections (Background · Into · Hoping to · Plans · Their people · Between you), placed by B1's closed taxonomy, computed every time; the composed residence line first in Background; "Susan works at Meta" reads "Works at Meta" by brief §4's rule (Edit keeps the words); a related person's lines under "Michelle · sister"; a quiet **Before** with "Previously lived in Alameda, California" (or the old line in its own words) only when every kept closer records a change, dated by the note that told it; Undo and Not this on the closer clear it (brief §27). Coverage rows 14, 14 › Background (I7) and 12 › Lately are BUILT (native pending), with a "B7 + B8" section.
> - **For the founder's review (brief §27 choices):** a closer later replaced still counts as evidence; residence history grouped by the closing note (corpus fixture res-076 updated, manifest refrozen); a Before line's provenance opens the note that told the change; Edit and Not this on a Before line act on the closed line; a resolved thread with no recorded ending stays listed as before; "Sister" / "Mom" as a heading with no name; "Plans" as the label.
> - **Evidence:** UNIT (Jest 99 suites / 936 tests with `TZ=UTC`; Deno 452; tsc and eslint clean, 0 errors), INTEGRATION (`b7Proofs` 14, `b8Proofs` 14, `portraitDedupe` 13, `recordSections` 16, `recordSectionsViews` 5 through the real pipeline, write rules, sync and views; the semantic corpus 80/80 now checking the Portrait and grouped history), BLACK-BOX (`b7b8.blackbox` 4/4 replayed against this branch's gateway; regression `b5.blackbox` 4/4, `b4.blackbox` 5/5), LIVE-MODEL not run (no model path changed), NATIVE-SIMULATOR and FOUNDER-DEVICE not run (no build this session). The founder's checklist: `b7-b8-device-checklist.md`.
> - **Local stack:** the shared `functions serve` (handoff worktree, a pre-B3 commit) and the stub on :8790 untouched; this session's own stub (:8791) and gateway (:8000, this branch) stopped by PID afterwards. The shared local DB is unchanged (no new migration; the suites' test accounts only).
> - **Rollout, on the founder's go:** merge (a merge commit; no migration, no gateway deploy), then a build; then the checklist. Then B9 on its own gate. Nothing from PR #52, the Today exploration or CC-28 is in this PR.
> - **Readiness: NOT READY** (unchanged).

> **Addendum, 19 Oct 2026, later: K26, K27 and K28 VERIFIED on the founder's device ("ok I'm good with the results"); nothing new pending.** This supersedes the addenda below where they differ.
> - The founder tested the fc06b10 build against gateway v15 and is good with the results: K26 (contextual "You could mention"), K27 (a later note connects to a known pet) and K28 (the page's complete return loop) move to VERIFIED in the ledger. Not reported row by row.
> - **Still open:** N18 (a season-only milestone leaves the page after its season's first month; logged, not fixed); the opener copy under "You could mention" stays a proposal unless the founder says otherwise; B6's report reading and stop gate; CC-28's strategy work (docs only).
> - **Readiness: NOT READY** (for the wife's dogfood; unchanged).

> **Addendum, 19 Oct 2026: K27 MERGED (PR #50, `main` `9ae900a`) and ai-gateway v15 deployed from it; the phone's build is unchanged (app untouched).** This supersedes the addenda below where they differ.
> - **Merged** by the founder; **ai-gateway v15** deployed from `main` `9ae900a` (19 Oct), verified with `functions download --use-api`: all 27 deployed files match the checkout, the K27 pipeline among them; JWT verification on. **No migration**; production's latest stays `20261016090000`. **No build**: the fc06b10 build on Thor iPhone is current.
> - **Next:** the founder's rows 11–14 of `k28-device-checklist.md` on the phone, with row 13 their real Fluffy (told before the fix, no row: the words alone connect them). Rows 1–10 (K28 + K26) still pending. The B6 report's reading and stop gate are unchanged.
> - **Readiness: NOT READY** (unchanged).

> **Addendum, 19 Oct 2026: PR #50 (K27, CC-27) merged to `main`; this branch reconciled by the rule in the CC-28 addendum below.** Both addenda are kept as their branches wrote them, K27's first; in `KINSHIP_2_DECISIONS.md` CC-27 precedes CC-28; nothing renumbered; the complete plan regenerated. K27's own rollout (gateway v15 on the founder's go) is unchanged.

> **Addendum, 18 Oct 2026, later: K27 FIXED on `claude/k27-fluffy` (CC-27); not merged, not deployed; a gateway deploy follows the founder's review.** This supersedes the addenda below where they differ.
> - **What changed (gateway only; no migration, no app change):** the three corrections of `k27-diagnosis.md`, together. The naming statement ("Chris has a dog named Fluffy") now makes the related row from the note's own words; a name not in People that is a known companion of the line's own person is filed on that person (known from a related row **or from an existing line's own words**, so the founder's existing Fluffy works with no backfill), never across people or beside a namesake in People; a known pet's recovery is never the person's health. The clarification question is unchanged for anyone Kinship doesn't know. Decision: CC-27. Possessive pet facts ("Priya's dog Miso is twelve") stay the person's own line, as the corpus has them.
> - **Evidence:** UNIT (Deno 452: `k27.test.ts` 8; Jest 94 suites / 872 tests (`TZ=UTC`); tsc clean), INTEGRATION (extraction oracle, realistic and both replays pass every threshold; semantic corpus 80/80; `core-106` changed with review and the manifest rewritten), BLACK-BOX (`k27.blackbox` 2/2 replayed; regression removal 3, k4 36, k4legacy 18, k25 3, k20 22, h4 2, k10 1, dates 2, today 2, k19 2, k28 3, b3 20 (114 cases, every pipeline-touching suite)), **LIVE-MODEL PASS** (`k27.blackbox` 2/2 with the live model, 18 Oct, four calls on test words: the model's own shape of the founder's failure, now kept for Chris), NATIVE-SIMULATOR and FOUNDER-DEVICE not run (the phone needs the gateway deploy; `k28-device-checklist.md` rows 11–14).
> - **Rollout, on the founder's go:** merge (a merge commit), then deploy ai-gateway from `main` (v15). No build needed. Then the founder's rows 11–14, including their real Fluffy (row 13).

> **Addendum, 18 Oct 2026, strategy: CC-28 recorded (showing up beyond communication); docs only; NO BUILD.** This adds to the addenda below and changes none of them.
> - **The decision:** `KINSHIP_2_DECISIONS.md` CC-28. Showing up is an outcome, not a communication channel: Kinship helps users turn what they know about the people they care about into meaningful actions in those people's lives (presence, thoughtfulness, practical care, follow-through, shared experiences, connecting people, staying connected). The north star, the implemented loop and its contracts (`today-eligibility.md`, `relationship-page-rules.md`, §13–§15, §24) are unchanged. Memories create opportunities, never obligations. Relationship value before commerce: Memory → meaningful opportunity → user-chosen action → optional commercial fulfillment, with ten safeguards. Kinship is never an affiliate marketplace.
> - **Where it lives:** contract §1 (sources), §2 (the thesis beside the loop), §6 (the override), §11 rule 9 (the second standing test); plan §1, §15, §16, §24 (a measurement note; the metric and its gate unchanged), §28 (bucket D gains the Showing-Up Actions frame, bucket E the held items), §35; pointer notes in the epics and tickets; `KINSHIP_2_COMPLETE_PLAN.md` regenerated. The exploration: `docs/product/explorations/showing-up-actions-2026-10/` (opportunity brief, roadmap options, founder decision register). `approved-design-coverage.md` is untouched: no approved surface's status or deferral changes.
> - **The strict no-build boundary:** Phase 4B's order (B7 → B8 → B9 → employer evaluation → wife dogfood) and CC-25's Commit-next bucket are unchanged; nothing commercial or non-communication is inserted ahead of measurement, promise and open-thread reasons, minimal push or the trust floor. No gifts, events, calendar sync, checkout, partner or integration work starts; no Today ranking change; no Garden Letter production UI; no new model capability; no purchases, partner contact or affiliate enrolment. The recommended first probe (a fixed-template "You could…" gesture line, non-commercial, user-initiated, early Alpha after the wife dogfood) is a **proposal**, not an authorised build; it needs its own brief and the founder's yes. It validates contextual action suggestions only, not real-world outcomes; the outcome evidence is a later stage (`01-roadmap-options.md` §4).
> - **Reconciliation with K27 (PR #50, `claude/k27-fluffy`, open):** CC-27 is K27's fix; CC-28 is numbered after it. Both branches add an addendum at the top of this file and append an entry to `KINSHIP_2_DECISIONS.md`, so the second to merge will conflict in those two places. **Rule:** keep both, edit neither: the two addenda stand here newest first, each as its branch wrote it; CC-27 precedes CC-28 in the decisions file; no renumbering; `KINSHIP_2_COMPLETE_PLAN.md` is regenerated after the merge. This branch does not touch the ledger, coverage, `k27-diagnosis.md` or any code PR #50 changes. If PR #50 closes unmerged, CC-27 stays reserved for K27 and CC-28 keeps its number. Founder review (19 Oct): the strategic direction agreed; this correction pass made.
> - **Readiness: NOT READY** (unchanged).

> **Addendum, 18 Oct 2026: K28 + K26 MERGED (PR #48, `main` `fc06b10`, CI green) and the build installed on Thor iPhone; K27 diagnosed only; gateway stays v14.** This supersedes the addenda below where they differ.
> - **Merged** on the founder's "merge once CI is green" (a merge commit; PR #47's ledger commit landed through it). **The build:** a local EAS `dogfood-v2` build from `main` `fc06b10` (`npx eas-cli build --local`, Xcode 27), still 1.0.0 (2), installed by cable (`devicectl`, 18 Oct) on the founder's "let's build it so I can start testing". The bundle's `strings` hold the K26 suggestion copy, the page hand-off, the B6 report action, the production Supabase URL, and no model identifier. **No gateway deploy** (app-only fixes; v14 from `f6140c9` stays).
> - **Next:** the founder's device pass, `k28-device-checklist.md` (ten rows). K27's fix waits for the founder's go (`k27-diagnosis.md`; a gateway change). The B6 production report is unaffected (it runs at the phone's first sync of a build that asks; the founder reads `b6-dry-run-report.md`'s queries and stops there).
> - **Readiness: NOT READY** (unchanged).

> **Addendum, 17 Oct 2026, evening: K28 + K26 built (CC-26) on `claude/k28-k26-reach-out`; K27 diagnosed only; not merged, no build; B6's gate untouched.** This supersedes the addenda below where they differ.
> - **What changed (app only; no migration, no gateway change):** a Message or Call from a person's page with nothing to act on now carries the page's own return check (not a reason, not a Moment, nothing told to the server): "Did you reach Susan?", Yes records one conversation in the user's own word, Not yet nothing, then the optional "Anything worth remembering…" on the page with Tell Kinship · Nothing today (K28). "You could mention" is a deterministic preference over the person's current lines (`src/features/today/mentions.ts`), about the hand-off's subject first; a wedding "this fall" with no day is offered in the user's words with one fixed suggestion under it (copy a proposal) (K26). K23's reason-linked loop, T12 and Today's proactive rules are unchanged. Decision: `KINSHIP_2_DECISIONS.md` CC-26; contracts: `relationship-page-rules.md`, `today-eligibility.md`; coverage: the K28 + K26 section.
> - **K27:** `k27-diagnosis.md`. The usual shape of "Chris has a dog named Fluffy" creates no related row; told as "Fluffy will make a full recovery" from the follow-up about Chris, the live model files it on Chris but names "Fluffy", and the pipeline's name rule asks "Who is Fluffy?" (a related row would not have helped); the line is also raised to health. The smallest safe fix is proposed (a gateway change); nothing built.
> - **Evidence:** UNIT (Jest 94 suites / 872 tests, `TZ=UTC`; tsc and eslint clean, 0 errors), INTEGRATION (`returnStates` K28 through the real device record, store, sync and the Today model; the corpus and Deno suites untouched), BLACK-BOX (`k28.blackbox` 3/3 against this branch's gateway on the local stack: the whole Susan/Pedro flow of the brief's §5, a sparse page, Fluffy before ice skating; regression k20 22, today 2, k19 2, removal 3, b5 4), LIVE-MODEL (NOT APPLICABLE to K28/K26, no model path changed; four live calls for the K27 diagnosis on test words), NATIVE-SIMULATOR and FOUNDER-DEVICE not run. The founder's checklist: `k28-device-checklist.md`.
> - **Also logged, not fixed:** N18 (a season-only milestone leaves the page after the season's first month; the portrait's rule).
> - **Rollout, on the founder's go:** merge (a merge commit), a build (app only; gateway v14 stays). **B6's production report is unaffected**: it runs at the phone's next launch of a build that asks; nothing applies facets; B7 → B8 → B9 keeps its order.
> - **Readiness: NOT READY** (unchanged).

> **Addendum, 17 Oct 2026, later still: B5 FOUNDER-DEVICE PASS; B6 rolled out to Thor iPhone (ai-gateway v14 from `main` `f6140c9`); the production report waits for the phone's first sync and the founder's reading; B7 NOT STARTED.** This supersedes the addenda below where they differ.
> - **B5 is VERIFIED on device** (founder, 17 Oct: "B5 already passed on device", on the `53fbb38` build with gateway v13). Brief §24's evidence row updated.
> - **ai-gateway v14** deployed from `main` `f6140c9` on the founder's "prepare for B6 rollout on device" (17 Oct); verified with `functions download --use-api`: all 27 deployed files match the checkout (`report.ts` is among them; 25 before B6). **No migration**; production's latest stays `20261016090000`.
> - **The build:** a local EAS `dogfood-v2` build from `main` `f6140c9` (`npx eas-cli build --local`, Xcode 27), still 1.0.0 (2), installed on Thor iPhone by cable (`devicectl`, 17 Oct, 09:30 PDT). The bundle's `strings` hold the B6 report action and the B5 copy, the production Supabase URL, and no model identifier.
> - **What happens next, by itself:** the phone asks the gateway for the report once at its first sync of this build and records the answer; only the founder's account is reported (each account reports itself when it launches the build). **Then the founder reads** `b6-dry-run-report.md`'s queries for their account id in the SQL editor and decides. **Stop there:** no facet is applied; B9's gate is separate; B7 → B8 → B9 keeps its order. A rerun, if wanted, is `{"action":"semantic_report","again":true}` from the app's session, or deleting the account's `semantic_runs` row and relaunching.
> - **Readiness: NOT READY** (for the wife's dogfood; unchanged).

> **Addendum, 17 Oct 2026, later: B6 MERGED (PR #44, `main` `9d18d0e`, CI 4/4); nothing deployed, no build, production NOT RUN; B7 NOT STARTED.**
> - **Merged** on the founder's yes (a merge commit). PR #42's three commits landed through #44, so GitHub shows #42 as merged too; nothing else from it is pending. **No migration**; production's latest stays `20261016090000`.
> - **Next, each on the founder's go:** deploy ai-gateway from `main` (the `semantic_report` action is idle until a build asks); a build; the founder's own phone asks once at its first sync; then the founder reads `b6-dry-run-report.md`'s queries for their account id and decides. **Stop there:** no facet is applied; B9's gate is separate; B7 → B8 → B9 keeps its order. B5's device pass (PR #40's checklist) is still pending and rides on the same build.
> - **Readiness: NOT READY** (unchanged).

> **Addendum, 17 Oct 2026: Phase 4B B6 (the residence dry run, report only) is built and reviewed; production NOT RUN; B7 NOT STARTED.**
> - **Two sessions, one PR.** The B5 session built B6 on `claude/phase4b-b6-report` ([PR #42](https://github.com/fullcarts89/kinship/pull/42), from `main` `6abf088`). A second session, given the B6 task again, found that PR open, merged its commits unchanged into `claude/kinship-phase-4b-b6-1b22f0` (from `main` `94850bd`), reviewed it against the task's §3–§6 and closed three gaps (brief §25 "Review pass"): lines are examined by the user's own words, not only the model's statement; a line removed since a run loses its rows on the next; history is tallied as the composer decides it (every live closer must record a change). **The PR from `claude/kinship-phase-4b-b6-1b22f0` supersedes PR #42**; merge one, close the other. What was built, the choices, the evidence and the rollout: `phase4-implementation-brief.md` §25. The founder's report, its SQL and its stop gate: `b6-dry-run-report.md`.
> - **No migration.** B2's `residence_backfill_report` and `semantic_runs` hold it; the fingerprint is unchanged (md5 `abeadd9a…`). The gateway gains `semantic_report` (owner only, model-free, paged, writes only those two tables, the run recorded last); the app asks once per process after its first sync and records the answer. Nothing else is written anywhere: proved byte for byte over every user table and by the row count of every public table around each run on the local stack.
> - **Production:** the gateway deploy, a build and the founder's own run each wait for the founder's go; then the founder reads the queries for their account and decides. Nothing applies facets; B9's gate is separate; B7 → B8 → B9 keeps its order.
> - **Evidence (after the review pass):** UNIT (Deno 444, Jest 93 suites / 847 tests (`TZ=UTC`)), INTEGRATION (corpus 80/80; pgTAP 26 suites / 743 assertions, 0 failing, on Postgres 16.15 (Homebrew, the run-db-tests steps with psql in place of pg_prove); fingerprint of a fresh build 983 lines, md5 `abeadd9ad9b1d2041f9884299872c03e`, unchanged, no SQL changed), BLACK-BOX (`b6.blackbox` 4/4; regression b5 4, b4 5, b3 20, removal 3, k4 36 (one k4 case, run B, timed out at 32 s in the first full run under load and passed alone and in a full re-run of the suite) against this branch's gateway), LIVE-MODEL not applicable (model-free), NATIVE-SIMULATOR and FOUNDER-DEVICE not run. **B5's own device pass is still pending** (its checklist is [PR #40](https://github.com/fullcarts89/kinship/pull/40), open); B5 stays founder-approved and merged, not FOUNDER-DEVICE verified.
> - **Local stack:** the shared `functions serve` and stub on :8790 untouched; this session's stub (:8791) and gateway (:8000) stopped by PID afterwards. The shared local DB is unchanged (no new migration; the suites' test accounts only).
> - **Readiness: NOT READY.**

> **Addendum, 16 Oct 2026, night, later: B5 MERGED (PR #38, `main` `53fbb38`), ai-gateway v13 deployed from it, the build installed on Thor iPhone; B6 NOT STARTED.** This supersedes the addenda below where they differ.
> - **Merged** by the founder after the review round (N17 and mixed provenance built, commit `c7e6232`). **ai-gateway v13** deployed from `main` `53fbb38` on the founder's "build the gateway and install the updated app" (16 Oct, 23:54 UTC); verified with `functions download --use-api`: all 25 deployed files match the checkout (the gateway doesn't bundle `compose.ts`; B5 changed no gateway behaviour). **No migration**; production's latest stays `20261016090000`.
> - **The build:** a local EAS `dogfood-v2` build from the same commit (`npx eas-cli build --local`, Xcode 27), still 1.0.0 (2), installed by cable (`devicectl`). The bundle's `strings` show the B5 copy ("Lives in ", "From these notes", "From your notes") and no model identifier (the `noModelIdentifiers` guard passed in CI).
> - **Next:** the founder's device pass on B5 (brief §16 row 8 adapted: California then Alameda → "Lives in Alameda, California · and 1 other note"; tap → both notes; Not this on California → "Susan lives in Alameda"; moved to Colorado → Colorado with two Before lines; Undo → the composed line back); then B6 (report-only, stops for the founder). NATIVE-SIMULATOR and FOUNDER-DEVICE for B5: not yet run.
> - **Readiness: NOT READY** (for the wife's dogfood).

> **Addendum, 16 Oct 2026, night: Phase 4B B5 (the composed residence line and its provenance) is built; B6 NOT STARTED.**
> - **Branch `claude/phase4b-b5-compose`** (from `main` `ca4e208`, PR #36 merged; PR #37 merged in), [PR #38](https://github.com/fullcarts89/kinship/pull/38) against `main`. Not merged; nothing deployed; no build. What was built, the choices, the evidence and the rollout: `phase4-implementation-brief.md` §24.
> - **No migration, no gateway change.** `compose.ts` (pure, shared under `_shared/semantic/`) runs on the phone over the readings it already mirrors; the fingerprint is unchanged (md5 `abeadd9a…`). What Kinship knows shows a chain of residence lines as "Lives in Alameda, California" (· and 1 other note); the line opens its notes, each with Edit and Not this; Not this, an edit, a replacement and Undo recompose from the live lines. The Portrait is unchanged (B7); sections and "Previously lived in" wait for B8 (the renderer and the CC-20 rule are in `compose.ts`). The semantic corpus now reads pages with the product's composer (80/80).
> - **Founder review (16 Oct, night): approved in principle**, with two refinements asked for and built: N17 (a provably redundant broader phrase goes unsaid; "Alameda, CA" fails open) and neutral provenance on a composed line with one edited member ("From your notes · Oct 9 · one edited by you", copy a proposal). One way into the sheet and its copy: approved. History eligibility stays conservative. Brief §24 points 3 and 7. N16 (B4) stays open. Not merged; the founder's final review and merge are next.
> - **Evidence (after the refinements):** UNIT (Deno 422, Jest 92 / 843), INTEGRATION (corpus 80/80; `composeProofs` 21; pgTAP 26 / 743 re-run, no SQL changed), BLACK-BOX (`b5.blackbox` 4/4; b3 20, b4 5, removal 3 against this branch's gateway), LIVE-MODEL (`b5` 4/4). NATIVE-SIMULATOR and FOUNDER-DEVICE not run. B4 is founder-verified (PR #37: the device pass on a build with the gateway deployed from its branch); the ai-gateway deploy from `main` and a build remain the founder's steps, and B5 needs only the build.
> - **Local stack:** the shared `functions serve` (handoff worktree, replay) and the stub on :8790 were never touched; this session's own stub (:8791, replay then record) and gateway (:8000) are stopped afterwards by PID, never by port. The shared local DB is unchanged (no new migration).
> - **Readiness: NOT READY.**

> **Addendum, 16 Oct 2026, late night: the roadmap after Phase 4 is recorded (CC-25); docs only.** This supersedes the addenda below where they differ.
> - **Phase 4B is unchanged:** B4 → B5 → B6 (stop for the founder before any backfill) → B7 → B8 → B9 → employer semantics evaluation → low-coaching wife dogfood. CC-25 touched none of it. **B4 is built and merged** ([PR #35](https://github.com/fullcarts89/kinship/pull/35), `main` `a4ab5ac`; its addendum below); its ai-gateway deploy and build wait for the founder's go. **B5 is next.**
> - **After B9 and the employer evaluation, the roadmap pivots to return value**, not more semantics: internal showing-up measurement, promise and open-thread reasons, a minimal private push, Ask, and the trust floor before broader Alpha (Remembered / Paused, export, delete-account v2, safe duplicate merge). No semantic slot is added unless an Ask / retrieval failure or another concrete need pulls it.
> - **Where it lives:** `KINSHIP_2_DECISIONS.md` CC-25 (decision, buckets, reconciliation, open items); `KINSHIP_2_OPERATIONALIZATION.md` §28 (the bucket table) with CC-25 notes in §4, §13, §16, §17, §21, §22, §24, §35, plus pointers in the epics and tickets; `approved-design-coverage.md` (rows #23, #31, #34 and a CC-25 section); contract §11 rule 8. The audit itself is `audits/2026-10-16-roadmap-audit.md`: dated evidence, not canonical.
> - **Regenerated `KINSHIP_2_COMPLETE_PLAN.md`:** it had drifted from its sources (two founder notes were edited only into it, and its Part 2 stopped at CA-9). The notes were ported into `KINSHIP_2_OPERATIONALIZATION.md` and the file regenerated, so Part 2 now carries CC-1 … CC-25. Regenerate after editing any source: `python3 scripts/docs/build-complete-plan.py`.
> - **Nothing is started:** no push, reason, Ask, Intentions or semantic-slot work. Each Commit-next item gets its own brief for the founder first.
> - **Readiness: NOT READY** (unchanged).

> **Addendum, 16 Oct 2026, late: Phase 4B B4 (multi-item closure and its exact Undo) is built and MERGED (PR #35); founder device pass PASS; B5 NOT STARTED.** This supersedes the addenda below where they differ.
> - **Branch `claude/phase4b-b4-77358f`** (from `main` `e8eb975`, PR #34 merged), [PR #35](https://github.com/fullcarts89/kinship/pull/35) against `main`. Not merged; nothing deployed. What was built, the choices, the §10 matrix case by case, the evidence and the rollout: `phase4-implementation-brief.md` §23.
> - **No migration.** B2's schema and B3's rule already cover `closes_ids`, the apply and restore triggers and "still closed by another live closer"; the fingerprint is unchanged (md5 `abeadd9a…`). The gateway now sends every closure `relate.ts` finds (and the answer path what "Susan moved" also closes); the Kept card and What Kinship knows say everything a note replaced (the card showed no "Replaces" before B4; only the review sheet did).
> - **For the founder:** N16 (brief §23 choice 1): the stored "Susan moved" answer closes only the line the question named, so a second edited line stays current (fail open). "moved from <line> to …" is approved (no longer open).
> - **Rollout:** merge (merge commit), nothing to apply, ai-gateway deploy on the founder's go, then a build. Either order is safe.
> - **Local stack:** the shared `functions serve` (handoff worktree, replay) and the stub on :8790 were never stopped; this session's own stub (:8791) and gateway (:8000) are stopped afterwards (by PID, never by port). The shared local DB is unchanged (no new migration).
> - **Founder device pass (16 Oct, late): PASS, no issues** (`b4-device-checklist.md`, a build with the gateway deployed from the branch). **Merged** 16 Oct 22:51 UTC (PR #35, merge commit `a4ab5ac`, CI 7/7); nothing to apply (no migration; production's latest is still `20261016090000`). The ai-gateway deploy from `main` and the build are the founder's steps.
> - **Readiness: NOT READY** (for the wife's dogfood; B4 itself is founder-verified).

> **Addendum, 16 Oct 2026, night: PR #34 (B3) finished against the brief; B4 HAS NOT STARTED.** This supersedes the addenda below where they differ.
> - **Three deltas on `claude/phase4b-b3-9be47a`** (brief §22): **N13**, §5's approved re-derivation (`_shared/semantic/rederive.ts`; ai-gateway `rederive`, model-free, owner only; the app reports an edit after it syncs; the next Tell is the safety net; `write_facets` re-checks; only lines B3 has read). **N14**, the founder's rule: a bare city outside a broader residence is AMBIGUOUS (two lines, or one question with a change); "Hollywood, FL" and ordinary DISJOINT (Alameda → Colorado) unchanged. **N15**, the removal suite's weekday (harness only). No migration changed.
> - **Evidence:** unit, integration (corpus 65/65), black-box 16/16 plus every regression suite, live model 16/16. Native simulator not run for the deltas: the shared `functions serve` couldn't be swapped for the branch's gateway in this session (a branch gateway now runs beside it with `deno run` and `GATEWAY_URL`, e2e/README). Founder device not run.
> - **Local stack:** unchanged. The shared `functions serve` (handoff worktree, replay) and the stub on :8790 were never stopped; this session's own stub (:8791) and gateway (:8000) were stopped afterwards.
> - **Later the same night:** the founder approved Pilsen, "Susan moved", N13, N15 and one closure until B4. N14 was widened to the city level (an unqualified city outside the existing line's region or country is ambiguous: Los Angeles → "lives in Hollywood", Alameda → "lives in Portland"). Corpus 73/73. Open for the founder's review: "moved from Alameda to …" closes Alameda (§22 point 4).
> - **Readiness: NOT READY** (for the wife's dogfood; the PR's merge readiness is in the PR).

> **Addendum, 16 Oct 2026, evening: Phase 4B B3 (residence semantics) is built; B4 not started.** This supersedes the addenda below where they differ.
> - **Branch `claude/phase4b-b3-9be47a`** (from `main` `7bccd83`), PR against `main`. Not merged; nothing deployed. What was built, the choices, the evidence and what's needed before B4: `phase4-implementation-brief.md` §22.
> - **Migration `20261016090000_v2_closure_of_edited_lines`** (§21, forward-only, two function bodies, no backfill). Applied to the **shared local stack** (with B2's `20261015090000`, which it lacked) for pgTAP and the harness. Production gets it only by the founder's merge; then compare the fingerprint (967 lines, `abeadd9a…`).
> - **ai-gateway:** B3's residence reading runs in the gateway, so it needs a deploy from `main` after the merge, on the founder's go. The app build adds the question's screen side and Settings › About; deployment order is safe either way.
> - **Founder decisions waiting:** none of these any more: Pilsen and "Susan moved" were approved, N13 and N14 built (addendum above).
> - **Local stack:** the shared `functions serve` (handoff worktree, replay) and the stub on :8790 are as they were. During B3 Colima's forwarder was killed by a port-based `kill` and Colima was restarted (containers came back by themselves); never kill by port on this machine.
> - **Readiness: NOT READY.**

> **Addendum, 16 Oct 2026: the blocker check passed; the next phase starts.** This supersedes the addenda below where they differ.
> - **On `main` (`e098dfc`) and in production:** the blocker bundle ([#27](https://github.com/fullcarts89/kinship/pull/27)), H4 ([#30](https://github.com/fullcarts89/kinship/pull/30); [#28](https://github.com/fullcarts89/kinship/pull/28) merged into the blocker branch by mistake), B2 ([#29](https://github.com/fullcarts89/kinship/pull/29)). B2's migration was applied by the Supabase integration on merge (schema fingerprint 959 lines, `68c5cd45…`, checked); ai-gateway v11 deployed from `main`. Build from `e098dfc` installed on Thor iPhone.
> - **Founder's device check: passed** ("closing this out as passed"). K4, K15–K17, K19, K20, K23 VERIFIED. Logged for the next phase: K24 (Today's headline during a Tell, a founder decision first) and K25 ("Who is Matt?" → Choose from Contacts; design recorded in `approved-design-coverage.md`).
> - **Open:** [#31](https://github.com/fullcarts89/kinship/pull/31), no model identifier in the app bundle (with a guard test). Model names in server code, eval tooling and docs stay (founder, 16 Oct).
> - **CC-24 (16 Oct, later):** K24 (the dock alone shows "Understanding…") and K25 ("Who is Matt?" → Choose from Contacts) built on `claude/k24-k25-decisions`; B3's edited-fact rule recorded and its migration designed (brief §21) and **approved as written**, not built; B3 starts in a fresh session after the founder's device check. Founder's next check: `next-native-checklist-16oct.md` (K24, K25, H4 on a new account).
> - **Next:** H4's native check rides on this build. Phase 4B continues with **B3** (residence semantics); before it, the founder's answer on whether "She moved" may close a line the user edited (B2 report, brief §20). Then K24/K25 alongside.
> - **Readiness: NOT READY** for the wife's dogfood (the full journey, H4's native check and the founder's approval come first).

> **Addendum, 15 Oct 2026, night: the blocker bundle is closed internally; next is the founder's 5-minute check, then H4 and Phase 4B.** This supersedes the addenda below where they differ.
> - **Founder direction (15 Oct):** capture is now infrastructure; fix only N11, K20, K15–K17, K19, K23; defer K18 (semantic memory), K22 (H15/B8), K21 (optional resilience); then H4, with B2 in parallel.
> - **Branch `claude/native-pass-14oct`:** N11 `6131f3d`, K20 + K15–K17 server `6dac908`, K20 + K19 + K23 app `dde7556`, acceptance harness `aa5d829`, docs. Not merged.
> - **Evidence (per row in `bug-ledger.md`):** unit and integration green; black-box replay with the founder's People for every captured shape; live model (K4 ×12, K20 ×8, K23 ×4); **native simulator** on iOS 27 with the live model for every blocker. K20's phone cause was caught live on the simulator: told again the next day, the model merges into yesterday's promise.
> - **Founder's steps, when they say so:** merge (merge commit), deploy ai-gateway from `main`, build and install (no db push), then `blocker-device-checklist-15oct.md` (four checks, about 5 minutes).
> - **Simulator tier:** works again since N11; how to build and drive it is in `e2e/README.md`.
> - **H4 (Phase 4A's last step) is built** on `claude/h4-bring-back` (on top of the blocker branch): once the first Tell is memory, Today shows once how Kinship brings things back, with the user's own first Tell when it has a day to come, else the one example; Got it and it's gone, on every phone. Unit, first-run gate, black-box, and the native simulator (fresh account, live model). Copy beyond the approved headline is a proposal (`approved-design-coverage.md`, "H4"). With it, **Phase 4A is code-complete**; its native check comes with the founder's next build.
> - **In parallel:** Phase 4B · B2 runs in its own session and branch (`phase4b-b2`), stopping before B3.
> - **Readiness: NOT READY** until the founder's device check passes.

> **Addendum, 14–15 Oct 2026: the founder's device check failed; next thread.** This supersedes the addenda below where they differ.
> - **State:**
>   - `main` = `b9bf364` (PR #26, the reliability gate), with ai-gateway deployed from it on 14 Oct.
>   - The app built from it (`8a21c5b`, the same files) is on Thor iPhone (iOS 26.6.2).
>   - Branch `claude/native-pass-14oct` = `main` plus the ledger and summary below; not merged, no PR.
> - **The founder's check** (`reliability-gate-device-checklist.md`) failed at steps 1, 2, 4, 5, 7 and 8, and stopped at step 10. Logged as K15–K23. **Nothing fixed yet.**
> - **Read first:** `device-check-14oct-summary.md` (each issue, its cause or candidates, the recommended fix and the order) and the ledger rows K15–K23. K20 is reproduced: a plan-shaped "call John tonight" never reaches Today.
> - **Agreed testing rule:** no build reaches the founder's phone until every checklist step passes on the simulator, with:
>   - the live model,
>   - the founder's exact People (Anthony, Anthony Lopez, Sam Eden, Sam Doughty, Chris, Ben, John),
>   - data like theirs,
>   - every reply shape.
>
>   That needs N11 first: Xcode 27 builds don't launch on the iOS 27 simulator.
> - **Harness:** `e2e/README.md`. Colima, the local Supabase stack, `functions serve` and the replay stub may still be running from the last session; `npx jest -c e2e/jest.blackbox.config.js`, `LIVE=1` for live. The model key is in the gitignored `supabase/functions/.env.local`.
> - **Deploys:** run `supabase functions deploy` from a checkout under the home folder (Colima can't see /tmp). Merging from a session was blocked by the auto-mode check; the founder merges on GitHub.
> - **Readiness: NOT READY.** H4 and B2 stay stopped.

> **Addendum, 13 Oct 2026, night: the reliability gate (K8–K14).** This supersedes the addenda below where they differ.
> - **State:** branch `claude/native-pass-13oct`, ahead of `main` (`bc43dfd`); not merged, no PR. Production: ai-gateway v9 (`bc43dfd`), migrations through `20261013090000`.
> - **On the branch (FIXED, none VERIFIED):** K8, K9 (`ae17ba4`), K10 (`ca48f33`), K11, K13 (`959ecec`), K12, K14 (`6e4e831`), N9, N10 (`512d44c`); so K4, K2 and N6 are FIXED again. N11 is logged (Xcode 27 builds don't launch on iOS 27).
> - **Evidence:** `k-series-postmortem.md` § G. The acceptance harness is in `e2e/` (local Supabase stack, the real ai-gateway, replayed or live model).
> - **Founder's steps, when they say so:** merge (PR, merge commit); deploy ai-gateway from `main`; build and install. No `db push` this time. Then `reliability-gate-device-checklist.md`.
> - **Readiness:** READY FOR FOUNDER NATIVE PASS once deployed and installed. The native-simulator tier wasn't run (N11), so the device pass is the first native evidence. H4 and B2 stay stopped until the founder has done that pass.

> **Addendum, 13 Oct 2026: the K-series remediation pass (CC-22).** This supersedes the addenda below where they differ.
> - **State:**
>   - `main` = `90a5cf0` (PR #23 Phase 4 slice 1, PR #24 the Xcode 27 pod fix).
>   - Production: ai-gateway **v8** (since 10 Oct, = `609be4a`); migrations through `20261009090000`.
>   - The branch `claude/awesome-edison-3cuf6z` is ahead of `main` with the K-series pass. Not merged; no PR open.
> - **Built on the branch (FIXED, none VERIFIED):** K4, K5, K7 (server and app), K6 (app), K3, N6, K2, I2 (know it + ask it), with migration `20261013090000_v2_interaction_trail`. K1: new notes already became one line (PR #19 / I10), plus K4's mirror collapse; the founder's existing duplicate stays (no cleanup).
> - **The internal verification gate is in `k-series-verification.md`:** "What finished looks like", the matrices, break-the-test results, the reviewers' findings, the deployment table. The next native check is `k-series-native-checklist.md`.
> - **Founder's steps, in order, when they say so:**
>   1. Merge the branch into `main` (a PR; `main` requires one), with a merge commit.
>   2. The ai-gateway redeploy from `main`.
>   3. `npx supabase db push`.
>   4. The build.
>   K4, K5 and K7 run in ai-gateway: without the redeploy the phone tests old server code.
> - **Builds while the EAS quota is out (until 1 Nov):** `eas build --local` on the founder's Mac (Xcode 27, CocoaPods, fastlane and the Apple WWDR G3 certificate are installed), with `SENTRY_DISABLE_AUTO_UPLOAD=true`; install by cable with `xcrun devicectl device install app`.
> - **Founder decisions (CC-23):** CC-22's choices approved, with K5 never becoming the recipient's biography (pinned by a regression); no K1 collapse (the old duplicate stays as legacy data); I1's Message / Call rule settled; B2 approved, to proceed after merge and deploy in parallel with the native check, stopping after B2 before B3.
> - **Next:** B2 after merge and deploy (in parallel with the native check), then stop before B3; H4 (4A step 6) after the native check.
> - **13 Oct, late:** merged (`bc43dfd`), ai-gateway v9 deployed, migration applied, build installed. The founder's native pass failed K4, K2 and N6 (ledger K8–K14). Roadmap work (H4, B2) is stopped for a reliability gate proven through the real app path (`k-series-postmortem.md`).
> - **Readiness: NOT READY.** Nothing is VERIFIED.

> **Addendum, 8 Oct 2026, late: Phase 4 slice 1 built** (`KINSHIP_2_DECISIONS.md` CC-20, CC-21). This supersedes the addenda below where they differ.
> - **State:** branch `claude/awesome-edison-3cuf6z`, ahead of `main` (`609be4a`). Not merged; no PR open.
> - **Built on the branch, native check pending:**
>   - I4: the Kept card, with the approved copy;
>   - I6: the keyboard bar, with no new dependency;
>   - I1 with J3: the Moment detail sheet, and View <Person> landing on the line;
>   - H16 with N7: milestone Moments, and dated good news;
>   - N8: exact Undo. Migration `20261009090000_v2_exact_undo`, not yet applied to production.
> - **Phase 4B:**
>   - B0 is N8.
>   - B1 is the closed categorization taxonomy: `supabase/functions/_shared/semantic/categories.ts` and 44 evals. It is computed, never stored, and not displayed.
>   - **B2 waits for the founder to see B1's result.**
> - **Next in 4A:** I2 (with N6), then H4.
> - **New founder findings (12 Oct), STILL OPEN:** K1 (mirrored duplicate lines on Tyler's page) and K2 (a past-due promise under Coming up). Root causes are in `bug-ledger.md`; they aren't yet placed in Phase 4's order.
> - **Founder's steps:** the ai-gateway redeploy and the re-run of gate rows 1b, 2, 2b, 3, 5, 5b, 11 and 11b; then merge; `npx supabase db push`; then the build, when they say so. This branch changes nothing in ai-gateway.
> - **The next native gate:** `phase4-native-checklist.md`.
> - **Readiness:** NOT READY. This means Phase 4 is not yet ready for its next planned native dogfood milestone. It is not a return to Gate 0 stabilization (CC-21).

> **Addendum, 8 Oct 2026, evening: Gate 0 CLOSED, Phase 4 started** (`KINSHIP_2_DECISIONS.md` CC-19). This supersedes the addendum below where they differ.
> - **State:**
>   - `main` = `609be4a` (PR #22, the Gate 0 remediation, merged with a merge commit).
>   - Production has `20261008090000_v2_person_mentions` applied (checked 8 Oct, metadata only).
>   - The founder ran `gate0-remediation-checklist.md` on the new app build: every targeted scenario passed, and there has been no freeze since the first dogfood pass.
> - **Deployment gap: ai-gateway is NOT redeployed.**
>   - Production ai-gateway is still **version 7**, deployed 7 Oct 20:41 UTC and byte-identical to the PR #21 code (`5c551b9`). It was checked by comparing the deployed files with git.
>   - So PR #22's server halves are not live: I12 for new lines (no `person_mentions` written), I13's answer path, J1, J4's guard repair, J11.
>   - Next step for the founder: the redeploy (checklist step 4), then re-run gate rows 1b, 2, 2b, 3, 5, 5b, 11, 11b.
> - **Ledger:**
>   - VERIFIED: J2, J5–J9 and G5 (resolved; `app_stall` stays as passive observability).
>   - Partly VERIFIED: I12's existing lines and J4's row 2c copy.
>   - FIXED, waiting on the redeploy: I12 (new lines), I13, J1, J4, J11.
>   - Still FIXED, not re-run: I3, I5, I8, I9, I10, I11. They are checked again in the Phase 4 native pass.
>   - New from the Phase 4 code review: N6 ("Not yet" after a sync), N7 (year-dated good news) and N8 (Undo doesn't bring back a replaced line's moment, or reopen a closed thread).
> - **Phase 4:**
>   - **4A**, the UX and the loop, may proceed now, in this order: I4 → I6 → I1 → H16 → I2 → H4.
>   - **4B**, semantic memory for H15 (residence first), **waits for the founder's review of `phase4-implementation-brief.md`**: no schema, migration or semantic code before then.
>   - I2's one small additive migration (on `contact_events`) is listed in the brief and held with it.
> - **Readiness:** NOT READY for the wife dogfood. Phase 4 comes first, then a founder native pass.
> - **Standing rules unchanged:**
>   - no flags or user data changed without the founder's yes for a specific account id, and never looked up by email;
>   - `data-cleanup-plan.md` is not authorised;
>   - no build until the founder says so;
>   - migrations reach production only via `main` and the founder's `db push`; ai-gateway is redeployed by hand.

> **Addendum, 8 Oct 2026 (Gate 0 remediation).** Since this file was written:
> - `main` = `5c551b9` (PR #21, the I8 cold-start fix, merged); ai-gateway **version 7** was deployed from `main` on 7 Oct and matched it.
> - The branch `claude/awesome-edison-3cuf6z` now carries the narrow Gate 0 remediation pass the founder decided on 8 Oct: I12 + I13 (per-line person mentions, migration `20261008090000_v2_person_mentions` with a conservative backfill), J4, J1, J7, J2, J6, J5, the Today headline (J8), pet health (J9) and J11 (a misread "your promise" is asked about or kept, never dropped). Statuses: `bug-ledger.md` (J-series); surfaces: `approved-design-coverage.md`.
> - **Not merged; no PR open.** After merge the founder runs, in order:
>   1. `npx supabase db push` (the new migration and its backfill; the latest applied before it is `20261007090000`).
>   2. The ai-gateway redeploy.
>   3. The build, when they say so.
> - The targeted native gate is `gate0-remediation-checklist.md`. **Readiness: NOT READY** until it is run.
> - Eval corpus: `extraction-v2.9` (416 fixtures).
> - Not in this pass (founder): J3 (waits for I1), shared-hobby composition, H15, the semantic relationship model.

*Self-contained. A new session should be able to continue from this file and the repo alone. It was written after inspecting the repo, the production database and the edge functions on 7 Oct 2026. Nothing in product code changed while it was written.*

---

## A. Current state snapshot

### Repo
- **Repository:** `fullcarts89/kinship` (Expo SDK 54 / React Native, expo-router; Supabase backend).
- **`main`** = `aa7127e` "Merge pull request #19: Kinship 2.0 Core Trust Closure + Return Loop pass" (a merge commit). Earlier merges: #18 (stabilization), #17.
- **Working branch `claude/awesome-edison-3cuf6z`** = `main` + docs-only commits. It holds the round-4 feedback logs, the round-4 summary, the ledger I-series, CC-18 and this handoff. **No product code differs from `main`.** It is not merged and has no open PR.

### What PR #19 contained (now on main)
- **P0 trust fixes:**
  - H28: someone else's promise ("Tyler's promise", "Whose promise?").
  - H12: no other-Sam leakage.
  - H20: "My daughter Kaiya" resolves to Kaiya.
  - H25: a cancellation supersedes, with "Replaces: ~~…~~".
  - H13/H5: shared duplicates merged when the twin is saved.
  - H21: "Add Pedro" for named newcomers.
  - H14/H19b: source lines; "Source syncing…".
  - H30: edits keep lineage, "Edited by you · was: …".
  - H17: "Already known: …".
- **P1:**
  - H10/H11/H18: the return question carries its reason, persists across force-quit, "You reached out · date".
  - H26/H27: Coming up shows 7 days, with "and N more".
  - H9: no first-use flash.
  - H19: the Kept card has its own raised surface.
  - H24: "Your note".
  - H23: "was: ~~…~~".
  - H29: a quiet "Maybe" token.
- **P2:**
  - H1: rename a person.
  - H6: "Got it right / Not quite" stored on `captures.feedback` (migration `20261007090000`).
- **Telemetry:** content-free performance telemetry in `dogfood-v2` (see below).
- **Evals:** corpus `extraction-v2.5`, 407 fixtures.
- **Docs:** ledger, report, native checklist, cleanup plan, next-UX proposals, CC-16 and CC-17.
- **Checks at merge:** Jest 515 passing; Deno 146; pgTAP 454 (unchanged by the telemetry commit); tsc clean; ESLint 0 errors; free evals (oracle, realistic oracle, replays) had zero FAIL rows.

### Production (project `kddpxiiyxgvjrtpdkvio`)
- **Migrations:** the latest applied is **`20261007090000_v2_capture_feedback`** (checked 7 Oct). The founder applied it with `npx supabase db push`. **Migrations do not apply automatically on merge;** the founder runs `db push`.
- **ai-gateway:** **version 5**, deployed 6 Oct 2026 22:07 UTC, after the PR #19 merge at 21:43 UTC, so it is the merged code (including the `Server-Timing` header). It is redeployed by hand: `npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio`.
- **Flags:** per-user only. The founder's account and test account `97748654-19f8-4f2f-a7e6-81c5aa0e5e57` are enabled. **The wife's account is not enabled, and her user id has not been requested.**

### Dogfood build
- **Build:** the EAS profile `dogfood-v2` (extends `preview`, internal distribution), built from `main` after the merge and installed on the founder's iPhone. The wife's iPhone is registered for internal installs.
- **Its environment:** `EXPO_PUBLIC_V2_ENTRY=1`, `EXPO_PUBLIC_ANALYTICS_ENABLED=true`, `EXPO_PUBLIC_ANALYTICS_SCOPE=performance`, plus the Supabase URL and anon key. `EXPO_PUBLIC_POSTHOG_KEY` is an EAS environment variable (set for preview, production and development), never in the repo.

### Performance telemetry: ENABLED in dogfood-v2 (since PR #19)
- **Plumbing:**
  - typed, closed schema in `src/platform/analytics.ts`;
  - a filter in `src/platform/analyticsSetup.ts` (`performanceOnly`) lets only three events leave the phone;
  - our own PostHog sink (no SDK; no person profiles; no GeoIP; random per-install id);
  - documented in `docs/ops/analytics.md`.
- **`tell_lifecycle`**, once per Tell when its result is first on screen:
  - `outcome`;
  - `total_bucket` (Send → visible);
  - `sync_bucket` (Send → first gateway request);
  - `gateway_bucket` (the last request's round trip);
  - `server_bucket` (ai-gateway's `Server-Timing`);
  - `network_bucket` (round trip − server);
  - `render_bucket`;
  - `retries`;
  - plus the coarse `understood_bucket` / `shown_bucket`.
- **`tell_failure`:** `stage` (offline / timeout / server / limited / gave_up), `attempt`.
- **`app_stall`:** a JavaScript-thread block of ≥ 1 s while in the foreground, as `duration_bucket` and `tell_work`.
- **Never sent:** Tell or memory text, names, contacts, relationship content, Source content, location, ids. "Got it right / Not quite" is never sent; it stays on the note.
- **Retention:** the PostHog plan default (not configurable on the current plan). **No sampling:** every dogfood event is sent.
- **Not yet confirmed:** the founder hasn't yet reported seeing events in PostHog → Activity.
- **Approved additions, not built (Gate 0):**
  - Send → "Understanding…" visible;
  - the app backgrounded during processing;
  - coarse build version and platform.

### Readiness
- **NOT READY** for wife dogfood.
- The PR #19 build went through the founder's native pass (round 4) and surfaced P0s (I8, I10, I12, I13).
- The next possible label is **READY FOR FOUNDER NATIVE PASS**, after Gate 0.

### Exact outstanding blockers
- **Gate 0 P0s:** I8, I10 (+ reopened H13), I12 (option A), I13.
- **Gate 0 P1s:** I5, I9, I11, I3. Plus the I12b check and the telemetry additions.
- **G5 freeze:** still open until the Gate 0 native evidence (see the close rule in the ledger).

---

## B. Canonical bug ledger delta (applied in `docs/product/bug-ledger.md`)

**Statuses:** only FIXED · VERIFIED · STILL OPEN · DEFERRED · SUPERSEDED.
- FIXED = code changed.
- VERIFIED = the founder deliberately reproduced the original scenario on a physical iPhone and it worked.
- **Nothing was promoted to VERIFIED.**

**Coverage:** F1–F23, G1–G43, H1–H30 (+ H19b), N1–N4 and **I1–I13 (+ I12b)** are all in the ledger.

**Totals before round 4:** 72 FIXED (not device-verified), 3 VERIFIED (G19, G21, G38), 1 STILL OPEN (G5), 11 DEFERRED, 14 SUPERSEDED.

### Changed this round
- **H13 → STILL OPEN (reopened).** The saved-twin merge works, but a mirrored line that is **held** (ambiguous person) is never compared with its saved twin; reproduced as I10. Fixed together with I10.
- **G5:** still STILL OPEN, now with a **close rule**: the founder reports no freeze through the Gate 0 native pass **and** PostHog shows no `app_stall` ≥ 3 s across dogfood-v2 sessions in that window. Then VERIFIED on the founder's say-so.

### Added (I-series)

| ID | Title | Status |
|---|---|---|
| I1 | Moment detail | DEFERRED → Phase 4 (approved) |
| I2 | Interaction history | DEFERRED → Phase 4 (approved) |
| I3 | Remove a person + visible Edit | STILL OPEN → Gate 0 |
| I4 | Kept-card hierarchy | DEFERRED → Phase 4 (approved) |
| I5 | The shared Kept label names all people | STILL OPEN → Gate 0 |
| I6 | Keyboard dismissal / navigation | DEFERRED → Phase 4 (approved) |
| I7 | Historical state in What Kinship knows | DEFERRED → Phase 4 (folded into H15) |
| I8 | dogfood-v2 can reopen into 1.0 | STILL OPEN → Gate 0, **P0** |
| I9 | Line detail loses the confirmation | STILL OPEN → Gate 0 |
| I10 | Saved + held mirror → bad ambiguity | STILL OPEN → Gate 0, **P0** |
| I11 | Correction can't select several people | STILL OPEN → Gate 0 |
| I12 | Rename display (option A) | STILL OPEN → Gate 0, **P0** |
| I12b | "Maybe" on a factual promotion | STILL OPEN → Gate 0 (check; not a bug if the note hedged) |
| I13 | Subject correction keeps the old name | STILL OPEN → Gate 0, **P0** |

### Related but unchanged
- **H1 (rename):** stays FIXED; the display gap is I12.
- **G23 ("Both"):** stays FIXED; general multi-select is I11.
- **H21 ("Add Pedro"):** stays FIXED, since the behaviour is right; the layout is I4.

**Seen working in round 4, but NOT VERIFIED until the founder says so:** H21, H25, H29, H10, H20, H1 (apart from I12).

---

## C. Approved product decisions (recorded in `KINSHIP_2_DECISIONS.md` CC-16, CC-17, CC-18)

- **I12, option A.**
  - Display the person's **current** name through structured person references. Never rewrite the original Tell or the stored interpretation.
  - Source keeps the original words.
  - Titles use the full chosen name ("What Kinship knows about Cutie Pie").
- **I13.**
  - A subject correction makes the displayed statement stop naming the wrong person.
  - The original wording stays as corrected history (H30).
- **I11.**
  - Choosing several people is allowed when a memory is genuinely shared.
  - Never a generic People multi-select. *Kinship proposes what it can know; the user decides only what it genuinely cannot.*
- **I1 Moment detail.**
  - *Tap a reason → the reason; tap a person → the person.*
  - Shows the grounded reason, why now, timing, Source, Message / Call.
  - "View Ben" is secondary: a deep link with quiet emphasis.
  - Not field-heavy.
- **I2 interaction history.** A lightweight trail under **Between you**; not a CRM log.
  - **Know → infer → ask:**
    - a launched channel plus Yes is recorded directly;
    - a grounded plan plus Yes may infer in person;
    - a manual entry gets one tap of Message / Call / Video / In person.
  - **Type ≠ reason ≠ shared experience;** the type picker never grows an activity taxonomy.
  - Every record has provenance.
  - **No** counts, streaks, "last contacted", frequency, health or ranking.
  - "Anything worth remembering?" is optional, non-blocking, and shown only after meaningful interactions.
  - **One tap** usually; **two** only when information is genuinely missing.
- **I4 Kept hierarchy.**
  - Order: kept → needs attention ([Add Pedro] [Not now], with "Add him so this can appear on his page too.") → Correct this · Undo → "Did Kinship get this right? Got it right · Not quite".
  - Real controls. "Tap a line to correct it" is removed. Quiet Herbarium.
- **I6 keyboard.**
  - Done accessory; drag-to-dismiss; Today / People usable with the keyboard open; draft kept; never needing to tap blank space or content.
  - **Bottom navigation stays;** any editing-state chrome change is solved locally.
- **H15/H2 What Kinship knows.** Portrait = what matters now (Lately · Coming up · You said you'd · Between you, unchanged). What Kinship knows = organised durable reference memory.
  - **Sections:** Into · an aspirations / plans section · Background · their people / pets · Between you.
  - **Aspirational wording only when the source expresses hope, desire, a goal or aspiration;** ordinary plans are neutral.
  - "Their people" lives here, not on the portrait.
  - Empty sections disappear. No counts, completeness, ranking, goal tracking or CRM fields. Source on every line.
  - **I7 folded in:** meaningful superseded facts appear as clearly-past Background, never as current. A declined sensitive outcome stays out.
- **H16 milestones.**
  - Vocabulary: engagement, wedding, new job, promotion, baby, graduation, new home, retirement, move.
  - Recognise, never interrogate.
  - A dated milestone is eligible about 3 days before and on the day; Today priority decides; it is not repeated just because it is eligible.
  - No date: remember it, never ask.
  - It must be anchored to at least one established person; untracked participants keep their names.
- **H4 bring-back in first use.**
  - One concrete example; at most one extra screen; no carousel; no decorative motion; respects Reduce Motion.
  - Prefer the user's real first Tell when it naturally makes a future Moment.
  - Point to Today: "This is where Kinship brings things back, when they matter."
  - Test: a new user can explain Today without coaching.
- **H3 Ask Kinship:** roadmap only, as a post-wife-dogfood / Alpha candidate.
  - Memory-only answers, with sources; "I don't know" when unsupported.
  - Its own grounding, refusal and privacy evals; never a chatbot.
  - People search is not a substitute.
- **H22:** no work; monitor.
- **Telemetry:**
  - Content-free performance telemetry is enabled in dogfood.
  - The additions above are approved.
  - Feedback stays separate.
  - Retention and sampling are recorded before any non-dogfood rollout.
- **Data cleanup:** not authorised. The plan in `data-cleanup-plan.md` is preserved and needs an explicit yes. N3 (which Anthony is real) is the founder's call. No note or source is ever deleted.

### Genuinely unresolved (ask the founder at build time; don't decide silently)
1. **H15 labels:**
   - the aspirations / plans section name ("Hoping to", "Plans & hopes", or neutral plans placed elsewhere);
   - the people / pets section label.
2. **I3 removal semantics:** whether memories only about a removed person are archived with them (proposed: yes, restorable; shared memories stay with the others). Also the exact "Remove from People" confirm copy.
3. **I2 placement:**
   - where the manual "Add interaction" lives (the relationship page vs Between you);
   - whether the trail also shows in What Kinship knows.
4. **I1 form:** a sheet vs a pushed page (a sheet is closest to the approved boards).
5. **I12 mechanism (technical, not product):**
   - Lines currently store `statement` + `person_id`, with no name spans.
   - **Proposed:** record person-mention spans at extraction going forward; for existing lines, match the person's previous names (kept on rename) as whole words.
   - **Confirm** this is acceptable as "structured references where possible".

---

## D. Updated roadmap / build plan (CC-18)

### Gate 0: Final Trust Closure (next)
**P0:**
- **I8.** A signed-in account in the 2.0 build never falls back to 1.0 (not on a flag timeout, error or cold start).
- **I10 (+H13).** Saved + held mirrors collapse into one shared line; ask only "Which Sam?", never offering an already-resolved person; correct "why" copy. Hide "Nothing needs you today." behind a waiting question.
- **I13.** A subject correction fixes the displayed statement and keeps the history.
- **I12 (option A).** The current display name via structured references; full name in titles.

**With it:**
- **I5:** the Kept label names everyone on a shared memory.
- **I9:** closing a line's sheet returns to the same confirmation.
- **I11:** multi-person correction when genuinely shared.
- **I3:** a visible Edit and a soft, restorable Remove from People.
- **I12b:** check the source note.
- **The telemetry additions.**

**Do not broaden** the extraction architecture unless reproduction proves it necessary. Each fix: reproduce → root cause → failing test → narrowest fix. Free evals stay at zero FAIL.

**Then a short, targeted founder native gate** (not a broad exploratory cycle):
- relaunch never enters 1.0;
- Michelle + ambiguous Sam;
- a subject correction changes the displayed name;
- nickname rename rendering;
- the shared Kept label;
- multi-person correction;
- remove / edit a person;
- no freeze (G5 watch);
- telemetry sanity in PostHog.

If those are clean, the trust foundation is sufficient: move the centre of gravity to UX. Old F/G items don't all need VERIFIED first unless they block trust or the core loop; keep the ledger accurate.

### Phase 4: UX Hardening & Relationship Loop Completion
- **Capture / review:** I4, I6.
- **Moments / action:** I1, H16.
- **Return / relationship:** I2, with conditional, non-blocking "Anything worth remembering?".
- **Relationship memory:** H15/H2 with I7.
- **Activation:** H4.

Make the existing product coherent; **no speculative expansion.** Update `approved-design-coverage.md` as surfaces land.

### Wife dogfood (after Phase 4, low-coaching)
Rollout: build → founder review → founder native pass → fix → founder approval → enable her account only, with the founder's explicit yes for her id.

**Evaluate:**
- Does Today make sense?
- Does she understand why something came back?
- Does tapping a Moment keep context?
- Does she Message / Call from Kinship?
- Is the return loop effortless?
- Does interaction history feel useful, not creepy?
- Does What Kinship knows feel like memory, not a CRM?
- Is Tell still low-friction?
- Does she know why she'd come back?

### Alpha candidates
Grounded **Ask Kinship** first, then by evidence. The plan's old "Phase 4: Alpha" now follows the wife dogfood (note added in `KINSHIP_2_COMPLETE_PLAN.md` §28).

### Still not to build
About You UI, Garden, Relationship Landscape, a generic graph, a broad Opportunity Engine, Intentions, a full timeline / "Your story together", a generic task manager, relationship scoring, health indicators, streaks, importance ranking, personality onboarding, a chatbot, subscriptions, broad model benchmark / model-swap work.

---

## E. New-thread handoff (paste this into the new session)

```
KINSHIP — HANDOFF (7 Oct 2026). Repo: fullcarts89/kinship. Work on branch claude/awesome-edison-3cuf6z (main + docs only).

WHAT KINSHIP IS
A private relationship memory. North star: "Kinship remembers what matters in the lives of the people you care about and brings it back when it matters, so you can show up."
Core loop: Tell → Understand → Memory → Moment → Reason → real conversation → "Anything worth remembering?" → back to Tell.
It does NOT optimise engagement, time in app, streaks, logging, CRM maintenance, scores or "relationship health".

PERMANENT RULES (docs/product/KINSHIP_2_PRODUCT_CONTRACT.md; CLAUDE.md is mandatory)
- Silence beats a wrong detail.
- Every durable statement has a source.
- Nothing quantifies a relationship.
- Kinship reduces work, never creates maintenance.
- The app leads back to the actual person.
- Intelligence is invisible: no AI badges, sparkles, model names, confidence scores, tier labels, chat as a primary surface.
- Trust invariants: sensitive classes always confirm; two candidate people → one question, never a guess; the user's edit wins; copy is grounded; Kinship never sends anything; no user content in logs or analytics; no fake data in real accounts.
- Sources rank: later founder decisions (KINSHIP_2_DECISIONS.md, newest CC-18) > Design Direction + approved boards > KINSHIP_2_COMPLETE_PLAN.md > phase docs.
- No approved surface disappears silently (docs/product/approved-design-coverage.md).
- A new account never lands on an empty Today and People: app/__tests__/firstRun.test.tsx and .maestro/fresh-install.yaml are permanent gates.

DESIGN: THE QUIET HERBARIUM
Paper, ink, one pressed sprig per person (identity only).
- Serif (Newsreader) for people, sans (Instrument Sans) for the machine.
- No cards, badges, rings, counters, dashboards, gradients: hairline rows; one raised surface (sheets / Tell).
- Ochre marks only what was understood (provenance) and what you said you'd do.
- Tokens only from src/design/tokens.ts.
- Motion is restrained; Reduce Motion is respected.

BUILT (on main, PR #19 merged at aa7127e)
- 2.0 shell with setup / first use.
- Tell → ai-gateway understanding → review / Kept card (Undo, correction, "Got it right / Not quite") → memory with Source.
- People; relationship page (Lately · Coming up · You said you'd · Between you); What Kinship knows; Source view; Edit / Not this; rename.
- Today: moments (birthdays, good news, starts today, reasons, Coming up for 7 days).
- Message / Call hand-off + return question with its reason; "You reached out · date".
- Shared memories, superseding updates with lineage, held questions (which person, keep sensitive?).
- Encrypted local SQLite + sync; evals corpus extraction-v2.5 (407 fixtures).
- Content-free performance telemetry ENABLED in the dogfood-v2 build: tell_lifecycle (stage buckets), tell_failure, app_stall. Never content; "Got it right / Not quite" is separate. See docs/ops/analytics.md.
- Production: latest migration 20261007090000 applied; ai-gateway v5 (deployed after the merge).

BUG STATE: docs/product/bug-ledger.md is canonical
Statuses: FIXED (code changed) · VERIFIED (founder reproduced on a physical iPhone) · STILL OPEN · DEFERRED · SUPERSEDED. Never promote FIXED to VERIFIED yourself.
- VERIFIED: G19, G21, G38.
- G5 freeze: STILL OPEN; close only by the rule in the ledger (no freeze in the Gate 0 pass + no app_stall ≥3 s).
- H13: reopened by I10.
- Round 4 (docs/product/founder-feedback-4.md, founder-feedback-summary-4.md, screens/feedback4/):
  I1 Moment detail (Phase 4) · I2 interaction history (Phase 4) · I3 remove person + visible Edit (Gate 0) · I4 Kept hierarchy (Phase 4) · I5 shared Kept label (Gate 0) · I6 keyboard (Phase 4) · I7 history in What Kinship knows (Phase 4, with H15) · I8 2.0 build reopens into 1.0 (Gate 0, P0) · I9 line detail loses the confirmation (Gate 0) · I10 saved + held mirror → bad "who" question (Gate 0, P0) · I11 multi-person correction (Gate 0) · I12 rename display, option A (Gate 0, P0) · I12b "Maybe" on a factual promotion, check (Gate 0) · I13 subject correction keeps the old name (Gate 0, P0).

APPROVED DECISIONS: KINSHIP_2_DECISIONS.md CC-16, CC-17, CC-18 (read CC-18 in full). Highlights:
- I12 option A: the current name via structured references; Source keeps original words; full names in titles.
- I13: the statement stops naming the wrong person, with history kept.
- I11: multi-person only when genuinely shared; never a generic People form. Kinship proposes; the user decides only what Kinship can't know.
- I1: tap a reason → the reason. Moment detail: reason, why now, timing, Source, Message / Call; "View Ben" is a secondary deep link.
- I2: know → infer → ask. One tap usually. Type (message / call / video / in person) ≠ reason ≠ shared experience. No counts, "last contacted" or streaks. "Anything worth remembering?" optional, only after meaningful interactions.
- I4: kept → needs attention [Add Pedro] [Not now] → Correct this · Undo → feedback.
- I6: Done accessory, drag-to-dismiss, nav usable, draft kept; bottom nav stays.
- H15/H2: aspirational wording only when the source expresses it; their people in What Kinship knows only; I7 as clearly-past Background.
- H16: milestones; ~3 days + day-of; anchored to an established person; never interrogate.
- H4: one bring-back example; prefer the user's real first Tell.
- H3 Ask Kinship: roadmap only (Alpha candidate). H22: monitor.
- Open questions to raise, not decide: H15 labels; I3 removal semantics; I2 placement; I1 sheet vs page; I12 mechanism (proposed: mention spans going forward + previous-name match for old lines).

PLAN (CC-18): Gate 0 Final Trust Closure → short targeted founder native gate → Phase 4 UX Hardening & Relationship Loop Completion → low-coaching wife dogfood → Alpha candidates (Ask Kinship first).
- Gate 0 = I8, I10(+H13), I13, I12A (P0); then I5, I9, I11, I3, the I12b check, telemetry additions (Send→"Understanding…" visible, backgrounded-during-processing, coarse build version + platform).
- Don't broaden extraction architecture unless reproduction proves it necessary.
- Not to build: About You, Garden, Landscape, graph, Opportunity Engine, Intentions, timeline / "Your story together", task manager, scores, health, streaks, ranking, personality onboarding, chatbot, subscriptions, model benchmark / model-swap work.

TESTING AND READINESS
- Each fix: reproduce → root cause → failing test → narrowest fix.
- Checks: npx jest · npx tsc --noEmit · npx eslint app src · Deno: deno test -A --config evals/deno.json supabase/functions/ (install deno if missing) · pgTAP: bash supabase/tests/run-db-tests.sh · free evals (oracle, realistic oracle, replays) at zero FAIL. Paid evals only via the PR label run-evals-full.
- Readiness labels only: NOT READY · READY FOR FOUNDER NATIVE PASS · READY FOR WIFE DOGFOOD. Current: NOT READY (Gate 0 P0s). Never call anything ready from browser screenshots; the real iPhone is authoritative.

OPERATING RULES
- No model identifiers in commits, PRs or code.
- Commit trailer: Co-Authored-By + Claude-Session lines as instructed by the session.
- Don't open a PR unless asked; merge only when the founder asks, with a merge commit.
- Migrations are forward-only. Production gets them only after merge, when the founder runs `npx supabase db push`. ai-gateway is redeployed by hand after merge.
- Never change production flags or user data without the founder's explicit yes for a specific account id. Never look accounts up by email. Data cleanup (docs/product/data-cleanup-plan.md) is NOT authorised.
- Founder's Mac: use `npx supabase …` and `npx eas-cli …`. For Supabase CLI commands, not `supabase login` (the Keychain prompt loops): before starting Claude Code, the founder exports the token in Terminal with `export SUPABASE_ACCESS_TOKEN=` (the token pasted straight after the `=`), and Claude Code then runs the Supabase commands itself. Never ask for the token in chat, and never print it. A command that needs interactive input (`db push` asking for the database password) goes to the founder as the exact line to run in Terminal. The founder deletes the token in Supabase when the day's Supabase work is done. Notes from 10 Oct: a Claude desktop-app session doesn't see a variable exported in Terminal; "Invalid access token format" means the variable holds something that isn't a token (`unset SUPABASE_ACCESS_TOKEN`, then export it again); with the variable unset, the CLI's stored login worked. Build: `npx eas-cli build --profile dogfood-v2 --platform ios`.
- The founder wants explicit step-by-step instructions, concise answers, and no unnecessary questions.
- Don't build an app binary until the founder says so.
```

---

## F. Kickoff prompt (paste after the handoff block)

```
Start GATE 0 — Final Trust Closure.

1. Read CLAUDE.md, docs/product/HANDOFF.md, KINSHIP_2_DECISIONS.md (CC-18 in full), docs/product/bug-ledger.md (I-series, H13, G5), docs/product/founder-feedback-4.md and founder-feedback-summary-4.md, and look at docs/product/screens/feedback4/.
2. Confirm the state matches the handoff (branch, main, latest migration). If anything differs, tell me before changing code.
3. Before coding, reply with your Gate 0 plan: for each of I8, I10(+H13), I13, I12A, I5, I9, I11, I3, I12b and the telemetry additions, give the reproduction, the suspected root cause, the failing test you'll write, and the narrowest fix. Ask me ONLY the genuinely open questions that block Gate 0 (I3 removal semantics; the I12 mechanism). Use your recommendation for anything else.
4. After I reply, implement P0s first, then the rest. For every item: reproduce → root cause → failing test → narrowest fix. Keep the free evals at zero FAIL and all checks green. Update the ledger (FIXED only, never VERIFIED) and approved-design-coverage.md.
5. Finish with a short targeted native checklist for me (the Gate 0 native gate list in the handoff), what I need to run (db push / ai-gateway deploy / build), and the readiness label.

Do not merge, do not build the app binary, do not touch my data or flags, and do not start Phase 4.
```
