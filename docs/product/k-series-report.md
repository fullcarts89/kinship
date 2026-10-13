# K-series remediation + I2/N6/K3/K2: report (A–S)

*13 Oct 2026, for the founder (CC-22). The brief's report, sent only after the internal verification gate (`k-series-verification.md`). Everything here is FIXED on the branch `claude/awesome-edison-3cuf6z`; nothing is VERIFIED, deployed, merged or built.*

## A. K4: several people on one line
- **Root cause** (reproduced through the real pipeline, review and answer path):
  - Who else a line is about was worked out only once its own person was settled, so a line held for "Which Anthony?" lost Chris and Sam.
  - A name two people share was dropped from the line silently.
  - Two held lines with the same words were merged, so Sam's question vanished.
  - In the app, "Who is this about?" was cut to four choices, which left the second Sam off.
- **Fix:**
  - Everyone clearly in People stays on the line while the rest is asked.
  - Each shared name is its own question ("Which Sam do you mean?") with every person it can mean. "Someone else" renames only that name; "Not sure" leaves it unlinked.
  - Mirrored lines of one sentence become one memory.
- **Hardened by four review rounds:**
  - A name counts only when written as a name: capitalised in the line, the note or the model's statement, or in a script without capitals.
  - Nicknames are read before first names.
  - A full name settles a name only when every use of that name is the full name.
  - A name someone removed also went by is asked, with Bring back.
  - A "Which Sam?" never brings back a line the user declined or removed.

## B. K5: plausible content never disappears
- **Root cause:** a line about the user that wasn't a plan, moment or event was dropped (`bad_kind_subject`). When the model read "I got the job" as a fact about the user, nothing was left. Ben and Loo Loo were treated identically by the code; the difference was the model's reply.
- **Fix:** such a line is kept in its own words, never widened, for the person the sentence says the user tells. Otherwise:
  - the person its own quoted words name;
  - else the page it was told on, when the sentence names no one;
  - else it is asked "Who is this about?" (never "Nothing to remember").

  Its sensitivity comes from its own words and statement. A removed person who is told is always asked.
- **One narrow exception:** a plan that only tells someone keeps the user's own good news from a fixed set ("You got the job and want to tell Loo Loo later"). Two earlier, wider versions were withdrawn after review, because they could carry sensitive news or someone else's news.

## C. K7: possessive names
- **Root cause:** `nameKey` and `wordsOf` stripped "'s" but not a lone "'" after an s, so "Chris'" was someone new.
- **Fix:** possessive endings are stripped for matching only, everywhere names are read (server and app). "O'Connor" keeps its apostrophe, and nothing stored or shown is rewritten.

## D. K6: someone a line names who isn't in People
- **Root cause:** "Add <name>" was offered only for a few sentence shapes.
- **Fix:** it's also offered for someone the line reaches out to, talks to, tells, texts, calls, contacts, emails, messages or meets.
  - Never a relation word, a title or a service.
  - Someone already in People is linked automatically; a shared name is asked.
  - Add links the same memory, never a copy.

## E. I2: the interaction trail
**Built: "know it" and "ask it".**
- **What is recorded:** a Yes to the return check records one conversation, with what it was about and which kind of Moment led to it. A retry, a relaunch or a sync never adds a second. Opening Messages or Phone records nothing, and neither does Not yet.
- **Where it shows:**
  - Under Between you: the newest three ("You messaged · Oct 12" with the memory underneath).
  - What Kinship knows lists every one, with Not this (asked first).
  - Add a conversation offers Message · Call · Video · In person.
- **What's gone:** "You reached out · <date>" under the name.
- **What's never shown:** counts, frequency or "last contacted".
- **Not built:** inferring a conversation (I2b).

## F. N6: Not yet
- **On the phone:** Not yet marks the reason "not yet", which keeps it open whatever the server last said.
- **In the database:** the migration makes `return_not_yet` put an acted reason back to surfaced while its window lasts. It never does so for a reason whose memory or person is gone.

## G. K3: the return-loop state machine

| Event | What happens |
|---|---|
| Hand-off | Remembered on the phone before the other app opens, and recorded as "acted" on a server reason. Nothing is recorded as a conversation. |
| The other app never opens | Counts as Not yet. |
| Yes | The conversation is written first (dated when Kinship opened it, once, by a key of the hand-off), then the answer is kept. The reason is done. |
| Not yet | Nothing is recorded, and a conversation written just before a crash is taken back. The reason may speak again. |
| "Waiting on X" | Steps aside once handed off, answered or put aside, or once a conversation with X about that promise, on or after its day, has synced from any phone. While a return question about it is open, it doesn't ask the same thing. |
| "Anything worth remembering?" | Skipped after a Waiting Yes or a due promise's Yes (logistics). |
| Not this on the conversation | Lets Waiting ask again. |

## H. K2: a promise's life
- **Coming up:** through its day, on the phone's calendar day.
- **From the day after,** if still open:
  - **Today:** "Waiting on X" on days 1–3.
  - **Their page:** under Lately for 30 days, marked "Waiting on X". It becomes plain once the user has reached them about it, and is then only in What Kinship knows.
  - **Never** for someone remembered or paused.
- **Resolved or cancelled:** not active anywhere.
- **No day, or only a month or a year:** never a past-due state.
- **Never any guilt words or a count of days.**

## I. K1: the duplicate on Tyler's page
- **Cause:** both lines came from one note on Oct 6, before H13's shared-line rule reached production (PR #19).
- **New notes:** they already become one line, and K4's mirror collapse covers more shapes.
- **Your existing duplicate:** it stays. Data cleanup isn't authorised, and "Not this" on one of the two lines removes it.
- **Option, not built:** a display-only collapse of two identical lines from the same note.

## J. Migrations
One migration: `20261013090000_v2_interaction_trail`. It is additive and forward-only, and not applied.
- On `contact_events`:
  - `memory_item_id` (FK);
  - `moment_type`, with a CHECK that adds `coming_up` and `waiting`;
  - channel `video`;
  - the `return_check` CHECK widened.
- `reason_events_apply` gains N6's clause, with its person and evidence guards.

## K. Dependencies
None added or changed.

## L. Tests and evals
All on 13 Oct:

| Check | Result |
|---|---|
| Jest `TZ=UTC npx jest --no-cache` | 86 suites / 738 pass |
| Deno | 332 pass |
| pgTAP | 546 pass |
| tsc | clean |
| ESLint | 0 errors |
| Evals (oracle and realistic oracle) | pass |
| Replays of the two saved model runs | identical to the baseline |

Mutation results are in `k-series-verification.md`.

## M. Commits
Since `28e28e7`:
- Code: `263e94f`, `6609134`, `a4a2a29`, `29bb8f1`, `559e3e7`.
- Docs: `f4a7947`.
- Review round 1: `fbb23bb`, `3c8bd21`, `58dd897`.
- Review round 2: `8504e90`, `3b3711d`, `a1a5a2f`, `c1a737f`, `cb839db`.
- Docs: `6026ed4`.
- Review round 3: `0dc1619`, `2b2b1de`.
- Review round 4: `2b0ef27`.
- Review round 5 and the CC-23 guard: the commit after these docs.
- Then this report's docs.

## N. Ledger
- K1 is FIXED for new notes (your existing duplicate stays).
- K2–K7, N6 and I2 are FIXED.
- None is VERIFIED. Each row names its commits, tests and mutation checks.

## O. Deploy, db push and build (only when you say so, in this order)
1. Merge the branch into `main` with a PR, using a merge commit.
2. Redeploy ai-gateway from `main`, in Terminal: `npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio`.
3. `npx supabase db push` (it may ask for the database password: type it in Terminal yourself).
4. The local build: `SENTRY_DISABLE_AUTO_UPLOAD=true npx eas-cli build --local --profile dogfood-v2 --platform ios --non-interactive --output <ipa>`, then `xcrun devicectl device install app --device <your iPhone> <ipa>`.

The order matters:
- K4, K5 and K7 run in ai-gateway, so without the redeploy the phone tests old server code.
- A build used before `db push` would have its conversations refused by the server.

## P. Next native checklist
See `k-series-native-checklist.md`: eight rows (K4 ×2, K5, K7, K6, K2, K3, N6, I2).

## Q. Phase 4A
- **Slice 1** (I4, I6, I1 with J3, H16 with N7, N8) is merged and FIXED, with its native check pending.
- **This pass adds** I2 (with N6), plus K2 and K3.
- **Next:** H4 (4A step 6), after the native check.

## R. Phase 4B
- B0 (N8) is merged.
- B1 (the closed taxonomy, computed and never shown) is built.
- **B2 waits for you to read B1's result.**

## S. Decisions (settled by the founder, 13 Oct: CC-23)
*Kept as asked, for the record: every item below was approved or settled in CC-23.*
1. **CC-22's nine implementation choices:**
   - how your own news is kept, and its one narrow exception;
   - "Not sure";
   - the page's "Waiting on …";
   - the I2 copy;
   - when "Anything worth remembering?" is skipped;
   - two extra moment types;
   - what counts as a name;
   - a removed namesake asked with Bring back;
   - a declined line never coming back.
2. **Known limits:**
   - Lines about a relative, and promises, link no one else (as before K4). Extend later?
   - K1's display-only collapse: build it, or leave the duplicate for "Not this"?
3. **Still open from before:**
   - I1's Message / Call question.
   - B2 (after B1's result).
