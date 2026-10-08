// "What Kinship knows about Ben" (Design Direction §I.7, §J; plan §20 knows):
// everything kept about a person, each line with who, when and what as
// tokens, where it came from, Edit (founder native pass F5: the words were
// changeable only by tapping them, which nobody could see) and "Not this".
// From plain data.
import React, { useRef } from "react";
import { type ScrollView, Text, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { press, space } from "@/design/tokens";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { ConflictChoice } from "@/store/conflictCopy";
import { Body, Emphasis, Line, Pill, Provenance, Screen, Small, Title, Token, TokenRow, useLineFocus, usePalette } from "@/ui";

/** "Forget this?" (founder native pass F5: "Keep it" also named the Tell button, with another meaning). */
export const FORGET_COPY = { title: "Forget this?", cancel: "Cancel", forget: "Forget" } as const;

export interface RecordLine {
  line: ItemLine;
  provenance: string;
  /** The newest note it came from, for the Source view. */
  noteId: string | null;
  conflict: { id: number; title: string; choices: ConflictChoice[]; canUseMine: boolean } | null;
}

export interface PersonRecordViewProps {
  name: string | null;
  /** The name Kinship says (names.ts shortName): "Michelle" from Contacts, a chosen "Cutie Pie" whole (founder I12). */
  short?: string | null;
  label: string | null;
  lines: RecordLine[];
  onBack: () => void;
  /** "Edit name": a correction to the same person (H1). */
  onRename?: () => void;
  onChange: (line: ItemLine, what: "person" | "date" | "kind" | "words") => void;
  onForget: (line: RecordLine) => void;
  onSource: (noteId: string) => void;
  onSettle: (conflictId: number, choice: "keep_current" | "use_mine") => void;
  /** "View Ben" from a Moment whose line isn't on Ben's page (founder I1): this list lands on it. */
  focusItemId?: string | null;
  children?: React.ReactNode;
}

export function PersonRecordView(props: PersonRecordViewProps) {
  const p = usePalette();
  const scroll = useRef<ScrollView>(null);
  const focus = useLineFocus(props.focusItemId, scroll);
  if (!props.name) {
    return (
      <Screen onBack={props.onBack}>
        <Body>{"This person isn't here any more."}</Body>
      </Screen>
    );
  }
  const first = props.short?.trim() || props.name.trim().split(/\s+/u)[0];
  return (
    <Screen onBack={props.onBack} scrollRef={scroll}>
      <Title>{`What Kinship knows about ${first}`}</Title>
      {props.onRename ? (
        <View style={{ alignItems: "flex-start", marginLeft: -space.xs }}>
          <Pill variant="quiet" size="small" label="Edit name" accessibilityHint={`Change ${first}'s name`} onPress={props.onRename} />
        </View>
      ) : null}
      <Body style={{ marginTop: space.s }}>
        {props.lines.length
          ? "Everything you've told Kinship about them, and where each came from. Change or remove any of it."
          : `What you tell Kinship about ${first} will be here.`}
      </Body>
      <View
        onLayout={(e) => focus.onGroup("lines", e.nativeEvent.layout.y)}
        style={{ marginTop: space.xl, borderTopWidth: props.lines.length ? 1 : 0, borderTopColor: p.hairline }}
      >
        {props.lines.map((r) => (
          <View
            key={r.line.id}
            onLayout={(e) => focus.onLine("lines", r.line.id, e.nativeEvent.layout.y)}
            style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}
          >
            <Emphasis on={!!props.focusItemId && props.focusItemId === r.line.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={r.line.statement}
              accessibilityHint="Double-tap to change the words"
              onPress={() => props.onChange(r.line, "words")}
              style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
            >
              <Line>{r.line.statement}</Line>
            </Pressable>
            <View style={{ marginTop: space.s }}>
              <TokenRow>
                {r.line.person?.changeable ? (
                  <Token what="Who" value={r.line.person.label} onPress={() => props.onChange(r.line, "person")} />
                ) : null}
                {r.line.about ? <Token what="About" value={r.line.about} /> : null}
                {r.line.also?.length ? <Token what="Also about" value={r.line.also.join(", ")} /> : null}
                {r.line.when ? (
                  <Token what="When" value={r.line.when.label} onPress={r.line.when.changeable ? () => props.onChange(r.line, "date") : undefined} />
                ) : null}
                {r.line.maybe ? <Token what="How sure" value="Maybe" /> : null}
                <Token what="What" value={r.line.kind.label} onPress={r.line.kind.changeable ? () => props.onChange(r.line, "kind") : undefined} />
              </TokenRow>
            </View>
            {/* Gate E: what this updated stays traceable. */}
            {r.line.replaces ? <Small style={{ marginTop: space.xs }}>{`Before: ${r.line.replaces}`}</Small> : null}
            {r.line.editedFrom ? (
              <Small style={{ marginTop: space.xs }} accessibilityLabel={`Edited by you. Before: ${r.line.editedFrom}`}>
                {"Edited by you · was: "}
                <Text style={{ textDecorationLine: "line-through" }}>{r.line.editedFrom}</Text>
              </Small>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.s }}>
              <View style={{ flex: 1 }}>
                <Provenance line={r.provenance} onPress={r.noteId ? () => props.onSource(r.noteId as string) : undefined} />
              </View>
              <Pill variant="quiet" label="Edit" accessibilityLabel={`Edit: ${r.line.statement}`} accessibilityHint="Change the words" onPress={() => props.onChange(r.line, "words")} />
              <Pill variant="quiet" label="Not this" accessibilityLabel={`Not this: ${r.line.statement}`} onPress={() => props.onForget(r)} />
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
            </Emphasis>
          </View>
        ))}
      </View>
      {props.children}
    </Screen>
  );
}
