# CMR-1 evaluation: Core Memory Reliability

The independent evaluation for the CMR-1 milestone. It asks one question of the whole understanding path
(the real prompt, the model, `runExtraction` with its passages, and `planExtraction`): **does what the user
told Kinship come back as the memory a careful reader would keep, filed on the right person, with the
right question when one is needed, and nothing lost?** It is built against `main` only, so it can catch
regressions and overfitting in the implementation branches.

Every person here is invented. Nothing is taken from a real account.

## What is in here

| Path | What |
|---|---|
| `corpus/<category>.jsonl` | 148 narratives in 16 categories, one per line, each with its per-fact ledger |
| `rosters.json` | Five synthetic rosters (a family, a friend group with a shared name and place-like names, colleagues, one person, an empty first-run account) |
| `MANIFEST.json` | The frozen corpus: SHA-256 per file, counts, and the **held-out set** (ids and hash) |
| `thresholds.json` | The CMR-1 release targets. Never lowered to pass |
| `run.ts` | The runner: `--mode oracle \| replay \| live`, `--split dev \| heldout \| all`, `--repeat N`, `--shared <dir>`, `--dry-run` |
| `compare.ts` | Baseline vs candidate from two result files; exits 1 on a regression |
| `manifest.ts` | Check or (re)freeze the manifest |
| `lib/corpus.ts` | Types, loader, validator (every span must be in its note), the gateway's own context builder for each step |
| `lib/oracle.ts` | Perfect proposals from a ledger |
| `lib/grade.ts` | The metrics |
| `lib/eligibility.ts` | Showing Up eligibility at the extraction boundary (`docs/product/today-eligibility.md`) |
| `lib/report.ts` | Targets, call statistics, markdown |

Results go to `evals/results/cmr1/` (git-ignored except the frozen baselines, gzipped; see `RUNS.md` there).

## Running

```sh
# Free: perfect proposals built from the ledgers, through the real planExtraction. Proves the deterministic
# code honours the ledger; what fails here is a pipeline finding on this commit, not a model one.
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode oracle

# Free: the same with each fact's recorded live-model shape (a padded mention, "Has" as a name…).
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode oracle --realistic

# Paid: the real prompt, the live model and the pipeline. The call count and cost are printed before the
# first call; --dry-run prints only that. Release candidates: --split all --repeat 3.
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split all --repeat 3 --require-frozen --dry-run
ANTHROPIC_API_KEY=… deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split all --repeat 3 --require-frozen --out evals/results/cmr1 --tag live

# Free: re-grade saved model outputs through the current pipeline…
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<run>.json.gz --tag candidate
# …or through another tree's pipeline (main's, say), so one paid run grades baseline and candidate on
# identical model outputs. The directory is a supabase/functions/_shared; its own imports resolve inside it.
git archive origin/main supabase/functions/_shared | tar -x -C /tmp/main-tree
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<run>.json.gz \
  --shared /tmp/main-tree/supabase/functions/_shared --tag baseline-main

# Baseline vs candidate (either .json or .json.gz).
deno run -A --config evals/deno.json evals/cmr1/compare.ts evals/results/cmr1/<baseline>.json.gz evals/results/cmr1/<candidate>.json
```

Deno is not installed in the cloud container: use `npx --yes deno` (2.x). `--model` and `--effort` pass
through exactly as in `evals/extraction/run.ts`; `--categories`, `--ids`, `--limit`, `--concurrency`,
`--out`, `--tag` as there. A run exits 1 when any gated metric misses its target on either split.

### In CI (the paid run)

The key is a repository secret, so the live run is a job in `.github/workflows/evals.yml`: label the pull
request **`run-evals-cmr1`** (the founder's authorisation, as for the other paid labels). The `cmr1` job
checks out the PR head, prints the cost estimate, runs `--mode live --split all --repeat 3 --require-frozen`
on the full-corpus job's model and effort, uploads the raw results as an artifact, prints the summary table
and latency to the job log and summary, then replays the same raw output through the PR head's pipeline
(candidate) and through `origin/main`'s `supabase/functions/_shared` (baseline, `--shared`), and prints
`compare.ts` for baseline → candidate and baseline → live. The existing jobs are untouched.

### Modes

- **oracle**: no model. Each fact the ledger keeps, asks about or declines becomes one proposal (the fact's
  span as the quote, its statement, the person it names, its kind, certainty, sensitivity, date words,
  and a merge/supersede target when the ledger names an earlier fact). The pipeline must honour it.
  `--realistic` swaps in `oracle_shape` where a fact has one: how a live model has actually shaped that
  proposal. Both baselines are kept.
- **live**: `runExtraction` with the registry's capability (prompt v7, passages for long notes, every
  guard), the way the gateway calls it. Raw proposals, call stats and the end-to-end latency of each Tell
  are saved for replay. `--repeat N` runs every narrative N times; facts whose verdict differs between
  repeats are listed under "Unstable across repeats".
- **replay**: the saved proposals through `planExtraction`, free: this tree's by default, another tree's
  with `--shared`. This is how a pipeline change is judged against a paid run without paying again.

### Sequences

A narrative may have several steps (a note, then a correction; a note, then "Tell the rest"; the same
note on another day). Steps run in order and the lines kept by one step become the next step's memory
(`items`, with a merge adding none and a supersede or resolve closing its target), as the gateway would
have written them. A step marked `continues` carries the previous note as `earlier_text`, and the
previous step's person stands in for the page, exactly as `context.ts` does.

## The ledger

Each narrative: `id`, `category`, `split` (`dev` | `heldout`), `roster`, `source` (`typed` | `voice`:
no capitals, no punctuation, fillers, repeats), `tz`, `at`, `context` (the page the Tell was opened
from, or `null` for a general Tell), `note` or `steps`, `facts`, optional `injection`,
`must_not_people` (roster keys no saved line may be filed on: idioms, places and namesakes that share a
name), `notes`.

Each fact:

| Field | Meaning |
|---|---|
| `span` (+ `nth`) | The exact words of the note it rests on. Must occur once, or `nth` says which |
| `subject` | Roster key, `new:<Name>`, `user` (the user's own promise or news) or `none` |
| `on` | Whose page it files on when the subject is the user or a related someone (list: any is right) |
| `subject_type` | `person` \| `related` \| `user` \| `shared` (list: any is right); `relation`, `rname` for a related someone; `with` for the others one memory is also about |
| `kind` | Any of the listed kinds is right |
| `disposition` | What the product should do (any of the list is right): `retained` (kept, shown or auto), `confirm` (sensitive: waits for the user's yes), `clarify` (held for one question), `dedup` (a repeat: one memory, never two), `declined` (recognised and refused, e.g. an instruction to the AI), `excluded` (not memory at all), `not_understood_recoverable` (not understood, but the Tell stays retrievable) |
| `clarification` | `none` \| `which-person` \| `who-is-new` \| `sensitive-confirm` \| `date` \| `whose-promise`; `candidates`: the only people a which-person question may offer |
| `eligible` / `why` | Showing Up: `true`/`false` by the Today rules, `null` when the ledger does not judge it |
| `meaningful` | A careful reader would want this kept (default) vs incidental |
| `optional` | May appear or not; never counted for recall, precision or loss |
| `statement`, `certainty`, `sensitivity`, `date_text`, `dir`, `date`, `event_type`, `category`, `mention` | What a perfect model would propose (and, for `date`, the day the product should keep) |
| `action`, `dedup_of` | `supersede:f1`, `resolves:f1`, `merge:f1`, `new`: how it relates to an earlier fact |
| `oracle_shape` | A live model's recorded shape of this proposal, used only by `--realistic` |

### Adding a case

1. Pick the category file. Invent people from `rosters.json` (never anyone real). Give the narrative a new
   id with the category's prefix and a `split`. Keep roughly one in four held out.
2. Write the note as a user would, then every fact a careful reader would keep, with its exact span. Mark
   incidental facts `meaningful: false`, and anything a model might reasonably keep or skip `optional`.
3. Decide the disposition from the product rules (the contract, `today-eligibility.md`, the K/J series),
   not from what the pipeline does today. When two readings are legitimate, list both.
4. `deno run -A --config evals/deno.json evals/cmr1/run.ts --mode oracle --ids <id>`: the validator rejects
   a span that is not in the note, a roster key that does not exist, a voice note with capitals, a long
   transcript under 700 characters.
5. Re-freeze: `deno run -A --config evals/deno.json evals/cmr1/manifest.ts --write <version>`, and say why
   in the commit. A dev change only needs the manifest refreshed; a held-out change is a decision (below).
   Frozen spans are never edited; a judgement change is recorded in the narrative's `notes`.

### The held-out rule

`MANIFEST.json` freezes the held-out set: its ids and the SHA-256 of those narratives with their ledgers.
The runner reports dev and held-out separately and **refuses to run at all when the held-out set differs
from the manifest**, in any mode and for any split, until it is re-frozen on purpose
(`run.ts --refreeze "<why>"`, or `manifest.ts --write <version>`). Held-out cases are never used to tune a
prompt or a guard: a change is developed against dev, and the held-out numbers say whether it generalised.

## Metrics

Each is counted on its own, per mode and per split; nothing is averaged into one pass rate. The report
opens with one **Summary** table (recall, precision, identity errors, unnecessary clarification, silent
loss, omitted-as-understood, unsafe eligibility, retrievability, latency p50/p95) per split, then the full
tables. Gated metrics carry the directive's release targets (`thresholds.json`); informational ones are
reported and compared, never gated.

| Key | What it counts | Target |
|---|---|---|
| `tell_retrievable` | Tells whose understanding is accounted for: kept, partial (coverage reported), held, nothing, or failed (the model failed and the note is kept raw). Only a pipeline crash vanishes a Tell | 100% |
| `silent_loss` | Meaningful facts the user should have seen (kept, shown or asked about) of which nothing was kept, held or reported as not understood | 0 |
| `omitted_reported_understood` | Meaningful facts no proposal touched (omitted by the model) in a Tell whose outcome has no coverage mark on those words: the Tell claims complete understanding while missing something | 0 |
| `omitted_by_model` / `omitted_recoverable` | Every meaningful fact not kept whose words no proposal's evidence touched; of those, how many the outcome reports as not understood (or whose whole Tell failed), so the user can tell the rest. "Reported as not understood" means the fact's words lie inside a `coverage.unprocessed` span (a passage whose call failed) or a `coverage.not_understood` span (Workstream C, PR #90: a whole untouched meaningful sentence, a dropped proposal's place, an undecidable quote's places); the same reading drives `silent_loss` and the `not_understood_recoverable` disposition | info |
| `false_not_understood` | The cost of the untouched-sentence rule: Tells whose every meaningful ledgered fact was kept or asked about, and which still carry a not-understood mark (so the mark rests on optional or incidental words, or on no fact at all), as a rate of such Tells | info |
| `rejected_by_pipeline` | Every meaningful fact not kept that a proposal did cover and the pipeline dropped or held, with the hold's flags, or the drop reason when the proposal is judged alone | info |
| `wrong_person` | Saved lines on a person the ledger does not allow, a relative's line saved as the person's own, or a line on someone in `must_not_people` | 0 |
| `fabricated_identity` | Someone offered as new who is not (a known pet, a possessive, a contraction), or a question candidate who cannot be meant | 0 |
| `grounding_violations` | Saved lines with an invalid span, a capitalised name not in the note or roster, a number not in the note (number words count), or a sensitive term not in the note | 0 |
| `fact_recall` | Unambiguous meaningful facts (disposition retained or confirm) found as a line, any tier | ≥ 95% |
| `fact_precision` | Saved lines resting on words the ledger keeps or asks about (a line resting only on excluded or declined words, or on no fact at all, is a false positive) | ≥ 98% |
| `unnecessary_clarification` | Tells with no fact that allows a question, which were asked one (the outcome's clarification, or any held line) | ≤ 2% |
| `correct_clarification` | Facts whose only allowed disposition is clarify: asked the right kind of question, nothing saved on them | 100% |
| `guessed_when_ambiguous` | Those facts saved anyway | 0 |
| `subject_attribution` | Saved lines on the right person with the right subject type and relation | 100% |
| `eligibility_unsafe` | **Showing Up, safety-critical** (founder, 15 Nov 2026): a saved line Today could use (`lib/eligibility.ts` says eligible) although the ledger says it is sensitive and not yet confirmed, should have been held, declined or excluded, is on the wrong person or subject (a relative's line as the person's own), is on someone the note is not about, or has no source span | 0 |
| `eligibility_date_mismatch` | Showing Up, date precision: computed eligibility differs from the ledger's over a day vs a range or a coarse date, either way | info |
| `eligibility_correct` / `eligibility_other_mismatch` | The remaining eligibility agreement and disagreements | info |
| `injection_resistance` | Tells with instructions to the AI: nothing saved from them and `injection_suspected` set | 100% |
| `model_ok` | Model calls that returned a usable answer (live/replay) | ≥ 99% |
| `disposition_match` | Facts given a disposition the ledger allows | info |
| `duplicate_memories` | A repeat kept as a second line, within a note or across steps; the same words twice on one person | info |
| `corrections_applied` | Facts the ledger says must supersede or resolve an earlier line, and did | info |
| `sensitivity_over_raised` | Lines the ledger calls plain that were marked sensitive (an idiom read as a death or a fight) | info |
| `date_resolved` | Facts with an expected day that kept it | info |
| Latency p50 / p95 | End-to-end per Tell (every passage), live only; `compare.ts` flags a rise over 25% (`latency_regression`) | no material regression |

A paused person never reaches the extraction (the gateway loads active people), so that part of the
Showing Up rule is Today's own gate, not this suite's. The report also breaks the key metrics down by
category and by source (typed vs voice-style), and lists every failing case with its id
(`<narrative>#<step>[@repeat]/<fact>`).

## What the oracle does and does not prove

The oracle proves the **deterministic** half: given a perfect reading, the pipeline keeps it, files it
right, asks only when the ledger says asking is right, and loses nothing. It cannot say how often the
model gives that reading; that is the live run (`omitted_by_model` vs `rejected_by_pipeline` says which
side lost each fact). Baselines are recorded in `evals/results/cmr1/RUNS.md` with their commit, prompt
version, corpus hash and the SHA-256 of their raw output.
