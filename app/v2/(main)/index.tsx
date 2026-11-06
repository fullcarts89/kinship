// Today (plan §13; board 1). Refreshes the user's reasons when it opens and
// when the app comes back, shows the one moment (or a quiet day), hands off
// to the real conversation, and asks once, on return, whether they connected.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, AppState } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTellFlow } from "@/features/tell/TellFlow";
import { TodayView } from "@/features/today/TodayView";
import { useHandoff } from "@/features/today/useHandoff";
import { MomentDetailSheet } from "@/features/today/MomentDetailSheet";
import { detailFor, quietKey } from "@/features/today/momentDetail";
import { OUTCOME_ASK, type GestureKind } from "@/features/today/suggestions";
import { track } from "@/platform/analytics";
import { reachedSomeone } from "@/platform/haptics";
import { todayIso, usePeople, usePersonFocus, useToday, useTodayActions } from "@/hooks/useV2";
import { usePersonPortrait } from "@/hooks/usePersonPortrait";
import { afterSheets } from "@/ui/sheetStack";
import { useActivation } from "@/hooks/useActivation";
import { shortName } from "../../../supabase/functions/_shared/extraction/names";
import { useNotebook } from "@/hooks/useNotebook";
import { useShowingUp } from "@/hooks/useShowingUp";
import { DeckToday } from "@/features/today/deck/DeckToday";
import { MomentFull, type Rect } from "@/features/today/deck/MomentFull";
import { whenChip } from "@/features/today/deck/deckModel";
import type { Handoff } from "@/features/today/todayModel";

/** The longest Today waits for its first refresh before showing an empty state. */
const SETTLE_MS = 1500;

export default function TodayScreen() {
  const flow = useTellFlow();
  const [now, setNow] = useState(() => new Date());
  // Every open note by name (a question, something still being understood),
  // except the one the Kept card is already showing.
  const view = useToday(flow.questions.length, flow.toLookAt.length, now, flow.pending);
  const actions = useTodayActions();
  const handoff = useHandoff();
  const people = usePeople();
  const focus = usePersonFocus();
  const activation = useActivation();
  // The Moment detail (founder I1): which one is open. It's looked up in
  // Today's current view every render, so a retracted or replaced memory
  // closes it rather than leaving it stale.
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [afterReturn, setAfterReturn] = useState<{ personId: string; personName: string; followUp?: string; channel?: Handoff["channel"] } | null>(null);
  // The Moment Deck × Notebook experience (notebook_deck; founder directive 2 Nov 2026).
  const notebook = useNotebook();
  const showingUp = useShowingUp();
  // Where the expanded moment grows from (the poster's or a card's rectangle).
  const [from, setFrom] = useState<Rect | null>(null);
  // SUA-1: after a Yes that followed a "You could…" tap, one optional question first; then the usual one.
  const [afterGesture, setAfterGesture] = useState<{ kind: GestureKind; ask: string; next: { personId: string; personName: string; followUp?: string; channel?: Handoff["channel"] } | null } | null>(null);
  // Hold the empty states until the first refresh settles (never longer than SETTLE_MS).
  const [settling, setSettling] = useState(true);
  useEffect(() => {
    let done = false;
    const end = () => {
      if (!done) {
        done = true;
        setSettling(false);
      }
    };
    const t = setTimeout(end, SETTLE_MS);
    // Once the reasons are fresh, the next Moment notification is planned from the same selection (FD-30e).
    void actions.refresh().finally(() => {
      end();
      void actions.planNotification();
    });
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(useCallback(() => {
    setNow(new Date());
    void actions.refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        setNow(new Date());
        void actions.refresh();
      } else if (s === "background") {
        // Leaving: what was shown, put aside or answered is known; the next notification follows it.
        void actions.planNotification();
      }
    });
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      sub.remove();
      clearInterval(t);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const moment = view?.moment ?? null;
  // The photo the user chose for the moment's person (kept on this phone only), if any.
  const portrait = usePersonPortrait(moment?.personId ?? null);
  useEffect(() => {
    if (moment) void actions.shown({ reasonId: moment.reasonId, personId: moment.personId, type: moment.type, score: moment.score });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment?.reasonId]);

  const today = todayIso(now);
  const nameOf = (personId: string) => {
    const p = people.find((x) => x.id === personId && !x.deleted_at);
    return p ? shortName(p) || p.display_name : null;
  };
  const detail = view && detailKey ? detailFor(view, detailKey, today, nameOf) : null;
  // The detail's person may differ from the moment's (a Coming up line): their own photo, if the user chose one.
  const detailPortrait = usePersonPortrait(detail?.personId ?? null);
  useEffect(() => {
    if (detailKey && view && !detail) setDetailKey(null);
  }, [detailKey, view, detail]);
  // What Kinship suggested in the detail, content-free (SUA-1): once per detail opened with a line.
  const suggestionKind = detail?.suggestion?.kind ?? null;
  useEffect(() => {
    if (detailKey && suggestionKind) track("gesture_shown", { kind: suggestionKind, surface: "detail" });
  }, [detailKey, suggestionKind]);
  // Never a sheet on a sheet: the detail goes first, then the next thing.
  const fromDetail = (next: () => void) => {
    setDetailKey(null);
    afterSheets(next);
  };

  if (!view) return null;
  const onPrimary = () => {
    if (!moment) return;
    handoff.start({
      personId: moment.personId, personName: moment.personName, heading: moment.heading, mention: moment.mention, opener: moment.opener,
      reason: { id: moment.reasonId, type: moment.type, ask: moment.ask, about: moment.statement, followUp: moment.followUp, itemId: moment.itemId },
      suggestion: moment.suggestion,
    });
  };
  const onReturn = (answer: "yes" | "not_yet" | "put_aside") => {
    const rc = view.returnCheck;
    if (answer === "yes") void reachedSomeone();
    void actions.returned(answer).then((h) => {
      // "Anything worth remembering?" only after a conversation worth it, never after a
      // promise's logistics; it is optional, and "nothing" undoes nothing (founder I2).
      const next = answer === "yes" && h && rc && rc.followUp ? { personId: rc.personId, personName: rc.personName, followUp: rc.followUp, channel: h.channel } : null;
      // A Yes that followed a "You could…" tap asks its one optional question first (SUA-1).
      if (answer === "yes" && h?.gesture) setAfterGesture({ kind: h.gesture, ask: OUTCOME_ASK[h.gesture], next });
      else if (next) setAfterReturn(next);
    }, () => Alert.alert("That couldn't be saved", "Nothing was lost. Try again in a moment."));
  };
  const onGesture = (answer: "yes" | "not_yet") => {
    if (!afterGesture) return;
    // Recorded as a kind alone, never words, never counted back to the user (SUA-1, FD-30d).
    track("gesture_outcome", { kind: afterGesture.kind, answer });
    setAfterReturn(afterGesture.next);
    setAfterGesture(null);
  };
  const onRemember = () => {
    if (afterReturn) flow.focusTell(afterReturn.personId);
    setAfterReturn(null);
  };
  /** "I did this" on the user's own promise (DN-10): kept, never contact; then, optionally, what happened. */
  const didIt = (itemId: string, personId: string, personName: string, surface: "moment" | "today") => {
    showingUp.keptIt(itemId, surface).then(() => {
      void reachedSomeone();
      setAfterReturn({ personId, personName, followUp: `Nice. Anything worth remembering about ${personName}?` });
    }, () => Alert.alert("That couldn't be saved", "Nothing was lost. Try again in a moment."));
  };

  if (notebook) {
    const detailPromise = !!detail?.itemId && (detail.type === "promise" || (detail.type === "coming" && view.quiet.some((q) => q.kind === "coming" && q.itemId === detail.itemId && q.due)));
    const momentHeadline = detail && moment && detail.key === moment.reasonId ? moment.statement : detail?.line ?? "";
    const momentWhen = detail ? (detail.key === moment?.reasonId && moment?.day && !moment.toldDay ? whenChip(moment.day, today) : detail.when) : null;
    const reachFromDetail = (channel: "text" | "call", gesture?: GestureKind | null) => {
      if (!detail) return;
      fromDetail(() => handoff.start({
        personId: detail.personId, personName: detail.personName, heading: detail.heading, mention: detail.mention, opener: detail.opener,
        reason: gesture ? { ...detail.reason, gesture } : detail.reason,
        ...(gesture ? { suggestion: null } : {}),
      }, channel));
    };
    return (
      <>
        <DeckToday
          view={view}
          today={today}
          nameOf={nameOf}
          afterReturn={afterReturn}
          attention={flow.attention}
          afterGesture={afterGesture}
          onGesture={onGesture}
          onPrimary={onPrimary}
          onOpenMoment={(r) => {
            if (!moment) return;
            setFrom(r);
            setDetailKey(moment.reasonId);
          }}
          onNotNow={() => moment && void actions.notNow({ reasonId: moment.reasonId, type: moment.type })}
          onProvenance={() => moment && router.push(moment.noteId ? `/v2/source/${moment.noteId}` : `/v2/person/${moment.personId}`)}
          onReturn={onReturn}
          onRemember={onRemember}
          onNothing={() => setAfterReturn(null)}
          onQuiet={(q, r) => {
            if (q.kind === "question") flow.openNote(q.captureId ?? flow.questions[0]);
            else if (q.kind === "look") flow.openNote(flow.toLookAt[0]);
            else if (q.kind === "coming" || q.kind === "waiting") {
              setFrom(r);
              setDetailKey(quietKey(q));
            }
          }}
          onDid={moment?.type === "promise" && moment.itemId ? () => didIt(moment.itemId as string, moment.personId, moment.personName, "today") : undefined}
          settling={settling}
          photoUri={portrait.uri}
          onTellFirst={() => flow.focusTell(null)}
          onAddPeople={() => router.push("/v2/people/add")}
          onBringBackSeen={() => void activation.seeBringBack()}
        />
        <MomentFull
          detail={detail}
          from={from}
          today={today}
          photoUri={detailPortrait.uri}
          whenLabel={momentWhen}
          headline={momentHeadline}
          onClose={() => setDetailKey(null)}
          onMessage={(g) => reachFromDetail("text", g)}
          onCall={(g) => reachFromDetail("call", g)}
          onPerson={() => {
            if (!detail) return;
            const { personId } = detail;
            fromDetail(() => router.push(`/v2/person/${personId}?lens=now` as never));
          }}
          onSource={(noteId) => fromDetail(() => router.push(`/v2/source/${noteId}`))}
          onNotNow={detail && moment && detail.key === moment.reasonId ? () => void actions.notNow({ reasonId: moment.reasonId, type: moment.type }) : undefined}
          onDid={detail && detailPromise ? () => {
            const d = detail;
            setDetailKey(null);
            didIt(d.itemId as string, d.personId, d.personName, "moment");
          } : undefined}
          onKeep={async (personId, sentence, day) => {
            const kept = await showingUp.keepInMind({ personId, sentence, day });
            return { undo: () => showingUp.undoKeep(kept) };
          }}
          onBringBack={(itemId, day) => showingUp.bringBackOn(itemId, day)}
        />
        {handoff.sheet}
      </>
    );
  }
  return (
    <>
      <TodayView
        view={view}
        afterReturn={afterReturn}
        attention={flow.attention}
        afterGesture={afterGesture}
        onGesture={(answer) => {
          if (!afterGesture) return;
          // Recorded as a kind alone, never words, never counted back to the user (SUA-1, FD-30d).
          track("gesture_outcome", { kind: afterGesture.kind, answer });
          setAfterReturn(afterGesture.next);
          setAfterGesture(null);
        }}
        onPrimary={() => {
          if (!moment) return;
          handoff.start({
            personId: moment.personId, personName: moment.personName, heading: moment.heading, mention: moment.mention, opener: moment.opener,
            reason: { id: moment.reasonId, type: moment.type, ask: moment.ask, about: moment.statement, followUp: moment.followUp, itemId: moment.itemId },
            suggestion: moment.suggestion,
          });
        }}
        onOpenMoment={() => moment && setDetailKey(moment.reasonId)}
        onNotNow={() => moment && void actions.notNow({ reasonId: moment.reasonId, type: moment.type })}
        onProvenance={() => moment && router.push(moment.noteId ? `/v2/source/${moment.noteId}` : `/v2/person/${moment.personId}`)}
        onReturn={(answer) => {
          const rc = view.returnCheck;
          if (answer === "yes") void reachedSomeone();
          void actions.returned(answer).then((h) => {
            // "Anything worth remembering?" only after a conversation worth it, never after a
            // promise's logistics; it is optional, and "nothing" undoes nothing (founder I2).
            const next = answer === "yes" && h && rc && rc.followUp ? { personId: rc.personId, personName: rc.personName, followUp: rc.followUp } : null;
            // A Yes that followed a "You could…" tap asks its one optional question first (SUA-1).
            if (answer === "yes" && h?.gesture) setAfterGesture({ kind: h.gesture, ask: OUTCOME_ASK[h.gesture], next });
            else if (next) setAfterReturn(next);
          }, () => Alert.alert("That couldn't be saved", "Nothing was lost. Try again in a moment."));
        }}
        onRemember={() => {
          if (afterReturn) flow.focusTell(afterReturn.personId);
          setAfterReturn(null);
        }}
        onNothing={() => setAfterReturn(null)}
        onQuiet={(q) => {
          if (q.kind === "question") flow.openNote(q.captureId ?? flow.questions[0]);
          else if (q.kind === "look") flow.openNote(flow.toLookAt[0]);
          else if (q.kind === "coming" || q.kind === "waiting") setDetailKey(quietKey(q));
        }}
        settling={settling}
        photoUri={portrait.uri}
        onTellFirst={() => flow.focusTell(null)}
        onAddPeople={() => router.push("/v2/people/add")}
        onBringBackSeen={() => void activation.seeBringBack()}
      />
      <MomentDetailSheet
        detail={detail}
        photoUri={detailPortrait.uri}
        onDismiss={() => setDetailKey(null)}
        onMessage={() => detail && fromDetail(() => handoff.start({
          personId: detail.personId, personName: detail.personName, heading: detail.heading, mention: detail.mention, opener: detail.opener, reason: detail.reason,
        }, "text"))}
        onCall={() => detail && fromDetail(() => handoff.start({
          personId: detail.personId, personName: detail.personName, heading: detail.heading, mention: detail.mention, opener: detail.opener, reason: detail.reason,
        }, "call"))}
        onSuggestion={() => {
          if (!detail?.suggestion) return;
          const { kind } = detail.suggestion;
          track("gesture_tapped", { kind, surface: "detail" });
          // The same hand-off, into Messages, with what the user initiated on the reason (never pre-written).
          fromDetail(() => handoff.start({
            personId: detail.personId, personName: detail.personName, heading: detail.heading, mention: detail.mention, opener: detail.opener,
            reason: { ...detail.reason, gesture: kind }, suggestion: detail.suggestion,
          }, "text"));
        }}
        onPerson={() => {
          if (!detail) return;
          const { personId, itemId, type } = detail;
          fromDetail(() => void focus(personId, itemId ?? (type === "birthday" || type === "coming" ? "birthday" : null)).then((href) => router.push(href as never)));
        }}
        onSource={(noteId) => fromDetail(() => router.push(`/v2/source/${noteId}`))}
      />
      {handoff.sheet}
    </>
  );
}
