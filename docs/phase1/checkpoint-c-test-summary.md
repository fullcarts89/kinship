# Kinship 2.0 · Checkpoint C: test summary

> **Updated for stage 2.** The counts in the table below are current. The detailed sections describe the smoke stage. The full-corpus evaluations are reported in `docs/phase1/checkpoint-c-ai-verification.md`: three stage-2 runs under "Full Opus 5.5 Low-Effort Evaluation", and the final run under "Final Opus Baseline Run".

Branch `claude/gifted-pasteur-e2q0qu` at `5bceb6a`, [PR #13](https://github.com/fullcarts89/kinship/pull/13) (draft). The deterministic suites below were run locally on 4 Oct 2026, and CI ran them on every commit. CI passed on every commit up to the one before last; on `5bceb6a` it was still running when this summary was written. The live smoke runs were made in GitHub Actions on 3 Oct 2026, UTC.

## At a glance

| Suite | What it checks | Count | Result |
|---|---|---|---|
| Deno | Edge functions: extraction pipeline, dates, context, prompt schema, AI gateway | 93 | all pass |
| pgTAP | Database: every migration applied from scratch, then RLS, provenance and gateway writes | 351 (13 files) | all pass |
| Jest | The app | 174 (28 suites) | all pass |
| tsc / eslint | Types and lint across the app, functions and evals | — | clean / 0 errors |
| Oracle eval, plain and realistic | Perfect proposals through the real pipeline, phrased ideally and as the live model does | 384 fixtures (frozen) | every metric passes |
| Live full eval | Opus 5.5, low effort, the whole frozen corpus | final run 384 | every founder exit criterion met; wrong subject 0%; C-4 hint metric 16/17 |
| Live smoke eval | Real model (Opus 5.5, low effort) on 29 locked trust-critical fixtures | 29 fixtures × 3 runs | 0 trust failures reached memory |

**The oracle eval is not a model result.** It shows the fixtures, graders and guards are consistent. Only the live smoke eval used a real model.

---

## 1. Deno: edge functions (79)

| File | Tests | Covers |
|---|---|---|
| `_shared/extraction/pipeline.test.ts` | 26 | Guard rails. Wrong model answers are dropped, demoted or held: paraphrased quotes, invented names, numbers, diagnoses and relations, lost negation, a "may" stated as fact, unlabelled sensitivity, the sister's surgery filed as Sarah's, two Sams, two-referent pronouns, injection text, Ben's promise taken as the user's, hedged or cross-subject supersedes, user-authored targets, malformed output. **9 regression tests from the smoke run** (below) |
| `_shared/extraction/dates.test.ts` | 1 (105 vectors) | Hand-checked date resolution: time zones, DST, year rollover, "next Friday" said on a Friday, weekends, seasons, holidays. **C-4 ambiguity boundaries** |
| `_shared/extraction/context.test.ts` | 3 | Minimal context (D2/C-3): only plausibly relevant people; no phone numbers or emails; dossier limits |
| `_shared/prompts/relationship_extract/v1.test.ts` | 2 | **New.** The output schema fits the API's published limits (≤ 16 union-type parameters, ≤ 24 optional) and every object is closed |
| `_shared/spans.test.ts` | 5 | Code-point spans with emoji, CJK, accents, curly quotes, line breaks, ZWJ |
| `ai-gateway/handler.test.ts` | 8 | Auth, consent, flag, ownership, one extraction per capture, quota, refusal kept quietly, content-free usage log. **New:** held items are stored with the extraction and returned on reopen without a model call (C-2) |
| `ai-insight`, `delete-account` handlers | 30 | Pre-existing |

The test runner reports 79 in total, a few more than the per-file declarations above add up to.

### Regression tests added from the smoke run

| Test | Bug it pins |
|---|---|
| A quote ending in "." doesn't pull in the next sentence's hedge | Ben's race was lowered to tentative because of "hoping" |
| A quote ending in "." doesn't pull in an injected instruction | The real race was dropped as instruction text |
| A short trailing "I think." still lowers a firm statement | Keeps that protection after the boundary fix |
| "mother" is accepted for the note's "mom" and stored as "mom" | A correct item was dropped as an invented relation |
| A relation the note never mentions is still dropped | Counter-test |
| A model unsure which Sam is held for a question, not dropped | A correct "ask" was dropped for low confidence |
| Low confidence without a confirmed ambiguity is still dropped | Counter-test |
| "Writer" (the prompt's word for the user) is not an invented name | A correct reported item was dropped |
| A real invented name ("with Kelly") is still dropped | Counter-test |

---

## 2. pgTAP: database (349)

The test script builds a throwaway Postgres, applies every migration in order, then runs:

| File | Tests | Covers |
|---|---|---|
| `00_schema` | 9 | Schema basics |
| `10_ai_usage` | 12 | Per-user AI quota |
| `20_ai_consent` | 15 | Consent ledger (D3) |
| `30_rls_isolation` | 37 | Users can't see each other's data (1.x tables) |
| `40_delete_account` | 21 | Account deletion removes every user-owned table (**now 24 tables, including `capture_reviews`**) |
| `50_v2_rows` | 31 | 2.0 rows and checks |
| `51_v2_isolation` | 27 | 2.0 RLS isolation |
| `52_v2_provenance` | 22 | Every live memory has a source; spans and quotes |
| `53_v2_lifecycle` | 49 | Supersede, resolve, tombstones, versioning |
| `54_v2_amendments` | 41 | Checkpoint A amendments; the SECURITY DEFINER allowlist (**now includes `close_capture_review`**) |
| `55_v2_write_memory_item` | 20 | Atomic item and source writes |
| `56_v2_ai_gateway` | 40 | Claim, release and `write_extraction`: service role only, no crossing users, user-written items never superseded, quotes from stored text, code-point spans |
| `57_v2_capture_reviews` | **25 (new)** | **C-2 durable pending review**, below |

### `57_v2_capture_reviews` (new)

- **Writes.** The app can't write a review, insert one directly, or run the expiry purge.
- **Held items are not memory.** The held item and its question are written with the extraction; the capture is `needs_review`; there are no `memory_items`.
- **Reopening is free.** It returns `done`, with no second model run.
- **Bad reviews are refused.** That covers another user's person, a span outside the note, and a review on a capture that isn't waiting on the user. Refused reviews leave nothing behind.
- **Survives a restart.** The owner still sees the question and the interpretation, unchanged. Another user sees nothing and can't close it.
- **Closing settles the capture.** The row is gone and the capture becomes `extracted`. With `delete_after_extraction`, the note's text is then purged.
- **Deleting the capture** removes its pending review.
- **After 30 days** the review is hidden and purged.
- **C-4.** Moments and milestones accept `date_hint`.

---

## 3. Jest: app (174)

Unchanged in Checkpoint C (28 suites).

---

## 4. Oracle eval (297 fixtures, free, runs in CI)

| Set | Cases |
|---|---|
| core | 100 |
| ambiguity | 64 |
| dates | 45 (6 new C-4 boundary cases) |
| sensitive | 35 |
| adversarial | 23 |
| merge | 30 |

Every plan §10 metric passes, as does the new **`date_ambiguous_confirmed`** (must be 100%): ambiguous dates are flagged, sent to confirmation and keep the user's words.

The corpus is still below the plan's v1 minimums: core 120, dates 80, sensitive 40, merge 40.

---

## 5. Live smoke eval: Opus 5.5, effort low (29 fixtures)

The fixtures were locked in `evals/extraction/smoke.json` before any model call. Runs use the production path with no mocks and no LLM judge.

| Run | Commit | Result | Cost |
|---|---|---|---|
| 1 | `0e02b61` | All 29 calls refused with HTTP 400 before the model ran (schema had 20 union-type parameters, the limit is 16) | $0 |
| 2 | `6219969` | 24/29 pass; 2 metrics missed (`person_ask`, `item_recall`) | $0.25 |
| 3 | `99bd544` | 28/29 pass; **every gated metric passes** | $0.25 |
| Replay | final code | Run 3's saved outputs: **29/29**. Run 2's: 28/29 | free |

**Run 3 metrics.** All gated metrics passed:

| Metric | Result |
|---|---|
| Wrong subject | 0/26 |
| Hallucination | 0/26 |
| Invented names | 0 |
| Person precision | 26/26 |
| Asks when two people fit | 2/2 |
| Certainty kept | 6/6 |
| Certainty upgrades | 0 |
| Sensitivity recall | 9/9 |
| Sensitive never auto-saved | 11/11 |
| Merges | 3/3 |
| Cross-subject merges | 0 |
| Protected items changed | 0 |
| Grounding | 26/26 |
| Injection | 3/3 |
| Item recall | 27/28 |
| Usable answers | 29/29 |

**Trust.**
- **No trust failure reached memory.**
- **Model unsafe, Kinship caught it:** 1 of 29 calls per run. The model proposed merging into a user-authored race, and the protection guard turned it into a new item to confirm.
- **Model right, the code overrode it:** 5 calls in run 2 and 1 in run 3. All are fixed, with the regression tests listed in §1.

**Operational (run 3).**

| | |
|---|---|
| Latency | p50 3.1 s, p95 4.3 s |
| Tokens per call | ~110 input, ~257 output, 3,204 cached |
| Cost per call | $0.0088 |

**Ben vertical slice (real model).** Ben, a race on 2026-10-11, goal "break four hours", follow-up after the race, exact spans, nothing invented. Auto-saved.

The full per-fixture results are in `docs/phase1/checkpoint-c-ai-verification.md` under "Live Model Smoke Evaluation". The saved outputs are in `evals/results/smoke/`.

---

## How to run

```sh
deno test supabase/functions                                     # Deno
supabase/tests/run-db-tests.sh                                   # pgTAP (needs Postgres 16 + pgTAP)
npm run typecheck && npx eslint . && npm test -- --ci            # app
deno run -A --config evals/deno.json evals/extraction/run.ts --mode oracle   # oracle eval
deno run -A --config evals/deno.json evals/extraction/run.ts --mode replay --smoke \
  --replay evals/results/smoke/<file>.json                       # re-grade the smoke run, free
```
