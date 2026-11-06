# Moment Deck release plan: from the draft PRs to the founder's phone

**Status: steps 1–4 ran on 5 Nov 2026, on the founder's yes. Step 5's build is on the founder's and the wife's phones; the founder opened it on theirs. Step 6 ran on the founder's yes. Steps 7 and 8 have not run.** Each remaining production step needs the founder's explicit yes. Readiness once all of it has run: READY FOR FOUNDER NATIVE PASS.

## What has run
- **Steps 1–4:** #75, then #74, #78, #79, #80, #81 and #82, each merged with a merge commit after green CI. `main` is `1bbf7bb`, CI green.
- **Production after step 4:** 41 migrations. The schema fingerprint is 1028 lines, `1db0201fa84485b39f3c74b565f76e0a`, the same as a fresh build of `main`. It also matched after #74 (1024 lines, `fd5ab602…`) and before anything ran (981 lines, `3dfc9740…`).
- **Unchanged:** `notebook_deck` has no overrides, so it is off for every account. No relative was removed by the new trigger.
- **Step 5:** `dogfood-v2` built locally from `1bbf7bb`. Its bundle holds the production URL and the new surfaces, and no local address or model identifier. Installed by cable on the founder's phone and, on the founder's request, the wife's phone, 5 Nov. The founder opened it on their phone and it looked right. Opening it on the wife's phone hasn't been checked. The flag stays off for that account, and this doesn't change the readiness label.
- **Step 6:** `ai-gateway` v17 and `delete-account` v6, deployed from `1bbf7bb`. `functions download --use-api` and `cmp`: all 31 function files match `main`. Both functions answer 401 without a signed-in user. Neither has yet served a signed-in request on this version, so a real Tell on the phone is the first check of that path.

## What production was before the merges
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
- **App:** no earlier `.ipa` is kept. Export one from the 30 Oct Xcode archive, or rebuild from `f55f331`.
- **Migrations:** forward-only. A problem after step 2 is fixed forward.

## Evidence (5 Nov, all drafts merged locally; the merge rehearsal gave the identical tree)
- **UNIT / INTEGRATION:** 129 suites / 1282 app tests, 494 edge tests, 29 pgTAP suites (852 checks), `tsc` clean, `npx eslint .` 0 errors. One of three app runs had one suite fail, not captured; the next run passed. The edge and pgTAP counts predate the last app-only commit.
- **BLACK-BOX (replayed model):** 19 of 22 suites passed first time. `h4` and `k10` were stale tests, now updated. `notebook` needs the live model.
- **LIVE-MODEL:** `notebook`, 4 tests: J2 failed in two runs because the journey stopped with a question open; after the fix it passed three runs in a row. `live.blackbox` not run.
- **VERSIONS TOGETHER (7 suites, 90 tests, replayed model, local database with all eight migrations):** new app + v16 gateway, old app + v16 gateway, old app + new gateway: all 90 pass. These suites don't include an old app's answer on a sensitive line, which is refused as above.
- **NATIVE-SIMULATOR (iPhone SE, live model, the merged build):**
  - A sensitive line's yes, and "Replaces:" shown on that yes.
  - "Not this" on the replacing line: the earlier line came back and the relative stayed.
  - Opening a line's source, then deleting the note: the line and the relative went.
  - One fix: the private source line ran off a 375 pt screen; it now wraps.
- **Production migrations:** the only constraints the new migrations replace are `contact_events_moment_type_check` and `capture_reviews_items_check`. Neither has been run against production's rows, and no clean-apply rehearsal on production's data is possible locally.
- **Not checked:** a phone; VoiceOver; 500+ people natively; motion other than the moment's open under Reduce Motion. "Is this about…", "Whose promise?" and the residence question on a sensitive line are tests only. One note each for the first two didn't bring them up with the live model; the residence question wasn't tried.

## Behaviour to expect
- A first note with something due today ("I need to call John tonight") is already today's Moment, so "This is where Kinship brings things back" waits until that Moment is answered. This has been so since WS-3.
- A kept line later struck with × still shows "Answered · You said keep it" above it. Left as is.

## Decisions for the founder
1. The user id for step 7.
2. Whether to close #72, the one earlier workstream PR still open. All but one docs commit (`1002787`) is on `main`.

Decided: commits merged with their existing model-name trailers, since `main` already held 404 and can't be rewritten. New commits leave them off.
