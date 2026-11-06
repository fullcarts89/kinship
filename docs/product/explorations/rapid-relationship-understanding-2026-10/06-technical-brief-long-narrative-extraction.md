# 06 · Technical brief (revised draft): extraction from longer narratives without silent loss

*Second draft, 19 Oct 2026, revised on the founder's review of the calibration (`07`) and the first draft. **PROPOSAL ONLY. NO BUILD, MIGRATION, MERGE, DEPLOYMENT OR PRODUCTION WORK AUTHORISED.** Every number is a candidate from the 19 Oct measurements and is re-measured on the day it is set. File and line references are to `main` `9ad5e6d`. The founder's direction stands: no arbitrary user-facing cap on memories from one story; internal limits may exist but may never silently drop information; and no numeric cap is chosen here.*

*What the review asked for, and where it is answered: durable processing and atomic finalisation (§5); coverage granularity with a counterexample (§3); model omissions, the floor test and the detectable / undeterminable split (§4); timeouts, batching and recovery modelled for S25 and S50, including interruption, app close and gateway death (§6, §7); two independently reviewable options, containment and full capability, with complexity and regression surface (§9); the existing contract, B7–B9 and CC-28 preserved (§10); the evidence plan (§11); unresolved risks (§12); the founder decisions (§13, registered in `04` §9 as D9a–D9g).*

---

## 1. Independent recommendation

**Do the containment fix first, as a small reviewable PR before the household dogfood, and gate the full capability behind B9 and the dogfood.** The calibration showed that today a note with more than eight proposed memories loses its tail in silence, a 25-detail note already fails on the phone by a timeout inversion, and a 50-detail note loses everything after ninety seconds and six retries, each time reporting a normal outcome or a terminal failure that reads as the user's fault. None of that needs continuation, windows or a new review to stop: it needs the pipeline to say what it dropped, the phone to show a partial state with the note preserved and a retry, the client timeout to exceed the server's, and the card to stop claiming "Kept for Susan" as if complete. That is **Option A** (§9): a gateway reply change, one small forward-only migration (a capture status), client states and copy, no prompt change, no new table of content, and a regression surface that lies inside the Tell lifecycle tests and the K-series black-box suites. It changes nothing for a note of eight or fewer proposals, which is every note the household is likely to tell in its first weeks.

**Option B** (continuation, durable checkpoints with one atomic write, client-driven windows, a second pass, the structured review) is the long-term design. Its architecture is recommended as **durable per-window checkpoints followed by atomic finalisation**, driven by the phone one bounded call at a time (§5): it is the simplest shape that keeps exact Undo capture-scoped, writes every source once, survives an app close or a gateway death at any point, and makes a retry deterministic from what was checkpointed. Per-window commits are rejected for this product because the review row, the supersede ordering and the Kept card all assume one settled note. Option B's build waits for its own brief after B9; its direction can be approved now so Option A does not paint it in.

**The three things the review changed in the design:** coverage is **span-level with an explicit "unknown"**, never sentence-level and never a claim that examined text was understood (§3); the meaning floor is **dropped** because the offline test shows it misses the measured omission and flags filler, so the second pass runs over all unknown text and its answer can only shrink the unknown region, never produce "excluded" (§4); and **calls are bounded by time**, with the client's deadline above the server's and the call budget derived from the note's windows rather than a fixed six (§6).

---

## 2. The chosen path, by option

| Layer | Today | Option A · containment | Option B · full capability | Trust gates touched |
|---|---|---|---|---|
| Pipeline cap | `MAX_ITEMS = 8` keeps the first eight in order, drops the rest as `too_many_items`, silently (`pipeline.ts:73,105-110`) | The cap stays as the per-call batch size **but the dropped proposals' evidence spans are returned** as `unprocessed` and the note is `partial`. Nothing new is written; nothing is hidden | No cap in semantics; the batch bound is a per-call size with continuation and windows behind it | none |
| Reply | `saved`, `held`, `clarification`, `known` (`handler.ts:333-342`); the `done` path lacks `saved` | plus `coverage` (§3.3); the `done` path returns `saved` | same, plus window progress | none |
| Output truncation | discarded whole, 503, six retries | unchanged, **except** the client now sees `partial / truncated` after the first failure and offers Try again; no change to the model path | tolerant parse of complete items, continuation (§6.2) | a half-written item is never kept |
| Timeouts | client 30 s < server 45 s + SDK retry | **client ≥ server + margin; 409 `busy` is a wait, not an attempt** | the server's model timeout sized to one time-bounded batch | none |
| Model omission | undetected | undetected, **but never claimed otherwise**: the card says "Kept N things", never "understood"; unknown text is unknown | the second pass over unknown text (§4) | its proposals pass the same gates |
| Large notes | one call | one call; past the batch bound the rest is `unprocessed`, visible, retryable by re-telling that part (Option A does not continue) | client-driven windows with checkpoints and one finalising write (§5) | comparator rules apply across windows |
| Storage | items ≤ 8 per write; status pending / processing / needs_review / extracted / done / failed | `captures.status` gains `partial` (one forward-only migration, one value) | plus `capture_windows` checkpoints and `capture_processing` counts (§5.3); write bounds per note (§6.4) | migrations reach production only by merge |
| Phone | waiting / review / answering / closing / done / kept / failed | state `partial`; Try again; the card's honest heading; Source marks for unprocessed text; Today ignores partial notes | plus "part n of m", grouped questions, sections on the card | none |
| Evals | max expected items 3 | `narratives.jsonl` with the S-series and probes, span-level expectations, `capacity_loss = 0` and `unreported_unprocessed = 0` | plus the B metrics (§11) | existing thresholds unchanged, never lowered |

---

## 3. Coverage granularity: span-level, with an honest unknown

### 3.1 The counterexample (measured, `07` S25, three runs out of three)

The sentence *"Susan moved to Alameda in the spring, then in June she moved again, to Oakland."* produced one kept line, **"Susan moved to Oakland in June"** (run 1; runs 2–3 wrote "…after moving to Alameda in the spring" in the statement), and in every run its evidence span was only **"then in June she moved again, to Oakland"**. A sentence-level record would mark the whole sentence *extracted*. In truth the first clause, *Susan moved to Alameda in the spring*, never became a memory, and in run 1 not even a word of it survived. For the residence history that B3–B6 were built to keep, that clause is the earlier truth; its loss is exactly the kind sentence-level coverage would have hidden. A second, subtler case from the same runs: *"Chris is training for the Oakland marathon; his race is around his birthday"* was quoted whole and became *"Chris is training for the Oakland marathon, around his birthday"*, a conflation inside a fully covered span. **No coverage model can see that one; only the quality evals can.** Coverage accounts for what was quoted, not for what was understood.

The probes (`07` §6) also show the opposite: on short notes the model split every compound sentence into clause-level spans (two, three and three items for the three compound probes; the knee clause held separately in the shared one), so span-level accounting is both necessary and sufficient to see a clause that was left out when one is.

### 3.2 The minimum reliable model

Positive evidence only, at the span level, with the rest unknown:

| Region of the note | How it is known | Category | What the product may say about it |
|---|---|---|---|
| Under the evidence span of a saved or held item | the item's spans (`memory_item_sources`, the held item's `spans`) | **extracted** | the line itself, with its source |
| Under the first quote of a proposal the pipeline dropped by a rule | the drop, with its reason code | **excluded** | nothing by default; on tap in the Source view, a fixed plain phrase per reason class, never the model's words |
| Under the first quote of a proposal dropped for capacity, or under a window or call that was truncated, timed out or never ran | the drop reason `too_many_items`; the call record | **unprocessed** | "Kinship couldn't get to all of it" · a mark on the text · Try again |
| Everything else under a completed call | nothing positive | **unknown** | **nothing.** Not "understood", not "excluded", not a count. The card's strongest claim is "Kept N things" |

Two consequences the first draft got wrong:
- **"Processed" is not a category of text.** It is a fact about a call. A completed call over a span with no proposal leaves that span unknown.
- **The second pass does not convert unknown into excluded** (§4). It can convert unknown into extracted (a new proposal) or leave it unknown.

The Source view therefore shows three kinds of mark on a note: ochre for extracted (as today), a plain mark for unprocessed, and on tap only, the reason class for excluded. Unknown text looks like the note's own text, as it does today, and the product never says anything about it.

### 3.3 The record and the reply

Phone (`understanding.coverage`, a new text column via `schema.ts`'s `ADDED` list): `{ v, state: "complete" | "partial", extracted: [{start,end,item_id}], excluded: [{start,end,why}], unprocessed: [{start,end,why}], calls: [{n, kind, outcome}] }`, offsets in code points into `captures.raw_text`, no words. Server, content-free: counts per category and `state` on the capture (Option A: `status = partial` is enough; Option B adds `capture_processing`, §5.3). Reply: `coverage: { state, extracted_n, excluded_n, unprocessed_n, unprocessed: [{start,end,why}], windows_total?, windows_done? }`. Telemetry: `unprocessed_n`, `excluded_n` as small-count buckets; `tell_lifecycle.outcome` gains `partial`.

---

## 4. Model omissions: what can and cannot be known

### 4.1 The measured case and the floor test

S9's omitted fact ("And she finally fixed her bike.") was left out in 3/3 calibration runs. The probes repeated it with a paraphrase at the end ("She also got her bike fixed at last.", 2/2 omitted), a paraphrase with no pronoun and no name ("Oh, and the bike is finally working again.", 2/2), and the fact moved to the **front** of the note ("Priya finally fixed her bike.", 2/2). Told alone after a sighting ("Saw Chris today. He finally fixed his bike."), it was kept 2/2. **The omission is a relevance judgement the model makes in a dense note** (the prompt tells it that leaving something out beats a wrong detail), not a position effect and not a wording effect. The system cannot distinguish that judgement from a miss, and the user cannot see either.

The first draft's meaning floor (a sentence names a roster person or a related someone, or holds a kin, promise, milestone, date or event word) was run offline over every sentence that had no proposal in the calibration: it **misses the bike in every run** and **flags filler** ("The coffee at that new place is pretty good." via "coffee"); adding pronouns to the floor catches the bike but also flags "We talked about all sorts of things." No lexicon separates a dropped fact from small talk. **The floor is dropped.**

### 4.2 Policy

- **Detectable:** unprocessed text (capacity, truncation, timeout, not run): the system knows it did not look. Always shown.
- **Undeterminable from the outside:** a completed call that proposed nothing for a span. The span is **unknown**. The product never says it was excluded.
- **Reducible, not resolvable:** the second pass (Option B) sends **all** unknown spans of the note, with the roster, dossier and the statements proposed so far, and asks once whether anything there is worth keeping. A new proposal goes through the same pipeline and thresholds and becomes extracted (or excluded by a rule, with a reason). Spans that return nothing stay **unknown**; the record notes `checked: true` for them so the pass is not repeated, and nothing is said to the user. On S9 the pass would most likely have kept the bike (P7 shows the fact is keepable in isolation), but that is an expectation, not a guarantee, and the metric for it (§11) is reported, not gated.
- **Omissions inside an extracted span** (the marathon conflation) are outside coverage entirely. They belong to the extraction quality evals and the user's correction path, as today.

The honest user-facing consequence is small and already in the product's voice: Kinship says what it kept and never that it understood everything. The only new words are for unprocessed text.

---

## 5. Durable processing and atomic finalisation

### 5.1 What has to hold

- **Exact Undo** is capture-scoped today: `undo` retracts the items the note alone created, then removes the note (`understanding.ts:364-375`). Any design must keep "undo the note" as one gesture that removes everything the note produced and restores what it superseded (`v2_restore_superseded`).
- **Provenance:** every item's sources are spans into the one preserved `captures.raw_text`; `memory_item_sources` rows are written with the item, once.
- **One review per capture:** `capture_reviews.capture_id` is the primary key (`M/20261004100000:137`); the held set, its `created_at` and the answer protocol assume one review row per note.
- **The claim** is per capture (`claim_capture_extraction`, 2-minute stale reclaim).
- **Crash recovery and deterministic retries:** an app close, a network drop or a gateway death at any point must leave a state from which the next pass continues without re-sending finished content, without duplicating writes, and without the user re-entering anything.
- **No server-side worker exists** (the plan's "worker retries ×3" was never built, `02` §2.8), and passes run only in the foreground on the phone.

### 5.2 The two architectures compared

| | **(i) Durable checkpoints, then one atomic write** | **(ii) Idempotent per-window commits** |
|---|---|---|
| Shape | Each bounded call (window, continuation, second pass) writes its **planned items** (post-pipeline, pre-write) to a `capture_windows` checkpoint row keyed `(capture_id, window_index)`; when every window is checkpointed, **one** `write_extraction_with_review` writes all items, all sources and the one review row in one transaction | Each window calls `write_extraction_with_review` for its own items at once, with `(capture_id, window_index)` as an idempotency key; the capture stays `partial` until the last window |
| Exact Undo | unchanged: one note, one write, one retraction set | still capture-scoped (all items source from the capture), **but** a note half-written at the time of Undo must retract the written half and discard checkpoints; and `v2_restore_superseded` must cope with supersessions made by window 1 that window 3 would have revised |
| Provenance | written once with the items | written once per window; fine |
| The review row | one, built from every window's held items, created at finalisation | the first window creates it; later windows must **append** to `items` and keep `created_at`; the phone's answer protocol (`answersFor`, `resolve_capture_review`) assumes the set it saw is the set that exists, so a window landing while the user answers is a race |
| Supersede / resolve within the note | the comparator runs at finalisation over the whole note's items in text order, against the dossier; deterministic | window 2's items are compared against items window 1 already wrote (they are in the dossier now), which is simpler for the model's context but makes the result depend on timing (was window 1 committed when window 2 ran?) |
| Partial visibility | none until finalisation: the user sees "Understanding · part 2 of 3", never a half note presented as kept | lines appear as windows land ("so far"), honest if the card says so; attractive, but the card then changes under the user several times |
| Crash recovery | checkpoints survive; the next pass runs the first missing window; finalisation is re-runnable (nothing written until it succeeds, and it is one transaction) | written windows survive; the next pass runs the first missing window; the idempotency key prevents double writes |
| Deterministic retry | yes, given the checkpoints: finalisation is a pure function of them; re-running a window replaces its checkpoint (model nondeterminism changes proposals, which is acceptable before finalisation and visible in the checkpoint's version) | re-running a window that already committed is a no-op by key; re-running one that did not is a fresh write; but the dossier window 2 sees now includes window 1's items, so the comparator's inputs differ between first run and retry |
| Schema | one new table (`capture_windows`, owner-only RLS like `capture_reviews`, content-bearing: planned items as JSON, same retention and purge as reviews); `captures.status += partial`; counts on `capture_processing` or on the capture | no new table; `captures.status += partial`; `write_extraction_with_review` gains an idempotency key and review-append semantics (a bigger SQL change) |
| Simplicity | one new table, no change to write semantics | no new table, three changed invariants (review append, Undo of a half note, comparator timing) |

**Recommendation: (i).** It leaves every existing write invariant alone, keeps Undo and the review exactly as they are, and makes the retry a function of stored state. The price is no partial lines on screen during a long note, which the Quiet Herbarium can afford: "Understanding · part 2 of 3" is honest and calm. If the founder wants partial lines, (ii) is the design and its three changed invariants are the brief's extra work.

### 5.3 The client-driven loop (recommended for Option B)

The phone drives one bounded call at a time; the server keeps the checkpoints:

1. `understand` with `input_ref` → the gateway plans the note's windows (sentence-aligned, §6), runs **window 0 only**, checkpoints its planned items, and replies `{ status: "processing", coverage, windows_total, windows_done: 1 }` or, for a note that fits one window, finalises and replies `extracted` as today.
2. The phone shows "Understanding · part 1 of 3", persists `windows_done` on the understanding row, and issues the next call `{ action: "continue", capture_id }` at once (not on the 30 s tick).
3. Each continue runs the next window, checkpoints, replies progress. After the last window, the second pass runs over the unknown spans, checkpoints, and finalisation writes everything in one transaction; the reply is `extracted` with the whole note's `saved`, `held`, `clarification`, `coverage`.
4. Every call is bounded to one batch (≈ 20–25 s of model time at the 19 Oct speed) and so fits under a client deadline of, say, 40 s with a server model timeout of 35 s (§6).

**App closed between calls:** nothing is lost; the next foreground pass sees `state: processing` with `windows_done` and calls `continue`. **App closed during a call:** the gateway finishes or times out on its own; its checkpoint lands or not; the next pass calls `continue`, which is idempotent: a window already checkpointed is skipped. **Gateway dies mid-window:** the phone gets a network error; the claim goes stale after 2 minutes (refreshed per window while alive); the next pass reclaims and re-runs that window only. **Network drops:** as today, "I'll understand this when you're online"; `continue` resumes. **Finalisation fails** (the one transaction errors): checkpoints stay; the next `continue` re-attempts finalisation only.

The claim's 2-minute stale window must be **refreshed per window** (a `claimed_at` touch) so a long note is not reclaimed while alive, and a `continue` on a note another device finalised returns `done` (the stored review) as the reopened path does today.

---

## 6. Timeouts, batching and recovery

### 6.1 Per-call limits (calibrated candidates)

| Limit | Candidate | Basis (`07`) |
|---|---|---|
| Output per proposal | ≈ 236 tokens | 18 calls, ± 5% |
| Model time | ≈ 1.75 s + 1.5 s per proposal | the fit; re-measure on the day |
| `BATCH_BOUND` proposals per call | **12** (≈ 20 s) | leaves margin under the server timeout below; the first draft's 12–15 narrowed to 12 |
| Server model timeout | **35 s** for a 12-proposal batch (replacing 45 s); SDK retry **0** for extraction (a retry of a 35 s call is the 90 s failure shape) | a timed-out batch is retried by the phone's `continue`, not by the SDK |
| Client deadline per call | **45 s** (replacing 30 s): server timeout + the gateway's own trips + margin | the inversion is the measured failure at 25 details |
| `WINDOW_SIZE` | 6–8 sentences, one sentence overlap | ≈ 1.5 details a sentence on the S-series; the first window's actual count corrects the plan (a window that returns > `BATCH_BOUND` proposals is split for the next note of that density; for this note the excess rolls into a continuation of the same window) |
| Second pass | one call, all unknown spans, ≈ 5–10 s | skipped when nothing is unknown |
| Calls per note | **derived: windows + continuations + 1 (check) + 1 (finalise, no model)**; a hard safety ceiling `CALLS_MAX = 2 × windows + 2` | not a fixed six |
| Quota | one unit per **note**, not per call | internal cost guarded by `CALLS_MAX` |

### 6.2 Truncation inside a batch

With the batch bound in the prompt (ask for at most N; "say that more remain") and the schema's `maxItems`, `max_tokens` is unreachable in normal operation (12 × 236 ≈ 2,800 tokens against 8,000). If it fires anyway, the tolerant parse keeps complete items, the rest of the window is unknown-to-be-continued, and the next `continue` covers it. No discard, no SDK retry.

### 6.3 Reconciling windows with the write limits

`write_extraction` bounds `p_items` to 8 (`M/20261016090000:200-201`); `capture_reviews.items` to 1–8; `resolve_capture_review`'s arrays to 8. In Option B the finalising write carries the **whole note**: S25 ≈ 25 items, S50 ≈ 50. The bounds become **per note**, sized to what the input limit can carry: at 5,000 code points and the densest measured story (two details a sentence, ~45 characters a sentence) the ceiling is about 220 proposals; a bound of **256** on each array is a safety net, not a cap, and a note that somehow exceeds it is `partial` with the excess unprocessed, never an error. Option A touches none of these (it writes at most 8 and reports the rest).

### 6.4 The held set and questions at scale

One review row still, with up to the per-note bound of held items; the phone groups questions by type and asks one at a time as today; `MAX_ANSWERS` follows the bound; a sensitive group is asked last. Unchanged protocol, larger arrays.

---

## 7. Run models

Times use the 19 Oct fit (`≈ 1.75 s + 1.5 s per proposal`), the local gateway overhead (≈ 60 ms per call; hosted will add network), and the client deadline of 45 s. "Elapsed" is the user's wall clock from Keep to the Kept card.

### 7.1 S25 (16 sentences, 25 proposals), Option B, happy path

| Step | What | Model | Elapsed |
|---|---|---|---|
| Keep | local save; "Understanding…" | — | 0.3 s |
| `understand` → window 0 (sentences 1–8, ~13 proposals → the 13th rolls to a continuation of window 0) | plan 2 windows; run w0; checkpoint 12 items; reply processing 1/2 | ≈ 20 s | ≈ 21 s |
| `continue` → w0 remainder + window 1 (sentences 8–16, ~13) | the gateway batches the roll-over with w1's first sentences; 12 proposals; checkpoint | ≈ 20 s | ≈ 42 s |
| `continue` → the last 1–2 proposals + second pass over unknown spans | ≈ 3 proposals + check | ≈ 8 s | ≈ 51 s |
| `continue` → finalise | one transaction; reply `extracted` (25 items, held ≈ 4–6, one review) | — | ≈ 52 s |
| Sync #2 and the card | as today | — | ≈ 54 s |

Four requests, each under 25 s of model time; the dock reads "Understanding · part 1 of 2", "part 2 of 2", "checking". Cost ≈ 25 × $0.0047 + 4 cache reads ≈ **$0.13**. Compare today: one 39 s call that the phone abandons at 30 s, 409 on retry, back-off, and 16 of 25 proposals dropped when it finally lands.

**Interrupted after window 0 (app closed):** `windows_done = 1`, checkpoint for w0 stored. Next foreground: `continue` runs w1; no re-send of sentences 1–8; elapsed from reopen ≈ 30 s. **Gateway dies during w1:** the phone sees a network error; w1's checkpoint absent; after the claim's 2-minute window (or at once if the claim was released on error), `continue` re-runs w1; w0 untouched. **Finalisation fails:** checkpoints for w0, w1, check all present; `continue` re-runs finalisation only.

### 7.2 S50 (44 sentences, ~50 proposals), Option B

| Step | Model | Elapsed |
|---|---|---|
| plan: 6 windows of 7–8 sentences (≈ 8 proposals each at S50's density of ~1.1 a sentence) | | |
| w0 … w5, one `continue` each | 6 × ≈ 14 s | ≈ 1 min 25 s |
| second pass over unknown spans | ≈ 8 s | ≈ 1 min 33 s |
| finalise (≈ 50 items, held ≈ 8–10, one review) | — | ≈ 1 min 35 s |

Eight requests; `CALLS_MAX = 14`; cost ≈ **$0.26**. The user sees "part 1 of 6" … "part 6 of 6" … "checking"; nothing is shown as kept until finalisation. Compare today: two 45 s model timeouts per attempt, six attempts over an hour, nothing kept, ≈ $1 spent.

**If the user keeps a second note during S50:** the understanding loop processes notes one at a time (`passOnce`), so the second waits; with `02` §6 #7 (bounded parallelism for different people) it would not. **If the user taps Undo during S50:** the capture is removed; checkpoints cascade-delete with it; any in-flight call's write finds no capture and does nothing (the claim's owner check already does this).

### 7.3 S25 under Option A (containment only)

One call, 39 s of model time; **the client deadline of 45 s now holds**; the pipeline keeps 8, returns the other 17 proposals' spans as `unprocessed`; the note is `partial`; the card says "Kept 8 things so far. Kinship couldn't get to all of it." with Try again; the Source view marks sentences 7–16. Try again re-runs the same single call (the claim allows it) and may keep a different eight; Option A does not continue. The honest recovery is the user re-telling the marked part, which the Source view makes one tap ("Tell the rest"). Cost ≈ $0.12 per attempt; no silent loss; no false completion.

---

## 8. Pipeline, reply and phone (condensed; unchanged from the first draft where not noted)

- **Sentence map** shared by gateway and phone (`_shared/extraction/sentences.ts`), used for windows and for the Source marks; **not** the unit of truth (§3).
- **Locator:** `near` hint from an optional `sentence_index` output field (a prompt and schema change, eval-gated) or from the previous span; normalisation with an offset map. Option B.
- **Batch bound in the prompt** (ask for at most N, in the note's order, say if more remain) with `maxItems` in the schema. Option B (Option A keeps the prompt).
- **Dropped-capacity spans in the reply** (`unprocessed`): Option A and B. The pipeline already has the proposals it drops; it returns their first quote's span.
- **Phone states:** `partial` (A and B) with Try again; `processing` with `windows_done` (B). Today ignores partial notes; their written items (B: none until finalisation; A: the eight kept) are real.
- **Copy (proposals):** card partial: "Kept 8 things so far. Kinship couldn't get to all of it." · Try again · Undo. Dock during B: "Understanding · part 2 of 3". Source: unprocessed mark "Couldn't get to this" with "Tell the rest" (A) / "Try again" (B). Nothing about unknown text.

---

## 9. Two independently reviewable options

### Option A · Containment: no silent loss, no false completion, the note kept and recoverable

**Scope:** (1) the pipeline returns the spans of proposals dropped for capacity, and the gateway marks the capture `partial` when any exist (one forward-only migration adding the status value; no new table); (2) the reply carries `coverage` with `unprocessed` spans; the `done` path returns `saved`; (3) the phone gains the `partial` state, the honest card heading, Source marks, "Tell the rest" and Try again, and `tell_lifecycle.outcome = partial`; (4) the client deadline rises above the server's and `busy` is a wait; (5) a `truncated` or timed-out first attempt shows `partial` with the note preserved instead of six silent retries (the retry schedule stays for `offline`); (6) the narrative fixtures and the two zero-tolerance metrics. **No prompt change, no model change, no continuation, no windows, no new content table, no change to tiers, thresholds, sensitivity, dates, merge or Undo.**

**Complexity:** small–medium. Gateway: ~40 lines (pipeline returns dropped spans; handler marks partial and shapes the reply). SQL: one migration, one status value, pgTAP for it. Client: the state, the card and Source copy, Try again, the timeout constant, the `busy` branch; the lifecycle and review tests. Evals: the fixture set and grader fields. One gateway deploy, one build.

**Regression surface:** `lifecycle.test.tsx`, `understanding.test.ts`, `reviewModel` tests, `pipeline.test.ts` (the `too_many_items` case gains an assertion that spans are returned), `handler.test.ts`, `performanceTelemetry.test.ts` (new bucket, still content-free), pgTAP (status), the K-series black-box suites (unchanged behaviour for ≤ 8 proposals, which they all are), `firstRun` and `fresh-install` (unchanged), plus a new `narratives.blackbox` for S9, S15 and S25 showing the partial card and marks. Risk: the `partial` status must not confuse Today's first-use / activation logic (`activated_at` is set when the first Tell becomes memory; a partial first Tell with eight kept lines does activate; fine) or the night prompt.

**Safe before the household dogfood?** Yes, in this assessment: for every note of eight or fewer proposals the behaviour is byte-for-byte the same; the change is additive honesty beyond that, plus the timeout fix, which only turns a failure into a wait. It needs its own PR with every tier reported and the founder's device pass on S9 and S15, and it does not touch B7–B9's files. It is **not** authorised by this brief.

### Option B · Full long-narrative extraction

**Scope:** everything in A, plus the batch bound in the prompt and schema, the tolerant parse and continuation, the client-driven window loop, `capture_windows` checkpoints and atomic finalisation, the per-note write bounds, the claim refresh, the second pass, the locator fix, the review structure (sections, grouped questions), the per-window progress copy, the B metrics and the S-trunc / S-timeout / S-resume suites.

**Complexity:** large: a prompt change with its eval gate; a new table and two or three SQL function revisions; a state machine on both sides; the review UX on an approved surface (founder decision); two to three weeks plus evidence tiers, as the first draft estimated, now with the window loop understood.

**Regression surface:** all of A's, plus the extraction evals in full (prompt change), the merge and semantic corpora (comparator across windows), the b3–b6 black-box suites (facets and residence through windows), Undo across checkpoints, the review sheet and answer protocol at larger held sets, Today's eligibility with `processing` notes, and the device pass on S25 and S50.

**Gated:** after B9, the employer evaluation and the household dogfood's reading; its own brief; the `05` §6 gate before story-first onboarding.

### What can be completed before the household dogfood, and what stays gated

| Before the household dogfood (on the founder's yes) | Gated behind B9 and the dogfood |
|---|---|
| Option A in full | Option B in full |
| the narrative fixture set and the two zero-tolerance metrics (A's) | the prompt change (batch bound, `sentence_index`) |
| the timeout inversion fix | continuation, windows, checkpoints |
| the span-level coverage record on the phone (A's subset: unprocessed) | the second pass |
| `01`'s story invitation held to two to four sentences | the review structure; story-first onboarding |

---

## 10. The existing contract, preserved

Nothing in either option changes: `AUTO_SAVE_CONFIDENCE`, `HOLD_FLOOR_CONFIDENCE` or any drop threshold; the evidence rule (a span is a verbatim substring of the note); `resolvePerson`, the K4 name rule, the two-candidates-ask rule, K25's Contacts path; sensitivity classes always held; the date resolver and "precision never raised"; the comparator's SAME / REFINES / SUPERSEDES / CONFLICT / NEW order and "never across subjects, never upgrade certainty, never silently change a protected item"; the capture-scoped exact Undo and `v2_restore_superseded`; "no user content in logs or analytics"; the Quiet Herbarium's refusal to count what is missing. **B7 → B8 → B9 → employer evaluation → household dogfood** is untouched: Option A touches none of their files and is scheduled beside them only on the founder's decision; Option B waits behind them. **CC-28's boundaries** are untouched: this brief adds no action, surface, partner or suggestion; its only new copy is about unprocessed text.

---

## 11. Evidence plan (revised)

**Fixtures.** `evals/extraction/fixtures/narratives.jsonl`: S5, S8, S9, S15, S25, S50, S-filler and the eight probes P1–P8, with `exhaustive: true` and `expect.coverage: [{start, end, cat}]` at the **span** level (the grader gains the field; `fixture.ts:110`, `grade.ts:284`). Frozen as `extraction-v2.10`; the `EXTRACTION_EVAL_VERSION` constant brought back in step.

**Metrics (added; existing ones unchanged and never lowered).** For A and B: `capacity_loss = 0` (no `too_many_items` without a `partial` state and returned spans) · `unreported_unprocessed = 0` · `false_completion = 0` (no `extracted`/complete reply when any proposal was dropped for capacity or any call failed). For B additionally: `coverage_consistency = 1.0` (no span in two categories) · `cross_window_duplicates = 0` · `truncation_recovered = 1.0` · `resume_without_rerun = 1.0` · `within_note_supersession` reported · `second_pass_recall` reported (how often a known omission, like the bike, is recovered; **reported, not gated**, because omissions are undeterminable in general) · `narrative_item_recall` reported separately.

**Tiers.**

| Tier | Option A | Option B (additional) |
|---|---|---|
| UNIT | pipeline returns dropped spans; handler marks partial; reply shape; client state machine; copy; timeout constants; the `busy` branch | sentence map on both platforms; tolerant parse at every cut point; locator with `near` and normalisation; checkpoint keying; the window planner; the second-pass input builder |
| INTEGRATION | Deno handler tests; pgTAP for the status value | pgTAP for `capture_windows`, RLS, cascade on capture delete, the claim refresh, finalisation idempotency, per-note array bounds |
| BLACK-BOX | `narratives.blackbox`: S9, S15, S25 through the real screens with replayed replies: the partial card, the marks, Try again, Tell the rest; K-series suites unchanged | S-trunc (stub returns a cut reply), S-timeout (client deadline lowered), **S-resume** (gateway stopped after window 1, restarted; app "closed" between calls by unmounting; finalisation failure injected), S50 end to end, Undo mid-note |
| LIVE-MODEL | the narrative set live, graded by the A metrics; the frozen corpus replayed (no prompt change) | the narrative set live with the B metrics; the full corpus **live** (prompt change) with thresholds unchanged |
| NATIVE-SIMULATOR | S9 and S15 on the simulator with the live model and the founder's exact People; timing recorded | S25 and S50; elapsed and per-call times |
| FOUNDER-DEVICE | S9 and S15 told on the phone: the partial card, the marks, Tell the rest; Try again | S25: parts, the card's sections, the Source view; the `05` §6 gate |

**Rollout, each step on the founder's go:** A: branch from `main`, PR with all tiers, merge (merge commit), the migration by merge, gateway deploy, build, device pass. B: its own brief after B9; the same steps.

---

## 12. Unresolved architectural risks

1. **Model nondeterminism across a retry of one window** changes that window's proposals; finalisation is deterministic from checkpoints, but the note's final content can differ between a run that was interrupted and one that was not. Acceptable (the user sees one coherent result), but it means "deterministic retry" is about the write, not the model.
2. **The comparator across windows** has no measured evidence yet: the calibration's residence sequence was pre-merged by the model into one line, so within-note supersession was never exercised. S-series fixtures must be rewritten to force it (two sentences, far apart, no connective).
3. **The hosted edge runtime's own request limits** were not checked for a 35 s model call plus trips; the branch gateway ran locally. Verify the platform's current wall-clock limit before setting the server timeout.
4. **Conflation inside a covered span** (the marathon line) is invisible to coverage and to the user unless they read the Source; only the quality evals catch it. Story-shaped fixtures should include it.
5. **A window that proposes far more than the batch bound** (a very dense paragraph) rolls its excess into continuations; the plan's window count is then wrong and the dock's "part n of m" must be allowed to grow. Copy must not promise a fixed m.
6. **Second-pass over-proposal:** asked "is there anything else worth keeping?", the model may propose weak items from filler. The same thresholds apply, but `excluded` counts would rise and the Source view's on-tap reasons would appear on filler. Measure before deciding whether the pass runs on every note or only when the note is long.
7. **Option A's "Tell the rest"** creates a second note whose dossier now includes the first eight lines; the comparator handles merges, but the user may see "Does this replace one of these?" questions for things they are telling for the first time. Needs a black-box case.
8. **Partial first Tell and activation:** a first Tell that ends `partial` with eight lines kept activates the account; the H4 bring-back then runs on a note the user knows is unfinished. Decide whether the bring-back waits for completion (recommended) or not.

---

## 13. Founder decisions asked for (registered as `04` §9 D9a–D9g)

| | Decision | Recommendation |
|---|---|---|
| D9a | Adopt the gate: no silent capacity-based loss and no false completion before story-first onboarding; hold the invitation to two to four sentences until then | Adopt |
| D9b | Option A: commission its implementation PR before the household dogfood (one gateway deploy, one one-value migration, a build, a device pass) or hold it | Commission |
| D9c | Option B: approve the architecture direction (client-driven windows; checkpoints then one atomic write; second pass over all unknown text) and gate the build behind B9, the employer evaluation and the dogfood, with its own brief | Approve the direction; defer the build |
| D9d | The coverage model: span-level positive accounting with an explicit unknown; the card's strongest claim is "Kept N things" | Accept |
| D9e | Omissions: no lexicon floor; the second pass over all unknown text; its result never "excluded" | Accept |
| D9f | Deadlines: client above server; server sized to one batch; `busy` is a wait; SDK retry off for extraction | Accept, in Option A |
| D9g | Evidence plan: the narrative fixture set with span-level expectations; S-trunc, S-timeout and S-resume on Option A's branch where applicable, the rest with B | Accept |

Nothing here is started by this document.
