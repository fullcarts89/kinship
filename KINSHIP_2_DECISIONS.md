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
