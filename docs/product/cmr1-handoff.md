# CMR-1 handoff: Core Memory Reliability milestone

**For the session that continues this milestone.** Written 14 Nov 2026 by the session that received the founder
directive. That session could not see the new `ANTHROPIC_API_KEY` environment variable (it was added after the
session started), so the founder started a new session in the **kinship** environment. Read this file, then the
directive at the bottom (verbatim), then start executing. Do not ask the founder to repeat anything that is here.

## 1. Baseline (checked 14 Nov 2026)

| What | Value |
|---|---|
| `main` | `c2e0ee7` (merge of #88) |
| Production gateway | `ai-gateway` **v17**, deployed 5 Nov 2026 from `1bbf7bb` (by hand, from the founder's Mac). **#85–#88 server changes are NOT deployed** (K35's pipeline effects, K36). `delete-account` v6 |
| Prompt / model | `relationship_extract/v7`; model as recorded in `captures.extraction_version` on production rows |
| Production migrations | latest `20261106090000_v2_person_pronouns` |
| Native build on founder phone | EAS internal `dogfood-v2` build `dc8d97a2-bead-4c30-b89d-ef315b227b97` from `2310438` (#87). Same build available for the second registered iPhone |
| Flags (per-user overrides only; every flag default off, rollout 0) | `21bb55a0-…` (founder) and `97748654-…` (second phone): `shell_v2`, `tell`, `ai_extraction`, `memory_v2`, `notebook_deck`, `voice_capture`. No one else |

## 2. Environment facts (this cloud environment, "kinship")

- **Live model:** `ANTHROPIC_API_KEY` is set as an environment variable on the environment (founder, 14 Nov). It is a
  dedicated key for CMR-1; remind the founder to revoke it and delete the variable when the milestone ends.
  `api.anthropic.com` bypasses the network proxy, so only this variable works (network secrets can't be saved for it).
- **Deno:** not installed; `npx --yes deno …` works (2.x). **Docker** is available (local Supabase stack may need image
  hosts allowed; propose exact hosts with `update_environment` if a pull is refused).
- **No iOS simulator** (Linux). Native-simulator and physical-device tiers must be marked PENDING, not claimed.
- **EAS:** an Expo access token is saved as a network secret for `api.expo.dev`; run eas-cli with
  `EXPO_TOKEN=proxy-injected`. Apple team `G3FXWBPJY2`; registered devices: "Thor iPhone" and one unnamed iPhone.
  Builds: `npx eas-cli build --profile dogfood-v2 --platform ios --non-interactive --no-wait --json` from a clean
  checkout of `main`. Artifacts download from `wf-artifacts.eascdn.net` (allowed).
- **Gateway deploys:** the function bundle is ~3.3 MB (31 files incl. `_shared/semantic/places/places-2026.10.json`),
  too large for the Supabase MCP `deploy_edge_function` tool. Use the CLI:
  `npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio --use-api`, which needs a Supabase
  personal access token saved as a network secret for `api.supabase.com` (request it with `request_credential`;
  the previous request was interrupted and never answered). **Every gateway deploy needs the founder's explicit yes.**
- Supabase MCP works for read-only SQL on production (`kddpxiiyxgvjrtpdkvio`). Never look accounts up by email.

## 3. What this thread already did (13–14 Nov)

| Item | PR | State |
|---|---|---|
| Voice in Tell (E18), on-device only, behind `voice_capture` | #85 | Merged; on founder phone (build `dc8d97a2`) |
| Person page: Pause reminders, pronouns, Settings X (from #84) | #86 | Merged; migration applied |
| K34 voice doubled a passage (`joinWords`, `onceOver` in `src/platform/speech.ts`) | #87 | Merged; on phone. `onceOver` may remove intentional repetition: review (Workstream A) |
| K35 "Nothing to remember" → "Kept on X's page." / "Kept your words." + quiet notes on Pages (`src/features/tell/keptOn.ts`, `quietNotesIn`) | #87 | Merged; on phone. Uses device-local state: not durable across devices (Workstream A/C) |
| K36 "Who is Has?" (`ELIDED_START`, `neverAName`, `asName`, `withSubject`; capitals not required) | #88 | Merged, **not deployed**. Founder said yes to deploy #88, but the CMR-1 directive asks for an independent review of #88 first: deploy only the reviewed, integrated candidate, after re-confirming with the founder |

Production records left as they are (do not change without founder authorization): the doubled voice note
`b022a31b-7792-474f-84ac-58dcb4b6cbfd` and the held "Has" note `f6bb258b-30d0-4c04-9083-29f9b582d163`
(account `21bb55a0-…`).

## 4. Workstream plan (launched once, stopped before any push; relaunch)

Run each as a background agent with `isolation: "worktree"`, its own branch and a DRAFT PR. Give each the relevant
section of the directive. Ownership, to avoid conflicts in `pipeline.ts`:

- **A — capture integrity & universal Tell retrieval (app):** `src/platform/speech.ts` (structural de-dup from the
  recognizer's event semantics; read `node_modules/expo-speech-recognition/ios/*.swift`, iOS 18 `hasSeenFinalResult`;
  remove or strictly constrain `onceOver`; preserve intentional repetition), a Notebook-sized place where a Tell with no
  confirmed person can be found, durable retrieval across devices through one adapter (`tellOutcome(capture, localRow)`)
  that reads C's column when present, honest copy, recovery for failed/partial Tells. Branch `claude/cmr1-a-capture`.
- **B — identity resolution & review of #88 (server):** owns `refileBySubject`, person resolution, pronoun/related/
  companion resolution, `leadingName`/`statementNames`/`withSubject`/`neverAName` (`voice.ts`, `names.ts`,
  `resolve.ts`). Ground the subject in the item's own evidence span instead of lexical heuristics on the generated
  statement; strengthen the zero-items test; positive and negative coverage for the directive's list. A prompt change
  means a new `v8`, keeping `v7`. Branch `claude/cmr1-b-identity`.
- **C — completeness & recovery (server + migration):** owns `locateEvidence` (`_shared/spans.ts`), the grounding block
  in `planItem`, drop accounting, coverage, outcome assembly, `write_extraction` / `resolve_capture_review`. Fix
  `evidence_ambiguous` by choosing occurrences by grounded context (true repetition → same fact; different contexts →
  the occurrence consistent with the person, else held, never guessed). Turn unaccounted drops into coverage/recovery.
  Add a durable synced content-free outcome column on `captures` (proposed name `understanding`: kept | nothing |
  partial | held | declined | failed; declined = interpretation rejected, not the Tell), forward-only migration with
  pgTAP. Verify long Tells (no cap, passages, "Tell the rest" context). Branch `claude/cmr1-c-completeness`.
- **D — independent evaluation (keep it blind to A–C branches):** `evals/cmr1/`: at least 100 synthetic narratives plus
  adversarial cases, per-fact ledgers (subject, span, disposition, Showing Up eligibility), sequences, a frozen held-out
  split (at least 25%), and a runner for oracle | replay | live (`--repeat 3`) with the directive's metrics reported
  per mode and split, plus a thresholds file. Commit an oracle baseline on `c2e0ee7`, then the **live baseline**
  (now possible). Existing harness: `evals/extraction/run.ts` (modes oracle/replay/live), `evals/narrative/`.
  Branch `claude/cmr1-d-evals`.
- **E — integration (coordinator, after A–D):** combine into one release-candidate branch, run the full checks
  (`npx jest`, `npx tsc --noEmit`, `npx eslint app src`, `deno test` in `supabase/functions`, `deno check` of the
  gateway, the oracle eval, pgTAP), the black-box suites on the local stack (`e2e/README.md`), and the live eval
  (baseline vs candidate). Update the bug ledger's reporting model (Implemented / Merged / Deployed / Live-model /
  Native-sim / Device / Founder-accepted instead of a single FIXED). Prepare the release plan and one 5–8-scenario
  founder acceptance session.

Requires the founder's explicit yes: merging to `main`, the gateway deploy, production migrations, production data
changes, flag changes.

## 4b. Session 2 record (14 Nov 2026, evening; coordinator branch `claude/keen-dirac-edt3xz`)

**Baseline re-measured on `main` `c2e0ee7` in the kinship cloud environment:** Deno 497 passed / 0 failed (`supabase/functions`); extraction oracle eval 0 must-not violations, 0 person guessed, 100% expected items found on every set; `deno check` of `ai-gateway/index.ts` clean; production `ai-gateway` v17 (ezbr `a30001e1…`), `delete-account` v6, `ai-insight` v6, confirmed with the Supabase API. Jest baseline 132 suites / 1332 tests passed (`TZ=UTC npx jest`; a first run had swept the agent worktrees under `.claude/worktrees`, now in Jest's ignore list). Local Supabase stack started (Docker daemon started by hand) with every migration applied.

**Environment findings this session:**
- `ANTHROPIC_API_KEY` is on the environment (the variable name is listed) but **was not present in this session's shell**. The live-model eval and live baseline cannot run from this session until a session starts with it set, or the key is provided another way. No live result is fabricated; the eval runner is built key-ready (Workstream D) and the live baseline is marked PENDING.
- Docker's daemon was not running (`/var/run/docker.sock` absent); started by hand with `dockerd` for the local Supabase stack, pgTAP and the black-box suites. It does not survive a container restart.
- The agent-loop independent reviewer (`.github/workflows/kinship-claude-handoff.yml`, on `main`) fires only on an OWNER/COLLABORATOR/MEMBER comment beginning `@claude /kinship-fix` on a PR labelled `agent-loop`. It is **not** an automatic independent review of the CMR-1 PRs; independent review inside this milestone is done by review agents that did not write the code (recorded per PR), and Workstream B's review of #88 is by an agent other than #88's author. This is the documented limitation the directive's §10 asks for.

**Workstreams launched** (each in its own worktree, from `main` `c2e0ee7`, with a draft PR as its deliverable): A `claude/cmr1-a-capture`, B `claude/cmr1-b-identity`, C `claude/cmr1-c-completeness`, D `claude/cmr1-d-evals`. Shared contract given to A and C: `captures.understanding text NULL CHECK IN ('kept','nothing','partial','held','declined','failed')`, written only by the server (`write_extraction`, `resolve_capture_review`, `release(... 'failed')`), read in the app through one adapter `tellOutcome(capture, localRow)` that falls back to the device-local `understanding` row until the migration is in production. File ownership as §4.

**Workstream A reported** (draft PR #89, `claude/cmr1-a-capture`): voice assembled structurally from the recognizer's results (`Transcript`), `tellOutcome` adapter, every settled note on its people's Pages, a "Your words" place at the foot of People for notes naming nobody (`notebook_deck`, only when non-empty), honest Kept-card copy; Jest 134 / 1356, tsc and eslint clean; nothing beyond UNIT/INTEGRATION run. Founder decisions it raises: where the unfiled place lives ("Your words" vs another), declined readings no longer hiding the Tell on the person's Pages, and the new card copy. Independent review launched.

**Workstream C reported** (draft PR #90, `claude/cmr1-c-completeness`): `ground.ts` places a quote found more than once by context (true repetition → one fact; other unique quotes anchor; the sentence's person decides; otherwise not placed and recorded in `coverage.not_understood`, never guessed), no prompt change; every drop not excluded by rule becomes `not_understood` or `unlocated` coverage; migration `20261114090000_v2_capture_understanding.sql` adds the column, `capture_understanding_settle`, and settles it in the six write/claim/release/resolve functions; Deno 512, pgTAP 908 on a throwaway Postgres (fingerprint md5 `6c2c84df`), oracle/realistic/replay unchanged. Release order: migration before gateway. To reconcile at integration: A assumed `partial` = coverage non-empty, C settles `partial` only with ≥1 kept line; A does not yet read `coverage.not_understood`; a model refusal reads `failed` while the phone is told "kept". Independent review launched.

**Workstream B reported** (draft PR #91, `claude/cmr1-b-identity`): the #88 review's verdict is that the everyday-word list only hid the mechanism (the generated statement was treated as evidence); now the note's own words decide before any list (a mid-sentence capital is a name however common; a lower-case word right after a subject is a verb; after in/at/near a place; a clause after a coordinator shares the sentence's subject), a model mention that is a word is voided, `refileBySubject` moves a line only on grounded leads, `withSubject` fires only when the person is grounded, "Which X?" asks only for a shared name, `no_one_named` keeps nothing for an indefinite referent, a model "new" with one roster match is shown for a glance (`subject_moved`) and never auto-saved. Prompt v7 unchanged (a wording nudge recommended for the next founder-authorised live run). Deno 527, Jest 1332, oracle and realistic 0 violations, replay vs `main` 4/400 differ (question wordings and a drop reason only). Documented limits: a verb outside the list that never follows a subject, proposed as the referent, still asks "Is Refuses someone new?"; a lower-case name the model never referred to stays on the model's person. Independent review launched.

**Workstream D reported** (draft PR #92, `claude/cmr1-d-evals`): `evals/cmr1/` with 144 synthetic narratives (154 Tells, 414 facts, five invented rosters), 101 dev / 43 held-out frozen in `MANIFEST.json` (`cmr1-v1`), runner (oracle | replay | live, `--repeat`, `--require-frozen`), per-metric thresholds, `compare.ts`, `docs/product/cmr1-evaluation.md`. **Oracle baseline on `main` `c2e0ee7`:** Tells retrievable 100%; silent loss 0 dev / 1 held-out (pr-003, a contact-preference dropped as `contact_detail`); wrong person 0; fabricated identities 7 / 3; grounding violations 0; recall 100% / 98.5%; precision 100%; **unnecessary clarification 14.1% / 16.7%** (target ≤2%); correct clarification on ambiguous cases 5/8; one ambiguous fact saved without asking. Main drivers: pronouns held whenever two people were named earlier, known pets re-asked as new people after a companion match, voice possessives without apostrophes becoming people, possessive-relation "X, or X's dad?" over-asking, spoken ordinal dates unresolved, unpunctuated voice Tells read as one sentence. **Live baseline PENDING the key** (command recorded in `evals/results/cmr1/RUNS.md`).

**Oracle suite run by the coordinator against the branches (15 Nov, 00:07):** B (`d4b7e08`) vs main: fabricated 7→2 dev, 3→1 held-out; unnecessary clarification 14.1%→11.1%, 16.7%→11.9%; recall, precision, wrong-person, grounding unchanged at target; three facts newly saved whose ordinal dates do not resolve (now visible as Today-ineligible instead of asked). C (`08faa46`) vs main: no change on these metrics, no regressions. Round-2 targets sent: B gets grounded pronoun resolution over several named people, companion re-asks, possessive-relation over-asking, promise owner and J11, the pronoun after a new name, roster name matching across spacing and lowercase, place-as-person; C gets the contact-detail guard (the one silent loss), spoken ordinal dates, sentence segmentation for unpunctuated voice transcripts (a helper B will consume), and accounting for `no_one_named`.

**Independent reviews (agents other than the authors), 15 Nov:**
- PR #89 (A): NEEDS CHANGES. Proved by probe: on iOS every final carries segment timing, so a Stop re-send whose timing differs by 1 ms from the pause-final is appended again (K34 would recur); the "nothing new heard" fallback is unreachable on iOS. Same timing with different words replaced the earlier utterance (speech lost). `declined` was derived from a field the next pull clears, so the card copy reverted to "Kept on …". The "under Your words" copy pointed flag-off users at a place that does not exist. A note whose only person was removed while a line still rests on it was findable nowhere. Ten items sent back; OK: cancel/error paths, iOS 17, on-device and no-audio guarantees, Undo/delete filtering, empty account never shows Your words, scope and hygiene.
- PR #90 (C): NEEDS CHANGES, no blocker. Proved by probe: the "repeated" rule ran before the person evidence and folded two people's identically framed sentences onto one source span (Bea's memory sourced to Ann's words). The new gateway on the old coverage CHECK raised 22023 and released the note as failed, spending the model call, so the deploy order was a hard dependency. `partial` settled only with a kept line, so a note nothing was kept from but with gaps read `nothing`. Three fixes sent back plus `not_a_user_promise` exclusion to decide/record; OK: anchors, person-tie → ambiguous, no_evidence still drops, span constraint intact, content-free coverage, old reply shape kept, the six SQL functions differ only in settle lines, claim/release never clobber kept, forward-only.
- PR #91 (B): NEEDS CHANGES, one blocker, both with a prototyped fix the reviewer verified. The "lower-case word right after a subject is a verb" rule was checked at any occurrence of the word, so real names that are also words (Will, Hope, May, Maya after "ben") were voided and the line filed on the page's person at confirm tier with an invented statement ("Ben will is visiting"), a wrong-person save (§7.3/§7.5). `no_one_named` dropped facts the model had correctly filed on a roster person ("Someone at work told Ben he's getting promoted" → nothing). A lower-case lead the model never referred to was auto-saved on the model's person with no flag. The reviewer also corrected the PR's framing: confirm-tier lines are saved, then confirmed in the review. OK: K36 all shapes, the two-person voice transcript asks, K27 improved, K8/K16/K30 green, replay 4/400 confirmed, scope clean. K7 moves from auto to confirm (`subject_moved`), still Chris, to be said in the ledger.
- PR #89 (A) fixes pushed as `4c4beb4`: overlap-or-nothing-new rule for a repeat, half-shared-words rule for a revision, any partial after a final is fresh, deferred `end` in the fake, durable `declined`, flag-gated location copy, archived person's lined note under Your words, local held question wins over the server word. Jest 1361. Reviewer re-verifying.
- PR #90 (C) review fixes `190e1dd` and round 2 `9738f6b` pushed: person evidence and anchors judged before "repeated", which folds only when every occurrence's sentence names the same roster people; the gateway retries coverage in the three-key shape on a 22023 so the migration is preferred first, not required; `partial` = not taken whole (held → gaps → kept → declined/nothing); the contact-detail guard matches contact data only (the corpus's one silent loss retained); spoken ordinal dates resolve ("december first", "the fourteenth of december"); `segment.ts` splits unpunctuated spoken runs into sentences for the sentence-scoped checks (punctuated text byte-identical); `no_one_named` accounted as a contract exclusion and allowed in `ai_drop_reasons_ok`. Deno 518, pgTAP 919 (fingerprint md5 `26a8c58d`), standard oracle/realistic/replay byte-identical to `main`. CMR-1 oracle vs main: unnecessary clarification 14.1% → 12.1%, fabricated 7 → 6, held-out silent loss 1 → 0, days kept and Today eligibility 100%, no regressions. Re-review of the two commits launched.
- PR #89 (A) final fix `ecd2393`: a repeat is the same utterance only when nothing was heard since the last final and, where both finals carry timing, they overlap; a re-reading replaces only with the same word count ±1 and mostly shared words. Jest 1363. Coordinator ran the speech suites on the branch: 66/66.
- **Trial merge (coordinator, scratch worktree, not pushed):** D + A + C + B on `main` combine with conflicts only in `approved-design-coverage.md` and `bug-ledger.md` (both sides kept) and one hunk in `pipeline.ts` where B sets `ctx.mentions` and C passes `groundHint` to `evidenceSpans` (both kept). `types.ts` merged clean.
- PR #91 (B) review fixes and round 2 pushed as `e3483b0`: real names that are also words are never voided (a sentence-start or pre-copula occurrence is a subject); an indefinite mention with the model's roster person named in the sentence files on them at confirm; a lead the note writes neither as a name nor a word is held with the filed person offered, never auto-saved; an elided subject with one person named before is grounded; pronoun candidates narrowed by gender from relationship words and by the nearest clause subject, namesakes the page settles collapse, a pronoun with no roster candidate rides the new-person question; companion leads stop the refile (Biscuit); possessive-relation checks confined to the line's own clause; promise detection takes "Promised/Owe/Offered…", apostrophe-less and acceptance forms, "asked if I can" asks whose promise; hyphen = space in `nameKey`; spoken contractions and possessive stems handled. **CMR-1 oracle:** unnecessary clarification 14.1% → 0% dev, 16.7% → 0% held-out; fabricated 7 → 0 and 3 → 0; correct clarification 8/8; guessed 1 → 0; realistic the same; no regressions; the only gated miss left is pr-003 (C fixes it). Deno 539, Jest 1332, standard replay 5/400 differ with no item/person/tier change. K7 moves auto → confirm (`subject_moved`), recorded. Re-review of `e3483b0` launched, focused on wrong-person risk in the pronoun changes.

## 4c. Release candidate assembled (15 Nov, 00:45): branch `claude/cmr1-rc`

`main` `c2e0ee7` + D (`61580ae`) + A (`ecd2393`) + C (`9738f6b`) + B (`e3483b0`), merge commits, plus one integration commit (`10025ff`): B's three new `evidenceSpans` call sites take C's grounding hint (a semantic clash the textual merge did not catch; found by `deno check`). Document conflicts resolved by keeping both sides.

**Checks on the RC so far:** Deno 560 / 0 failed; `deno check` of the gateway clean; standard extraction oracle, realistic oracle and the approved baseline replay all 0 must-not violations and 0 persons guessed (the informational `guessed_person` issue table reads 9 on `main` and on the RC alike). **CMR-1 eval vs `main`, oracle and realistic, dev and held-out: every gated metric at target.** Dev: fabricated 7 → 0; unnecessary clarification 14.1% → 0%; correct clarification 5/8 → 8/8; guessed 1 → 0; disposition match 84.4% → 96.9%; Today eligibility and days kept 100%. Held-out: silent loss 1 → 0; fabricated 3 → 0; unnecessary clarification 16.7% → 0%; recall 98.5% → 100%; disposition match 83.8% → 100%. Realistic: fabricated 10/5 → 0/0; unnecessary 16.2%/21.4% → 0%/0%. No regressions. Jest 134 suites / 1363 tests passed; `tsc` clean; `eslint app src e2e` 0 errors (warnings only). pgTAP 31 files / 919 tests PASS on a throwaway Postgres with all 43 migrations; schema fingerprint 1060 lines, md5 `26a8c58d` (identical to C's branch). Black-box suites: running one at a time against the RC gateway (b3 20/20, b4 5/5, b5 4/4, b6 4/4 so far). Live-model: PENDING the key.

**Local stack for the black-box tier:** the RC migration applied to the local Supabase (`migration up --local`), the model stub in replay on :8790 and the RC's own gateway on :8000 (`GATEWAY_URL`), both started from the RC worktree.
- PR #90 (C) re-review of `190e1dd` + `9738f6b`: NEEDS CHANGES. **Trust regression:** the narrowed contact-detail guard saves a dictated phone number written without separators ("Ben's phone is 4155550100." kept auto; `main` dropped it; §7 invariant 6). After the 22023 coverage fallback the phone is told the note was taken whole (the reply is built from what was stored). `byWho` scored a nickname's first word ("my" of "my wife") and an object-position name as the subject, misplacing a source span onto the other person's sentence. Segmentation mis-splits ("he's | okay", "grace | and i", "ben told me | she", reduced relatives), one of which loses `sensitivity_raised` and a `subject_check` on a sensitive note. `no_one_named` as accounted-by-rule hides a mis-filed drop from the completeness signal and is a product decision without founder approval. B's `sentenceAround` calls segment without roster names. OK: spoken ordinals exactly match their numeric twins over 32 extra vectors; the fallback is single-shot and content-free; pgTAP 919; the standard eval byte-identical to `main`. Seven items sent back to C; the RC will be re-merged after.
- PR #91 (B) re-review of `e3483b0`: NEEDS CHANGES (small). Round-1 findings all genuinely fixed; the 0% on both splits is real, reproducible, and (by the reviewer's prototype) does not rest on the risky paths. New: `nearestSubject` grounds a pronoun on the words alone when the model says "unknown" ("Ben said Sam got the job. He's thrilled for him." saved on Sam at confirm; `main` asked); `genderOf` reads every word of a label so "sister's boyfriend" counts as female and the other candidate is saved; a pronoun clause right after "<name>'s <relation>" is saved as the person's own ("Sarah's sister has surgery Friday, she's nervous" → Sarah, sensitive; `main` asked); a pet whose name a roster person also goes by is moved to the namesake; hyphen = space in `nameKey` makes Mary-Kate's first name "mary" (an unnecessary "Which Mary?"). Five fixes sent to B; the death-word exemption that keeps se-002's judgement is to be an explicit product judgement for the founder.
- PR #91 (B) `08b864e`: READY TO INTEGRATE per the re-review (every round-2 finding fixed and re-probed; the r2 → r3 fixes changed no verdict on the corpus; the `context.ts` `namedIn` clause is additive and safe). One hygiene nit sent back: a module-level mutable Set of spoken name forms is cross-request state in the edge function; compute per call.
- PR #90 (C) `e12fa19` + `5f80f2a`: six of seven re-review findings verified fixed; the last two (a hearsay hedge split off its clause, auto-saving "i heard ben got the job" as stated; fillers at the start of a spoken run suppressing all segmentation) fixed in `5f80f2a` with one shared binding list and a filler set; verification of that commit in progress.
- **Black-box tier blocked by the environment, not the candidate:** from 00:57 UTC every suite that Tells (dates, k10, k19, k4) stalls at "Understanding…" and no `captures` row reaches the local database (Kong logs show no app writes while test accounts keep being created); `dates` fails identically with `main`'s app against `main`'s gateway. b3–b7b8 and h4 passed before and around that time. A debugging agent is on it; the black-box results above (b3 20, b4 5, b5 4, b6 4, b7b8 4, h4 2) stand.
- **RC rebuilt (second assembly) from `main` + D `61580ae` + A `ecd2393` + C `5f80f2a` + B `08b864e`**, with one integration commit: B's new `evidenceSpans` call sites take C's grounding hint, B's bare sentence reads go through C's `Context.sentenceAround`, and the possessive-relation word is read from the line's sentence then the clause before it. `deno check` clean; the full tier run is in progress.
- PR #90 (C) `5f80f2a`: READY TO INTEGRATE per the re-review (hearsay hedge bound again: "i heard ben got the job" → reported/confirm as on `main`; fillers never suppress segmentation; punctuated text byte-identical over 14,227 spans; the founder's doubled shape still folds).
- **Second RC assembly (`claude/cmr1-rc` at `301bfb1`) checks:** Deno 568 / 0 failed; `deno check` clean; `tsc` clean; `eslint app src e2e` 0 errors; standard oracle, realistic and the approved baseline replay 0 must-not violations and 0 persons guessed; pgTAP 31 files / 923 tests PASS (fingerprint md5 `26a8c58d`, 1060 lines); **CMR-1 eval vs `main`: every gated metric at target on dev and held-out in oracle and realistic, "No regressions"** (dev: fabricated 7 → 0, unnecessary clarification 14.1% → 0%, correct clarification 5/8 → 8/8, guessed 1 → 0, subject attribution 198/198; held-out: silent loss 1 → 0, fabricated 3 → 0, unnecessary 16.7% → 0%, subject attribution 92/92; realistic: fabricated 10/5 → 0/0, unnecessary 16.2%/21.4% → 0%/0%). Jest: running. Outstanding: B's per-call spoken-forms nit, the black-box environment stall.
- **Black-box stall diagnosed: a latent app bug, pre-existing on `main`, not the environment.** Today's mount starts the account's first sync cycle; a Tell arriving while it is in flight joins that cycle (`SyncEngine.sync()` returns the running promise), whose push already ran, so `understandNote()` finds the captures insert still in the outbox, returns false, and nothing is scheduled: the dock says "Understanding…" with no network request until the phone's 30-second tick (mocked out in the harness). Explains why `dates`, `k10`, `k19`, `k4` fail here while `b3`–`b7b8` (which await a sync before the first Tell) and `h4` pass; a plausible contributor to the K12-class latency the founder saw. Assigned to Workstream A: a follow-on cycle when `sync()` is called mid-cycle, and a re-run when the insert is still pending; then the four suites.
- RC `5614fb7` (with B's per-call spoken forms, `99a3330`): Deno 569 / 0; CMR-1 every gated metric at target on both splits and modes, "No regressions"; standard oracle and replay 0 violations.
- **K37 fixed by Workstream A** (`1c8be9c` on PR #89): `SyncEngine.sync()` asked for during a cycle in flight runs exactly one shared follow-on cycle and resolves when that has run; `understandNote()` re-runs the pass once when the insert is still pending. Unit tests reproduce the race (Jest 1366). Black-box from A's worktree against the RC gateway: `dates` 2/2, `k19` 2/2, `k4` 36/36 PASS; `k10` fails on a weekend only: the suite computes "last Friday" as the most recent Friday from the run's own day, while the resolver (identical on `main` and the RC, probed on both) reads "last Friday" said on a Saturday or Sunday as last week's Friday and always flags it for the user to confirm (founder decision C-4). A weekday-dependent suite like N15, not a regression; rerun Monday to Friday.
- **Final RC** (`claude/cmr1-rc`, `main` + D `61580ae` + A `1c8be9c` + C `5f80f2a` + B `99a3330`, the two integration commits, the ledger restated with one row each for K34–K37, and the coordinator branch's docs merged in): Deno 569 / 0; Jest 134 / 1366; `tsc` clean; eslint 0 errors; standard oracle, realistic and replay 0 violations; pgTAP 923; CMR-1 every gated metric at target on both splits and modes, no regressions. **Draft PR #93** opened for the RC against `main` (nothing merges without the founder's yes). Black-box full sequence against the RC gateway running; the K37 commit under independent verification.
- **CI on PR #93: green** (App tsc/eslint/jest, Edge functions deno check/test, Database migrations + pgTAP). **Black-box full sequence on the final RC** (RC app, RC gateway, replayed replies, Sunday 15 Nov): PASS b3 20, b4 5, b5 4, b6 4, b7b8 4, dates 2, h4 2, k19 2, k25 3, k4 36, k4legacy 18, narrative 3, narratives 4, removal 3, showingup 2, today 2 (17 suites). FAIL k10 1 (weekend, by construction), k20 6 of 22 (the "told again, merged into yesterday's by the model" shapes from Today and from John's page, fast assertion failures), k27 2 of 2 (Fluffy as Chris's related dog; the older-account variant), k28 1 of 3 (Fluffy's own line first on Chris's follow-up), notebook 3 of 4 (J1+J4+J6, J5+J4, J2), trustfloor 1 of 1. **Under triage** against `main`'s gateway and app as controls: regression, intended CMR-1 change (K7's auto → glance is a candidate for the Fluffy suites), or environment. The RC is not ready until each is classified and any regression fixed.
- **Black-box triage and final result (15 Nov, 02:00–03:30 UTC):** all 13 failures were harness or environment conditions, none a regression and none an intended-change pin; each passed on the RC once its condition was met. k20's and notebook's fixtures wrote an earlier line before the account's people had reached the server (Today's first sync still in flight on this stack: the harness twin of K37) — fixed on the RC (`9e39bb6`: one `sync()` after `setUp`, as k27/k28/trustfloor already did); k27/k28 date "yesterday" in UTC but refresh Today in Los Angeles, so their follow-up window opens at 08:00 UTC (run then, or with the LA clock); trustfloor needs the delete-account helper and `DELETE_ACCOUNT_URL`; notebook J1/J6 and J2 have no captured replies and are LIVE-MODEL tests. **After the fixes, on the RC:** k20 22/22, trustfloor 1/1, k27 2/2, k28 3/3, notebook J3 and J5 PASS; notebook J1/J2 wait for the model key; k10 passes Monday to Friday. Conditions written into `e2e/README.md`. **Black-box tier on the RC: every suite PASS under its stated conditions, 21 of 23 suites green on a Sunday, the other two by construction (weekday; live model).**

## 4d. Founder review of the RC (15 Nov 2026) and the verification phase

**Approved as direction:** "Your words" as the destination for a Tell naming nobody; durable Tell retrieval; the original Tell preserved when an interpretation is declined; the honest Kept-card messaging. **Not approved yet:** release or acceptance. The founder's eight verification items, and how each is being met:

1. Live-model baseline and candidate runs (repeated, held-out) → the repository's label-authorised evals workflow with the repository secret (the key is on the cloud environment but not in this session's shell); D wires a `run-evals-cmr1` job: one paid run, replayed through `main`'s and the candidate's pipeline for baseline vs candidate on identical model outputs. 2. Omitted-by-model vs rejected-by-pipeline, omissions recoverable → C adds "untouched meaningful sentence" coverage and Tell-the-rest recovery of `not_understood` spans; D splits the metric and gates "omitted and reported as understood" at 0; A marks `not_understood` spans. 3. Supabase preview-branch capacity → investigated below. 4. Native simulator → none reachable from this environment (Linux, no KVM, no Remote Control folder offered); staging options below. 5. UI retrievability incl. relaunch and second device → A writes `retrieval.blackbox.tsx`. 6. Safety-critical wrong Showing Up eligibility → D gates it at 0. 7. Deceased-relative exclusion → B removes the blanket rule; D re-judges se-002 and adds deceased-referent cases. 8. Final independent review of PR #93 (migration compatibility, sync, stale states, security, source integrity, recovery, rollback) → launched.

**Freeze holds:** no new surfaces, no architecture change, no production change.
- **B, deceased-relative rule revised** (`e25a450`, PR #91): the blanket exclusion is gone; a person who has died is a valid referent ("Grandma passed away in March. She loved her garden." → Grandma, no question, as the model filed it); when code cannot tell, it asks "Seun, or Seun's dad?" whether or not the relative died; one bounded cue (the pronoun's own clause carries a future time word or travel, and the clause before says the relative died) lets the model's filing on the living person stand at confirm tier for a glance (`subject_after_loss`), never auto. Coverage doc §3.6 now reads as answered by the founder. Gated metrics unchanged at target on both splits and modes; Deno 545, Jest 1332, standard replay 5/400 as before.
- **D, verification items** (`072266c`, PR #92): `evals.yml` gains a `cmr1` job on the label `run-evals-cmr1` (the founder's authorisation): cost estimate first (483 calls, about $9 at list prices), one live run of dev and held-out ×3 with the repository secret, raw output as an artifact, then replay through the PR head's pipeline and through `main`'s `_shared` tree (new `--shared` flag) so baseline and candidate are compared on identical model outputs; a Summary table per split (recall, precision, identity errors, unnecessary clarification, silent loss, omitted-as-understood, omitted/rejected, unsafe eligibility, retrievability, latency p50/p95). Omitted-by-model vs rejected-by-pipeline classified per fact, with `omitted_reported_understood` gated at 0; on `main`, 20 dev / 12 held-out facts are rejected by the pipeline (the pronoun and sentence-wide holds, now quantified). `eligibility_unsafe` gated at 0 (sensitive unconfirmed, should-have-asked, wrong person or subject, must-not people, no span); date-precision mismatches informational. se-002 re-judged: retained on Seun or asking which are both acceptable; four deceased-referent cases added (all pass on `main`). Corpus re-frozen as `cmr1-v1.1` (148 narratives, 158 Tells, 426 facts; held-out set unchanged). New `main` oracle baseline recorded. **Label `run-evals-cmr1` added to PR #93 (RC `3ef12d0`, carrying D and B's final commits): the live run is the founder-authorised spend.**

**Bug ledger:** the staged reporting model (IMPLEMENTED · MERGED · DEPLOYED · LIVE-MODEL VERIFIED · NATIVE-SIM VERIFIED · DEVICE VERIFIED · FOUNDER ACCEPTED) is in `bug-ledger.md` with K34–K36 restated against it.

## 5. The founder directive (verbatim, 14 Nov 2026)

Kinship — Core Memory Reliability Milestone (CMR-1)
Founder directive
We are temporarily freezing new feature development and design exploration to address the reliability of Kinship's core experience.
The approved Moment Deck, Notebook and Showing Up product direction stands. We are not reconsidering the product strategy, starting over, or introducing another design direction.
The immediate priority is making Kinship a product that people can actually trust with their memories and relationships.
Recent founder-device bugs have been unacceptable:

* K36: Kinship asked "Who is Has?" after interpreting an ordinary verb as a person's name.
* K34: Voice recognition duplicated an entire spoken passage.
* K35: A meaningful, tender story about my daughter produced "Nothing to remember."
* Earlier K30/K31: Ordinary narratives produced unnecessary pronoun clarification, and Kinship's own "Tell the rest" continuation failed to understand what it was about.
* Earlier relative-resolution bugs caused legitimate memories to be lost, incorrectly attributed, or impossible to save after clarification.

These are not independent cosmetic issues. They are failures in the fundamental promise of Kinship.
Kinship remembers what matters in the lives of the people you care about and brings it back when it matters, so you can show up.
We cannot fulfill that promise if the user needs to speak unnaturally, repeatedly correct obvious interpretations, or wonder whether something meaningful was actually remembered.

1. Execution mandate
You are the coordinator responsible for delivering this milestone end to end.
This is an implementation directive, not a request for a research report, architecture proposal, test plan, or backlog.
You are authorized to:

* Inspect the repository, implementation, documentation, open PRs, bug ledger, test infrastructure and available development environments.
* Create implementation branches, workstreams, issues and PRs.
* Delegate work to parallel Claude Code agents where appropriate.
* Run live-model evaluations, database integration tests, black-box tests, native simulators and Release builds.
* Implement fixes, perform bounded architectural refactoring, and independently verify the integrated result.
* Resolve defects discovered during implementation rather than stopping after documenting them.

Do not impose artificial token, iteration or simulator-run limits that prevent completing the milestone. Be efficient, but prioritize delivering a genuinely reliable product.
Do not ask the founder to manually pass messages between workstreams or repeatedly test individual defects.
Production merges, gateway deployments, production migrations, production data changes and feature-flag enablement still require explicit founder authorization.
Do not expand the approved product roadmap or undertake an unnecessary full rewrite.

2. Establish the actual current state
Begin by reviewing:

* Current `main`, including its latest commits and deployed-version documentation.
* `CLAUDE.md` and the canonical product contract.
* `docs/product/bug-ledger.md`.
* The approved-design coverage documentation.
* Existing CER-1 requirements, especially GitHub issue #64 and its associated workstreams.
* PRs #74–#88, particularly #78, #80, #82, #85, #87 and #88.
* The current extraction pipeline, voice implementation, capture storage, review flows, sync behavior, person-page retrieval and Showing Up eligibility.

Identify the actual implementation state, not just what historical PR descriptions claim.
Distinguish:

1. Implemented in a branch.
2. Merged to main.
3. Deployed to the appropriate environment.
4. Verified on a matching native build and gateway.
5. Accepted by the founder.

The current bug ledger's use of FIXED is too broad. Update the reporting model so that a code fix is not confused with a verified product fix.
Record the baseline commit SHA, model, prompt version, gateway version, native build and relevant feature flags for your evaluations.
Preserve existing founder decisions and approved product behavior.

3. Architectural principle: separate the Tell, understanding and Showing Up
The reliability architecture must explicitly distinguish three layers.

A. The original Tell
The original user-submitted words are the primary record of what was shared.
A retained Tell must remain accessible even if:

* Extraction returns no structured memories.
* The AI misunderstands part or all of the story.
* The note contains an unknown person.
* The note contains no identifiable person.
* A gateway call fails.
* A long narrative is only partially understood.
* The user declines an extracted interpretation.
* The user moves between devices.

Explicit discard, Undo, deletion and privacy decisions must retain their existing intended semantics.
Never resurrect something the user explicitly chose to discard. Do not conflate rejecting an interpretation with rejecting the underlying Tell.

B. Kinship's understanding
Structured memories, people, relationships, events, promises and open threads are derived interpretations of the Tell.
They must be:

* Grounded in the user's actual words.
* Correctly attributed.
* Correctable.
* Traceable to their source.
* Recoverable when understanding is incomplete.
* Distinguishable from the original Tell.

An uncertain interpretation must not silently overwrite a confirmed fact or create a fabricated relationship.

C. Showing Up
Today, Moments, reminders, suggestions and follow-through must use appropriately trusted memories.
An incorrectly attributed, unresolved, rejected or insufficiently grounded interpretation must never trigger an inappropriate suggestion.
Preserve the existing product contract for source grounding, sensitive content, privacy, reminders, paused people and user-initiated actions.
The objective is to strengthen these layers within the existing architecture, not to build a second competing system.

4. Workstream A — Capture integrity and universal Tell retrieval
Address K34 and K35 as complete product capabilities, not just the exact reported examples.

Voice integrity
Audit the entire voice recognition lifecycle:

* Partial and final recognition callbacks.
* Repeated final results.
* Whole-session transcript replacements.
* Pauses and resumed speech.
* Stop, cancellation and interrupted sessions.
* Multiple recognition segments.
* Intentional repetitions by the user.
* Permission failures and unsupported devices.

The transcript submitted for understanding must faithfully represent what the user intended.
Be particularly careful that duplicate-removal logic does not remove legitimate intentional repetition, such as emphasis or two similar statements spoken separately.
Preserve the existing on-device recognition and audio privacy guarantees.

Every retained Tell must be findable
PR #87 made progress by displaying unstructured Tells on known people's Pages. That is necessary but insufficient.
A retained Tell that says "Kept your words" must have a discoverable location even when it names nobody in People.
Implement the smallest coherent extension to the approved Notebook experience that guarantees access to every retained Tell.
Requirements:

* A Tell associated with a known person can be found from that person's page.
* A Tell without a confirmed person can still be found.
* Multi-person Tells remain accessible without creating unnecessary duplicates of the underlying record.
* Failed and partial extractions do not make a Tell disappear.
* Retrieval works after relaunch and synchronization to another device.
* Access respects deletion, Undo and account privacy.

Use a durable shared source of truth for capture and extraction status where necessary. Do not rely solely on transient device-local state to determine whether a Tell exists or should be visible.
Do not build an unrelated journal product or large new navigation system. Extend the approved Notebook model.

Recovery
Review how existing saved-but-unstructured Tells can be recovered or reprocessed without duplicating memories, overwriting user corrections or resurrecting rejected content.
Implement a safe recovery path for future failures.
Do not modify historical production records without explicit authorization.

5. Workstream B — Robust identity resolution
Review the actual architecture of:

* Model-generated person references.
* `resolvePerson`.
* `refileBySubject`.
* `leadingName`.
* `statementNames`.
* `neverAName`.
* `withSubject`.
* Pronoun resolution.
* Related-person and companion matching.
* Clarification and held-item resolution.

Immediate requirement: independently review PR #88
The proposed K36 fix must not be accepted solely because its current regression tests pass.
Review these specific concerns:

1. The English-word blacklist prevents the reported "Has" error but may not generalize to unfamiliar verbs, non-English names, uncommon names or words that can also be names.
2. Removing capitalization as a requirement is correct. However, this must not create a new path where arbitrary lowercase words become potential people.
3. Restoring a subject to a model-generated sentence is appropriate only when the subject is sufficiently grounded. Do not make an uncertain attribution look more authoritative.
4. The regression test for a model proposing "has" as the new person appears capable of passing with zero retained items. Strengthen it to prove the meaningful fact is preserved or enters a valid, discoverable recovery state.
5. Verify that preventing a false person does not introduce an unnecessary generic clarification or silent loss.

Fix these issues as appropriate and add positive and negative regression coverage.

Broader identity-resolution requirements
Investigate whether the current system is unnecessarily reinterpreting the AI's semantic understanding using lexical heuristics.
Where practical, establish a clearer boundary:

* The AI proposes contextual understanding, subjects, entities, relationships and source spans.
* Deterministic logic validates that the interpretation is grounded, authorized, internally consistent and safe.
* Deterministic logic must not arbitrarily override a grounded subject merely because a generated statement starts with a capitalized word.
* When model output and source evidence conflict, resolve the conflict conservatively through context, targeted verification or a genuinely necessary clarification.

Evaluate bounded improvements such as structured subject references, explicit mention spans, entity types and targeted semantic verification.
Do not automatically adopt a new architecture or add an additional AI call to every Tell. Compare alternatives against the existing implementation, including correctness, latency, cost and complexity. Implement the smallest approach that materially improves reliability.
Cover:

* Lowercase and uppercase names.
* Uncommon and culturally diverse names.
* Names that are also ordinary words, such as Will, May and Mark.
* Possessive relationships.
* Multiple people sharing a name.
* A new person with the same name as a relative or existing contact.
* Children, spouses, relatives and pets.
* Pronouns across multiple sentences.
* Subjectless continuation clauses.
* General Tell versus a person's page.
* Named and unnamed relatives.
* Places, organizations and objects that resemble names.
* Voice transcription without reliable punctuation or capitalization.
* Multiple people discussed in one natural story.
* Genuine ambiguity where clarification is necessary.

The user should never need to capitalize names, use formal grammar or construct a sequence of artificial commands for Kinship to understand them.

6. Workstream C — Memory completeness and failure recovery
Audit the pipeline from submitted capture through final visible memories.
Determine how information can be lost at each stage:

* Model omission.
* Model-generated invalid references.
* Evidence matching.
* Person resolution.
* Duplicate detection.
* Supersession.
* Sensitivity handling.
* Clarification.
* Database writes.
* Sync.
* UI filtering and presentation.

No silent loss
Every meaningful, in-scope assertion should be accounted for as one of:

* Correctly retained.
* Already known and properly deduplicated.
* Awaiting necessary clarification or confirmation.
* Explicitly declined by the user.
* Intentionally excluded under the product contract.
* Not yet understood, with a discoverable recovery path.

Do not imply that all information was understood when meaningful portions were not.
Do not confuse the application's ability to extract structured facts with the value of what the user shared.

Repeated evidence
PR #87 identifies a remaining server limitation: a source phrase appearing more than once can cause otherwise legitimate memories to be rejected as `evidence_ambiguous`.
Investigate and resolve this class of failure.
Prefer explicit source offsets or another verifiable evidence mechanism over relying on a unique text match alone.
Preserve existing safeguards against fabricated evidence and contradictory statements.
Test both:

* Repeated source phrases that genuinely express the same fact.
* Identical phrases appearing in different contexts or referring to different people.

Do not relax evidence validation indiscriminately.

Natural narratives and long Tells
Verify that the previous CER-1 work remains effective:

* No artificial eight-item memory cap.
* Complete processing of long, natural narratives.
* Correct context for "Tell the rest."
* Honest partial-coverage reporting.
* Recovery without duplication or incorrect attribution.

A person should be able to speak naturally for several minutes without Kinship silently forgetting the latter portion of their story.

User-facing language
Remove any remaining user-facing behavior that dismisses a retained meaningful Tell as worthless simply because structured extraction failed.
Use accurate, restrained language that distinguishes:

* What was kept.
* Where it was kept.
* What Kinship understood.
* Whether anything requires further input.

Do not redesign the approved visual experience unnecessarily.

7. Workstream D — Realistic evaluation infrastructure
The current number of passing unit tests is not a sufficient measure of product reliability.
Create an executable, versioned evaluation suite based on realistic personal conversations.
Use synthetic or properly anonymized data. Do not unnecessarily reproduce the founder's private relationships, personal records or actual family stories in fixtures or external evaluation services.

Evaluation corpus
Start with at least 100 diverse natural narratives, supplemented by focused adversarial cases.
Include:

* Everyday family updates.
* Tender observations that may not require an action.
* Friendship conversations.
* Work and life changes.
* Upcoming celebrations.
* Personal preferences.
* Health and sensitive situations.
* Commitments and promises.
* Multi-person anecdotes.
* Relatives, pets and ambiguous references.
* Long, conversational voice-style transcripts.
* Intentional repetition.
* Corrections to previously remembered information.
* Notes without a known person.
* Notes without an actionable memory.
* Genuine non-memory input.

Create expected per-fact ledgers specifying the subject, source, desired disposition, required clarification and relevant Showing Up eligibility.
Test complete conversations and sequences, not only isolated inputs.
Include a separate held-out evaluation subset to detect overfitting to the development fixtures.

Live-model evaluation
Run the actual supported model and matching extraction pipeline repeatedly on the corpus.
Use at least three runs per narrative for the release-candidate evaluation, unless an independently justified equivalent provides better evidence.
Report results separately for:

* Deterministic oracle evaluations.
* Replayed model-output tests.
* Live-model evaluations.
* Database and API integration.
* Native Release-simulator journeys.
* Physical-device verification.

Do not combine these into a misleading single pass rate.

Required metrics
Measure:

* Per-fact recall.
* Per-fact precision.
* Correct subject attribution.
* Fabricated or incorrectly proposed person identities.
* Unnecessary clarification rate.
* Correct clarification rate on genuinely ambiguous cases.
* Silent meaningful-fact loss rate.
* Original Tell retrievability.
* Source-grounding violations.
* Duplicate-memory rate.
* Incorrect Showing Up eligibility.
* End-to-end latency, including median and p95.

Capture a baseline before material changes and compare the integrated candidate against it.
Proposed release targets for the defined evaluation corpus:

* 100% of retained Tells retrievable.
* Zero silently discarded meaningful in-scope assertions.
* Zero confirmed wrong-person assignments.
* Zero fabricated person identities presented as genuine clarification candidates.
* Zero source-grounding and privacy violations.
* At least 95% recall of eligible, unambiguous meaningful facts.
* At least 98% precision for retained structured facts.
* No more than 2% unnecessary clarification on unambiguous narratives.
* All intentionally ambiguous, safety-critical cases resolved safely.
* No material unexplained latency regression.

The recall target does not excuse silent loss: any missed meaningful assertion must be explicitly accounted for and recoverable.
These are proposed measured release targets for the corpus, not claims of perfect real-world AI behavior.
If a target cannot be reached, investigate the failure and implement improvements. Do not weaken the evaluation or redefine the denominator to manufacture a pass. Escalate a genuine remaining product tradeoff with concrete evidence.

8. Workstream E — Integrated native experience and trust verification
Verify the reliability changes through the actual approved product experience.
Exercise the following complete journey using a matching Release native build and real-model gateway in an authorized development or staging environment:

1. Onboarding and adding people.
2. Telling a natural story through text.
3. Telling a natural story through voice.
4. Reviewing correct understanding.
5. Resolving a genuinely ambiguous person.
6. Finding the original Tell.
7. Viewing derived memories and their sources.
8. Correcting or rejecting an interpretation.
9. Undo and deletion.
10. Partial understanding and recovery.
11. Relaunch and synchronization across devices.
12. A meaningful Today Moment based on a trusted memory.
13. A grounded Showing Up suggestion.
14. User-initiated Message or Call handoff.
15. Return check and follow-through.

Also verify:

* Offline and intermittent connectivity.
* Gateway errors and retries.
* Multiple concurrent submissions where supported.
* Duplicate submissions and idempotency.
* Paused reminders.
* Sensitive content.
* Person merge and Undo merge.
* Account isolation.
* Data export and deletion.
* Small-screen layouts and accessibility where affected by changes.

Preserve the existing approved trust floor.
Do not treat a working mocked screen, passing Jest suite or successful API response as proof that the integrated user journey works.
Physical-device behavior that cannot be independently verified must be explicitly marked as pending. Minimize the eventual founder-device acceptance to one consolidated session.

9. Workstream coordination and independent review
Organize the milestone into parallel workstreams where it improves execution:

* A: Capture integrity and universal Tell retrieval.
* B: Identity resolution and PR #88.
* C: Memory completeness and recovery.
* D: Evaluation infrastructure and independent regression coverage.
* E: Integration and native verification.

The coordinator owns the overall result.
Establish shared contracts and file ownership early to avoid conflicting changes in the extraction pipeline and capture model.
The evaluation workstream should remain sufficiently independent from the implementation workstreams to catch regressions and prevent overfitting.
Use GitHub PRs for implementation evidence and review. Where an independent reviewer is available, allow direct review and correction through GitHub rather than requiring the founder to act as a courier.
Do not assume the existing agent-loop pilot automatically covers these PRs. Verify its actual enrollment and authorization before relying on it.
Produce coherent, reviewable PRs and a final integrated release candidate.

10. Completion requirements
This milestone is NOT COMPLETE until:

* K34, K35 and K36 have been addressed as failure classes, not just individual examples.
* The earlier natural-story and continuation regressions remain resolved.
* Every retained Tell has a discoverable location.
* Identity resolution is substantially more robust across realistic language.
* Meaningful omissions and incomplete understanding are explicitly accounted for.
* Repeated evidence no longer causes avoidable memory loss.
* The evaluation corpus and metrics are reproducible.
* The approved Showing Up experience remains grounded and functional.
* The integrated release candidate passes its native journeys.
* Independent review has been completed or its actual limitations have been documented.
* A concise, consolidated founder acceptance path is prepared.

Do not declare readiness based on test counts alone.

11. Final delivery package
When the implementation is complete, deliver:

A. Executive summary
* What changed.
* Which underlying reliability problems were solved.
* What remains unresolved.
* Whether the release candidate is ready for founder acceptance.

B. Architecture and implementation
* The previous failure mechanisms.
* The revised capture, understanding and identity-resolution behavior.
* Key design decisions and alternatives considered.
* Relevant PRs, commits and code locations.
* Any migrations or deployment dependencies.

C. Before-and-after evidence
Report the baseline and final live-model metrics side by side.
Include examples of representative failures before and successful behavior after, along with regression evidence for cases that must still ask clarifying questions.

D. Readiness matrix
For each critical defect and capability, distinguish:
* Implemented.
* Merged.
* Deployed.
* Live-model verified.
* Native-simulator verified.
* Physical-device verified.
* Founder accepted.

E. Release and recovery plan
Provide:
* Exact PR merge order.
* Required gateway deployment.
* Required native build, if any.
* Migration and feature-flag dependencies.
* Safe rollback or containment options.
* Known remaining risks.
* Any proposed historical-memory recovery requiring approval.

F. Founder acceptance
Provide one short, consolidated acceptance journey focused on the real product experience, with approximately 5–8 meaningful scenarios.
Do not provide an enormous manual QA spreadsheet or ask me to independently reproduce every engineering test.
I want to evaluate whether Kinship is enjoyable, dependable and useful for showing up in people's lives.

12. Start execution now
Begin by inspecting the current repository and PR #88, establishing the baseline and coordinating the workstreams.
Then proceed directly into implementation, evaluation, correction and integration.
Do not stop after proposing the plan. Do not wait for separate approvals between ordinary engineering workstreams. Escalate only genuine founder-level product decisions, material architectural tradeoffs, production authorization requirements or blockers you cannot resolve independently.
The deliverable is a working, reviewed, integrated Kinship reliability release candidate.
The bar is not whether Kinship can pass a scripted demo. The bar is whether someone can tell Kinship an ordinary, meaningful story about someone they love and trust that it will listen, understand, remember and help them show up appropriately.
Execute accordingly.
