# Kinship roadmap audit (16 Oct 2026)

> **Status: dated audit, NOT canonical.** This records the analysis as it stood on 16 Oct 2026, before the founder's review. Its recommendation labels (R1–R15, the verdicts and stages) are kept exactly as written and are **not** updated to reflect later approvals. What the founder approved from it, changed, or left as a hypothesis is recorded in `KINSHIP_2_DECISIONS.md` **CC-25** and in the plan (`KINSHIP_2_OPERATIONALIZATION.md` §28, regenerated into `KINSHIP_2_COMPLETE_PLAN.md`). Where this audit and CC-25 differ, CC-25 wins (for example: B5 / B7 order is unchanged; rhythm is held, not struck; Ask is not limited to one-person lookups; the widget is held, not dropped).

*A product, architecture and founder-thinking audit of the full Kinship roadmap. Not an implementation brief. Nothing here is approved until the founder says so; recommendations are labelled as recommendations throughout.*

**Sources read in full or in the relevant sections:** `KINSHIP_2_PRODUCT_CONTRACT.md`, `KINSHIP_2_COMPLETE_PLAN.md` (§1–4, §9, §13–17, §21–22, §24, §28–30, §34–36, epics E12–E26, Phase 3–6 tickets), `KINSHIP_2_DECISIONS.md` (D1–D13, Phase 0, CA, CC-1 … CC-24), `approved-design-coverage.md`, `HANDOFF.md`, `phase4-implementation-brief.md` (§4, §17–22), `semantic-memory-investigation.md` (§0, §10, §14), `next-ux-proposals.md`, `today-eligibility.md`, `relationship-page-rules.md`, `founder-feedback-4.md`, `founder-feedback-summary-2/3/4.md`, `founder-native-feedback.md` (G28, G39, G40), `bug-ledger.md` (deferred rows), `data-cleanup-plan.md`, `dogfood-feedback-to-evals.md`, `wife-dogfood-final-review.md`, `docs/ops/analytics.md`, the 1.0 archive (`docs/archive/planning/ROADMAP.md`, `docs/SPEC_TENDING_SEASONS.md`), and the code (`supabase/functions`, `supabase/migrations`, `src/features`, `evals`) to confirm what exists.

**How to read the labels.** Every item carries one of: **A · COMMITTED** (approved and sequenced), **B · PLANNED / DEFERRED** (in the plan or a decision, preserved, not sequenced), **C · SPECULATIVE / HISTORICAL** (raised once, or 1.0 history), **R · STRATEGIC RECOMMENDATION — NOT CURRENTLY APPROVED**. The recommendation verdicts are only: BUILD AS DESIGNED · BUILD, BUT SIMPLIFY · FOLD INTO ANOTHER CAPABILITY · VALIDATE BEFORE BUILDING · DEFER · DROP UNLESS NEW EVIDENCE APPEARS.

---

## 1. The product thesis

Kinship is a private memory of the people you care about that turns what you were told into timely, grounded reasons to reach out, so that you show up.

Five sentences that follow from the contract and the decisions, and that this audit holds every item against:

1. **The unit of value is a showing-up moment** (plan §24): Kinship surfaced a true reason, and within three days the user reached the real person. Not an open, not a capture, not a screen.
2. **Memory is the infrastructure; the return is the product.** The founder's 15 Oct direction ("capture is now infrastructure; the product focus is what Kinship does with what it knows") is the right pivot, and it has a consequence the roadmap has not yet drawn: *bringing it back when it matters* needs Kinship to speak while the app is closed, and to speak about promises, threads and hard times, not only dated events and birthdays.
3. **Trust is the floor, not a feature.** Silence beats a wrong detail; every durable statement has a source; nothing quantifies a relationship; the user's edit wins. A capability that cannot meet those is not built smaller, it is not built.
4. **Intelligence is invisible.** A model reads language and phrases; code decides dates, windows, ranking and timing. No surface advertises AI.
5. **The app leads back to the person, then gets out of the way.** The best day is one sentence, one door out, and a friend who felt remembered.

The smallest honest statement of the thesis is in plan §4: *a person tells Kinship one thing; days later Kinship brings back that one specific thing at the right moment; they open the real conversation; later they say it happened.* As of 16 Oct the first half of that sentence is strong and verified on a device. The second half works only when the user happens to open the app on the right day, and only for a dated event or a birthday.

---

## 2. Complete roadmap inventory

### 2A. Committed / current (approved and sequenced)

| # | Item | Where approved | State on 16 Oct |
|---|---|---|---|
| A1 | **B4** multi-item closure (`closes_ids`) with exact Undo shipped together | CC-20, brief §10, §18 | Not started; PR #34 (B3) merged |
| A2 | **B5** composed residence line and composed provenance (`compose.ts`, sheet, §12) | CC-19/20, brief §9, §12 | Not started |
| A3 | **B6** report-only dry run on existing data; **STOP** for founder review before any backfill | CC-19/20, brief §14, `data-cleanup-plan.md` | Not started |
| A4 | **B7** portrait de-duplication (head observation only) | CC-19, brief §13 | Not started |
| A5 | **B8** What Kinship knows: H15 sections (Background · Into · Hoping to · Plans · Their people · Between you), I7 "Before" history, category display, provenance / Edit / Not this on every line; K22 ("You said you'd" never buried) | CC-17/18/19/20, brief §4, §11 | Taxonomy computed (B1), nothing displayed |
| A6 | **B9** native dogfood pass, eval review, apply facets to existing lines after the founder's yes | brief §16, §18 | Not started |
| A7 | **Evaluate employer** as a separate proposal (multi-valued slot, qualifiers, aliases) | CC-19, investigation §14 | Not started; evals listed in brief §15 |
| A8 | **I2b** interaction inference ("Did this happen?" → Yes → an in-person interaction) | CC-20 decision 5 | Approved to follow the proven trail; not sequenced inside 4B |
| A9 | **Wife dogfood**, low-coaching, after Phase 4; readiness is NOT READY | CC-18/19/21 | The nine evaluation questions are written (HANDOFF §D) |
| A10 | Verification debts riding on the next build: B3's device check (the residence question, N13 edit re-derivation, N14), the "moved from X to Y" closure rule (brief §22 point 4) | HANDOFF 16 Oct | Open |
| A11 | **Ask Kinship** as *the first Alpha candidate* | CC-16, CC-17, CC-18 | Roadmap only; foundation = facets + categories |

### 2B. Approved, planned or explicitly deferred (preserved, not sequenced)

Grouped by the part of the loop they serve.

**Bringing it back (Moment · Reason)**
- B1 **Proactive delivery**: server push (planner / sender / receipts on `pg_cron`), tiers, ≤3 per 7 days, quiet hours, private lock screen, back-off, global pause, the **weekly brief** push, the **notification permission ask** after the first real moment, Settings › Notifications. D4, plan §22, E15, PUSH-01…08. **Plan §4 classes this "Required"**; coverage #31 says it needs a founder decision. Not built; flags `push_delivery`, `weekly_brief` exist.
- B2 **Remaining reason types**: promise (RSN-06, "2–4 days after capture; once"; Kept it / Let it go), open thread (RSN-07, "Did Josh decide about the startup?"), plan / season (RSN-08, "Still up for Tahoe?"), **hard time** (RSN-09: surgery, loss; never cheerful copy), "a year ago" (RSN-10), tradition (Next), reconnect (Next). Plan §13. Built today: `upcoming_event`, `event_followup` (server), birthdays, milestones (H16), good news, first day, Coming up, Waiting on (phone).
- B3 `reason_generate`: model phrasing of a reason with the grounding validator and template fallback (RSN-04, plan §14). Not built; Today uses templates and the user's own words.
- B4 **Calendar briefs + post-encounter prompt** (D6, plan §16, E21, CAL-01…06): first Phase 6 epic, pulled forward only if beta shows missing encounter context is the main capture problem.
- B5 **Reconnect** (plan §17, E22, RCN-01…03): rhythm from ≥3 confirmed contacts, a curated world-event calendar, openers only on request (D9).
- B6 **Monthly letter / Reflection** (E26, LTR-01; board 3 "September, looking back"): five true sentences, presence only, skipped in thin months.

**Reading what Kinship knows (Memory)**
- B7 **Ask Kinship** (`retrieval_answer`, E25, ASK-01): memory-only, cited, `not_found`, never a chat; its own grounding / refusal / privacy evals. Entry: "Ask field in People search". (Also A11.)
- B8 **Semantic slots after residence**: employer (+ qualifiers, aliases Facebook / Meta), school, hometown, planned-move destinations, typed People↔People family relations, event date-precision merge, full-text / trigram search only if Ask recall needs it. Investigation §14 "Wait until Alpha".
- B9 **Your story together** (PER-07, coverage #13): NOT BUILT, needs a founder decision; proposed "before alpha".
- B10 **K18** "looks like something you told Kinship" (Keep earlier · Keep new · Keep both · Undo): deferred to semantic memory SAME / REFINES / SUPERSEDES.
- B11 **Delete-after-understanding** retention mode (CC-6): keep only provenance excerpts; a stronger "original source deleted" mode is future work.

**Capture (Tell)**
- B12 **Voice** (D5, E18, VOX-01…05): on-device only, beta week 3, the Listening screen (board 1, 4th phone); mic hidden until then.
- B13 **Siri App Intent + Action Button** (E24, NAT-01, plan §21: "Next"), **Share extension** with on-device OCR, image never stored (NAT-02: "Next after Siri"), **Widget** (plan §21: "Later"), **Photo input** (Later).

**Trust floor and settings**
- B14 **Export** (SET-04), **delete account v2 UI** (SET-05), "What we measure" (SET-06), Settings › What Kinship knows (SET-03, partial), lock-screen level (with push). Coverage #23 needs a founder decision. Plan §4 classes export and real deletion "Required".
- B15 **Person states UI** Remembered / Paused (D13, PER-06): rendering exists, no control to set them.
- B16 **Merge duplicate people** (PER-05; N3's two Anthonys) and the founder-account **data cleanup** (`data-cleanup-plan.md`, needs an explicit yes).
- B17 Accessibility pass (QA-02), privacy-policy and Terms rewrite (QA-03), app icon and 1.0-styled pages (coverage #35).
- B18 **Legacy 1.0 deletion** (E19, DEL-10…12): the 1.0 shell is still in the bundle (I8 was a fall-through into it).
- B19 Language scope: English only; other languages need their own fixtures (CC-7).
- B20 Anonymous auth: revisit only if >25% abandon at sign-in (D1).

**Structure and visualization**
- B21 **Visualization checkpoint** GDN-00: prototype Herbarium Garden vs Relationship Landscape vs Hybrid, stop at `KINSHIP_RELATIONSHIP_LANDSCAPE_EXPLORATION.md` (D7 addendum, plan §34); `sprig_marks` Algorithm C only after interviews show sprigs read as identity (D8). Many-to-many chapters protect the option; no single-valued group column.
- B22 **Intentions** and the **Opportunity Engine** (plan §35): post-validation hypotheses; "explored only after the core loop is validated".

**Business, operations, distribution**
- B23 **Subscriptions** (D10): cohort 1 free; paid subscription; entitlement is one server flag at the gateway, reasons engine and push planner; read / export / delete never check it; pricing research in beta weeks 6–8 (BETA-06).
- B24 **Beta operations**: the North-star metrics dashboard (BETA-02), wrong-subject triage runbook (BETA-03), TestFlight rings (BETA-04), week-8 gate report (BETA-05), in-app feedback on reasons "Useful? Yes · No" on ≤1 in 3, "Report something wrong" (FB-01).
- B25 **ChatGPT "Help me reach out" distribution probe** (plan §36): stateless, stores nothing; only after beta retention is validated.
- B26 Model governance (D12): per-capability downgrades at eval parity; promotion policy after beta. Cost model (§31).
- B27 E2EE path kept open (D11); per-user envelope encryption deferred (T10).

### 2C. Speculative / historical (raised, rejected or 1.0-era)

| # | Concept | Origin | Current standing |
|---|---|---|---|
| C1 | **About You** (a private page of the user's people, interests, traditions; used in reasons) | G28 (founder question, 5 Oct), G40, feedback summary 2 §I | Repeatedly "still deferred" (CC-18/19/22/23). The data half partly exists: `subject_type = user` lines are kept *with* the person they concern (K5), never as that person's biography |
| C2 | Welcome **carousel** / animated orientation | F9 / F11 | Rejected for one example card and "See how it works"; the need was met by H4 |
| C3 | **Timeline UI** / rich history | G40, I7, coverage #13 | History kept per line ("was:", "Before"); no timeline. Your story together remains an open decision |
| C4 | **Garden mechanics**: growth stages, vitality, VitalPlant, Garden Walk, "this season's pressings", a leaf per moment | 1.0; Design Direction; T1, T5 | Superseded by D7 / D8: sprigs are identity only; Garden is not a destination |
| C5 | **Seasons / Tending Seasons / focus people** (choose up to 5 people to invest in) | `SPEC_TENDING_SEASONS.md`, T14 | Deleted in 2.0; "focus people is a Later idea, to revisit if beta users ask for intention-setting". This is the ancestor of Intentions |
| C6 | 1.0 **Reach-out flow** with a memory carousel, suggestion engine, quick notes, check-ins, emotion tags, photos on memories, activity feed | `docs/archive/planning/ROADMAP.md` | Replaced by Tell / Today / hand-off; photos are "Later" |
| C7 | **Relationship rhythm** shown on the page ("you usually talk every few weeks") | Audit; T16 | Inference-only, never displayed, and only as a reconnect tie-breaker with ≥3 confirmed contacts |
| C8 | Night prompt after 8 pm; try-before-account; "nothing is kept" privacy copy; auto-dismiss of extraction | T6, T2, T9, T11 | All resolved against the design; recorded as overrides |
| C9 | AI **openers** / "Suggest a first line" | D9 | Later, on request only, inside Reconnect |
| C10 | The five concept boards (Conservatory, Living Journal, Quiet Garden, Landscape, Almanac) | Design exploration | Exploration, not approved design |
| C11 | Concierge capture variant; personality onboarding; a generic task manager; relationship scoring; a chatbot | Beta-gate options; "still not to build" lists | Never, or only as a beta-gate pivot |
| C12 | A graph database, stored RELATED edges, embeddings for inference | Investigation §14 | Never without new evidence and a founder decision |
| C13 | 1.0 **Promises** feature (manual toggle, AI-suggested chip, "Kept it / Let it go", ≤1 notification ever) | `SPEC_TENDING_SEASONS.md` §2 | Absorbed into `kind = 'promise'` memory items; the surfacing half (RSN-06) is unbuilt |

### 2D. Strategic recommendations — NOT CURRENTLY APPROVED

Each is argued in §5. Listed here so the inventory is complete.

- R1 **Pull a minimal Tier-1 push forward** (one notification type: the Moment that is already Today's primary, private lock screen, budget and pause from D4) to land before Alpha, and ideally before the wife's second week.
- R2 **Build promise, open-thread and hard-time reasons** (RSN-06/07/09) before Alpha. They are the reasons only Kinship can give.
- R3 **Count showing-up moments now**: a content-free founder query over `contact_events` (source `return_check`) joined to the reason that led there. The North Star is defined and never measured.
- R4 **Trust floor before any outside user beyond the household**: Remembered / Paused controls, export, delete-account v2, merge duplicate people.
- R5 **Reason feedback, minimal**: "Not helpful" on a Moment detail that mutes that type for that person for 30 days (plan §13 freshness rules). Learning from action is otherwise absent.
- R6 **Intentions v0 as a sentence, not a surface**: "I want to make more space for Chris this fall" is already a user-subject plan about a person; store it as a memory item, show it under You said you'd, and let it raise the relevance of that person's candidates. No goal tracking, no screen.
- R7 **Chapters as a People filter**, user-named, many-to-many, no map. The accessible half of the Landscape, which Ask and Intentions both need ("the Austin crew").
- R8 **Ask v1 as grounded People search**: match statements as well as names, answer with cited lines, `not_found`; no chat, no history.
- R9 **Siri / Action Button before the Listening screen.** Hands-busy capture is the need; a mic in the Tell dock using on-device recognition covers in-app voice without a new screen.
- R10 **Calendar as an evidence source, not a Brief screen**: a matched event becomes a Coming up line; Moment detail carries the "before you see David" lines; the post-encounter question is the existing return check.
- R11 **Replace the monthly letter with "A year ago" plus a once-a-year letter**, and let Ask answer "what happened with Ben this year?".
- R12 **About You = Settings › What Kinship knows about you**: the user's own lines (relationships to the user, stated interests, traditions) listed with Edit / Not this. No page in People; no use in reasons until Intentions exist and an eval covers the wording.
- R13 **Drop rhythm and quiet-stretch detection** as inputs to anything. Reconnect becomes a candidate type gated by an explicit intention or a captured "we haven't talked since the move" plus a real reason.
- R14 **Defer `reason_generate`** (model phrasing). The user's own words plus templates are grounded by construction; revisit if dogfood says reasons read as robotic.
- R15 **Cap semantic slot expansion** after employer until Ask produces "where / who" questions that facets must answer.

---

## 3. Roadmap matrix

Columns: Capability · Current status · User problem · User value · North-star fit · Core-loop role · Differentiation · Major risk · Alternative / simpler solution · Recommendation · Suggested stage.

Stages: **NOW** (B4–B9) · **NEXT** (after 4B, around the wife dogfood) · **ALPHA** (8–12 users) · **LATER ALPHA** · **BETA** (30–50, 8 weeks) · **MONETIZATION** · **GROWTH** · **LONG-TERM** · **DROP / ABSORB**.

### 3.1 Committed work (B4–B9 and its tail)

| Capability | Status | User problem | User value | North-star fit | Loop role | Differentiation | Major risk | Alternative / simpler | Recommendation | Stage |
|---|---|---|---|---|---|---|---|---|---|---|
| **B4** multi-item closure + exact Undo | A · committed | A later statement that changes several earlier ones leaves contradictions, and Undo can't restore them | Memory stays one truth; a mistaken close is exactly reversible | Trust floor for "every durable statement has a source" | Understand · Memory | Table stakes for a memory; none visible | Over-closing (silent loss). CC-20 already makes Undo a trust invariant | None: closure without exact Undo is forbidden | **BUILD AS DESIGNED** | NOW |
| **B5** composed residence + provenance | A · committed | "Lives in California" and "Lives in Alameda" shown as two lines | One line in the user's words, pointing to both sources | Grounded phrasing; no invented words | Memory | A sourced composition is rare in consumer apps | Composition inventing words ("compose only what was said" guards it) | Show the most specific line only (B7) and skip composition | **BUILD, BUT SIMPLIFY**: ship B7 first; keep composition to residence; no second slot until Ask asks for it | NOW |
| **B6** report-only dry run; STOP | A · committed | Existing wrong supersessions could become visible false history in B8 | Nothing historical changes without the founder reading the report | Silence beats a wrong detail | Memory | — | Scope creep into cleanup | — | **BUILD AS DESIGNED** | NOW |
| **B7** portrait de-duplication | A · committed | The page repeats one fact at two precisions | The Portrait stays a portrait | Signal over noise | Memory | — | None | — | **BUILD AS DESIGNED** (consider before B5) | NOW |
| **B8** What Kinship knows sections + Before + categories; K22 | A · committed | A flat list stops reading as a person once it is long; superseded facts vanish; open commitments sink | A reference view that reads as a memory writing itself; past state visible as past | "Remember what matters" shown as organised memory | Memory | The CRM-shaped risk is highest here; the guardrails (no counts, empty sections vanish) are what differentiate | Feels like a contact record. Hoping to becoming a goal tracker | Fewer sections at first (Background · Into · Their people · Between you), add Hoping to / Plans only when dogfood shows density | **BUILD AS DESIGNED**, with the fewest sections that dogfood density justifies | NOW |
| **B9** native dogfood, eval review, apply facets | A · committed | — | — | Readiness discipline | — | — | Becoming another stabilization loop (CC-24 forbids) | — | **BUILD AS DESIGNED** | NOW |
| **Employer** evaluation | A · committed (evaluate) | "Works at Meta" and "works in finance at Meta" as two lines; "left Meta for Google" | Correct current employer, no false history | Grounding | Memory | — | Multi-valued semantics are a bigger surface than residence; low frequency of change | Treat employer as a category (WORK) only; add the slot when Ask gets "who do I know at X" | **VALIDATE BEFORE BUILDING** (after B9, as decided) | NEXT / ALPHA |
| **I2b** interaction inference | A · approved, unsequenced | A planned get-together passed; the trail doesn't know it happened | One tap turns a plan into a real interaction | Return · learn from action | Return | The "know → infer → ask" rule is distinctive | A nag ("Did this happen?") on every plan | Ask only for plans Kinship surfaced as a Moment, within 3 days, once | **BUILD, BUT SIMPLIFY** (surfaced plans only) | ALPHA |
| **Wife dogfood** | A · committed | — | — | The first low-coaching test of the thesis | All | — | Measuring opens, not moments, without push | Run round 1 without push, round 2 with R1 | **BUILD AS DESIGNED**, two rounds | NEXT |

### 3.2 Bringing it back

| Capability | Status | User problem | User value | North-star fit | Loop role | Differentiation | Major risk | Alternative / simpler | Recommendation | Stage |
|---|---|---|---|---|---|---|---|---|---|---|
| **Proactive delivery** (push, budget, private lock screen, pause) | B · "Required" (plan §4), not built; coverage #31 open | Kinship knows Ben ran yesterday but the user didn't open the app | The thing comes back *when it matters*, not when you remember to look | **The second half of the north star.** Without it the product tests app-opening habit, which it rejects as a metric | Moment | Reminders apps push tasks; Kinship pushes one true, sourced reason, ≤3 a week, nothing on the lock screen | Noise, guilt, a spike in uninstalls. D4 budgets and back-off are the answer | **R1:** one notification type only (the Moment already chosen as Today's primary), private copy, budget, pause; no weekly brief yet | **BUILD, BUT SIMPLIFY** (R1) | NEXT (before Alpha; ideally wife round 2) |
| **Weekly brief** push + list | B · D4, PUSH-06 | A week's worth of small things, none urgent | One quiet Sunday glance | Return cadence | Moment | — | A digest becomes a report; "your week with your people" edges toward tallying | Coming up already shows 7 days; the brief is Today's Sunday push pointing at it | **FOLD INTO** Today (a Tier-2 push that opens Today) | LATER ALPHA |
| **Promise reasons** (RSN-06) | B · plan, not built | "You said you'd send David the contractor number" never comes back unless dated | The ochre "something you said you'd do" actually returns | Direct: the promise is the purest show-up reason | Reason | No other app holds *your own words* to someone and brings them back without a due date | Nagging. Once only, 2–4 days after, guilt-free copy (1.0's rules carry over) | — | **BUILD AS DESIGNED** (R2) | NEXT |
| **Open-thread reasons** (RSN-07) | B · plan, not built | "Josh may leave Google" sits on the page; the moment to ask passes | "Did Josh decide about the startup?" at the right time | Direct | Reason | Threads are what friends actually follow up on | Certainty upgrades in copy (validator exists in the pipeline) | Use `followup_after_days` only when the note implies a horizon | **BUILD AS DESIGNED** (R2) | NEXT |
| **Hard-time reasons** (RSN-09) | B · plan, not built; today sensitive events are silent | "Mom's surgery is tomorrow" is the most important moment Kinship could return, and it never does | Being there when it is hard | Direct, and the emotional heart of "show up" | Reason | Nobody else does this with a private lock screen and no cheer | Creepy or wrong tone; sensitive always confirms, copy never cheerful, lock screen always private | — | **BUILD AS DESIGNED** (R2), after R1 | NEXT / ALPHA |
| **Plan / season reasons** (RSN-08) | B · plan, not built | "Tahoe in the spring" is remembered, never prompted | "Still up for Tahoe?" at the season's start | Fit | Reason | — | Low signal in thin accounts | Coming up already shows undated plans on the page | **DEFER** until promises and threads prove the pattern | ALPHA |
| **"A year ago"** (RSN-10) | B · plan "Important (cheap)" | Memories fade | A warm secondary line | "Remember what matters" | Moment | Photos apps do this with photos; Kinship does it with a sourced sentence | Sad anniversaries (sensitivity gate) | — | **BUILD AS DESIGNED** when dated moments exist (needs a year of data) | BETA |
| **Tradition reasons** | B · plan "Next" | "Spirited Away every Christmas with Kaiya" | Two weeks before, a nudge | Fit | Reason | — | Needs the user to have said it | — | **DEFER** | LATER ALPHA |
| **Milestones** H16 | Built (4A) | — | — | — | Reason | — | — | — | Done; watch no-nagging on the device | — |
| `reason_generate` (model phrasing) | B · plan §14 | Combined evidence reads stiff | Warmer copy | Grounded phrasing | Reason | — | Invented detail (validator), AI-flavoured prose | Templates + the user's own words (what exists) | **DEFER** (R14) | LATER ALPHA, by evidence |
| **Calendar briefs** + post-encounter prompt | B · D6, E21 | Walking into dinner having forgotten David's news | 30 seconds of context before you meet | Fit: brings it back at the meeting | Moment · Return | Calendar apps show *when*; Kinship shows *what you know* | A new permission, attendee matching errors, "sales prep" feel, a second notification class | **R10:** calendar as a Coming up source; Moment detail carries the lines; the existing return check asks afterwards | **FOLD INTO** Today + Moment detail (no Brief screen) | LATER ALPHA / BETA, after D6's trigger |
| **Reconnect** (rhythm + world events + openers) | B · plan §17, E22 | Quiet relationships drift | A true reason to say hi, never a gap | Fit only if gap is never the reason | Reason | The "never gap-only" rule is the differentiator | Rhythm detection is wrong for people you text daily (T16); "quiet stretch" is a hidden neglect score | **R13:** reconnect = an intention (R6) or a captured "since the move" + a real reason, as one more candidate type | **FOLD INTO** Today + Intentions; **DROP** rhythm | LATER ALPHA |
| **Opportunity Engine** (memory + intention + external event + timing) | B · plan §35 | "Texas plays Saturday" is a reason only if you know they watched together | A natural excuse | Fit when grounded in the user's own memory | Reason | Genuinely new, but only the internal half is safe | External data = noise, cost and a creepiness cliff; "Kinship never searches the world at random" | The internal half *is* Today's engine; the curated calendar (RCN-02) is a small deterministic table | **VALIDATE BEFORE BUILDING**: internal version via Intentions; external events as a Beta experiment with a curated list | BETA / LONG-TERM |
| **Monthly reflection / letter** | B · E26, board 3 | "Did I show up?" | Five true sentences | Weak: it looks back; the north star looks forward | Return | A letter with no numbers is lovely and rare | The question itself quantifies; thin months feel like failure | **R11:** year-ago lines + a once-a-year letter; Ask answers "what happened with Ben this year?" | **BUILD, BUT SIMPLIFY** (yearly), or **DEFER** | BETA |

### 3.3 Reading what Kinship knows

| Capability | Status | User problem | User value | North-star fit | Loop role | Differentiation | Major risk | Alternative / simpler | Recommendation | Stage |
|---|---|---|---|---|---|---|---|---|---|---|
| **Ask Kinship** (`retrieval_answer`) | A/B · first Alpha candidate | "What's John into?", "Who lives in Alameda?", "What did I get her last year?" (observed organically, H3) | The feeling that Kinship *knows my people*; a cited answer, or "I don't know" | Fit: remembering on demand, before a call or a gift | Memory → Reason (on demand) | Notes apps search text; Kinship answers from structured memory with sources and refuses to guess | Becoming a chatbot; speculation; privacy (retrieval sends items) | **R8:** v1 = People search over statements with cited lines; v2 = synthesis across ≤30 items; never multi-turn | **BUILD, BUT SIMPLIFY** (R8) | ALPHA |
| **Grounded retrieval** itself | B · plan §9 | — | — | — | — | — | Recall gaps → the temptation of embeddings (a new processor) | SQL + facets + per-person selection; trigram only if recall fails | **BUILD AS DESIGNED** (with Ask) | ALPHA |
| **Employer / school / hometown / planned-move slots, aliases, date merge, full-text** | B · "Wait until Alpha" | Ask can't answer "who do I know at Meta" from strings | Better recall for a class of questions | Fit only through Ask | Memory | — | **Semantic expansion for its own sake**: each slot is a schema, a resolver, a corpus and a backfill | Categories already group WORK / EDUCATION; add a slot only when Ask shows a question it can't answer | **VALIDATE BEFORE BUILDING** (R15); employer first, by decision | ALPHA → LATER ALPHA |
| **Typed family relations** (People↔People) | B · Alpha | "Michelle · sister" in Their people when both are in People | A correct, sourced family line | Fit | Memory | — | Transitive or inferred kin (forbidden) | The user's own words from `related_people.relation` (what B8 will show) | **DEFER** to Ask time | LATER ALPHA |
| **Your story together** | B · coverage #13, open decision | A long relationship has no shape | A story, not a log | Fit (remember) | Memory | — | Empty on day one; a timeline is the CRM's favourite screen | "Before" history (B8) + year-ago lines + Ask | **FOLD INTO** B8 + RSN-10; record as INTENTIONALLY DEFERRED with the reason | BETA, by evidence |
| **K18** "told me already" question | B · deferred to semantic memory | Telling a thing twice makes two lines | Kinship says it already knows | Trust | Understand | — | A four-choice surface before SAME exists generally | SAME for residence (B3) first; a general same-note comparator later | **BUILD AS DESIGNED** once SAME is general | ALPHA |
| **About You** | C · deferred repeatedly | A fact only about me has nowhere to go; my interests could inform reasons | "Amanda's going to the Warriors game. You both love basketball" | Fit through reasons; a destination is not needed | Memory → Reason | — | A profile to fill in; "matched interests" language; a page nobody visits | **R12:** a list in Settings; reason use only after Intentions + eval | **FOLD INTO** Settings › What Kinship knows (about you) | LATER ALPHA |

### 3.4 Capture

| Capability | Status | User problem | User value | North-star fit | Loop role | Differentiation | Major risk | Alternative / simpler | Recommendation | Stage |
|---|---|---|---|---|---|---|---|---|---|---|
| **Voice** (on-device, Listening screen) | B · D5, beta week 3 | Typing after dinner is friction | 15 seconds, hands busy | Fit: more Tell → more memory | Tell | On-device only, never uploaded | Device / locale matrix; a screen that exists to look like a feature | **R9:** a mic in the Tell dock (on-device, `requiresOnDeviceRecognition`), no Listening screen; keyboard dictation already works | **BUILD, BUT SIMPLIFY** | BETA week 3 (as decided) |
| **Siri App Intent + Action Button** | B · plan "Next" | The moment to tell is in the car, on a walk | "Tell Kinship: Ben got the job" with the phone in a pocket | Fit: capture where it happens | Tell | Native, private, no screen | App Group hand-off complexity; native build burden | — | **BUILD AS DESIGNED** (R9), ahead of the Listening screen | ALPHA / LATER ALPHA |
| **Share extension** | B · plan "Next after Siri" | News lives in chats and screenshots | Share a message, keep the fact | Fit | Tell | — | Other people's words; images; extension memory limits | Siri first; a share of *text only*, image never stored | **DEFER** to BETA; text-only first | BETA |
| **Widget** | B · plan "Later" | — | Today's line at a glance | Weak: it is an engagement surface | Moment | — | Content on the home screen; refresh budget | A private lock-screen push does the job | **DROP UNLESS NEW EVIDENCE APPEARS** | — |
| **Photo input** | B · Later | Shared moments with photos | Delight | Weak | Memory | — | Faces, locations, storage | — | **DEFER** | LONG-TERM |
| **Delete-after-understanding** | B · CC-6 | Keeping the whole note feels heavy | Only the excerpts stay | Trust | Memory | Rare | Over-promising ("nothing kept") | — | **BUILD AS DESIGNED** when Settings v2 lands | ALPHA |

### 3.5 Trust floor, settings, operations

| Capability | Status | User problem | User value | North-star fit | Loop role | Differentiation | Major risk | Alternative / simpler | Recommendation | Stage |
|---|---|---|---|---|---|---|---|---|---|---|
| **Remembered / Paused controls** | B · D13, PER-06; rendering only | A real address book has someone who died, and someone the user doesn't speak to; a birthday Moment for them is a wound | Hold grief and estrangement quietly | Trust invariant 10 | Moment (suppression) | — | Shipping an outside build without it | — | **BUILD AS DESIGNED** (R4) | NEXT, before any outside user |
| **Export, delete-account v2, Settings v2** | B · "Required" (plan §4); coverage #23 open | Can I leave with my memories? | Ownership | Trust floor; D10's archive state depends on it | — | — | An Alpha user who can't export | — | **BUILD AS DESIGNED** (R4) | NEXT / ALPHA |
| **Merge duplicate people; data cleanup** | B · PER-05, N3, cleanup plan | Two Anthonys | One person | Trust | Memory | — | Silent data mutation (forbidden) | Remove + Bring back (I3) covers some cases | **BUILD, BUT SIMPLIFY** (merge = move lines + archive, undo 30 days) | ALPHA |
| **Showing-up moment count** | B · BETA-02 dashboard | The founder can't tell whether Kinship causes contact | Evidence for every roadmap decision | It *is* the north star | — | — | Counting the wrong thing (opens) | **R3:** one content-free query now; dashboard later | **BUILD, BUT SIMPLIFY** (R3) | NEXT |
| **Reason feedback** ("Useful?", "Not helpful" mute) | B · FB-01, plan §13 | Kinship repeats a kind of reason the user never acts on | It learns from what I do | Learn from action | Return | — | Rating UI feels like surveying | **R5:** "Not helpful" in Moment detail → 30-day mute per type × person | **BUILD, BUT SIMPLIFY** (R5) | ALPHA |
| **Wrong-subject triage, TestFlight rings, gate report** | B · BETA-03/04/05 | — | — | Trust ops | — | — | — | — | **BUILD AS DESIGNED** | ALPHA |
| **Accessibility, privacy policy, icon, Terms** | B · QA-02/03, #35 | 1.0 leaks; VoiceOver untested | — | Trust, polish | — | — | — | — | **BUILD AS DESIGNED** | ALPHA |
| **Legacy 1.0 deletion** | B · E19 | The 1.0 shell is in the bundle; I8 fell into it | Smaller, safer app | — | — | — | Breaking something still referenced | — | **BUILD AS DESIGNED** after the wife dogfood | ALPHA |
| **Multilingual** | B · CC-7 | — | — | — | Understand | — | Wrong memory in a second language | Fail to silence (as now) | **DEFER** | LONG-TERM |
| **Model governance / cost** | B · D12, §31 | — | — | — | — | — | Downgrades eroding trust | — | **BUILD AS DESIGNED** (policy) | BETA |

### 3.6 Structure, intention, business, distribution

| Capability | Status | User problem | User value | North-star fit | Loop role | Differentiation | Major risk | Alternative / simpler | Recommendation | Stage |
|---|---|---|---|---|---|---|---|---|---|---|
| **Intentions** | B · plan §35 (post-validation) | "I keep meaning to be better about Priya" (the 1.0 Seasons insight); Kinship has no way to know what *I* want | Reasons about the people I chose to show up for, weighted by my own words | Fit: the only legitimate relevance input that isn't a hidden score | Reason (relevance) | Every other product decides who needs attention; Kinship lets the user say it | A goal tracker; guilt when the intention lapses; a new screen | **R6:** an intention is a sentence in Tell, kept as a user-subject plan under You said you'd; it raises relevance; nothing tracks it | **BUILD, BUT SIMPLIFY** (R6), after the loop is validated | LATER ALPHA |
| **Chapters / groups** (the accessible half of the Landscape) | B · plan §34 data model | "The Austin crew", "college", "work" are how people think of their people | Filter People by chapter; ask "who do I know from Austin"; intend "keep the Austin crew connected" | Fit through Ask and Intentions | Memory (structure) | Membership, never closeness | Becoming segments; AI defining structure silently | **R7:** user-named, many-to-many, a filter in People, AI only proposes | **BUILD, BUT SIMPLIFY** (R7) | LATER ALPHA |
| **Garden / Relationship Landscape / Hybrid** (visual) | B · GDN-00 checkpoint | "How do my people fit together?" | A picture of a life through its people | Weak for the north star; strong for attachment if it never scores | — | Could be the most beautiful screen in the category | Any picture reads as closeness; equal weight at 100 people is hard | Chapters as a filter first; the visual only if interviews show the question is felt | **VALIDATE BEFORE BUILDING** (the checkpoint as designed), after R7 | BETA / LONG-TERM |
| **`sprig_marks`** (Algorithm C) | B · D8 | — | A few details change with history | Weak | — | — | Reads as a score | Identity-only forever is acceptable | **DEFER**; interviews first | BETA |
| **Subscriptions** | B · D10 | — | — | Pays for the ongoing service | — | "Never holds memories hostage" | Gating emotion | — | **BUILD AS DESIGNED** | MONETIZATION (late beta) |
| **Pricing research** | B · BETA-06 | — | — | — | — | — | Hypothetical answers | Realistic plan-choice screen (as planned) | **BUILD AS DESIGNED** | BETA weeks 6–8 |
| **Lifecycle / growth** (activation rescue, earned reviews, referrals, reactivation, payment recovery, ads) | Founder list; not in plan | — | — | — | — | — | Engagement mechanics creeping in | Only an earned review ask after a confirmed showing-up moment; referral = the friend who felt remembered | **DEFER** all but the earned review | GROWTH |
| **ChatGPT "Help me reach out" probe** | B · plan §36 | People ask ChatGPT what to text a friend | Distribution at the moment of need | Distribution, not product | — | — | A new processor; conversion distance; focus | — | **DROP UNLESS NEW EVIDENCE APPEARS** (keep the note) | LONG-TERM |

### 3.7 Historical items

| Concept | Recommendation |
|---|---|
| Carousel welcome, timeline UI, growth stages, vitality, Garden Walk, Seasons mechanics, memory carousel, quick notes, check-ins, emotion tags, activity feed, rhythm display, night prompt, try-before-account, auto-dismiss | **DROP** (already superseded; keep the archive). The one idea worth carrying forward is Tending Seasons' insight, which lives on as Intentions (R6) |

---

## 4. Where the roadmap is overbuilt

**Ten systems that are four.** The list in the brief names Ask Kinship, retrieval_answer, interaction briefs, calendar briefs, reconnect assistance, the reconnect engine, monthly reflection, Intentions, the Opportunity Engine, Today / Moments, About You and the Landscape as separate things. Read against the loop they collapse:

| Named system | What it actually is |
|---|---|
| Interaction brief, calendar brief | **Moment detail for a planned encounter.** The calendar is one more evidence source for Coming up; "before you see David" is the detail's "why now"; "How was dinner?" is the return check. No Brief screen, no `interaction_brief` capability: the lines are items the user already has. |
| Reconnect assistance, reconnect engine | **A Today candidate type**, eligible only when the user said something (an intention, or "we haven't talked since the move") and a real reason exists. Rhythm detection is a hidden neglect score and should not exist. Openers (D9) are a Moment-detail action, on request. |
| Opportunity Engine | **Today's ranking with Intentions as an input**, plus, much later, a tiny curated calendar of seasons. The external-event half is a separate experiment with its own privacy posture. |
| Monthly reflection | **"A year ago" lines, and Ask.** A monthly cadence is a report; "Did I show up?" is a question that quantifies. A yearly letter is defensible as a gift. |
| About You | **The user's own lines in the same memory store**, listed in Settings. They already exist (`subject_type = user`, K5). A destination in People is a profile to fill in. |
| Relationship Landscape | **Chapters as a People filter.** The visual is a checkpoint question, not a roadmap item. |
| Ask Kinship, retrieval_answer | One capability: Ask is the surface, `retrieval_answer` the engine, People search the entry. |
| Weekly brief | A Sunday push that opens Today. |

**What remains after the fold:** Tell · Memory · Today · Ask · Intentions (with chapters). Everything else is a candidate type, an evidence source, a delivery channel or a setting.

**Three other places that are heavier than the need:**

1. **Semantic slots.** Residence proved the contract; employer is decided. School, hometown, planned-move destinations, aliases and date-precision merge are each a schema, a resolver, a corpus and a backfill. The justification for all of them is Ask, which does not exist yet. The order should be Ask → the questions it cannot answer → the slot that answers them.
2. **The Listening screen.** D5's privacy rule (on-device, never upload) is right. A full-screen listening surface is a feature that exists to be seen. A mic in the Tell dock does the job; Siri covers hands-busy.
3. **`reason_generate`.** Today's copy is the user's own words plus deterministic templates, which is grounded by construction and has read well in dogfood. Model phrasing adds a validator, a batch job, cost and an AI-flavoured voice for a problem nobody has reported.

---

## 5. What Kinship may still be missing

Only strong opportunities. Each is **STRATEGIC RECOMMENDATION — NOT CURRENTLY APPROVED**.

**R1 · Kinship must be able to speak while closed.** Plan §4 classes proactive push as *Required* and says a beta without it "measures app-opening habits, which is the engagement metric the product rejects". It is not in the committed sequence and coverage #31 has waited for a decision since 5 Oct. The smallest version: one notification type (the Moment Today already chose as primary), private lock-screen copy, D4's budget and pause, permission asked after the first real moment. No weekly brief, no tiers beyond one, no Settings page beyond pause. This is the single highest-leverage unbuilt capability.

**R2 · Reasons from memory, not only from the calendar.** Today speaks for exact-day events, birthdays, milestones, good news and first days. It is silent for the user's own undated promises, for open threads, and for hard times. Those three are precisely what only a memory can return: no calendar knows you said you'd send the contractor number, that Josh was deciding about the startup, or that Mom's surgery is Thursday. Promise reasons already have the 1.0 guilt-firewall rules (once only, never "you still haven't", "Kept it / Let it go"). Build RSN-06, RSN-07 and RSN-09 before Alpha.

**R3 · Count the north star.** The showing-up moment is defined to the tap (plan §24) and the data is already written (`contact_events` with source `return_check`, linked to the reason's memory item and moment type since I2). One content-free query answers "did Kinship cause contact this week?" for the founder's and the wife's accounts. Every stage decision in §7 depends on it.

**R4 · The trust floor before any outside user.** Remembered / Paused controls (a real address book will hit both within the first week), export, delete-account v2, and a safe merge for duplicate people. All were "Required" for V1. None blocks the household dogfood, all block Alpha.

**R5 · Learning from action.** The ranking has a `user_feedback` multiplier and a "not helpful" mute in the plan; nothing in code learns from what the user does with a reason. The minimal version is one quiet "Not helpful" in Moment detail that mutes that type for that person for 30 days. It is the only feedback that doesn't feel like a survey, and it is what stops a kind of reason from becoming noise.

**R6 · Intentions as a sentence.** The 1.0 Seasons spec found the real need: "I keep meaning to be better about Priya". The 2.0 answer is not a surface. "I want to make more space for Chris this fall" is already a user-subject plan about a person; keep it as one, show it under You said you'd, and let it raise the relevance of Chris's candidates and unlock a reconnect candidate when a real reason appears. No progress, no streak, no "you set this intention 6 weeks ago". This one primitive makes Reconnect, the internal Opportunity Engine and reason-side About You unnecessary as separate systems.

**R7 · Chapters as a filter.** "The Austin crew" is how people think. Many-to-many, user-named, AI may propose from the user's own memories, shown as a filter in People and usable by Ask and Intentions. It is the accessible half of the Landscape and costs a fraction of it.

**R8 · Ask that starts as search.** Match statements as well as names in People search, show the matching lines with sources, and answer "I don't know" otherwise. That is already most of Ask's value (H3's examples are all one-person lookups) with no synthesis, no chat and no new processor. Synthesis across items is v2.

**R9 · Capture where it happens, in this order:** Siri / Action Button, a mic in the Tell dock, then a text-only share. The loop dies without input, and the input moments are in the car and the group chat, not in the app.

Smaller, worth noting: a hard-time lock-screen rule that is always `private` regardless of setting (plan §22 has it); the notification permission ask attached to the first real Moment (PUSH-08); the K18 "already told" question once SAME is general.

---

## 6. The smallest coherent Kinship

If everything else were removed, this is the product that could still be exceptional:

1. **Tell**: one text field everywhere, keyboard dictation, Siri later. One pipeline.
2. **Understand**: extraction with held questions, sensitive-always-confirm, two-candidates-ask, correction in two taps, exact Undo, a source on every line.
3. **Memory**: Portrait (Lately · Coming up · You said you'd · Between you) and What Kinship knows as organised reference with Before history. Remembered and Paused. Nothing counted.
4. **Today**: one Moment from six deterministic candidate types (birthday, upcoming event, event follow-up, promise, open thread, hard time), two quiet lines, "Nothing needs you today", Moment detail, hand-off to the real channel, the one-tap return check, the interaction trail.
5. **Delivery**: ≤3 private pushes a week of the Moment Today chose, with pause.
6. **Trust floor**: consent, provenance, export, delete.

That is Tell → Understand → Memory → Moment → Reason → real conversation → return, with nothing that quantifies, no AI visible, and no screen whose job is to be looked at. Ask, Intentions, chapters, calendar, voice, Siri, share, year-ago and subscriptions are multipliers on it; none is needed to prove it.

What is in that list and not yet built: promise, thread and hard-time reasons; push; Remembered / Paused controls; export; delete v2.

---

## 7. Proposed roadmap

The committed B4–B9 sequence is kept intact. What changes is what sits around and after it, and the order of the deferred items. Each stage names the product hypothesis it tests.

### NOW (Phase 4B, as committed)
B4 → B5 → B6 (STOP) → B7 → B8 → B9 → employer evaluation. In parallel, on the app side where 4B is gateway-and-schema work: Remembered / Paused controls (R4) and the showing-up count query (R3).
**Hypothesis:** *What Kinship knows reads as a person's memory writing itself, not a contact record; semantic closure never shows a false detail.*

### NEXT (around the wife dogfood)
- Wife dogfood round 1 on the B9 build, low coaching, the nine questions in HANDOFF §D, plus two new ones: *did anything come back that you'd forgotten you told it?* and *did you reach anyone because of it?* (R3 counts it).
- Promise and open-thread reasons (R2).
- Minimal Tier-1 push (R1), permission ask after the first Moment.
- Wife dogfood round 2 with push.
**Hypothesis:** *Kinship brings back things the user told it, while the app is closed, and that produces real contact at least weekly, without feeling like nagging.* Kill signal: a mute / pause after a push, or "it felt like a reminder app".

### ALPHA (8–12 users)
- Hard-time reasons (R2), always-private lock screen.
- Export, delete-account v2, Settings v2, delete-after-understanding, merge duplicates (R4).
- Ask v1 as grounded search (R8); employer slot if decided.
- Reason feedback (R5); I2b for surfaced plans only; K18 "already told".
- Siri / Action Button (R9).
- Legacy 1.0 deletion; accessibility; privacy policy; icon.
- Triage runbook, rings, the metrics dashboard.
**Hypothesis:** *Strangers understand Today without coaching; Kinship "knows my people" (Ask); capture continues past week two.* Gate: plan §24 activation targets, zero wrong-subject.

### LATER ALPHA
- Intentions v0 as a sentence (R6); chapters as a filter (R7); reconnect as a candidate type gated by both (R13).
- Calendar as a Coming up source with Moment-detail lines (R10), only if D6's trigger fires or Alpha interviews ask for it.
- Weekly Sunday push that opens Today.
- About You as a Settings list (R12). Typed family relations if Ask needs them.
**Hypothesis:** *User-declared intentions make Kinship's reasons feel like mine; chapters make a large People list navigable without ranking anyone.*

### BETA (30–50, 8 weeks)
- Voice as a dock mic (week 3, as decided); text-only share extension.
- Year-ago lines; a yearly letter if wanted.
- Visualization checkpoint GDN-00 (design only).
- Pricing research weeks 6–8; subscriptions and the archive state built for public launch.
- Model promotion policy.
**Hypothesis:** *≥40% of activated users have ≥2 showing-up moments; people would keep paying monthly for the service that brings things back.*

### LATER / CONDITIONAL
External-event Opportunity Engine (curated seasons only); the Landscape visual (if the checkpoint passes its research questions); `sprig_marks`; photos; multilingual; E2EE; growth loops beyond the earned review; the ChatGPT probe.

### DROP / ABSORB
Rhythm and quiet-stretch detection (drop). Brief screen (absorb into Moment detail). Reconnect as a system (absorb into Today + Intentions). Monthly cadence (absorb into year-ago + Ask). About You page (absorb into Settings). Widget (drop). `reason_generate` (defer indefinitely). School / hometown / planned-move slots (hold behind Ask evidence). Carousel, timeline, task manager, scores, personality onboarding, chatbot (dropped).

---

## 8. The five highest-value product bets

1. **Proactive delivery of one true Moment** (R1). Converts Kinship from a journal you remember to open into the thing that brings it back when it matters. Drives the first aha and weekly return more than anything else.
2. **Memory-driven reasons: promises, threads, hard times** (R2). The reasons no calendar or contacts app can give. Drives emotional attachment ("it remembered Mom's surgery") and the feeling of showing up.
3. **Grounded Ask** (R8). The proof that Kinship knows my people. Observed organically in dogfood. Drives retention and willingness to pay ("I'd lose all of this").
4. **Intentions as the one user-authored relevance input** (R6, with chapters R7). Replaces three planned systems with a sentence, and keeps the product on the right side of "nothing quantifies a relationship".
5. **Capture where it happens** (R9: Siri, dock mic, share). Capture is infrastructure; this is what keeps the infrastructure fed after week two.

Word of mouth sits outside this list because it comes from the recipient: the friend who asks "how did you remember?". Nothing on the roadmap needs to be built for that; an earned review ask after a confirmed Yes is the only mechanic worth adding.

---

## 9. The five roadmap items most at risk of becoming distractions

1. **Semantic slot expansion** (school, hometown, planned moves, aliases, date merge) before Ask shows the questions it must answer. Each is a schema plus a corpus plus a backfill; none produces a reason.
2. **The Garden / Landscape visual.** Beautiful, approved as a checkpoint, and the surface most likely to encode closeness by accident. Chapters as a filter give the user the same capability without the picture.
3. **The Opportunity Engine with external data.** The internal half is Today. The external half adds processors, cost and a creepiness cliff for a reason that works only when the user already said "we watch Texas together".
4. **Monthly Reflection.** A report in a product that must not quantify; thin months read as failure.
5. **Native targets as features** (the Listening screen, a widget, a share extension with OCR) ahead of Siri and the dock mic. Also in this class: the ChatGPT probe, which is distribution before retention.

An honourable mention: another broad stabilization loop. CC-24's rule (a capture bug interrupts the roadmap only when it risks a trust invariant) should be defended.

---

## 10. Where the roadmap is drifting from the north star

1. **"Bring it back when it matters" has quietly become "show it when the app is opened."** Push was *Required* in plan §4 ("without it we test 'do people open Kinship', not the thesis"). It fell out of the Phase 3 build, was never moved to a stage, and coverage #31 has sat as "needs founder approval" since 5 Oct. This is the largest single gap between the stated thesis and the sequenced work.
2. **Reasons are calendar-shaped.** The ochre mark means two things: something understood, and something you said you'd do. The second never returns on its own. Promises, threads and hard times, the most human reasons, are the unbuilt ones. Meanwhile six of the next seven steps are about how memory is *organised*. B8 is justified (I7 would otherwise show false history), but "what Kinship does with what it knows" has in practice meant "how Kinship displays what it knows".
3. **The trust floor is behind the semantics.** Export, delete, Remembered / Paused and duplicate merge were V1 "Required"; residence composition was a Phase 4 addition. The order is defensible for the household dogfood and indefensible for Alpha.
4. **The north star is defined and never measured.** Every decision since 2 Oct has been made on device checks and ledger rows, which is right for trust and silent on value. The showing-up count is one query away.
5. **"Waiting on Josh" and "Did Josh send it?" are the closest existing surface to a pressure mechanic.** They are about the other person's promise, carry no count, and leave after three days, so they pass. They are worth watching in the wife dogfood for whether they read as Kinship keeping score.
6. **Minor:** the plan's reconnect design still carries a "quiet stretch" multiplier (`1 + 0.15 · quiet_stretch`) and a rhythm computation. Both are hidden neglect measures by another name and contradict the permanent rule more than any visible surface does. They should be struck from the plan, not merely gated.

---

## Appendix A. Compact per-item assessment (the thirteen questions)

For items not fully covered by the matrix, the remaining fields in one line each: *frequency · dependencies · evidence · stage*.

| Item | Frequency | Dependencies | Evidence | Stage |
|---|---|---|---|---|
| Push (R1) | Weekly, ≤3 | Device tokens, planner, Today's chooser (exists), permission ask | Plan §4 "Required"; D4 approved; no dogfood data without it | NEXT |
| Promise reasons | Weekly for active users | `kind = promise` (exists), windows | Plan RSN-06; 1.0 spec; founder's own promises in dogfood | NEXT |
| Thread reasons | Weekly | `threads.ts` resolution (exists), `followup_after_days` | Plan RSN-07; dogfood threads (Box, startup) | NEXT |
| Hard-time reasons | Rare, very high value | Sensitivity labels (exist), always-private push | Plan RSN-09; founder hypothesis; no dogfood case yet (health is held) | NEXT / ALPHA |
| Ask v1 | Weekly to occasional | Facets (B2–B5), categories (B1), search UI | Organic (H3); approved as Alpha candidate | ALPHA |
| Intentions v0 | Occasional, high value | User-subject plans (exist), ranking input | 1.0 Seasons insight; founder hypothesis; T14 "if beta users ask" | LATER ALPHA |
| Chapters | Occasional | Many-to-many table (protected in plan §34) | Founder hypothesis (§34 life chapters) | LATER ALPHA |
| Calendar as source | Weekly for users with calendars | D6 trigger, attendee matching, permission in context | Plan §16 "Very high value" (audit); not observed in dogfood | LATER ALPHA / BETA |
| Reconnect candidate | Occasional | Intentions, a real reason | Plan §17; founder hypothesis | LATER ALPHA |
| Year-ago | Occasional, warm | A year of dated moments | 1.0 `spotlightEngine` existed; cheap | BETA |
| Yearly letter | Rare | `reflection_generate`, a year of trail | Board 3; founder hypothesis | BETA |
| Voice (dock mic) | Daily for some | On-device recognition, dev build | D5 approved; audit "largest friction reducer" | BETA wk 3 |
| Siri / Action Button | Daily for some | App Intent, App Group | Plan §21 "High"; no dogfood data | ALPHA / LATER ALPHA |
| Share (text) | Weekly | Extension target | Plan §21 "High"; privacy-sensitive | BETA |
| Remembered / Paused | Rare, very high value | Person state (exists) | D13 approved; trust invariant 10 | NEXT |
| Export / delete v2 | Rare, trust | SET-04/05 | Plan "Required" | NEXT / ALPHA |
| Merge people | Rare | Lines move, archive, undo | N3 observed in dogfood | ALPHA |
| Reason feedback | Occasional | Moment detail (exists) | Plan FB-01, §13 | ALPHA |
| Showing-up count | Continuous | `contact_events` (exists) | Plan §24 | NEXT |
| Employer slot | Occasional | Facet mechanics (B2–B5) | Investigation; dogfood "Meta / finance" case | ALPHA, by decision |
| School / hometown / moves | Rare | Facet mechanics | None beyond "kids' schools are common" | Hold behind Ask |
| Typed family | Occasional | Their people (B8) | Dogfood ("Michelle is Susan's sister") | LATER ALPHA |
| Your story together | Rare | Dated history | Design board; empty on day one | BETA, by evidence |
| About You list | Rare | User-subject lines (exist) | G28 founder question | LATER ALPHA |
| Landscape visual | Rare | GDN-00 | D7 addendum; no user evidence | BETA checkpoint |
| Subscriptions | Monthly | Entitlement flag | D10 | MONETIZATION |
| ChatGPT probe | — | OpenAI processor | Unverified marketing claims (§36) | LONG-TERM |

## Appendix B. Items the brief's list did not name

Found in the canonical docs and added to the inventory: proactive push and the weekly brief (B1); the remaining reason types including hard-time and year-ago (B2); `reason_generate` (B3); export, delete, Settings v2 and delete-after-understanding (B14, B11); Remembered / Paused controls (B15); merge duplicates and the data-cleanup plan (B16); Your story together as an open coverage decision (B9); K18 / K21 / K22 deferrals (B10, A5); beta operations and reason feedback (B24); the ChatGPT probe (B25); photo input (B13); legacy 1.0 deletion (B18); accessibility, privacy-policy and icon work (B17); multilingual (B19); the anonymous-auth revisit trigger (B20); `sprig_marks` and the GDN-00 checkpoint's exact deliverable (B21); model governance and cost (B26); the E2EE path (B27); and, from history, Tending Seasons as the ancestor of Intentions (C5).
