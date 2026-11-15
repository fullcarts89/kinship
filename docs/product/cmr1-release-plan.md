# CMR-1 release candidate: plan, readiness and recovery

**Status: the integrated checks are recorded (see "Evidence"); the plan waits on the founder.** Companion to `cmr1-handoff.md`
(the record), `cmr1-evaluation.md` (the eval method and baselines, on the D branch) and `cmr1-acceptance.md`
(the founder's one session). Nothing in this plan happens without the founder's explicit yes at each marked
step; merging is not approval.

## 1. What the candidate is

Branch `claude/cmr1-rc` = `main` `c2e0ee7` + the four workstream branches, merged with merge commits, plus one
integration commit. The PRs, in the order they should merge to `main`:

| Order | PR | Branch | What it carries | Server / app / schema |
|---|---|---|---|---|
| 1 | #92 | `claude/cmr1-d-evals` | The evaluation corpus, runner, thresholds, oracle baseline | neither (evals only) |
| 2 | #90 | `claude/cmr1-c-completeness` | Repeated evidence placed by context; every drop accounted for in coverage; `captures.understanding`; spoken ordinals; spoken-run segmentation; contact-detail guard | server + **migration `20261114090000_v2_capture_understanding.sql`** |
| 3 | #91 | `claude/cmr1-b-identity` | Grounded identity resolution (the #88 review and its successors) | server |
| 4 | #89 | `claude/cmr1-a-capture` | Voice assembled from the recognizer's results; every retained Tell findable; one outcome adapter; honest copy | app |

The integration commit on the RC (B's call sites taking C's grounding hint and sentence wrappers) must be
carried whichever way the merges go: either merge the RC branch itself as the fifth step, or re-apply that
commit after #91. Merging the RC branch is simpler and is the recommendation.

## 2. Release sequence (each step needs the founder's yes)

1. **Merge** (merge commits), in the order above, after the founder's acceptance of this plan. The migration
   reaches production by the merge of #90 (the Supabase GitHub integration on `main`).
2. **Confirm the migration applied** before any gateway deploy: the production schema fingerprint should
   match the RC's `26a8c58d` over 1060 lines (`supabase/tests/run-db-tests.sh --fingerprint` against the
   checkout gives the expected value; compare with production as earlier releases did).
3. **Deploy `ai-gateway` v18 from `main`** with the Supabase CLI (`npx supabase functions deploy ai-gateway
   --project-ref kddpxiiyxgvjrtpdkvio --use-api`; the bundle is too large for the MCP tool), JWT verification
   on; verify with `functions download --use-api` that every deployed file matches the checkout. The gateway
   tolerates the old coverage CHECK (it retries in the three-key shape), so the order "migration first" is
   preferred, not a hard dependency; the reply never claims a note was taken whole.
4. **Build** the app (EAS `dogfood-v2`, from a clean checkout of `main`) and install on the founder's phone.
   The app side (#89) is inert against an old gateway except for the voice and findability changes, which are
   app-only; nothing in it requires the migration (it tolerates the column's absence).
5. **Founder acceptance session** (`cmr1-acceptance.md`): seven scenarios, one sitting, plus the second phone.
6. Flags: no change. `voice_capture`, `notebook_deck`, `tell`, `ai_extraction`, `memory_v2`, `shell_v2`
   stay as per-user overrides for the two registered accounts only.

## 3. Rollback and containment

- **Gateway:** redeploy v17 from `1bbf7bb` (the current production bundle) by the same CLI command from that
  commit; the migration is forward-only but v17 ignores the `understanding` column and the new coverage key,
  so v17 on the new schema is safe (pgTAP proves the settle function is only called by the new SQL functions
  that v17 also calls, which now additionally write the column; nothing v17 reads changes).
- **App:** the previous build `dc8d97a2` (from `2310438`) stays installable from EAS; it ignores the new
  column and copy.
- **Migration:** not reversible by design (CLAUDE.md). It adds a nullable column, one settle function, two
  CHECK widenings and re-creates six functions with settle lines; nothing is dropped and no row changes.
  Containment if the settle misbehaves: the column is advisory for the app (the adapter falls back to the
  device-local state when it is NULL or unknown), so a hotfix can stop writing it without touching the schema.
- **Rollback residues (final review F4, F5):** after a rollback to v17, a note whose row carries only `not_understood`
  (no failed passage, nothing unplaced) and is told again with "Try again" keeps a stale `partial`, because v17 drops
  the fourth coverage key and reads such a row as no coverage. Remedy, a one-off content-free SQL run only on the
  founder's yes: for each affected row set `coverage` to NULL when `coverage - 'not_understood'` is the empty
  three-key shape, else to `coverage - 'not_understood'`, then call `capture_understanding_settle(user_id, id,
  false)`. And while a gateway runs ahead of the migration, a reopen of a not_understood-only note reads `complete`
  though its first reply carried the places: harmless once the migration lands, and one more reason it goes first.
- **Historical records:** untouched. The doubled voice note and the held "Has" note on the founder's account
  stay as they are; the held note can be answered "Someone already here" → the child, or undone and told
  again, once v18 is live. Any wider recovery of past notes is a separate proposal needing approval.

## 4. Readiness matrix

Stages per the ledger's reporting model. "RC" = on `claude/cmr1-rc`.

| Defect / capability | Implemented | Merged | Deployed | Live-model | Native-sim | Device | Founder accepted |
|---|---|---|---|---|---|---|---|
| K34 voice doubled a passage (as a class: structural de-dup from the recognizer's results) | RC (#89) | no | no | n/a (app) | NOT RUN (no simulator here) | PENDING: log `(isFinal, transcript, segments)` across a pause on the founder's iPhone | pending |
| K35 "Nothing to remember" (every retained Tell findable, honest copy, durable outcome) | RC (#89 app, #90 server) | no | no | PENDING key | NOT RUN | PENDING | pending |
| K36 "Who is Has?" (as a class: grounded referents, no list as the mechanism) | RC (#91; #88 merged) | #88 only | no | PENDING key | NOT RUN | PENDING | pending |
| Repeated evidence no longer drops a memory | RC (#90) | no | no | PENDING key | NOT RUN | PENDING | pending |
| No silent loss: every drop accounted for in coverage | RC (#90) | no | no | PENDING key | NOT RUN | PENDING | pending |
| Identity resolution across realistic language (0% unnecessary clarification, 0 fabricated on the corpus) | RC (#91) | no | no | PENDING key | n/a | PENDING | pending |
| Long Tells, passages, "Tell the rest" (CER-1) still hold | RC (verified by the existing suites) | yes (CER-1) | yes (v17) | PENDING key | NOT RUN | n/a | n/a |
| Evaluation corpus and metrics reproducible | RC (#92) | no | n/a | PENDING key (live baseline) | n/a | n/a | n/a |

## 5. Evidence (filled from the integrated run; see `cmr1-handoff.md` §4c for the numbers)

| Tier | Result |
|---|---|
| UNIT (Deno, Jest, tsc, eslint) | Deno 569 / 0; Jest 134 suites / 1366 tests; tsc clean; eslint 0 errors; CI on PR #93 green |
| INTEGRATION (standard oracle / realistic / replay; pgTAP) | 0 must-not violations, 0 persons guessed in all three; pgTAP 31 files / 923 tests; fingerprint md5 `26a8c58d` |
| CMR-1 eval, oracle and realistic, dev and held-out, vs `main` | every gated metric at target, no regressions (handoff §4c) |
| BLACK-BOX (local stack, replayed replies, the RC's gateway) | Every suite PASS under its stated conditions: b3 20, b4 5, b5 4, b6 4, b7b8 4, dates 2, h4 2, k19 2, k20 22, k25 3, k27 2, k28 3, k4 36, k4legacy 18, narrative 3, narratives 4, notebook J3+J5, removal 3, showingup 2, today 2, trustfloor 1. k10 passes Monday to Friday only (weekend "last Friday" asks, by design); notebook J1/J6 and J2 are live-model tests with no recorded replies. The stall first seen was K37, a latent app bug now fixed |
| LIVE-MODEL | **RUN** through CI with the repository secret on the founder's label (run 43679094441: 483 calls, $6.27, 9 minutes; dev and held-out, three repeats). The stored outputs are replayed free through `main` and the candidate after every fix (`run-evals-cmr1-replay`). On the candidate `c1e6eb6`: held-out meets every gated target; dev remaining misses are named in `cmr1-handoff.md` §4f. Latency p50 3.9–4.0 s, p95 7.4–8.5 s, unchanged from `main` |
| NATIVE-SIMULATOR | NOT RUN: no iOS simulator reachable from this environment; an EAS-hosted path is prepared but gated (`cmr1-handoff.md` §4c, the native staging entry) |
| FOUNDER-DEVICE | PENDING the acceptance session |

## 6. Known remaining risks

- The K34 class fix rests on the recognizer's segment timing and "nothing heard since" together; the exact
  iOS 18 behaviour at Stop is read from the module's source, not observed. The native pass must log one
  result stream across a pause before K34 is called more than IMPLEMENTED.
- No live-model run of the candidate yet: all extraction evidence is oracle, realistic-oracle and replay.
- Product judgements taken in code, each recorded in `approved-design-coverage.md` and needing the founder's
  word: where "Your words" lives and its name; a declined reading no longer hides the Tell on the person's
  Pages; a removed person's note moving under "Your words"; a relative who has died is not offered as the
  subject of the next pronoun; `no_one_named` reported as not-understood coverage; K7 moving from auto to a
  glance (`subject_moved`); the new Kept-card copy.
- Prompt v7 unchanged; a wording nudge ("every statement names its subject; `person_mention` is never a
  verb") is recommended for the next founder-authorised live run, not shipped.
