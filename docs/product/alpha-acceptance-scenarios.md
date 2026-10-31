# Alpha acceptance scenarios (founder native pass)

**Written 30 Oct 2026 by WS-5 (integration) for the release candidate on `claude/alpha-integration` (PR #74); revised 31 Oct against the Electric Garden redesign, WS-1's told-again question and the behaviour walked on the final head.**
Status of the candidate when you read this: see the WS-5 section of `docs/agent-loop/PRODUCT_DELIVERY_HANDOFF.md`.
Readiness labels are the contract's only three; nothing below changes a label on its own.

These are the scenarios the founder walks on the native build. Each one is judged by usefulness in a real
relationship, not by whether a feature "works": would the person on the other end have felt remembered?
Every step names what Kinship should do; anything else is a defect to log (ledger K-series), not to explain.

Rules for the pass:

- Use a **local test account** on the simulator (`node e2e/make-local-account.mjs`), or your own account
  with your own real people. Never seed fake people or memories into a real account.
- Tell in your own words. The exact words below are the minimum; say them naturally, longer is better.
  Robotic one-fact sentences do not count as a pass.
- Light and dark, one larger text size, an iPhone 17e-width device or simulator.
- Evidence tiers stay apart: a scenario passing here is NATIVE-SIMULATOR (or FOUNDER-DEVICE on the phone), not "ready".

## 1 · The first five minutes (onboarding → first Tell → first page)

**Why it matters:** a new account must open onto a product, not an empty app (contract §8; `firstRun` gate).

1. Fresh install → Welcome shows the promise in three plain lines, no carousel, no AI language.
2. Sign in (Use email on the simulator) → Consent is a full screen with the D2 sentence word for word; **Allow**.
3. Choose people: pick two from the simulator's Contacts (one with a birthday in the next 14 days if you can).
4. **Already worth knowing** names that birthday ("… birthday is Saturday." · From Contacts), or opens on the first Tell when there is none.
5. First Tell, say:

   > Had a long dinner with Leo last night. He finally signed the lease on the apartment in Pilsen and moves in on November 15, so he's packing every weekend until then. His sister Carla is getting married in June and asked him to give a toast, which he's dreading because he hates public speaking.

6. Kinship should: show **Kept for Leo** with every durable line (the move with its date, the packing, Carla's wedding in June as his sister's, the toast and the dread), nothing invented, no question about who "he" is, and no line filed on Carla as if she were in People.
7. Leo's page: Lately / Coming up lead with the move; **What Kinship knows** lists each line with a source; tapping a source opens the note with the words underlined.

**Pass:** everything in the note is on Leo's page with a source, in under a minute, without a single question Kinship did not need to ask.

## 2 · A correction and an Undo that are exact

**Why it matters:** the user's edit wins and nothing is lost (trust invariant 4; Option A's exact Undo).

1. On Leo's page, open the line about the move. Say the date was wrong: edit it to **November 22**.
2. Kinship should: show the edited line with "Edited by you · was: ~~November 15~~" in What Kinship knows, and the Portrait's Coming up now says the 22nd.
3. Tell again from Leo's page:

   > Actually the Pilsen move slipped again, it's December 6 now.

4. Kinship should: offer the new line as replacing the edited one ("Replaces: ~~…~~"), never silently; keep it; the Kept card names what it replaced.
5. Tap **Undo** on the Kept card.
6. Kinship should: bring back exactly the edited November 22 line, nothing else changed, the page and What Kinship knows agreeing.

**Pass:** the page reads the same as before step 3, and the sources still open.

## 3 · A promise of your own becomes a Moment, then a conversation (RSN-06 + SUA-1 + return check)

**Why it matters:** this is the loop the founder authorised (FD-30d/e): memory → a grounded opportunity → an action you chose → a real conversation.

1. Add Sam (from Contacts, with a phone number). Tell, as a general note:

   > I promised I'd bring Sam soup tomorrow because she's been completely overwhelmed at work. She hasn't decided which kind she wants.

2. Kinship should: keep it as **your promise** (not Sam's), with tomorrow's date; the Kept card says "Your promise".
3. Come back the next day (or move the simulator clock past midnight and reopen the app).
4. Today should lead with one Moment: **"You said you'd bring Sam soup."**, dated today, with **Message Sam** as the one primary action and a quiet Not now. Nothing else competes with it.
5. Open the Moment (or the hand-off sheet). Under Message / Call, the **SUA-1 line** is either absent (an open promise of your own is the action) or one quiet fixed "You could…" sentence grounded in a line you told; never a shop, never a second primary action.
6. Tap **Message Sam** → Messages opens with nothing pre-written. Come back.
7. Today asks **"Did you bring Sam soup?"** with Yes · Not yet · Didn't happen. Tap **Yes**.
8. Kinship should: record one conversation ("You reached out · today" on Sam's page), keep the promise as kept, and ask **"Anything worth remembering?"** → Tell Kinship / Nothing today.
9. Tell: *"She wanted the lemon chicken one and said the deadline moved to the 20th."* → kept for Sam.

**Pass:** the Moment appeared on the right day and only then; Yes recorded exactly one conversation; the follow-up note landed on Sam without a question.

## 4 · An open thread Kinship checks on, once (RSN-07)

**Why it matters:** showing up is often just asking how it went.

1. Tell from Felix's page:

   > Felix is weighing an offer in Denver, he'd move next spring. He's still in Oakland and hasn't decided. His partner is on the fence about leaving the Bay.

2. Kinship should: keep the thread (undecided, open) and the residence facts (Oakland now, Denver considered), nothing filed on his partner as a person.
3. Later (the day after a thread's own day when it has one, otherwise the configured check-in), Today offers **"Did Felix decide?"** · Ask Felix, below any promise, and never two days running.
4. **Not now** puts it aside; it does not return the next day.

**Pass:** one check-in, in the right register, never nagging; a sensitive thread (health, money trouble) never appears here.

## 5 · The private notification

**Why it matters:** one quiet nudge that never leaks a memory to the lock screen (FD-30e, D4's caps).

1. After scenario 3's **Yes**, Kinship may ask for notification permission (never before a useful Moment). Allow.
2. With a Moment due tomorrow (scenario 3 before its day), lock the simulator and advance to 09:00.
3. The lock screen shows **Kinship · "Something worth knowing about Sam today."** and nothing more: no memory, no detail, no second notification that day.
4. Tapping it opens Today on that Moment.

**Pass:** one notification, private wording, delivered at the sensible hour and never during quiet hours.

## 6 · Ask Kinship v1 from People search (WS-6)

**Why it matters:** retrieval over your own memory, grounded, never a chat.

1. In People, type **"Pilsen"** into the search field.
2. Kinship should: list the matching lines grouped by person (Leo), each with its source; tapping opens the source.
3. Type **"olives"** when nothing about olives has been told.
4. Kinship should: say it has nothing about that yet. No model, no answer that is not a stored line, no conversation.

**Pass:** every result is a line you told, with its source; an unknown is reported honestly.

## 7 · Paused and Remembered, export, and the quiet day (WS-4 + Today)

**Why it matters:** the trust floor: you decide who Kinship brings up, you can take everything out, and silence is correct.

1. On Sam's page, set **Paused**. Today must never surface Sam again (no Moment, no birthday line, no notification) until you unpause. The page still shows everything.
2. On a second person, set **Remembered**. The same silence applies; the page stays, marked quietly.
3. Settings → **Export**: a file with every person, line and source in plain text/JSON; nothing missing, nothing from another account.
4. On a day with nothing due, Today says **"Nothing needs you today."** (a mature account) and nothing else, no filler.

**Pass:** paused and remembered people are never proactive; the export is complete; the quiet day is quiet.

## 8 · A dense note and "Tell the rest" (FD-30c)

**Why it matters:** long, natural notes are processed, never pushed back.

1. Tell, from Mina's page, in one go:

   > Mina collects records, loves jazz, is learning Portuguese, keeps succulents on her desk, rides a bike to work, plays badminton, makes ceramics, reads fantasy, grows herbs and plays chess on Thursdays. She is also nervous about a job interview next Wednesday.

2. Kinship should: keep every line (ten facts and the interview as a thread with its date), with the interview held for a look-over only if a sensitive reading applies; no eight-item tail dropped; if a passage fails, the card says Kinship couldn't get to all of it and offers **Tell the rest**.
3. If offered, tap Tell the rest and say only: *"plays chess on Thursdays"* → kept for Mina, understood with the earlier note as context, never "Nothing to remember".

**Pass:** nothing from the note is silently missing from Mina's page.


---

## Revision, 31 Oct 2026: what changed in the scenarios after the redesign and the told-again fix

Each scenario above still stands; these are the precise differences a founder will see on the final head, taken from what was walked natively (`alpha-walkthrough.md`, walks 3 to 5).

- **The look.** Every screen is Electric Garden: a poster-weight name over a bloom on Today and the person page, a lettered People directory with two explicit doors ("Find someone" and "Ask your memory"), the Tell field as a compact pill with a round send arrow, and sheets that carry their own leaf art. Judge the *feel* with the question each scenario asks (would the other person feel remembered?), not against the old herbarium.
- **Scenario 2 (a correction and an Undo) is now three steps, and has two routes.** After editing a line by hand ("Edited by you"), tell the update, either from the person's page (route a) or from Today with no page (route b):
  - Route (b): Kinship first asks **"Who is this about?"** (Leo is offered), then **"Does this replace what you told me?"** with the edited line as the one-tap Yes, **No, keep both**, and Don't keep this.
  - Yes: the Kept card shows "Replaces: ~~the edited line~~"; Undo restores the edited line exactly.
  - No, keep both: both lines stand; Undo removes only the new one.
  - Route (a), from the page: the same replace question (the "Who is this about?" step appears only when the model could not tell).
  - Pass: the user's edited line is never overwritten without a question, and Undo is exact.
- **Scenario 3 (a promise becomes a Moment).** Today's Moment is the promise itself ("You said you'd bring Sam soup."), not a quiet line, and the Kept card sits under it; the return check is "Did you bring Sam soup?" with Yes · Not yet · Didn't happen. The notification permission is asked after the first hand-off, not before.
- **Scenario 4 (an open thread).** Stage it as WS-3's handoff describes (a thread told 42 days ago), or wait 42 days. Today shows **"Did Leo decide?"** with the thread in your words; the hand-off is **Ask Leo**; the return check is **"Did you ask Leo about it?"** with Yes · Not yet only. A Yes records one conversation and the check-in does not return.
- **Scenario 5 (the private notification).** In a local build, Settings › Notifications › "Test: send today's notification in 10 s" shows the lock-screen text **"Kinship" · "Something worth knowing about <Name> today."**; the real 09:00 planner is proven at UNIT only and the banner tap is not drivable on the simulator (cover it on the phone).
- **Scenario 6 (Ask).** Open "Ask your memory" in People. "Who do I know in Pilsen?" lists the line with its source; an unknown name plus a topic ("What is Marcus into?") says "Nothing about that in your memory yet." and shows nobody else's lines.
- **Scenario 7 (Paused and Remembered).** In Edit: Pause, Hold as remembered, Merge with someone, Remove from People, each with a plain sentence. Settings › Paused and remembered lists them with Resume; Resume from "remembered" asks once more.
- **New scenario 9: an unnamed update.** From Today (no page), tell *"Actually the Pilsen move slipped again, it's December 6 now."* with Leo's earlier move on record. Pass: Kinship asks "Who is this about?" and then the replace question; it never says "Nothing to remember in that one." (WS-1 `57863f4`) and never files a second line beside an edited one.

### Known gaps the founder should expect (so they are not mistaken for new defects)
- Delete account is proven in black-box and pgTAP; the local stack's Storage containers are stopped, so a native Delete shows the honest failure there. It needs a stack with Storage or the real project.
- On a second device's first render, Today can show a Moment for a paused person for a few seconds until the people pull completes (WS-4: a founder call).
- The person page's poster name and the Today thread headline can overlap the bloom art where the petals cross the text (WS-2).
- "You could ask if they'd like company." can win over "invite them to dinner" when a milestone and an event are both current (WS-3: a founder copy question).
