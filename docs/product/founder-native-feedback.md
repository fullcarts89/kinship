# Founder native-pass feedback (dogfood-v2 build)

The founder's notes from using the build on their iPhone, logged as they arrive.
**Status: logged only.** Nothing gets acted on until the founder says so.

## Burst 1: 5 Oct, about 9:53–9:56

Screens: Tyler Shaffer (empty page, with the "About Tyler" Tell sheet open over it), and Ben Oxnard (Lately and Coming up).

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F1 | Person page: edit / add | It should be easier to edit someone or add details about them. The small edit icon is too small and unclear. | The third control in the bottom bar (after Message and Call) is drawn as a narrow, clipped pill with only a pencil icon showing. It looks squeezed rather than meant to be that size. |
| F2 | Tell sheet: submit | When telling Kinship something, nothing clearly submits or confirms it. The text covers any button you could tap. | "About Tyler" sheet: the field and the keyboard fill the screen. No Keep / send button is visible above the keyboard. |
| F3 | Keyboard | There is no way to dismiss the keyboard. | Same sheet: the field is single-line with a return key, and the area above it doesn't dismiss the keyboard. |
| F4 | Remembering: whose fact | The Tell about Ben said Ben wants to play games with the founder and their brother John. Ben's page instead leads with "John is the writer's brother". Both are the founder's brothers, so this is misleading on Ben's page. | Two more things on that page: (a) "the writer" is internal wording that leaked into what the user sees; it should be "your brother" or similar; (b) a fact about John is filed under Ben's Lately. |

## Burst 2: 5 Oct, about 9:58

Screen: What Kinship knows about Ben, with the "Forget this?" dialog open over "John is the writer's brother".

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F5 | Correcting a fact | There's no way to edit a fact Kinship kept, only delete it. The founder wanted to change it to "John and Ben are the writer's brothers". | Each line offers its person ("Ben Oxnard"), its kind ("Something true") and "Not this". Nothing on screen says the words themselves can be changed. "Keep it" in the Forget dialog is the same label as the Tell button, with a different meaning. |
| F6 | How the user is named | Doesn't like being called "the writer": it's too impersonal. It should use the name they registered with. | Ties into F4(a). Open decision: use the user's own name ("[your name]'s brother"), or "your" ("your brother")? |

## Burst 3: 5 Oct, about 10:01

Screen: Ben Oxnard, "About Ben" Tell sheet with the keyboard dismissed and a two-line note typed.

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F7 | Tell sheet: submit (confirms F2) | Still no way to submit a fact. | The keyboard is down and the text has wrapped to two lines, yet there is still no send / Keep button anywhere in the sheet. So the button isn't just hidden behind the keyboard: it's missing (or drawn off screen) in this sheet. Blocking: the person-page Tell can't be used at all. |

## Burst 4: 5 Oct, about 10:02

Screen: People with the Settings sheet open.

| # | Area | Founder's feedback | What the code / screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F8 | Settings: Contacts | What's the point of the Contacts section if there's nothing to adjust? | It's a disclosure only: a title and one sentence (`src/features/people/SettingsSheet.tsx`), with no control and no tap action. Options: make it act (show whether access is allowed, open iOS Settings to change it, and "Add from contacts"), or fold the sentence into the Understanding section and drop the row. Also: the People list shows "the writer" in Ben's preview line (F4/F6). |

## Burst 5: 5 Oct, about 10:04

Screen: the welcome (sign-in) screen.

| # | Area | Founder's feedback | What the code / screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F9 | Welcome: layout | It reads as a wall of text and isn't neatly organised. | Kicker, headline, subline, then three ruled lines. All of it is the same weight of body text, so nothing leads. "See how it works" sits left of the text margin: it's pulled out by `marginLeft: -space.l`. |
| F10 | Welcome: sign-in buttons | The Apple and Google buttons are oriented wrong. It looks cheap. | **Apple button is broken:** no black fill, white text on paper, and the logo stacked above the label instead of beside it. Its layout lives in a `Pressable` style *function*. Hypothesis: NativeWind (`jsxImportSource: "nativewind"`) drops function styles on `Pressable` in the native build. That could also explain the squeezed pencil button (F1) and any other control styled the same way. Needs a device check. Google and email are small, quiet text links in a row under the broken Apple button, so the hierarchy reads as unfinished. |
| F11 | Welcome: orientation | Would prefer a rotating carousel or a fun animated design to orient people who are signing in. | **Design-direction question for the founder.** The Design Direction asks for no decorative motion, and "See how it works" already exists as a tap-through. Options: (a) turn the three lines into a calm, swipeable 3-panel carousel (Tell → Remember → Bring back), using the "See how it works" content, auto-advancing slowly, with Reduce Motion respected; (b) one quiet illustrated animation, e.g. the sprig growing a leaf per step. Needs the founder's choice before anything is built. |

## Burst 6: 5 Oct, about 10:06

Screen: "See how it works", step 3 of 4 ("How did it go for Ben?").

| # | Area | Founder's feedback | What the code / screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F12 | Example: goals, not just facts | Step 3 should carry the four-hour goal. If you want to show up for someone, you acknowledge their goals, not just facts about them. | The example note is "Ben runs Chicago Sunday and hopes to break four hours." Step 2 shows "Hoping to break four hours" as a remembered line (`HOW_COPY.goal`). Step 3 drops it, showing only "Ben runs Chicago Sunday · Sun, Oct 11". Possible change: show the goal under the moment ("Hoping to break four hours"), so the moment says why it matters. Wider product question: should real Today moments and pages also show a person's related goal or hope alongside an event? That touches extraction and ranking (a goal kind or detail), so it's beyond a copy fix. |

## Burst 7: 5 Oct, about 10:08

Screen: "See how it works", step 4 of 4 ("You reach out. Afterwards, one quiet question.").

| # | Area | Founder's feedback | What the code / screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F13 | Example: show what "Yes" does | There should be an animated demo of what happens when you pick "Yes". | Step 4 draws the question, both answers and the follow-up all at once, as a static picture. "Yes" and "Not yet" look tappable but are not (dead controls in a demo). Possible change: make "Yes" tappable (or auto-play it once) so the follow-up arrives with the standard arrive motion (spec rule 4). That would also answer F11's wish for guided motion without decoration. |
| F14 | Example: "Anything worth remembering?" | It should be its own step (a 5th), and its purpose is unclear to a new user. | The current line, "Whatever you say becomes part of what Kinship knows, and it starts again", is abstract. A separate step 5 could show a reply being typed (e.g. "Ran 3:52 — so proud of him. Wants to do Berlin next.") and what it becomes on Ben's page: the race moves to history, and "Berlin" arrives as a new hope. That makes the loop visible: told → remembered → brought back → reached out → remembered more. |

## Burst 8: 5 Oct, about 10:11

Screen: the welcome screen again, after signing in by email.

| # | Area | Founder's feedback | What the code / screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F15 | Sign-in: email bounces back (**blocking**) | Signed in by email, then landed back on the login screen. Users shouldn't have to sign in more than once. | No error is shown, so the sign-in either "succeeded" without the welcome screen moving on, or the session was lost straight away. Read-only notes: `signInWithEmail` (`src/providers/AuthProvider.tsx`) only sets the session and relies on `app/index.tsx` to redirect. An account whose flags are off would go to 1.0, not back to the welcome screen, so flags alone don't explain it. Things to check: which account was used; whether the welcome screen redirects when auth changes; whether the session survives (secure store) in this build; the Supabase auth logs for that sign-in. Also visible again: the broken Apple button (F10). |

## Burst 9: 5 Oct, about 10:13

Screen: Today's first-use screen with the consent sheet ("So Kinship can understand what you tell it").

| # | Area | Founder's feedback | What the code / docs show (my observation, not yet investigated) |
|---|---|---|---|
| F16 | Consent: naming the AI provider | Unsure about naming the provider. Trust in AI tools is low, and leading with "it gets sent to an AI provider" may lose trust straight away. | **Constraint, needs the founder's decision.** The wording is the approved D2 sentence (product contract, lines 122 and 125). Apple's App Review rule 5.1.2(i) (Nov 2025) requires apps to say clearly when personal data goes to a third-party AI, and to ask permission first. So the disclosure itself has to stay. What can change is the framing and order: lead with the benefit and the user's control (e.g. "Kinship can read your notes to pick out dates, plans and what matters"), keep notes-as-written as an equal choice, and move the provider line into a quieter "Who reads it?" detail, still on the same screen before Allow. Wording changes to D2 need the founder's sign-off, and ideally a legal check. Separately: this sheet appears over Today's first-use screen, which suggests this account skipped the consent step in setup (the fallback in final-review item 17). |

## Burst 10: 5 Oct, about 10:15 (a different account)

Screen: Today first-use with the Tell dock open, two lines typed: "My wife is really excited for our Disney trip on October 23rd".

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F17 | Tell dock: still can't submit (**blocking**, same as F2/F7) | After "Tell Kinship one thing", there's still no way to submit. | The Today dock has no send (↑) button either, so it's the same missing control as in the person sheet. This is the third surface where it's absent. That points to one shared cause (the send button's style is lost on device; see F10's hypothesis) rather than three separate bugs. Also: the dock floats about one tab bar's height above the keyboard, with the Today/People tabs showing between the field and the keyboard. The keyboard lift looks like it counts the tab bar or safe area twice. |
| F18 | Today first-use: buttons read as a selection | "Add your people" looks selected even after tapping the other button. | It isn't a selection state. "Add your people" is the primary (filled) button, and "Tell Kinship one thing" the secondary (outline). Side by side, a filled and an outline pill read as a segmented toggle. Possible fix: make them not look like a pair. E.g. the primary on its own line and the secondary as a quiet text link; or once the dock is open, hide or dim the pair. |

## Burst 11: 5 Oct, about 10:17

Screen: People (empty) after switching tabs. The unsent Tell from Today is still in the dock.

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F19 | Tell dock: unsent text follows you | After moving to People, the unsent note is still sitting there. It shouldn't carry over to another page. | The dock is shared by both tabs, so its draft travels with it. This is made worse by F17: with no send button, the note can't leave. Things to weigh: silently throwing away typed words risks losing what she said. Options: (a) leaving the tab collapses the dock back to the pill and keeps the draft quietly (shown as "Draft" when reopened); (b) leaving clears it, with a brief "Draft discarded · Undo"; (c) keep it, but only on the tab where it was typed. Founder's call. Also seen again: the send button is missing (F17), and "Add from contacts" / "Add by name" form the same filled-and-outline pair as F18. |

## Burst 12: 5 Oct, about 10:19

| # | Area | Founder's feedback | What the code / docs show (my observation, not yet investigated) |
|---|---|---|---|
| F20 | First sign-in: no orientation (**blocking for the wife's build**) | There's no orientation the first time you sign in. Nothing explains what the buttons on the page mean. There's no onboarding to learn who you are, what kind of person you are, or what matters to you. The welcome screen's guidance isn't enough: people will skip "See how it works". Every user should get guidance at least once, or they'll miss what Kinship can do. | Two parts. **(1) Setup was skipped (likely a bug).** The build has a first-run setup: consent → pick your people → "Already worth knowing" → first Tell (`src/features/setup/`, gated by `needsSetup`). Both accounts tested today went straight to Today: one had earlier 2.0 data; the "other account" got the consent sheet over Today (F16). So the setup gate let a fresh-looking account through. Check `useSetupGate`'s conditions for that account. **(2) New scope, needs the founder's direction.** (a) A one-time guided tour of the main screen: what Today is, what the Tell field does, what People holds. Short, skippable, shown once per account, not only on the welcome screen. (b) A "you" step: the user's name (fixes F6's "the writer"), and perhaps what matters to them / who they want to show up for. This adds a self profile, which isn't in the approved design. Per the product contract it needs the founder's yes, and a recorded decision in `approved-design-coverage.md`. |

## Burst 13: 5 Oct, about 10:20

Screen: People with "Tyler" added by name. The Disney note is still in the dock.

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F21 | Tell dock: unsent text survives other actions (adds to F19) | After adding Tyler by hand, the unsent note about the founder's wife is still there. | Confirms F19 across actions, not just tab switches: the draft outlives adding a person and the sheet closing. Two more observations: (a) the note is about the founder's wife, who isn't a person in this account. When it's finally sent, Kinship can't attach it to anyone without asking. Worth checking that the review handles "my wife" (offers to add her) rather than dropping it or guessing. (b) "Tyler" was added with a first name only, so the hand-off later needs the contact picker (by design). |

## Burst 14: 5 Oct, about 10:22

Screen: Today ("Nothing needs you today.") with the Disney note still in the dock.

| # | Area | Founder's feedback | What the screenshots show (my observation, not yet investigated) |
|---|---|---|---|
| F22 | Tell dock: unsent text on Today too (adds to F19/F21) | The same unsent note is still there on the home page. | Confirms F19/F21: the draft lives for the whole session, everywhere. |
| F23 | Today: new account shown the "mature" quiet day | (My observation, not raised by the founder.) | With one person (Tyler) and no notes kept, Today has switched from the first-use guidance to the bare "Nothing needs you today." The contract says a new account must never land on an empty Today. First use should last until there's at least one kept note, but the current rule seems to end it once a person exists. Check `TodayView`'s firstUse condition against `app/__tests__/firstRun.test.tsx`. This also feeds F20 (no orientation). |

---

# Second native pass (recovery build, gateway v3), 5 Oct afternoon

## Burst 9: about 12:57

Screen: Ben Oxnard's page, with "Here's what I'll remember" open after a Tell from his page. Ben works in private equity (Something true); Ben works a lot and is miserable with his job (Something ongoing). Statements correct, on the right person, no "the writer".

| # | Area | Founder's feedback | What the code / data show | Recommendation (not built) |
|---|---|---|---|---|
| G1 | Tell: wait after sending | There's a lag between sending and the summary appearing. There should be a loading/processing sign so you know something is happening, or it should be faster. | **Why nothing showed:** a Tell sent from a person's page closes the sheet and returns to the page, but the page only shows the line *after* understanding ("Kept: …"). The "Understanding…" status line exists only in the Today/People dock, so on a person's page the wait is silent. **How long:** this note's model call took 4.3 s (`ai_calls`: ok, confirm, 187 in / 474 out tokens), plus a sync before and after, so roughly 5–7 s end to end. | **(1) Now:** show the same quiet status on the person page the moment Send is tapped: "Understanding…" in the slot above Message · Call · Tell, with the existing delayed spinner (motion spec rule 10: words, plus a small spinner only after 600 ms), replaced by the Kept line or the review sheet. Same on any screen a Tell can be sent from. **(2) Faster, measured first:** (a) send the note to the gateway straight away instead of waiting for the next sync pass; (b) on return, apply the gateway's response directly instead of a second full sync; (c) model speed: the call is already Opus at low effort with a small prompt. A smaller model would need a paid eval and your approval, so not first. Expected from (a)+(b): about 1–2 s saved. |
