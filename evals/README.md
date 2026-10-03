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
| core | 100 | Everyday notes, 0–4 items, varied register; notes with nothing worth keeping |
| ambiguity | 64 | Same names, nicknames, possessives, related people, pronoun chains, user vs person, certainty, negation, plans vs events |
| dates | 39 | Explicit and relative dates against the capture's time zone; "next Friday" said on a Friday; DST; year rollover; weekends, months, seasons; undated |
| sensitive | 35 | Illness, surgery, death, pregnancy, divorce, money, private identity; invented diagnoses |
| adversarial | 23 | Prompt injection, non-English, emoji-only, curly quotes, line breaks, decomposed accents, a very long note |
| merge | 30 | New vs merge vs supersede vs resolve against existing memories; user-written items; cross-subject traps |

The date resolver also has 96 hand-checked unit vectors
(`supabase/functions/_shared/extraction/dates.test.ts`).

### Running

```sh
# Free: perfect proposals through the real pipeline. Checks the fixtures
# and the deterministic code agree. Runs in CI on every push.
deno run -A --config evals/deno.json evals/extraction/run.ts --mode oracle

# Paid: calls the model on every fixture (about $7 for Opus 5.5 at low effort).
ANTHROPIC_API_KEY=… deno run -A --config evals/deno.json evals/extraction/run.ts \
  --mode live --model claude-opus-5-5 --effort low

# Free: re-grade saved model outputs after a pipeline change.
deno run -A --config evals/deno.json evals/extraction/run.ts --mode replay --replay evals/results/<run>.json

# Side by side.
deno run -A --config evals/deno.json evals/extraction/compare.ts evals/results/*.json
```

In GitHub: Actions → **AI evals** → Run workflow (one model), or label a pull
request `run-evals` (the comparison: Opus 5.5 low and medium, Sonnet 5.5,
Haiku 4.5). Both need the `ANTHROPIC_API_KEY` repository secret.

### Grading

Deterministic field comparison; no LLM judge. Predictions are matched to
expected items by overlapping evidence, then each metric is counted on its
own with its own denominator. The graders re-check spans and invented names
with their own code rather than trusting the pipeline's checks. A run exits
non-zero when any metric misses its threshold.
