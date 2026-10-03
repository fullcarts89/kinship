// Deterministic date resolution for relationship_extract (plan §9 date_resolve).
//
// The model never writes a date. It copies the date expression exactly as
// the user wrote it ("Sunday", "next Friday", "this winter") and says whether
// the thing is in the past or the future. This file turns that expression
// into calendar dates against the capture's own time and time zone.
//
// Policy (documented in docs/phase1/checkpoint-c-ai-verification.md):
//   * The anchor is the capture's occurred_at, read as a calendar day in the
//     user's IANA time zone. Arithmetic is on calendar days, so DST changes
//     never shift a date.
//   * A bare weekday is the next one (future) or the last one (past). When
//     it is today's weekday it resolves to today, flagged ambiguous.
//   * "next <weekday>" is that weekday in next week (weeks start Monday).
//     When that differs from the very next one ("next Friday" said on a
//     Wednesday), it is flagged ambiguous. "last <weekday>" mirrors this.
//   * A month and day without a year is the next (future) or most recent
//     (past) occurrence, so "January 3" said on Dec 28 is next year.
//   * Seasons are meteorological and flip in the southern hemisphere.
//   * Anything not recognised resolves to precision "unknown" with no date.
//     Silence beats a wrong date.
//
// Ambiguous results are still returned, so the user sees a proposal, but the
// pipeline never auto-saves them (they need a light confirmation).
//
// Plain TypeScript, no imports: Deno (gateway, evals) and Jest can both use it.

export type DatePrecision = "day" | "week" | "month" | "season" | "year" | "unknown";
export type Direction = "past" | "future" | "unclear";

export interface DateResolution {
  date: string | null;
  date_end: string | null;
  precision: DatePrecision;
  /** True when a reasonable reader could pick a different day. */
  ambiguous: boolean;
  /** Which rule matched (content-free; for tests and usage logs). */
  rule: string;
}

export interface CivilDate {
  y: number;
  m: number; // 1-12
  d: number;
}

const UNKNOWN: DateResolution = { date: null, date_end: null, precision: "unknown", ambiguous: false, rule: "none" };

// ─── Calendar arithmetic (UTC-based, no time of day) ────────────────────────

function toUtc(c: CivilDate): number {
  return Date.UTC(c.y, c.m - 1, c.d);
}
function fromUtc(ms: number): CivilDate {
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
export function addDays(c: CivilDate, n: number): CivilDate {
  return fromUtc(toUtc(c) + n * 86_400_000);
}
/** 0 = Monday … 6 = Sunday. */
export function weekday(c: CivilDate): number {
  return (new Date(toUtc(c)).getUTCDay() + 6) % 7;
}
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function cmp(a: CivilDate, b: CivilDate): number {
  return toUtc(a) - toUtc(b);
}
export function iso(c: CivilDate): string {
  return `${String(c.y).padStart(4, "0")}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
}
function valid(y: number, m: number, d: number): boolean {
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/**
 * The calendar day an instant falls on in a time zone. Throws on an unknown
 * zone (the caller decides what to do; the pipeline falls back to UTC and
 * flags the result ambiguous).
 */
export function localDay(instantIso: string, timeZone: string): CivilDate {
  const ms = Date.parse(instantIso);
  if (!Number.isFinite(ms)) throw new RangeError("bad instant");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

// ─── Vocabulary ─────────────────────────────────────────────────────────────

const WEEKDAYS: Record<string, number> = {
  monday: 0, mon: 0,
  tuesday: 1, tue: 1, tues: 1,
  wednesday: 2, wed: 2, weds: 2,
  thursday: 3, thu: 3, thur: 3, thurs: 3,
  friday: 4, fri: 4,
  saturday: 5, sat: 5,
  sunday: 6, sun: 6,
};
const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};
const NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2, "a couple": 2, "a couple of": 2,
};
type Season = "spring" | "summer" | "autumn" | "winter";

const SOUTHERN = /^(Australia\/|Pacific\/Auckland|Pacific\/Chatham|America\/Argentina|America\/Santiago|America\/Sao_Paulo|America\/Montevideo|America\/Asuncion|Africa\/Johannesburg|Africa\/Maputo|Africa\/Harare|Antarctica\/)/;

const VAGUE = /^(sometime|some time|someday|some day|one day|one of these days|soon|later|eventually|at some point|in a while|in a few (days|weeks|months)|in the future|recently|lately|a while ago|the other day)$/;

// ─── Entry point ────────────────────────────────────────────────────────────

/**
 * Resolves a date expression copied from a capture.
 * @param expr      the exact words, e.g. "Sunday", "February 18", "next week"
 * @param anchorIso the capture's occurred_at (an instant)
 * @param timeZone  the user's IANA zone at capture time; null → UTC, ambiguous
 * @param direction whether the thing happened (past) or will (future)
 */
export function resolveDate(
  expr: string,
  anchorIso: string,
  timeZone: string | null,
  direction: Direction = "unclear",
): DateResolution {
  let zone = timeZone ?? "UTC";
  let zoneGuessed = timeZone === null;
  let today: CivilDate;
  try {
    today = localDay(anchorIso, zone);
  } catch {
    zone = "UTC";
    zoneGuessed = true;
    today = localDay(anchorIso, zone);
  }
  const r = resolveFrom(normalise(expr), today, zone, direction);
  // Without the user's own zone, "today" itself may be a day off.
  return zoneGuessed && r.date ? { ...r, ambiguous: true } : r;
}

function normalise(expr: string): string {
  return expr
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(on|by|until|till|for|from|at|this past|the past)\s+/, (m) => (m.startsWith("this past") || m.startsWith("the past") ? "last " : ""))
    .replace(/^(?!last night$)(.+?)\s+(night|morning|afternoon|evening)$/, "$1")
    // "sometime in November", "around March": the month is still the month.
    .replace(/^(?:some ?time|sometime around|around|about|roughly) (?:in |on |during )?(?=\S)/, "")
    .trim();
}

function day(c: CivilDate, rule: string, ambiguous = false): DateResolution {
  return { date: iso(c), date_end: null, precision: "day", ambiguous, rule };
}
function range(a: CivilDate, b: CivilDate, precision: DatePrecision, rule: string, ambiguous = false): DateResolution {
  return { date: iso(a), date_end: iso(b), precision, ambiguous, rule };
}

function resolveFrom(e: string, today: CivilDate, zone: string, dir: Direction): DateResolution {
  if (!e || VAGUE.test(e)) return { ...UNKNOWN, rule: e ? "vague" : "empty" };
  const past = dir === "past";

  // today / tonight / tomorrow / yesterday
  if (/^(today|tonight|this (morning|afternoon|evening)|now|right now)$/.test(e)) return day(today, "today");
  if (/^(tomorrow|tmrw|tmr)$/.test(e)) return day(addDays(today, 1), "tomorrow");
  if (/^(yesterday|last night)$/.test(e)) return day(addDays(today, -1), "yesterday");
  if (e === "the day after tomorrow") return day(addDays(today, 2), "day_after_tomorrow");
  if (e === "the day before yesterday") return day(addDays(today, -2), "day_before_yesterday");

  // ISO date
  let m = e.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return valid(y, mo, d) ? day({ y, m: mo, d }, "iso") : { ...UNKNOWN, rule: "invalid" };
  }

  // Weekdays: "sunday", "this sunday", "next friday", "last tuesday", "this coming friday"
  m = e.match(/^(this coming |the coming |coming |this |next |last |the )?([a-z]+)$/);
  if (m && m[2] in WEEKDAYS) return weekdayRule(m[1]?.trim() ?? "", WEEKDAYS[m[2]], today, past);

  // Weekends
  m = e.match(/^(this |next |last |the )?weekend$/);
  if (m) return weekendRule(m[1]?.trim() ?? "", today, past);

  // Weeks
  if (/^(this|the) week$/.test(e)) return weekOf(today, 0, "this_week");
  if (e === "next week") return weekOf(today, 1, "next_week");
  if (e === "last week") return weekOf(today, -1, "last_week");
  if (/^(the )?(end of|later) (this|the) week$/.test(e)) {
    const mon = addDays(today, -weekday(today));
    return range(addDays(mon, 3), addDays(mon, 6), "week", "end_of_week");
  }

  // Months relative: "this month", "next month", "end of the month", "early next month"
  m = e.match(/^(?:(the )?(end|beginning|start|middle) of |(early|late|mid-?) ?)?(this|next|last|the) month$/);
  if (m) {
    const offset = m[4] === "next" ? 1 : m[4] === "last" ? -1 : 0;
    const t = monthShift(today.y, today.m, offset);
    return partOfMonth(t.y, t.m, m[2] ?? m[3] ?? null, `month_rel`);
  }

  // "in N days/weeks/months/years", "N days from now", "N weeks ago"
  m = e.match(/^(?:in )?(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a couple of|a couple|couple) (day|week|month|year)s?( from now| from today| ago| later)?$/);
  if (m && (e.startsWith("in ") || m[3])) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBERS[m[1]];
    const sign = m[3] === " ago" ? -1 : 1;
    switch (m[2]) {
      case "day":
        return day(addDays(today, sign * n), "in_days");
      case "week": {
        const c = addDays(today, sign * 7 * n);
        // "in two weeks" means around then: the week containing that day.
        return { ...weekOf(c, 0, "in_weeks"), precision: "week" };
      }
      case "month": {
        const t = monthShift(today.y, today.m, sign * n);
        return partOfMonth(t.y, t.m, null, "in_months");
      }
      case "year":
        return yearOf(today.y + sign * n, "in_years");
    }
  }

  // Years
  if (/^(this|the) year$/.test(e)) return yearOf(today.y, "this_year");
  if (e === "next year") return yearOf(today.y + 1, "next_year");
  if (e === "last year") return yearOf(today.y - 1, "last_year");
  m = e.match(/^(?:in )?(\d{4})$/);
  if (m && Number(m[1]) >= 1900 && Number(m[1]) <= 2200) return yearOf(Number(m[1]), "year");

  // Seasons: "this winter", "next summer", "in the spring", "fall", "last autumn", "summer 2027"
  m = e.match(/^(?:in |over |during )?(this |next |last |the |early |late )?(spring|summer|autumn|fall|winter)(?: (\d{4}))?$/);
  if (m) {
    const s: Season = m[2] === "fall" ? "autumn" : (m[2] as Season);
    return seasonRule(m[1]?.trim() ?? "", s, m[3] ? Number(m[3]) : null, today, zone, past);
  }

  // "Thursday the 15th", "Sat, Feb 18": the date decides; a weekday that
  // doesn't match it makes the result ambiguous.
  m = e.match(/^([a-z]+),? (.+)$/);
  if (m && m[1] in WEEKDAYS && !/^(night|morning|afternoon|evening|week|weekend)$/.test(m[2])) {
    const inner = resolveFrom(m[2], today, zone, dir);
    if (inner.date && inner.precision === "day" && !inner.date_end) {
      const [y, mo, d] = inner.date.split("-").map(Number);
      return { ...inner, ambiguous: inner.ambiguous || weekday({ y, m: mo, d }) !== WEEKDAYS[m[1]], rule: `weekday_${inner.rule}` };
    }
  }

  // Ranges: "feb 18-21", "february 18 to 21", "feb 18 – mar 2"
  m = e.match(/^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|—|to|through|thru)\s*(?:([a-z]+)\.? )?(\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?$/);
  if (m && m[1] in MONTHS && (!m[3] || m[3] in MONTHS)) {
    const mo1 = MONTHS[m[1]];
    const mo2 = m[3] ? MONTHS[m[3]] : mo1;
    const start = m[5]
      ? { date: valid(Number(m[5]), mo1, Number(m[2])) ? iso({ y: Number(m[5]), m: mo1, d: Number(m[2]) }) : null }
      : nextOrLast(mo1, Number(m[2]), today, past, "range");
    if (start.date) {
      const [y1] = start.date.split("-").map(Number);
      const y2 = mo2 < mo1 ? y1 + 1 : y1;
      if (valid(y2, mo2, Number(m[4]))) {
        const end = { y: y2, m: mo2, d: Number(m[4]) };
        const [sy, sm, sd] = start.date.split("-").map(Number);
        if (cmp(end, { y: sy, m: sm, d: sd }) >= 0) return range({ y: sy, m: sm, d: sd }, end, "day", "range");
      }
    }
    return { ...UNKNOWN, rule: "invalid" };
  }

  // Month + day: "february 18", "feb 18th", "feb. 18, 2027", "18 february", "the 18th of february"
  const md = monthDay(e);
  if (md) {
    if (md.year !== null) {
      return valid(md.year, md.month, md.day)
        ? day({ y: md.year, m: md.month, d: md.day }, "month_day_year")
        : { ...UNKNOWN, rule: "invalid" };
    }
    return nextOrLast(md.month, md.day, today, past, "month_day");
  }

  // Numeric "2/18", "2/18/27", "18/2/2027": month-first only when the zone is
  // in the Americas; ambiguous whenever both parts could be a month.
  m = e.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const monthFirst = /^America\//.test(zone) ? a <= 12 : b > 12;
    const [mo, d] = monthFirst ? [a, b] : [b, a];
    const ambiguous = a <= 12 && b <= 12 && a !== b;
    if (m[3]) {
      const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      return valid(y, mo, d) ? day({ y, m: mo, d }, "numeric_year", ambiguous) : { ...UNKNOWN, rule: "invalid" };
    }
    const r = nextOrLast(mo, d, today, past, "numeric");
    return r.date ? { ...r, ambiguous: r.ambiguous || ambiguous } : r;
  }

  // Day of month: "the 18th", "on the 3rd"
  m = e.match(/^the (\d{1,2})(?:st|nd|rd|th)$/);
  if (m) {
    const d = Number(m[1]);
    const candidates = [-1, 0, 1].map((k) => monthShift(today.y, today.m, k))
      .filter((t) => valid(t.y, t.m, d))
      .map((t) => ({ y: t.y, m: t.m, d }));
    const pick = past
      ? candidates.filter((c) => cmp(c, today) <= 0).at(-1)
      : candidates.find((c) => cmp(c, today) >= 0);
    return pick ? day(pick, "day_of_month") : { ...UNKNOWN, rule: "invalid" };
  }

  // Month alone: "march", "in march", "next march", "march 2027", "early march"
  m = e.match(/^(?:in )?(this |next |last |early |late |mid-? ?|the end of |end of )?([a-z]+)\.?(?: (\d{4}))?$/);
  if (m && m[2] in MONTHS) {
    const mo = MONTHS[m[2]];
    const mod = m[1]?.trim() ?? "";
    let y: number;
    if (m[3]) y = Number(m[3]);
    else if (mod === "next") y = mo > today.m ? today.y : today.y + 1;
    else if (mod === "last") y = mo < today.m ? today.y : today.y - 1;
    else if (mod === "this") y = today.y;
    else if (past) y = mo <= today.m ? today.y : today.y - 1;
    else y = mo >= today.m ? today.y : today.y + 1;
    const part = /^(early)$/.test(mod) ? "beginning" : /^(late|the end of|end of)$/.test(mod) ? "end" : /^mid/.test(mod) ? "middle" : null;
    return partOfMonth(y, mo, part, "month", mod === "next" && mo > today.m);
  }

  // Holidays (US calendar).
  const h = holiday(e);
  if (h) return holidayRule(h, today, past);

  return { ...UNKNOWN, rule: "unrecognised" };
}

// ─── Rules ──────────────────────────────────────────────────────────────────

function weekdayRule(mod: string, target: number, today: CivilDate, past: boolean): DateResolution {
  const wd = weekday(today);
  const ahead = (target - wd + 7) % 7; // 0..6
  const behind = (wd - target + 7) % 7; // 0..6
  const mondayThis = addDays(today, -wd);
  switch (mod) {
    case "next": {
      const nextWeek = addDays(mondayThis, 7 + target);
      const soonest = addDays(today, ahead === 0 ? 7 : ahead);
      return day(nextWeek, "next_weekday", cmp(nextWeek, soonest) !== 0);
    }
    case "last": {
      const lastWeek = addDays(mondayThis, -7 + target);
      const latest = addDays(today, -(behind === 0 ? 7 : behind));
      return day(lastWeek, "last_weekday", cmp(lastWeek, latest) !== 0);
    }
    case "this coming":
    case "the coming":
    case "coming":
      return day(addDays(today, ahead === 0 ? 7 : ahead), "coming_weekday");
    default: {
      // bare, "this", "the"
      if (past) return day(addDays(today, -behind), "weekday_past", behind === 0);
      return day(addDays(today, ahead), "weekday", ahead === 0);
    }
  }
}

function weekendRule(mod: string, today: CivilDate, past: boolean): DateResolution {
  const wd = weekday(today);
  const mondayThis = addDays(today, -wd);
  const satThis = addDays(mondayThis, 5);
  if (mod === "next") {
    // Next week's weekend; ambiguous on a weekday (people often mean the coming one).
    const sat = addDays(satThis, 7);
    return range(sat, addDays(sat, 1), "day", "next_weekend", wd < 5);
  }
  if (mod === "last") {
    const sat = wd >= 5 ? addDays(satThis, -7) : addDays(satThis, -7);
    return range(sat, addDays(sat, 1), "day", "last_weekend", wd >= 5);
  }
  if (past && wd < 5) {
    const sat = addDays(satThis, -7);
    return range(sat, addDays(sat, 1), "day", "weekend_past");
  }
  return range(satThis, addDays(satThis, 1), "day", "this_weekend");
}

function weekOf(c: CivilDate, offsetWeeks: number, rule: string): DateResolution {
  const mon = addDays(c, -weekday(c) + 7 * offsetWeeks);
  return range(mon, addDays(mon, 6), "week", rule);
}

function monthShift(y: number, m: number, k: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + k;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

function partOfMonth(y: number, m: number, part: string | null, rule: string, ambiguous = false): DateResolution {
  const last = daysInMonth(y, m);
  switch (part) {
    case "end":
    case "late":
      return range({ y, m, d: last - 6 }, { y, m, d: last }, "week", `${rule}_end`, ambiguous);
    case "beginning":
    case "start":
    case "early":
      return range({ y, m, d: 1 }, { y, m, d: 7 }, "week", `${rule}_start`, ambiguous);
    case "middle":
    case "mid":
    case "mid-":
      return range({ y, m, d: 11 }, { y, m, d: 20 }, "week", `${rule}_middle`, ambiguous);
    default:
      return range({ y, m, d: 1 }, { y, m, d: last }, "month", rule, ambiguous);
  }
}

function yearOf(y: number, rule: string): DateResolution {
  return range({ y, m: 1, d: 1 }, { y, m: 12, d: 31 }, "year", rule);
}

/** Meteorological seasons for year y (winter y = Dec y – Feb y+1). */
function seasonSpan(s: Season, y: number, southern: boolean): [CivilDate, CivilDate] {
  const flip: Record<Season, Season> = { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" };
  const t = southern ? flip[s] : s;
  switch (t) {
    case "spring":
      return [{ y, m: 3, d: 1 }, { y, m: 5, d: 31 }];
    case "summer":
      return [{ y, m: 6, d: 1 }, { y, m: 8, d: 31 }];
    case "autumn":
      return [{ y, m: 9, d: 1 }, { y, m: 11, d: 30 }];
    case "winter":
      return [{ y, m: 12, d: 1 }, { y: y + 1, m: 2, d: daysInMonth(y + 1, 2) }];
  }
}

function seasonRule(mod: string, s: Season, year: number | null, today: CivilDate, zone: string, past: boolean): DateResolution {
  const southern = SOUTHERN.test(zone);
  const spans = [-2, -1, 0, 1].map((k) => seasonSpan(s, today.y + k, southern));
  if (year !== null) {
    const [a, b] = seasonSpan(s, year, southern);
    return range(a, b, "season", "season_year");
  }
  const containing = spans.findIndex(([a, b]) => cmp(a, today) <= 0 && cmp(today, b) <= 0);
  const nextIdx = spans.findIndex(([a]) => cmp(a, today) > 0);
  const lastIdx = spans.map(([, b]) => cmp(b, today) < 0).lastIndexOf(true);
  let idx: number;
  if (mod === "next") idx = nextIdx;
  else if (mod === "last") idx = lastIdx;
  else if (containing >= 0) idx = containing;
  else idx = past ? lastIdx : nextIdx;
  const [a, b] = spans[idx];
  // "next summer" said in spring: this coming one, or the one after?
  const ambiguous = mod === "next" && containing < 0 && toUtc(a) - toUtc(today) < 120 * 86_400_000;
  if (mod === "early") return range(a, addDays(a, 29), "month", "season_early", ambiguous);
  if (mod === "late") return range(addDays(b, -29), b, "month", "season_late", ambiguous);
  return range(a, b, "season", `season_${mod || "bare"}`, ambiguous);
}

function monthDay(e: string): { month: number; day: number; year: number | null } | null {
  let m = e.match(/^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?$/);
  if (m && m[1] in MONTHS) return { month: MONTHS[m[1]], day: Number(m[2]), year: m[3] ? Number(m[3]) : null };
  m = e.match(/^(?:the )?(\d{1,2})(?:st|nd|rd|th)?(?: of)? ([a-z]+)\.?(?:,? (\d{4}))?$/);
  if (m && m[2] in MONTHS) return { month: MONTHS[m[2]], day: Number(m[1]), year: m[3] ? Number(m[3]) : null };
  return null;
}

function nextOrLast(mo: number, d: number, today: CivilDate, past: boolean, rule: string): DateResolution {
  for (const k of past ? [0, -1, -2, -3, -4] : [0, 1, 2, 3, 4]) {
    const y = today.y + k;
    if (!valid(y, mo, d)) continue; // Feb 29 skips to the next leap year
    const c = { y, m: mo, d };
    if (past ? cmp(c, today) <= 0 : cmp(c, today) >= 0) return day(c, rule);
  }
  return { ...UNKNOWN, rule: "invalid" };
}

// ─── Holidays ───────────────────────────────────────────────────────────────

type HolidayFn = (y: number) => CivilDate;

function nthWeekday(y: number, m: number, wd: number, n: number): CivilDate {
  const first = { y, m, d: 1 };
  const offset = (wd - weekday(first) + 7) % 7;
  if (n > 0) return addDays(first, offset + 7 * (n - 1));
  const last = { y, m, d: daysInMonth(y, m) };
  return addDays(last, -((weekday(last) - wd + 7) % 7));
}

function easter(y: number): CivilDate {
  // Anonymous Gregorian algorithm.
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  return { y, m: month, d: ((h + l - 7 * m + 114) % 31) + 1 };
}

const HOLIDAYS: [RegExp, HolidayFn][] = [
  [/^christmas eve$/, (y) => ({ y, m: 12, d: 24 })],
  [/^(christmas|christmas day|xmas)$/, (y) => ({ y, m: 12, d: 25 })],
  [/^new year'?s eve$/, (y) => ({ y, m: 12, d: 31 })],
  [/^new year'?s( day)?$/, (y) => ({ y, m: 1, d: 1 })],
  [/^(halloween)$/, (y) => ({ y, m: 10, d: 31 })],
  [/^valentine'?s( day)?$/, (y) => ({ y, m: 2, d: 14 })],
  [/^(the )?(fourth|4th) of july|july (4th|4|fourth)$/, (y) => ({ y, m: 7, d: 4 })],
  [/^thanksgiving( day)?$/, (y) => nthWeekday(y, 11, 3, 4)],
  [/^mother'?s day$/, (y) => nthWeekday(y, 5, 6, 2)],
  [/^father'?s day$/, (y) => nthWeekday(y, 6, 6, 3)],
  [/^memorial day$/, (y) => nthWeekday(y, 5, 0, -1)],
  [/^labor day$/, (y) => nthWeekday(y, 9, 0, 1)],
  [/^easter( sunday)?$/, easter],
];

function holiday(e: string): HolidayFn | null {
  const bare = e.replace(/^(this |next |last )/, "");
  return HOLIDAYS.find(([re]) => re.test(bare))?.[1] ?? null;
}

function holidayRule(fn: HolidayFn, today: CivilDate, past: boolean): DateResolution {
  for (const k of past ? [0, -1] : [0, 1]) {
    const c = fn(today.y + k);
    if (past ? cmp(c, today) <= 0 : cmp(c, today) >= 0) return day(c, "holiday");
  }
  return { ...UNKNOWN, rule: "invalid" };
}
