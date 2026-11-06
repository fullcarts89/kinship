// The notebook review's plain helpers (PR #77 §7): the user's words split into runs, each understood
// phrase tied to the line (or the question) it became; the header's few words; whether a line's day
// is as the user said it or an exact one. Pure, so the screen only draws.
import { dayLabel } from "@/features/memory/format";
import type { ItemLine } from "../reviewModel";

/** A phrase of the note Kinship read, and what it became. Offsets are UTF-16, ready for slicing. */
export interface WordMark {
  key: string;
  /** A kept line (by item id), or a reading held for the user (by its index in the reading). */
  target: { kind: "line"; id: string } | { kind: "held"; index: number };
  personId: string | null;
  start: number;
  end: number;
  /** The line was removed ("Not this"): the words stay, dotted and faded. */
  gone?: boolean;
}

export interface WordRun {
  text: string;
  start: number;
  end: number;
  mark: WordMark | null;
  /** Words the understanding did not get to (Option A): grey and dotted, never dropped. */
  unprocessed: boolean;
}

const rank = (m: WordMark) => (m.gone ? 2 : m.target.kind === "held" ? 1 : 0);

/**
 * The note as runs: each understood phrase on its own (the most specific one where phrases overlap;
 * a kept line before a held reading before a removed line), the words not got to marked, the rest
 * plain. The runs always join back into the whole note: nothing is dropped.
 */
export function wordRuns(text: string, marks: WordMark[], unprocessed: { start: number; end: number }[] = []): WordRun[] {
  const len = text.length;
  const clamp = (n: number) => Math.max(0, Math.min(len, n));
  const sound = marks.map((m) => ({ ...m, start: clamp(m.start), end: clamp(m.end) })).filter((m) => m.end > m.start);
  const gaps = unprocessed.map((u) => ({ start: clamp(u.start), end: clamp(u.end) })).filter((u) => u.end > u.start);
  const cuts = [...new Set([0, len, ...sound.flatMap((m) => [m.start, m.end]), ...gaps.flatMap((u) => [u.start, u.end])])].sort((a, b) => a - b);
  const runs: WordRun[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    if (b <= a) continue;
    const over = sound
      .filter((m) => m.start <= a && m.end >= b)
      .sort((x, y) => rank(x) - rank(y) || (x.end - x.start) - (y.end - y.start) || x.start - y.start);
    const mark = over[0] ?? null;
    const notGot = gaps.some((u) => u.start <= a && u.end >= b);
    const last = runs[runs.length - 1];
    if (last && last.mark?.key === mark?.key && last.unprocessed === notGot) {
      last.text += text.slice(a, b);
      last.end = b;
    } else {
      runs.push({ text: text.slice(a, b), start: a, end: b, mark, unprocessed: notGot });
    }
  }
  return runs;
}

/** The marks in the order the user wrote them: the order their underlines arrive. */
export function inReadingOrder(marks: WordMark[]): WordMark[] {
  return [...marks].sort((a, b) => a.start - b.start || a.end - b.end);
}

/** "Priya", "Priya and Josh", "Priya, Sam and Josh". */
export function listOf(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** "one question", "two questions": said in words, as the user would say it. */
export function questionsPhrase(n: number): string {
  const word = NUMBER_WORDS[n] ?? "a few";
  return `${word} question${n === 1 ? "" : "s"}`;
}

/**
 * The header's cap: who what was kept is for ("Kept for Priya and Josh"), and, while the user is
 * needed, how many questions ("· one question"). Never "Kept" before something is kept.
 */
export function reviewCap(lines: ItemLine[], firstName: (personId: string) => string | null, questions: number, fallback: string): string {
  const names: string[] = [];
  for (const l of lines) {
    const n = l.person ? firstName(l.person.id) ?? l.person.label : null;
    if (n && !names.includes(n)) names.push(n);
  }
  const lead = names.length ? `Kept for ${listOf(names)}` : fallback;
  return questions > 0 ? `${lead} · ${questionsPhrase(questions)}` : lead;
}

/** One group per person, in the order the review lists them; a line about no one known goes last. */
export function groupLines(lines: ItemLine[]): { personId: string | null; lines: ItemLine[] }[] {
  const groups: { personId: string | null; lines: ItemLine[] }[] = [];
  for (const l of lines) {
    const id = l.person?.id ?? null;
    const g = groups.find((x) => x.personId === id);
    if (g) g.lines.push(l);
    else groups.push({ personId: id, lines: [l] });
  }
  return [...groups.filter((g) => g.personId !== null), ...groups.filter((g) => g.personId === null)];
}

/**
 * Whether a line's day is as the user said it ("mid-November", "next summer") rather than one exact
 * day Kinship can bring it back on. A line with no day at all has no token.
 */
export function isAsSaid(when: ItemLine["when"], today: string): boolean {
  if (!when) return false;
  if (!when.value) return true;
  const day = dayLabel(when.value, today);
  return !(when.label === day || when.label === `By ${day}` || when.label.startsWith(`${day} –`));
}

/** Where a line's day sits in its sentence, so the token can be the words themselves; null when it isn't there. */
export function dayInSentence(statement: string, label: string): { start: number; end: number } | null {
  const plain = label.replace(/^By /u, "").replace(/^“|”$/gu, "");
  if (!plain) return null;
  const at = statement.toLowerCase().indexOf(plain.toLowerCase());
  return at >= 0 ? { start: at, end: at + plain.length } : null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The day a note was told, in the phone's own calendar: "Mon, Nov 2" (with the year when it isn't this one). */
export function toldOn(timestamp: string | null | undefined, now: Date = new Date()): string | null {
  if (!timestamp) return null;
  const t = new Date(timestamp);
  if (Number.isNaN(t.getTime())) return null;
  const year = t.getFullYear() !== now.getFullYear() ? `, ${t.getFullYear()}` : "";
  return `${DAYS[t.getDay()]}, ${MONTHS[t.getMonth()]} ${t.getDate()}${year}`;
}

/** Long enough that "Your words" folds to about five lines, with "Show all of it" (the prototype's rule). */
export const WORDS_FOLD_AT = 220;
