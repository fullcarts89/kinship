# CMR-1 runs: index and retention

Every baseline run of `evals/cmr1/run.ts` kept in the tree. As for `evals/results/RUNS.md`: raw output is
committed gzipped (`gzip -9n`, byte-identical when unpacked; the SHA-256 below is of the unpacked JSON);
fresh runs write `evals/results/cmr1/<stamp>-<label>.json` and `.md`, which `.gitignore` excludes.

Replay any baseline through the current pipeline, free:

```sh
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<run>.json.gz
deno run -A --config evals/deno.json evals/cmr1/compare.ts evals/results/cmr1/<baseline>.json.gz evals/results/cmr1/<candidate>.json
```

## Oracle baseline (main at the start of CMR-1)

| Run | Commit evaluated | Prompt | Corpus | Mode | Narratives | Result | Raw output (SHA-256 of JSON) |
|---|---|---|---|---|---|---|---|
| 15 Nov 2026 00:01 UTC | `c2e0ee76abb76303463697628968a3c51c23b19f` (`main`, PR #88 merge) | `relationship_extract/v7` | `cmr1-v1`, `840a702de6e382f9059126ac24dc25a5e207ba0f61ef5afcf1960e3726e1ce15` (144 narratives, 101 dev / 43 held out, 154 Tells, 414 facts) | oracle | 144 | **Dev:** retrievable 100% · silent loss 0 · wrong person 0 · grounding 0 · recall 100% (154/154) · precision 100% (172/172) · subject attribution 100% · duplicates 0 · **fabricated identities 7** · **unnecessary clarification 14.1% (14/99)** · **correct clarification 62.5% (5/8)** · **guessed when ambiguous 1**. **Held-out:** retrievable 100% · wrong person 0 · grounding 0 · recall 98.5% (66/67) · precision 100% (75/75) · **silent loss 1** · **fabricated identities 3** · **unnecessary clarification 16.7% (7/42)** · injection 1/1 | `2026-11-15T00-01-34-oracle-all.json.gz` · `3b6435110a7c8cee59a5709db5622e9b8ae155eb6108417ec0f124e0d36595e2` |
| 15 Nov 2026 00:01 UTC | same | same | same | oracle `--realistic` (recorded live-model shapes) | 144 | Dev: fabricated identities 10 · unnecessary clarification 16.2% (16/99); the rest as above. Held-out: fabricated identities 5 · unnecessary clarification 21.4% (9/42) · silent loss 1 | `2026-11-15T00-01-37-oracle-realistic-all.json.gz` · `4ef9ce6aed32b2a9a4d795d7717e7f184bd135735961a1270f8deafd2d94a250` |

The findings these numbers record are listed in `docs/product/cmr1-evaluation.md`. They are the state of
`main`, not ledger errors: the ledger is not changed to make them pass.

## Live baseline: pending

Not run: `ANTHROPIC_API_KEY` was not available where this suite was built. The exact command, to be run on
`c2e0ee7` (or the integration branch's base) and committed here gzipped with a row above:

```sh
EVAL_COMMIT=$(git rev-parse HEAD) ANTHROPIC_API_KEY=… \
  deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split dev --repeat 3 --require-frozen --out evals/results/cmr1
gzip -9n -k evals/results/cmr1/<stamp>-<model>-<effort>-dev.json
sha256sum evals/results/cmr1/<stamp>-<model>-<effort>-dev.json
```

About 150 Tells × 3 repeats; long transcripts run as several passage calls each. The held-out split is run
once, at the release candidate, never while tuning.
