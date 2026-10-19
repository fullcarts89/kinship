# 06 · Technical brief (draft): extraction from longer narratives without silent loss

*Draft for founder review, 19 Oct 2026. **PROPOSAL ONLY. NO BUILD AUTHORISED.** This brief turns `05-long-narrative-extraction.md` §4 into a concrete design that could be reviewed like a Commit-next brief. Every number in it is a candidate value, marked as such; **none is chosen here**, and the founder's direction stands: no arbitrary user-facing cap, and no internal limit may silently drop information. File and line references are to `main` `9ad5e6d`. Nothing in this folder changes code, a prompt, a schema, a flag or a screen.*

> **Calibration ran on 19 Oct (`07-calibration-evidence-2026-10-19.md`), on the founder's authorisation.** Its findings change this brief in three places, marked "(calibrated)" below: the model proposes every detail and the pipeline's cap is the loss; model time is ≈ 1.75 s + 1.5 s per proposed memory, so **a call's output must be bounded by time, not by tokens**, and the 45 s server timeout is reached (~29 proposals) well before the 8,000-token budget (~34); and a model omission was observed 3/3 on a 9-detail story. The candidates below are now from measurement; they stay candidates until the founder's review and a re-measurement on the day they are set.

## 0. What the founder is asked to decide from this brief

1. Whether the **chosen path** (§2) is the right shape: one call plus coverage accounting for every note; a bounded second pass over uncovered sentences; continuation when output is truncated; segmentation only above a threshold set by evidence.
2. Whether the **coverage record** (§3) and the **reply shape** (§4) are acceptable as the way the four outcome categories become visible, including the content-free summary on the server.
3. Whether **writes stay single-transaction per note** (§6, recommended) rather than per window.
4. Whether the **copy proposals** for the card, the sheet and the Source view (§8) may be tested on the simulator tier.
5. Whether to **run the calibration** (§10, Stage 1 of this brief: live-model runs of the S-series on the local stack, ~$5–15 of model calls) that sets the candidate values before any code is written.
6. The **quota treatment** of a multi-call note (§9).

Approving this brief would authorise the calibration runs and a reviewed implementation plan; it would not by itself authorise a gateway deploy, a migration or a build. Each of those stays a separate step with its own evidence (§11).

---

## 1. The proposal in one paragraph

Keep one model call for every note. Replace the silent eight-item cut with **accounting**: a deterministic sentence map of the note, shared by the gateway and the phone, on which every sentence ends in exactly one of four categories (processed · extracted · excluded by a rule · unprocessed). Return the map's summary with the reply, and show the fourth category on the phone as a **partial** state with a retry that resumes from the map, never re-sending finished content. When the model's reply is cut by the output budget, keep the complete items and **continue** for the uncovered sentences instead of discarding and retrying whole. After any call, run one small **second pass** over sentences with clear meaning and no proposal, so a model omission is caught rather than assumed. Only when a note is larger than one call reliably completes, process it in sentence-aligned **windows** under one claim, carrying an entity ledger (names and referents, never facts) and the statements proposed so far, and commit everything in one transaction at the end. Fix the evidence locator so a quote that appears twice is placed by position rather than dropped. Change nothing about tiers, thresholds, sensitivity, dates, merge or provenance.

---

## 2. The chosen path and what it changes

| Layer | Today | Proposed | Trust gates touched |
|---|---|---|---|
| Sentence map | `sentenceAroundSpan` finds a sentence for a span (`pipeline.ts`) | A shared, deterministic `sentences(text)` → `[{index, start, end}]` in `_shared/extraction/sentences.ts`, imported by the gateway and the app (like `voice.ts` is today), so both sides agree on the map | none |
| Item bound | `MAX_ITEMS = 8`, first eight in order, `too_many_items` dropped silently (`pipeline.ts:73,105-110`) | **No semantic cap in the pipeline.** `planExtraction` plans every proposal. A separate **batch bound** on how many planned items one call may write (§6) is an internal limit with a continuation behind it; proposals past it are category 4 for this call and are carried to the continuation, never dropped | none |
| Evidence locator | first quote must be unique or the item is `evidence_ambiguous`; no `near` hint passed (`pipeline.ts:275-282`; `spans.ts:88-111`) | Pass `near` = the proposal's `sentence_index` start (a new optional output field, §5) or, failing that, the previous planned span's end; normalise quotes, whitespace and trailing punctuation with an offset map back to the original text | grounding stays 1.0: a span is still a verbatim substring of the note |
| Output truncation | `max_tokens` → output discarded, 503, six retries (`model.ts:61`; `handler.ts:303-309`; `understanding.ts:130,171`) | Tolerant parse (§5.3) keeps complete items; their sentences are category 2/3; the rest are category 4 and go to a **continuation call** (§5.4), bounded | none; a half-written item is never kept |
| Model omission | not detected; `item_recall ≥ 0.85` passes | **Second pass** (§5.5) over sentences with clear meaning and no proposal, once, bounded | same thresholds on its proposals |
| Large notes | one call, whatever the size | **Windows** (§5.6) above a calibrated size, sequential, one claim, one write | the comparator's rules apply across windows exactly as against the dossier |
| Reply | `saved`, `held`, `clarification`, `known` (`handler.ts:333-342`) | plus `coverage` (§4) | none |
| Storage | items ≤ 8 per write (`M/20261016090000:200-201`); held set 1–8; capture status pending / processing / needs_review / done / failed | item bound raised to the batch bound; held set bound raised with the same number; capture status gains `partial`; a content-free `capture_processing` record (§6) | forward-only migration; reaches production only by merging to `main` |
| Phone | states waiting / review / answering / closing / done / kept / failed (`understanding.ts`) | state `partial` with `coverage` on the row; a **Try again** affordance; the card, sheet and Source view show the categories (§8); Today ignores partial notes | none |
| Telemetry | `extraction_completed.items_n`, no dropped count | `unprocessed_n`, `excluded_n`, `windows_n`, `continuations_n` as small-count buckets; `tell_lifecycle.outcome` gains `partial` | content-free as today |
| Evals | max expected items 3; no truncation or length cases | `narratives.jsonl` with per-sentence expectations and the S-series; new zero-tolerance metrics (§10) | existing thresholds unchanged, never lowered |

---

## 3. The coverage record

### 3.1 Shape (phone, on the understanding row; content-bearing only as offsets)

```
coverage: {
  v: 1,
  sentences_n: 23,
  state: "complete" | "partial",
  // one entry per sentence, by index; offsets are code points into captures.raw_text
  map: [
    { i: 0,  start: 0,   end: 41,  cat: "extracted",  items: ["<item id>"] },
    { i: 1,  start: 42,  end: 88,  cat: "excluded",   why: "duplicate" },
    { i: 2,  start: 89,  end: 130, cat: "processed" },            // filler, no proposal, no clear meaning
    { i: 3,  start: 131, end: 190, cat: "unprocessed", why: "truncated" },
    ...
  ],
  calls: [ { n: 1, kind: "extract", outcome: "max_tokens" }, { n: 2, kind: "continue", outcome: "ok" }, { n: 3, kind: "check", outcome: "ok" } ]
}
```

- `cat` ∈ `processed` (category 1 only: examined, nothing proposed, no clear meaning) · `extracted` (2) · `excluded` (3) · `unprocessed` (4).
- `why` for `excluded` is the pipeline's existing drop reason code (`types.ts:166-185`), plus `no_proposal_after_check` (§5.5). `why` for `unprocessed` ∈ `truncated` · `capacity` (past the batch bound in this call) · `timeout` · `not_run` · `omitted` (clear meaning, no proposal, second pass not run).
- It holds no words. Statements and quotes stay on the items as today.
- **Where it lives:** a new `coverage TEXT` column on the phone's `understanding` table (`schema.ts`, via the `ADDED` list), beside `reading`. It is the retry's input (§7).

### 3.2 The server's copy (content-free)

A `capture_processing` row per capture (or columns on `captures`; the migration decides): `state` (`processing` · `partial` · `complete`), `sentences_n`, `extracted_n`, `excluded_n`, `unprocessed_n`, `windows_total`, `windows_done`, `continuations_n`, `updated_at`. Counts only; no offsets, no words. It lets the retry path skip finished windows, lets the stale-claim rule know a multi-window run is alive, and lets `ai_calls` stay as it is. The phone's map is the only place offsets live, as spans are today.

### 3.3 How a sentence gets its category (deterministic)

1. Every sentence starts `unprocessed / not_run`.
2. A parsed model call over a span of sentences marks them `processed`.
3. Each planned item marks its spans' sentences `extracted` (saved or held alike; a held item declined by the user later moves them to `excluded / declined`, as "Not this" does today).
4. Each dropped proposal marks its first quote's sentence `excluded / <reason>` unless the sentence is already `extracted` (a sentence with one kept and one dropped proposal is `extracted`).
5. Proposals past the batch bound mark their sentences `unprocessed / capacity` for this call.
6. A truncated reply marks every sentence not covered by a complete item `unprocessed / truncated`.
7. After the final call, a `processed` sentence that **passes the meaning floor** (§5.5) and has no proposal becomes `unprocessed / omitted` until the second pass runs; after it, `excluded / no_proposal_after_check`.
8. `state = partial` iff any sentence is `unprocessed`.

The rule set is pure and lives beside the sentence splitter so it can be unit-tested on both platforms.

---

## 4. The reply shape

Added to the `extracted` reply (`handler.ts:333-342`) and mirrored into the client's `Understood` type (`gateway.ts:110-122`):

```
coverage: {
  state: "complete" | "partial",
  sentences_n, extracted_n, excluded_n, unprocessed_n,
  unprocessed: [ { start, end, why } ],      // offsets only; the phone renders the marks
  windows_total, windows_done, continuations_n
}
```

- `saved` and `held` stay as they are. `dropped` is still not returned as a list; its effect is the `excluded` category per sentence.
- The `done` recovery path (`handler.ts:267-276`) returns `coverage` too, and **`saved`**, so a reply lost to a client timeout no longer loses the card's summary (this fixes `05` §2.2's `done` gap on its own).
- A `partial` reply is a 200, not a 503: the note is in a known state and the phone owns the retry.

---

## 5. The gateway pipeline, step by step

### 5.1 Sentence map first

`sentences(text)` runs before the model call; its map is in the request context and in the coverage record.

### 5.2 The output schema: one optional hint

Add `sentence_index: nullable(integer)` to each item in `SCHEMA` (`v1.ts:75-148`) and one line to the prompt: "sentence_index — the number of the sentence the first quote comes from; sentences are numbered in the note." The pipeline treats it as a **hint only**: `near` for the locator. A wrong hint cannot invent a span (the locator still requires an exact match; with two matches equally near, it stays ambiguous and the item is excluded with `evidence_ambiguous`, which is now rare). **This is a prompt change and so needs the eval gate** (`evals/README.md`): oracle, replay and a labelled live run against the frozen corpus with thresholds unchanged.

### 5.3 Tolerant parse on truncation

When `stop_reason === "max_tokens"` (`model.ts:61`): take the text block; find the longest prefix that is a valid JSON document once closed (append `]}` or `]}}` as needed and parse); keep only items that validate against the schema in full; discard any item whose object was cut; record `truncated`. If no complete item can be recovered, the call is `truncated` with zero items. The complete items go through `planExtraction` exactly as a normal reply. The SDK's structured-output guarantee does not apply to a cut document, so the schema check is explicit here.

### 5.4 Continuation

Input: the same system prompt (cached), the note, the roster and dossier as before, **the statements proposed so far** (statement, kind, person) under the heading "already noted; do not repeat", and **the sentences still uncovered** by index and text. Instruction: "Propose only from the uncovered sentences; mark `existing` against the already-noted list as you would against memory." The continuation's proposals are planned against the dossier **and** the planned items so far (the comparator's merge / supersede / resolves rules apply to both; never across subjects). Bound: `CONTINUATIONS_MAX` (**candidate 2–3, calibrated**: a 25-detail story is one call plus one continuation at a batch bound of 12–15; a 50-detail story moves to windows); at the bound, remaining sentences stay `unprocessed / truncated` and the note is `partial`.

**(calibrated) Bound the call's output by time, not only by tokens.** On 19 Oct, every proposal cost ≈ 236 output tokens and ≈ 1.5 s of model time; the 45 s server timeout fell at ~29 proposals and the 8,000-token budget at ~34, so `max_tokens` would never have fired first, and the 50-detail story timed out twice and returned nothing. So the extract call and each continuation must also **ask the model for at most `BATCH_BOUND` proposals** (a prompt instruction with a schema `maxItems`, "the first N in the note's order; say that more remain"), and the model's "more remain" flag, or an uncovered sentence, triggers the continuation. A time-bounded call that completes is worth more than a token-bounded call that times out. The prompt change rides on the same eval gate as §5.2.

### 5.5 The second pass (model omissions)

Trigger: after the last extract or continuation call, any sentence `processed` with no proposal that passes the **meaning floor**: it names a roster person or a related someone, or contains a kin word, a promise verb, a milestone word, a date word or an event word from the pipeline's existing lexicon (`lexicon.ts`, `names.ts`, `dates.ts`). Pure filler does not pass. Input: those sentences by index and text, the roster and dossier, the statements so far. Instruction: "Is there anything in these sentences worth keeping that is not already noted? Return no items if not." Bound: once per note. Its proposals go through the same pipeline and thresholds; sentences it leaves become `excluded / no_proposal_after_check`. Cost: skipped when no sentence passes the floor (most notes).

### 5.6 Windows (only above the threshold)

Trigger: a note likely to carry more than about two batches of proposals (**candidate, calibrated: more than ~8–10 sentences or ~500–600 characters at the S-series density of ~1.5 details a sentence**; density varies by writer, so the estimate should be conservative and the first window's actual proposal count should correct it). Windows are sentence-aligned, **~6–8 sentences** each (so that one window's proposals fit one time-bounded call), with the previous window's last sentence as overlap. Sequential, one claim. Each window's call carries: the full roster; the dossier for people named in the window plus the ledger's people; **the ledger**: `{ names: [{text, person_id | "open"}], last_people: [person ids in order of last mention], user: "you" }`; **the statements so far** (as in 5.4). Each window's proposals are planned against the dossier and the items so far; the overlap sentence's proposals are attributed to the earlier window and deduped by span overlap before `sameItem` and mirror collapse. The ledger is updated from each window's resolved people and open names. After the last window, the second pass runs once over the whole note's uncovered sentences.

**Claim lifetime:** the stale-claim reclaim (2 minutes, `M/20261004090000:103`) is refreshed per window (a `claimed_at` touch in `capture_processing`), so a 50-detail note running three windows is not reclaimed mid-run; a run that stops leaves `windows_done` for the retry.

### 5.7 What is unchanged

`planItem`, tiers, `AUTO_SAVE_CONFIDENCE`, `HOLD_FLOOR`, sensitivity, dates, `resolvePerson`, `chooseClarification`, `needsAcceptance`, the one-sentence-one-memory rule, mirror collapse, `sameItem`, the comparator, provenance, exact Undo. The second pass and continuations produce proposals that enter the same functions.

---

## 6. Writes and storage

**Recommendation: one transaction per note.** Planned items from every call and window accumulate in memory on the gateway; `write_extraction_with_review` is called once at the end with all items and the held set. Reasons: the supersede and closure triggers, `memory_item_history`, exact Undo and the held set's single `review_created_at` all assume one write per capture; per-window writes would need an idempotency key, a per-window review, and an Undo that spans writes. The cost of the choice: no "so far" lines on screen during a multi-window run; the UI shows progress instead (§8). If the founder prefers visible partial results, the alternative is specified in `05` §4.5 and would be its own revision of this brief.

**Migration (forward-only, one file):**
- `write_extraction` and `write_extraction_with_review`: the per-call item bound becomes `BATCH_BOUND` (**candidate 12–15, calibrated by time: ≈ 20–25 s of model output per call, under a client timeout raised above the server's**), and the arrays in `capture_reviews.items` and `resolve_capture_review` (`M/20261004100000:144-145,298-300`; `M/20261004130000:54-57`) are sized to the **note**, not the call (several calls accumulate into one write). **The batch bound is an internal batch size with a continuation behind it, not a cap: a note with more items than the bound is written in one transaction from several calls.** If the founder prefers no SQL bound at all, the arrays are unbounded and time alone bounds a call.
- `captures.status` gains `partial`; `capture_processing` (§3.2) is created with RLS like `capture_reviews` (owner read, service role write).
- `MAX_ANSWERS` (`handler.ts:202`) follows the held-set bound.
- A `partial` capture is never `done`; Today's candidate generation (`v2_reasons_v0.sql`) ignores it until complete (the memory items it has written are real and appear on the page; only the note's own "settled" state waits).

---

## 7. Retry without re-entry

- The phone's `partial` state keeps the coverage record and shows **Try again**. The automatic retry schedule (`BACKOFF`) applies to `partial` with `why ∈ {timeout, not_run}` as it does to failures today; `truncated` and `capacity` do not auto-retry past `CONTINUATIONS_MAX` (they wait for the user's Try again, which resets the continuation count once).
- A retry sends `{capability, input_ref, resume: true}`; the gateway reads `capture_processing`, skips windows already done, and runs only the unprocessed sentences (as a continuation over those sentences, with the statements so far taken from the items already written for this capture). **Finished content is never re-sent to the model.**
- The capture row and its text persist throughout (they do today); nothing asks the user to retype.
- The client timeout rises to **server timeout + margin** (`gateway.ts:288` vs `registry.ts:49`), or the server's falls below the client's; and a 409 `busy` becomes "wait and re-ask", not an attempt (`understanding.ts:807-808`). Both are small constants and belong to this brief because a multi-call note is the one most exposed to them. **(calibrated)** By the 19 Oct fit the phone's 30 s timeout is reached at ~19 proposals and the server's 45 s at ~29: a 25-detail story already fails on the phone today for this reason alone, before any cap.

---

## 8. The phone: states and copy (proposals; the founder decides the words)

| Where | Today | Proposed |
|---|---|---|
| Dock, during a multi-call note | "Understanding…" | "Understanding…" unchanged; after the first call completes on a windowed note: "Understanding · part 2 of 3" |
| Kept card, complete | "Kept for Susan" + 3 lines + "and N more" | unchanged up to three lines; past three, **sections** (Lately · Coming up · You said you'd · Between you) and, with several people, a group per person in the note's order |
| Kept card, partial | (does not exist: "Couldn't understand this one. Your note is saved.") | "**Kept 6 things so far.** Kinship couldn't get to all of it." · **Try again** · Undo. Never "Kept for Susan" alone |
| Review sheet | all lines; one question at a time | questions grouped by type and counted ("3 to check"); a sensitive group last; otherwise unchanged |
| Source view | ochre marks on understood passages | plus a plain mark on unprocessed passages: "Couldn't get to this" (tap: Try again); on tap of an unmarked passage with an `excluded` category: "Nothing kept from this" and a fixed phrase per reason class ("it wasn't clear who this was about" · "it repeated something above" · "it was too uncertain" · "it was already known"); never the model's words |
| Today | — | a partial note never counts as settled; its written items are real and eligible as today |
| Analytics | `extraction_completed` | `unprocessed_n`, `excluded_n`, `windows_n`, `continuations_n` (0–10 buckets); `tell_lifecycle.outcome` `partial` |

Copy stays in the Quiet Herbarium voice: one state, one word, one action. No counts of what is missing beyond the Source marks; no percentages.

---

## 9. Quota and cost

- Daily quota (`AI_DAILY_LIMIT`, 50 calls) is **charged per note**, not per call, for extraction: the first call consumes a unit; continuations, the second pass and later windows of the same note do not. Internally, a per-note **call bound** (`CALLS_MAX`, **candidate 6**: one extract + two continuations + two more windows + one check) protects cost; reaching it leaves the note `partial` with a visible state, never a silent stop.
- Cost per ordinary note is unchanged (one call; the check skipped when nothing passes the floor). A 25-detail story: one call, possibly one continuation, one check. A 50-detail story at the threshold: two or three windows plus one check. All with the cached system prompt.
- Time: sequential calls; the UI shows progress. The benchmark (§10) records end-to-end for S25 and S50.

---

## 10. Evidence plan and calibration

### Stage 1 of this brief · Calibration · **RUN on 19 Oct 2026** (`07-calibration-evidence-2026-10-19.md`)

The S-series (S5, S8, S9, S15, S25, S50, S-filler; S-trunc, S-timeout and S-resume excluded because they need a changed budget, timeout or an interrupted gateway) ran through the current gateway on the local stack with the live model, three runs each on fresh accounts, 18 completed calls and three natural timeouts, $0.95 at list prices for the completed calls. Findings: proposals ≈ candidate details; `too_many_items` dropped 5–6 of 13–14 and 16 of 25; `evidence_ambiguous` did not occur on these stories (short, distinct quotes; the locator fix remains justified by the code path, not by this sample); the model omitted one of nine details in 3/3 runs; model time ≈ 1.75 s + 1.5 s per proposal, so time bounds a call before tokens do. **The candidate values in §2, §5.4, §5.6, §6 and §7 are from this run; they are re-measured on the day they are set.**

### Fixtures

`evals/extraction/fixtures/narratives.jsonl`: the S-series as fixtures with `exhaustive: true` and a new `expect.coverage: [{sentence, cat, why?}]` (the grader's `fixture.ts:110` and `grade.ts:284` gain the field). Rosters from `rosters.json`; people fictional. Frozen into the manifest as `extraction-v2.10` (and the `EXTRACTION_EVAL_VERSION` constant in `registry.ts:38` brought back in step with the manifest).

### Metrics (added; existing ones unchanged and never lowered)

`capacity_loss = 0` · `unreported_unprocessed = 0` · `coverage_consistency = 1.0` · `cross_window_duplicates = 0` · `within_note_supersession ≥ 0.95` (reported; the merge set's `cross_subject_merges = 0` applies) · `truncation_detected = 1.0` · `resume_without_rerun = 1.0` · `narrative_item_recall` reported separately (the corpus-wide 0.85 floor must not hide a story that lost a tenth).

### Tiers

| Tier | What |
|---|---|
| UNIT | `sentences()` and the category rules (both platforms); the tolerant parse (cut documents at every byte of a sample reply); the locator with `near` and normalisation (offset map round-trips); the ledger update; the pipeline with proposals past the batch bound (category 4, never dropped) |
| INTEGRATION | Deno: continuation and second-pass prompts built correctly; `write_extraction_with_review` with items above eight and the held-set bound; pgTAP for the migration, RLS on `capture_processing`, the `partial` status, the claim refresh |
| BLACK-BOX | `narratives.blackbox.tsx`: S9, S25, S50 through the real screens and gateway on the local stack with replayed replies; S-trunc with the stub returning a cut reply; S-timeout with the client timeout lowered; S-resume by stopping the gateway after window 2 and restarting; the card's sections; the Source marks; Today ignoring a partial note |
| LIVE-MODEL | the S-series live, graded by the new metrics; the frozen corpus replayed with thresholds unchanged (the `sentence_index` prompt change needs the labelled full run) |
| NATIVE-SIMULATOR | S25 and S50 told on the simulator with the live model and the founder's exact People; end-to-end time recorded |
| FOUNDER-DEVICE | the founder tells a real 25-detail story; the card, sheet, page and Source show the categories honestly; the gate's condition 6 and 7 (`05` §6) |

### Rollout (each step on the founder's go, in order)

1. Calibration runs and the evidence file.
2. Implementation on a branch from `main`: shared sentence map, pipeline, gateway, migration, client, evals, tests.
3. PR with all tiers reported; merge with a merge commit; the migration reaches production by that merge.
4. ai-gateway deploy from `main`.
5. A build; the founder's device pass; then and only then the `05` §6 gate is considered against story-first onboarding (`04` D2/D9).

---

## 11. What stays forbidden, and open questions

**Forbidden by this brief:** a silent drop anywhere on the path; showing a line the pipeline has not validated; lowering any threshold; a visible count of what is missing; ranking memories; any prompt change without the eval gate; any production data in fixtures.

**Open for the founder (beyond §0):**
- Whether the second pass should run on every note that passes the floor, or only on notes above a size (cost vs. the K5 rule's reach).
- Whether `excluded` reasons should ever be shown on tap in the Source view, or whether category 3 stays entirely silent (the product's default voice) with only category 4 visible.
- Whether `BATCH_BOUND` exists at all (an internal batch size with continuation) or the SQL arrays are unbounded.
- Whether the household dogfood should see `partial` states at all, or whether the story invitation stays at the current length until the gate passes on the founder's phone first.

**Effort (an estimate, to be revised after calibration):** the shared sentence map, the coverage rules and the locator fix are small; the tolerant parse, continuation and second pass are medium; windows and the ledger are medium–large; the migration and the client states are medium; the fixtures, grader and black-box suites are medium. Together, roughly two to three weeks of focused work plus the evidence tiers, scheduled only after the founder places it against B7–B9 and the household dogfood (`04` §3: it is not in bucket A or B by this document).
