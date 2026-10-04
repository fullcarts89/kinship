# Kinship 2.0 — Founder Decisions

Recommendations 30 September 2026 · **Decided by Thor, 1 October 2026** · Companion to `KINSHIP_2_OPERATIONALIZATION.md`

All thirteen decisions are now made. Where Thor's decision differs from the original recommendation, the decision below supersedes it, and the affected plan sections have been updated to match. Phase 0 is authorized; Phase 1 waits for Phase 0 review.

| # | Decision | Status | Decided |
|---|---|---|---|
| D1 | Account before first use | **Approved** | Sign in with Apple before the first Tell; no anonymous-user infrastructure in V1 |
| D2 | What may be sent to the AI provider | **Approved, with a disclosure requirement** | Minimal context per capability; a plain in-product disclosure, not only in the policy |
| D3 | AI consent | **Approved** | One explicit onboarding consent; server-side, versioned, revocable, enforced at the gateway |
| D4 | Proactivity | **Approved as a beta hypothesis** | ≤ 3 pushes / 7 days, ≤ 2 time-sensitive, 1 weekly brief, private lock screen, back-off, global pause; all configurable |
| D5 | Voice | **Approved** | Text first; voice ~week 3 of beta behind a flag; on-device only; never upload audio |
| D6 | Calendar | **Approved** | After core-loop validation, unless beta evidence shows missing encounter context is the main capture problem; permission always contextual |
| D7 | Garden | **Approved** | Not on the beta critical path; Quiet Herbarium visuals and sprigs ship first |
| D8 | Sprig semantics | **Approved, safest option** | Identity only in V1; `sprig_marks` built but off through initial beta; CI area test stays |
| D9 | AI writing | **Approved** | V1 gives ideas and things to mention; openers later, only on request; never sends |
| D10 | Monetization | **Replaced** | Beta cohort 1 fully free; Kinship becomes a paid subscription; archive state never holds memories hostage; pricing tested late in beta |
| D11 | Encryption | **Approved as recommended** | SQLCipher + SecureStore key, at-rest encryption, strong RLS, minimal service role, no content in logs; no E2EE yet |
| D12 | Model strategy | **Approved, with governance change** | Strongest model first; per-capability downgrades only at eval parity; Thor approves during beta; a written promotion policy afterwards |
| D13 | Deceased / estranged | **Approved** | `remembered` and `paused`; set only by the user; no proactive reasons |

---

## D1. Account before first use — APPROVED

**Decision.** Kinship V1 requires an account before the first Tell. Sign in with Apple is the preferred path on iOS because it is the lowest-friction option.

**Onboarding order:**
1. Product promise.
2. Product promise and privacy context (including the D2 disclosure and the D3 consent choice).
3. Sign in with Apple.
4. People selection.
5. The first useful Kinship moment.

**Not built in V1:** anonymous-user infrastructure of any kind.

**Revisit trigger:** if beta instrumentation shows more than about 25% abandonment specifically at the authentication step, evaluate Supabase anonymous authentication with `linkIdentity`. Don't build that path in advance.

---

## D2. Information permitted to be sent to the AI provider — APPROVED WITH AN ADDITIONAL DISCLOSURE REQUIREMENT

**Decision.** Minimal context. Each AI request contains only what that capability needs.

**For `relationship_extract`, a request may include:**
- the current capture;
- display names, nicknames and relationship references needed for entity resolution;
- relevant structured memory for no more than about three likely people;
- relevant dates and provenance context.

**Never included, unless a future capability is explicitly approved to need it:**
- phone numbers, email addresses, postal addresses;
- full contact lists;
- photos, raw audio;
- entire calendars, calendar descriptions or bodies;
- unrelated people's dossiers;
- analytics identities;
- other users' information.

**Disclosure requirement.** The product itself must make one fact plain, and not only in the privacy policy:

> Information you choose to record about people in your life may be processed by Kinship's AI provider in order to understand and organize it.

This sentence (or a clearer equivalent) appears on the onboarding privacy-context screen, next to the AI consent choice, and again in Settings › What Kinship knows.

**Sensitive content** (health, death and grief, conflict, money) follows the restrictions already in the plan: it is sent to extraction only, so it can be labelled. It stays out of reason, brief and letter prompts unless the user turns on "Include sensitive details in suggestions".

**Vendor retention.** Pursue zero-data-retention terms with Anthropic. Until those terms actually apply to the model in use, Kinship must not claim that the provider retains nothing. Interim copy: "Sent to Anthropic to understand it; not used to train models."

---

## D3. AI consent — APPROVED

**Decision.** AI processing requires one explicit, understandable consent during onboarding.

**The consent is:**
- stored server-side (`user_settings.ai_consent`), default off;
- versioned (`consent_version`), and asked again if the data flow materially changes;
- revocable in Settings, taking effect at the gateway within a minute;
- enforced at the AI gateway, which rejects calls without consent (HTTP 403).

**No per-feature consent maze.**

**If the user declines,** Kinship gives the reduced non-AI experience the plan defines: raw notes, deterministic dates, birthdays, manual people and items. It doesn't ask again.

---

## D4. Proactivity — APPROVED AS THE WORKING HYPOTHESIS

**Decision for the beta:**
- At most 3 pushes in any rolling 7 days.
- At most 2 of those are time-sensitive.
- One weekly brief.
- Private lock-screen copy by default.
- Automatic back-off when pushes are ignored.
- An easy global pause.

These are **configurable beta assumptions**, held in server configuration and `user_settings`. They are not immutable product constants.

---

## D5. Voice — APPROVED

**Decision.** Text launches first. Voice reaches the beta around week 3 behind `voice_capture`.

- On-device recognition only.
- If on-device recognition can't be guaranteed for a device or locale, voice is hidden or disabled, and text input stays.
- Never silently fall back to uploading raw audio.
- Raw audio is never retained.

---

## D6. Calendar — APPROVED

**Decision.** Calendar integration is not part of the first validation loop. It is built after core-loop validation, **unless** beta evidence clearly shows that missing automatic encounter context is the primary capture problem. In that case it may be pulled forward, with Thor's approval.

Calendar permission is always requested in context (when the user turns on the feature that needs it), never at launch or from Today.

---

## D7. Garden — APPROVED

**Decision.** The full Garden visualization is not on the critical path to the beta. The Quiet Herbarium visual system and each person's individual sprig ship first. The full Garden is a post-validation feature.

**Addendum (1 October 2026).** The shape of that post-validation visualization is reopened, not settled. When the work begins, the team prototypes and compares the Herbarium Garden, a Relationship Landscape of communities and life chapters, and a Hybrid (sprigs within Landscape regions), then stops at a design checkpoint (`KINSHIP_RELATIONSHIP_LANDSCAPE_EXPLORATION.md`) before building any of them.

- **The rule for any Landscape:** position means membership or belonging, never closeness, importance, recency or health.
- The full brief is in `KINSHIP_2_OPERATIONALIZATION.md` §34.
- Nothing about this changes Phase 0 or the V1 critical path.

---

## D8. Sprig semantics — APPROVED WITH THE SAFEST OPTION FOR V1

**Decision.** V1 sprigs represent **identity, not relationship activity.** The deterministic seed alone determines the visible botanical structure.

**Relationship activity must not make a person's sprig:**
- larger, taller or fuller;
- healthier or more colourful;
- more elaborate in an obviously cumulative way.

**Not shipped:** one leaf per memory.

**Never visually encoded:** recency, relationship health, contact frequency, number of memories, number of interactions.

**The bounded-history experiment:**
- The bounded-history morphology (Algorithm C) is built behind `sprig_marks` and stays **off** through the initial beta.
- It may be considered only after qualitative research shows that users read the sprig primarily as a person's identity rather than a relationship score.
- The CI property test that prevents cumulative history from materially increasing rendered area stays in place permanently.

---

## D9. AI writing — APPROVED

**Principle:** Kinship helps users remember what matters. It does not conduct relationships for them.

- **V1:** contextual ideas, and things the user might mention.
- **Later (Reconnect):** a few short opener ideas, only after an explicit user request, always editable, never inserted automatically, never sent.
- Kinship never sends a communication on the user's behalf.

---

## D10. Monetization — REPLACED WITH THIS WORKING HYPOTHESIS

This supersedes the original "free forever core plus paid features" recommendation.

### Beta

- Beta cohort 1 is completely free.
- No payment information is required.
- The beta exists to answer one question: **does Kinship cause meaningful moments of showing up?**
- Onboarding is not optimized around payment.

### Direction

Kinship is intended to become a **paid consumer subscription**, not an indefinitely free AI product.

### Public-launch pricing hypotheses (not to be hardcoded)

| Plan | Monthly | Annual | Notes |
|---|---|---|---|
| Standard | $4.99 | ~$39.99 | Full-feature trial, initially ~14 days |
| Founding / early adopter | $2.99 | ~$24.99 | Possibly grandfathered for early beta and founding users, if we choose to offer it |

These numbers are hypotheses. The architecture should support subscriptions cleanly later, and nothing more. **No StoreKit work in Phase 0**, and no prices in code.

### Subscription philosophy

**Don't slice emotionally important functionality into artificial premium gates.** Never "free users get 5 friends", "paid users get 50", or "pay to remember another person".

**The object of monetization is Kinship actively remembering and helping you show up.**

**An active subscription includes the ongoing intelligent service:**
- AI understanding;
- the proactive Today;
- reasons to connect;
- intelligent follow-ups;
- voice understanding;
- relevant future AI capabilities and integrations.

**The non-subscriber / archive state.** Users keep ownership of and access to their information. They can still:
- browse existing people and memories;
- access existing raw notes;
- export everything;
- delete everything.

Basic manual note-taking may remain. Kinship's ongoing AI and proactive service pauses.

**Kinship never holds a user's memories hostage after cancellation.** The exact archive and free behaviour is tested before public launch.

### Architectural implication (for later phases, not Phase 0)

- Entitlement is one server-side flag checked where the ongoing service runs: the AI gateway, the reasons engine and the push planner.
- Read, export and delete paths never check entitlement.
- Nothing counts people or memories for billing.

### Beta monetization research

Pricing is tested late in the beta, after users have experienced Kinship, and not through hypothetical "would you pay?" questions alone. Research covers:
- the unaided expected price, asked after a meaningful Kinship moment;
- reactions to roughly $2.99, $4.99 and $7.99 per month;
- annual vs monthly preference;
- whether they see Kinship as something they'd subscribe to continuously;
- which functionality they believe is worth paying for;
- what would make them cancel.

Where practical, use realistic pricing-choice exercises: for example, a simulated plan-selection screen with real prices and a "reserve founding price" choice that isn't charged. The research plan is in `KINSHIP_2_OPERATIONALIZATION.md` §30 and ticket BETA-06.

---

## D11. Encryption — APPROVED AS RECOMMENDED

**V1 protections:**
- SQLCipher on the device, with the key protected in SecureStore;
- Supabase encryption at rest;
- strong RLS with adversarial tests;
- minimum service-role exposure (named functions only);
- no user content in logs or analytics;
- user-controlled capture and source retention.

**No full E2EE** while the product depends on server-side AI. The key design keeps a path open to stronger encryption as more processing moves on-device.

---

## D12. Model strategy — APPROVED WITH A GOVERNANCE MODIFICATION

**During initial development and the first beta:**
- Critical semantic capabilities start on the strongest appropriate model, currently Claude Opus 5.5, with effort configured explicitly.
- Model cost is not optimized ahead of correctness.
- A cheaper model may replace a stronger one **per capability, never globally**, and only when that capability's eval suite shows parity against the approved thresholds.
- **Thor approves every model downgrade** during the first beta.

**After the beta,** founder approval is replaced by a documented **model promotion policy.** A model change is permitted when all four hold:
1. every hard grounding and safety threshold passes;
2. there is no statistically meaningful degradation on critical correctness metrics;
3. latency, cost or reliability improves meaningfully;
4. an eval artifact is attached to the change.

**High-risk capabilities.** `relationship_extract` and person/subject resolution (`person_resolve`) carry a **higher replacement threshold** than stylistic generation such as `reason_generate` phrasing. For them, "parity" means no regression at all on wrong-subject, certainty preservation, hallucinated items or person-resolution precision, measured on the full ambiguity set.

---

## D13. Deceased and estranged relationships — APPROVED

**Two supported states:**
- **`remembered`** (the person has died). The sprig is frozen and drawn in quiet ink. The page opens with a single "Remembered" line.
- **`paused`** (estranged, or "not now"). The person stays in People with no visual marker; the state is visible only on their page.

**Rules:**
- **Only the user sets these states,** from the person's page. AI never infers them autonomously, and extraction never proposes them. A capture that mentions a death is labelled sensitive and handled with the usual confirmation. It does not change the person's state or prompt the user to change it.
- **No proactive reasons** are generated for `paused` or `remembered` people. That includes birthdays. The exception is a specific memorial behaviour the user deliberately enables later.
- Both states are reversible.

---

# Phase 0 closeout decisions (2 Oct 2026)

Thor reviewed `KINSHIP_PHASE_0_REPORT.md` and approved the Phase 0 implementation, subject to the decisions and release gates below. **Phase 1 is authorized only after every Phase 0 exit gate passes**, and then only in checkpoints A–D followed by the vertical slice. See the Phase 1 execution model at the end of this section.

## F0-D1. Photo handling on sign-out — APPROVED (transitional)

The P0-15 behaviour stays:
- An ordinary sign-out may keep that same account's local photos.
- Another account claiming the device removes the prior account's photos.
- Account deletion removes them.
- No other signed-in account may ever see them.

**Why:** Kinship 1.0 has no server copy of photos, so deleting them on sign-out could destroy memories permanently.

This is **intentional transitional 1.0 behaviour, not a product principle.** Revisit it when 2.0 private Storage holds durable synced copies, and remove the special case if they make it unnecessary.

## F0-D2. Email confirmation — APPROVED: ON

If email/password stays a sign-in method, email ownership must be verified. Sign in with Apple remains the preferred path on iOS.

Verify:
- the confirmation flow;
- that unconfirmed accounts can't sign in;
- that Apple and Google sign-in are unaffected;
- that account deletion still works.

If a conflict appears, surface it before working around it.

## F0-D3. Leaked-password protection — APPROVED: ON

Then refresh the security advisors, confirm the warning is gone, and record it.

## F0-D4. Analytics provider — APPROVED: PostHog for the beta

PostHog is used only through the typed `track()` abstraction:

product code → `track()` → analytics abstraction → PostHog sink

Privacy requirements:
- autocapture off;
- session replay off;
- IP capture disabled or anonymized as strongly as supported;
- none of the following, ever: names, emails, phone numbers, note text, relationship content, free-form values, contact names, memory statements, AI prompts or outputs.

No screen or feature code may call PostHog directly; a lint or structural guard enforces this.

Document the events, their properties, the privacy and retention configuration, and how to disable the sink globally. **Do not enable product analytics until the configuration has been reviewed for accidental personal data.**

## F0-D5. Sentry — APPROVED

Configure Sentry and keep the Phase 0 scrubber:
- PII off;
- screenshots off;
- tracing off unless separately approved;
- user-authored messages redacted;
- no relationship content;
- breadcrumbs limited to the approved safe classes.

Setup:
- Set `EXPO_PUBLIC_SENTRY_DSN`, the organization and project config, and `SENTRY_AUTH_TOKEN` as a secret.
- Enable source-map upload, and remove `SENTRY_DISABLE_AUTO_UPLOAD`, only once the configuration is valid.

Then force a crash on a device. **Inspect the real event by hand.** Arrival alone is not completion: confirm it has no note text, contact names, email, device-owner name, AI input or output, or relationship data, and record the result.

## F0-D6. Anthropic production key and source parity — APPROVED

Set `ANTHROPIC_API_KEY`.

Then:
1. Deploy the exact repository version of `ai-insight`, using the shared auth module. Never hand-edit the deployed function.
2. Re-run the auth, consent and quota probes.
3. Make one legitimate consented call and confirm it returns 200.
4. Confirm no user content is in the logs.
5. Confirm quota accounting increments.

**Invariant for Phase 1: what's deployed can be reproduced from `main`.** If production ever differs from the repo, stop and reconcile.

## F0-D7. Remaining npm advisory — ACCEPTED TEMPORARILY

The high-severity `image-size` advisory in Metro/Expo build tooling is accepted until the next appropriate Expo SDK upgrade:
- it is not in the shipped runtime;
- the fix requires a breaking dependency path.

Keep it documented and keep CI's audit report-only for this item. Do **not** extend this exception to future unrelated high or critical runtime advisories.

## F0-D8. CI protection — APPROVED

Make the Phase 0 CI checks required for merging to `main`: TypeScript, lint, Jest, Deno check and tests, and pgTAP. Document the exact required checks. No agent should be able to merge around them casually.

## F0-D9. Phase 0 merge — APPROVED after the final gates pass

1. Bring the branch current with `main`.
2. Resolve any conflicts carefully.
3. Run the full CI again and review the final diff.
4. Merge into `main`.
5. Verify CI on `main`.
6. Verify that production schema and functions match the merged repository.

Phase 1 branches from the hardened `main`.

## F0-D10. Stale branches — APPROVED to close after final verification

Approved for closing, after confirming no unique work the 2.0 plan still needs:
- `fervent-lovelace-szugz6`
- `hormozi-value-research-s592G`
- `review-kinship-history-P53d6`
- `brave-cori-514h7d`
- `wonderful-planck-inpeu9` (its AI hardening must already be in merged history)

`tender-mendel` is reviewed separately and is not deleted just because it isn't on the list. `inspiring-ritchie` may be cleaned up if it has no unique commits. Keep a disposition record: `docs/ops/branch-disposition.md`.

## Phase 1 execution model (authorized only after the Phase 0 exit gate)

Phase 1 runs in checkpoints, each stopping for review where noted.

- **A — Schema and domain model.**
  - Produce the exact proposed migration and schema diff for the 2.0 domain: people, captures, related people, memory items and their sources, reasons, reason events, interactions, user settings, consents, devices, notification log, feature flags, AI usage.
  - Validate: provenance, ownership, RLS, tombstones, `updated_at`, optimistic versioning, subject/person semantics, uncertainty, sensitivity, superseding, deletion, future sync.
  - Write schema and RLS tests.
  - **Stop for founder/architecture review before applying the major 2.0 schema to production.** The planning document alone is not approval of the final SQL.
- **B — Local repository and sync.**
  - Layering: screens → view-models/hooks → repositories → encrypted local store and outbox → sync engine → Supabase. UI code never merges local and remote data.
  - Prove: per-user isolation, offline capture, idempotent writes, incremental pulls, tombstone propagation, conflict handling, sign-out cleanup, account switching, no demo identities.
  - Produce an architecture verification summary before any broad UI migration.
- **C — AI gateway and evaluation harness.**
  - Narrow capabilities, not one giant prompt.
  - Before relying on `relationship_extract`, evals must cover: wrong person, relatives, pronouns, tentative vs stated, reported information, plans vs dated events, promises, dates, sensitive information, hallucinated names, prompt injection, merging and superseding.
  - *Silence beats a wrong personal detail.* Below threshold: ask more, save less, surface less. Never lower thresholds to look finished.
  - Model changes follow D12.
- **D — Quiet Herbarium foundations.**
  - Tokens, typography, Moment, Row, Token, Tell, Sheet, Pill, and a basic Sprig.
  - The sprig is **identity only**: no growth, recency, vitality, fading, health or ranking; `sprig_marks` stays off.
  - No Garden, no Landscape.
- **First vertical slice.** "Ben runs Chicago Sunday. He's hoping to break four hours." The slice runs end to end:
  1. Raw capture.
  2. Correct person and date.
  3. Goal retained.
  4. Provenance on every memory item.
  5. Correction and source view.
  6. A future reason candidate.
  7. Today shows "Ben ran Chicago yesterday", with "His goal was under four hours".
  8. Handoff to the real channel. Opening the channel alone does **not** count as contact; the return check confirms it.
  9. New context flows back into Tell.

  Not part of the slice: Garden, Landscape, voice, calendar, Siri, widget, share extension, reconnect, Ask Kinship, monthly reflection, payments.

  Then **stop** and write `KINSHIP_PHASE_1_VERTICAL_SLICE_REPORT.md` for founder review.

The first milestone is not "all planned screens exist". It is: *a user tells Kinship one meaningful thing, Kinship remembers it correctly, brings it back at the right moment, and helps the user show up.*

---

# Checkpoint A review decisions (2 Oct 2026)

Thor approved Checkpoint A (`docs/phase1/checkpoint-a-schema-review.md`) with these amendments. All are implemented as **forward** migrations (`20261002230000_v2_review_amendments.sql`) and tests, because the first 2.0 migrations already reached production.

## CA-1. `connections` → `contact_events`
The table holds confirmed instances of human contact, not relationships between entities. The broader name could collide with future Landscape, group or social-graph concepts.

## CA-2. Event detail `goal` → `event_goal`
The field is approved ("His goal was under four hours" belongs to the race). The name keeps it distinct from the future user-directed Intentions concept (§35).

## CA-3. Optimistic versioning is required for client updates
- Inserts start at version 1.
- Every app update must carry the version it read. On the wire it carries the version it writes (read + 1). A missing or stale version fails with 40001 rather than overwriting newer state.
- Screens never manage this. The Checkpoint B repository carries versions automatically.
- Server-side functions, jobs and trigger cascades own their concurrency and simply bump the version. "Version omitted = last write wins" is not a generic update path.

## CA-4. Provenance offsets
- Spans are Unicode **code points**, end-exclusive, into captured text stored in **NFC** (database CHECK).
- There is one implementation for the app and the gateway: `supabase/functions/_shared/spans.ts`.
- The gateway derives offsets by locating the model's exact evidence text. It never trusts model-supplied indexes. Missing or ambiguous evidence means no span, and so no item.
- Shared test vectors (emoji, accents, CJK, curly punctuation, multiline) are asserted in Postgres, Deno and Jest.

## CA-5. Birthday provenance
- Birthdays may live on `people` and stay exempt from `reason_evidence`, but not from provenance. `people.birthday_source` is `contacts` · `capture` (with `birthday_capture_id`) · `user_edit`.
- A birthday cannot exist without a source.
- An app edit becomes `user_edit`.
- Deleting the source capture removes a capture-sourced birthday.
- A birthday reason requires a birthday with a known source.

## CA-6. Sync: overlap window plus reconciliation
- Checkpoint B uses the overlap-window pull with `(id, version)` de-duplication.
- It also runs a periodic wider reconciliation pull, so correctness doesn't depend on every transaction committing inside the overlap window.
- A client offline longer than tombstone retention (30 days) does a full resync.

## CA-7. Remaining §3 deviations approved
Approved:
- the normalized `reason_evidence`;
- the capture and user time-zone fields;
- the expanded reason-type vocabulary;
- gateway-only extracted writes;
- the consent ledger with SECURITY DEFINER `set_ai_consent`.

The last is approved provided every SECURITY DEFINER function pins a safe `search_path`, derives identity from `auth.uid()`, and is not executable by `anon` or `PUBLIC`. These are proven by `54_v2_amendments.test.sql`, which covers every such function, not just this one.

## CA-8. Feature flags
All 2.0 flags stay **off** by default. Internal and developer overrides (`user_flag_overrides`) may be enabled as each capability is built and tested.

## CA-9. Production migration incident: keep, and restrict deployment to `main`
- The additive migrations applied early stay; they are not rolled back.
- **Operational invariant (OPS-1):** the Supabase GitHub integration's production branch is `main` and only `main`. Every schema change reaches production through a reviewed, CI-protected PR merged to `main`, and never from a working branch or by hand.
- Before pushing migration files from any new environment or integration, check where that integration deploys.

---

# Checkpoint C review decisions (4 Oct 2026)

The founder approved the Checkpoint C architecture (`docs/phase1/checkpoint-c-ai-verification.md`). Checkpoint C is **not complete**: no full model evaluation has run, PR #13 stays a draft, `ai_extraction` stays OFF, and Checkpoint D is not authorized. Paid evaluation is staged, and the founder authorizes each stage: (1) a small live smoke set on Opus 5.5 at low effort, (2) the full corpus on Opus 5.5 at low effort, (3) only after that passes, the cross-model comparison.

## CC-1. Refusal fallback (C-1): APPROVED, fallbacks OFF
If the primary model refuses a capture for `relationship_extract`, the raw capture is preserved, no memory is created, it is never sent to an unevaluated fallback model, and the product fails quietly. A fallback model may be enabled only after it has passed this capability's eval suite on its own. Trust before availability.

## CC-2. Held items (C-2): APPROVED WITH AN AMENDMENT, now implemented
Items that need clarification, have an ambiguous person or subject, need a new person, or carry other high-risk uncertainty never become `memory_items` until the user resolves them. The **pending-review state is durable**:
- It is not memory.
- It keeps the proposed interpretation, the question and its options, and provenance.
- It survives a restart, and reopening it never triggers a new model run.
- It is cleared when the item is resolved, when the source capture is deleted or its text purged, or after 30 days.

Implemented as `capture_reviews` (migration `20261004100000`). The answer-to-memory write and the client sheet are later work.

## CC-3. Minimal roster (C-3): STRONGLY APPROVED
The model sees only the people a note plausibly concerns:
- people it names;
- people reached through a named relative;
- the page's person;
- likely family references.

For each, it sees only what resolution needs. No phone numbers, emails, postal addresses, full contact lists or unrelated dossiers are sent. Recall is never bought with broader context.

## CC-4. Date policy (C-4): APPROVED WITH AN AMBIGUITY RULE
Dates stay deterministic. The model identifies the date words and code resolves them from the capture's time and time zone.

- **Clearly unambiguous** expressions resolve automatically: "October 19", "tomorrow", "Sunday, October 11".
- **Plausibly ambiguous** expressions keep the preferred candidate date but always require confirmation, and keep the user's words (`date_hint`):
  - "next/last <weekday>";
  - "next weekend";
  - "this weekend" said during a weekend;
  - a bare weekday equal to today;
  - a weekday that contradicts its date;
  - day/month order.

The model is never the final arbiter of date ambiguity.

## CC-5. AI usage logging (C-5): APPROVED
`ai_calls` stays content-free. It has no `user_id` and records no text, names, statements, identifying labels, prompts, outputs, or capture, person or memory ids. Operational metadata only. Per-user quota stays in `ai_usage`. Investigating a reported bad result uses the durable capture or item records, which already carry the model, prompt and extraction version.

## CC-6. Delete-after-extraction (C-6): BEHAVIOUR APPROVED, PROMISE MUST BE TRUTHFUL
Kinship may delete the full note once it is understood and reviewed, keeping only the excerpts that support provenance. User-facing copy must not imply that nothing is retained. The meaning to convey: "Delete full notes after understanding. Kinship keeps only the excerpts needed to show where remembered details came from." A stronger mode that also removes excerpts ("Original source deleted") is future work and not required for V1.

## CC-7. Language scope
Relationship understanding is initially optimized and evaluated for **English**. Kinship does not claim equivalent multilingual quality. Non-English notes may fail toward silence, which is acceptable. Incorrect memory is not acceptable. Each future language needs its own fixtures for relations, certainty, subject, sensitivity and dates.

## CC-8. Oracle results are not model results
The oracle eval proves fixture coherence, grader behaviour, the guards and shared production/eval code. It does not measure model accuracy, latency or cost, is never described as a model metric, and never justifies enabling `ai_extraction`.

---

# Checkpoint C closeout decisions (4 Oct 2026)

The founder reviewed the C.1 report and closed Checkpoint C. The founder labelled these decisions C-1 to C-5 in the closeout instructions; they are numbered CC-9 to CC-13 here so they don't collide with the earlier C-1 to C-6.

## CC-9. Checkpoint C: APPROVED and CLOSED
The extraction architecture and the Opus 5.5 low-effort baseline are approved.

**Final record:**
- code `66e15dd`;
- prompt `relationship_extract/v5`;
- eval `extraction-v2.3`;
- corpus SHA-256 `7f9ca9348e02c8f6ac8a2a9dd4f47b36ff708034af48dee16e567043fb8fc291`.

**The final run met every gate:**
- every hard trust gate held;
- wrong subject 0 on the ambiguity set;
- C-4 100%;
- every dated item resolved right, none lost and none silently wrong;
- no threshold lowered.

Checkpoint C is not reopened to chase perfect benchmark scores.

## CC-10. core-083: ACCEPTED as a known, non-blocking issue
In "I told Chrissy I'd help her move on the 24th", the model's promise began "Promised to…". The invented-name guard treats a first word that isn't in the note as suspicious, so it dropped the promise: one missed promise, nothing false saved.

- **The guard is not loosened for this case.** core-083 stays in the corpus as a regression and known-issue fixture.
- A future, narrow deterministic improvement may be considered only if it is shown to keep the same trust guarantees.
- No paid run is needed for it now.

## CC-11. Milestone vs event expectations: harmonize in the next corpus revision
date-063 and date-136 (marathons) were filed as milestones with their time kept correctly and nothing invented. A completed achievement or first may legitimately be a milestone under the approved temporal model.

Their expectations are aligned with that model in the next normal corpus revision. No paid run is spent on this alone.

## CC-12. Confirmation friction (~52%) moves to Checkpoint D
The confirmation policy is **not** changed at closeout. It becomes a product and UX calibration question, decided on evidence from D's content-free instrumentation.

**Candidates for lower friction:**
- clear coarse dates;
- mid-confidence but strongly grounded items;
- unambiguous single-person pronouns.

**Always conservative:** sensitive information, true ambiguity, protected-memory conflicts and other trust-critical cases.

## CC-13. Opus 5.5 low effort stays the initial extraction model
No benchmarking of, or switch to, Sonnet, Haiku, DeepSeek, Mistral, Qwen or another open-weight model during this work. Alternatives are revisited after real product behaviour exists.

## CC-14. PR #13 size and eval-artifact retention: APPROVED after audit
The 400k-line diff was 97.7% pretty-printed raw eval output: 8.8 MB, 0.8 MB packed. See `docs/phase1/pr13-repository-size-audit.md`.

- **Raw outputs of paid runs** are committed gzipped.
- **In the tree:** only the approved baseline and the final smoke run. CI replays the approved baseline on every push.
- **Superseded runs** stay byte-for-byte in git history at `673fd24`, which is reachable from `main` through the merge commit.
- **Index:** `evals/results/RUNS.md` records every paid run's commit, prompt, eval version, corpus, model, result, cost and SHA-256.

PR #13 merges with a merge commit, per repository policy.

## CC-15. Checkpoint D1 authorized: Tell → Understand → Review → Memory
This is conditional on the PR #13 merge gates, the deploy with `ai_extraction` OFF, and repository/deployed parity.

**In scope:**
- the C-2 resolve action;
- the review and clarification surface;
- correction and provenance;
- content-free confirmation-friction instrumentation;
- offline and restart behaviour;
- gated internal dogfood, only through the existing per-account flag mechanism.

**Out of scope until founder review:** Today, reasons, Garden, Intentions, Landscape and the Opportunity Engine.
