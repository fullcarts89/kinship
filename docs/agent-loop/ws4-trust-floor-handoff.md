# WS-4 · Trust floor — handoff section

_For the coordinator to paste into `docs/agent-loop/PRODUCT_DELIVERY_HANDOFF.md` under "## WS-4 · Trust floor" (that file lives on the coordinator's branch; this copy travels with PR #70)._

**Branch / PR.** `claude/ws4-trust-floor-176a4a`, PR #70 (draft, base `main`). Head: see the PR. Nothing merged by this session. Semantics: `docs/product/trust-floor.md`. Coverage rows 23 and 34: BUILT (native pending) under FD-30e.

**Migrations added (forward-only, additive; applied to the shared local stack only).**
`20261030090000_v2_trust_floor.sql`: `person_proactive(person_id, user_id)`; `people_merges` (journal; RLS owner-read; row guard; pull-only on the phone); `merge_people(target, source)` and `undo_merge_people(merge)` (SECURITY DEFINER, owner-checked, 30-day undo); `merge_repoint_mentions`; the `memory_items → related_people` FK made `DEFERRABLE INITIALLY IMMEDIATE`; `memory_items_facet_tombstone` redefined so a merge's own re-pointing keeps a line's residence reading. pgTAP `40_delete_account` now expects 28 user-owned tables: any new table with `user_id` must be seeded there.

**What works (by tier).**

| Tier | Evidence | Result |
|---|---|---|
| UNIT | Jest: `src/store/__tests__/trustFloor.test.ts` (14: states, hold/resume sync both ways, Today honours Paused/Remembered, merge candidates/preview/undo window, insert follow-up update), `src/lib/__tests__/exportData.test.ts` (4); whole suite 103 suites. Deno: `delete-account/handler.test.ts` (11, incl. the deployed path failing loudly on unreachable Storage) | PASS |
| INTEGRATION | pgTAP `72_v2_trust_floor.test.sql` (49: D13 on the server, merge, undo, RLS, deletion leaves no row incl. the journal), `40` (28 tables), `61`, `64`, `68` re-run on a throwaway Postgres 16 with every migration | PASS |
| BLACK-BOX | `e2e/blackbox/trustfloor.blackbox.tsx` against the local stack: Pause → Today silent, server reasons suppressed, forced refresh makes none, Resume → Today speaks again; Merge Anthony → Anthony Lopez through the picker and preview, every memory on the survivor with every source row byte-identical, Anthony archived and off "Removed from People", Undo exact, merge again; Export through the share sheet (one file in the app cache, no ids); Delete account through both confirms, no row in any table, auth user gone, phone wipe called, local sign-out | see PR #70's latest run note |
| NATIVE-SIMULATOR | Covered by WS-5's journey (coordinator rule, 30 Oct). One screenshot taken before the rule: `docs/product/screens/ws4/01-settings-your-data-delete.png` (Settings with Your data and Delete account) | NOT RUN here |
| FOUNDER-DEVICE | — | NOT RUN |

**Exact steps for WS-5's native journey (my features).** On a local test account with Anthony (by name), Anthony Lopez (from Contacts or by name), Sam Eden, Chris; Chris with a race in two days and a birthday tomorrow; Anthony with a dated event and a related "sister Maria":
1. Today speaks of Chris. Chris's page → Edit → **Pause Chris** → confirm "Pause" → the page shows one line, *Paused*; Today shows nothing about Chris; Settings → Paused and remembered lists Chris with Resume. Resume from either place; Today speaks of him again on the next refresh.
2. Chris's page → Edit → **Hold as remembered** → confirm → the line reads *Remembered*, the sprig in quiet ink; Edit → Resume asks once more ("Resume Chris?") → Resume.
3. Anthony Lopez's page → Edit → **Merge with someone** → the picker offers Anthony only (Someone else opens everyone) → tap Anthony → the preview lists his memories, "Their people: sister Maria", any conversations, and what the survivor takes → **Merge** → the page shows *Merged with Anthony · Undo* and Anthony's lines; People no longer lists Anthony; Settings has no "Removed from People" row for him → Undo → "Anthony is back in People."
4. People → + → type "anthony" → Done → "Is this the same Anthony?" → Use existing opens Anthony's page; Add someone new adds a second one.
5. Settings → Your data → **Export your data** → the iOS share sheet opens on `kinship-export-<day>.md`; Save to Files and open: people, memories with "from note N: “…”", notes, settings. Export as JSON likewise.
6. Settings → **Delete account** → "Delete your Kinship account?" → Continue → "Last check" → Delete my account. On the shared local stack the `delete-account` function is not served (the shared `functions serve` runs ai-gateway alone), so the honest failure shows: "Your account wasn't deleted" and nothing is removed. For the happy path, serve the function (e.g. `e2e/serve-delete-account.ts`, local only) and point the app's `functions/v1/delete-account` at it, or run a `functions serve` that includes it; then the app lands on the sign-in screen and no row remains for the user.

**What does not work / caveats.**
- Delete account's happy path cannot be reached on the shared simulator stack (above). The local-only Storage tolerance lives solely in `e2e/serve-delete-account.ts`; the deployed function fails loudly when Storage is unreachable (Deno test).
- `write_memory_item` takes no `with_person_ids` / `person_mentions` at insert; the engine now carries such fields as a follow-up update (fixed in this PR; `src/store/syncEngine.ts`).
- Merging needs the network (the server does the re-pointing); offline the sheet says so and changes nothing.
- WS-2 restyles every view touched here (name sheet, MergeSheet, Settings sections, the Paused/Merged lines): logic and copy only on this branch.

**The one-line call for WS-3 / Today.** `isProactiveEligible(p)` from `src/store/peopleStates.ts` in place of the three inline checks in `src/features/today/todayModel.ts`: `activePerson` (`p.state === "active" && !p.deleted_at`), `returnViewFor` (`p.state !== "active" || p.deleted_at`), `pageHandoffFor` (same). Behaviour is unchanged today (proven by `trustFloor.test.ts`); the point is one rule for RSN-06/RSN-07 and the notification. Server-side candidates: `AND public.person_proactive(m.person_id, m.user_id)` (or the equivalent join on `people.state = 'active'`).

**Shared-stack notes.** My local function runner holds 127.0.0.1:8792 (PID in my scratchpad; stop by PID). `e2e/blackbox/app.tsx` knows `{ screen: "people" }`; `localStack.ts` routes `/functions/v1/delete-account` to `DELETE_ACCOUNT_URL` when set and exports `authUserExists`. Both 20261030 migrations (mine and WS-3's) are on the shared local DB; `supabase migration up --local` from one worktree complains about the other's version (harmless).
