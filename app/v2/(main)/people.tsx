// People: search, the list, add by name. Tap someone → their page.
import React, { useState } from "react";
import { router } from "expo-router";
import { PeopleView } from "@/features/people/PeopleView";
import { SettingsSheet } from "@/features/people/SettingsSheet";
import { usePeopleRows, useUnderstandingConsent, useV2Actions } from "@/hooks/useV2";
import { useAuth } from "@/providers";

export default function PeopleScreen() {
  const rows = usePeopleRows();
  const { addPerson } = useV2Actions();
  const consent = useUnderstandingConsent();
  const { signOut } = useAuth();
  const [settings, setSettings] = useState(false);
  return (
    <>
      <PeopleView
        rows={rows.map((r) => ({ id: r.person.id, label: r.label, line: r.line, remembered: r.person.state === "remembered" }))}
        onOpen={(id) => router.push(`/v2/person/${id}`)}
        onAdd={addPerson}
        onSettings={() => setSettings(true)}
        onAddFromContacts={() => router.push("/v2/people/add")}
      />
      <SettingsSheet
        visible={settings}
        onDismiss={() => setSettings(false)}
        understanding={consent.allowed}
        setUnderstanding={consent.set}
        signOut={signOut}
      />
    </>
  );
}
