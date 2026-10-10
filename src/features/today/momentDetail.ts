// The Moment detail (founder I1; CC-18, CC-19): tap a reason → see the reason.
//
//   What it's about    the memory, in the user's words as kept
//   Why now            its timing, said plainly ("It was yesterday.")
//   When               the day
//   Where it came from the memory's own provenance (tap → the note)
//   What you can do    Message · Call, or look at the person
//
// Built only from Today's own view of the moment: the stored reason (or the
// memory a Coming up line cites), a deterministic day, and fixed sentences.
// Nothing here infers, scores or ranks, and none of that is ever shown.
// It's looked up again from Today's current view every time it's drawn, so a
// memory retracted, replaced or no longer due takes its detail with it: there
// is never a stale detail.

import { dayLabel } from "@/features/memory/format";
import { daysBetween, type MomentView, type QuietView, type ReasonType, type TodayView } from "./todayModel";

export interface MomentDetail {
  /** Which moment or line this is (internal: never shown). */
  key: string;
  type: ReasonType;
  personId: string;
  personName: string;
  /** The memory it's grounded in; null for a birthday from the person's record. */
  itemId: string | null;
  /** What it's about, in the user's words as kept. */
  line: string;
  /** What they were hoping for, kept with the event itself. */
  hope: string | null;
  /** Why Kinship brings it back now: its timing, one fixed sentence. */
  why: string;
  /** The day it's about, plainly ("Sun, Oct 11"); null when it has none of its own. */
  when: string | null;
  provenance: string | null;
  /** The note it came from (the Source). */
  noteId: string | null;
  /** What a Message or Call carries, so the return check asks about it. */
  reason: { id: string; type: ReasonType; ask: string; about: string | null; followUp: string };
  /** The hand-off sheet's heading and "You could mention", when the sheet is needed. */
  heading: string;
  mention: string[];
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekday(day: string): string {
  return WEEKDAYS[new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)))).getUTCDay()];
}

/** "today", "tomorrow", "on Saturday", "on Mon, Oct 19". */
export function ahead(day: string, today: string): string {
  const n = daysBetween(today, day);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n > 1 && n < 7) return `on ${weekday(day)}`;
  return `on ${dayLabel(day, today)}`;
}

/** "today", "yesterday", "on Monday", "on Tue, Sep 29". */
export function behind(day: string, today: string): string {
  const n = daysBetween(day, today);
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  if (n > 1 && n < 7) return `on ${weekday(day)}`;
  return `on ${dayLabel(day, today)}`;
}

/** The key a Coming up or "Waiting on …" line opens its detail by (also its hand-off's local reason id). */
export function quietKey(q: QuietView): string | null {
  if (q.kind === "coming") return `coming:${q.itemId ?? `birthday-${q.personId}`}:${q.day}`;
  if (q.kind === "waiting") return `waiting:${q.itemId}:${q.day}`;
  return null;
}

function fromMoment(m: MomentView, today: string): MomentDetail {
  const day = m.day;
  let why: string;
  switch (m.type) {
    case "event_followup":
      why = day ? `It was ${behind(day, today)}.` : "It has just happened.";
      break;
    case "starts_today":
      why = "It starts today.";
      break;
    case "good_news":
      why = !day ? "It's recent news." : m.toldDay ? `You told Kinship ${behind(day, today)}.` : `It happened ${behind(day, today)}.`;
      break;
    case "birthday":
      why = `It's ${m.personName}'s birthday today.`;
      break;
    default:
      why = day ? `It's ${ahead(day, today)}.` : "It's coming up.";
  }
  return {
    key: m.reasonId, type: m.type, personId: m.personId, personName: m.personName, itemId: m.itemId,
    line: m.memory ?? m.statement,
    hope: m.hope ?? null,
    why,
    when: day && !m.toldDay ? dayLabel(day, today) : null,
    provenance: m.provenance, noteId: m.noteId,
    reason: { id: m.reasonId, type: m.type, ask: m.ask, about: m.memory, followUp: m.followUp },
    heading: m.heading, mention: m.mention,
  };
}

function fromQuiet(q: Extract<QuietView, { kind: "coming" | "waiting" }>, key: string, today: string, name: string): MomentDetail {
  if (q.kind === "waiting") {
    return {
      key, type: "waiting", personId: q.personId, personName: name, itemId: q.itemId,
      line: q.memory, hope: null,
      why: `It was due ${behind(q.day, today)}.`,
      when: dayLabel(q.day, today),
      provenance: q.provenance, noteId: q.noteId,
      reason: { id: key, type: "waiting", ask: `Did you reach ${name}?`, about: q.memory, followUp: `Anything worth remembering from talking with ${name}?` },
      heading: `Message ${name}`, mention: [],
    };
  }
  const birthday = q.itemId === null;
  return {
    key, type: "coming", personId: q.personId, personName: name, itemId: q.itemId,
    line: q.text, hope: q.hope,
    why: birthday ? `${name}'s birthday is ${ahead(q.day, today)}.` : q.due ? `It's due ${ahead(q.day, today)}.` : `It's ${ahead(q.day, today)}.`,
    when: dayLabel(q.day, today),
    provenance: q.provenance, noteId: q.noteId,
    reason: { id: key, type: "coming", ask: `Did you reach ${name}?`, about: q.text, followUp: `Anything worth remembering from talking with ${name}?` },
    heading: `Message ${name}`, mention: [],
  };
}

/**
 * The detail for `key` in Today's current view, or null when it's no longer
 * there (retracted, replaced, put aside, or past): the sheet closes then.
 * `nameOf` says the person's name the way Today does.
 */
export function detailFor(view: TodayView, key: string, today: string, nameOf: (personId: string) => string | null): MomentDetail | null {
  if (view.moment && view.moment.reasonId === key) return fromMoment(view.moment, today);
  const lines = view.quiet.flatMap((q) => (q.kind === "more" ? q.rest : [q]));
  for (const q of lines) {
    if ((q.kind === "coming" || q.kind === "waiting") && quietKey(q) === key) {
      const name = nameOf(q.personId);
      return name ? fromQuiet(q, key, today, name) : null;
    }
  }
  return null;
}
