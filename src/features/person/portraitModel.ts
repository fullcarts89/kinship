// The relationship page as a portrait (Design Direction §I.7; board 2), as a
// pure function: which remembered things appear in which section, in what
// order, and how many. The rules are product rules, documented in
// docs/product/relationship-page-rules.md; change them there first.
//
//   Lately          what's going on with them now: active facts and open
//                   threads, and events that have just happened
//   Coming up       their birthday within a month, dated events ahead,
//                   plans not yet resolved
//   You said you'd  promises still open
//   Between you     what you share: context, traditions, shared moments
//
// Nothing here ranks the person, counts anything for display, or decides
// what matters by inference: order is by time only. Everything not shown on
// the portrait stays in What Kinship knows, one tap away.

import type { MemoryItem, Person } from "@/store/repositories";

export interface PortraitLine {
  /** The memory item; "birthday" for the person's own birthday line. */
  itemId: string;
  statement: string;
  /** "Sun, Oct 11", "October"… when it has a time. */
  when: string | null;
  provenance: string;
  noteId: string | null;
  /** Not correctable from the page (a birthday from Contacts). */
  fixed?: boolean;
}

export interface Portrait {
  person: Person | null;
  label: string | null;
  lately: PortraitLine[];
  comingUp: PortraitLine[];
  youSaid: PortraitLine[];
  between: PortraitLine[];
  /** Everything Kinship keeps about them (for "What Kinship knows"). */
  total: number;
  /** Some of what Kinship knows isn't on the portrait (shown as the link, never as a number). */
  more: boolean;
}

/** Product rules (docs/product/relationship-page-rules.md). */
export const PORTRAIT_RULES = {
  /** "Lately" means lately: told within this many days. */
  latelyDays: 120,
  /** An event that has just happened stays in Lately this long after its day. */
  recentEventDays: 30,
  /** Dated things this far ahead are "coming up". */
  comingUpDays: 120,
  /** A birthday this close is "coming up". */
  birthdayDays: 30,
  /** At most this many lines per section; the rest stay in What Kinship knows. */
  perSection: 3,
} as const;

export interface PortraitItem {
  item: MemoryItem;
  provenance: string;
  noteId: string | null;
  when: string | null;
}

function utc(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

function daysFrom(today: string, day: string): number {
  return Math.round((utc(day) - utc(today)) / 86_400_000);
}

function dayOf(item: MemoryItem): string | null {
  const d = (item.detail ?? {}) as Record<string, unknown>;
  const day = typeof d.date === "string" ? d.date : typeof d.due_date === "string" ? d.due_date : null;
  return day && /^\d{4}-\d{2}-\d{2}/.test(day) ? day.slice(0, 10) : null;
}

function toldDay(item: MemoryItem): string {
  return String(item.created_at ?? "").slice(0, 10);
}

/** Live on the portrait: active, or resolved (only "Between you" shows resolved ones). Superseded, retracted and expired never. */
function live(item: MemoryItem): boolean {
  return (item.status === "active" || item.status === "resolved") && !item.deleted_at;
}

export function buildPortrait(input: {
  person: Person | null;
  items: PortraitItem[];
  today: string;
  /** The person's birthday line, when it's within PORTRAIT_RULES.birthdayDays (computed by the caller). */
  birthday?: PortraitLine | null;
  birthdayDay?: string | null;
}): Portrait {
  const { person, today } = input;
  const R = PORTRAIT_RULES;
  const empty: Portrait = { person, label: null, lately: [], comingUp: [], youSaid: [], between: [], total: 0, more: false };
  if (!person) return empty;
  const items = input.items.filter((x) => live(x.item));
  const out: Portrait = {
    ...empty,
    label: typeof person.relationship_label === "string" && person.relationship_label ? person.relationship_label : null,
    total: items.length,
  };
  const line = (x: PortraitItem): PortraitLine => ({
    itemId: x.item.id, statement: x.item.statement, when: x.when, provenance: x.provenance, noteId: x.noteId,
  });

  const lately: { x: PortraitItem; at: string }[] = [];
  const coming: { x: PortraitItem; at: string }[] = [];
  const said: { x: PortraitItem; at: string }[] = [];
  const between: { x: PortraitItem; at: string }[] = [];
  for (const x of items) {
    const it = x.item;
    const day = dayOf(it);
    const told = toldDay(it);
    const active = it.status === "active";
    switch (it.kind) {
      case "promise":
        if (active) said.push({ x, at: told });
        break;
      case "plan":
        if (active && (!day || (daysFrom(today, day) >= 0 && daysFrom(today, day) <= R.comingUpDays))) coming.push({ x, at: day ?? "9999" });
        break;
      case "event":
      case "milestone":
        if (!active) break;
        if (day && daysFrom(today, day) >= 0) {
          if (daysFrom(today, day) <= R.comingUpDays) coming.push({ x, at: day });
        } else if (day && daysFrom(today, day) >= -R.recentEventDays) {
          lately.push({ x, at: day });
        } else if (!day && daysFrom(today, told) >= -R.latelyDays) {
          lately.push({ x, at: told });
        }
        break;
      case "context":
      case "tradition":
      case "moment":
        between.push({ x, at: told });
        break;
      default: // fact, thread
        if (active && daysFrom(today, told) >= -R.latelyDays) lately.push({ x, at: told });
    }
  }
  const newest = (a: { at: string; x: PortraitItem }, b: { at: string; x: PortraitItem }) =>
    b.at.localeCompare(a.at) || String(b.x.item.created_at ?? "").localeCompare(String(a.x.item.created_at ?? ""));
  const soonest = (a: { at: string; x: PortraitItem }, b: { at: string; x: PortraitItem }) =>
    a.at.localeCompare(b.at) || String(a.x.item.created_at ?? "").localeCompare(String(b.x.item.created_at ?? ""));

  out.lately = lately.sort(newest).slice(0, R.perSection).map((y) => line(y.x));
  const comingLines = coming.sort(soonest).map((y) => ({ line: line(y.x), at: y.at }));
  if (input.birthday && input.birthdayDay) {
    const at = comingLines.findIndex((c) => c.at > input.birthdayDay!);
    comingLines.splice(at === -1 ? comingLines.length : at, 0, { line: input.birthday, at: input.birthdayDay });
  }
  out.comingUp = comingLines.slice(0, R.perSection).map((c) => c.line);
  out.youSaid = said.sort(newest).slice(0, R.perSection).map((y) => line(y.x));
  out.between = between.sort(newest).slice(0, R.perSection).map((y) => line(y.x));
  const shown = new Set([...out.lately, ...out.comingUp, ...out.youSaid, ...out.between].map((l) => l.itemId));
  out.more = items.some((x) => !shown.has(x.item.id));
  return out;
}
