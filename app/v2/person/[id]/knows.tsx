// What Kinship knows about a person: every line, its tokens and its source.
// Change anything; "Not this" forgets it.
import React, { useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FORGET_COPY, PersonRecordView } from "@/features/person/PersonRecordView";
import { DatePane, KindPane, NamePane, namedChoices, PersonPane, WordsPane } from "@/features/tell/Pickers";
import type { ItemLine } from "@/features/tell/reviewModel";
import { todayIso, usePeople, usePersonRecord, useUnderstanding, useV2Actions } from "@/hooks/useV2";
import { Sheet } from "@/ui";
import { shortName } from "../../../../supabase/functions/_shared/extraction/names";

type Pane = { kind: "person" | "date" | "kind" | "words"; line: ItemLine } | { kind: "name" };

export default function KnowsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person, lines } = usePersonRecord(String(id));
  const people = usePeople();
  const u = useUnderstanding();
  const { settleConflict, rename } = useV2Actions();
  const [pane, setPane] = useState<Pane | null>(null);
  const today = todayIso();
  const fail = (what: Promise<unknown>) =>
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  const close = () => setPane(null);

  return (
    <PersonRecordView
      name={person?.display_name ?? null}
      short={person ? shortName(person) : null}
      label={typeof person?.relationship_label === "string" && person.relationship_label ? person.relationship_label : null}
      onRename={() => setPane({ kind: "name" })}
      lines={lines}
      onBack={() => router.back()}
      onChange={(line, kind) => setPane({ kind, line })}
      onForget={(r) =>
        Alert.alert(FORGET_COPY.title, r.line.statement, [
          { text: FORGET_COPY.cancel, style: "cancel" },
          { text: FORGET_COPY.forget, style: "destructive", onPress: () => fail(u.reject(r.line.id)) },
        ])}
      onSource={(noteId) => router.push(`/v2/source/${noteId}`)}
      onSettle={(conflictId, choice) => fail(settleConflict(conflictId, choice))}
    >
      <Sheet visible={!!pane} onDismiss={close} label="Change">
        {pane?.kind === "name" && person ? (
          <NamePane initial={person.display_name} onCancel={close} onSave={(n) => {
            fail(rename(person.id, n));
            close();
          }} />
        ) : pane?.kind === "person" ? (
          <PersonPane people={people} title="Who is this about?" current={pane.line.person?.id ?? null} onCancel={close}
            {...namedChoices(pane.line, people, (ids) => {
              fail(u.correct(pane.line.id, { person_ids: ids }));
              close();
            })}
            onPick={(pid) => {
              fail(u.correct(pane.line.id, { person_id: pid }));
              close();
            }}
            onAdd={(name, bringBack) => {
              fail(u.correct(pane.line.id, { new_person: name, ...(bringBack ? { bring_back: bringBack } : {}) }));
              close();
            }} />
        ) : pane?.kind === "date" ? (
          <DatePane title="When is it?" initial={pane.line.when?.value ?? null} today={today} allowNone onCancel={close}
            onPick={(day) => {
              fail(u.correct(pane.line.id, { date: day }));
              close();
            }} />
        ) : pane?.kind === "kind" ? (
          <KindPane current={pane.line.kind.value} owner={pane.line.kind.owner} onCancel={close} onPick={(k) => {
            fail(u.correct(pane.line.id, { kind: k }));
            close();
          }} onOwner={(o) => {
            fail(u.correct(pane.line.id, { owner: o }));
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
