# Phase 1 · Checkpoint A: schema and domain model, for review

**Status:** **approved by the founder on 2 Oct 2026, with amendments CA-1–CA-9** (`KINSHIP_2_DECISIONS.md`). The amendments are implemented in `20261002230000_v2_review_amendments.sql` and `54_v2_amendments.test.sql`. Where this document still says `connections` or `goal`, read `contact_events` and `event_goal`; where it says "leaving `version` out = last write wins", that path is now rejected (CA-3).

**What's been applied:** the first four migrations reached production early through the Supabase GitHub integration (§7). They are empty and unused.

**What's pending:** nothing writes to the 2.0 tables until this review is approved and Checkpoint B starts. Any changes requested here become new migrations that deploy only when merged to `main`.

**Migrations:** `supabase/migrations/20261002210000_v2_foundation.sql` → `20261002220000_v2_supersede_cycles.sql`

**Tests:**
- `supabase/tests/database/50_v2_rows.test.sql` – `53_v2_lifecycle.test.sql` (127 new assertions);
- the updated `20_ai_consent` and `40_delete_account` suites;
- 221 database assertions in total, all passing.

---

## 1. Shape

```
people ─┬─< person_identities          hashed phone/email/handle, for matching only
        ├─< related_people             "Sarah's sister"; never linked across users
        ├─< memory_items ─┬─< memory_item_sources >── captures
        │                 ├─< memory_item_history  (Undo, 30 days)
        │                 └── supersedes → memory_items
        ├─< reasons ─┬─< reason_evidence >── memory_items
        │            └─< reason_events          (shown · acted · done · dismissed · feedback · return check)
        └─< connections                         confirmed contact only
user_settings (extended) · consents (ledger) · devices · notification_log · feature_flags · user_flag_overrides
```

1.0 tables (`persons`, `memories`, `interactions`, `promises`, `seasons`, `season_commitments`) are untouched and keep serving the 1.0 app.

## 2. Requirements, and where each is enforced

| Requirement (execution model A) | How | Proven by |
|---|---|---|
| **Ownership** | `user_id` defaults to the caller, can never change, and every parent link is a composite FK `(parent_id, user_id) → parent(id, user_id)`. A row can only point at its own user's rows, for every role, including the service role. | 51 (forging and re-parenting attempts on every link) |
| **RLS** | Every 2.0 table: owner-only for `authenticated`, nothing for `anon`, policies use `(select auth.uid())`. Server-derived tables (`reasons`, `reason_evidence`, `consents`, `notification_log`, flags) are read-only to users. | 50, 51 |
| **Provenance** | A live memory item must have ≥1 live source at commit (deferred constraint triggers on both tables). A capture source must name its capture and a non-empty span inside the text; the server fills the quote (≤200 chars) from the span. | 52 |
| **Captured text** | Never rewritten; can only be purged to NULL (retention "delete after extraction"). Quotes keep the Source view working after a purge. | 52 |
| **Tombstones** | No DELETE privilege on any 2.0 table. Deletion = `deleted_at`, which syncs like any change. `purge_tombstones()` (service role) hard-deletes after ≥30 days. | 50, 53 |
| **`updated_at`** | Server clock (`clock_timestamp()`) on every insert and update; client values ignored. The pull cursor index is `(user_id, updated_at, id)` on every synced table. | 50 |
| **Optimistic versioning** | A new row starts at 1. A write carrying a stale `version` fails with 40001; otherwise the version is bumped. Leaving `version` out means last write wins. | 50 |
| **Subject / person semantics** | `person_id` = whose page it's on; `subject_type` person · related · user · shared. A related subject must hang off the *same* person (composite FK through `related_people`). A promise is always the user's own. | 53 |
| **Uncertainty** | `certainty` stated · tentative · reported · planned · wished; `extraction_confidence` (never shown) can't be set by the app. | 52, 53 |
| **Sensitivity** | `none` · `health` · `death_grief` · `conflict` · `money` · `other_private`, on every item. | schema |
| **Superseding** | Same person only. The old item becomes `superseded` (facts get `valid_to`) and is kept. No loops (fix migration `…220000`). | 53 |
| **Deletion** | Capture deleted → its sources go; items left with no live source go. Person deleted → their items, related people, identities, connections and capture-only-about-them go, and their reasons are suppressed. Mixed captures stay. Account deletion removes all 23 user tables plus auth, verified in one transaction. | 52, 53, 40 |
| **Typed detail** | `memory_detail_ok(kind, detail)` CHECK: required keys, enums, real ISO dates, ranges, no unknown keys. Mirrors the zod schema that B/C will share. | 53 (18 cases) |
| **D13** | No open reason can exist for a paused, remembered, archived or deleted person. Setting that state suppresses open reasons, birthdays included. | 53 |
| **Reasons need evidence** | Every non-birthday reason cites ≥1 memory item (checked at commit). Retracting, superseding, expiring or deleting the evidence suppresses open reasons. | 53 |
| **Opening ≠ contact** | `reason_events` drive state: `acted` (opened the channel) is not `done`. Only `return_yes` or an explicit `done` is. A `return_check` connection must name its reason. A done reason never reopens. | 53 |
| **Future sync** | Client-generated UUIDs, tombstones, server `updated_at`, `version`, per-table cursor indexes. | 50 |
| **Consent** | Consent columns are writable only through `set_ai_consent`, which now also appends to the `consents` ledger. | 20, 53 |
| **Flags** | 19 flags from plan §25, **all off**. `my_flags()` returns override → stable rollout bucket → default. Overrides are invisible to other users. | 51, 53 |

## 3. Deviations from the plan text (please confirm)

1. **`connections`, not `interactions`,** for confirmed contact. 1.0 already owns `interactions`, and 1.0 must keep running. It can be renamed when 1.0 is retired.
2. **`reason_evidence` table instead of `reasons.evidence_item_ids uuid[]`.** An array can't hold foreign keys. The table makes "evidence deleted → reason suppressed" and ownership enforceable.
3. **Event detail gains `goal`** (≤200 chars). The slice needs "His goal was under four hours" to come from the same item as the race, rather than as a separate thread.
4. **`captures.time_zone`** (and `user_settings.time_zone`). "Sunday" must resolve against the user's calendar, not UTC.
5. **Reason `type` list follows §13** (hard_time, event_followup, upcoming_event, birthday, promise, thread, plan, tradition, reconnect, resurfacing, review). The analytics `reason_type` stays coarser.
6. **The app cannot write `origin = 'extracted'` items.** Extraction writes come from the gateway (Checkpoint C) through a server function that also enforces "never override `edited` / `user_authored`" and "never upgrade certainty". That's why those two rules aren't database triggers yet.
7. **`set_ai_consent` is now SECURITY DEFINER,** so it can append to the ledger users can't write. Same signature and behaviour. A new advisor warning is accepted on the same terms as `consume_ai_call`.

## 4. Deliberately deferred

| Item | Where it lands |
|---|---|
| Redacting a deleted person's spans from *mixed* captures | B (repository operation; needs the span map) |
| Undo of a person deletion (un-tombstoning the cascade) | B |
| Gateway write path for extractions; edited/authored protection; certainty-upgrade guard | C |
| `pg_cron` schedule for `purge_tombstones()` | When the sync engine ships (B) |
| Moving 1.0 data into 2.0 (persons → people, memories → captures + moments, promises → promise items, interactions → connections) | B, as one reviewed migration with a dry-run count report |
| `capture_media` and the private photo bucket (ends F0-D1's transitional rule) | B |
| `person_insights` (rhythm), `merges`, `extraction_feedback` | When their features are built |
| Generated TypeScript types for 2.0 | B |

## 5. Sync caveat for Checkpoint B

`updated_at` is the server clock at write time, not commit time. A long transaction can commit a row stamped earlier than rows another client has already pulled. The pull must re-read a short overlap window (for example, the last 5 minutes) and de-duplicate by `(id, version)`. That's simpler and safer than a commit-ordered sequence for this data size.

## 6. Questions for you

1. Approve the deviations in §3 (especially the `connections` name and the `goal` key).
2. Is "leaving `version` out = last write wins" acceptable for the app's own writes, or should every write be required to carry a version? Strict is safer, but every screen-level edit then needs the row's version.
3. Flags stay all-off until the 2.0 build ships. Agreed?

## 7. Incident: applied to production before review

At 21:01 UTC on 2 Oct, pushing the migrations to `claude/gifted-pasteur-e2q0qu` triggered the Supabase GitHub integration, which treated that branch as the production branch, and the four migrations were applied to production.

**Impact:**
- 15 empty tables were added, with RLS on; 19 flags were added, all off;
- `user_settings` was extended, and its consent columns are now function-only;
- `set_ai_consent` now also logs to the ledger.

The 1.0 app only reads settings and changes consent through that function, so it is unaffected. No data was written.

**Fix:** the founder set the integration's production branch to `main` (21:08 UTC).

**Decision (founder, on recommendation):** keep what was applied rather than roll back, since it's additive, empty and switched off. The review proceeds on the live state, and changes become new migrations. The cycle fix (`20261002220000`) is the first such change; it deploys when merged to `main`.

**Lesson recorded:** check a project's Git-integration settings before pushing migration files.

## 8. Merged and verified (2 Oct 2026)

- The amendments merged in [fullcarts89/kinship#8](https://github.com/fullcarts89/kinship/pull/8) as merge commit `5dd1aac`, with CI green.
- The Supabase preview branch, now separate from production, built all 18 migrations from scratch.
- The integration then deployed the two pending migrations to production.
- Production and the repository have identical schema fingerprints (`7c84be27…`).
- Checkpoint A is closed. Checkpoint B starts from `main`.
