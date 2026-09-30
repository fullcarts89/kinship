# Kinship 2.0 — Decisions Thor Must Make Before Implementation

As of 30 September 2026 · Companion to `KINSHIP_2_OPERATIONALIZATION.md`

Thirteen product decisions shape the build. Each has a recommended default so work isn't blocked by default. **Five block implementation** and should be decided in the first week: D1, D2, D3, D8 and D12. The rest can be decided before the phase that needs them.

| # | Decision | Recommendation | Blocks | Needed by |
|---|---|---|---|---|
| D1 | Must an account exist before first use? | Yes: Sign in with Apple (one tap) before the first Tell | **Yes** | Phase 1 (schema, gateway auth) |
| D2 | What exactly may be sent to an AI vendor? | One capture, the roster names, ≤3 person dossiers; never phone, email, address, photos or the calendar body | **Yes** | Phase 1 (gateway) |
| D3 | Is AI processing opt-in or on after explicit onboarding consent? | On after one explicit onboarding consent screen, stored server-side, revocable | **Yes** | Phase 1 |
| D4 | Push budget and default proactivity | ≤ 3 pushes a week; weekly brief on; `private` lock screen by default | No | Phase 3 |
| D5 | Does V1 include voice? | Yes, in the beta from week 3, on-device only | No | Phase 5 |
| D6 | Does V1 include calendar access? | No; it comes first in Phase 6 | No | Phase 3 |
| D7 | Does the Garden ship before or after loop validation? | After; sprigs (identity) ship in V1 | No | Phase 3 |
| D8 | What does a sprig actually encode? | Identity only in V1; bounded, non-growing detail marks later | **Yes** | Phase 1 (W5) |
| D9 | How much can AI help with message wording? | Ideas first; ≤ 2-sentence openers only on tap; never sends | No | Phase 3 |
| D10 | Free vs paid | Free: people, Tell, memory, Today, push. Paid later: briefs, Ask, the letter, heavy voice | No | Before beta cohort 2 |
| D11 | Application-level encryption now? | No; SQLCipher on device, RLS + at-rest on server, ZDR pursued; E2EE designed for later | No | Phase 1 |
| D12 | Which models, and who decides a downgrade? | Start on Opus 5.5 with explicit effort; switch per capability only when evals show parity | **Yes** (budget) | Phase 1 |
| D13 | How are deceased and estranged relationships handled? | `remembered` and `paused` states; never surfaced, never visually different except one quiet line | No | Phase 3 |

---

## D1. Must an account exist before first use?

**Options**
1. **Account first.** Sign in with Apple, Google or email before the first Tell.
2. **Try first, fully local.** Everything on the device; sign in later to sync. AI either off or open to anonymous devices.
3. **Try first with Supabase anonymous sign-in.** A server user exists from launch; `linkIdentity` later converts it to a permanent account with the same `user_id`.

**Tradeoffs**
- Option 1 costs one tap and some drop-off at install, with zero migration code. The AI gateway stays closed to anonymous users, which the merged hardening branch already enforces.
- Option 2 needs a local-to-server migration, a switch-over in analytics identity, and either no AI (so no value) or an open AI endpoint. It's the most complex option, for a funnel step nobody has measured.
- Option 3 avoids data migration, but it reopens the AI endpoint to anonymous users. That needs a separate, lower quota, device attestation (App Attest) and abuse monitoring, and it produces orphan accounts to clean up.

**Recommendation.** Option 1 for V1. Onboarding opens with two screens that explain the promise, then Sign in with Apple, then the contacts picker. If the beta shows more than 25% drop-off at sign-in, build option 3 with App Attest.

**Blocks implementation:** yes. It determines the auth, gateway, sync and onboarding design.

---

## D2. What exactly may be sent to an AI vendor?

**Options**
1. **Minimal slice.** The capture text, roster display names and nicknames, and the active items of up to 3 candidate people.
2. **Whole memory.** Everything about the user, for better context.
3. **Nothing.** On-device models only.

**Tradeoffs**
- Option 2 is marginally better at resolving people, but it sends far more third-party data per call and costs more.
- Option 3 isn't feasible on today's devices at the quality bar in §10 of the plan. Revisit it with on-device models later.
- Option 1 covers extraction, resolution and phrasing. Its risk is contained: one conversation's worth of data per call.

**Recommendation.** Option 1, written into the privacy policy as a list:
- **Sent:** capture text, names and relations, and selected items with dates.
- **Never sent:** phone numbers, emails, addresses, photos, audio, the calendar body, contact lists, or other users' data.
- **Vendor terms:** pursue zero-data-retention terms with Anthropic for the chosen models. Until they're signed, the copy says "not used to train models" and not "nothing is kept".
- **Sensitive items** (health, death, conflict, money) are sent only to extraction, so they can be labelled. They are excluded from reason, brief and letter prompts unless the user turns on "Include sensitive details in suggestions".

**Blocks implementation:** yes. It defines the gateway's input schemas.

---

## D3. Is AI processing opt-in, or on after explicit onboarding consent?

**Options**
1. **On by default, opt-out in Settings.** This is 1.0's behaviour.
2. **One explicit consent screen in onboarding.** It says plainly what is sent and to whom, with Continue or Not now; the choice is stored server-side.
3. **Per-feature opt-in toggles.**

**Tradeoffs**
- Option 1 is what the audit flagged: third-party data reaches a vendor without an explicit yes.
- Option 3 fragments the product and confuses people.
- Option 2 is honest, costs one screen, and still leaves Kinship usable with AI off (raw notes plus deterministic dates and birthdays).

**Recommendation.** Option 2. The consent is enforced by the gateway (403 without it), versioned (`consents.version`), and re-asked if the data flow changes. Choosing "Not now" leads to a real, reduced experience, not a nag.

**Blocks implementation:** yes. It sets the consent schema and gateway behaviour.

---

## D4. How proactive may Kinship be?

**Options:** push budget of 1, 3 or 5 a week; weekly brief on or off by default; default lock-screen level.

**Tradeoffs.** Too few pushes and the thesis goes untested, because people don't open apps unprompted. Too many and it becomes nagging, which the brand forbids.

**Recommendation.**
- At most 3 pushes in any 7 days: at most 2 time-sensitive, plus 1 weekly brief.
- The brief is on by default, Sunday 6 pm, and adjustable.
- The lock screen shows `private` by default ("Something for today").
- Automatic back-off after ignored pushes, and a one-tap pause for everything.

**Blocks implementation:** no. The values are configuration.

---

## D5. Does V1 include voice?

**Options**
1. **Voice at beta launch.**
2. **Voice from beta week 3, behind a flag.**
3. **Voice after the beta.**

**Tradeoffs**
- Voice is the biggest friction reducer for the target user, and the audit ranks it core. It needs a native module (`expo-speech-recognition`) and a device and locale test matrix.
- Honest "on this phone" copy requires `requiresOnDeviceRecognition` on supported devices. On iOS 26, `SpeechAnalyzer` is on-device by design, but needs a custom module and a per-locale model download on first use.
- Shipping voice at week 3 gives a clean text-only baseline and a measurable lift.

**Recommendation.** Option 2, on-device only. When on-device isn't supported for a device or locale, the mic is hidden and typing stays. Audio is never saved.

**Blocks implementation:** no.

---

## D6. Does V1 include calendar access?

**Options**
1. **V1**, for onboarding ("you're seeing David Thursday"), briefs and post-encounter prompts.
2. **First feature after the beta gate.**

**Tradeoffs**
- Option 1 makes onboarding more magical and adds the encounter loop. It also adds a permission at setup, attendee-to-person resolution (never by first name), a second notification class and more privacy surface. It would test two loops at once.
- Option 2 keeps the beta focused.

**Recommendation.** Option 2. Onboarding uses contact birthdays for day-one value. Calendar briefs and the "How was dinner?" prompt are the first Phase 6 build if the beta passes.

**Blocks implementation:** no. It does affect the onboarding scope in Phase 3.

---

## D7. Does the Garden ship before or after loop validation?

**Options**
1. **V1, with the Garden toggle and "this season's pressings".**
2. **After validation, as "Everyone" alphabetical or by circle.**
3. **Never.**

**Tradeoffs.** "This season's pressings" shows who is *missing*, which is a quiet score (tension T5). The Garden has no proof value for the loop. The brand survives without it through sprigs on every person, serif moments and ochre provenance.

**Recommendation.** Option 2. Season pressings appear only in the monthly letter, which shows presence and never absence.

**Blocks implementation:** no.

---

## D8. What does a sprig actually encode?

**Options**
- **A. One leaf per shared moment** (design direction; capped at about 12).
- **B. Pure identity.** The seed fixes the whole drawing; history never changes it.
- **C. Identity plus bounded marks.** The structure comes from the seed. Each moment re-details one existing leaf. Leaf count never changes. At most one flower, for a user-confirmed milestone. No bud for upcoming events.

**Tradeoffs**
- A makes relationships comparable at a glance, which is a health bar by another name.
- B is safe but static.
- C keeps the sense of "it grew with us" without a quantity, and it's enforced by a CI property test: sprig area varies less than 3% between 0 and 50 moments.

**Recommendation.** Ship B's rendering in V1. Build C behind `sprig_marks` and turn it on only after beta interviews confirm people read sprigs as identity. Retire the design direction's leaf-per-moment rule.

**Blocks implementation:** yes, for the sprig workstream (W5). It must be settled before generator parameters are tuned.

---

## D9. How much can AI assist with message wording?

**Options**
1. **Ideas only** ("You could mention…").
2. **Ideas, plus ≤ 2-sentence openers on tap.**
3. **Full drafts.**
4. **Auto-send.**

**Tradeoffs.** Options 3 and 4 violate "help you be you" and risk a friend receiving something that doesn't sound like the user. Option 1 is safe but leaves the "what do I even say" barrier for reconnects.

**Recommendation.** Option 2.
- Openers appear only on an explicit tap, and are editable.
- They're copied to the clipboard only on "Use this", and never pre-filled into Messages.
- They never mention Kinship. Kinship never sends anything.
- In V1, follow-ups offer ideas only. Openers arrive with Reconnect (Next).

**Blocks implementation:** no.

---

## D10. What is free and what is paid?

**Options**
1. **Everything free during the beta; decide later.**
2. **Price before the beta.**
3. **Free core, with a paid tier planned now.**

**Tradeoffs.** AI cost grows with capture volume: about $0.25–0.50 per active user per month for V1, and about $0.42–0.73 with all Next features. The free tier must be sustainable. Pricing before evidence risks mis-pricing. Waiting too long builds free expectations for costly features.

**Recommendation.** Option 3.
- **Free forever:** people, Tell (text and voice), memory, provenance, Today, pushes, export and deletion.
- **Paid tier (announced before cohort 2), about $4–6 a month:** calendar briefs, Ask Kinship, the monthly letter, share-sheet screenshot understanding, and higher quotas.
- The beta is free, with a pricing interview at week 8.

**Blocks implementation:** no. The quota plumbing exists already, as `ai_usage`.

---

## D11. Application-level encryption now?

**Options**
1. **Per-user envelope encryption of free-text columns** (audit recommendation).
2. **Standard at-rest encryption + RLS + an encrypted device store now; end-to-end encryption designed for later.**
3. **End-to-end encryption now.**

**Tradeoffs**
- Extraction, reasons and Ask need plaintext on the server, so option 1 protects only against someone with direct database access. It costs key management, blocks SQL search and triggers, and slows every feature.
- Option 3 is incompatible with server-side AI today.

**Recommendation.** Option 2:
- SQLCipher local DB, with the key in SecureStore.
- Supabase at-rest encryption and RLS.
- Service-role access limited to named functions.
- No content in logs or analytics.
- Capture retention the user controls ("delete my original notes after understanding").
- Design person and user keys so end-to-end encryption can arrive with on-device models.

**Blocks implementation:** no. It is noted here because it reverses the audit's recommendation.

---

## D12. Which models, and who approves a downgrade?

**Options**
1. **Opus 5.5 everywhere.**
2. **Opus 5.5 to start; per-capability moves to Sonnet 5.5 or Haiku 4.5 when evals show parity.**
3. **Cheapest model from the start.**

**Tradeoffs.** A wrong personal detail is the costliest failure. Option 3 saves money before we know whether quality holds. Option 1 is simplest, at roughly twice the V1 AI cost of option 2.

**Recommendation.** Option 2.
- Opus 5.5 at explicit `low` effort for extraction.
- Batch for all nightly work.
- Prompt caching for stable prefixes.
- Any downgrade needs an eval report showing every §10 threshold held, and Thor's sign-off, since it trades quality for margin.

**Blocks implementation:** yes, for budgeting and for the gateway's registry defaults.

---

## D13. How are deceased and estranged relationships handled?

**Options**
1. **Delete them.**
2. **Mark them, and keep them quiet.**
3. **Treat them like anyone else.**

**Tradeoffs**
- Deleting erases memory the user may treasure.
- Treating them like anyone else causes painful prompts: "Mom's birthday is Saturday" after a death, or a reconnect nudge toward an estranged sibling.

**Recommendation.** Option 2, with two states:
- **`remembered` (died).** The sprig is frozen and drawn in quiet ink. The page opens with "Remembered". No reasons are generated, except an optional, user-enabled anniversary line in the monthly letter. Birthdays stop as reasons.
- **`paused` (estranged, or "not now").** No reasons of any kind. The person stays in People with no visual marker, and the state is visible only on their page.

Both are reversible. Neither is ever suggested by AI: Kinship never infers a death or an estrangement. If a capture says someone died, extraction asks once: "Would you like Kinship to remember Maya quietly?"

**Blocks implementation:** no. The state enum is included in the Phase 1 schema so it's cheap later.
