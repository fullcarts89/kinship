# 04 · Roadmap integration, validation, the fourteen answers, and the founder's decisions

*Research only, 18 Oct 2026. This document proposes; it changes no canonical decision. The buckets below are CC-25's, reproduced so that each proposal can be placed without creating a duplicate epic. Where a proposal would touch an approved surface or a trust rule, it is listed as a founder decision in §9, not assumed.*

## 1. The independent recommendation, in one paragraph

Kinship's onboarding is not fundamentally wrong. Its shape (promise → sign in → consent → people → already worth knowing → first Tell → Today) is right and honest, and the pipeline behind it already does the hard thing: one story becomes several sourced lines. What is wrong is the **unit and rhythm of capture** the product implies: one fact per Tell, a watched wait per fact, a roster of empty pages to fill, and an activation metric that counts people rather than value. Fix that with copy and small UI on surfaces that already exist (one person, one story, dictation taught, keep telling while earlier notes are understood), treat the two sync passes and the server's serial trips around the model as reliability work with a measured target, and let knowledge grow through the return loop that is already built. Do not build an interviewer, a Listening screen, a profile, or any social import. Measure before optimising, and put the first usability study before the household dogfood so the first outside user does not meet the per-fact cycle.

---

## 2. Classification: reliability, product strategy, or new capability

| Item | Class | Why |
|---|---|---|
| Sync #1's pull before the gateway call; sync #2 as the only route for rows; three saves and notifies per reply; the server's serial guard trips; the timeout mismatch; the 30 s retry floor (`02` §6 #1–6) | **Reliability work** | The same class as K12; no trust gate, prompt, model or schema touched; measured by `tell_lifecycle` |
| Several notes in flight, bounded, different people only (`02` §6 #7) | Reliability work with one new rule | Needs the same-person ordering rule and a black-box case |
| The native benchmark and the telemetry gaps (`02` §5) | Reliability work (measurement) | Content-free; CC-17/18 scope |
| One person, one story on the first Tell; the body copy on the people step; "keep telling" copy; dictation taught (`01` §3, §5) | **Product strategy** | Changes copy on approved surfaces (rows 4, 6); a founder decision and a coverage entry |
| Four optional recall prompts (`01` §4) | Product strategy | A small UI addition to the dock and the page |
| The eight-item limit on a story; the pronoun policy with a context person (`02` §8) | Product strategy (trust) | Founder decisions with evals; never a UI shortcut |
| Activation metrics re-based on value, not roster (§5) | Product strategy | Changes §24 targets; internal only |
| Dock mic (on-device), Siri / Action Button, text share extension, calendar evidence, Journaling cue, photo-plus-sentence | **New capability** | All already placed by CC-25 or the plan; nothing here authorises them earlier except the share extension's existing pull-forward rule |
| AI interviewer, Listening screen as continuous capture, social import, Contacts Notes, message ingestion | New capability, **recommended against** | `00` §5, `03` §5 |

---

## 3. Placement in the canonical buckets

Nothing moves between buckets by this document. Each proposal is placed where CC-25 already allows it or is flagged as needing a decision.

| Bucket | As CC-25 has it | What this research adds (proposal) |
|---|---|---|
| **A. Committed / current** | B6 stop → B7 → B8 → B9 → employer evaluation → low-coaching household dogfood | **Nothing displaces this.** Two small things could ride *beside* it without touching Phase 4B's order: the native latency benchmark (measurement only), and a copy-only change to the first Tell if the founder decides it (§9 D2). Whether the Stage 2 usability study runs before the household dogfood is the founder's call (§6) |
| **B. Commit next** | Showing-up measurement; promise reasons; open-thread reasons; minimal private push; the trust floor | The showing-up measurement brief should carry the activation metrics in §5 alongside (same instrument, content-free). The latency reliability bundle (`02` §6 #1–6) belongs here as reliability work, sized like K12, if the benchmark confirms the waits |
| **C. Alpha direction** | Grounded Ask; hard-time reasons; I2b; reason feedback; Siri / Action Button; Alpha trust and ops | Unchanged. Siri / Action Button is the first capture-anywhere step; this research agrees |
| **D. Explore later** | Intentions v0; chapters; calendar evidence; reconnect; About You; year-ago; **dock mic / voice; text share extension**; Landscape; Opportunity Engine; subscriptions; growth | The share extension is the best external source found (`03` §2.3); its existing pull-forward rule (captures < 1/user/week) stands. The dock mic stays step 2 after dictation is observed. Add, as hypotheses only: Contacts anniversaries; a related-name hint in "Who is Pedro?"; the photo-plus-sentence Tell; Journaling Suggestions as a planned-encounter cue |
| **E. Hold / drop / absorb** | Rhythm as a mechanism; a reconnect engine; a Brief product; monthly reporting; About You as a destination; the widget; broad semantic slots; `reason_generate`; a chatbot; a task manager; scores; CRM UI; Garden mechanics | Add: **an AI interviewer or conversational onboarding; a profile or questionnaire of any length; compulsory contact enrichment; social-platform import and data-export import; message-history ingestion; relationship completeness, "you only know N things", progress meters; a standalone voice product (the Listening screen as continuous capture)** |

**Duplicate check:** voice (E18, VOX-01…05, D5), Siri / share (E24, NAT-01/02), calendar (E21, CAL-01…06, D6), onboarding (E16, ONB-01…04), the Listening screen (coverage #29) all exist; this document cites them and creates none.

---

## 4. The interface with the Showing-Up Actions thread

No document or branch for that thread was visible at the time of writing (`00` header). The canonical definition it will build on is plan §24 and CC-25 item 1 (a showing-up moment: a grounded reason surfaced → the user acted → the return flow confirmed), widened once by CC-26 (user-initiated contextual assistance from a page). This research does not touch those files. What it offers the other thread is **the minimum reliable knowledge per action category**, so that neither thread builds profiles because a future action might want them:

| Action opportunity (the other thread's categories) | Required evidence (what Kinship must know) | Minimum viable capture | Confidence / consent constraints | Dependencies |
|---|---|---|---|---|
| A meaningful check-in / message | One grounded current line about the person (a situation, a thread, a plan) | One sentence in a story; or the return-check prompt after a conversation | Any certainty, shown as said; nothing sensitive on a lock screen; never a relative's line as theirs | Built (K26 "You could mention"); open-thread reasons (commit next) |
| Congratulate / mark a milestone | One good-news fact or a milestone named outright, with a day or told that day | One sentence with a day | Stated or planned only; never hearsay; day-precise for a Moment | Built (Today rules) |
| Follow up after something | One dated event with a follow-up policy | One sentence with a day | Exact day; sensitivity none for Today | Built |
| A shared experience / plan | One remembered interest, or a shared activity, or an undated plan | One sentence; "What do you do together?" as a recall prompt | Shared memories stay one memory with every participant (K4); never inferred from frequency | Built (plans, Between you); Intentions v0 (Explore later) if the user names a wish |
| A gift or thoughtful gesture | A stated preference or interest, or an explicitly meaningful occasion | One sentence ("she's been wanting a proper espresso machine"); Ask ("What gift did Susan mention?") | Preferences are enduring facts; never inferred from brands or posts; no purchase integration implied | Ask v1 (Alpha) for retrieval; nothing in capture |
| Practical support (a hard time) | A known circumstance, sensitive class | The user's own sentence, confirmed ("Remember this?") | **Always confirmed; never a Moment with cheerful copy; lock screen private; hard-time reasons are Alpha** (CC-25) | RSN-09 (Alpha) |
| Keeping a promise | The user's own promise, with or without a day | One first-person sentence | "I told him I'd…" is tentative today (activation-pass q5): a founder decision | Promise reasons (commit next) |
| A group plan / bringing people together | Several identified people **and an explicit user intention** ("I want to get the Austin crew together") | One sentence naming the people and the wish | Never inferred from co-mentions; the intention is the user's words | Intentions v0 and chapters (Explore later) |

The capture side's commitment to the other thread: every row's minimum capture is **one sentence the user tells**, through the same Tell, with the same provenance. Nothing in this table needs a new slot, a profile, an import, or a question Kinship asks unprompted.

---

## 5. Metrics that would show progress (internal, content-free)

All of these fit the F0-D4 rules and the existing closed schema; none is shown to the user. They complement, and do not replace, the north star.

| Metric | Definition (content-free) | Instrument | Replaces |
|---|---|---|---|
| **Time to first trustworthy memory** | Account created → first Kept card or look-over with ≥ 1 line and no correction within the session | `tell_lifecycle` + `review_item_accepted/rejected` (product scope) | "Onboarding done with ≥ 8 people" |
| **Time to first useful insight or action opportunity** | Account created → first of: a Today Moment, a hand-off sheet with ≥ 1 "You could mention" line, a page with ≥ 2 lines | `reason_surfaced`, `handoff_opened` (add `mentions_n` 0–2), a new `portrait_lines_bucket` | — |
| **Useful memories per minute of effort** | lines kept (not rejected) ÷ minutes between `capture_started` and the result, per session | `capture_started/completed`, `extraction_completed.items_n`, `review_*` | — |
| **Tell submissions to reach three kept lines about one person** | count of captures with the same context person until lines ≥ 3 | derived from the above | — |
| **Share of users reaching value before leaving setup** | the first-value event above before `capture_abandoned` or session end during setup | `capture_abandoned` has `chars_bucket` already | — |
| **Correction and clarification burden** | `clarification_shown` ÷ captures; `review_item_rejected` ÷ `review_item_shown`; `extraction_corrected` ÷ captures | exists; the plan's target ≤ 0.15 clarifications per capture | CC-12's ~52% figure, never re-measured |
| **Latency p50 / p95 and wait abandonment** | `total_bucket`; `backgrounded = true` while understanding, as the proxy for "left during the wait" | `tell_lifecycle` | — |
| **Perceived effort and comfort** | Stage 2 and 3 interviews only (never in the app) | the study protocol | — |
| **Return usage and real-world actions** | the north star (showing-up moments per activated user); `return_check_answered` | plan §24 | — |
| **Trust and privacy concerns** | "Not quite" reasons; interview prompts; mute/pause rates once push exists | `captures.feedback` (never leaves the phone), interviews | — |

**Stop criteria** for any concept in validation: a wrong-person rate above 1 per 500 captures on the concept's path; any participant describing the flow as a survey, a ranking of friends, or "creepy" in more than one of five sessions; a clarification rate that rises above the baseline arm; latency p95 above 10 s after the reliability bundle; any need to relax a tier to make the concept feel good.

---

## 6. Staged validation

### Stage 1 · Baseline and native performance audit (now; measurement only)

- The native benchmark in `02` §5.3 on the simulator tier with the live model and the founder's exact People, and, with the founder's yes for their own account, the `tell_lifecycle` events from their phone on the current build.
- A live run of the Matt note, the Susan story and the Chris story (`01` §7) through the real gateway on the local stack, recording: items, tier, questions asked, and whether a context person removes the pronoun look-over.
- The baseline effort table (`01` §1) measured: taps and seconds for "three people, three facts each" on the current build.
- Output: a dated evidence file in this folder (not canonical). **Cost:** a few hours; live-model calls at the smoke scale (`evals/README.md`: ~$0.20–2.50). **Gate:** founder's yes for the account read; otherwise simulator only.

### Stage 2 · Focused prototype usability study (before the household dogfood, if the founder agrees)

- Three arms (`01` §8): A current; B one person + one story + dictation taught; C B plus recall prompts. Five to eight participants per arm, moderated, 20 minutes each, remote or in person.
- Scenarios: a friend with a life event (Susan); a friend with nothing coming up (Chris); one multi-person story; one "nothing comes to mind" (Journey C).
- Participants tell real stories about real friends **into a lab account on the local stack**; recordings are of the screen and the participant's voice with consent; nothing is kept as data, fixtures or evals without the per-note consent process in `dogfood-feedback-to-evals.md`.
- Measures: time to the first correct Kept card; lines per minute; review taps; questions asked; whether anyone hesitates to choose one person or asks "does it matter who"; the participant's own words on effort and comfort.
- **Prototype cost:** arms B and C are copy and a prompt row on existing screens, behind a dev flag in a lab build; no pipeline change. One or two days.
- **Decision at the end:** which arm goes to Stage 3, or none.

### Stage 3 · Small opt-in dogfood experiment (after founder approval; could be the household dogfood's round 1 itself)

- The strongest arm, per-user flag, the founder's and the household account only, with the activation metrics in §5 collected under the performance scope rules extended to those events (a CC-17-style decision).
- Two weeks; the nine low-coaching questions already in `HANDOFF.md`, plus: "Did telling Kinship about someone feel like work?" and "Did you ever stop because it was slow?"

### Stage 4 · Broader cohort (only if Stage 3 supports it)

- Beta cohort 1 (plan §30), the same metrics, retention read at weeks 2 and 6 against the plan's activation targets re-based per §5. Qualitative findings from Stages 2–3 are never reported as retention improvements.

---

## 7. Two sequencing options

### Conservative

1. Finish bucket A as ordered (B7 → B8 → B9 → employer evaluation).
2. Run the household dogfood round 1 on the current onboarding, with the §5 activation metrics added to the showing-up measurement brief.
3. Read the friction; run Stage 1 and Stage 2 after; decide the first-Tell change and the reliability bundle on evidence from a real outside user.

**Pros:** no change to what the first outside user meets before the committed path ends; one experiment at a time. **Cons:** the household dogfood's first session meets the per-fact cycle and the two-sync wait unchanged; the one thing this brief says is a retention risk is measured only after it has happened to the first outside user.

### Targeted acceleration (recommended)

1. **Now, beside B7:** Stage 1 (measurement only; no product change). It takes hours and settles whether the sync passes and the server trips are worth the K12-class work.
2. **If the benchmark shows ≥ 2 s outside the model at p50:** the reliability bundle (`02` §6 #1–6) as one PR, with the black-box runs and a gateway deploy, scheduled where K12 was: as reliability work, not roadmap. It does not touch B7–B9's files (the portrait, What Kinship knows, facets).
3. **Before the household dogfood:** Stage 2 (two days of prototype, a week of sessions). If arm B or C wins, the copy change to the first Tell and the people step (founder decisions D1–D3 below) ships in the dogfood build. If A wins, nothing changes and the brief's concern is answered with evidence.
4. The household dogfood runs as planned, round 1 without push, now also carrying the §5 metrics.
5. Everything else (dock mic, share extension, recall-prompt variants) waits for Stage 3's reading, in CC-25's order.

**Why this and not more:** it addresses the two things the evidence supports (the wait is structural; the unit of capture is implied by copy) before the first outside user, without displacing a single committed item, without a model or prompt change, and without any new capability. **Why this and not less:** the plan's own beta gate already says to change the input if captures fall short; finding that out from the household dogfood instead of a two-day study is the expensive way.

---

## 8. The brief's fourteen questions, answered

Each answer is marked **E** (evidence in the code, the canon or cited research), **I** (inference from evidence), or **H** (hypothesis to test), with what would change it.

1. **Is the current onboarding fundamentally wrong, or does it mostly need refinement?** Refinement. **E:** the flow's order and honesty are right and tested; the pipeline is multi-item. **I:** the per-fact unit, the roster-first framing and the two-sync wait are the problem. *Changes if:* Stage 2 shows participants cannot produce a story even with one person named, examples shown and a prompt offered; then the problem is the blank page, not the unit, and a guided single prompt becomes the design.

2. **Should users begin with 1–3 people instead of importing a larger group?** Yes, by framing, not by limit. **E:** the picker already allows one and pre-checks nothing; each extra person is an empty page. **H:** a small pick, framed as a start rather than a ranking, completes more often and feels lighter. *Changes if:* participants in Stage 2 feel asked to rank, or if birthdays in the window turn out to be the main first value (then more people means more birthdays, and breadth earns its cost).

3. **What is the minimum amount of knowledge necessary to create useful value?** One true, current, sourced sentence about one person; the most actionable first sentence has a day in it or is the user's own promise. A portrait is useful at two or three lines. **E:** `today-eligibility.md`, `relationship-page-rules.md`, K26. No relationship label, closeness, personality or "health" is needed, and the contract forbids inferring them.

4. **Is one longer natural-language capture better than several small captures?** Yes, strictly, for everything except the pronoun policy and the eight-item limit. **E:** one model call, one write, one card for N lines; the dense Matt proof. **E:** the look-over sheet on dense notes is policy; `MAX_ITEMS = 8` drops the ninth silently. *Changes if:* live runs of real stories show a higher wrong-subject rate than single facts (the eval corpus has few story-shaped cases; add them first).

5. **How much might voice help, and is a dedicated voice interface justified?** Dictation helps a lot on the words (about 3× faster, **E:** Ruan et al. 2017) and costs nothing; names are its weak point, so the transcript must be visible before Keep. A dedicated interface is not justified now: the Listening screen as continuous capture turns mis-heard names into trust failures; the dock mic (on-device) is the right second step and already in CC-25's order. *Changes if:* Stage 2 shows people cannot find the keyboard mic, or dictation users correct more than typists.

6. **Which external data sources could genuinely reduce friction without compromising trust?** Contacts birthdays (built); keyboard dictation; later, the text share extension and Siri / Action Button, both already in the roadmap. **E:** `03`. Everything else either cannot name a person with provenance or reads about people who did not agree.

7. **Which ideas should we avoid, even if technically possible?** An AI interviewer; any questionnaire or profile; social import and data exports; message-history ingestion; the Contacts Notes field; photo scanning or face naming; completeness or "you only know N things"; a smaller model chosen for speed before an eval; cross-note batching; streaming unvalidated lines. **E/I:** `00` §5, `02` §6, `03` §5.

8. **What is currently making Tell slow, and how would you prove the next optimisation is worthwhile?** The model (3–6 s, the floor) wrapped in a full sync pass before the call, 12–14 serial server trips around the call, a second full sync pass before the card can show, and nine or ten full hook re-reads on one serial queue. **E:** `02` §2, §4. Proof: the native benchmark in `02` §5.3 before and after, read as `tell_lifecycle` stages; a change that does not move a stage by ≥ 1 s at p50 or ≥ 2 s at p95 is not worth shipping. *Changes if:* the benchmark shows the device already sits at model + 1 s; then only the model is left and the answer is "no optimisation; change the unit of capture".

9. **Can users add many details without waiting for every previous detail to finish processing?** On the phone, already yes (the field is free; a second note is kept at once). In the pipeline, not yet: notes are understood one at a time, each after a sync. **E:** `understanding.ts` `passOnce`. With the reliability bundle the wait per note shrinks to about the model's time; with bounded parallelism for notes about different people it disappears; notes about the same person must stay in order (merge / supersede). **I.**

10. **How do we demonstrate value before any future reminder actually fires?** Three honest things: the user's own words understood into sourced lines (the Kept card); the page as a portrait after one story; and the hand-off sheet with "You could mention" (K26), which is a real door out of the app with context, available today. H4's bring-back shows the loop with the user's own words when the note has a day, else the labelled example. **What not to do:** imply a reminder for a season-only wedding. **The empty-value case:** keep it quietly, show it on the page, say nothing on Today; silence is correct. **E:** `01` §7.

11. **How should relationship knowledge accumulate naturally after onboarding?** Through the loop that exists: a Moment or a page hand-off → a conversation → "Anything worth remembering from talking with Ben?" → one more line, told when it is fresh. Plus the hand-off sheet, which shows what Kinship knows at the moment the user notices what it does not. No completion, no missing-field prompts, no check-ins, no streaks. Later cue sources (a shared link, a planned encounter) feed the same prompt. **E:** K28/CC-26, T6.

12. **How does this support Showing-Up Actions without making Kinship more complicated?** By keeping one capture path and one provenance model, and by giving the other thread the table in §4: every action category's minimum evidence is one sentence the user tells. The capture side adds no slot, surface or import for the sake of a future action.

13. **What should we investigate or fix soon versus wait until later Alpha?** Soon: the benchmark; the reliability bundle if it confirms; Stage 2; the first-Tell copy and recall prompts if Stage 2 supports them; the eight-item decision; K27's fix (already proposed). Later Alpha: the dock mic, the share extension, Siri (in CC-25's order), the pronoun-policy relaxation (an eval first), photo-plus-sentence, calendar and Journaling cues.

14. **What exact founder decisions are necessary before implementation?** §9.

---

## 9. Founder decisions needed (none assumed)

| # | Decision | Options | Research recommendation | Affects |
|---|---|---|---|---|
| D1 | **Run Stage 1 now, beside B7?** Includes reading the founder's own `tell_lifecycle` events for their install | yes / simulator only / later | Yes; hours of work; no product change | Nothing on the committed path |
| D2 | **Change the first Tell to one person, one story** ("What's going on in Maya's life lately?", a taller field, a two-sentence example, "Someone else ▾", the context person passed) | yes after Stage 2 / yes now / no | After Stage 2, unless the founder prefers to ship it into the household dogfood directly | Coverage row 6 (approved surface), `firstRun.test.tsx`, `fresh-install.yaml` |
| D3 | **Change the people step's body line** to say completeness is not expected, keeping the approved question | yes / no | Yes, with D2 | Coverage row 4 |
| D4 | **Teach keyboard dictation in one line of copy** on the first Tell and the dock, never called "voice" | yes / no | Yes now; zero cost; contract-compliant | Coverage row 6 copy |
| D5 | **Four optional recall prompts** under the Tell field on a person's page and when telling about someone | yes after Stage 2 / no | After Stage 2 (arm C) | A small UI addition; coverage rows 6, 12 |
| D6 | **"Keep telling; I'll catch up"**: the dock stays open for the next note while the previous is understood, with honest copy | yes / no | Yes; it is already the behaviour, the copy makes it visible | Dock copy |
| D7 | **The reliability bundle** (`02` §6 #1–6) as K12-class work once Stage 1 confirms ≥ 2 s outside the model | yes, conditional / no | Yes, conditional | A gateway deploy; sync engine; no trust gate |
| D8 | **Bounded parallel understanding** for notes about different people (`02` §6 #7) | yes after D7 / no | After D7, with the same-person rule and a black-box case | Pipeline order rule |
| D9 | **The eight-item limit on one note**: raise with an eval, or say on the card when a note held more than eight things | raise / say / leave | Say first (honest), raise with the next eval run | Pipeline; card copy |
| D10 | **The pronoun look-over policy when the Tell has a context person and one referent** (activation-pass q7) | keep / relax with an eval / relax | Keep for the household's first weeks; run the eval in parallel | Trust tier; evals |
| D11 | **Activation metrics re-based on value** (§5) in the showing-up measurement brief, replacing "≥ 8 people" | yes / no | Yes | `KINSHIP_2_OPERATIONALIZATION.md` §24 (a canonical edit, done in that brief, not here) |
| D12 | **Stage 2 before the household dogfood**, or after | before / after | Before (targeted acceleration) | The dogfood's timing |
| D13 | **Additions to bucket E** (interviewer, questionnaires, social import, message ingestion, completeness metrics, standalone voice) | record / don't | Record, so they are not re-proposed | `KINSHIP_2_DECISIONS.md` (a canonical edit, after review) |
| D14 | **Journey C's second door** ("Reach out to someone" as a first-use next step beside "Tell one thing") | yes after Stage 2 / no | Test in Stage 2's nothing-to-say scenario | Today's first-use state |
| D15 | **K27's proposed fix** go-ahead (already waiting) | yes / no | Yes; it is the one story-shaped failure already seen on device | Gateway |

**Explicitly not asked for:** any model change, prompt change, schema change, new entitlement, new permission, new processor, new surface beyond a prompt row, or any change to B7–B9, the employer evaluation, or the household dogfood's scope.

---

## 10. What would change my mind

- **On refinement vs. redesign:** Stage 2 participants freezing at a one-person prompt with examples shown. Then the blank page, not the unit, is the problem.
- **On one story vs. several facts:** a wrong-subject rate on story-shaped live runs materially above the corpus's 0.3%. Then stories need pipeline work before they become the default.
- **On voice:** dictation users correcting names more than typists type them, or nobody finding the mic key. Then the dock mic moves up.
- **On latency as reliability work:** a device benchmark already at model + 1 s. Then there is nothing to optimise and the answer is entirely product.
- **On the share extension's timing:** dogfood users repeatedly pasting things from elsewhere. Then the plan's own pull-forward rule applies.
- **On rejecting bulk sources:** a sanctioned API that returns what is going on in a friend's life with the friend's consent. None exists today.
