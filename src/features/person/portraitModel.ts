// The relationship page as a portrait (Design Direction §I.7; board 2), as a
// pure function: which remembered things appear in which section, in what
// order, and how many. The rules are product rules, documented in
// docs/product/relationship-page-rules.md; change them there first.
//
//   Lately          what's going on with them now: active facts and open
//                   threads, events that have just happened, and a promise
//                   of theirs whose day has passed ("Waiting on Tyler")
//   Coming up       their birthday within a month, dated events ahead,
//                   plans not yet resolved; never anything whose day has
//                   passed (founder K2)
//   You said you'd  promises still open
//   Between you     what you share: context, traditions, shared moments,
//                   and the conversations you confirmed (founder I2)
//
// Nothing here ranks the person, counts anything for display, or decides
// what matters by inference: order is by time only. Everything not shown on
// the portrait stays in What Kinship knows, one tap away.
//
// Residence told more and less precisely (Phase 4B B7; brief §13; founder
// CC-19): one valid chain of current residence lines ("Susan lives in
// California", "Susan lives in Alameda") takes one slot in Lately, as the
// most specific line's own statement ("Susan lives in Alameda"), dated and
// ordered by the chain's newest line, so a recent "California" keeps the
// chain recent. The other members leave the Portrait only; What Kinship
// knows lists every one, and each keeps its source, Edit and Not this.
// Without a valid chain (one line, a place the data doesn't know, an
// ambiguous or disjoint pair, no reading on this phone) every line shows as
// before: fail open, nothing lost.

import { type ComposeMember, currentResidence, residenceChain, residenceGroupKey } from "../../../supabase/functions/_shared/semantic/compose";
import type { MemoryItem, Person, ResidenceFacetRow } from "@/store/repositories";
import { shortName } from "../../../supabase/functions/_shared/extraction/names";

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
  /** What this line replaced, so a change reads as a change: "was: Susan is moving to Oakland in August" (H23). */
  was?: string | null;
}

/**
 * One conversation the user confirmed (founder I2): "You messaged · Oct 12",
 * and what it was about in their words. History, never a count, a
 * frequency, a streak or "last contacted".
 */
export interface TrailLine {
  id: string;
  label: string;
  about: string | null;
}

export interface Portrait {
  person: Person | null;
  label: string | null;
  lately: PortraitLine[];
  comingUp: PortraitLine[];
  youSaid: PortraitLine[];
  between: PortraitLine[];
  /** The newest conversations, under Between you; the rest are in What Kinship knows (founder I2). */
  trail: TrailLine[];
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
  /** Conversations shown under Between you (founder I2); every one is in What Kinship knows. */
  trail: 3,
} as const;

export interface PortraitItem {
  item: MemoryItem;
  provenance: string;
  noteId: string | null;
  when: string | null;
  /** The earlier line this one replaced, in the user's terms. */
  was?: string | null;
  /** The line's residence reading, mirrored from the server (B7): without one, nothing chains. */
  facet?: ResidenceFacetRow | null;
}

/** The composer's view of a line (the mirror keeps the fields as plain data). */
function composable(item: MemoryItem) {
  return {
    status: item.status,
    deleted_at: item.deleted_at,
    kind: item.kind,
    person_id: item.person_id,
    subject_type: typeof item.subject_type === "string" ? item.subject_type : "person",
    subject_related_id: typeof item.subject_related_id === "string" ? item.subject_related_id : null,
    certainty: item.certainty,
    sensitivity: typeof item.sensitivity === "string" ? item.sensitivity : "none",
    with_person_ids: Array.isArray(item.with_person_ids) ? item.with_person_ids : [],
  };
}

/**
 * The residence chains among the portrait's items (B7): for each valid chain,
 * its head and the day of its newest member, and the members that leave the
 * Portrait. Pure; read every time the portrait is built and never stored.
 */
export function residenceChains(items: readonly PortraitItem[]): { heads: Map<string, string>; hidden: Set<string> } {
  const groups = new Map<string, ComposeMember[]>();
  for (const x of items) {
    const it = composable(x.item);
    const f = x.facet;
    if (!f || !currentResidence(it, f)) continue;
    const key = residenceGroupKey(it);
    const member: ComposeMember = {
      id: x.item.id,
      facet: { value_text: f.value_text, value_norm: f.value_norm, place_ref: f.place_ref, candidates: f.candidates, usual_ref: f.usual_ref, dataset_version: f.dataset_version },
      told: String(x.item.created_at ?? ""),
    };
    groups.set(key, [...(groups.get(key) ?? []), member]);
  }
  const heads = new Map<string, string>();
  const hidden = new Set<string>();
  for (const members of groups.values()) {
    const chain = residenceChain(members);
    if (!chain) continue;
    heads.set(chain.headId, chain.newest.slice(0, 10));
    for (const id of chain.memberIds) if (id !== chain.headId) hidden.add(id);
  }
  return { heads, hidden };
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

/** Whether the portrait shows this memory (or "birthday", the person's own birthday line). */
export function portraitShows(portrait: Portrait, itemId: string): boolean {
  return [...portrait.lately, ...portrait.comingUp, ...portrait.youSaid, ...portrait.between].some((l) => l.itemId === itemId);
}

export function buildPortrait(input: {
  person: Person | null;
  items: PortraitItem[];
  today: string;
  /** The person's birthday line, when it's within PORTRAIT_RULES.birthdayDays (computed by the caller). */
  birthday?: PortraitLine | null;
  birthdayDay?: string | null;
  /** Every conversation the user confirmed with them, newest first (founder I2). */
  trail?: TrailLine[];
  /** Their promises the user has since reached them about (a confirmed conversation on or after its day; founder K2, K3). */
  reached?: ReadonlySet<string>;
}): Portrait {
  const { person, today } = input;
  const R = PORTRAIT_RULES;
  const empty: Portrait = { person, label: null, lately: [], comingUp: [], youSaid: [], between: [], trail: [], total: 0, more: false };
  if (!person) return empty;
  const items = input.items.filter((x) => live(x.item));
  const out: Portrait = {
    ...empty,
    label: typeof person.relationship_label === "string" && person.relationship_label ? person.relationship_label : null,
    total: items.length,
  };
  const line = (x: PortraitItem): PortraitLine => ({
    itemId: x.item.id, statement: x.item.statement, when: x.when, provenance: x.provenance, noteId: x.noteId,
    ...(x.was ? { was: x.was } : {}),
  });

  const lately: { x: PortraitItem; at: string }[] = [];
  const coming: { x: PortraitItem; at: string }[] = [];
  const said: { x: PortraitItem; at: string }[] = [];
  const between: { x: PortraitItem; at: string }[] = [];
  // One residence chain, one slot (B7): the head speaks for it, dated by its newest member.
  const chains = residenceChains(items);
  for (const x of items) {
    const it = x.item;
    const day = dayOf(it);
    const told = chains.heads.get(it.id) ?? toldDay(it);
    const active = it.status === "active";
    if (chains.hidden.has(it.id)) continue;
    switch (it.kind) {
      case "promise":
        if (!active) break;
        // Someone else's promise to the user ("Tyler said he'd send you his
        // contractor's number") is never under "You said you'd": it's what's
        // coming from them (stabilization Gate F). Coming up only while its
        // day is today or later (founder K2). Past its day and still open, it
        // is something going on with them: Lately for a month after its day,
        // as "Waiting on Tyler" (never "overdue", "late" or a count of days),
        // and without that once the user has reached them about it. With no
        // day, or only a month or a year, there is no "past its day".
        if (it.subject_type === "person") {
          const precision = (it.detail as Record<string, unknown> | null)?.date_precision;
          const day = typeof precision === "string" && precision !== "day" ? null : dayOf(it);
          if (day && daysFrom(today, day) >= 0) coming.push({ x, at: day });
          else if (day && daysFrom(today, day) >= -R.recentEventDays) {
            // Never for someone remembered or paused (as Today never speaks of them).
            const waiting = input.reached?.has(it.id) || person.state !== "active" ? null : `Waiting on ${shortName(person) || person.display_name}`;
            lately.push({ x: { ...x, when: waiting }, at: day });
          } else if (!day && daysFrom(today, told) >= -R.latelyDays) lately.push({ x, at: told });
        } else said.push({ x, at: told });
        break;
      case "plan": {
        // A plan said as a season or a month ("next summer") is as good as
        // undated here: it stays in Coming up, whenever it is.
        const coarse = ["season", "month", "year"].includes(String((it.detail as Record<string, unknown> | null)?.date_precision ?? ""));
        if (active && (!day || coarse || (daysFrom(today, day) >= 0 && daysFrom(today, day) <= R.comingUpDays))) coming.push({ x, at: day ?? "9999" });
        break;
      }
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
  // Newest first; lines from the same note keep the note's own order.
  const newest = (a: { at: string; x: PortraitItem }, b: { at: string; x: PortraitItem }) => {
    const ca = String(a.x.item.created_at ?? "");
    const cb = String(b.x.item.created_at ?? "");
    if (a.x.noteId && a.x.noteId === b.x.noteId) return ca.localeCompare(cb);
    return b.at.localeCompare(a.at) || cb.localeCompare(ca);
  };
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
  out.trail = (input.trail ?? []).slice(0, R.trail);
  const shown = new Set([...out.lately, ...out.comingUp, ...out.youSaid, ...out.between].map((l) => l.itemId));
  out.more = items.some((x) => !shown.has(x.item.id)) || (input.trail ?? []).length > R.trail;
  return out;
}
