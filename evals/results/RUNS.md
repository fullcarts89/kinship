# Paid eval runs: index and retention

Every paid `relationship_extract` run made during Checkpoint C. Each row records what ran: the code commit, prompt, eval version, corpus and model, plus the result and the SHA-256 of the run's raw output.

The full analysis of each run is in `docs/phase1/checkpoint-c-ai-verification.md`.

## Retention policy (Checkpoint C closeout, 4 Oct 2026)

- **Raw output is committed gzipped.** A run's raw output (per-fixture model proposals, pipeline outcomes and call stats) is committed as `.json.gz`, made with `gzip -9n`.
  - It is byte-identical to the JSON the run produced once unpacked. The SHA-256 below is that of the unpacked JSON.
  - Uncompressed, one full run is about 1.4 MB and 65,000 lines of JSON. Gzipped it is about 70 KB.
- **Kept in the tree:** the **approved baseline** (the run the current prompt and pipeline were approved on) and the final smoke run. These are the free replay inputs:
  ```sh
  deno run -A --config evals/deno.json evals/extraction/run.ts --mode replay --replay evals/results/full/<run>.json.gz
  ```
  CI replays the approved baseline on every push. A change to the deterministic pipeline that moves any metric of the evaluated baseline is therefore visible, without a model call.
- **Superseded runs** are kept in git history, not in the tree.
  - They are byte-for-byte retrievable from commit `673fd24d00f5abf43f4ea7ebaec005a1b8c3c99f`. That commit became part of `main`'s history when PR #13 was merged with a merge commit.
  - The SHA-256 below verifies a retrieved copy:
    ```sh
    git show 673fd24:<path> | sha256sum
    ```
- **When a new run is approved as the baseline**, commit its `.json.gz` and add a row here. Move the previous baseline's row to "Superseded"; its file stays in history at the commit that last held it.
- **Fresh run output is never committed as is.** Runs in CI or locally write `evals/results/<stamp>-<label>.json` and `.md`, which `.gitignore` excludes. CI also keeps each run as a workflow artifact, but those expire.

## Approved baseline

| Run | Commit evaluated | Prompt | Eval version / corpus | Model | Fixtures | Result | Cost | Raw output (SHA-256 of JSON) |
|---|---|---|---|---|---|---|---|---|
| C.1 final, 4 Oct 2026 15:20 UTC ([Actions](https://github.com/fullcarts89/kinship/actions/runs/37212235734)) | `66e15dd0b80698965050825fbe441281706608df` | `relationship_extract/v5` | `extraction-v2.3`, `7f9ca9348e02c8f6ac8a2a9dd4f47b36ff708034af48dee16e567043fb8fc291` | `claude-opus-5-5`, effort low | 393 | Every gated metric passes; C-4 18/18; wrong subject 0.3% (1/369) | $2.65 ($0.0067/call) | `full/2026-10-04T15-20-01-opus-5-5-low-c1-run.json.gz` · `b4acf2f83809293982b1d2def284b89d32c82fb9433ed4a640213087613a0dc4` |

## Candidate baseline (awaiting founder approval)

| Run | Commit evaluated | Prompt | Eval version / corpus | Model | Fixtures | Result | Cost | Raw output (SHA-256 of JSON) |
|---|---|---|---|---|---|---|---|---|
| Stabilization, 6 Oct 2026 02:38 UTC ([Actions](https://github.com/fullcarts89/kinship/actions/runs/37404679229), PR #18 `run-evals-full`) | `692406963cacc59ecb16f10bc4724bae4329c163` | `relationship_extract/v6` | `extraction-v2.4`, `f024b189c62ba9657de0a00191492c44f79b8000947aa63d79a9c4e9b93d1ab9` | `claude-opus-5-5`, effort low | 400 | Every gated metric passes; wrong subject 0% (0/372); user promises 86.7% (13/15). Replayed through the follow-up pipeline fix ("you're" grounded, "We" never a new person): promises 15/15, merge 46/46, items 362/366 | $2.74 ($0.0069/call); p50 2.7 s, p95 5.8 s | `full/2026-10-06T02-38-45-opus-5-5-low-v6-run.json.gz` · `6ba8fb30c0a67e0cec46e2d1ff89a523857168044407a94b48a2c04f37878763` (rebuilt from the job log; the workflow artifact holds the original file) |

CI keeps replaying the approved C.1 baseline until the founder approves this one.

## Kept for replay: smoke

| Run | Commit evaluated | Prompt | Eval version | Fixtures | Result | Cost | Raw output (SHA-256 of JSON) |
|---|---|---|---|---|---|---|---|
| Smoke run 3, 3 Oct 2026 23:59 UTC | `99bd544bb49dca01603517a0b3939ffcece035fa` | `relationship_extract/v1` | `extraction-v1` (smoke set, `smoke.json`) | 29 | Every gated metric passes; 28/29 fixtures | $0.25 | `smoke/2026-10-03T23-59-11-opus-5-5-low-smoke-run3.json.gz` · `ccea37033907255c2d3483e768c29180f5ee606d8dac6d94213c84b2cba0a0f2` |

## Superseded (in git history at `673fd24`)

| Run | Commit evaluated | Prompt | Eval version / corpus | Fixtures | Result | Cost | Path at `673fd24` · SHA-256 of JSON |
|---|---|---|---|---|---|---|---|
| Smoke run 1, 3 Oct | `0e02b610698610fdc5c2b4cced9e8dca35a2fb58` | v1 | `extraction-v1` | 29 | Every call refused (HTTP 400: schema over the union-type limit); no output saved | $0 | — |
| Smoke run 2, 3 Oct 23:52 | `6219969247eca3455125a8bf75b4e5c203bbe9f2` | v1 | `extraction-v1` | 29 | 24/29; `person_ask` and `item_recall` missed | $0.25 | `evals/results/smoke/2026-10-03T23-52-43-opus-5-5-low-smoke-run2.json` · `96b0b2dc8e01b4a55d0263d502ff736a11eb6898d3c0a32e7a0952e4a44693c2` |
| Full run 1, 4 Oct 06:01 | `fea48dafcabeff8d631e1f36b10dd738fc4aab38` | v1 | `extraction-v2`, `092287db6417867f…` | 377 | 8 metrics missed; wrong subject 2.8% | $2.51 | `evals/results/full/2026-10-04T06-01-32-opus-5-5-low-full-run1.json` · `59cf147c5d6bb424b2ca54742a0fca664bcaacd31478f67ccd7a8f1adfd3f3dc` |
| Full run 2, 4 Oct 06:15 | `527750585deedccc5e1acf57799209e5e325ad38` | v2 | `extraction-v2.1`, `ec5e39a25ab2bb67…` | 377 | 4 metrics missed; wrong subject 0.3% | $2.50 | `evals/results/full/2026-10-04T06-15-26-opus-5-5-low-full-run2.json` · `46d1abda4ac6a259ff45661ab20b9c95477d3c5052df1d73099bcae029d9b845` |
| Full run 3, 4 Oct 06:24 | `698653072e79bd62088e55ea5898ad0602da9c9b` | v3 | `extraction-v2.1`, `ec5e39a25ab2bb67…` | 377 | wrong subject 0.6% (missed) | $2.52 | `evals/results/full/2026-10-04T06-24-28-opus-5-5-low-full-run3.json` · `0f5bd4be8f40f09dfbfac052044eb4e529d35a3f75ab727922d33926b31f71fa` |
| Full run 3b (accidental repeat), 4 Oct 06:45 | `7e5f0d002cb5acc3f3b5b54fcc8075b7c9116da3` | v3 | `extraction-v2.1`, `ec5e39a25ab2bb67…` | 377 | Every gated metric passes; repeatability point for run 3 | $2.52 | `evals/results/full/2026-10-04T06-45-45-opus-5-5-low-full-run3b-repeat.json` · `89789cd621156d2ef77cc296b26be27ca4b3f4cb9bba7b389537ce240b97e567` |
| Final baseline (pre-C.1), 4 Oct 06:52 | `810594cb7c2bd01d2903d33c227fbfcb3367b174` | v4 | `extraction-v2.2`, `0d7a155d6fe4352b…` | 384 | C-4 16/17 missed; all else passes; wrong subject 0% | $2.59 | `evals/results/full/2026-10-04T06-52-45-opus-5-5-low-final-run.json` · `d82e1563835accedb03a1f54085e268e6dec9e043526801a249b8440ff123930` |

All runs used `claude-opus-5-5` at low effort. Total spend on paid runs in Checkpoint C: about $15.81.
