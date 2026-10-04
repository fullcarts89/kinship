// The read side and actions for the 2.0 screens (plan §11: screens → hooks →
// repositories). Everything re-reads when the user's store changes: a local
// write, a sync, or a step of Understanding.

import { useCallback } from "react";
import { codePointToUtf16 } from "../../supabase/functions/_shared/spans";
import { provenanceLine, arrivedLabel, momentLabel } from "@/features/memory/format";
import type { NoteData } from "@/features/person/NoteView";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { buildReview, itemLine, type ReviewView } from "@/features/tell/reviewModel";
import { AI_CONSENT_VERSION } from "@/lib/aiPreferences";
import { charsBucket, track } from "@/platform/analytics";
import { useV2Session } from "@/providers/V2SessionProvider";
import { CONFLICT_TITLE, describeConflict } from "@/store/conflictCopy";
import { isOn } from "@/store/flags";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { questionWaiting } from "@/store/understanding";
import { useFlags } from "./useFlags";
import { useStoreQuery } from "./useStoreQuery";

/** Today in the user's own calendar, as an ISO day. */
export function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

// ─── Tell ───────────────────────────────────────────────────────────────

export function useTell() {
  const { store, understanding, userId } = useV2Session();
  const flags = useFlags(userId);
  const settings = useStoreQuery(store, (repos) => repos.settings.get());
  const s = settings.data;
  // The server checks consent on every call; this only decides whether to ask.
  const consent = s ? (s.ai_consent === true && Number(s.ai_consent_version ?? 0) >= AI_CONSENT_VERSION ? "on" : "off") : "unknown";
  const ai = isOn(flags, "ai_extraction") && consent !== "off";
  const keep = useCallback(async (text: string): Promise<string> => {
    const capture = await repositoriesFor(store).captures.tell(text, { aiEnabled: ai, timeZone: timeZone() });
    track("capture_completed", { source: "text", chars_bucket: charsBucket([...text].length), offline: understanding.offline });
    if (ai) {
      await understanding.told(capture.id);
      understanding.run().catch(() => undefined);
    }
    return capture.id;
  }, [store, understanding, ai]);
  return { keep, ai, tellOn: isOn(flags, "tell") };
}

// ─── The review ─────────────────────────────────────────────────────────

export function useReview(captureId: string | null): ReviewView | null {
  const { store, understanding } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    if (!captureId) return null;
    const row = await understanding.get(captureId);
    if (!row) return null;
    const capture = await repos.captures.get(captureId);
    return buildReview({
      row,
      capture: capture
        ? { id: capture.id, raw_text: capture.raw_text, context_person_id: capture.context_person_id, status: capture.status }
        : null,
      items: await understanding.itemsFor(captureId, row.reading),
      people: await repos.people.list(),
      related: await repos.people.related(),
      offline: understanding.offline,
      today: todayIso(),
    });
  }, [captureId]);
  return q.data ?? null;
}

export interface OpenNotes {
  /** Kept, not understood yet (or an answer on its way). */
  waiting: string[];
  /** A question is waiting for the user. */
  questions: string[];
  /** Understood while the user was elsewhere, not looked at yet. */
  toLookAt: string[];
  offline: boolean;
}

export function useOpenNotes(): OpenNotes {
  const { store, understanding } = useV2Session();
  const q = useStoreQuery(store, async () => {
    const rows = await understanding.open();
    return {
      waiting: rows.filter((r) => r.state === "waiting" || r.state === "answering").map((r) => r.capture_id),
      questions: rows.filter((r) => r.state === "review" && r.reading && questionWaiting(r.reading)).map((r) => r.capture_id),
      toLookAt: rows.filter((r) => r.state === "review" && !r.seen_at && r.reading && !questionWaiting(r.reading)).map((r) => r.capture_id),
      offline: understanding.offline,
    };
  });
  return q.data ?? { waiting: [], questions: [], toLookAt: [], offline: false };
}

/** What the screens can do with a note and what came of it. */
export function useUnderstanding() {
  return useV2Session().understanding;
}

// ─── People ─────────────────────────────────────────────────────────────

export function usePeople(): Person[] {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) =>
    (await repos.people.list())
      .filter((p) => p.state !== "archived")
      .sort((a, b) => a.display_name.localeCompare(b.display_name)));
  return q.data ?? [];
}

export function usePersonRecord(personId: string) {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const people = await repos.people.list();
    const person = people.find((p) => p.id === personId) ?? null;
    if (!person) return { person: null, lines: [] as RecordLine[] };
    const related = await repos.people.related();
    const now = new Date();
    const items = (await repos.memory.forPerson(personId))
      .filter((m) => m.status === "active" || m.status === "resolved")
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const lines: RecordLine[] = [];
    for (const item of items) {
      const sources = await repos.memory.sourcesFor(item.id);
      const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const [conflict] = await repos.conflicts.forRow("memory_items", item.id);
      lines.push({
        line: itemLine(item, { people, related, today: todayIso(now) }),
        provenance: provenanceLine(sources.map((s) => ({
          source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at),
        })), now),
        noteId: notes[0]?.capture_id ?? null,
        conflict: conflict
          ? { id: conflict.id, title: CONFLICT_TITLE, choices: describeConflict(conflict, item), canUseMine: conflict.reason === "concurrent_edit" }
          : null,
      });
    }
    return { person, lines };
  }, [personId]);
  return q.data ?? { person: null, lines: [] as RecordLine[] };
}

// ─── The Source view ────────────────────────────────────────────────────

export function useNote(captureId: string): NoteData | null {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const capture = await repos.captures.get(captureId);
    if (!capture) return null;
    const people = await repos.people.list();
    const all = (await store.list("memory_item_sources")).filter((s) => s.capture_id === captureId);
    const items: NoteData["items"] = [];
    const spans: { start: number; end: number }[] = [];
    const quotes: string[] = [];
    for (const s of all) {
      const item = (await store.get("memory_items", String(s.memory_item_id))) as MemoryItem | null;
      if (!item || item.status === "retracted" || item.status === "superseded") continue;
      if (!items.some((i) => i.id === item.id)) {
        const p = people.find((x) => x.id === item.person_id);
        items.push({ id: item.id, statement: item.statement, person: p?.display_name ?? "", personId: item.person_id });
      }
      if (typeof s.span_start === "number" && typeof s.span_end === "number") spans.push({ start: s.span_start, end: s.span_end });
      if (typeof s.quote === "string" && !quotes.includes(s.quote)) quotes.push(s.quote);
    }
    const text = capture.raw_text;
    return {
      runs: text ? runsOf(text, spans) : null,
      quotes: text ? [] : quotes,
      arrived: `${arrivedLabel(capture.source)} · ${momentLabel(String(capture.created_at ?? capture.occurred_at), new Date())}`,
      items,
    };
  }, [captureId]);
  return q.data ?? null;
}

/** Splits text at the (code-point) spans, merged, into marked and plain runs. */
export function runsOf(text: string, spans: { start: number; end: number }[]): { text: string; marked: boolean }[] {
  const ranges = spans
    .map((s) => [codePointToUtf16(text, s.start), codePointToUtf16(text, s.end)] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of ranges) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  const runs: { text: string; marked: boolean }[] = [];
  let at = 0;
  for (const [a, b] of merged) {
    if (a > at) runs.push({ text: text.slice(at, a), marked: false });
    runs.push({ text: text.slice(a, b), marked: true });
    at = b;
  }
  if (at < text.length) runs.push({ text: text.slice(at), marked: false });
  return runs;
}

// ─── Actions beyond Understanding ───────────────────────────────────────

export function useV2Actions() {
  const { store } = useV2Session();
  return {
    addPerson: (name: string) => repositoriesFor(store).people.add({ display_name: name.normalize("NFC").trim() }),
    deleteNote: async (captureId: string) => {
      await repositoriesFor(store).captures.remove(captureId);
      track("deletion_completed", { scope: "capture" });
    },
    settleConflict: (id: number, choice: "keep_current" | "use_mine") => repositoriesFor(store).conflicts.resolve(id, choice),
  };
}
