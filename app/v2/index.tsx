// Tell (plan §7–§8; Checkpoint D1): say something about someone; it's kept at
// once, understood when online, and shown back as "Here's what I'll
// remember": a quiet summary when everything was clear, a sheet when
// something needs a look or one question.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ReviewSheet, type Correction } from "@/features/tell/ReviewSheet";
import { TellView } from "@/features/tell/TellView";
import { todayIso, useOpenNotes, usePeople, useReview, useTell, useUnderstanding } from "@/hooks/useV2";
import { charsBucket, track } from "@/platform/analytics";

const SUMMARY_MS = 4000; // plan §8: the auto-save summary
const IDLE_MS = 20_000; // plan §8: a light confirmation left alone
const UNDO_MS = 8000; // plan §8: Undo after Done

interface Toast {
  captureId: string;
  text: string;
  ms: number;
  /** The auto-save summary: when it times out the review is over. */
  summary: boolean;
}

export default function TellScreen() {
  const u = useUnderstanding();
  const { keep, ai, tellOn } = useTell();
  const open = useOpenNotes();
  const people = usePeople();
  const today = todayIso();
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  draftRef.current = draft;
  const started = useRef(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [touches, setTouches] = useState(0);
  const currentView = useReview(current);
  const sheet = useReview(showing);
  const announced = useRef<string | null>(null);

  useFocusEffect(useCallback(() => () => {
    if (draftRef.current.trim()) track("capture_abandoned", { chars_bucket: charsBucket([...draftRef.current].length) });
  }, []));

  const openSheet = useCallback((id: string, report = true) => {
    setToast(null);
    setShowing(id);
    if (report) void u.opened(id);
  }, [u]);

  // The note just told, once understood: a quiet summary, or the sheet.
  useEffect(() => {
    if (!current || !currentView || announced.current === current) return;
    if (currentView.mode === "summary") {
      announced.current = current;
      void u.opened(current);
      setToast({ captureId: current, text: currentView.summary ?? "Kept", ms: SUMMARY_MS, summary: true });
    } else if (currentView.mode === "sheet") {
      announced.current = current;
      openSheet(current);
    }
  }, [current, currentView, openSheet, u]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      if (toast.summary) void u.finish(toast.captureId, "idle");
      setToast(null);
    }, toast.ms);
    return () => clearTimeout(t);
  }, [toast, u]);

  const close = useCallback((how: "done" | "idle" | "dismissed") => {
    const id = showing;
    if (!id) return;
    setShowing(null);
    void u.finish(id, how);
    if (how === "done") setToast({ captureId: id, text: "Kept", ms: UNDO_MS, summary: false });
  }, [showing, u]);

  // Left alone with nothing to answer, the sheet closes itself; items stay as saved.
  const idle = !!showing && !!sheet && sheet.mode === "sheet" && sheet.questions.length === 0 && !sheet.answering;
  useEffect(() => {
    if (!idle) return;
    const t = setTimeout(() => close("idle"), IDLE_MS);
    return () => clearTimeout(t);
  }, [idle, touches, close]);

  // Undone, or everything removed: nothing left to show.
  useEffect(() => {
    if (showing && sheet?.mode === "none") setShowing(null);
  }, [showing, sheet?.mode]);

  const onChange = (text: string) => {
    if (!started.current && text.trim()) {
      started.current = true;
      track("capture_started", { source: "text" });
    }
    setDraft(text);
  };

  const onKeep = async () => {
    const text = draft;
    if (!text.trim()) return;
    setDraft("");
    started.current = false;
    try {
      setCurrent(await keep(text));
    } catch {
      setDraft(text);
      Alert.alert("That wasn't kept", "Something went wrong saving it on this phone. Your words are still here.");
    }
  };

  const fail = (what: Promise<unknown>) => {
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  };

  let status: string | null = null;
  if (current) {
    if (!ai) status = "Kept as you wrote it.";
    else if (currentView?.mode === "understanding" || currentView?.mode === "kept") status = currentView.status;
    else status = currentView && currentView.mode !== "none" ? null : "Kept.";
  }
  const others = (ids: string[]) => ids.filter((id) => id !== current && id !== showing);
  const questions = others(open.questions);
  const toLookAt = others(open.toLookAt);
  const waiting = others(open.waiting);

  return (
    <TellView
      tellOn={tellOn}
      ai={ai}
      draft={draft}
      onDraft={onChange}
      onKeep={() => void onKeep()}
      status={status}
      questions={questions.length}
      toLookAt={toLookAt.length}
      // The note just told already says it waits to be online.
      waitingOffline={waiting.length > 0 && open.offline && currentView?.mode !== "understanding"}
      onAnswer={() => openSheet(questions[0])}
      onReview={() => openSheet(toLookAt[0])}
      toast={toast ? { text: toast.text, opens: toast.summary } : null}
      onToast={() => toast?.summary && openSheet(toast.captureId, false)}
      onUndo={() => {
        if (!toast) return;
        setToast(null);
        void u.undo(toast.captureId);
      }}
      onPeople={() => router.push("/v2/people")}
    >
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
    </TellView>
  );
}
