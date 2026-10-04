// A memory's detail when the user changes its kind or its date (Checkpoint
// D1). The result always satisfies the database's memory_detail_ok: fields
// the new kind doesn't have are dropped, required ones get a neutral value,
// and a date moves to the field that kind keeps it in. A date is only ever
// the user's own choice; nothing here invents one.

type Detail = Record<string, unknown>;

/** Kinds a user can switch an item between in the review and on a person's page. */
export const SWITCHABLE_KINDS = ["fact", "event", "plan", "thread", "moment", "milestone"] as const;
export type SwitchableKind = (typeof SWITCHABLE_KINDS)[number];

/** Kinds whose detail holds a date the user can set or clear. */
export function takesDate(kind: string): boolean {
  return ["fact", "event", "moment", "milestone", "plan", "promise"].includes(kind);
}

const RANGE_KINDS = new Set(["fact", "event", "moment", "milestone"]);
const DATE_KEYS = ["date", "date_end", "date_precision", "date_hint", "time_of_day"];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && y <= 2200 && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** The detail with the user's date (an ISO day) or with no date at all. */
export function withDate(kind: string, detail: Detail, date: string | null): Detail {
  if (date !== null && !isIsoDay(date)) throw new Error("not a calendar day");
  const out: Detail = { ...detail };
  if (RANGE_KINDS.has(kind)) {
    for (const k of DATE_KEYS) delete out[k];
    if (date) {
      out.date = date;
      out.date_precision = "day";
    } else if (kind === "event") {
      out.date_precision = "unknown"; // an event always says how precise its date is
    }
    return out;
  }
  if (kind === "plan") {
    delete out.date;
    delete out.when_hint;
    delete out.season;
    if (date) out.date = date;
    return out;
  }
  if (kind === "promise") {
    delete out.due_date;
    delete out.due_hint;
    if (date) out.due_date = date;
    return out;
  }
  throw new Error(`a ${kind} has no date`);
}

interface When {
  date?: string;
  date_end?: string;
  date_precision?: string;
  date_hint?: string;
}

/** The date information an item carries, in range terms. */
function whenOf(kind: string, d: Detail): When {
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  if (RANGE_KINDS.has(kind)) {
    return { date: str(d.date), date_end: str(d.date_end), date_precision: str(d.date_precision), date_hint: str(d.date_hint) };
  }
  if (kind === "plan") return { date: str(d.date), date_precision: str(d.date) ? "day" : undefined, date_hint: str(d.when_hint) };
  if (kind === "promise") return { date: str(d.due_date), date_precision: str(d.due_date) ? "day" : undefined, date_hint: str(d.due_hint) };
  if (kind === "thread") return { date_hint: str(d.date_hint) };
  return {};
}

function rangeFields(w: When): Detail {
  const out: Detail = {};
  if (w.date) {
    out.date = w.date;
    if (w.date_end) out.date_end = w.date_end;
    if (w.date_precision) out.date_precision = w.date_precision;
  } else if (w.date_precision === "unknown") {
    out.date_precision = "unknown";
  }
  if (w.date_hint) out.date_hint = w.date_hint;
  return out;
}

/**
 * The detail for the same memory as another kind. Its date (exact, range or
 * the user's words) carries over wherever the new kind can hold it.
 */
export function detailForKind(from: string, detail: Detail, to: SwitchableKind, statement: string): Detail {
  if (from === to) return { ...detail };
  const w = whenOf(from, detail);
  switch (to) {
    case "fact":
      return { category: typeof detail.category === "string" ? detail.category : "other", ...rangeFields(w) };
    case "event":
      return {
        event_type: typeof detail.event_type === "string" ? detail.event_type : "other",
        followup_policy: typeof detail.followup_policy === "string" ? detail.followup_policy : "after",
        ...rangeFields(w),
        date_precision: w.date ? (w.date_precision ?? "day") : "unknown",
      };
    case "moment":
      return rangeFields(w);
    case "milestone":
      return {
        milestone_type: typeof detail.milestone_type === "string" ? detail.milestone_type : "other",
        anniversary: typeof detail.anniversary === "boolean" ? detail.anniversary : false,
        ...rangeFields(w),
      };
    case "plan": {
      const out: Detail = { firmness: typeof detail.firmness === "string" ? detail.firmness : "intended" };
      // A plan keeps an exact day; a coarser time stays as the user's words.
      if (w.date && (w.date_precision ?? "day") === "day" && !w.date_end) out.date = w.date;
      if (w.date_hint) out.when_hint = w.date_hint;
      return out;
    }
    case "thread": {
      const out: Detail = {
        topic: typeof detail.topic === "string" && detail.topic ? detail.topic : [...statement].slice(0, 200).join(""),
        followup_after_days: typeof detail.followup_after_days === "number" ? detail.followup_after_days : 14,
      };
      if (w.date_hint) out.date_hint = w.date_hint;
      return out;
    }
  }
}
