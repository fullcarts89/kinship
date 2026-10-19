# 04 · Roadmap integration, validation, the fourteen answers, and the founder's decisions

*Research only, 18 Oct 2026. This document proposes; it changes no canonical decision. The buckets below are CC-25's, reproduced so that each proposal can be placed without creating a duplicate epic. Where a proposal would touch an approved surface or a trust rule, it is listed as a founder decision in §9, not assumed.*

## 1. The independent recommendation, in one paragraph

Kinship's onboarding is not fundamentally wrong. Its shape (promise → sign in → consent → people → already worth knowing → first Tell → Today) is right and honest, and the pipeline behind it already does the hard thing: one story becomes several sourced lines. What is wrong is the **unit and rhythm of capture** the product implies: one fact per Tell, a watched wait per fact, a roster of empty pages to fill, and an activation metric that counts people rather than value. The recommendation is **targeted acceleration of research and measurement**: fix the unit of capture with copy and small UI on surfaces that already exist (one person, one story, dictation taught, keep telling while earlier notes are understood), treat the two sync passes and the server's serial trips around the model as candidate reliability work with a measured target, and let knowledge grow through the return loop that is already built. Do not build an interviewer, a Listening screen, a profile, or any social import. Measure before optimising, and put the first usability study before the household dogfood so the first outside user does not meet the per-fact cycle.

Three qualifications, each the founder's to decide and none assumed here:
- **The native benchmark and the usability study are recommended next work, not approved work.** This document asks for them (D1, D12); it does not start them, and it does not assume any gateway or onboarding change follows from them.
- **The latency reliability bundle is a candidate, not a plan.** It needs its own benchmark first (to show the stage it removes exists on a device), its own technical brief, trust regression evidence across every suite and tier, and the founder's authorisation (D7). The K12 precedent was a founder direction, not a standing permission.
- **Story-first capture has a hard gate before it becomes the default**: the elimination of silent capacity-based loss (`05` §6, D9). The founder's direction of 19 Oct is that no arbitrary user-facing cap on memories from one story is acceptable and no internal limit may drop information silently; a bigger number is not the answer. Until that gate passes, the first Tell may invite a story only at the length the current path provably handles.

---

## 2. Classification: reliability, product strategy, or new capability

| Item | Class | Why |
|---|---|---|
| Sync #1's pull before the gateway call; sync #2 as the only route for rows; three saves and notifies per reply; the server's serial guard trips; the timeout mismatch; the 30 s retry floor (`02` §6 #1–6) | **Candidate reliability work** | The same class as K12; no trust gate, prompt, model or schema touched; measured by `tell_lifecycle`. **Requires, before any of it ships: its own benchmark, its own technical brief, trust regression evidence (every suite and tier, plus the two-notes-in-flight case), and the founder's authorisation** |
| Longer-narrative extraction without silent loss (`05`) | **Product strategy and trust architecture** | A founder direction (19 Oct); needs a separate reviewed technical brief; no numeric cap chosen here |
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
| **B. Commit next** | Showing-up measurement; promise reasons; open-thread reasons; minimal private push; the trust floor | The showing-up measurement brief could carry the activation metrics in §5 alongside (same instrument, content-free): a proposal for that brief. The latency reliability bundle (`02` §6 #1–6) is a *candidate* for this bucket as reliability work sized like K12, **only after** its own benchmark, brief, regression evidence and authorisation (D7); it is not placed here by this document |
| **C. Alpha direction** | Grounded Ask; hard-time reasons; I2b; reason feedback; Siri / Action Button; Alpha trust and ops | Unchanged. Siri / Action Button is the first capture-anywhere step; this research agrees |
| **D. Explore later** | Intentions v0; chapters; calendar evidence; reconnect; About You; year-ago; **dock mic / voice; text share extension**; Landscape; Opportunity Engine; subscriptions; growth | The share extension is the best external source found (`03` §2.3); its existing pull-forward rule (captures < 1/user/week) stands. The dock mic stays step 2 after dictation is observed. Add, as hypotheses only: Contacts anniversaries; a related-name hint in "Who is Pedro?"; the photo-plus-sentence Tell; Journaling Suggestions as a planned-encounter cue |
| **E. Hold / drop / absorb** | Rhythm as a mechanism; a reconnect engine; a Brief product; monthly reporting; About You as a destination; the widget; broad semantic slots; `reason_generate`; a chatbot; a task manager; scores; CRM UI; Garden mechanics | Add: **an AI interviewer or conversational onboarding; a profile or questionnaire of any length; compulsory contact enrichment; social-platform import and data-export import; message-history ingestion; relationship completeness, "you only know N things", progress meters; a standalone voice product (the Listening screen as continuous capture)** |

**Duplicate check:** voice (E18, VOX-01…05, D5), Siri / share (E24, NAT-01/02), calendar (E21, CAL-01…06, D6), onboarding (E16, ONB-01…04), the Listening screen (coverage #29) all exist; this document cites them and creates none.

---

## 4. The interface with the Showing-Up Actions thread (reconciled with CC-28 as of 19 Oct 2026)

**Status of the other thread.** When this research was written (18 Oct) no branch for it was visible. It now exists as [fullcarts89/kinship#51](https://github.com/fullcarts89/kinship/pull/51) (`claude/kinship-canonical-strategy-960c7d`, **open, unmerged**), which records **CC-28** in `KINSHIP_2_DECISIONS.md` and adds `docs/product/explorations/showing-up-actions-2026-10/`. This document was reconciled against that branch's text on 19 Oct; **it must be re-read once PR #51 is final**, because CC-28's wording may still change before merge. The two threads keep separate authorities: PR #51 canonicalises a strategy (and explicitly authorises no build); this PR proposes research and asks for decisions (and authorises nothing). Neither edits the other's files.

**What CC-28 settles that this table relied on by inference:**
- Showing up is an outcome, not a channel. Its vocabulary (CC-28 §A): **presence · thoughtfulness · practical care · follow-through · shared experiences · connecting people · staying connected**, as categories for thinking, not surfaces. The rows below now use those names in place of the ad-hoc ones in the first draft.
- Memories create opportunities, not obligations (§B): no row here may become a prompt that nags for the knowledge it needs.
- The two assistance thresholds (§C, from CC-26): proactive stays strict; user-initiated help may draw on broader grounded memory. Every row's "where it can be used" column respects that split.
- Relationship value before commerce (§D) and the ten safeguards: nothing in the capture side passes a memory to any partner; the gift row is retrieval only.
- Bucket placement (CC-28): the Showing-Up Actions frame sits in **D. Explore later**; its first proposed probe (SUA-1, a fixed-template gesture line on the hand-off sheet and Moment detail) is a proposal with its own gate (G2), not a build. This research's proposals sit beside it in D or in B as reliability work, and neither thread reorders A, B or C.

What the capture side offers the other thread is **the minimum reliable knowledge per way of showing up**, so that neither thread builds profiles because a future action might want them:

| Way of showing up (CC-28 §A) | Example opportunity | Required evidence (what Kinship must know) | Minimum viable capture | Confidence / consent constraints | Where it can be used (CC-28 §C) | Dependencies (existing items only) |
|---|---|---|---|---|---|---|
| **Staying connected** | A check-in, a message, a call | One grounded current line about the person (a situation, a thread, a plan) | One sentence in a story; or the return-check prompt after a conversation | Any certainty, shown as said; nothing sensitive on a lock screen; never a relative's line as theirs | Proactive (a Moment) only within `today-eligibility.md`; user-initiated via K26 "You could mention" | Built; open-thread reasons (RSN-07, commit next) |
| **Thoughtfulness** | Congratulate; mark a milestone; a note or a small gift that fits | A good-news fact or a milestone named outright, with a day or told that day; for a gift, a stated preference or interest | One sentence with a day; for a gift, one sentence ("she's been wanting a proper espresso machine") | Stated or planned only; never hearsay; day-precise for a Moment; preferences are enduring facts, never inferred from brands or posts; **no memory passed to any commerce partner** (CC-28 §D) | Proactive for the milestone / good news; user-initiated for the gift (Ask v1 retrieval) | Built (Today rules); Ask v1 (Alpha) for retrieval; SUA-1 / SUA-6 are the other thread's proposals |
| **Follow-through** | Keep a promise; check back on an open question; follow up after a big event | The user's own promise (with or without a day); an open thread; a dated event with a follow-up policy | One first-person sentence; one sentence with a day | "I told him I'd…" is tentative today (activation-pass q5, a founder decision); exact day for a follow-up Moment | Proactive for dated follow-ups now; promise and thread reasons when built | Built (events); RSN-06 / RSN-07 (commit next) |
| **Shared experiences** | An outing tied to an interest; a plan together | One remembered interest, or a shared activity, or an undated plan | One sentence; "What do you do together?" as a recall prompt | Shared memories stay one memory with every participant (K4); never inferred from frequency | User-initiated (the page, the hand-off sheet, later Ask); never a Moment from an undated plan | Built (plans, Between you); Intentions v0 (Explore later) if the user names a wish |
| **Presence** | Being there for an occasion; a visit | A dated occasion about the person; or a user-shared invitation (SUA-5, the other thread) | One sentence with a day | Exact day; attendance of others never inferred (CC-28 calendar rule) | Proactive within the milestone / event rules; user-initiated otherwise | Built (events); calendar / invitations as evidence (D, both threads) |
| **Practical care** | Support through a hard period; a meal; help with a move | A known circumstance, sensitive class | The user's own sentence, confirmed ("Remember this?") | **Always confirmed; never cheerful copy; lock screen private; never monetised (CC-28 §D safeguard 9); hard-time reasons are Alpha** | User-initiated only until RSN-09; "ways to help" is the other thread's SUA-3, after RSN-09 | RSN-09 (Alpha) |
| **Connecting people** | An introduction; bringing a group together | Several identified people **and an explicit user intention** ("I want to get the Austin crew together"); or the user's own promise to introduce | One sentence naming the people and the wish | Never inferred from co-mentions; the intention is the user's words | User-initiated only | Intentions v0 and chapters (Explore later); promise reasons for a promised introduction |

The capture side's commitment to the other thread: every row's minimum capture is **one sentence the user tells**, through the same Tell, with the same provenance. Nothing in this table needs a new slot, a profile, an import, a partner, or a question Kinship asks unprompted. **Both threads agree on the conservative dogfood sequence** (PR #51's R3; this document's Stage 3 as the household dogfood's round 1), so neither displaces the other's evidence.

**Open between the two threads (for the founder, not decided here):** whether the showing-up measurement's evolution (PR #51 FD-5) and this document's activation metrics (§5) are specified in one brief; and whether the Stage 2 study's interview adds the other thread's MVE-1 question (three recent examples of showing up beyond a message), which costs nothing and would serve both.

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

**Stop criteria** for any concept in validation: a wrong-person rate above 1 per 500 captures on the concept's path; any participant describing the flow as a survey, a ranking of friends, or "creepy" in more than one of five sessions; a clarification rate that rises above the baseline arm; a latency tail that does not improve in the benchmark's own before/after (a p95 is quoted only with n ≥ 40 per cell); any need to relax a tier to make the concept feel good; **and, for story-first capture, any note in the `05` §5 scenarios whose omitted or unprocessed information is presented as complete understanding.**

---

## 6. Staged validation

### Stage 1 · Baseline and native performance audit (recommended next work; measurement only; needs D1)

- The native benchmark in `02` §5.3 on the simulator tier with the live model and the founder's exact People, and, with the founder's yes for their own account, the `tell_lifecycle` events from their phone on the current build.
- A live run of the Matt note, the Susan story and the Chris story (`01` §7) through the real gateway on the local stack, recording: items, tier, questions asked, and whether a context person removes the pronoun look-over.
- The baseline effort table (`01` §1) measured: taps and seconds for "three people, three facts each" on the current build.
- Add the `05` §5 regression scenarios (5, 8, 9, 15, 25 and 50 candidate details) through the real gateway on the local stack, recording the four outcome categories per note, so the silent-loss gate has a baseline.
- Output: a dated evidence file in this folder (not canonical). **Cost:** a few hours; live-model calls at the smoke scale (`evals/README.md`: ~$0.20–2.50). **Gate:** founder's yes for the account read (D1); otherwise simulator only. **Statistics:** report n with every number; call nothing a p95 below about 40 Tells per cell (`02` §3).

### Stage 2 · Focused prototype usability study (recommended next work; not approved by this document)

- Three arms (`01` §8): A current; B one person + one story + dictation taught; C B plus recall prompts. Five to eight participants per arm, moderated, 20 minutes each, remote or in person.
- Scenarios: a friend with a life event (Susan); a friend with nothing coming up (Chris); one multi-person story; one "nothing comes to mind" (Journey C).
- **Participant consent and provider processing, explicit.** Participants tell real stories about real friends. Two paths, chosen per session and stated in the consent form:
  - **Live understanding (the real path):** the story goes through the lab build to a local Supabase stack and the real gateway, and **from the gateway to the AI provider (Anthropic) exactly as the production D2 disclosure says: "Sent to Anthropic to understand it; not used to train models."** The consent form names the provider, the data (the story's text, the fixture roster, no contacts), the retention on the lab stack (deleted at the end of the session), and that the people named in the story have not consented and so names should be first names or changed if the participant prefers. A participant may decline this path and still take part.
  - **Replayed understanding (no provider):** the model stub replays captured replies (`e2e/model-stub.ts`); the story never leaves the lab machine. Usable for the flow, the copy, the prompts and the waiting states; not for extraction accuracy on that participant's words.
  - Screen and voice recordings only with written consent; stored encrypted; deleted after analysis; never attached to a fixture, an eval or a commit. Nothing becomes a regression fixture without the per-note consent and de-identification process in `dogfood-feedback-to-evals.md`.
  - No participant's story is ever entered into a real Kinship account; lab accounts only, on the local stack.
- Measures: time to the first correct Kept card; lines per minute; review taps; questions asked; whether anyone hesitates to choose one person or asks "does it matter who"; the participant's own words on effort and comfort. Optionally the other thread's MVE-1 question (§4).
- **Prototype cost:** arms B and C are copy and a prompt row on existing screens, behind a dev flag in a lab build; no pipeline change. One or two days.
- **Decision at the end:** which arm goes to Stage 3, or none. **Running Stage 2 is itself a founder decision (D12); nothing here assumes it.**

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

### Targeted acceleration of research and measurement (recommended)

1. **Now, beside B7, on the founder's yes (D1):** Stage 1 (measurement only; no product change). It takes hours and settles whether the sync passes and the server trips are worth K12-class work, and gives the silent-loss gate its baseline.
2. **If the benchmark shows ≥ 2 s outside the model at p50:** a **technical brief** for the reliability bundle (`02` §6 #1–6) naming the candidates, the deploy and the evidence tiers; then, **on the founder's authorisation (D7)**, one PR with the full regression evidence, scheduled where K12 was. It does not touch B7–B9's files (the portrait, What Kinship knows, facets). Nothing in this step is assumed.
3. **Before the household dogfood, on the founder's yes (D12):** Stage 2 (two days of prototype, a week of sessions, consent and provider processing as §6 states). If arm B or C wins, the copy change to the first Tell and the people step is proposed for the dogfood build as decisions D2–D4, **with the story invitation held to the length the current path handles without loss until the `05` gate passes (D9)**. If A wins, nothing changes and the brief's concern is answered with evidence.
4. The household dogfood runs as planned, round 1 without push, carrying the §5 metrics if the measurement brief adopts them.
5. Everything else (dock mic, share extension, recall-prompt variants, longer-narrative extraction) waits for Stage 3's reading and its own brief, in CC-25's order.

**Why this and not more:** it addresses the two things the evidence supports (the wait is structural; the unit of capture is implied by copy) before the first outside user, without displacing a single committed item, without a model or prompt change, and without any new capability. **Why this and not less:** the plan's own beta gate already says to change the input if captures fall short; finding that out from the household dogfood instead of a two-day study is the expensive way. **What it does not do:** approve a gateway change, an onboarding change, or a cap; each stays a listed decision.

---

## 8. The brief's fourteen questions, answered

Each answer is marked **E** (evidence in the code, the canon or cited research), **I** (inference from evidence), or **H** (hypothesis to test), with what would change it.

1. **Is the current onboarding fundamentally wrong, or does it mostly need refinement?** Refinement. **E:** the flow's order and honesty are right and tested; the pipeline is multi-item. **I:** the per-fact unit, the roster-first framing and the two-sync wait are the problem. *Changes if:* Stage 2 shows participants cannot produce a story even with one person named, examples shown and a prompt offered; then the problem is the blank page, not the unit, and a guided single prompt becomes the design.

2. **Should users begin with 1–3 people instead of importing a larger group?** Yes, by framing, not by limit. **E:** the picker already allows one and pre-checks nothing; each extra person is an empty page. **H:** a small pick, framed as a start rather than a ranking, completes more often and feels lighter. *Changes if:* participants in Stage 2 feel asked to rank, or if birthdays in the window turn out to be the main first value (then more people means more birthdays, and breadth earns its cost).

3. **What is the minimum amount of knowledge necessary to create useful value?** One true, current, sourced sentence about one person; the most actionable first sentence has a day in it or is the user's own promise. A portrait is useful at two or three lines. **E:** `today-eligibility.md`, `relationship-page-rules.md`, K26. No relationship label, closeness, personality or "health" is needed, and the contract forbids inferring them.

4. **Is one longer natural-language capture better than several small captures?** Yes, strictly, for everything except the pronoun policy and the path's capacity. **E:** one model call, one write, one card for N lines; the dense Matt proof. **E:** the look-over sheet on dense notes is policy; `MAX_ITEMS = 8` and the other bounds in `05` §2 drop or truncate silently past a point the user is never told about. **The founder's direction (19 Oct):** no arbitrary user-facing cap, no silent loss; so one longer capture becomes the default only after the `05` gate passes, and until then stories are invited at the length the path provably handles. *Changes if:* live runs of real stories show a higher wrong-subject rate than single facts (the eval corpus has few story-shaped cases; add them first).

5. **How much might voice help, and is a dedicated voice interface justified?** Dictation helps a lot on the words (about 3× faster, **E:** Ruan et al. 2017) and costs nothing; names are its weak point, so the transcript must be visible before Keep. A dedicated interface is not justified now: the Listening screen as continuous capture turns mis-heard names into trust failures; the dock mic (on-device) is the right second step and already in CC-25's order. *Changes if:* Stage 2 shows people cannot find the keyboard mic, or dictation users correct more than typists.

6. **Which external data sources could genuinely reduce friction without compromising trust?** Contacts birthdays (built); keyboard dictation; later, the text share extension and Siri / Action Button, both already in the roadmap. **E:** `03`. Everything else either cannot name a person with provenance or reads about people who did not agree.

7. **Which ideas should we avoid, even if technically possible?** An AI interviewer; any questionnaire or profile; social import and data exports; message-history ingestion; the Contacts Notes field; photo scanning or face naming; completeness or "you only know N things"; a smaller model chosen for speed before an eval; cross-note batching; streaming unvalidated lines. **E/I:** `00` §5, `02` §6, `03` §5.

8. **What is currently making Tell slow, and how would you prove the next optimisation is worthwhile?** The model (p50 roughly 3–6 s across small samples, the floor) wrapped in a full sync pass before the call, 12–14 serial server trips around the call, a second full sync pass before the card can show, and nine or ten full hook re-reads on one serial queue. **E** for the structure (`02` §2, §4); **I** for the durations, because no device number after K12 exists and no sample on record is large enough for a p95 (`02` §3). Proof: the native benchmark in `02` §5.3 before and after, read as `tell_lifecycle` stages with n reported; a change that does not move a stage by ≥ 1 s at p50 (and visibly in the tail's shape) is not worth shipping; then a technical brief, regression evidence and the founder's authorisation before it does (D7). *Changes if:* the benchmark shows the device already sits at model + 1 s; then only the model is left and the answer is "no optimisation; change the unit of capture".

9. **Can users add many details without waiting for every previous detail to finish processing?** On the phone, already yes (the field is free; a second note is kept at once). In the pipeline, not yet: notes are understood one at a time, each after a sync. **E:** `understanding.ts` `passOnce`. With the reliability bundle the wait per note shrinks to about the model's time; with bounded parallelism for notes about different people it disappears; notes about the same person must stay in order (merge / supersede). **I.**

10. **How do we demonstrate value before any future reminder actually fires?** Three honest things: the user's own words understood into sourced lines (the Kept card); the page as a portrait after one story; and the hand-off sheet with "You could mention" (K26), which is a real door out of the app with context, available today. H4's bring-back shows the loop with the user's own words when the note has a day, else the labelled example. **What not to do:** imply a reminder for a season-only wedding. **The empty-value case:** keep it quietly, show it on the page, say nothing on Today; silence is correct. **E:** `01` §7.

11. **How should relationship knowledge accumulate naturally after onboarding?** Through the loop that exists: a Moment or a page hand-off → a conversation → "Anything worth remembering from talking with Ben?" → one more line, told when it is fresh. Plus the hand-off sheet, which shows what Kinship knows at the moment the user notices what it does not. No completion, no missing-field prompts, no check-ins, no streaks. Later cue sources (a shared link, a planned encounter) feed the same prompt. **E:** K28/CC-26, T6.

12. **How does this support Showing-Up Actions without making Kinship more complicated?** By keeping one capture path and one provenance model, and by giving the other thread the table in §4: every action category's minimum evidence is one sentence the user tells. The capture side adds no slot, surface or import for the sake of a future action.

13. **What should we investigate or fix soon versus wait until later Alpha?** Soon, each on its own decision: the benchmark (D1); Stage 2 (D12); the first-Tell copy and recall prompts if Stage 2 supports them (D2–D5); the technical brief for longer-narrative extraction without silent loss (D9) and, separately, for the reliability bundle if the benchmark confirms (D7); K27's fix (already proposed, D15). Later Alpha: the dock mic, the share extension, Siri (in CC-25's order), the pronoun-policy relaxation (an eval first), photo-plus-sentence, calendar and Journaling cues.

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
| D7 | **The reliability bundle** (`02` §6 #1–6): first, whether to write its technical brief once Stage 1 confirms ≥ 2 s outside the model at p50; then, on that brief, whether to authorise it | brief, conditional / no | Brief, conditional; authorisation only on the brief's regression evidence | A gateway deploy; sync engine; no trust gate; its own benchmark before and after |
| D8 | **Bounded parallel understanding** for notes about different people (`02` §6 #7) | yes after D7 / no | After D7, with the same-person rule and a black-box case | Pipeline order rule |
| D9 | **Longer-narrative extraction without silent loss** (`05`, `06`, `07`). The calibration ran (19 Oct) and established silent capacity-based loss as a memory-trust defect; the brief was revised on the founder's review of the same day. The decisions it now asks for, each on its own: | | | |
| D9a | **Adopt the gate:** no silent capacity-based loss and no false completion reporting before story-first onboarding becomes the default; until then, the story invitation stays at the length the path provably handles | adopt / leave | Adopt | `01` copy; the `05` §6 gate |
| D9b | **Option A, containment** (`06` §11): a minimal trust fix that stops the silent drop, reports partial honestly, keeps and recovers the note, and fixes the timeout inversion; no continuation, no windows, no new review UX. Decide whether to commission its implementation PR (with its own evidence tiers and a gateway deploy) **before the household dogfood**, or hold it | commission before dogfood / hold until after B9 / never | Commission a brief-sized PR before the household dogfood, if the founder accepts one gateway deploy and one small forward-only migration on that path | `06` §11 A |
| D9c | **Option B, full capability** (`06` §11): continuation, durable checkpoints with atomic finalisation, windows, the second pass, the review structure. Approve the **architecture direction** only (client-driven windows; checkpoints then one write), gated after B9 and the household dogfood, with its own brief before any build | approve direction / change direction / defer | Approve the direction; defer the build | `06` §6, §9, §11 B |
| D9d | **The coverage model:** span-level positive accounting with an explicit **unknown** category; the card's strongest claim is "Kept N things"; unknown text is never shown as understood or as excluded | accept / change | Accept | `05` §3, `06` §3 |
| D9e | **Model omissions:** the second pass runs over all unknown text (no lexicon floor, which the test showed unreliable); its result reduces the unknown region but never produces "excluded"; detectability limits stated to the user only as the absence of a completeness claim | accept / change | Accept | `06` §5.5 |
| D9f | **Deadlines:** the client timeout exceeds the server's; the server's model timeout is sized to one time-bounded batch; a 409 `busy` is a wait, not an attempt | accept / change | Accept, in Option A | `06` §7, §9 |
| D9g | **The evidence plan:** fold the probe notes into a `narratives` fixture set with span-level expectations; S-trunc, S-timeout and S-resume on the Option A branch | accept / change | Accept | `06` §10 |
| D10 | **The pronoun look-over policy when the Tell has a context person and one referent** (activation-pass q7) | keep / relax with an eval / relax | Keep for the household's first weeks; run the eval in parallel | Trust tier; evals |
| D11 | **Activation metrics re-based on value** (§5) in the showing-up measurement brief, replacing "≥ 8 people" | yes / no | Yes | `KINSHIP_2_OPERATIONALIZATION.md` §24 (a canonical edit, done in that brief, not here) |
| D12 | **Stage 2 before the household dogfood**, or after | before / after | Before (targeted acceleration) | The dogfood's timing |
| D13 | **Additions to bucket E** (interviewer, questionnaires, social import, message ingestion, completeness metrics, standalone voice) | record / don't | Record, so they are not re-proposed | `KINSHIP_2_DECISIONS.md` (a canonical edit, after review) |
| D14 | **Journey C's second door** ("Reach out to someone" as a first-use next step beside "Tell one thing") | yes after Stage 2 / no | Test in Stage 2's nothing-to-say scenario | Today's first-use state |
| D15 | **K27's proposed fix** go-ahead (already waiting; CC-27 on `claude/k27-fluffy`, PR #50) | yes / no | Yes; it is the one story-shaped failure already seen on device | Gateway |
| D16 | **Stage 2's consent and provider path**: allow the live path (participants' stories sent to the provider under the D2 sentence, with written consent) or replay only | live with consent / replay only | Live with consent, replay available to anyone who declines | The study protocol (§6) |
| D17 | **Re-reconcile §4 against CC-28 once PR #51 is final**, and decide whether the measurement evolution (PR #51 FD-5) and the activation metrics (§5) share one brief | one brief / two | One brief, after both PRs are reviewed | `04` §4–§5; no canonical file from here |

**Explicitly not asked for:** any model change, prompt change, schema change, new entitlement, new permission, new processor, new surface beyond a prompt row, any numeric cap, or any change to B7–B9, the employer evaluation, or the household dogfood's scope.

---

## 10. What would change my mind

- **On refinement vs. redesign:** Stage 2 participants freezing at a one-person prompt with examples shown. Then the blank page, not the unit, is the problem.
- **On one story vs. several facts:** a wrong-subject rate on story-shaped live runs materially above the corpus's 0.3%. Then stories need pipeline work before they become the default.
- **On voice:** dictation users correcting names more than typists type them, or nobody finding the mic key. Then the dock mic moves up.
- **On latency as reliability work:** a device benchmark already at model + 1 s. Then there is nothing to optimise and the answer is entirely product.
- **On the share extension's timing:** dogfood users repeatedly pasting things from elsewhere. Then the plan's own pull-forward rule applies.
- **On rejecting bulk sources:** a sanctioned API that returns what is going on in a friend's life with the friend's consent. None exists today.
