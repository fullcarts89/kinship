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

**Never a moment:**
- sensitive events (a person's health, loss). A pet's vet visit or health is not a person's health (founder J9, 8 Oct): it takes part in Today like anything else, also a line kept as "health" before the pipeline's pet rule (G43);
- events about a relative ("Priya's mom is visiting");
- coarse dates ("next week", "in the spring");
- plans, promises, facts, threads;
- paused or remembered people;
- anything dismissed ("Not now"), acted on, or done.

## Quiet lines (at most two, never the moment's person)

| Line | Comes from | When |
|---|---|---|
| **A question** | A note waiting on the user's answer ("Which Sam?") | Until answered; takes the first line |
| **Kept** | A note understood while she was elsewhere, not yet looked at | Instead of the question line |
| **Coming up** | An exact-day event or plan, or a birthday with a source | 1–7 days ahead; "Tomorrow" / weekday label; one per person; soonest first |

## The return check (replaces nothing; sits above the moment)

- **"Did you reach Ben?" Yes · Not yet:** only 10 minutes to 12 hours after Kinship opened Messages, Phone, FaceTime or WhatsApp **from a Today moment** (its follow-up sheet). Message and Call on a relationship page open the channel but never ask afterwards.
- **Yes** records a contact and offers "Anything worth remembering about Ben?", which opens Tell about him. **Not yet** lets the reason speak again. No answer records nothing, ever.
- A birthday's "Yes" is recorded as a user-confirmed contact without a reason id (birthday moments are computed on the phone; see `wife-dogfood-final-review.md`).

## Relationship-page only (never Today, today)

These appear only on the relationship page and What Kinship knows:
- facts and open threads;
- promises, until promise reasons (RSN-06);
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
