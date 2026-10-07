# Kinship: session handoff (7 Oct 2026)

*Self-contained. A new session should be able to continue from this file and the repo alone. It was written after inspecting the repo, the production database and the edge functions on 7 Oct 2026. Nothing in product code changed while it was written.*

---

## A. Current state snapshot

### Repo
- **Repository:** `fullcarts89/kinship` (Expo SDK 54 / React Native, expo-router; Supabase backend).
- **`main`** = `aa7127e` "Merge pull request #19: Kinship 2.0 Core Trust Closure + Return Loop pass" (a merge commit). Earlier merges: #18 (stabilization), #17.
- **Working branch `claude/awesome-edison-3cuf6z`** = `main` + docs-only commits. It holds the round-4 feedback logs, the round-4 summary, the ledger I-series, CC-18 and this handoff. **No product code differs from `main`.** It is not merged and has no open PR.

### What PR #19 contained (now on main)
- **P0 trust fixes:**
  - H28: someone else's promise ("Tyler's promise", "Whose promise?").
  - H12: no other-Sam leakage.
  - H20: "My daughter Kaiya" resolves to Kaiya.
  - H25: a cancellation supersedes, with "Replaces: ~~…~~".
  - H13/H5: shared duplicates merged when the twin is saved.
  - H21: "Add Pedro" for named newcomers.
  - H14/H19b: source lines; "Source syncing…".
  - H30: edits keep lineage, "Edited by you · was: …".
  - H17: "Already known: …".
- **P1:**
  - H10/H11/H18: the return question carries its reason, persists across force-quit, "You reached out · date".
  - H26/H27: Coming up shows 7 days, with "and N more".
  - H9: no first-use flash.
  - H19: the Kept card has its own raised surface.
  - H24: "Your note".
  - H23: "was: ~~…~~".
  - H29: a quiet "Maybe" token.
- **P2:**
  - H1: rename a person.
  - H6: "Got it right / Not quite" stored on `captures.feedback` (migration `20261007090000`).
- **Telemetry:** content-free performance telemetry in `dogfood-v2` (see below).
- **Evals:** corpus `extraction-v2.5`, 407 fixtures.
- **Docs:** ledger, report, native checklist, cleanup plan, next-UX proposals, CC-16 and CC-17.
- **Checks at merge:** Jest 515 passing; Deno 146; pgTAP 454 (unchanged by the telemetry commit); tsc clean; ESLint 0 errors; free evals (oracle, realistic oracle, replays) had zero FAIL rows.

### Production (project `kddpxiiyxgvjrtpdkvio`)
- **Migrations:** the latest applied is **`20261007090000_v2_capture_feedback`** (checked 7 Oct). The founder applied it with `npx supabase db push`. **Migrations do not apply automatically on merge;** the founder runs `db push`.
- **ai-gateway:** **version 5**, deployed 6 Oct 2026 22:07 UTC, after the PR #19 merge at 21:43 UTC, so it is the merged code (including the `Server-Timing` header). It is redeployed by hand: `npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio`.
- **Flags:** per-user only. The founder's account and test account `97748654-19f8-4f2f-a7e6-81c5aa0e5e57` are enabled. **The wife's account is not enabled, and her user id has not been requested.**

### Dogfood build
- **Build:** the EAS profile `dogfood-v2` (extends `preview`, internal distribution), built from `main` after the merge and installed on the founder's iPhone. The wife's iPhone is registered for internal installs.
- **Its environment:** `EXPO_PUBLIC_V2_ENTRY=1`, `EXPO_PUBLIC_ANALYTICS_ENABLED=true`, `EXPO_PUBLIC_ANALYTICS_SCOPE=performance`, plus the Supabase URL and anon key. `EXPO_PUBLIC_POSTHOG_KEY` is an EAS environment variable (set for preview, production and development), never in the repo.

### Performance telemetry: ENABLED in dogfood-v2 (since PR #19)
- **Plumbing:**
  - typed, closed schema in `src/platform/analytics.ts`;
  - a filter in `src/platform/analyticsSetup.ts` (`performanceOnly`) lets only three events leave the phone;
  - our own PostHog sink (no SDK; no person profiles; no GeoIP; random per-install id);
  - documented in `docs/ops/analytics.md`.
- **`tell_lifecycle`**, once per Tell when its result is first on screen:
  - `outcome`;
  - `total_bucket` (Send → visible);
  - `sync_bucket` (Send → first gateway request);
  - `gateway_bucket` (the last request's round trip);
  - `server_bucket` (ai-gateway's `Server-Timing`);
  - `network_bucket` (round trip − server);
  - `render_bucket`;
  - `retries`;
  - plus the coarse `understood_bucket` / `shown_bucket`.
- **`tell_failure`:** `stage` (offline / timeout / server / limited / gave_up), `attempt`.
- **`app_stall`:** a JavaScript-thread block of ≥ 1 s while in the foreground, as `duration_bucket` and `tell_work`.
- **Never sent:** Tell or memory text, names, contacts, relationship content, Source content, location, ids. "Got it right / Not quite" is never sent; it stays on the note.
- **Retention:** the PostHog plan default (not configurable on the current plan). **No sampling:** every dogfood event is sent.
- **Not yet confirmed:** the founder hasn't yet reported seeing events in PostHog → Activity.
- **Approved additions, not built (Gate 0):**
  - Send → "Understanding…" visible;
  - the app backgrounded during processing;
  - coarse build version and platform.

### Readiness
- **NOT READY** for wife dogfood.
- The PR #19 build went through the founder's native pass (round 4) and surfaced P0s (I8, I10, I12, I13).
- The next possible label is **READY FOR FOUNDER NATIVE PASS**, after Gate 0.

### Exact outstanding blockers
- **Gate 0 P0s:** I8, I10 (+ reopened H13), I12 (option A), I13.
- **Gate 0 P1s:** I5, I9, I11, I3. Plus the I12b check and the telemetry additions.
- **G5 freeze:** still open until the Gate 0 native evidence (see the close rule in the ledger).

---

## B. Canonical bug ledger delta (applied in `docs/product/bug-ledger.md`)

**Statuses:** only FIXED · VERIFIED · STILL OPEN · DEFERRED · SUPERSEDED.
- FIXED = code changed.
- VERIFIED = the founder deliberately reproduced the original scenario on a physical iPhone and it worked.
- **Nothing was promoted to VERIFIED.**

**Coverage:** F1–F23, G1–G43, H1–H30 (+ H19b), N1–N4 and **I1–I13 (+ I12b)** are all in the ledger.

**Totals before round 4:** 72 FIXED (not device-verified), 3 VERIFIED (G19, G21, G38), 1 STILL OPEN (G5), 11 DEFERRED, 14 SUPERSEDED.

### Changed this round
- **H13 → STILL OPEN (reopened).** The saved-twin merge works, but a mirrored line that is **held** (ambiguous person) is never compared with its saved twin; reproduced as I10. Fixed together with I10.
- **G5:** still STILL OPEN, now with a **close rule**: the founder reports no freeze through the Gate 0 native pass **and** PostHog shows no `app_stall` ≥ 3 s across dogfood-v2 sessions in that window. Then VERIFIED on the founder's say-so.

### Added (I-series)

| ID | Title | Status |
|---|---|---|
| I1 | Moment detail | DEFERRED → Phase 4 (approved) |
| I2 | Interaction history | DEFERRED → Phase 4 (approved) |
| I3 | Remove a person + visible Edit | STILL OPEN → Gate 0 |
| I4 | Kept-card hierarchy | DEFERRED → Phase 4 (approved) |
| I5 | The shared Kept label names all people | STILL OPEN → Gate 0 |
| I6 | Keyboard dismissal / navigation | DEFERRED → Phase 4 (approved) |
| I7 | Historical state in What Kinship knows | DEFERRED → Phase 4 (folded into H15) |
| I8 | dogfood-v2 can reopen into 1.0 | STILL OPEN → Gate 0, **P0** |
| I9 | Line detail loses the confirmation | STILL OPEN → Gate 0 |
| I10 | Saved + held mirror → bad ambiguity | STILL OPEN → Gate 0, **P0** |
| I11 | Correction can't select several people | STILL OPEN → Gate 0 |
| I12 | Rename display (option A) | STILL OPEN → Gate 0, **P0** |
| I12b | "Maybe" on a factual promotion | STILL OPEN → Gate 0 (check; not a bug if the note hedged) |
| I13 | Subject correction keeps the old name | STILL OPEN → Gate 0, **P0** |

### Related but unchanged
- **H1 (rename):** stays FIXED; the display gap is I12.
- **G23 ("Both"):** stays FIXED; general multi-select is I11.
- **H21 ("Add Pedro"):** stays FIXED, since the behaviour is right; the layout is I4.

**Seen working in round 4, but NOT VERIFIED until the founder says so:** H21, H25, H29, H10, H20, H1 (apart from I12).

---

## C. Approved product decisions (recorded in `KINSHIP_2_DECISIONS.md` CC-16, CC-17, CC-18)

- **I12, option A.**
  - Display the person's **current** name through structured person references. Never rewrite the original Tell or the stored interpretation.
  - Source keeps the original words.
  - Titles use the full chosen name ("What Kinship knows about Cutie Pie").
- **I13.**
  - A subject correction makes the displayed statement stop naming the wrong person.
  - The original wording stays as corrected history (H30).
- **I11.**
  - Choosing several people is allowed when a memory is genuinely shared.
  - Never a generic People multi-select. *Kinship proposes what it can know; the user decides only what it genuinely cannot.*
- **I1 Moment detail.**
  - *Tap a reason → the reason; tap a person → the person.*
  - Shows the grounded reason, why now, timing, Source, Message / Call.
  - "View Ben" is secondary: a deep link with quiet emphasis.
  - Not field-heavy.
- **I2 interaction history.** A lightweight trail under **Between you**; not a CRM log.
  - **Know → infer → ask:**
    - a launched channel plus Yes is recorded directly;
    - a grounded plan plus Yes may infer in person;
    - a manual entry gets one tap of Message / Call / Video / In person.
  - **Type ≠ reason ≠ shared experience;** the type picker never grows an activity taxonomy.
  - Every record has provenance.
  - **No** counts, streaks, "last contacted", frequency, health or ranking.
  - "Anything worth remembering?" is optional, non-blocking, and shown only after meaningful interactions.
  - **One tap** usually; **two** only when information is genuinely missing.
- **I4 Kept hierarchy.**
  - Order: kept → needs attention ([Add Pedro] [Not now], with "Add him so this can appear on his page too.") → Correct this · Undo → "Did Kinship get this right? Got it right · Not quite".
  - Real controls. "Tap a line to correct it" is removed. Quiet Herbarium.
- **I6 keyboard.**
  - Done accessory; drag-to-dismiss; Today / People usable with the keyboard open; draft kept; never needing to tap blank space or content.
  - **Bottom navigation stays;** any editing-state chrome change is solved locally.
- **H15/H2 What Kinship knows.** Portrait = what matters now (Lately · Coming up · You said you'd · Between you, unchanged). What Kinship knows = organised durable reference memory.
  - **Sections:** Into · an aspirations / plans section · Background · their people / pets · Between you.
  - **Aspirational wording only when the source expresses hope, desire, a goal or aspiration;** ordinary plans are neutral.
  - "Their people" lives here, not on the portrait.
  - Empty sections disappear. No counts, completeness, ranking, goal tracking or CRM fields. Source on every line.
  - **I7 folded in:** meaningful superseded facts appear as clearly-past Background, never as current. A declined sensitive outcome stays out.
- **H16 milestones.**
  - Vocabulary: engagement, wedding, new job, promotion, baby, graduation, new home, retirement, move.
  - Recognise, never interrogate.
  - A dated milestone is eligible about 3 days before and on the day; Today priority decides; it is not repeated just because it is eligible.
  - No date: remember it, never ask.
  - It must be anchored to at least one established person; untracked participants keep their names.
- **H4 bring-back in first use.**
  - One concrete example; at most one extra screen; no carousel; no decorative motion; respects Reduce Motion.
  - Prefer the user's real first Tell when it naturally makes a future Moment.
  - Point to Today: "This is where Kinship brings things back, when they matter."
  - Test: a new user can explain Today without coaching.
- **H3 Ask Kinship:** roadmap only, as a post-wife-dogfood / Alpha candidate.
  - Memory-only answers, with sources; "I don't know" when unsupported.
  - Its own grounding, refusal and privacy evals; never a chatbot.
  - People search is not a substitute.
- **H22:** no work; monitor.
- **Telemetry:**
  - Content-free performance telemetry is enabled in dogfood.
  - The additions above are approved.
  - Feedback stays separate.
  - Retention and sampling are recorded before any non-dogfood rollout.
- **Data cleanup:** not authorised. The plan in `data-cleanup-plan.md` is preserved and needs an explicit yes. N3 (which Anthony is real) is the founder's call. No note or source is ever deleted.

### Genuinely unresolved (ask the founder at build time; don't decide silently)
1. **H15 labels:**
   - the aspirations / plans section name ("Hoping to", "Plans & hopes", or neutral plans placed elsewhere);
   - the people / pets section label.
2. **I3 removal semantics:** whether memories only about a removed person are archived with them (proposed: yes, restorable; shared memories stay with the others). Also the exact "Remove from People" confirm copy.
3. **I2 placement:**
   - where the manual "Add interaction" lives (the relationship page vs Between you);
   - whether the trail also shows in What Kinship knows.
4. **I1 form:** a sheet vs a pushed page (a sheet is closest to the approved boards).
5. **I12 mechanism (technical, not product):**
   - Lines currently store `statement` + `person_id`, with no name spans.
   - **Proposed:** record person-mention spans at extraction going forward; for existing lines, match the person's previous names (kept on rename) as whole words.
   - **Confirm** this is acceptable as "structured references where possible".

---

## D. Updated roadmap / build plan (CC-18)

### Gate 0: Final Trust Closure (next)
**P0:**
- **I8.** A signed-in account in the 2.0 build never falls back to 1.0 (not on a flag timeout, error or cold start).
- **I10 (+H13).** Saved + held mirrors collapse into one shared line; ask only "Which Sam?", never offering an already-resolved person; correct "why" copy. Hide "Nothing needs you today." behind a waiting question.
- **I13.** A subject correction fixes the displayed statement and keeps the history.
- **I12 (option A).** The current display name via structured references; full name in titles.

**With it:**
- **I5:** the Kept label names everyone on a shared memory.
- **I9:** closing a line's sheet returns to the same confirmation.
- **I11:** multi-person correction when genuinely shared.
- **I3:** a visible Edit and a soft, restorable Remove from People.
- **I12b:** check the source note.
- **The telemetry additions.**

**Do not broaden** the extraction architecture unless reproduction proves it necessary. Each fix: reproduce → root cause → failing test → narrowest fix. Free evals stay at zero FAIL.

**Then a short, targeted founder native gate** (not a broad exploratory cycle):
- relaunch never enters 1.0;
- Michelle + ambiguous Sam;
- a subject correction changes the displayed name;
- nickname rename rendering;
- the shared Kept label;
- multi-person correction;
- remove / edit a person;
- no freeze (G5 watch);
- telemetry sanity in PostHog.

If those are clean, the trust foundation is sufficient: move the centre of gravity to UX. Old F/G items don't all need VERIFIED first unless they block trust or the core loop; keep the ledger accurate.

### Phase 4: UX Hardening & Relationship Loop Completion
- **Capture / review:** I4, I6.
- **Moments / action:** I1, H16.
- **Return / relationship:** I2, with conditional, non-blocking "Anything worth remembering?".
- **Relationship memory:** H15/H2 with I7.
- **Activation:** H4.

Make the existing product coherent; **no speculative expansion.** Update `approved-design-coverage.md` as surfaces land.

### Wife dogfood (after Phase 4, low-coaching)
Rollout: build → founder review → founder native pass → fix → founder approval → enable her account only, with the founder's explicit yes for her id.

**Evaluate:**
- Does Today make sense?
- Does she understand why something came back?
- Does tapping a Moment keep context?
- Does she Message / Call from Kinship?
- Is the return loop effortless?
- Does interaction history feel useful, not creepy?
- Does What Kinship knows feel like memory, not a CRM?
- Is Tell still low-friction?
- Does she know why she'd come back?

### Alpha candidates
Grounded **Ask Kinship** first, then by evidence. The plan's old "Phase 4: Alpha" now follows the wife dogfood (note added in `KINSHIP_2_COMPLETE_PLAN.md` §28).

### Still not to build
About You UI, Garden, Relationship Landscape, a generic graph, a broad Opportunity Engine, Intentions, a full timeline / "Your story together", a generic task manager, relationship scoring, health indicators, streaks, importance ranking, personality onboarding, a chatbot, subscriptions, broad model benchmark / model-swap work.

---

## E. New-thread handoff (paste this into the new session)

```
KINSHIP — HANDOFF (7 Oct 2026). Repo: fullcarts89/kinship. Work on branch claude/awesome-edison-3cuf6z (main + docs only).

WHAT KINSHIP IS
A private relationship memory. North star: "Kinship remembers what matters in the lives of the people you care about and brings it back when it matters, so you can show up."
Core loop: Tell → Understand → Memory → Moment → Reason → real conversation → "Anything worth remembering?" → back to Tell.
It does NOT optimise engagement, time in app, streaks, logging, CRM maintenance, scores or "relationship health".

PERMANENT RULES (docs/product/KINSHIP_2_PRODUCT_CONTRACT.md; CLAUDE.md is mandatory)
- Silence beats a wrong detail.
- Every durable statement has a source.
- Nothing quantifies a relationship.
- Kinship reduces work, never creates maintenance.
- The app leads back to the actual person.
- Intelligence is invisible: no AI badges, sparkles, model names, confidence scores, tier labels, chat as a primary surface.
- Trust invariants: sensitive classes always confirm; two candidate people → one question, never a guess; the user's edit wins; copy is grounded; Kinship never sends anything; no user content in logs or analytics; no fake data in real accounts.
- Sources rank: later founder decisions (KINSHIP_2_DECISIONS.md, newest CC-18) > Design Direction + approved boards > KINSHIP_2_COMPLETE_PLAN.md > phase docs.
- No approved surface disappears silently (docs/product/approved-design-coverage.md).
- A new account never lands on an empty Today and People: app/__tests__/firstRun.test.tsx and .maestro/fresh-install.yaml are permanent gates.

DESIGN: THE QUIET HERBARIUM
Paper, ink, one pressed sprig per person (identity only).
- Serif (Newsreader) for people, sans (Instrument Sans) for the machine.
- No cards, badges, rings, counters, dashboards, gradients: hairline rows; one raised surface (sheets / Tell).
- Ochre marks only what was understood (provenance) and what you said you'd do.
- Tokens only from src/design/tokens.ts.
- Motion is restrained; Reduce Motion is respected.

BUILT (on main, PR #19 merged at aa7127e)
- 2.0 shell with setup / first use.
- Tell → ai-gateway understanding → review / Kept card (Undo, correction, "Got it right / Not quite") → memory with Source.
- People; relationship page (Lately · Coming up · You said you'd · Between you); What Kinship knows; Source view; Edit / Not this; rename.
- Today: moments (birthdays, good news, starts today, reasons, Coming up for 7 days).
- Message / Call hand-off + return question with its reason; "You reached out · date".
- Shared memories, superseding updates with lineage, held questions (which person, keep sensitive?).
- Encrypted local SQLite + sync; evals corpus extraction-v2.5 (407 fixtures).
- Content-free performance telemetry ENABLED in the dogfood-v2 build: tell_lifecycle (stage buckets), tell_failure, app_stall. Never content; "Got it right / Not quite" is separate. See docs/ops/analytics.md.
- Production: latest migration 20261007090000 applied; ai-gateway v5 (deployed after the merge).

BUG STATE: docs/product/bug-ledger.md is canonical
Statuses: FIXED (code changed) · VERIFIED (founder reproduced on a physical iPhone) · STILL OPEN · DEFERRED · SUPERSEDED. Never promote FIXED to VERIFIED yourself.
- VERIFIED: G19, G21, G38.
- G5 freeze: STILL OPEN; close only by the rule in the ledger (no freeze in the Gate 0 pass + no app_stall ≥3 s).
- H13: reopened by I10.
- Round 4 (docs/product/founder-feedback-4.md, founder-feedback-summary-4.md, screens/feedback4/):
  I1 Moment detail (Phase 4) · I2 interaction history (Phase 4) · I3 remove person + visible Edit (Gate 0) · I4 Kept hierarchy (Phase 4) · I5 shared Kept label (Gate 0) · I6 keyboard (Phase 4) · I7 history in What Kinship knows (Phase 4, with H15) · I8 2.0 build reopens into 1.0 (Gate 0, P0) · I9 line detail loses the confirmation (Gate 0) · I10 saved + held mirror → bad "who" question (Gate 0, P0) · I11 multi-person correction (Gate 0) · I12 rename display, option A (Gate 0, P0) · I12b "Maybe" on a factual promotion, check (Gate 0) · I13 subject correction keeps the old name (Gate 0, P0).

APPROVED DECISIONS: KINSHIP_2_DECISIONS.md CC-16, CC-17, CC-18 (read CC-18 in full). Highlights:
- I12 option A: the current name via structured references; Source keeps original words; full names in titles.
- I13: the statement stops naming the wrong person, with history kept.
- I11: multi-person only when genuinely shared; never a generic People form. Kinship proposes; the user decides only what Kinship can't know.
- I1: tap a reason → the reason. Moment detail: reason, why now, timing, Source, Message / Call; "View Ben" is a secondary deep link.
- I2: know → infer → ask. One tap usually. Type (message / call / video / in person) ≠ reason ≠ shared experience. No counts, "last contacted" or streaks. "Anything worth remembering?" optional, only after meaningful interactions.
- I4: kept → needs attention [Add Pedro] [Not now] → Correct this · Undo → feedback.
- I6: Done accessory, drag-to-dismiss, nav usable, draft kept; bottom nav stays.
- H15/H2: aspirational wording only when the source expresses it; their people in What Kinship knows only; I7 as clearly-past Background.
- H16: milestones; ~3 days + day-of; anchored to an established person; never interrogate.
- H4: one bring-back example; prefer the user's real first Tell.
- H3 Ask Kinship: roadmap only (Alpha candidate). H22: monitor.
- Open questions to raise, not decide: H15 labels; I3 removal semantics; I2 placement; I1 sheet vs page; I12 mechanism (proposed: mention spans going forward + previous-name match for old lines).

PLAN (CC-18): Gate 0 Final Trust Closure → short targeted founder native gate → Phase 4 UX Hardening & Relationship Loop Completion → low-coaching wife dogfood → Alpha candidates (Ask Kinship first).
- Gate 0 = I8, I10(+H13), I13, I12A (P0); then I5, I9, I11, I3, the I12b check, telemetry additions (Send→"Understanding…" visible, backgrounded-during-processing, coarse build version + platform).
- Don't broaden extraction architecture unless reproduction proves it necessary.
- Not to build: About You, Garden, Landscape, graph, Opportunity Engine, Intentions, timeline / "Your story together", task manager, scores, health, streaks, ranking, personality onboarding, chatbot, subscriptions, model benchmark / model-swap work.

TESTING AND READINESS
- Each fix: reproduce → root cause → failing test → narrowest fix.
- Checks: npx jest · npx tsc --noEmit · npx eslint app src · Deno: deno test -A --config evals/deno.json supabase/functions/ (install deno if missing) · pgTAP: bash supabase/tests/run-db-tests.sh · free evals (oracle, realistic oracle, replays) at zero FAIL. Paid evals only via the PR label run-evals-full.
- Readiness labels only: NOT READY · READY FOR FOUNDER NATIVE PASS · READY FOR WIFE DOGFOOD. Current: NOT READY (Gate 0 P0s). Never call anything ready from browser screenshots; the real iPhone is authoritative.

OPERATING RULES
- No model identifiers in commits, PRs or code.
- Commit trailer: Co-Authored-By + Claude-Session lines as instructed by the session.
- Don't open a PR unless asked; merge only when the founder asks, with a merge commit.
- Migrations are forward-only. Production gets them only after merge, when the founder runs `npx supabase db push`. ai-gateway is redeployed by hand after merge.
- Never change production flags or user data without the founder's explicit yes for a specific account id. Never look accounts up by email. Data cleanup (docs/product/data-cleanup-plan.md) is NOT authorised.
- Founder's Mac: use `npx supabase …` and `npx eas-cli …`. Before Supabase CLI commands run `export SUPABASE_ACCESS_TOKEN=sbp_…` (the Keychain prompt loops). Build: `npx eas-cli build --profile dogfood-v2 --platform ios`.
- The founder wants explicit step-by-step instructions, concise answers, and no unnecessary questions.
- Don't build an app binary until the founder says so.
```

---

## F. Kickoff prompt (paste after the handoff block)

```
Start GATE 0 — Final Trust Closure.

1. Read CLAUDE.md, docs/product/HANDOFF.md, KINSHIP_2_DECISIONS.md (CC-18 in full), docs/product/bug-ledger.md (I-series, H13, G5), docs/product/founder-feedback-4.md and founder-feedback-summary-4.md, and look at docs/product/screens/feedback4/.
2. Confirm the state matches the handoff (branch, main, latest migration). If anything differs, tell me before changing code.
3. Before coding, reply with your Gate 0 plan: for each of I8, I10(+H13), I13, I12A, I5, I9, I11, I3, I12b and the telemetry additions, give the reproduction, the suspected root cause, the failing test you'll write, and the narrowest fix. Ask me ONLY the genuinely open questions that block Gate 0 (I3 removal semantics; the I12 mechanism). Use your recommendation for anything else.
4. After I reply, implement P0s first, then the rest. For every item: reproduce → root cause → failing test → narrowest fix. Keep the free evals at zero FAIL and all checks green. Update the ledger (FIXED only, never VERIFIED) and approved-design-coverage.md.
5. Finish with a short targeted native checklist for me (the Gate 0 native gate list in the handoff), what I need to run (db push / ai-gateway deploy / build), and the readiness label.

Do not merge, do not build the app binary, do not touch my data or flags, and do not start Phase 4.
```
