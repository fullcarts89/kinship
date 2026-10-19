# 07 · Calibration evidence: the S-series through the current gateway with the live model (19 Oct 2026)

*Dated evidence, not canonical. Authorised by the founder on 19 Oct 2026 as Stage 1 of `06` §10: "the S-series through the current gateway on the local stack with the live model, recorded as a dated evidence file in the research folder, no code change." Nothing in the repo changed; no production system, account or data was touched. Model identifiers are not written here; "the model" is the one the registry names for `relationship_extract`, at its configured effort.*

## 1. Summary of what the runs showed

1. **The model proposes everything; the pipeline throws the rest away.** For every story the number of proposals the model returned equalled or nearly equalled the number of candidate details (5/5, 8/8, 7–8/9, 13–14/15, 25/25). The pipeline then kept the first eight in order: **5–6 of 13–14 proposals dropped on the 15-detail story, 16 of 25 on the 25-detail story**, every time, as `too_many_items`, with the reply reporting a normal `clarify` outcome and nothing about the loss. The dropped details were the **last** sentences of each story (Ben's new job, Lena's pregnancy, Maya's programme, John's party, the user's own intention).
2. **Model time grows linearly with what the model writes: about 1.5 seconds per proposed memory.** Output was 232–244 tokens per proposal across all stories (mean ≈ 236), and model latency fitted `≈ 1.75 s + 6.4 ms × output tokens` across 18 calls (5 details ≈ 9 s, 8 ≈ 13 s, 15 ≈ 22 s, 25 ≈ 39 s). On this day's API speed, a one-fact note sits near 3–4 s, which is consistent with the recorded production p50 (notes of 1–2 items); a five-detail story takes nine.
3. **The first bound a long story hits is a timeout, not the output budget.** By the fit, the phone's 30 s client timeout is reached at about 19 proposals, the gateway's 45 s model timeout at about 29, and the 8,000-token output budget only at about 34. So **a 25-detail story (39 s) already fails on the phone today** (the client gives up at 30 s, then meets `busy`, then backs off), and **the 50-detail story failed outright: the model call timed out at 45 s, the SDK retried, timed out again, 503 after 90 s, three runs out of three, zero memories**. The phone would repeat that up to six times across an hour and end with "Couldn't understand this one. Your note is saved." The whole story is category 4 and the user is told nothing of the kind.
4. **Omissions by the model exist and are invisible.** The 9-detail story lost the same detail in all three runs ("she finally fixed her bike": a plain fact about Priya with clear meaning) with no proposal for its sentence, while the other eight were merged or kept correctly. Nothing in the reply or on the phone would show it. Merges of two details into one correct line (a race and its goal; a show and the ask to come) were common and are not omissions.
5. **Below the cap, the trust rules behaved as specified.** No wrong-subject line was observed in the kept items; relatives stayed relatives (Susan's mom, Susan's dad) and a newcomer stayed a newcomer (Pedro, held); sensitive lines (anxiety, a fall, a knee) were held for "Remember"; two promises with an ambiguous pronoun were held for one question; a coarse date never became a day. One false positive failed safe ("started at a new clinic" raised to health). One unnecessary question appeared ("his knee" held as a two-referent pronoun with Susan and Ben both named earlier).
6. **Cost at list prices:** $0.025 per 5-detail call, $0.040 per 8, $0.067 per 15, $0.121 per 25; about **$0.0047 per proposal**, plus the cached system prompt (4,564 tokens read from cache every call). The three timed-out 50-detail attempts are not in the gateway's ledger; the provider was most likely still generating when the gateway abandoned each call, so they cost roughly $0.15–0.20 each and delivered nothing.
7. **On the local stack the gateway's own round trips cost 50–70 ms in total** (`Server-Timing` minus model time). That is a local number; hosted Postgres and Auth will be slower, but it suggests the server's 12–14 serial trips are not where seconds go.

**What this changes in `05` and `06`:** the output-budget continuation (`05` §4.4) is necessary but is not the first problem; **per-call output must be bounded below the timeouts**, which means the batch size per call is set by time (about 12–15 proposals ≈ 20–25 s) rather than by tokens, with continuation or windows behind it; and the client timeout must exceed the server's. The second pass for omissions (`05` §4.3) has a measured case to justify it. Candidate values are updated in `06` §2 and §5 and remain candidates.

---

## 2. Method

- **Where:** the local Supabase stack (Colima; `npx supabase status` API at `127.0.0.1:54321`), this branch's ai-gateway run directly with `deno run` on port 8000 (the README's "a branch's own ai-gateway" recipe), pointed at a **private copy of the model stub** on port 8791 in record mode, which forwards each request unchanged to the provider's Messages API and saves the structured reply. The shared stub on 8790 and the shared `functions serve` were not touched. Both private processes were stopped by PID afterwards.
- **What:** the gateway as it is on `main` `9ad5e6d` (prompt `relationship_extract/v6`, `MAX_ITEMS = 8`, `maxTokens 8000`, `timeoutMs 45_000`, SDK `maxRetries 1`). `AI_DAILY_LIMIT` was raised to 200 for the local gateway process only so the quota could not interfere.
- **Accounts:** one fresh local account per (story, run), 21 in all, each with the dogfood flags, AI consent recorded in `user_settings`, and the same eight-person roster (Susan, Chris, Ben, Priya, Maya, John, Lena, Dad) and **no prior memories**, so no run saw another's dossier. Captures were inserted as `source: text` with the story's context person where the story has one, then understood by one gateway call each, as the phone would.
- **Stories:** synthetic, fictional people, written for this calibration (appendix). Seven stories × three runs. The S-series as specified in `05` §5 except: S-trunc, S-timeout and S-resume need a changed budget, timeout or an interrupted gateway and were not run (no code or configuration change was authorised); S50 produced a natural timeout instead.
- **Recorded per run:** the gateway's reply (saved, held, tier, clarification), the `ai_calls` row (tokens, latency, outcome, counts, drop reasons), the memory items and their spans, the review row, the capture's status, the raw model reply (proposals, `stop_reason`, usage, latency) from the stub's recording, and wall-clock time at the caller.
- **Tally:** a per-sentence map built from spans (extracted), raw proposals not kept (excluded), and sentences with no proposal, with a crude lexicon flag for "clear meaning" that the analyst then checked by hand. The sentence splitter is a simple punctuation split; the gateway's own sentence logic was not used.
- **Statistics:** n = 3 per cell. These numbers describe one afternoon's API speed and three samples per story; they support fits and ordering, not percentiles.

---

## 3. Results

### 3.1 Per run

| story | run | details | chars | sentences | proposals | saved | held | **dropped** | tier | in tok | cache read | out tok | tok/proposal | model ms | server ms | caller ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S5 | 1 | 5 | 224 | 4 | 5 | 5 | 0 | 0 | confirm | 170 | 4564 | 1169 | 234 | 8600 | 8674 | 8675 |
| S5 | 2 | 5 | 224 | 4 | 5 | 5 | 0 | 0 | confirm | 170 | 4564 | 1169 | 234 | 8555 | 8601 | 8602 |
| S5 | 3 | 5 | 224 | 4 | 5 | 5 | 0 | 0 | confirm | 170 | 4564 | 1169 | 234 | 10507 | 10561 | 10562 |
| S8 | 1 | 8 | 426 | 8 | 8 | 5 | 3 | 0 | clarify | 228 | 4564 | 1916 | 240 | 13485 | 13550 | 13552 |
| S8 | 2 | 8 | 426 | 8 | 8 | 6 | 2 | 0 | confirm | 228 | 4564 | 1900 | 238 | 13429 | 13478 | 13479 |
| S8 | 3 | 8 | 426 | 8 | 8 | 6 | 2 | 0 | confirm | 228 | 4564 | 1900 | 238 | 13385 | 13444 | 13445 |
| S9 | 1 | 9 | 458 | 9 | 7 | 5 | 2 | 0 | confirm | 239 | 4564 | 1709 | 244 | 12328 | 12375 | 12376 |
| S9 | 2 | 9 | 458 | 9 | 7 | 5 | 2 | 0 | confirm | 239 | 4564 | 1709 | 244 | 13299 | 13340 | 13340 |
| S9 | 3 | 9 | 458 | 9 | 8 | 6 | 2 | 0 | confirm | 239 | 4564 | 1921 | 240 | 17931 | 17982 | 17983 |
| S15 | 1 | 15 | 641 | 8 | 13 | 7 | 1 | **5** | clarify | 322 | 4564 | 3140 | 242 | 22210 | 22279 | 22280 |
| S15 | 2 | 15 | 641 | 8 | 14 | 6 | 2 | **6** | clarify | 322 | 4564 | 3331 | 238 | 22494 | 22551 | 22552 |
| S15 | 3 | 15 | 641 | 8 | 14 | 6 | 2 | **6** | clarify | 322 | 4564 | 3325 | 238 | 22476 | 22531 | 22531 |
| S25 | 1 | 25 | 1086 | 16 | 25 | 4 | 4 | **16** | clarify | 480 | 4564 | 5877 | 235 | 38692 | 38752 | 38752 |
| S25 | 2 | 25 | 1086 | 16 | 25 | 4 | 4 | **16** | clarify | 480 | 4564 | 5910 | 236 | 38829 | 38876 | 38877 |
| S25 | 3 | 25 | 1086 | 16 | 25 | 4 | 4 | **16** | clarify | 480 | 4564 | 5906 | 236 | 40376 | 40431 | 40432 |
| S50 | 1 | 50 | 3060 | 44 | — | 0 | 0 | — | **503 timeout** | — | — | — | — | 90398 | 90466 | 90467 |
| S50 | 2 | 50 | 3060 | 44 | — | 0 | 0 | — | **503 timeout** | — | — | — | — | 90437 | 90507 | 90508 |
| S50 | 3 | 50 | 3060 | 44 | — | 0 | 0 | — | **503 timeout** | — | — | — | — | 90389 | 90454 | 90454 |
| S-filler | 1 | 4 | 433 | 12 | 5 | 5 | 0 | 0 | confirm | 242 | 4564 | 1158 | 232 | 9085 | 9140 | 9141 |
| S-filler | 2 | 4 | 433 | 12 | 5 | 5 | 0 | 0 | confirm | 242 | 4564 | 1159 | 232 | 8830 | 8881 | 8882 |
| S-filler | 3 | 4 | 433 | 12 | 5 | 5 | 0 | 0 | confirm | 242 | 4564 | 1164 | 233 | 8620 | 8675 | 8676 |

Every drop reason was `too_many_items`. Every completed call ended with `stop_reason: end_turn` (the output budget was never reached). `held` counts items held for a "Remember" or a question; `tier` is the note's tier.

### 3.2 The four categories per story (run 1; runs 2 and 3 agree except where noted)

| story | 1 · processed | 2 · extracted (sentences with a kept or held line) | 3 · excluded by a rule | 4 · unprocessed or omitted | what the user would have seen |
|---|---|---|---|---|---|
| S5 | all 4 sentences | 4 of 4 (5 lines) | none | none | "Kept for Chris" + a look-over (pronouns) |
| S8 | all 8 | 8 of 8 (8 lines; 3 held: two sensitive, one ambiguous) | none | none | a sheet: "Remember this?" ×2, "Who is this about?" ×1 |
| S9 | all 9 | 8 of 9 (7–8 lines) | none | **1 omitted** ("she finally fixed her bike", all three runs) | "Kept for Priya", nothing about the bike |
| S15 | all 8 | 5 of 8 (8 lines; 1 held) | none by a rule | **3 sentences lost to capacity** (the physio promise; the A's game; ceramics, the wheel class and the ask), runs 2–3 also lost Friendsgiving | a question about "his knee", then "Kept"; nothing about the four or five lost details |
| S25 | all 16 | 7 of 16 (8 lines; 4 held) | none by a rule | **9 sentences lost to capacity** (Ben's job and nerves; Ben and Lena expecting; Maya's programme, start and commute; bouldering; the Mission Peak hike and Half Dome; John's party, the surprise and the cake; Portuguese; the user's intention) | questions about Pedro and two pronouns, then "Kept"; nothing about sixteen lost details |
| S50 | **none** | 0 | — | **all 44 sentences** (two 45-second model timeouts per run) | after six retries: "Couldn't understand this one. Your note is saved." |
| S-filler | all 12 | 5 of 12 (5 lines) | filler sentences had no proposal, correctly | none (the walk became a moment; "saw Maya today" is a conversation, not a memory) | "Kept for Maya" |

### 3.3 Fits

- **Output per proposal:** 232–244 tokens, mean ≈ 236, independent of story length (the schema's fixed fields dominate).
- **Model latency vs output:** `model_ms ≈ 1,750 + 6.4 × output_tokens` (S5 mean 9.2 s at 1,169; S8 13.4 s at 1,905; S15 22.4 s at 3,265; S25 39.3 s at 5,898; each within ~0.5 s of the line). Equivalently **≈ 1.75 s + 1.5 s per proposal**. A one-item note (~300–400 tokens) lands at 3.7–4.3 s by this fit.
- **Where the bounds fall on this fit:** client timeout 30 s → ~4,400 tokens → **~19 proposals**; server model timeout 45 s → ~6,800 tokens → **~29 proposals**; `maxTokens 8000` → ~53 s → **~34 proposals** (never reached before the timeout). With the SDK's one retry, a timed-out call costs 90 s of wall clock before the 503.
- **Gateway overhead on the local stack:** 47–70 ms beyond the model, across all 18 completed calls.
- **Caller-side overhead** (the runner's HTTP to the local gateway): 1–3 ms.

### 3.4 Observations on quality (below the cap)

- No wrong-subject kept line in 56 kept lines across 18 runs (analyst's read against the stories; not an eval grade).
- Relatives: "Susan's mom is visiting", "Susan's mom just retired", "Susan's dad had a fall" filed as related, held or confirmed; never on Susan.
- Newcomer: Pedro held with "new_person"; in S25 the line "Susan's partner Pedro got a job…" proposes a `partner` relation from "set a date for the wedding", a reasonable reading that is nonetheless an inferred relation word; it was held, so the user decides. Worth a fixture.
- Sensitive: anxiety, a fall, a knee all held; "started at a new clinic" raised to health (false positive; fails safe).
- Dates: "this fall", "next spring", "in June", "around his birthday" kept coarse; October 6, October 24 kept as days; no precision raised.
- Shared memories: "You, Susan and Ben are doing Friendsgiving … Susan is bringing her pie" became one shared line (K4); "Ben and Susan went to the A's game" was lost to capacity in every run, so the shared-memory-between-two-friends case went untested.
- Within-note change: "Susan moved to Alameda in the spring, then in June she moved again, to Oakland" → one line "Susan moved to Oakland in June" (the model folded the sequence; the Alameda residence was never proposed). Correct current truth; no history recorded. The S25 story's purpose for the comparator (two residence lines in order) did not arise because the model pre-merged.
- Clarifications: S8 asked "Who is this about?" for "We're also thinking about doing the Point Reyes hike together" (person_ambiguous despite Priya as context person); S15 asked about "his knee" (pronoun_multiple with Susan and Ben named before). Both are rule outcomes; both are the kind of question `01` counts as burden.
- Omission: the bike (S9) in 3/3 runs. The model merged "pottery show" with "asked if I'd come" into one line in all S9 runs and most S8 runs; that is a merge, not a loss.

---

## 4. What this means for the research documents

| Document | Change |
|---|---|
| `02` §3, §4 | **Model time is output-bound: ≈ 1.75 s + 1.5 s per memory on this day's API.** The "model is the floor" statement needs that qualifier: the floor rises with the number of things told. The recorded production p50 (3.2 s) is the one- or two-item case. The server's own trips are tens of milliseconds locally. |
| `05` §2.7 | The worst path for long stories is **timeout before output budget**: paths 4 and 1 swap places above ~19 proposals. The 25-detail story would fail on the phone today by the client timeout, not by the cap. |
| `05` §4.4 / `06` §5.3–5.4 | Continuation on `max_tokens` alone would not have rescued S50; **the per-call output must be bounded by time**, with continuation or windows behind it. |
| `05` §4.3 / `06` §5.5 | The second pass has a measured case (the bike, 3/3). |
| `06` §2, §5.6, §6, §7 | Candidate values updated from the fit (§5 below), still candidates. The client timeout must exceed the server's regardless of anything else. |
| `01` §8 | Story-first copy today is honest up to roughly **eight details or about four to six sentences**; at the S15 density (two details a sentence) a six-sentence story already loses lines. |
| `04` §5 metrics | "Useful memories per minute of effort" now has a model-side cost to set against: ~1.5 s of waiting per memory told, before any app overhead. |

---

## 5. Candidate values from the calibration (for `06`; not chosen)

| Value | From | Candidate | Note |
|---|---|---|---|
| Output tokens per proposal | 18 calls | ~236 | stable ± 5% |
| Model time per proposal | the fit | ~1.5 s (+ ~1.75 s per call) | one day's API speed; re-measure before setting anything |
| `BATCH_BOUND` (proposals per call) | time, not tokens | **12–15** (≈ 20–25 s per call) | leaves margin under a 30 s client timeout once it exceeds the server's; the 8,000-token budget is irrelevant at this size |
| `WINDOW_THRESHOLD` | the density of the S-series (≈ 1.5 details per sentence) | notes likely to carry more than ~12 details: **about 8–10 sentences or ~500–600 characters** at this density | density varies by writer; the threshold should be in proposals expected, estimated from sentences, and conservative |
| `WINDOW_SIZE` | as above | ~6–8 sentences | with one sentence of overlap |
| `CONTINUATIONS_MAX` | S25 and S50 sizes | 2–3 for a single-call note before windows take over | |
| Client / server timeouts | the fit | client ≥ server + 5 s; server sized to the batch bound (e.g. 35 s for 15 proposals) | a 45 s server timeout with a 30 s client is the wrong way round today |
| Second pass | S9 | run when any sentence passes the meaning floor with no proposal | the bike would have been caught |
| Cost | list prices | ≈ $0.0047 per proposal + ≈ $0.001 cache read per call | a 25-detail story ≈ $0.13 in one or two calls; the same story failing by timeout ≈ $0.15–0.20 per attempt for nothing |

---

## 6. Addendum (19 Oct, later): targeted probes for the founder's review

Eight short synthetic notes, two runs each, same method (fresh accounts, the current gateway, the live model via the private recording stub; both processes stopped afterwards). Purpose: the coverage-granularity counterexample and the omission question in the founder's review. Cost ≈ $0.35 at list prices.

| probe | note | details | saved + held | spans | result |
|---|---|---|---|---|---|
| P1 compound, two facts | "Ben started a new job at Stripe on October 13 and he's nervous about the on-call rotation." | 2 | 2 + 0 (2/2 runs) | clause-level: "Ben started…October 13" / "he's nervous about the on-call rotation" | fully split |
| P2 compound, three facts | "Susan has been obsessed with ceramics lately; she signed up for a wheel class on Thursdays and she wants me to come to one." | 3 | 3 + 0 (2/2) | three clause spans | fully split |
| P3 compound with a relative's sensitive fact | "Maya got into the UCSF nursing programme, she starts in January, and her sister is getting divorced." | 3 | 0 + 3 (2/2) | three clause spans; all three held (the divorce is a relative's and sensitive; the programme lines were held with it) | fully split; held |
| P4 bike paraphrase at the end | S8 + "She also got her bike fixed at last." | 9 | 5 + 2 (2/2) | the bike sentence **uncovered** both runs | omitted |
| P5 bike paraphrase, no pronoun, no name | S8 + "Oh, and the bike is finally working again." | 9 | 5 + 2 (2/2) | **uncovered** both runs | omitted |
| P6 bike moved to the front | "Priya finally fixed her bike." + S8 | 9 | 5 + 2 / 6 + 2 | **uncovered** both runs | omitted: position does not matter |
| P7 bike alone | "Saw Chris today. He finally fixed his bike." | 1 | 1 + 0 (2/2) | "He finally fixed his bike." | **kept** when alone |
| P8 compound with a held clause | "Ben ran a half marathon on Sunday and he wants to break two hours next time, though his knee has been bothering him." | 3 | 2 + 1 (2/2) | three clause spans; the knee held (sensitive) | fully split |

**Readings.**
- On short notes the model splits compound sentences into clause-level spans every time, so span-level coverage can see a clause that is left out when one is.
- The bike is omitted in every long-note variant (6/6 runs) and kept when alone (2/2): a relevance judgement the model makes in a dense note, which the system cannot tell from a miss. Nothing in the reply or on the phone shows it.
- **The sentence-level counterexample is in the calibration itself (S25, 3/3 runs):** "Susan moved to Alameda in the spring, then in June she moved again, to Oakland." produced one line whose span is only "then in June she moved again, to Oakland"; at the sentence level the sentence counts as extracted, at the span level "Susan moved to Alameda in the spring" is uncovered (run 1's statement, "Susan moved to Oakland in June", carries no trace of it; runs 2–3 mention Alameda in the statement but still quote only the Oakland clause). A second, span-invisible case: "Chris is training for the Oakland marathon; his race is around his birthday" was quoted whole and became "Chris is training for the Oakland marathon, around his birthday", a conflation no coverage model can see.
- **The meaning floor as proposed in the first draft of `06` misses the bike** ("And she finally fixed her bike." has no roster name, kin, promise, milestone, date or event word) in every run and **flags filler** ("The coffee at that new place is pretty good." via "coffee"); adding pronouns catches the bike but flags "We talked about all sorts of things." Offline test over every sentence that had no proposal in the calibration (`floor.mjs`, scratchpad).

## 7. Limits of this evidence

- n = 3 per story; one afternoon; the provider's speed varies by day. The slope is the robust part; the intercept and the exact ceilings will move.
- The timeout paths were observed only in their natural form (S50). S-trunc, S-timeout and S-resume remain to be run once the brief's path exists on a branch.
- Fresh accounts with empty dossiers: nothing here measures merge or supersede against existing memory, nor the dossier's size effect on input tokens or latency (input was 170–480 tokens plus the cached prompt).
- The per-sentence map used a simple splitter and a lexicon flag; the analyst checked every flagged sentence by hand, but this is not the eval grader.
- Nothing was run on a phone or the simulator; app and sync overhead are outside this file (`02` §5.3 is still the native benchmark).

---

## Appendix · The S-series stories (synthetic; fictional people; written for this calibration)

Roster on every account: Susan, Chris, Ben, Priya, Maya, John, Lena, Dad.

**S5** (context: Chris; 5 details) · "Chris just got promoted to engineering manager. He's excited but nervous about managing people. He and Dana might move to Marin next summer, and I told him I'd introduce him to Alex. He also just adopted a dog called Fluffy."

**S8** (context: Priya; 8) · "Priya started at a new clinic on October 6. She's working night shifts and she hates them. Her pottery show is on October 24. She's been getting into trail running lately. She told me she's been dealing with anxiety again and is seeing someone about it. She wants to visit her parents in Pune over Christmas. She asked if I'd come to the pottery show. We're also thinking about doing the Point Reyes hike together in November."

**S9** (context: Priya; 9) · S8 + "And she finally fixed her bike."

**S15** (context: Susan; 15) · "Susan is getting married to Pedro this fall and she's stressed about finding a venue. She asked if I'd come to a tasting with her next month. Her mom is visiting from Ohio next week; her mom just retired. Ben ran a half marathon on Sunday and he wants to break two hours next time, though his knee has been bothering him. Susan, Ben and I are doing Friendsgiving at my place in November, and Susan is bringing her pie. I told Ben I'd send him my physio's number. Ben and Susan went to the A's game together last week. Susan has been obsessed with ceramics lately; she signed up for a wheel class on Thursdays and she wants me to come to one."

**S25** (no context person; 25) · "Susan moved to Alameda in the spring, then in June she moved again, to Oakland. She and Pedro have set a date for the wedding, sometime next spring. Pedro got a job at a bakery in Berkeley. Susan's dad had a fall last month and is still recovering. Chris is training for the Oakland marathon; his race is around his birthday. Chris and I are planning a climbing trip to Bishop in the spring and I told him I'd book the campsite. He said he'd send me the gear list by Friday. Ben started a new job at Stripe on October 13 and he's nervous about the on-call rotation. Ben and Lena are expecting in March, and Lena is going part-time after the baby. Maya got into the UCSF nursing programme! She starts in January and she's worried about the commute. Maya and Ben are both into bouldering. Maya, Chris and I did the Mission Peak hike last Saturday, and Maya wants to do Half Dome next year. John's birthday party is on November 2; he wants it to be a surprise for his wife and he asked me to bring the cake. John has been learning Portuguese. I want to make more time for John this winter."

**S50** (no context person; ~50 details, 44 sentences, 3,060 characters) · "It's been a full month. Susan moved to Alameda in the spring and then in June she moved again, to Oakland, into a place with a tiny garden she's obsessed with. She and Pedro set a date for the wedding, sometime next spring, probably May. Pedro got a job at a bakery in Berkeley and he's been bringing us bread every week. Susan asked if I'd help her pick a venue; we're going to look at two places in Napa on November 8. Her dad had a fall last month and is still recovering, and she's been driving up to Sacramento every weekend to see him. She's stressed about money because of the wedding. She started a wheel class on Thursdays and she loves it. Chris is training for the Oakland marathon; his race is around his birthday, in December. He and Dana might move to Marin next summer. He got promoted to engineering manager and he's nervous about managing people. I told him I'd introduce him to Alex. He said he'd send me the gear list for Bishop by Friday, actually by Thursday, he changed it. Chris adopted a dog called Fluffy and Fluffy had a vet appointment last week; the vet says she'll make a full recovery from the ear thing. Chris and I are planning the Bishop climbing trip for the spring and I said I'd book the campsite. Ben started a new job at Stripe on October 13. He's nervous about the on-call rotation. Ben's new job at Stripe started on the 13th and he's been working late a lot. Ben and Lena are expecting in March, and Lena is going part-time after the baby. Ben's knee has been bothering him again and he's seeing a physio on Tuesdays. Ben wants to run the Turkey Trot with me anyway. Lena got her green card finally! She wants to visit her family in Lisbon in February. Lena and Susan have become close; they go to the farmers market together on Saturdays. Maya got into the UCSF nursing programme and she starts in January. She's worried about the commute from the East Bay. Maya and Ben are both into bouldering and they've been going to the gym in Berkeley together. Maya, Chris and I did the Mission Peak hike last Saturday and Maya wants to do Half Dome next year. Maya's sister is getting divorced and Maya has been helping with her nephews. Maya asked me to help her move on November 15. John's birthday party is on November 2; he wants it to be a surprise for his wife and he asked me to bring the cake. John has been learning Portuguese for a trip to Brazil in the spring. John and I are going to the Warriors game on November 20. John said he'd send me his contractor's number. Priya started at a new clinic on October 6 and she hates the night shifts. Her pottery show is on October 24 and she asked if I'd come. She's been dealing with anxiety again and is seeing someone about it. Priya wants to visit her parents in Pune over Christmas. Dad is having his hip surgery on November 12. He's nervous about it but the doctor is optimistic. I want to see him more this winter. I started therapy myself in September and it's helping. I'm running the Turkey Trot on Thanksgiving with Ben. I told Dad I'd drive him to the hospital."

**S-filler** (context: Maya; 4 details in 12 sentences) · "So I saw Maya today. It was nice out, finally. We walked around the lake for a bit. Anyway, she got into the UCSF nursing programme, which is amazing. She starts in January. We talked about all sorts of things. The coffee at that new place is pretty good. We're getting coffee again on Saturday. Traffic on the way back was awful. I said I'd send her the apartment listing I saw. Nothing much else to report. It was a good afternoon."

**Kept lines, run 1 (the gateway's statements, verbatim):**

- S5: Chris got promoted to engineering manager · Chris is excited but nervous about managing people · Chris and Dana might move to Marin · You told Chris you'd introduce him to Alex · Chris adopted a dog called Fluffy.
- S8: Priya is working night shifts and hates them · Priya's pottery show is on October 24 · Priya has been getting into trail running lately · Priya wants to visit her parents in Pune over Christmas · Priya asked if you'd come to her pottery show · Priya started at a new clinic on October 6 (held, raised to health) · Priya has been dealing with anxiety again and is seeing someone about it (held) · You and Priya are thinking about doing the Point Reyes hike in November (held: who?).
- S9: as S8 with the show and the ask merged into one line; the bike absent.
- S15: Susan is getting married to Pedro · Susan is stressed about finding a wedding venue · Susan asked if you'd come to a tasting with her · Susan's mom is visiting from Ohio · Susan's mom just retired · Ben ran a half marathon and wants to break two hours next time · You, Susan and Ben are doing Friendsgiving at your place in November; Susan is bringing her pie · Ben's knee has been bothering him (held: whose?). Lost: the physio promise; the A's game; ceramics, the wheel class, the ask.
- S25: Susan moved to Oakland in June · Susan and Pedro's wedding is set · Chris is training for the Oakland marathon, around his birthday · You and Chris are planning a climbing trip to Bishop in the spring · Susan's partner Pedro got a job at a bakery in Berkeley (held: new person) · Susan's dad had a fall and is still recovering (held: sensitive) · You told Chris you'd book the campsite (held: whose?) · Chris said he'd send you the gear list (held: whose?). Lost: sixteen proposals covering nine sentences.
- S-filler: Maya got into the UCSF nursing programme · Maya starts the UCSF nursing programme in January · You and Maya walked around the lake · You and Maya are getting coffee again · You said you'd send Maya the apartment listing you saw.
