# Kinship 2.0 — Product Contract

**Status:** mandatory reference. Read this before changing any product behaviour or UI in Kinship 2.0.
**Written:** 5 October 2026, during the product-recovery pass that followed the empty first-run build.

This contract exists for one reason. A previous build was implemented milestone by milestone and stopped being the product the founder approved: a brand-new account opened onto an empty Today and an empty People, with no onboarding and no way to understand what Kinship is. Phase numbers and tickets had quietly outranked the approved experience. This document puts the experience back on top.

---

## 1. Sources, and which one wins

| Rank | Source | What it governs |
|---|---|---|
| 1 | **Explicit founder decisions made after 30 Sep 2026** (§6 below; `KINSHIP_2_DECISIONS.md` D1–D13; Phase 0 and Checkpoint A decisions; the recovery brief of 5 Oct 2026) | Overrides anything older that it directly contradicts, and nothing else |
| 2 | **Kinship 2.0 Design Direction** (Claude Doc, 30 Sep 2026) and the **approved recommended boards** of the Kinship 2.0 Design Exploration canvas: "Recommended · Setup, Today, Tell, Confirm", "Recommended · Brief, Follow-up, Reconnect, Person, History", "Recommended · Garden, Reflection, Ask, Privacy, Night", "Recommended · Design system" | **The product design.** Screens, composition, hierarchy, typography, spacing, copy voice, interaction model |
| 3 | `KINSHIP_2_COMPLETE_PLAN.md` (generated from the five `KINSHIP_2_*.md` files) | **The technical and build plan.** Architecture, data model, AI, trust, sequencing. Its tension table (T1–T17) records where it already overrides the design, with reasons |
| 4 | Phase and checkpoint docs (`docs/phase1/`, `docs/phase2/`) | Records of what was built. Never a source of product intent |

**Rule:** a build plan, a phase boundary or a ticket never removes an approved surface. If the plan's sequencing and the approved experience disagree about what a real user meets, the experience wins and the disagreement is raised with the founder (§11).

The five concept boards on the left of the canvas (Conservatory, Living Journal, Quiet Garden, Landscape, Almanac) are exploration, not approved design.

---

## 2. North star

> **Kinship remembers what matters in the lives of the people you care about and brings it back when it matters, so you can show up.**

Kinship is a private relationship memory. Its intended outcome is a meaningful real-world interaction with a real person. Its best day is a sentence, a door out of the app, and a friend who felt remembered.

### The core loop

```
Tell ─▶ Understand ─▶ Memory ─▶ Moment ─▶ Reason ─▶ Real conversation
  ▲                                                       │
  └──────────── "Anything worth remembering?" ◀───────────┘
```

### What Kinship does not optimise

Engagement, time in app, sessions, streaks, logging, CRM maintenance, relationship scores, gamification, "relationship health", number of people added, number of captures. Rising time-in-app is a regression.

### Permanent product rules

1. **Silence beats a wrong detail.**
2. **Every durable statement has a source.**
3. **Nothing quantifies a relationship** — not visuals, sort orders, notifications or metrics.
4. **Kinship reduces work; it never creates maintenance.**
5. **The app leads the user back to the actual person.**

---

## 3. The role of intelligence

**Intelligence is invisible by design.** Kinship is not an AI product, and it never tries to look like one.

The user experiences intelligence only as: less manual entry; natural-language Tell; fewer questions; accurate understanding of people and dates; organised memory; better timing; grounded phrasing; effortless correction. The user does not need to know which parts are a model and which are deterministic.

- Deterministic code wherever the task is deterministic (dates, windows, ranking, dedupe, birthdays, candidate generation).
- A model only where language understanding, close-candidate resolution or grounded phrasing materially helps.
- **Never in normal use:** sparkle icons, AI badges, "AI insight" cards, model or provider branding, confidence scores, tier labels, database terms, a chat as a primary surface, an "AI magic moment" as a requirement.
- Provider information appears only where privacy, consent or transparency need it (the consent step; Settings › What Kinship knows).

Priority order: (1) help the user remember what matters; (2) surface it when useful; (3) help them show up in the real relationship; (4) minimise the work to make that happen. AI serves these; it is never the goal.

---

## 4. The Quiet Herbarium (approved design principles)

> A well-kept herbarium in a quiet room: paper, ink, and one pressed sprig for each person you love. It knows a great deal and shows almost none of it. Most days the whole app is one sentence and one door out of it.

- **Typographic before graphic.** People are spoken about in a warm serif (Newsreader); the machine runs in a plain sans (Instrument Sans). Italic serif only for places and seasons.
- **No cards, badges, rings, counters, dashboards, glass or gradients.** Hairline rows, not boxes. One raised surface (sheets and the Tell field) with the one sheet shadow.
- **Tokens** (`src/design/tokens.ts` is the only source): paper, surface, ink, ink-quiet, hairline, ochre, ochre-text, brick (+ the board-drawn inkBody, rule, onInk). Night is the "night garden" set.
- **Type scale:** Display 34/38 · Name 40 · Moment 21/28 · Line 19/26 · Body 16/24 · Button 15/20 · Label 11 caps +14% · Provenance 12/16.
- **Space:** 4 8 12 16 20 26 34 48 64; **26 pt screen gutter**; sections separated by space, never boxes.
- **Radius by role:** pills = h/2; inline surfaces 14–18; sheets 28; photos 10.
- **Ochre marks only two things:** something understood (underline/provenance dot) and something you said you'd do.
- **Icons:** Lucide at 1.8 stroke, for functions only, always labelled.
- **Motion:** arrive 320 ms / 8 pt rise; understand 600 ms; sheets 360 ms spring, no overshoot. Reduce Motion → 150 ms fades.
- **The three signatures** (the "remove the logo" test): a single warm serif line about a person by name on nearly empty paper; a hairline pressed sprig beside every person; ochre provenance under what Kinship understood. If a screen could belong to a notes app, a CRM or a wellness app once these are hidden, it is not finished.

Allowed reasons to deviate from an approved board: an explicit later founder decision; accessibility; a native platform requirement; a trust or grounding requirement. **"Easier to implement", "phase scheduling" and "later" without founder approval are not valid.** Every deviation is logged in `approved-design-coverage.md`.

---

## 5. Information architecture

**Primary destinations:** **Today** and **People**, a two-item bar in words.
**Always-available input:** **Tell**, pinned above the bar on Today and People, and on every relationship page.

Everything else is contextual and must stay reachable from the real flow:

| Surface | Reached from |
|---|---|
| Welcome / promise, sign-in, consent, people selection, already worth knowing, first Tell | First run (and resumable after a kill) |
| "Here's what I'll remember", clarification, Kept line + Undo | After a Tell |
| Relationship page ("portrait") | A People row, a Today moment, a quiet line |
| What Kinship knows about a person | The relationship page |
| Source (provenance) | One tap on any provenance line |
| Correction | A line on the page, a token in the review, What Kinship knows |
| Follow-up / hand-off sheet | A Today moment; Message / Call on the page |
| Return check, "Anything worth remembering?" | Today, after a hand-off |
| Add from contacts / Add by name | People (+, empty state), setup |
| Settings, What Kinship knows (app) | The People header |
| Your story together | The relationship page (deferred, §9) |
| Brief, Reconnect, Reflection, Ask | Later, in Today / People (deferred, §9) |

Not destinations: Garden, Landscape, Activity, Garden Walk, Seasons, Reach Out, Quick Notes, Check-ins, a notification archive.

---

## 6. Founder overrides in force

| Override | Supersedes | Effect |
|---|---|---|
| **Sprigs are identity-only in V1** (D8) | Design Direction "a leaf for each shared moment, a bud for coming up, a flower for a milestone" | History never makes a sprig larger, taller, fuller, brighter, healthier or more mature. `sprig_marks` stays OFF. The CI area test stays permanently |
| **Garden / Landscape are not destinations** (D7, plan §34) | Board 3's List/Garden toggle and season plate | Future hypotheses only, behind a design checkpoint |
| **People is search-first and alphabetical** (T4) | "Sorted by recent relevance" | No importance, neglect, health or closeness ordering |
| **Trust-required memory needs a yes** (§8, D1 trust checks) | "Auto-dismiss if untouched" for everything | Sensitive or genuinely ambiguous readings are not memory until the user confirms. Friction is never reduced by guessing identity, sensitive meaning, ambiguous dates or protected edits |
| **Account before first Tell** (D1) | "Account created only when sync is chosen" | Sign in with Apple primary; Google/email secondary; no anonymous path |
| **Consent is explicit, server-side, once** (D2, D3) | — | The approved D2 sentence appears in the consent step and in Settings |
| **No calendar in V1 onboarding** (T7, D6) | Board 1 "You're seeing David on Thursday" | "Already worth knowing" uses contact birthdays only |
| **Accurate contacts copy** (T8) | Board 1 "Nothing leaves it until you choose" | "Kinship reads contacts on this phone. Only the people you pick are saved." |
| **No "nothing is kept" claim without ZDR** (T9, D2) | Board 3 Privacy copy | "Sent to Anthropic to understand it; not used to train models." |
| **Night prompt only after a signal** (T6) | "After 8 pm Today leads with 'Anything worth remembering?'" | Asked after a hand-off "Yes" (built), or a planned encounter (later) |
| **A hand-off alone never counts** (T12) | — | Only "Yes" to the return check records contact |
| **Onboarding must not be deferred** (recovery brief, 5 Oct 2026) | `docs/phase2/quiet-herbarium-build.md` §6 decision to defer promise/onboarding | The wife-critical portion of E16 is built now |

---

## 7. Trust invariants (never traded for fewer taps)

1. A memory item exists only with a source (DB constraint + gateway).
2. Sensitive classes (health, death, pregnancy, conflict, money) always confirm.
3. Two candidate people → one question; never a guess.
4. The user's edit wins; re-extraction never overrides it.
5. Copy is grounded: only entities and dates in evidence; no invented details.
6. Only the people the user picks are saved; the address book never leaves the phone. Numbers are read on the device at tap time and never stored.
7. Kinship never sends anything. Opening a channel is not contact.
8. No user content in logs or analytics.
9. No fake people, memories, events or reasons in a real account. Fixtures live in the lab and tests only.
10. D13: remembered and paused people get no proactive reasons (including birthdays), and only the user sets those states.

---

## 8. First use is not a quiet day

Two different states, decided in the state model, never confused:

| State | When | What the user sees |
|---|---|---|
| **Setup** | Signed in, setup not finished on this account and no people/notes on the server | The setup flow (consent → people → already worth knowing + first Tell). Resumes where it stopped after a kill |
| **First use** (activating) | Setup done, but nothing told yet | Today orients: what Today is for, and one obvious next action (tell one thing; add people if none). A real birthday or reason still takes the moment |
| **Mature quiet day** | The user has people and has told Kinship things, and nothing reaches the threshold | "Nothing needs you today." — beautiful and correct |

A regression that routes a new account straight into an empty Today and an empty People fails the fresh-install gate (§10).

---

## 9. Approved-design coverage and deferrals

`docs/product/approved-design-coverage.md` lists every approved screen and supporting state with status BUILT / PARTIAL / NOT BUILT / INTENTIONALLY DEFERRED. **No approved surface may disappear silently.** A surface leaves the build only as INTENTIONALLY DEFERRED with a reason and a founder-approval column.

May remain later if the core experience is complete without them (each listed in the coverage doc): Garden / Relationship Landscape; monthly Reflection; Reconnect; Ask Kinship; calendar Briefs; Siri; Action Button; widgets; share sheet; full on-device voice; subscriptions; Intentions; Opportunity Engine; Your story together (until there is enough history to be worth it).

**No broken affordances.** A deferred feature has no button, mic, link or placeholder pointing at it. Voice: no microphone appears until on-device voice exists (D5); keyboard dictation is not called "voice".

---

## 10. Phase/build sequence and the current dogfood gate

The plan's sequence (Phase 0 trust → Phase 1 foundations → Phase 2 slice → Phase 3 core loop → alpha → beta → Phase 6 by evidence) still governs the **backend and engine** order. It does **not** govern what a dogfood user meets on first open: every step of the first-session journey below must be present and coherent before any outside user (including the founder's wife) receives a build.

### The wife-dogfood minimum complete product

```
fresh install → promise → sign in → consent → choose real people
→ immediate useful context where available (birthdays) → first Tell
→ understood and remembered → correction/clarification only if needed
→ populated People → relationship page → Today → provenance/source
→ correction → a later useful reason → real-world hand-off → return check
```

### Readiness labels (the only ones used)

- **NOT READY**
- **READY FOR FOUNDER NATIVE PASS**
- **READY FOR WIFE DOGFOOD**

"Code complete", "tests green" and "browser screenshots look good" are not readiness states. Web lab renders are development tools; **the real iPhone is the authoritative environment.**

### Rollout sequence (fixed)

build → founder review → founder native pass → fix → founder approval → enable the wife's account only. Her user id is not requested before founder approval. Flags are never enabled globally; per-user overrides only, each with the founder's explicit yes.

### Permanent gates

- `app/__tests__/firstRun.test.tsx` (Jest, CI): a fresh account with no people and no notes lands in setup, never in Today/People.
- `.maestro/fresh-install.yaml` (device E2E): the full journey above. Run before every build handed to anyone.

---

## 11. Rules for changing the product plan

1. Read this contract and the coverage matrix before changing product or UI behaviour.
2. A change to what a user sees, in which order, or what Kinship says, must name the approved reference it implements or the founder decision that changes it.
3. Removing, deferring or replacing an approved surface requires an entry in the coverage matrix with a reason **and** founder approval. Until approved, the surface's status is NOT BUILT, not "deferred".
4. Stop and return to the founder when: canonical sources materially conflict; a wife-critical design cannot be implemented faithfully; a platform constraint forces a significant product change; contacts onboarding cannot meet privacy requirements; lowering friction would weaken trust or security; or a new major product decision is needed.
5. Merging is not approval. Before a merge, report implementation status, design coverage, native status, unresolved gaps, migrations, tests and readiness.
6. Judge every change as a first-time user, on an empty account, before calling it done. Screenshots of seeded accounts hide emptiness.
7. When this contract is wrong, change it in a PR the founder reviews; never route around it.
