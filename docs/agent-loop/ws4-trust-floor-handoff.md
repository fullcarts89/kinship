# WS-4 · Trust floor — handoff section

_For the coordinator to paste into `docs/agent-loop/PRODUCT_DELIVERY_HANDOFF.md` under "## WS-4 · Trust floor" (that file lives on the coordinator's branch; this copy travels with PR #70)._

**Branch / PR.** `claude/ws4-trust-floor-176a4a`, PR #70 (draft, base `main`). Head 8bcb0ae and after. Nothing merged by this session. Semantics: `docs/product/trust-floor.md`. Coverage rows 23 and 34: BUILT (native pending) under FD-30e.

**Migrations added (forward-only, additive; applied to the shared local stack only).**
`20261030090000_v2_trust_floor.sql`: `person_proactive(person_id, user_id)`; `people_merges` (journal; RLS owner-read; row guard; pull-only on the phone); `merge_people(target, source)` and `undo_merge_people(merge)` (SECURITY DEFINER, owner-checked, 30-day undo); `merge_repoint_mentions`; the `memory_items → related_people` FK made `DEFERRABLE INITIALLY IMMEDIATE`; `memory_items_facet_tombstone` redefined so a merge's own re-pointing keeps a line's residence reading. pgTAP `40_delete_account` now expects 28 user-owned tables: any new table with `user_id` must be seeded there.

**What works (by tier).**

| Tier | Evidence | Result |
|---|---|---|
| UNIT | Jest: `src/store/__tests__/trustFloor.test.ts` (14: states, hold/resume sync both ways, Today honours Paused/Remembered, merge candidates/preview/undo window, insert follow-up update), `src/lib/__tests__/exportData.test.ts` (4); whole suite 103 suites. Deno: `delete-account/handler.test.ts` (11, incl. the deployed path failing loudly on unreachable Storage) | PASS |
| INTEGRATION | pgTAP `72_v2_trust_floor.test.sql` (49: D13 on the server, merge, undo, RLS, deletion leaves no row incl. the journal), `40` (28 tables), `61`, `64`, `68` re-run on a throwaway Postgres 16 with every migration | PASS |
| BLACK-BOX | `e2e/blackbox/trustfloor.blackbox.tsx` against the local stack: Pause → Today silent, server reasons suppressed, forced refresh makes none, Resume → Today speaks again; Merge Anthony → Anthony Lopez through the picker and preview, every memory on the survivor with every source row byte-identical, Anthony archived and off "Removed from People", Undo exact, merge again; Export through the share sheet (one file in the app cache, no ids); Delete account through both confirms, no row in any table, auth user gone, phone wipe called, local sign-out | PASS (30 Oct, head 8bcb0ae) |
| NATIVE-SIMULATOR | Walked 31 Oct on the integrated Release build (claude/alpha-integration 5f3ea55, docs 3a1cc19) on the iPhone 18 Pro, light mode plus one dark screenshot, local test account only: see "Native pass R8" below. Pause, Remembered, Resume, Export, Undo and the same-person prompt PASS; Merge from the Edit sheet FAILED (fixed in source, not re-walked); Delete NOT RUN (environment) | MIXED (see R8) |
| FOUNDER-DEVICE | — | NOT RUN |

**Exact steps for WS-5's native journey (my features).** On a local test account with Anthony (by name), Anthony Lopez (from Contacts or by name), Sam Eden, Chris; Chris with a race in two days and a birthday tomorrow; Anthony with a dated event and a related "sister Maria":
1. Today speaks of Chris. Chris's page → Edit → **Pause Chris** → confirm "Pause" → the page shows one line, *Paused*; Today shows nothing about Chris; Settings → Paused and remembered lists Chris with Resume. Resume from either place; Today speaks of him again on the next refresh.
2. Chris's page → Edit → **Hold as remembered** → confirm → the line reads *Remembered*, the sprig in quiet ink; Edit → Resume asks once more ("Resume Chris?") → Resume.
3. Anthony Lopez's page → Edit → **Merge with someone** → the picker offers Anthony only (Someone else opens everyone) → tap Anthony → the preview lists his memories, "Their people: sister Maria", any conversations, and what the survivor takes → **Merge** → the page shows *Merged with Anthony · Undo* and Anthony's lines; People no longer lists Anthony; Settings has no "Removed from People" row for him → Undo → "Anthony is back in People."
4. People → + → type "anthony" → Done → "Is this the same Anthony?" → Use existing opens Anthony's page; Add someone new adds a second one.
5. Settings → Your data → **Export your data** → the iOS share sheet opens on `kinship-export-<day>.md`; Save to Files and open: people, memories with "from note N: “…”", notes, settings. Export as JSON likewise.
6. Settings → **Delete account** (local test account only, never a real one). Checked 31 Oct: the shared stack's Kong does serve `/functions/v1/delete-account` (it answers 401 `{"error":"unauthorized"}` without a token), so the app reaches the function. The shared edge runtime's copy is older than this branch but calls the same table-generic `delete_user_account`, so the database side is identical. What stops the happy path natively is the **stopped Storage container** (`supabase_storage_kinship`): the function lists buckets first and, deployed-style, fails loudly ("Your account wasn't deleted", nothing removed). So on the simulator today the expected, correct result is that honest failure; the full deletion is proven by black-box `trustfloor.blackbox.tsx` (local runner) and pgTAP `72`/`40`. To walk the success path natively, someone must first start the Storage container (`docker start supabase_storage_kinship supabase_imgproxy_kinship` or `supabase start`): a change to the shared stack, so only with the coordinator's yes. If it is not started, mark Delete **NOT RUN natively**.

**Merge natively (can run now, local test account, touches nothing real):** seed (or add by name) two people sharing a first name, e.g. "Anthony" and "Anthony Lopez" (Add by name works on a denied-Contacts simulator), tell one note about each so both have a memory. Open Anthony Lopez › Edit › Merge with someone › tap Anthony › read the preview › Merge (needs network; `merge_people` is already on the shared local DB, migration `20261030090000`). Expect "Merged with Anthony · Undo", Anthony gone from People and not under Removed from People. Undo → "Anthony is back in People." and his memory is back on his page. Merge a second time to leave the journal row if you also walk Delete. Add-by-name check: People › + › "anthony" → "Is this the same Anthony?".

**What does not work / caveats.**
- Delete account's happy path cannot be reached on the shared simulator stack (above). The local-only Storage tolerance lives solely in `e2e/serve-delete-account.ts`; the deployed function fails loudly when Storage is unreachable (Deno test).
- `write_memory_item` takes no `with_person_ids` / `person_mentions` at insert; the engine now carries such fields as a follow-up update (fixed in this PR; `src/store/syncEngine.ts`).
- Merging needs the network (the server does the re-pointing); offline the sheet says so and changes nothing.
- WS-2 restyles every view touched here (name sheet, MergeSheet, Settings sections, the Paused/Merged lines): logic and copy only on this branch.

**The one-line call for WS-3 / Today.** `isProactiveEligible(p)` from `src/store/peopleStates.ts` in place of the three inline checks in `src/features/today/todayModel.ts`: `activePerson` (`p.state === "active" && !p.deleted_at`), `returnViewFor` (`p.state !== "active" || p.deleted_at`), `pageHandoffFor` (same). Behaviour is unchanged today (proven by `trustFloor.test.ts`); the point is one rule for RSN-06/RSN-07 and the notification. Server-side candidates: `AND public.person_proactive(m.person_id, m.user_id)` (or the equivalent join on `people.state = 'active'`).

**Shared-stack notes.** My local function runner holds 127.0.0.1:8792 (PID in my scratchpad; stop by PID). `e2e/blackbox/app.tsx` knows `{ screen: "people" }`; `localStack.ts` routes `/functions/v1/delete-account` to `DELETE_ACCOUNT_URL` when set and exports `authUserExists`. Both 20261030 migrations (mine and WS-3's) are on the shared local DB; `supabase migration up --local` from one worktree complains about the other's version (harmless).

## Native pass R8 (31 Oct 2026)

**Build under test.** The Release build WS-5 installed on the iPhone 18 Pro (claude/alpha-integration `5f3ea55`, docs `3a1cc19`), the redesigned person page, signed in with WS-5's local test account (Nora). No rebuild and no xcodebuild; local Supabase stack as it was. Local test account only. Screenshots: `docs/product/screens/alpha-rc/r8-*.png` (half width).

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Edit › Pause › confirm: page shows the one line *Paused*, legible (light and dark); Leo's Moment gone from Today (Today shows the labelled example); Settings › Paused and remembered lists him with Resume; Resume (from Edit) brings the Moment back | **PASS** | r8-01, 02, 03, 04, 05, 06. No birthday was seeded, so the birthday half was not exercised natively (it is in black-box and unit). Resume from the Settings list itself was not tapped. |
| 2 | Edit › Hold as remembered › confirm: line *Remembered*; Edit › Resume asks once more ("Resume Leo?") | **PASS** | r8-07, 08. Resume of a Paused person asks nothing, as built. |
| 3 | Merge two duplicates on the redesigned page | **FAIL (sheet), PASS (result, Undo)** | See below. r8-10, 11, 12, 13. |
| 3b | Add by name of a name already in People asks "Is this the same Leo?" | **PASS** | r8-09 |
| 4 | Export your data shares | **PASS** | The share sheet opens on `kinship-export-2026-10-31`, 3 KB; the file in the app cache has people, each memory with its source line, notes as written, settings, consent record; no ids, no model names. r8-14, 15 |
| 5 | Delete account | **NOT RUN (environment)** | The local Storage container (`supabase_storage_kinship`) is stopped; starting it is a change to the shared Docker stack, and the instruction was to run Delete only if Storage can run without touching Colima or Docker. Delete's deletion itself is proven by black-box and pgTAP; the deployed function fails loudly with Storage down (Deno test). Button present: r8-14. Never tapped. |

**The Merge failure (found here, real, fixed in source).** On the integrated build, Edit › *Merge with someone* closes the name sheet and the merge sheet never appears; afterwards the page stops answering taps (Edit does nothing) until the user leaves the page. Reproduced twice. Cause: `openMerge` closed the name sheet and set the merge sheet in the same moment; iOS drops a modal presented while another is still leaving (`src/ui/sheetStack.ts` documents exactly this and offers `afterSheets`). The black-box tier cannot see it (no native modals). **Fix** on this branch: `app/v2/person/[id]/index.tsx` now opens the merge sheet through `afterSheets`; guard test `app/__tests__/sheetChaining.test.ts`. The fix is **not walked natively** (no rebuild allowed): it needs the next build, then this step again (Edit › Merge with someone › Leo › preview › Merge › Undo › Merge).

**What was walked instead, honestly labelled.** To still see the result natively I merged the two people on the server as the same local test account (the `merge_people` function through the REST API, not the sheet) and let the phone sync: People then lists one Leo Marchetti whose line is the moved memory, the page reads *Merged with Leo · Undo* with both memories on it (r8-11, 12), and tapping **Undo** natively returned "Leo is back in People." with the memory back on Leo (r8-13). So: the sheet's merge action is FAIL; the post-merge page, the sync of a merge, and Undo from the UI are PASS.

**Other things seen (not defects in this feature).**
- Edit autofocuses the name field. With the keyboard up, Merge with someone and Remove from People sit under the keyboard until it is put away. A stale keyboard inset after hiding the simulator keyboard also left a blank band over the sheet's lower part until the field was blurred with Return; likely a simulator hardware-keyboard artifact, but worth a look on a device.
- While Paused, the Edit sheet offers only Resume (no direct Paused → Remembered); resume, then hold.
- Settings still says "Sent to Anthropic to understand it; not used to train models." under the understanding toggle (not this branch's copy).

**Readiness stays NOT READY.** Merge needs the next build and one more native walk; Delete needs Storage to be run (by someone who may change the shared stack) or founder-device proof.
