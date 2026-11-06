// Ask Kinship v1 (CC-25; FD-30a): what the People search field's query finds
// in the user's own memory, as the lines their pages already show. The pure
// retrieval (retrieve.ts) says which lines answer; this reads them from the
// store exactly as What Kinship knows reads them (recordFor: the same words,
// composed residence line, provenance and note), so a found line is the page's
// line, never a second rendering of it. No model, no server.
import { useCallback, useEffect, useState } from "react";
import { dayMonth } from "@/features/setup/setupModel";
import { voiced } from "@/features/memory/statements";
import type { RecordLine } from "@/features/person/PersonRecordView";
import type { TrailLine } from "@/features/person/portraitModel";
import type { ContactEventRow } from "@/features/person/trail";
import { portraitShows } from "@/features/person/portraitModel";
import { portraitFor, recordFor } from "@/hooks/useV2";
import { useStoreQuery } from "@/hooks/useStoreQuery";
import { useV2Session } from "@/providers/V2SessionProvider";
import { type MemoryItem, type Person, repositoriesFor } from "@/store/repositories";
import type { UserStore } from "@/store/userStore";
import { shortName } from "../../../supabase/functions/_shared/extraction/names";
import { ask, type AskAnswer, ASK_COPY, listNames } from "./retrieve";

/** One found line, as the person's page shows it, and where tapping its words goes. */
export interface AskRowView {
  key: string;
  row: RecordLine;
  /** A superseded line the page shows under Before: marked, never current. */
  earlier: boolean;
  /** That line on the person's page (the "View Ben" rule: the portrait when it shows it, else What Kinship knows). */
  href: string;
}

export interface AskGroupView {
  personId: string;
  name: string;
  /** The person's page (a conversation taps through to it). */
  href: string;
  /** Remembered or paused: shown last, nothing proactive. */
  quiet: boolean;
  rows: AskRowView[];
  /** "When did I last see Sam?": the trail's own lines, newest first. */
  conversations: TrailLine[];
}

export interface AskBirthdayView {
  personId: string;
  /** "Ben's birthday · Oct 12" */
  text: string;
  /** "From Contacts" / "You told Kinship" */
  provenance: string;
  /** The note a told birthday came from, when there is one to open. */
  noteId: string | null;
  href: string;
}

export interface AskView {
  query: string;
  /** The query asks something beyond a name: the section shows, with lines or the honest miss. */
  asked: boolean;
  /** The people the query names, for the People list to keep showing. */
  named: string[];
  groups: AskGroupView[];
  birthdays: AskBirthdayView[];
  miss: string | null;
}

export const EMPTY_ASK: AskView = { query: "", asked: false, named: [], groups: [], birthdays: [], miss: null };

/** The provenance a birthday carries (coverage #15: a contact birthday has no note to open). */
export function birthdayProvenance(source: Person["birthday_source"]): string {
  if (source === "contacts") return "From Contacts";
  if (source === "capture") return "You told Kinship";
  return "You added this";
}

/**
 * The answer with each found line read from the store as the person's page
 * reads it. The hook and tests share it.
 */
export async function askView(store: UserStore, query: string, now: Date): Promise<AskView> {
  if (!query.trim()) return EMPTY_ASK;
  const repos = repositoriesFor(store);
  const people = (await repos.people.list()).filter((p) => !p.deleted_at && p.state !== "archived");
  // An account with no one in People has no memory to ask (contract §8: a new account meets setup, never "In your memory").
  if (!people.length) return { ...EMPTY_ASK, query };
  const related = await repos.people.related();
  const all = ((await store.list("memory_items")) as MemoryItem[]).map((m) => voiced(m, people));
  const facets = await repos.memory.residenceFacets();
  const byItem = await repos.memory.sourcesByItem();
  const quotesOf = (id: string) => (byItem.get(id) ?? []).filter((s) => s.source_kind === "capture" && typeof s.quote === "string").map((s) => String(s.quote));
  const contacts = (await store.list("contact_events")) as unknown as ContactEventRow[];
  const answer: AskAnswer = ask({ query, people, related, items: all, facets, contacts, now, quotesOf });
  if (!answer.asked) return { ...EMPTY_ASK, query };

  const groups: AskGroupView[] = [];
  for (const g of answer.groups) {
    const base = `/v2/person/${g.person.id}`;
    const record = await recordFor(repos, g.person.id, now);
    // Where a line's words lead (the "View Ben" rule, personFocusHref): the portrait when it shows the line,
    // else What Kinship knows. One portrait read per person, not per line.
    const portrait = g.matches.some((m) => !m.earlier) ? await portraitFor(repos, g.person, now) : null;
    const rows: AskRowView[] = [];
    const seen = new Set<string>();
    for (const m of g.matches) {
      const among = m.earlier ? record.history : record.lines;
      const line = among.find((r) => r.line.id === m.item.id || (r.composed?.memberIds.includes(m.item.id) ?? false));
      if (!line) continue; // the page doesn't show it (it changed under us): never a line of our own making
      const key = line.composed ? `composed:${line.composed.memberIds.join(",")}` : `line:${line.line.id}:${m.earlier ? "earlier" : "now"}`;
      if (seen.has(key)) continue; // two members of one composed line: one row
      seen.add(key);
      const itemId = line.composed ? line.composed.memberIds[0] : m.item.id;
      const href = !m.earlier && portrait && portraitShows(portrait, itemId)
        ? `${base}?item=${encodeURIComponent(itemId)}`
        : `${base}/knows?item=${encodeURIComponent(itemId)}`;
      rows.push({ key, row: line, earlier: m.earlier, href });
    }
    if (!rows.length && !g.conversations.length) continue;
    groups.push({ personId: g.person.id, name: shortName(g.person) || g.person.display_name, href: base, quiet: g.quiet, rows, conversations: g.conversations });
  }
  const birthdays: AskBirthdayView[] = answer.birthdays.map((p) => ({
    personId: p.id,
    text: `${shortName(p) || p.display_name}'s birthday · ${dayMonth(String(p.birthday))}`,
    provenance: birthdayProvenance(p.birthday_source),
    noteId: typeof p.birthday_capture_id === "string" && p.birthday_capture_id ? p.birthday_capture_id : null,
    href: `/v2/person/${p.id}`,
  }));
  // Lines that changed under us can leave nothing to show: then the honest line, as retrieval says it.
  const miss = answer.miss ?? (groups.length || birthdays.length ? null : answer.named.length ? ASK_COPY.nothingFor(listNames(answer.named, people)) : ASK_COPY.nothing);
  return { query, asked: true, named: answer.named.map((p) => p.id), groups, birthdays, miss };
}

/** How long typing settles before memory is asked (a read per keystroke would be wasted work). */
export const ASK_DEBOUNCE_MS = 150;

/**
 * What the People search field's query finds in memory; re-read whenever the
 * store changes. The answer carries the query it answers, so the view can
 * tell a settled answer from one still being read.
 */
export function useAsk(query: string): AskView {
  const { store } = useV2Session();
  const [settled, setSettled] = useState(query);
  useEffect(() => {
    if (!query.trim()) {
      setSettled(query);
      return;
    }
    const t = setTimeout(() => setSettled(query), ASK_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);
  const q = useStoreQuery(store, useCallback(() => (store ? askView(store, settled, new Date()) : Promise.resolve(EMPTY_ASK)), [store, settled]), [settled]);
  // While a new query is being read, the last answer stays (never a flash of "nothing" between keystrokes).
  return q.data ?? { ...EMPTY_ASK, query: settled };
}
