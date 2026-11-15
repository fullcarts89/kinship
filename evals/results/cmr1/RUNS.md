# CMR-1 runs: index and retention

Every baseline run of `evals/cmr1/run.ts` kept in the tree. As for `evals/results/RUNS.md`: raw output is
committed gzipped (`gzip -9n`, byte-identical when unpacked; the SHA-256 below is of the unpacked JSON);
fresh runs write `evals/results/cmr1/<stamp>-<label>.json` and `.md`, which `.gitignore` excludes.

Replay any baseline through the current pipeline, free, or through another tree's pipeline (`--shared`):

```sh
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<run>.json.gz
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<run>.json.gz --shared <other tree>/supabase/functions/_shared --tag baseline
deno run -A --config evals/deno.json evals/cmr1/compare.ts evals/results/cmr1/<baseline>.json.gz evals/results/cmr1/<candidate>.json
```

## Oracle baseline (main at the start of CMR-1)

| Run | Commit evaluated | Prompt | Corpus | Mode | Result | Raw output (SHA-256 of JSON) |
|---|---|---|---|---|---|---|
| 15 Nov 2026 04:52 UTC | `c2e0ee76abb76303463697628968a3c51c23b19f` (`main`, PR #88 merge) | `relationship_extract/v7` | `cmr1-v1.1`, `68436546bcb3279c769c06a15d5ea9679180f3447face36bad006a90771e2e09` (148 narratives, 105 dev / 43 held out, 158 Tells, 426 facts) | oracle | **Dev:** retrievable 100% (112/112) · silent loss 0 · omitted-as-understood 0 · wrong person 0 · grounding 0 · unsafe eligibility 0 · recall 100% (162/162) · precision 100% (182/182) · subject attribution 100% · duplicates 0 · corrections 2/2 · **fabricated identities 7** · **unnecessary clarification 12.7% (13/102)** · **correct clarification 62.5% (5/8)** · **guessed when ambiguous 1** · rejected by pipeline 20 (info) · date-precision mismatches 2 (info). **Held-out:** retrievable 100% (46/46) · wrong person 0 · grounding 0 · unsafe eligibility 0 · recall 98.5% (66/67) · precision 100% (75/75) · **silent loss 1** · **fabricated identities 3** · **unnecessary clarification 16.7% (7/42)** · rejected by pipeline 12 (info) · injection 1/1 | `2026-11-15T04-52-59-oracle-all.json.gz` · `fc7de57bd6b1fdbea88536bbd949839cdcf41ffb634dc444aadd9300b69c044e` |
| 15 Nov 2026 04:53 UTC | same | same | same | oracle `--realistic` (recorded live-model shapes) | Dev: fabricated identities 10 · unnecessary clarification 14.7% (15/102) · rejected by pipeline 24; the rest as above. Held-out: fabricated identities 5 · unnecessary clarification 21.4% (9/42) · silent loss 1 · rejected by pipeline 14 | `2026-11-15T04-53-02-oracle-realistic-all.json.gz` · `178a2f9cd95ffdd8049c8e87b5356082ec20249ac323bd7a8a33c3cd4510d670` |

Superseded by these (corpus `cmr1-v1`, 144 narratives, before the four deceased-referent cases and the
se-002 judgement of 15 Nov): `2026-11-15T00-01-34-oracle-all.json.gz` (`3b643511…`) and
`2026-11-15T00-01-37-oracle-realistic-all.json.gz` (`4ef9ce6a…`), in git history at commit `61580ae`.

The findings these numbers record are listed in `docs/product/cmr1-evaluation.md`. They are the state of
`main`, not ledger errors: the ledger is not changed to make them pass.

## Live baseline and candidate: through CI

The key is a repository secret, so the live run is a CI job: label the pull request **`run-evals-cmr1`**
(the founder's authorisation step; the `cmr1` job in `.github/workflows/evals.yml`). One paid run gives both
sides:

1. the cost is estimated and printed before any call (`--dry-run`);
2. `run.ts --mode live --split all --repeat 3 --require-frozen` on the PR head (dev and held-out, three
   runs each, the full-corpus job's model and effort), raw outputs kept as a workflow artifact;
3. the same raw outputs replayed through the PR head's pipeline (candidate) and through `origin/main`'s
   `supabase/functions/_shared` (baseline, `--shared`), so both are graded on identical model outputs;
4. `compare.ts` baseline → candidate, and baseline → the live grading, in the job summary.

To keep a live run as a baseline here: download the `eval-cmr1-live-…` artifact, `gzip -9n` the JSON,
`sha256sum` the unpacked JSON, commit the `.json.gz` and add a row above with the commit, prompt version,
corpus hash and the summary table's numbers. Locally the same run is:

```sh
EVAL_COMMIT=$(git rev-parse HEAD) ANTHROPIC_API_KEY=… \
  deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split all --repeat 3 --require-frozen --out evals/results/cmr1 --tag live
```
