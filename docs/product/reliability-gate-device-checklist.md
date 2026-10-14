# Reliability gate: the founder's device check (5–7 minutes)

This check is for the build of `claude/native-pass-13oct` once it's merged, ai-gateway is deployed from `main`, and the build is installed. No migration is needed. Each step names the ledger row it checks. A row becomes VERIFIED only from this check.

**Before you start:**
- People has Anthony, Anthony Test, Sam Eden, Sam Doughty, Chris, Ben and John.
- If the earlier "Anthony and Sam love ice skating with Chris" lines are still there, remove them on Chris's What Kinship knows. Told again, the note joins a line that's already there instead of starting fresh (K9).

| # | Do | Expect | Row |
|---|---|---|---|
| 1 | Tell "Anthony and Sam love ice skating with Chris". Which Anthony → **Anthony Test**. Which Sam → **Someone else → Sam Eden**. Then Done | Two questions, each asked once. "Kept for …" names Anthony Test, Sam Eden and Chris, in the order the line names them. One line | K8, K9 |
| 2 | Open What Kinship knows for Anthony Test, Sam Eden, Chris, Anthony and Sam Doughty | The line is on the first three only. Chris is in its words, never replaced | K8 |
| 3 | On Chris's What Kinship knows: **Not this** on that line | Gone the moment you confirm. Nothing says "Understanding…" afterwards | K14, N9 |
| 4 | Tell it again. Which Anthony → **Anthony Test**. Which Sam → **Not sure** | One line, for Anthony Test and Chris. The word "Sam" stays in it | K4 run B |
| 5 | Close Kinship fully and reopen it | No question comes back. Today and the pages agree | K9 |
| 6 | Tell "Ben said he'd send me the photos last Friday" | The line reads "By Fri, Oct 9", or asks which Friday. Never Mon, Oct 12 | K10 |
| 7 | Tell "I need to call John tonight". Count the seconds until John is on Today | Never "Nothing needs you today." while John is there. Expect about the model's time plus 2–3 s (the model alone is 5–8 s) | K11, K12 |
| 8 | Tap the John line → **Message** → come straight back | "Did you reach John?" within about a second | K13 |
| 9 | **Not yet** | John stays on Today. No "Nothing needs you today." | K11, N6 |
| 10 | Close Kinship fully and reopen it | Same Today as step 9 | K11 |
| 11 | Open someone with many lines | Never "This person isn't here any more." while the page loads | N10 |

Report each step as passed or failed, with a screenshot of anything that failed. Steps 7 and 8 also need the time you counted.
