// A person's page: the portrait (board 2). Tap a line to correct it, its
// provenance for the note; Message and Call open the real conversation;
// Tell adds something about them (an unsent note about them waits here).
import React, { useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ItemSheet } from "@/features/person/ItemSheet";
import { PortraitView, removeCopy } from "@/features/person/PortraitView";
import { KeptCard } from "@/features/tell/TellDock";
import { useTellFlow } from "@/features/tell/TellFlow";
import { TellSheet } from "@/features/tell/TellSheet";
import { useHandoff } from "@/features/today/useHandoff";
import { todayIso, useItemLine, usePeople, usePersonLinks, usePortrait, useUnderstanding, useV2Actions } from "@/hooks/useV2";
import { NamePane } from "@/features/tell/Pickers";
import { Sheet } from "@/ui";
import { shortName } from "../../../../supabase/functions/_shared/extraction/names";

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = String(id);
  const portrait = usePortrait(personId);
  const people = usePeople();
  const u = useUnderstanding();
  const flow = useTellFlow();
  const handoff = useHandoff();
  const links = usePersonLinks(personId);
  const [itemId, setItemId] = useState<string | null>(null);
  const [telling, setTelling] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const { rename, removePerson } = useV2Actions();
  const item = useItemLine(itemId);
  const name = portrait.person?.display_name ?? null;
  // Said the way Kinship says their name everywhere (founder I12).
  const first = portrait.person ? shortName(portrait.person) : "";
  const fail = (what: Promise<unknown>) =>
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  const reachOut = () => handoff.start({
    personId, personName: first, heading: `Reach ${first}`, mention: [...portrait.lately, ...portrait.comingUp].slice(0, 2).map((l) => l.statement),
  });

  return (
    <PortraitView
      personId={personId}
      name={name}
      short={first}
      label={portrait.label}
      remembered={portrait.person?.state === "remembered"}
      reachedOut={portrait.reachedOut ?? null}
      lately={portrait.lately}
      comingUp={portrait.comingUp}
      youSaid={portrait.youSaid}
      between={portrait.between}
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
      // The note just told about them, and only about them (never another person's card).
      kept={flow.card && flow.card.personIds.includes(personId)
        ? <KeptCard card={flow.card} onOpen={flow.openCard} onUndo={flow.undoCard} onDismiss={flow.dismissCard} onRate={flow.rateCard} onAddNewcomer={flow.addNewcomer} />
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
      <TellSheet person={telling && name ? { id: personId, name: first } : null} onClose={() => setTelling(false)} />
    </PortraitView>
  );
}
