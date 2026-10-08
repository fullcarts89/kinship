# Kinship AI evals

Plan §10. Every prompt or model change ships with an eval run attached to
its pull request. Fixtures are written by the team from patterns, never taken
from real users' data.

## relationship_extract

`evals/extraction/` holds the fixtures (`fixtures/*.jsonl`, one case per
line), the shared rosters (`rosters.json`), the thresholds
(`thresholds.json`, copied from the plan; never lowered to pass) and the
runner.

| Set | Cases | What it covers |
|---|---|---|
| core | 129 | Everyday notes, 0–4 items, varied register; notes with nothing worth keeping |
| ambiguity | 64 | Same names, nicknames, possessives, related people, pronoun chains, user vs person, certainty, negation, plans vs events |
| dates | 91 | Explicit and relative dates against the capture's time zone; "next Friday" said on a Friday; DST; year rollover; weekends, months, seasons; undated; C-4 ambiguity boundaries (`date_confirm`); C.1 temporal preservation on every kind (`c1_temporal`, on the `temporal` roster) |
| sensitive | 43 | Illness, surgery, death, pregnancy, divorce, money, private identity; invented diagnoses |
| adversarial | 23 | Prompt injection, non-English, emoji-only, curly quotes, line breaks, decomposed accents, a very long note |
| merge | 43 | New vs merge vs supersede vs resolve against existing memories; user-written items; cross-subject traps |

The date resolver also has 116 hand-checked unit vectors
(`supabase/functions/_shared/extraction/dates.test.ts`).

### Running

```sh
# Free: perfect proposals through the real pipeline. Checks the fixtures
# and the deterministic code agree. Runs in CI on every push.
deno run -A --config evals/deno.json evals/extraction/run.ts --mode oracle

# Paid: calls the model on every fixture (about $7 for Opus 5.5 at low effort).
ANTHROPIC_API_KEY=… deno run -A --config evals/deno.json evals/extraction/run.ts \
  --mode live --model claude-opus-5-5 --effort low

# Free: re-grade saved model outputs (.json or .json.gz) after a pipeline change.
# CI does this for the approved baseline on every push.
deno run -A --config evals/deno.json evals/extraction/run.ts --mode replay \
  --replay evals/results/full/2026-10-04T15-20-01-opus-5-5-low-c1-run.json.gz

# Side by side.
deno run -A --config evals/deno.json evals/extraction/compare.ts <a.json[.gz]> <b.json[.gz]>
```

In GitHub, each paid stage is authorised by the founder separately
(KINSHIP_2_DECISIONS.md, Checkpoint C review):

| Stage | How | Cost |
|---|---|---|
| 1. Live smoke | label the PR `run-evals-smoke`: the 29 fixtures locked in `extraction/smoke.json`, Opus 5.5 at low effort, with a per-fixture report | ~$0.20 |
| 2. Full corpus | label the PR `run-evals-full`: the frozen corpus (MANIFEST.json) on Opus 5.5 low; refuses an unfrozen corpus | ~$2.50 |
| 3. Comparison | label the PR `run-evals` (Opus 5.5 low and medium, Sonnet 5.5, Haiku 4.5) | ~$25 |

All need the `ANTHROPIC_API_KEY` repository secret. To re-run a label, remove
it and add it again. Add the label only after checking that the PR head is the
commit you mean to evaluate. The results JSON is printed in the job log and
kept as a workflow artifact (which expires).

**Keeping results.** `evals/results/RUNS.md` indexes every paid run: commit,
prompt, eval version, corpus hash, model, result, cost and the SHA-256 of its
raw output. Only the approved baseline and the final smoke run are kept in the
tree, gzipped (`gzip -9n`); superseded runs stay in git history. Fresh output
in `evals/results/*.json` is git-ignored.

```sh
# The smoke set locally (or --mode replay --smoke --replay <results.json>, free).
ANTHROPIC_API_KEY=… deno run -A --config evals/deno.json evals/extraction/run.ts --mode live --smoke
```

The smoke set is chosen for trust risk, not to estimate accuracy. Its ids are
fixed in `smoke.json` before any run and never changed after seeing output.

### The frozen corpus

`MANIFEST.json` records each file's SHA-256 and the counts (413 fixtures,
`extraction-v2.8`). CI fails if the corpus changes without a deliberate
re-freeze (`manifest.ts --write <version>`, with the reason in the commit).
CI also runs a **realistic oracle** (`--realistic`): perfect answers phrased
the way the live model phrases them, which catches guard over-reach for free.

### Two layers

Every run reports the raw model (graded before any guard) and the final
result. It covers:
- guard rescues, escapes, overreach and confirmations caused by a guard;
- tiers by set;
- recall split into safe and product-significant omissions;
- date outcomes (right, flagged, silently wrong, lost);
- merge outcomes;
- every metric per set.

See `lib/layers.ts`. The raw-layer "unsafe" count is an upper bound: an
extra, correct item that shares words with an expectation can be flagged,
so review the list by hand.

### Grading

Deterministic field comparison; no LLM judge. Predictions are matched to
expected items by overlapping evidence, then each metric is counted on its
own with its own denominator. The graders re-check spans and invented names
with their own code rather than trusting the pipeline's checks. A run exits
non-zero when any metric misses its threshold.
