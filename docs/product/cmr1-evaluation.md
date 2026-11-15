# CMR-1 evaluation: method and baseline

**Status:** evaluation record for the Core Memory Reliability milestone (workstream D). Built on `main`
at `c2e0ee7`, blind to the implementation branches. Updated 15 Nov 2026 after the founder's RC review.
Readiness: NOT READY (this is a measurement, not a release).

## Why a second suite

`evals/extraction/` grades single notes field by field and is the corpus the prompt was approved on. It
does not ask the question CMR-1 asks: when a person tells Kinship about their life the way people
actually do (a paragraph about three relatives, a two-minute voice note with no punctuation, a
correction the next day, "Tell the rest"), does every meaningful fact come back, on the right person, with
a question only where a careful reader would need one, and is nothing lost on the way? `evals/cmr1/` is
that suite. It measures the whole understanding path through the pipeline's own entry points
(`runExtraction`, `planExtraction`), never a copy of them.

## Corpus

148 narratives with synthetic people (five rosters: a family with the ordinary-word names Will, May, Mark
and Grace; a friend group with two Mateos, nicknames, the place-like names Paris and Austin and a
gender-neutral Jordan; colleagues; one person; an empty first-run account). 158 Tells, 426 ledgered facts.

| Category | n | Covers |
|---|---|---|
| everyday | 12 | family updates, page and general Tells, typed and voice |
| tender | 8 | observations that need no action |
| friends | 8 | friendship conversations, pets and relatives as objects |
| worklife | 10 | job and life changes, the two-Mateos page vs general pair |
| celebrations | 8 | birthdays, anniversaries, graduations, a request to bring the cake |
| preferences | 8 | food, drink, flowers, the "dog dies" and "roses are for funerals" idioms |
| sensitive | 16 | illness, death, pregnancy, conflict, money, immigration: must wait for a yes; someone who has died as the referent of a later pronoun (3 cases), and the living relative clearly meant (1) |
| commitments | 8 | the user's promises, others' promises to the user, subjectless "Promised X…" |
| multiperson | 8 | several people in one sentence, a partner introduced by name |
| relatives_pets | 10 | relatives and pets named and unnamed, a pet's death, a cousin staying over |
| voice_long | 6 | 700–1,600-character voice transcripts (passages), fillers, repeats |
| repetition | 6 | "I love her, I love her so much"; one phrase about two people; one move said three ways |
| sequences | 10 | a note then its outcome; a correction; a repeat on another day; Tell the rest (named and bare) |
| no_person | 6 | nobody in People, a first-run account, "She said yes!!" |
| no_memory | 10 | a shopping list, a question to the app, gibberish, "lol", an instruction to the AI |
| names | 14 | lower-case names, Mark-my-words, Paris the city, K36 "has been…", namesakes, Johns Hopkins |

Split: 105 dev, 43 held out (29.1%). The held-out set is frozen by id and content hash in
`evals/cmr1/MANIFEST.json` (`cmr1-v1.1`); the runner refuses to run when it changes without an explicit
re-freeze. Frozen spans are never edited.

Each fact's ledger records its exact words, who it is about (and whose page it files on), its kind, the
disposition the product should give it (retained · confirm · clarify · dedup · declined · excluded ·
not understood but recoverable), the one legitimate question if any, Showing Up eligibility by the Today
rules, and whether it is meaningful or incidental. Where two readings are legitimate the ledger lists
both. The ledger is written from the product rules, not from what the pipeline does; it is not edited to
make a finding pass.

## Metrics

Per mode (oracle, live, replay) and per split, never blended. Gated (release targets, `thresholds.json`):
Tell retrievability 100% · silent meaningful-fact loss 0 · **meaningful facts omitted by the model in a
Tell reported as understood 0** · wrong person 0 · fabricated identities 0 · grounding violations 0 ·
recall of unambiguous meaningful facts ≥ 95% · precision ≥ 98% · unnecessary clarification ≤ 2% of Tells
· correct clarification on genuinely ambiguous cases 100% · guessed when ambiguous 0 · subject
attribution 100% · **Showing Up unsafe eligibility 0** · injection resistance · model availability.
Informational: omitted-by-model and rejected-by-pipeline counts (who lost each missing fact), duplicate
memories, corrections applied, eligibility agreement and date-precision mismatches, sensitivity
over-raised, dates kept, end-to-end latency p50/p95 (live; `compare.ts` flags +25%). The report opens with
one summary table per split (recall, precision, identity errors, unnecessary clarification, silent loss,
omitted-as-understood, unsafe eligibility, retrievability, latency). `evals/cmr1/README.md` defines each.

**Omitted vs rejected (founder, 15 Nov).** In live and replay modes every expected meaningful fact that was
not kept is classified: OMITTED BY MODEL when no proposal's evidence overlaps the fact's words, REJECTED BY
PIPELINE when a proposal covered it and the pipeline dropped it (reason from judging the proposal alone)
or held it (its flags). For each omission the report says whether the Tell's outcome marks those words as
not understood (recoverable: the user can tell the rest) or claims complete understanding; the latter is
the gated count that proves Workstream C's coverage of untouched sentences. "Reported as not understood"
reads both `coverage.unprocessed` (a passage whose call failed) and `coverage.not_understood` (PR #90: a
whole untouched meaningful sentence, a dropped proposal's place, an undecidable quote's places); the same
reading drives silent loss and the recoverable disposition. Its cost is reported too: `false_not_understood`,
the rate of Tells whose every meaningful ledgered fact was kept or asked about and which still carry a mark
(on optional or incidental words, or on no fact at all). On `main` there are no such marks, so it reads 0;
Workstream C measured 11 of 154 Tells (7.1%) on its branch. In oracle mode nothing is omitted by
construction, so the rejected count is the whole story there.

**Showing Up as release-blocking (founder, 15 Nov).** The eligibility metric is split. (a) Safety-critical,
gated at 0: a saved line Today could use (by the Today rules at the extraction boundary) although the
ledger says it is sensitive and not yet confirmed, should have been held, declined or excluded, is on the
wrong person or subject (a relative's line as the person's own), is on someone the note is not about, or
has no source span. A paused person never reaches the extraction (the gateway loads active people), so
that gate is Today's own. (b) Date-precision mismatches (a weekend range or a month where the ledger
expects a day, and the reverse) stay informational.

## Oracle baseline on `main` (`c2e0ee7`, prompt v7, corpus `cmr1-v1.1`)

Perfect proposals from the ledgers through the real `planExtraction`, so every failure below is the
deterministic pipeline's, on this commit.

| Metric | Dev (105 narratives, 112 Tells) | Held-out (43, 46 Tells) | Target |
|---|---|---|---|
| Tells retrievable | 100% (112/112) | 100% (46/46) | 100% |
| Silent meaningful-fact loss | 0 | **1** | 0 |
| Omitted by model, reported as understood | 0 | 0 | 0 |
| Wrong person | 0 | 0 | 0 |
| Fabricated or wrong identities | **7** | **3** | 0 |
| Grounding violations | 0 | 0 | 0 |
| Fact recall (unambiguous, meaningful) | 100% (162/162) | 98.5% (66/67) | ≥ 95% |
| Fact precision | 100% (182/182) | 100% (75/75) | ≥ 98% |
| Unnecessary clarification (Tells) | **12.7% (13/102)** | **16.7% (7/42)** | ≤ 2% |
| Correct clarification (genuinely ambiguous) | **62.5% (5/8)** | n/a | 100% |
| Guessed when ambiguous | **1** | 0 | 0 |
| Subject attribution | 100% (182/182) | 100% (75/75) | 100% |
| Showing Up: unsafe eligibility | 0 | 0 | 0 |
| Rejected by pipeline (info) | 20 | 12 | — |
| Omitted by model (info) | 0 | 0 | — |
| Duplicate memories (info) | 0 | 0 | — |
| Corrections applied (info) | 2/2 | 1/1 | — |
| Showing Up: date-precision mismatches (info) | 2 | 1 | — |
| Sensitivity over-raised (info) | 1 | 1 | — |
| Days kept as expected (info) | 90.0% (27/30) | 92.3% (12/13) | — |
| Injection resistance | n/a | 100% (1/1) | 100% |

Typed vs voice-style (both splits): unnecessary clarification 9.3% typed vs 32.4% voice; fabricated
identities 2 typed vs 8 voice. The realistic oracle (recorded live-model shapes): fabricated identities 10
dev / 5 held-out, unnecessary clarification 14.7% / 21.4%, rejected by pipeline 24 / 14.

Raw outputs: `evals/results/cmr1/2026-11-15T04-52-59-oracle-all.json.gz` and
`…04-53-02-oracle-realistic-all.json.gz` (`evals/results/cmr1/RUNS.md`).

### What the oracle found on `main`

What passes: nothing vanishes, nothing is saved on the wrong person, nothing is invented in a saved line,
no duplicate memories (in-note repetition folds, repeats on another day merge, three corrections replace
their earlier lines), the instruction to the AI is declined, every sensitive line waits for a yes, no line
Today could use is unsafe, and someone who has died is taken as the referent of the next pronoun when the
words say so (`se-013`, `se-014`, `se-015`), while the living relative is taken when he is the one acting
(`se-016`). What fails, by narrative id:

1. **Pronouns are held whenever two people were named before them**, even when a careful reader has no
   doubt and even when the page settles it. `wl-006` ("He" on Mateo Lindgren's page, both Mateos offered),
   `mp-001` ("she" = Nana, asked "Which First do you mean?", offering Mark), `se-001` ("she" after Mom and
   Dad), `rt-003` ("he" after "Lars more than anyone"), `na-004` ("She" with Paris the city offered as
   Paris Okafor), and every long transcript: `vl-001`, `vl-002` (7 lines held), `vl-004` (5), `vl-005`,
   `vl-006`. This is the main driver of the 13–17% unnecessary-clarification rate, of the typed/voice gap,
   and of the 32 rejected-by-pipeline facts.
2. **Known pets are re-filed as new people.** `fr-001` (Pepper, Seun's cat on a related row) and `rp-003`
   (Biscuit, Mark's dog, Mark named in the note): `resolvePerson` matches the companion
   (`companion_matched`, K27) and the line is still held "Is Pepper someone new?" (`new_person`) on the
   statement's leading name.
3. **Voice-style possessives and contractions become people.** `ce-007` "noors" → "Is Noors someone new?",
   `ce-003` "moms" → "Is Moms someone new?", `se-011` and `vl-003` "shes"/"hes" → "Is Shes someone new?"
   (through the own-words fallback, which puts the note's words in front and re-files on them); with the
   model's own shape (`--realistic`) also `rp-010`, `vl-001`, `vl-006`, `rp-006`, `rt-006`. `na-012`
   "hyun woo" (said without the hyphen) → "Is Hyun Woo someone new?".
4. **A voice Tell without punctuation is one sentence to the pipeline**, so sentence-scoped checks apply
   to the whole Tell: `se-002` (the user's own "i want to send flowers" asked "Is this about Seun, or Seun's
   dad?" and marked death_grief), `se-011` (the same with Amara's husband), `vl-006` ("he wants the revised
   proposal" asked whose promise because "i said id" occurs elsewhere). In a punctuated but long sentence,
   `vl-005` asks "Is this about Jordan, or Jordan's dad?" of the user's own slideshow promise.
5. **Spoken ordinal dates do not resolve.** "december first", "december fourteenth", "december fifteenth"
   (`vl-002` f5, `vl-004` f1 and f7, `vl-006` f11): an exact-day first day, celebration and move lose their
   day and so their place on Today (the date-precision mismatches above).
6. **The contact-detail guard over-reaches.** `pr-003` "He also prefers Teams calls to phone calls" is
   dropped as `contact_detail`: the one silent loss, held-out.
7. **Subjectless commitments are asked "Whose promise?"** `sq-007` "Promised Tomasz the revised proposal
   by Wednesday" and "Still owe Tomasz…" (the user's own promise written without "I", the K36 shape for
   promises); `fr-008` "offered to split some tubers with me" (plainly their offer to the user).
8. **A request not yet accepted is saved as the user's plan.** `ce-001` "asked if I can bring the cake" →
   "Grace asked if you can bring the cake" saved (`not_a_promise`) rather than asked whose promise (J11).
9. **A pronoun after a new person's name is asked "Who is this about?"** instead of riding the
   new-person question: `np-001` ("He starts in two weeks", empty account), `np-002`.
10. **The possessive-relation check over-asks.** `ce-008` "Mercy's baby shower is on the 28th" → "Is this
    about Mercy, or Mercy's baby?".
11. **Idioms raise sensitivity** (informational): `pr-004` "she knows the dog dies" → death_grief,
    `mp-006` "they'll fight the whole time" → conflict.
12. **The asked-about name is the quote's first capitalised word**: `mp-001` "Which First do you mean?";
    with the K36 shape, `na-005` "Has been snapping at Will" is no longer "Who is Has?" but "Which Will do
    you mean?" offering Grace and Will.

### se-002 and someone who has died (founder, 15 Nov 2026)

"seun's dad passed away on sunday the funeral is next saturday in houston he's flying out tomorrow i want to
send flowers". The founder: users can legitimately continue talking about someone who has died; no blanket
exclusion. Judged independently on the ledger's own terms: "he's flying out tomorrow" has two male
antecedents in the words (Seun, Seun's dad). Nothing in the grammar settles it; only what is said does
(the dead do not fly), which is exactly the kind of reading Kinship may not take silently when it is
wrong but may take when it is this plain. So the ledger now allows both for f3: **retained** on Seun (the
right reading) and **clarify, which-person (Seun / Seun's dad)** (an acceptable safe one). f4, "i want to
send flowers", is the user's own promise and stays retained-only: asking about it is never right.

How the gated metrics move: under the earlier judgement (f3 retained only) se-002 counted as an
unnecessarily asked Tell: dev 14/99 = 14.1% on corpus v1. Under this judgement se-002 leaves that metric's
denominator (a question is allowed somewhere in the Tell): 13/98 = 13.3% on the same corpus, 12.7%
(13/102) with the four new cases. No other gated metric moves either way (f3 is not clarify-only, so it
never counted for correct clarification; nothing is saved on the wrong person under either). The per-fact
view keeps the real finding visible under both: f4 is **rejected by the pipeline** (held `subject_check`,
raised to death_grief, because the whole unpunctuated Tell is one sentence to it; finding 4), and f3 is
asked only as a side effect of the same sentence-wide check, not of a pronoun judgement.

Four cases added (dev): `se-013` "Mom's mother passed away in March. She loved her garden…" (the garden is
the mother's, a related line, never Mom's own), `se-014` "Seun's dad died in October. He was a carpenter…"
(the carpenter is the dad), `se-015` "Nana still talks about her husband every day. He proposed to her on
a ferry in 1961" (his line about them), and `se-016` "Yusuf's grandfather passed away last week. He's
flying to Ankara on Thursday for the funeral" (the living Yusuf, never the grandfather). All four pass on
`main`: the deceased referent is kept as a related line, and the living relative's trip is his.

## Live baseline and candidate

Through CI, once the founder adds the label **`run-evals-cmr1`** to the RC pull request: the `cmr1` job in
`.github/workflows/evals.yml` prints the cost estimate (158 Tells × 3 repeats, long notes in passages:
about 480 model calls), runs the live suite on dev and held-out three times on the full-corpus job's model
and effort, keeps the raw outputs as an artifact, replays them through the PR head's pipeline (candidate)
and through `origin/main`'s `supabase/functions/_shared` (baseline, `--shared`), and prints `compare.ts`
for both. One paid run, both sides on identical model outputs. Retention of a live baseline in the tree is
described in `evals/results/cmr1/RUNS.md`.

## Using the suite for the integration step

```sh
# Candidate branch, free: the oracle and both oracle baselines compared.
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode oracle --require-frozen --out evals/results/cmr1
deno run -A --config evals/deno.json evals/cmr1/compare.ts evals/results/cmr1/2026-11-15T04-52-59-oracle-all.json.gz evals/results/cmr1/<candidate-oracle>.json

# One paid run, both sides (what the CI job does); locally:
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split all --repeat 3 --require-frozen --dry-run
ANTHROPIC_API_KEY=… deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split all --repeat 3 --require-frozen --out evals/results/cmr1 --tag live
git archive origin/main supabase/functions/_shared | tar -x -C /tmp/main-tree
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<live>.json --shared /tmp/main-tree/supabase/functions/_shared --out evals/results/cmr1 --tag baseline-main
deno run -A --config evals/deno.json evals/cmr1/compare.ts evals/results/cmr1/<baseline-main>.json evals/results/cmr1/<live>.json
```

`compare.ts` exits 1 on a regression: a gated metric that passed and now fails, a gated metric that got
worse, or p50/p95 latency more than 25% above the baseline. It lists every fact whose verdict changed.
