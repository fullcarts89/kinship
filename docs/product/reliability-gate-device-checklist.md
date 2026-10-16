# Reliability gate: the founder's device check (5–7 minutes)

This is for the app built from `main` with ai-gateway deployed from `main`. Each step gives:
- what to type and tap,
- what you should see, word for word where Kinship writes it,
- what counts as a failure.

Each step names the ledger row it checks. A row becomes VERIFIED only from this check.

**Before you start**
- People has Anthony, Anthony Lopez, Sam Eden, Sam Doughty, Chris, Ben and John.
- Remove any "ice skating" lines that are still there: on each of Chris, Anthony Lopez and Sam Eden, open What Kinship knows, tap **Not this** on the line, then **Forget**. Told again, the note would otherwise join a line that's already there instead of starting fresh.

**Known open from 14 Oct:** K15, K16 and K17. Until they're fixed, steps 1 and 2 are expected to fail as they did, with several lines and the card missing Sam's.

---

## 1. K4 run A: one memory for three people (K8, K9, K15, K16)

**Do**
1. On Today, tap **Tell Kinship** and type exactly: `Anthony and Sam love ice skating with Chris`. Send it.
2. Kinship asks two questions, in either order:
   - "Which Anthony do you mean?": tap **Anthony Lopez**.
   - "Which Sam do you mean?": tap **Someone else**, then **Sam Eden**. (Choosing Someone else on purpose checks that it renames only the Sam.)
3. Don't tap Done yet.

**You should see**
- Each question once.
- The card headed "Kept for Anthony Lopez, Sam Eden and Chris", then "Here's what I'll remember." The three names can come in the order the line names them.
- Exactly **one** line, naming all three. For example "Anthony and Sam love ice skating with Chris", or the same thing in other words that still name Anthony, Sam and Chris once each.

**It fails if**
- A question comes back after you answered it.
- The card shows two or more ice-skating lines, or a line missing any of the three.
- The heading leaves anyone out.
- "Chris" is replaced by another name.

Then tap **Done**.

## 2. K4: every page agrees (K8, K16, K17)

**Do:** open People, then each person, then **What Kinship knows about …**, for Anthony Lopez, Sam Eden, Chris, Anthony and Sam Doughty.

**You should see**
- Anthony Lopez, Sam Eden and Chris each show **one** ice-skating line, the **same** line, with the same words on all three pages.
- Anthony and Sam Doughty show no ice-skating line.

**It fails if**
- Any page shows two ice-skating lines, e.g. "Chris loves ice skating with Anthony and Sam" **and** "Anthony loves ice skating with Chris".
- The pages show different lines.
- One person's line is on Chris's page and another's isn't.
- Anthony or Sam Doughty shows the line.

## 3. Removal is immediate (K14, N9)

**Do**
1. Open People, then **Chris**, then **What Kinship knows about Chris**.
2. On the ice-skating line, tap **Not this**.
3. The alert "Forget this?" shows the line. Tap **Forget**.

**You should see**
- The line gone the instant the alert closes, with no pause and no flicker back.
- Go back to Today: the bar at the bottom never says "Understanding…".
- Open Anthony Lopez's and Sam Eden's What Kinship knows: the line is gone there too, because it was one memory.

**It fails if**
- The line stays visible for any noticeable moment after **Forget**.
- It comes back later.
- "Understanding…" shows afterwards.
- It's still on another person's page.

If K16 left other ice-skating lines on Anthony Lopez's or Sam Eden's pages, remove those the same way before step 4.

## 4. K4 run B: "Not sure" keeps the line (K4, K8)

**Do**
1. Tell Kinship exactly: `Anthony and Sam love ice skating with Chris`.
2. "Which Anthony do you mean?": tap **Anthony Lopez**.
3. "Which Sam do you mean?": tap **Not sure**.
4. Tap **Done**.

**You should see**
- "Which Sam do you mean?" offers **Not sure**.
- The card headed "Kept for Anthony Lopez and Chris", with one line: "Anthony and Sam love ice skating with Chris". The word "Sam" stays.
- On What Kinship knows: Anthony Lopez and Chris each show that one line. Sam Eden, Sam Doughty and Anthony show no ice-skating line.

**It fails if**
- There's no **Not sure**.
- The line is kept for either Sam.
- "Sam" disappears from the words, or is replaced by another name.
- There's more than one line.

## 5. Reopening asks nothing again (K9)

**Do:** swipe up from the bottom and pause to open the app switcher, swipe Kinship away, then open Kinship.

**You should see**
- Today with no "One thing to check".
- No question sheet opens.
- Anthony Lopez's and Chris's What Kinship knows still show the one line from step 4.

**It fails if** "Which Anthony do you mean?" or "Which Sam do you mean?" appears, or the line has changed or doubled.

## 6. K2: "last Friday" is Friday, Oct 9 (K10)

**Do:** tell Kinship exactly: `Ben said he'd send me the photos last Friday`.

**You should see**
- "Remember this about Ben?", then "“Ben said he'd send you the photos”", then "Ben · By Fri, Oct 9". Tap **Remember**.
- If it asks which day instead, one of the choices is Fri, Oct 9. Choose it.
- On Ben's page, the photos line goes with Fri, Oct 9 (it may say "Waiting on Ben", since that day has passed).

**It fails if** "Oct 12", "Mon" or any day other than Fri, Oct 9 appears, on the card or on Ben's page.

## 7. N6: Today tells one truth (K11, K12)

**Do**
1. On Today, tell Kinship exactly: `I need to call John tonight`.
2. Start counting when you tap send.
3. When the card appears, tap **Got it right**.

**You should see**
- "Call John" on Today, under the card "Kept for John".
- At no moment, from sending until "Call John" appears and afterwards, the large headline "Nothing needs you today." while "Call John" is on Today.
- "Call John" on Today within about 10 seconds: the model takes 5–8 s, plus 2–3 s.

**It fails if**
- "Nothing needs you today." shows while "Call John" is on Today.
- It takes much longer than about 10 seconds. Note how many.

## 8. The return question comes at once (K13)

**Do**
1. On Today, tap **Call John**, then **Message**.
2. Messages opens. Don't send anything.
3. Come straight back to Kinship: tap "◀ Kinship" at the top left, or switch apps.

**You should see** "Did you reach John?" with **Yes** and **Not yet**, within about a second of Kinship appearing.

**It fails if** it takes noticeably longer than a second, doesn't come, or "Nothing needs you today." shows instead.

## 9. "Not yet" keeps John (K11, N6)

**Do:** tap **Not yet**.

**You should see** the question goes away, "Call John" is still on Today, and the headline isn't "Nothing needs you today.".

**It fails if** "Call John" disappears or "Nothing needs you today." shows.

## 10. Reopening keeps the same Today (K11)

**Do:** swipe Kinship away in the app switcher and open it again.

**You should see** "Call John" on Today, and the headline isn't "Nothing needs you today.".

**It fails if** "Nothing needs you today." shows, or "Call John" is gone.

## 11. A big page never says someone is gone (N10)

**Do:** open People, then the person with the most lines (e.g. Chris or Ben), then **What Kinship knows about …**.

**You should see** the page fills in. It may be blank for a moment first.

**It fails if** "This person isn't here any more." shows, even for an instant.

---

Report each step as **pass** or **fail**. For a fail, send what you saw and a screenshot. Steps 7 and 8 also need the seconds you counted.
