// People: search, the list, add by name. Tap someone → their page.
import React from "react";
import { router } from "expo-router";
import { PeopleView } from "@/features/people/PeopleView";
import { usePeopleRows, useV2Actions } from "@/hooks/useV2";

export default function PeopleScreen() {
  const rows = usePeopleRows();
  const { addPerson } = useV2Actions();
  return (
    <PeopleView
      rows={rows.map((r) => ({ id: r.person.id, label: r.label, line: r.line, remembered: r.person.state === "remembered" }))}
      onOpen={(id) => router.push(`/v2/person/${id}`)}
      onAdd={addPerson}
    />
  );
}
