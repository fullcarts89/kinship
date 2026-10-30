// A person's page: the portrait (board 2). Tap a line to correct it, its
// provenance for the note; Message and Call open the real conversation;
// Tell adds something about them (an unsent note about them waits here).
import React, { useCallback, useEffect, useState } from "react";
import { Alert, AppState, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { reachedSomeone } from "@/platform/haptics";
import { ItemSheet } from "@/features/person/ItemSheet";
import { IN_TOUCH, PortraitView, removeCopy } from "@/features/person/PortraitView";
import { KeptCard } from "@/features/tell/TellDock";
import { useTellFlow } from "@/features/tell/TellFlow";
import { TellSheet } from "@/features/tell/TellSheet";
import { useHandoff } from "@/features/today/useHandoff";
import { OUTCOME_ASK, type GestureKind } from "@/features/today/suggestions";
import { track } from "@/platform/analytics";
import { todayIso, useItemLine, usePeople, usePersonLinks, usePersonReturn, usePortrait, useTodayActions, useUnderstanding, useV2Actions } from "@/hooks/useV2";
import { NamePane } from "@/features/tell/Pickers";
import { PHOTO_COPY, usePersonPortrait } from "@/hooks/usePersonPortrait";
import { Pill, Sheet, Title } from "@/ui";
import { space } from "@/design/tokens";
import { shortName } from "../../../../supabase/functions/_shared/extraction/names";

export default function PersonScreen() {
  // `item`: "View Ben" from a Moment lands on that memory (founder I1).
  const { id, item: focusItem } = useLocalSearchParams<{ id: string; item?: string }>();
  const personId = String(id);
  const portrait = usePortrait(personId);
  const people = usePeople();
  const u = useUnderstanding();
  const flow = useTellFlow();
  const handoff = useHandoff();
  const links = usePersonLinks(personId);
  const [itemId, setItemId] = useState<string | null>(null);
  const [telling, setTelling] = useState(false);
  // "Tell the rest" on this page (the card, the review, the Source view): the words not got to are the
  // draft about this person; the page's own Tell sheet opens on them (Today's dock is not on this screen).
  useEffect(() => {
    const r = flow.focusRequest;
    if (r?.continues && r.personId === personId) setTelling(true);
  }, [flow.focusRequest, personId]);
  const [renaming, setRenaming] = useState(false);
  const [inTouch, setInTouch] = useState(false);
  const { rename, removePerson, inTouch: recordInTouch } = useV2Actions();
  const item = useItemLine(itemId);
  const name = portrait.person?.display_name ?? null;
  // Said the way Kinship says their name everywhere (founder I12).
  const first = portrait.person ? shortName(portrait.person) : "";
  const fail = (what: Promise<unknown>) =>
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  // Back from Messages or Phone: the return question is asked here as on Today (founder K23).
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    setNow(new Date());
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setNow(new Date());
    });
    return () => sub.remove();
  }, []));
  const back = usePersonReturn(personId, now);
  const today = useTodayActions();
  // Their photo, the user's own choice, kept on this phone only (FD-30b).
  const photo = usePersonPortrait(personId);
  const choosePhoto = () => {
    if (!photo.uri) {
      void photo.pick();
      return;
    }
    Alert.alert(`Photo of ${first}`, PHOTO_COPY.hint(first), [
      { text: PHOTO_COPY.change, onPress: () => void photo.pick() },
      { text: PHOTO_COPY.remove, style: "destructive", onPress: () => void photo.remove() },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  // After a Yes: "Anything worth remembering…?", optional, as Today asks it (founder I2, K28).
  const [afterReturn, setAfterReturn] = useState<{ followUp: string } | null>(null);
  // SUA-1: after a Yes that followed a "You could…" tap, one optional question first; then the usual one.
  const [afterGesture, setAfterGesture] = useState<{ kind: GestureKind; ask: string; next: { followUp: string } | null } | null>(null);
  // Reaching out about something they said they'd do gets the same return question as Today's line
  // about it (founder K23); with nothing to act on, the page's own return check, and nothing more
  // (founder K28). What to mention is chosen by mentions.ts (K26), never the first rows of the page.
  const reachOut = () => handoff.start({
    personId, personName: first, heading: `Reach ${first}`, mention: back.mention.lines, opener: back.mention.opener,
    ...(back.reason ? { reason: back.reason } : {}),
    suggestion: back.suggestion,
  });

  return (
    <PortraitView
      personId={personId}
      name={name}
      loading={portrait.loading}
      short={first}
      label={portrait.label}
      remembered={portrait.person?.state === "remembered"}
      lately={portrait.lately}
      comingUp={portrait.comingUp}
      youSaid={portrait.youSaid}
      between={portrait.between}
      trail={portrait.trail}
      onInTouch={portrait.person?.state === "active" ? () => setInTouch(true) : undefined}
      total={portrait.total}
      onBack={() => router.back()}
      onLine={setItemId}
      onSource={(noteId) => router.push(`/v2/source/${noteId}`)}
      onKnows={() => router.push(`/v2/person/${personId}/knows`)}
      onMessage={reachOut}
      onCall={reachOut}
      onTell={() => setTelling(true)}
      onRename={() => setRenaming(true)}
      photoUri={photo.uri}
      onPhoto={choosePhoto}
      hasDraft={!!flow.draft(personId).trim()}
      focusItemId={typeof focusItem === "string" ? focusItem : null}
      returnCheck={back.returnCheck}
      onReturn={(answer) => {
        const rc = back.returnCheck;
        if (answer === "yes") void reachedSomeone();
        void today.returned(answer).then((h) => {
          // Optional, never blocking, never after a promise's logistics (followUp ""); "nothing" undoes nothing.
          const next = answer === "yes" && h && rc?.followUp ? { followUp: rc.followUp } : null;
          // A Yes that followed a "You could…" tap asks its one optional question first (SUA-1).
          if (answer === "yes" && h?.gesture) setAfterGesture({ kind: h.gesture, ask: OUTCOME_ASK[h.gesture], next });
          else if (next) setAfterReturn(next);
        }, () => Alert.alert("That couldn't be saved", "Nothing was lost. Try again in a moment."));
      }}
      afterGesture={afterGesture}
      onGesture={(answer) => {
        if (!afterGesture) return;
        track("gesture_outcome", { kind: afterGesture.kind, answer });
        setAfterReturn(afterGesture.next);
        setAfterGesture(null);
      }}
      afterReturn={afterReturn}
      onRemember={() => {
        setAfterReturn(null);
        setTelling(true);
      }}
      onNothing={() => setAfterReturn(null)}
      // The note just told about them, and only about them (never another person's card).
      kept={flow.card && flow.card.personIds.includes(personId)
        ? (
          <KeptCard
            card={flow.card} onOpen={flow.openCard} onUndo={flow.undoCard} onDismiss={flow.dismissCard} onRate={flow.rateCard} onAddNewcomer={flow.addNewcomer}
            onTellRest={() => flow.tellRest(flow.card!.captureId)} onRetry={flow.retryCard}
          />
        )
        : null}
      waiting={flow.pending.filter((n) => n.personIds.includes(personId))}
      onWaiting={(captureId) => flow.openNote(captureId)}
      links={links.suggestions.map((l) => ({ key: l.key, prompt: l.prompt }))}
      onLink={(key, yes) => {
        const s = links.suggestions.find((l) => l.key === key);
        if (s) fail(yes ? links.yes(s) : links.no(s));
      }}
    >
      <ItemSheet
        item={item}
        visible={!!itemId}
        people={people}
        today={todayIso()}
        onCorrect={(iid, change) => fail(u.correct(iid, change))}
        onForget={(iid) => {
          setItemId(null);
          fail(u.reject(iid));
        }}
        onSource={(noteId) => {
          setItemId(null);
          router.push(`/v2/source/${noteId}`);
        }}
        onDismiss={() => setItemId(null)}
      />
      {handoff.sheet}
      <Sheet visible={renaming} onDismiss={() => setRenaming(false)} label="Their name">
        {renaming && name ? (
          <NamePane initial={name} onCancel={() => setRenaming(false)} onSave={(n) => {
            fail(rename(personId, n));
            setRenaming(false);
          }} onRemove={() => {
            // "Remove from People" (founder I3): asked first; a soft archive, never a delete.
            const copy = removeCopy(first);
            Alert.alert(copy.title, copy.body, [
              { text: copy.cancel, style: "cancel" },
              {
                text: copy.remove, style: "destructive", onPress: () => {
                  setRenaming(false);
                  removePerson(personId).then(() => router.back(), () => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
                },
              },
            ]);
          }} />
        ) : null}
      </Sheet>
      {/* A conversation Kinship couldn't know about (founder I2): how, and nothing more. */}
      <Sheet visible={inTouch} onDismiss={() => setInTouch(false)} label={IN_TOUCH.title(first)}>
        {inTouch ? (
          <View style={{ gap: space.m }}>
            <Title>{IN_TOUCH.title(first)}</Title>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
              {IN_TOUCH.choices.map((c) => (
                <Pill key={c.channel} label={c.label} onPress={() => {
                  setInTouch(false);
                  fail(recordInTouch(personId, c.channel));
                }} />
              ))}
            </View>
          </View>
        ) : null}
      </Sheet>
      <TellSheet person={telling && name ? { id: personId, name: first } : null} onClose={() => setTelling(false)} />
    </PortraitView>
  );
}
