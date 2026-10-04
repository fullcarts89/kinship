# PR #13 repository-size audit

[fullcarts89/kinship#13](https://github.com/fullcarts89/kinship/pull/13) (Checkpoint C: AI gateway and evaluation harness) against `main` at `e3df441`. Audited 4 Oct 2026, before merge, at the founder's request: GitHub showed more than 400,000 changed lines.

**Recommendation: SAFE TO MERGE.**

- **Where the size came from.** 97.7% of the 407,666 added lines were pretty-printed raw output from paid eval runs. That output was 8.8 MB, or 0.8 MB packed in git.
- **The implementation itself** is about 7,100 lines: runtime, tests and eval tooling, of which about 5,700 are non-blank, non-comment.
- **Nothing accidental.** There are no secrets, no real-user data, no dependencies, no build output and no caches.
- **The eval output is now kept compactly** (see the retention policy below). The PR shrank to **+9,624 / −7 lines** before this document.
- **The evaluated runtime is unchanged.** One migration line was added: an explicit grant that makes a production default privilege explicit. It is a no-op in production; see "Migrations".

## 1. Size as GitHub showed it

| | Files | Added | Deleted | Bytes at head |
|---|---|---|---|---|
| Before the audit (`673fd24`) | 65 (58 added, 7 modified, 0 deleted) | 407,666 | 7 | 9,536,583 |
| After cleanup (`59e6915`) | 62 (54 added, 8 modified, 0 deleted) | 9,624 | 7 | 848,941 |

Net changed lines after cleanup: +9,617. Changed bytes: 785,328.

## 2. Breakdown by category

**Before cleanup** (as GitHub showed it):

| Category | Files | Lines added | Bytes | Non-blank, non-comment |
|---|---|---|---|---|
| Production app code | 0 | 0 | 0 | 0 |
| Client/UI code | 0 | 0 | 0 | 0 |
| Supabase Edge Functions (runtime) | 10 | 2,696 | 123,919 | 2,093 |
| SQL migrations | 3 | 768 | 36,365 | 589 |
| Deno tests | 5 | 1,078 | 70,838 | 931 |
| pgTAP tests | 5 (3 new, 2 modified) | 404 (−4) | 30,937 changed | 336 |
| Jest tests | 0 | 0 | 0 | 0 |
| Eval runner/framework | 10 | 1,475 | 78,334 | 1,254 |
| Hand-authored eval fixtures and config | 9 | 512 | 180,325 | 512 |
| Prompts and schemas | 5 | 485 | 39,624 | 338 |
| Documentation | 5 (3 new, 2 modified) | 1,898 | 130,215 changed | — |
| **Saved raw model eval results** | **8** | **398,148** | **8,774,588** | — |
| Generated manifests/reports | 1 | 23 | 1,057 | — |
| Dependency/vendor/build artifacts | 0 | 0 | 0 | 0 |
| Other (CI workflows, tsconfig, eslint) | 4 (1 new, 3 modified) | 179 (−3) | 7,138 changed | 159 |

**After cleanup:**

| Category | Files | Lines added | Changed bytes | Non-blank, non-comment |
|---|---|---|---|---|
| Supabase Edge Functions (runtime) | 10 | 2,696 | 123,919 | 2,093 |
| SQL migrations | 3 | 776 | 36,967 | 591 |
| Deno tests | 5 | 1,078 | 70,838 | 931 |
| pgTAP tests | 5 | 412 (−4) | 31,648 | 342 |
| Eval runner/framework | 11 | 1,487 | 78,909 | 1,261 |
| Hand-authored eval fixtures and config | 9 | 512 | 180,325 | 512 |
| Prompts and schemas | 5 | 485 | 39,624 | 338 |
| Documentation | 5 | 1,907 | 131,283 | — |
| Saved eval results: 2 `.json.gz` (binary, 0 diff lines) and the `RUNS.md` index | 3 | 50 | 83,018 | — |
| Generated manifest | 1 | 23 | 1,057 | — |
| Other (CI, `.gitignore`, tsconfig, eslint) | 5 | 198 (−3) | 7,740 | 178 |

Fixture files are one case per line (JSONL), so their line count understates their size: 512 lines, 180 KB.

## 3. The 25 largest changed files, before cleanup

**By lines:**

| File | Lines | Bytes |
|---|---|---|
| `evals/results/full/2026-10-04T15-20-01-opus-5-5-low-c1-run.json` | 66,700 | 1,469,266 |
| `evals/results/full/2026-10-04T06-52-45-opus-5-5-low-final-run.json` | 65,361 | 1,440,296 |
| `evals/results/full/2026-10-04T06-01-32-opus-5-5-low-full-run1.json` | 64,710 | 1,429,742 |
| `evals/results/full/2026-10-04T06-24-28-opus-5-5-low-full-run3.json` | 64,039 | 1,410,546 |
| `evals/results/full/2026-10-04T06-15-26-opus-5-5-low-full-run2.json` | 64,021 | 1,410,187 |
| `evals/results/full/2026-10-04T06-45-45-opus-5-5-low-full-run3b-repeat.json` | 63,989 | 1,409,353 |
| `evals/results/smoke/2026-10-03T23-59-11-opus-5-5-low-smoke-run3.json` | 4,693 | 103,204 |
| `evals/results/smoke/2026-10-03T23-52-43-opus-5-5-low-smoke-run2.json` | 4,635 | 101,994 |
| `docs/phase1/checkpoint-c-ai-verification.md` | 1,479 | 103,851 |
| `supabase/functions/_shared/extraction/pipeline.ts` | 886 | 41,106 |
| `supabase/functions/_shared/extraction/dates.ts` | 563 | 25,679 |
| `supabase/functions/_shared/extraction/pipeline.test.ts` | 554 | 39,648 |
| `supabase/migrations/20261004100000_v2_capture_reviews.sql` | 365 | 16,862 |
| `evals/extraction/lib/layers.ts` | 348 | 21,985 |
| `evals/extraction/lib/grade.ts` | 343 | 19,534 |
| `supabase/functions/ai-gateway/handler.ts` | 299 | 12,224 |
| `supabase/migrations/20261004090000_v2_ai_gateway.sql` | 277 | 13,472 |
| `evals/extraction/lib/fixture.ts` | 262 | 10,687 |
| `supabase/functions/_shared/extraction/lexicon.ts` | 253 | 16,952 |
| `supabase/functions/ai-gateway/handler.test.ts` | 242 | 11,020 |
| `supabase/functions/_shared/prompts/relationship_extract/v1.ts` | 209 | 11,544 |
| `supabase/functions/_shared/extraction/types.ts` | 204 | 6,557 |
| `supabase/tests/database/56_v2_ai_gateway.test.sql` | 187 | 16,241 |
| `supabase/functions/_shared/extraction/dates.test.ts` | 186 | 15,241 |
| `evals/extraction/run.ts` | 171 | 9,316 |

**By bytes:**

| File | Bytes | Lines |
|---|---|---|
| `evals/results/full/2026-10-04T15-20-01-opus-5-5-low-c1-run.json` | 1,469,266 | 66,700 |
| `evals/results/full/2026-10-04T06-52-45-opus-5-5-low-final-run.json` | 1,440,296 | 65,361 |
| `evals/results/full/2026-10-04T06-01-32-opus-5-5-low-full-run1.json` | 1,429,742 | 64,710 |
| `evals/results/full/2026-10-04T06-24-28-opus-5-5-low-full-run3.json` | 1,410,546 | 64,039 |
| `evals/results/full/2026-10-04T06-15-26-opus-5-5-low-full-run2.json` | 1,410,187 | 64,021 |
| `evals/results/full/2026-10-04T06-45-45-opus-5-5-low-full-run3b-repeat.json` | 1,409,353 | 63,989 |
| `docs/phase1/checkpoint-c-ai-verification.md` | 103,851 | 1,479 |
| `evals/results/smoke/2026-10-03T23-59-11-opus-5-5-low-smoke-run3.json` | 103,204 | 4,693 |
| `evals/results/smoke/2026-10-03T23-52-43-opus-5-5-low-smoke-run2.json` | 101,994 | 4,635 |
| `evals/extraction/fixtures/core.jsonl` | 48,840 | 129 |
| `supabase/functions/_shared/extraction/pipeline.ts` | 41,106 | 886 |
| `evals/extraction/fixtures/dates.jsonl` | 40,266 | 92 |
| `supabase/functions/_shared/extraction/pipeline.test.ts` | 39,648 | 554 |
| `KINSHIP_2_DECISIONS.md` (whole file; +53 lines in this PR) | 31,308 | 53 |
| `evals/extraction/fixtures/merge.jsonl` | 28,466 | 43 |
| `evals/extraction/fixtures/ambiguity.jsonl` | 27,141 | 64 |
| `supabase/functions/_shared/extraction/dates.ts` | 25,679 | 563 |
| `evals/extraction/lib/layers.ts` | 21,985 | 348 |
| `evals/extraction/lib/grade.ts` | 19,534 | 343 |
| `supabase/functions/_shared/extraction/lexicon.ts` | 16,952 | 253 |
| `supabase/migrations/20261004100000_v2_capture_reviews.sql` | 16,862 | 365 |
| `evals/extraction/fixtures/sensitive.jsonl` | 16,353 | 43 |
| `docs/phase1/checkpoint-b-architecture-verification.md` (whole file; +102 lines) | 16,310 | 102 |
| `supabase/tests/database/56_v2_ai_gateway.test.sql` | 16,241 | 187 |
| `supabase/functions/_shared/extraction/dates.test.ts` | 15,241 | 186 |

## 4. The number that matters: executable implementation

This excludes raw eval output, generated files, fixtures and documentation. Counts are lines added, with non-blank, non-comment lines in brackets.

| | Lines | Code |
|---|---|---|
| **Production runtime** | **3,957** | **3,022** |
| …Edge Functions: `ai-gateway` (handler 299, entry 128); the extraction pipeline, dates, lexicon, context, types and run; the model adapter and registry | 2,696 | 2,093 |
| …SQL migrations (3) | 776 | 591 |
| …prompts and schemas: v1 holds the schema and user-content builder; v5 is live; v2–v4 (205 lines) are superseded and neither imported nor deployed | 485 | 338 |
| **Tests** | **1,490** | **1,273** |
| …Deno | 1,078 | 931 |
| …pgTAP | 412 | 342 |
| **Eval and tooling infrastructure** | **1,685** | **1,439** |
| …eval runner, graders, layers, manifest, compare, results reader | 1,487 | 1,261 |
| …CI workflows and config | 198 | 178 |
| **Total** | **7,132** | **5,734** |

For comparison:

| | Lines |
|---|---|
| Generated | 23 (the manifest). Before cleanup: 398,148 lines of raw output |
| Fixtures | 512 lines (393 cases), 180 KB |
| Documentation | 1,907 lines, plus this audit |

**Assessment: reasonable.** About 3,000 lines of runtime code cover a server-side AI gateway: auth, consent, flag, quota, idempotent claim, refusal handling and a content-free usage log. They also cover the deterministic extraction pipeline and its guards, a date resolver with 116 hand-checked vectors, three migrations and five prompt versions. There is no unexplained production-code growth.

## 5. Maintainability

**Files over 500 lines:**
- `pipeline.ts` (886);
- `dates.ts` (563);
- `pipeline.test.ts` (554).

None is over 1,000, apart from documentation and the removed raw output.

**Functions over 100 lines:**

| Function | Lines | Note |
|---|---|---|
| `grade` (`evals/extraction/lib/grade.ts:70`) | 244 | Eval only. One pass that tallies about 30 metrics; could be split by metric family. |
| `resolveFrom` (`dates.ts:180`) | 189 | An ordered table of date rules; the order is the semantics. Long, but flat, and covered by 116 vectors. |
| `planItem` (`pipeline.ts:177`) | 178 | The per-item guard sequence: grounding → person → subject → certainty → sensitivity → date → detail → relate → tier. **The main maintainability risk** (below). |
| `layers` (`evals/extraction/lib/layers.ts:64`) | 173 | Eval only. |
| `write_extraction` (SQL, migration 090000) | 130 | Server-side re-check of every target. Linear. |
| `memory_detail_ok` (SQL, migration 110000) | 105 | A validation table of keys per kind. |

**Duplication.** All of it is deliberate:
- `memory_detail_ok` is defined in three migrations (A, then 100000, then 110000), and `ai_drop_reasons_ok` in two. That is how forward-only migrations work: the latest definition is canonical.
- Prompts v2–v4 are full copies of the system prompt with small edits. They are kept as the immutable record of what each paid run used; no runtime code imports them.

**Overly broad module: `pipeline.ts`.** It holds every guard and the detail builder. Splitting it along the guard boundaries would make it easier to change:
- grounding;
- people;
- certainty and sensitivity;
- detail;
- relate.

The cue for that is the next substantive pipeline change. Any split would have to show identical results on the oracles and on the CI replay of the approved baseline. It is **not done here**: the founder asked that the evaluated baseline not be refactored.

**No refactoring was done to reduce numbers.**

## 6. Accidental artifacts

| Check | Result |
|---|---|
| `node_modules`, package-manager caches, vendor trees, duplicated dependencies | None |
| Build output (Expo `dist/`, `web-build/`, native `ios/`/`android/`), compiled bundles | None |
| Coverage directories, temporary files, local databases | None. `coverage/` and Supabase CLI state (`supabase/.temp/`, `.branches/`) are now git-ignored as a precaution. |
| Environment files | None (`.env*` already ignored) |
| Secrets | **None.** I scanned the full diff and every eval result for Anthropic, GitHub, AWS and Slack keys, JWTs, private keys and password assignments. The only hit is the gateway reading the env var name `SUPABASE_SERVICE_ROLE_KEY`. |
| Real-user data | **None.** Every fixture and roster is synthetic. Results contain only synthetic notes and model outputs about them. No email addresses or phone numbers appear in any fixture; the one "number ends in 4471" is invented. |
| Generated binaries | Only the two gzipped eval results, added deliberately (below) |

**No STOP condition was found.**

## 7. Eval result artifacts

The eight files were generated, not hand-written.

| File (before cleanup) | Source of truth or derived? | Reproducible? | Needed by CI? | Needed by replay? | Needed permanently? |
|---|---|---|---|---|---|
| C.1 final run (the approved baseline) | **Source of truth.** Raw model outputs from a paid run can't be regenerated, because the model isn't deterministic. | No | **Yes, now:** CI replays it | Yes | **Yes**, while it is the baseline |
| Smoke run 3 | Source of truth for the locked smoke set | No | No | Yes (smoke replay) | Useful as the trust-critical example |
| Full runs 1, 2, 3, 3b; pre-C.1 final run; smoke run 2 | Source of truth for superseded configurations | No | No | Only for historical comparison | **Historical audit only** |
| `MANIFEST.json` | Derived from the fixtures | Yes (`manifest.ts --write`) | **Yes:** CI checks the frozen corpus | — | Yes |

Each raw file is 1.4 MB and about 65,000 lines: per-fixture proposals, pipeline outcomes and call statistics, as indented JSON. **The artifacts are small in bytes but huge in line count.** The eight files are 8.8 MB raw, **0.8 MB packed in git**, and about 70 KB each gzipped.

## 8. Retention policy (applied)

The choice was between options A to F. **Applied: D, compressed raw results, for what is kept, with C's idea of a compact index plus hashes for the rest.** No new infrastructure (no Git LFS, no object storage).

- **Gzipped in the tree.** The approved baseline and the final smoke run are committed as `.json.gz` (`gzip -9n`, deterministic). They are byte-identical to the produced JSON once unpacked; SHA-256 verified for both.
- **Superseded runs left the tree** but not the repository. They stay byte-for-byte retrievable from `673fd24`, which becomes part of `main`'s history under the repository's merge strategy (§10):

  ```sh
  git show 673fd24:<path> | sha256sum
  ```

  The durable replacement existed before the deletion: `673fd24` was already pushed to the PR branch, and the hashes were recorded first.
- **Index: `evals/results/RUNS.md`.** It lists every paid run of Checkpoint C (3 smoke, 6 full): the commit evaluated, prompt, eval version, corpus hash, model, fixture count, result, cost, where its raw output lives, and its SHA-256.
- **Replay and compare read `.json.gz`** (`evals/extraction/lib/results.ts`).
- **CI replays the approved baseline on every push** (free). A deterministic-pipeline change that moves any metric of the evaluated baseline is therefore caught without a model call. Before cleanup, replaying the C.1 output reproduced the live run **exactly**: every metric and every per-fixture outcome, from both the `.json` and the `.json.gz`.
- **Fresh run output** (`evals/results/*.json`, `*.md`) is git-ignored. Each future approved baseline adds one gzipped file of about 70 KB and one index row.

**Preserved in source control:**
- the frozen corpus and its manifest and hashes;
- expected behaviour;
- graders and thresholds;
- deterministic tests;
- prompts and schemas;
- run metadata: model, prompt, eval version, corpus and code commit;
- metric summaries (`RUNS.md` and the verification doc);
- regression cases;
- documentation of every paid run.

Each run can be audited later from its commit, corpus hash and raw-output hash.

**Files removed from the tree:** the eight raw `.json` results.

**Files added:** two `.json.gz` (the baseline and smoke run 3), `RUNS.md` and `lib/results.ts`.

## 9. Protecting the evaluated baseline

| | |
|---|---|
| Extraction pipeline, date resolver, person resolution, guards, prompt v5, structured-output schema, model configuration | **Unchanged** since the evaluated commit `66e15dd`: `git diff 66e15dd -- supabase/functions` is empty |
| Migrations | One explicit `GRANT EXECUTE … TO service_role` added to `ai_drop_reasons_ok`, in each of the two migrations that revoke it (below). It is a no-op in production. |
| Eval tooling | Reads `.json.gz`; no change to grading |

**Runtime behaviour did not change, so there was no STOP.**

## 10. Git history

**Merge strategy: "Create a merge commit".** This is the founder's standing rule, and the repository's practice: PRs #7 to #12 were all merged that way (`7c57259` … `e3df441`, "Merge pull request #12…").

**With a merge commit:**
- all 26 branch commits become reachable from `main`;
- that includes the eight raw JSON blobs: 8.8 MB raw, **about 0.8 MB packed**;
- this is **intended**: that history is the archive for the superseded runs and for every commit a paid run evaluated (`fea48da`, `5277505`, `6986530`, `7e5f0d0`, `810594c`, `66e15dd`);
- the normal tree and diff stay small.

**A squash merge would:**
- keep those blobs (about 0.8 MB packed) out of `main`'s history;
- **also** drop every branch commit from `main`, including the archive commit `673fd24` and the six evaluated commits. `RUNS.md` and the verification doc cite those SHAs, so the archive and the run-to-code traceability would depend on a branch that could later be deleted.

Squash is not permitted by the repository's policy, and here it would be materially worse, not cleaner. **Recommendation: merge commit, as usual.**

No force-push was made, no history was rewritten, and the merge strategy is unchanged.

## 11. Migrations (gate 11)

The three migrations were reviewed. They apply cleanly from scratch: a throwaway Postgres 16 with the Supabase stand-in, all 22 migrations, and pgTAP 366/366.

| Migration | What it does | Production safety |
|---|---|---|
| `20261004090000_v2_ai_gateway` | New `ai_calls` table: content-free usage log, RLS on, no policies, service role only. Service-role-only RPCs: `claim_capture_extraction`, `release_capture_extraction`, `write_extraction`. | Additive. The new SECURITY DEFINER functions have `search_path = ''` and EXECUTE revoked from PUBLIC, anon and authenticated. No existing row is touched. |
| `20261004100000_v2_capture_reviews` | `capture_reviews` table (owner-read RLS; explicit grants). A trigger clears a review when its capture is deleted or its text purged. Adds `settle_capture_review`, `close_capture_review` (users), `purge_expired_capture_reviews` (service role) and `write_extraction_with_review`. `memory_detail_ok` gains `date_hint` on moments and milestones; the `contact_detail` drop reason is added. | Additive. The trigger on `captures` takes only a brief lock, and production has 3 captures. |
| `20261004110000_v2_temporal_detail` | `memory_detail_ok`: temporal keys on facts, milestones, moments and threads; a `date_end` needs a `date`. | Postgres doesn't re-check existing rows when a CHECK's function changes. **Production has 0 memory items**, and no row anywhere has `date_end` without `date`. |

**Finding: one implicit grant, now explicit.**
- **What it is.** The `ai_calls` CHECK calls `ai_drop_reasons_ok` as the inserting role, the gateway's service role. Both migrations revoke the function from PUBLIC.
- **Production.** Its default privileges (`postgres` in `public`) grant EXECUTE on new functions to `service_role`, so inserts work there. The local stand-in mirrors this.
- **The PR's preview branch.** It was created on 3 Oct with Supabase's newer, stricter defaults: there, new functions get no `service_role` EXECUTE. As a result, `service_role` couldn't run `ai_drop_reasons_ok`, and existing functions such as `write_memory_item` show the same difference.
- **The fix.** The grant is now explicit, with a pgTAP assertion. The schema fingerprint of a production-like build is unchanged (`a42f9989…`).
- **Lesson.** The preview branch is not a faithful copy of production's privileges. Production parity is proven with the schema fingerprint instead (below).

**Parity before merge:**

| | Value |
|---|---|
| Production | 19 migrations (through `20261003090000`). Schema fingerprint `da13bfe7f04a062ab521af626e60581a`. |
| Fresh build of `main` | Identical: `da13bfe7…`. No drift since Checkpoint B. |
| Fresh build of the PR (22 migrations) | `a42f9989bca2a251771c452304063717` |

**After the merge, production must equal the PR build.** One caveat: the preview branch applied an earlier text of `20261004100000`, edited in stage 2 before any production apply. Its fingerprint (`da69eadf…`) is therefore not the comparison.

**Feature flag.** `ai_extraction`:
- production row: `default_on` false, rollout 0%, no per-user overrides: **OFF for everyone**;
- the gateway enforces it server-side (`my_flags()`).

**Follow-up.** `pg_cron` isn't installed in production, so `purge_expired_capture_reviews` isn't scheduled yet. Expired reviews are already hidden from users by RLS.

## 12. Expected final PR size

| | Files | Added | Deleted |
|---|---|---|---|
| Before the audit | 65 | 407,666 | 7 |
| **After the audit** (code, cleanup, this document and the C closeout notes) | **64** | **about 10,200** | **about 10** |

None of the remaining ~10,200 lines is raw eval output.

## 13. Merge gates

| # | Gate | Result |
|---|---|---|
| 1 | No secrets or real-user data | ✓ |
| 2 | No unexplained dependency, build or cache pollution | ✓ none at all |
| 3 | The extreme line count is understood | ✓ 97.7% was raw eval output |
| 4 | Generated-artifact cleanup complete | ✓ policy applied |
| 5 | Executable implementation size reasonable and maintainable | ✓ about 7,100 lines; `pipeline.ts` flagged for a future behaviour-preserving split |
| 6 | C's evaluated runtime behaviour unchanged | ✓ pipeline, prompt, schema and model unchanged since `66e15dd` |
| 7 | Deterministic suites pass | ✓ Deno 102, pgTAP 366, Jest 174, tsc, eslint 0 errors |
| 8 | Plain and realistic oracles pass | ✓ 393/393, every metric |
| 9 | Replay verification passes | ✓ the baseline replays to the live run's exact metrics and outcomes; now in CI |
| 10 | CI green | Checked on the final head before merge (recorded in the C closeout) |
| 11 | The three migrations reviewed and apply cleanly from scratch | ✓ (above) |
| 12 | Production feature flag OFF | ✓ |
