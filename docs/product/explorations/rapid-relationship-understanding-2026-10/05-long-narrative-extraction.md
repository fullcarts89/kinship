# 05 · Extraction from longer narratives without silent loss

*Research and architecture options, 19 Oct 2026, read-only against `main` `9ad5e6d`. Written for the founder's direction of 19 Oct: **Kinship has no arbitrary user-facing limit on the number of meaningful memories extracted from one story; internal limits on input size, model output, batches, latency and cost are allowed, but they must never result in silently dropping information.** Nothing here is built. No numeric cap is proposed or chosen; that waits for a separate, reviewed technical brief and the founder's approval. The audit of limits (§2) was read from the code with file and line references and spot-checked; "inferred" marks a consequence reasoned out, not exercised.*

## 1. Summary

- **Today the path has a hard cap and several soft ones, and none of them tells the user.** The pipeline keeps the first eight proposed items in the model's order and drops the rest as `too_many_items`; the reply to the phone carries only what was saved and held, never what was dropped; the Kept card, the review sheet and the Source view show nothing about it; the only trace is a count in a server table. Around that cap sit others: the model's output budget (a truncated reply is discarded whole and retried, up to six times, each costing a quota unit), a client timeout shorter than the server's, verbatim-evidence rules that drop an item when its quote appears twice in a long note, confidence floors, dedupe rules that can fold two distinct details, caps on participants, a one-question-per-note field in the model's output, and storage arrays sized to eight. The eval corpus never tests any of this: its largest fixture expects three items.
- **Raising the number does not fix this.** Every arbitrary cap drops the ninth, or the sixteenth, or the fifty-first thing silently. The fix is **accounting plus bounded processing**: the system must be able to say, for every sentence of the story, whether it was processed, became a memory, was excluded by a rule, or was not reached, and it must never present the last category as understanding.
- **Four outcome categories, made observable at the sentence level**, are the core of the proposal (§3). The first three are legitimate; the fourth must be shown as incomplete and must be resumable without the user re-entering anything.
- **Architecture (§4):** for ordinary notes, one model call plus coverage accounting plus an honest partial state, which is most of the value at the least risk; a second bounded pass over uncovered sentences to catch model omissions; continuation when output is truncated; and segmentation only above a size the brief sets from evidence, with an entity ledger (never facts) carried across segments, absolute evidence offsets into the one preserved source, idempotent per-segment writes, and dedupe across segments. Chunking is not assumed safe or necessary for ordinary captures.
- **The acceptance gate (§6):** story-first onboarding becomes the default only when, across the regression scenarios in §5 (5, 8, 9, 15, 25 and 50 candidate details; one person, several, related subjects, shared memories, changing facts, uncertain dates, sensitive information), nothing in the fourth category is ever represented as complete, every trust threshold holds, and cost and time stay within a bound the brief states.

---

## 2. The audit: every limit on the extraction path

`P` = `supabase/functions/_shared/extraction/pipeline.ts`; `H` = `supabase/functions/ai-gateway/handler.ts`; `U` = `src/store/understanding.ts`; `RM` = `src/features/tell/reviewModel.ts`; `M/` = `supabase/migrations/`; prompts under `supabase/functions/_shared/prompts/relationship_extract/`.

### 2.1 Input size

| Limit | Where | Value | When exceeded | User told? | Logged? |
|---|---|---|---|---|---|
| Tell field | `src/ui/TellField.tsx:95`, `SetupViews.tsx:445` | `maxLength={5000}` (UTF-16 units) | Typing stops; no copy says why | Partially | No |
| Capture (repo) | `src/store/repositories.ts:277` | 5000 code points | "too long to keep as one note"; nothing saved | Yes | No |
| Capture (DB) | `M/20261002210100:37` | 1–5000 chars | unreachable past the repo | — | — |
| Gateway body | `H:200`, 4 KB | the JSON body only; the note is loaded server-side by id, never in the body | not reachable for a Tell | — | — |
| Note in prompt | `v1.ts:203` | whole `raw_text`, no truncation | — | — | — |

A 90-second spoken story is about 150–250 words, 800–1,400 characters: well inside 5000. A fifty-detail account can approach the limit; today it stops the keyboard without a word.

### 2.2 The prompt and the model's output budget

| Limit | Where | Value | When exceeded | User told? | Logged? |
|---|---|---|---|---|---|
| Item count in the prompt | `v6.ts:20-74` | **no cap stated, no "most important", no "up to N"**; "leaving something out is always better than a wrong personal detail" | the model may propose any number; code cuts at 8 | No | No |
| Output schema | `v1.ts:75-148` | `items` has no `maxItems`; `statement` and `evidence` no `maxLength`; **`needs_clarification` is one object for the whole note** | a second ambiguity cannot be flagged by the model; code re-finds it per item (`P:598-604`, `resolvePerson`) or guesses under the confidence rules | Partially | No |
| Roster | `context.ts:19,156-160` | 30 people, scored | person 31+ is "new" to the model → "Who is X?" | Partially (a misleading question) | No |
| Dossier | `context.ts:20-21,172,220` | 3 people, 40 items | a 4th named person or an older memory cannot be merged or superseded → a duplicate line, not lost text | No | No |
| Output tokens | `registry.ts:48` 8000; `model.ts:61` | `stop_reason = max_tokens` → outcome `max_tokens`, **output discarded whole** | `run.ts:37` → `H:303-309` 503 `try_later` → client `failed`, retry after 15 s / 60 s / 3 m / 10 m / 30 m / 60 m, six attempts (`U:130,171`), **each re-claiming and consuming a daily-quota unit** (`H:280`); then "Couldn't understand this one. Your note is saved." (`RM:180`). No re-submit affordance | Partially | `ai_calls.outcome`; `tell_failure{server}` |
| Wall clock | `registry.ts:49` 45 s server; `gateway.ts:288` 30 s client; SDK retry 1 | the client aborts while the server keeps working | next pass: 409 `in_progress` counted as a failure, or a `done` reply **without `saved`** (`H:267-276`) so the card learns its lines only by sync and no `extraction_completed` fires | Partially | Partially |
| `invalid_output` | `model.ts:63,67`, `run.ts:39` | — | as `max_tokens` | Partially | Yes |
| Refusal | `model.ts:60`, `H:308` | — | "Kept as you wrote it." | Partially (no reason) | Yes |
| Daily quota | `index.ts:40` 50/day; `H:280-284` | 429 + Retry-After | waits; "I'll try again" | Partially | `tell_failure{limited}` |

A long note is the one most likely to be long in output and in time, so it is the one most exposed to the retry loop, and the retry loop is the one that spends quota fastest.

### 2.3 Validation (deterministic, in the pipeline)

| Limit | Where | Value | When exceeded | User told? | Logged? |
|---|---|---|---|---|---|
| **`MAX_ITEMS`** | `P:73`, `P:105-110` | 8, **the first eight in proposal order** after `oneSentenceOneMemory`, not by confidence, tier or importance | item 9+ → `dropped {reason: too_many_items}`; `dropped` is never in the reply (`H:333-342`) | **No** | counts only (`ai_calls.items_dropped`, `drop_reasons`) |
| Evidence must be verbatim | `P:275-282` → `_shared/spans.ts` | the first quote must be an exact NFC substring; **no `near` hint is passed, so a first quote found twice is `evidence_ambiguous`**; no normalisation of curly quotes, double spaces, trailing punctuation | the whole item dropped | No | counts |
| Quotes per item | `P:273` | 3 | 4th ignored | — | — |
| Confidence floors | `P:75,82,610` | < 0.6 dropped (`low_confidence`); 0.6–0.85 flagged | dropped silently | No | counts |
| Other drop codes emitted | `bad_kind_subject`, `instruction_text`, `contact_detail`, `already_known` (the one told: "Already known: …"), `invented_relation`, `no_evidence`, `duplicate`, `too_many_items` | — | — | only `already_known` | counts |
| Exact dedupe | `P:120`, `P:1948-1956` | same kind + person + subject and (same event type and day, or same folded statement) → `duplicate` | two different races on one Saturday collapse | No | counts |
| Mirror collapse | `P:2139-2190` | one line for the same words about the same people; `with_person_ids` ≤ 7 | 8th co-participant dropped | No | counts |
| One sentence → one memory | `P:1082-1170` | per-person facts in one sentence that share words merge into one line on one person | distinct facts about two people can become one line on one page | No | **not counted** |
| Participants per line | `P:1004`, `names.ts:152` | 7 resolved, 3 open, 8 mentions | 8th named person not attached | No | No |
| One stored question per note | `P:1960-2007` | priority person → archived → subject → new person → date; options ≤ 4 + "Someone else" | the client rebuilds a question per held item from flags and asks them one at a time (`RM:427-453`, `ReviewSheet.tsx:75`); **nothing held is lost**, but a set of eight with three question types is three or more sequential questions | Yes | — |

### 2.4 Storage

| Limit | Where | Value |
|---|---|---|
| `write_extraction` items | `M/20261016090000:200-201` | ≤ 8 (error 22023 above; unreachable with `MAX_ITEMS`) |
| Held review set | `capture_reviews.items` 1–8 (`M/20261004100000:144-145,298-300`); `MAX_ANSWERS = 8` (`H:202,511`) | 8 |
| Statement | `P:291` `.slice(0,500)`; DB 1–500 | truncated silently at 500 |
| Quote stored | `P:85` `QUOTE_MAX = 200`; DB `left(…,200)` | display truncated; span intact |
| `with_person_ids` ≤ 7; `closes_ids` ≤ 8; `person_mentions` ≤ 8 (text ≤ 100); relation ≤ 50 in the DB vs `.slice(0,100)` in code | various | a 51–100-character relation word would fail the CHECK (practically unreachable) |

### 2.5 Review presentation and telemetry

| Where | Value | Consequence |
|---|---|---|
| Kept card (`TellFlow.tsx:128-137`) | 3 lines, then "and N more" shown in place | nothing hidden among saved lines |
| Review sheet (`ReviewSheet.tsx:153-164`) | all lines; one question at a time | no cap |
| Source view (`useV2.ts:327-347`, `NoteView.tsx`) | all spans marked | **unmarked text is indistinguishable from "nothing there"**; there is no mark for a dropped item |
| `known` on the client (`gateway.ts:208`) | 5 | 6th "already known" phrase not shown |
| `extraction_completed.items_n` | 0–10, saved + held | **no dropped count reaches the phone**; not fired on the `done` recovery path |

### 2.6 The eval corpus

416 fixtures; **the largest expects 3 items**; no fixture tests more than eight details, `too_many_items`, output truncation or note length beyond one 2,290-character adversarial case. `item_recall` passes at 0.85, so 15% of expected items may be missed and still pass. `registry.ts:38` still records `EXTRACTION_EVAL_VERSION = "extraction-v2.5"` against a corpus at v2.9 (a logging mismatch, not a loss path).

### 2.7 The worst silent-loss paths, in order

1. `MAX_ITEMS = 8`, first-eight-by-order, unreported anywhere a user can see.
2. `evidence_ambiguous` and `no_evidence` on the first quote: no position hint, no normalisation; probability rises with note length and with short quotes.
3. `low_confidence` below 0.6: silent, counts only; minor details in a long note may score lower (inferred).
4. The output-budget and timeout retry loop: partial output discarded, six attempts, six quota units, then a generic failure with no re-submit; the `done` recovery path loses the saved summary and the telemetry event.
5. Dedupe and merge rules that can fold distinct details (`sameItem` on event type + day, `oneSentenceOneMemory`, mirror collapse, participant caps).
6. Context caps (roster 30, dossier 3 people / 40 items): not text loss, but a fourth person or an older memory cannot be merged, so a long story about many people produces duplicates and misleading "Who is X?" questions.
7. The model's single `needs_clarification` field.

Not loss paths, checked: the 4 KB gateway body (the note never travels in it); the single stored question (the client asks per held item); the sheet and the Source view (no caps on what they show).

---

## 3. Four outcome categories, and how to make them observable

The founder's distinction, restated so that code can compute it:

| # | Category | Meaning | Legitimate? | Must the user be able to see it? |
|---|---|---|---|---|
| 1 | **Source content successfully processed** | A sentence (or span) of the story was examined by a model call whose output parsed, and the pipeline ran over every proposal about it | yes | Only by its absence: anything not in this category is category 4 |
| 2 | **Candidate memories correctly extracted** | A proposal about that content became a saved or held item with a verbatim span | yes | Yes: the Kept card, the sheet, the page, the Source marks (built) |
| 3 | **Memories intentionally excluded by trust or relevance rules** | A proposal about processed content was dropped by a rule: no evidence, low confidence, invented relation, contact detail, instruction text, duplicate, already known, or sensitivity held and declined | yes | Mostly no, in the product's voice ("silence beats a wrong detail"); but the *category* must be recorded per sentence, and `already_known` is already told. A quiet "Nothing kept from this" on a Source span is the most that should ever show, with a fixed plain-words reason class and never the model's text |
| 4 | **Information omitted or left unprocessed** | Content the system did not get to: dropped for **capacity** (`too_many_items`), discarded with a truncated reply, a segment never run, a timed-out call, a model omission (a sentence with clear meaning and no proposal), a failed evidence location that was the locator's fault | **no** | **Yes, always**: the note's status says it is not finished, the Source view marks the unprocessed text, the card never says "Kept for Susan" as if complete, and a retry is offered that does not require re-entering anything |

**The accounting that makes this computable: sentence coverage.** The pipeline already splits a note into sentences (`sentenceAroundSpan`) and already records which spans became items. The missing piece is a per-note **coverage record**: for each sentence, the set of proposals that touched it and their fate (saved / held / dropped with reason / none), plus the processing state of the model call(s) that covered it (parsed / truncated / timed out / not run). From it:

- category 1 = sentences under a parsed call;
- category 2 = sentences with a saved or held item;
- category 3 = sentences whose every proposal was dropped by a rule;
- category 4 = sentences under a truncated, failed or unrun call, **or** sentences under a parsed call with no proposal and with clear meaning (the K5 rule: "never Nothing to remember for a note with clear meaning"), **or** proposals dropped for capacity.

Small talk and filler legitimately have no proposal; the K5 boundary (does the sentence have clear meaning?) is the one judgement in this table that is not purely mechanical. §4.3 proposes a bounded way to make it one.

**What this record is not:** it holds offsets and reason codes, never the model's words; it is content-free in telemetry (counts per category) and content-bearing only on the phone and in the user's own rows, like spans today.

---

## 4. Architecture options

Judged against the founder's ten requirements: preserve the source; bounded processing with continuation or segmentation when needed; context and references across segments; evidence spans and provenance; no duplication, conflicting writes or cross-person contamination; detect and surface incomplete processing; partial success without false completeness; retry without re-entry; a review that stays understandable with dozens of memories; cost and time managed without trading trust.

### 4.1 What already holds, and must keep holding

- **The source is preserved.** `captures.raw_text` is the note, whole, up to 5000 code points; every item's spans are absolute offsets into it; the Source view renders it with marks. Any segmentation must keep **one capture row, one text, absolute offsets**; segments are windows over the text, never copies of it.
- **The claim is per capture.** Two calls for the same capture cannot write at once (`claim_capture_extraction`). Segments of one note must run under one claim, sequentially or with an explicit segment index, and the stale-claim reclaim (2 minutes) must consider a multi-segment run's longer life.
- **Writes are one transaction per call** (`write_extraction_with_review`), bounded to eight items and a held set of eight. Either the bound rises in the SQL with the brief's number, or writes become per-segment with a segment index and an idempotency key, or proposals accumulate and one write commits them all. Each has consequences (§4.5).

### 4.2 Option A · One call, coverage accounting, an honest partial state (the baseline for every note)

No segmentation. Keep one model call for ordinary notes, and change what happens around it:

- **Remove the arbitrary cap from the pipeline's semantics.** `MAX_ITEMS` stops being a silent drop. Either it is not applied at all (the output budget becomes the only bound, detected as in B), or the items past it are recorded as **category 4** in the coverage record and the note is marked **partial**, with the remaining proposals carried to a continuation (B). Never dropped as `too_many_items` without a visible state. The brief decides which; this document rejects only the silent form.
- **Return the coverage summary in the reply**: counts per category and the unprocessed spans, so the phone can show the state. Content-free in telemetry: `extraction_completed` gains `unprocessed_n` and `excluded_n` buckets.
- **Fix the locator**: pass a `near` hint (the proposal's sentence index from the model, or the previous span's end) so a quote found twice is resolved by position; normalise curly quotes, whitespace and trailing punctuation before matching. This turns most of loss path 2 into category 2 and is independent of everything else.
- **Honest states on the phone.** The understanding row gains a `partial` state. The card says "Kept 6 things so far · couldn't finish this one" with **Try again**, never "Kept for Susan" alone; the Source view marks unprocessed text plainly ("Couldn't get to this"); Today never counts a partial note as settled.
- **Retry without re-entry.** The capture row already persists. Retry resumes from the coverage record: sentences in categories 1–3 are not re-sent; only unprocessed spans go (which is B or C below). Attempts and quota are charged per call, and a resumed note never re-runs finished content.

**Covers:** preservation, provenance, detection, partial success, retry, cost (no extra calls for ordinary notes). **Does not cover by itself:** truncated output (B), model omissions (D), notes larger than one call can hold (C).

### 4.3 Option D · A bounded second pass over uncovered sentences (model omissions)

After the first call, take the sentences in category 1 with **no proposal** and clear meaning, and ask the model once more, about those sentences only, with the same roster and dossier and the list of items already proposed (as statements, not as facts to believe): "Is there anything in these sentences worth keeping that is not already listed?" Bounded: the input is a subset of the note; the output is small; it runs at most once per note; it is skipped when there are no uncovered sentences.

"Clear meaning" needs a deterministic floor so the pass is not itself a judgement call: a sentence that names a roster person or a related someone, or contains a date word, a kin word, a promise verb or a milestone word (the lexicon the pipeline already has), is "worth asking about"; pure filler is not. Anything the second pass still leaves is recorded as category 3 with reason `no_proposal_after_check`, not category 4, because the system did look twice.

**Covers:** model omissions (the K5 class) at bounded cost. **Risk:** the second pass may propose weaker items; they go through the same pipeline and thresholds, so the trust gates hold.

### 4.4 Option B · Continuation when output is truncated

When `stop_reason = max_tokens`: do not discard the output. Parse what is complete (structured output arrives as one JSON document; a truncated document is recoverable up to the last complete item with a tolerant parser, or by asking for items as a list of complete objects and keeping the complete ones), record which sentences those items covered, and issue a **continuation call** for the remaining sentences with the items so far listed. Bound the number of continuations (the brief sets it; two is a plausible starting point) and mark the note partial if the bound is reached.

**Covers:** output-budget truncation without the six-attempt retry loop, and without charging quota for re-doing finished content. **Risk:** a tolerant parse of truncated JSON must be exact about what it keeps (a half-written statement is discarded, its sentence goes to the continuation). Evidence quotes keep working because they are matched against the whole note.

### 4.5 Option C · Segmentation (only above a size the brief sets from evidence)

For a note whose size, by a deterministic measure (characters or sentence count, calibrated by the §5 scenarios against the output budget), exceeds what one call reliably completes, split it into **sentence-aligned windows** with a small overlap (the previous window's last sentence), and process the windows **sequentially under one claim** with:

- **The same roster for every window**, and the dossier for the people named in that window plus the people in the ledger.
- **An entity ledger carried forward, never facts**: the names and pronoun referents resolved so far (name → person id or "open name"), the last-mentioned person for pronoun resolution across a boundary, and the user as "you". The ledger lets "She said…" at the start of window 2 resolve to the Susan of window 1 under the J1 rule (the people named before the pronoun), and lets "Pedro" in window 3 stay the same open name as in window 1 rather than a new "Who is Pedro?".
- **The statements proposed so far, as a list the model may mark `existing: merge | supersede | resolves` against**, so that "she moved to Alameda… later that year she moved again to Oakland" in one story supersedes in order; **the pipeline applies its comparator exactly as it does against the dossier**, and never across subjects.
- **Absolute offsets**: each window's proposals quote the note, and the locator searches the whole note with a `near` hint from the window's offset, so spans are provenance into the one source.
- **Dedupe across windows** by span overlap first (two windows proposing the overlap sentence), then by the existing `sameItem` and mirror rules; the overlap sentence is attributed to the earlier window.
- **Writes**: accumulate every window's planned items and commit them in **one** `write_extraction_with_review` transaction at the end (so the capture is never half-written and the single-transaction guarantees, the supersede triggers and exact Undo keep their shape), **or**, if the brief prefers progress visible per window, per-window writes carrying a window index and idempotency key, with the capture in `partial` until the last window. The first is simpler for trust; the second shows progress sooner. Either way the held set and the item array bound in SQL must match the brief's chosen bound, and a failed window leaves the earlier windows' outcome and the coverage record intact so the retry resumes at the failed window.
- **Cross-person contamination** is prevented by what is *not* carried: no statements as facts, no composed lines, no dossier from one window's people into another's except by name; and by running every window through the same `resolvePerson`, roster and subject rules. The §5 scenarios with several people and related subjects are the test.

**When it is not needed:** for every note that one call completes with coverage accounting (A) and at most one continuation (B), which, by the sizes in §2.1, is the ordinary case and most stories. **Cost:** windows are sequential (the ledger), so a 50-detail story costs several model latencies end to end; §4.8 bounds that and the UI shows progress ("Understanding part 2 of 3").

### 4.6 Option E · The product invites the story in parts (an interim, not the answer)

Ask for two to four sentences per Tell, and let the user keep telling. This is `01`'s interim constraint and it is honest only because the current path handles that length. It is not acceptable as the long-term answer (the direction is no user-facing limit) and it does not remove the silent paths for a user who pastes a long story anyway. It stays as the bridge until the gate passes.

### 4.7 The review with dozens of memories

The Quiet Herbarium's answer is structure, not a longer list:

- **The card** keeps "Kept for Susan" and three lines, then **sections instead of a flat "and N more"**: *Lately · Coming up · You said you'd · Between you*, the page's own sections, each with its lines; more than one person → one group per person, in the note's order. The card stays a card; the sheet carries the structure.
- **Questions** are grouped by type and counted ("3 to check"), asked one at a time as now, with the same `need.group` mechanism; a sensitive group is asked last and never auto-settled; "Not now" leaves the rest waiting on Today and the page as today.
- **The Source view** gains two marks beside the ochre one: a plain mark for category 4 ("Couldn't get to this · Try again") and, on tap only, a quiet "Nothing kept from this" for category 3 with a fixed reason class in plain words ("it wasn't clear who this was about", "it repeated something above", "it was too uncertain"), never the model's words.
- **Nothing is ranked.** Sections are by kind and time, as on the page; no importance, no "top memories".

### 4.8 Cost and time, bounded without trading trust

- One ordinary note: one call (A), optionally one small second pass (D). Cost rises by at most the second pass, which is skipped when coverage is complete.
- A truncated reply: one continuation (B) instead of up to six full retries and six quota units.
- A segmented note: windows proportional to length, sequential; the daily quota should count a note's windows as one unit for the user's sake (an internal limit on *calls* may remain; it must not make a long story fail at window 3 and lose the first two).
- The system prompt is cached already; windows share it.
- Latency: the UI shows per-window progress; partial results may be shown as **"so far"** only once written (per-window writes) or kept as "Understanding part 2 of 3" (single write). Never a line on screen that the pipeline has not validated.

### 4.9 Comparison

| Requirement | A · one call + accounting | D · second pass | B · continuation | C · segmentation | E · parts |
|---|---|---|---|---|---|
| Source preserved | yes (unchanged) | yes | yes | yes, one text, absolute offsets | yes (several notes) |
| Bounded processing | yes | yes, at most once | yes, bounded continuations | yes, bounded windows | yes |
| Context across segments | n/a | same context | items so far | ledger + statements so far | **no**: parts are separate notes with separate dossiers |
| Evidence and provenance | fixed locator | same | whole-note matching | whole-note matching with near hint | yes |
| No duplication / conflicts / contamination | unchanged | same gates | dedupe vs items so far | overlap dedupe; one claim; one write or indexed writes | duplicates across parts possible |
| Detect incomplete processing | **yes, the core** | catches omissions | catches truncation | per window | no |
| Partial without false completeness | yes | yes | yes | yes | n/a |
| Retry without re-entry | yes | yes | yes | resume at the failed window | user re-tells |
| Review understandable | §4.7 | §4.7 | §4.7 | §4.7 | as today |
| Cost / time | unchanged | + one small call when needed | + one call instead of six retries | + N sequential calls for long notes | unchanged |
| Risk | low | low–medium (weaker proposals; same gates) | medium (tolerant parsing must be exact) | **highest** (ordering, pronouns at boundaries, supersede within one note, duplicate shared memories) | product-only; leaves the silent paths |

**Recommendation for the technical brief:** A and D for every note; B as the truncation path; C only above an evidence-set size threshold, after A, B and D have passed the §5 scenarios without it. E stays as the bridge. The brief, not this document, picks the thresholds, the window size, the continuation bound and whether writes are single or per-window, with evidence from the scenarios on the live model.

---

## 5. Regression scenarios

Each scenario is a synthetic story (fixture people only), run through the real gateway on the local stack with the live model (recorded for replay), and graded by the **four categories per sentence** in addition to the existing thresholds. "Candidate details" are the distinct things a careful reader would list; the expected split between categories 2 and 3 is written per fixture with `exhaustive: true`.

| # | Candidate details | Shape | What it exercises | Must never happen |
|---|---|---|---|---|
| S5 | 5 | one person; a promotion, a mood, a plan with a season, a promise, a pet | the ordinary story (the Matt note plus one); the baseline for everything else | any category 4 |
| S8 | 8 | one person; eight distinct facts and events, two with exact dates, one sensitive | exactly the cap; the held sensitive item; the sheet with one group | any category 4; the sensitive item auto-kept |
| S9 | 9 | one person; S8 plus one more detail at the end | **the first silent drop today**; after A: category 4 shown, or B carries it | the ninth presented as nothing; the card saying "Kept" without the partial state |
| S15 | 15 | **three people** (two in People, one related: "Susan's mom"); shared memories ("Susan and Chris and I…"); one pronoun chain across people | roster and dossier caps; subject checks; K4 shared memory as one line; participants | a relative's fact filed on the person; a shared memory duplicated per person; a pronoun resolved to the wrong person |
| S25 | 25 | **five people**, one not in People ("Pedro"); **changing facts within the story** ("she moved to Alameda… then in June to Oakland"); two uncertain dates ("sometime next spring", "around her birthday"); one sensitive line about a relative; two promises (one the user's, one someone else's) | within-note supersession in order; the ledger across a window boundary (if C runs); open names stable across windows; date precision never raised; promise owner; sensitive held | Alameda surviving as current; "Who is Pedro?" asked twice; a date given a day; the relative's health on the person; the user's promise filed as theirs |
| S50 | 50 | **the evening**: six people, a month of news, in the order a person would tell it, ~4,500 characters; two near-duplicate statements of one fact; one correction mid-story ("actually it was Thursday"); three sensitive lines; several things about the user themselves | every bound at once: input near the limit, output budget, continuation or windows, dedupe of the near-duplicates, the correction superseding, the card's sections, questions grouped, cost and time | any category 4 unreported; the note ending in "Couldn't understand this one"; six retries; quota exhausted by one note; a line on screen before validation; more than the bound of continuations without a partial state |
| S-trunc | as S25 | the same story with the output budget artificially lowered in the harness | B's path: tolerant parse, continuation, no retry loop | discarded output; a quota unit per retry |
| S-timeout | as S25 | the client timeout artificially below the model's time | the client/server timeout mismatch: no 409-as-failure, the `done` path returning `saved` | the saved summary lost; `extraction_completed` not fired |
| S-resume | as S50 | kill the gateway after window 2 (or after the first call in A) | retry resumes from the coverage record; finished content not re-sent; the user re-enters nothing | re-running finished windows; charging quota again for them |
| S-filler | 12 sentences, 4 details | a story padded with small talk | category 3 and "no proposal" on filler are not category 4; D's floor distinguishes meaning from filler | filler marked "Couldn't get to this" |

**Grading additions** (zero tolerance where marked): `capacity_loss = 0` (no `too_many_items` without a partial state); `unreported_unprocessed = 0` (every category-4 sentence visible in the reply and on the phone); `coverage_consistency = 1.0` (every sentence in exactly one category); `cross_window_duplicates = 0`; `cross_person_contamination = 0` (existing metric, now over windows); `within_note_supersession` correct; `truncation_detected = 1.0`; `resume_without_rerun = 1.0`; the existing thresholds unchanged (`grounding 1.0`, `wrong_subject ≤ 0.005`, `sensitive_not_auto 1.0`, `certainty_upgrades 0`, and the rest), and `item_recall` on the narrative set reported separately so that a 0.85 pass on the corpus does not hide a story that lost a tenth of itself.

The narrative set is a new fixture file (`narratives.jsonl`) with per-sentence expectations; it joins the frozen corpus through the usual manifest and the paid-run labels.

---

## 6. The acceptance gate before story-first onboarding becomes the default

Story-first capture (the `01` Concept B invitation beyond a few sentences, or any copy that says "tell me the whole story") becomes the default first-use experience only when all of these hold, each with evidence at the tiers the harness defines (UNIT · INTEGRATION · BLACK-BOX · LIVE-MODEL · NATIVE-SIMULATOR · FOUNDER-DEVICE):

1. **No silent capacity-based loss.** No path in §2 can drop or truncate information without the note entering a visible partial state. `too_many_items` as a silent drop no longer exists. Truncated output is continued or marked partial, never discarded and retried whole.
2. **The four categories are computed per sentence and returned**, and the phone shows category 4 (the state, the Source mark, Try again) and never shows a partial note as "Kept".
3. **Every §5 scenario passes on the live model** with the grading additions at zero where marked, and every existing threshold unchanged (no threshold lowered to pass, as the eval rules already say).
4. **Retry resumes without re-entry and without re-running finished content**, proven by S-resume.
5. **Cost and time are bounded and stated**: the brief records the per-note call bound, the quota treatment of multi-call notes, and the measured end-to-end time for S25 and S50 on the simulator tier with the live model.
6. **FOUNDER-DEVICE**: the founder tells a real 25-detail story on their phone and the card, the sheet, the page and the Source view show the four categories honestly; nothing in category 4 is hidden.
7. **The review stays a review**: §4.7's structure on S25 and S50 is judged on device as understandable, not as a form.

Until the gate passes, the first Tell and the dock invite a story at the length the current path handles (two to four sentences; `01` §8), and no copy implies more.

**What the gate does not do:** pick a number. If the brief keeps any internal item bound, it is an internal batch size with a continuation behind it, and the gate's first condition applies to it.

---

## 7. Risks of the proposal itself, and their mitigations

| Risk | Where it bites | Mitigation |
|---|---|---|
| A pronoun at a window boundary resolves to the wrong person | C | the ledger carries the last-mentioned people in order; the J1 rule (named before the pronoun) applies across windows; S15 and S25 test it; when two referents remain, hold and ask, as today |
| Within-note supersession applied in the wrong order | C, B | windows run in text order; statements so far are passed in order; the comparator's "never across subjects, never upgrade certainty" rules apply; S25's move sequence tests it |
| A shared memory proposed in two windows | C | overlap dedupe by span first; K4's one-shared-memory rule second; `cross_window_duplicates = 0` |
| The second pass proposes weaker items | D | same thresholds and gates; `no_proposal_after_check` is category 3, not 2 |
| A tolerant parse keeps a half-written item | B | keep only complete objects; a statement without its closing quote is discarded and its sentence continued |
| Partial states confuse the user | A | one state, one word ("couldn't finish"), one action (Try again); never a count of what is missing beyond the Source marks; Today ignores partial notes |
| The card becomes a form | §4.7 | sections only when more than three lines; questions grouped and counted; nothing ranked; judged on device (gate 7) |
| More model calls, more latency, more cost | B, C, D | ordinary notes cost one call; D is skipped when coverage is complete; C only above the threshold; quota counts a note once; progress shown per window |
| A longer run outlives the 2-minute stale-claim reclaim | C | the claim's reclaim window is extended for multi-window runs or refreshed per window; S50 tests it |
| Telemetry leaks content | all | counts and buckets only (`unprocessed_n`, `excluded_n`, `windows_n`); spans stay on the phone and in the user's rows, as today |

---

## 8. What this document does not do, and what the technical brief must contain

This document chooses no number, changes no prompt, schema, pipeline rule or screen, and authorises nothing. The separate technical brief, for the founder's review before any build, would contain: the chosen path (A + D + B, then C by threshold); the thresholds and bounds with the evidence that set them; the coverage record's shape and where it lives (the understanding row on the phone; a content-free summary on the server); the reply shape; the SQL bounds and whether writes are single or per-window; the locator fix; the tolerant-parse rule; the quota treatment; the card, sheet and Source copy as proposals; the narrative fixture set and its grading; the evidence plan by tier; and the rollout (gateway deploy, build, device pass). It would be reviewed like every Commit-next brief and would not start from this PR.
