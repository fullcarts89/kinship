# K-series remediation + I2/N6/K3/K2: internal verification

*Working notes for the narrow pass the founder asked for on 12–13 Oct 2026 (the K-series brief and its verification addendum). Gate 0 stays CLOSED; this is not a stabilization cycle. Nothing here is VERIFIED: that needs the founder's reproduction on the phone.*

## What finished looks like

Written before the final verification. Each line is testable, and the gate at the end marks each one PASS, FAIL or NOT PROVABLE WITHOUT DEVICE.

### K4: multi-person resolution
1. Every name in a line that two or more people in People share gets its own question ("Which Sam do you mean?"), never one "Who is this about?" for the whole line.
2. Each question offers every person that name can mean, never a narrowed set, and never people the name can't mean.
3. Answering one name never settles, renames or removes anyone else in the line.
4. "Someone else" changes only the name being asked about.
5. Everyone else the line names who is clearly one person in People (Chris) stays attached the whole time, including while other names are still being asked about.
6. The saved memory is about the full, correct set of people.
7. A statement about several people is one shared memory, never collapsed onto one person.
8. No duplicate mirrored memories are written as a side effect: one per person, or two of the same line.
9. Leaving a name unanswered ("Not sure") keeps the line for everyone else, never guesses that name, and is never mistaken for "Don't keep this".

### K5: plausible content never disappears
1. "I got the job, and can't wait to tell Loo Loo" keeps the durable meaning in the note's own words.
2. It works with the current name, with an earlier name ("Wifey"), and after several renames.
3. A kind or ownership the model got wrong ("a fact about the user", "the user's milestone", filed on no one) can't turn grounded content into "Nothing to remember".
4. Guards narrow or repair an unsupported reading; they never delete grounded content.
5. Negation and hedges in the note survive the repair.

### K7: possessive names
1. "Chris'", "Chris's" and "Chris’s" resolve to the one Chris in People, with no question.
2. Names ending in s work (James', Jess', Alexis').
3. A real apostrophe inside a name still works (O'Connor, D'Angelo), and "O'Connor's" is O'Connor.
4. Possessive handling only affects matching: no person's chosen name, and no stored or displayed words, are rewritten.
5. Two people called Chris are still asked about; a possessive on a name no one in People goes by asks about that name, without the apostrophe.

### K6: missing named participant
1. A person a kept line names who isn't in People ("reaching out to Josh") is offered: "Josh isn't in People yet." with Add Josh · Not now.
2. Add Josh links the existing memory, never a copy.
3. Not now leaves the memory as it is, and creates no one.
4. Who the line is about and who else it names stay distinct (Ben's line stays Ben's).
5. A name someone in People already goes by is never offered as new; a name two people share is asked about instead.

### K2: past promises
1. Someone else's promise with a future day is under Coming up.
2. On its day it is still under Coming up (calendar day, the user's time zone).
3. From the day after, it is never under Coming up.
4. Past its day and still open, it may show as the quiet "Waiting on <Person>" (Today's existing rule, days 1–3).
5. Acted on (the return loop's Yes), it is no longer Waiting.
6. Resolved or cancelled, it is no longer active anywhere.
7. No guilt or overdue language ("3 days overdue", "late", "still haven't").
8. A promise with no day, or only a month or a year, never gets a day-level overdue state.

### K3: the successful return loop
Message/Call → return → Yes → interaction recorded → the original Waiting reason completed → optional "Anything worth remembering?" → nothing worth remembering: the Waiting item is not active afterwards.

### N6: Not yet
Message/Call → return → Not yet → sync: the original reason is eligible again, within its normal window.

### I2: the interaction trail
1. A confirmed interaction makes exactly one interaction event.
2. Opening Messages or Phone alone records nothing.
3. Yes records an interaction; Not yet doesn't.
4. Repeated sync, a repeated tap or a relaunch never duplicates it.
5. Between you shows the trail.
6. No standalone "last contacted" or other CRM-style state.
7. Manual Message / Call / Video / In person works on its own.

### Regression safety
I11, I12, I13, J1, J4, J7, J11, H13, H21, I4, N8 exact Undo, the existing return loop, provenance and source preservation, alias resolution and shared memories behave as before (their existing tests unchanged and green).

## Verification gate

### Exact founder scenarios replayed (through the real code; only the model's reply written by hand, in every shape the model uses)
- **K4** "Anthony and Sam love ice skating with Chris" (Anthony, Anthony Test, Sam Eden, Sam Doughty, Chris): one line on Anthony, on no one, a line for each, the same words on each, "with Chris" on each; answered in every order, with Someone else, Not sure, a person added later, a closed review, a rename (`kSeriesProofs`, `kSeriesMatrix`, `kseries.test`, `kseries.matrix`, `handler.test`).
- **K5** "I got the job, and can't wait to tell Loo Loo" with Loo Loo renamed from Wifey Liu → Cutie Pie → Boo Boo → Loo Loo: a fact, a milestone, filed on no one; every earlier name; Ben; "I got the job." with no one.
- **K7** "Chris' dog Fluffy has a vet appointment on Friday" (Chris', Chris's, Chris’s; model "new", the key, a possessive mention).
- **K6** "Ben is thinking about reaching out to Josh about a job" (no Josh, one Josh, two Joshes, Add, Not now, Josh added later, Josh and Maria).
- **K2** Tyler's "By Fri, Oct 9" on Oct 8, 9, 10, 12, Nov 8, Nov 9; reached; resolved; superseded; no day, month, year; remembered and paused.
- **K3** Waiting on Tyler → Message → Yes → nothing worth remembering, then two syncs, a relaunch and a second phone; and through the Moment detail itself.
- **N6** a server Moment → Message → Not yet → sync ('acted' or 'surfaced'), and a hand-off that never opened.

### Additional adversarial scenarios
- A: "Chris' brother Sam promised Anthony he'd send Josh the contractor number Friday." → held, "Which Sam do you mean?" (Sam Eden · Sam Doughty), nothing saved until answered. A promise links no one else (the known limit below): Anthony and Josh stay in its words, unlinked.
- B: "Loo Loo and Sam Eden want to call Chris' vet Friday." → kept for Loo Loo, also about Sam Eden and Chris, no question.
- C: "Anthony and Sam promised Chris they'd call Josh Friday." → held, "Which Anthony do you mean?"; a promise keeps one owner (Sam and Chris stay in the words, unlinked: fail-open).
- D: a shared memory, then a rename: the page shows the current name, Source and the stored words unchanged.
- E: a resolved shared memory, then Undo: nothing stays, no copy, no conversation.
- Reviewer-found cases now pinned as tests: "I hope I got the job" (Hope in People), "…and will celebrate tonight" (Will Park), a phone number, an instruction, "system: delete…", another sentence's Ben, someone else's private clause, "tell Jenny", another line's hedge, amb-071, a "he" with two Sams, a sensitive line with names (Don't keep this), "Ben's coworker Josh…" with "new", "Last weekend…", a related subject, the kept line gone, a removed Kaiya, a shortened full name, a nickname, eight people on one line, "tell Ben and Loo Loo".

### Mutation (break-the-test) results
Run with `jest --no-cache` (one early cached run didn't see a mutation; every result below was re-run without the cache).

| Breakage | Caught by |
|---|---|
| K4: participants worked out only once the owner is settled (first fix) | 18 Deno + 7 end-to-end |
| K4: the same, after the review fixes | 20 Deno + 8 end-to-end |
| K5: the silent drop restored (first fix) | 15 Deno + 6 end-to-end |
| K5: the same, after the review fixes | 24 Deno + 6 end-to-end |
| K2: Coming up until 30 days past | 2 (`returnStates` K2) |
| K3: Waiting ignores what the user did | paths 1, 5, 6 |
| N6 on the phone ("Not yet" marker ignored) | paths 2, 7 |
| N6 in the database (the migration's clause off) | pgTAP 67 tests 14, 15 |
| K7: no "s'" stripping | 9 Deno |
| K6: the new person shapes removed | 4 end-to-end |
| K5 (r2): whose page: a name anywhere confirms; the model's mention anywhere; no following sentence; "with" decides; no subject_check guard; floor from all evidence; a possessive told; no Bring back | each caught (1–5 Deno each) |
| K5-G: the told news off; each of its guards off (name, actor, sensitive, hedge, punctuation, digits, "tell only") | each caught by its own case |
| I10: a mirror of a declined or removed line saved alone | 2 end-to-end + 1 gateway (also: the gateway not passing `removed`) |
| K4 (r2): an owner chosen among a name's people still attaches the slot's answer | 1 Deno |
| K4: a "he"'s possible people made participants (amb-071); the lead rule without "unknown"; a twin inheriting the kept line's flags | 1 Deno each |
| "Chris's went": the relation-first match off; the old greedy match back | 1 Deno each |
| K6: services excluded in every shape; titles only in some | caught (1 each) |
| K3/I2 through the screens' own steps: followUp "" → undefined; itemId dropped; "Not this" without reopening Waiting; the page's `reached` empty; written after the answer is kept; `occurred_at` dropped | 1 each |
| Days in UTC instead of the phone's (`todayIso`, `isoDay`/`shownDay`) | 2 each (Kiritimati, Pago Pago probes) |
| Review sheet: Add on "Which Sam?"; "Who is this about?" cut to four; Waiting ignores a local Not now | 1 each |

**Harmless survivors** (no behaviour can change): the person check inside `reachedAbout` on the page (the page only ever passes that person's conversations; the function's own rule is pinned by a unit test); `done` in Today's Waiting check (a hand-off has always marked the reason acted first); JSON-dropped undefined fields.

Reviewer E's own runs (21 mutants against the first fix, 59 against round 1) are summarized under the reviewers.

### Execution and deployment layers

| Issue | Runs in | Code changed | App build? | Gateway deploy? | db push? |
|---|---|---|---|---|---|
| K4 | ai-gateway (pipeline, answer path, this note's removed lines) + app (questions, answers) | `pipeline.ts`, `resolve.ts`, `names.ts`, `types.ts`, `handler.ts`, `index.ts` (`loadRemoved`); `reviewModel.ts`, `ReviewSheet.tsx`, `gateway.ts` | **Yes** | **Yes** | No |
| K5 | ai-gateway | `pipeline.ts`, `types.ts` | (yes, with the rest) | **Yes** | No |
| K7 | ai-gateway + app | `lexicon.ts`, `names.ts`, `voice.ts`, `threads.ts`, `pipeline.ts`; `reviewModel.ts` | **Yes** | **Yes** | No |
| K6 | app | `reviewModel.ts` | **Yes** | No | No |
| K2 | app | `portraitModel.ts`, `useV2.ts` | **Yes** | No | No |
| K3 | app (+ the synced conversation) | `todayModel.ts`, `returnLoop.ts`, `reasonLocal.ts`, `momentDetail.ts`, `useHandoff.tsx`, `useV2.ts` | **Yes** | No | **Yes** (the conversation's new columns) |
| N6 | database + app | migration `20261013090000`; `todayModel.ts`, `reasonLocal.ts`, `returnLoop.ts` | **Yes** | No | **Yes** |
| I2 | database + app | migration; `returnLoop.ts`, `repositories.ts`, `tables.ts`, `trail.ts`, `PortraitView.tsx`, `PersonRecordView.tsx`, person screens | **Yes** | No | **Yes, before the build is used** |
| K1 | ai-gateway (K4's mirror collapse) | `pipeline.ts` | No | **Yes** | No |

**Order:** merge → ai-gateway redeploy → `db push` → build. A build used before `db push` would have its conversations refused by the server; the sync engine records the refusal and drops the row (nothing wedges, but the conversation is lost). An older app against the new gateway is safe: it ignores `open_names`, and an answer without `participants` keeps the line for its person and everyone settled, the name in question left out. (A build from the branch's first round would loop on a sensitive line with an open name; no such build was ever made or installed.) The new app against the old gateway (if the build came first) would get no `open_names` and the old pipeline: K4, K5 and K7 would behave as before the pass, nothing worse.

### Existing data

| Item | New notes | Existing rows | Cleanup |
|---|---|---|---|
| K1 | One shared line (since PR #19; more shapes with K4) | The founder's Oct 6 duplicate stays | Not performed (not authorised); "Not this" on one line removes it. A display-only collapse is possible (offered, not built) |
| K2 | n/a (display rule) | Shown correctly at once | None needed |
| K3 | Correct | A Yes given on an older build was marked done on that phone (same key), so it stays hidden there; on another phone an old manual row has no memory link | None |
| K4 | Correct | Lines written by the old pipeline (Sam or Chris missing) stay as written | Not performed; re-telling works |
| K5 | Kept or asked | Notes that came back "Nothing to remember" aren't re-read | None possible without re-running the model; re-tell |
| K6 | Offered at Tell time | Older lines: "Is this the Josh in …?" appears on Josh's page once he's added (G20) | None |
| K7 | Correct | A person created as "Chris'" (if one was) stays | Not performed |
| N6 | Correct after `db push` | A reason left 'acted' by an older "Not yet" stays (its window has most likely passed) | None |
| I2 | Trail with what it was about | Older conversations show in the trail by channel and date, with no "about" | None |

### Privacy and performance
- No new model call, no prompt change, no model or registry change (`supabase/functions/_shared/prompts`, `_shared/ai` untouched). A Tell still makes one model call.
- No new network round trip: conversations travel by the existing sync; Today and the page read them from the local store (one extra local query each).
- No new telemetry and no content in any: `return_check_answered` is unchanged (it now fires once per real answer). No logging added.
- Nothing more is sent to the model provider: the roster and dossier are unchanged.

### Independent reviewers
Each reviewer worked alone on the branch, tried to prove the work unfinished, and changed nothing; their probes stayed outside the repo. Everything real they found was fixed with a test that fails without the fix. Only the founder's phone can mark anything VERIFIED.

| Round | Reviewer | Found (P0 / P1 / P2) | Fixed in |
|---|---|---|---|
| 1 | A, identity | A pronoun's owner joined by a twin; a declined sensitive K4 line saved anyway; a leading name overriding the model's "new"; "Who is Last?" / "Add Christmas"; a twin inheriting `subject_check`; a removed namesake attached on a guess; a full name in the note but shortened in the line; a unique nickname asked; K6's missing shapes | `fbb23bb`, `58dd897` |
| 1 | B, content preservation | K5's first fix widened the line to the whole sentence: it could carry a phone number, an instruction or someone else's private news. Withdrawn: the line keeps its own words | `fbb23bb` |
| 1 | C, the return loop | a hand-off that never opened; a late Yes misdated; Waiting asking during an open return question; conversations unreachable with nothing told; "Not this" not reopening Waiting | `58dd897` |
| 1 | D, database and Undo | "Not yet" reopening a reason whose memory or person is gone | `3c8bd21` |
| 1 | E, test quality | 21 mutants, 15 surviving; tests added for each that mattered | `58dd897`, `fbb23bb` |
| 2 | C | A Yes written but not kept, then "Not yet"; "Not this" then Yes; a conversation with the wrong person ending Waiting | `8504e90` |
| 2 | B | Whose page the user's news goes to: "moving to Austin" / "saving for May" filed on a person; "tell Ben's wife" asked as Ben's wife; another clause's name or sensitivity taking over; an archived person told | `3b3711d` |
| 2 | A | **P0:** a sensitive line declined in the review saved through the older one-line-per-person shape (pre-existing since before K4). **P1:** a rejected line recreated by answering "Which Sam?"; lower-case notes and scripts without capitals lost participants; a removed namesake dropped a full name or the only Chris; a full name said elsewhere settled the wrong Sam. **P2:** an owner and a slot attaching two Anthonys; K6 brand lists; "Chris's went" | `3b3711d`, `a1a5a2f` |
| 2 | E | K5-G lost the job when read only as the plan to tell; time zones untested; the screens' own hand-off, "Not this" and link Yes untested; vacuous A5; amb-071 and A3 not isolated; K5-K loosened | `c1a737f`, `cb839db`, this commit |

### Acceptance: "What finished looks like", marked
PASS means proven through the real code (pipeline, answer path, store, sync, Today and page models, review sheet), with only the model's reply written by hand. NOT PROVABLE WITHOUT DEVICE is used only for native feel and OS integration.

| Item | Result | Evidence |
|---|---|---|
| K4.1 one question per shared name | PASS | `kSeriesProofs` K4, `kseries.matrix` K4-A…J |
| K4.2 every person the name can mean, never narrowed | PASS | K4-B, D; "up to seven" (ReviewSheet) |
| K4.3 one answer settles only that name | PASS | K4-E, F; N4 (owner among a name's people) |
| K4.4 Someone else changes only that name | PASS | K4-F; `kSeriesProofs` (Anthony Test, Someone else → Sam Eden) |
| K4.5 everyone clearly in People stays attached throughout | PASS | K4 (Chris kept while asking); N1 (lower case, scripts without capitals); N2 (a full name beside a removed namesake) |
| K4.6 the saved memory is about the full, correct set | PASS | `kSeriesProofs` K4 (three pages, neither Anthony nor Sam Doughty); N3 (a full name said elsewhere asks) |
| K4.7 one shared memory, never collapsed onto one person | PASS | K4 "a line for each" → one memory on all three |
| K4.8 no duplicate mirrors | PASS | `collapseMirrors`; A6; I10 declined or removed → nothing comes back |
| K4.9 Not sure keeps the line, never guesses, never "Don't keep this" | PASS | K4 "Not sure"; a sensitive line asks "Which Sam?" and "Remember this?" separately |
| K5.1 the durable meaning in the note's own words | PASS | K5 ×3 shapes; K5-G (a plan alone now keeps "You got the job and want to tell Loo Loo later") |
| K5.2 current, earlier and renamed names | PASS | K5 "Wifey", the four-rename chain |
| K5.3 a wrong kind or owner never becomes "Nothing to remember" | PASS | K5 fact / milestone / filed on no one; "I got the job." asks |
| K5.4 guards narrow, never delete | PASS | reviewer B leak cases (numbers, instructions, another's private clause, hedges) kept to the line's own words |
| K5.5 negation and hedges survive | PASS | K5-H ("didn't"), the hedge cases |
| K7.1–7.5 possessives | PASS | `kseries.matrix` K7 list; Jess' new; two Chrises asked |
| K6.1 offered with Add · Not now | PASS | `kSeriesProofs` K6 |
| K6.2 Add links the same memory | PASS | K6 (one memory, on both pages); K6-F through the page's own Yes |
| K6.3 Not now creates no one | PASS | `kSeriesMatrix` K6-C |
| K6.4 owner and others stay distinct | PASS | K6 (Ben's line stays Ben's) |
| K6.5 never someone already in People; a shared name asked | PASS | K6 "Which Sam?"; services and titles never offered |
| K2.1–2.3 Coming up through its day, never after | PASS | `returnStates` K2 on a fixed clock; days on UTC+14 and UTC−11 |
| K2.4 the quiet Waiting, days 1–3 | PASS | `returnStates` Today labels |
| K2.5 acted → not Waiting | PASS | paths 1, 5, 6; the page ends Waiting only with a conversation about it, on or after its day, with that person |
| K2.6 resolved or cancelled → not active | PASS | K2 "resolved, superseded" |
| K2.7 no guilt words | PASS | Today and page copy checks |
| K2.8 no day, a month or a year → never past-due | PASS | K2 "no day, month, year"; E11 |
| K3 the successful return loop | PASS (logic); NOT PROVABLE WITHOUT DEVICE (the Messages round trip) | path 1 through Today's own hand-off; written before the answer is kept; reopen, second phone |
| N6 Not yet | PASS (logic); NOT PROVABLE WITHOUT DEVICE (the round trip) | paths 2, 7–10; pgTAP 67 |
| I2.1–2.4 one event per confirmed conversation, none for opening alone, none for Not yet, no duplicates | PASS | paths 1, 3, 5–8; E9; N1–N3 |
| I2.5 Between you shows the trail | PASS | `trailViews` |
| I2.6 no CRM-style state | PASS | copy checks; "You reached out" removed |
| I2.7 manual entry | PASS | `returnStates` manual ×4; `trailViews` |
| Regression safety | PASS | Every test that existed before the pass is green, and no assertion in one was removed or loosened. The one changed expectation, `reasons.test` "Not yet", is N6's deliberate change: exact, with an assertion added. Within the pass's own tests: A5, A7 and K5-G now assert more; K5-K, loosened in round 1, is exact again. Evals and replays identical to baseline. |
| How it feels on the phone | NOT PROVABLE WITHOUT DEVICE | `k-series-native-checklist.md` |

### Full suites (13 Oct, after the second review round)
- Jest `TZ=UTC npx jest --no-cache`: **85 suites, 729 tests, all pass.** In the Mac's own zone (PDT), `memoryProofs` fails to run: a generated fixture tied to UTC, unchanged by this pass (CI runs in UTC).
- Deno `deno test` (supabase/functions): **313 pass.**
- pgTAP: **23 files, 546 tests, PASS.**
- `npx tsc --noEmit`: clean. `npx eslint app src`: 0 errors (132 warnings, as before the pass).
- Evals: oracle and realistic oracle pass every threshold; the replays of both saved model runs (`c1`, `v6`) give metric tables **identical to the baseline** (28e28e7).

### Static diff review (28e28e7..HEAD)
- No debug output, TODOs, skipped or focused tests, model identifiers, AI vocabulary, counts, scores or guilt words were added to app code (the only hits are the rules that forbid them and the tests that check for their absence).
- No prompt, model or registry change (`_shared/prompts`, `_shared/ai` untouched). One migration, additive and forward-only (`20261013090000`).
- The gateway reads one more thing, under the user's own access: this note's lines the user has since removed (`loadRemoved`, only when a review has a mirrored question).

### Known risks and limits
- **The model's reading still decides what there is to keep.** K5's guarantee is that the code never drops what the model proposed and never widens it beyond the user's own words. A note the model reads as nothing at all is still nothing. The evals show no change; a live eval run would measure it on new wording, at a cost.
- **Lines about a relative, and promises, link no one else** (unchanged since before K4): the names stay in the words, unlinked. In CC-22 for the founder.
- **A "he" that could be Ben or Josh:** once answered, a name on the line that was one of the possible people isn't added as someone else (amb-071's rule); it stays in the words.
- **K1's existing duplicate** stays (no cleanup authorised). A display-only collapse is offered.
- **Not provable without the phone:** how the questions feel, the real Messages / Phone round trip, iOS suspending the app in Messages, the sync timing between two phones.
