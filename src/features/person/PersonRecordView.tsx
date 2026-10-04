// "What Kinship knows about Ben" (Design Direction §I.7, §J; plan §20 knows):
// everything kept about a person, each line with who, when and what as
// tokens, where it came from, and "Not this". From plain data.
import React from "react";
import { Pressable, View } from "react-native";
import { space } from "@/design/tokens";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { ConflictChoice } from "@/store/conflictCopy";
import { Body, Line, Pill, Provenance, Screen, Small, Title, Token, TokenRow, usePalette } from "@/ui";

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
  if (!props.name) {
    return (
      <Screen onBack={props.onBack}>
        <Body>{"This person isn't here any more."}</Body>
      </Screen>
    );
  }
  const first = props.name.trim().split(/\s+/u)[0];
  return (
    <Screen onBack={props.onBack}>
      <Title>{`What Kinship knows about ${first}`}</Title>
      <Body style={{ marginTop: space.s }}>
        {props.lines.length
          ? "Everything you've told Kinship about them, and where each came from. Change or remove any of it."
          : `What you tell Kinship about ${first} will be here.`}
      </Body>
      <View style={{ marginTop: space.xl, borderTopWidth: props.lines.length ? 1 : 0, borderTopColor: p.hairline }}>
        {props.lines.map((r) => (
          <View key={r.line.id} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={r.line.statement}
              accessibilityHint="Double-tap to change the words"
              onPress={() => props.onChange(r.line, "words")}
            >
              <Line>{r.line.statement}</Line>
            </Pressable>
            <View style={{ marginTop: space.s }}>
              <TokenRow>
                {r.line.person?.changeable ? (
                  <Token what="Who" value={r.line.person.label} onPress={() => props.onChange(r.line, "person")} />
                ) : null}
                {r.line.about ? <Token what="About" value={r.line.about} /> : null}
                {r.line.when ? (
                  <Token what="When" value={r.line.when.label} onPress={r.line.when.changeable ? () => props.onChange(r.line, "date") : undefined} />
                ) : null}
                <Token what="What" value={r.line.kind.label} onPress={r.line.kind.changeable ? () => props.onChange(r.line, "kind") : undefined} />
              </TokenRow>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.s }}>
              <View style={{ flex: 1 }}>
                <Provenance line={r.provenance} onPress={r.noteId ? () => props.onSource(r.noteId as string) : undefined} />
              </View>
              <Pill variant="quiet" label="Not this" onPress={() => props.onForget(r)} />
            </View>
            {r.conflict ? (
              <View style={{ marginTop: space.s }}>
                <Small tone="ochreText">{r.conflict.title}</Small>
                {r.conflict.choices.map((c) => (
                  <View key={c.field} style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xs }}>
                    <Pill size="small" label={`${c.keep.label} ${c.keep.value}`} onPress={() => props.onSettle(r.conflict!.id, "keep_current")} />
                    {r.conflict!.canUseMine ? (
                      <Pill size="small" label={`${c.use.label} ${c.use.value}`} onPress={() => props.onSettle(r.conflict!.id, "use_mine")} />
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>
      {props.children}
    </Screen>
  );
}
