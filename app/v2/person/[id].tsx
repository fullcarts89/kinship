// A person's record (Checkpoint D1): what Kinship remembers about them, with
// where each line came from. Change anything; "Not this" forgets it.
import React, { useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PersonRecordView } from "@/features/person/PersonRecordView";
import { DatePane, KindPane, PersonPane, WordsPane } from "@/features/tell/Pickers";
import type { ItemLine } from "@/features/tell/reviewModel";
import { todayIso, usePeople, usePersonRecord, useUnderstanding, useV2Actions } from "@/hooks/useV2";
import { Sheet } from "@/ui";

type Pane = { kind: "person" | "date" | "kind" | "words"; line: ItemLine };

export default function PersonRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person, lines } = usePersonRecord(String(id));
  const people = usePeople();
  const u = useUnderstanding();
  const { settleConflict } = useV2Actions();
  const [pane, setPane] = useState<Pane | null>(null);
  const today = todayIso();
  const fail = (what: Promise<unknown>) =>
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  const close = () => setPane(null);

  return (
    <PersonRecordView
      name={person?.display_name ?? null}
      label={typeof person?.relationship_label === "string" && person.relationship_label ? person.relationship_label : null}
      lines={lines}
      onBack={() => router.back()}
      onChange={(line, kind) => setPane({ kind, line })}
      onForget={(r) =>
        Alert.alert("Forget this?", r.line.statement, [
          { text: "Keep it", style: "cancel" },
          { text: "Forget", style: "destructive", onPress: () => fail(u.reject(r.line.id)) },
        ])}
      onSource={(noteId) => router.push(`/v2/source/${noteId}`)}
      onSettle={(conflictId, choice) => fail(settleConflict(conflictId, choice))}
    >
      <Sheet visible={!!pane} onDismiss={close} label="Change">
        {pane?.kind === "person" ? (
          <PersonPane people={people} title="Who is this about?" current={pane.line.person?.id ?? null} onCancel={close}
            onPick={(pid) => {
              fail(u.correct(pane.line.id, { person_id: pid }));
              close();
            }} />
        ) : pane?.kind === "date" ? (
          <DatePane title="When is it?" initial={pane.line.when?.value ?? null} today={today} allowNone onCancel={close}
            onPick={(day) => {
              fail(u.correct(pane.line.id, { date: day }));
              close();
            }} />
        ) : pane?.kind === "kind" ? (
          <KindPane current={pane.line.kind.value} onCancel={close} onPick={(k) => {
            fail(u.correct(pane.line.id, { kind: k }));
            close();
          }} />
        ) : pane?.kind === "words" ? (
          <WordsPane initial={pane.line.statement} onCancel={close} onSave={(w) => {
            fail(u.correct(pane.line.id, { statement: w }));
            close();
          }} />
        ) : null}
      </Sheet>
    </PersonRecordView>
  );
}
