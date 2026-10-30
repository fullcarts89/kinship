// Export your data (SET-04; FD-30e): everything Kinship keeps for the user,
// as a file they hold, built from this phone's encrypted store (the same
// rows the server holds, mirrored) plus the one thing only the server keeps
// that is theirs to see: the consent ledger. Shared through the iOS share
// sheet; nothing is uploaded anywhere by Kinship.
//
// What it says, and how: people, what Kinship knows about each (with the
// note each line came from and its words), the people close to them, the
// conversations the user confirmed, what they said they'd do, every note as
// written, and the account's settings. In the user's terms: no ids, no model
// names, no scores, no versions. Dates and times in the user's time zone.
//
// buildExport is pure (the hook and tests share it); shareExport writes the
// file to the app's own cache and hands it to the share sheet.

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { kindLabel, whenLabel } from "@/features/memory/format";
import { voiced } from "@/features/memory/statements";
import { trailVerb } from "@/features/person/trail";
import { HOLD_COPY } from "@/store/peopleStates";
import type { Capture, MemoryItem, MemorySource, Person, RelatedPerson, Repositories } from "@/store/repositories";
import type { Data } from "@/store/userStore";
import { shortName } from "../../supabase/functions/_shared/extraction/names";

export interface ExportInput {
  people: Person[];
  related: RelatedPerson[];
  items: MemoryItem[];
  sources: MemorySource[];
  captures: Capture[];
  contacts: { id: string; person_id: string; channel: string; occurred_at: string; memory_item_id?: string | null; deleted_at?: unknown }[];
  settings: Data | null;
  /** The server's consent ledger (owner-readable), when it could be read. */
  consents?: { scope: string; granted: boolean; created_at: string }[] | null;
  now: Date;
  timeZone: string;
}

export interface ExportedSource {
  /** "note 3" (the note's place in the Notes section), or where else it came from. */
  from: string;
  /** The note's own words this line rests on, when they are known. */
  words?: string;
  /** For a correction: what the line said before. */
  before?: string;
}

export interface ExportedMemory {
  what: string;
  kind: string;
  when: string | null;
  /** "current", "resolved", "replaced by a later note", "expired". Removed lines are not exported. */
  status: string;
  told: string;
  /** Names of others in People this line is also about. */
  sharedWith?: string[];
  sources: ExportedSource[];
}

export interface ExportedPerson {
  name: string;
  fullName?: string;
  alsoKnownAs?: string[];
  relationship?: string;
  /** "in People", "paused", "remembered", "removed from People". */
  status: string;
  birthday?: string;
  birthdaySource?: string;
  memories: ExportedMemory[];
  theirPeople: string[];
  conversations: { how: string; when: string; about?: string }[];
  youSaidYoud: string[];
}

export interface ExportDocument {
  title: string;
  exportedAt: string;
  timeZone: string;
  people: ExportedPerson[];
  notes: { ref: string; told: string; text: string; aboutPage?: string }[];
  settings: Record<string, string>;
  consents?: { what: string; answer: string; when: string }[];
}

const SCOPE_WORD: Record<string, string> = {
  ai_processing: "Understanding what you tell Kinship",
  analytics: "Usage analytics",
  notifications: "Notifications",
};

function fmtDateTime(iso: unknown, timeZone: string): string {
  if (typeof iso !== "string") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
  } catch {
    return d.toISOString();
  }
}

function fmtDay(iso: unknown, timeZone: string): string {
  if (typeof iso !== "string") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "short", day: "numeric" }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/** A calendar day stored as YYYY-MM-DD, said as "Mar 14, 1990" (or "Mar 14" when the year isn't known). */
function fmtCalendarDay(day: unknown, yearKnown: boolean): string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}/u.test(day)) return "";
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return yearKnown ? `${month} ${d}, ${y}` : `${month} ${d}`;
}

function todayIn(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function statusWord(item: MemoryItem): string {
  switch (item.status) {
    case "active": return "current";
    case "resolved": return "resolved";
    case "superseded": return "replaced by a later note";
    case "expired": return "expired";
    default: return item.status;
  }
}

function personStatus(p: Person): string {
  if (p.state === "archived") return "removed from People";
  if (p.state === "paused" || p.state === "remembered") return HOLD_COPY[p.state].line.toLowerCase();
  return "in People";
}

/** Code-point slice of a note's text for a source span. */
function spanWords(text: string, start: unknown, end: unknown): string | undefined {
  if (typeof start !== "number" || typeof end !== "number" || end <= start) return undefined;
  const cps = [...text];
  return cps.slice(start, end).join("");
}

/** The whole export, from rows. Pure. */
export function buildExport(input: ExportInput): ExportDocument {
  const { timeZone, now } = input;
  const today = todayIn(now, timeZone);
  const people = input.people.filter((p) => !p.deleted_at);
  const byId = new Map(people.map((p) => [p.id, p]));
  const say = (p: Person | undefined) => (p ? shortName(p) || p.display_name : "");
  const captures = input.captures.filter((c) => !c.deleted_at)
    .sort((a, b) => String(a.occurred_at ?? a.created_at).localeCompare(String(b.occurred_at ?? b.created_at)));
  const noteRef = new Map(captures.map((c, i) => [c.id, `note ${i + 1}`]));
  const sourcesByItem = new Map<string, MemorySource[]>();
  for (const s of input.sources) {
    if (s.deleted_at) continue;
    sourcesByItem.set(s.memory_item_id, [...(sourcesByItem.get(s.memory_item_id) ?? []), s]);
  }
  const items = input.items.filter((m) => !m.deleted_at && m.status !== "retracted");
  const related = input.related.filter((r) => !r.deleted_at);

  const memory = (m: MemoryItem): ExportedMemory => {
    const v = voiced(m, people);
    const srcs = (sourcesByItem.get(m.id) ?? []).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const sources: ExportedSource[] = srcs.map((s) => {
      if (s.source_kind === "capture" && s.capture_id) {
        const cap = captures.find((c) => c.id === s.capture_id);
        const quote = typeof s.quote === "string" ? s.quote : cap?.raw_text ? spanWords(cap.raw_text, s.span_start, s.span_end) : undefined;
        return { from: noteRef.get(s.capture_id) ?? "a note that was deleted", ...(quote ? { words: quote } : {}) };
      }
      if (s.source_kind === "user_edit") {
        const before = (s.meta as Record<string, unknown> | null | undefined)?.before;
        return { from: "you corrected it", ...(typeof before === "string" ? { before } : {}) };
      }
      if (s.source_kind === "contacts") return { from: "Contacts" };
      if (s.source_kind === "merge") return { from: "merged from another line" };
      return { from: s.source_kind };
    });
    const shared = (Array.isArray(m.with_person_ids) ? m.with_person_ids : []).map((id) => say(byId.get(id))).filter(Boolean);
    return {
      what: v.statement,
      kind: kindLabel(m.kind),
      when: whenLabel(m.kind, (m.detail ?? {}) as Record<string, unknown>, today),
      status: statusWord(m),
      told: fmtDay(m.created_at, timeZone),
      ...(shared.length ? { sharedWith: shared } : {}),
      sources,
    };
  };

  const exported: ExportedPerson[] = people
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
    .map((p) => {
      const mine = items.filter((m) => m.person_id === p.id || (Array.isArray(m.with_person_ids) && m.with_person_ids.includes(p.id)))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      const aliases = Array.isArray(p.nicknames) ? p.nicknames.filter((n): n is string => typeof n === "string" && !!n.trim()) : [];
      const convos = input.contacts.filter((c) => c.person_id === p.id && !c.deleted_at)
        .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))
        .map((c) => {
          const about = c.memory_item_id ? items.find((m) => m.id === c.memory_item_id) : undefined;
          return { how: trailVerb(c.channel, p), when: fmtDateTime(c.occurred_at, timeZone), ...(about ? { about: voiced(about, people).statement } : {}) };
        });
      return {
        name: p.display_name,
        ...(typeof p.full_name === "string" && p.full_name && p.full_name !== p.display_name ? { fullName: p.full_name } : {}),
        ...(aliases.length ? { alsoKnownAs: aliases } : {}),
        ...(typeof p.relationship_label === "string" && p.relationship_label ? { relationship: p.relationship_label } : {}),
        status: personStatus(p),
        ...(p.birthday ? { birthday: fmtCalendarDay(p.birthday, p.birthday_year_known !== false) } : {}),
        ...(p.birthday && p.birthday_source ? { birthdaySource: p.birthday_source === "contacts" ? "Contacts" : p.birthday_source === "capture" ? "a note" : "you added it" } : {}),
        memories: mine.map(memory),
        theirPeople: related.filter((r) => r.person_id === p.id).map((r) => (r.name ? `${r.relation}: ${r.name}` : r.relation)),
        conversations: convos,
        youSaidYoud: mine.filter((m) => m.kind === "promise" && m.subject_type === "user" && m.status === "active").map((m) => memory(m).what),
      };
    });

  const s = input.settings ?? {};
  const settings: Record<string, string> = {
    understanding: s.ai_consent === true ? "on" : "off",
    ...(typeof s.time_zone === "string" ? { timeZone: s.time_zone } : {}),
    ...(typeof s.quiet_hours_start === "string" && typeof s.quiet_hours_end === "string" ? { quietHours: `${s.quiet_hours_start} to ${s.quiet_hours_end}` } : {}),
    notes: s.capture_retention_default === "delete_after_extraction" ? "deleted once understood" : "kept",
  };

  return {
    title: "Your Kinship data",
    exportedAt: fmtDateTime(now.toISOString(), timeZone),
    timeZone,
    people: exported,
    notes: captures.map((c) => ({
      ref: noteRef.get(c.id) as string,
      told: fmtDateTime(c.occurred_at ?? c.created_at, timeZone),
      text: c.raw_text ?? "(the words were deleted once understood)",
      ...(c.context_person_id && byId.get(c.context_person_id) ? { aboutPage: say(byId.get(c.context_person_id)) } : {}),
    })),
    settings,
    ...(input.consents?.length
      ? { consents: input.consents.map((c) => ({ what: SCOPE_WORD[c.scope] ?? c.scope, answer: c.granted ? "allowed" : "not allowed", when: fmtDateTime(c.created_at, timeZone) })) }
      : {}),
  };
}

/** The same export as a document a person can read. */
export function exportMarkdown(doc: ExportDocument): string {
  const out: string[] = [`# ${doc.title}`, "", `Exported ${doc.exportedAt} (${doc.timeZone}). Kinship made this file on your phone; it was not uploaded anywhere.`, ""];
  out.push("## People", "");
  if (!doc.people.length) out.push("No one yet.", "");
  for (const p of doc.people) {
    const head = [p.name, p.fullName && p.fullName !== p.name ? `(${p.fullName})` : null, p.relationship ? `· ${p.relationship}` : null].filter(Boolean).join(" ");
    out.push(`### ${head}`, "");
    const facts = [
      p.status !== "in People" ? `Status: ${p.status}` : null,
      p.alsoKnownAs?.length ? `Also goes by: ${p.alsoKnownAs.join(", ")}` : null,
      p.birthday ? `Birthday: ${p.birthday}${p.birthdaySource ? ` (from ${p.birthdaySource})` : ""}` : null,
    ].filter(Boolean) as string[];
    for (const f of facts) out.push(`- ${f}`);
    if (facts.length) out.push("");
    if (p.memories.length) {
      out.push("What Kinship knows:", "");
      for (const m of p.memories) {
        const meta = [m.kind, m.when, m.status !== "current" ? m.status : null, `told ${m.told}`, m.sharedWith?.length ? `with ${m.sharedWith.join(", ")}` : null].filter(Boolean).join(" · ");
        out.push(`- ${m.what}  `, `  ${meta}`);
        for (const s of m.sources) {
          out.push(`  - from ${s.from}${s.words ? `: “${s.words}”` : ""}${s.before ? ` (before: “${s.before}”)` : ""}`);
        }
      }
      out.push("");
    }
    if (p.theirPeople.length) out.push(`Their people: ${p.theirPeople.join("; ")}`, "");
    if (p.youSaidYoud.length) {
      out.push("You said you'd:", "");
      for (const y of p.youSaidYoud) out.push(`- ${y}`);
      out.push("");
    }
    if (p.conversations.length) {
      out.push("Conversations you confirmed:", "");
      for (const c of p.conversations) out.push(`- ${c.how} · ${c.when}${c.about ? ` · about: ${c.about}` : ""}`);
      out.push("");
    }
  }
  out.push("## Notes, as you wrote them", "");
  if (!doc.notes.length) out.push("Nothing told yet.", "");
  for (const n of doc.notes) {
    out.push(`### ${n.ref[0].toUpperCase()}${n.ref.slice(1)} · ${n.told}${n.aboutPage ? ` · told from ${n.aboutPage}'s page` : ""}`, "", n.text, "");
  }
  out.push("## Settings", "");
  for (const [k, v] of Object.entries(doc.settings)) out.push(`- ${k === "understanding" ? "Understanding what you tell Kinship" : k === "timeZone" ? "Time zone" : k === "quietHours" ? "Quiet hours" : "Notes"}: ${v}`);
  out.push("");
  if (doc.consents?.length) {
    out.push("## Your consent record", "");
    for (const c of doc.consents) out.push(`- ${c.what}: ${c.answer} · ${c.when}`);
    out.push("");
  }
  return out.join("\n");
}

/** Reads everything the export needs from the user's store. */
export async function exportInputFrom(repos: Repositories, store: { list(table: "people" | "related_people" | "captures" | "memory_items" | "memory_item_sources" | "contact_events", opts?: { includeDeleted?: boolean }): Promise<Data[]> }, now: Date, timeZone: string): Promise<ExportInput> {
  return {
    people: (await store.list("people", { includeDeleted: false })) as Person[],
    related: (await store.list("related_people")) as RelatedPerson[],
    items: (await store.list("memory_items")) as MemoryItem[],
    sources: (await store.list("memory_item_sources")) as MemorySource[],
    captures: (await store.list("captures")) as Capture[],
    contacts: (await store.list("contact_events")) as ExportInput["contacts"],
    settings: await repos.settings.get(),
    now,
    timeZone,
  };
}

export type ExportFormat = "markdown" | "json";

const STEM = "kinship-export";

/** The export file's name for a day: kinship-export-2026-10-30.md */
export function exportFileName(format: ExportFormat, day: string): string {
  return `${STEM}-${day}.${format === "json" ? "json" : "md"}`;
}

/**
 * Writes the export into the app's own cache and opens the share sheet on
 * it. Returns false when sharing isn't available on this device (the file is
 * then removed again: a copy of everything never lingers unasked).
 */
export async function shareExport(doc: ExportDocument, format: ExportFormat): Promise<boolean> {
  const day = todayIn(new Date(), doc.timeZone);
  const file = new File(Paths.cache, exportFileName(format, day));
  file.write(format === "json" ? JSON.stringify(doc, null, 2) : exportMarkdown(doc));
  if (!(await Sharing.isAvailableAsync())) {
    try { file.delete(); } catch { /* best-effort */ }
    return false;
  }
  await Sharing.shareAsync(file.uri, format === "json"
    ? { mimeType: "application/json", dialogTitle: "Your Kinship data", UTI: "public.json" }
    : { mimeType: "text/markdown", dialogTitle: "Your Kinship data", UTI: "net.daringfireball.markdown" });
  return true;
}

/** Removes any export file left in the cache (sign-out, account deletion). */
export function removeExportFiles(): void {
  try {
    const dir = Paths.cache;
    const entries = (dir as unknown as { list?: () => { name: string; delete: () => void }[] }).list?.() ?? [];
    for (const e of entries) if (e.name.startsWith(STEM)) e.delete();
  } catch {
    // best-effort
  }
}
