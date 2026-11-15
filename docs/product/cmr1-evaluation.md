# CMR-1 evaluation: method and baseline

**Status:** evaluation record for the Core Memory Reliability milestone (workstream D). Built on `main`
at `c2e0ee7`, blind to the implementation branches. Readiness: NOT READY (this is a measurement, not a
release).

## Why a second suite

`evals/extraction/` grades single notes field by field and is the corpus the prompt was approved on. It
does not ask the question CMR-1 asks: when a person tells Kinship about their life the way people
actually do (a paragraph about three relatives, a two-minute voice note with no punctuation, a
correction the next day, "Tell the rest"), does every meaningful fact come back, on the right person, with
a question only where a careful reader would need one, and is nothing lost on the way? `evals/cmr1/` is
that suite. It measures the whole understanding path through the pipeline's own entry points
(`runExtraction`, `planExtraction`), never a copy of them.

## Corpus

144 narratives with synthetic people (five rosters: a family with the ordinary-word names Will, May, Mark
and Grace; a friend group with two Mateos, nicknames, the place-like names Paris and Austin and a
gender-neutral Jordan; colleagues; one person; an empty first-run account). 154 Tells, 414 ledgered facts.

| Category | n | Covers |
|---|---|---|
| everyday | 12 | family updates, page and general Tells, typed and voice |
| tender | 8 | observations that need no action |
| friends | 8 | friendship conversations, pets and relatives as objects |
| worklife | 10 | job and life changes, the two-Mateos page vs general pair |
| celebrations | 8 | birthdays, anniversaries, graduations, a request to bring the cake |
| preferences | 8 | food, drink, flowers, the "dog dies" and "roses are for funerals" idioms |
| sensitive | 12 | illness, death, pregnancy, conflict, money, immigration: must wait for a yes |
| commitments | 8 | the user's promises, others' promises to the user, subjectless "Promised X…" |
| multiperson | 8 | several people in one sentence, a partner introduced by name |
| relatives_pets | 10 | relatives and pets named and unnamed, a pet's death, a cousin staying over |
| voice_long | 6 | 700–1,600-character voice transcripts (passages), fillers, repeats |
| repetition | 6 | "I love her, I love her so much"; one phrase about two people; one move said three ways |
| sequences | 10 | a note then its outcome; a correction; a repeat on another day; Tell the rest (named and bare) |
| no_person | 6 | nobody in People, a first-run account, "She said yes!!" |
| no_memory | 10 | a shopping list, a question to the app, gibberish, "lol", an instruction to the AI |
| names | 14 | lower-case names, Mark-my-words, Paris the city, K36 "has been…", namesakes, Johns Hopkins |

Split: 101 dev, 43 held out (29.9%). The held-out set is frozen by id and content hash in
`evals/cmr1/MANIFEST.json`; the runner refuses to run when it changes without an explicit re-freeze.

Each fact's ledger records its exact words, who it is about (and whose page it files on), its kind, the
disposition the product should give it (retained · confirm · clarify · dedup · declined · excluded ·
not understood but recoverable), the one legitimate question if any, Showing Up eligibility by the Today
rules, and whether it is meaningful or incidental. Where two readings are legitimate the ledger lists
both. The ledger is written from the product rules, not from what the pipeline does; it is not edited to
make a finding pass.

## Metrics

Per mode (oracle, live, replay) and per split, never blended: Tell retrievability (100%), silent
meaningful-fact loss (0), wrong person (0), fabricated identities (0), grounding violations (0), recall of
unambiguous meaningful facts (≥ 95%), precision (≥ 98%), unnecessary clarification (≤ 2% of Tells),
correct clarification on genuinely ambiguous cases (100%), subject attribution, injection resistance,
model availability, and, informational, duplicate memories, corrections applied, Showing Up eligibility
against the ledger, sensitivity over-raised, dates kept, and end-to-end latency p50/p95 (live).
`evals/cmr1/README.md` defines each.

## Oracle baseline on `main` (`c2e0ee7`, prompt v7, corpus `cmr1-v1`)

Perfect proposals from the ledgers through the real `planExtraction`, so every failure below is the
deterministic pipeline's, on this commit.

| Metric | Dev (101 narratives, 108 Tells) | Held-out (43, 46 Tells) | Target |
|---|---|---|---|
| Tells retrievable | 100% (108/108) | 100% (46/46) | 100% |
| Silent meaningful-fact loss | 0 | **1** | 0 |
| Wrong person | 0 | 0 | 0 |
| Fabricated or wrong identities | **7** | **3** | 0 |
| Grounding violations | 0 | 0 | 0 |
| Fact recall (unambiguous, meaningful) | 100% (154/154) | 98.5% (66/67) | ≥ 95% |
| Fact precision | 100% (172/172) | 100% (75/75) | ≥ 98% |
| Unnecessary clarification (Tells) | **14.1% (14/99)** | **16.7% (7/42)** | ≤ 2% |
| Correct clarification (genuinely ambiguous) | **62.5% (5/8)** | n/a | 100% |
| Guessed when ambiguous | **1** | 0 | 0 |
| Subject attribution | 100% (177/177) | 100% (75/75) | 100% |
| Duplicate memories (info) | 0 | 0 | — |
| Corrections applied (info) | 2/2 | 1/1 | — |
| Showing Up eligibility matches the ledger (info) | 98.6% (144/146) | 98.4% (60/61) | — |
| Sensitivity over-raised (info) | 1 | 1 | — |
| Days kept as expected (info) | 89.7% (26/29) | 92.3% (12/13) | — |
| Injection resistance | n/a | 100% (1/1) | 100% |

Typed vs voice-style (both splits): unnecessary clarification 9.3% (10/107) typed vs 32.4% (11/34) voice;
fabricated identities 2 typed vs 8 voice. The realistic oracle (recorded live-model shapes) is worse in the
same places: fabricated identities 10 dev / 5 held-out, unnecessary clarification 16.2% / 21.4%.

Raw outputs: `evals/results/cmr1/2026-11-15T00-01-34-oracle-all.json.gz` and
`…-oracle-realistic-all.json.gz` (`evals/results/cmr1/RUNS.md`).

### What the oracle found on `main`

What passes: nothing vanishes, nothing is saved on the wrong person, nothing is invented in a saved line,
no duplicate memories (in-note repetition folds, repeats on another day merge, three corrections replace
their earlier lines), the instruction to the AI is declined, and every sensitive line waits for a yes.
What fails, by narrative id:

1. **Pronouns are held whenever two people were named before them**, even when a careful reader has no
   doubt and even when the page settles it. `wl-006` ("He" on Mateo Lindgren's page, both Mateos offered),
   `mp-001` ("she" = Nana, asked "Which First do you mean?", offering Mark), `se-001` ("she" after Mom and
   Dad), `rt-003` ("he" after "Lars more than anyone"), `na-004` ("She" with Paris the city offered as
   Paris Okafor), and every long transcript: `vl-001`, `vl-002` (7 lines held), `vl-004` (5), `vl-005`,
   `vl-006`. This is the main driver of the 14–17% unnecessary-clarification rate and of the typed/voice gap.
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
   to the whole Tell: `se-002` (every line asked "Is this about Seun, or Seun's dad?"; the flowers promise
   marked death_grief), `se-011` (the same with Amara's husband), `vl-006` ("he wants the revised proposal"
   asked whose promise because "i said id" occurs elsewhere). In a punctuated but long sentence, `vl-005`
   asks "Is this about Jordan, or Jordan's dad?" of the user's own slideshow promise.
5. **Spoken ordinal dates do not resolve.** "december first", "december fourteenth", "december fifteenth"
   (`vl-002` f5, `vl-004` f1 and f7, `vl-006` f11): an exact-day first day, celebration and move lose their
   day and so their place on Today.
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

## Live baseline

Pending: `ANTHROPIC_API_KEY` was not available where the suite was built. The command and retention rule
are in `evals/results/cmr1/RUNS.md`. The live run is what tells us how often the model gives the reading
the oracle assumes; the oracle findings above are independent of it.

## Using the suite for the integration step

```sh
# Candidate branch, free: the oracle and both oracle baselines compared.
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode oracle --require-frozen --out evals/results/cmr1
deno run -A --config evals/deno.json evals/cmr1/compare.ts evals/results/cmr1/2026-11-15T00-01-34-oracle-all.json.gz evals/results/cmr1/<candidate-oracle>.json

# A live baseline replayed through the candidate pipeline, free.
deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<live-baseline>.json.gz --tag candidate

# Candidate live run (dev, three repeats), then the comparison; held-out once, at the release candidate.
ANTHROPIC_API_KEY=… deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split dev --repeat 3 --require-frozen --out evals/results/cmr1
deno run -A --config evals/deno.json evals/cmr1/compare.ts evals/results/cmr1/<live-baseline>.json.gz evals/results/cmr1/<candidate-live>.json
ANTHROPIC_API_KEY=… deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split heldout --repeat 3 --require-frozen --out evals/results/cmr1
```

`compare.ts` exits 1 on a regression: a gated metric that passed and now fails, a gated metric that got
worse, or p50/p95 latency more than 25% above the baseline. It lists every fact whose verdict changed.
