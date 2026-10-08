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

## CC-16. Core Trust Closure pass: founder direction on round-three feedback (6 Oct 2026)
From the founder's "Core Trust Closure + Return Loop Pass" brief.

- **Ask Kinship (`retrieval_answer`, E25 / ASK-01)** moves forward on the roadmap. It becomes a post-wife-dogfood / Alpha candidate, not "Next" after everything. It is not built in this pass. When built, it must:
  - answer only from stored memory, with sources;
  - say `not_found` rather than guess;
  - never become a chat.
- **Milestones (H16)** may support grounded Today reasons. Kinship never interrogates for missing fields (no "when is the wedding? where?"). An eligibility proposal is in `docs/product/next-ux-proposals.md`.
- **Portrait unchanged (H15/H2).** Lately · Coming up · You said you'd · Between you. A reorganised **What Kinship knows** (Into · Hoping to · Background · Their people · Between you) is design only until approved.
- **Bring back in first use (H4)** goes to the next UX/onboarding hardening phase. The acceptance criteria are written; no onboarding redesign now.
- **Dogfood feedback (H6/H7).** "Got it right / Not quite" is stored on the note for review. Real failures become fixtures only after consent, manual review and de-identification (`docs/product/dogfood-feedback-to-evals.md`).
- **Master bug ledger.** `docs/product/bug-ledger.md` is the canonical quality ledger. VERIFIED means founder-reproduced on a physical iPhone, nothing less.

## CC-17. Next-UX approvals and dogfood telemetry (6 Oct 2026)
The founder's review of `docs/product/next-ux-proposals.md`. These are approved for the **next UX phase**. None are built yet.

- **H15/H2 What Kinship knows, sections: APPROVED with two changes.** The Portrait stays "what matters now"; What Kinship knows becomes organised durable memory.
  - **"Hoping to" is semantic, not a bucket for every plan.** A line goes there only when its source expresses aspiration or desire, or it carries an `event_goal`. Ordinary plans stay neutral: either under a plainer umbrella such as "Plans & hopes", or elsewhere. The final label is decided at build.
  - **Their people** lives in What Kinship knows, **not** on the Portrait: no mini family tree on the main page. Whether pets belong under that label is open ("People & pets" or another plain alternative).
  - Unchanged and approved: Into · Background · Between you; empty sections disappear; no counts or completeness; newest first without ranking; a source on every line; no goal tracking.
- **H16 Milestones as Today reasons: APPROVED.**
  - **V1 list:** engagement, wedding, new job, promotion, baby, graduation, new home, retirement, move.
  - **Timing:** an upcoming milestone with a known day is *eligible* within 3 days before, and on the day. Eligibility is not a guarantee: Today's existing priority logic decides whether it takes one of the limited slots, and it is never surfaced every day.
  - **Unknown dates:** a milestone with an unknown date stays remembered. Kinship never asks for missing fields.
  - **Anchor rule:** a reason may include someone not yet in People (Natalia keeps her name in "Anthony and Natalia's wedding is Saturday"), but at least one participant must be an established person. No Moments about events involving only untracked people.
- **H4 Bring back in first use: APPROVED** for onboarding hardening, with the written constraints: one example, at most one extra screen, no carousel, no decorative motion, leads into Today.
  - Preference, not a requirement: if the user's real first Tell creates an eligible future Moment, show that instead of the canned Ben example ("You just told Kinship this → here's how something like that comes back"). Fall back to the example otherwise, and drop the preference if it complicates onboarding substantially.
- **H3 Ask Kinship: APPROVED as roadmap movement only.** The sequence is: Core trust → UX hardening / wife dogfood → **grounded Ask Kinship as an Alpha candidate**. It is not implemented now.
  - Requirements as written: answers from memory only, with sources; "I don't know" when memory doesn't support an answer; its own grounding, refusal and privacy evals; never a general chatbot.
  - Better People search is useful but is not a substitute: "Find John" and "What is John into?" are different jobs.
- **H22 "August": no change; monitor.** The possible boundary rule is recorded but **not** locked as product behaviour. Wait for real examples of users disliking the interpretation.
- These approved extensions (H15/H2, H16, H4) are entered in `approved-design-coverage.md`.
- **Dogfood telemetry (N4): ENABLED in `dogfood-v2` only**, scoped to content-free performance and reliability telemetry. It covers the complete Tell lifecycle (Send → visible result, split into sync, gateway round trip, server, network and render where distinguishable), lifecycle failures, retries, timeouts and JavaScript-thread stalls (freeze investigation).
  - Never sent: Tell text, memory text, names, contacts, relationship content, source content or location.
  - Kept separate from "Got it right / Not quite", which is never sent in this scope.
  - Fields and retention are documented in `docs/ops/analytics.md`. This must be re-reviewed before enabling anywhere outside dogfood.

## CC-18. Round-4 decisions and the next build plan (7 Oct 2026)
From the founder's review of the round-4 findings (`docs/product/founder-feedback-summary-4.md`). Where this conflicts with CC-16 or CC-17, this is newer.

### Gate 0 decisions (trust)
- **I12 rename: option A.**
  - Displayed memory text uses the person's **current** display name wherever the structured memory references that person. Prefer structured person references over loose string replacement.
  - The original Tell and the stored interpretation are not rewritten. Source keeps the original words ("Wifey").
  - Full chosen names and nicknames are kept in titles: "What Kinship knows about Cutie Pie", not "…Cutie".
- **I13 is different from I12.** When the user corrects the *subject* from the wrong person to the right one, the displayed statement must stop naming the wrong person. The original wording is kept as prior / corrected history under the provenance rules (H30).
- **I11 multi-person.** Correction may choose several people when the memory is genuinely shared. Ambiguity flows must **not** become a generic People multi-select form. *Kinship proposes what it can know; the user decides only what Kinship genuinely cannot know.*

### Phase 4 decisions (UX)
- **I1 Moment detail: approved.** *Tap a reason → see the reason. Tap a person → see the person.*
  - A Today / Coming up Moment opens a focused surface: the grounded reason or memory, why now, timing, Source, and human actions (Message / Call).
  - "View Ben" is secondary. It deep-links to the relevant memory on the relationship page with brief, quiet emphasis.
  - Not a generic, field-heavy detail page.
- **I2 interaction history: approved. Not a CRM communication log.** It is a lightweight trail under **Between you**, built on *know it → infer it → ask it*:
  - **Known channel:** a Message launched from a Moment plus **Yes** records "You messaged · Oct 6 · About getting together this weekend". It never asks "How did you connect?".
  - **Inferred:** a grounded plan ("Did you end up playing games with Ben and Susan?") plus **Yes** may record an in-person interaction / game night.
  - **Unknown:** a manual Add interaction gives one tap of **Message · Call · Video · In person**.
  - **Keep three things separate:** interaction **type** (message, call, video, in person); **reason** (promotion, weekend plans…); **shared experience** (game night, dinner, a hike; these are contextual memories). The type picker never grows an activity taxonomy.
  - **Provenance:** every durable interaction record has one — a confirmed hand-off, an explicit return answer, a manual entry, or another legitimate source.
  - **Never:** counts, streaks, "last contacted", frequency pressure, relationship health, or ranking.
  - **"Anything worth remembering?"** becomes optional and non-blocking. It shows after meaningful interactions and is omitted after routine logistics.
  - **Target:** completing the loop usually takes **one tap** after the real-world action, and **two** only when Kinship genuinely lacks information.
- **I4 Kept confirmation hierarchy: approved.**
  - The order is:
    1. what was kept;
    2. something needing attention (e.g. "Pedro isn't in People yet. Add him so this can appear on his page too." **[Add Pedro] [Not now]**);
    3. correction (**Correct this · Undo**);
    4. dogfood feedback (**Did Kinship get this right? Got it right · Not quite**).
  - "Add Pedro" is a real accessible control. Remove "Tap a line to correct it."
  - Still Quiet Herbarium; no dashboard or card-stack feel.
- **I6 keyboard: approved.**
  - Native Done / dismiss accessory.
  - Interactive drag-down dismissal.
  - Today / People navigable with the keyboard open.
  - Unsent draft preserved.
  - Never needing to tap blank space or content to dismiss.
  - **Bottom navigation stays.** Do not move primary navigation to the top. Any bottom-chrome change while editing is solved locally.
- **H15/H2 What Kinship knows** (CC-17 confirmed, with refinements):
  - "Hoping to" / aspirational wording only when the source expresses hope, desire, a goal or aspiration. Ordinary plans get neutral treatment.
  - "Their people" lives in the reference view, not the portrait. If pets are included, the final label must read naturally.
  - Empty sections disappear. No completeness, counts, rankings, goal tracking, checkboxes or CRM fields.
  - Source and correction on every line.
  - **I7 folds in:** meaningful superseded facts remain as clearly-past Background ("Previously interviewed with Box · Ended Oct 6"). They are never presented as current alongside the current state. A declined sensitive outcome stays out; only the allowed less-sensitive history is kept.
- **H16 milestones:** confirmed as CC-17.
  - The vocabulary is engagement, wedding, new job, promotion, baby, graduation, new home, retirement, move.
  - Recognise, don't interrogate.
  - A grounded date is eligible about 3 days before and on the day; Today priority decides, with no repetition just because it is eligible.
  - No date: remember it, never ask.
  - Anchored to at least one established person.
- **H4 Bring back in first use:** confirmed as CC-17.
  - Acceptance test: a new user can explain what Today is for without coaching.
- **H3 Ask Kinship:** roadmap only (post-wife-dogfood / Alpha candidate). **H22:** no work; monitor.

### Telemetry
- Content-free dogfood performance and reliability telemetry is **approved and already enabled** in `dogfood-v2` (PR #19; fields in `docs/ops/analytics.md`). Explicit "Got it right / Not quite" stays separate from passive telemetry.
- **Approved additions, not built (carry into Gate 0):**
  - time from Send to "Understanding…" visible;
  - whether the app went to the background while a Tell was processing;
  - coarse build version and platform for debugging.
  
  This reverses the earlier "no app version" line for the dogfood scope only.
- Record retention and sampling before any non-dogfood rollout.

### Build plan
The plan moves out of repeated broad stabilization:
1. **Gate 0 — Final Trust Closure:**
   - P0: I8, I10 (+ H13), I13, I12A;
   - with it: I5, I9, I11, I3, I12b check, and the telemetry additions.
   - Then a **short targeted** founder native gate, not another broad exploratory cycle.
   - Old F/G items need not all become VERIFIED before UX work unless they block trust or the core loop. The ledger is kept accurate instead.
2. **Phase 4 — UX Hardening & Relationship Loop Completion** (when Gate 0 passes):
   - I4, I6;
   - I1, H16;
   - I2 with conditional "Anything worth remembering?";
   - H15/H2 with I7;
   - H4.
   
   It makes the existing product coherent. It is **not** speculative feature expansion.
3. **Wife dogfood:** low-coaching.
4. **Alpha candidates:** Ask Kinship first.

This sits on top of `KINSHIP_2_COMPLETE_PLAN.md` §28: the plan's "Phase 4: Alpha" now comes after the wife dogfood.

**Still not to build:** About You UI, Garden, Relationship Landscape, a generic graph, a broad Opportunity Engine, Intentions, a full timeline / "Your story together", a generic task manager, relationship scoring, health indicators, streaks, importance ranking, personality onboarding, a chatbot, subscriptions, broad model benchmark / model-swap work.

## CC-19. Gate 0 closed; Phase 4 starts; semantic memory and H15 direction (8 Oct 2026)
From the founder's "Gate 0 Closure + Phase 4 Transition + Semantic Memory / H15 Direction". Where this conflicts with CC-16 to CC-18 or with `docs/product/semantic-memory-investigation.md`, this is newer. The build brief is `docs/product/phase4-implementation-brief.md`.

### Gate 0: CLOSED
- The founder ran the targeted remediation gate (`gate0-remediation-checklist.md`) on the remediation build (PR #22) and the targeted scenarios passed. There has been no freeze since the first dogfood pass.
- **VERIFIED only where the founder's native test re-ran the original scenario.**
- **Deployment gap (Phase 4 code review, 8 Oct).** Production ai-gateway was still version 7 during the gate: deployed 7 Oct 20:41 UTC and byte-identical to the PR #21 code. The server halves of PR #22 were therefore not running: I12 for new lines, I13's answer path, J1, J4's guard repair and J11.
  - **VERIFIED:** J2, J5, J6, J7, J8, J9, plus I12's existing lines and J4's row 2c copy. These run on the phone or in the applied migration.
  - **Stay FIXED** until ai-gateway is redeployed and gate rows 1b, 2, 2b, 3, 5, 5b, 11 and 11b are re-run: I12 (new lines), I13, J1, J4, J11. This is a short re-check of deployed code, not a new stabilization cycle.
- **G5 VERIFIED / resolved.** `app_stall` telemetry continues as passive observability, not as a blocker.
- No new broad stabilization cycle. Only a genuinely new P0 trust failure reopens trust work.
- **The Gate 0 invariants stay in force; breaking one is a regression:**
  - sources preserved, provenance on every durable memory;
  - corrections keep history; Undo is exact;
  - the user's identity decisions win; plausible content is never silently destroyed;
  - unknown identity is clarified, never guessed; current names stay distinct from source wording;
  - multi-person memories stay grounded; no cross-account leakage; no silent relationship invention.

### The product (restated; unchanged)
- Kinship helps you "remember what matters in the lives of the people you care about and bring it back when it matters, so you can show up."
- The loop: Tell → Understand → Memory → Moment → Reason → real conversation → return → "Anything worth remembering?" → Tell.
- Not a CRM, tracker, AI friend, chatbot, social network, productivity system or scoring system.
- **Permanent rules:**
  - silence beats a wrong detail;
  - every durable statement has a source;
  - nothing quantifies a relationship: no streaks, health scores, visible neglect, guilt, wilting, hidden points, importance ranking or "you haven't talked in X days".
- **Intelligence is invisible by design:** no AI badges, sparkle, "Powered by …", confidence scores, ontology or graph terms, or inferred personality.
- **Deterministic logic does deterministic work:** dates, contact import, birthdays, follow-up windows, candidate ranking, exact duplicates, notifications, hand-off, return checks, sprigs, sync, provenance.
- **Model capabilities:** relationship_extract, person_resolve, memory_merge, reason_generate; later interaction_brief, reconnect_assist, reflection, retrieval_answer.
- The Quiet Herbarium stays canonical: no cards, glass, gradients, dashboards or icon clutter.

### Phase 4A (UX and the loop): may proceed now
These items need no semantic infrastructure. They refine CC-18:
- **I4 Kept card:**
  - order: what was kept → attention if needed → **Correct this · Undo** → "Did Kinship get this right?";
  - attention example: "Pedro isn't in People yet. Add him so this can appear on his page too." **[Add Pedro] [Not now]**;
  - "Tap a line to correct it." is dropped.
- **I6 keyboard:**
  - a Done / dismiss control and drag-down dismissal;
  - Today and People are reachable with the keyboard open, and the draft is kept;
  - the bottom navigation stays.
- **I1 Moment detail:**
  - tapping a reason opens a focused detail: the grounded line, why now, timing, Source, Message / Call;
  - a secondary **View <Person>** deep-links to that memory on the person page, with brief quiet emphasis (this absorbs J3);
  - Reduce Motion is respected; never a field-heavy page.
- **H16 milestones:**
  - the list: engagement, wedding, new job, promotion, baby, graduation, new home, retirement, move;
  - eligibility is deterministic and narrow: about 3 days before through the day, only with a grounded date, and Today's ranking still decides;
  - no nagging; an unknown date is remembered quietly, never asked for;
  - someone not in People appears only when grounded through an established person;
  - only explicit milestone or change evidence; a move is never inferred from a residence change.
- **I2 interaction history:**
  - a small dated trail under Between you, following know it → infer it → ask it (a Moment hand-off plus "Yes" gives "You messaged · Oct 6 · About getting together…"); manual entry offers Message / Call / Video / In person;
  - interaction type, reason and shared experience stay distinct;
  - grounded provenance only; no counts, last-contacted, frequency or streaks;
  - one tap after the real action, two only when information is genuinely missing;
  - **"Anything worth remembering?"** is optional and non-blocking, and omitted after routine or logistical contact.
- **H4 Bring back in first use:**
  - at most one extra screen (Tell → Remember → Bring back): no carousel, no decorative motion, Reduce Motion respected;
  - the user's real first Tell is preferred, otherwise one grounded example;
  - copy: "This is where Kinship brings things back, when they matter.";
  - acceptance: a new user can explain Today without coaching.

### Semantic memory: the contract is APPROVED
- **Outcomes:** SAME / REFINES / SUPERSEDES / CONFLICT / NEW, plus the transition `corrected`. RELATED is an eval label (or a later retrieval concept) only, never persisted. The definitions are those of the investigation §6.
- **Principles:**
  1. **Persist decisions, compute readings.**
  2. **Compose only what the user said.** Reference data may relate two observations but never introduces words: "Lives in Alameda, California" only if both words were said.
  3. **Fail open to separate lines.**
- **No general knowledge graph.**
  - Stay in Postgres: no Neo4j, Neptune, AGE or other semantic datastore, no arbitrary edges, no embeddings for inference.
  - None of related_to / similar_to / might_like / probably_knows / probably_interested_in.
  - The architecture: authoritative sourced observations + small derived structured representations + deterministic, read-time composition.
- **Residence first (semantic v1).** It proves:
  - derived facets and deterministic place handling;
  - SAME / REFINES / SUPERSEDES / corrected / CONFLICT and composition;
  - multi-source provenance, multi-item closure and exact Undo;
  - H15 current / history and portrait de-duplication.

  Another structured domain is added only after that.
- **Employer is not a single-valued slot** (this overrides the investigation, which proposed one).
  - Someone can have several current employers: Meta and Google stay compatible unless the source states a change ("left Meta for Google", "joined Google", "now works at Google").
  - A qualifier may refine a specific employer.
  - Structured employer is a Phase 4b candidate after residence. Basic WORK categorization doesn't wait for it.
- **Place reference data:**
  - a GeoNames-style subset (countries, first-level regions, prominent cities, common aliases such as CA and NYC), **pending the founder's licence and attribution confirmation**;
  - no geometry, coordinates or neighbourhoods;
  - server-side, read-only, versioned, deterministic, rebuildable and attribution-compliant; source, licence and attribution are documented before shipping.
- **Don't over-resolve places.**
  - Knowing that two places are compatible, or that one contains the other, is not the same as pinning an exact place. Candidate sets are kept while identity is unresolved.
  - Never answer "Who lives in Alameda city?" from an unresolved identity.
  - Use the minimum resolution; never manufacture specificity.
- **The required residence cases:**

  | | Told | Outcome | Shown |
  |---|---|---|---|
  | A | California, then Alameda | REFINES | "Lives in Alameda, California"; both sourced; no fake move |
  | B | Alameda, then California (no change cue) | REFINES | Alameda's specificity kept |
  | C | Alameda, then "moved to Colorado" | SUPERSEDES | "Lives in Colorado"; history "Previously lived in Alameda" |
  | D | Alameda, then "Actually … Oakland, not Alameda" | corrected | "Lives in Oakland"; no "Previously lived in Alameda" |
  | E | Alameda, then "moved to California" | CONFLICT | "Is Susan still in Alameda?" Still there · She moved |
  | F | "staying in Denver this week" | — | Never a residence: trips, visits, events and temporary stays aren't |

### Structure: facets and categories
- **Two kinds of structure:**
  - semantic facets: residence in v1; later employer relationships, school, hometown, explicit family;
  - a **closed organizational taxonomy**: BACKGROUND, WORK, EDUCATION, INTERESTS/HOBBIES, PREFERENCES, ASPIRATIONS/PLANS, THEIR PEOPLE, SHARED/BETWEEN YOU, HEALTH/SENSITIVE (existing rules), OTHER.
- **How categories are assigned:**
  - mapped from the existing kind / category / subject / detail first;
  - the taxonomy is small and closed, and the model never invents labels;
  - a categorization failure is safe: the memory is kept and falls back;
  - the user is never asked for a category.
- Basic Work / Education / Interests categorization is Phase 4. Structured education (institution normalization) can wait for Alpha.
- **Interests stay natural language:** no carbonara → Italian, no basketball → sports.
- **Their people:**
  - built from sourced relationship information; typed family relations may wait for Alpha;
  - never a family role from a surname, gender from a name, or transitive relations.

### H15 / I7 display
- **Portrait vs What Kinship knows:**
  - the Portrait is what matters now; What Kinship knows is organized reference;
  - candidate sections: Background, Into, Hoping to, Their people, Between you;
  - Work and Education sit in Background, or get their own sections if density warrants;
  - no field grid, completeness meter, counts, progress, missing-info prompts or checklists; empty sections disappear.
- **Portrait de-duplication:** the Portrait shows only the head observation ("Susan lives in Alameda"). It is recorded under H15 in `approved-design-coverage.md`.
- **History:**
  - refinement is not history; a correction is not history; a real change may be;
  - meaningful durable history only;
  - a declined sensitive outcome stays protected;
  - no biography of transient health or progress chains.
- **History dates** (these override the investigation's "Updated · Jan 4"):
  - not "Updated · Jan 4" when that is only the day Kinship learned it; prefer "You told Kinship · Jan 4";
  - "Moved · Jan 4", "Started" and "Ended" only when the source establishes the real date.
- **Conflict questions are rare.** They are asked only when:
  - the values may be incompatible;
  - the current truth can't be determined safely;
  - a wrong pick would display something false.

  Never for data quality; never "Which Alameda?".
- **A composed statement is a view:**
  - it points to all its sources, and each source stays editable, retractable and traceable;
  - correcting one source changes the composition deterministically;
  - a composed sentence is never fed back as user speech.

### Existing data, Ask, evals
- **Existing wrong supersessions: report only.**
  - A dry-run report lists facet-eligible items, safe refinements, unresolved, ambiguous, contradictions and potential false supersessions.
  - Any repair needs the founder's explicit approval under `data-cleanup-plan.md`.
  - No account-specific hidden mutation.
- **Ask stays Alpha** and is not implemented. Its foundation:
  - facets for "where" questions;
  - categories for hobbies, work, school and plans;
  - natural-language retrieval only when needed;
  - no embeddings now.
- **The semantic eval corpus has zero tolerance for:** incorrect supersession, wrong SAME, incorrect refinement, an unsupported composed fact, lost provenance, temporal contradiction, a certainty upgrade, cross-person contamination. A missed refinement may fail open.
- The required residence, employer (recorded for later) and categorization cases are listed in the brief §15. The existing non-residence regressions stay.

### Execution and authority
- **4A:** I4, I6, I1, H16, I2, the conditional "Anything worth remembering?", H4.
- **4B, in order:**
  1. taxonomy;
  2. residence facet schema;
  3. place data;
  4. deterministic residence detection and resolution;
  5. SAME / REFINES / SUPERSEDES / corrected / CONFLICT;
  6. multi-item closure;
  7. exact Undo;
  8. shared composer;
  9. composed provenance;
  10. dry-run / backfill report;
  11. portrait de-duplication;
  12. H15;
  13. I7 history;
  14. category display;
  15. dogfood and evals;
  16. then evaluate employer.
- No ontology, graph, Ask, embeddings or personality.
- **Authority:**
  - Phase 4A may proceed where approved decisions already specify it.
  - **Phase 4B schema, migration and semantic implementation does not begin until the founder has reviewed `docs/product/phase4-implementation-brief.md`.**
- **After Phase 4:** a low-coaching wife dogfood. H15 should feel like "a person's memory gradually writing itself", not a contact record. Confusion is evidence.
- **Still deferred:** Ask, generic chat, About You UI, Garden, Landscape, a generic graph, the Opportunity Engine, Intentions, a full Your Story Together, tasks, scoring, health, streaks, ranking, personality onboarding, subscriptions, model benchmarking, embeddings, arbitrary association.
- **Readiness:** Gate 0 is closed. The current build is **NOT READY** for the wife dogfood; Phase 4 is the work in between.
