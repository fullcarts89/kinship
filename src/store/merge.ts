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

export function sameValue(a: unknown, b: unknown): boolean {
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
