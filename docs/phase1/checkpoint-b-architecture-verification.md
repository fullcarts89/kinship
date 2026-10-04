# Phase 1 · Checkpoint B: local repository and sync, architecture verification

**Status:** built and tested. This summary is required before any broad UI migration (Phase 1 execution model, B). **Checkpoint C has not started.**

**Code:**
- `src/store/` (layer by layer in §1);
- `src/hooks/useStoreQuery.ts`;
- migration `20261003090000_v2_write_memory_item.sql`.

**Tests:**
- `src/store/__tests__/` (sync, isolation, repositories, supabaseRemote, layering);
- `src/hooks/__tests__/useStoreQuery.test.ts`;
- `supabase/tests/database/55_v2_write_memory_item.test.sql`.

**Totals:** Jest 164, pgTAP 274, Deno 39. All passing; tsc and lint are clean.

## 1. Layers (plan §11)

```
screens (app/)                    ── lint: no Supabase client, no store internals
  └─ hooks: useStoreQuery          re-read on change; errors surface; no fallback data
      └─ repositories              people · captures (tell) · memory (remember/correct/retract) · contacts · settings
          └─ UserStore             mirror + outbox, one transaction per write; versions carried here
              └─ SyncEngine        push (outbox) · pull (overlap) · reconcile · full resync
                  └─ Remote        SupabaseRemote (PostgREST, as the user, under RLS) · FakeRemote (tests)
device: one SQLCipher file per user (kinship-<uid>.db), key in SecureStore
```

- **Screens never merge local and remote data.** They read through hooks, which read repositories, which read the mirror.
- **Only the sync engine talks to the server.** Lint enforces this in `app/`, and `layering.test.ts` proves the rule fires.
- **The 2.0 store never imports the 1.0 layers** (hooks, services, mock data, `lib`).

## 2. Required proofs

| Requirement (execution model B) | How it's met | Proven by |
|---|---|---|
| **Per-user isolation** | One file per user. The file is bound to its owner in `meta`; a mismatch means it's deleted and rebuilt, never read. Each file has its own key. The server side is RLS. | `isolation.test.ts`: B never sees A's rows; a copied file and key under another name is refused |
| **Offline capture** | `tell()` writes the mirror and the outbox in one local transaction. It shows instantly, survives restarts, and is pushed later. | `sync.test.ts` "shows a capture immediately…"; `isolation.test.ts` "offline capture survives a restart"; `repositories.test.ts` (Ben flow told offline) |
| **Idempotent writes** | Client UUIDs. Inserts use `ON CONFLICT DO NOTHING` and return the existing row. Memory items go through `write_memory_item`, idempotent by id. Edits to a row with a pending op coalesce into it. An edit made during an in-flight push is kept. | `sync.test.ts` (lost reply, coalescing, in-flight edit); `55_v2_write_memory_item` (retry writes nothing twice) |
| **Strict versions (CA-3)** | Updates send *base + 1*, derived from the mirror, never from screens. The server rejects a missing or stale version (40001). | `sync.test.ts` "sends the version it read + 1"; DB `50`/`54` |
| **Conflict handling** | A three-way merge against the base the edit was made on. Non-overlapping edits are rebased and retried. A same-field clash keeps the server's value and records a **conflict** (surfaced by `store.conflicts()`). A rule rejection (check, FK, privilege) is recorded and the row is restored to the server's version. Nothing is overwritten or dropped silently. | `sync.test.ts` (rebase, clash, rejection) |
| **Incremental pulls** | Per table, `updated_at >= cursor - 5 min`, keyset-paged by (updated_at, key), de-duplicated by (key, version). | `sync.test.ts` "pulls only changes…", "late commit inside the overlap" |
| **Reconciliation safeguard (CA-6)** | Every 24 h, and after a full resync: the full (key, version) manifest per table. It fetches anything missed and drops rows the server purged, but never unpushed local rows. | `sync.test.ts` "catches what even the overlap missed", "drops rows the server purged…" |
| **Full resync beyond retention** | No good sync for over 30 days means synced rows and cursors are dropped (unpushed writes are kept) and everything is pulled again. | `sync.test.ts` "full resync after being offline longer than tombstone retention" |
| **Tombstone propagation** | Deletes are `deleted_at` updates, both ways. Lists hide tombstones; they stay readable with `includeDeleted`. | `sync.test.ts` "propagates tombstones both ways" |
| **Sign-out cleanup** | `clearAllLocalUserData` → `wipeAllStores()`: it closes the active store and deletes every `kinship-*.db` file and its key. | `isolation.test.ts` "sign-out deletes every user's file and key"; `localDataReset.test.ts` |
| **Account switching** | `storeForUser` closes the previous user's store before opening the next. Files are per user, and sign-out deletes all of them. | `isolation.test.ts` |
| **No demo identities** | A store opens only for a real UUID. There is no fallback data anywhere: hooks with no store show nothing, and read errors surface. | `isolation.test.ts` "has no demo identity"; `useStoreQuery.test.ts` |
| **Provenance over REST** | An item and its sources are written in one server transaction (`write_memory_item`, SECURITY INVOKER, so RLS and every rule still apply). The repository refuses an item with no source. | `55_v2_write_memory_item`; `repositories.test.ts` |
| **Spans (CA-4)** | Captured text is stored as NFC. Spans are located from the exact quote, or converted from a UTF-16 UI selection, never guessed. | `repositories.test.ts` (NFC, emoji spans, selection conversion, ambiguous or missing evidence refused) |
| **Encryption at rest (D11)** | SQLCipher (`expo-sqlite` plugin `useSQLCipher: true`) with a 256-bit random key per user in SecureStore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`). On open, `PRAGMA cipher_version` must be non-empty and the key must open the file, or the store refuses to open. It never falls back to plaintext. | Logic: `isolation.test.ts` (a wrong key means rebuild, not read). **On device: pending, see §4** |

## 3. Decisions to confirm

1. **Conflict policy.** Plan §11 says "for user-edited memory, the latest user edit wins". CA-3 says a stale write must fail rather than overwrite. I implemented field-level merging:
   - different fields both survive;
   - on a same-field clash, the server's (earlier-committed) value stands and the user's value is kept as a visible conflict to resolve.

   Alternative: on a same-field clash, automatically re-apply the user's value as a new explicit edit (latest user edit wins, still versioned). It's a small change if you prefer it.
2. **Overlap 5 minutes, reconciliation every 24 hours,** and pages of 500 (manifests of 500 keys). These are tunable constants in `SyncEngine`.

## 4. Not yet proven, and where it lands

| Item | Plan |
|---|---|
| **SQLCipher active on a real device** | The next EAS dev build includes the plugin. Device check: open a store, confirm `cipher_version`, and confirm the file can't be opened without the key (spike S-2). Needs one build and about 10 minutes on the iPhone. |
| `SupabaseRemote` against real PostgREST | Covered by query-shape and error-mapping tests, and by the DB rules in pgTAP. A live contract run against a Supabase preview branch should happen when the slice first syncs. |
| Realtime "changed" pings | Not needed for correctness (pull on foreground plus reconciliation). Added with the slice. |
| `reason_events` push and reasons evidence pull | They arrive with Today and Reasons (vertical slice). |
| Undo of a person deletion; redacting mixed captures | Repository operations, with the person page. |
| 1.0 → 2.0 data migration | One reviewed migration with a dry-run report, before `shell_v2` is enabled for anyone. |
| `pg_cron` for `purge_tombstones()` | When 2.0 data exists in production. |

## 5. Schema change in this checkpoint

`20261003090000_v2_write_memory_item.sql` adds one function and changes no table. Provenance is checked at commit, but each REST request is its own transaction, so an item and its first source need one call. It is SECURITY INVOKER, not callable by anon, insert-only and idempotent. It deploys only when the Checkpoint B PR is merged to `main` (OPS-1).

## 6. Merged and verified (2 Oct 2026)

- Merged as [fullcarts89/kinship#9](https://github.com/fullcarts89/kinship/pull/9) (merge commit `7c60ffe`), with CI green on `main`.
- The integration deployed `write_memory_item` at 22:16 UTC.
- Production has 19 migrations, and its schema fingerprint is identical to a fresh build of `main` (`da13bfe7…`).
- **Still open:**
  - the SQLCipher check on a physical device (§4);
  - the conflict-policy confirmation (§3).

---

## 7. Founder review closeout (3 Oct 2026). **Checkpoint B: COMPLETE**

### 7.1 Founder decisions

- **Conflict policy:**
  - edits to *different* fields merge automatically, with no conflict;
  - for the *same* user-controlled field, the value the server accepted first stays canonical for now, the competing value is preserved as a conflict, and the user chooses;
  - *identical* values resolve automatically.
- **No automatic last-write-wins for same-field user edits.** Server-derived and AI-derived fields keep their server-owned concurrency rules: they aren't in app patches, so they never raise user-facing conflicts.
- **Mechanics live in the repository and sync layer.** Screens never see versions. `resolveConflict(id, keep_current | use_mine)` gives one deterministic final state; `use_mine` is a normal versioned edit.
- **Wording:**
  - "This changed on another device." with Keep "…" / Use "…" (`src/store/conflictCopy.ts`);
  - no system vocabulary, which a test checks;
  - shown only in context. Conflicts are never a push, badge, task, streak or warning.
- **Proofs:** `src/store/__tests__/conflicts.test.ts` covers:
  - different fields merge;
  - the same field keeps both values;
  - nothing is silently overwritten;
  - identical edits raise no conflict (mutation-checked);
  - both resolution choices converge to one state on every device.

### 7.2 Atomic memory + provenance (`write_memory_item`)

| Requirement | Evidence (pgTAP `55_v2_write_memory_item`, 20 assertions) |
|---|---|
| User from server auth context | A `user_id` in the payload is ignored; item and sources are owned by `auth.uid()` |
| No row for another user | as above |
| Not under another user's person / related person | 23503 for both |
| Not citing another user's capture | 23503 |
| No source owned by another user | sources take the caller's id; every FK is owner-composite |
| Provenance span validated | an out-of-range span → 23514; a capture source without a capture → 23514 |
| No live item without a valid source | empty sources → 23514; checked at commit (deferred) |
| Retry / idempotency | a retry returns the existing item and writes no duplicate source; reusing *another user's* item id → 23505, and their item is untouched |
| Security posture | SECURITY **INVOKER** (RLS and column privileges apply), `search_path = ''`, no execute for anon or PUBLIC |

The provenance invariant was not weakened for sync. The function exists precisely so an item and its first source commit together.

### 7.3 Local encryption: device result (iPhone 15 Pro Max, iOS 26.6.2, EAS dev build from `main`, 3 Oct 2026)

| Step | Result |
|---|---|
| SQLCipher active | `SQLCipher 4.7.0 community` |
| File is not plaintext SQLite | header bytes `..t.2_...*......` (random salt), not `SQLite format 3` |
| Write → force-quit → relaunch → read | ✅ the note was read back through the key |
| Open with no key | ✅ refused: `file is not a database` (code 26) |
| Open with a wrong key | ✅ refused: `file is not a database` |
| Missing key | ✅ the old file was discarded unread, a new empty store was created, and both notes came back from the server on sync (new file, new header) |
| Another account's file | not read: owner binding (unit tested) plus the account-switch smoke test (7.5) |
| No plaintext fallback | `openEncrypted` refuses unless `cipher_version` is non-empty and the key opens the file. Recovery always rebuilds from the server |

**Device finding (fixed, [fullcarts89/kinship#11](https://github.com/fullcarts89/kinship/pull/11)):** expo-sqlite's exclusive transactions open a second connection, which never has the key, so writes failed. Transactions now run on the one keyed connection.

### 7.4 Sync: device result

| Step | Result |
|---|---|
| Offline write | saved instantly; sync reported `offline: true` with nothing lost |
| Survives a restart before it was ever sent | `pending writes 1` after relaunch |
| Exactly one logical write | `pushed: 1`; the server holds **one** row at **version 1** (checked in SQL) |
| Concurrent sync taps | still one server copy each |
| Lost-response retry | automated: `sync.test.ts` "insert reached the server but the reply was lost"; pgTAP 55 retry |

**Device finding (fixed, [fullcarts89/kinship#12](https://github.com/fullcarts89/kinship/pull/12)):** the device sends timestamps as `…Z` and Postgres returns `…+00:00`. A textual comparison caused one needless second push per new row (no duplicates, but version 2). Timestamps are now compared as instants. Confirmed on device: the post-fix note is at version 1.

The reconciliation strategy and tombstones are unchanged (§2): a 5-minute overlap, `(id, version)` dedupe, a daily manifest reconciliation, tombstones both ways, and a full rebuild after 30 days offline.

### 7.5 Account isolation

- **Existing evidence accepted:** the founder's Phase 0 device tests D/E (and the earlier three-account pass) exercised **1.0** storage. They are accepted for 1.0; they **did not** exercise the 2.0 store, which didn't exist yet.
- **2.0 smoke test (done, not repeated as a three-account sequence):** account A (`86cb2383…`) created encrypted 2.0 data, then signed out, and account B (`97748654…`) signed in.
  - B's status showed only B's file;
  - no A content;
  - **no key for A** on the device (`9 Check: PASS`).
- The sign-out wipe (`wipeAllStores`) is unit-tested too.

### 7.6 Production (final)

- **`main`:** `e3df441`. CI green (App, Edge functions, Database).
- **Locally on `main`:** tsc clean; eslint 0 errors (131 pre-existing warnings); Jest 174; Deno 39; pgTAP 284.
- **Migrations:** production has 19, matching `supabase/migrations`, through `20261003090000_v2_write_memory_item`. No migration has changed since the parity check, so the schema fingerprint `da13bfe7…` still matches.
- **Edge functions:** `ai-insight` and `delete-account` are unchanged and equal to the repository.

### 7.7 Media

- `capture_media` **does not exist**.
- **No private server-side photo storage exists.**
- The Phase 0 transitional local-photo behaviour (F0-D1) **is still in effect** for the 1.0 app: photos live only on the device, are removed when another account claims the device, and are kept for the same account.
- **Deferred to** the first media-bearing slice. Ticket: *"2.0 media: `capture_media` table + private Storage bucket (`<user_id>/…`), signed URLs, deletion via `delete-account`, migration of on-device 1.0 photos"*. It is planned for after the text-first vertical slice and before `shell_v2` is enabled for anyone with photos.
- **Why it doesn't block:** the approved first vertical slice is text-only.
- **Remaining risk until it ships:** 1.0 photos are lost with the device or on an account switch, and they aren't backed up. This is unchanged from Phase 0 and disclosed on the Account screen.

### 7.8 Known risks / not yet proven

- The 2.0 store is reached only through the dev store check. No product screen uses it yet; that comes with the vertical slice.
- `SupabaseRemote` is proven on device for captures (insert, update, pull, manifest). Memory items via `write_memory_item`, conflicts and reconciliation-drops against live PostgREST are proven only in automated tests so far. They get exercised when the slice runs.
- Realtime "changed" pings, `reason_events` push, person-delete undo and mixed-capture redaction are still pending (as in §4).
- **Test data:** three "Kinship store check" captures remain on the two founder accounts until cleaned up with the store check (8, then 5).

**Checkpoint B is complete.** Checkpoint C is authorized (founder, 3 Oct 2026).
