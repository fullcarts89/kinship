# K-series native check (K4 · K5 · K7 · K6 · K2 · K3 · N6, and the I2 trail)

*13 Oct 2026. For the founder, on a physical iPhone, on the next build (CC-22). This is last-mile validation: the logic below has already been through the internal verification gate (`k-series-verification.md`). What it can't prove is how it feels on the phone and the real Messages round trip. Rows move to VERIFIED in `bug-ledger.md` only on your say-so.*

**Before you start:** the ai-gateway redeploy, `npx supabase db push` (migration `20261013090000`) and the new build must all be done, in that order. Without the redeploy, rows 1–3 run old server code.

People you need: Anthony, Anthony Test, Sam Eden, Sam Doughty, Chris, Ben, Tyler and Loo Loo (as you have them). Make sure no Josh is in People.

| # | Item | Do | Pass when |
|---|---|---|---|
| 1 | K4 | Tell "Anthony and Sam love ice skating with Chris" | Two questions: "Which Anthony do you mean?" with **Anthony · Anthony Test**, then "Which Sam do you mean?" with **Sam Eden · Sam Doughty** (each with Someone else). Choose Anthony Test, then for Sam: Someone else → Sam Eden. The card says it's kept for Anthony Test, Sam Eden and Chris. The line is on all three pages, and on neither Anthony nor Sam Doughty |
| 1b | K4 | The same note again; answer the Sam question with **Not sure** | Kept for the Anthony you chose and Chris. No Sam is linked, and the words still say "Sam" |
| 2 | K5 | Tell "I got the job, and can't wait to tell Loo Loo" | Never "Nothing to remember". What you see depends on how it was read, and each is right: "You got the job" kept for Loo Loo (under Between you), or "You got the job, and can't wait to tell Loo Loo" (under Coming up). The job is never missing from it. Also try it with "Wifey". Then "I got the job." on Today: it asks "Who is this about?" with Don't keep this |
| 3 | K7 | Tell "Chris' dog Fluffy has a vet appointment on Friday" | No question at all. On Chris's page, and on Today's Coming up as Friday nears. Never "Who is Chris'?" |
| 4 | K6 | Tell "Ben is thinking about reaching out to Josh about a job" | Kept for Ben. The card shows "Josh isn't in People yet." with **Add Josh** · **Not now**. Add Josh: Josh is in People once, and the same line is on his page (no copy). On another such note, Not now creates no one |
| 5 | K2 | A promise of someone else's whose day has passed (e.g. Tyler's "By Fri, Oct 9", or tell "Ben said he'd send me the photos yesterday") | Never under Coming up. On their page it's under Lately, marked "Waiting on Tyler". Nothing says "overdue" or "late" |
| 6 | K3 | A "Waiting on …" line on Today (it shows 1–3 days after someone's promise was due; row 5's "Ben said he'd send me the photos yesterday" makes one the next day): tap it → Message. Send something, come back → **Yes** | No "Anything worth remembering?" follows (it's logistics). "Waiting on Ben" is gone and stays gone after you close and reopen the app. On Ben's page, Between you shows "You messaged · <day>" with the promise underneath, and the promise no longer says "Waiting on Ben" |
| 7 | N6 | A Today Moment (an upcoming event or a follow-up) → Message → come back → **Not yet**. Close the app, wait a minute, reopen | The Moment is back on Today. Nothing was added under Between you |
| 8 | I2 | On a person's page: **Add a conversation** → In person | "You saw <Name> · <today>" under Between you. In What Kinship knows, **Not this** on it asks first, then removes it. "You reached out · …" under the name is gone |

**While you're in there:** whether the questions in rows 1–2 feel narrow and clear, and whether the trail feels like history rather than tracking. Confusion is evidence.

Not in this build: I2b (inferring a conversation), H4 and H15. K1's existing duplicate on Tyler's page is still there by design (no data cleanup): "Not this" on one of the two lines removes it.
