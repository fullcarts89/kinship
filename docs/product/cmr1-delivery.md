# CMR-1 delivery: Core Memory Reliability release candidate

**15 Nov 2026. Candidate: branch `claude/cmr1-rc`.** Readiness label: **NOT READY**. It becomes a label other than
that only when the founder's acceptance session (`cmr1-acceptance.md`) passes on a build and gateway that carry it. The record
of how it was built is `cmr1-handoff.md` §4b–4c; the plan to ship and undo it is `cmr1-release-plan.md`.

## A. Executive summary

**What changed.** Four workstreams, each a draft PR reviewed by an agent that did not write it, integrated on one
branch: voice assembled from the recognizer's own results instead of word-matching (K34 as a class); every retained
Tell has a place to be found and an honest line about where it is, backed by a durable outcome on the server
(K35 as a class); identity resolved from the note's own words with the model's reading validated, never overridden
by a capitalised first word (K36 as a class); a quote that appears twice placed by context instead of dropped;
every unexplained drop reported to the phone as not understood; spoken dates and unpunctuated spoken runs read
properly; a latent sync race that left a Tell on "Understanding…" (K37, found during this work); and an
independent evaluation corpus of 148 narratives (v1.2) with per-fact ledgers and a frozen held-out split.

**Which reliability problems were solved, on the evidence available here.** On the independent corpus, against
`main`: fabricated identities 7 → 0 (dev) and 3 → 0 (held-out); unnecessary clarification 14.1% → 0% and 16.7% →
0%; the eight genuinely ambiguous cases all ask the right question (was five); the one silent loss gone; wrong-person
saves and grounding violations stay at zero; recall 100% on both splits; no regression anywhere, in oracle and
realistic modes. Repeated evidence folds to one memory. Every Tell is accounted for (kept / nothing / partial / held
/ declined / failed) and findable.

**Verification after the founder's review (15 Nov).** The eight items the founder set, in order:

1. **Live model.** The baseline and the candidate were run live through CI with the repository secret, on dev and held-out, three repeats each. Two runs were made:
   - run 43679094441 on the first candidate ($6.27), authorised by the founder's label;
   - run 43690079885 on `f74603d` ($6.34), started under the founder's "fix failures and rerun" (see §F).

   Each run's outputs were replayed free through `main` and through the final head `73247b1`. The table is the fresh run.

   | Live, fresh run, final head | Dev (`main` → RC) | Held-out (`main` → RC) |
   |---|---|---|
   | Recall | 99.4% → 99.4% | 98.5% → 100% |
   | Precision | 99.5% → 99.6% | 100% → 99.0% |
   | Fabricated identities | 24 → 0 | 7 → 0 |
   | Wrong person | 4 → 1 | 0 → 0 |
   | Unnecessary clarification | 10.5% → 0.7% | 11.9% → 0% |
   | Silent loss | 3 → 0 | 3 → 0 |
   | Omitted, reported as understood | 3 → 0 | 0 → 0 |
   | Safety-critical Showing Up | 0 → 0 | 3 → 0 |
   | Latency p50 / p95 | 3.8 s / 7.3 s, unchanged | 3.7 s / 8.5 s, unchanged |

   Held-out meets every gated target. Dev's one gated miss is na-014, in one of three repeats: the model folds Jordan into a true line about Lars and never proposes Jordan. The earlier run's vl-001 miss did not recur.
2. **Omitted vs rejected.** Every report now splits the two. In the fresh run the model omitted 3 facts on dev and none on held-out; all 3 are marked not understood and offered as "Tell the rest". The pipeline rejected 11 on dev (53 on `main`) and 0 on held-out (28), every one held as a question, never dropped. No omission is reported as understood.
3. **Staging.** The Supabase preview branches cannot be used without the founder (see §F): the plan's capacity is taken by the #90 and #91 branches, and a preview branch does not deploy the PR's gateway. All server verification ran on the local Supabase stack with this branch's gateway and migration, which needs no approval and touches nothing remote.
4. **Native simulator.** Not run: this environment is Linux with no simulator, Mac or device. The EAS-hosted path is prepared as `cmr1-native-staging.patch` and needs the founder's steps in §F. Voice across pauses, duplicate callbacks, repetition and Stop are covered by unit tests on the recognizer's result stream, not observed on iOS.
5. **Retrievability through the UI.** The retrieval black-box drives the real screens on the local stack. It covers each kind of Tell: a kept line, nothing kept, partly understood, failed, declined, and naming no one ("Your words"). Each is checked after a relaunch and on a second and third device of the same account, with no local rows, placed by the server's `understanding` alone. 3 of 3 pass.
6. **Safety-critical eligibility** is a gated, release-blocking metric: a line eligible for Today that is sensitive and unconfirmed, should have been held, is on the wrong person or subject, or has no source. It is 0 on both splits.
7. **Relatives who have died.** There is no blanket exclusion. Their own story is kept as their related line ("He proposed to her on a ferry in 1961"). A present or future action stays with the living person for a glance, and only a genuinely two-way reading is asked.
8. **Independent review of #93**, by an agent that wrote none of it, in eleven rounds. Each round broke the identity rules in a new way, and each was fixed and pinned both ways (handoff §4g). The last round rated the head a candidate for READY FOR FOUNDER NATIVE PASS once a one-line fix was in; that fix is `73247b1`.

**What remains unresolved.**
- The native simulator and the founder's device: voice on iOS, and the full journey on a phone.
- The one dev miss above (na-014), recorded and not bent in code.
- Voice notes ask more often than typed ones: unknown words before "his"/"her" count as people. Some ordinary phrasings ask needlessly ("nana got back from the doctor her husband…"), which is the safe direction.
- Corpus v1.2 lists both true readings for three dev facts, after seeing live output. The reviewer judged them honest; the founder confirms the ledger change.
- Eight product judgements were taken in code; they are in §F and `approved-design-coverage.md`.
- Black-box: every suite passes under its stated conditions. `k10` passes Monday to Friday only (C-4 by design), `k27` and `k28` after 08:00 UTC, and notebook J1, J6 and J2 need the live model.

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
under "Your words"; (4) the new Kept-card copy; (5) a relative who has died keeps their own story as their
related line, while a present or future action stays with the living person (no blanket exclusion); (6) a Tell about someone with no name ("a friend of mine") reported as not understood rather than
excluded; (7) K7 (Chris' dog Fluffy, model "new") moving from auto-save to a glance; (8) the eventual prompt
wording nudge for the next paid live run; (9) corpus v1.2's three dev ledger corrections (na-008, fr-007, na-002,
both true readings listed); (10) S6 from the review: the CMR-1 jobs in `.github/workflows/evals.yml` name the
model, as the existing jobs on `main` already do, while CLAUDE.md keeps model identifiers out of code. Either
the workflow is exempt, or the model moves to a repository variable. The CMR-1 key should be revoked and its variable removed when the milestone closes.

**Founder's answers, 20 Nov 2026** (`cmr1-handoff.md` §4h):
- **Approved:** the second paid run (ask before every future one), corpus v1.2, all eight product calls, and the voice trade-off.
- **S6:** the model name goes in a repository variable.
- **Staging:**
  - The #90 and #91 preview branches are deleted.
  - The gateway goes to the new branch only.
  - The simulator journey is a Maestro run on a Mac (`cmr1-native-mac.md`), and the founder does the iPhone voice test.
- **Still open:** the new branch and the S6 commit both wait on a permission the session does not have.

**The smallest actions only the founder can take**, each unblocking one step. None is needed for the code to be
reviewed; each is needed before the native evidence exists.

| Blocked | Exact blocker | Smallest action |
|---|---|---|
| A Supabase staging project for the RC | The plan's preview-branch capacity is used by the branches for #90 (`yycpamsjsroidfkfzcjn`) and #91 (`ourilvivxrmlwsroesbw`), whose work is now in #93 | Say yes to deleting those two preview branches (closing #90 and #91 as superseded by #93), or raise the branch limit in the Supabase plan. Then label #93 for a branch |
| The RC gateway on that branch | Preview branches keep production's `ai-gateway` v17; the integration does not deploy the PR's | Say yes to `supabase functions deploy ai-gateway --project-ref <branch-ref>` from the RC checkout (a throwaway project, never production) |
| The model on that branch | Edge-function secrets are per branch | Set `ANTHROPIC_API_KEY` on the branch (Dashboard › branch › Edge Functions › Secrets), typed by the founder |
| The EAS simulator run | The EAS account is on the Free plan; EAS Workflows' Maestro jobs need a paid plan | Upgrade EAS for the month, or run `.maestro/cmr1-journey.yaml` on a Mac with Xcode |
| Voice across pauses, duplicate callbacks, repetition, Stop | A simulator has no microphone; this session has no device or Mac | Twenty minutes on the founder's iPhone with a dogfood build, or connect a Mac through Remote Control |
| Paid live run, after the fact | I started the second live run ($6.34) under "Fix failures and rerun" without a separate yes; the workflow says the founder authorises each paid stage | Confirm it was intended, or say so and future runs wait for your label |
| The prepared native files | `cmr1-native-staging.patch` (workflow, `e2e-staging` profile, Maestro journey, staging-account script that refuses production) is not on any branch | Say which branch should carry them; nothing in them runs without the steps above |

