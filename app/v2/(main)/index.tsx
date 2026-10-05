// Today (plan §13; board 1). Refreshes the user's reasons when it opens and
// when the app comes back, shows the one moment (or a quiet day), hands off
// to the real conversation, and asks once, on return, whether they connected.
import React, { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTellFlow } from "@/features/tell/TellFlow";
import { TodayView } from "@/features/today/TodayView";
import { useHandoff } from "@/features/today/useHandoff";
import { useToday, useTodayActions } from "@/hooks/useV2";

export default function TodayScreen() {
  const flow = useTellFlow();
  const [now, setNow] = useState(() => new Date());
  const view = useToday(flow.questions.length, flow.toLookAt.length, now);
  const actions = useTodayActions();
  const handoff = useHandoff();
  const [afterReturn, setAfterReturn] = useState<{ personId: string; personName: string } | null>(null);

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
            reason: { id: moment.reasonId, type: moment.type },
          });
        }}
        onNotNow={() => moment && void actions.notNow({ reasonId: moment.reasonId, type: moment.type })}
        onProvenance={() => moment && router.push(moment.noteId ? `/v2/source/${moment.noteId}` : `/v2/person/${moment.personId}`)}
        onReturn={(answer) => {
          const rc = view.returnCheck;
          void actions.returned(answer).then(() => {
            if (answer === "yes" && rc) setAfterReturn({ personId: rc.personId, personName: rc.personName });
          });
        }}
        onRemember={() => {
          if (afterReturn) flow.focusTell(afterReturn.personId);
          setAfterReturn(null);
        }}
        onNothing={() => setAfterReturn(null)}
        onQuiet={(q) => {
          if (q.kind === "question") flow.openNote(flow.questions[0]);
          else if (q.kind === "look") flow.openNote(flow.toLookAt[0]);
          else router.push(`/v2/person/${q.personId}`);
        }}
        onTellFirst={() => flow.focusTell(null)}
        onAddPeople={() => router.push("/v2/people/add")}
      />
      {handoff.sheet}
    </>
  );
}
