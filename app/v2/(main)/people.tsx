// People: search, the list, add by name. Tap someone → their page. A question
// in the search field asks the user's own memory (Ask Kinship v1, CC-25).
import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { AskResults } from "@/features/ask/AskResults";
import { useAsk } from "@/features/ask/useAsk";
import { ComposedSheet } from "@/features/person/ComposedSheet";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { afterSheets } from "@/ui/sheetStack";
import { PeopleView } from "@/features/people/PeopleView";
import { SettingsSheet } from "@/features/people/SettingsSheet";
import { usePeopleRows, useRemovedPeople, useUnderstandingConsent, useV2Actions } from "@/hooks/useV2";
import { aliasesOf } from "../../../supabase/functions/_shared/extraction/names";
import { useAuth } from "@/providers";

export default function PeopleScreen() {
  const rows = usePeopleRows();
  const removed = useRemovedPeople();
  const { addPerson, bringBack } = useV2Actions();
  // Never a second Kaiya by accident (founder I3): a name someone removed
  // from People goes by is offered back first.
  const add = (name: string): Promise<unknown> => {
    const k = name.normalize("NFC").trim().toLocaleLowerCase();
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
  // Ask Kinship v1 (WS-6): what the search field's words find in memory.
  const [query, setQuery] = useState("");
  const memory = useAsk(query);
  // A composed residence line's notes, as on the person's page; Edit and Not this there go to that page.
  const [composed, setComposed] = useState<RecordLine | null>(null);
  const toKnows = useCallback((line: { id: string; person: { id: string } | null }) => {
    setComposed(null);
    if (line.person) afterSheets(() => router.push(`/v2/person/${line.person!.id}/knows?item=${encodeURIComponent(line.id)}`));
  }, []);
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
          asked: memory.asked,
          named: memory.named,
          node: (
            <AskResults
              view={memory}
              onLine={(href) => router.push(href)}
              onSource={(noteId) => router.push(`/v2/source/${noteId}`)}
              onComposed={setComposed}
            />
          ),
        }}
      />
      <ComposedSheet
        row={composed}
        visible={!!composed}
        onChange={(line) => toKnows(line)}
        onForget={(r) => toKnows(r.line)}
        onSource={(noteId) => {
          setComposed(null);
          router.push(`/v2/source/${noteId}`);
        }}
        onSettle={() => setComposed(null)}
        onDismiss={() => setComposed(null)}
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
      />
    </>
  );
}
