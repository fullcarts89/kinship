# Today: what can appear, and why (current rules)

These are the deterministic rules as built, with no strategy change. Sources:
- `supabase/migrations/20261005090000_v2_reasons_v0.sql`: server candidates for events.
- `src/features/today/todayModel.ts`: selection, birthdays, quiet lines, return check, first use.
- `supabase/functions/_shared/extraction/pipeline.ts`: `FOLLOWUP_POLICY`, the follow-up policy per event type.

No model decides anything here. Nothing scores a relationship, ranks people, or detects "neglect". Elapsed time alone never makes a reason.

## Primary moment (at most one)

A candidate becomes the moment only if its score is **≥ 55**. Score = base weight × timeliness × evidence × freshness.
- Highest score wins; ties go to the lower id.
- One primary per person per 7 days.
- Nothing ≥ 55 means no moment.

| Candidate | Comes from | When | Base | Copy (templates and the user's own words only) |
|---|---|---|---|---|
| **Event follow-up** | Event: active, about the person (not a relative), **exact day**, sensitivity none, person active, follow-up policy `after`/`both` | Day after it ends (race, interview, exam, birth, funeral…); 3–7 days after a move, job start or school start; up to 3 days after a trip | 90 | "How did it go for Ben?" · "Ben runs Chicago Sunday · Sun, Oct 11" · **Ask how it went** |
| **Upcoming event** | Same, policy `before`/`both` | Day before; 2–3 days before a celebration or wedding | 85 | the event's statement · "Tomorrow · Sun, Oct 11" · **Message Ben** |
| **Birthday** | `people.birthday` with a known source (Contacts, a note, the user's edit); person active | The day itself | 80 | "It's Maya's birthday." · From Contacts · **Message Maya** |
| **Milestone** (founder H16, 8 Oct) | An engagement, wedding, new job, promotion, baby, graduation, new home, retirement or move, **named outright** in the user's own words (the note's quotes, and the kept line) with a **day-precise date**; stated outright or planned, never a maybe, a wish or hearsay ("I heard…"); about the person or shared with them, never a relative's; person active. A residence that changed is never a move | From 3 days before through the day | 80 | the line in the user's words · "Thursday · Thu, Oct 15" · **Message Anthony**; afterwards "Did you reach Anthony about the wedding?" |
| **Good news** | A fact, milestone, event or moment that says it outright ("promoted", "got the job", "had the baby"…), about the person; no negation | Its day, to the day, and up to 2 days after; with **no date at all**, the day it was told. A month or a year ("promoted in 2024") is never today's news (N7, 8 Oct) | 75 | the line · "Yesterday" · **Congratulate Ben** |
| **A promise of yours** (RSN-06; CC-25 "Commit next", authorised by FD-30e, 30 Oct; WS-3) | A promise the user made (kind promise, subject user), active, sensitivity none, person active, with a **day-precise due date**. Undated, or a month or a year: never (it stays "You said you'd" on the page) | **Its due day**; and, if still open, **once more on one day in days 3–5 after** (never daily, never before, never after). Not once the user reached them about it on or after its day (a confirmed conversation, any phone), kept it (a Yes), or put it aside ("Not now", "Didn't happen") | 74 | "You said you'd bring Sam soup." · "Today · Sun, Nov 1" (later: the day it was for) · **Message Sam**; the return check asks the promise itself, "Did you bring Sam soup?": **Yes** records the conversation and keeps the promise (it leaves "You said you'd"; What Kinship knows keeps it as written); **Not yet** nothing; **Didn't happen** puts it aside, nothing recorded, no judgement. Nothing more is asked after a Yes (a promise's logistics, I2). Never "overdue", "still haven't" or a count |
| **An open thread** (RSN-07; CC-25, FD-30e; WS-3) | A thread (kind thread), the person's own (never a relative's), active, sensitivity none **and no sensitive wording** (health, grief, conflict, money: hard times are RSN-09, Alpha), person active. A month or a season as its date: never (remembered quietly, like a milestone without a day) | **Once.** With its own exact day: the day after, for three days ("Mina has a job interview Saturday" asks on Sunday). With no date: **42 days after it was told** (`THREAD_FOLLOWUP_DAYS`, the pipeline's own number carried on the line as `followup_after_days`), for three days. Freshness halves it after its first day, so it never comes back; a thread something later answered (resolved) never asks; a replaced thread is a new line with its own window | 65 | "Did Felix decide?" (a decision still open: consider, whether, might…) or "Any news from Mina?" · the thread in the user's words (with its day when it has one) · **Ask Felix**; return check "Did you ask Felix about it?", then the optional "Anything worth remembering?" (what they said may be the thread's answer, a Tell away) |
| **A first day** | A job or school start, about the person, exact day | The day itself | 70 | the line · "Today · Mon, Oct 12" · **Message Josh** |

**Follow-up policy by event type** (deterministic, never the model's call):
- race, move, trip, birth, funeral, job_start, school_start → after only;
- surgery, medical, exam, interview, wedding, celebration → both;
- other → none.

**So Ben's race produces no day-before or day-of moment, only the day-after "How did it go for Ben?"** The "See how it works" example shows exactly that.

**Multipliers:**
- **Timeliness:** 1.0 on the window's first day, then −0.15 a day, floor 0.6.
- **Evidence (certainty):** stated 1.0 · planned 0.9 · tentative 0.7 · reported 0.6 · wished 0.5.
- **Evidence (review):** confirmed, edited or user-written 1.0 · unreviewed 0.85.
- **Freshness:** 0.5 once it was shown on an earlier day.

**Once:** a moment worked out on the phone (birthday, milestone, good news, a first day, a thread) speaks on the first day it wins; freshness halves it after that (below 55), and the person cap holds others for the week. A promise is the one exception, by design: its second window (days 3–5 after its day) is the same reason spoken once more, not a new one, so the person cap doesn't hold it against itself; put aside or kept on its day, it never comes back. Nothing asks for a missing date: an undated milestone or promise is remembered quietly.

**Never a moment:**
- sensitive events (a person's health, loss). A pet's vet visit or health is not a person's health (founder J9, 8 Oct): it takes part in Today like anything else, also a line kept as "health" before the pipeline's pet rule (G43);
- events about a relative ("Priya's mom is visiting");
- coarse dates ("next week", "in the spring");
- plans and facts; a promise or a thread outside the rules above (undated, coarse, someone else's, a relative's, sensitive);
- paused or remembered people;
- anything dismissed ("Not now", "Didn't happen"), acted on, or done.

## Quiet lines (at most two, never the moment's person)

| Line | Comes from | When |
|---|---|---|
| **A question** | A note waiting on the user's answer ("Which Sam?") | Until answered; takes the first line |
| **Kept** | A note understood while she was elsewhere, not yet looked at | Instead of the question line |
| **Coming up** | An exact-day event or plan, a promise falling due (the user's own, or someone else's to the user), or a birthday with a source | 1–7 days ahead (a promise from its due day); "Tomorrow" / weekday label; soonest first; three, then "and N more" |
| **Waiting on Josh** | Someone's promise to the user, 1–3 days past its day (a day-precise due date only; a month or a year never) | "Did Josh send it?". Gone once the user has acted on it: handed off from it (the return question asks instead), answered Yes (on any phone: the synced conversation counts), or put it aside (founder K3). Never "overdue", "late" or a count of days |

## The Moment detail (founder I1, 8 Oct)

Tapping the moment's words, a Coming up line or a "Waiting on …" line opens its detail:
- the memory in the user's words;
- why now, one fixed sentence from its day ("It was yesterday.", "It's on Thursday.", "It's due on Friday.", "You told Kinship today."; a promise: "It's due today." / "It was due on Sunday."; a thread: "You told Kinship on Sun, Sep 20." / "It was yesterday.");
- when, and its source;
- **Message** · **Call** (straight to the channel when the contact has it, otherwise the hand-off sheet);
- **one quiet "You could…" line** beneath them when a context fits (SUA-1, below), a suggestion in small type, never a second primary action;
- **View <Person>**, which lands on that line on their page, or in What Kinship knows when the page doesn't show it.

It shows only what Today already had: no ids, scores or ranking. It's rebuilt from Today's current state each time, so a retracted or replaced memory closes it.

## The return check (replaces nothing; sits above the moment)

- **"Did you reach Ben?" Yes · Not yet:** from the moment the user is back, for up to three days, after Kinship opened Messages, Phone, FaceTime or WhatsApp **from a Today moment, or from a Coming up or Waiting line's detail** (its question carries the reason: "Did you reach Anthony about the wedding?"), **or from a person's page** (founder K23, K28): with something to act on, the same reason as Today's line about it; with nothing to act on, the page's own "Did you reach Susan?", which is not a reason and makes no Moment (CC-26).
- **Yes** records one conversation (founder I2): what it was about (the memory) and which kind of Moment led to it, a return check either way; a Moment made on the phone (a birthday, good news, a milestone, a promise, a thread, a Coming up or Waiting line) carries its kind instead of a server reason (it used to be recorded as "manual"). An answer counts once, however often it is tapped. The reason is done, and a Waiting line it came from doesn't keep asking (K3). A Yes to a promise's own question keeps the promise (RSN-06).
- **Didn't happen** (a promise's return check only, RSN-06): nothing is recorded, the promise is put aside as "Not now" puts it aside, and it stays "You said you'd" on the page.
- Then, optionally and never blocking, "Anything worth remembering from talking with Ben?" (it opens Tell about him), **except** after a Yes to "Waiting on …" or to a Coming up promise falling due (anyone's): those are logistics (I2). "Nothing" changes nothing: the conversation still happened.
- The conversation is dated when Kinship opened Messages or Phone, not when the question was answered. While a return question about a promise is open, its "Waiting on …" line doesn't ask the same thing.
- A hand-off that never opened the other app records nothing and counts as "Not yet". "Not this" on a recorded conversation (What Kinship knows, asked first) lets a "Waiting on …" it answered ask again.
- **Not yet** records nothing and lets the reason speak again while its window lasts: at once on this phone, and after a sync too, whatever the server last said (founder N6; the server puts an acted reason back to surfaced in its window). Done, put aside, expired and suppressed reasons never reopen. No answer records nothing, ever.

## The suggestion line (SUA-1; CC-28's first probe, authorised as a limited non-commercial prototype by FD-30d, 30 Oct; WS-3)

Beneath Message and Call on the hand-off sheet and in the Moment detail, **at most one** quiet fixed-template "You could…" line (`src/features/today/suggestions.ts`, `SUGGESTION_COPY`: **copy is a proposal for the founder**). Deterministic, from the person's current lines by the same preference "You could mention" uses; what the hand-off is about decides first, else the nearest day. Nothing proactive changes: it appears only once the user has chosen to reach out (CC-28 §C).

| Context (from the person's current lines) | Kind | Line |
|---|---|---|
| A milestone or celebration still ahead (wedding, engagement, graduation, retirement, promotion, new job) | plan | "You could invite them to dinner." |
| A move, a new home or a baby ahead | help | "You could offer to help." |
| An event of theirs ahead (tomorrow or later) that the user knows about | company | "You could ask if they'd like company." |
| Good news, recent | note | "You could send a note." |
| An interest of theirs (a fact of category interest/preference whose value is in the note's own words), **only when the hand-off is about a shared plan** | activity | "You could suggest doing pottery together." |
| An open promise of the user's own | — | nothing: the promise is the action |

Excluded: any sensitive line (by label or wording), a relative's line, anyone remembered or paused, anything retracted, superseded, expired or no longer current. A tap opens the same hand-off into Messages with nothing pre-written (D9); never a shop or a provider. The three layers stay apart in data: what Kinship suggested (`gesture_shown`), what the user initiated (`gesture_tapped`; the kind travels with the hand-off, nothing else), and what they confirmed (the return check's Yes, then one optional content-free question, "Did you make a plan?" Yes · Not yet, `gesture_outcome`); never counted back to the user.

## The notification (CC-25 item 3, the minimal private push, authorised by FD-30e; WS-3)

One private local notification of **the Moment Today already selected**, scheduled on the phone (`src/lib/momentNotification.ts`; expo-notifications, no server push):
- **what:** Today's own selection, run for the next delivery hour (09:00 local: today if still ahead, else tomorrow), so the notification never promises what Today won't show. Remembered and paused people never make a Moment, so never a notification;
- **content:** "Kinship" · "Something worth knowing about Ben today." Never the memory, never a detail; a kind whose person should stay off the lock screen gets no name (none makes a Moment today; the door is there for RSN-09). A tap opens Today;
- **budget (D4 the ceiling):** at most one a day; ≤ 3 in any 7 days; ≤ 2 time-sensitive (a day-bound Moment: a birthday, an event ahead, a milestone, a promise, a first day); quiet hours 21:00–08:00; **back-off** for 7 days once the last two delivered were both put aside ("Not now") and none acted on; a global pause in Settings ("Notifications: On / Paused", `user_settings.push_enabled`);
- **permission:** asked once, only after a genuinely useful Moment (the first Yes to a return check, or the first Moment acted on), never for inactivity, never a generic "come back"; refused, iOS Settings is the way back (turning the setting on asks again when iOS allows);
- **idempotent:** the device records what it scheduled, content-free (a day, a reason id, a kind), and re-plans on open, focus and background: the same Moment is kept, another replaces it, a quiet day cancels it.

## Relationship-page only (never Today, today)

These appear only on the relationship page and What Kinship knows:
- facts, and threads outside their one window (RSN-07);
- promises outside their day and second window (RSN-06), and undated ones always;
- plans and seasonal plans (RSN-08);
- shared context, traditions, moments;
- sensitive events (hard-time rules, RSN-09), never a pet's vet visit (J9);
- events about relatives;
- events with coarse dates;
- "a year ago" (RSN-10, not built).

## When Today has no moment

| Account | Today says |
|---|---|
| No people, or nothing told yet (first use) | "This is where Kinship brings things back." + one next step |
| In use, nothing reaches 55 | "Nothing needs you today." |
