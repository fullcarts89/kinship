# The alpha trust floor

**Status:** built on branch `claude/ws4-trust-floor-176a4a` (PR #70), 30 Oct 2026, under FD-30e (founder directive 30 Oct, §4E) and CC-25 ("the trust floor before broader Alpha"). Readiness: **NOT READY** until the integrated release candidate passes its native pass. Approved references: D13 (`KINSHIP_2_DECISIONS.md`), contract §7.10, PER-05 / PER-06 / SET-04 / SET-05 (`KINSHIP_2_TICKETS.md`), coverage rows 23 and 34.

Four controls that must hold before anyone outside the household uses Kinship. Each is the user's to set; nothing here is ever set by extraction, a model or a server job.

## 1. Paused and Remembered (D13, PER-06)

**Where.** The person's page → **Edit** (the name sheet). Below the name: *Pause* and *Hold as remembered*, each with one plain sentence; while held, the sentence and *Resume*. Settings → **Paused and remembered** lists everyone held, each with *Resume*.

**What each means.**

| State | The sentence Kinship uses | Effect |
|---|---|---|
| Paused | "Kinship keeps what it knows about Chris and brings nothing back for now." | Still in People, page unchanged but for one line, **Paused**. No Moment, no Coming up line, no birthday, no notification, no server candidate. Reversible with *Resume*, asked once. |
| Remembered | "Kinship keeps Chris's memories and never brings them back." | As Paused, with the line **Remembered** and the sprig drawn in quiet ink (D13). Leaving the state is asked **once more** ("Resume Chris? Kinship would bring Chris up again when there's a reason to."). |

Both are confirmed before they take effect. Neither changes a memory, a source or a conversation. The only visual difference is the one line on the page (PER-06); the People list shows no marker for a paused person (D13), and nothing counts or badges held people.

**How it holds, everywhere that speaks.**

- Device: `src/store/peopleStates.ts` → `isProactiveEligible(person)` (active, not removed, not deleted). Today's model already refuses a non-active person at every proactive point (`todayModel.ts` `activePerson`, `returnViewFor`, `pageHandoffFor`, the birthday line); WS-3 is asked to route those three checks through the helper so one rule governs new reason types and the notification. The person's page shows no "Waiting on …" and offers no return check for a held person (already true).
- Server: `people_suppress_reasons` silences a person's open reasons the moment they leave `active`; `reasons_person_guard` refuses a new open reason for them; `reasons_refresh` only reads active people. New in this work: `public.person_proactive(person_id, user_id)` for any later candidate function to call (`20261030090000`). Resume revives a suppressed reason only when the next refresh produces it again (N8).
- Sync: the state is an ordinary versioned column on `people`; another phone sees it on its next pull.

## 2. Export your data (SET-04)

**Where.** Settings → **Your data** → *Export your data* (a readable Markdown file) or *Export as JSON*.

**What.** Built on the phone from the encrypted store (`src/lib/exportData.ts`), plus the server's consent ledger when reachable. Per person: name, other names, relationship, status (in People / paused / remembered / removed from People), birthday and where it came from, every current or replaced memory in the words the page shows with **each source** (the note's own words, or "you corrected it" with the earlier words), the people close to them, the conversations the user confirmed, what they said they'd do. Then every note as written (with when, and whose page it was told from), the account's settings, and the consent record. Dates and times in the user's time zone.

**What is not in it.** Ids, model names, extraction versions, confidence scores, sprig seeds, server telemetry. Removed lines ("Not this") are gone and stay gone. The export is written to the app's own cache and handed to the iOS share sheet; Kinship uploads nothing. The file is removed on sign-out and account deletion, and at once when the share sheet is unavailable.

## 3. Delete account (SET-05)

**Where.** Settings → Account → *Delete account*. Two steps in Kinship's words: "Delete your Kinship account? Everything you've told Kinship, every person and every memory will be deleted from Kinship and from this phone. This can't be undone." (Keep my account · Continue), then "Last check: Kinship will delete your account now. If you'd like a copy of your data first, export it before you continue." (Not now · Delete my account).

**What the server deletes.** The `delete-account` edge function verifies the caller's own token, removes their storage objects, then calls `public.delete_user_account(uid)`, which finds **every public table with a `user_id` column at run time** and deletes the user's rows, then the auth user (cascading identities and sessions), then re-checks every table and raises if anything is left, so a partial deletion is never reported as done. As of this migration set that is 28 tables: people, related_people, person_identities, captures, capture_reviews, memory_items, memory_item_sources, memory_item_history, memory_item_facets, reasons, reason_evidence, reason_events, contact_events, consents, devices, notification_log, user_flag_overrides, ai_usage, ai_calls, semantic_runs, person_mentions_backfill_report, people_merges, user_settings, and the 1.0 tables. The residence report rows, which carry no `user_id`, go with the items they name (FK cascade). Proof: pgTAP `40_delete_account` (every table seeded and emptied; another user untouched; idempotent) and `72_v2_trust_floor` (no table holds a row for the deleted user, the merge journal included).

**What the phone does.** Only after the server confirms: wipes every encrypted store and key, the photos, the export file, flags and the local session (`clearAllLocalUserData`), then ends the local session. On any failure nothing is cleared and the user is told the account was not deleted.

## 4. Merging two People who are one person (PER-05)

**Where.** The person's page → **Edit** → *Merge with someone*. The page's person is the one who **keeps their name**; the sheet asks "Who is also Anthony Lopez?" and lists the people who share a name with them (first name or another name they go by), alphabetical, never ranked or scored; *Someone else* opens everyone in People. Someone removed from People is never offered (bring them back first).

**Preview.** Before anything moves, the sheet lists exactly what will: every memory filed on the merged person (in the words the page shows), the lines on other pages that will name the survivor instead, their people, their confirmed conversations, and whether the survivor takes a birthday, a Contacts link or new names to go by. No counts.

**What the server does** (`public.merge_people(target, source)`, one transaction, as the signed-in owner; anyone else's people are "not here"):

- memory items filed on the merged person → filed on the survivor; **every source row untouched**; the survivor is taken out of the item's "with" list; mentions that named the merged person name the survivor (the note's own words unchanged);
- items shared with the merged person → shared with the survivor (once), or no longer shared when they are the survivor's own;
- related people, notes told from their page (`captures.context_person_id`), confirmed conversations, hashed identities → the survivor's;
- reasons → the survivor's, open ones suppressed; the next refresh speaks again for the survivor where the evidence still produces them (dedupe is by item, so never two);
- the survivor takes what they lacked (birthday with its source, Contacts link, full name, relationship) and goes by the merged person's names too, so a later "Anthony" still finds Anthony Lopez;
- the merged person is **archived, not deleted**, and gives up the Contacts link; they are not listed under "Removed from People" while the merge stands (Undo is the way back);
- a `people_merges` row records, row by row, what changed and what it was before.

**Undo** (`public.undo_merge_people(merge)`, 30 days): reverses exactly the journal: each row back to its recorded values; the merged person back to their earlier state; the survivor gives back only what the merge gave them **and the user has not changed since** (a rename made after the merge stays). Offered on the survivor's page as "Merged with Anthony · Undo".

**Add by name of a name already in People** asks first: "Is this the same Anthony? You already have Anthony Lopez in People." → *Use existing* (opens their page) · *Add someone new* · Cancel. The removed-person path (Bring back · Add someone new, founder I3) is unchanged.

**Residence readings.** A line that only moves to the survivor keeps its reading (the trigger `memory_items_facet_tombstone` now ignores a merge's own re-pointing); any other change still drops the reading as before.

## Evidence (30 Oct 2026)

| Tier | What | Result |
|---|---|---|
| UNIT | `src/store/__tests__/trustFloor.test.ts` (13), `src/lib/__tests__/exportData.test.ts` (4), Deno `delete-account/handler.test.ts` (10) | PASS |
| INTEGRATION | pgTAP `72_v2_trust_floor.test.sql` (49), `40_delete_account` (22, extended), `61`, `64`, `68` re-run | PASS |
| BLACK-BOX | `e2e/blackbox/trustfloor.blackbox.tsx` | see the WS-4 handoff section |
| NATIVE-SIMULATOR | Release build, iPhone 18 Pro, local stack | see the WS-4 handoff section |
| FOUNDER-DEVICE | — | NOT RUN |
