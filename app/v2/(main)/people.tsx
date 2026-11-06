// People: search, the list, add by name. Tap someone → their page. A question
// in the search field asks the user's own memory (Ask Kinship v1, CC-25).
// With the notebook (notebook_deck flag, PR #77 §9) People is an index: one
// field, "Coming up for them", everyone as tiles; the same add, Settings and
// Ask v1 underneath. Without it, exactly the alpha's People.
import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import { type Href, router } from "expo-router";
import { AskSectionView } from "@/features/ask/AskSection";
import { useAsk } from "@/features/ask/useAsk";
import { NotebookPeopleView } from "@/features/people/notebook/NotebookPeopleView";
import { PeopleView } from "@/features/people/PeopleView";
import { SettingsSheet } from "@/features/people/SettingsSheet";
import { useHeldPeople, useNotificationSetting, usePeopleRows, usePreviewNotification, useRemovedPeople, useTrustActions, useUnderstandingConsent, useV2Actions } from "@/hooks/useV2";
import { useNotebook } from "@/hooks/useNotebook";
import { usePeopleIndex } from "@/hooks/usePeopleIndex";
import { sameNameMatch } from "@/store/peopleMerge";
import { isHeld } from "@/store/peopleStates";
import type { Person } from "@/store/repositories";
import { aliasesOf, shortName } from "../../../supabase/functions/_shared/extraction/names";
import { useAuth } from "@/providers";

export default function PeopleScreen() {
  return useNotebook() ? <NotebookPeople /> : <AlphaPeople />;
}

/**
 * Adding by name, as People always has. Never a second Kaiya by accident
 * (founder I3): a name someone removed from People goes by is offered back
 * first. A name someone already in People goes by is asked about first
 * (PER-05): the same person, or new.
 */
function useAddByName(people: Person[]): (name: string) => Promise<unknown> {
  const removed = useRemovedPeople();
  const { addPerson, bringBack } = useV2Actions();
  return (name: string): Promise<unknown> => {
    const k = name.normalize("NFC").trim().toLocaleLowerCase();
    const same = sameNameMatch(name, people);
    if (same) {
      const who = shortName(same) || same.display_name;
      return new Promise((resolve) => {
        Alert.alert(`Is this the same ${who}?`, `You already have ${same.display_name} in People.`, [
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
          { text: "Add someone new", onPress: () => resolve(addPerson(name)) },
          { text: "Use existing", onPress: () => { resolve(null); router.push(`/v2/person/${same.id}`); } },
        ]);
      });
    }
    const match = removed.find((p) => [p.display_name, typeof p.full_name === "string" ? p.full_name : "", ...aliasesOf(p)]
      .some((n) => n.trim().toLocaleLowerCase() === k));
    if (!match) return addPerson(name);
    return new Promise((resolve) => {
      Alert.alert(`${match.display_name} was removed from People.`, "Bring them back with everything you told Kinship, or add someone new.", [
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        { text: "Add someone new", onPress: () => resolve(addPerson(name)) },
        { text: `Bring back ${match.display_name}`, onPress: () => resolve(bringBack(match.id)) },
      ]);
    });
  };
}

/** Settings from the People header: understanding, notifications, export, delete, paused and remembered, removed. */
function PeopleSettings({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const removed = useRemovedPeople();
  const held = useHeldPeople();
  const trust = useTrustActions();
  const { bringBack } = useV2Actions();
  const consent = useUnderstandingConsent();
  const notifications = useNotificationSetting();
  const previewNotification = usePreviewNotification();
  const { signOut } = useAuth();
  return (
    <SettingsSheet
      visible={visible}
      onDismiss={onDismiss}
      understanding={consent.allowed}
      setUnderstanding={consent.set}
      notifications={notifications.on}
      setNotifications={notifications.set}
      previewNotification={previewNotification}
      signOut={signOut}
      onAddFromContacts={() => router.push("/v2/people/add")}
      removed={removed.map((p) => ({ id: p.id, name: p.display_name }))}
      onBringBack={(id) => void bringBack(id).catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."))}
      held={held.filter(isHeld).map((p) => ({ id: p.id, name: p.display_name, state: p.state }))}
      onResume={(id) => trust.resume(id)}
      onExport={(format) => trust.exportData(format)}
      onDeleteAccount={() => trust.deleteAccount()}
    />
  );
}

/** The alpha's People (the flag off): unchanged. */
function AlphaPeople() {
  const rows = usePeopleRows();
  const add = useAddByName(rows.map((r) => r.person));
  const [settings, setSettings] = useState(false);
  // Ask Kinship v1 (WS-6): what the search field's words find in memory.
  const [query, setQuery] = useState("");
  const memory = useAsk(query);
  return (
    <>
      <PeopleView
        rows={rows.map((r) => ({ id: r.person.id, label: r.label, line: r.line, remembered: r.person.state === "remembered" }))}
        onOpen={(id) => router.push(`/v2/person/${id}`)}
        onAdd={add}
        onSettings={() => setSettings(true)}
        onAddFromContacts={() => router.push("/v2/people/add")}
        onGo={(to) => {
          if (to === "today") router.navigate("/v2");
        }}
        onQuery={setQuery}
        memory={{
          query: memory.query,
          asked: memory.asked,
          named: memory.named,
          node: <AskSectionView view={memory} />,
        }}
      />
      <PeopleSettings visible={settings} onDismiss={() => setSettings(false)} />
    </>
  );
}

/** People as the notebook's index (PR #77 §9). */
function NotebookPeople() {
  const index = usePeopleIndex();
  const add = useAddByName(index.people);
  const [settings, setSettings] = useState(false);
  const [query, setQuery] = useState("");
  const memory = useAsk(query);
  // Stable, so a tile on screen doesn't redraw for every letter typed.
  const open = useCallback((id: string) => router.push(`/v2/person/${id}`), []);
  const hit = useCallback((href: string) => router.push(href as Href), []);
  return (
    <>
      <NotebookPeopleView
        loaded={index.loaded}
        people={index.people}
        tiles={index.tiles}
        band={index.band}
        names={index.names}
        today={index.today}
        onOpen={open}
        onAdd={add}
        onSettings={() => setSettings(true)}
        onAddFromContacts={() => router.push("/v2/people/add")}
        onGo={(to) => {
          if (to === "today") router.navigate("/v2");
        }}
        onQuery={setQuery}
        memory={memory}
        onHit={hit}
      />
      <PeopleSettings visible={settings} onDismiss={() => setSettings(false)} />
    </>
  );
}
