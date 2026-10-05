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

## Burst 10: about 1:03

Screen: Ben Oxnard's page, with a question sheet: "Remember this about Ben Oxnard?" — "Ben's girlfriend Gab is an ER doctor", Remember / Don't keep this.

| # | Area | Founder's feedback | What the code / data show | Recommendation (not built) |
|---|---|---|---|---|
| G2 | Tell: wait (measured, adds to G1) | About 8 s from adding a fact to seeing it. | `ai_calls` for this note: the model call took **5.9 s** (242 in / 493 out tokens); the earlier one 4.3 s. So the model is about three quarters of the wait, and the rest (about 2 s) is the app: a sync before the call and a full sync after. The output is large for one item: the schema makes the model write every detail field for every item. | In order: **(1)** the visible "Understanding…" status from G1, so the wait is never silent; **(2)** app side: send at once and apply the gateway's answer directly (about 1–2 s saved, no eval needed); **(3)** model side, each needing a paid eval run you authorise: a leaner output schema (fewer tokens to write, likely 1–2 s), or a faster model for this step (Sonnet 5.5 was in the comparison run). Not recommended: showing anything before it's understood. |
| G3 | Review sheet: "Kept for Ben Oxnard" shown twice | The label is duplicated. | Bug in `ReviewSheet.tsx`: when the sheet is a single question with nothing kept yet, the label is drawn at the top *and* passed to the question block, which draws it again. Also wrong in this state: nothing has been kept yet, so "Kept for…" misdescribes it. | Draw the label once. In a question-only sheet, use "About Ben Oxnard" (nothing is kept until they answer). Add a test that renders the question-only sheet and checks the label appears once. |

## Burst 11: about 1:05

| # | Area | Founder's feedback | What the code / data show | Recommendation (not built) |
|---|---|---|---|---|
| G4 | Tell: result never appeared (**blocking**) | Added another fact about Ben; nothing showed for over 30 s. | **The server finished in 8 s.** The note was saved at 20:05:33 UTC; the gateway started at 20:05:34, the model took 5.5 s, and the result was written at 20:05:41 (`needs_review`: a question waiting, like the Gab one). After that, no further requests from the phone. So the answer was ready and the phone didn't show it: a client-side problem, not slowness. **Likely cause (to confirm):** it came right after the previous note's question sheet (Gab), which was never answered (that capture is still `needs_review`). The flow shows one sheet at a time, and a question that arrives while another is pending can end up only as Today's quiet "A question" line, which a person's page doesn't show at all. | **(1)** Reproduce in a test: two notes from a person's page in a row, both ending in a question, the first left unanswered. **(2)** Fix so a new answer always surfaces: if a sheet is open, queue it and open it next; if none is open, open it. **(3)** On a person's page, show "A question about Ben is waiting" (tap → the sheet) whenever one is open for them, so nothing is ever silently waiting. **(4)** Count timings without content (sent → answered → shown) so a gap like this shows up in analytics. |

## Burst 12: about 1:08–1:10

| # | Area | Founder's feedback | What the code / data show | Recommendation (not built) |
|---|---|---|---|---|
| G5 | App froze | After the 30-second wait (G4), the app froze. | Not investigated (founder still testing). Nothing on the phone or server changed during the session: the build is as installed and the gateway as deployed. Likely related to the stuck question sheets (G3/G4/G6). | Reproduce alongside G4 (two questions in a row, the first unanswered), with a screenshot or the step that froze. |
| G6 | "See the note" loses the question (**blocking**) | Sent "Ben has a girlfriend named Gab who's an ER doctor". Waited ~9 s, opened "See the note", came back: the question was gone and nothing was kept. Starting from scratch. | `TellFlow.tsx` → `onOpenNote` closes the review as **dismissed** before opening the note. For a reading with a question waiting, "dismissed" tells the server "not now", so the held items are discarded. Coming back, there's nothing to answer. Also: the question shows only "Ben has a girlfriend named Gab"; the ER-doctor part is a second held item (about Gab, someone new), not shown in this question. And the label "Kept for Ben Oxnard" appears twice (G3). | **(1)** "See the note" must never decide anything: open the note over the review, or keep the review waiting and reopen it on Back. **(2)** "Not now" only when the user says so (swipe down / "Don't keep this" / Not now), never as a side effect of looking. **(3)** If the user leaves a question unanswered, it stays waiting and is reachable from the person's page and Today (G4). **(4)** Show every held item the question decides ("Gab is an ER doctor" too), so the yes covers what they see. Tests: open the note from a question and come back → the question is still there and both items are kept on "Remember". |

## Burst 13: about 1:13

| # | Area | Founder's feedback | What the code / data show | Recommendation (not built) |
|---|---|---|---|---|
| G7 | No confirmation for a clear fact | Told Kinship "Ben likes to do ceramics"; no confirmation and no summary of what was kept. | **It was kept.** The server understood it in about 6 s (model 4.0 s) as one clear, ordinary fact: tier **auto**, 1 item saved, nothing held. By design (plan §8, approved "Kept" behaviour) a clear note gets no sheet, only a quiet "Kept: …" line with Undo for **5 seconds**. On a person's page that line sits above Message · Call · Tell, and with no "Understanding…" before it (G1) it's easy to miss or gone before you look. Also seen in the data: the three earlier Gab notes (20:03, 20:05, 20:09 UTC) are all still waiting for an answer on the server (G4/G6). | **(1)** Keep the no-sheet rule for clear notes (it's what keeps telling fast), but make the result visible where you are: "Understanding…" → "Kept: Ben likes ceramics · Undo" in the same spot, staying until you scroll, leave or tap, not 5 s. **(2)** On the person's page, the new line also appears in its section (Lately) with a brief highlight, so you see where it went. **(3)** Decision for you: should *every* Tell show the "Here's what I'll remember" sheet during dogfood, even clear ones? It's more confirmation, but slower and more taps for every note. My recommendation: no; do (1) and (2). |

## Burst 14: about 1:16

Screen: Ben Oxnard's page, with the memory sheet open on "Ben is the youngest sibling of you, John and Susan". The sheet shows only "Ben Oxnard · Something true", "You told Kinship · Oct 5", Not this / Done.

| # | Area | Founder's feedback | What the code / data show | Recommendation (not built) |
|---|---|---|---|---|
| G8 | A memory that involves other people says nothing about them | The summary should carry more, especially since it involves other people in my contacts and John is already in People. | Note (sent from Ben's page): "Ben is the youngest sibling of myself, John and Susan." Understood as **one** fact, filed on Ben only (tier auto, no question): category family, value "youngest sibling", no link to anyone else (`subject_related_id` empty). People has Ben Oxnard, John Oxnard, Tyler Shaffer and Wifey Liu. So: **John** (in People) isn't linked, and the fact isn't on his page. **Susan** (not in People) gets no "Add Susan?". **Your own relationship** isn't recorded: the note says Ben, John and Susan are your siblings, but nothing about that is kept as a relationship. Today the pipeline only splits off what's *about* someone else (the John-is-your-brother fix, F4). It doesn't handle one fact that *mentions* several people. The memory sheet shows only the filed person and the kind ("Something true", which doesn't explain much). | **(1) Show who it involves.** The memory sheet (and the review sheet, when there is one) lists everyone it mentions: "Also about: John Oxnard" (tap → his page), and "Susan · not in People" with "Add Susan". **(2) Link people in People.** A fact that names someone already in People shows on their page too, quietly, under what you share, with the same source note. Only when the name matches exactly one person; otherwise ask. **(3) Ask before adding anyone or recording a relationship.** It isn't a sensitive reading, but it would change your People, so it needs a yes. One question: "Ben, John and Susan are your siblings? Add Susan?" with choices (Yes / Just Ben and John / Not now). On yes, the relationship goes on each person (sibling, not "brother"/"sister", unless you said it). **(4) How:** (2) can start client-side by matching names against People, so no model change is needed. Listing mentions and relationships reliably means the extraction has to return them as structured fields. That's a prompt/schema change, so it needs a paid eval you authorise before it ships. **(5)** Replace "Something true" with plain wording, or drop it when it adds nothing, and show the note's own words ("From your note: …") in the sheet. **Decision for you:** should Kinship offer to record a relationship to *you* (sibling, partner, colleague) when a note states it? My recommendation: yes, always as a question, never automatically. |

## Burst 15: about 1:20 (no screenshot)

| # | Area | Founder's feedback | What the code shows (code reading only) | Recommendation (not built) |
|---|---|---|---|---|
| G9 | "Kept" line follows you to another person's page | After telling a fact about Ben, I opened John's page. The Ben fact's "Kept" line with Undo was still there at the bottom for a moment, then went away. Is that intended? | **Not intended.** The Kept line belongs to the whole app (`TellFlow.tsx`: one `kept` state for the whole app, shown for 5 s, `SUMMARY_MS`), and every person page draws it (`app/v2/person/[id]/index.tsx` passes `flow.kept` with no check of whose note it was). So a line about Ben shows on John's page until the 5 s run out. It's harmless (Undo still undoes the Ben note), but it reads as if the fact were about John. That's a trust problem, and the same kind as F4 (wrong person). | **(1)** Show a Kept line only where it belongs: on the page of the person the note was told from or filed on, and on Today/People. Never on another person's page. **(2)** With G7's change (the line stays until you scroll, leave or tap), leaving the page ends it there; the result stays reachable from Ben's page (highlighted in Lately) and from the note. **(3)** If it must appear elsewhere (for example, you sent from Today), it names the person: "Kept for Ben: likes ceramics · Undo". Test: tell from Ben's page, open John's page → no Ben line on John's page. |
