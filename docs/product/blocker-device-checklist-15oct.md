# Device check: the blocker bundle (about 5 minutes)

Four things only: K20, K15–K17, K19, K23. If they pass, we move on to H4 and Phase 4B.
Every step below passed on the iOS 27 simulator first, with the live model and your exact People
(15 Oct; evidence in `bug-ledger.md`).

**Before you start (your steps, when you say so):** merge the branch (merge commit), deploy ai-gateway from
`main` (K20's and K16's fixes run there), build and install. No database push this time.

**One minute of setup:** your account still has the older ice-skating lines from 12–14 Oct. Open Chris →
What Kinship knows, and remove any line about ice skating with **Not this**. (Telling a thing again still
makes a second line: that's K18, deferred to the semantic-memory work, and not part of this check.)

## 1. "Call John tonight" reaches Today (K20, K19) · about 1 minute

1. On Today, type **I need to call John tonight** and send.
2. **Expect:**
   - While it's being read, Today's headline says **Understanding…**. Never only the date and "Good evening".
   - Within a few seconds: the card **Kept for John · Call John**, and on Today a line **Today · Call John**.
   - The date at the top reads like **Thursday, Oct 15**.
   - Never **Nothing needs you today.** while Call John is there.
3. **Fails if:** no Call John on Today after 10 seconds, or Today is only a date and a greeting.

## 2. The return question from Today (K20) · about 1 minute

1. Tap **Call John** on Today → **Message**. In Messages, don't send anything; come back to Kinship.
2. **Expect:** **Did you reach John?** with Call John under it.
3. Tap **Not yet**. **Expect:** Call John stays on Today.

## 3. The return question from John's page (K23) · about 1 minute

1. **People → John.** Under **You said you'd**: Call John. Tap **Message** at the bottom, then **Open Messages**.
   Don't send; come back.
2. **Expect:** **Did you reach John?** on John's page (it's on Today too).
3. Tap **Yes**. **Expect:** under **Between you**: **You messaged · Oct 15 · Call John**. Back on Today, Call John
   has gone.
4. **Fails if:** no question on return, or Call John is still on Today after Yes.

(On the page, You said you'd still lists it below the other sections: that's K22, deferred to the H15/B8 page
work.)

## 4. One sentence, one memory (K15, K16, K17) · about 1½ minutes

1. On Today, type **Anthony and Sam love ice skating with Chris** and send.
2. **Which Anthony do you mean?** → **Anthony Lopez**. **Which Sam do you mean?** → **Sam Eden** (both Sams are offered).
3. **Expect:**
   - The card says **Kept for Anthony Lopez, Sam Eden and Chris**, with **one** line in your words.
   - While the card is up, Today's headline says **Nothing else needs you today.** (or One thing to check. while asking).
   - Anthony Lopez's, Sam Eden's and Chris's pages each show that same one line. Anthony's and Sam Doughty's don't.
4. Close Kinship completely (swipe it away) and open it again. **Expect:** Today has a headline under the
   greeting, never only the date and the greeting.
5. **Fails if:** more than one ice-skating line, a page missing it, someone left off the card, or a bare Today.

## What to send back

Pass or fail for each of the four, and a screenshot of anything that fails.
