// People: search, the list, add by name. Tap someone → their page.
import React, { useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { PeopleView } from "@/features/people/PeopleView";
import { SettingsSheet } from "@/features/people/SettingsSheet";
import { useHeldPeople, usePeopleRows, useRemovedPeople, useTrustActions, useUnderstandingConsent, useV2Actions } from "@/hooks/useV2";
import { sameNameMatch } from "@/store/peopleMerge";
import { isHeld } from "@/store/peopleStates";
import { aliasesOf, shortName } from "../../../supabase/functions/_shared/extraction/names";
import { useAuth } from "@/providers";

export default function PeopleScreen() {
  const rows = usePeopleRows();
  const removed = useRemovedPeople();
  const held = useHeldPeople();
  const trust = useTrustActions();
  const { addPerson, bringBack } = useV2Actions();
  // Never a second Kaiya by accident (founder I3): a name someone removed
  // from People goes by is offered back first. A name someone already in
  // People goes by is asked about first (PER-05): the same person, or new.
  const add = (name: string): Promise<unknown> => {
    const k = name.normalize("NFC").trim().toLocaleLowerCase();
    const same = sameNameMatch(name, rows.map((r) => r.person));
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
  const consent = useUnderstandingConsent();
  const { signOut } = useAuth();
  const [settings, setSettings] = useState(false);
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
      />
      <SettingsSheet
        visible={settings}
        onDismiss={() => setSettings(false)}
        understanding={consent.allowed}
        setUnderstanding={consent.set}
        signOut={signOut}
        onAddFromContacts={() => router.push("/v2/people/add")}
        removed={removed.map((p) => ({ id: p.id, name: p.display_name }))}
        onBringBack={(id) => void bringBack(id).catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."))}
        held={held.filter(isHeld).map((p) => ({ id: p.id, name: p.display_name, state: p.state }))}
        onResume={(id) => trust.resume(id)}
        onExport={(format) => trust.exportData(format)}
        onDeleteAccount={() => trust.deleteAccount()}
      />
    </>
  );
}
