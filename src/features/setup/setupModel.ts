// Setup (Design Direction §C, §I.1; board 1 "Setting up"; plan E16): the
// pure parts. Which contacts to suggest, what each row says, what is "already
// worth knowing", and where a half-finished setup resumes. Nothing here reads
// the address book or the store; the screen supplies them.
//
// Trust rules carried here (contract §7):
//   * only the people the user picks are saved; nothing is pre-selected;
//   * a birthday is only ever the one in the contact (source "contacts");
//   * suggestions never rank people by importance: they are a short list of
//     contacts saved under a family word or with a birthday soon, alphabetical;
//   * a contact's name is never read as a relationship to the user
//     (stabilization Gate C): "Bryce Lara's Hubby" is Lara's husband, not the
//     user's family, and even "Dad" is only shown as it was saved, never
//     labelled "Family" or recorded as a relationship.

/** A contact as read on this phone (src/platform/contacts.ts). */
export interface DeviceContact {
  id: string;
  name: string;
  nickname?: string | null;
  /** month is 1–12; year is absent when the contact has none. */
  birthday?: { day: number; month: number; year?: number | null } | null;
}

export interface PickRow {
  /** The id the person will have once picked: stable, so the sprig doesn't change. */
  personId: string;
  contactId: string | null;
  name: string;
  /** The quiet line under the name: "Birthday · 10 October"; never a relationship. */
  why: string | null;
  /** ISO day; the year is 2000 when the contact has none. */
  birthday: string | null;
  birthdayYearKnown: boolean;
}

export interface PickLists {
  suggested: PickRow[];
  everyone: PickRow[];
}

export const SUGGESTED_MAX = 12;
/** "Already worth knowing" looks this far ahead (plan ONB-04). */
export const WORTH_DAYS = 14;
/** A birthday this soon makes a contact a suggestion. */
const SUGGEST_BIRTHDAY_DAYS = 31;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Words people save family under in their address book.
const FAMILY_WORD = "(?:mom|mommy|mum|mummy|mother|mama|ma|dad|daddy|father|papa|pop|grandma|grandpa|granny|grandmother|grandfather|nana|nanna|nan|gran|grandad|granddad|abuela|abuelo|oma|opa|sister|sis|brother|bro|aunt|auntie|aunty|uncle|wife|husband|hubby)";
/** The family word leads the name: "Dad", "Grandma Jo", "Aunt Vickie", "Grandma & Grandpa Elsey". */
const LEADS = new RegExp(`^${FAMILY_WORD}\\b`, "iu");

/**
 * Saved under a family word of the user's own ("Mom", "Grandma Jo", "Uncle
 * Ray"): a reason to suggest them, nothing more. Someone else's relative
 * ("Bryce Lara's Hubby", "Jon Brahm's Daddy", "Laura (Rigo's Wife)
 * Gardener") never counts: a possessive or a bracket anywhere means the word
 * is about someone else.
 */
export function looksLikeFamily(c: Pick<DeviceContact, "name" | "nickname">): boolean {
  const own = (s: string) => {
    const t = s.normalize("NFC").trim();
    if (/['’]s\b|\(|\)/u.test(t)) return false;
    return LEADS.test(t);
  };
  return own(c.name) || (!!c.nickname && own(c.nickname));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The contact's birthday as an ISO day (year 2000, a leap year, when unknown). */
export function birthdayIso(b: DeviceContact["birthday"]): { iso: string; yearKnown: boolean } | null {
  if (!b || !Number.isInteger(b.day) || !Number.isInteger(b.month)) return null;
  if (b.month < 1 || b.month > 12 || b.day < 1 || b.day > 31) return null;
  const yearKnown = typeof b.year === "number" && b.year > 1900 && b.year < 2100;
  const year = yearKnown ? (b.year as number) : 2000;
  const d = new Date(Date.UTC(year, b.month - 1, b.day));
  if (d.getUTCMonth() !== b.month - 1) return null; // 31 April and the like
  return { iso: `${year}-${pad(b.month)}-${pad(b.day)}`, yearKnown };
}

function utc(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/** The next time this birthday comes round, on or after today (29 Feb → 28 Feb in other years). */
export function nextBirthday(birthday: string, today: string): string {
  const month = Number(birthday.slice(5, 7));
  const day = Number(birthday.slice(8, 10));
  const at = (year: number) => {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const d = month === 2 && day === 29 && !leap ? 28 : day;
    return `${year}-${pad(month)}-${pad(d)}`;
  };
  const y = Number(today.slice(0, 4));
  const thisYear = at(y);
  return daysBetween(today, thisYear) >= 0 ? thisYear : at(y + 1);
}

/** "10 October". */
export function dayMonth(birthday: string): string {
  return `${Number(birthday.slice(8, 10))} ${MONTHS[Number(birthday.slice(5, 7)) - 1]}`;
}

/** "today", "tomorrow", "Saturday", "on 21 October". */
export function whenFromToday(day: string, today: string): string {
  const n = daysBetween(today, day);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n > 1 && n < 7) return WEEKDAYS[new Date(utc(day)).getUTCDay()];
  return `on ${dayMonth(day)}`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/u)[0] || name.trim();
}

/** "Maya's", "James's". */
export function possessive(name: string): string {
  return `${name}'s`;
}

/**
 * The picker's two lists. Contacts already among the user's people (by their
 * contact, or by the same name) are left out. Suggestions are a short,
 * alphabetical list of contacts with a family name or a birthday within a
 * month; "Everyone" is every other contact, alphabetical.
 */
export function buildPickLists(
  contacts: DeviceContact[],
  opts: { today: string; existing: { contactRefs: Set<string>; names: Set<string> }; newId: (contactId: string) => string },
): PickLists {
  const seen = new Set<string>();
  const rows: { row: PickRow; suggest: boolean }[] = [];
  for (const c of contacts) {
    const name = c.name.normalize("NFC").replace(/\s+/gu, " ").trim();
    if (!name || seen.has(c.id)) continue;
    seen.add(c.id);
    if (opts.existing.contactRefs.has(c.id) || opts.existing.names.has(name.toLocaleLowerCase())) continue;
    const b = birthdayIso(c.birthday);
    const family = looksLikeFamily({ name, nickname: c.nickname });
    const soon = b ? daysBetween(opts.today, nextBirthday(b.iso, opts.today)) <= SUGGEST_BIRTHDAY_DAYS : false;
    // Never "Family": the name already says how they were saved (Gate C).
    const why = b ? `Birthday · ${dayMonth(b.iso)}` : null;
    rows.push({
      row: {
        personId: opts.newId(c.id), contactId: c.id, name, why,
        birthday: b?.iso ?? null, birthdayYearKnown: b?.yearKnown ?? false,
      },
      suggest: family || soon,
    });
  }
  const byName = (a: PickRow, b: PickRow) => a.name.localeCompare(b.name);
  const suggested = rows.filter((r) => r.suggest).map((r) => r.row).sort(byName).slice(0, SUGGESTED_MAX);
  const inSuggested = new Set(suggested.map((r) => r.personId));
  const everyone = rows.map((r) => r.row).filter((r) => !inSuggested.has(r.personId)).sort(byName);
  return { suggested, everyone };
}

/** Rows matching a search, from both lists, alphabetical. */
export function searchRows(lists: PickLists, query: string): PickRow[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  return [...lists.suggested, ...lists.everyone]
    .filter((r) => r.name.toLocaleLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface WorthLine {
  personId: string;
  text: string;
  /** Always the contact it came from. */
  provenance: "From Contacts";
}

/**
 * "Already worth knowing" (board 1, with T7: birthdays only): real birthdays
 * of the people just picked, within two weeks, soonest first, at most three.
 * Nothing is invented: no birthdays, no lines.
 */
export function worthKnowing(people: { id: string; name: string; birthday: string | null }[], today: string): WorthLine[] {
  return people
    .filter((p): p is { id: string; name: string; birthday: string } => !!p.birthday)
    .map((p) => ({ p, next: nextBirthday(p.birthday, today) }))
    .filter((x) => daysBetween(today, x.next) <= WORTH_DAYS)
    .sort((a, b) => a.next.localeCompare(b.next) || a.p.name.localeCompare(b.p.name))
    .slice(0, 3)
    .map(({ p, next }) => {
      const when = whenFromToday(next, today);
      const name = possessive(firstName(p.name));
      return {
        personId: p.id,
        text: when === "today" ? `It's ${name} birthday today.` : `${name} birthday is ${when}.`,
        provenance: "From Contacts" as const,
      };
    });
}

// Where setup stands lives in activation.ts (an explicit record, not a guess).
