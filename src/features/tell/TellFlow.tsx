// Tell, wherever it's told from (plan §7–§8; Checkpoint D1 behaviour, Quiet
// Herbarium placement). The Tell field sits on Today and People and opens
// from a person's page; this keeps one flow for all of them.
//
// One post-Tell contract (stabilization Gate D), always in this order:
//
//   "Understanding…" → the Kept card ("Kept for Ben", what was kept, anyone
//   to add, Correct this · Undo, then feedback; founder I4)
//                    → or the sheet, when Kinship needs the user ("One thing
//                      to check", and why)
//                    → or "Nothing to remember in that one" / "Couldn't
//                      understand this one", the note itself always saved
//
// Durable lifecycle (Gate A): the note's row in the store
// (store/understanding.ts) is the truth; the card and the sheet are only
// views over it. Nothing here runs on a timer: a card stays until the user
// dismisses it, undoes it or tells something else; a sheet stays until the
// user answers, says Done or Not now, or swipes it away. Backgrounding the
// app, a refresh or a sync arriving never decides anything. A question the
// sheet no longer shows still waits, on Today and on the person's page.
//
// The behaviour is D1's, unchanged: what needs the user's yes is never memory
// until they say it; a question is never answered for them.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { ReviewSheet, type Correction } from "@/features/tell/ReviewSheet";
import { todayIso, useOpenNotes, usePending, usePeople, useReview, useTell, useTellDrafts, useUnderstanding, type PendingNote } from "@/hooks/useV2";
import { draftKey } from "./drafts";
import type { ReviewMode, ReviewView } from "./reviewModel";
import type { FeedbackOff } from "@/store/repositories";
import { useActivation } from "@/hooks/useActivation";
import { charsBucket, track } from "@/platform/analytics";
import { onSheetsChange, openSheets } from "@/ui/sheetStack";

/** The Kept card: what happened to the note just told (Gate D). */
export interface KeptCardState {
  captureId: string;
  mode: Exclude<ReviewMode, "none">;
  /** "Kept for Ben"; null while understanding, or when there's nothing kept. */
  heading: string | null;
  /** What was kept, in the user's words (at most three; the rest is "more"). */
  lines: { id: string; statement: string }[];
  more: number;
  /** The kept lines past the first three: "and 1 more" shows them in place (founder J6). */
  rest?: { id: string; statement: string }[];
  /** "Understanding…", "Nothing to remember in that one…", "One thing to check". */
  status: string | null;
  /** Who it belongs with: shown on their page, never on someone else's. */
  personIds: string[];
  /**
   * Named in what was kept but not in People yet ("Pedro"), with the kept
   * lines that name them: the card offers to add them (H21, founder I4).
   */
  newcomers?: { name: string; itemIds: string[] }[];
  /** The user's "Got it right / Not quite", once given (H6). */
  feedback?: ReviewView["feedback"];
}

/** @deprecated kept for the lab: the one-line form of the card. */
export interface KeptLineState {
  captureId: string;
  text: string;
  opens: boolean;
}

export interface TellFlow {
  tellOn: boolean;
  ai: boolean;
  /** Keeps what the user said; resolves once it's safely on the phone. */
  keep: (text: string, contextPersonId?: string | null, source?: "text" | "onboarding") => Promise<boolean>;
  /** The note just told, as a card; null when there's nothing to say about it. */
  card: KeptCardState | null;
  /** Opens what was kept (or the question), to look over or correct. */
  openCard: () => void;
  undoCard: () => void;
  /** "Got it right / Not quite" on what the card kept (H6). */
  rateCard: (verdict: "right" | "not_quite", off?: FeedbackOff) => void;
  /** "Got it": the user has seen what was kept. */
  dismissCard: () => void;
  /** "Add Pedro" on the card (founder I4): in People once, on every kept line that names them. */
  addNewcomer: (name: string, itemIds: string[]) => void;
  /** Every other note still open: understanding, or waiting on the user. */
  pending: PendingNote[];
  /** Notes waiting on the user: a question, or understood while away. */
  questions: string[];
  /**
   * A question is open in the sheet right now. That note is neither the card
   * nor on Today's list, so Today must not call the day quiet behind it
   * (founder I10, as H19 did for the Kept card).
   */
  asking: boolean;
  /**
   * Something from Tell is on screen or open: a Kept card, the review or its
   * details, a question (founder J8). Today never says "Nothing needs you
   * today." behind it.
   */
  attention: boolean;
  toLookAt: string[];
  waitingOffline: boolean;
  openNote: (captureId: string) => void;
  /** Back from "See the note": the question it was opened from comes back. */
  returnFromNote: (captureId: string) => void;
  /** Ask the Tell field to take focus, optionally about someone ("Anything worth remembering?"). */
  focusTell: (personId?: string | null) => void;
  focusRequest: { at: number; personId: string | null } | null;
  /** The unsent words for a Tell about someone (or the general one). */
  draft: (personId?: string | null) => string;
  setDraft: (personId: string | null | undefined, text: string) => void;
}

const Ctx = createContext<TellFlow | null>(null);

export function useTellFlow(): TellFlow {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTellFlow is only available inside the 2.0 shell");
  return v;
}

/** Views a sheet can show; anything else is a passing state it rides over. */
const SHEET_CONTENT: ReviewMode[] = ["sheet", "card", "nothing"];
/** What the card shows for the note just told. */
const CARD_MODES: ReviewMode[] = ["understanding", "card", "nothing", "failed", "asWritten", "sheet"];

export function cardFor(view: ReviewView): KeptCardState | null {
  if (!CARD_MODES.includes(view.mode)) return null;
  const lines = view.mode === "card" ? view.lines.map((l) => ({ id: l.id, statement: l.statement })) : [];
  return {
    captureId: view.captureId,
    mode: view.mode as KeptCardState["mode"],
    heading: view.mode === "card" ? view.heading : null,
    lines: lines.slice(0, 3),
    more: Math.max(0, lines.length - 3),
    rest: lines.slice(3),
    status: view.mode === "card" ? view.status : view.mode === "sheet" ? "One thing to check about what you told me." : view.status,
    personIds: view.personIds,
    feedback: view.feedback ?? null,
    ...(() => {
      const byName = new Map<string, string[]>();
      for (const l of view.lines) for (const name of l.newcomers ?? []) byName.set(name, [...(byName.get(name) ?? []), l.id]);
      return byName.size ? { newcomers: [...byName].map(([name, itemIds]) => ({ name, itemIds })) } : {};
    })(),
  };
}

export function TellFlowProvider({ children }: { children: React.ReactNode }) {
  const u = useUnderstanding();
  const { keep: keepNote, ai, tellOn } = useTell();
  const open = useOpenNotes();
  const pendingAll = usePending();
  const people = usePeople();
  const today = todayIso();
  const [current, setCurrent] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Record<string, true>>({});
  const [parked, setParked] = useState<string | null>(null);
  // The note whose details were opened from its Kept card: closing them goes
  // back to that card, never both at once (founder I9).
  const [fromCard, setFromCard] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<TellFlow["focusRequest"]>(null);
  const currentView = useReview(current);
  const sheetView = useReview(showing);
  // The last view the sheet had something to show: it stays on screen while
  // the next one arrives (an answer saving, a sync in flight), never blank.
  const [lastSheet, setLastSheet] = useState<ReviewView | null>(null);
  const announced = useRef<Record<string, true>>({});
  const drafts = useTellDrafts();
  // The first Tell that becomes memory activates the account (recovery Gate 3).
  const activation = useActivation();
  const activate = activation.activated ? null : activation.activate;

  const openSheet = useCallback((id: string, report = true) => {
    setShowing(id);
    if (report) void u.opened(id);
  }, [u]);

  // A question that arrives by itself waits for any other sheet to be gone
  // (never a sheet on a sheet; see ui/sheetStack.ts). Meanwhile it's on the
  // card, Today and the person's page.
  const [wanted, setWanted] = useState<string | null>(null);
  const showingRef = useRef(showing);
  showingRef.current = showing;
  useEffect(() => {
    if (!wanted) return;
    const tryOpen = () => {
      const ours = showingRef.current ? 1 : 0;
      if (openSheets() - ours > 0) return;
      setWanted(null);
      openSheet(wanted);
    };
    tryOpen();
    return onSheetsChange(tryOpen);
  }, [wanted, openSheet]);

  useEffect(() => {
    if (sheetView && SHEET_CONTENT.includes(sheetView.mode)) setLastSheet(sheetView);
  }, [sheetView]);
  useEffect(() => {
    if (!showing) setLastSheet(null);
  }, [showing]);

  // The note just told, once there's something to say: the card, or the sheet.
  useEffect(() => {
    if (!current || !currentView || announced.current[current]) return;
    const mode = currentView.mode;
    if (mode === "sheet") {
      announced.current[current] = true;
      setWanted(current);
    } else if (mode === "card" || mode === "nothing" || mode === "failed" || mode === "asWritten") {
      announced.current[current] = true;
      // On screen as a card: shown (timed), and never "left open" while it is.
      void u.opened(current);
      if (mode === "card" || mode === "asWritten") void activate?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, currentView, openSheet, u]);

  const finishCard = useCallback((id: string | null, how: "done" | "idle") => {
    if (!id) return;
    void u.finish(id, how);
  }, [u]);

  const close = useCallback((how: "done" | "dismissed") => {
    const id = showing;
    if (!id) return;
    setShowing(null);
    if (fromCard === id) {
      // Back to the Kept card it was opened from, as it was (founder I9):
      // its lines, corrections and "Got it right / Not quite" are all still there.
      setFromCard(null);
      return;
    }
    // What the sheet showed is memory now (held items never are until answered).
    if (sheetView && sheetView.lines.length > 0) void activate?.();
    void u.finish(id, how);
    // Seen in full: no card for it afterwards. A question left waiting is
    // still on Today and the person's page.
    if (how === "done") setDismissed((d) => ({ ...d, [id]: true }));
  }, [showing, fromCard, u, sheetView, activate]);

  const keep = useCallback(async (text: string, contextPersonId?: string | null, source: "text" | "onboarding" = "text") => {
    if (!text.trim()) return false;
    // When Send was tapped, before anything is saved (CC-18 telemetry, content-free).
    const tapped = u.now();
    try {
      const id = await keepNote(text, contextPersonId ?? null, source);
      u.sent(id, tapped);
      // Telling something else is the end of the last card: what it kept stays kept.
      if (current && current !== id && !dismissed[current] && currentView?.mode === "card") finishCard(current, "idle");
      setCurrent(id);
      // Without understanding, the note is kept exactly as written (and that's the account's first memory).
      if (!ai) void activate?.();
      return true;
    } catch {
      Alert.alert("That wasn't kept", "Something went wrong saving it on this phone. Your words are still here.");
      return false;
    }
  }, [keepNote, ai, activate, current, dismissed, currentView?.mode, finishCard, u]);

  const fail = (what: Promise<unknown>) => {
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  };

  const card = current && !dismissed[current] && showing !== current && currentView ? cardFor(currentView) : null;
  const others = (ids: string[]) => ids.filter((id) => id !== current && id !== showing);
  const questions = others(open.questions);
  const toLookAt = others(open.toLookAt);
  const waiting = others(open.waiting);
  const pending = pendingAll.filter((n) => n.captureId !== showing && !(card && n.captureId === card.captureId));
  const asking = !!showing && !!sheetView && sheetView.questions.length > 0;
  // "Understanding…" is on screen (CC-18 telemetry): once per note, after it paints.
  useEffect(() => {
    if (card?.mode === "understanding") u.understandingVisible(card.captureId);
  }, [card?.mode, card?.captureId, u]);

  const value = useMemo<TellFlow>(() => ({
    tellOn,
    ai,
    keep,
    card,
    openCard: () => {
      if (!card) return;
      if (card.mode === "card" || card.mode === "sheet" || card.mode === "nothing") {
        setFromCard(card.captureId);
        openSheet(card.captureId, false);
      }
    },
    rateCard: (verdict, off) => {
      if (!card) return;
      void u.feedback(card.captureId, verdict, off);
    },
    undoCard: () => {
      if (!card) return;
      setDismissed((d) => ({ ...d, [card.captureId]: true }));
      void u.undo(card.captureId);
    },
    dismissCard: () => {
      if (!card) return;
      setDismissed((d) => ({ ...d, [card.captureId]: true }));
      // "Got it" on what was kept is the user's look-over: confirmed. Anything
      // still being understood or waiting keeps going, on Today.
      if (card.mode === "card") finishCard(card.captureId, "done");
      else u.hidden(card.captureId);
    },
    addNewcomer: (name, itemIds) => fail(u.addNewcomer(itemIds, name)),
    pending,
    questions,
    asking,
    attention: !!card || !!showing,
    toLookAt,
    waitingOffline: waiting.length > 0 && open.offline && currentView?.mode !== "understanding",
    openNote: (id) => openSheet(id),
    returnFromNote: (id) => {
      if (parked !== id) return;
      setParked(null);
      openSheet(id, false);
    },
    focusTell: (personId) => setFocusRequest({ at: Date.now(), personId: personId ?? null }),
    focusRequest,
    draft: (personId) => drafts.drafts[draftKey(personId)] ?? "",
    setDraft: (personId, text) => drafts.set(draftKey(personId), text),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [tellOn, ai, keep, JSON.stringify(card), JSON.stringify(pending), questions.join(), asking, showing, toLookAt.join(), waiting.length, open.offline, currentView?.mode, openSheet, u, focusRequest, drafts.drafts, drafts.set, parked]);

  // The sheet shows its own view, or the last one while the next arrives.
  const shown = sheetView && SHEET_CONTENT.includes(sheetView.mode)
    ? sheetView
    : lastSheet && sheetView?.mode === "understanding"
      ? { ...lastSheet, answering: true, questions: [], status: sheetView.status }
      : lastSheet;

  return (
    <Ctx.Provider value={value}>
      {children}
      {shown && showing ? (
        <ReviewSheet
          view={shown}
          visible
          people={people}
          today={today}
          onDismiss={() => close("dismissed")}
          onDone={() => close("done")}
          onUndo={() => {
            const id = showing;
            setShowing(null);
            setFromCard(null);
            setDismissed((d) => ({ ...d, [id]: true }));
            void u.undo(id);
          }}
          onReject={(itemId) => fail(u.reject(itemId, showing))}
          onCorrect={(itemId: string, change: Correction) => fail(u.correct(itemId, change))}
          onAddPerson={(itemId: string, name: string) => fail(u.addParticipant(itemId, name).then(() => undefined))}
          onRestore={(personId) => fail(u.restorePerson(personId))}
          onAnswer={(answers) => fail(u.answer(showing, answers))}
          onOpenNote={() => {
            // Looking at the note never decides anything: the sheet steps
            // aside and comes back, question and all, on the way back.
            const id = showing;
            setParked(id);
            setShowing(null);
            u.hidden(id);
            router.push(`/v2/source/${id}`);
          }}
          onActivity={() => undefined}
        />
      ) : null}
    </Ctx.Provider>
  );
}

/** Reports a draft left behind without being told (content-free). */
export function trackAbandoned(draft: string) {
  if (draft.trim()) track("capture_abandoned", { chars_bucket: charsBucket([...draft].length) });
}

/** The first keystroke of a new note (content-free). */
export function trackStarted() {
  track("capture_started", { source: "text" });
}
