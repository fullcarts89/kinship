# CMR-1 delivery: Core Memory Reliability release candidate

**15 Nov 2026. Candidate: branch `claude/cmr1-rc`.** Readiness label: **NOT READY** until the founder's acceptance
session (`cmr1-acceptance.md`) passes on a build and gateway that carry it; the candidate is **READY FOR FOUNDER
NATIVE PASS** in the sense of CLAUDE.md's labels once merged, migrated and deployed on the founder's yes. The record
of how it was built is `cmr1-handoff.md` §4b–4c; the plan to ship and undo it is `cmr1-release-plan.md`.

## A. Executive summary

**What changed.** Four workstreams, each a draft PR reviewed by an agent that did not write it, integrated on one
branch: voice assembled from the recognizer's own results instead of word-matching (K34 as a class); every retained
Tell has a place to be found and an honest line about where it is, backed by a durable outcome on the server
(K35 as a class); identity resolved from the note's own words with the model's reading validated, never overridden
by a capitalised first word (K36 as a class); a quote that appears twice placed by context instead of dropped;
every unexplained drop reported to the phone as not understood; spoken dates and unpunctuated spoken runs read
properly; a latent sync race that left a Tell on "Understanding…" (K37, found during this work); and an
independent evaluation corpus of 144 narratives with per-fact ledgers and a frozen held-out split.

**Which reliability problems were solved, on the evidence available here.** On the independent corpus, against
`main`: fabricated identities 7 → 0 (dev) and 3 → 0 (held-out); unnecessary clarification 14.1% → 0% and 16.7% →
0%; the eight genuinely ambiguous cases all ask the right question (was five); the one silent loss gone; wrong-person
saves and grounding violations stay at zero; recall 100% on both splits; no regression anywhere, in oracle and
realistic modes. Repeated evidence folds to one memory. Every Tell is accounted for (kept / nothing / partial / held
/ declined / failed) and findable.

**What remains unresolved.**
- No live-model run of the candidate: the key is on the environment but was not in this session's shell. All
  extraction evidence is deterministic (oracle, realistic oracle, replay of the approved baseline). The live
  baseline and the candidate's live run are the first thing to do when a session has the key.
- No simulator or device run: this environment has neither. K34's class fix rests on the recognizer's segment
  timing plus "nothing heard since", read from the module's source; the native pass must log one result stream
  across a pause.
- Eight product judgements were taken in code and are listed for the founder in §F below and in
  `approved-design-coverage.md`.
- Black-box: every suite passes on the candidate under its stated conditions; `k10` passes Monday to Friday only (the
  resolver reads "last Friday" said on a Sunday as last week's Friday and asks, per C-4) and notebook J1/J6 and J2
  are live-model tests awaiting the key. The stall first seen in this tier was a real latent app bug (K37), fixed.

**Ready for founder acceptance?** Yes, as a candidate: it is a working, reviewed, integrated branch whose every
runnable tier is green and whose independent eval meets every target. Acceptance itself needs the merge, the
migration, gateway v18 and a build, each on the founder's yes.

## B. Architecture and implementation

**Failure mechanisms before.** Voice: the app appended every "final" result and then removed any passage that
repeated word for word, so iOS 18's pause-then-Stop re-send doubled words and an intentional repetition could be
erased. Understanding: a note whose quotes appeared twice lost every line as `evidence_ambiguous`; a note that kept
no line said "Nothing to remember" and had no place; a note's outcome lived only on the device that told it.
Identity: `refileBySubject` treated the model's generated sentence as evidence and took its capitalised first word
as a name, so "Has been very clingy…" became someone called Has; everyday-word lists were the only guard; pronouns
were held whenever two people had been named earlier; known pets were re-asked as new people; "Which Mother?" came
from the first capitalised word of a quote. Sync: a Tell during an in-flight cycle joined it after its push.

**Now.** Three layers kept distinct: the Tell (the user's words, retained and findable whatever happens next), the
understanding (lines grounded in those words, each traceable, correctable, with every drop accounted for in
coverage), and Showing Up (unchanged rules, fed only by settled, grounded lines). Voice: a `Transcript` assembled
from the recognizer's event semantics (partials replace, finals settle one utterance, a repeat is dropped only when
it is the same utterance again). Identity: the model proposes referents; code validates them against the note's
own writing (a mid-sentence capital is a name however common; a lower-case word right after a subject is a verb;
a clause after a coordinator shares its subject) and never makes a person out of a word; a model "new" with one
roster match is shown for a glance, never auto-saved; pronouns ground on the nearest clause subject only when the
model agrees, with gender from the relationship label's head word; possessive-relation questions only when the
line's own clause could be about the relative. Evidence: a quote found more than once is placed by who the sentence
is about, the line's other quotes, or true repetition; otherwise it is reported as not understood, never guessed.
Outcome: `captures.understanding` written by the server, read in the app through one adapter that falls back to
the device-local state until the migration is live. Sync: one follow-on cycle for a call made mid-cycle; a note
found unpushed gets one more pass.

**Alternatives considered and rejected** (each recorded in the PRs): a prompt v8 with structured subject references
or disambiguating prefixes (a paid re-freeze, unvalidated without a live run, and the deterministic fix covers the
failure); assigning a repeated quote by the model's item order (a guess); holding on every model "new" with one
roster match (contradicts founder-pinned K7/H20); a dictionary or part-of-speech pass (unbounded, not grounded);
requiring the mention inside the item's own sentence for new people (breaks "Pedro came by. Said he's getting
married").

**PRs and code.** #89 `claude/cmr1-a-capture` (app: `src/platform/speech.ts`, `src/store/tellOutcome.ts`,
`src/hooks/usePages.ts`, `src/features/people/notebook/WordsView.tsx`, `src/features/tell/keptOn.ts`,
`src/store/syncEngine.ts`, `src/store/understanding.ts`); #90 `claude/cmr1-c-completeness` (server:
`_shared/extraction/ground.ts`, `segment.ts`, `dates.ts`, `pipeline.ts` grounding block and accounting,
`ai-gateway/handler.ts`; migration `20261114090000_v2_capture_understanding.sql`; pgTAP 74); #91
`claude/cmr1-b-identity` (server: `pipeline.ts` resolution, `voice.ts`, `names.ts`, `lexicon.ts`, `context.ts`
one predicate); #92 `claude/cmr1-d-evals` (`evals/cmr1/`, `docs/product/cmr1-evaluation.md`); the RC's integration
commits (B's call sites through C's grounding hint and sentence wrappers; the ledger restated).

**Dependencies.** One forward-only migration (adds a nullable column, one settle function, two CHECK widenings,
re-creates six functions with settle lines; no data change), preferred before gateway v18 but not required (the
gateway degrades the coverage write and never tells the phone a note was taken whole). No flag change. A new
build for the app side.

## C. Before-and-after evidence

Baseline and candidate, oracle mode, independent corpus (`evals/cmr1`, frozen `cmr1-v1`), measured in this session:

| Metric | `main` dev | RC dev | `main` held-out | RC held-out | Target |
|---|---|---|---|---|---|
| Tells accounted for | 100% | 100% | 100% | 100% | 100% |
| Meaningful facts silently lost | 0 | 0 | 1 | 0 | 0 |
| Saved lines on the wrong person | 0 | 0 | 0 | 0 | 0 |
| Fabricated or wrong identities offered | 7 | **0** | 3 | **0** | 0 |
| Grounding violations | 0 | 0 | 0 | 0 | 0 |
| Recall of unambiguous meaningful facts | 100% | 100% | 98.5% | **100%** | ≥95% |
| Precision of saved lines | 100% | 100% | 100% | 100% | ≥98% |
| Unnecessary clarification | 14.1% | **0%** | 16.7% | **0%** | ≤2% |
| Correct clarification on ambiguous cases | 5/8 | **8/8** | n/a | n/a | 100% |
| Ambiguous facts saved without asking | 1 | **0** | 0 | 0 | 0 |
| Subject attribution | 100% | 100% | 100% | 100% | 100% |

Realistic mode (recorded live-model phrasings): fabricated 10 → 0 and 5 → 0; unnecessary clarification 16.2% → 0%
and 21.4% → 0%; no regressions. Live mode: PENDING the key (command in `evals/results/cmr1/RUNS.md`).

Representative before → after: "Kaiya has not been sleeping very well and has been very clingy to my wife Krystal"
→ was "Who is Has?"; now two lines on Kaiya, named, no question. "Will is visiting Friday. He will stay with us." on
Ben's page → was (in an intermediate build) "Ben will is visiting" on Ben; now "Is Will someone new?". "Someone at
work told Ben he's getting promoted" → was dropped; now Ben's, for a glance. The founder's doubled voice passage →
was every line dropped and "Nothing to remember"; now one fact per repeated quote, and when nothing can be kept the
card says where the words are. "Sarah's sister has surgery Friday, she's nervous" → still asks "Sarah, or Sarah's
sister?" (regression caught in review and kept asking). "Ben said Sam got the job. He's thrilled for him." with the
model unsure → still asks, both offered.

## D. Readiness matrix

See `cmr1-release-plan.md` §4. In one line: everything is IMPLEMENTED on the RC; #88 alone is MERGED (not
DEPLOYED); nothing is LIVE-MODEL, NATIVE-SIM or DEVICE VERIFIED; nothing is FOUNDER ACCEPTED.

## E. Release and recovery plan

`cmr1-release-plan.md`: merge order #92 → #90 → #91 → #89 (or the RC branch as one), migration first, gateway v18
from `main` with the CLI and a parity check, a `dogfood-v2` build, flags unchanged; rollback by redeploying v17 and
reinstalling `dc8d97a2`; the migration is additive and advisory for the app; historical records untouched, with any
wider recovery a separate proposal.

## F. Founder acceptance, and the decisions only the founder can take

The session is `cmr1-acceptance.md`: seven scenarios, one sitting, plus the second phone. Before or during it, the
founder's word is needed on: (1) "Your words" as the place at the foot of People for a Tell naming nobody, and its
name; (2) a declined reading no longer hiding the Tell on the person's Pages; (3) a removed person's note moving
under "Your words"; (4) the new Kept-card copy; (5) a relative who has died is not offered as the subject of the
next pronoun; (6) a Tell about someone with no name ("a friend of mine") reported as not understood rather than
excluded; (7) K7 (Chris' dog Fluffy, model "new") moving from auto-save to a glance; (8) the eventual prompt
wording nudge for the next paid live run. The CMR-1 key should be revoked and its variable removed when the
milestone closes.
