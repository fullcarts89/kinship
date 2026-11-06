# Moment Deck release plan: from the draft PRs to the founder's phone

**Status: PROPOSAL, written 5 Nov 2026. Nothing here has been run.** Each production step needs the founder's explicit yes. Readiness once it has run: READY FOR FOUNDER NATIVE PASS.

## What production is today
Read on 5 Nov, read-only:
- `main` is at `f55f331`, with migrations up to `20261019090000`.
- `ai-gateway` is v16 and `delete-account` is v5.
- There are 3 accounts. 1 told something in the last 14 days. 2 hold the existing `tell`, `shell_v2`, `memory_v2` and `ai_extraction` overrides.

## Order
| # | Step | Reaches production? | Check before the next step |
|---|---|---|---|
| 1 | Merge #75 into `claude/alpha-integration` | No | App, edge and database CI on the branch |
| 2 | Merge #74 into `main` (merge commit) | Yes: six migrations, within minutes, through the GitHub integration | `list_migrations` and `supabase/tests/schema_fingerprint_hash.sql` |
| 3 | Merge #78 | Yes: adds `notebook_deck`, off for everyone | `list_migrations` |
| 4 | Update #79, #80, #81, #82 from `main`, read CI, merge in that order (#80 before #81) | Yes: #81's trigger | `list_migrations`: eight new in all |
| 5 | Build `dogfood-v2` from merged `main` and install by cable on the founder's phone | App only | The app opens on the phone against production |
| 6 | Deploy `ai-gateway` and `delete-account` from merged `main`, from a checkout under the home directory | Yes | `functions download --use-api` and `cmp` |
| 7 | Add one `user_flag_overrides` row for the founder's user id and `notebook_deck` | That account only | The founder supplies the id; accounts are never looked up by email |
| 8 | Founder walkthrough, `moment-deck-implementation.md` §7 | | Only then a further readiness call |

The app goes before the gateway (step 5 before 6) because of #79: an older app's answer on a sensitive line is refused by the new gateway. Nothing wrong is saved, but that line can't be kept until the app is updated.

## Going back
- **Flag:** delete the row. The account returns to the alpha surfaces, not to today's production look, because #74's changes apply to every account on a new build.
- **Gateway:** redeploy v16 from `f55f331`. Tested below.
- **App:** reinstall the previous `.ipa`.
- **Migrations:** forward-only. A problem after step 2 is fixed forward.

## Evidence (5 Nov, all drafts merged locally; the merge rehearsal gave the identical tree)
- **UNIT / INTEGRATION:** 129 suites / 1282 app tests, 494 edge tests, 29 pgTAP suites (852 checks), `tsc` clean, `npx eslint .` 0 errors. One of three app runs had one suite fail, not captured; the next run passed. The edge and pgTAP counts predate the last app-only commit.
- **BLACK-BOX (replayed model):** 19 of 22 suites passed first time. `h4` and `k10` were stale tests, now updated. `notebook` needs the live model.
- **LIVE-MODEL:** `notebook`, 4 tests: J2 failed once because the journey stopped with a question open; after the fix it passed three runs in a row. `live.blackbox` not run.
- **VERSIONS TOGETHER (7 suites, 90 tests, replayed model, local database with all eight migrations):** new app + v16 gateway, old app + v16 gateway, old app + new gateway: all 90 pass. These suites don't include an old app's answer on a sensitive line, which is refused as above.
- **NATIVE-SIMULATOR (iPhone SE, live model, the merged build):**
  - A sensitive line's yes, and "Replaces:" shown on that yes.
  - "Not this" on the replacing line: the earlier line came back and the relative stayed.
  - Opening a line's source, then deleting the note: the line and the relative went.
  - One fix: the private source line ran off a 375 pt screen; it now wraps.
- **Production migrations:** the only constraints the new migrations replace are `contact_events_moment_type_check` and `capture_reviews_items_check`. Neither has been run against production's rows, and no clean-apply rehearsal on production's data is possible locally.
- **Not checked:** a phone; VoiceOver; 500+ people natively; motion other than the moment's open under Reduce Motion. "Is this about…", "Whose promise?" and the residence question on a sensitive line are tests only: the two notes tried with the live model didn't produce them.

## Behaviour to expect
- A first note with something due today ("I need to call John tonight") is already today's Moment, so "This is where Kinship brings things back" waits until that Moment is answered. This has been so since WS-3.
- A kept line later struck with × still shows "Answered · You said keep it" above it. Left as is.

## Decisions for the founder
1. Yes to steps 1–4 (each merge reaches production).
2. Yes to step 6.
3. The user id for step 7.
4. Model names in commit trailers: 144 of the 179 commits carry them. `main` already holds 404, and `main` can't be rewritten, so the proposal is to merge as they are and leave them off new commits.
5. After the merges: close #69, #70, #71, #72 and #73 as covered by #74. #72 has one docs commit (`1002787`) that isn't in #74.
