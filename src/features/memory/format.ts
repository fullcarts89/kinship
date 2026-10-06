// Human words for what Kinship remembers: when, what kind, and where it came
// from (plan §6, §8). Dates are calendar days (ISO, no time zone) and are
// shown as the user would say them: "Sun, Oct 11", "Week of Oct 12",
// "October", or their own words in quotes when that's all there is. Never a
// made-up precision, never system vocabulary.

type Detail = Record<string, unknown>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "October". */
export function monthName(monthIndex: number): string {
  return MONTHS_LONG[monthIndex] ?? "";
}

/** "Sunday, October 11" for screen readers. */
export function spokenDay(iso: string): string {
  const p = parts(iso);
  if (!p) return iso;
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${weekdays[p.wd]}, ${MONTHS_LONG[p.m]} ${p.d}, ${p.y}`;
}

function parts(iso: string): { y: number; m: number; d: number; wd: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), wd: t.getUTCDay() };
}

function yearOf(today: string): number {
  return Number(today.slice(0, 4));
}

/** "Sun, Oct 11", with the year when it isn't this year. */
export function dayLabel(iso: string, today: string): string {
  const p = parts(iso);
  if (!p) return iso;
  return `${DAYS[p.wd]}, ${MONTHS[p.m]} ${p.d}${p.y !== yearOf(today) ? `, ${p.y}` : ""}`;
}

function quoted(words: string): string {
  return `“${words}”`;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/** When a memory is, in the user's terms; null when it has no time. */
export function whenLabel(kind: string, detail: Detail, today: string): string | null {
  if (kind === "plan") {
    const date = str(detail.date);
    // A season is said as a season ("Summer 2027"), never its first day.
    const seasonal = str(detail.date_precision) === "season" || (!!str(detail.season) && !str(detail.date_precision));
    if (date && seasonal) {
      const p = parts(date);
      if (p) return `${seasonOf(p.m)}${p.y === yearOf(today) ? "" : ` ${p.y}`}`;
    }
    if (date) return dayLabel(date, today);
    const hint = str(detail.when_hint);
    if (hint) return quoted(hint);
    const season = str(detail.season);
    return season ? season[0].toUpperCase() + season.slice(1) : null;
  }
  if (kind === "promise") {
    const due = str(detail.due_date);
    if (due) return `By ${dayLabel(due, today)}`;
    const hint = str(detail.due_hint);
    return hint ? quoted(hint) : null;
  }
  // Threads keep a resolved time too now ("thinking about moving next summer").
  if (!["fact", "event", "moment", "milestone", "thread"].includes(kind)) return null;
  const date = str(detail.date);
  const end = str(detail.date_end);
  const precision = str(detail.date_precision) ?? (date ? "day" : "unknown");
  const hint = str(detail.date_hint);
  const p = date ? parts(date) : null;
  if (!p) {
    if (hint) return quoted(hint);
    return kind === "event" ? "No date yet" : null;
  }
  const thisYear = p.y === yearOf(today);
  switch (precision) {
    case "day":
      return end && end !== date ? `${dayLabel(date as string, today)} – ${dayLabel(end, today)}` : dayLabel(date as string, today);
    case "week":
      return `Week of ${MONTHS[p.m]} ${p.d}${thisYear ? "" : `, ${p.y}`}`;
    case "month":
      return `${MONTHS_LONG[p.m]}${thisYear ? "" : ` ${p.y}`}`;
    case "season":
      // "Summer 2027", not the words "next summer", which go stale.
      return `${seasonOf(p.m)}${thisYear ? "" : ` ${p.y}`}`;
    case "year":
      return String(p.y);
    default:
      return hint ? quoted(hint) : dayLabel(date as string, today);
  }
}

function seasonOf(month: number): string {
  return ["Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Autumn", "Autumn", "Autumn", "Winter"][month];
}

const KIND_LABELS: Record<string, string> = {
  fact: "Something true",
  event: "Something happening",
  plan: "A plan",
  promise: "Your promise",
  thread: "Something ongoing",
  moment: "A moment",
  milestone: "A milestone",
  tradition: "A tradition",
  context: "Background",
};

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? "Something to remember";
}

/**
 * Whose promise it is, in the user's terms (founder H28). Someone else's
 * commitment to you ("Tyler promised to send me…") is "Tyler's promise",
 * never "Your promise".
 */
export function promiseLabel(owner: "user" | "person", name: string | null): string {
  if (owner === "user") return KIND_LABELS.promise;
  return name ? `${name}'s promise` : "Their promise";
}

/** A local-time timestamp as "Oct 8, 9:14 pm" (with the year when it isn't this year). */
export function momentLabel(timestamp: string, now: Date, withTime = true): string {
  const t = new Date(timestamp);
  if (Number.isNaN(t.getTime())) return "";
  const day = `${MONTHS[t.getMonth()]} ${t.getDate()}${t.getFullYear() !== now.getFullYear() ? `, ${t.getFullYear()}` : ""}`;
  if (!withTime) return day;
  const h = t.getHours();
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${day}, ${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? "am" : "pm"}`;
}

export interface SourceFacts {
  source_kind: string;
  capture_id: string | null;
  created_at: string;
}

/**
 * The provenance line under a memory (plan §6): "You told Kinship · Oct 8",
 * "· and 2 other notes", "Edited by you · Oct 9 · from your note, Oct 8",
 * "From Contacts", "Combined from your notes".
 */
export function provenanceLine(sources: SourceFacts[], now: Date, origin?: string | null): string {
  // Understood from a note whose source hasn't reached this phone yet (the
  // app was closed mid-sync): never claimed as "You added this" (H14).
  if (sources.length === 0 && origin === "extracted") return "Source syncing…";
  const live = [...sources].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const notes = live.filter((s) => s.source_kind === "capture");
  const edits = live.filter((s) => s.source_kind === "user_edit");
  if (edits.length) {
    const from = notes.length ? ` · from your note, ${momentLabel(notes[notes.length - 1].created_at, now, false)}` : "";
    return `Edited by you · ${momentLabel(edits[0].created_at, now, false)}${from}`;
  }
  if (notes.length) {
    const others = notes.length - 1;
    const more = others > 0 ? ` · and ${others} other ${others === 1 ? "note" : "notes"}` : "";
    return `You told Kinship · ${momentLabel(notes[0].created_at, now, false)}${more}`;
  }
  if (live.some((s) => s.source_kind === "contacts")) return "From Contacts";
  if (live.some((s) => s.source_kind === "calendar_event")) return "From your calendar";
  if (live.some((s) => s.source_kind === "merge")) return "Combined from your notes";
  return "You added this";
}

const ARRIVED: Record<string, string> = {
  text: "Typed", voice: "Said aloud", share: "Shared", screenshot: "From a screenshot", siri: "Through Siri",
  widget: "From the widget", post_handoff: "After you reached out", post_encounter: "After you met", photo: "With a photo",
  onboarding: "When you started",
};

/** How a note arrived: "Typed", "Said aloud"… */
export function arrivedLabel(source: string): string {
  return ARRIVED[source] ?? "Told";
}
