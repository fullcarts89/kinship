// Today (plan §13; Design Direction §I.2): one thing worth knowing, at most
// two quiet lines, or silence. Pure: the screen supplies the user's reasons,
// memory, people and this device's record of what was shown, acted on or put
// aside; this decides what Today says.
//
// Selection is deterministic (plan §13 ranking): base weight × timeliness ×
// evidence × freshness × a one-per-person-per-week cap; the top reason
// speaks only at ≥ 55. Below that, Today is quiet: "Nothing needs you today."
// Nothing is manufactured to fill it.
//
// Copy is grounded by construction: every sentence is a fixed template plus
// the person's name, the event's own statement (the user's words, as kept),
// and a date label computed from the event's day. There is no model and no
// event-type vocabulary in it.

import { dayLabel, whenLabel } from "@/features/memory/format";
import type { MemoryItem, Person } from "@/store/repositories";

export type ReasonType = "upcoming_event" | "event_followup";

export interface ReasonRow {
  id: string;
  person_id: string;
  type: string;
  window_start: string;
  window_end: string;
  score: number | string;
  state: string;
  dedupe_key: string;
  deleted_at?: string | null;
}

/** What this device remembers about a reason (src/store/reasonLocal.ts). */
export interface LocalReason {
  /** The day it was first shown as the moment (ISO day). */
  firstShown?: string;
  /** The user opened a conversation from it. */
  acted?: string;
  /** "Not now". */
  dismissed?: string;
  /** "Yes" to the return check. */
  done?: string;
}

export interface Handoff {
  reasonId: string;
  personId: string;
  channel: "text" | "call" | "facetime" | "whatsapp" | "email";
  at: string;
  answered?: "yes" | "not_yet";
}

export interface TodayInput {
  now: Date;
  /** Today as an ISO day where the user is. */
  today: string;
  reasons: ReasonRow[];
  /** Live memory items (any person). */
  items: MemoryItem[];
  people: Person[];
  local: Record<string, LocalReason>;
  /** The person each recent moment was about, by the day it was shown (person cap). */
  primaries: { personId: string; reasonId: string; day: string }[];
  handoff: Handoff | null;
  /** Notes waiting on the user (D1): a question, or understood while away. */
  questions: number;
  toLookAt: number;
  /** "You told Kinship · Oct 8" for an item, and the note it came from. */
  provenance: (itemId: string) => { line: string; noteId: string | null } | null;
}

export interface MomentView {
  reasonId: string;
  type: ReasonType;
  personId: string;
  personName: string;
  itemId: string;
  statement: string;
  context: string;
  provenance: string | null;
  /** The note it came from (one tap on the provenance opens it). */
  noteId: string | null;
  score: number;
  primary: { label: string; hint: string };
  /** The hand-off sheet's heading. */
  heading: string;
  /** Other things the user told Kinship about them, for "You could mention". */
  mention: string[];
}

export type QuietView =
  | { kind: "question"; label: string; text: string; action: string }
  | { kind: "look"; label: string; text: string; action: string }
  | { kind: "coming"; label: string; text: string; personId: string; itemId: string };

export interface ReturnView {
  personId: string;
  personName: string;
  reasonId: string;
  channel: Handoff["channel"];
}

export interface TodayView {
  dateLabel: string;
  greeting: string;
  returnCheck: ReturnView | null;
  moment: MomentView | null;
  quiet: QuietView[];
  /** "Nothing needs you today." */
  quietDay: boolean;
}

export const THRESHOLD = 55;
const RETURN_MIN_MS = 10 * 60 * 1000;
const RETURN_MAX_MS = 12 * 60 * 60 * 1000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CERTAINTY: Record<string, number> = { stated: 1, planned: 0.9, tentative: 0.7, reported: 0.6, wished: 0.5 };
const USER_STATE: Record<string, number> = { confirmed: 1, edited: 1, user_authored: 1, unreviewed: 0.85 };

/** The evidence item a v0 reason cites (its dedupe key is type:item:day). */
export function evidenceOf(r: ReasonRow): string | null {
  const parts = r.dedupe_key.split(":");
  return parts.length === 3 ? parts[1] : null;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const t = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

/** "Tomorrow", "Yesterday", "Saturday", or the date. */
export function relativeDay(day: string, today: string): string {
  const n = daysBetween(today, day);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  const d = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))));
  if (n > 1 && n < 7) return WEEKDAYS[d.getUTCDay()];
  return dayLabel(day, today);
}

function firstName(p: Person): string {
  return p.display_name.trim().split(/\s+/u)[0] || p.display_name;
}

function eventDay(item: MemoryItem): string | null {
  const d = (item.detail ?? {}) as Record<string, unknown>;
  const day = d.date;
  const precision = typeof d.date_precision === "string" ? d.date_precision : "day";
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && precision === "day" ? day : null;
}

/** Plan §13 ranking, for one open reason now. Zero when it can't speak. */
export function scoreOf(r: ReasonRow, item: MemoryItem, input: TodayInput): number {
  const now = input.now.getTime();
  const start = Date.parse(r.window_start);
  const end = Date.parse(r.window_end);
  if (!(now >= start && now < end)) return 0;
  // Timeliness peaks on the window's first day and eases after.
  const daysIn = Math.floor((now - start) / 86_400_000);
  const timeliness = Math.max(0.6, 1 - 0.15 * daysIn);
  const evidence = (CERTAINTY[item.certainty] ?? 0.7) * (USER_STATE[String(item.user_state)] ?? 0.85);
  const local = input.local[r.id];
  const freshness = local?.firstShown && local.firstShown !== input.today ? 0.5 : 1;
  const capped = input.primaries.some((p) => p.personId === r.person_id && p.reasonId !== r.id && daysBetween(p.day, input.today) < 7);
  return capped ? 0 : Number(r.score) * timeliness * evidence * freshness;
}

export function buildToday(input: TodayInput): TodayView {
  const { now, today } = input;
  const people = new Map(input.people.map((p) => [p.id, p]));
  const items = new Map(input.items.map((m) => [m.id, m]));
  const live = (m: MemoryItem | undefined): m is MemoryItem =>
    !!m && m.status === "active" && !m.deleted_at && m.sensitivity === "none";
  const activePerson = (id: string) => {
    const p = people.get(id);
    return p && p.state === "active" && !p.deleted_at ? p : null;
  };

  const view: TodayView = {
    dateLabel: `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`,
    greeting: now.getHours() < 12 ? "Good morning." : now.getHours() < 18 ? "Good afternoon." : "Good evening.",
    returnCheck: null,
    moment: null,
    quiet: [],
    quietDay: false,
  };

  // The return check: 10 minutes to 12 hours after a hand-off Kinship opened.
  const h = input.handoff;
  if (h && !h.answered) {
    const since = now.getTime() - Date.parse(h.at);
    const p = activePerson(h.personId);
    if (p && since >= RETURN_MIN_MS && since <= RETURN_MAX_MS) {
      view.returnCheck = { personId: p.id, personName: firstName(p), reasonId: h.reasonId, channel: h.channel };
    }
  }

  // The one moment.
  let best: { r: ReasonRow; item: MemoryItem; score: number } | null = null;
  for (const r of input.reasons) {
    if (r.deleted_at || !["candidate", "scheduled", "surfaced"].includes(r.state)) continue;
    if (r.type !== "upcoming_event" && r.type !== "event_followup") continue;
    const local = input.local[r.id];
    if (local?.acted || local?.dismissed || local?.done) continue;
    const itemId = evidenceOf(r);
    const item = itemId ? items.get(itemId) : undefined;
    if (!live(item) || item.person_id !== r.person_id || !activePerson(r.person_id) || !eventDay(item)) continue;
    const score = scoreOf(r, item, input);
    if (score >= THRESHOLD && (!best || score > best.score || (score === best.score && r.id < best.r.id))) {
      best = { r, item, score };
    }
  }
  if (best) {
    const p = activePerson(best.r.person_id) as Person;
    const name = firstName(p);
    const day = eventDay(best.item) as string;
    const type = best.r.type as ReasonType;
    const when = whenLabel(best.item.kind, (best.item.detail ?? {}) as Record<string, unknown>, today) ?? dayLabel(day, today);
    const mention = input.items
      .filter((m) => m.id !== best!.item.id && m.person_id === p.id && live(m) && ["fact", "thread", "event", "plan", "moment"].includes(m.kind))
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .slice(0, 2)
      .map((m) => m.statement);
    view.moment = {
      reasonId: best.r.id,
      type,
      personId: p.id,
      personName: name,
      itemId: best.item.id,
      statement: type === "event_followup" ? `How did it go for ${name}?` : best.item.statement,
      context: type === "event_followup" ? `${best.item.statement} · ${when}` : `${relativeDay(day, today)} · ${when}`,
      provenance: input.provenance(best.item.id)?.line ?? null,
      noteId: input.provenance(best.item.id)?.noteId ?? null,
      score: best.score,
      primary: type === "event_followup"
        ? { label: "Ask how it went", hint: `Opens a conversation with ${name}` }
        : { label: `Message ${name}`, hint: `Opens a conversation with ${name}` },
      heading: type === "event_followup" ? `Ask ${name} how it went` : `Message ${name}`,
      mention,
    };
  }

  // At most two quiet lines, from different people than the moment.
  if (input.questions > 0) {
    view.quiet.push({
      kind: "question", label: "A question",
      text: input.questions === 1 ? "About something you told me" : `About ${input.questions} things you told me`,
      action: "Answer",
    });
  } else if (input.toLookAt > 0) {
    view.quiet.push({
      kind: "look", label: "Kept",
      text: input.toLookAt === 1 ? "Something you told me, to look over" : `${input.toLookAt} things you told me, to look over`,
      action: "Look",
    });
  }
  const seen = new Set<string>(view.moment ? [view.moment.personId] : []);
  const coming = input.items
    .filter((m) => live(m) && (m.kind === "event" || m.kind === "plan") && m.id !== view.moment?.itemId && activePerson(m.person_id))
    .map((m) => ({ m, day: eventDay(m) }))
    .filter((x): x is { m: MemoryItem; day: string } => !!x.day && daysBetween(today, x.day) >= 1 && daysBetween(today, x.day) <= 7)
    .sort((a, b) => a.day.localeCompare(b.day) || a.m.id.localeCompare(b.m.id));
  for (const { m, day } of coming) {
    if (view.quiet.length >= 2) break;
    if (seen.has(m.person_id)) continue;
    seen.add(m.person_id);
    view.quiet.push({ kind: "coming", label: relativeDay(day, today), text: m.statement, personId: m.person_id, itemId: m.id });
  }

  view.quietDay = !view.moment && !view.returnCheck;
  return view;
}

/** The day a moment counts as shown (for freshness and the person cap). */
export function shownDay(now: Date): string {
  return isoDay(now);
}
