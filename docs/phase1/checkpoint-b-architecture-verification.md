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
