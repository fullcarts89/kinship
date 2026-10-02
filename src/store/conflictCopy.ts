// How a conflict is put to the user (founder decision, Checkpoint B):
// human words, no system vocabulary, no urgency. Shown only in context
// (opening or editing the item, or a quiet review list), never as a push,
// task, badge or warning.

import type { Conflict, Data } from "./userStore";

export interface ConflictChoice {
  field: string;
  title: string;
  keep: { label: string; value: string };
  use: { label: string; value: string };
}

export const CONFLICT_TITLE = "This changed on another device.";

/** One choice per field that differs. `current` is the row as the app shows it now. */
export function describeConflict(conflict: Conflict, current: Data | null): ConflictChoice[] {
  return Object.entries(conflict.local_patch).map(([field, mine]) => ({
    field,
    title: CONFLICT_TITLE,
    keep: { label: "Keep", value: show(current?.[field] ?? conflict.server_row?.[field]) },
    use: { label: "Use", value: show(mine) },
  }));
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Nothing";
  if (typeof value === "string") return `“${value}”`;
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length ? value.map(show).join(", ") : "Nothing";
  if (typeof value === "object") {
    const parts = Object.values(value as Data).filter((v) => v !== null && v !== undefined && v !== "");
    return parts.length ? parts.map(show).join(", ") : "Nothing";
  }
  return "Something else";
}
