// "Ideas for showing up" on a person's Now lens (PR #77 §4, `personNow` + the ideas sheet): one explicit
// control; the ideas open in a sheet only when the user asks; an idea shows its grounds and the ways to
// do it. A Message or Call from here is the page's own hand-off (the same return check); a hand-off from
// an idea carries SUA-1's kind, so a Yes may ask its one content-free question. Hidden when there are none.
import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { useHandoff } from "@/features/today/useHandoff";
import { usePersonIdeas } from "@/hooks/useIdeas";
import { useShowingUp } from "@/hooks/useShowingUp";
import { todayIso, usePersonReturn } from "@/hooks/useV2";
import { smallCount, track } from "@/platform/analytics";
import { Sheet } from "@/ui";
import { afterSheets } from "@/ui/sheetStack";
import { NText } from "@/ui/notebook";
import { space } from "@/design/tokens";
import type { HandoffChannel } from "@/platform/handoff";
import type { Idea } from "./ideas";
import { Assist, IdeaList, IdeasToggle, SHOWING_UP_COPY, UndoToast } from "./IdeasViews";

export function PersonIdeas({ personId, personName }: { personId: string; personName: string }): React.ReactElement | null {
  const { ideas } = usePersonIdeas(personId);
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const handoff = useHandoff();
  const back = usePersonReturn(personId, new Date());
  const act = useShowingUp();
  const today = todayIso();
  useEffect(() => {
    if (open) track("ideas_opened", { surface: "person", ideas_n: smallCount(ideas.length) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!ideas.length && !toast) return null;

  const close = () => {
    setOpen(false);
    setIdea(null);
  };
  const reach = (i: Idea, channel: HandoffChannel) => {
    close();
    afterSheets(() => handoff.start({
      personId, personName, heading: `Reach ${personName}`, mention: back.mention.lines, opener: back.mention.opener,
      ...(back.reason ? { reason: { ...back.reason, ...(i.gesture ? { gesture: i.gesture } : {}) } } : {}),
    }, channel));
  };
  const fail = () => Alert.alert("That couldn't be saved", "Nothing was lost. Try again in a moment.");
  return (
    <View style={{ marginTop: space.xl }}>
      {ideas.length ? <IdeasToggle name={personName} chevron="push" onPress={() => setOpen(true)} /> : null}
      <Sheet visible={open} onDismiss={close} label={SHOWING_UP_COPY.toggle}>
        {open && !idea ? (
          <View>
            <NText v="cap" tone="ink2">{personName}</NText>
            <NText v="sheetTitle" style={{ marginTop: space.s, marginBottom: space.l - 2 }}>{SHOWING_UP_COPY.toggle}</NText>
            <NText v="fine" tone="quiet" style={{ marginTop: -space.xs, marginBottom: space.m }}>{SHOWING_UP_COPY.sheetNote}</NText>
            <IdeaList ideas={ideas} onIdea={(i) => {
              track("idea_opened", { category: i.category, surface: "person" });
              setIdea(i);
            }} />
          </View>
        ) : null}
        {open && idea ? (
          <Assist
            idea={idea}
            personName={personName}
            today={today}
            onBack={() => setIdea(null)}
            onMessage={() => reach(idea, "text")}
            onCall={() => reach(idea, "call")}
            onSource={(noteId) => {
              close();
              afterSheets(() => router.push(`/v2/source/${noteId}`));
            }}
            onKeep={async (sentence, day, label) => {
              try {
                const kept = await act.keepInMind({ personId, sentence, day });
                close();
                setToast({ message: SHOWING_UP_COPY.kept(label === "Tomorrow" ? "tomorrow" : label, personName), undo: () => void act.undoKeep(kept).finally(() => setToast(null)) });
              } catch {
                fail();
              }
            }}
            onBringBack={async (itemId, day, label) => {
              try {
                await act.bringBackOn(itemId, day);
                close();
                setToast({ message: SHOWING_UP_COPY.broughtBack(label === "Tomorrow" ? "tomorrow" : `on ${label}`) });
              } catch {
                fail();
              }
            }}
          />
        ) : null}
      </Sheet>
      {handoff.sheet}
      {toast ? <UndoToast message={toast.message} onUndo={toast.undo} onDismiss={() => setToast(null)} inline /> : null}
    </View>
  );
}
