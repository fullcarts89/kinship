# Gate 0 remediation: native gate (targeted)

*8 Oct 2026. For the founder, on a physical iPhone, after the narrow Gate 0 remediation pass (decisions of 8 Oct). Each row is the original scenario from `gate0-native-findings.md`; it is not an exploratory pass. A row passes only when it behaves as written on the phone, and browser renders and tests don't count. Rows are marked VERIFIED in `bug-ledger.md` only on the founder's say-so.*

**Readiness: NOT READY** until this gate is run. If these trust cases pass, Gate 0 closes and Phase 4 starts.

## Before you start (on your Mac, in this order)

This pass has **one database migration**, `20261008090000_v2_person_mentions` (I12). It is additive:
- It adds a `person_mentions` column, and older builds ignore it.
- It records, line by line, which words name which person.
- Statements, notes, sources and history are untouched.

1. **Merge** the branch into `main` with a merge commit, when you're happy to. No PR is open; ask me to open one if you want it reviewed first.

2. **Apply the migration** (after the merge, from `main`):
   ```
   npx supabase db push
   ```
   - It also runs the conservative backfill for your existing lines. The output ends with a notice of how many lines it filled and how many it left as written.
   - Run this before step 4: the new ai-gateway writes the new column.

3. **Optional: see what the backfill left as written.** These are your own lines; run this in the Supabase dashboard's SQL editor. It only reads:
   ```sql
   select r.reason, m.statement
   from public.person_mentions_backfill_report r
   join public.memory_items m on m.id = r.memory_item_id
   order by r.reason;
   ```
   A line listed there reads exactly as it did before. Each reason is a safety rule, from the migration's header:
   - `names_someone_else`: a name in it is another person's.
   - `names_someone_close`: it starts with a family word.
   - `repeated_in_line`: the name is written twice.
   - `shared_line`: it is about two people with the same word.
   - `common_word`: the word is also used in lowercase.
   - `used_once`: the earlier name appears in one line only.
   - `used_for_others`: the word is used on other people's lines.

4. **Redeploy ai-gateway.** J4, J1, J11, I12 and I13 run there.
   ```
   export SUPABASE_ACCESS_TOKEN=sbp_…
   npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio
   ```
   - Put the token on its own line, never in this chat.
   - Delete the token in Supabase afterwards.

5. **Build and install the dogfood build**, when you say so:
   ```
   npx eas-cli build --profile dogfood-v2 --platform ios
   ```

## Your own data (nothing to do unless you want to)

- **"Wifey" for Loo Loo.**
  - Where several of her lines start with "Wifey" and nothing else rules it out, the backfill records "Wifey" as one of her earlier names. Those lines then read "Loo Loo …", and a new note saying "Wifey" finds her.
  - If it couldn't (the report says why), row 2 asks "Who is Wifey?" once. Choose Loo Loo, and later notes find her.
- **The 7 Oct "Sam loves watching Dragonball Z" line on Chris.**
  - If you tapped Yes on "Is this the Sam…?", it is also linked to Sam Eden. That link is your data and is not changed.
  - To fix it, open the line → Who → choose Chris only.

## The gate

| # | Item | Do this | Pass when |
|---|---|---|---|
| 1 | I12 | Open Loo Loo's page and What Kinship knows | Lines told while she was "Wifey" read "Loo Loo …" (where the backfill could tell). Source still shows your original "Wifey …". Titles read "What Kinship knows about Loo Loo" |
| 1b | I12, decision 1b | With someone called e.g. Elizabeth Chen: tell "Liz got promoted." and answer Elizabeth. Then rename her "Lizzie" | First it reads "Liz got promoted" (your word). After the rename it reads "Lizzie got promoted". Source keeps "Liz" |
| 2 | J4 | Tell "Wifey got a raise." | Never "Nothing to remember". Either it is kept on Loo Loo and reads "Loo Loo got a raise", or it asks "Who is Wifey?" with Add Wifey · Someone already here · Don't keep this. The words are yours: "wife" never appears |
| 2b | J4 | Tell "Zed got a raise." → Add Zed | "Who is Zed?" with Add Zed. One tap: Zed is in People with "Zed got a raise" |
| 2c | J4 | Tell "testing" | Only "Nothing to remember in that one." ("Your note is saved" is gone) |
| 3 | I13 | With two Anthonys and two Sams: tell "Anthony and Sam love watching Dragonball Z." Answer both questions with Someone else → Chris | Two questions: "Which Anthony do you mean?" then "Which Sam do you mean?", each with only its own people. The card shows one line on Chris, "Chris loves watching Dragonball Z", with "was:" history on the line's sheet. Your note is untouched |
| 4 | J7 | After row 3, open both Sams' and both Anthonys' pages | None asks "Is this the Sam (Anthony) in …?" about that line, nor about the 7 Oct one |
| 5 | J1 | On Pedro's page: tell "He loves Susan." | No question. "Pedro loves Susan" is kept for Pedro |
| 5b | J1 | With a John in People, on Pedro's page: tell "John visited yesterday. He loves Susan." | "Who is “he”?" with John · Pedro · Both · Someone else. Never Susan (with no John in People: Pedro · Someone else) |
| 6 | J2 | On a kept line about Ben (e.g. "Ben starts a new job"), tap who → search "Josh" (not in People) | "No one by that name yet." with **Add Josh**. One tap: the line reads "Josh starts a new job" on Josh's page, with "was:" history. Josh needs no number |
| 7 | J6 | Tell "John and Ben like to play dress up but are thinking about quitting the hobby." (any note that keeps four or more lines) | The card shows three lines and **and 1 more**. Tapping it shows the fourth line in place, and tapping that line opens its details. VoiceOver reads "and 1 more, button" |
| 8 | J5 | Open a line's sheet on Ben's page; swipe down from the middle of it. Then open a long review, scroll down, and swipe down. Then open the Kept card's details and swipe down | The line's sheet closes from anywhere. In the long review the content scrolls back up first, and a swipe from the top closes it. The Kept card's details close back to the same card (I9). With the keyboard up, a swipe first puts it away |
| 9 | Today headline (J8) | Look at Today with a Kept card up, with its details open, and with a question open | Never "Nothing needs you today." behind any of them |
| 10 | Mochi (J9) | Tell "Ben's dog Mochi has a vet appointment Friday." (or look at the existing one, if it's within the next 7 days) | It's on Today's Coming up, as on Ben's page, with no question for your yes. A person's own medical appointment still never shows on Today |
| 11 | J11 | Tell "Anna asked me to water her plants while she's away." (with an Anna in People), then answer Yours | Never "Nothing to remember". "Whose promise?" with Yours · Anna's · Don't keep this, quoting the line. After Yours it's under "You said you'd" on Anna's page |
| 11b | J11 | Tell "I got the job! Can't wait to tell Ben." | Never "Nothing to remember", and no to-do. The line is kept for Ben, shown on the card for a glance, and sits in Coming up on Ben's page (never on Today) |
| 12 | G5 / app_stall | Use the app normally through this gate | No freeze; note the time of any. PostHog shows no `app_stall` of 3 s or more |

If every row passes, tell me which ones you consider confirmed and I'll mark them VERIFIED in the ledger. Then Gate 0 closes and Phase 4 starts. Any new P0 trust failure goes back into this gate, not into a new stabilization phase.
