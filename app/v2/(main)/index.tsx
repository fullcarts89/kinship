// Today (plan §13; board 1). Refreshes the user's reasons when it opens and
// when the app comes back, shows the one moment (or a quiet day), hands off
// to the real conversation, and asks once, on return, whether they connected.
import React, { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTellFlow } from "@/features/tell/TellFlow";
import { TodayView } from "@/features/today/TodayView";
import { useHandoff } from "@/features/today/useHandoff";
import { reachedSomeone } from "@/platform/haptics";
import { useToday, useTodayActions } from "@/hooks/useV2";

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
  const [afterReturn, setAfterReturn] = useState<{ personId: string; personName: string; followUp?: string } | null>(null);
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
    void actions.refresh().finally(end);
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
  useEffect(() => {
    if (moment) void actions.shown({ reasonId: moment.reasonId, personId: moment.personId, type: moment.type, score: moment.score });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment?.reasonId]);

  if (!view) return null;
  return (
    <>
      <TodayView
        view={view}
        afterReturn={afterReturn}
        onPrimary={() => {
          if (!moment) return;
          handoff.start({
            personId: moment.personId, personName: moment.personName, heading: moment.heading, mention: moment.mention,
            reason: { id: moment.reasonId, type: moment.type, ask: moment.ask, about: moment.statement, followUp: moment.followUp },
          });
        }}
        onNotNow={() => moment && void actions.notNow({ reasonId: moment.reasonId, type: moment.type })}
        onProvenance={() => moment && router.push(moment.noteId ? `/v2/source/${moment.noteId}` : `/v2/person/${moment.personId}`)}
        onReturn={(answer) => {
          const rc = view.returnCheck;
          if (answer === "yes") void reachedSomeone();
          void actions.returned(answer).then(() => {
            if (answer === "yes" && rc) setAfterReturn({ personId: rc.personId, personName: rc.personName, followUp: rc.followUp });
          });
        }}
        onRemember={() => {
          if (afterReturn) flow.focusTell(afterReturn.personId);
          setAfterReturn(null);
        }}
        onNothing={() => setAfterReturn(null)}
        onQuiet={(q) => {
          if (q.kind === "question") flow.openNote(q.captureId ?? flow.questions[0]);
          else if (q.kind === "look") flow.openNote(flow.toLookAt[0]);
          else if (q.kind === "coming" || q.kind === "waiting") router.push(`/v2/person/${q.personId}`);
        }}
        settling={settling}
        onTellFirst={() => flow.focusTell(null)}
        onAddPeople={() => router.push("/v2/people/add")}
      />
      {handoff.sheet}
    </>
  );
}
