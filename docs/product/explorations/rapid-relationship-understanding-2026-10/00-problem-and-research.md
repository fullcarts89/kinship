# 00 · The problem, the current state, the evidence, and a knowledge-for-value framework

*Deep research, 18 Oct 2026, on `main` `9ad5e6d` (PR #49); revised 19 Oct for the founder's review notes and the long-narrative direction (`05`). Research only: nothing here changes a canonical document, a prompt, a schema or a screen. The concurrent Showing-Up Actions thread was not visible on 18 Oct; it is now PR #51 (CC-28, open), and `04` §4 is reconciled against it as of 19 Oct, to be re-read once that PR is final.*

## Executive summary

**The three highest-leverage opportunities**

1. **Make one story the unit of capture, not one fact.** The pipeline already turns a four-clause note into four sourced lines (the Matt proof, `activation-pass.md` §2). The product does not tell the user that; the first Tell asks for "one thing", the field is one line tall, and every fact is a submit → wait → review cycle. Reframing the first Tell around one person and one short story, teaching keyboard dictation in one line of copy, and letting the user keep telling while earlier notes are understood would cut the submissions and watched waits to reach a few useful memories from roughly nine to one or two, with no pipeline or model change. This is product copy and a small amount of UI on approved surfaces, so it needs the founder's yes, not a new epic. **With one hard gate (the founder's direction, 19 Oct):** the extraction path today bounds a note at eight items and truncates or drops past several other limits without telling the user (`05` §2). Story-first capture becomes the default only once silent capacity-based loss is eliminated, by architecture, not by a bigger number (`05` §6); until then the invitation stays at the length the path provably handles.
2. **Treat Tell latency as candidate reliability work with a measured target, and prove each step on the phone before anything is authorised.** Model time is the floor, and the floor rises with what is told: the 19 Oct calibration (`07`) measured ≈ 1.75 s + 1.5 s per proposed memory, so a one-fact note is near 3–4 s and a five-detail story near 9 s before any app overhead (p50 about 3–6 s across the small recorded production samples; the only p95 on record is model-only on the eval corpus; `02` §3). The app and sync overhead around it was 10.4 s in the phone-like harness before K12 and 2.5 s after; the device number after K12 has never been read from telemetry. `tell_lifecycle` already carries every stage in buckets. The **recommended next work** is a native benchmark (on the founder's yes for their own account's events, else the simulator) before any optimisation is chosen. The safest candidates after that are structural (sending the note directly instead of waiting for a sync pass, applying the gateway's reply without a second full pull, keeping the dock open for the next note), not a smaller model; **each would need its own technical brief, trust regression evidence and the founder's authorisation** (`04` §9 D7). Nothing here assumes a gateway or onboarding change.
3. **Let knowledge grow from the loop that exists.** The return check already asks "Anything worth remembering from talking with Ben?" after a confirmed conversation. That is the progressive-capture mechanism: it asks when there is something to say and never otherwise. The product should rely on it, plus the hand-off sheet's "You could mention", as the way a thin portrait becomes a rich one, and should stop measuring activation by roster size ("≥ 8 people") in favour of the first trustworthy memory and the first hand-off with context.

**The three ideas to recommend against now**

1. **Social-media import** (Instagram, LinkedIn, Facebook). No official API exposes a user's friends' lives; what is reachable is the user's own profile and media. The content that would be useful is exactly what is not licensed, and scraping or user-export workarounds produce biographical trivia with no provenance and a consent problem for the friend. `03` §3.
2. **An AI interviewer or conversational onboarding.** It is a chat as a primary surface, each turn is a model round trip, and it moves the user's effort from recalling to answering. One story plus the existing extraction is faster, cheaper and already built. `01` §5.
3. **Apple Journaling Suggestions as a relationship source.** Apple's documentation describes the entitlement as a self-service Xcode capability (a correction to the brief's premise), but what the picker returns is a moment the phone noticed (a photo, a workout, a place, a contact's **name and photo only**), chosen one at a time by the user in a system process. It supplies a "who" and a "when", never a sourced fact about what is going on in that person's life; the user still has to tell that. There is no React Native binding. It is a plausible *later* prompt source ("You saw Maya on Saturday. Anything worth remembering?"), not an onboarding accelerator, and not worth a spike before the loop is proven. `03` §2.4.

**Answers to the brief's fourteen questions** are in `04` §8, each marked evidence / inference / hypothesis.

---

## 1. The founder's problem, restated

Kinship's value depends on knowing something true about a person *before* the moment it matters. Today the only way to know anything is for the user to tell it, one Tell at a time, with a wait and often a look-over per Tell. In personal testing the founder spent an evening adding details about a handful of people and did not feel the value arrive. If that is representative, a user who understands the product and cares about their friends can still leave because getting started feels like admin.

The research question is not "how do we collect more facts faster". It is: **what is the smallest amount of reliable, useful context that lets Kinship help someone show up, how is it captured with the least effort, and how does it then grow by itself?**

Two things make this urgent rather than a later polish item:
- The wife dogfood (bucket A) is the first outside user. Her first session is this problem.
- CC-25 made the return the product. A capture path that costs an evening before the first return is a tax on the product's thesis.

---

## 2. Current state: what was read and what it shows

Sources read in full: `CLAUDE.md`, `KINSHIP_2_PRODUCT_CONTRACT.md`, `KINSHIP_2_DECISIONS.md` (CC-20 to CC-26), `KINSHIP_2_OPERATIONALIZATION.md` §23–§24, `KINSHIP_2_EPICS.md`, `KINSHIP_2_TICKETS.md`, `KINSHIP_2_COMPLETE_PLAN.md` (relevant parts), `HANDOFF.md`, `approved-design-coverage.md`, `activation-pass.md`, `today-eligibility.md`, `relationship-page-rules.md`, `bug-ledger.md`, `founder-native-feedback.md`, `k-series-postmortem.md`, `k27-diagnosis.md`, `semantic-memory-investigation.md`, `dogfood-feedback-to-evals.md`, `docs/ops/analytics.md`, `evals/README.md`, `e2e/README.md`, `audits/2026-10-16-roadmap-audit.md`; code in `src/features/setup`, `src/features/tell`, `src/features/today`, `src/features/person`, `src/hooks/useV2.ts`, `src/store/understanding.ts`, `src/store/syncEngine.ts`, `src/store/gateway.ts`, `src/platform/analytics.ts`, `supabase/functions/ai-gateway`, `supabase/functions/_shared/extraction`, `supabase/functions/_shared/ai`.

### 2.1 What exists and is good

- **Extraction is already multi-item and grounded.** One note becomes 0–10 items, each with a quoted evidence span, a kind, a subject (person / related / user), certainty, a date resolved deterministically, and a tier (auto / confirm / hold / drop). Provenance is a database constraint. The Matt note produces four correct lines with no question (`activation-pass.md` §2).
- **The trust rules are deterministic and tested**: 416 eval fixtures (`evals/extraction/MANIFEST.json` v2.9), 116 date vectors, pgTAP, a black-box harness over the real screens and gateway with replayed or live model replies, and a founder-device tier that alone makes an item VERIFIED.
- **The post-Tell contract is honest**: "Understanding…" → Kept card or sheet or "Nothing to remember", the note always saved, exact Undo, and a question only when code confirms ambiguity.
- **Progressive capture already has its hook**: "Anything worth remembering from talking with Ben?" after a Yes to the return check, on Today and on the page (K28/CC-26).
- **Instrumentation exists for the phone side**: `tell_lifecycle` with `sync_bucket`, `gateway_bucket`, `server_bucket`, `network_bucket`, `render_bucket`, `total_bucket`, `retries`, `backgrounded` (N4/N5, CC-17/18), content-free; and `ai_calls` on the server with `latency_ms`, tokens, outcome and tier.

### 2.2 What the current onboarding assumes

`approved-design-coverage.md` row 4 states the people step's job as "Bring 8–20 real people in one pass". `KINSHIP_2_OPERATIONALIZATION.md` §24 sets the activation target "Onboarding done with ≥ 8 people ≥ 70%". The first Tell asks for "one thing". Every person picked gets a page that says what will be there once the user tells something.

So the design, as built, **front-loads breadth (people) and back-loads depth (knowledge)**, and the only depth path is per-fact. This is the structural cause of the founder's evening, not a bug in any one screen. The epic's own acceptance criteria state the breadth goal outright: "Median onboarding under 3 minutes in alpha. ≥ 8 people picked median." (`KINSHIP_2_EPICS.md` E16).

**What the record holds, and does not hold.** No document quotes the founder saying a Tell session took an evening; that report arrives with this brief. What the native passes do record is each ingredient of it: G1 ("There's a lag between sending and the summary appearing"), G2 ("About 8 s from adding a fact to seeing it"), G4 and G11 (facts that never showed, 15–30 s, "Gave up"), G10 (sometimes a summary, sometimes not: "Inconsistent"), G41 (kept without a yes when the app was left), K12 (~25 s Tell → Today), K14 (a removal so slow it seemed to fail), K24 (two "Understanding…" at once), K27 ("Who is Fluffy?" when the note had already said). And the founder's own design rule from round 4 (`founder-feedback-4.md` I2): *"The danger is a product the user has to maintain… Completing the relationship loop should usually require one tap after the real-world action. Two taps only when Kinship genuinely needs information it doesn't know."* The same rule, applied to capture, is this research's standard. The one counter-signal is G13: on seeing held notes waiting for an answer the founder said "That's actually a good feature", and the recorded fix was "visibility, not fewer questions". Earlier, Checkpoint C measured confirmation friction at ~52% of captures and set a target of ≤ 0.15 clarifications per capture (CC-12; `KINSHIP_2_OPERATIONALIZATION.md` §8); that figure has not been re-measured on the current pipeline.

`wife-dogfood-final-review.md` §5 already lists the first-session friction expected for the first outside user: hesitation at the Contacts prompt, scrolling a long address book, "The first Tell's blank box… She may not know what is 'worth remembering'", the consent naming the provider, and a review sheet on the very first Tell.

### 2.3 What the latency record actually says (details in `02`)

| Measurement | Conditions | Source |
|---|---|---|
| Model p50 2.7 s, p95 5.8 s | Eval run, prompt v5-era | `founder-native-feedback.md` H8 |
| Model p50 3.2 s, p90 4.4 s, max 9.9 s (51 calls) | Production `ai_calls`, prompt v6, 6 Oct | `core-trust-closure-report.md` §5 |
| Model 5.1–7.9 s, median 6.1 s (12 calls) | Live model through the harness, 13 Oct | `k-series-postmortem.md` §G |
| One note's call 4.3 s, "roughly 5–7 s end to end" | One founder Tell, 7 Oct | `founder-native-feedback.md` G1 |
| App + sync 10.4 s → 2.5 s, no model time | Phone-like harness (3 ms a statement, 250 ms a round trip), before and after K12 | `bug-ledger.md` K12 |
| ~25 s Tell → Today | Founder's phone, 13 Oct, before K12 and with K20's merge bug | `bug-ledger.md` K12 |
| "Expect roughly the model's time plus 2–3 s" on device after K12 | Prediction, never read back from telemetry | `bug-ledger.md` K12 |

These are different dates, prompts, networks and harnesses, and their sample sizes differ by two orders of magnitude: the eval p95 rests on 400 fixture calls of the model alone; the production p90s on 51 and 38 calls; the harness median on 12; the device figures on one or two Tells. Only the first is a tail statistic, and it is not the app path (`02` §3 says what each can and cannot support). **There is no current device benchmark.** The telemetry to produce one exists in the dogfood build; nobody has queried it since K12 (the ledger says "Not measurable (14 Oct): the line never came (K20)" and nothing after).

### 2.4 What the brief's hypotheses look like against the code

| Hypothesis | Status in the code | Assessment |
|---|---|---|
| Start with a small number of people | The picker allows one person; "Skip for now" exists; nothing pre-checked | **Supported, needs copy and metric changes**, not code (`01` §3) |
| Targeted questions about those people | The pipeline asks only ambiguity questions; no recall prompts exist | **Supported as optional recall prompts**, never as a survey (`01` §4) |
| Longer natural-language stories | The pipeline handles them (dense proofs); the UI does not invite them | **Supported; the cheapest win** |
| Voice capture, guided | Keyboard dictation works in every field today; D5 forbids a mic until on-device; the Listening screen is questioned (CC-25) | **Dictation now by copy; a dock mic later; no Listening screen** (`01` §5, `03` §2.1) |
| Import from social media | Nothing exists | **Reject** (`03` §3) |
| Contacts, calendar, links, photos | Contacts birthdays in setup; calendar out of V1 (T7/D6); share extension Explore later; photos nothing | **Contacts: keep as is. Share extension: the best external path, later. Calendar: Explore later as evidence, with a correctness caveat. Photos: a narrow "photo + a sentence" Tell is plausible later; no library scanning** (`03`) |
| Process multiple memories more efficiently | Each Tell is one model call producing all items; several Tells are several calls | **One story per call is already efficient; the inefficiency is the UI cycle, not the model count** (`02` §6) |
| Reduce time between capture and result | Measured once in a harness, never on device after the fix | **Measure first** (`02` §5) |

---

## 3. What information does Kinship actually need? (Track A)

### 3.1 Against the "complete profile"

A profile is a set of fields that are either filled or empty, which invites filling. Kinship's own rules already reject that frame: no counts, no completion, "Kinship reduces work; it never creates maintenance". The question is what knowledge *produces a return*, because the return is the product (CC-25).

Working backwards from what Today and the hand-off sheet can do today, and from the commit-next reasons:

| What Kinship can do with it | Knowledge needed | Minimum capture | Today's rule |
|---|---|---|---|
| Bring back a day (Moment) | one dated event or milestone about the person, day-precise | one sentence with a day in it | `today-eligibility.md` primary moment |
| Congratulate (Moment) | one good-news fact, dated to the day or undated | one sentence | good news |
| Follow up (Moment, day after) | one dated event with a follow-up policy | one sentence with a day | event follow-up |
| Birthday (Moment, quiet line, page) | the contact's birthday | zero effort (Contacts) | birthday |
| Hand off with context ("You could mention") | any current line about the person | one sentence | K26 |
| Remember your own promise (commit next) | the user's promise, with or without a day | one sentence in the first person | RSN-06 |
| Ask about an open thread (commit next) | an open question in their life | one sentence | RSN-07 |
| Show the portrait | 1–3 current lines | one story | `relationship-page-rules.md` |
| Answer "what is Chris into?" (Alpha) | an interest or preference line | one sentence | Ask v1 |

**So the minimum useful memory for one person is one true, current, sourced sentence**, and the most *actionable* first sentence is one with a day in it or one that is the user's own promise. A portrait becomes useful at two or three lines. Nothing in this table needs a relationship label, closeness, personality, needs, or "health". **Kinship can provide value without inferring any of those, and the contract forbids inferring them anyway.**

### 3.2 Six lightweight dimensions, as questions rather than fields

The brief's six dimensions map cleanly onto the existing memory kinds and page sections; none needs a new slot:

| Dimension (as a question) | Existing kinds | Page section | Durability |
|---|---|---|---|
| What's going on in their life now? | fact, thread, event, milestone | Lately / Coming up | temporary (120-day window on Lately) |
| What are they into? | fact (interest, preference) | Lately, then What Kinship knows | enduring |
| What's coming up? | event, milestone, plan | Coming up | temporary, dated |
| What do you share / do together? | context, tradition, moment, shared plan | Between you | enduring |
| What do you want to do with or for them? | the user's own plan or intention | Coming up / (Intentions v0, Explore later) | user-authored, temporary |
| What did you promise, ask, or leave open? | promise, thread | You said you'd / Lately | temporary, resolvable |

**Enduring vs temporary is already encoded**: the 120-day Lately window, resolve and supersede rules, `valid_to` on facts, and the certainty vocabulary (stated / planned / tentative / reported / wished). The product does not need the user to maintain any of this. What it needs is **not to ask for enduring background during onboarding**, because enduring background (where she grew up, what she studied) rarely produces a return and is exactly the "biographical trivia" that bulk sources supply.

### 3.3 Useful knowledge per minute of effort

A rough ordering of first captures by expected return per minute, by the rules above:

1. A sentence with a day in it about the person ("Maya starts Monday") → a Moment within days. Highest.
2. The user's own promise ("I said I'd send Chris the link") → a promise reason (commit next) and a You said you'd line now.
3. A current situation ("Susan's stressed about the venue") → "You could mention" on the next hand-off; an open thread later.
4. An interest or shared plan → the portrait and the hand-off sheet; Ask later. Steady, undated value.
5. A season-only milestone ("getting married this fall") → page only; quiet until a day is known.
6. Enduring background → What Kinship knows only. Lowest.

**Design consequence:** the first-Tell question should pull 1–4 and the examples should show them; nothing should pull 6. "What's going on in Maya's life lately?" does this; "tell me about your friendship" pulls 6 and sentiment.

### 3.4 Relationships with nothing coming up

Most friends, most of the time, have no date, no transition and no birthday in the window. For them the honest value is: the portrait, the hand-off sheet with "You could mention", the user's own promises, and silence on Today. **Silence is correct**, and the product already says "Nothing needs you today" well. The risk is not that Kinship stays quiet; it is that the *onboarding* implies it won't. Journey B in `01` is written for exactly this case.

### 3.5 When Kinship knows very little

With one person and nothing told: a birthday from Contacts if there is one, the empty-page invitation, and the return loop after a real conversation. No invented prompts, no "you haven't told me anything about Sam". Journey C in `01`.

### 3.6 How knowledge should change without maintenance

Already built: supersession with history, resolve for threads, the Lately window, newcomer offers, exact Undo, "Not this". Not built and not needed for this: any periodic "is this still true?" prompt. The one gap worth noting is "Your story together" (coverage #13, still open), the home of superseded history; it is not an onboarding matter.

---

## 4. External evidence

*Evidence classes: **(R)** research-established; **(C)** competitor or vendor design observation; **(K)** Kinship-specific evidence; **(I)** strategic inference; **(H)** untested hypothesis. Citations with access dates are in `03` for platform facts and in §4.5 here for research sources.*

### 4.1 Time to first value and onboarding friction

- **(R)** Progressive disclosure improves learnability, efficiency and error rate; designs beyond two disclosure levels typically have low usability (Nielsen, NN/g, 2006, [nngroup.com/articles/progressive-disclosure](https://www.nngroup.com/articles/progressive-disclosure/)). Kinship's setup already has two levels (setup, then the product); recall prompts under the field are a third only if they are optional and silent.
- **(R)** Stated questionnaire length reduces both starts and completions, and later answers get shorter and more uniform (Galesic & Bosnjak, *Public Opinion Quarterly* 73(2), 2009, [academic.oup.com/poq/article/73/2/349](https://academic.oup.com/poq/article/73/2/349/1934884)). A six-prompt interview per person would be exactly this.
- **(C, research org)** Baymard (26 Jun 2024): the average checkout is 5.1 steps and 11.3 fields; 17% of users have abandoned for complexity ([baymard.com/blog/checkout-flow-average-form-fields](https://baymard.com/blog/checkout-flow-average-form-fields)). An e-commerce number, cited only as the general shape: fewer required fields, more completions.
- **(C, vendor)** Reforge's activation model (setup moment → aha moment → habit moment) and Amplitude's "aha moment" guidance (find it by retention correlation; "avoid selection bias") frame the question Kinship should ask of its own data: which first action correlates with return, the first Kept card, the first page with a line, or the first hand-off with context ([reforge.com/guides/enable-plg-led-activation](https://www.reforge.com/guides/enable-plg-led-activation); [amplitude.com/blog/aha-moment](https://amplitude.com/blog/aha-moment)). Vendor content; no primary time-to-value study was found, and the "7 friends in 10 days" anecdote has no primary source.
- **(K)** The plan's own targets are roster-shaped ("≥ 8 people", E16; §24) rather than value-shaped. CC-25 already moved the north star to showing-up moments; activation metrics have not caught up (`04` §5).

### 4.2 Speech versus typing

- **(R)** On a touchscreen phone, speech entry was 2.93× faster than the keyboard in English (153 vs 52 WPM) and 2.87× in Mandarin, with fewer errors during entry (5.30% vs 11.22% corrected) but slightly more left in the final text (1.30% vs 0.79%) (Ruan, Wobbrock, Liou, Ng, Landay, *PACM IMWUT* 1(4), 2017, [arxiv.org/abs/1608.07323](https://arxiv.org/abs/1608.07323)). Short messages, a research recogniser; the direction holds for dictation.
- **(C)** Longer composition by continuous dictation spends a large share of time on navigation and correction early on; harder composition tasks increase error-correction use (Dugan et al., IBM, CHI 2010; Gaines, Kristensson & Vertanen, CHI 2021). The cost of speech is the correction pass, and for Kinship that pass is on *names*.
- **(C)** People are hesitant to speak private or personally identifying information to a phone even at home, and more so in public (Moorthy & Vu, HCII 2014; follow-up: non-use driven by privacy and "being judged"). Relationship notes are exactly that content. **Voice is an option, not the default.**
- **(R, platform)** Apple keyboard dictation is processed on the device in many languages with no connection, and the app never sees audio ([support.apple.com/guide/iphone/dictate-text-iph2c0651d2/ios](https://support.apple.com/guide/iphone/dictate-text-iph2c0651d2/ios)). Details and the on-device recogniser options in `03` §2.1.
- **(C)** Adoption: no credible 2024–2026 dictation-specific population figure was found; survey-method studies report roughly 40–50% willingness to answer open questions by voice (Revilla, Couper & Ochoa 2018; Lenzner & Höhne 2022), the rest preferring to write. Half of users is a reason to teach the mic key, not to make it the path.

### 4.3 Structured questionnaires versus free-form storytelling, and recall cues

- **(R)** Cued recall exceeds free recall: memories that are available but not accessible become accessible with a cue (Tulving & Pearlstone 1966; the availability/accessibility distinction). Cue words reliably elicit autobiographical memories (Crovitz & Schiffman 1974; Rubin 1982). **This is the evidence for recall prompts** ("What's been happening?", "Anything coming up?"), and it says nothing in favour of a *sequence* of mandatory questions; one cue at a time is what the studies used.
- **(I)** There is no study found that compares an AI interviewer with a single open prompt for *this* task. The costs of an interviewer (latency per turn, chat as a surface, the answer-what-it-wants frame) are known from the code and the contract; the benefit is hypothetical.

### 4.4 Latency and waiting

- **(R)** Nielsen's limits: 0.1 s feels instantaneous, 1 s keeps the flow of thought, 10 s is the limit for keeping attention; anything slower than ~10 s needs a percent-done indicator and an escape ([nngroup.com/articles/response-times-3-important-limits](https://www.nngroup.com/articles/response-times-3-important-limits/)). A Tell at 6–12 s sits in the band where attention is kept only with feedback; "Understanding…" with a delayed spinner is the right feedback, and it is what exists. It also means a second note should never be blocked behind the first (`02` §7).
- **(R)** People prefer progress indicators, even inaccurate ones, to none (Myers, CHI '85). Kinship's motion spec already uses words plus a spinner after 600 ms.
- **(R, preprint)** In human–LLM interaction, participants who experienced 2-second latencies rated outputs *less* thoughtful and useful than those at 9 or 20 s; interaction behaviour was robust to latency and varied by task; long waits occasionally shifted to frustration (Tan, Messerschmidt, Yin, Nov, arXiv 2604.06183, 2026, [arxiv.org/abs/2604.06183](https://arxiv.org/abs/2604.06183)). A brief visible pause is not penalised. **The problem is not that one Tell takes six seconds; it is that nine Tells take nine waits.** Claims that streaming "feels 40–60% faster" are unsourced practitioner blogs and are not used here.

### 4.5 Privacy and perceived creepiness

- **(R)** The personalisation–privacy paradox: customers who want more information transparency are *less* willing to be profiled (Awad & Krishnan, *MIS Quarterly* 2006). A personalised service that avoids sending user data to third parties reduces perceived intrusion (Sutanto et al., *MIS Quarterly* 2013, smartphone field experiment). **This is the strongest argument for sending the model only what a note needs (already CC-3), for on-device speech, and against any source that reads a friend's data without the friend.**
- **(R)** Pew: 52% of Americans more concerned than excited about AI (2023); 70% have little or no trust in companies to use AI responsibly; 81% expect collected information to be used in uncomfortable ways; 51% still more concerned than excited in 2024, and 55% want more control ([pewresearch.org, 2023–2025](https://www.pewresearch.org/short-reads/2023/10/18/key-findings-about-americans-and-data-privacy/)). Kinship's invisible-intelligence stance and explicit consent are aligned; bulk import would cut against it.

### 4.6 Comparable products (verified from vendor sites and listings, 18 Oct 2026; `03` has the detail)

| Product | Onboarding shape | What it teaches Kinship |
|---|---|---|
| **Mesh** (formerly Clay; Automattic) | Connect email, calendar and social accounts; contacts are created from metadata and enriched (job changes, news); AI "Nexus" over the network; free tier to 1,000 contacts with a card | Value with no typing, bought with broad read access up front. The opposite trust trade from Kinship's. It reads only recipients and subject lines of email, never bodies, and says so: a precedent for stating exactly what is read |
| **Dex** | 15+ sources, LinkedIn via a browser extension, keep-in-touch cadences per person; no free plan | The cadence model is what CC-25 forbids (rhythm as a mechanism) |
| **Monica** | An empty list plus vCard/CSV import; everything else typed | The manual-entry archetype; Kinship's extraction is the difference |
| **Reflect** | Start with today's note; voice memos transcribed with the user's own provider key | Capture habit over import; nothing is pre-filled |
| **Granola** | No bot; transcribes meeting audio on the user's machine, then "enhances" the user's own rough notes; privacy policy says recordings are not retained, and does not claim on-device transcription (a correction to the brief's premise) | Value shown as "your notes, made better" immediately after the event; the user's words stay primary |
| **Apple Journal / Day One** | One consent sheet; suggestions from what the phone already knows (photos, workouts, places, people); the user picks a moment and writes | Zero upfront entry; cue-then-write. The closest shape to Kinship's values |
| **Kin** (personal AI) | Marketing says on-device memory; a review says setup "asks quite a few questions before you get into the real value"; privacy label lists data linked to the user | The interview-first cold start is the complaint |
| Limitless / Rewind, Dot, Friend pendant | Wound down, acquired, or reviewed as not working (2025–2026) | Ambient capture products have not held; passive listening is not a path |

**Pattern across the products closest to Kinship's values:** zero upfront data entry, one consent, value from material the user already has, the user picking what to share. The products that import wholesale (Mesh, Dex) sell to people who want a network tool, and they take email and calendar access to do it.

---

## 5. Critical assessment: what the evidence and the code say about each proposed idea

| Idea | Verdict | Why (class) |
|---|---|---|
| One person first, then a story | **Pursue, test in Stage 2** | Focus reduces the blank-page cost and matches how the pipeline is best used (K: context person reduces who-questions; I: ranking risk is in framing) |
| Guided prompts | **Pursue as four optional recall prompts** | Cued recall beats free recall (R, §4.4); a survey is maintenance (contract) |
| Long natural-language story | **Pursue, cheapest** | Already works (K: dense proofs); the UI hides it |
| Keyboard dictation | **Pursue by copy, now** | Faster than typing (R); zero cost; names need a visible transcript (I) |
| Dock mic (on-device) | **Later, as CC-25 already says** | D5; measure dictation first |
| Listening screen / continuous capture | **Not now** | Converts transcription errors into trust failures (I); questioned by CC-25 |
| AI interviewer | **Reject** | Chat as primary surface (contract); slower (K: model time per turn); no recall advantage over one prompt (R, weak) |
| Contacts beyond birthdays (notes field, relations) | **Reject for notes; relations only on explicit pick** | Notes field needs an Apple entitlement; relations are user-entered and rare (`03` §2.5) |
| Calendar as onboarding evidence | **Keep out of onboarding (T7/D6); evidence source later** | Attendance ≠ invitation; the correctness caveat (`03` §2.6) |
| Share extension | **The best external path; later (CC-25 order)** | Explicit, provenance-preserving, per item (`03` §2.3) |
| Journaling Suggestions | **Reject for now; a possible cue source later** | Returns a moment the user picks (a contact's name and photo, a photo, a place), never a fact; no RN binding; the capability is self-service per Apple's docs (`03` §2.4) |
| Photo + a sentence | **Plausible later, narrow** | A single picked photo with a dictated line is a Tell with an attachment; no library scanning (`03` §2.7) |
| Social media | **Reject** | No API for friends' lives; consent of the friend (`03` §3) |
| Message excerpts via share | **Only as an explicit user share of their own text, later** | Both participants' privacy; never ingestion (`03` §3.5) |
| Batch several facts in one request | **Already the case per note; don't batch across notes** | One note = one call; cross-note batching breaks provenance and the Kept card (`02` §6) |
| Raise `MAX_ITEMS` to a bigger number for longer stories | **Reject as a long-term answer** (founder, 19 Oct) | Any arbitrary cap drops information silently past it; the direction is no user-facing cap and no silent loss; bounded processing with continuation, and honest reporting of what was not processed, are the architecture questions (`05`) |
| Smaller / faster model | **Not before an eval; not as the first lever** | Accuracy gates are hard requirements; model is the floor but not the overhead (`02` §6) |
| Keep telling while earlier notes process | **Pursue; mostly a UI and sync question** | `02` §6.1 |

---

## 6. The relationship knowledge → value framework (one page)

```
                      effort to capture →
   value   ┌──────────────────────────────┬──────────────────────────────┐
   now     │ A day in a sentence          │ A story about one person     │
   ↑       │ "Maya starts Monday"         │ 3–4 sourced lines, a page,   │
   │       │ → Moment in days             │ a hand-off with context      │
   │       ├──────────────────────────────┼──────────────────────────────┤
   │       │ A birthday from Contacts     │ Enduring background          │
   │       │ → Moment, zero effort        │ → What Kinship knows only    │
   value   └──────────────────────────────┴──────────────────────────────┘
   later
```

- **Top-left** is what onboarding should ask for first. **Top-right** is what one story gives. **Bottom-left** is free and already built. **Bottom-right** is what bulk sources and questionnaires produce, and what the product should stop implying it wants.
- Knowledge then grows through the loop: a hand-off → a conversation → "Anything worth remembering?" → one more line. Each line is told when it is fresh and when the user has just seen why it matters.
