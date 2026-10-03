// Three-way merge for a local edit that met a newer server version.
//
//   base   the server row the edit was made against
//   local  the fields the user changed
//   server the newer server row
//
// A field the server didn't change keeps the user's edit (rebased onto the
// new version and retried). A field both sides changed differently is a real
// conflict: the server's value stands and the user's value is recorded as a
// conflict for the UI. Nothing is overwritten silently in either direction.

export interface MergeResult {
  /** Local changes that can be retried on top of the server row. */
  rebased: Record<string, unknown>;
  /** Local changes that clashed with a different server change. */
  conflicting: Record<string, unknown>;
}

// An ISO timestamp with a time part ("…T…Z", "…T…+00:00", with or without
// fractional seconds). Dates without a time ("2026-10-11") are compared as text.
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/;

/**
 * Value equality as the server sees it. Timestamps are compared as instants:
 * the device writes "…Z" and Postgres returns "…+00:00" for the same moment
 * (device check B2 found the textual comparison caused a needless re-push).
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "string" && typeof b === "string" && TIMESTAMP.test(a) && TIMESTAMP.test(b)) {
    return Date.parse(a) === Date.parse(b);
  }
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function threeWayMerge(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  server: Record<string, unknown>,
): MergeResult {
  const rebased: Record<string, unknown> = {};
  const conflicting: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(local)) {
    const serverChanged = !sameValue(base[field], server[field]);
    if (!serverChanged) {
      rebased[field] = value;
    } else if (sameValue(server[field], value)) {
      // Both sides made the same change: nothing to do.
    } else {
      conflicting[field] = value;
    }
  }
  return { rebased, conflicting };
}
