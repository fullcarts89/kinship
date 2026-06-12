# Spec: Tending Seasons & Promises

**Status:** Draft for review — not yet scheduled
**Depends on:** Quick notes (shipped), AI insight layer (shipped), notification engine cadence rules (shipped), calendar engine (shipped)

---

## 1. Why this exists

Kinship currently helps people *notice* and *remember* their relationships. It does not yet help them *follow through*. The gap users feel is not "I forgot an event" — it's "I keep meaning to be better about Priya."

Two features close that gap, in order of size:

| Feature | One-liner | Size |
|---|---|---|
| **Promises** | One-shot commitments you made *to* a person ("I said I'd send the book link"), held and gently resurfaced | Small |
| **Tending Seasons** | Choose up to 5 people to intentionally invest in this season, each with a gentle rhythm | The marquee |

Both sit on the most dangerous fault line in the product: the PRD forbids reminders, obligations, and guilt — `validateNotificationCopy` literally rejects the word "remind." Every design decision below is shaped by that constraint. **The brand-safe thesis: people don't want to be nagged about obligations, but they feel *relief* when helped to keep their own stated intentions.**

---

## 2. Feature A — Promises

### 2.1 Concept

A promise is a single, concrete thing the user said they'd do for/with a specific person. It is *their own words held for them* — not a task the app assigned. It completes once (kept) or is let go (released). It never goes red, never counts up, never appears in a badge.

### 2.2 Data model

```ts
interface Promise {
  id: string;
  user_id: string;
  person_id: string;
  text: string;              // "Send Tom the book link"
  due_hint: string | null;   // free text: "after the wedding", or ISO date
  status: "open" | "kept" | "released";
  source: "manual" | "ai_suggested" | "post_reach_out";
  created_at: string;
  resolved_at: string | null;
}
```

- **Supabase:** migration `006_promises.sql` — table with RLS matching existing patterns; `status` CHECK constraint.
- **Mock mode:** localStore collection `promises` following the locallyCreated/tombstone pattern in the hooks.
- **Cap:** max 7 open promises per person silently enforced at creation (UI never shows the cap; oldest gets surfaced for resolve-or-release first).

### 2.3 Where promises come from

1. **Manual:** Quick Note screen gains a second save affordance: after typing, a small toggle/chip — "This is a promise I made" — saves to promises instead of notes. (Same screen, zero new flow.)
2. **Post-reach-out:** the existing capture bridge gains a third quiet option: "Did you promise them anything?" → one-field promise entry. Skippable, same visual weight as the existing skip.
3. **AI-suggested:** when a note or check-in note is saved and AI is configured, a lightweight extraction call classifies whether the text contains a commitment ("I told her I'd call after the wedding"). If yes (high confidence only), the save confirmation shows a gentle chip: *"Sounds like a promise — hold onto it?"* → Accept creates the promise; dismiss does nothing and is never re-asked for that text. **The AI never auto-creates.**

### 2.4 AI extraction spec

- New mode on the existing `ai-insight` edge function (`{ mode: "extract_promise", text, person_name, today }`) — same key, same transport rules, dev-path parity.
- Output schema: `{ is_promise: boolean, promise_text: string | null, due_hint: string | null }` via structured outputs.
- Prompt rules: only first-person commitments by the *user* ("I said I'd…", "need to send her…"); not things the other person promised; rewrite into short imperative form ("Send Tom the book link"); extract a due hint only when stated.
- Cost: runs once per note save, ~400 input / ~40 output tokens → ~$0.003 on Opus 4.8, ~$0.0005 on Haiku. Negligible.

### 2.5 Surfacing rules (the guilt firewall)

- **Person profile:** an open promise renders as a quiet card in the Context tab — "You wanted to: Send the book link" — with two actions: **Kept it** and **Let it go**. Never more than one promise visible at a time per person (oldest open first).
- **Suggestion engine:** open promises enter the waterfall at priority **95** (above post-event capture, below imminent birthday) — phrased as the promise itself: *"You wanted to send Tom the book link."* Due-hint dates make it eligible only after the hint.
- **AI insight:** open promises join the person context — the conversation starter can build on them ("btw, finally sending you that book link…").
- **Notifications:** promises ride the existing `contextual_nudge` budget (max 1/day, all types combined). Copy frames the promise, never the elapsed time. A promise generates at most **one** notification ever; after that it only surfaces in-app.
- **Kept** → optional one-tap "log it" creating a check-in; a warm toast ("Promise kept 🌿"); no points, no streaks (growth comes from the memory/reflection they'll capture anyway).
- **Released** → vanishes with zero commentary. Copy on the action: "Let it go." Nothing is ever said about it again.

### 2.6 Hard rules

- No count of open promises anywhere. No list view of "all promises" in v1 (profile-only).
- A promise is never described with elapsed time ("from 3 weeks ago").
- `validateNotificationCopy` gains banned patterns: "you promised" (accusatory framing — use "you wanted to"), "still haven't".

---

## 3. Feature B — Tending Seasons

### 3.1 Concept

At any time, the user may begin a **season**: choosing up to **5 people** to intentionally tend for ~3 months, each with a **rhythm** (a soft cadence, not a deadline). Tended people get priority across every existing surface. At season's end, a warm retrospective and an invitation to renew, rotate, or rest.

Scarcity is the feature: 5 forces a real choice, and a bounded term makes the commitment renegotiable instead of a standing debt.

### 3.2 Data model

```ts
interface Season {
  id: string;
  user_id: string;
  name: string;          // auto: "Summer 2026" (meteorological), editable
  starts_at: string;
  ends_at: string;       // default +92 days
  status: "active" | "completed";
  created_at: string;
}

interface SeasonCommitment {
  id: string;
  season_id: string;
  person_id: string;
  rhythm: "often" | "regularly" | "now_and_then";
  // often ≈ weekly · regularly ≈ every 2-3 weeks · now_and_then ≈ monthly
  created_at: string;
}
```

- One active season max. Migration `007_seasons.sql` (+ localStore collections for mock mode).
- Rhythms are deliberately named in human language, mapped internally to day-ranges (7±3, 17±5, 30±10). **The numeric cadence is never rendered.**

### 3.3 UX flows

**Begin a season** (entry: Garden tab header + a one-time gentle Home card):
1. *"Who are you tending this season?"* — pick up to 5 from the garden (selection UI mirrors select-person, multi-select).
2. Per person: *"How often feels right?"* — three rhythm chips with the human labels.
3. Confirmation: the five plants arranged in a small bed illustration — *"Your summer bed is planted."*

**During the season:**
- **Home:** "Your season" strip above the garden carousel — the 5 plants, slightly larger, each with its living plant. No status markers on them, ever. Tap → profile.
- **Suggestion engine:** a tended person whose rhythm window has opened enters the waterfall at priority **85** with copy generated by the AI layer when available (*"It's about the time you like to call Priya — her note says the bar exam was last week"*), heuristic otherwise. A rhythm that passes unmet **silently rolls** — the window simply reopens; no accumulation, no acknowledgment.
- **Garden walk:** strolls past the season bed first.
- **Weekly digest:** opens with the season's people; the forward-looking closing line draws from whoever's rhythm opens next week.
- **Notifications:** rhythm openings are `contextual_nudge`-eligible (1/day shared budget). Max **2 rhythm nudges per week total** regardless of how many rhythms open — a new cadence rule in `canSendNotification`.

**Season's end:**
- A **Season Retrospective** screen (reuses the season-recap card machinery): the 5 plants then vs. now, memories captured with them, one AI-written warm reflection paragraph. Shareable as an image like the existing recap.
- Then one question: *"Begin a new season?"* → keep all / swap some / rest (no season). Resting is presented as equally valid: *"Gardens rest too."*

**Mid-season edits:** swap a person or change a rhythm anytime from the season strip's quiet edit affordance. No history of changes is shown.

### 3.4 Calendar integration (opt-in, per layer)

- **Concrete plans** (out of scope for season v1, natural v2): "dinner Thursday" written as a real device-calendar event via existing write permission; calendarEngine read-back already powers post-event capture.
- **Rhythms are NOT written to the calendar by default.** A single opt-in setting — *"Echo my season to my calendar"* — writes one all-day, free-time event per rhythm window ("🌱 A good week to reach out to Priya"). Off by default; the recurring-block graveyard is exactly the failure mode this product exists to avoid.

### 3.5 Hard rules (the trap, enforced)

1. No surface ever shows missed/met counts, percentages, or completion states for rhythms.
2. Rhythm windows roll silently. The app behaves as if an unmet window never existed.
3. Season-end retrospective reports only what *happened* (memories, moments) — never what didn't.
4. The season strip's plants are visually identical to garden plants (vitality rules apply as everywhere) — being tended confers attention, not judgment.
5. Copy validator additions: "commitment", "overdue", "missed", "behind" banned from notifications.
6. If the user does nothing all season, the retrospective still finds the true warm thing to say, or says less — it never manufactures positivity about absence, and never names the absence.

---

## 4. Build phasing

| Phase | Scope | Why first |
|---|---|---|
| **1. Promises (manual + post-reach-out)** | Type, migration, hooks, quick-note toggle, bridge option, profile card, suggestion tier | Smallest piece; the cleanest test of whether intention-keeping feels right in this brand |
| **2. AI promise detection** | Extraction mode on edge function, suggest-chip on note save | Rides Phase 1 + existing AI plumbing |
| **3. Seasons core** | Types, migrations, setup flow, Home strip, suggestion/digest/walk integration, silent rhythm engine | The marquee |
| **4. Season close + extras** | Retrospective screen + share card, renewal flow, calendar echoes opt-in | Needs a season's worth of data to test honestly |

Each phase ships independently; nothing in 3–4 blocks on 2.

---

## 5. Open questions (need product decisions)

1. **Growth interplay:** should keeping a promise or honoring a rhythm grant growth points? Current lean: **no** — growth stays earned by memories/reflections only, so the new mechanics can't be gamed and the garden stays honest.
2. **Season length:** fixed ~92 days vs. user-pickable (1/2/3 months)? Lean: fixed for v1 — fewer decisions, true to "seasons."
3. **Free vs. paid:** DECIDED (2026-06-12) — Seasons ships free for now and is reserved as the likely paid tier later; the app overall may become a cheap subscription. Build with no paywall, but keep Seasons cleanly separable.
4. **Rhythm nudge channel:** in-app only for v1, or notifications from day one? Lean: in-app + digest first, notifications in a fast-follow once tone is validated.

---

## 6. Cost footprint (AI surfaces)

| Call | Trigger | ~Tokens (in/out) | Opus 4.8 | Haiku 4.5 |
|---|---|---|---|---|
| Promise extraction | per note save | 400 / 40 | $0.003 | $0.0005 |
| Rhythm-opening insight | reuses existing insight cache | — | already costed | — |
| Season retrospective | 1× per season | 2,500 / 400 | $0.023 | $0.0045 |

Marginal monthly cost per engaged user: under a cent on Haiku, a few cents on Opus.
