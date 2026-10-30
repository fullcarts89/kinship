// The 2.0 tables the device mirrors, and how each one syncs. Column rules
// match the migrations (supabase/migrations/20261002*_v2_*.sql and later).

export type MirroredTable =
  | "people"
  | "related_people"
  | "person_identities"
  | "captures"
  | "memory_items"
  | "memory_item_sources"
  | "memory_item_facets"
  | "reasons"
  | "contact_events"
  | "user_settings";

export interface TableSpec {
  name: MirroredTable;
  /** Primary-key column on the server ("id", or "user_id" for user_settings). */
  key: "id" | "user_id";
  /** The app may create rows (otherwise rows only arrive by pull). */
  appInsert: boolean;
  /** The app may update rows (always with the version it read + 1, CA-3). */
  appUpdate: boolean;
  /** Has deleted_at (tombstones). */
  tombstones: boolean;
  /** Column linking a row to a person, indexed locally for per-person reads. */
  personColumn?: "id" | "person_id" | "context_person_id";
  /**
   * Columns the app may send on insert/update. Anything else (version,
   * timestamps, server-derived fields) is the server's.
   */
  writable: readonly string[];
  /** Writable on insert only (the server refuses them in an update). */
  insertOnly?: readonly string[];
  /**
   * Added after builds already talk to this server. Until its migration is
   * applied the server has no such table, and a pull reads it as empty
   * instead of failing the sync. Only for derived, pull-only tables whose
   * absence fails open.
   */
  optional?: boolean;
}

const SERVER_OWNED = ["user_id", "created_at", "updated_at", "version"];

export const TABLES: readonly TableSpec[] = [
  {
    name: "people", key: "id", appInsert: true, appUpdate: true, tombstones: true, personColumn: "id",
    writable: ["display_name", "full_name", "nicknames", "relationship_label", "birthday",
      "birthday_year_known", "birthday_source", "birthday_capture_id", "state", "contact_ref", "deleted_at"],
  },
  {
    name: "related_people", key: "id", appInsert: true, appUpdate: true, tombstones: true, personColumn: "person_id",
    writable: ["person_id", "relation", "name", "promoted_person_id", "deleted_at"],
  },
  {
    name: "person_identities", key: "id", appInsert: true, appUpdate: true, tombstones: true, personColumn: "person_id",
    writable: ["person_id", "kind", "value_hash", "deleted_at"],
  },
  {
    name: "captures", key: "id", appInsert: true, appUpdate: true, tombstones: true, personColumn: "context_person_id",
    // status starts pending/skipped (insert only); extraction fields (and coverage) are the gateway's.
    // continues_capture_id: the partial note this one tells the rest of (Option A), set once at insert.
    writable: ["source", "raw_text", "transcript_meta", "context_person_id", "occurred_at", "time_zone",
      "status", "retention", "deleted_at", "feedback", "continues_capture_id"],
    insertOnly: ["source", "transcript_meta", "status", "continues_capture_id"],
  },
  {
    name: "memory_items", key: "id", appInsert: true, appUpdate: true, tombstones: true, personColumn: "person_id",
    // resolves_id and closes_ids (what a note closed) arrive with the row and
    // are the server's alone (20261009090000, 20261015090000).
    writable: ["kind", "person_id", "subject_type", "subject_related_id", "statement", "detail", "certainty",
      "sensitivity", "status", "user_state", "valid_from", "valid_to", "supersedes_id", "origin", "deleted_at",
      "with_person_ids", "person_mentions"],
    insertOnly: ["origin"],
  },
  {
    name: "memory_item_sources", key: "id", appInsert: true, appUpdate: true, tombstones: true,
    writable: ["memory_item_id", "capture_id", "source_kind", "span_start", "span_end", "meta", "deleted_at"],
  },
  {
    // The server's derived reading of a line (residence, Phase 4B): pulled
    // after its line, never written by the app (20261015090000).
    name: "memory_item_facets", key: "id", appInsert: false, appUpdate: false, tombstones: true,
    writable: [], optional: true,
  },
  {
    name: "reasons", key: "id", appInsert: false, appUpdate: false, tombstones: true, personColumn: "person_id",
    writable: [],
  },
  {
    name: "contact_events", key: "id", appInsert: true, appUpdate: true, tombstones: true, personColumn: "person_id",
    writable: ["person_id", "channel", "occurred_at", "source", "reason_id", "capture_id", "memory_item_id", "moment_type", "deleted_at"],
  },
  {
    name: "user_settings", key: "user_id", appInsert: true, appUpdate: true, tombstones: false,
    writable: ["time_zone", "quiet_hours_start", "quiet_hours_end", "push_enabled", "capture_retention_default"],
  },
];

/** Pull order: parents before children, so a child never arrives orphaned. */
export const PULL_ORDER: readonly MirroredTable[] = TABLES.map((t) => t.name);

export function spec(name: MirroredTable): TableSpec {
  const s = TABLES.find((t) => t.name === name);
  if (!s) throw new Error(`unknown table ${name}`);
  return s;
}

/** Only the columns the app may write for this operation, never server-owned ones. */
export function writableFields(
  name: MirroredTable,
  row: Record<string, unknown>,
  op: "insert" | "update",
): Record<string, unknown> {
  const s = spec(name);
  const allowed = new Set(s.writable);
  const insertOnly = new Set(s.insertOnly ?? []);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!allowed.has(k) || SERVER_OWNED.includes(k)) continue;
    if (op === "update" && insertOnly.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Server tombstone retention (purge_tombstones). Offline longer → full resync. */
export const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
