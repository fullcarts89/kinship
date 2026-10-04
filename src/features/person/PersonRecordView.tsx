// A person's record, from plain data (Checkpoint D1): what Kinship remembers
// about them, each line with where it came from.
import React from "react";
import { View } from "react-native";
import { space } from "@/design/tokens";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { ConflictChoice } from "@/store/conflictCopy";
import { Body, Display, Pill, Provenance, Screen, Small, Statement, Token, usePalette } from "@/ui";

export interface RecordLine {
  line: ItemLine;
  provenance: string;
  /** The newest note it came from, for the Source view. */
  noteId: string | null;
  conflict: { id: number; title: string; choices: ConflictChoice[]; canUseMine: boolean } | null;
}

export interface PersonRecordViewProps {
  name: string | null;
  label: string | null;
  lines: RecordLine[];
  onBack: () => void;
  onChange: (line: ItemLine, what: "person" | "date" | "kind" | "words") => void;
  onForget: (line: RecordLine) => void;
  onSource: (noteId: string) => void;
  onSettle: (conflictId: number, choice: "keep_current" | "use_mine") => void;
  children?: React.ReactNode;
}

export function PersonRecordView(props: PersonRecordViewProps) {
  const p = usePalette();
  const back = <Pill variant="quiet" label="Back" onPress={props.onBack} />;
  if (!props.name) {
    return (
      <Screen left={back}>
        <Body tone="inkSoft">{"This person isn't here any more."}</Body>
      </Screen>
    );
  }
  return (
    <Screen left={back}>
      <Display>{props.name}</Display>
      {props.label ? <Small>{props.label}</Small> : null}
      {props.lines.length === 0 ? (
        <Body tone="inkSoft" style={{ marginTop: space.l }}>{`What you tell Kinship about ${props.name} will be here.`}</Body>
      ) : null}
      {props.lines.map((r) => (
        <View key={r.line.id} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
          <Statement accessibilityRole="button" accessibilityHint="Double-tap to change the words" onPress={() => props.onChange(r.line, "words")}>
            {r.line.statement}
          </Statement>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.m, rowGap: space.xs, marginTop: space.xs }}>
            {r.line.about ? <Token what="About" value={r.line.about} /> : null}
            {r.line.when ? (
              <Token what="When" value={r.line.when.label} onPress={r.line.when.changeable ? () => props.onChange(r.line, "date") : undefined} />
            ) : null}
            <Token what="What" value={r.line.kind.label} onPress={r.line.kind.changeable ? () => props.onChange(r.line, "kind") : undefined} />
            {r.line.person?.changeable ? (
              <Token what="Who" value={r.line.person.label} onPress={() => props.onChange(r.line, "person")} />
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.s }}>
            <View style={{ flex: 1 }}>
              <Provenance line={r.provenance} onPress={r.noteId ? () => props.onSource(r.noteId as string) : undefined} />
            </View>
            <Pill variant="quiet" label="Not this" onPress={() => props.onForget(r)} />
          </View>
          {r.conflict ? (
            <View style={{ marginTop: space.s }}>
              <Body tone="ochre">{r.conflict.title}</Body>
              {r.conflict.choices.map((c) => (
                <View key={c.field} style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xs }}>
                  <Pill label={`${c.keep.label} ${c.keep.value}`} onPress={() => props.onSettle(r.conflict!.id, "keep_current")} />
                  {r.conflict!.canUseMine ? (
                    <Pill label={`${c.use.label} ${c.use.value}`} onPress={() => props.onSettle(r.conflict!.id, "use_mine")} />
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {props.children}
    </Screen>
  );
}
