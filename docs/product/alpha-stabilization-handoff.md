# Alpha stabilization: founder handoff (31 Oct 2026)

**Readiness: READY FOR FOUNDER NATIVE PASS**, once the release sequence below (E) has run. A device build talks to production, so the founder pass needs those production steps, and only the founder can approve them. Nothing here has been verified on the founder's device.

## A. Code state

- **Branch:** `claude/alpha-stabilization`, cut from `claude/alpha-integration` at `a0f7b0a` (PR #74's final head). The integration baseline itself is untouched.
- **Stabilization head:** the last commit of PR #75 (this document lands in it). Its code commits: `0589f86` (P0 database), `d989003` (residence corpus), `66b3662` (Deno lint boundary), `9744b83` (CI timeout), `b344d78` (extraction defect found on the native walk).
- **PR:** [fullcarts89/kinship#75](https://github.com/fullcarts89/kinship/pull/75). Base `claude/alpha-integration`, not `main`. Not merged.
- **`main`:** unchanged at `f55f331`. Nothing from the alpha (#69–#75) is merged to `main`. Nothing was deployed, no production migration ran, and no flag or secret was changed.

## B. Verification matrix

| Tier | Result on this head | Notes |
|---|---|---|
| GitHub CI | **Green.** App (tsc, eslint, jest), Edge functions, Database: all pass on push and PR | "Supabase Preview" is not a GitHub Actions job: the Supabase project has hit its preview-branch limit (external setting, not changed) |
| Database security (pgTAP) | **829 assertions, 0 failing** (39 migrations, PG 16) | See "What was red" below |
| Extraction regressions | Deno **487 passed**; semantic corpus **82/82**; extraction oracle, realistic oracle and both baseline replays **PASS** | |
| Black-box | `trustfloor` **1/1** on this head with the new migration (Pause, Merge with exact Undo, Export, Delete leaves no row) | Other suites reused from WS-5's final head: no client code changed, and the only server change is a privilege revoke no suite calls |
| Native simulator (Release build of this branch, iPhone 18 Pro + 17e, local stack, **live model**) | Rows below | Screens in `screens/stabilization/` |

**Native rows (fresh account, Release, live model):**

| # | Journey | Result | Screen |
|---|---|---|---|
| 1 | Fresh install → sign in → name → consent → Contacts (permission, picker, birthday suggestion) → first Tell: never an empty Today | PASS. Step 4 already showed "Sam's birthday is on Nov 7"; the Maya note became a dated event plus a thread, each with its exact source span | `s01` |
| 2 | Long narrative (668 characters, about 15 facts): no silent loss | PASS. **15/15 lines kept**, every one with its source words underlined in the note. Three sensitive or ambiguous lines (surgery, flight, promise) asked for the user's yes ("This sounds personal…"); the flight asked "When is it?" | `s02` `s03` `s04` `s10` |
| 2a | — same note, defect | **FOUND AND FIXED.** "He just moved to Denver with his partner Leo, and they adopted a dog named Biscuit" filed the move line as about the dog. Fixed in `b344d78` with a regression test reproducing the model's exact split (UNIT). Not re-walked natively after the fix | — |
| 3 | Correction told from the return prompt: "Actually her first day got moved to Wednesday" | PASS. "Replaces: ~~Maya starts her new job at Stripe~~"; Today moved to Wednesday | `s07` |
| 3a | Exact Undo of that correction | PASS. The original line is active again with its Monday date; the replacement is retracted (checked in the database) | `s08` |
| 4 | Today Moment → hand-off sheet (Messages/Call/FaceTime/WhatsApp, the SUA-1 line, the stated return question) → Messages → back → "Did you reach Maya about the new job?" → Yes → "Anything worth remembering?" | PASS | `s05` `s06` |
| 5 | Ask: "What food does Sam love?" → "Loves Thai food · You told Kinship · Oct 31" → source opens the note with kept words underlined | PASS | `s09` `s10` |
| 5a | Ask: "What does Sam like to eat?" | Honest miss: "Kinship knows nothing about that for Sam Delgado yet." Ask v1 matches words, not meanings. Nothing false is claimed, but recall is limited (see C) | `s09b` |
| 6 | Dark mode on People/Ask | PASS (status bar light) | `s11` |
| 7 | iPhone 17e width: Today, Moment Detail, Person | PASS. On Today the greeting runs into the bloom but stays legible (cosmetic; left alone under the design boundary) | `s12` `s13` `s14` |
| 8 | Notification test hook | Correctly refused: "Not sent: no moment." (today's only Moment had just been answered). **Delivery and tap-through not shown** | `s15` |

**Reused from WS-5's walks on the same app code** (`alpha-walkthrough.md`, final table): Pause/Resume and Remembered/Resume; merge with disambiguated title, merge Undo; replace-question at XXXL text; People and Person at XXXL; dark mode on Today, Person and the replace sheet.

**Not natively evidenced on this head:** Delete account (black-box and pgTAP only; local Storage service absent); merge and Pause on this head (black-box only); notification delivery and lock-screen tap-through; Reduce Motion; quiet-day Today; anything on a physical device.

### What was red, and why

- **pgTAP 51 #19 and 55 #17: no cross-account leak.** The trust-floor migration made the related-subject FK `DEFERRABLE` (merges move both sides of it), and both suites defer every deferrable constraint during setup. I re-tested as `authenticated` with real COMMITs: another account's related person is refused at commit, through both a direct insert and `write_memory_item`, deferred or not, and no row persists. The assertions now run the check at the request's commit point (same strength), and 51 pins the FK definition, `user_id` included.
- **pgTAP 54 #33: a real defect, fixed.** `person_proactive(person, user)` was SECURITY DEFINER, executable by signed-in users, and took any `user_id`, so any account could probe whether another account's person exists and is active. Nothing signed-in calls it. New migration `20261031120000_v2_person_proactive_server_only.sql` revokes `authenticated`; a regression test fails without it. `merge_people` and `undo_merge_people` were reviewed (caller's own rows only, every write filtered by `user_id`) and added to the allowlist. Added test: another user cannot undo my merge.
- **Residence corpus res-037/057: changed semantics, contract kept.** WS-1's CER-1 change (an update to a user-edited line now asks "Does this replace what you told me?") was never modelled in the runner, which skipped held items with no answer. The runner now resolves the question exactly as the gateway and database do, and **fails** if a fixture gives no answer. The two fixtures answer "keep both" with their end state unchanged; res-081/082 add the "replaces" answers.
- **App lint:** `e2e/serve-delete-account.ts` is Deno code that ESLint tried to resolve as Node. It is now in ESLint's Deno block, and CI runs `deno check` on it.
- **Jest on CI:** one render-heavy test exceeded the 5 s default on a cold transform cache (418 ms warm). It now has a 20 s budget.

## C. Remaining risks

| Risk | Blocker? |
|---|---|
| The CER-1 migration `20261031100000` was edited in place after the local stack applied it (WS-5 note). Production has never applied it, so a clean apply is what will run there. CI applies all migrations from scratch and passes | Not a blocker; noted for the release |
| Ask v1 misses paraphrases ("like to eat" vs "loves Thai food") and says "nothing yet" | Accepted limitation of model-free Ask v1. **Product decision for the founder** if recall matters for the pass |
| A promise told next to a surgery inherited "personal" sensitivity and asked for a yes | Accepted (errs toward trust) |
| A line about a related person cannot be corrected from the Kept card (its subject is not a tap target); not checked from the Person page | Observation; not a blocker |
| Delete account: local Storage is absent, so the harness treats it as empty. Kinship 2.0 keeps no Storage files, but the production Storage call is unverified locally | Check on the founder pass: delete a throwaway account |
| Notification delivery and tap-through not shown natively on this head | Check on the founder device (rows below) |
| Docker logs are unbounded (`json-file`, no `max-size`): Kong 126 MB, Auth 110 MB, DB 172 KB, no growth during this run | Local only; procedure below |
| WS-5's harness processes are still running (proxy :54398, gateways :8010/:8011, delete :8794, stubs) | Not stopped: they belong to another session. Stop by PID when that session is closed |
| Jest's `memoryProofs` needs `TZ=UTC` locally (CI runs in UTC) | No |

**Local log rotation (not applied; needs the founder's yes because it restarts the stack):** in `~/.colima/default/colima.yaml`, set `docker: {log-driver: json-file, log-opts: {max-size: "50m", max-file: "3"}}` and run `colima restart`. The new options apply only to containers created afterwards, so the Supabase containers need `npx supabase stop` (which keeps the data volume; never pass `--no-backup`) followed by `npx supabase start`. Until then, if a log grows, truncate it safely in place: `colima ssh -- sudo truncate -s 0 /var/lib/docker/containers/<id>/<id>-json.log`. Run black-box suites one at a time.

## D. Founder-device test package

**Build (after E's production steps):** EAS cloud builds reset on 1 Nov; otherwise build locally from a checkout of the merged commit:

```bash
SENTRY_DISABLE_AUTO_UPLOAD=true npx eas-cli build --local --profile dogfood-v2 --platform ios --non-interactive --output ~/kinship-alpha.ipa
```

Before installing, check the bundle points at production and contains the new copy (`strings` on `main.jsbundle`, as in `wife-dogfood-final-review.md`). Install by cable: `xcrun devicectl device install app --device <UDID> ~/kinship-alpha.ipa`.

**Acceptance script (about 15 minutes, a fresh account):**

1. Sign in, then go through name, consent and Contacts; pick two or three people. *Expected:* Today shows a real line straight away (a birthday or your first note), never empty.
2. Tell one sentence about someone with a day in it ("Maya starts at Stripe on Monday and she's nervous"). *Expected:* "Kept for Maya", one dated line plus one thread; Today brings it back around that day.
3. Tell a long story (10 or more facts, including a health detail and a promise). *Expected:* every fact kept, with no "couldn't get to all of it"; health and promise lines ask for your yes; open the note and every kept phrase is underlined.
4. From the Moment, tap Message, come back. *Expected:* "Did you reach …?", then Yes, then "Anything worth remembering?".
5. Tell a change ("Actually it moved to Wednesday"). *Expected:* "Replaces: ~~…~~"; Undo restores the original line and its day.
6. People › Ask your memory: ask something you told it in its own words, then a paraphrase. *Expected:* the first gives the line with its source; the second may honestly say "nothing yet".
7. Person › Edit: Pause, then Resume; add a duplicate person and merge, then Undo. *Expected:* Paused people leave Today; Undo puts every line back.
8. Settings › Export your data. *Expected:* one file in the share sheet.
9. Settings › Test notification on a day with a Moment, lock the phone, tap the banner. *Expected:* a private banner ("never what it is"); the tap opens that Moment.
10. Dark mode and the largest text size on Today, People and Person.
11. On a **throwaway** account: Settings › Delete account. *Expected:* signed out; signing in again finds nothing.

**Capturing defects:** a screenshot (side + volume-up), the time, and what you typed. Log it in the ledger's K-series; the session will not fix anything until you say so.

**Evidence levels:** everything in B is simulator evidence. Rows 9 and 11, and every row on the device, are untested until your pass.

## E. Release checklist (not performed)

1. **Merge order:** #75 into `claude/alpha-integration`, then #74 into `main` with a merge commit, on your explicit yes. Merging to `main` applies migrations to production through the Supabase GitHub integration (seen on 16 and 30 Oct), so the merge *is* the migration step.
2. **Migrations, in order** (forward-only): `20261030090000_v2_trust_floor`, `20261030120000_v2_showing_up_moment_types`, `20261031090000_v2_many_items_per_note`, `20261031100000_v2_user_chosen_closure`, `20261031110000_v2_many_held_items`, `20261031120000_v2_person_proactive_server_only`. Confirm with `list_migrations` and the schema fingerprint hash before deploying anything else.
3. **Gateway**, only after the migrations are confirmed: `npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio` from a checkout of merged `main` under the home directory. Verify with `functions download --use-api` + `cmp`. Then deploy `delete-account` the same way (it changed in WS-4).
4. **Environment:** no new secrets or flags. The founder's existing per-account flags stay as they are.
5. **Rollback:** migrations do not roll back; the gateway does (redeploy v16 from `f55f331`). **Not verified:** whether v16 works against the new migrations (`20261031090000`/`100000` replace `write_extraction` and `resolve_capture_review`). Run the black-box suites against the old gateway on the local stack before relying on that path; otherwise roll forward with a fix. The app rolls back by reinstalling the previous `.ipa`.
