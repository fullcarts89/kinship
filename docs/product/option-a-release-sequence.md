# Option A (containment): the post-merge release sequence

*19–20 Oct 2026, for PR #58 (`claude/option-a-containment`). Written before any of it is authorised: **merge, the production migration, the gateway deploy, the phone install and Option B / B9 each need the founder's separate yes.** Readiness stays NOT READY. The states below were read from the Supabase project and the repository on 20 Oct (UTC), not assumed.*

## Where things stand (read, not assumed)

| Piece | Production (`kddpxiiyxgvjrtpdkvio`) | PR preview branch (`isjaudhxtxvtszrzmjwr`, "claude/option-a-containment", created by the Supabase GitHub integration for PR #58) | Local stack (black-box and simulator runs) |
|---|---|---|---|
| Database migrations | Latest `20261016090000_v2_closure_of_edited_lines`. **`20261019090000_v2_partial_captures` is not applied.** | **`20261019090000_v2_partial_captures` applied** (the integration ran the PR's migration on the preview database; `with_data: false`, so an empty database). | Applied (additive: two nullable columns, two constraints, two functions, one index). |
| `ai-gateway` | **v15**, deployed by hand on 19 Oct from `main` `9ae900a` (K27); entrypoint recorded as the `deploy-main-a4ab5ac` worktree; `verify_jwt` on. Knows nothing of coverage. | The branch status says `FUNCTIONS_DEPLOYED`, but its function records are **identical to production's** (same ids, v15, same bundle hash, same entrypoint). The preview does **not** run this PR's gateway. | This branch's gateway (`deno run … ai-gateway/index.ts`), on its own port, behind a harness proxy for the simulator. |
| App | The founder's phone runs the fc06b10 build (K26–K28), which has no Option A code. | — | Release simulator build of this branch (`e2e/README.md`, "The simulator build"). |

So the PR's preview proves the migration applies cleanly to a Supabase-hosted Postgres and nothing else; it is **not** an end-to-end preview of Option A (no branch gateway, no app pointed at it, no data).

## What is automatic, and what is not

- **Migrations, automatic.** The Supabase GitHub integration applies a PR's new migrations to its preview branch when the PR opens or changes (seen: the preview has `20261019090000`), and applies them to **production on merge to `main`** (seen on 16 Oct for `20261015090000_v2_residence_facets`, which was in production before anyone ran `db push`). A merge of PR #58 therefore **is** the production migration; there is no separate step to authorise, only to verify.
- **Edge functions, manual.** Production `ai-gateway` has only ever been deployed by hand (`npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio`, v9 … v15), from a checkout under the home directory (the bundler runs in Docker/Colima and cannot see `/tmp`). The integration's preview did not deploy the branch's gateway; nothing deploys production's gateway on merge. **Merging does not change what the phone's notes are understood by.**
- **The app, manual.** A native build (local `eas-cli build --local --profile dogfood-v2` while the October cloud quota is out; cloud from 1 Nov) and a cable install (`xcrun devicectl device install app`). The app is configured for expo-updates (`runtimeVersion` policy `appVersion`, an update URL) but the dogfood profile publishes no update channel, so **no over-the-air update can change the phone's app**; only an install does.

## The sequence, in order, and why the order matters

1. **Merge PR #58 with a merge commit** (founder). This is also the production migration (automatic). Before merging: the branch is on `main`'s tip (it is, as of `4a58721`); CI green.
2. **Verify the migration landed** (read-only; from any checkout of merged `main` under the home directory, linked with `npx supabase link --project-ref kddpxiiyxgvjrtpdkvio`): `npx supabase migration list` shows `20261019090000` on the remote, or the Supabase connector's `list_migrations`; then `supabase/tests/schema_fingerprint_hash.sql` through the connector's read-only `execute_sql` matches the local fingerprint. If the integration did not apply it (it has, every time so far), `npx supabase db push --dry-run` then `db push`, on the founder's yes.
3. **Deploy `ai-gateway` from merged `main`** (founder's yes; from a checkout under the home directory): `npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio`. Verify with `npx supabase functions download ai-gateway --project-ref kddpxiiyxgvjrtpdkvio --use-api` into an empty scratch folder and `cmp` every file against the checkout (the bundle held 27 files at v15; Option A adds no file, it changes `pipeline.ts`, `types.ts`, `context.ts`, `handler.ts`, `index.ts`). The dashboard's version becomes v16.
   **Never before step 2.** The new gateway calls `set_capture_coverage` on every note that held more than eight proposals (and on a re-run that clears a stale record), and that call is awaited before the write with no fallback: on a database without the migration the request fails and the user's note is not understood. The migration is additive and safe under the old gateway (it never touches the new columns), so "migration first, gateway second" is the only safe order, and merging gives it for free.
4. **Build and install the app** from the same `main` commit (founder's yes; `kinship-local-ios-build` notes: `SENTRY_DISABLE_AUTO_UPLOAD=true npx eas-cli build --local --profile dogfood-v2 --platform ios …`, then `xcrun devicectl device install app --device 00008130-001C206C3451001C <ipa>`). Then the founder's `option-a-device-checklist.md` (14 rows).

## Version mismatches, and how each is prevented or harmless

| Mismatch | What happens | Prevented by |
|---|---|---|
| New gateway, old database (migration missing) | Partial notes fail to understand ("Couldn't understand this yet… I'll try again"); nothing is written, the note is kept. | The order above: merge (migration, automatic) → verify → deploy. Step 2 is the gate. |
| Old gateway (v15), new app | No `coverage` in any reply; the app shows the old behaviour (the ninth thing silently gone, as today). Safe, but Option A is not in effect: **the phone shows nothing new until the gateway is deployed.** The checklist's rows 1–4 would fail exactly like today. | Deploy the gateway before or with the install; the checklist's first row is the check. |
| New gateway, old app (fc06b10) | The reply carries `coverage` and `saved_ids`; the old app's parser ignores fields it does not know. Notes are understood as before; the database records coverage the old app never shows. Safe. | Nothing needed; the next install shows it. |
| New app, two phones on one account, one old | The capture rows carry `coverage` and `continues_capture_id` (synced, insert-only); the old phone ignores them and shows the old behaviour for that note; the new phone shows the partial state. No write conflicts (the gateway alone writes coverage; the link is set once at insert). | Sync's column lists are per build; nothing to do. |
| App version | `runtimeVersion` policy `appVersion` (`1.0.0`); the local build number does not change between dogfood builds (`1.0.0 (2)` each time), so the version string cannot tell builds apart. | Keep the commit in the build notes and in `HANDOFF.md`; `strings` on the `.hbc` for a copy string unique to the build (`"Tell the rest"`). |
| Gateway version | Replies carry `extraction_version` (`relationship_extract/v6+model`); the app does not gate on it. | The dashboard version (v15 → v16) plus `functions download` + `cmp` is the verification; recorded in `HANDOFF.md`. |

## What is not in this sequence
- **No Option B, no B9, no onboarding change, no new prompt**: the gateway deploy ships the Option A pipeline only (the same prompt and model; `maxRetries: 0`).
- **No data backfill**: existing captures have `coverage` null and show as before.
- **No rollback needed for the migration** (additive, nullable); rolling back the gateway is a redeploy of `main` before the merge, which the old app tolerates; rolling back the app is a reinstall.
