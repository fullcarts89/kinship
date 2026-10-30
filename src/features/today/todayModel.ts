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

import { mentionsFor, type Mentions } from "./mentions";
import { aboutAnimalHealth, wordingSensitivities } from "../../../supabase/functions/_shared/extraction/lexicon";
import { shortName } from "../../../supabase/functions/_shared/extraction/names";
import { dayLabel, whenLabel } from "@/features/memory/format";
import { nextBirthday } from "@/features/setup/setupModel";
import { firmEnough, MILESTONE_DAYS_BEFORE, MILESTONE_WEIGHT, milestoneOf, type MilestoneType } from "./milestones";
import type { MemoryItem, Person } from "@/store/repositories";

export type ReasonType = "upcoming_event" | "event_followup" | "birthday" | "good_news" | "starts_today"
  /** An engagement, a wedding, a new job… a few days before, through the day (founder H16). */
  | "milestone"
  /** Reached from a Coming up line or a "Waiting on …" line through its detail (founder I1). */
  | "coming" | "waiting"
  /** The user's own promise, on its day (RSN-06, FD-30e): "You said you'd bring Sam soup." */
  | "promise"
  /** An open thread, once, after its own day or a quiet while (RSN-07, FD-30e): "Did Felix decide?" */
  | "thread";

/** A birthday's moment id: one per person per birthday (never a server reason row). */
export function birthdayReasonId(personId: string, day: string): string {
  return `birthday:${personId}:${day}`;
}

export function isBirthdayReason(id: string): boolean {
  return id.startsWith("birthday:");
}

/**
 * A moment worked out on this phone from what the user told Kinship (a
 * birthday, good news, a first day), never a server reason row: nothing to
 * record on the server for it.
 */
export function isLocalReason(id: string): boolean {
  return /^(birthday|news|starts|milestone|coming|waiting|page|promise|thread):/.test(id);
}

// ─── Promise and open-thread reasons (RSN-06, RSN-07; CC-25 "Commit next", authorised by FD-30e) ───
//
// Memory-native reasons: a calendar can bring back a birthday; only Kinship
// can bring back what the user said they'd do, or a question still open in
// someone's life. Deterministic, from the user's own lines, on the phone.
// The guilt firewall holds: no "still haven't", no overdue state, no count
// of days, no daily nagging; each speaks on one day, a promise once more a
// few days later if it is still open, and "Not now" puts it aside for good.

/** A promise's weight: below an event's follow-up, a birthday and a milestone, above good news. */
export const PROMISE_WEIGHT = 74;
/** A promise still open speaks once more, somewhere in these days after its day (never daily, never before). */
export const PROMISE_AGAIN_DAYS: readonly [number, number] = [3, 5];
/** A thread's weight: a check-in, below a promise. */
export const THREAD_WEIGHT = 65;
/**
 * An undated thread is worth one check-in this long after it was told (the pipeline's
 * THREAD_FOLLOWUP_DAYS, carried on the line as followup_after_days; this is its fallback).
 */
export const THREAD_FOLLOWUP_DAYS = 42;
/** How many days a thread's one window stays open (from the day after its day, or from the quiet period's end). */
export const THREAD_WINDOW_DAYS = 3;
/** Words that say a thread is a decision still open: "Did Felix decide?" rather than "Any news from Felix?" */
const DECIDING = /\b(?:consider\w*|decid\w*|whether|thinking (?:about|of)|weigh\w*|debat\w*|torn|undecided|mulling|wondering|might|may|not sure)\b/iu;

/** A promise's moment id on its day, and the one for its second window. */
export function promiseReasonId(itemId: string, due: string, again = false): string {
  return `promise:${itemId}:${due}${again ? ":again" : ""}`;
}

/** A thread's one check-in: keyed to the thread's own day, else the day it was told. */
export function threadReasonId(itemId: string, day: string): string {
  return `thread:${itemId}:${day}`;
}

function toldDayOf(m: MemoryItem): string | null {
  const c = String(m.created_at ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/u.test(c) ? c : null;
}

/**
 * RSN-07: the one window in which an open thread may ask for a check-in. A thread with its own day
 * ("Mina has a job interview next Wednesday") the day after, for THREAD_WINDOW_DAYS; with no date at
 * all, THREAD_FOLLOWUP_DAYS after it was told, for the same few days. A month or a season is neither:
 * it is remembered quietly, like a milestone without a day. Null outside the window. `day` is what the
 * detail says it from (the thread's day, or the day it was told: `told`).
 */
export function threadWindow(m: MemoryItem, today: string): { day: string; told: boolean } | null {
  const d = (m.detail ?? {}) as Record<string, unknown>;
  const exact = eventDay(m);
  if (exact) {
    const n = daysBetween(exact, today);
    return n >= 1 && n <= THREAD_WINDOW_DAYS ? { day: exact, told: false } : null;
  }
  if (typeof d.date === "string" && d.date) return null;
  const told = toldDayOf(m);
  if (!told) return null;
  const after = Number.isFinite(Number(d.followup_after_days)) && Number(d.followup_after_days) > 0 ? Number(d.followup_after_days) : THREAD_FOLLOWUP_DAYS;
  const n = daysBetween(told, today) - after;
  return n >= 0 && n < THREAD_WINDOW_DAYS ? { day: told, told: true } : null;
}

/** The thread's check-in, in a fixed template: a decision still open, or any news. */
export function threadAsk(name: string, statement: string): string {
  return DECIDING.test(statement) ? `Did ${name} decide?` : `Any news from ${name}?`;
}

function lowerFirst(s: string): string {
  return s.replace(/[.!]+$/u, "").replace(/^\p{Lu}/u, (c) => c.toLocaleLowerCase());
}

/** "You said you'd bring Sam soup." from the line as the page shows it ("Bring Sam soup"). */
export function promiseStatement(statement: string): string {
  const s = statement.trim().replace(/[.!]+$/u, "");
  return /^You\b/u.test(s) ? `${s}.` : `You said you'd ${lowerFirst(s)}.`;
}

/** The return question a promise carries: "Did you bring Sam soup?" (never a bare "Did you reach Sam?" when the words allow). */
export function promiseAsk(name: string, statement: string): string {
  const s = statement.trim().replace(/[.!]+$/u, "");
  return /^You\b/u.test(s) ? `Did you reach ${name}?` : `Did you ${lowerFirst(s)}?`;
}

/**
 * A conversation the user opened from someone's page with nothing to act on
 * (founder K28, 17 Oct): not a reason, not a Moment. Only the return check
 * is carried ("Did you reach Susan?" and, after a Yes, "Anything worth
 * remembering…"); a Yes records the conversation in the user's own word, with
 * no reason, Moment kind or memory attached, and nothing is said to the server.
 */
export function isPageHandoff(id: string): boolean {
  return /^page:/.test(id);
}

export function pageHandoffId(personId: string): string {
  return `page:${personId}`;
}

/** Good news, recent (stabilization Gate G): "Ben was promoted yesterday." */
export const GOOD_NEWS_WEIGHT = 75;
/** A first day, on the day: "Amanda starts her new job today." */
export const STARTS_TODAY_WEIGHT = 70;
/** How long good news stays worth a congratulation. */
const GOOD_NEWS_DAYS = 2;
const GOOD_NEWS = /\b(?:was |got |been |is |has been )?promoted\b|\bpromotion\b|\bgot (?:the|a|an|her|his|their)\s+(?:\S+\s+){0,2}?(?:job|offer|role|position|place)\b|\bgot (?:engaged|married|in|into|accepted|hired)\b|\b(?:was|were) (?:accepted|hired)\b|\bgraduated\b|\bhad (?:a|the|her|his|their) baby\b|\bis engaged\b|\bpassed (?:the|her|his|their)\b|\bbought (?:a|their|his|her) (?:house|home|place)\b|\bclosed on\b|\bfinished (?:the|her|his|their) (?:marathon|race|degree|thesis)\b/iu;
const NOT = /\b(not|didn['’]?t|did not|never|no longer|wasn['’]?t|isn['’]?t)\b/iu;
/** Firsts that matter on the day itself (the server's follow-up comes after). */
const STARTS = ["job_start", "school_start"];

/** Birthday weight (plan §13). */
const BIRTHDAY_WEIGHT = 80;

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
  /** "Not yet" to the return check: it may speak again, whatever the server last said (founder N6). */
  notYet?: string;
}

/** What the user initiated from a suggestion line (SUA-1, FD-30d): a closed kind, never words. */
export type GestureKind = "plan" | "help" | "company" | "note" | "activity";

export interface Handoff {
  reasonId: string;
  personId: string;
  channel: "text" | "call" | "facetime" | "whatsapp" | "email";
  at: string;
  /** "put_aside": "Didn't happen" on a promise's return check: nothing recorded, the promise put aside without judgement. */
  answered?: "yes" | "not_yet" | "put_aside";
  /** The hand-off followed a tap on a "You could…" line (SUA-1): what Kinship suggested, kept apart from what the user confirms. */
  gesture?: GestureKind;
  /** Why Kinship opened it, carried to the return (H18): "Did you congratulate Ben on the promotion?" */
  ask?: string;
  /** The memory it was about, in the user's words: "Ben got promoted". */
  about?: string | null;
  /** After a yes: "Anything worth remembering from congratulating Ben?"; "" when nothing is worth asking (a promise's logistics). */
  followUp?: string;
  /** Which kind of Moment it came from, and the memory it was about: what a Yes records (founder I2). "page": none (K28). */
  type?: ReasonType | "page";
  itemId?: string | null;
}

/** A conversation the user confirmed (contact_events), as Today needs it (founder K3). */
export interface ContactRow {
  person_id: string;
  memory_item_id?: string | null;
  occurred_at: string;
  deleted_at?: string | null;
}

/** The local reason a "Waiting on …" line hands off with (also its detail's key). */
export function waitingReasonId(itemId: string, day: string): string {
  return `waiting:${itemId}:${day}`;
}

/** The local reason a Coming up line hands off with (also its detail's key, and a person page's hand-off about it). */
export function comingReasonId(itemId: string, day: string): string {
  return `coming:${itemId}:${day}`;
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
  /** How many notes the user has ever told Kinship (kept for the lab and older callers). */
  told: number;
  /**
   * Whether the account is activated: its first Tell became memory
   * (src/features/setup/activation.ts). Until then Today keeps its first-use
   * guidance, however many people or notes the account has (recovery Gate 3).
   * When absent, first use falls back to "nothing told yet".
   */
  activated?: boolean;
  /** The user's first name, when Kinship knows it: "Good morning, Thor." */
  firstName?: string | null;
  /**
   * Whether this phone knows the account's data yet (its first sync is
   * done, or the account's own record says it's new). Until then Today
   * decides nothing about first use or a quiet day (founder H9). Default true.
   */
  dataKnown?: boolean;
  /** Notes waiting on the user (D1): a question, or understood while away. */
  questions: number;
  toLookAt: number;
  /**
   * Every note still open, as words (stabilization Gate A): each question
   * waiting on the user, and anything still being understood. When given,
   * Today names them instead of counting them.
   */
  pending?: { captureId: string; kind: "understanding" | "question"; label: string; text: string; action: string | null }[];
  /** "You told Kinship · Oct 8" for an item, and the note it came from. */
  provenance: (itemId: string) => { line: string; noteId: string | null } | null;
  /** The note's own words behind an item (its sources' quotes): what a milestone is read from (H16). */
  quotes?: (itemId: string) => string[];
  /** Conversations the user confirmed (founder K3: a "Waiting on …" they already acted on doesn't keep asking). */
  contacts?: ContactRow[];
  /**
   * When the first Tell became memory, and whether the user has since seen how Kinship brings things back
   * (founder H4): Today shows it once, right after.
   */
  bringBack?: { activatedAt: string | null; seen: boolean };
}

/**
 * How Kinship brings things back, shown once after the first Tell (founder H4): with the user's own first
 * Tell when it has a day still to come, else the one grounded example ("See how it works"'s Ben).
 */
export type BringBackView =
  | { kind: "own"; personId: string; personName: string; statement: string; day: string; when: string }
  | { kind: "example" };

export interface MomentView {
  reasonId: string;
  type: ReasonType;
  personId: string;
  personName: string;
  /** The memory it cites; null for a birthday from the person's record. */
  itemId: string | null;
  /** The memory itself, in the user's words as kept (the follow-up's heading asks about it); null for a birthday. */
  memory: string | null;
  /** The day it's about (the event, the news, the birthday): what the detail's timing is said from. */
  day: string | null;
  /** The day is only when the user told Kinship (news with no date of its own). */
  toldDay?: boolean;
  statement: string;
  context: string;
  provenance: string | null;
  /** The note it came from (one tap on the provenance opens it). */
  noteId: string | null;
  score: number;
  primary: { label: string; hint: string };
  /** The hand-off sheet's heading. */
  heading: string;
  /** Other things the user told Kinship about them, for "You could mention" (K26: mentions.ts). */
  mention: string[];
  /** One suggested question under the first of them, or none (K26). */
  opener: string | null;
  /** The return question, with its reason (H10, H18). */
  ask: string;
  /** After a yes, the same reason: "Anything worth remembering from congratulating Ben?" */
  followUp: string;
  /**
   * What they were hoping for, kept with the event itself (its event_goal,
   * in the note's words): "Ben was hoping to break four hours." Showing up
   * means knowing what mattered to them about it, not only that it happened.
   */
  hope?: string | null;
}

export type QuietView =
  | { kind: "question"; label: string; text: string; action: string; captureId?: string }
  /** Someone's promise to the user, a few days past its day: "Did Tyler send it?" */
  | { kind: "waiting"; label: string; text: string; personId: string; itemId: string; memory: string; day: string; provenance: string | null; noteId: string | null }
  | { kind: "understanding"; label: string; text: string; captureId: string }
  | { kind: "look"; label: string; text: string; action: string }
  | {
      kind: "coming"; label: string; text: string; personId: string; itemId: string | null;
      /** Its day; whether it's the user's own promise falling due; what they're hoping for; where it came from (founder I1). */
      day: string; due: boolean; hope: string | null; provenance: string | null; noteId: string | null;
    }
  /** "and 2 more": the rest of the next seven days, folded, never dropped (H27). */
  | { kind: "more"; label: string; text: string; rest: QuietView[] };

export interface ReturnView {
  personId: string;
  personName: string;
  reasonId: string;
  channel: Handoff["channel"];
  /** Which kind of Moment the hand-off came from: a promise's return check also offers "Didn't happen". */
  type?: ReasonType | "page";
  /** The suggestion the hand-off followed, if any (SUA-1): after a Yes, one optional content-free question. */
  gesture?: GestureKind;
  /** "Did you congratulate Ben on the promotion?": the reason, never a bare "Did you reach Ben?" (H18). */
  ask: string;
  /** What it was about: "Ben got promoted". */
  about: string | null;
  followUp: string;
}

export interface TodayView {
  dateLabel: string;
  greeting: string;
  returnCheck: ReturnView | null;
  moment: MomentView | null;
  quiet: QuietView[];
  /** "Nothing needs you today." Only for an account already in use (contract §8). */
  quietDay: boolean;
  /**
   * Kinship is waiting on the user (a question), and there's no moment:
   * the headline says so instead of "Nothing needs you today" (Gate G).
   * Headline priority: moment → waiting on the user → first use → quiet day.
   */
  waiting: "one" | "some" | null;
  /**
   * First use: setup is done but nothing has been told yet (or there is no
   * one here). Today explains what it is for and offers the next step,
   * instead of a quiet day.
   */
  firstUse: { hasPeople: boolean } | null;
  /** The account's data hasn't reached this phone yet: Today shows its paper, never a guess (H9). */
  unknown?: boolean;
  /** How Kinship brings things back, once, after the first Tell (founder H4). */
  bringBack?: BringBackView | null;
}

/** How long after the first Tell Today may still show how Kinship brings things back (H4). */
const BRING_BACK_DAYS = 3;
/** The first Tell's own lines: kept within this long of the moment it became memory. */
const FIRST_TELL_MS = 30 * 60 * 1000;

export const THRESHOLD = 55;
/** Coming up lines shown before the rest fold into "and N more". */
const COMING_SHOWN = 3;
/**
 * The return question is there as soon as the user is back from the
 * conversation Kinship opened (H10), and waits up to three days for an
 * answer; opening an app is never taken as having reached someone.
 */
const RETURN_MAX_MS = 72 * 60 * 60 * 1000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Kinship's one way to write a date ("Fri, Oct 16"): Today's header says the weekday whole, "Wednesday, Oct 14" (founder K19). */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

export function daysBetween(a: string, b: string): number {
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

/** How Today says their name: a first name from Contacts, a chosen name whole (founder I12). */
function firstName(p: Person): string {
  return shortName(p) || p.display_name;
}

function eventDay(item: MemoryItem): string | null {
  const d = (item.detail ?? {}) as Record<string, unknown>;
  const day = d.date;
  const precision = typeof d.date_precision === "string" ? d.date_precision : "day";
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && precision === "day" ? day : null;
}

function dueDay(item: MemoryItem): string | null {
  const due = (item.detail as Record<string, unknown>)?.due_date;
  return typeof due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null;
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

/** "Ben was hoping to break four hours." from the event's own goal; null when there isn't one to say plainly. */
export function hopeLine(name: string, detail: Record<string, unknown>, type: ReasonType | "birthday"): string | null {
  const raw = typeof detail.event_goal === "string" ? detail.event_goal.trim() : "";
  const goal = raw.replace(/^to\s+/iu, "").replace(/[.!]+$/u, "");
  if (!goal || goal.length > 80 || !/^\p{Ll}/u.test(goal)) return null;
  return type === "event_followup" ? `${name} was hoping to ${goal}.` : `${name} is hoping to ${goal}.`;
}

/** "Good morning." or, when Kinship knows their name, "Good morning, Thor." */
export function greetingFor(now: Date, firstName: string | null): string {
  const part = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  return firstName ? `${part}, ${firstName}.` : `${part}.`;
}

export function buildToday(input: TodayInput): TodayView {
  const { now, today } = input;
  const people = new Map(input.people.map((p) => [p.id, p]));
  const items = new Map(input.items.map((m) => [m.id, m]));
  // Nothing sensitive speaks on Today, except a pet's vet visit or health,
  // which is not a person's health (founder J9; the pipeline has kept those
  // as not sensitive since G43, and older lines may still say "health").
  const live = (m: MemoryItem | undefined): m is MemoryItem =>
    !!m && m.status === "active" && !m.deleted_at &&
    (m.sensitivity === "none" || (m.sensitivity === "health" && aboutAnimalHealth(m.statement)));
  const activePerson = (id: string) => {
    const p = people.get(id);
    return p && p.state === "active" && !p.deleted_at ? p : null;
  };

  const view: TodayView = {
    dateLabel: `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`,
    greeting: greetingFor(now, input.firstName ?? null),
    returnCheck: null,
    moment: null,
    quiet: [],
    quietDay: false,
    waiting: null,
    firstUse: null,
  };

  // The return check: from the moment the user is back, until answered (up to three days).
  view.returnCheck = returnViewFor(input.handoff, input.handoff ? activePerson(input.handoff.personId) : null, now);

  // The one moment.
  let best: { r: ReasonRow; item: MemoryItem; score: number } | null = null;
  for (const r of input.reasons) {
    const local = input.local[r.id];
    // "Not yet" on this device: the server's "acted" from the hand-off doesn't
    // silence it, whether or not the server has heard the answer (founder N6).
    const open = ["candidate", "scheduled", "surfaced"].includes(r.state) || (r.state === "acted" && !!local?.notYet);
    if (r.deleted_at || !open) continue;
    if (r.type !== "upcoming_event" && r.type !== "event_followup") continue;
    if (local?.acted || local?.dismissed || local?.done) continue;
    const itemId = evidenceOf(r);
    const item = itemId ? items.get(itemId) : undefined;
    if (!live(item) || item.person_id !== r.person_id || !activePerson(r.person_id) || !eventDay(item)) continue;
    const score = scoreOf(r, item, input);
    if (score >= THRESHOLD && (!best || score > best.score || (score === best.score && r.id < best.r.id))) {
      best = { r, item, score };
    }
  }
  // Birthdays, from the person's own record (Contacts, a note, or the user's edit).
  let birthday: { p: Person; day: string; score: number } | null = null;
  for (const p of input.people) {
    if (!activePerson(p.id) || !p.birthday || !p.birthday_source) continue;
    const day = nextBirthday(String(p.birthday), today);
    if (day !== today) continue;
    const id = birthdayReasonId(p.id, day);
    const local = input.local[id];
    if (local?.acted || local?.dismissed || local?.done) continue;
    const capped = input.primaries.some((x) => x.personId === p.id && x.reasonId !== id && daysBetween(x.day, today) < 7);
    const score = capped ? 0 : BIRTHDAY_WEIGHT * (local?.firstShown && local.firstShown !== today ? 0.5 : 1);
    if (score >= THRESHOLD && (!birthday || score > birthday.score)) birthday = { p, day, score };
  }
  // Good news and first days, from what the user told (Gate G): recent good
  // news is worth a congratulation; a first day is worth a word on the day.
  // Deterministic: the person's own news (never a relative's), in their words.
  // Milestones (founder H16): an engagement, a wedding, a new job… named
  // outright in the user's own words, with a day of its own, from three days
  // before through the day. Never from a hedge, never a relative's, and a
  // month, a year or no date is remembered quietly: nothing asks for one.
  // Promises (RSN-06): the user's own, with a day, on that day and once more a few days later if still
  // open; undated, never (it stays "You said you'd" on the page). Threads (RSN-07): one check-in the day
  // after the thread's own day, or a quiet while after it was told; never a sensitive one (hard times
  // are RSN-09), never a relative's.
  type LocalType = "good_news" | "starts_today" | "milestone" | "promise" | "thread";
  let local: { item: MemoryItem; day: string; type: LocalType; score: number; milestone?: MilestoneType; again?: boolean; told?: boolean } | null = null;
  for (const m of input.items) {
    if (!live(m) || !activePerson(m.person_id)) continue;
    const subject = m.subject_type;
    if (m.kind === "promise" ? subject !== "user" : subject !== undefined && subject !== "person" && subject !== "shared") continue;
    let type: LocalType | null = null;
    let day: string | null = null;
    let milestone: MilestoneType | null = null;
    let again = false;
    let told = false;
    const detail = (m.detail ?? {}) as Record<string, unknown>;
    const exact = eventDay(m);
    if (m.kind === "promise") {
      const due = dueDay(m);
      const n = due ? daysBetween(due, today) : null;
      // Reached about it since its day, on any phone (a confirmed conversation): it has been seen to.
      const reachedSince = !!due && (input.contacts ?? []).some((c) => !c.deleted_at && c.memory_item_id === m.id && c.person_id === m.person_id &&
        typeof c.occurred_at === "string" && daysBetween(due, isoDay(new Date(c.occurred_at))) >= 0);
      if (reachedSince) continue;
      if (due && n === 0) {
        type = "promise";
        day = due;
      } else if (due && n !== null && n >= PROMISE_AGAIN_DAYS[0] && n <= PROMISE_AGAIN_DAYS[1]) {
        type = "promise";
        day = due;
        again = true;
      }
    } else if (m.kind === "thread") {
      const w = wordingSensitivities(m.statement).length ? null : threadWindow(m, today);
      if (w) {
        type = "thread";
        day = w.day;
        told = w.told;
      }
    } else if (m.kind === "event" && STARTS.includes(String(detail.event_type)) && exact === today) {
      type = "starts_today";
      day = today;
    } else if (exact && daysBetween(today, exact) >= 0 && daysBetween(today, exact) <= MILESTONE_DAYS_BEFORE && firmEnough(m) &&
      ["event", "plan", "milestone", "fact"].includes(m.kind) && (milestone = milestoneOf(m, input.quotes?.(m.id) ?? []))) {
      type = "milestone";
      day = exact;
    } else if (["fact", "milestone", "event", "moment"].includes(m.kind) && GOOD_NEWS.test(m.statement) && !NOT.test(m.statement)) {
      // N7: the day the note gave it, to the day; the day it was told only
      // when the note gave no date at all ("promoted in 2024" is old news).
      day = exact ?? (typeof detail.date === "string" ? null : String(m.created_at ?? "").slice(0, 10) || null);
      if (day && daysBetween(day, today) >= 0 && daysBetween(day, today) <= GOOD_NEWS_DAYS) type = "good_news";
    }
    if (!type || !day) continue;
    const id = localReasonId(type, m.id, day, again);
    const lr = input.local[id];
    if (lr?.acted || lr?.dismissed || lr?.done) continue;
    // A promise put aside, kept, or already answered on its day never comes back a few days later.
    const first = again ? input.local[promiseReasonId(m.id, day)] : undefined;
    if (first?.dismissed || first?.done) continue;
    // One primary per person per week; a promise's second window is the same reason, not another.
    const capped = input.primaries.some((x) => x.personId === m.person_id && x.reasonId !== id &&
      !(again && x.reasonId === promiseReasonId(m.id, day)) && daysBetween(x.day, today) < 7);
    const weight = LOCAL_WEIGHT[type];
    const score = capped ? 0 : weight * (lr?.firstShown && lr.firstShown !== today ? 0.5 : 1);
    if (score >= THRESHOLD && (!local || score > local.score)) local = { item: m, day, type, score, again, told, ...(milestone ? { milestone } : {}) };
  }

  const bestScore = Math.max(best?.score ?? 0, birthday?.score ?? 0);
  if (local && local.score > bestScore) {
    const p = activePerson(local.item.person_id) as Person;
    const name = firstName(p);
    const id = localReasonId(local.type, local.item.id, local.day, local.again);
    const copy = localCopy(local.type, name, local.item, local.day, today, local.told ?? false);
    view.moment = {
      reasonId: id,
      type: local.type,
      personId: p.id,
      personName: name,
      itemId: local.item.id,
      memory: local.item.statement,
      day: local.day,
      toldDay: (local.type === "good_news" && !eventDay(local.item)) || (local.type === "thread" && !!local.told),
      statement: copy.statement,
      context: copy.context,
      provenance: input.provenance(local.item.id)?.line ?? null,
      noteId: input.provenance(local.item.id)?.noteId ?? null,
      score: local.score,
      primary: { label: copy.primary, hint: `Opens a conversation with ${name}` },
      heading: copy.heading,
      // What to mention (K26): about the promise or thread first, then what is going on with them.
      ...(local.type === "promise" || local.type === "thread"
        ? mentionView(mentionsFor({ items: input.items, person: p, today, about: local.item }))
        : { mention: [], opener: null }),
      ...(local.type === "milestone" && local.milestone ? milestoneReturn(local.milestone, name) : returnCopy(local.type, name, local.item.statement)),
    };
  } else if (birthday && (!best || birthday.score > best.score)) {
    const name = firstName(birthday.p);
    const source = birthday.p.birthday_source;
    view.moment = {
      reasonId: birthdayReasonId(birthday.p.id, birthday.day),
      type: "birthday",
      personId: birthday.p.id,
      personName: name,
      itemId: null,
      memory: null,
      day: birthday.day,
      statement: `It's ${name}'s birthday.`,
      context: "",
      provenance: birthdayProvenance(source),
      noteId: source === "capture" && typeof birthday.p.birthday_capture_id === "string" ? birthday.p.birthday_capture_id : null,
      score: birthday.score,
      primary: { label: `Message ${name}`, hint: `Opens a conversation with ${name}` },
      heading: `Wish ${name} a happy birthday`,
      ...returnCopy("birthday", name, null),
      ...mentionView(mentionsFor({ items: input.items, person: birthday.p, today })),
    };
  } else if (best) {
    const p = activePerson(best.r.person_id) as Person;
    const name = firstName(p);
    const day = eventDay(best.item) as string;
    const type = best.r.type as ReasonType;
    const when = whenLabel(best.item.kind, (best.item.detail ?? {}) as Record<string, unknown>, today) ?? dayLabel(day, today);
    // What to mention (K26): about the Moment's own subject first, then what is going on with them.
    const mention = mentionView(mentionsFor({ items: input.items, person: p, today, about: best.item }));
    view.moment = {
      reasonId: best.r.id,
      type,
      personId: p.id,
      personName: name,
      itemId: best.item.id,
      memory: best.item.statement,
      day,
      statement: type === "event_followup" ? `How did it go for ${name}?` : best.item.statement,
      context: type === "event_followup" ? `${best.item.statement} · ${when}` : `${relativeDay(day, today)} · ${when}`,
      hope: hopeLine(name, (best.item.detail ?? {}) as Record<string, unknown>, type),
      provenance: input.provenance(best.item.id)?.line ?? null,
      noteId: input.provenance(best.item.id)?.noteId ?? null,
      score: best.score,
      primary: type === "event_followup"
        ? { label: "Ask how it went", hint: `Opens a conversation with ${name}` }
        : { label: `Message ${name}`, hint: `Opens a conversation with ${name}` },
      heading: type === "event_followup" ? `Ask ${name} how it went` : `Message ${name}`,
      ...mention,
      ...returnCopy(type, name, best.item.statement),
    };
  }

  // What's open comes first, by name: each question (a few at most), then
  // anything still being understood. Then at most two quiet lines, from
  // different people than the moment.
  const pending = input.pending;
  const asks = pending?.filter((n) => n.kind === "question") ?? [];
  if (pending) {
    for (const n of asks.slice(0, 3)) {
      view.quiet.push({ kind: "question", label: n.label, text: n.text, action: n.action ?? "Answer", captureId: n.captureId });
    }
    const working = pending.filter((n) => n.kind === "understanding");
    if (working.length) {
      view.quiet.push({
        kind: "understanding", label: working[0].label,
        text: working.length > 1 ? "Notes you told me" : working[0].text, captureId: working[0].captureId,
      });
    }
    if (!asks.length && input.toLookAt > 0) {
      view.quiet.push({
        kind: "look", label: "Kept",
        text: input.toLookAt === 1 ? "Something you told me, to look over" : `${input.toLookAt} things you told me, to look over`,
        action: "Look",
      });
    }
  } else if (input.questions > 0) {
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
  // Someone's promise to the user, a few days past its day: one gentle check (Gate F).
  // Once the user acted on it (handed off, or said they reached them, on any
  // device), it doesn't keep asking (founder K3).
  const reached = (m: MemoryItem, due: string) => (input.contacts ?? []).some((c) =>
    !c.deleted_at && c.memory_item_id === m.id && c.person_id === m.person_id && typeof c.occurred_at === "string" &&
    daysBetween(due, isoDay(new Date(c.occurred_at))) >= 0);
  for (const m of input.items) {
    if (view.quiet.length >= 4) break;
    if (!live(m) || m.kind !== "promise" || m.subject_type !== "person" || !activePerson(m.person_id) || seen.has(m.person_id)) continue;
    const due = (m.detail as Record<string, unknown>)?.due_date;
    if (typeof due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(due) || daysBetween(due, today) < 1 || daysBetween(due, today) > 3) continue;
    const handled = input.local[waitingReasonId(m.id, due)];
    if (handled?.acted || handled?.done || handled?.dismissed || reached(m, due)) continue;
    // A return question about this promise is open (handed off from Coming up, or the Moment): it asks instead.
    if (view.returnCheck && input.handoff?.itemId === m.id) continue;
    const p = activePerson(m.person_id) as Person;
    const verb = m.statement.match(/\b(?:he|she|they)\s*(?:['’]d|would|['’]ll|will)\s+([a-z]+)/iu)?.[1];
    const source = input.provenance(m.id);
    view.quiet.push({
      kind: "waiting", label: `Waiting on ${firstName(p)}`, itemId: m.id, personId: p.id,
      text: verb ? `Did ${firstName(p)} ${verb.toLowerCase()} it?` : `Still waiting on ${firstName(p)}?`,
      memory: m.statement, day: due, provenance: source?.line ?? null, noteId: source?.noteId ?? null,
    });
    seen.add(p.id);
  }
  // Coming up (H26, H27): everything in the next seven days, by date. The
  // user's own dated promises too ("You said you'd send Chris the
  // restaurant"); nothing valid is dropped because something else arrived.
  const soon = (day: string) => daysBetween(today, day) >= 1 && daysBetween(today, day) <= 7;
  const dueSoon = (day: string) => daysBetween(today, day) >= 0 && daysBetween(today, day) <= 7;
  // What the user means to do today is on Today, however it was kept (founder K20): a promise due
  // today, a plan for today, or their own event today ("You're calling John tonight"), never one
  // that already happened. Someone else's event on its day stays the Moment's (it speaks the day
  // before and after). Once the user said Yes, they reached them about it today, it has been done.
  const ownToday = (m: MemoryItem) => m.kind === "plan" ||
    (m.kind === "event" && m.subject_type !== undefined && m.subject_type !== "person" && !(m.detail as Record<string, unknown>)?.happened);
  // A promise kept or put aside from its own Moment today (RSN-06) is not also a Coming up line.
  const promiseSettled = (m: MemoryItem, day: string) => m.kind === "promise" && !!input.local[promiseReasonId(m.id, day)] &&
    (!!input.local[promiseReasonId(m.id, day)].done || !!input.local[promiseReasonId(m.id, day)].dismissed);
  const doneToday = (m: MemoryItem, day: string) => day === today && (!!input.local[comingReasonId(m.id, day)]?.done || promiseSettled(m, day) ||
    (input.contacts ?? []).some((c) => !c.deleted_at && c.memory_item_id === m.id && typeof c.occurred_at === "string" && isoDay(new Date(c.occurred_at)) === today));
  type Coming = {
    personId: string; day: string; text: string; itemId: string | null; key: string;
    due: boolean; hope: string | null; provenance: string | null; noteId: string | null;
  };
  const coming: Coming[] = [
    ...input.items
      .filter((m) => live(m) && (m.kind === "event" || m.kind === "plan" || m.kind === "promise") &&
        m.id !== view.moment?.itemId && activePerson(m.person_id))
      .map((m) => ({ m, day: m.kind === "promise" ? dueDay(m) : eventDay(m) }))
      .filter((x): x is { m: MemoryItem; day: string } => !!x.day && (x.m.kind === "promise" || ownToday(x.m) ? dueSoon(x.day) : soon(x.day)) &&
        !doneToday(x.m, x.day))
      .map(({ m, day }) => {
        const source = input.provenance(m.id);
        return {
          personId: m.person_id, day, text: m.statement, itemId: m.id, key: m.id, due: m.kind === "promise",
          hope: m.kind === "event" ? hopeLine(firstName(activePerson(m.person_id) as Person), (m.detail ?? {}) as Record<string, unknown>, "upcoming_event") : null,
          provenance: source?.line ?? null, noteId: source?.noteId ?? null,
        };
      }),
    ...input.people
      .filter((p) => activePerson(p.id) && p.birthday && p.birthday_source)
      .map((p) => ({ p, day: nextBirthday(String(p.birthday), today) }))
      .filter(({ day }) => soon(day))
      .map(({ p, day }) => ({
        personId: p.id, day, text: `${firstName(p)}'s birthday`, itemId: null, key: `b${p.id}`, due: false, hope: null,
        provenance: birthdayProvenance(p.birthday_source),
        noteId: p.birthday_source === "capture" && typeof p.birthday_capture_id === "string" ? p.birthday_capture_id : null,
      })),
  ].sort((a, b) => a.day.localeCompare(b.day) || a.key.localeCompare(b.key));
  const comingLines: QuietView[] = coming
    .filter((c) => !(view.moment && c.itemId === view.moment.itemId))
    .map((c) => ({
      kind: "coming", label: relativeDay(c.day, today), text: c.text, personId: c.personId, itemId: c.itemId,
      day: c.day, due: c.due, hope: c.hope, provenance: c.provenance, noteId: c.noteId,
    }));
  const shownComing = comingLines.slice(0, COMING_SHOWN);
  view.quiet.push(...shownComing);
  const rest = comingLines.slice(COMING_SHOWN);
  if (rest.length) view.quiet.push({ kind: "more", label: "", text: `and ${rest.length} more`, rest });

  // First use is not a quiet day (contract §8).
  const here = input.people.filter((p) => !p.deleted_at && p.state !== "archived");
  const firstUse = here.length === 0 || !(input.activated ?? input.told > 0);
  const noMoment = !view.moment && !view.returnCheck;
  const asking = pending ? asks.length : input.questions;
  // Never "Nothing needs you today" while Kinship is waiting on the user.
  view.waiting = noMoment && asking > 0 ? (asking === 1 ? "one" : "some") : null;
  // One truth for the whole screen (founder K11): anything on Today (a Moment, the return question, or any
  // line under them: a question, Coming up, Waiting on…, Kept) means it is neither a quiet day nor first use.
  const empty = noMoment && view.quiet.length === 0;
  view.firstUse = firstUse && empty && !view.waiting ? { hasPeople: here.length > 0 } : null;
  view.quietDay = empty && !firstUse && !view.waiting;
  if (input.dataKnown === false) {
    view.firstUse = null;
    view.quietDay = false;
    view.unknown = true;
  }
  view.bringBack = input.dataKnown === false ? null : bringBackFor(input, live, activePerson);
  return view;
}

/**
 * H4: once the first Tell is memory, Today shows once how Kinship brings things back. The user's own first
 * Tell is preferred when one of its lines has a day still to come (the soonest); else the example. Never
 * for an account long in use, and never again after "Got it".
 */
function bringBackFor(input: TodayInput, live: (m: MemoryItem | undefined) => m is MemoryItem, activePerson: (id: string) => Person | null): BringBackView | null {
  const b = input.bringBack;
  if (!b || b.seen || !b.activatedAt) return null;
  const at = Date.parse(b.activatedAt);
  if (!Number.isFinite(at) || input.now.getTime() - at > BRING_BACK_DAYS * 86_400_000) return null;
  const own = input.items
    .filter((m) => live(m) && activePerson(m.person_id) && ["event", "plan", "promise", "milestone"].includes(m.kind) &&
      Math.abs(Date.parse(String(m.created_at ?? "")) - at) <= FIRST_TELL_MS)
    .map((m) => ({ m, day: m.kind === "promise" ? dueDay(m) : eventDay(m) }))
    .filter((x): x is { m: MemoryItem; day: string } => !!x.day && daysBetween(input.today, x.day) >= 0)
    .sort((x, y) => x.day.localeCompare(y.day))[0];
  if (!own) return { kind: "example" };
  const p = activePerson(own.m.person_id) as Person;
  const n = daysBetween(input.today, own.day);
  // When, said loosely: what comes back and exactly when depends on what it is (Coming up before, a
  // follow-up after an event, the day itself for what the user means to do), so never a promised day.
  const when = n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 7 ? `Around ${WEEKDAYS[new Date(Date.UTC(Number(own.day.slice(0, 4)), Number(own.day.slice(5, 7)) - 1, Number(own.day.slice(8, 10)))).getUTCDay()]}` : `Around ${dayLabel(own.day, input.today)}`;
  return { kind: "own", personId: p.id, personName: firstName(p), statement: own.m.statement, day: own.day, when };
}

/**
 * The return question for the last hand-off, wherever it started (Today, a Moment's detail, or the person's
 * page; founder K23): from the moment the user is back until answered, up to three days. Null for someone
 * no longer active.
 */
export function returnViewFor(h: Handoff | null, p: Person | null, now: Date): ReturnView | null {
  if (!h || h.answered || !p || p.state !== "active" || p.deleted_at) return null;
  // A hand-off stamped after this view's clock was read (Message tapped since Today last recomputed) is one
  // just made: asked at once, never held until the clock's next minute (founder K13: up to a minute's wait).
  const since = Math.max(0, now.getTime() - Date.parse(h.at));
  if (!(since <= RETURN_MAX_MS)) return null;
  const name = firstName(p);
  return {
    personId: p.id, personName: name, reasonId: h.reasonId, channel: h.channel,
    ...(h.type ? { type: h.type } : {}),
    ...(h.gesture ? { gesture: h.gesture } : {}),
    ask: h.ask ?? `Did you reach ${name}?`,
    about: h.about ?? null,
    followUp: h.followUp ?? `Anything worth remembering from talking with ${name}?`,
  };
}

/** What a hand-off from someone's page carries into its return check (K23 with something to act on; K28 without). */
export type PageHandoffReason =
  | { id: string; type: ReasonType; ask: string; about: string; followUp: string; itemId: string }
  | { id: string; type: "page"; ask: string; followUp: string };

/**
 * What a Message or Call from a person's page is about (founder K23): what the user means to do with them
 * today (Today's line), else the open "You said you'd" nearest its day. It gets the same return question,
 * and the same Yes / Not yet, as Today's line about it. Null when there's nothing to act on: opening a
 * conversation is never taken as a reason (K28 then carries the return check alone: pageHandoffFor).
 */
export function pageReasonFor(items: MemoryItem[], person: Person, today: string): Extract<PageHandoffReason, { type: ReasonType }> | null {
  const live = (m: MemoryItem) => m.person_id === person.id && m.status === "active" && !m.deleted_at && m.sensitivity === "none";
  const own = (m: MemoryItem) => (m.kind === "promise" && m.subject_type === "user") || m.kind === "plan" ||
    (m.kind === "event" && m.subject_type !== undefined && m.subject_type !== "person");
  const dayOf = (m: MemoryItem) => (m.kind === "promise" ? dueDay(m) : eventDay(m));
  const open = items.filter((m) => live(m) && own(m));
  const todays = open.filter((m) => dayOf(m) === today);
  const said = open.filter((m) => m.kind === "promise")
    .sort((a, b) => {
      const da = dayOf(a);
      const db = dayOf(b);
      if (da && db) return Math.abs(daysBetween(today, da)) - Math.abs(daysBetween(today, db)) || da.localeCompare(db);
      if (da || db) return da ? -1 : 1;
      return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    });
  const m = todays[0] ?? said[0];
  if (!m) return null;
  const name = firstName(person);
  // A promise due today is Today's own Moment (RSN-06): the page's hand-off carries that reason, so a Yes
  // keeps the promise and settles Today's line too.
  if (m.kind === "promise" && dayOf(m) === today) {
    return { id: promiseReasonId(m.id, today), type: "promise", ask: promiseAsk(name, m.statement), about: m.statement, followUp: "", itemId: m.id };
  }
  return {
    id: comingReasonId(m.id, dayOf(m) ?? today), type: "coming", ask: `Did you reach ${name}?`, about: m.statement,
    // A promise's logistics: nothing more to ask after a Yes (founder I2), as Today's own line about it.
    followUp: m.kind === "promise" ? "" : `Anything worth remembering from talking with ${name}?`, itemId: m.id,
  };
}

/**
 * A hand-off from someone's page (founder K28, 17 Oct): the actionable reason when there is one (K23), else
 * the page's own return check, with nothing attached. Only for someone active: Kinship never asks about
 * someone remembered or paused (D13), and never about someone removed.
 */
export function pageHandoffFor(items: MemoryItem[], person: Person, today: string): PageHandoffReason | null {
  if (person.state !== "active" || person.deleted_at) return null;
  const actionable = pageReasonFor(items, person, today);
  if (actionable) return actionable;
  const name = firstName(person);
  return { id: pageHandoffId(person.id), type: "page", ask: `Did you reach ${name}?`, followUp: `Anything worth remembering from talking with ${name}?` };
}

const LOCAL_WEIGHT = {
  good_news: GOOD_NEWS_WEIGHT, starts_today: STARTS_TODAY_WEIGHT, milestone: MILESTONE_WEIGHT, promise: PROMISE_WEIGHT, thread: THREAD_WEIGHT,
} as const;

/** A moment worked out on this phone: its id, one per item and day (a promise's second window apart). */
function localReasonId(type: keyof typeof LOCAL_WEIGHT, itemId: string, day: string, again = false): string {
  switch (type) {
    case "good_news":
      return `news:${itemId}`;
    case "milestone":
      return `milestone:${itemId}:${day}`;
    case "starts_today":
      return `starts:${itemId}:${day}`;
    case "promise":
      return promiseReasonId(itemId, day, again);
    case "thread":
      return threadReasonId(itemId, day);
  }
}

/**
 * The Moment's words per kind, from fixed templates and the user's own line (item 5 of FD-30e: useful in
 * content, not chrome). Copy is a proposal for the founder's review (approved-design-coverage.md).
 */
function localCopy(type: keyof typeof LOCAL_WEIGHT, name: string, item: MemoryItem, day: string, today: string, told: boolean): { statement: string; context: string; primary: string; heading: string } {
  const rel = relativeDay(day, today);
  // "Today · Sun, Nov 1"; a day said only by its date is said once.
  const when = rel === dayLabel(day, today) ? rel : `${rel} · ${dayLabel(day, today)}`;
  switch (type) {
    case "good_news":
      return { statement: item.statement, context: relativeDay(day, today), primary: `Congratulate ${name}`, heading: `Congratulate ${name}` };
    case "promise":
      // "You said you'd bring Sam soup." · "Today · Sat, Nov 1"; a few days on, the day it was for.
      return { statement: promiseStatement(item.statement), context: when, primary: `Message ${name}`, heading: `Message ${name}` };
    case "thread":
      // "Did Felix decide?" · "Felix is considering moving to Denver"; with a day of its own, that day.
      return { statement: threadAsk(name, item.statement), context: told ? item.statement : `${item.statement} · ${dayLabel(day, today)}`, primary: `Ask ${name}`, heading: `Ask ${name}` };
    default:
      return { statement: item.statement, context: when, primary: `Message ${name}`, heading: `Message ${name}` };
  }
}

/** The mention list as a Moment carries it. */
function mentionView(m: Mentions): { mention: string[]; opener: string | null } {
  return { mention: m.lines, opener: m.opener };
}

/** Where a person's birthday came from, said the way every provenance line is. */
function birthdayProvenance(source: unknown): string {
  return source === "contacts" ? "From Contacts" : source === "capture" ? "You told Kinship" : "You added this";
}

/** The day a moment counts as shown (for freshness and the person cap). */
export function shownDay(now: Date): string {
  return isoDay(now);
}

// ─── The return question, with its reason (founder H10, H18) ───────────────

/** What a milestone is called when Kinship asks about it afterwards (H16, H18): never a bare "Did you reach Ben?". */
const MILESTONE_TOPIC: Record<MilestoneType, string> = {
  engagement: "the engagement", wedding: "the wedding", new_job: "the new job", promotion: "the promotion", baby: "the baby",
  graduation: "the graduation", new_home: "the new place", retirement: "retiring", move: "the move",
};

function milestoneReturn(type: MilestoneType, name: string): { ask: string; followUp: string } {
  return { ask: `Did you reach ${name} about ${MILESTONE_TOPIC[type]}?`, followUp: `Anything worth remembering from talking with ${name}?` };
}

/** What the good news was, said back: "on the promotion". Deterministic; nothing when unsure. */
function newsTopic(statement: string): string | null {
  const s = statement.toLocaleLowerCase();
  if (/\bpromot/u.test(s)) return "on the promotion";
  if (/\bengaged\b/u.test(s)) return "on the engagement";
  if (/\bmarried\b|\bwedding\b/u.test(s)) return "on the wedding";
  if (/\bbaby\b/u.test(s)) return "on the baby";
  if (/\bgraduat/u.test(s)) return "on graduating";
  if (/\b(?:house|home|place|apartment)\b/u.test(s) && /\b(?:bought|closed on|got)\b/u.test(s)) return "on the new place";
  if (/\b(?:job|offer|role|position|hired)\b/u.test(s)) return "on the new job";
  if (/\b(?:accepted|got into|got in)\b/u.test(s)) return "on getting in";
  return null;
}

function returnCopy(type: ReasonType | "good_news" | "starts_today" | "birthday", name: string, statement: string | null): { ask: string; followUp: string } {
  switch (type) {
    case "promise":
      // "Did you bring Sam soup?"; a promise's logistics: nothing more to ask after a Yes (founder I2).
      return { ask: promiseAsk(name, statement ?? ""), followUp: "" };
    case "thread":
      // What they said may be the thread's answer ("Felix decided to move"): worth a Tell.
      return { ask: `Did you ask ${name} about it?`, followUp: `Anything worth remembering from talking with ${name}?` };
    case "good_news": {
      const topic = statement ? newsTopic(statement) : null;
      return {
        ask: `Did you congratulate ${name}${topic ? ` ${topic}` : ""}?`,
        followUp: `Anything worth remembering from congratulating ${name}?`,
      };
    }
    case "starts_today":
      return { ask: `Did you wish ${name} luck today?`, followUp: `Anything worth remembering from talking with ${name}?` };
    case "birthday":
      return { ask: `Did you wish ${name} a happy birthday?`, followUp: `Anything worth remembering from ${name}'s birthday?` };
    case "event_followup":
      return { ask: `Did you ask ${name} how it went?`, followUp: `How did it go for ${name}? Anything worth remembering?` };
    default:
      return { ask: `Did you reach ${name}?`, followUp: `Anything worth remembering from talking with ${name}?` };
  }
}
