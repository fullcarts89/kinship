# Kinship: what it actually does today (position inventory, 1 Nov 2026)

Read-only inventory for the competitive-strategy report. Sources were read from the repo at `origin/main` (`f55f331`, the last code merge, plus docs up to `015770e`), and from the unmerged alpha branches `origin/claude/alpha-integration` (PR #74) and `origin/claude/alpha-stabilization` (PR #75, head `e7fce52`). Model names are left out on purpose. "Main" below means `origin/main`. "Alpha" means `origin/claude/alpha-stabilization`, which contains #74.

## 0. Status vocabulary and the big picture

| Label | Meaning here |
|---|---|
| **SHIPPED ON MAIN** | Merged to `main`. That is the code the dogfood build is made from. The build is per-account and behind a flag (below). |
| **ALPHA PR** | Implemented in PR #74/#75, **not merged, not deployed, no production migration, never on a physical device** (`docs/product/alpha-stabilization-handoff.md` §A, §B). |
| **FLAG** | Server flag via `feature_flags` / `user_flag_overrides` (`src/store/flags.ts`). |
| **PLANNED** | In the contract, the coverage matrix or the plan, with a roadmap bucket. Not built. |
| **ASPIRATIONAL** | Thesis, hypothesis or exploration only. |
| **ABSENT** | Not found and not planned. |

**Who has it.** Main's whole 2.0 experience sits behind per-account flags `shell_v2`, `tell`, `ai_extraction` and `memory_v2`. They are on for only two accounts: the founder and one test account. "The wife's account is not enabled, and her user id has not been requested" (`docs/product/HANDOFF.md:283`, the same on the alpha branch; `docs/product/wife-dogfood-final-review.md:167`). That makes the documented real-user count **one**, the founder. No TestFlight or App Store distribution is documented: "There is no App Store Connect app record, so TestFlight and auto-submit fail" (`docs/phase2/handoff-next-session.md:85`, early Oct; nothing later contradicts it, but I did not find an explicit later confirmation). Install is an ad hoc `dogfood-v2` build over cable (`eas.json`; memory note `kinship-local-ios-build`).

**Which build is on the founder's phone.** The last build documented as installed is `fc06b10` (K26–K28), as of 20 Oct (`docs/product/option-a-release-sequence.md:11`). Option A (`f55f331`) was merged, and gateway v16 serves production (`docs/agent-loop/PRODUCT_DELIVERY_HANDOFF.md:62` on alpha). **Uncertain:** whether an Option A app build was installed on the phone afterwards; I found no record of it.

**There is also a legacy 1.0 app in the same codebase.** It lives in `app/(tabs)`, `garden-walk`, `reach-out`, `season`, and so on. 2.0 accounts are redirected to `/v2` (`app/index.tsx`, `src/hooks/useFlags.ts` `shellFor`). The plan's audit lists 1.0's defects, such as demo people, memory text on the lock screen and calendar writes (`KINSHIP_2_COMPLETE_PLAN.md` §3). Nothing below describes 1.0 unless it says so.

**Readiness verdicts (the only labels allowed are NOT READY, READY FOR FOUNDER NATIVE PASS and READY FOR WIFE DOGFOOD):**
- PR #74 body: **NOT READY**, and FOUNDER-DEVICE "NOT RUN".
- PR #75 handoff (`docs/product/alpha-stabilization-handoff.md`): **READY FOR FOUNDER NATIVE PASS**, *once the production release sequence has run*. That sequence needs the founder's yes for the merge, the six migrations, the gateway deploy and the install. "Nothing here has been verified on the founder's device."
- Main's dogfood: still **NOT READY** for the wife's dogfood (`docs/product/HANDOFF.md` addenda, 19 Oct).

## 1. Status table

| # | Capability | Status | Key evidence |
|---|---|---|---|
| 1a | Add people from Contacts (multi-select at setup, and later from People) | **SHIPPED ON MAIN** (flagged) | `src/features/setup/SetupViews.tsx`, `setupModel.ts`; coverage rows 4, 11 |
| 1b | Add by name, manually | **SHIPPED ON MAIN** | `src/features/setup/AddByNameSheet.tsx` |
| 1c | Pick one contact from inside a question ("Who is Matt?" → Choose from Contacts, no permission needed) | **SHIPPED ON MAIN** | coverage "K24 and K25 built" |
| 1d | First run never lands on an empty Today or People | **SHIPPED ON MAIN** (permanent CI gate) | `app/__tests__/firstRun.test.tsx`, `.maestro/fresh-install.yaml`; contract §8 |
| 1e | Merge duplicate people, with Undo | **ALPHA PR** | `src/store/peopleMerge.ts`, `src/features/people/MergeSheet.tsx`, `merge_people` in migration `20261030090000_v2_trust_floor.sql` |
| 2a | Typed natural-language "Tell" | **SHIPPED ON MAIN** (flags `tell`, `ai_extraction`) | `src/features/tell/*`, `supabase/functions/ai-gateway/*` |
| 2b | Voice capture (Kinship's own mic) | **PLANNED / questioned.** A `voice_capture` flag key exists, but no code does | D5; coverage row 29 ("NOT BUILT; no mic shown anywhere"); CC-25 "Explore later; questioned before implementation" |
| 2c | iOS keyboard dictation into the Tell field | Works because it is the OS keyboard. It is not a Kinship feature and must not be called "voice" | `wife-dogfood-final-review.md` ("The keyboard's dictation works…"); contract §9 |
| 2d | Siri, Action Button, share sheet, widget, screenshot or photo capture | **PLANNED** (Siri/Action Button: "Alpha direction"; share: explore later; widget: hold). `CaptureSource` enum values only | coverage row 32; `src/platform/analytics.ts` |
| 2e | Notes with more than 8 items: keeps 8, says "Kinship couldn't get to all of it", offers **Tell the rest** and marks the dropped words | **SHIPPED ON MAIN** (Option A) | `supabase/functions/_shared/extraction/pipeline.ts:76` `MAX_ITEMS = 8`; coverage "Option A" |
| 2f | Long notes processed in parallel passages, cap raised to 200 | **ALPHA PR** (FD-30c) | alpha `run.ts`: `PASSAGE_CHARS = 450`, `MAX_PASSAGES = 6`; `pipeline.ts:82` `MAX_PROPOSALS = 200`; migration `20261031090000_v2_many_items_per_note.sql` (200 items, 50 new people per note) |
| 3a | Several people from one story; shared memories ("Kept for Susan and Michelle") | **SHIPPED ON MAIN** | coverage Gate 0 rows (I5, I11), K-series |
| 3b | Who-is-who resolution: one question, never a guess ("Which Sam?", "Who is 'he'?", "Who is Wifey?") | **SHIPPED ON MAIN**; the #63 pronoun fix is **ALPHA PR** | `src/features/tell/reviewModel.ts` (flags `pronoun`, `new_person`, `person_archived`); alpha `pipeline.ts` `someoneElseBefore` |
| 3c | Ambiguous or coarse dates resolved by deterministic code (month, season, week, "sometime in November"); risky ones confirmed | **SHIPPED ON MAIN** | `supabase/functions/_shared/extraction/dates.ts` (precision day/week/month/season/year); CC-4 |
| 3d | Told-again updates: "Replaces: ~~…~~", "Already known: …", residence move/refine semantics, "Is Susan still in Alameda?" | **SHIPPED ON MAIN** | coverage H23, H17, B3–B8; `supabase/functions/_shared/semantic/*` |
| 3e | Told-again over a **user-edited** line asks "Does this replace what you told me?" | **ALPHA PR** (CER-1) | migration `20261031100000_v2_user_chosen_closure.sql` |
| 3f | A general contradiction prompt ("looks like something you told Kinship · Keep earlier / Keep new / Keep both") | **INTENTIONALLY DEFERRED** (K18), folded into the semantic work | coverage "Blocker bundle" table |
| 4 | Source on every memory: a DB constraint, an ochre/lime provenance line, a Source view with the kept words underlined | **SHIPPED ON MAIN**; the dotted "not got to" spans are Option A, also on main | contract §7.1; `app/v2/source/[captureId].tsx`; `src/features/person/NoteView.tsx` |
| 5a | Sensitive readings (health, death/grief, conflict, money, other private) need the user's yes | **SHIPPED ON MAIN** | `extraction/types.ts` `SENSITIVITIES`; contract §7.2 |
| 5b | Kept card with Undo, Correct this, "Got it right / Not quite" | **SHIPPED ON MAIN** | coverage I4, H19 |
| 5c | Edit words, edit name, move a line to another person, "Not this" (retract), Forget, Remove from People (soft), Bring back | **SHIPPED ON MAIN** | coverage rows 14, 16, Gate 0 |
| 5d | Pause and Remembered (deceased/estranged) controls | Main: **PARTIAL** (renders the state only). Controls: **ALPHA PR** | coverage row 34; alpha `docs/product/trust-floor.md` §1 |
| 6a | People search (finds names only) | **SHIPPED ON MAIN** | coverage row 22 |
| 6b | **Ask** ("Ask your memory"): model-free word matching over your own lines, with sources and honest misses | **ALPHA PR** (FD-30g) | alpha `src/features/ask/retrieve.ts`, `docs/product/ask-v1.md` |
| 6c | Semantic Ask (paraphrase, synthesis) | **PLANNED** ("then bounded synthesis if needed"; a founder decision after v1) | CC-25; `ask-v1.md` "No synthesis" |
| 7a | Today: one deterministic Moment (score ≥ 55) from event follow-ups, upcoming events, birthdays, milestones, good news and first days, plus Coming up and Waiting-on lines, a Moment detail and first-use orientation | **SHIPPED ON MAIN** | `docs/product/today-eligibility.md`; `src/features/today/todayModel.ts`; migration `20261005090000_v2_reasons_v0.sql` |
| 7b | Your own promises (RSN-06) and open threads (RSN-07) as Today Moments | **ALPHA PR** (FD-30e) | alpha `today-eligibility.md`; migration `20261030120000_v2_showing_up_moment_types.sql` |
| 7c | One private, scheduled-on-device notification of the day's Moment | **ALPHA PR** (FD-30e). Delivery and tap-through **not natively shown** | alpha `src/lib/momentNotification.ts`; handoff row 8 |
| 7d | Server push, weekly brief, calendar Briefs | **PLANNED / deferred** | D4; coverage rows 19, 31 |
| 7e | Contact-frequency cadence or "reconnect" | **ABSENT by rule.** Reconnect is deferred and would need a real reason and an explicit Intention | `today-eligibility.md` ("Elapsed time alone never makes a reason"); coverage row 20 |
| 8a | Hand-off to Messages, Phone, FaceTime or WhatsApp; nothing pre-written; Kinship sends nothing | **SHIPPED ON MAIN** | `src/features/today/HandoffSheet.tsx`, `useHandoff.tsx`; contract §7.7 |
| 8b | "You could mention" (up to two grounded talking points, deterministic) | **SHIPPED ON MAIN** (K26, verified on the founder's device) | `src/features/today/mentions.ts` |
| 8c | SUA-1 "You could…" fixed-template suggestions (invite to dinner, offer help, send a note…) | **ALPHA PR** (FD-30d, a prototype; the copy is a proposal) | alpha `src/features/today/suggestions.ts` |
| 8d | Message drafting or openers | **PLANNED** only as "later, Reconnect, on explicit request, never sent" (D9). V1 forbids generated text | D9 |
| 8e | Gift ideas | **ABSENT.** The "Ideas →" affordance was removed by D9. Gift *recall* via Ask ("What gift did Susan mention?") is alpha | coverage §2; `ask-v1.md` |
| 8f | Calendar add or read | **ABSENT in 2.0** (D6/T7). 1.0 legacy wrote season echoes to the calendar | D6; plan §3 |
| 8g | Commerce, booking, purchase | **ASPIRATIONAL**, and constrained: never an affiliate marketplace | CC-28; contract §2 |
| 9a | Return check "Did you reach Ben?" → Yes records one conversation; "Not yet" lets it come back | **SHIPPED ON MAIN** | `today-eligibility.md`; `src/store/returnLoop.ts` |
| 9b | "Anything worth remembering?" after a Yes (opens Tell) | **SHIPPED ON MAIN** | same |
| 9c | Between-you trail of confirmed conversations, with manual entry for Message, Call, Video or In person | **SHIPPED ON MAIN** | `src/features/person/trail.ts`; coverage I2 |
| 9d | Return loop from a person's page; promise "Didn't happen"; SUA-1 "Did you make a plan?" outcome | Page loop: **MAIN** (K28). Promise and SUA outcome: **ALPHA PR** | coverage K28; alpha `today-eligibility.md` |
| 9e | Event-passed follow-up ("How did it go for Ben?") | **SHIPPED ON MAIN** (event follow-up candidate) | `today-eligibility.md` |
| 10a | Explicit, server-side consent before understanding (provider disclosed) | **SHIPPED ON MAIN** | D2/D3; coverage row 3 |
| 10b | On-device SQLCipher store per user; RLS; no content in analytics | **SHIPPED ON MAIN** | `src/store/deviceStore.ts`, `expoPlatform.ts`; `src/platform/analytics.ts`; D11 |
| 10c | Data export (Markdown/JSON through the share sheet) | **ALPHA PR** | alpha `src/lib/exportData.ts`, `trust-floor.md` §2 |
| 10d | Account deletion from the 2.0 app | **ALPHA PR.** Main's 2.0 Settings has no delete (a 1.0 delete flow exists) | main vs alpha `src/features/people/SettingsSheet.tsx`; alpha `supabase/functions/delete-account/*` |
| 10e | End-to-end encryption | **ABSENT by decision** (D11: no E2EE while AI runs on the server) | D11 |
| 11a | Sprig per person, identity-only; `sprig_marks` off | **SHIPPED ON MAIN** (D8) | contract §6 |
| 11b | People list: search-first, alphabetical (T4) | **SHIPPED ON MAIN**; alpha has a "lettered index" plus Find someone / Ask doors | coverage row 11; alpha coverage "Structural redesign" |
| 11c | Electric Garden visual system (blooms, a photo in a fluid mask, poster-scale name) | **ALPHA PR** (FD-30b/j) | alpha `src/ui/garden/*`, `src/lib/personPhotos.ts` |
| 11d | Garden or Landscape as a destination | **Superseded/deferred** (D7, §34) | coverage row 30 |
| 11e | Five whole-app structures (Deck, Wall, Almanac, Atlas, Notebook), each retiring T4 | **ASPIRATIONAL** (an unapproved exploration, 31 Oct) | `docs/product/explorations/whole-app-structures-2026-10/README.md` |
| 12a | Platform: iOS only (iPhone; `supportsTablet: false`) | Fact | `app.json`. Android config is a 1.0 leftover; nothing in 2.0 targets it |
| 12b | Pricing and monetization | **PLANNED hypothesis only** ($4.99/mo, ~$39.99/yr; founding $2.99). Beta cohort 1 free; no StoreKit | D10 |
| 12c | TestFlight / App Store | **ABSENT** (no App Store Connect record documented) | `docs/phase2/handoff-next-session.md:85` |
| 12d | Users | **1 documented** (the founder) plus 1 test account | `HANDOFF.md:283` |

## 2. Detail by capability

### 1. Adding people and first run (MAIN)
- The sequence is welcome/promise (with an optional 4-step "See how it works" labelled "An example") → Sign in with Apple, or Google/email → a name step if sign-in gave no name → consent → "Who do you want to show up for?" contacts multi-select → "Already worth knowing" → first Tell → Today.
- "Already worth knowing" lists birthdays in the next 14 days from the picked contacts. If there are none, the first Tell comes first. Coverage rows 1–6 and 24.
- The contacts list puts suggestions first: family names, then birthdays this month. Nothing is pre-checked. iOS gives no access to favourites or call history (coverage §2).
- From each picked contact Kinship saves the name, the contact id and the birthday. Numbers are read at tap time and never stored (contract §7.6, T8).
- Refused, limited and unavailable Contacts states each have their own screen.
- Today's first use shows "This is where Kinship brings things back." plus one next step. H4 "Bring back" appears once after the first Tell becomes memory.
- Evidence level: the simulator journey on the alpha passes (`alpha-stabilization-handoff.md` row 1). The founder has used main on his device. The first run on main also passed an earlier founder native pass (coverage "Recovery pass").

### 2. Capture
- **Input.** Typed text in a pinned Tell field on Today, People and every person page. A draft is kept. There is no Kinship microphone, and none is allowed until on-device voice exists (D5, contract §9).
- **What gets extracted.** Kinds: `fact, event, promise, plan, thread, moment, milestone, tradition, context` (`supabase/functions/_shared/extraction/types.ts:11`). Sensitivities: `none, health, death_grief, conflict, money, other_private` (`:17`).
  - Dates are resolved by code, not the model, with a precision of day, week, month, season, year or unknown (`dates.ts`).
  - Promises carry an owner (yours or theirs; "Whose promise?" asks when it's unclear).
  - Preferences and interests are facts with a category.
  - Related people and pets are kept too, as `related_people` ("Michelle · sister", "Fluffy · dog").
  - Residence has its own semantics, including a GeoNames place index.
- **Gateway path.** The app calls one Supabase edge function, `ai-gateway`. It runs one capability, `relationship_extract`: a single hosted LLM at low effort, an 8,000-token cap, a 45 s per-call deadline, and no fallback model (`supabase/functions/_shared/ai/registry.ts`).
  - Prompt versions: v6 on main, v7 on alpha.
  - The server checks the `ai_extraction` flag on every call.
  - Deterministic code then validates evidence spans, names, dates, sensitivity and dedupe (`pipeline.ts`).
  - The phone waits 60 s (`src/store/gateway.ts:331`), with no SDK retry.
  - The provider is disclosed in the consent copy: "Sent to Anthropic to understand it; not used to train models" (T9).
- **Limits and latency.**
  - Main keeps 8 items per note (`MAX_ITEMS = 8`) and shows the left-out ones honestly through Option A.
  - Alpha splits notes over 700 characters into ~450-character passages, at most 6 called in parallel, each seeing the whole note. The run caps at 200 proposals and 50 new people per note. A passage past 6, or one that fails, becomes `coverage.unprocessed`, shown as "couldn't get to all of it".
  - Measured: the first Tell takes 9–10 s; 19 lines from three passages took ~13 s (PR #74, `PRODUCT_DELIVERY_HANDOFF.md`); a 668-character, 15-fact note kept 15/15 (simulator, live model).
  - Memory note (19 Oct, pre-alpha): about 1.5 s per proposed memory. **Small-n measurements; no p95 is claimed.**

### 3. Understanding conversations
- **Multiple people per story:** yes (MAIN). A shared memory is filed on each person, and "Add Pedro" appears for someone new.
- **Identity resolution:** deterministic candidates. A pronoun with two possible people gets one question, never a guess (contract §7.3). Main also handles nicknames, possessives ("Chris'"), renamed people (current name shown), removed people (offered back) and Choose from Contacts.
- **Ambiguous dates:**
  - "Sometime in November" resolves to month precision.
  - Seasons are meteorological and flip for the southern hemisphere.
  - Vague words ("soon", "someday") get no date.
  - "Next Thursday", "this weekend" and similar keep a preferred date but are always confirmed (CC-4).
  - A coarse date never makes a Today Moment; it lives on the person page.
- **Told again / change:** "Replaces: ~~…~~" on updates, "Already known" for duplicates, and the residence chain (refine vs move). On alpha, an update over a line you edited asks first.
  - **Gap:** a general contradiction detector is deferred (K18).
  - I did not verify whether non-residence contradictions without an update cue are caught. Treat that as **uncertain**.
- **Known model weaknesses (documented):** "s4", the model never proposes the keys sentence. A move line was filed on a dog; it was fixed in `b344d78` but not re-walked natively.

### 4. Source grounding (MAIN)
- Every memory item needs a source. This is enforced by a DB constraint and by the gateway (contract §7.1, plan §6).
- Every line shows provenance ("You told Kinship · Oct 2", "From Contacts", "Edited by you · was: ~~…~~"). One tap opens the Source view: the original note with the kept words underlined.
- Option A adds dotted marks for words not understood.
- Replaced lines stay visible there as "Since updated".
- Copy may quote only the user's words (contract §7.5).

### 5. Review and consent
- **Needs a yes:** sensitive classes; two candidate people; a new person; unclear promise ownership; ambiguous dates; a residence conflict; a date-unresolved sensitive line; (alpha) replacing an edited line. Held items stay out of memory until answered.
- **Auto-saves:** clear, non-sensitive lines go straight to memory with a Kept card (Undo · Correct this · feedback).
- **Correction:** edit the words (a date in the words is re-asked on alpha), edit a token, move a line to the right person (the subject is renamed in the words), edit the name.
- **Deletion and undo:** "Not this" retracts a line, Forget asks first, Undo restores exactly (checked in the DB on alpha), Remove from People is soft and reversible. Account deletion and export are alpha only.

### 6. Recall
- **Main:** you browse the person page (Lately · Coming up · You said you'd · Between you, three lines each, `relationship-page-rules.md`) and What Kinship knows (Background · Into · Hoping to · Plans · Their people · Between you, with Before). People search matches names only.
- **Alpha Ask v1:**
  - Lives in People's search field ("Ask your memory").
  - On-device and model-free. Words are folded and stemmed; there are steers for "into/likes", "where … live", "when did I last…" and "birthday".
  - Every matching stored line is returned with its source, grouped alphabetically by person. When nothing matches it says so plainly ("Kinship knows nothing about that for Sam yet").
  - **It misses paraphrases** ("like to eat" did not find "loves Thai food"). The handoff accepts this and calls it a founder product decision.
  - No synthesis, no chat, no "what would be thoughtful".

### 7. Bringing things back (Today)
- **How it decides:** the score is base × timeliness × evidence × freshness, and a candidate needs ≥ 55. Only one Moment per person per 7 days, at most one primary, and up to two quiet lines. No model is involved.
- **Bases:**

  | Moment | Base | Status |
  |---|---|---|
  | Event follow-up | 90 | main |
  | Upcoming event | 85 | main |
  | Birthday (day of) | 80 | main |
  | Milestone (≤ 3 days before, exact day) | 80 | main |
  | Good news | 75 | main |
  | Your promise | 74 | alpha |
  | Open thread | (not read) | alpha |
  | First day | 70 | main |

- **Open threads (alpha):** a thread that has a date asks the day after it. One with no date asks 42 days after it was told.
- **Never a Moment:** sensitive person events, a relative's events, coarse dates, paused or remembered people.
- **Notifications:**
  - Main has none: 2.0 cancels 1.0's legacy notifications in `app/v2/_layout.tsx`.
  - Alpha has one local notification per day, at 09:00. It reads only "Something worth knowing about Ben today." Limits: at most 3 in 7 days and 2 time-sensitive, quiet hours 21:00–08:00, back-off, a global pause, and permission asked only after a useful Moment.
  - Simulator: the alpha test hook works. Delivery and tap-through are unverified.
- **No contact-frequency cadence**, and no "last contacted". The page's "You reached out" line was removed as "a disguised last-contacted field" (CC-20).

### 8. Actions beyond reminders
- **Built:**
  - The hand-off opens Messages, Phone, FaceTime or WhatsApp with nothing pre-written.
  - "You could mention" (main).
  - SUA-1 fixed "You could…" lines (alpha prototype, the copy unapproved).
  - Analytics records `gesture_shown`, `gesture_tapped` and `gesture_outcome` separately and content-free.
- **Not built:** drafting (forbidden in V1 by D9), gift ideas, calendar adds, booking or commerce.
- CC-28's thesis lists presence, practical care, shared experiences and connecting people. It is a long-term model, and SUA-2 to 7 are not authorised (`docs/product/explorations/showing-up-actions-2026-10/`; memory note "CC-28 closed; no SUA-1 brief").

### 9. Closing the loop
- On main: return check → Yes records a `contact_events` row → optional "Anything worth remembering?"; the Between-you trail; manual conversation entry; event follow-up Moments.
- A hand-off alone never counts as contact (T12).
- Alpha adds the promise loop (its second window on days 3–5; "Didn't happen") and the SUA outcome question.
- No automatic detection that contact happened. Kinship reads no messages or call logs.

### 10. Privacy
- **Consent:** explicit, server-side, once, with the provider named (D2/D3).
- **AI requests:** minimal context, at most about 3 likely people. Never phone numbers, emails, addresses or full contact lists (D2).
- **On the phone:** SQLCipher per user, with the key in SecureStore. Person photos (alpha) never leave the device and are not exported.
- **Server:** Supabase, with encryption at rest and RLS. 829 pgTAP assertions on alpha.
  - A real cross-account probe defect, `person_proactive`, was found and fixed on alpha only (migration `20261031120000`).
- **Analytics:** PostHog through a closed, typed schema with no SDK and no free text (`docs/ops/analytics.md`). The `dogfood-v2` build turns on performance-scope analytics.
- **Crash reporting:** Sentry.
- **No E2EE** (D11).
- **No visible AI** (contract §3): no sparkle icons, AI badges, model names, confidence scores, tier labels, or chat as a primary surface. The provider is named only at consent and in Settings.

### 11. Visual representation
- **Main (Quiet Herbarium):**
  - Typographic, with an ochre provenance mark.
  - One hairline sprig per person, deterministic from its seed. It never grows with history (D8, plus a CI area test).
  - People is a two-item-bar destination: search-first, A–Z (T4).
  - Person page as above.
- **Alpha (Electric Garden, FD-30b/j):**
  - Dawn washes, hero blooms, a user-chosen photo in a fluid mask, the name at poster scale, two-colour sprigs.
  - People has a lettered index and two doors (Find someone / Ask your memory).
- **Founder status:** the founder called the first alpha pass a reskin. Then on 31 Oct, after the structural pass, he still found People "the old structure with a new skin". Five whole-app structures now await his pick, and every one retires T4 (README above; memory note "Five whole-app structures").
- **The visual identity is therefore unsettled.**

### 12. Platforms, pricing, distribution, users
- iPhone only. Expo SDK 54, React Native, Supabase.
- No StoreKit, no prices in code (D10). The future direction is a paid subscription; the archive state never holds memories hostage, and no feature gate counts people.
- No App Store or TestFlight. Ad hoc dogfood builds only.
- Users: the founder, plus one test account. The wife's dogfood has not started. Planned rings: Alpha with 8–12 trusted friends, then Cohort 1 with 30–50, both on TestFlight (`KINSHIP_2_OPERATIONALIZATION.md:991`). **Not started.**

## 3. Hard rules that constrain competitive strategy

From `docs/product/KINSHIP_2_PRODUCT_CONTRACT.md`, `CLAUDE.md` and the decisions:
1. **Never quantify a relationship.** No scores, health, closeness, counts, streaks, "last contacted", frequency, or importance sorting (contract §2 rule 3; T4; CC-20). This rules out the cadence and CRM-reminder model that most competitors use.
2. **Intelligence is invisible.** No AI branding, badges, model names, confidence, or chat as a primary surface (contract §3). Ask may never be a chat. This limits "AI-native" positioning in the product itself.
3. **Trust over taps.** Sensitive or ambiguous readings need a yes. There are never guesses about identity, dates or sensitive meaning, and the user's edit wins (contract §6, §7).
4. **Every durable statement has a source.** Copy is grounded in the user's words, and silence beats a wrong detail (contract §2, §7).
5. **Kinship never sends anything.** It also never drafts or auto-inserts text in V1 (D9). Opening a channel is not contact (T12).
6. **No fake seeding** of people, memories or reasons in real accounts (contract §7.9). Onboarding examples must be labelled "An example".
7. **Relationship value before commerce.** It is never an affiliate marketplace, commercial incentives never affect ranking, and vulnerable contexts are never monetised (CC-28).
8. **Not optimised for engagement.** Rising time-in-app counts as a regression (contract §2). Notifications are capped by D4 (≤ 3 in 7 days), private on the lock screen, and never "come back" nudges.
9. **Sprigs are identity-only.** `sprig_marks` stays off. Garden/Landscape cannot become a destination without a design checkpoint (D7, D8).
10. **D13.** Paused and remembered people get no proactive reasons, birthdays included. Only the user sets those states.
11. **Readiness labels:** only NOT READY, READY FOR FOUNDER NATIVE PASS and READY FOR WIFE DOGFOOD. Browser screenshots never count. Flags go per account only, each with the founder's yes. Migrations reach production only by merging to `main`.
12. **Expansions must pass the "smallest coherent Kinship"** (Tell · Understand · Memory · Today · Delivery · Trust) and the showing-up test (contract §11.8–9).
13. **No calendar in V1 onboarding** (T7/D6). Voice must be on-device only, with no raw audio upload (D5). No anonymous path: an account comes before the first Tell (D1).

## 4. Gaps between what is claimed or planned and what is built

1. **Distribution and evidence.** All alpha capability (Ask, promise and thread Moments, notification, export, delete, Pause/Remembered, merge, long notes, Electric Garden) is unmerged, undeployed, and has never run on a physical device. Main reaches one real user, the founder. The verdicts also disagree: #74 says NOT READY; #75 says READY FOR FOUNDER NATIVE PASS, but only after a production release that has not been approved. There is no App Store record.
2. **Ask is lexical, not understanding.** It is the "first major Alpha expansion" (CC-25), but v1 is model-free word matching and misses paraphrases. Semantic or synthesised recall is not built.
3. **Capture is typed only.** Voice, Siri, Action Button, share sheet and widgets are all deferred, and voice is "questioned before implementation". Long-note capacity beyond 8 items exists only on alpha, and 6 passages of ~450 characters still bound it.
4. **"Showing up" beyond a nudge is mostly thesis.** CC-28's model (practical care, shared experiences, connecting people) has one fixed-template prototype on alpha. Main's hand-off opens a channel with nothing pre-written. There are no drafts, gift ideas, calendar adds, briefs, reconnects or reflection. The plan's monetization ("the ongoing intelligent service") depends on surfaces that are not built.
5. **Proactivity and trust-floor basics are missing on main.** Main has no notifications at all, so Today speaks only when opened. It has no export and no in-app account deletion in 2.0 (needed for the App Store, and "Commit next" in CC-25). Both are alpha only, and notification delivery is unverified. The visual identity is also unsettled: Electric Garden was judged a reskin, and five unapproved structures each retire T4.

**Uncertainties:**
- Whether an Option A build was installed on the founder's phone.
- Whether non-residence contradictions without an update cue are caught.
- Whether an App Store Connect record was created after early October.
- The production state as of today. The figures come from 31 Oct docs; I did not query Supabase.
