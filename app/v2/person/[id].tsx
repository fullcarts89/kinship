// A person's record (Checkpoint D1): what Kinship remembers about them, each
// line with where it came from. Change anything; "Not this" forgets it.
import React, { useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { space } from "@/design/tokens";
import { DatePane, KindPane, PersonPane, WordsPane } from "@/features/tell/Pickers";
import type { ItemLine } from "@/features/tell/reviewModel";
import { todayIso, usePeople, usePersonRecord, useUnderstanding, useV2Actions, type RecordLine } from "@/hooks/useV2";
import { Body, Display, Pill, Provenance, Screen, Sheet, Small, Statement, Token, usePalette } from "@/ui";

type Pane = { kind: "person" | "date" | "kind" | "words"; line: ItemLine };

export default function PersonRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person, lines } = usePersonRecord(String(id));
  const people = usePeople();
  const u = useUnderstanding();
  const { settleConflict } = useV2Actions();
  const [pane, setPane] = useState<Pane | null>(null);
  const p = usePalette();
  const today = todayIso();
  const fail = (what: Promise<unknown>) =>
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));

  if (!person) {
    return (
      <Screen left={<Pill variant="quiet" label="Back" onPress={() => router.back()} />}>
        <Body tone="inkSoft">{"This person isn't here any more."}</Body>
      </Screen>
    );
  }
  const close = () => setPane(null);
  const forget = (r: RecordLine) =>
    Alert.alert("Forget this?", r.line.statement, [
      { text: "Keep it", style: "cancel" },
      { text: "Forget", style: "destructive", onPress: () => fail(u.reject(r.line.id)) },
    ]);

  return (
    <Screen left={<Pill variant="quiet" label="Back" onPress={() => router.back()} />}>
      <Display>{person.display_name}</Display>
      {typeof person.relationship_label === "string" && person.relationship_label ? <Small>{person.relationship_label}</Small> : null}
      {lines.length === 0 ? (
        <Body tone="inkSoft" style={{ marginTop: space.l }}>{`What you tell Kinship about ${person.display_name} will be here.`}</Body>
      ) : null}
      {lines.map((r) => (
        <View key={r.line.id} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
          <Statement accessibilityRole="button" onPress={() => setPane({ kind: "words", line: r.line })} accessibilityHint="Double-tap to change the words">
            {r.line.statement}
          </Statement>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.m, rowGap: space.xs, marginTop: space.xs }}>
            {r.line.about ? <Token what="About" value={r.line.about} /> : null}
            {r.line.when ? (
              <Token what="When" value={r.line.when.label} onPress={r.line.when.changeable ? () => setPane({ kind: "date", line: r.line }) : undefined} />
            ) : null}
            <Token what="What" value={r.line.kind.label} onPress={r.line.kind.changeable ? () => setPane({ kind: "kind", line: r.line }) : undefined} />
            {r.line.person?.changeable ? (
              <Token what="Who" value={r.line.person.label} onPress={() => setPane({ kind: "person", line: r.line })} />
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.s }}>
            <View style={{ flex: 1 }}>
              <Provenance line={r.provenance} onPress={r.noteId ? () => router.push(`/v2/source/${r.noteId}`) : undefined} />
            </View>
            <Pill variant="quiet" label="Not this" onPress={() => forget(r)} />
          </View>
          {r.conflict ? (
            <View style={{ marginTop: space.s }}>
              <Body tone="ochre">{r.conflict.title}</Body>
              {r.conflict.choices.map((c) => (
                <View key={c.field} style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xs }}>
                  <Pill label={`${c.keep.label} ${c.keep.value}`} onPress={() => fail(settleConflict(r.conflict!.id, "keep_current"))} />
                  {r.conflict!.canUseMine ? (
                    <Pill label={`${c.use.label} ${c.use.value}`} onPress={() => fail(settleConflict(r.conflict!.id, "use_mine"))} />
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
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
    </Screen>
  );
}
