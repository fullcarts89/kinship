# Alpha acceptance scenarios (founder native pass)

**Written 30 Oct 2026 by WS-5 (integration) for the release candidate on `claude/alpha-integration` (PR #74).**
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
