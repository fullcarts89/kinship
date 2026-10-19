# Kinship 2.0 — Approved-design coverage

**Rule (contract §9):** every approved screen and required supporting state is listed here. Statuses: **BUILT · PARTIAL · NOT BUILT · INTENTIONALLY DEFERRED**. A surface is "intentionally deferred" only with a reason *and* founder approval; until the founder approves, it stays NOT BUILT.

**References.** B1 = canvas "Recommended · Setup, Today, Tell, Confirm"; B2 = "Recommended · Brief, Follow-up, Reconnect, Person, History"; B3 = "Recommended · Garden, Reflection, Ask, Privacy, Night"; SYS = "Recommended · Design system"; DD = Design Direction (section); P = `KINSHIP_2_COMPLETE_PLAN.md` (section).

**Columns.** *Reach* = reachable from the real user flow (not just the lab). *Vis / Int* = visual and interaction fidelity against the reference. *Native* = verified on an iPhone. *Wife* / *Alpha* = critical for that ring.

**Snapshot.** Two snapshots are recorded: **Before** (branch `claude/awesome-edison-3cuf6z` at `6b52a60`, the build the founder rejected) and **After** (this recovery pass). No surface has been verified on a native device in either snapshot — this environment has no iPhone, simulator or EAS access.

---

## 1. Matrix

| # | Surface | Approved reference | Product job | Before | After (this pass) | Reach | Vis | Int | Native | Wife | Alpha | Later | Deferral reason | Founder approved deferral? | Remaining work |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Welcome / promise** | DD §C, §I.1; D1 order step 1; B1 setup composition | Make Kinship understandable in seconds; the outcome, not the machinery | PARTIAL — one sentence + sub-line on the sign-in screen; promise screens explicitly deferred | **BUILT** — promise in Display + three plain lines (tell / remembers with sources / brings it back so you reach out), on the sign-in screen; no carousel | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native pass |
| 2 | **Sign in** | D1; B1 composition | Account before first Tell; Apple primary | BUILT (lab) | BUILT (unchanged auth) | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native: real Apple ID, cancel, failure, email sheet with keyboard |
| 3 | **Consent** | D2, D3; P §9, ONB-02 | Plain disclosure + one explicit choice | PARTIAL — a sheet over an empty Today | **BUILT** — the first setup step, full screen, the approved D2 sentence word for word; Allow / Keep notes as written; the over-Today sheet remains only as a fallback for accounts that finished setup without being asked | Yes | Lab ✓ (no board; built from B1 setup composition) | Lab ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native pass |
| 4 | **People-selection onboarding** | B1 "Who do you want to show up for?" (Setting up · 1 of 2); P E16/ONB-03; T8 | Bring 8–20 real people in one pass | **NOT BUILT** | **BUILT** — contacts multi-select: search, suggestions (family names, birthdays this month), sprig + name + why, T8 lock line, "Continue with N people"; Add by name; denied/limited/unavailable states; only picked people saved (name, contact id, birthday) | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native: permission prompt copy, 2,000-contact scroll, limited-access (iOS 18) picker |
| 5 | **Already worth knowing** | B1 "Already worth knowing" (Setting up · 2 of 2); T7 | Prove value before any work | **NOT BUILT** | **BUILT** — real birthdays in the next 14 days from picked contacts ("Maya's birthday is Saturday.", "From Contacts"); when there are none the screen opens on the first Tell instead | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | Calendar line removed by T7 | Yes (T7, D6) | Native pass |
| 6 | **First Tell** | B1 board 2 lower half; P E16, ONB-04 | One thing worth remembering, in her own words | **NOT BUILT** | **BUILT** — same Tell pipeline (`source=onboarding`); "Skip for now" / "Keep it"; lands on Today with the Kept line or the review sheet | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | Mic button replaced: no voice until E18 (D5) | Yes (D5) | Native: keyboard over the field |
| 7 | **Normal Tell** | B1 Tell field; DD §H | Tell from anywhere, no navigation | BUILT | BUILT | Yes | ✓ (no mic) | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native keyboard lift |
| 8 | **Extraction / "Here's what I'll remember"** | B1 "Kept for David"; P §8 | Show what was kept; fix only what's wrong | BUILT | BUILT | Yes | ✓ (token row instead of inline tokens — technical) | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native pass |
| 9 | **Clarification** | B1 "Is 'his son' Leo?"; P §8 | One question when genuinely ambiguous | BUILT | BUILT | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Relaunch with a question waiting (native) |
| 10 | **Today** | B1 "Thursday, 1 October"; DD §I.2; P §13 | One thing worth knowing now, or silence | PARTIAL — events only; brand-new accounts got the mature "Nothing needs you today." | **BUILT** — first-use vs mature state model; birthdays (day-of moment, day-before/this-week quiet lines, "From Contacts"); events as before | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | "A year ago" line: not built (needs moments with dates; RSN-10) | **No — needs founder approval** | Year-ago line; night "Anything worth remembering?" after a planned encounter (later) |
| 11 | **People** | B3 list side; DD §I.6; T4 | Who is in here; one tap to a person | PARTIAL — empty list said "No one yet" with add-by-name only | **BUILT** — search-first alphabetical; empty state offers Add from contacts and Add by name; + sheet also offers "Choose from contacts" | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | List/Garden toggle superseded (D7) | Yes (D7) | Native: 500-person scroll |
| 12 | **Relationship page** | B2 "David Reyes"; DD §I.7 | Who they are to me now; act | BUILT | BUILT + birthday under Coming up ("From Contacts"); empty page invites the first Tell about them | Yes | ✓ (per-line provenance instead of footnotes — accessibility) | ✓ | ✗ | ✓ | ✓ | — | "Since / place" sub-line: only the user's relationship label (no invented "Friend since") | n/a | Native pass |
| 13 | **Your story together** | B2 history phone; DD §I.8; P PER-07 | A story through time, not a log | NOT BUILT | **NOT BUILT** | No | — | — | ✗ | ✗ (a new account has no history to tell) | ✓ | ✓ | A brand-new account has no dated shared moments; the screen would be empty. Proposed: build with Phase 3 PER-07 before alpha | **No — needs founder approval** | Build before alpha |
| 14 | **What Kinship knows (person)** | B2 link; DD §I.7; P PER-04 | Every item, editable and removable | BUILT | BUILT | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native pass |
| 15 | **Source / provenance** | DD §B, §H; P §6 | Where a detail came from, in one tap | BUILT | BUILT; contact birthdays show "From Contacts" (no note to open) | Yes | ✓ (no board) | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native pass |
| 16 | **Correction** | DD §H interaction model; P §8, EXT-02..04 | Fix a word in 2–4 taps | BUILT | BUILT | Yes | ✓ (no board) | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Birthday correction: edit on the person (not built; contact birthday is read-only in 2.0) |
| 17 | **Follow-up / hand-off** | B2 "Ask Ben how it went"; P §15 | One obvious action into the real channel | BUILT | BUILT; birthdays hand off too; picked contacts are linked at setup, so no "choose contact" step | Yes | ✓ ("Suggest a first line" omitted — D9) | ✓ | ✗ | ✓ | ✓ | — | AI openers later (D9) | Yes (D9) | Native: Messages/Phone/FaceTime/WhatsApp |
| 18 | **Return check** | B2 "When you come back"; P §15 | One tap: did you reach them? | BUILT | BUILT | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native timing (10 min) |
| 19 | **Brief** | B2 "Before you see David"; P §16 | 30-second context before meeting | NOT BUILT | NOT BUILT | No | — | — | — | ✗ | ✗ | ✓ | Calendar is out of V1 (D6, P §16) | Yes (D6) | Phase 6 (E21) |
| 20 | **Reconnect** | B2 "A reason to reconnect"; P §17 | A true reason after a quiet stretch | NOT BUILT | NOT BUILT | No | — | — | — | ✗ | ✗ | ✓ | Needs rhythm data + reason corpus (P §17) | Yes (plan §4 "Next") | Phase 6 (E22) |
| 21 | **Reflection (monthly letter)** | B3 "September, looking back"; P E26 | Did I show up? | NOT BUILT | NOT BUILT | No | — | — | — | ✗ | ✗ | ✓ | Needs 4+ weeks of data | Yes (plan §4 "Next") | Phase 6 |
| 22 | **Ask Kinship** | B3 "When did I last see Sam?"; P E25 | A cited answer from your own memory | NOT BUILT | NOT BUILT (People search finds people only) | No | — | — | — | ✗ | ✗ | ✓ | Retrieval capability not built (plan §4 "Next") | Yes (plan §4) | Phase 6 |
| 23 | **Privacy / settings** | B3 "What Kinship knows" (settings); P E17 | Sources, switches, export, delete | PARTIAL — understanding switch + sign out | PARTIAL — adds the D2 disclosure and a Contacts line ("read on this phone; only the people you pick are saved") | Yes | Partial | Partial | ✗ | ✓ (understanding off/on) | ✓ (export, delete, lock-screen) | — | Export/delete-account v2 UI not built (E17) | Yes (CC-25, 16 Oct: export and delete-account v2 block broader Alpha, not the household dogfood) | E17 before alpha |
| 24 | **First-use empty states** | Contract §8; DD §I | Orientation and a next action, not a void | **NOT BUILT** (new accounts saw the mature quiet day) | **BUILT** — Today first-use orientation; People empty recovery; person empty invites Tell | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native pass |
| 25 | **Mature empty states** | DD §I.2 "Nothing needs you today" | Quiet is correct | BUILT | BUILT, now only for accounts that have told Kinship something | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | — | n/a | — |
| 26 | **Offline** | P §7 | Kept now, understood later | BUILT | BUILT; setup works offline except contacts are local anyway; consent saved when online (asked again if it couldn't save) | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Airplane-mode pass on device |
| 27 | **Error / loading / permission states** | Contract §7; brief §21 | Human words; no dead ends | PARTIAL | BUILT for setup (contacts denied/limited/unavailable, save failure, consent offline); existing states unchanged | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native permission dialogs |
| 28 | **Night appearance** | B3 "Good evening."; SYS | The night garden | BUILT | BUILT (new screens use tokens; night renders captured) | Yes | ✓ | — | ✗ | ✓ | ✓ | — | — | n/a | Native appearance switch |
| 29 | **Listening (voice) screen** | B1 4th phone; P E18 | Speak a Tell; on-device | NOT BUILT | NOT BUILT; no mic shown anywhere | No | — | — | — | ✗ | ✗ (beta wk 3) | ✓ | D5: voice in beta week 3, on-device only | Yes (D5) | E18 |
| 30 | **Garden / Landscape** | B3 Garden phone | — | Superseded | Superseded | — | — | — | — | ✗ | ✗ | ✓ | D7, plan §34 checkpoint | Yes (D7) | GDN-00 checkpoint |
| 31 | **Notification permission ask** | P §22, PUSH-08 | Ask after the first real moment | NOT BUILT | NOT BUILT | No | — | — | — | ✗ (no push yet) | ✓ | — | Server push not built (E15) | Yes (CC-25, 16 Oct: asked with the minimal push, committed next, only after a genuinely useful Moment) | E15 |
| 32 | **Siri / Action Button / widget / share sheet** | DD §C, P §21 | Capture from anywhere | NOT BUILT | NOT BUILT | No | — | — | — | ✗ | ✗ | ✓ | Native targets, Next/Later | Yes (plan §4) | E24 |
| 33 | **Subscriptions, Intentions, Opportunity Engine** | D10, P §35 | — | NOT BUILT | NOT BUILT | No | — | — | — | ✗ | ✗ | ✓ | Post-validation | Yes (D10, §35) | — |
| 34 | **Person states (Remembered / Paused)** | D13; P PER-06 | Hold grief and estrangement | PARTIAL (rendering only) | PARTIAL | Partly | ✓ | ✗ (no UI to set) | ✗ | ✗ | ✓ | — | — | — | PER-06 before broader Alpha (CC-25: trust floor; not blocking the household dogfood) |
| 35 | **App icon, Terms, Privacy Policy pages** | DD §B identity | No 1.0 visual leaks | 1.0-styled | 1.0-styled | Yes (links from sign-in) | ✗ | — | ✗ | Rough edge | ✓ | — | — | — | Restyle; new icon |

---

## 2. Deviations from approved boards (this pass)

| Surface | Board | Built | Reason class |
|---|---|---|---|
| People selection | All suggested rows pre-checked; "Continue with 14 people" | Nothing pre-checked; the count follows what she picks | **Trust:** pre-checking guesses who matters; only people she picks are saved |
| People selection | "Suggested from your favourites, recent calls and family names" | "Suggested from family names and birthdays" | **Platform:** iOS gives apps no access to Favorites or call history |
| People selection | List directly under the explanation; no search | A search field and "Add someone by name" above the list; with nobody picked the button reads "Skip for now" | **Interaction need:** a real address book (plan: "handles 2,000 contacts"); **brief §10:** add by name must exist when Contacts is refused |
| People selection | Lock line "Nothing leaves it until you choose." | "Kinship reads contacts on this phone. Only the people you pick are saved." | **Founder (T8)** |
| Already worth knowing | "You're seeing David on Thursday" (calendar) | Birthdays only | **Founder (T7, D6)** |
| First Tell | Example quote in a surface box; "Say it" with a mic | An empty field in the same surface box with a neutral hint; "Keep it" | **Trust:** an example about invented people reads as data; **D5:** no voice yet |
| Consent | No board | B1 setup composition: caps label, Title, Body, lock line, actions pinned | No reference exists; built from the approved vocabulary |
| Welcome | No board | B1 setup composition + three plain lines | No reference exists; promise follows DD §B, §C |
| Today first use | No board | Display line about what Today is for + one action | Required by contract §8; built from Today's own composition |
| Today birthday | Board quiet line "Saturday · Maya's birthday · Ideas →" | Quiet line without "Ideas →"; day-of birthday as the moment with "Message Maya" | **D9:** no generated ideas in V1 |
| Return check after a birthday | — | "Yes" recorded as a user-confirmed contact (`source=manual`), not `return_check` | **Technical:** birthday moments are computed on the phone; the server requires a reason id for `return_check`. Server birthday reasons (RSN-05) remove this |

| "See how it works" (welcome) | No board | An optional 4-step example of the loop, labelled "An example", from the welcome; nothing saved; its Today step is the real Today copy | **Founder request (activation pass, 5 Oct)**; built from the welcome/Today vocabulary |
| First Tell | Board quote about Mom's hip surgery | Three plain examples (Ben's race, Maya's new job, a promise to Chris) under the field | **Founder request:** no health event as the first impression |
| Relationship page density | Board shows one short line per section | At most 3 lines a section, by time only; Lately = last 120 days; the rest in What Kinship knows (`relationship-page-rules.md`) | **Founder request:** prove density; numbers await approval |

## 3. Items needing a founder decision

1. **Your story together** (#13): defer to Phase 3 PER-07, before alpha? A new account has nothing to show.
2. **"A year ago" quiet line** (#10): defer to RSN-10?
3. **Settings export / delete account v2 UI** (#23): the 1.0 flows exist server-side; the 2.0 screens are not built. Defer to E17 before alpha? **Answered (CC-25):** before broader Alpha, with Remembered / Paused and a safe duplicate merge; not before the household dogfood.
4. **Notification permission ask** (#31): no push exists yet, so there is nothing to ask for. Defer with E15? **Answered (CC-25):** it comes with the minimal push (committed next), after a genuinely useful Moment.
5. Activation pass questions 1–7 in `activation-pass.md` §7 (day-of event moment, density numbers, superseded history's home, kind words in the review, reported promises, relationship labels, look-over for dense notes).

## Recovery pass (founder native pass, 5 Oct): what changed on approved surfaces

Every change below was asked for in the founder's recovery brief (the latest founder decision; contract §1 ranks it first). Nothing approved was removed without that brief saying so.

| Surface | Change | Why | Founder approval |
|---|---|---|---|
| 1 Welcome | The three plain lines are replaced by one small example card (you tell it → it remembers → it brings it back) that opens "See how it works"; Google is a full-width secondary button, email a quiet link. No carousel. | F9/F10: a wall of same-weight text; sign-in looked unfinished | Yes: recovery brief, "Welcome screen" |
| Welcome › See how it works | The moment keeps the event's hope ("Ben was hoping to break four hours."); the last step plays the close of the loop (Yes → question with a reply → what Ben's page now shows). Still four steps. | F12–F14 | Yes: recovery brief, "See how it works" |
| 3 Consent | Benefit first; the approved D2 sentence and provider line unchanged, under "Who reads it"; button "Allow understanding". Over-Today sheet stays only as the recovery path (couldn't save during setup, or understanding offered after setup). | F16; Apple 5.1.2(i) verified 5 Oct | Direction yes; **final wording: product/legal approval still needed** |
| Setup | A first-name step only when sign-in gave no name (email; Apple after its first sign-in). Steps recorded as explicit account state. | F6/F20; Gate 3 | Yes: recovery brief, "Who the user is" |
| 10 Today | First-use guidance lasts until the account is activated (first Tell became memory); greets by first name; the moment shows the event's hope | F23; F12 | Yes |
| 12 Relationship page | Message · Call · Tell, three named actions (the pencil is gone) | F1 | Yes: "Preferred treatment: Message · Call · Tell" |
| 14 What Kinship knows / 16 Correction | "Edit" on every line, "Edit the words" in the line's sheet; Forget asks Cancel / Forget | F5 | Yes |
| 23 Settings | Contacts shows what Kinship can see, with the one action that changes it | F8 | Yes |
| All | One primary action; the other is quiet (no filled-and-outlined pairs) | F18 | Yes |
| Tell field | Unsent words fold to one "Draft · …" line when you leave, and stay with where they were started | F19/F21/F22 | Yes |

Deferred in this pass (not removed): editing a person's name or birthday in 2.0 (the brief allows it "if required"; not needed for the loop); using the user's first name in understanding (the gateway would need it as input: a prompt-input change with its own eval).

## Stabilization pass (6 Oct): what changed on approved surfaces

All asked for in the founder's "Native Trust + Memory Stabilization Pass" brief (the latest founder decision). No approved surface was removed; nothing below is a redesign.

| Surface | Change | Why | Founder approval |
|---|---|---|---|
| Tell › review | One post-Tell contract: Understanding… → a Kept card that stays until Got it / Undo / the next note, or "One thing to check" with its reason. No timers. | G7, G10, G19, G22 | Yes: brief Gate D |
| Tell › questions | Who-is-"he" offers Both and quotes the sentence; "Add Kaiya" for someone not in People; "Does this replace one of these?" when two memories fit | G23, G25, G30 | Yes: brief Gates E, F |
| 10 Today | Headline priority moment > pending input > first use > quiet; pending notes named; good-news and starts-today moments; "Did Josh send it?" for promises others made | G12, G13, G16, G21 | Yes: brief Gate G |
| 12 Relationship page | Section spacing, hairline, darker labels; Coming up leads with when; provenance once per run; waiting notes and "Is this the Michelle…?" links | G17, G18, G20 | Yes: brief Gate H ("within Quiet Herbarium, no redesign") |
| 14 What Kinship knows / item sheet | "Also about" for shared memories; "Before: …" for what a line replaced | G8, G40 | Yes: brief Gate E (history and provenance, no timeline UI) |
| 3 Consent | Asked only once the account's answer is known; a swipe is not an answer | G15 | Yes: brief Gate C |

Not built (brief "Do not build"): About You, Landscape, Garden, Ask, scores, timeline UI, task manager.

## Core Trust Closure pass (6 Oct, round three): what changed on approved surfaces

All asked for in the founder's "Core Trust Closure + Return Loop Pass" brief (the latest founder decision). No approved surface was removed; nothing below is a redesign.

| Surface | Change | Why | Founder approval |
|---|---|---|---|
| Tell › review | "Tyler's promise" / "Your promise", and **Whose promise?** (Yours / Tyler's) | H28 | Yes: brief P0 |
| Tell › review | **Add Pedro** under a kept line that names someone new | H21 | Yes: brief P0 |
| Tell › review | "Replaces: ~~…~~" on saved lines and held questions (was "Updates:") | H23, H25 | Yes: brief P0/P1 |
| Tell › review, line sheet, What Kinship knows | Quiet **Maybe** token for "might", "thinking about" | H29 | Yes: brief P1 |
| Tell › Kept card | Its own raised surface; **Got it right · Not quite** (→ What was off?, five fixed reasons); "Already known: …" | H19, H6, H17 | Yes: brief P1/P2 |
| 10 Today | Return question carries its reason ("Did you congratulate Ben on the promotion?"), right after returning; Yes / Not yet persist; Coming up shows the whole next week by date with "and N more"; never "Nothing needs you today" over a Kept card; no first-use flash before the first sync | H10, H11, H18, H26, H27, H19, H9 | Yes: brief P1 |
| 12 Relationship page | "was: ~~…~~" under a line that replaced an earlier one; "You reached out · Oct 6" under the name; tap the name to correct it; one source line per note | H23, H10, H1, H14/H19b | Yes: brief P1/P2 |
| 14 What Kinship knows | "Edit name"; "Edited by you · was: ~~…~~" | H1, H30 | Yes: brief P0/P2 |
| Source view | A line a later note replaced stays, marked "Since updated" | H25 | Yes: brief P0 (every statement has a source) |

Designed but not built: What Kinship knows sections (H15/H2), milestone eligibility (H16), bring-back in first use (H4). Approved on 6 Oct (see below); details in `next-ux-proposals.md`.

## Approved extensions for the next UX phase (founder, 6 Oct, CC-17)

These are evidence-backed extensions of the approved product. They are approved, **not yet built**, so no current surface changes. Each must be built as specified here, or changed only with founder approval recorded in this file.

| Surface | Approved extension | From | Guardrails |
|---|---|---|---|
| 14 What Kinship knows | Organised durable memory in sections: **Into · Background · Their people · Between you**, plus aspiration lines (final label open: "Hoping to" or "Plans & hopes") | H15/H2 | "Hoping to" only for real aspiration or `event_goal`, never every plan; Their people (label open, maybe "People & pets") here, **not** on the Portrait; empty sections disappear; no counts or completeness; newest first, no ranking; a source on every line; no goal tracking |
| 12 Relationship page (Portrait) | **No change**: Lately · Coming up · You said you'd · Between you stays "what matters now" | H15/H2 | No family tree, no dossier |
| 10 Today | Milestone moments: engagement, wedding, new job, promotion, baby, graduation, new home, retirement, move | H16 | Eligible ≤ 3 days before and on the day, only with a known day; Today's priority logic decides the slot; never daily nagging; never asks for missing fields; at least one participant must be an established person (others keep their names) |
| First use (onboarding) | Tell → Remember → **Bring back**, one concrete example leading into Today | H4 | At most one extra screen; no carousel; no decorative motion; respects Reduce Motion; prefer the user's real first Tell when it makes an eligible Moment, else the Ben example; `firstRun.test.tsx` and `.maestro/fresh-install.yaml` gain the step |

Roadmap only (not a surface yet): grounded **Ask Kinship** as an Alpha candidate (H3). No change: "August" (H22).

## Round-4 approvals (founder, 7 Oct, CC-18): approved, not built

| Surface | Approved change | From | Phase | Guardrails |
|---|---|---|---|---|
| 10 Today → **Moment detail** (new contextual surface) | Tapping a Moment opens its detail: the grounded reason, why now, timing, Source, Message / Call; "View Ben" is secondary with a deep link and quiet emphasis | I1 | 4 | Tap a reason → the reason; tap a person → the person. Not a field-heavy page |
| 12 Relationship page › **Between you** | Lightweight interaction trail: "You messaged · Oct 6 · About …" | I2 | 4 | Know → infer → ask; one tap usually; type ≠ reason ≠ shared experience; never counts, "last contacted", streaks or health |
| Tell › **Kept card** | Sections: kept → needs attention ([Add Pedro] [Not now]) → Correct this · Undo → feedback | I4 | 4 | Real controls and tap targets; Quiet Herbarium; no card stack |
| Tell field / all inputs | Done accessory, drag-to-dismiss, nav usable with the keyboard open, draft kept | I6 | 4 | Bottom navigation stays |
| 14 What Kinship knows › **Background** | Clearly-past history ("Previously interviewed with Box · Ended Oct 6") | I7 (with H15) | 4 | Never alongside current state as if true; declined sensitive outcomes stay out |
| 12 Relationship page / 14 What Kinship knows | Visible **Edit** for the name; soft **Remove from People** | I3 | Gate 0 | Archive, restorable; notes and sources kept. **BUILT in Gate 0** (see below); native pending |

## Gate 0 Final Trust Closure (7 Oct, CC-18): what changed on approved surfaces

All asked for in CC-18 and the founder's Gate 0 answers of 7 Oct (I12 guardrails; I3 semantics, plus "never re-create a removed person"). No approved surface was removed; nothing below is a redesign. Native: I12's existing lines were VERIFIED through the remediation gate (8 Oct). I13's answer path waits for the ai-gateway redeploy, because production was still version 7. I3, I5, I9, I10 and I11 weren't re-run there; they are re-checked in the Phase 4 native pass.

| Surface | Change | Why | Founder approval |
|---|---|---|---|
| 12 Relationship page | A visible quiet **Edit** under the name (the name stays tappable); it opens the name sheet, which ends with **Remove from People** and a confirm: "Remove Kaiya from People? Kaiya won't appear in People or Today. Your notes stay, and you can bring Kaiya back from Settings." | I3 | Yes: Gate 0 answer (7 Oct) |
| 23 Privacy / settings | **Removed from People**, shown only when someone was removed: each name with **Bring back** | I3 | Yes: Gate 0 answer (7 Oct) |
| 11 People | Add by name with a removed person's name asks first: Bring back · Add someone new · Cancel | I3 ("never a duplicate by accident") | Yes: Gate 0 answer (7 Oct) |
| Tell › review / clarification | "Which Sam do you mean? · You have more than one Sam." for a held mirror, quoting the note's words, only the people the name can mean (never someone already resolved); "Kaiya was removed from People." with **Bring back Kaiya** (never "Add Kaiya"); a name that fits someone here and someone removed is asked about | I10, I3 | Yes: CC-18 / Gate 0 answer |
| Tell › Kept card | "Kept for Susan Oxnard and Michelle Lee" for a shared memory; closing the details opened from the card returns to the same card | I5, I9 | Yes: CC-18 |
| Correction (person picker) | When a line's own words name several people in People, "Who is this about?" shows just them to choose (Choose everyone it's about · Someone else · Done); otherwise the one-person list as before | I11 | Yes: CC-18 ("never a generic People form") |
| Correction (person) | Moving a line to the right person renames its subject in the words, with "was:" history | I13 | Yes: CC-18 |
| 12 / 14 / Today / review | A renamed person's lines show the current name where an earlier one was written (option A); titles and sentences use the whole chosen name ("What Kinship knows about Cutie Pie"); names from Contacts stay first names | I12 | Yes: CC-18 option A + Gate 0 guardrails (7 Oct) |
| 10 Today | Never "Nothing needs you today." behind an open question | I10 (as H19 for the Kept card) | Yes: CC-18 |
| Review / line tokens | No "Maybe" on a line whose own words aren't hedged when another line of the same note is | I12b | Yes: CC-18 (check, then fix) |

Not built in Gate 0 (Phase 4, approved): I1 Moment detail, I2 interaction history, I4 Kept hierarchy, I6 keyboard, H15/H2 with I7, H16, H4.


## Gate 0 remediation (8 Oct): what changed on approved surfaces

The narrow pass the founder decided on 8 Oct after the Gate 0 native findings (`gate0-native-findings.md`), in the order I12 → I13 → J4 → J1 → J7 → J2 → J6 → J5 → Today headline → pet health. No approved surface was removed and nothing below is a redesign. **Native:** the founder ran the targeted gate, `gate0-remediation-checklist.md`, on 8 Oct and reports every row passed (CC-19).
- **VERIFIED** where the fix runs on the phone or in the database: J2, J5, J6, J7, J8, J9, I12's existing lines and the J4 copy.
- **Not yet exercised:** I12 for new lines, I13's answers, J1, J4's guard repair and J11. These run in ai-gateway, and production was still version 7 (the PR #21 code) during the gate. They need the redeploy and a re-run of their rows.

| Surface | Change | Why | Founder approval |
|---|---|---|---|
| 12 / 14 / Today / review | A line shows a person's current name only where its own record says the words were an earlier name ("Wifey got promoted" → "Loo Loo got promoted"); the user's own word for them under their current name stays ("Liz got promoted" while she is Elizabeth Chen) | I12 | Yes: decision 1b (8 Oct) |
| Tell › clarification | Someone not in People: **"Who is Wifey?"** (was "Is Wifey someone new?"), "Wifey isn't in your people yet.", with the person whose page it was told on, **Add Wifey**, **Someone already here** (Someone else when the page's person is offered) and Don't keep this. A memory Kinship couldn't place is asked about, never dropped | J4 | Yes: J4 decision (8 Oct) |
| Tell › Kept card / review | **"Nothing to remember in that one."** only for a note with nothing in it ("Your note is saved." removed); after the user's own Don't keep this: **"Nothing kept from that one."** (the words the sheet already used as its title) | J4 | Yes: J4 decision, "drop 'Your note is saved'". The Don't keep this wording reuses approved copy; flagged in the report |
| Tell › clarification | "Who is “he”?" offers only who "he" can mean: people named before it, then the page's person; never the sentence's object. On a page with no one else before it, there is no question | J1 | Yes: J1 guardrail (8 Oct) |
| 12 Relationship page | "Is this the Sam in '…'?" is never asked about a line the user already said is about someone else | J7 | Yes: J7 decision (8 Oct) |
| Correction (person picker) | The search offers **Add Josh** for a typed name that is no one in People: one tap adds them by name (no number) and moves the line, which then names them; a name someone removed from People goes by offers them back first (I3) | J2 | Yes: J2 decision (8 Oct) |
| Tell › Kept card | **"and 1 more"** is a button that opens the rest of the kept lines in place, each tappable | J6 | Yes: J6 decision ("expand in place preferred") |
| All sheets | A downward drag from anywhere on a sheet closes it while its content is at the top; scrolled content scrolls first; with the keyboard up, a drag puts it away first (as a tap above the sheet does). The content no longer bounces at the top | J5 | Yes: J5 decision (8 Oct) |
| 10 Today | Never "Nothing needs you today." behind any Tell surface that is on screen or open: the Kept card, the review or its details, a question | J8 (today headline) | Yes: Today headline decision (8 Oct) |
| 10 Today | A pet's vet visit or health takes part in Today (Coming up and the moment) like anything else; a person's own health still never speaks there | J9 (Mochi) | Yes: "Mochi / pet health: YES" (8 Oct) |
| Tell › clarification | **"Whose promise?"** as a held question (Yours · <Name>'s · Don't keep this) when someone commits to something, or asks the user to, and the words don't say whose; the same choice H28's correction already offers on a saved promise. A line the model called a promise with no commitment in it is kept as what it says (the user's plan, or a fact about the person), shown on the Kept card for a glance | J11 | Yes: founder, 8 Oct ("hold and ask Whose promise?"; "downgrade/reclassify … rather than dropping it") |

Not in this pass (founder, 8 Oct): J3 (waits for I1), shared-hobby composition (J10, with the semantic-memory decision), H15, the general semantic relationship model.

## Phase 4 (founder, 8 Oct, CC-19): Gate 0 closed; what is approved and in progress

Gate 0 is closed, and Phase 4 has started. The build plan is `phase4-implementation-brief.md`. **No surface below is built yet.** Each is built as approved (CC-17, CC-18, CC-19), or changed only with founder approval recorded here. Nothing approved is dropped.

| Surface | Approved (latest wording) | Item | Phase / step | Status |
|---|---|---|---|---|
| Tell › Kept card | Order: what was kept → attention ("Pedro isn't in People yet. Add Pedro so this also shows on Pedro's page." **Add Pedro** · **Not now**) → **Correct this · Undo** → "Did Kinship get this right?". "Tap a line to correct it." dropped | I4 | 4A · 1 | **BUILT** (native pending). Copy approved by the founder (CC-20): names, never guessed pronouns |
| Tell field / all inputs | Done / dismiss and drag-down dismissal. Today and People reachable with the keyboard open. Draft kept. **Bottom nav stays** | I6 | 4A · 2 | **BUILT** (native pending): the keyboard's own bar carries Done, and on Today and People also Today · People. Single-line boxes keep their return key |
| 10 Today → Moment detail | Focused detail: the grounded line, why now, timing, Source, Message / Call. Secondary **View <Person>** deep-links to the line with brief quiet emphasis (absorbs J3). Reduce Motion respected | I1 | 4A · 3 | **BUILT** (native pending). A sheet. Opened from the moment's words, Coming up lines and Waiting lines. The emphasis is a soft fade up from faint, with no badge or colour block |
| 10 Today | Milestone moments for the nine types, about 3 days before through the day, only with a grounded date. Today's ranking decides. No nagging; never asks for a date. Anchored to an established person. Only explicit milestone wording, never a residence change | H16 | 4A · 4 | **BUILT** (native pending). Copy: the line in the user's words, "Thursday · Thu, Oct 15", **Message Anthony**; return "Did you reach Anthony about the wedding?" |
| 12 Relationship page › Between you | A small dated trail ("You messaged · Oct 6 · About getting together…"). Manual entry: Message / Call / Video / In person. No counts, last-contacted, frequency or streaks. "Anything worth remembering?" optional and non-blocking, omitted after routine or logistical contact. Know it + ask it first; infer it is I2b (CC-20) | I2 | 4A · 5 | **BUILT** (native pending; `29bb8f1`, migration `20261013090000`). The newest three under Between you, every one in What Kinship knows (with **Not this**); **Add a conversation** → "How were you in touch with Tyler?" Message · Call · Video · In person. Copy and the "logistics" rule: proposals in CC-22 §"Implementation choices", awaiting the founder's yes |
| 12 Relationship page › under the name | **"You reached out · <date>" (H10) is removed** and folded into the Between you trail | H10 → I2 | 4A · 5 | **Removal approved by the founder** (CC-20, 8 Oct): "We do not want a disguised last-contacted field." **Removed** in the same commit as the trail (`29bb8f1`) |
| First use | One extra screen at most: Tell → Remember → **Bring back** ("This is where Kinship brings things back, when they matter."). The real first Tell preferred, else one grounded example. No carousel or decorative motion | H4 | 4A · 6 | **BUILT** (branch `claude/h4-bring-back`; native: simulator). Not a new screen: Today itself, once, right after the first Tell becomes memory (see "H4" below) |
| 14 What Kinship knows | Organized reference in sections: Background (residence as one composed line; work and education inside unless density warrants their own), Into, Hoping to, Their people, Between you. Empty sections disappear. No grid, counts, completeness or prompts | H15 / H2 | 4B | **PARTIAL.** Its closed taxonomy is built (B1, `d4db346`): it places each line in one of these sections and is computed every time, never stored; nothing shows it until B8. **The composed residence line is built (B5):** a chain of residence lines is one line in the existing list ("Lives in Alameda, California", "· and 1 other note"), tap → its notes, each with Edit and Not this (see "B5" below). The sections themselves wait for B8 |
| 14 What Kinship knows › Background | Clearly-past history only when the source shows a real change: an explicit cue ("moved to"), the user's "She moved", or a completed or cancelled thread. A plain replacement ("lives in Colorado" with no cue), a refinement and a correction are never history (CC-20). Outside residence: **Before** + the old line in its own words. Dates come only from the note ("You told Kinship · Jan 4"; "Moved · Jan 4" or "Ended" only when the note says so) | I7 | 4B | NOT BUILT |
| 12 Relationship page (Portrait) › Lately | **Portrait de-duplication:** a residence told more and less precisely shows once, as the most specific line's own words ("Susan lives in Alameda", never also "Susan lives in California"). The Portrait's sections are otherwise unchanged | H15 (founder §28, 8 Oct) | 4B | NOT BUILT. Approved change to the Portrait: yes (CC-19) |
| Tell › clarification | A residence conflict, rarely: "Is Susan still in Alameda?" **Still there · She moved**. Only when a wrong pick would show something false; never "Which Alameda?" | Semantic v1 (case E) | 4B | **BUILT in B3** (native: simulator; see "B3" below). "She moved" reads "Susan moved": a proposal |

Still not built and not approved to build: Ask, About You, Garden, Landscape, Intentions, full Your story together (row 13 stays NOT BUILT as recorded above).

## K-series remediation (founder, 12–13 Oct, CC-22): what changed on approved surfaces

Narrow trust and correctness fixes on surfaces that already exist; no new surface except I2's approved trail. **Native:** not yet run (needs the next build).

| Surface | Change | Why | Founder approval |
|---|---|---|---|
| Tell › clarification | A line about several people asks each name two or more people share on its own, "Which Sam do you mean?" with every person that name can mean, and only that name changes with the answer. Its skip reads **Not sure** (existing copy): the line is kept for everyone else and that name left unlinked. A settled line with such a name is kept and asks the name separately (the I10 shape). "Who is this about?" no longer cuts its choices to four | K4 | The behaviour: yes (CC-22). **Not sure** for a name: proposal (CC-22 §choices 2) |
| Tell › clarification | The user's own news with no one named and no page ("I got the job.") is asked "Who is this about?" (**Choose who** · **Don't keep this**, J4's copy) instead of "Nothing to remember" | K5 | Proposal (CC-22 §choices 1) |
| Tell › Kept card | **Add Josh** · **Not now** also for someone a kept line reaches out to, talks to, tells, texts, calls, meets, thanks or invites (one or two of them); never a relation word, a place or a company | K6 | Yes (CC-22: the I4/H21 pattern) |
| Tell (names) | "Chris'", "Chris's", "Chris’s" are Chris | K7 | Yes (CC-22) |
| 10 Today › Waiting on | Gone once the user has acted on it (handed off, Yes on any phone, put aside) | K3 | Yes (CC-22) |
| 10 Today › return check | Yes records the conversation with what it was about; answered once; "Anything worth remembering?" skipped after a Waiting or own-promise Yes; Not yet brings the Moment back after a sync too | I2, N6, K3 | Behaviour yes (CC-20, CC-22); the logistics rule: proposal (CC-22 §choices 5) |
| 12 Relationship page › Coming up / Lately | Someone else's promise leaves Coming up after its day; Lately for 30 days as "Waiting on Tyler", plain once the user reached them about it | K2 | Coming up rule: yes (CC-22). The page's "Waiting on …" in Lately for 30 days: proposal (CC-22 §choices 3) |
| 12 Relationship page › Between you, 14 What Kinship knows | The I2 trail (row above) | I2 | Yes (CC-19, CC-20); copy: proposal (CC-22 §choices 4) |


## Blocker bundle (founder, 15 Oct): what changed on approved surfaces, and what was deferred

The founder's 15 Oct direction: close N11, K20, K15–K17, K19, K23, defer the rest, and move to H4 and Phase 4B
("capture is now infrastructure"). Narrow fixes on existing surfaces; no new surface. **Native:** every row
below was run on the iOS 27 simulator with the live model and the founder's People (15 Oct); the founder's
device check is `blocker-device-checklist-15oct.md`.

| Surface | Change | Why | Founder approval |
|---|---|---|---|
| 10 Today › Coming up | What the user means to do today is on Today however it was kept: a promise due today (as before), a plan for today, their own event today (**Today · Call John**). Once they said Yes about it today it leaves Today; Not yet keeps it. Someone else's event on its day stays the Moment's (unchanged) | K20 | Yes: brief §4 ("Today must include Today") |
| 10 Today › headline | While a note just told is on screen and nothing else is on Today: **Understanding…** (the dock's own word) while it's read, **One thing to check.** (existing Today copy) while it asks, then **Nothing else needs you today.** beside the kept card. Never only the date and the greeting | K19 | Behaviour yes: brief §6. **"Nothing else needs you today." is new wording**: proposal, for the founder's look on the device check |
| 10 Today › date; setup › people | One date format: **Wednesday, Oct 14** on Today (board 1 wrote "Thursday, 1 October"); a birthday reads **Oct 10** (was "10 October") | K19 | Yes: brief §6 ("normalize date formatting to the approved single format"); the format is the app's existing "Fri, Oct 16" |
| 12 Relationship page | Back from a Message or Call opened on the page, about something to act on (Today's line about them, else the open "You said you'd" nearest its day): the same return question Today asks, **Did you reach John?** with what it was about, under the name; Yes / Not yet as on Today. The hand-off sheet says "When you come back: “Did you reach John?”" as it does from Today. With nothing to act on, nothing is asked (opening an app is not contact) | K23 | Yes: brief §7 ("the action origin should not determine whether the return loop exists") |
| Tell › Kept card / clarification | One sentence about a shared activity is one memory whatever the model's wording, kind or full names; both Sams are offered | K15–K17 | Yes: brief §5 (no surface change) |

**Deferred (founder, 15 Oct brief):**

| Item | Status | Reason | Founder approval |
|---|---|---|---|
| K18: a "looks like something you told Kinship" question (Keep earlier · Keep new · Keep both · Undo) | **INTENTIONALLY DEFERRED → semantic memory (Phase 4B, SAME / REFINES / SUPERSEDES)** | A new decision surface just before that architecture is built. Meanwhile telling a thing again never corrupts or merges across days (K20) | Yes: brief §8 |
| K22: "You said you'd" placed first on the person page | **INTENTIONALLY DEFERRED → H15 / B8 person-page work** | Requirement kept: open commitments easy to find, never buried under static reference memory. Not redesigning the page twice | Yes: brief §9 |
| K21: pull to refresh | **OPTIONAL RESILIENCE / POLISH** (later) | The product updates by itself; stale automatic state is fixed in the automatic state, never by teaching a manual refresh | Yes: brief §10 |

## H4 Bring back (founder, 15 Oct: "the next Phase 4A product step"): built

Approved as CC-17 / CC-20 (copy, constraints) and in the 15 Oct brief §14. No approved surface removed; no new screen.

| Surface | Built | Guardrails kept |
|---|---|---|
| 10 Today, once, right after the first Tell becomes memory | **This is where Kinship brings things back, when they matter.** (approved), then the loop as it really runs, in three quiet rows: with the user's own first Tell when one of its lines has a day to come (**You told Kinship** · their words; **Today** / **Tomorrow** / **Around Sunday** / **Around Mon, Oct 19** · "Kinship brings it back here, with Message and Call."; **When you're back** · "Did you reach Maya?"), else the one grounded example, labelled **An example** (Ben runs Chicago Sunday … "How did it go for Ben?" … "Did you ask Ben how it went?"). **Got it** and it never shows again, on any phone (kept on the account's getting-started record) | At most one extra experience (it's Today, not a screen); no carousel, no motion (Reduce Motion unaffected); a Moment or the return question always comes first; only for an account activated in the last 3 days (an account long in use never sees it); nothing invented: the user's own words and the real behaviour, or the labelled example |

**Copy beyond the approved headline is a proposal** ("You told Kinship", "Kinship brings it back here, with Message and Call.", "When you're back", "An example", "Got it"). The when is said loosely ("Around Sunday"), never a promised day: what comes back, and when, depends on what it is, from the existing vocabulary ("See how it works", the return question). For the founder's look.

**Gates:** `app/__tests__/firstRun.test.tsx` and `.maestro/fresh-install.yaml` gain the step (asserting the bring-back with the user's own first Tell, and that Got it ends it).

## Device check passed (founder, 16 Oct); planned for the next phase

The blocker bundle passed the founder's device check (build from `main` `e098dfc`). Two findings on approved surfaces are planned, not built:

| Surface | Finding | Proposed change | Founder approval |
|---|---|---|---|
| 10 Today › headline during a Tell (K19) | K24: inconsistent and doubled. On a quiet day the headline became "Understanding…" while the dock said the same; with a line on Today it didn't change | One rule, for the founder to choose: (a) the dock alone says "Understanding…", and Today keeps its own headline (a quiet Today shows its paper with nothing under the greeting only while the dock is reading); or (b) Today always says it, and the dock doesn't | **Decided (CC-24): (a), the dock alone.** BUILT, see below |
| Tell › clarification "Who is Matt?" (J4) | K25: no way to choose Matt from Contacts; Add Matt makes a person by name only | Add **Choose from Contacts** to the question: the system picker (no Contacts permission needed), saving only the one person picked (name, contact id, birthday, as setup does), then the line files on them. Add Matt (by name) and Someone already here stay | **Approved (CC-24).** BUILT, see below |

## K24 and K25 built (founder, 16 Oct, CC-24)

| Surface | Built | Founder approval |
|---|---|---|
| 10 Today › while a Tell is processed (K24) | The Tell dock alone says "Understanding…". Today's headline never does (K19's transitional headline and its "Nothing else needs you today." are removed). While a note is understood, asked about or kept, a quiet day's "Nothing needs you today." waits; real Today content stays; afterwards Today recomputes. K19's one date format stays | Yes: CC-24 |
| Tell › clarification "Who is Matt?" (K25) | Choices in order: the page's person (when told on a page), **Choose from Contacts**, **Add Matt**, **Someone already here**; Don't keep this. Choose from Contacts opens the system picker: no Contacts permission at all, and Kinship sees only the contact chosen. That person is found by contact (reused, or brought back if removed) or added once (name, contact id, birthday "From Contacts"), the answer files the line on them, and the note stays open. Cancelled: the question stays, Add Matt still there. Not offered on web | Yes: CC-24 |

**Deviation, in the direction of privacy:** CC-24 allows asking for Contacts permission after the user chooses Choose from Contacts. The system picker needs none, so none is asked.


## B3 residence semantics (Phase 4B, 16 Oct): what changed on approved surfaces

Built as approved (CC-19 case E, CC-20, CC-24, brief §8 and §21). No approved surface removed; nothing composed or displayed differently on the Portrait or in What Kinship knows (that is B5, B7, B8). **Native:** the iOS 27 simulator with the live model; not on the founder's device.

| Surface | Built | Founder approval |
|---|---|---|
| Tell › clarification (case E) | **One thing to check · Is Susan still in Alameda?**, the new line's own words under it, **Still there** · **Susan moved** · Don't keep this. Asked only when the new residence may not fit the one Kinship holds and the table can't decide (a move into a place that contains it, a move between two readings of a name, or a plain new place beside a line the user edited, §21); never "Which Alameda?". Both places are the user's own words. "Susan moved" replaces that line as a change; "Still there" keeps both; Don't keep this keeps the note only | The question: yes (CC-19, CC-24). **"Susan moved" for "She moved"** (Kinship never guesses a pronoun, CC-20's I4 rule): **proposal**. No reason line under the question: proposal |
| Tell › review / Kept card | A residence the table replaces shows "Replaces: ~~Susan lives in Alameda~~" as any replacement does (H23) | Existing behaviour |
| Settings › About | **Place data from GeoNames (geonames.org), CC BY 4.0**, under the Account section: the first build whose gateway reads the place data | Yes: CC-20, decision 1 (Settings › About and `THIRD_PARTY_NOTICES.md`). The v2 Settings sheet had no About section; it gains one line under its own label |

## B4 multi-item closure (Phase 4B, 16 Oct): what changed on approved surfaces

Built as approved (CC-20: closure never without its exact Undo; brief §8 rule 2, §10). No approved surface removed; nothing composed or displayed differently on the Portrait or in What Kinship knows' sections (B5, B7, B8). **Native:** VERIFIED on the founder's device (16 Oct, late: `b4-device-checklist.md`, a build with the gateway deployed from the branch; "no issues").

| Surface | Built | Founder approval |
|---|---|---|
| Tell › Kept card | Under a kept line, **Replaces: ~~Susan lives in Alameda~~** and **Replaces: ~~Susan lives in California~~**: one H23 line per line the note replaced, the most specific first, right above **Correct this · Undo**. Before B4 the card showed none of it; only the review sheet behind "Correct this" did | H23's approved element on I4's approved card: **a surface addition, for the founder's look** |
| Tell › review, 14 What Kinship knows, line sheet | "Replaces: …" / "Before: …" once per replaced line (was: the one line it superseded) | Existing behaviour (H23, G40), now complete |
| 12 Relationship page (Portrait) | Unchanged: "was: ~~…~~" keeps the most specific line | — |
| Tell › clarification (case E) | Unchanged words. "Susan moved" now also closes every other line the reading can't be true with; "Still there" still closes nothing | Behaviour: CC-19 / brief §8 rule 1. Open: N16 (a second edited line the question never named stays current) |

## B5 composed residence line (Phase 4B, 16 Oct): what changed on approved surfaces

Built as approved (CC-19 "a composed statement is a view"; brief §9, §12). No approved surface removed; the Portrait is unchanged (B7); What Kinship knows keeps its flat list (sections: B8). **Native:** not run (no build this session).

| Surface | Built | Founder approval |
|---|---|---|
| 14 What Kinship knows | A chain of residence lines ("Susan lives in California", "Susan lives in Alameda") is **one line, "Lives in Alameda, California"**, where its newest note's line was, with the union of its sources in the existing words ("You told Kinship · Oct 2 · and 1 other note"). The line, its provenance and one **Edit** open its notes; it has no tokens and no "Not this" of its own. Fail open: lines that don't chain show as today; one line shows as itself | The line and its provenance: yes (brief §9, §12, approved CC-20). **One way in (no "Not this" on the composed row): approved** (founder, B5 review). When some members were edited and others not, the line's provenance is neutral ("From your notes · Oct 9 · one edited by you"; copy a proposal), never "Edited by you" for words the user didn't edit (founder, B5 review) |
| 14 What Kinship knows › the notes behind a composed line (sheet) | The composed words and their provenance, then each note's line exactly as the page draws it (words, tokens, "Before:", "Edited by you", its own provenance → that note's Source view, **Edit**, **Not this**); **Done**. Not this reads the line again at once from the rest; Edit opens the existing picker once the sheet has left. Screen-reader label "What this comes from"; "From these notes. Change or remove any of them." | The sheet: yes (brief §12 "a sheet of its member lines"). **Copy: approved** (founder, B5 review) |
| 15 Source / provenance | Unchanged: the Source view lists notes; "Alameda is in California" is never shown. No ids, readings, datasets or rule names anywhere (guarded by `composedViews` and `b5.blackbox`) | — |
| 12 Relationship page (Portrait) | Unchanged: Lately still shows each residence line (de-duplication is B7) | — |
| 14 What Kinship knows › Background history | Not shown: `compose.ts` renders "Previously lived in …" for B8 (I7), behind the CC-20 rule (every live closer records a change) | — |

**N17 (founder, B5 review): decided and built.** A broader line whose place a more specific member's own qualifier provably names goes unsaid ("Alameda, California" + "California" → "Lives in Alameda, California"); its note stays a member and in the provenance. Unprovable on the phone ("Alameda, CA"): both said, as before.

## B6 residence dry run (Phase 4B, 17 Oct): no surface changes

Report only (brief §14, §25; CC-19 "existing wrong supersessions: report only"). **No approved surface changes, appears or is removed:** the app asks the gateway for the report once after its first sync, with no screen, copy, badge or setting; the report is read by the founder in the SQL editor (`b6-dry-run-report.md`). Nothing a user sees is different. **Native:** not run (no build this session).

## K28 + K26 (founder, 17 Oct, CC-26): the page's return loop and "You could mention"

- **The person page, after a Yes:** "Anything worth remembering from talking with Susan?" with **Tell Kinship** · **Nothing today**, in the return question's place (the same prompt Today shows after a Yes; board 2's return check, now complete on the page). No new surface; an existing approved element on an existing screen.
- **The hand-off sheet's "You could mention":** the same list, chosen by a deterministic preference instead of the page's first rows; up to two lines, zero allowed. **Proposal:** one quiet fixed-template suggestion under the first line when it is a milestone still ahead, e.g. "You could ask how the wedding plans are going." (`MENTION_OPENERS` in `mentions.ts`: wedding, engagement, new job, promotion, new home, move, baby). Clearly a suggestion, never the user's words; not the deferred AI-generated opener. Needs the founder's yes on the copy; the lines themselves need none.
- **Native:** not run (no build this session). The founder's checklist: `k28-device-checklist.md`.

## K27 (founder, 18 Oct, CC-27): no surface changes

A gateway-only memory-trust fix (a later note connects to a pet Kinship already knows). **No approved surface changes, appears or is removed:** the clarification question ("Who is Fluffy?") keeps its K25 shape for anyone Kinship does not know; it is simply not asked when Kinship knows the pet. **Native:** not run (needs the gateway deploy; `k28-device-checklist.md` rows 11–14).

## Roadmap update (founder, 16 Oct, CC-25): status of deferred and planned surfaces

Strategy only; no surface is built, removed or redesigned by this entry. **No approved surface is dropped:** every board surface below keeps its status and deferral reason, and any change to its approved form still needs founder approval recorded here (contract §9, §11). The audit that prompted it is `audits/2026-10-16-roadmap-audit.md` (dated, non-canonical).

| # | Surface | Status (unchanged) | Roadmap placement (CC-25) | Working interpretation, not a final form |
|---|---|---|---|---|
| 10 | Today › "a year ago" line | NOT BUILT | Explore later (year-ago resurfacing) | — The row's deferral approval stays open for the founder's explicit yes |
| 13 | Your story together | NOT BUILT | Not placed; **still a founder decision** (§3 item 1) | Timeline-heavy CRM UI is on hold; a story "not a log" is not decided |
| 19 | Brief | INTENTIONALLY DEFERRED (D6) | Explore later (calendar as an evidence source) | Likely Moment detail for a planned encounter, not a separate Brief product |
| 20 | Reconnect | INTENTIONALLY DEFERRED | Explore later (reconnect as a Today candidate) | A Today candidate type, possibly gated by an explicit Intention and a real reason; rhythm held, never visible, never the reason |
| 21 | Reflection (monthly letter) | INTENTIONALLY DEFERRED | Explore later, downgraded to validation | Year-ago resurfacing, Ask over history, or an occasional / yearly reflection instead of a monthly report |
| 22 | Ask Kinship | INTENTIONALLY DEFERRED | **Alpha direction**, the first major Alpha expansion | v1 grounded search over statements with sources, then bounded synthesis if needed; one capability with `retrieval_answer`; not limited to one-person lookups; never a chat |
| 23 | Privacy / settings (export, delete-account v2) | PARTIAL | **Commit next**, before broader Alpha | — |
| 29 | Listening (voice) screen | NOT BUILT (D5) | Explore later; **questioned before implementation** | Capture order: Siri / Action Button → a simple on-device mic in Tell → a text share extension. The board stays approved; re-confirm or change it before voice work |
| 30 | Garden / Landscape | Superseded (D7) | Explore later; chapters / life groups first | User-named, many-to-many groups as a People filter; any visual stays the GDN-00 checkpoint |
| 31 | Notification permission ask | NOT BUILT | **Commit next**, with the minimal push | One private notification of the Moment Today chose; D4's caps the ceiling; pause |
| 32 | Siri / Action Button / widget / share sheet | NOT BUILT | Siri / Action Button: **Alpha direction**; share: explore later; widget: **hold** | — |
| 33 | Subscriptions, Intentions, Opportunity Engine | NOT BUILT | Explore later | Intentions v0 as a user-authored sentence used as a relevance signal (Later Alpha); the Opportunity Engine as Today's ranking plus Intentions, external events a later experiment |
| 34 | Person states (Remembered / Paused) | PARTIAL | **Commit next**, before broader Alpha | — |
| — | About You (G28) | Not an approved surface | Explore later, in Settings | The user's own grounded memory listed in Settings, not a primary destination |
| — | Promise, open-thread, hard-time Moments on Today | Not built (RSN-06, RSN-07, RSN-09) | Promise and open thread: **commit next**; hard time: **Alpha direction** | Promise guilt firewall kept; hard-time copy never cheerful, lock screen always private |

