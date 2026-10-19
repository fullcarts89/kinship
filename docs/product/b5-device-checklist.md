# Device check: B5, the composed residence line and its notes (about 8 minutes)

Phase 4B B5 (`phase4-implementation-brief.md` §24; PR #38, merged `53fbb38`). Needs the build from `main` `53fbb38` on the phone (installed 16 Oct) and ai-gateway v13 (deployed from the same commit). Use the test person **Susan**, with no residence lines left over from the B4 check (Undo or "Not this" them first). The composed line lives only in **What Kinship knows**; Susan's page (the Portrait) still shows every line until B7.

## 1. Two notes, one line · about 1 minute

1. Tell **Susan lives in California.** → **Got it right**. Tell **Susan lives in Alameda.** → **Got it right**.
   - **Expect:** no question either time. Susan's page shows both lines as before (B7 is later).
2. Open **What Kinship knows about Susan**.
   - **Expect:** one line, **Lives in Alameda, California**, with **You told Kinship · <today> · and 1 other note** under it and an **Edit** pill; no "Susan lives in Alameda" or "Susan lives in California" rows beside it; no "Not this" on that line.
- **Fails if:** both plain lines show as rows, the words are expanded or reordered ("California, Alameda"), or anything on screen names a place id, a dataset, a rule or "Alameda is in California".

## 2. The notes behind it · about 1 minute

1. Tap the line (or its provenance, or **Edit**).
   - **Expect:** a sheet: **Lives in Alameda, California** and its provenance at the top, then "From these notes. Change or remove any of them.", then **Susan lives in Alameda** (its own "You told Kinship · <today>", **Edit**, **Not this**) and **Susan lives in California** (the same), then **Done**.
2. Tap the provenance under **Susan lives in California**.
   - **Expect:** the Source view of that note, with "California" underlined. Go back.
3. Open the sheet again and tap **Done**. **Expect:** it closes; the page is unchanged.
- **Fails if:** a member is missing, the order is California first, or tapping a member's source opens the wrong note.

## 3. "Not this" on a member · about 1 minute

1. Open the sheet → **Not this** under **Susan lives in California** → **Forget**.
   - **Expect:** the sheet closes; the page now shows **Susan lives in Alameda** as an ordinary line (its own provenance, Edit and Not this), nothing composed, no flash of the old composed words.
2. Tell **Susan lives in California.** again → **Got it right** → What Kinship knows.
   - **Expect:** **Lives in Alameda, California** again, "· and 1 other note".
- **Fails if:** "Lives in Alameda, California" stays after California is forgotten, or the line never comes back after step 2.

## 4. A move closes the chain; Undo brings it back exactly · about 1½ minutes

1. Tell **Susan moved to Colorado.**
   - **Expect:** the Kept card with **Replaces: ~~Susan lives in Alameda~~** and **Replaces: ~~Susan lives in California~~** (B4). What Kinship knows: the Colorado line with both **Before:** lines; no "Lives in …" line, no "Previously lived in" (B8).
2. On the card tap **Undo**, then open What Kinship knows.
   - **Expect:** **Lives in Alameda, California · and 1 other note** is back; Colorado is gone; no "Before:".
- **Fails if:** only one line returns, or the composed line comes back with different words or a different provenance than before the move.

## 5. Editing a member · about 1½ minutes

1. Open the sheet → **Edit** under **Susan lives in Alameda** → change the words to **Susan lives in Oakland** → **Save**. Wait a few seconds (the gateway reads the edited line again, N13); pull down to refresh if needed.
   - **Expect:** **Lives in Oakland, California**, and under it **From your notes · <today> · one edited by you** (never "Edited by you" for the whole line). In the sheet, the Oakland member says **Edited by you · <today> · from your note, <today>** and "Edited by you · was: ~~Susan lives in Alameda~~"; California still says "You told Kinship".
2. Edit it again to **Susan lives in the East Bay** (a place Kinship doesn't know).
   - **Expect:** two ordinary lines, **Susan lives in the East Bay** and **Susan lives in California**; nothing composed, nothing invented.
3. Edit it back to **Susan lives in Alameda**. **Expect:** **Lives in Alameda, California** again.
- **Fails if:** the whole line reads "Edited by you" after one member's edit, or "the East Bay" is composed with anything.

## 6. N17: your own qualifier · about 1 minute

1. Tidy up (Not this on both residence lines). Tell **Susan lives in Alameda, California.** → **Got it right**. Tell **Susan lives in California.** → **Got it right**.
   - **Expect:** What Kinship knows: **Lives in Alameda, California** (not "…, California, California"), "· and 1 other note"; the sheet lists both notes.
2. Tidy up again. Tell **Susan lives in Alameda, CA.** then **Susan lives in California.**
   - **Expect:** **Lives in Alameda, CA, California**: both your words, because "CA" can't be proven to be California on the phone (fails open, by design). Both notes in the sheet.
- **Fails if:** "CA" is expanded, or "California" vanishes from the second case.

## 7. A quick look at real people · about 30 seconds

Open What Kinship knows for two or three real people. **Expect:** nothing changed for them (no residence told twice); every line reads as before. Confusion is evidence: note it.

## Not in this check

Lately's de-duplication on the Portrait (B7), the Background section and "Previously lived in …" (B8), and the report-only backfill (B6, which stops for you). N16 (two edited lines and a plain "lives in Colorado") stays as B4 left it.
