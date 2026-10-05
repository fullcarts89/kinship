// Tell, wherever it's told from (plan §7–§8; Checkpoint D1 behaviour, Quiet
// Herbarium placement). The Tell field sits on Today and People and opens
// from a person's page; this keeps one flow for all of them:
//
//   kept at once (offline too) → understood when online → either a quiet
//   "Kept" line with Undo (everything was clear), or the review sheet
//   ("Here's what I'll remember", one question at most).
//
// The behaviour is D1's, unchanged: what needs the user's yes is never memory
// until they say it; a question is never answered for them.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { ReviewSheet, type Correction } from "@/features/tell/ReviewSheet";
import { todayIso, useOpenNotes, usePeople, useReview, useTell, useUnderstanding } from "@/hooks/useV2";
import { charsBucket, track } from "@/platform/analytics";

const SUMMARY_MS = 5000; // plan §8: the auto-save summary
const IDLE_MS = 20_000; // plan §8: a light confirmation left alone
const UNDO_MS = 8000; // plan §8: Undo after Done

export interface KeptLineState {
  captureId: string;
  text: string;
  /** Tapping it opens what was kept. */
  opens: boolean;
}

export interface TellFlow {
  tellOn: boolean;
  ai: boolean;
  /** Keeps what the user said; resolves once it's safely on the phone. */
  keep: (text: string, contextPersonId?: string | null, source?: "text" | "onboarding") => Promise<boolean>;
  /** What happened to the note just told, in a few words; null when nothing to say. */
  status: string | null;
  kept: KeptLineState | null;
  openKept: () => void;
  undoKept: () => void;
  /** Notes waiting on the user: a question, or understood while away. */
  questions: string[];
  toLookAt: string[];
  waitingOffline: boolean;
  openNote: (captureId: string) => void;
  /** Ask the Tell field to take focus, optionally about someone ("Anything worth remembering?"). */
  focusTell: (personId?: string | null) => void;
  focusRequest: { at: number; personId: string | null } | null;
}

const Ctx = createContext<TellFlow | null>(null);

export function useTellFlow(): TellFlow {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTellFlow is only available inside the 2.0 shell");
  return v;
}

export function TellFlowProvider({ children }: { children: React.ReactNode }) {
  const u = useUnderstanding();
  const { keep: keepNote, ai, tellOn } = useTell();
  const open = useOpenNotes();
  const people = usePeople();
  const today = todayIso();
  const [current, setCurrent] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const [kept, setKept] = useState<(KeptLineState & { ms: number; summary: boolean }) | null>(null);
  const [touches, setTouches] = useState(0);
  const [focusRequest, setFocusRequest] = useState<TellFlow["focusRequest"]>(null);
  const currentView = useReview(current);
  const sheet = useReview(showing);
  const announced = useRef<string | null>(null);

  const openSheet = useCallback((id: string, report = true) => {
    setKept(null);
    setShowing(id);
    if (report) void u.opened(id);
  }, [u]);

  // The note just told, once understood: a quiet "Kept" line, or the sheet.
  useEffect(() => {
    if (!current || !currentView || announced.current === current) return;
    if (currentView.mode === "summary") {
      announced.current = current;
      void u.opened(current);
      setKept({ captureId: current, text: currentView.summary ?? "Kept", opens: true, ms: SUMMARY_MS, summary: true });
    } else if (currentView.mode === "sheet") {
      announced.current = current;
      openSheet(current);
    }
  }, [current, currentView, openSheet, u]);

  useEffect(() => {
    if (!kept) return;
    const t = setTimeout(() => {
      if (kept.summary) void u.finish(kept.captureId, "idle");
      setKept(null);
    }, kept.ms);
    return () => clearTimeout(t);
  }, [kept, u]);

  const close = useCallback((how: "done" | "idle" | "dismissed") => {
    const id = showing;
    if (!id) return;
    setShowing(null);
    void u.finish(id, how);
    if (how === "done") setKept({ captureId: id, text: "Kept", opens: false, ms: UNDO_MS, summary: false });
  }, [showing, u]);

  // Left alone with nothing to answer, the sheet closes itself; items stay as saved.
  const idle = !!showing && !!sheet && sheet.mode === "sheet" && sheet.questions.length === 0 && !sheet.answering;
  useEffect(() => {
    if (!idle) return;
    const t = setTimeout(() => close("idle"), IDLE_MS);
    return () => clearTimeout(t);
  }, [idle, touches, close]);

  useEffect(() => {
    if (showing && sheet?.mode === "none") setShowing(null);
  }, [showing, sheet?.mode]);

  const keep = useCallback(async (text: string, contextPersonId?: string | null, source: "text" | "onboarding" = "text") => {
    if (!text.trim()) return false;
    try {
      const id = await keepNote(text, contextPersonId ?? null, source);
      announced.current = null;
      setCurrent(id);
      // Without understanding, the note is kept exactly as written.
      if (!ai) setKept({ captureId: id, text: "Kept as you wrote it.", opens: false, ms: UNDO_MS, summary: false });
      return true;
    } catch {
      Alert.alert("That wasn't kept", "Something went wrong saving it on this phone. Your words are still here.");
      return false;
    }
  }, [keepNote, ai]);

  const fail = (what: Promise<unknown>) => {
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  };

  let status: string | null = null;
  if (current && !kept && !showing) {
    if (!ai) status = null;
    else if (currentView?.mode === "understanding") status = currentView.status;
  }
  const others = (ids: string[]) => ids.filter((id) => id !== current && id !== showing);
  const questions = others(open.questions);
  const toLookAt = others(open.toLookAt);
  const waiting = others(open.waiting);

  const value = useMemo<TellFlow>(() => ({
    tellOn,
    ai,
    keep,
    status,
    kept: kept ? { captureId: kept.captureId, text: kept.text, opens: kept.opens } : null,
    openKept: () => kept?.opens && openSheet(kept.captureId, false),
    undoKept: () => {
      if (!kept) return;
      setKept(null);
      void u.undo(kept.captureId);
    },
    questions,
    toLookAt,
    waitingOffline: waiting.length > 0 && open.offline && currentView?.mode !== "understanding",
    openNote: (id) => openSheet(id),
    focusTell: (personId) => setFocusRequest({ at: Date.now(), personId: personId ?? null }),
    focusRequest,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [tellOn, ai, keep, status, kept, questions.join(), toLookAt.join(), waiting.length, open.offline, currentView?.mode, openSheet, u, focusRequest]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {sheet && showing ? (
        <ReviewSheet
          view={sheet}
          visible={sheet.mode !== "none"}
          people={people}
          today={today}
          onDismiss={() => close("dismissed")}
          onDone={() => close("done")}
          onUndo={() => {
            const id = showing;
            setShowing(null);
            void u.undo(id);
          }}
          onReject={(itemId) => fail(u.reject(itemId, showing))}
          onCorrect={(itemId: string, change: Correction) => fail(u.correct(itemId, change))}
          onAnswer={(answers) => fail(u.answer(showing, answers))}
          onOpenNote={() => {
            const id = showing;
            close("dismissed");
            router.push(`/v2/source/${id}`);
          }}
          onActivity={() => setTouches((n) => n + 1)}
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
