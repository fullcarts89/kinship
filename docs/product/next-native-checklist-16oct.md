# Device check: Today, H4 and "Who is …?" (about 5 minutes)

Three product checks, each run first on the iOS 27 simulator with the live model (16 Oct). Needs a build from
`main` after this branch merges. No ai-gateway deploy and no database change are needed for it.

## 1. Today while a note is read (K24) · about 1 minute

1. On a quiet Today ("Nothing needs you today."), tell **Ben loves pottery**.
   - **Expect:** only the box above the Tell field says **Understanding…**. Today's headline never does.
   - **Expect:** "Nothing needs you today." is gone while the note's card is up, and comes back once you tap **Got it** on the card.
2. With a line on Today (for example "Tomorrow · Call …"), tell **I need to call Ben tonight**.
   - **Expect:** the line stays where it is; only the box says **Understanding…**; then **Today · Call Ben** appears.
- **Fails if:** "Understanding…" is ever shown twice, or Today jumps to another big headline while the note is read.

## 2. "Who is Matt?" from your contacts (K25) · about 2 minutes

1. Make sure someone in your phone's Contacts isn't in Kinship's People yet (here "Matt").
2. On Today, tell **I need to call Matt tomorrow**.
3. **Expect:** **Who is Matt?** with **Choose from Contacts**, **Add Matt**, **Someone already here**, and **Don't keep this**.
4. Tap **Choose from Contacts**.
   - **Expect:** the iPhone's own contact list. Kinship doesn't ask for Contacts permission.
5. Choose Matt.
   - **Expect:** **Kept for Matt …** with Matt's full name, and on Today **Tomorrow · Call Matt**.
   - **Expect:** People has one Matt, with his birthday if Contacts has one ("From Contacts").
6. Try it once more with someone else, and tap **Cancel** in the contact list.
   - **Expect:** the question is still there, with **Add …** still available.
- **Fails if:** a second Matt appears, the note disappears, or Kinship asks for Contacts permission.

## 3. H4: what Today is for (about 2 minutes, needs a new account)

H4 shows once, only right after an account's first Tell, so it needs a **new account**: a second Apple ID or an email sign-in you create yourself. Your own account won't show it.

1. Sign in with the new account and go through setup. Add one person, for example **Ben**. At **Tell Kinship one thing about someone**, type **Ben runs a half marathon on Sunday** and tap **Keep it**.
2. **Expect:** on Today, once it's understood:
   - **This is where Kinship brings things back, when they matter.**
   - **YOU TOLD KINSHIP** · your words;
   - **AROUND SUNDAY** · "Kinship brings it back here, with Message and Call.";
   - **WHEN YOU'RE BACK** · "Did you reach Ben?";
   - the real line under it (**Sunday · Ben runs a half marathon**).
3. Tap **Got it**, close Kinship, open it again. **Expect:** the explanation doesn't come back.
4. **The real test:** without coaching, could someone say what Today is for?
- **Fails if:** it's a carousel or tour, it repeats, or it promises something Kinship doesn't do.

## What to send back

Pass or fail for each of the three, a screenshot of anything that fails, and whether H4's copy (beyond the approved headline) reads right.
