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
import { todayIso, useItemLine, useMerges, usePeople, usePersonLinks, usePersonReturn, usePortrait, useTodayActions, useTrustActions, useUnderstanding, useV2Actions } from "@/hooks/useV2";
import { MergeSheet } from "@/features/people/MergeSheet";
import { NamePane } from "@/features/tell/Pickers";
import { MERGE_COPY } from "@/store/peopleMerge";
import { HOLD_COPY, stateLine, type HoldState } from "@/store/peopleStates";
import type { Person } from "@/store/repositories";
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
  // The trust floor (FD-30e): Pause / Hold as remembered / Resume (D13), Merge with someone (PER-05).
  const trust = useTrustActions();
  const merges = useMerges(personId);
  const [merging, setMerging] = useState<{ candidates: Person[]; everyone: Person[] } | null>(null);
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
  // After a Yes: "Anything worth remembering…?", optional, as Today asks it (founder I2, K28).
  const [afterReturn, setAfterReturn] = useState<{ followUp: string } | null>(null);
  // Reaching out about something they said they'd do gets the same return question as Today's line
  // about it (founder K23); with nothing to act on, the page's own return check, and nothing more
  // (founder K28). What to mention is chosen by mentions.ts (K26), never the first rows of the page.
  const reachOut = () => handoff.start({
    personId, personName: first, heading: `Reach ${first}`, mention: back.mention.lines, opener: back.mention.opener,
    ...(back.reason ? { reason: back.reason } : {}),
  });

  const state = portrait.person?.state;
  // Holding someone is asked first, in plain words (D13); leaving "remembered" is asked once more.
  const hold = (next: HoldState) => {
    const c = HOLD_COPY[next];
    Alert.alert(c.confirmTitle(first), c.confirmBody(first), [
      { text: HOLD_COPY.cancel, style: "cancel" },
      { text: c.confirm, onPress: () => { setRenaming(false); fail(trust.hold(personId, next)); } },
    ]);
  };
  const resume = () => {
    if (state === "remembered") {
      Alert.alert(HOLD_COPY.remembered.resumeTitle(first), HOLD_COPY.remembered.resumeBody(first), [
        { text: HOLD_COPY.cancel, style: "cancel" },
        { text: HOLD_COPY.remembered.resume, onPress: () => { setRenaming(false); fail(trust.resume(personId)); } },
      ]);
      return;
    }
    setRenaming(false);
    fail(trust.resume(personId));
  };
  const openMerge = () => {
    setRenaming(false);
    void Promise.all([trust.candidates(personId), trust.everyoneElse(personId)])
      .then(([candidates, everyone]) => setMerging({ candidates, everyone }), () => Alert.alert("That couldn't be read", "Try again in a moment."));
  };

  return (
    <PortraitView
      personId={personId}
      name={name}
      loading={portrait.loading}
      short={first}
      label={portrait.label}
      remembered={portrait.person?.state === "remembered"}
      stateLine={stateLine(portrait.person)}
      stateExplain={state === "paused" || state === "remembered" ? HOLD_COPY[state].explain(first) : null}
      merged={merges.map((m) => ({ id: m.id, line: MERGE_COPY.mergedLine(m.sourceName) }))}
      onUndoMerge={(id) => {
        const m = merges.find((x) => x.id === id);
        trust.undoMerge(id).then(
          () => Alert.alert(MERGE_COPY.undone(m?.sourceName ?? "They")),
          (e: unknown) => Alert.alert("That couldn't be undone", e instanceof Error && e.message ? e.message : "Try again in a moment."),
        );
      }}
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
      hasDraft={!!flow.draft(personId).trim()}
      focusItemId={typeof focusItem === "string" ? focusItem : null}
      returnCheck={back.returnCheck}
      onReturn={(answer) => {
        const rc = back.returnCheck;
        if (answer === "yes") void reachedSomeone();
        void today.returned(answer).then((h) => {
          // Optional, never blocking, never after a promise's logistics (followUp ""); "nothing" undoes nothing.
          if (answer === "yes" && h && rc?.followUp) setAfterReturn({ followUp: rc.followUp });
        }, () => Alert.alert("That couldn't be saved", "Nothing was lost. Try again in a moment."));
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
          <NamePane initial={name} short={first} state={state} onHold={hold} onResume={resume} onMerge={openMerge} onCancel={() => setRenaming(false)} onSave={(n) => {
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
      <MergeSheet
        visible={!!merging}
        person={portrait.person}
        candidates={merging?.candidates ?? []}
        everyone={merging?.everyone ?? []}
        onDismiss={() => setMerging(null)}
        preview={(sourceId) => trust.preview(personId, sourceId)}
        onMerge={(sourceId) => trust.merge(personId, sourceId)}
      />
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
