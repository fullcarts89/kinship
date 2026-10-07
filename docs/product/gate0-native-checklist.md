# Gate 0 native gate (targeted)

*7 Oct 2026. For the founder, on a physical iPhone, after Gate 0 Final Trust Closure (CC-18). Short and targeted: each row is the original scenario, not an exploratory pass. A row passes only when it behaves as written on the phone; browser renders and tests don't count. Mark rows VERIFIED in `bug-ledger.md` only on the founder's say-so.*

## Before you start (on your Mac, in this order)

Gate 0 has **no database migrations** (production stays at `20261007090000`), so there is **no `db push`**.

**I8 follow-up (7 Oct):** the first Gate 0 build (`b60b84c`) still opened 1.0 on a cold start. The fix (`099f47e`) is in the app only: after it is merged, pull `main` and build again (no ai-gateway deploy needed for it). Row 1 counts only on that build.

1. Merge the branch into `main` with a merge commit, when you're happy to (no PR is open; ask me to open one if you want it reviewed first).
2. Redeploy ai-gateway (I10, I12b, I3 and the spoken-name fix run there):
   ```
   export SUPABASE_ACCESS_TOKEN=sbp_…
   npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio
   ```
3. Build and install the dogfood build, when you say so:
   ```
   npx eas-cli build --profile dogfood-v2 --platform ios
   ```

## One-time, on your phone (your own data, your choice)

- **Cutie Pie (I12).** Your rename happened before the fix, so nothing recorded "Wifey". Rename her to **Wifey**, then back to **Cutie Pie** (Edit beside her name). Her lines then show "Cutie Pie".
- **The line already moved to Kaiya (I13).** It was moved before the fix and still says "Wifey has a new job…". Fix its words once with Edit.
- **"My daughter Kaiya" (I3).** You can now remove this duplicate yourself: open it → Edit → Remove from People. Nothing is deleted.

## The gate

| # | Item | Do this | Pass when |
|---|---|---|---|
| 1 | I8 | Cold start; force-quit and reopen; airplane mode, then reopen; sign out and back in; tap any old Kinship notification | It always opens 2.0. Never the old app |
| 2 | I10 (+H13) | Tell "Michelle and Sam might be moving to Australia." | One line, kept on Michelle. One question: "Which Sam do you mean? · You have more than one Sam." with Sam Doughty · Sam Eden · Someone else, never Michelle. Today never says "Nothing needs you today." behind it. After choosing a Sam, the card says "Kept for Michelle Lee and Sam …" and the line is on both pages once |
| 3 | I13 | Tell something about one person, e.g. "Ben's new job starts Monday."; on the card or Ben's page, change who it's about to someone else | The words now name the right person ("Josh's new job starts Monday"), with "Edited by you · was: ~~Ben's new job…~~". Source still shows your note. A line like "She has a new job" keeps its words |
| 4 | I12 | After the one-time rename above: open Cutie Pie's page and What Kinship knows. Then tell "Wifey got a raise." | Lines read "Cutie Pie …"; titles read "What Kinship knows about Cutie Pie"; Source shows your original "Wifey …". The new note is filed on Cutie Pie and reads "Cutie Pie got a raise" |
| 5 | I5 | Tell "Susan and Michelle went to Disneyland." | The card says "Kept for Susan Oxnard and Michelle Lee" |
| 6 | I9 | Tap the Kept card to open its details; close them (swipe down, then try Done) | You're back on the same card each time, with Got it right / Not quite still there |
| 7 | I11 | On a line whose words name two people in People, tap the person token → "Who is this about?" | Only those people are offered (with Someone else and Done). Choose both → Done → the line is on both pages once |
| 8 | I3 | On someone's page: Edit → Remove from People → Remove. Then Settings › Removed from People › Bring back. Then remove them again and tell something about them | Removing asks first; they leave People and Today; a memory shared with someone else stays on that person's page; nothing is lost on Bring back (same person, same lines). A Tell about them asks "<Name> was removed from People." with "Bring back <Name>", never "Add <Name>" |
| 9 | I12b | Tell "<someone> got promoted on Monday and said she might be moving to Seattle." | The promotion has no Maybe; the Seattle line does |
| 10 | G5 | Use the app normally through this gate | No freeze. Note the time of any freeze. PostHog shows no `app_stall` of 3 s or more |
| 11 | Telemetry | PostHog → Activity after a few Tells | `tell_lifecycle` arrives with `understanding_bucket`, `backgrounded`, `app_version`, `build`, `platform`, `os_version`; no words, names or ids anywhere |

If every row passes, tell me which ones you consider confirmed and I'll mark them VERIFIED in the ledger.
