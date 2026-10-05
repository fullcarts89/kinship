// The read side and actions for the 2.0 screens (plan §11: screens → hooks →
// repositories). Everything re-reads when the user's store changes: a local
// write, a sync, or a step of Understanding.

import { useCallback, useEffect, useRef, useState } from "react";
import { codePointToUtf16 } from "../../supabase/functions/_shared/spans";
import { arrivedLabel, momentLabel, provenanceLine, whenLabel } from "@/features/memory/format";
import type { NoteData } from "@/features/person/NoteView";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { buildToday, evidenceOf, isBirthdayReason, type Handoff, type ReasonRow, type ReasonType as TodayReasonType, type TodayView } from "@/features/today/todayModel";
import { buildPortrait, PORTRAIT_RULES, type Portrait, type PortraitItem, type PortraitLine } from "@/features/person/portraitModel";
import { dayMonth, needsSetup, nextBirthday, type PickRow, type SetupStep } from "@/features/setup/setupModel";
import { buildReview, itemLine, personLabel, type ItemLine, type ReviewView } from "@/features/tell/reviewModel";
import { parseDrafts, withDraft, type Drafts } from "@/features/tell/drafts";
import { AI_CONSENT_VERSION, setAIEnabled } from "@/lib/aiPreferences";
import { getMeta, setMeta } from "@/store/schema";
import { charsBucket, minutesBucket, reasonTypeName, scoreBucket, track } from "@/platform/analytics";
import { useV2Session } from "@/providers/V2SessionProvider";
import { CONFLICT_TITLE, describeConflict } from "@/store/conflictCopy";
import { isOn } from "@/store/flags";
import { repositoriesFor, type MemoryItem, type Person, type Repositories } from "@/store/repositories";
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
  const keep = useCallback(async (text: string, contextPersonId?: string | null, source: "text" | "onboarding" = "text"): Promise<string> => {
    const capture = await repositoriesFor(store).captures.tell(text, {
      aiEnabled: ai, timeZone: timeZone(), contextPersonId: contextPersonId ?? undefined, source,
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
  const q = useStoreQuery(store, (repos) => recordFor(repos, personId, new Date()), [personId]);
  return q.data ?? { person: null, lines: [] as RecordLine[] };
}

/** What Kinship knows about someone: every live item, newest first, with its source (the hook and tests share it). */
export async function recordFor(repos: Repositories, personId: string, now: Date): Promise<{ person: Person | null; lines: RecordLine[] }> {
  const people = await repos.people.list();
  const person = people.find((p) => p.id === personId) ?? null;
  if (!person) return { person: null, lines: [] as RecordLine[] };
  const related = await repos.people.related();
  const items = (await repos.memory.forPerson(personId))
    .filter((m) => m.status === "active" || m.status === "resolved")
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const lines: RecordLine[] = [];
  const byItem = await repos.memory.sourcesByItem();
  for (const item of items) {
    const sources = byItem.get(item.id) ?? [];
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
    arrived: `${arrivedLabel(capture.source)} · ${momentLabel(String(capture.created_at ?? capture.occurred_at), now)}`,
    items,
  };
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
    addPerson: async (name: string) => {
      return repositoriesFor(store).people.add({ display_name: name.normalize("NFC").trim() });
    },
    deleteNote: async (captureId: string) => {
      await repositoriesFor(store).captures.remove(captureId);
      track("deletion_completed", { scope: "capture" });
    },
    settleConflict: (id: number, choice: "keep_current" | "use_mine") => repositoriesFor(store).conflicts.resolve(id, choice),
  };
}

// ─── Today ──────────────────────────────────────────────────────────────

/** Today's view: the one moment, the return check, at most two quiet lines. */
export function useToday(questions: number, toLookAt: number, now: Date): TodayView | null {
  const { store, reasonLocal } = useV2Session();
  const minute = Math.floor(now.getTime() / 60_000);
  const q = useStoreQuery(store, async (repos) => {
    const reasons = (await store.list("reasons")) as unknown as ReasonRow[];
    const items = (await store.list("memory_items")) as MemoryItem[];
    const people = await repos.people.list();
    const told = (await repos.captures.list()).length;
    const local = await reasonLocal.read();
    // Provenance only for what a reason cites (the moment's line).
    const cited = new Set(reasons.map(evidenceOf).filter((x): x is string => !!x));
    const prov = new Map<string, { line: string; noteId: string | null }>();
    const byItem = await repos.memory.sourcesByItem();
    for (const id of cited) {
      const sources = byItem.get(id) ?? [];
      const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      prov.set(id, {
        line: provenanceLine(sources.map((s) => ({
          source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at),
        })), now),
        noteId: notes[0]?.capture_id ?? null,
      });
    }
    return buildToday({
      now, today: todayIso(now), reasons, items, people, local: local.local, primaries: local.primaries,
      handoff: local.handoff, told, questions, toLookAt, provenance: (id) => prov.get(id) ?? null,
    });
  }, [questions, toLookAt, minute]);
  return q.data ?? null;
}

/** What Today can do: refresh reasons, mark one shown, put it aside, hand off, answer the return check. */
export function useTodayActions() {
  const { store, reasons, reasonLocal } = useV2Session();
  return {
    refresh: (force = false) => reasons.refresh({ force, timeZone: timeZone() ?? null }),
    shown: async (m: { reasonId: string; personId: string; type: TodayReasonType; score: number }) => {
      const before = (await reasonLocal.read()).local[m.reasonId]?.firstShown;
      await reasonLocal.shown(m.reasonId, m.personId, todayIso());
      if (!before) {
        if (!isBirthdayReason(m.reasonId)) reasons.record(m.reasonId, "shown");
        track("reason_surfaced", { reason_type: reasonTypeName(m.type), surface: "today", score_bucket: scoreBucket(m.score) });
      }
    },
    notNow: async (m: { reasonId: string; type: TodayReasonType }) => {
      await reasonLocal.dismissed(m.reasonId, new Date().toISOString());
      if (!isBirthdayReason(m.reasonId)) reasons.record(m.reasonId, "dismissed_not_now");
      track("reason_dismissed", { reason_type: reasonTypeName(m.type), mode: "not_now" });
    },
    handedOff: async (h: { reasonId: string; personId: string; channel: Handoff["channel"]; type: TodayReasonType }) => {
      await reasonLocal.handedOff({ reasonId: h.reasonId, personId: h.personId, channel: h.channel, at: new Date().toISOString() });
      if (!isBirthdayReason(h.reasonId)) reasons.record(h.reasonId, "acted", h.channel);
      track("handoff_opened", { reason_type: reasonTypeName(h.type), channel: h.channel });
    },
    /** "Yes": the one place a connection is recorded (plan §15). */
    returned: async (answer: "yes" | "not_yet") => {
      const h = await reasonLocal.answered(answer, new Date().toISOString());
      if (!h) return null;
      if (!isBirthdayReason(h.reasonId)) reasons.record(h.reasonId, answer === "yes" ? "return_yes" : "return_not_yet");
      track("return_check_answered", { answer, minutes_since_handoff_bucket: minutesBucket(Date.now() - Date.parse(h.at)) });
      if (answer === "yes") {
        // A birthday moment is worked out on this phone and has no server
        // reason to name, so its "Yes" is recorded as the user's own word
        // (manual). Server birthday reasons (RSN-05) will carry the reason.
        await repositoriesFor(store).contacts.confirm(isBirthdayReason(h.reasonId)
          ? { person_id: h.personId, channel: h.channel, source: "manual" }
          : { person_id: h.personId, channel: h.channel, source: "return_check", reason_id: h.reasonId });
      }
      return h;
    },
    linkContact: (personId: string, contactId: string) => store.update("people", personId, { contact_ref: contactId }),
  };
}

// ─── People and the relationship page ───────────────────────────────────

const LIVE_KINDS = ["fact", "thread", "event", "plan", "moment", "milestone", "promise", "context", "tradition"];

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
    const newest = new Map<string, string>();
    for (const m of items) if (!newest.has(m.person_id)) newest.set(m.person_id, m.statement);
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
export function usePortrait(personId: string): Portrait {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    const people = await repos.people.list();
    const person = people.find((p) => p.id === personId && !p.deleted_at) ?? null;
    return portraitFor(repos, person, new Date());
  }, [personId]);
  return q.data ?? buildPortrait({ person: null, items: [], today: todayIso() });
}

/** The portrait from the store (also used by tests and the dense-Tell proof). */
export async function portraitFor(repos: Repositories, person: Person | null, now: Date): Promise<Portrait> {
  const today = todayIso(now);
  if (!person) return buildPortrait({ person: null, items: [], today });
  const items: PortraitItem[] = [];
  const byItem = await repos.memory.sourcesByItem();
  for (const item of await repos.memory.forPerson(person.id)) {
    const sources = byItem.get(item.id) ?? [];
    const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    items.push({
      item,
      when: whenLabel(item.kind, (item.detail ?? {}) as Record<string, unknown>, today),
      provenance: provenanceLine(sources.map((s) => ({
        source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at),
      })), now),
      noteId: notes[0]?.capture_id ?? null,
    });
  }
  // Their birthday, from their record, when it's within a month.
  let birthday: PortraitLine | null = null;
  let birthdayDay: string | null = null;
  if (person.birthday && person.birthday_source && person.state === "active") {
    const next = nextBirthday(String(person.birthday), today);
    const days = Math.round((Date.parse(`${next}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
    if (days <= PORTRAIT_RULES.birthdayDays) {
      const first = person.display_name.trim().split(/\s+/u)[0] || person.display_name;
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
  return buildPortrait({ person, items, today, birthday, birthdayDay });
}

/** One remembered item, for its correction sheet. */
export function useItemLine(itemId: string | null): { line: ItemLine; provenance: string; noteId: string | null } | null {
  const { store } = useV2Session();
  const q = useStoreQuery(store, async (repos) => {
    if (!itemId) return null;
    const item = (await store.get("memory_items", itemId)) as MemoryItem | null;
    if (!item || !liveItem(item)) return null;
    const people = await repos.people.list();
    const related = await repos.people.related();
    const sources = await repos.memory.sourcesFor(item.id);
    const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const now = new Date();
    return {
      line: itemLine(item, { people, related, today: todayIso(now) }),
      provenance: provenanceLine(sources.map((s) => ({
        source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at),
      })), now),
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
    return { allowed, asked: (await getMeta(store.db, CONSENT_ASKED)) === "1" };
  });
  return {
    ask: extractionOn && q.data !== undefined && !q.data.allowed && !q.data.asked,
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

// ─── Setup (plan E16; contract §8) ──────────────────────────────────────

const SETUP_DONE = "setup_done";
const SETUP_STEP = "setup_step";
/** How long setup waits for the server before deciding a new phone is a new account. */
const SETUP_SYNC_WAIT_MS = 5000;

export type SetupGate = "checking" | "needed" | "done";

/**
 * Whether this account still needs setup. Decided once per open: a finished
 * setup on this phone; else, after one sync (so a reinstall brings an
 * existing account's people down first), an account with no people and no
 * notes, or a setup that was under way when the app was closed.
 */
export function useSetupGate(): SetupGate {
  const { store, understanding } = useV2Session();
  const [gate, setGate] = useState<SetupGate>("checking");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if ((await getMeta(store.db, SETUP_DONE)) === "1") {
        if (!cancelled) setGate("done");
        return;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        understanding.run().catch(() => undefined),
        new Promise((r) => {
          timer = setTimeout(r, SETUP_SYNC_WAIT_MS);
        }),
      ]);
      clearTimeout(timer);
      const repos = repositoriesFor(store);
      const people = (await repos.people.list()).filter((p) => !p.deleted_at).length;
      const notes = (await repos.captures.list()).length;
      const inProgress = (await getMeta(store.db, SETUP_STEP)) !== null;
      const needed = needsSetup({ done: false, inProgress, people, notes });
      if (!needed) await setMeta(store.db, SETUP_DONE, "1");
      if (!cancelled) setGate(needed ? "needed" : "done");
    })().catch(() => {
      if (!cancelled) setGate("done");
    });
    return () => {
      cancelled = true;
    };
  }, [store, understanding]);
  return gate;
}

/** The steps, the saved place in them, and the writes setup makes. */
export function useSetup() {
  const { store, userId } = useV2Session();
  const extractionOn = isOn(useFlags(userId), "ai_extraction");
  const q = useStoreQuery(store, async (repos) => {
    const s = await repos.settings.get();
    const allowed = s?.ai_consent === true && Number(s.ai_consent_version ?? 0) >= AI_CONSENT_VERSION;
    const asked = (await getMeta(store.db, CONSENT_ASKED)) === "1";
    const people = (await repos.people.list()).filter((p) => !p.deleted_at && p.state !== "archived");
    return {
      saved: await getMeta(store.db, SETUP_STEP),
      needsConsent: extractionOn && !allowed && !asked,
      people,
    };
  }, [extractionOn]);
  return {
    ready: q.data !== undefined,
    saved: q.data?.saved ?? null,
    needsConsent: q.data?.needsConsent ?? false,
    people: q.data?.people ?? [],
    goTo: (step: SetupStep) => setMeta(store.db, SETUP_STEP, step),
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
    finish: async () => {
      await setMeta(store.db, SETUP_DONE, "1");
      store.notify();
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
