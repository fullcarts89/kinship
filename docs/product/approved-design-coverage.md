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
| 23 | **Privacy / settings** | B3 "What Kinship knows" (settings); P E17 | Sources, switches, export, delete | PARTIAL — understanding switch + sign out | PARTIAL — adds the D2 disclosure and a Contacts line ("read on this phone; only the people you pick are saved") | Yes | Partial | Partial | ✗ | ✓ (understanding off/on) | ✓ (export, delete, lock-screen) | — | Export/delete-account v2 UI not built (E17) | **No — needs founder approval** | E17 before alpha |
| 24 | **First-use empty states** | Contract §8; DD §I | Orientation and a next action, not a void | **NOT BUILT** (new accounts saw the mature quiet day) | **BUILT** — Today first-use orientation; People empty recovery; person empty invites Tell | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native pass |
| 25 | **Mature empty states** | DD §I.2 "Nothing needs you today" | Quiet is correct | BUILT | BUILT, now only for accounts that have told Kinship something | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | — | n/a | — |
| 26 | **Offline** | P §7 | Kept now, understood later | BUILT | BUILT; setup works offline except contacts are local anyway; consent saved when online (asked again if it couldn't save) | Yes | ✓ | ✓ | ✗ | ✓ | ✓ | — | — | n/a | Airplane-mode pass on device |
| 27 | **Error / loading / permission states** | Contract §7; brief §21 | Human words; no dead ends | PARTIAL | BUILT for setup (contacts denied/limited/unavailable, save failure, consent offline); existing states unchanged | Yes | Lab ✓ | Lab ✓ | ✗ | ✓ | ✓ | — | — | n/a | Native permission dialogs |
| 28 | **Night appearance** | B3 "Good evening."; SYS | The night garden | BUILT | BUILT (new screens use tokens; night renders captured) | Yes | ✓ | — | ✗ | ✓ | ✓ | — | — | n/a | Native appearance switch |
| 29 | **Listening (voice) screen** | B1 4th phone; P E18 | Speak a Tell; on-device | NOT BUILT | NOT BUILT; no mic shown anywhere | No | — | — | — | ✗ | ✗ (beta wk 3) | ✓ | D5: voice in beta week 3, on-device only | Yes (D5) | E18 |
| 30 | **Garden / Landscape** | B3 Garden phone | — | Superseded | Superseded | — | — | — | — | ✗ | ✗ | ✓ | D7, plan §34 checkpoint | Yes (D7) | GDN-00 checkpoint |
| 31 | **Notification permission ask** | P §22, PUSH-08 | Ask after the first real moment | NOT BUILT | NOT BUILT | No | — | — | — | ✗ (no push yet) | ✓ | — | Server push not built (E15) | **No — needs founder approval** | E15 |
| 32 | **Siri / Action Button / widget / share sheet** | DD §C, P §21 | Capture from anywhere | NOT BUILT | NOT BUILT | No | — | — | — | ✗ | ✗ | ✓ | Native targets, Next/Later | Yes (plan §4) | E24 |
| 33 | **Subscriptions, Intentions, Opportunity Engine** | D10, P §35 | — | NOT BUILT | NOT BUILT | No | — | — | — | ✗ | ✗ | ✓ | Post-validation | Yes (D10, §35) | — |
| 34 | **Person states (Remembered / Paused)** | D13; P PER-06 | Hold grief and estrangement | PARTIAL (rendering only) | PARTIAL | Partly | ✓ | ✗ (no UI to set) | ✗ | ✗ | ✓ | — | — | — | PER-06 before alpha |
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
3. **Settings export / delete account v2 UI** (#23): the 1.0 flows exist server-side; the 2.0 screens are not built. Defer to E17 before alpha?
4. **Notification permission ask** (#31): no push exists yet, so there is nothing to ask for. Defer with E15?
5. Activation pass questions 1–7 in `activation-pass.md` §7 (day-of event moment, density numbers, superseded history's home, kind words in the review, reported promises, relationship labels, look-over for dense notes).
