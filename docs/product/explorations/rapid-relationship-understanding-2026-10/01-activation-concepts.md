# 01 · Activation concepts: how a new user gets to the first useful memory

*Research only (18 Oct 2026). Nothing here is built, approved or scheduled. Screens are text wireframes of proposals; copy in them is a proposal unless it quotes a built string. Decisions needed before any of it is implemented are collected in `04-roadmap-and-founder-decisions.md`.*

**The standard every concept is judged against (the brief's §19):** someone installs Kinship to be a more thoughtful friend. They choose a person, tell one short story, see that Kinship understood it correctly, and understand how that could help them show up. Then Kinship learns as they live. They never rebuild their social life as a database.

---

## 1. The baseline: what a new account meets today (A)

Read from `src/features/setup/*`, `src/features/tell/*`, `.maestro/fresh-install.yaml`, `approved-design-coverage.md` rows 1–6 and 10, `activation-pass.md`.

| Step | Screen (built copy) | User work | Where value can appear |
|---|---|---|---|
| 1 | Welcome: promise + "See how it works" (optional, 4 taps, ~15–20 s) | 0–4 taps | Understanding, not value |
| 2 | Sign in (Apple primary) | 1–3 taps | — |
| 3 | Name step (only when sign-in gave none) | type a name | — |
| 4 | Consent, "Setting up · 2 of 4", the D2 sentence, **Allow understanding** | 1 tap, some reading | — |
| 5 | **"Who do you want to show up for?"** Contacts permission → Suggested (family words, birthdays within 31 days) + Everyone, search, Add by name, "Continue with N people" / "Skip for now" | 1 permission dialog + 1 tap per person + scrolling; the plan's intent is 8–20 people (coverage row 4) | A first signal of care, but no knowledge yet: every picked person's page says "What you tell Kinship about Sarah will be here" |
| 6 | **"Already worth knowing"**: birthdays within 14 days of the picked people, "From Contacts" (at most 3). When there are none, the screen opens on the first Tell instead (`SetupViews.tsx` `WorthStepView`) | 0 | **The first real value, but conditional.** With a handful of picked people, most accounts see no line at all |
| 7 | **"Tell Kinship one thing about someone."** "Say it the way you'd tell a friend. Kinship keeps what matters and asks only when unsure." Three examples under the field. **Keep it** / **Skip for now** | type 1 sentence, 1 tap | — |
| 8 | "Understanding…" (dock) → the Kept card ("Kept for Maya", lines, Undo, Got it right / Not quite) **or** the look-over sheet ("Here's what I'll remember", tokens, Done) **or** a question ("One thing to check") | a wait of roughly the model's time + 2–3 s (`02-capture-and-latency-audit.md`); then 0–3 taps | **The second real value:** the user's own words, understood |
| 9 | Today, once: "This is where Kinship brings things back, when they matter." with the user's own first Tell when it has a day to come, else the Ben example; **Got it** (H4) | 1 tap | **The promise shown, grounded** |
| 10 | Today / People: N people, one with a line; "Tell" pinned above the bar | — | From here the user is on their own |

**What works** (from the code and the founder passes recorded in `bug-ledger.md`, `founder-native-feedback.md`):
- Nothing is pre-checked, nothing is invented, the first Tell is one sentence and the examples show range rather than categories. The flow is short in taps: about 8–12 taps plus one sentence if the user picks two or three people.
- The post-Tell contract is honest: the user's words, "You told Kinship · Oct 5", Undo, and a question only when the pipeline could not settle who or what.
- H4 shows the loop with the user's own words when it can.

**Where momentum is lost** (evidence in brackets; G = founder native pass 2, H = pass 3, K = Oct 13–16 passes):
1. **Three screens of cost before any value** (sign in, consent, people). Value cannot appear before step 6, and step 6 is conditional on a birthday within 14 days.
2. **The people step invites breadth the product cannot yet reward.** Each extra person is a tap that creates an empty page. The plan's activation target "Onboarding done with ≥ 8 people" (`KINSHIP_2_OPERATIONALIZATION.md` §24) measures roster size, which the rest of the product then has to fill by hand. This is the root of the founder's "evening of work": the picker sets up N empty portraits, and the only way to fill one is a submit → wait → review cycle per fact.
3. **The first Tell is framed as one thing.** The copy ("one thing about someone"), the field's height and the examples (one clause each) all invite a single fact. Nothing tells the user that a 60-second story is welcome, or that one note can become four lines (the dense Matt proof in `activation-pass.md` §2 shows it can).
4. **Every Tell is a round trip the user watches.** "Understanding…" is honest, but the user waits for it before telling the next thing, because the card and the sheet occupy the dock. Nothing in the UI says "keep going, I'll catch up" (the code does allow a second Tell while the first is understood: `TellFlow.keep` finishes the previous card as idle; the sync path is examined in `02`).
5. **Dense notes usually get the look-over sheet** because a pronoun lowers the tier (`activation-pass.md` §7 question 7; `pipeline.ts` `HOLD_FLAGS`). For a first-time user that reads as "it wasn't sure", even when the lines are right, and it adds a Done tap to every story.
6. **After step 9 there is no next step.** Today says "Nothing needs you today" or shows a birthday; People shows N names. The product's own answer to "what now?" is the pinned Tell field, which brings the user back to the per-fact cycle.

**Where the first compelling value is actually experienced:** the Kept card for a note that has a day in it ("Maya starts her new job on Monday") followed by H4's bring-back with the user's own words. For a note without a day (most notes about a friend), the first value is only the page's Lately line and, since K26, "You could mention" on the hand-off sheet.

### Baseline effort to reach "a few useful memories about three people" (estimate, not measured)

| | Per fact | Three people × three facts |
|---|---|---|
| Typing | ~10–20 s | 2–3 min |
| Wait for "Understanding…" → card (`02`, estimate: model p50 ~3–6 s + 2–3 s app/sync) | ~6–9 s | ~1 min of watched waiting |
| Review / question taps | 0–3 taps, ~5–15 s when a sheet opens | 1–2 min |
| Navigation (open the person, Tell about them, back) | ~3 taps | 1 min |
| **Total** | **~30–50 s per fact** | **~5–8 min, 9 submissions, 9 waits** |

The founder's experience ("an entire evening") is consistent with a longer tail: more people, more corrections, the wait per fact, and no sense that each fact bought anything. **The measured version of this table is Stage 1 of the validation plan** (`04`, §5). Until then the numbers above are estimates from the code paths and the recorded latencies.

---

## 2. Design constraints every concept must respect

From the contract and CC-25 (`KINSHIP_2_PRODUCT_CONTRACT.md` §2–§8; `KINSHIP_2_DECISIONS.md` CC-25):

- Account before first Tell (D1); consent explicit, once (D2/D3); only picked people saved (T8); no calendar in V1 onboarding (T7/D6); no mic until on-device voice exists (D5), and keyboard dictation is never called "voice".
- Nothing quantifies a relationship: no "you only know three things about Susan", no completion, no ranking of friends. **A one-person start must not read as "pick your most important person".**
- Trust-required readings need a yes; friction is never reduced by guessing identity, sensitive meaning or ambiguous dates.
- No AI words, no chat as a primary surface, no sparkle. An "interviewer" is a chat.
- A new account never lands on an empty Today and People (`firstRun.test.tsx`, `.maestro/fresh-install.yaml`).
- Approved surfaces (Welcome, Consent, People selection, Already worth knowing, First Tell) may change only with a founder decision recorded in `approved-design-coverage.md`.

So the concepts below are variants **within** the approved setup composition (caps label, Display question, body, one primary and one quiet action), not a new onboarding.

---

## 3. Concept B: start with one person, one story

**Idea.** Keep the people step, but make the first Tell about *one* of the people just picked, chosen by a tap, with a question that invites a short story rather than a fact. The picker's framing moves from "build your roster" to "who's been on your mind".

### Wireframe B1 · the people step, reframed

```
SETTING UP · 3 OF 4
Who's been on your mind lately?
Pick anyone. You can add more people any time;
nothing here needs to be complete.

[ Search your contacts                       ]
Add someone by name

SUGGESTED
○ Dad                        Birthday · Oct 24
○ Grandma Jo
○ Maya Okafor                Birthday · Oct 21

EVERYONE
○ Aaron Beck
…

Kinship reads contacts on this phone. Only the people you pick are saved.

[ Continue with 2 people ]     Skip for now
```

Changes from the built screen: the question ("Who's been on your mind lately?" is a proposal; the approved board says "Who do you want to show up for?") and the body line that says completeness is not expected. Everything else, including the T8 lock line, "Skip for now" and nothing pre-checked, stays.

**Critique of the question.** "Who do you want to show up for?" is the approved line and it is good: it names the outcome. "On your mind" is warmer and lowers the stakes of the choice, but it could be read as "someone you're worried about". **Recommendation:** keep the approved question; change only the body line, so that a small pick feels complete.

### Wireframe B2 · the first Tell, about one person

```
SETTING UP · 4 OF 4
What's going on in Maya's life lately?
Say it the way you'd tell a friend. A few sentences
are better than one; Kinship sorts out what matters.

┌──────────────────────────────────────────────┐
│ Something about Maya…                        │
│                                              │
│                                              │
│                                              │
└──────────────────────────────────────────────┘

Like  "She just started at a new clinic and is
       nervous about the night shifts. Her birthday's
       coming up and she wants to do a hike."

Someone else ▾            [ Keep it ]    Skip for now
```

- "Maya" is the first picked person with a birthday soon, else the first picked person alphabetically; **"Someone else"** switches without ranking anyone. If the user skipped the people step, the field asks for a name first ("Who is this about?", Add by name) so a note never lands without a person.
- "Already worth knowing" stays above the field when there is a birthday line, as today.
- The field is taller and the example is a two-sentence story, so a story feels expected.

### The two phrasings, evaluated

| | "What's going on in Maya's life lately?" | "Tell Kinship a little about Maya and what matters to you about your friendship." |
|---|---|---|
| What it elicits | Current events, plans, moods, things coming up: the **Lately** and **Coming up** dimensions, which are the only ones Today can act on | Characterisation ("she's my oldest friend", "we always have each other's backs"), history, feelings about the relationship |
| Groundability | High: "started at a clinic", "nervous about night shifts", "wants to do a hike" each become a sourced line | Low: "what matters to you about the friendship" produces sentiment Kinship cannot store (no relationship labels, no closeness), so much of the answer is dropped or held, which reads as "it didn't listen" |
| Risk | A friend with nothing going on produces "nothing much"; needs the Journey C fallback | Invites the user to rank or justify the friendship; conflicts with "nothing quantifies a relationship" |
| Length of answer | 1–3 sentences | Can run long and reflective |
| **Verdict** | **Use it**, with the fallback below | **Don't use it as the first question.** A softer version ("What do you two do together?") can be one of the optional prompts in C |

**Does focus improve completion without making people rank their friendships?** Hypothesis, untested. The ranking risk is in the *framing*, not in the count: "pick one" with "Someone else ▾" and "you can add more any time" reads as a starting point; "choose the person who matters most" would not. **Stage 2 of the validation plan tests exactly this** (do participants hesitate, ask "does it matter who?", or pick several to avoid choosing).

### What B costs and risks

- Two approved surfaces change their copy (rows 4 and 6), so it needs the founder's yes and a coverage entry. No new screen, no new data, no pipeline change.
- A story about one person still mentions others ("her husband Pedro"), which the pipeline already handles (newcomers offered on the card, never auto-added; relatives held for a subject check). The capture's context person (`contextPersonId`) is already passed from a person's page; the first Tell would pass it too, which today's onboarding Tell does not. That alone should reduce "Who is this about?" questions on the first note (K25/CC-24 path), **to be confirmed with the pipeline on real stories** (`02` §7).

---

## 4. Concept C: optional recall prompts, never a survey

**Idea.** Under the Tell field, after the first Tell and on every person page, a row of three or four question-shaped prompts that help someone recall. Tapping one changes the field's hint, nothing else. They are optional, never counted, never shown as "missing".

### Wireframe C1 · on a person's page (or the dock, when telling about someone)

```
Tell Kinship about Chris

┌──────────────────────────────────────────────┐
│ What's going on with Chris?                  │
└──────────────────────────────────────────────┘

  What's been happening? · What is he into? ·
  Anything coming up? · Something you said you'd do?
```

Tap "What is he into?" → the hint becomes "Chris is into… / loves… / can't stop talking about…" and the keyboard stays up. Tap again to go back. Nothing is inserted into the note.

### Rules so it never becomes a six-page survey

1. At most four prompts, one line, quiet ink, the same four everywhere. They are the Track A dimensions in question form (`00` §5): happening now · into · coming up · what you said you'd do. "What do you enjoy doing together?" replaces "into" on the page of someone with a shared memory already; this is a small deterministic choice, not a model's.
2. They never change after a note is kept ("you've covered Into, now try Coming up" is a completion meter in disguise).
3. No prompt ever appears on Today. Today asks only after a real signal (T6: after a hand-off "Yes").
4. They are not shown for a person who is remembered or paused (D13).

### When is one context-aware follow-up helpful rather than intrusive?

The pipeline already asks exactly the questions that change what Kinship can do: who ("Which Sam?"), whose promise, when (only when a dated event's day is ambiguous), remember-or-not for sensitive readings. **Adding** a follow-up after a kept note ("Does she have a date for the wedding?") is intrusive when:
- the answer would not change any Moment (a season-only milestone is remembered quietly by rule; asking for a day turns a story into a form);
- the user is still typing their next thought;
- the question appears on every note.

It is helpful only when it is **the one question that unlocks a reason the user clearly wants** and it is asked once, after the Kept card, as a quiet line with a "Not sure" answer: "Is there a day for the wedding yet? · Pick a date · Not yet". **Recommendation:** no new follow-ups in the first experiment. Measure how often the existing questions fire on real stories first (`02` §8, the clarification rate). The one candidate worth testing later is the day-for-a-milestone question, because it converts a page line into a Moment.

**Cost:** a small UI addition in the dock and page; no pipeline change. **Risk:** visual noise on the Quiet Herbarium; prompts must disappear while typing.

---

## 5. Concept D: speak the story

Four ways to speak, compared honestly. The platform facts behind this table are in `03-external-context-options.md` §2.

| Option | What it is | Speed and effort | Correction burden | Privacy | Cost to build | Verdict |
|---|---|---|---|---|---|---|
| **D1 · Keyboard dictation** (the mic key on the iOS keyboard) | Already available in every text field; nothing to build | Speaking is several times faster than typing for short text (Ruan et al. 2017, `00` §4); a 45-second story is ~100–150 words, ~1–2 minutes to type | Names are the weak point: "Pedro", "Jess", "Bishop" are often mis-heard or lower-cased, and the pipeline's name rule reads capitalised words as names (`k27-diagnosis.md` §4). The user corrects in the field before Keep | Apple's dictation, processed on the device in many languages per Apple's guide (`03` §2.1); the app never sees audio. Kinship cannot tell dictated text from typed text, so the D2 disclosure covers it as text | **0** | **Use it now, by teaching, not by code**: the first-Tell body line can say "Type it or use the mic on your keyboard." Contract rule: never call it "voice" |
| **D2 · One-tap voice-to-text** (a mic in the Tell field → transcript appears in the field) | A mic button that starts speech recognition and fills the field; the user sees the words and can edit before Keep | Same speed as D1 with one less tap to find the keyboard mic; the field can be taller and the transcript live | Same as D1 | Needs the speech permission and its usage string; on-device recognition is possible on supported devices and languages (`03` §2); D5 requires on-device only | Small–medium: an Expo module for speech recognition, a permission, the field's live-transcript state, tests; and a design decision on the Tell field (a mic is a new control on an approved surface) | **The right second step**, after D1 is measured. It is CC-25's "simple on-device mic in Tell", already in Explore later; nothing new to authorise |
| **D3 · Continuous capture** (hold to talk, no visible transcript, the note is sent as a whole) | Like a voice memo that becomes a Tell | Fastest to start; no reading while speaking | **Worst**: the user sees the words only in the Kept card, so a mis-heard name becomes a wrong-person question or a dropped line after the wait; corrections go through the review sheet | Same as D2; audio must never leave the phone (only the transcript is sent, as text) | Medium; needs the Listening screen or equivalent | **Not now.** It converts transcription errors into trust failures |
| **D4 · Guided spoken prompts** (the C prompts, read aloud or shown while recording) | A prompt per dimension, speak each one | Longer sessions, more structure | As D2 per answer | As D2 | Medium | **No.** It is the survey, spoken |
| **D5 · AI interviewer** (a conversational agent asks about the person, turn by turn) | A chat | Each turn is a model round trip (3–6 s today) plus the user's reply: a four-turn interview is 1–2 minutes of waiting alone; cognitive load shifts from "what do I know" to "what does it want" | The transcript must still be extracted into sourced lines, so every error of D2 plus the interviewer's own mis-readings; the user cannot see what will be kept until the end | The interview itself is user content sent to the model; more turns, more data | High: a new surface, a new prompt and evals, a conversation state machine | **Reject.** It is a chat as a primary surface (contract §3), it is slower than one story, and the evidence that structured questioning beats free storytelling for recall is weak (`00` §4) |

**Why the simple option wins.** The product already turns one story into several sourced lines with provenance back to the user's words. The expensive part of capture is not getting words out of the user, it is the per-fact cycle (submit → wait → review). Dictation shortens the words part to seconds and costs nothing; the cycle is addressed in `02`. An interviewer adds more cycles.

**What would change this verdict:** if Stage 2 shows participants cannot produce a story without being asked questions (they freeze at an empty field even with a person named and examples shown), then a *single* spoken or written prompt ("What's going on with Maya?") plus the C prompts is the answer, still not an interviewer.

---

## 6. Other paths considered

| Path | What it is | Assessment |
|---|---|---|
| **"Tell me anything" blank slate** | No person step; the first screen is the field | Already what the built first Tell is when the user skips the people step. It loses the one thing that makes a story groundable: a named person. Keep the person first |
| **Skip-first** | Let the user skip everything and land on Today | Exists ("Skip for now" on both setup steps). Today's first-use state then shows one next step. Fine as an exit, not as a design |
| **Onboard through a real action** | "Is there someone you've been meaning to reach out to?" → open Messages → the return check → "Anything worth remembering from talking with Sam?" → the first Tell | Attractive: it is the core loop run once, honestly, and the Tell happens after a real conversation, when there is something to say. Risks: it asks a new user to message someone from inside an app they have used for 40 seconds, and the hand-off alone never records anything (T12), so a user who taps Message and never talks has done nothing. **Recommendation:** not as the default first step, but as the **Journey C fallback** for a user who picks someone and has nothing to say |
| **Import a bulk source** | Social media, calendar, message history | Assessed source by source in `03`. None gives relationship knowledge that is both reliable and actionable without the user telling Kinship something anyway |

---

## 7. The three journeys

Effort columns are estimates from the built paths (counted taps; typing time at ~40 wpm; the wait as measured in `02`). "Corrections" lists what the pipeline would hold or ask, worked out against `pipeline.ts` rules and the proofs in `activation-pass.md` and `relationship-page-rules.md`, not from a live run; a live run is part of Stage 1.

### Journey A · Susan: one meaningful life event (text, Concept B)

**Setup:** signed in, consent allowed, picked Susan (and Dad) from contacts. Susan has no birthday in her contact.

| # | Screen | User does | Waiting | What Kinship does |
|---|---|---|---|---|
| 1 | B2 first Tell, "What's going on in Susan's life lately?" | Types: *"Susan's getting married to Pedro this fall. She's stressed about finding a venue and asked if I'd come to a tasting with her next month."* (~35 words, ~50 s) | — | — |
| 2 | Taps **Keep it** | 1 tap | "Understanding…" in the dock, ~4–9 s today | Extraction with Susan as the context person |
| 3 | Kept card | Reads | — | **Kept for Susan** · "Susan is getting married to Pedro this fall" · "Susan is stressed about finding a venue" · "Susan asked if you'd come to a tasting with her next month" · **Add Pedro?** (newcomer, offered, never auto-added). Season-only date kept as "this fall"; "next month" kept as a month, no day asked (nothing asks for a missing date) |
| 4 | — | Taps **Got it** or nothing | — | Possible: the pronoun "She's" may lower the tier to a look-over sheet (**the K-series policy**: dense notes with pronouns get the sheet). With Susan as context person and only one "she" in the note, the referent is unambiguous; whether the current rule still asks is a Stage 1 check |
| 5 | Today, once | Reads, taps **Got it** | — | H4 bring-back. Susan's note has no day, so Today shows the labelled Ben example, not Susan. **This is the honest limit:** a season-only milestone is never a Moment (`today-eligibility.md`). |
| 6 | Susan's page | 1 tap from People | — | **Coming up:** "Susan is getting married to Pedro this fall" · "Susan asked if you'd come to a tasting with her next month". **Lately:** "Susan is stressed about finding a venue". Each "You told Kinship · Oct 18" |
| 7 | **Message** on the page | 1 tap | — | Hand-off sheet: **You could mention** "Susan is stressed about finding a venue" and, under the milestone, the fixed suggestion "You could ask how the wedding plans are going." (K26). Then "Did you reach Susan?" when back (K28) |

**Effort:** one story (~50 s), 3–5 taps, one wait. **Value demonstrated:** (a) her own words understood into three lines with sources; (b) a real door out of the app with context on the sheet; (c) the page as a portrait. **Not demonstrated, and must not be implied:** a reminder before the wedding. If the user later tells "the wedding is October 24", the milestone rule brings it back from three days before. The Kept card could say so in one quiet line only if the founder wants a date prompt (§4 above); the default is silence.

**Exit points:** after step 3 (satisfied), after step 5 (the example may feel generic when her own note did not qualify: **a known weakness of H4 for undated first Tells**), at step 7 if Messages feels premature.

### Journey B · Chris: interests and shared context, no event (dictation, Concepts B + C)

**Setup:** picked Chris by name (no contact). Second session, from Chris's page.

| # | Screen | User does | Waiting | What Kinship does |
|---|---|---|---|---|
| 1 | Chris's page, empty: "What you tell Kinship about Chris will be here…" · **Tell Kinship about Chris** | Taps Tell; taps the keyboard mic; says: *"Chris has gotten really into climbing this year. We've been talking about doing a weekend in Bishop in the spring. He also just adopted a dog called Fluffy and he won't stop sending me photos."* (~40 words, ~20 s spoken) | — | Dictation renders the text live; the user fixes "Bishop" if mis-heard, taps the C prompt "What is he into?" only if stuck |
| 2 | **Keep it** | 1 tap | ~4–9 s | Extraction with Chris as context |
| 3 | Kept card | Reads | — | **Kept for Chris** · "Chris has gotten really into climbing this year" (fact, interest) · "You and Chris have been talking about a weekend in Bishop in the spring" (plan, shared, season) · "Chris adopted a dog called Fluffy" (fact, pet). "He" resolves to Chris (context person, one referent). **K27 risk:** a later note "Fluffy will make a full recovery" would ask "Who is Fluffy?"; the proposed fix is in `k27-diagnosis.md` |
| 4 | Chris's page | — | — | **Lately:** climbing · Fluffy. **Coming up:** "…weekend in Bishop in the spring" (undated plan, last). No "What Kinship knows" link needed (nothing hidden) |
| 5 | Weeks later, **Message** from the page | 1 tap | — | **You could mention:** "Chris has gotten really into climbing this year" · the Bishop plan. "Did you reach Chris?" → Yes → "Anything worth remembering from talking with Chris?" → the next Tell, when there is something to say |

**Effort:** ~20 s of speaking, 2–3 taps, one wait. **Value without an event:** the page is a portrait after one note; the hand-off sheet carries the threads; the plan is remembered without a date and never nags. **Future, not shown:** promise reasons (commit next) would bring back "I said I'd send Chris the Bishop campsite link"; Ask ("What is Chris into?") is Alpha direction.

**Exit points:** step 1 if the empty page feels like a demand; step 3 if the dictation garbled a name and the card shows a wrong word (Undo, retype, wait again: the correction cost of voice).

### Journey C · a new user who cannot think of anything (Concept C fallback, honest guidance)

**Setup:** picked Sam from contacts (birthday Nov 2), first Tell screen.

| # | Screen | User does | What Kinship does |
|---|---|---|---|
| 1 | B2: "What's going on in Sam's life lately?" with the example story | Stares; nothing comes | Nothing. No timer, no nudge |
| 2 | Taps **Skip for now** | 1 tap | **No guilt copy.** Today's first-use state: "This is where Kinship brings things back." + one next step. "Already worth knowing" already showed "Sam's birthday is in two weeks · From Contacts", so Today's Coming up carries it from 7 days out: value with zero knowledge told |
| 3 | *Proposal:* the first-use next step offers two doors instead of one: **Tell one thing** (the field) · **Reach out to someone** (People → a page → Message) | Picks either or neither | The second door runs the real loop: Message → "Did you reach Sam?" → Yes → "Anything worth remembering from talking with Sam?" → now there is something to say |
| 4 | Sam's page, later | Reads | "What you tell Kinship about Sam will be here: what's going on with them, what's coming up, what you said you'd do." + the C prompts as recall help, not as blanks |

**What Kinship never does here:** suggest facts, pre-fill from the contact beyond the birthday, count what is missing, or ask "when did you last talk?" (a rhythm question; forbidden). **What it truthfully can do:** keep the birthday, wait, and ask once after a real conversation.

**Effort:** 1–2 taps. **Value:** the birthday line (when the contact has one) and a clear sense that silence is acceptable.

---

## 8. Side-by-side against the baseline

| | A · Baseline | B · One person, one story | B+C · with recall prompts | B+D1 · with dictation taught |
|---|---|---|---|---|
| Screens before the first Tell | 5 | 5 (same) | 5 | 5 |
| What the first Tell asks for | "one thing about someone" | "What's going on in Maya's life lately?" | same + 4 optional prompts | same + "or use the mic on your keyboard" |
| Expected first note | 1 fact | 2–4 lines from one story | 2–4 lines | 2–4 lines in ~20 s |
| Submissions to reach ~3 memories | 3 | 1 | 1 | 1 |
| Watched waits | 3 | 1 | 1 | 1 |
| Review sheets expected | 0–1 | 0–1 (pronoun policy) | same | same, plus dictation name fixes before Keep |
| Approved surfaces changed | — | rows 4, 6 (copy) | rows 6, 12 (a prompt row) | row 6 (one body line) |
| New code | — | small (context person on the onboarding Tell; copy) | small (UI) | none |
| Pipeline or model change | — | none | none | none |
| Risk | the evening of work | ranking feel (test it); a story with nothing in it | noise | mis-heard names |

**Recommendation for the first usability experiment (Stage 2 in `04`):** A vs B+D1 vs B+C+D1, three arms, five to eight participants each, synthetic people, their own real stories about real friends (never recorded as data, see the stage's consent rules), with a no-event friend scenario and one multi-person story in each arm. The question is not "which is prettier" but: **time to the first correct Kept card, lines per minute of effort, review taps, and whether anyone feels asked to rank their friends.**

---

## 9. What is explicitly not proposed

- A new onboarding flow, carousel, or interview.
- Removing the people step or the consent step.
- Pre-filling anything about a person from any source other than the contact's own birthday.
- Prompts that change based on what is "missing".
- A dedicated Listening screen before the dock mic question (CC-25) is answered and before dictation has been observed in the study.
- Any change to extraction tiers to make first notes look cleaner: the pronoun policy is a trust decision for the founder (`activation-pass.md` §7 q7), examined on evidence in `02` §8, not a UI shortcut.
