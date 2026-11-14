# 02 · Capture architecture and the Tell latency audit

*Read-only audit of `main` `9ad5e6d`, 18 Oct 2026. Every claim about the code carries a file and line; durations marked "doc" come from the recorded measurements listed in §3, "harness" from the phone-like black-box profile, "inferred" from reading the code with no measurement. Nothing was run against production or the founder's account. No code was changed.*

## 1. Summary

- **The model is the floor, not the overhead.** Recorded model time is p50 2.7–3.2 s, p90 4.4 s, p95 5.8 s, max ~10–11 s in production samples, and median 6.1 s in the 13 Oct live harness (§3). Nothing on the phone or the server can bring a Tell under that.
- **Around the model there are still three structural waits the user watches**: (1) a full sync pass *before* the gateway call (a sequential push plus a ten-table pull), (2) ten to fourteen sequential server round trips before and after the one model call, and (3) a *second* full sync pass *after* the reply, which the Kept card must wait for because the reply carries only ids. K12 cut the sync passes from 21 sequential requests to one round trip each, which is why 10.4 s became 2.5 s in the harness; it did not remove the passes.
- **Captures are serialised on the phone.** The understanding loop processes due notes one at a time, each awaiting the gateway, and a second Tell during a pass runs in the loop's next iteration after the first note's second sync. The user *can* type and keep a second note while the first is understood (the UI allows it), but the second note's wait starts only when the first has finished. The server would process them in parallel; the client never sends them in parallel.
- **The instrumentation to answer "how slow is it on the phone today" exists and has not been read** since the K12 fix. `tell_lifecycle` carries every stage in buckets, content-free, in the `dogfood-v2` build. The recommended next work is a native benchmark, not an optimisation; **neither the benchmark's production read nor any optimisation is authorised by this document** (`04` §9 D1, D7).
- **No number in this audit is a reliable p95.** The only p95 on record (5.8 s) is the model alone on the 400-fixture eval corpus, not the app path; the production samples are 51 and 38 calls with p90, the live harness is 12 calls, and the device observations are one or two Tells each. §3 separates what each sample can and cannot say.
- **Clarification costs one more gateway round trip and one more sync pass per answer**, and sometimes a third (`close_review`), each on the same pass machinery. There is no model call in the answer path.
- **The timeouts disagree**: the client gives up at 30 s, the server allows the model 45 s with one SDK retry. A slow but successful model call can become a client "timeout", then a 409 `busy` on the retry, then back-off. Rare, but it is the shape of "nothing happened for 30 s" (G4, G11).

The safe optimisations (§6) are ordered by what they remove from the waterfall, what they risk, and whether they need the model, the schema or the gateway touched. None lowers a trust gate.

---

## 2. The capture architecture as it is

### 2.1 Entry points

| Where | Code | Context person |
|---|---|---|
| Today / People dock | `src/features/tell/TellDock.tsx:348-362` | the person "Anything worth remembering?" asked about, else none |
| A person's page sheet | `src/features/tell/TellSheet.tsx:38-50` | that person |
| First Tell in setup | `src/features/setup/SetupScreen.tsx:210-220` | **none** (`source: "onboarding"`) |

All three call `TellFlow.keep` (`src/features/tell/TellFlow.tsx:244-261`): the tap time is noted, the note is written locally, then the current card becomes the new note. Each entry has a `sending` guard against a double tap, nothing more; a second note can be kept while the first is being understood.

### 2.2 Local persistence

`useTell.keep` (`src/hooks/useV2.ts:52-72`) → `CaptureRepo.tell` (`src/store/repositories.ts:271-286`: NFC, ≤ 5000 code points, `status: pending`) → one SQLCipher transaction that inserts the mirror row and the outbox op (`src/store/userStore.ts:116-144`) → an `understanding` row (`src/store/understanding.ts:238-246`) → `understanding.run()` fire-and-forget.

Every read and write in the app goes through one serial promise queue on one keyed connection (`src/store/expoPlatform.ts:74-104`). That matters later: hook re-reads and sync writes interleave on it.

"Understanding…" appears when the dock's `useReview` re-reads after these notifies (`useV2.ts:103-129`; `reviewModel.ts:209-212`). Its delay from the tap is `understanding_bucket`.

### 2.3 Transport: pulls on a pass, no realtime

There is no realtime subscription anywhere in the app. Everything arrives by a **pass** of `Understanding.run` (`understanding.ts:585-601`), single-flight; a call during a pass sets `again` and the loop runs once more. A pass (`passOnce`, `:619-647`):

1. `discover()`: lists all captures (`:690-696`).
2. **Sync #1** (`SyncEngine.cycle`, `src/store/syncEngine.ts:78-117`): push every outbox op as one HTTPS request each, sequentially (`:121-126`); then pull all ten tables in parallel (`:93`, the K12 fix) with a five-minute overlap window and apply them in order; a reconcile (ten sequential paginations) on the first sync of a day per table.
3. If offline, stop. Else `finishLeftOpen`, one `semantic_report` call per process (B6; not awaited), `reportChanged` (re-reads the whole outbox).
4. For each due note, **in order, each awaited**: `understandNote`, or `deliverAnswer`, or `deliverClose` (`:630-640`). One unreachable gateway breaks the loop for every later note.
5. **Sync #2** only if something was written (`:641-645`), then `afterPull`, then `notify`.

Passes run at session start, on every foreground, on a **30-second interval while active** (`src/providers/V2SessionProvider.tsx:75-91`) and on every `kick()` from a user action. Nothing runs in the background; `appPresence.ts` only counts background trips for telemetry.

`understandNote` returns early while the capture's own insert is still in the outbox (`understanding.ts:734-736`): the note cannot be understood until its row has been pushed.

### 2.4 The gateway request

The client sends only `{capability: "relationship_extract", input_ref: {capture_id}}` (`src/store/gateway.ts:198`) with a 30 s timeout (`:288`). The gateway reads the note from the database, so the note's text travels once (in the push) and the request is small.

### 2.5 Server processing (`supabase/functions/ai-gateway/handler.ts:221-342`, I/O in `index.ts`)

In order, each awaited unless marked ∥:

| # | Step | Round trips |
|---|---|---|
| 1 | Auth `getUser(token)` (`index.ts:47-54`) | 1 (Supabase Auth) |
| 2 | consent check (`handler.ts:251`) | 1 |
| 3 | flag via `my_flags` RPC (`:259`) | 1 |
| 4 | load capture (`:262`) | 1 |
| 5 | `claim_capture_extraction` RPC (`:265`; stale claims reclaimable after 2 min) | 1 |
| 6 | `consume_ai_call` RPC (daily limit 50) (`:280`) | 1 |
| 7 | people, related, mentions (`index.ts:79-90`) | 1 (3 ∥) |
| 8 | dossier items for ≤ 3 people, ≤ 40 items (`handler.ts:287`; `context.ts:164-174`) | 1 |
| 9 | facets for those items (`:290`) | 1 |
| 10 | the residence safety net: `loadUnread` re-queries facets for the same ids; rereads if any are tombstoned (`:294-298`) | 1 (+2 ∥ +1 when rereads) |
| 11 | `buildInput`: roster ≤ 30, dossier ≤ 3 people / ≤ 40 items (`context.ts:176-253`) | CPU |
| 12 | **one model call**, non-streaming, structured output, system prompt cached, 45 s timeout, SDK `maxRetries: 1` (`model.ts:35-79`; `registry.ts:40-54`; `index.ts:38`) | the model |
| 13 | `planExtraction` (`pipeline.ts:96-141`): deterministic, ≤ 8 items, tiers | CPU |
| 14 | `write_extraction_with_review` RPC, one transaction (`handler.ts:320`) | 1 |
| 15 | `ai_calls` insert (`:329`) | 1 |
| 16 | `loadReview` to fetch `created_at` when something is held (`:331`) | 1 |

About 12–14 sequential round trips plus the model. The edge function also parses a 2.8 MB place dataset at module init (`index.ts:43`; `semantic/places/dataset.ts:12`), which lands on every cold start (inferred, unmeasured).

**The prompt** is `relationship_extract/v6`: a ~6.5 KB system prompt (cached) plus the note, the roster and the dossier. Its size scales with the dossier, bounded by the limits above. Token counts are recorded per call in `ai_calls` (`input_tokens`, `cache_read_tokens`) but were not aggregated for this audit (no production query).

### 2.6 Back on the phone

The reply carries ids and held items, not rows (`handler.ts:333-342`). The rows arrive with **sync #2**. Until they do, `arriving()` counts the ids not yet on the phone (`understanding.ts:227-233`) and the review stays in `understanding` mode with the "arriving" copy (`reviewModel.ts:257`). **So the Kept card cannot appear before sync #2 has pulled and applied ten tables.**

Then: every `store.notify()` re-runs every mounted `useStoreQuery` immediately, with no debounce (`src/hooks/useStoreQuery.ts:22-50`). On the happy path one Tell produces roughly nine or ten notifies (create, told, sync #1, three saves in `understandNote`, sync #2, pass end, `markShown`, `opened`), each re-reading `useReview`, `useToday` (reasons, people, all items, all captures, sources, contact events) and, on a page, `usePortrait`, all on the one serial SQLite queue. The K14 fix moved one such rebuild off the critical path for removals; the rest remain.

### 2.7 Clarification and review

Held items live server-side in `capture_reviews`; the sheet submits only when every question has an answer (`ReviewSheet.tsx:82-86`; `reviewModel.ts:268-293`). An answer is `state: answering` + `kick()` → a pass: sync #1 → **one gateway call** (`resolve_review`, no model) → sync #2. A Done while the server still waits makes a `closing` state → **another gateway call** (`close_review`) on a later pass plus a sync. A `review_changed` notice triggers one more `understand` call that returns `done` without a model run. The server's answer path repeats auth, consent, flag, capture, review, people and items reads before the `resolve_capture_review` RPC (`handler.ts:502-584`).

**So a note that asks one question costs:** pass 1 (sync, model, sync) + the user's answer + pass 2 (sync, resolve, sync), and possibly pass 3 (close). Three to five syncs and two to three gateway calls for one memory.

### 2.8 Retries, offline, timeouts

- Client gateway timeout 30 s (`gateway.ts:288`); server model timeout 45 s with one SDK retry (`registry.ts:49`; `index.ts:38`). **Mismatch** (§1).
- Back-off `[15 s, 60 s, 180 s, 600 s, 1800 s, 3600 s]`, six attempts, then `failed` (`understanding.ts:130, :171`). But a pass only runs on a kick, a foreground or the 30 s tick, so the effective first retry is the tick, not 15 s.
- A 409 `busy` (the server still holds the claim) is treated as a failed attempt (`:807-808`).
- Offline: `offline = true`, nothing scheduled beyond the next pass (`:636-639`). The note stays "I'll understand this when you're online." (honest).
- The plan's "worker retries ×3 with backoff" (`KINSHIP_2_COMPLETE_PLAN.md:459`) has no implementation: there is no server-side worker.

### 2.9 Flags on this path

`tell` gates the dock; `ai_extraction` and consent gate the client and are re-checked on the server (`useV2.ts:59, :71`; `handler.ts:251, :259`). Flags are refetched on every foreground with a 4 s timeout (`useFlags.ts:113-116`; `flags.ts:46`). Nothing else is flagged on the capture path.

---

## 3. The latency record (doc), reconciled

| Date | What | Numbers | Conditions | Source |
|---|---|---|---|---|
| 4–5 Oct | eval run, prompt v5 → v6 candidate | model p50 2.7 s, p95 5.8 s | live eval, not the app | `stabilization-pass-summary.md:98`; `founder-native-feedback.md` H8 |
| 5–6 Oct | production `ai_calls` | v5: p50 3.7 / p90 6.1 / max 11.3 s (38 calls) · v6: p50 3.2 / p90 4.4 / max 9.9 s (51 calls) | model only | `core-trust-closure-report.md:173-176` |
| 7 Oct | one founder Tell (G1) | model 4.3 s; "roughly 5–7 s end to end" | one call; app time estimated | `founder-native-feedback.md` G1 |
| 7 Oct | G2 | "About 8 s from adding a fact to seeing it" (model 5.9 s) | founder phone | `founder-native-feedback.md` G2 |
| 13 Oct | K12, founder phone | ~25 s Tell → Today | before K12; K20's merge bug also in play | `bug-ledger.md:271` |
| 13 Oct | K12, phone-like harness | 10.4 s app+sync with no model time (21 sequential requests) → **2.5 s** after the fix | 3 ms/statement, 250 ms/RTT, 160 earlier lines, replayed model | `bug-ledger.md:271`; `k-series-postmortem.md:150` |
| 13 Oct | live model through the harness | 5.1–7.9 s, median 6.1 s (12 calls) | live | `k-series-postmortem.md:160` |
| 13 Oct | prediction after K12 | "roughly the model's time plus 2–3 s" on device | never read back | `bug-ledger.md:271` |
| plan | target | p50 3 s / p95 7 s | | `KINSHIP_2_COMPLETE_PLAN.md:459`; `interaction-motion-audit.md:104` |

**What each sample can say.** These are not one dataset, and only one of them is large enough to call a tail statistic:

| Sample | n | What it measures | What it can support | What it cannot support |
|---|---|---|---|---|
| Eval run, v6 candidate (4–6 Oct) | 400 fixtures | the model alone, on short fixture notes, from a CI runner | a model-only p50 and **a model-only p95 (5.8 s) on fixture-shaped notes** | anything about the app, the network, long notes, or production dossiers |
| Production `ai_calls`, v6 (6 Oct) | 51 calls | the model alone, real notes, real dossiers | a model-only p50 (3.2 s) and a rough p90 (4.4 s) | a p95 (at n=51 the 95th percentile is the 3rd slowest call; one outlier moves it by seconds) |
| Production `ai_calls`, v5 (5 Oct) | 38 calls | as above, older prompt | a p50; the max (11.3 s) as an existence proof of a long tail | a p90 or p95 |
| Live harness (13 Oct) | 12 calls | the model through the local gateway | a median (6.1 s) and a range (5.1–7.9 s) | any percentile; even the median is fragile |
| Phone-like harness, K12 (13 Oct) | a handful of runs | app + sync with the model replayed (0 s) | the structural before/after (10.4 → 2.5 s) | device time; it is a model of a phone (3 ms a statement, 250 ms a round trip) |
| Founder device, G1/G2/K12 (7 and 13 Oct) | 1–2 Tells each | end to end, one note | an existence proof ("about 8 s"; "~25 s before K12") | a central tendency, let alone a tail |

**A measured addition (19 Oct, `07`): model time is output-bound.** On the local stack with the live model, 18 calls over synthetic stories of 4–25 details fitted `model ≈ 1.75 s + 6.4 ms × output tokens`, with each proposed memory costing ≈ 236 tokens, i.e. **≈ 1.5 s per memory told**: 5 details ≈ 9 s, 8 ≈ 13 s, 15 ≈ 22 s, 25 ≈ 39 s, on that day's API speed (n = 3 per story). The recorded production p50 of 3.2 s is the one- or two-item case on that fit. "The model is the floor" therefore reads: the floor rises with the number of things in the note, and a story's wait is mostly the model writing its reply. The gateway's own trips cost 47–70 ms beyond the model on the local stack.

**Estimate, not measurement.** On the current code, a short note from a mature account on a good network should be about: model (p50 roughly 3–6 s across the samples above) + two sync passes and the gateway's own round trips (harness: ~2.5 s; device: unknown, plausibly 2–4 s) + re-read storms (device: unknown; the K14 case was 0.7 s for one rebuild with 80 lines) ≈ **6–12 s to the Kept card**. That bracket is consistent with G1/G2 and with "model + 2–3 s". **There is no device measurement after K12**, and the postmortem's own words still stand for the client side: "Latency: never measured. Every test uses instant stand-ins" (`k-series-postmortem.md:36`). A device p95 needs on the order of 40–60 Tells across the §5.3 matrix before the 95th percentile stops being one or two Tells; the benchmark below is sized for a p50 and a tail *shape*, not a p95 to three figures.

Against the brief's provisional targets, as hypotheses to be tested, not conclusions: **< 0.5 s to acknowledge** is very likely met today ("Understanding…" paints after five local statements; `understanding_bucket` would confirm). **< 5 s median Tell → understood** looks unreachable while the model's own median sits at 3–6 s and two sync passes wrap it; a realistic median target after the structural fixes below is **model + ~1 s**, i.e. about 4–7 s. **< 10 s p95** is plausible after the fixes *if* the model's tail on real notes resembles the eval corpus's, which the production samples are too small to confirm; it is not plausible today when a cold edge start or a reconcile lands on the path.

---

## 4. The waterfall, with what each stage is waiting on

```
tap Keep
│ ~10–20 ms   local tx (capture + outbox + understanding row)            seq, SQL queue
│ <0.5 s      "Understanding…" paints (hook re-read)                     ← understanding_bucket
│
│ sync #1     push capture (1 RTT) · pull 10 tables ∥ (1 RTT) · apply    ← sync_bucket
│             [+ reconcile: 10 sequential RTT, first sync of the day]
│
│ gateway     HTTPS to edge (cold start: 2.8 MB place index, inferred)   ← gateway_bucket
│   server    auth 1 · consent 1 · flag 1 · capture 1 · claim 1 ·        ← server_bucket (one total)
│             quota 1 · people (3∥) 1 · items 1 · facets 1 · unread 1
│             MODEL  p50 3–6 s · p95 ~6 s · max ~10 s · 45 s timeout
│             plan (CPU) · write RPC 1 · ai_calls 1 · [loadReview 1]
│   network   trip − server                                              ← network_bucket
│
│ 3 local saves + notifies (each a full hook re-read)
│
│ sync #2     push (idle) · pull 10 tables ∥ · apply                     (inside gateway/render gap)
│ afterPull · notify
│
│ re-reads    useReview + useToday + usePortrait rebuild from full reads ← render_bucket
│ card paints · markShown (tell_lifecycle) · opened (2 more notifies)
│
└ Today / Portrait recompute on every notify; server reasons refresh ≤ every 10 min
```

**Sequential dependencies that are real:** the capture must be pushed before the gateway can read it; the model needs the dossier; the write must commit before ids return. **Sequential dependencies that are not:** the ten-table pull before the gateway call (the push alone is needed); auth → consent → flag → capture → claim → quota as six separate trips; the second pull as the only way to get rows the server just wrote; three separate saves and notifies for one reply; a facets query followed by an unread query over the same ids; a `loadReview` only to read a timestamp.

**Where the perceived wait comes from, ranked (inferred from the structure; to be confirmed by the benchmark):**

1. The model: 3–6 s, every Tell. Irreducible without a model change (which needs an eval).
2. Sync #2 before the card: ~1 RTT + ten applies + re-reads. Removable.
3. Sync #1 before the call: ~1–2 RTT (more on a reconcile day). Mostly removable (push-only).
4. Server pre-model trips: 10 sequential RTT inside one region, probably 0.2–0.6 s in total (inferred). Compressible.
5. Re-read storms: ~9–10 full rebuilds on one SQL queue; the cost grows with the account (K14 measured 0.7 s for one rebuild with 80 lines). Compressible.
6. Cold edge start: unmeasured; plausibly seconds on the first Tell of a session.
7. The 30 s tick as the retry floor when anything fails once.

What is **not** on the list: the prompt is small and cached; there is exactly one model call; dossier retrieval is bounded (≤ 3 people, ≤ 40 items); serialisation is JSON once each way. Multiple individual Tell submissions are a *product* cost (§7), not a per-request one.

---

## 5. Instrumentation: what exists, what is missing, and the benchmark

### 5.1 Exists

- **Phone:** `tell_lifecycle` once per Tell at `markShown` (`understanding.ts:286-299`; `analytics.ts:112-138`): `outcome`, `total_bucket`, `sync_bucket`, `gateway_bucket`, `server_bucket` (from `Server-Timing`), `network_bucket`, `render_bucket`, `retries`, `understanding_bucket`, `backgrounded`, plus coarse `app_version` / `build` / `platform` / `os_version`. `tell_failure` per failed attempt (`stage`, `attempt`, `backgrounded`). `app_stall` for a blocked JS thread ≥ 1 s with `tell_work`. Buckets only: <0.5 · 0.5–1 · 1–2 · 2–3 · 3–5 · 5–8 · 8–13 · 13–20 · 20–60 s … Per note, the raw timestamps are persisted locally (`schema.ts:72-101`: `created_at, first_request_at, request_at, understood_at, shown_at, seen_at, server_ms, retries, attempts`). Sent only in the `dogfood-v2` build under the `performance` scope (CC-17/18; `docs/ops/analytics.md`).
- **Server:** `Server-Timing: total;dur=` on every reply; `ai_calls` per model call with `latency_ms` (model only), tokens including cache reads, outcome, tier, counts. Content-free: **no capture or user id, so it cannot be joined to a phone event.**
- **Harness:** the phone-like profile (`e2e/blackbox/removal.blackbox.tsx:53-57`; `localStack.ts:44-69`), a request log, a stage timeline from the understanding row, replay or live model (`e2e/model-stub.ts` records each reply's `latency_ms`).

### 5.2 Missing

1. A split of `sync_bucket` into push and pull, and the duration of sync #2 on its own (today it is hidden inside the gap between `understood_at` and `shown_at`).
2. Server sub-spans: auth, guards, dossier, model, write. One `total` cannot say where the server's time goes. `Server-Timing` allows several entries; they would carry numbers only.
3. A content-free correlation id on both the phone's `tell_lifecycle` and the `ai_calls` row (an opaque per-request token, never a capture id), so model time can be subtracted from server time per Tell.
4. Timing of the answer and close round trips (`resolve_review`, `close_review`): the understanding row's stage columns cover only the last `understand` request.
5. The cost of hook re-reads and the Today / portrait recompute (no timer around `useStoreQuery` reads).
6. An edge cold-start marker (a boolean "first request since module init").
7. Raw milliseconds for the benchmark runs. Buckets are right for ongoing telemetry; for a one-off benchmark the local columns can be read from the phone's own store in a dev build, or the bucket width accepted.

None of these carries content; all fit the F0-D4 rules as they stand.

### 5.3 The native benchmark (proposal; nothing here has been run)

**Precondition:** the founder's yes to read the performance events for their own account's install, which is already covered by CC-17/18 (performance-only telemetry in the dogfood build) but is re-stated per the standing rule that any query over a specific account needs the founder's yes for that account id. Alternative that needs no production read: the same matrix on the simulator with the live model and the founder's exact People (the 14 Oct testing rule), which measures everything except the real phone and the real network.

| Dimension | Cases |
|---|---|
| Note shape | short single fact ("Maya starts Monday.") · multi-fact story (the Matt note) · one person vs two people in one note ("Anthony and Sam love ice skating with Chris") |
| Account | fresh (0 people) · mature (the founder's roster, 100+ lines) |
| Dossier | new person vs a person with 20+ lines |
| Network | Wi-Fi · LTE · the simulator's Network Link Conditioner "3G" profile (simulator tier only) |
| App state | foreground throughout · backgrounded between Keep and the card |
| Outcome | auto-kept · look-over sheet · a question, with its answer timed as a second Tell |
| Edge state | first Tell of a session (cold) · immediately following Tell (warm) |

Twelve to twenty Tells, each read as `tell_lifecycle` (total, sync, gateway, server, network, render, understanding) and, for the simulator runs, the harness timeline with raw milliseconds. Output: a table per dimension, p50 and p95 over the set, and the three stages that dominate. **Content-free by construction:** the notes are the harness fixtures or the founder's own words on their own phone, never copied into the report.

**Acceptance for calling an optimisation worthwhile:** it removes a stage the benchmark shows ≥ 1 s at p50 or ≥ 2 s at p95, it changes no trust gate, and the same benchmark re-run shows the gain. A change that cannot be seen in `tell_lifecycle` is not an optimisation of the user's wait.

---

## 6. Candidate improvements, assessed

Ordered by expected gain per risk. "Gate" lists the trust requirements each must prove it leaves unchanged (wrong-person, hallucination, sensitivity, dates, merge/supersession, provenance, exact Undo), by the existing suites.

**What this section is and is not.** It is an inventory of candidates with their dependencies and risks, so a brief can be written. It is **not** a plan to ship. Any bundle drawn from it requires, in order: (1) the native benchmark in §5.3 run first, so the stage it removes is known to exist on a device; (2) its own technical brief for the founder naming the candidates, the gateway deploy if any, and the evidence tiers it will produce; (3) trust regression evidence before merge: the Jest, Deno and pgTAP suites, every black-box suite, the K12 sync assertions, and a new two-notes-in-flight case (§9), with FOUNDER-DEVICE before anything is called VERIFIED; and (4) the founder's authorisation (`04` §9 D7). The K12 precedent (reliability work interrupting the roadmap) was itself a founder direction on 15 Oct, not a standing permission.

| # | Candidate | What it removes | Dependencies and cost | Risk | Gate |
|---|---|---|---|---|---|
| 1 | **Return the written rows in the gateway reply, and apply them locally** (or pull only `memory_items`, `memory_item_sources`, `captures`, `capture_reviews` after an understand) | sync #2's ten-table pull before the card: ~1 RTT + applies + a re-read storm | Gateway reply shape + the client's apply path (the sync engine's `applyChanges` can take rows from any source). Medium. Already proposed as G1 (2b) on 7 Oct | Rows applied twice (reply, then the next pull) must be idempotent by version: the mirror already skips known versions (K12) | sync.test, black-box replay; provenance unchanged |
| 2 | **Push-only before the gateway call** (sync #1 pushes the capture; the full pull waits for after) | sync #1's pull: ~1 RTT + applies; a reconcile day's ten sequential trips move off the path | Sync engine: a `push()` entry point. Small. | A note answered on another phone would be seen one pass later (it already is) | sync.test |
| 3 | **Coalesce the three saves and notifies in `understandNote`, and debounce `notify()` to a microtask** | 2–3 of the ~10 re-read storms per Tell; the K14 class of waits on big accounts | Store: small. Hooks unchanged. | A notify that merges two changes must not drop one; `useStoreQuery`'s generation guard already handles stale reads | lifecycle.test, removal.blackbox phone-like |
| 4 | **Collapse the server's pre-model trips into one RPC** (consent, flag, capture, claim, quota) and drop `loadUnread` and `loadReview` (select `deleted_at` with the facets; return `created_at` from the write) | ~7 of 12–14 sequential server trips | Gateway + one SQL function. Medium; a deploy. | None to trust; the claim must stay atomic | pgTAP for the new function; black-box suites |
| 5 | **Align timeouts and treat 409 `busy` as "wait", not "failed"** (client ≥ server + margin, or server ≤ client; and on `busy`, poll the claim instead of counting an attempt) | the 30 s "nothing happened" failure shape (G4/G11) | Two constants and one branch. Small. | A genuinely stuck claim must still release at 2 min | gateway.test |
| 6 | **Timer to `next_at` instead of the 30 s tick as the retry floor** | up to 15 s off a first retry | Provider: small. | Battery: one timer, foreground only | lifecycle.test |
| 7 | **Several notes in flight: send due notes in parallel (bounded, say 3)** rather than one at a time | the serialisation of a second Tell behind the first | `passOnce`'s loop; the server already claims per capture. Small–medium. | Ordering: two notes about the same person must not race the merge/supersede rules. **The server's claim is per capture, not per person; two notes about Susan in parallel can each see a dossier without the other.** Bound parallelism to notes about different people, or keep same-person notes sequential | merge.jsonl evals; k20 (told-again) black-box; a new test for two same-person notes |
| 8 | **Sub-span `Server-Timing` and a correlation token** | nothing from the wait; it makes the rest measurable | Gateway + analytics schema (numbers only). Small. | None | performanceTelemetry.test (no content) |
| 9 | **Memoise Today and portrait inputs per store generation** | the Today/portrait recompute on every notify (grows with the account) | Hooks: medium (a snapshot keyed on the mirror's max version). | Stale reads if the key is wrong; K13/K20 taught that Today must recompute on foreground and after sync | today.blackbox, returnStates |
| 10 | **Warm or shrink the edge cold start** (lazy place index, or a smaller index) | the first Tell of a session's extra seconds, if the benchmark shows them | Gateway: small–medium. | None to trust | b3–b6 black-box (residence) |
| 11 | **Streaming / progressive feedback** (stream the model's output and show lines as they arrive) | perceived wait, not actual | Needs structured-output streaming, a partial-reply protocol, the client showing unvalidated lines. **Large.** | **Shows lines before the pipeline has validated them**: a line later dropped by the invented-name guard would have been on screen. Contradicts "silence beats a wrong detail" | Reject in this form. The honest version is the existing "Understanding…" plus an interim "Kept your note" line, which already exists in the dock's status |
| 12 | **One model request for several independent notes** (batch across Tells) | one model call's fixed overhead per extra note (hundreds of ms, not seconds) | A new prompt shape, new evals, a new write path, provenance per note. **Large.** | Provenance and the Kept card are per note; a batched reply must be split back; a failure fails several notes | Reject: the saving is small, the blast radius is large. A story in one note already yields several memories in one call |
| 13 | **A smaller or faster model** | 1–3 s of model time, maybe | A paid eval run on the frozen corpus (`evals/README.md`), the founder's yes, the usual thresholds never lowered | Accuracy is the product; C.1's wrong-subject rate is 0.3% | Not first. Run only after 1–6 are measured, and only through the eval gate |
| 14 | **Model routing by complexity** (short notes to a cheaper model) | model time on short notes | A classifier or length rule plus two evaluated models | Two models to keep within thresholds; a short note is not a simple note ("Which Sam?") | Not now |
| 15 | **On-device preprocessing** (name detection, date words on the phone) | nothing from the server's path; it could reduce questions by passing hints | A duplicated rule set on two platforms | Divergence between phone and gateway rules | No |
| 16 | **Fewer confirmations through precision** (the pronoun policy; `activation-pass.md` §7 q7) | a Done tap and a sheet on most stories | A founder decision first; then an eval showing the single-referent case is safe | Trust; CC-12's standing rule "always conservative" | Decision, not optimisation |

**Dependencies between them:** 1 and 2 together remove both syncs from the critical path and leave one round trip to the server; 3 is independent; 4 and 8 are one gateway deploy; 5 and 6 are client constants; 7 is only worth it once 1–3 make a single note fast, and it needs the same-person rule.

**Engineering cost, honestly:** 1–6 together are a few days of work plus the black-box runs and a gateway deploy. They do not touch the prompt, the model, the schema's tables or any trust rule. They are **reliability work**, the same class as K12.

---

## 7. The brief's specific performance questions

**Can we reduce the number of times a user must explicitly submit Tell?** Yes, by product framing: one story per person instead of one fact per Tell. The pipeline already yields up to eight items from one note; the card shows three and "and N more". No pipeline change. (`01` §3.)

**Can Kinship process one larger narrative more efficiently than several small captures?** Yes, strictly: one model call, one claim, one write, two syncs, one card, for N memories, versus N of each. The model call for a longer note is a little longer (more output tokens) but nowhere near N×. **But the pipeline is bounded to eight items (`pipeline.ts:73` `MAX_ITEMS`), and it is not the only bound:** the note's own size, the model's output budget, the evidence rules, the held-review arrays and the card's presentation each cap or truncate somewhere, and a 90-second story can cross several of them with nothing told to the user. The founder's direction (19 Oct) is that **no arbitrary user-facing cap on the memories from one story is acceptable, and no internal limit may silently drop information**; raising the number is not the fix. The audit of every such limit, the architecture options for bounded processing with continuation, the four outcome categories (processed · extracted · intentionally excluded · omitted), the regression scenarios and the acceptance gate are in **`05-long-narrative-extraction.md`**. Until that gate passes, story-first capture may be *invited* only at the length the current path provably handles without loss.

**Can the user continue adding information while previous captures are still processing?** On the phone, yes: the field is free after Keep, a second note is kept locally at once and its card replaces the first's (which is finished as "idle"). In the pipeline, not really: the second note waits for the first note's gateway call and sync #2, then its own (§2.3 step 4). With candidates 1–3 that wait shrinks to roughly one model time; with 7 it disappears for notes about different people. **What must stay sequential:** two notes about the same person, because merge / supersede / resolve read the dossier.

**Can meaningful intermediate feedback appear immediately without falsely claiming understanding?** The dock's "Understanding…" already appears in well under a second and the note is saved. What it can honestly add: "Kept your note · understanding…" (the note *is* safe), and "Keep telling; I'll catch up" when a second note is kept while the first is in flight. What it must not add: any line before the pipeline has validated it (§6 #11).

**Can we eliminate unnecessary waiting at the interface while preserving the data guarantees?** The waiting that is unnecessary is sync #1's pull, sync #2 as the only route for rows, the server's serial guard trips, and the re-read storms. Removing them preserves every guarantee: the write RPC, the claim, the provenance constraint and the tiers are untouched. The waiting that is necessary is the model and one write.

---

## 8. Multi-memory capture at scale: the failure modes against the pipeline (Track E)

Assessed against `pipeline.ts`, `resolve.ts`, `context.ts`, the eval sets and the proofs; a live run of the benchmark note is part of Stage 1.

**The benchmark note:** *"Matt just got promoted. He's excited but nervous about managing people. He and Jess might move to Marin next summer, and I told him I'd introduce him to Alex."* The recorded proof (`activation-pass.md` §2, 5 Oct, through the gateway's input builder and `planExtraction` with a hand-written model reply) gave four items, nothing dropped, no question, the look-over tier because of "He", the promise lowered to tentative, "next summer" kept as a season, Jess and Alex not made into people. **With Matt as the context person** (a page Tell, or Concept B's first Tell) the pronoun has one referent and the only remaining reason for the sheet is policy.

| Failure mode | How the pipeline handles it today | Gap |
|---|---|---|
| Wrong person / wrong subject | Roster resolution is deterministic; two candidates → one question; a pronoun with two referents → a question (J1); the K4 name rule holds unknown capitalised names | **K27:** a known pet's name or a related person's name read as a new person. Fix proposed, not built |
| A relative's statement becoming the person's fact | `subject: related` with a subject check ("Priya's mom is visiting") held for one question | Works; it is a question, by design |
| Duplicating shared memories across people | K4: one shared memory with every participant; no one-person mirrors | Works (K4 VERIFIED) |
| Several memories repeating one statement | One memory per sentence (K8/K9/K16); mirror collapse | Works |
| Wrong temporal ordering | Dates resolved deterministically against the capture's time zone; precision never raised (N7) | A story that narrates in the past ("last year she moved, and now…") depends on the model's date words; dates.jsonl has 91 cases but few multi-sentence narratives. **Add story-shaped date fixtures** |
| Contradicting existing information | merge / supersede / resolve with the comparator for slotted facts; never across days (K20); CONFLICT asks | Works for residence; other slots wait on B7–B9 |
| Unnecessary clarifications | Confidence floors; the pronoun policy; `chooseClarification` asks one | **The look-over on dense notes** is the one that scales with story length: it is policy (q7), not a bug |
| Sensitive content auto-kept | Sensitive classes always confirm; pets excepted (J9); "a full recovery" raised to health (K27) | Fails safe |
| Inferred relationship labels | Never written by extraction; subtitles only from the user | Works |
| The user's intention mistaken for a fact about the friend | `subject: user`; K5/CC-23: the user's durable fact kept but never as the recipient's biography | Works |
| Current vs historical conflated | Certainty and `valid_to`; supersession ≠ history (CC-20) | Works |
| **More than the path can carry in one story** (items, output tokens, note length, held arrays) | `MAX_ITEMS = 8` and the other bounds inventoried in `05` §2: the rest dropped or truncated, nothing told | **Silent capacity-based loss.** The explicit gate before story-first onboarding (`05` §6); not solved by a bigger number |
| **A story about two people in one note** | Context person is one; the second person is resolved from the roster | A story that moves from Susan to Pedro to Susan's mother will produce subject checks; acceptable once, tiring at scale. Measure in Stage 2's multi-person story |

**What the pipeline does not need:** a new ontology, new slots or a structured "introduction note". **What it does need before story-first capture is the default:** the elimination of silent capacity-based loss as an acceptance gate (`05` §6), story-shaped date fixtures, the K27 fix, and evidence on the pronoun policy with a context person. A "safer mechanism for acknowledging uncertainty" already exists in the certainty vocabulary (tentative, reported, wished) and in the tiers; what a story needs is for the Kept card to *show* uncertainty in words ("might move", "in the fall" kept as said), which it does.

---

## 9. Regression requirements for any of this

- No change to `evals/extraction/thresholds.json`, the frozen corpus, or the pipeline's tiers without the eval gate and the founder.
- `npx jest`, the Deno suites, pgTAP, and the black-box suites (`k4`, `k20`, `today`, `removal` phone-like, `b3`–`b6`, `k28`) green; `sync.test`'s K12 assertions (concurrent `changedSince`, no transactions for known rows) kept.
- A new black-box case: two Tells kept within two seconds, the second about a different person; both cards correct; and two Tells about the same person, the second superseding the first, processed in order.
- The benchmark (§5.3) run before and after, on the simulator tier with the live model at minimum; FOUNDER-DEVICE before any item is called VERIFIED.
- `tell_lifecycle` payloads still content-free (`performanceTelemetry.test.ts`).
