# Device check: B7 (the Portrait says a residence once) and B8 (What Kinship knows in sections, with Before) · about 10 minutes

Phase 4B B7 and B8 (`phase4-implementation-brief.md` §26, §27). Needs a build from the B7/B8 branch (or `main` after it merges). **No database change and no gateway change:** ai-gateway v15 (already deployed) is enough; everything here runs on the phone over what it already syncs. Use the test person **Susan** on your own account, with no residence lines left over from the B5 check (Undo or "Not this" them first). Undo or "Not this" leaves nothing behind.

Rows 8–13 below are brief §16's 4B rows, as B7 and B8 make them; the labels are the only readiness words: NOT READY · READY FOR FOUNDER NATIVE PASS · READY FOR WIFE DOGFOOD.

## 1. B7: one residence, one line on the Portrait (brief §16 row 8) · about 1 minute

1. Tell **Susan lives in California.** → **Got it right**. Tell **Susan lives in Alameda.** → **Got it right**.
   - **Expect:** no question either time.
2. Open Susan's page.
   - **Expect:** under **Lately**, **Susan lives in Alameda** once, with its own "You told Kinship · <today>". **No** "Susan lives in California" and **no** "Lives in Alameda, California" on the page. At the bottom, "What Kinship knows about Susan →".
3. Open **What Kinship knows about Susan**.
   - **Expect:** a **Background** heading, then **Lives in Alameda, California** with "You told Kinship · <today> · and 1 other note" (B5, unchanged); no other heading (nothing else is told).
- **Fails if:** both residence lines show on the page, the composed wording shows on the page, or Background is missing.

## 2. B7: the chain's date is its newest note · about 1 minute

1. Tell **Susan loves pottery.** → **Got it right** (any plain line).
2. Open Susan's page.
   - **Expect:** **Lately** lists **Susan loves pottery** and **Susan lives in Alameda** (both told today, newest first; the residence line keeps its one slot).
3. In What Kinship knows, **Into** now shows **Loves pottery** (the leading name dropped, the verb kept); Background is unchanged.
- **Fails if:** a second residence line appears, or "Loves pottery" lands anywhere but Into.

## 3. B8: a move, Before, and Undo (brief §16 rows 9 and 10) · about 2 minutes

1. Tell **Susan moved to Colorado.** → do **not** tap Got it right yet.
   - **Expect:** the Kept card says **Susan moved to Colorado** with **Replaces: ~~Susan lives in Alameda~~** and **Replaces: ~~Susan lives in California~~** (B4).
2. Open **What Kinship knows about Susan**.
   - **Expect:** **Background**: **Moved to Colorado** (with **Before: Susan lives in Alameda** and **Before: Susan lives in California** under it, H23); then a quiet **Before** label and **Previously lived in Alameda, California** with **You told Kinship · <today>** under it. **Into** still shows Loves pottery.
   - **Expect:** nothing says "Updated", "Ended", a date Kinship never heard, a place id or "Alameda is in California".
3. Tap the provenance under **Previously lived in Alameda, California**.
   - **Expect:** the Source view of the **moved to Colorado** note (the note that told the change). Go back.
4. Tap **Previously lived in Alameda, California** (or its **Edit**).
   - **Expect:** the sheet of its notes: **Susan lives in Alameda** and **Susan lives in California**, each with its own source, Edit and Not this (B5's sheet). Tap **Done**.
5. Susan's page: **Lately** shows **Susan moved to Colorado** with **was: ~~Susan lives in Alameda~~**; no "Previously".
6. On the Kept card (Susan's page or Today), tap **Undo**.
   - **Expect:** Susan's page: **Susan lives in Alameda** once again under Lately, Colorado gone. What Kinship knows: **Lives in Alameda, California** back under Background, **no Before**.
- **Fails if:** Before is missing after the move, the old lines show as current rows beside Colorado, the history line is dated by anything but today, or Undo leaves Before or Colorado behind.

## 4. B8: no history without evidence (brief §16 rows 10b and 11) · about 2 minutes

1. On another test person, **Dana**: tell **Dana lives in Alameda.** → Got it right; then **Dana lives in Colorado.** (no "moved") → Got it right.
   - **Expect:** What Kinship knows about Dana: **Background · Lives in Colorado**; **no Before**, no "Previously lived in Alameda" anywhere. Dana's page: **Dana lives in Colorado** with its quiet **was: ~~Dana lives in Alameda~~**.
2. Back on Susan (Lives in Alameda, California): tell **Actually Susan lives in Oakland, not Alameda.** → Got it right.
   - **Expect:** Background: **Lives in Oakland, California**; **no Before**.
- **Fails if:** a "Previously lived in" or Before appears in either case.

## 5. B8: the sections on a real page (brief §16 row 14) · about 3 minutes

1. Open What Kinship knows for three or four real people.
   - **Expect:** only the sections that have something, in this order: **Background · Into · Hoping to · Plans · Their people · Between you**. Nothing is missing compared with before (count nothing; look for any line you remember). No section is empty. Lines that start with the person's name and a verb read without the name ("Works at Meta"); lines about two people, or starting with a possessive, read unchanged.
   - **Expect:** under **Their people**, a relative's lines sit under who they are ("Michelle · sister"); a pet's under its name. Shared memories with other People sit there too.
   - **Expect:** **Between you** holds what you share and the conversations, as before.
2. Tap **Edit** on a line shown without its name.
   - **Expect:** the words to edit are the line's own words, name included ("Susan works at Meta").
3. **Not this** on any line → **Forget**.
   - **Expect:** it leaves at once; if its section is now empty, the heading leaves with it.
- **Fails if:** a line you know is missing, a section shows with nothing in it, a heading reads like a form or a score, or Edit offers the shortened words. **Confusion is evidence: note it.**

## 6. B8: a stay is not a residence (brief §16 row 13) · about 30 seconds

1. Tell **Susan is staying in Denver this week.** → Got it right.
   - **Expect:** a separate line in its own section (Plans or Background, by what Kinship kept it as); Background's residence line is unchanged; no Before.

## Readiness

Every row passes → B7 and B8 move to VERIFIED in the ledger; the product label stays **NOT READY** for the wife's dogfood until B9 and the employer evaluation. Any row fails → log it (K-series), do not fix from the phone.
