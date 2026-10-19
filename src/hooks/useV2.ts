// The read side and actions for the 2.0 screens (plan §11: screens → hooks →
// repositories). Everything re-reads when the user's store changes: a local
// write, a sync, or a step of Understanding.

import { shortName } from "../../supabase/functions/_shared/extraction/names";
import { useCallback, useEffect, useRef, useState } from "react";
import { codePointToUtf16 } from "../../supabase/functions/_shared/spans";
import { arrivedLabel, momentLabel, provenanceLine, whenLabel } from "@/features/memory/format";
import type { NoteData } from "@/features/person/NoteView";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { composeRecordLines, type RecordInput } from "@/features/person/composedRecord";
import { mentionsFor, type Mentions } from "@/features/today/mentions";
import { buildToday, isLocalReason, pageHandoffFor, type PageHandoffReason, returnViewFor, type ContactRow, type Handoff, type ReasonRow, type ReasonType as TodayReasonType, type ReturnView, type TodayInput, type TodayView } from "@/features/today/todayModel";
import { answerReturn, cancelHandOff, forgetConversation, handOff } from "@/store/returnLoop";
import { buildPortrait, PORTRAIT_RULES, portraitShows, type Portrait, type PortraitItem, type PortraitLine, type TrailLine } from "@/features/person/portraitModel";
import { reachedAbout, trailFor, type ContactEventRow } from "@/features/person/trail";
import { dayMonth, nextBirthday, type PickRow } from "@/features/setup/setupModel";
import { legacyActivation, NO_ACTIVATION, nextStep, setupFinished, setupStepsFor, type SetupNeeds } from "@/features/setup/activation";
import { useActivation, type ActivationState } from "./useActivation";
import { buildReview, itemLine, partialOf, personLabel, type ItemLine, type ReviewView } from "@/features/tell/reviewModel";
import { parseDrafts, withDraft, type Drafts } from "@/features/tell/drafts";
import { misfiledOn, voiced } from "@/features/memory/statements";
import { linkSuggestions, type LinkSuggestion } from "@/features/person/links";
import { AI_CONSENT_VERSION, setAIEnabled } from "@/lib/aiPreferences";
import { getMeta, setMeta } from "@/store/schema";
import { charsBucket, minutesBucket, reasonTypeName, scoreBucket, smallCount, track } from "@/platform/analytics";
import { useV2Session } from "@/providers/V2SessionProvider";
import { CONFLICT_TITLE, describeConflict } from "@/store/conflictCopy";
import { followUpsOf, recoveryOf, type Recovery } from "@/store/followUp";
import { isOn } from "@/store/flags";
import { closedBy, peopleOf, repositoriesFor, type Capture, type MemoryItem, type Person, type Repositories } from "@/store/repositories";
import type { HeldItem } from "@/store/gateway";
import { questionWaiting } from "@/store/understanding";
import type { UserStore } from "@/store/userStore";
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
  const keep = useCallback(async (text: string, contextPersonId?: string | null, source: "text" | "onboarding" = "text", continues: string | null = null): Promise<string> => {
    const capture = await repositoriesFor(store).captures.tell(text, {
      aiEnabled: ai, timeZone: timeZone(), contextPersonId: contextPersonId ?? undefined, source,
      // "Tell the rest" (Option A): the partial note this one answers, so every phone sees it answered.
      continuesCaptureId: continues,
    });
    track("capture_completed", { source, chars_bucket: charsBucket([...text].length), offline: understanding.offline });
    if (ai) {
      await understanding.told(capture.id);
      understanding.run().catch(() => undefined);
    }
    return capture.id;
  }, [store, understanding, ai]);
  return { keep, ai, tellOn: isOn(flags, "tell"), extractionOn: isOn(flags, "ai_extraction") };
}

/**
 * What each superseded memory said, for the ones these items update (Gate E:
 * history stays traceable: "Updates: Sam is interviewing at Stripe").
 */
export async function earlierOf(repos: Repositories, items: MemoryItem[], held: HeldItem[] = []): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  // Saved lines that replaced something (every line they closed, B4), and held ones that would on a yes (H25).
  const targets = [
    ...items.flatMap((m) => closedBy(m)),
    ...held.map((h) => (h.action && ["supersede", "resolves"].includes(h.action.type) ? h.action.target_id : null)),
  ];
  for (const id of targets) {
    if (!id || out[id]) continue;
    const prev = await repos.memory.get(id);
    if (prev && !prev.deleted_at) out[id] = voiced(prev).statement;
  }
  return out;
}

/** The words a memory had before the user's first edit, from that edit's source (H30). */
export function editedFrom(sources: { source_kind: string; created_at?: unknown; meta?: unknown }[]): string | null {
  const edits = sources
    .filter((s) => s.source_kind === "user_edit" && s.meta && typeof (s.meta as Record<string, unknown>).before === "string")
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return edits.length ? String((edits[0].meta as Record<string, unknown>).before) : null;
}

// ─── The review ─────────────────────────────────────────────────────────

export function useReview(captureId: string | null): ReviewView | null {
  const { store, understanding } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    if (!captureId) return null;
    const row = await understanding.get(captureId);
    if (!row) return null;
    const capture = await repos.captures.get(captureId);
    const people = await repos.people.list();
    const items = (await understanding.itemsFor(captureId, row.reading)).map((m) => voiced(m, people));
    return buildReview({
      row,
      capture: capture
        ? {
          id: capture.id, raw_text: capture.raw_text, context_person_id: capture.context_person_id, status: capture.status, feedback: capture.feedback,
          coverage: capture.coverage ?? null,
          recovery: await recoveryFor(store, capture),
        }
        : null,
      items,
      earlier: await earlierOf(repos, items, row.reading?.held ?? []),
      missing: await understanding.arriving(row.reading),
      people,
      related: await repos.people.related(),
      offline: understanding.offline,
      today: todayIso(),
    });
  }, [captureId]);
  // Only ever the note asked for: while a new id loads, the previous note's
  // view must not stand in for it.
  return q.data && q.data.captureId === captureId ? q.data : null;
}

/**
 * What later notes ("Tell the rest") did for a partial note (Option A), from the evidence: which of its
 * passages a read note's kept lines rest on, and the later notes' own state. Null when it has none, or
 * no later note is linked. Synced rows, so every phone reads the same.
 */
export async function recoveryFor(store: UserStore, capture: Capture): Promise<Recovery | null> {
  if (!capture.coverage || !capture.raw_text) return null;
  const followUps = await followUpsOf(store, capture.id);
  if (!followUps.length) return null;
  return recoveryOf(capture.raw_text, capture.coverage.unprocessed, followUps);
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

/**
 * A note still open, as a quiet line (stabilization Gate A): Today and the
 * person's page always account for every note until it's finished. Never a
 * count or a badge: what it is, in words.
 */
export interface PendingNote {
  captureId: string;
  kind: "understanding" | "question";
  /** The quiet line's label ("A question", "Understanding"). */
  label: string;
  text: string;
  action: string | null;
  /** Who it's about so far (the person it was told from, the people it names). */
  personIds: string[];
  createdAt: string;
}

export function usePending(): PendingNote[] {
  const { store, understanding } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const rows = await understanding.open();
    if (rows.length === 0) return [];
    const people = await repos.people.list();
    const related = await repos.people.related();
    const out: PendingNote[] = [];
    for (const row of rows) {
      if (row.state === "closing") continue;
      const capture = await repos.captures.get(row.capture_id);
      if (!capture) continue;
      const view = buildReview({
        row,
        capture: { id: capture.id, raw_text: capture.raw_text, context_person_id: capture.context_person_id, status: capture.status },
        items: [], missing: 0, people, related, offline: understanding.offline, today: todayIso(),
      });
      if (view.questions.length) {
        const [first] = view.questions;
        out.push({
          captureId: row.capture_id, kind: "question", label: "A question",
          text: first.type === "keep" ? `${first.prompt.replace(/\?$/u, "")}: “${first.about[0]}”?` : first.prompt,
          action: "Answer", personIds: view.personIds, createdAt: row.created_at,
        });
      } else if (row.state === "waiting" || row.state === "answering") {
        out.push({
          captureId: row.capture_id, kind: "understanding", label: row.state === "answering" ? "Saving your answer" : "Understanding",
          text: row.state === "waiting" && row.attempts > 0
            ? "Couldn't understand a note yet. It's saved, and I'll try again."
            // Never the page's person before the note is understood: told on
            // Susan's page, it may be about Natalia (founder H24).
            : "Your note",
          action: null, personIds: view.personIds, createdAt: row.created_at,
        });
      }
    }
    return out;
  });
  return q.data ?? [];
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

export function usePersonRecord(personId: string): { person: Person | null; lines: RecordLine[]; loading: boolean } {
  const { store } = useV2Session();
  const q = useStoreQuery(store, (repos) => recordFor(repos, personId, new Date()), [personId]);
  // Still being read is never "isn't here any more" (a large account on a phone takes a moment).
  return q.data ? { ...q.data, loading: false } : { person: null, lines: [], loading: true };
}

/**
 * What Kinship knows about someone: every live item, newest first, with its
 * source (the hook and tests share it). Residence lines that chain are said
 * as one line (Phase 4B B5, composedRecord.ts), read here every time and
 * never stored.
 */
export async function recordFor(repos: Repositories, personId: string, now: Date): Promise<{ person: Person | null; lines: RecordLine[] }> {
  const people = await repos.people.list();
  const person = people.find((p) => p.id === personId) ?? null;
  if (!person) return { person: null, lines: [] as RecordLine[] };
  const related = await repos.people.related();
  const items = (await repos.memory.aboutPerson(personId))
    .filter((m) => m.status === "active" || m.status === "resolved")
    .map((m) => voiced(m, people))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const inputs: RecordInput[] = [];
  const byItem = await repos.memory.sourcesByItem();
  const facets = await repos.memory.residenceFacets();
  for (const item of items) {
    const sources = byItem.get(item.id) ?? [];
    const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const [conflict] = await repos.conflicts.forRow("memory_items", item.id);
    const origin = typeof item.origin === "string" ? item.origin : null;
    inputs.push({
      item,
      sources,
      facet: facets.get(item.id) ?? null,
      row: {
        line: { ...itemLine(item, { people, related, today: todayIso(now), earlier: await earlierOf(repos, [item]) }), editedFrom: editedFrom(sources) },
        provenance: provenanceLine(sources.map((s) => ({
          source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at),
        })), now, origin),
        noteId: notes[0]?.capture_id ?? null,
        conflict: conflict
          ? { id: conflict.id, title: CONFLICT_TITLE, choices: describeConflict(conflict, item), canUseMine: conflict.reason === "concurrent_edit" }
          : null,
      },
    });
  }
  const { lines, degraded } = composeRecordLines(inputs, now);
  // Two current lines that can't both be true, shown apart: the comparator's invariant, reported without content.
  if (degraded) track("compose_degraded", { slot: "residence", lines_n: smallCount(degraded) });
  return { person, lines };
}

// ─── The Source view ────────────────────────────────────────────────────

export function useNote(captureId: string): NoteData | null {
  const { store } = useV2Session();
  const q = useStoreQuery(store, () => noteFor(store, captureId, new Date()), [captureId]);
  return q.data ?? null;
}

/** The Source view's data for one note: its words, the understood spans, what came of it (the hook and tests share it). */
export async function noteFor(store: UserStore, captureId: string, now: Date): Promise<NoteData | null> {
  const repos = repositoriesFor(store);
  const capture = await repos.captures.get(captureId);
  if (!capture) return null;
  const people = await repos.people.list();
  const all = (await store.list("memory_item_sources")).filter((s) => s.capture_id === captureId);
  const items: NoteData["items"] = [];
  const spans: { start: number; end: number }[] = [];
  const quotes: string[] = [];
  for (const s of all) {
    const item = (await store.get("memory_items", String(s.memory_item_id))) as MemoryItem | null;
    // A line a later note replaced still came from this note: it stays, marked (H25).
    if (!item || item.status === "retracted" || item.deleted_at) continue;
    const p = people.find((x) => x.id === item.person_id);
    // Removed from People (founder I3): what was only about them is out of
    // sight with them; the note itself stays.
    if (p?.state === "archived") continue;
    if (!items.some((i) => i.id === item.id)) {
      items.push({
        id: item.id, statement: voiced(item, people).statement, person: p?.display_name ?? "", personId: item.person_id,
        ...(item.status === "superseded" ? { updated: true } : {}),
      });
    }
    if (typeof s.span_start === "number" && typeof s.span_end === "number") spans.push({ start: s.span_start, end: s.span_end });
    if (typeof s.quote === "string" && !quotes.includes(s.quote)) quotes.push(s.quote);
  }
  const text = capture.raw_text;
  // What the understanding did not get to (Option A): marked in the note until a later note demonstrably took it.
  const partial = partialOf(capture.coverage ?? null, await recoveryFor(store, capture));
  return {
    runs: text ? runsOf(text, spans, partial?.unprocessed ?? []) : null,
    quotes: text ? [] : quotes,
    arrived: `${arrivedLabel(capture.source)} · ${momentLabel(String(capture.created_at ?? capture.occurred_at), now)}`,
    items,
    partial: partial
      ? { followUp: partial.followUp, resolved: partial.resolved, recovered: partial.recovered, unlocated: partial.unlocated, tellRest: partial.tellRest }
      : null,
  };
}

/**
 * Splits text at the (code-point) spans, merged, into marked and plain runs. `unprocessed` spans (Option
 * A: words the understanding did not get to) become their own runs. Where one lies under a kept span the
 * run says both (one sentence can hold a kept thing and one not got to; founder review of PR #58): the
 * kept mark stays, and the not-got-to is shown on it, never hidden by it.
 */
export function runsOf(
  text: string,
  spans: { start: number; end: number }[],
  unprocessed: { start: number; end: number }[] = [],
): { text: string; marked: boolean; unprocessed?: boolean }[] {
  const toRanges = (list: { start: number; end: number }[]) => {
    const ranges = list
      .map((s) => [codePointToUtf16(text, s.start), codePointToUtf16(text, s.end)] as const)
      .filter(([a, b]) => b > a)
      .sort((x, y) => x[0] - y[0]);
    const merged: [number, number][] = [];
    for (const [a, b] of ranges) {
      const last = merged[merged.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
    }
    return merged;
  };
  const kept = toRanges(spans);
  const left = toRanges(unprocessed);
  const edges = [...new Set([0, text.length, ...kept.flat(), ...left.flat()])].sort((x, y) => x - y);
  const within = (ranges: [number, number][], a: number, b: number) => ranges.some(([ra, rb]) => ra <= a && b <= rb);
  const runs: { text: string; marked: boolean; unprocessed?: boolean }[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const [a, b] = [edges[i], edges[i + 1]];
    if (b <= a) continue;
    const marked = within(kept, a, b);
    const open = within(left, a, b);
    const last = runs[runs.length - 1];
    if (last && last.marked === marked && (last.unprocessed ?? false) === open) last.text += text.slice(a, b);
    else runs.push({ text: text.slice(a, b), marked, ...(open ? { unprocessed: true } : {}) });
  }
  return runs;
}

// ─── Actions beyond Understanding ───────────────────────────────────────

export function useV2Actions() {
  const { store, reasonLocal } = useV2Session();
  return {
    addPerson: async (name: string) => {
      return repositoriesFor(store).people.add({ display_name: name.normalize("NFC").trim() });
    },
    deleteNote: async (captureId: string) => {
      await repositoriesFor(store).captures.remove(captureId);
      track("deletion_completed", { scope: "capture" });
    },
    settleConflict: (id: number, choice: "keep_current" | "use_mine") => repositoriesFor(store).conflicts.resolve(id, choice),
    /** Correct a person's name: same person, same memories (H1). */
    rename: (personId: string, name: string) => repositoriesFor(store).people.rename(personId, name),
    /** "Remove from People" (founder I3): a soft archive; nothing is deleted. */
    removePerson: (personId: string) => repositoriesFor(store).people.archive(personId),
    /** "Bring back": the same person, with everything they had (I3). */
    bringBack: (personId: string) => repositoriesFor(store).people.restore(personId),
    /** A conversation Kinship couldn't know about, in the user's own word (founder I2). Nothing else is asked. */
    inTouch: (personId: string, channel: "text" | "call" | "video" | "in_person") =>
      repositoriesFor(store).contacts.confirm({ person_id: personId, channel, source: "manual" }),
    /**
     * A conversation recorded by mistake (founder I2): it leaves the trail, and
     * a "Waiting on …" it answered may ask again, on this phone as everywhere.
     */
    forgetConversation: (id: string) => forgetConversation({ local: reasonLocal, contacts: repositoriesFor(store).contacts }, id),
  };
}

/** People removed from People (founder I3), for Settings' Bring back; never anywhere else. */
export function useRemovedPeople(): Person[] {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) =>
    (await repos.people.list())
      .filter((p) => p.state === "archived" && !p.deleted_at)
      .sort((a, b) => a.display_name.localeCompare(b.display_name)));
  return q.data ?? [];
}

// ─── Today ──────────────────────────────────────────────────────────────

/** Today's view: the one moment, the return check, at most two quiet lines. */
export function useToday(
  questions: number,
  toLookAt: number,
  now: Date,
  pending?: TodayInput["pending"],
): TodayView | null {
  const { store, reasonLocal } = useV2Session();
  const activation = useActivation();
  const minute = Math.floor(now.getTime() / 60_000);
  const q = useStoreQuery(store, async (repos) => {
    const reasons = (await store.list("reasons")) as unknown as ReasonRow[];
    const people = await repos.people.list();
    const items = ((await store.list("memory_items")) as MemoryItem[]).map((m) => voiced(m, people))
      .filter((m) => !misfiled(m, people));
    const told = (await repos.captures.list()).length;
    const local = await reasonLocal.read();
    // H9: until the first sync, an existing account's people and notes aren't here yet.
    const synced = !!(await getMeta(store.db, "last_sync_ok_at"));
    const dataKnown = synced || (activation.activation !== null && !activation.activated);
    // Where each line Today may show came from (the moment, a Coming up line,
    // its detail: founder I1), and the note's own words behind it (H16 reads
    // milestones from those, never from Kinship's wording alone).
    const byItem = await repos.memory.sourcesByItem();
    const origins = new Map(items.map((m) => [m.id, m.origin]));
    const prov = new Map<string, { line: string; noteId: string | null }>();
    const provenance = (id: string) => {
      if (!prov.has(id)) {
        const sources = byItem.get(id) ?? [];
        if (!sources.length && !origins.has(id)) return null;
        const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id)
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        const origin = origins.get(id);
        prov.set(id, {
          line: provenanceLine(sources.map((s) => ({
            source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at),
          })), now, typeof origin === "string" ? origin : null),
          noteId: notes[0]?.capture_id ?? null,
        });
      }
      return prov.get(id) ?? null;
    };
    const quotes = (id: string) => (byItem.get(id) ?? [])
      .filter((s) => s.source_kind === "capture" && !s.deleted_at && typeof s.quote === "string")
      .map((s) => String(s.quote));
    // Conversations the user confirmed: a "Waiting on …" already acted on doesn't keep asking (K3).
    const contacts = (await store.list("contact_events")) as unknown as ContactRow[];
    return buildToday({
      now, today: todayIso(now), reasons, items, people, local: local.local, primaries: local.primaries,
      handoff: local.handoff, told, questions, toLookAt, provenance, quotes, contacts,
      activated: activation.activated, firstName: activation.firstName, pending, dataKnown,
      bringBack: { activatedAt: activation.activation?.activated_at ?? null, seen: !!activation.activation?.bring_back_at },
    });
  }, [questions, toLookAt, minute, activation.activated, activation.firstName, activation.activation === null,
    activation.activation?.activated_at, activation.activation?.bring_back_at, JSON.stringify(pending ?? null)]);
  return q.data ?? null;
}

/** What Today can do: refresh reasons, mark one shown, put it aside, hand off, answer the return check. */
export function useTodayActions() {
  const { store, reasons, reasonLocal } = useV2Session();
  const loop = {
    local: reasonLocal, contacts: repositoriesFor(store).contacts, now: () => new Date(),
    record: (id: string, event: Parameters<typeof reasons.record>[1], channel?: string) => reasons.record(id, event, channel),
  };
  return {
    refresh: (force = false) => reasons.refresh({ force, timeZone: timeZone() ?? null }),
    shown: async (m: { reasonId: string; personId: string; type: TodayReasonType; score: number }) => {
      const before = (await reasonLocal.read()).local[m.reasonId]?.firstShown;
      await reasonLocal.shown(m.reasonId, m.personId, todayIso());
      if (!before) {
        if (!isLocalReason(m.reasonId)) reasons.record(m.reasonId, "shown");
        track("reason_surfaced", { reason_type: reasonTypeName(m.type), surface: "today", score_bucket: scoreBucket(m.score) });
      }
    },
    notNow: async (m: { reasonId: string; type: TodayReasonType }) => {
      await reasonLocal.dismissed(m.reasonId, new Date().toISOString());
      if (!isLocalReason(m.reasonId)) reasons.record(m.reasonId, "dismissed_not_now");
      track("reason_dismissed", { reason_type: reasonTypeName(m.type), mode: "not_now" });
    },
    /** A hand-off made by `handoffFor`, remembered before the other app opens. */
    handedOff: async (h: Omit<Handoff, "at" | "answered"> & { type: TodayReasonType | "page" }) => {
      await handOff(loop, h);
      track("handoff_opened", { reason_type: reasonTypeName(h.type), channel: h.channel });
    },
    /** The app didn't open: nothing was handed off after all (the Moment may speak again, also after a sync). */
    handoffFailed: (reasonId: string) => cancelHandOff(loop, reasonId),
    /** "Yes": the one place a conversation is recorded (plan §15, founder I2); answered once. */
    returned: async (answer: "yes" | "not_yet") => {
      const h = await answerReturn(loop, answer);
      if (h) track("return_check_answered", { answer, minutes_since_handoff_bucket: minutesBucket(Date.now() - Date.parse(h.at)) });
      return h;
    },
    linkContact: (personId: string, contactId: string) => store.update("people", personId, { contact_ref: contactId }),
  };
}

// ─── People and the relationship page ───────────────────────────────────

const LIVE_KINDS = ["fact", "thread", "event", "plan", "moment", "milestone", "promise", "context", "tradition"];

/** A statement kept on one person that plainly leads with another (founder native pass F4). */
function misfiled(m: MemoryItem, people: Person[]): boolean {
  const person = people.find((p) => p.id === m.person_id);
  return !!person && !!misfiledOn(m, person, people);
}

function liveItem(m: MemoryItem): boolean {
  return (m.status === "active" || m.status === "resolved") && !m.deleted_at;
}

export interface PeopleRowData {
  person: Person;
  label: string;
  /** One live line: the newest thing told about them (never a sensitive one). */
  line: string | null;
}

export function usePeopleRows(): PeopleRowData[] {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const people = (await repos.people.list()).filter((p) => p.state !== "archived" && !p.deleted_at);
    const items = ((await store.list("memory_items")) as MemoryItem[])
      .filter((m) => liveItem(m) && m.status === "active" && m.sensitivity === "none" && LIVE_KINDS.includes(m.kind))
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    const all = await repos.people.list();
    const newest = new Map<string, string>();
    // A person's row shows their own news first; a relative's ("Michelle's
    // sister Ana had a baby") only when there's nothing else (founder G42).
    const own = (m: MemoryItem) => m.subject_type !== "related";
    for (const m of items) if (own(m) && !newest.has(m.person_id) && !misfiled(m, all)) newest.set(m.person_id, voiced(m, all).statement);
    for (const m of items) if (!newest.has(m.person_id) && !misfiled(m, all)) newest.set(m.person_id, voiced(m, all).statement);
    return people
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .map((p) => ({ person: p, label: personLabel(p, people), line: newest.get(p.id) ?? null }));
  });
  return q.data ?? [];
}

export type { Portrait, PortraitLine } from "@/features/person/portraitModel";

/**
 * The relationship page as a portrait (Design Direction §I.7; board 2). The
 * sectioning and density rules live in portraitModel.ts
 * (docs/product/relationship-page-rules.md); this only gathers the data.
 */
export function usePortrait(personId: string): Portrait & { loading: boolean } {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const people = await repos.people.list();
    const person = people.find((p) => p.id === personId && !p.deleted_at) ?? null;
    return portraitFor(repos, person, new Date());
  }, [personId]);
  // Still being read is never "isn't here any more" (a large account on a phone takes a moment).
  return q.data ? { ...q.data, loading: false } : { ...buildPortrait({ person: null, items: [], today: todayIso() }), loading: true };
}

/**
 * A person's page (founder K23, K28): the return question about them, wherever the hand-off started, and
 * what a Message or Call from the page carries: the same reason Today's line about it has when there is
 * something to act on, else the page's own return check and nothing more (never for someone remembered,
 * paused or removed). `now` is the screen's clock, read again when the app comes back.
 */
export function usePersonReturn(personId: string, now: Date): { returnCheck: ReturnView | null; reason: PageHandoffReason | null; mention: Mentions } {
  const { store, reasonLocal } = useV2Session();
  const minute = Math.floor(now.getTime() / 60_000);
  const q = useStoreQuery(store, async (repos) => {
    const people = await repos.people.list();
    const person = people.find((p) => p.id === personId && !p.deleted_at) ?? null;
    if (!person) return { returnCheck: null, reason: null, mention: { lines: [], opener: null } };
    const { handoff } = await reasonLocal.read();
    // Said the way Today says it ("Call John", never "You need to call John").
    const all = ((await store.list("memory_items")) as MemoryItem[]).map((m) => voiced(m, people));
    const items = all.filter((m) => m.person_id === personId);
    const reason = pageHandoffFor(items, person, todayIso(now));
    const about = reason && reason.type !== "page" ? items.find((m) => m.id === reason.itemId) ?? null : null;
    return {
      returnCheck: handoff?.personId === personId ? returnViewFor(handoff, person, now) : null,
      reason,
      // What to mention (K26): theirs and what is shared with them, about the hand-off's subject first.
      mention: mentionsFor({ items: all.filter((m) => peopleOf(m).includes(personId)), person, today: todayIso(now), about }),
    };
  }, [personId, minute]);
  return q.data ?? { returnCheck: null, reason: null, mention: { lines: [], opener: null } };
}

// ─── Someone added after they were mentioned (G20) ──────────────────────

const LINKS_ANSWERED = "person_links_answered";

/** Yes to "Is this the Josh in …?": the same memory is about them too, or the related person is them; never a copy. */
export async function acceptLink(store: UserStore, personId: string, s: LinkSuggestion): Promise<void> {
  if (s.kind === "related") {
    await store.update("related_people", s.targetId, { promoted_person_id: personId });
    return;
  }
  const item = (await store.get("memory_items", s.targetId)) as MemoryItem | null;
  if (!item) return;
  const others = Array.isArray(item.with_person_ids) ? item.with_person_ids : [];
  await store.update("memory_items", s.targetId, { with_person_ids: [...new Set([...others, personId])] });
}

/** "Is this the Michelle in 'Sam is married to Michelle'?" on Michelle's page, once. */
export function usePersonLinks(personId: string) {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const people = await repos.people.list();
    const person = people.find((p) => p.id === personId && !p.deleted_at);
    if (!person) return [];
    const answered = new Set<string>(JSON.parse((await getMeta(store.db, LINKS_ANSWERED)) ?? "[]") as string[]);
    // Never asked about memories that left with someone removed from People (I3).
    const removed = new Set(people.filter((p) => p.state === "archived").map((p) => p.id));
    const items = ((await store.list("memory_items")) as MemoryItem[]).filter((m) => !removed.has(m.person_id)).map((m) => voiced(m, people));
    return linkSuggestions({ person, people, items, related: await repos.people.related(), answered });
  }, [personId]);
  const remember = async (key: string) => {
    const answered = JSON.parse((await getMeta(store.db, LINKS_ANSWERED)) ?? "[]") as string[];
    await setMeta(store.db, LINKS_ANSWERED, JSON.stringify([...new Set([...answered, key])]));
    store.notify();
  };
  return {
    suggestions: q.data ?? [],
    yes: async (s: LinkSuggestion) => {
      await acceptLink(store, personId, s);
      await remember(s.key);
    },
    no: (s: LinkSuggestion) => remember(s.key),
  };
}

/** The portrait from the store (also used by tests and the dense-Tell proof). */
export async function portraitFor(repos: Repositories, person: Person | null, now: Date): Promise<Portrait> {
  const today = todayIso(now);
  if (!person) return buildPortrait({ person: null, items: [], today });
  const items: PortraitItem[] = [];
  const byItem = await repos.memory.sourcesByItem();
  const people = await repos.people.list();
  const all = (await repos.memory.aboutPerson(person.id));
  const earlier = new Map<string, string>();
  for (const m of all) {
    if (typeof m.supersedes_id !== "string" || earlier.has(m.supersedes_id)) continue;
    const prev = await repos.memory.get(m.supersedes_id);
    if (prev && !prev.deleted_at) earlier.set(m.supersedes_id, voiced(prev, people).statement);
  }
  for (const stored of all) {
    const item = voiced(stored, people);
    // Plainly about someone else: not on this portrait (it stays in What Kinship knows).
    if (misfiledOn(item, person, people)) continue;
    const sources = byItem.get(item.id) ?? [];
    const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    items.push({
      item,
      when: whenLabel(item.kind, (item.detail ?? {}) as Record<string, unknown>, today),
      provenance: provenanceLine(sources.map((s) => ({
        source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at),
      })), now, typeof item.origin === "string" ? item.origin : null),
      noteId: notes[0]?.capture_id ?? null,
      // A change reads as a change (H23): what it replaced, quietly.
      was: typeof item.supersedes_id === "string" ? (earlier.get(item.supersedes_id) ?? null) : null,
    });
  }
  // Their birthday, from their record, when it's within a month.
  let birthday: PortraitLine | null = null;
  let birthdayDay: string | null = null;
  if (person.birthday && person.birthday_source && person.state === "active") {
    const next = nextBirthday(String(person.birthday), today);
    const days = Math.round((Date.parse(`${next}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
    if (days <= PORTRAIT_RULES.birthdayDays) {
      const first = shortName(person) || person.display_name;
      birthdayDay = next;
      birthday = {
        itemId: "birthday",
        statement: `${first}'s birthday`,
        when: days === 0 ? "Today" : dayMonth(next),
        provenance: person.birthday_source === "contacts" ? "From Contacts"
          : person.birthday_source === "capture" ? "You told Kinship" : "You added this",
        noteId: person.birthday_source === "capture" && typeof person.birthday_capture_id === "string" ? person.birthday_capture_id : null,
        fixed: true,
      };
    }
  }
  // The conversations the user confirmed (founder I2), under Between you;
  // "You reached out · <date>" under the name is gone with it (CC-20).
  const contacts = (await repos.contacts.forPerson(person.id)) as unknown as ContactEventRow[];
  const trail = trailFor(contacts, all.map((m) => voiced(m, people)), person, now);
  const reached = reachedAbout(contacts, all, (iso) => todayIso(new Date(iso)));
  return buildPortrait({ person, items, today, birthday, birthdayDay, trail, reached });
}

/** Every conversation the user confirmed with them, for What Kinship knows (founder I2). */
export async function trailOf(repos: Repositories, personId: string, now: Date): Promise<TrailLine[]> {
  const person = (await repos.people.list()).find((p) => p.id === personId && !p.deleted_at);
  if (!person) return [];
  const contacts = (await repos.contacts.forPerson(personId)) as unknown as ContactEventRow[];
  const people = await repos.people.list();
  return trailFor(contacts, (await repos.memory.aboutPerson(personId)).map((m) => voiced(m, people)), person, now);
}

export function useTrail(personId: string): TrailLine[] {
  const { store } = useV2Session();
  const q = useStoreQuery(store, (repos) => trailOf(repos, personId, new Date()), [personId]);
  return q.data ?? [];
}

/** One remembered item, for its correction sheet. */
/**
 * Where "View Ben" lands for a memory (founder I1, J3): that line on Ben's
 * page; in What Kinship knows when the page doesn't show it (never the top of
 * a long page by surprise); Ben's page when there's no line to land on.
 */
export async function personFocusHref(repos: Repositories, personId: string, itemId: string | null, now: Date): Promise<string> {
  const base = `/v2/person/${personId}`;
  if (!itemId) return base;
  const people = await repos.people.list();
  const person = people.find((p) => p.id === personId && !p.deleted_at) ?? null;
  if (!person) return base;
  if (portraitShows(await portraitFor(repos, person, now), itemId)) return `${base}?item=${encodeURIComponent(itemId)}`;
  if (itemId === "birthday") return base;
  // What Kinship knows lists every current line (as recordFor does).
  const item = (await repos.memory.aboutPerson(personId))
    .find((m) => m.id === itemId && !m.deleted_at && (m.status === "active" || m.status === "resolved"));
  return item ? `${base}/knows?item=${encodeURIComponent(itemId)}` : base;
}

export function usePersonFocus(): (personId: string, itemId: string | null) => Promise<string> {
  const { store } = useV2Session();
  return useCallback((personId: string, itemId: string | null) => personFocusHref(repositoriesFor(store), personId, itemId, new Date()), [store]);
}

export function useItemLine(itemId: string | null): { line: ItemLine; provenance: string; noteId: string | null } | null {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    if (!itemId) return null;
    const stored = (await store.get("memory_items", itemId)) as MemoryItem | null;
    if (!stored || !liveItem(stored)) return null;
    const people = await repos.people.list();
    const item = voiced(stored, people);
    const related = await repos.people.related();
    const sources = await repos.memory.sourcesFor(item.id);
    const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const now = new Date();
    return {
      line: { ...itemLine(item, { people, related, today: todayIso(now), earlier: await earlierOf(repos, [item]) }), editedFrom: editedFrom(sources) },
      provenance: provenanceLine(sources.map((s) => ({
        source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at),
      })), now, typeof item.origin === "string" ? item.origin : null),
      noteId: notes[0]?.capture_id ?? null,
    };
  }, [itemId]);
  return q.data ?? null;
}

// ─── Unsent Tells ───────────────────────────────────────────────────────

const DRAFTS = "tell_drafts";
const DRAFT_SAVE_MS = 400;

/**
 * Unsent Tells, by where they were started (general, or one person). Kept in
 * this account's own encrypted store, so a draft survives closing the app
 * and never reaches another account.
 */
export function useTellDrafts(): { drafts: Drafts; set: (key: string, text: string) => void } {
  const { store } = useV2Session();
  const [drafts, setDrafts] = useState<Drafts>({});
  const loaded = useRef(false);
  useEffect(() => {
    let live = true;
    void getMeta(store.db, DRAFTS).then((raw) => {
      if (!live) return;
      loaded.current = true;
      // Words typed before the saved drafts loaded win over the saved copy.
      setDrafts((now) => ({ ...parseDrafts(raw), ...now }));
    }).catch(() => {
      loaded.current = true;
    });
    return () => {
      live = false;
    };
  }, [store]);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      void setMeta(store.db, DRAFTS, JSON.stringify(drafts)).catch(() => undefined);
    }, DRAFT_SAVE_MS);
    return () => clearTimeout(t);
  }, [drafts, store]);
  const set = useCallback((key: string, text: string) => setDrafts((d) => withDraft(d, key, text)), []);
  return { drafts, set };
}

// ─── The one-time understanding consent (D2, D3) ────────────────────────

const CONSENT_ASKED = "ai_consent_asked";

/** Whether to ask now: understanding is on for this account, not yet allowed, and never asked on this device. */
export function useConsentAsk(): { ask: boolean; answer: (allow: boolean) => Promise<void> } {
  const { store } = useV2Session();
  const { extractionOn } = useTell();
  const q = useStoreQuery(store, async (repos) => {
    const s = await repos.settings.get();
    const allowed = s?.ai_consent === true && Number(s.ai_consent_version ?? 0) >= AI_CONSENT_VERSION;
    // "Keep notes as written", said on another phone, is an answer too.
    const declined = s?.ai_consent === false && !!s?.ai_consent_updated_at;
    // The account's own answer isn't on this phone yet (signed in, first sync
    // still on its way): never ask on a guess (stabilization Gate C).
    const known = !!s;
    return { allowed, known, asked: declined || (await getMeta(store.db, CONSENT_ASKED)) === "1" };
  });
  return {
    // Setup asks first (recovery Gate 3); this only catches a choice that
    // couldn't be saved then, or understanding offered after setup.
    ask: extractionOn && q.data !== undefined && q.data.known && !q.data.allowed && !q.data.asked,
    answer: async (allow: boolean) => {
      await setAIEnabled(allow);
      await setMeta(store.db, CONSENT_ASKED, "1");
      store.notify();
    },
  };
}

/** Understanding on or off (D3: revocable in Settings, enforced at the gateway). */
export function useUnderstandingConsent(): { allowed: boolean | null; set: (allow: boolean) => Promise<void> } {
  const { store, understanding } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const s = await repos.settings.get();
    return s?.ai_consent === true && Number(s.ai_consent_version ?? 0) >= AI_CONSENT_VERSION;
  });
  return {
    allowed: q.data ?? null,
    set: async (allow: boolean) => {
      await setAIEnabled(allow);
      await setMeta(store.db, "ai_consent_asked", "1");
      // Pull the server's copy so the device agrees at once.
      understanding.run().catch(() => undefined);
      store.notify();
    },
  };
}

// ─── Setup (plan E16; contract §8; recovery Gate 3) ─────────────────────

/** How long setup waits for the server before deciding an older account with no record. */
const SETUP_SYNC_WAIT_MS = 5000;

export type SetupGate = "checking" | "needed" | "done";

/** Whether understanding is offered to this account and it hasn't answered yet. */
function useConsentAnswered(): boolean | undefined {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const s = await repos.settings.get();
    const allowed = s?.ai_consent === true && Number(s.ai_consent_version ?? 0) >= AI_CONSENT_VERSION;
    const declined = s?.ai_consent === false && !!s?.ai_consent_updated_at;
    return allowed || declined || (await getMeta(store.db, CONSENT_ASKED)) === "1";
  });
  return q.data;
}

/** What setup has to ask this account (name only if sign-in didn't give one; consent only if offered and unanswered). */
function useSetupNeeds(act: ActivationState): SetupNeeds | null {
  const { userId } = useV2Session();
  const extractionOn = isOn(useFlags(userId), "ai_extraction");
  const answered = useConsentAnswered();
  if (answered === undefined) return null;
  return { name: !act.firstName, consent: extractionOn && !answered };
}

/**
 * Whether this account still needs setup, from its explicit record
 * (src/features/setup/activation.ts), never from what it happens to hold.
 * An account from before the record existed is decided once (after one
 * sync), recorded, and from then on follows the record like any other.
 * Decided once per visit: after "done" it stays done until the app reopens.
 */
export function useSetupGate(): SetupGate {
  const { store, understanding } = useV2Session();
  const act = useActivation();
  const needs = useSetupNeeds(act);
  const [gate, setGate] = useState<SetupGate>("checking");
  const adopting = useRef(false);

  useEffect(() => {
    if (!act.loaded || act.activation || adopting.current) return;
    adopting.current = true;
    void (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        understanding.run().catch(() => undefined),
        new Promise((r) => {
          timer = setTimeout(r, SETUP_SYNC_WAIT_MS);
        }),
      ]);
      clearTimeout(timer);
      const repos = repositoriesFor(store);
      const people = (await repos.people.list()).filter((p) => !p.deleted_at && p.state !== "archived").length;
      const memories = ((await store.list("memory_items")) as MemoryItem[]).filter((m) => liveItem(m)).length;
      const s = await repos.settings.get();
      const consentAnswered = (s?.ai_consent === true && Number(s.ai_consent_version ?? 0) >= AI_CONSENT_VERSION) ||
        (s?.ai_consent === false && !!s?.ai_consent_updated_at) || (await getMeta(store.db, CONSENT_ASKED)) === "1";
      await act.adopt(legacyActivation({ people, memories, consentAnswered, nameKnown: !!act.firstName }, new Date().toISOString()));
    })().catch(() => act.adopt(NO_ACTIVATION));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act.loaded, !!act.activation]);

  useEffect(() => {
    if (gate === "done" || !needs || !act.activation) return;
    setGate(setupFinished(needs, act.activation) ? "done" : "needed");
  }, [gate, needs?.name, needs?.consent, act.activation]);
  return gate;
}

/** The steps, where this account is in them, and the writes setup makes. */
export function useSetup() {
  const { store } = useV2Session();
  const act = useActivation();
  const needs = useSetupNeeds(act);
  const q = useStoreQuery(store, async (repos) =>
    (await repos.people.list()).filter((p) => !p.deleted_at && p.state !== "archived"));
  const steps = needs ? setupStepsFor(needs, act.activation) : [];
  return {
    ready: act.loaded && !!needs && q.data !== undefined,
    steps,
    /** The first step still to do (null: setup is finished). */
    next: needs ? nextStep(needs, act.activation) : null,
    people: q.data ?? [],
    firstName: act.firstName,
    record: act.record,
    saveFirstName: act.saveFirstName,
    /** Saves the people the user picked, skipping anyone already here. */
    savePicked: async (rows: PickRow[]) => {
      const repos = repositoriesFor(store);
      const have = new Set((await repos.people.list()).map((p) => p.id));
      for (const r of rows) {
        if (have.has(r.personId)) continue;
        await repos.people.addPicked({
          id: r.personId, name: r.name, contactId: r.contactId, birthday: r.birthday, birthdayYearKnown: r.birthdayYearKnown,
        });
      }
    },
  };
}

/** What the picker must leave out: people already here, by contact and by name. */
export function useExistingPeople(): { contactRefs: Set<string>; names: Set<string> } {
  const people = usePeople();
  return {
    contactRefs: new Set(people.map((p) => p.contact_ref).filter((x): x is string => typeof x === "string")),
    names: new Set(people.map((p) => p.display_name.toLocaleLowerCase())),
  };
}

/** Whether the user has ever told Kinship anything (first use vs a quiet day). */
export function useToldCount(): number {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => (await repos.captures.list()).length);
  return q.data ?? 0;
}
