# Device check: B4, a note that replaces more than one line, and Undo (about 6 minutes)

Phase 4B B4 (`phase4-implementation-brief.md` §23; PR #35). Needs a build from this branch (or `main` after it merges) **and** ai-gateway deployed from the same code: the closures come from the gateway, the card's lines from the app. No database change. Use a test person, here **Susan**, on your own account; Undo or "Not this" leaves nothing behind.

## 1. One note closes two lines, and the card says so · about 1 minute

1. Tell **Susan lives in California.** → **Got it right**. Tell **Susan lives in Alameda.** → **Got it right**.
   - **Expect:** no question either time; Susan's page shows both lines (nothing is composed yet: that is B5).
2. Tell **Susan moved to Colorado.**
   - **Expect:** no question. The Kept card: **Susan moved to Colorado**, and under it **Replaces: ~~Susan lives in Alameda~~** and **Replaces: ~~Susan lives in California~~**, right above **Correct this · Undo**.
   - **Expect:** What Kinship knows about Susan: the Colorado line with **Before: Susan lives in Alameda** and **Before: Susan lives in California**; the two old lines no longer current.
- **Fails if:** only one Replaces line shows, a question is asked, or California is still a current line beside Colorado.

## 2. Undo brings both back exactly · about 30 seconds

1. On that card, tap **Undo**.
   - **Expect:** Susan's page shows **Susan lives in Alameda** and **Susan lives in California** again, Colorado is gone, and nothing says "Before:".
- **Fails if:** only Alameda comes back, or Colorado stays.

## 3. "Not this" on the closer does the same · about 1 minute

1. Tell **Susan moved to Colorado.** again → **Got it right**.
2. Open What Kinship knows about Susan → the Colorado line → **Not this** → **Forget**.
   - **Expect:** both earlier lines are current again; Colorado is gone.

## 4. A move within California closes Alameda alone (control) · about 30 seconds

1. Tell **Susan moved to Oakland.**
   - **Expect:** one line under the card: **Replaces: ~~Susan lives in Alameda~~**. California stays current (Oakland is in it).
2. Tap **Undo**. **Expect:** Alameda is back.

## 5. A line you edited: the question, then both close · about 2 minutes

1. On Susan's page tap **Susan lives in Alameda** → **Edit the words** → make it **Susan lives in Alameda with Jo** → **Save**. Wait a few seconds (the gateway reads the edited line again, N13).
2. Tell **Susan lives in Colorado.** (no "moved").
   - **Expect:** **One thing to check · Is Susan still in Alameda?** with **Still there · Susan moved · Don't keep this**. Nothing has changed yet.
3. Tap **Susan moved**.
   - **Expect:** the Kept card with **Replaces: ~~Susan lives in Alameda with Jo~~** and **Replaces: ~~Susan lives in California~~**; What Kinship knows shows the Colorado line with both **Before:** lines.
4. Tap **Undo**.
   - **Expect:** **Susan lives in Alameda with Jo** is back, still marked **Edited by you**, with your words (never "Susan lives in Alameda"); California is back too.
5. Tell **Susan lives in Colorado.** once more and tap **Still there**.
   - **Expect:** no Replaces line; all three lines current (Alameda with Jo, California, Colorado). Undo the note afterwards to tidy up.
- **Fails if:** the edited line is replaced without the question, comes back with the old words, or California is left current beside Colorado after **Susan moved**.

## Not in this check

What a page *composes* ("Lives in Alameda, California") and "Previously lived in …" are B5 and B8, not built. With **two** lines you edited yourself and no "moved", **Susan moved** closes only the line the question named (N16, your decision in the PR).
