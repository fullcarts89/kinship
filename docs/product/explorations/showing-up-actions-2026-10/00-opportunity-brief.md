# Showing-Up Actions: opportunity brief

**Status: STRATEGY EXPLORATION · NO BUILD AUTHORISED.** Canonical basis: `KINSHIP_2_DECISIONS.md` CC-28 (the thesis), CC-25 (the roadmap buckets), CC-26 (the two assistance thresholds), the product contract, `today-eligibility.md`, `relationship-page-rules.md`. Everything proposed here is a hypothesis for the founder; the register of what is approved, recommended and unresolved is `02-founder-decisions.md`. Written 18 Oct 2026.

---

## 1. The strategic opportunity

Kinship's loop today ends in a real conversation: a grounded Moment, a door into Messages or Phone, a return check, an optional memory. That is the right first loop and it is kept whole. But the thing the product is for, *showing up*, is wider than talking. The friend who felt remembered is also the friend who got dinner after a brutal week, the couple whose wedding you came to, the one you took to the show because you remembered the band, the one you introduced to someone they needed to meet, the one you actually sent the contractor's number to.

The opportunity: **Kinship already holds the one thing none of the tools people use for these actions have, a private, sourced memory of what matters to this person.** Calendar apps know when; gifting sites know what sells; event apps know what's on; Meal Train knows who signed up for Tuesday. None of them knows that Chris loves The National, that Susan is marrying Pedro this fall, that Ben has been driving to Sacramento every weekend. Kinship does, in the user's own words, with a source. Turning that memory into a meaningful, user-chosen action is a different product from a reminder, a shop or a concierge, and it is the product the founder has described.

The opportunity is not "add gifts and events to Kinship". It is: **when the user decides to show up for someone, Kinship makes the thoughtful version of that easy, grounded in what they already told it, without ever deciding for them, nagging them, or selling to them.**

## 2. The expanded taxonomy of showing up

| Way | What it looks like | Where Kinship already touches it | What the user needs |
|---|---|---|---|
| **Presence** | Dinner, coffee, a visit, a celebration attended, time together | The return check's *In person* ("You saw Tyler"); a plan or event about the person on the page and in Coming up | A nudge to make the plan when there is a real reason; the plan remembered |
| **Thoughtfulness** | A note, a card, flowers, a gift that fits; recognising an achievement | Good news and milestone Moments; "You could mention" (K26); What Kinship knows holds the preferences | The preference brought back when it is useful; one easy thoughtful option |
| **Practical care** | A meal, a ride, childcare, help with a move, support in a hard period | Sensitive lines confirmed and kept; hard-time reasons (RSN-09) in Alpha direction | Knowing what would help and not having to guess; never being sold to |
| **Follow-through** | Doing what you said; checking back on an open question; following up after a big event | Promises ("You said you'd"), open threads, event follow-ups (built); promise and open-thread reasons (Commit next) | The promise brought back once, without guilt |
| **Shared experiences** | A concert, a game, a class, a trip, an outing tied to their interests | Interests are facts in memory; nothing acts on them | A grounded idea and a way to propose it |
| **Connecting people** | Introductions; bringing a group back together; coordinating a celebration | Nothing yet; chapters / groups are Explore later | Knowing who shares what, and an easy way to bring them together |
| **Staying connected** | Texting, calling, a letter, a check-in | The whole built loop | Unchanged |

These are categories for thinking. They are **not** seven surfaces. Most of them are served by the same few places (a Moment, its detail, the hand-off sheet, the person's page, later Ask) carrying one well-chosen action instead of only Message / Call.

## 3. Why memory makes the difference

1. **Grounding.** Every suggestion can be traced to something the user said. "You could ask how the wedding plans are going" exists only because the user told Kinship about the wedding. A gift idea that fits exists only because the user said Chris loves The National. This is the opposite of a recommendation engine, which starts from a catalogue.
2. **Timing without surveillance.** Kinship knows the day after the marathon and the week before the wedding from the user's own words, not from reading their messages or calendar. The two thresholds (CC-26) let it be strict about *proactive* timing and generous about *user-initiated* context.
3. **The user's voice.** Memory is kept in the user's words. A thoughtful action framed in those words ("you said you'd bring them dinner") feels like the user's own intention returning, not an app's agenda.
4. **Restraint.** Kinship's rules (silence beats a wrong detail; every statement has a source; nothing quantifies a relationship) are exactly the rules that keep "help me show up" from becoming "buy this now".
5. **The return.** The return check is already the place where the real world reports back. It can, with one more word, record a plan made or a meal brought as easily as a message sent.

## 4. Opportunity families, evaluated

Each family is judged on the ten questions the founder set. Severity of risk and size are judged against the smallest coherent Kinship.

### A. Thoughtful gestures (notes, cards, flowers, gifts, personalised celebrations)

| Question | Assessment |
|---|---|
| Relationship problem | "I want to do something for her, I don't know what, and the moment passes." The gesture that fits is the one that uses what you know |
| Why memory helps | The preference, the milestone and the day are already kept; a generic gift site knows none of them |
| Proactive or user-initiated | **User-initiated**, from a birthday, milestone or good-news Moment the user already has, or from the page. Never a proactive "send flowers" |
| Signals needed | A grounded occasion (a day-precise milestone, a birthday, good news) **or** the user's decision to act; a stated preference helps but is optional |
| Smallest expression | A fixed-template line under the primary action: "You could send a note." / "You could send something." Tapping the latter opens an external provider's page with **no personal data**, or copies nothing and just opens Messages. No catalogue in Kinship |
| Partner needed | No for a note or card (Messages, Mail, a copied line). Optional for flowers or a gift (an external hand-off). Not for the first version |
| What could go wrong | The app reads as a gift shop; a gesture suggested for the wrong person (sensitive line, a relative); an affiliate smell; the user feels caring costs money |
| Monetisation | Incidental: a possible affiliate or revenue share on a hand-off, later, disclosed. Never a reason the line appears |
| Cheapest test | The non-commercial line only, in Alpha, with an interview question; no provider |
| Evidence to invest further | Users tap the line and say it felt like Kinship helping, not selling; at least a few gestures reported as done in interviews; no "task list" feeling |

### B. Shared experiences (coffee, dinner, concerts, sports, classes, trips)

| Question | Assessment |
|---|---|
| Relationship problem | "We keep saying we should do something." Interests are known; plans are not made |
| Why memory helps | The interest is a fact Kinship kept ("Chris loves The National"); the shared past is a memory ("the Greek Theatre in 2024"). A plan suggested from those is personal by construction |
| Proactive or user-initiated | **User-initiated first** ("What could Chris and I do together?" from the page or Ask). Proactive only in the much later external-event experiment, with an explicit Intention, and never as the primary Moment |
| Signals needed | A kept interest or a shared memory; optionally a verified external listing (artist, city, date) fetched only after the user asks |
| Smallest expression | "You could make a plan." under the primary action; opens Messages. Later: Ask's suggestion mode lists the kept interests (retrieved) and one or two ideas (derived, labelled as such) |
| Partner needed | No for the plan. For listings, Ticketmaster's Discovery API (free key; §7) or a plain web link; a partnership is not needed for a hand-off |
| What could go wrong | Inventing a listing; implying Chris is free; sending Chris's name to a provider; a feed of events on Today; affiliate-driven "events near you" |
| Monetisation | Incidental (an affiliate hand-off later, disclosed). Never a reason to show an event |
| Cheapest test | The "make a plan" line, then an Ask question in Alpha with no external lookup |
| Evidence | Plans reported made; users say the ideas were theirs, just returned at the right time |

### C. Practical care (meals, childcare, moves, surgery, a hard week)

| Question | Assessment |
|---|---|
| Relationship problem | "I want to help and I don't want to intrude or guess." The most valuable and the most delicate way to show up |
| Why memory helps | Kinship knows the hard thing only because the user chose to tell it and confirmed it (sensitive classes always confirm). It can bring back *what* would help in the user's words ("Ben said the drives are the worst part") |
| Proactive or user-initiated | **User-initiated** from the page. Proactive only through hard-time reasons (RSN-09, Alpha, their own brief), never cheerful, lock screen private |
| Signals needed | A confirmed sensitive line; the user's decision to act. Nothing else; no external lookup, ever, for this family |
| Smallest expression | On the page or a hard-time Moment detail, one quiet disclosure: "Ways to help" → three fixed, non-commercial lines (bring a meal · offer a ride · just check in), each opening Messages. A user's "I'll bring dinner Thursday" becomes a promise (already works) |
| Partner needed | No. Meal Train is a coordination tool a *group* uses; a link to it is at most a user-initiated hand-off with nothing passed (§7). Never a default |
| What could go wrong | Hardship becomes a gifting or affiliate moment; a push with content; a suggestion to someone remembered or paused; "support" reads as a checklist; the wrong person's hard thing (a relative's) attributed to the person |
| Monetisation | **None.** CC-28 safeguard 9 forbids it |
| Cheapest test | Nothing new before RSN-09; interview the founder and the wife about what they did for someone in a hard time and whether Kinship could have helped without intruding |
| Evidence | Users say it helped them act kindly without being told what to feel; zero reports of it feeling commercial or clinical |

### D. Group connection (invitations, group dinners, celebrations, introductions)

| Question | Assessment |
|---|---|
| Relationship problem | Friendships that belonged to a chapter (college, Austin, the old team) fade because nobody convenes them |
| Why memory helps | Only if Kinship knows the chapter ("the Austin crew") and what the group shared. That needs chapters / life groups (CC-25, Explore later) first |
| Proactive or user-initiated | User-initiated, possibly gated by an Intention ("I want to bring the Austin crew back together") |
| Signals needed | A user-named group; a reason (a season, a tradition, a milestone one of them has); the user's decision |
| Smallest expression | From an Intention or a chapter, "You could get the Austin crew together." opening a group Message. Introductions: "Priya and Maya both love pottery" shown as two retrieved lines in Ask, with the introduction left to the user |
| Partner needed | No. Partiful has no public API (§7); an event link the user makes themselves can be a shared invitation (family E) |
| What could go wrong | AI-defined groups; a social graph; "who should you introduce" as a ranking; a hosting platform inside Kinship |
| Monetisation | None foreseeable that passes the test |
| Cheapest test | None until chapters exist; interview about convening |
| Evidence | A gathering that happened because a chapter and a reason were brought together |

### E. Event participation (attending, logistics, following up, supporting something that matters to a friend)

| Question | Assessment |
|---|---|
| Relationship problem | Forgetting to go, to RSVP, to follow up; missing the thing that mattered to them (the show, the race, the reading) |
| Why memory helps | Kinship already turns a day-precise event into the day-after follow-up ("How did it go for Ben?"). It can hold "I'm going" as the user's own plan and bring back the day before |
| Proactive or user-initiated | Both, within existing rules: a user-shared invitation or calendar event is **evidence**; Today's eligibility decides, unchanged |
| Signals needed | A day-precise event about the person (told, pasted from an invitation, or matched from the user's calendar later, D6). Never another person's calendar or attendance |
| Smallest expression | The user pastes or tells "Susan's wedding is Oct 24 in Sonoma" (works today); later, a shared invitation link or calendar match becomes a Coming up line with its source. The return check's *In person* records attendance only when the user says so |
| Partner needed | No. An RSVP stays on the host's platform; Kinship never RSVPs |
| What could go wrong | Treating an RSVP as attendance; inferring attendance from a calendar; scraping Partiful; a second notification class |
| Monetisation | None |
| Cheapest test | Already testable: tell Kinship about an event with a day; observe the day-before and day-after loop in dogfood |
| Evidence | Users say Kinship helped them be there, not just know about it |

### F. Meaningful follow-through (user-authored commitments and plans)

| Question | Assessment |
|---|---|
| Relationship problem | "I said I'd send it, I meant it, and three weeks passed." The gap between intention and action is the most common failure to show up |
| Why memory helps | Only Kinship knows the promise, because the user said it in a sentence. No calendar, no CRM |
| Proactive or user-initiated | **Proactive, already committed:** promise reasons (RSN-06) and open-thread reasons (RSN-07) are Commit next under CC-25, with the guilt firewall |
| Signals needed | A kept promise or thread with its window; nothing new |
| Smallest expression | What CC-25 already commits. CC-28 adds nothing here except the reading: a promise to *do* something (bring dinner, help with the move) is a showing-up action in itself, and "Kept it" is its outcome |
| Partner needed | No |
| What could go wrong | Accumulating overdue state; "you still haven't"; a task manager |
| Monetisation | None |
| Cheapest test | The committed build and the wife dogfood |
| Evidence | The showing-up metric, as approved |

### Ranked assessment

Ranked by relationship value and feasibility first; commercial potential second and shown separately.

| Rank | Family | Relationship value | Feasibility now | Depends on | Commercial potential | Verdict |
|---|---|---|---|---|---|---|
| 1 | **F. Follow-through** | Highest: the most human failure, uniquely Kinship's | High: committed next | RSN-06, RSN-07 | None | **Already committed (CC-25); no new work** |
| 2 | **B. Shared experiences** | High: turns kept interests into time together | High for the plan line; medium for Ask; low for listings | K26's mechanism; Ask v1; the external-event experiment much later | Incidental, later | **First probe candidate** (the plan line), then Ask's suggestion mode |
| 3 | **A. Thoughtful gestures** | High: the gesture that fits | High for a note; medium for a provider hand-off | K26's mechanism; a disclosed external hand-off later | Real but incidental; the main monetisation question lives here | **First probe candidate** (non-commercial lines); commerce deferred |
| 4 | **C. Practical care** | Highest when it lands; highest sensitivity | Medium: needs RSN-09's rules first | RSN-09 brief; Remembered / Paused | **None, by rule** | After hard-time reasons; non-commercial only |
| 5 | **E. Event participation** | Medium-high; mostly already served | High for told events; low for calendar / invitations | D6 trigger; a shared-invitation evidence design | None | Mostly built; evidence sources are Explore later |
| 6 | **D. Group connection** | High for a subset of users | Low: needs chapters | Chapters / life groups; Intentions | None | After chapters; no platform |

## 5. Reconciliation with the existing roadmap

| Existing item | What CC-28 changes | What it does not change |
|---|---|---|
| **Today and Moments** | Nothing now. Future: a Moment may carry one secondary action beneath the primary (progressive disclosure). Today never becomes a list of things to buy or do | Eligibility, ranking, one primary per person per week, the quiet lines, the quiet day |
| **Person Portrait** | Reading: the page is where user-initiated help starts (K26, K28 already do this). Future: *Ask about Priya →* (AR-4) could answer "what would be thoughtful" | Sections, limits, order by time only, no ranking |
| **Moment detail** | Reading: the likely home for a contextual alternative (make a plan · offer help · send something) as disclosure under Message / Call | I1's content: the memory, why now, when, source, View person |
| **Ask Kinship (Alpha)** | A later *suggestion mode* is named as a hypothesis; retrieved memory and a derived suggestion are shown as different things, never a suggestion as a fact | Ask v1 = grounded retrieval; one capability with `retrieval_answer`; never a chat |
| **Intentions (Later Alpha)** | An Intention may say which help the user wants ("I want to see the Austin crew in person this year"), not only which people matter | No dashboards, progress, overdue, imposed goals |
| **Opportunity Engine (§35)** | Preferred architecture named: grounded Today candidates + user-initiated contextual assistance + Intentions; **not a standalone engine** | External events stay a separate, later experiment |
| **Calendar and events (D6, §16)** | Calendar events and user-shared invitations are possible evidence sources. Availability never implies another person's availability, attendance or willingness | D6's timing and contextual permission; no calendar in onboarding |
| **Briefs and reconnect (§16, §17)** | A future brief may include ways to spend time, celebrate or support, under D9 | Brief and Reconnect stay INTENTIONALLY DEFERRED; rhythm held |
| **Showing-up measurement (§24)** | A future evolution recorded (§9 below) | The approved definition and its founder gate |
| **Subscriptions (D10)** | Reaffirmed as the primary model; commerce is downstream and optional (§8) | D10's hypotheses and the archive rule |

## 6. Three end-to-end journeys

Each shows the memory's source, the user's choice, the hand-off, and what Kinship can and cannot legitimately know afterwards. **Built** marks what exists on `main` today; **future** marks a hypothesis.

### Journey 1: Susan and Pedro's wedding

**Memory (built).** The user tells Kinship: "Susan is getting married to Pedro this fall." Understood as a milestone about Susan with a season, not a day; kept with the note as its source; Pedro offered as "Add Pedro" (H21). On Susan's page it sits under Coming up (while the season lasts; N18 notes it leaves after the season's first month, a logged rough edge).

**Why no proactive Moment (built, unchanged).** A milestone needs a day-precise date to be Today's Moment (`today-eligibility.md`). "This fall" is a coarse date, so Today is silent. That is correct: Kinship does not know when the wedding is, and it will not guess.

**User-initiated path (built).** The user opens Susan's page and taps Message. The hand-off sheet's "You could mention" shows the wedding line in the user's words and, beneath it, the fixed suggestion "You could ask how the wedding plans are going." (K26; copy a proposal). Messages opens. Back in Kinship: "Did you reach Susan?" (K28). **Yes** records one conversation; then "Anything worth remembering from talking with Susan?"

**What Kinship can know afterwards (built).** Only what the user confirms or tells it. It does not know the wedding was discussed. If the user answers the optional prompt with "Susan said it's October 24 in Sonoma, and I offered to help with the rehearsal dinner", two things can happen: when Kinship understands the later statement as the same milestone with a day (the existing supersession path, when it applies; otherwise a second, dated line), Today may surface it two to three days before as an upcoming event; and "help with the rehearsal dinner" becomes the user's own promise under You said you'd, which promise reasons (RSN-06, Commit next) will bring back once.

**Future, user-initiated (hypotheses, each needing a decision).**
- *Make a plan:* beneath "You could ask how…", a second fixed line, "You could invite Susan and Pedro to dinner." It opens Messages; nothing else. (The first-probe shape, `01-roadmap-options.md`.)
- *Offer help:* "You could offer to help." Same mechanism. A reply the user records as "I'll help with the rehearsal dinner" is a promise.
- *Attend:* the user's "I'm going to Susan's wedding Oct 24" is their own plan about Susan: Coming up the week before, a day-before Moment, and afterwards the return check's *In person* if the user says so. Kinship never infers attendance from a calendar or an RSVP.
- *Send something:* from the day-precise wedding Moment, "You could send something." opens an external gifting provider's page (Goody's address-free link flow or a registry URL the user pasted) with **nothing about Susan passed**; the user does everything there. Disclosed if there is any commercial relationship. Not before the founder's monetisation decision.

### Journey 2: Chris's music

**Memory (built).** "Chris loves The National." A fact, kept with its source; visible in What Kinship knows and, for 120 days, under Lately. A fact never makes a Moment, so Today is silent, correctly.

**User-initiated, today (built).** Opening Chris's page and tapping Message offers the fact under "You could mention" only when nothing more current competes (it ranks after what is going on or coming up).

**User-initiated, Alpha (hypothesis built on Ask v1).** From Chris's page, *Ask about Chris →*: "What could Chris and I do together?" Kinship shows **what it kept** ("Chris loves The National", "You and Chris saw them at the Greek Theatre in 2024"), each with its source, under a heading that says these are memories, and separately **one or two ideas** under a heading that says these are suggestions ("You could look for a show together."). It never writes a suggestion into memory and never presents one as something the user said.

**Looking outside (much later; the external-event experiment, its own privacy posture).** Only if the user taps "Look for shows" does Kinship query a listings source (Ticketmaster's Discovery API, free key, §7) with **the artist name and the user's region**, never Chris's name or anything about him. Results are shown as listings from that source, dated, with a link out. Kinship does not know whether a show exists until the query returns; this document invents none. The user proposes the plan in Messages; the return check asks "Did you reach Chris?"; a "We're going Nov 12" told afterwards is a shared plan Kinship can bring back the day before.

**Proactive (the strict threshold, for contrast).** Could Kinship ever say, unprompted, "The National play Oakland Nov 12. Good excuse to go with Chris?" Only under all of: an explicit Intention from the user that names Chris or shows together; a verified listing within a window in the user's region; the frequency budget; never as the primary Moment over a grounded memory; never for someone remembered or paused; and only after the founder decides the external-event experiment's permissions. None of that exists, and CC-28 does not authorise it. Without the Intention, Kinship searching the world for reasons to message Chris is exactly what §35 forbids.

**What Kinship cannot know.** Whether Chris is free, whether he still likes the band (the fact may be stale; its date is shown), whether they went. Only the user's return answer and what they tell it.

### Journey 3: meaningful practical support

**Memory (built).** "Ben's dad is in hospice. Ben's been driving to Sacramento every weekend and he's wrecked." Raised as sensitive (death / grief, health); **held until the user taps Remember** (trust invariant 2). Kept with its source. It appears under Lately on Ben's page. **Today never makes it a Moment** today (sensitive events are never a Moment; hard-time reasons, RSN-09, are Alpha direction with their own stricter brief). No push carries it. "You could mention" never offers it (K26 excludes sensitive lines).

**User-initiated, today (built).** The user opens Ben's page, reads the line, taps Message, writes their own words. "Did you reach Ben?" → Yes → the optional prompt. If they say "I told Ben I'd bring dinner Thursday", that is a promise: You said you'd · Bring Ben dinner Thursday; promise reasons will bring it back once, on its day, with no "still haven't".

**Future, user-initiated (hypothesis, after RSN-09's rules exist).** On Ben's page, beneath a sensitive line, one quiet disclosure: **Ways to help** → three fixed, non-commercial lines: *Bring a meal* · *Offer a ride* · *Just check in*. Each opens Messages with nothing pre-written (D9). Nothing opens a shop. No flowers, no gift, no affiliate link appears in this context, by rule (CC-28 safeguard 9). If the user wants to organise a meal rota with others, the most Kinship might do, on an explicit tap, is open Meal Train's site with **nothing passed**; it is never offered by default.

**Future, proactive (RSN-09, Alpha, its own brief).** "Ben's dad's surgery is Thursday" with a day could become a hard-time Moment the day before: never cheerful, the lock screen generic ("Something for today."), never a gift or an activity suggestion, with Message or Call only; at most one secondary, non-commercial line (*offer a ride*). Never for someone remembered or paused.

**Stricter controls, listed.** No external lookup of any kind for sensitive lines; nothing about the hard thing in a push body or to any provider; no suggestion of spending; no "support streak", "days since", or follow-up pressure; the user's "Nothing" is complete; a wrong attribution (Ben's *dad's* health shown as Ben's) is the gravest error, so relative-subject checks stay strict.

**What Kinship can know afterwards.** A Yes to "Did you reach Ben?"; a promise kept ("Kept it"); *In person* if the user visited and says so. Nothing else, ever.

## 7. External services as enablers, not strategy

Checked 18 Oct 2026. "Verified" means read on the provider's own pages; "third-party" means only directory or press sources were found and the figures are unverified. **No provider decides which experience exists. None is needed for the first probe.**

| Provider | Verified functionality | Feasibility | API / partnership uncertainty | Terms needing negotiation | Personal data | Hand-off vs embedded |
|---|---|---|---|---|---|---|
| **Goody** | Two developer APIs on its developer site: a **Commerce API** (catalogue, gift without an address: the recipient gets a link to accept, swap or choose options; orders to a known address; revenue share) and an **Automation API** (create one-to-one or bulk gifts, order status, webhooks). Free business account; a sandbox for test gifts; a payment method required in production | High for an external hand-off; medium for embedded use | The revenue share **requires an agreement** with Goody's business team before going live; not automatic | Revenue share; catalogue scope | Address-free gifting still needs a recipient name and a delivery channel (email or phone) at purchase time; by CC-28 rule 4 that is entered by the user on the provider's surface, never passed from memory by default | **Hand-off first** (open Goody with nothing passed). Embedded discovery only after the monetisation decision |
| **Partiful** | **No official public API or developer documentation found.** Third-party scrapers (Apify actors) read public event pages and undocumented JSON endpoints | Low for integration; high for user-shared links | Unofficial endpoints can change without notice; scraping is not an option Kinship would take | A partnership would be the only legitimate route; nothing to negotiate today | An event link the user pastes is the user's own data; attendee lists are other people's | **User-shared link only**: the user pastes an invitation; Kinship keeps the date and the host's name as the user's words. No RSVP, no guest data |
| **Ticketmaster** | **Discovery API** with a free developer key (registration: name, company, website, phone, email); default quota 2 requests/second and 5,000/day (the FAQ and the reference disagree on the per-second figure). An **affiliate programme** runs separately through Impact, per country, by application. Transactional ticketing needs the separate **Partner API** (approved partners only); affiliates link out and do not sell | High for a user-initiated lookup with a link out | Affiliate approval is not guaranteed; the Discovery Feed's access rules are inconsistently documented | Affiliate commission and cookie terms (third-party directories claim figures; unverified) | A lookup sends an artist or keyword and a region; **never a person's name** | **Hand-off** (a link to the listing). Never a ticket purchase inside Kinship |
| **UrbanStems** | A **customer referral** programme on its help centre ($20 for the referred person's first order and $20 for the referrer; not an affiliate programme). Affiliate listings exist only on third-party networks with inconsistent terms (one lists 1.6% and a 10-day cookie; another "up to 6%"; status shown as closed on one network and open on another) | High for a plain link; low for a programme | No first-party affiliate page found; which network, if any, is current is unknown | Everything | None if a plain link; an affiliate link carries a referral id only | **Plain hand-off** or nothing. Flowers are a gesture, not a channel; any provider is interchangeable |
| **Meal Train** | Free to organise; a page per recipient with dates, preferences, donations and gift cards, shared by private link; a **Plus** upgrade ($10 per page) adds several meals a day, childcare, errands, rides. **No public API found** | High as a link; none as an integration | None to negotiate; none needed | None | A Meal Train page holds the recipient's situation; Kinship passes nothing | **Hand-off only, on explicit request, never by default in a hard time** |
| **Calendar, Messages, Mail, native sharing** | Built in: Messages, Phone, FaceTime, WhatsApp, Mail hand-offs (§15). The share sheet and calendar are Explore later (CC-25) | Highest | None | None | The user's own | The right default for almost every action in §4: coordination through the tools people already use, with no new destination |

**Reading across the table.** The only provider whose capability materially exceeds a link is Goody, and that is the one family (gifts) where monetisation and trust collide hardest. Every family's first expression works with Messages and a plain link. **API availability does not decide which experience exists**, and the recommendation in §12 uses no provider at all.

## 8. Monetisation hypotheses and boundaries

D10 stands: Kinship becomes a paid subscription whose object is *Kinship actively remembering and helping you show up*. The question CC-28 raises is whether commerce should be a second, downstream revenue line, and at what cost to trust.

| Option | What it is | Fit with the value order | Trust conflict | Verdict (recommendation) |
|---|---|---|---|---|
| **Non-commercial relationship support** | Gesture lines, plans, ways to help, Ask's suggestions; all free of providers | Perfect: the action is the product | None | **First, and the only thing in the first probe** |
| **Premium subscription (D10)** | The ongoing service, possibly later including user-initiated suggestion help | Strong: the user pays Kinship to help them show up, not a partner to sell to them | Low, if no emotional gate (D10's rule) | **The primary model; unchanged** |
| **Affiliate referrals** (flowers, tickets, gifts) | A disclosed link with a referral id; commission on purchase | Acceptable only as fulfillment after a user-chosen action | Medium: a visible incentive to show the link; "recommendation engine" perception | **Defer** until after Alpha; if ever, only on a user-initiated hand-off, disclosed, with no effect on what surfaces |
| **Revenue share through a gifting platform** (Goody) | Embedded catalogue or deeper hand-off with a negotiated share | Same as affiliate, with more surface area | Medium-high: an embedded catalogue is a shop inside Kinship | **Defer**; a hand-off without share first, to learn whether anyone wants it |
| **Embedded commerce APIs** (checkout in Kinship) | Purchases completed in-app | Weak: the transaction becomes the product's end state | High: the app that remembers your friend's grief also takes card details | **Hold / drop** for the foreseeable future |
| **Experience-ticket referrals** | Links to listings matched to kept interests, with affiliate terms | Acceptable as a user-initiated hand-off | Medium: "events near you" pressure; the external-event privacy posture | **Defer** with the external-event experiment |

**The founder's concern, answered directly.** Kinship could be perceived as a monetised recommendation engine wearing a relationship companion's clothes. The perception is caused by three things: suggestions that appear without the user asking; suggestions whose presence is explained by revenue rather than memory; and commerce near vulnerability. CC-28's ten safeguards remove all three structurally: proactive surfacing never carries commerce; every suggestion is grounded in the user's words and the non-commercial action is always first; vulnerable contexts are never monetised. **Does commerce introduce a trust conflict strong enough to defer it entirely?** For now, yes: not because commerce is wrong, but because nothing in it is needed to prove the thesis, and the subscription already pays for the service. The recommendation is **defer all commerce past Alpha**, revisit with evidence from the non-commercial probe, and treat any later commerce as fulfillment the user walks to, never a reason Kinship speaks.

**An illustrative scenario, assumptions labelled.** Suppose 1,000 subscribers at D10's $4.99 hypothesis: about $4,990 a month. Suppose, generously, that 5% of those users send one $60 gift a month through a hand-off and that a negotiated share were 10% (**assumption: Goody's share needs an agreement; no public figure exists; affiliate rates found for flowers are third-party and range from 1.6% to 6%**): about $300 a month. At the scale where Kinship is being proven, commerce is incidental to subscription revenue by more than an order of magnitude, and it carries the larger trust risk. That asymmetry is the strategic argument for deferral, independent of the ethics.

## 9. Measurement: broaden outcomes without a CRM

**The approved metric (§24) is unchanged**, including its founder gate: a showing-up moment is a surfaced reason followed within 72 hours by a Yes, a Done, or a capture about the person that includes a moment or contact.

**Three things to keep apart in any future measurement:**

| Layer | Question | Evidence that counts | Evidence that never counts |
|---|---|---|---|
| **Relationship outcome** | Did the user do something meaningful for another person? | The user's confirmation: Yes to the return check (any channel, including In person); "Kept it" on a promise; a later confirmation of a plan made or help given | An opened link, an opened Messages, an RSVP, a suggestion shown, a purchase |
| **Action assistance** | Did Kinship materially help choose or carry it out? | A content-free event: which kind of line was shown and tapped (an enum), and whether an outcome followed | Anything about the content; any score |
| **Commercial transaction** | Did an optional purchase occur? | A provider's confirmation, if a relationship exists and the user consented to the report | Attribution of relationship value to the purchase |

**Two stages, kept apart.** The first probe (SUA-1) can only show whether a suggestion is welcome and used. Whether the suggested action happened is learned later, from the user's own confirmation and interviews, never inferred from a tap. **The minimum evidence to learn whether expanded actions are useful:** (1) a `gesture_shown` / `gesture_tapped` analytics event with `kind` as a closed enum (plan · help · note · something), content-free under F0-D4; (2) the existing return check, unchanged, with its channel list already including In person; (3) **optionally**, after a Yes that followed a gesture tap, one more optional question in the same breath ("Did you make a plan?" Yes · Not yet), never more than one tap, never required; (4) interviews. No activity tracking, no verification burden, no history maintenance. A user who answers nothing is counted as nothing.

**What a future metric change would need:** its own founder decision; the same content-free rules; no user-facing count, frequency, score or "people neglected"; and a reason to believe the qualifying action is real (the user said so), not inferred.

## 10. Trust and privacy requirements (for any capability under CC-28)

1. The ten safeguards in CC-28 §D, verbatim, as acceptance criteria.
2. The proactive threshold (`today-eligibility.md`) is never loosened by an action; an action rides on a Moment that already qualified.
3. Sensitive lines: no external lookup, no commercial line, no content in a push, ever. Hard-time copy by RSN-09's brief only.
4. Remembered and paused people: no proactive action, and no suggestion on their page until the Remembered / Paused trust brief decides retrieval.
5. Nothing from memory is sent to a provider by default; a lookup carries at most a keyword and a region; a hand-off passes nothing. Any exception is a D2 change with its own consent sentence.
6. D9: Kinship offers ideas on request, never writes into another app, never sends, never books, never RSVPs, never buys.
7. A suggestion is labelled as one and is never stored as memory or shown as the user's words. Ask keeps retrieved and derived apart.
8. No count, streak, progress, "ways you've shown up", leaderboard, or completion state. The user is free to do nothing and is never asked why.
9. Any commercial relationship is disclosed where it appears, in plain words, and listed in Settings › What we measure / What Kinship knows.
10. Content-free analytics only (§23); a query over a specific account needs the founder's yes for that id.

## 11. User-research plan

**Who.** The founder (self), the founder's wife (dogfood rounds 1–2), then the Alpha ring (8–12).

**What to learn, in order.**
1. *Does ordinary showing-up work?* (the approved metric; dogfood rounds 1–2; no new questions needed).
2. *When these people showed up for someone in a way other than a message, what did it take, and where did it fail?* Interview, after round 1: three recent examples each; what they knew, what they forgot, what they bought or made, what they wished they had done.
3. *Would a one-line suggestion have helped or intruded?* Show the gesture line as a static mock in the interview, on their own real Moment; ask what they would have done.
4. *Does the probe feel like Kinship helping or telling?* After the probe (Alpha): the taps (content-free), then interviews: "Did you do it? Would you have without the line? Did it ever feel like a to-do list or a shop?"
5. *Commerce:* only after the probe: "If Kinship offered to open a flower or gift site from here, would that feel helpful, neutral or wrong?" asked on a milestone *and* on a hard time, to find the line.

**Stop conditions.** Any participant describes a suggestion as a task, a nag or an ad; any participant feels judged for not acting; any wrong-person or sensitive-line leak.

## 12. Minimum viable experiments

| # | Experiment | Builds on | Cost | Learns | Needs a provider |
|---|---|---|---|---|---|
| MVE-1 | **Interview-only**: the three-examples interview and a static mock of the gesture line (§11, 2–3) | Nothing | Hours | Whether the need is real for these users; which gestures | No |
| MVE-2 | **The gesture line** (the recommended first probe): one fixed-template "You could…" line beneath the primary action on the hand-off sheet and Moment detail, for a milestone or event ahead and an open promise; opens Messages; `gesture_*` events; interviews | K26's `mentions.ts` and `MENTION_OPENERS`; I1's detail; §23 analytics | S (copy and a template table; no model, no schema, no server) | Whether a grounded contextual action suggestion helps without intruding (**the suggestion layer only**; it does not show that the action happened) | No |
| MVE-3 | **Ask's suggestion mode**: on Ask v1, "What could Chris and I do together?" returns retrieved lines and labelled suggestions | Ask v1 (Alpha) | M | Whether derived suggestions can stay honest and useful | No |
| MVE-4 | **Ways to help** under a sensitive line | RSN-09's brief; Remembered / Paused | S–M | Whether support help lands without intrusion | No |
| MVE-5 | **A plain external hand-off** ("Send something" → a provider page with nothing passed, no affiliate id) on a birthday or milestone Moment | MVE-2's evidence; the monetisation decision | S | Whether anyone wants it; the trust reaction | A link only |

MVE-1 can run during the wife dogfood without any build. MVE-2 is the proposed first build, in early Alpha. MVE-3 to MVE-5 wait for their dependencies and decisions.

## 13. Decision gates

| Gate | Question | Evidence | Who decides |
|---|---|---|---|
| **G0** | Record the thesis | CC-28 | Founder (done) |
| **G1** | Run MVE-1 interviews during dogfood? | None needed | Founder |
| **G2** | Authorise MVE-2 (the gesture line) for early Alpha? | The approved metric shows the ordinary loop works in dogfood; MVE-1 says the need is real; a brief with copy, contexts, exclusions, events | Founder, after the wife dogfood |
| **G3** | Continue past the probe (the suggestion layer)? | Taps happen; interviews say "helping, not telling"; no stop condition hit | Founder, after Alpha round |
| **G3b** | Do real-world actions follow (the outcome layer)? | User-confirmed actions of a content-free kind (an optional "Did you make a plan?" after a Yes; "Kept it"; a later Tell naming the action); self-reported outcomes in interviews; a consistent story across §9's three layers. Defined in `01-roadmap-options.md` §4 | Founder, with the §24 evolution decision (FD-5) |
| **G4** | Ask's suggestion mode? | Ask v1's evidence; G3 passed | Founder |
| **G5** | Any external hand-off, any commerce? | G3 passed; the monetisation decision (FD-1 in `02-founder-decisions.md`); the disclosure copy; a D2 review | Founder |
| **G6** | Any external evidence source (calendar, shared invitations, listings)? | D6's trigger or Alpha interviews; the permission design | Founder |

## 14. Recommendations, and what only the founder can decide

**Recommended.**
1. Adopt the thesis (done, CC-28) and change nothing in the committed sequence.
2. Run MVE-1 (interviews) during the wife dogfood; it costs nothing and shapes the probe.
3. Make the first build MVE-2, the non-commercial gesture line, in early Alpha after the ordinary loop is proven, with its own brief (`01-roadmap-options.md` §4). It validates contextual action suggestions, not real-world outcomes; the outcome evidence is a later stage (G3b).
4. Defer all commerce past Alpha; keep D10's subscription as the model; treat any later commerce as fulfillment the user walks to.
5. Fold the Opportunity Engine into Today + user-initiated assistance + Intentions; keep external events as a separate, later experiment.
6. Record the measurement evolution (§9) and change nothing in §24 until a later decision.

**Only the founder can decide** (the register: `02-founder-decisions.md`): the monetisation posture; whether any partnership is explored; the probe's exact shape and timing; permissions for event sources; how and when the metric evolves; launch timing.

## Sources

Canonical: `KINSHIP_2_DECISIONS.md` (D2, D4, D6, D9, D10, D13, CC-25, CC-26, CC-28); `docs/product/KINSHIP_2_PRODUCT_CONTRACT.md`; `KINSHIP_2_OPERATIONALIZATION.md` §13–§17, §22–§24, §28, §34–§36; `today-eligibility.md`; `relationship-page-rules.md`; `approved-design-coverage.md`; `audits/2026-10-16-roadmap-audit.md`; `explorations/today-redesign-2026-10/round-2/00-experience-architecture.md` (PR #43); `src/features/today/mentions.ts` (K26).

External, read 18 Oct 2026: Goody developer documentation (developer.ongoody.com) and the Goody help centre article "What APIs does Goody offer?"; the API Evangelist provider profile for Partiful (no official API) and Apify's Partiful scraper listings (unofficial); Ticketmaster's developer FAQ, partners and distribution-partners pages and the affiliate sign-up page; UrbanStems' help-centre referral article, with FlexOffers and Shopper.com directory listings for affiliate terms (unverified); mealtrain.com's "Learn" page and the "How to set up a Meal Train page in 5 steps" article.
