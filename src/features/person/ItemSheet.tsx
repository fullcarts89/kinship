// Correcting one remembered line (plan §8; the friction rule: tap the text →
// a focused correction → done). The line in the user's words, its who, when
// and what as tokens, where it came from, and "Not this". A token opens its
// picker in the same sheet; a change saves at once.
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { press, space } from "@/design/tokens";
import type { Correction } from "@/features/tell/ReviewSheet";
import { DatePane, KindPane, PersonPane, WordsPane } from "@/features/tell/Pickers";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { Person } from "@/store/repositories";
import { MomentText, Pill, Provenance, Sheet, Small, Token, TokenRow, usePalette } from "@/ui";

type Pane = "item" | "person" | "date" | "kind" | "words";

export const ITEM_COPY = {
  edit: "Edit the words",
  tokens: "Tap who, when or what to change it.",
} as const;

export interface ItemSheetProps {
  item: { line: ItemLine; provenance: string; noteId: string | null } | null;
  visible: boolean;
  people: Person[];
  today: string;
  onCorrect: (itemId: string, change: Correction) => void;
  onForget: (itemId: string) => void;
  onSource: (noteId: string) => void;
  onDismiss: () => void;
  /** Opens on a picker (the lab). */
  initialPane?: Pane;
}

export function ItemSheet(props: ItemSheetProps) {
  const [pane, setPane] = useState<Pane>(props.initialPane ?? "item");
  useEffect(() => {
    if (!props.visible) setPane("item");
  }, [props.visible]);
  const it = props.item;
  const back = () => setPane("item");
  let body: React.ReactNode = null;
  if (it) {
    const { line } = it;
    if (pane === "person") {
      body = <PersonPane people={props.people} title="Who is this about?" current={line.person?.id ?? null} onCancel={back}
        onPick={(id) => { props.onCorrect(line.id, { person_id: id }); back(); }} />;
    } else if (pane === "date") {
      body = <DatePane title="When is it?" initial={line.when?.value ?? null} today={props.today} allowNone onCancel={back}
        onPick={(day) => { props.onCorrect(line.id, { date: day }); back(); }} />;
    } else if (pane === "kind") {
      body = <KindPane current={line.kind.value} owner={line.kind.owner} onCancel={back}
        onPick={(k) => { props.onCorrect(line.id, { kind: k }); back(); }}
        onOwner={(o) => { props.onCorrect(line.id, { owner: o }); back(); }} />;
    } else if (pane === "words") {
      body = <WordsPane initial={line.statement} onCancel={back} onSave={(w) => { props.onCorrect(line.id, { statement: w }); back(); }} />;
    } else {
      body = (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={line.statement}
            accessibilityHint="Double-tap to change the words"
            onPress={() => setPane("words")}
            style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
          >
            <MomentText>{line.statement}</MomentText>
          </Pressable>
          <View style={{ alignItems: "flex-start", marginLeft: -space.xs }}>
            <Pill variant="quiet" label={ITEM_COPY.edit} accessibilityHint="Change the words" onPress={() => setPane("words")} />
          </View>
          <View style={{ marginTop: space.xs }}>
            <TokenRow>
              {line.person?.changeable ? <Token what="Who" value={line.person.label} onPress={() => setPane("person")} /> : null}
              {line.about ? <Token what="About" value={line.about} /> : null}
              {line.also?.length ? <Token what="Also about" value={line.also.join(", ")} /> : null}
              {line.when ? <Token what="When" value={line.when.label} onPress={line.when.changeable ? () => setPane("date") : undefined} /> : null}
              <Token what="What" value={line.kind.label} onPress={line.kind.changeable ? () => setPane("kind") : undefined} />
            </TokenRow>
          </View>
          <View style={{ marginTop: space.l }}>
            <Provenance line={it.provenance} onPress={it.noteId ? () => props.onSource(it.noteId as string) : undefined} />
          </View>
          {line.edited ? <EditedFrom before={line.editedFrom ?? null} /> : null}
          {line.replaces ? <Small style={{ marginTop: space.xs }}>{`Before: ${line.replaces}`}</Small> : null}
          <Small style={{ marginTop: space.xl }}>{ITEM_COPY.tokens}</Small>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, marginTop: space.m }}>
            <Pill variant="danger" size="small" label="Not this" accessibilityHint="Kinship forgets this" onPress={() => props.onForget(line.id)} />
            <View style={{ flex: 1 }} />
            <Pill variant="primary" label="Done" onPress={props.onDismiss} />
          </View>
        </View>
      );
    }
  }
  return (
    <Sheet visible={props.visible && !!it} onDismiss={props.onDismiss} label="Change">
      {body}
    </Sheet>
  );
}

/** "Edited by you", and quietly, what it said before (founder H30). Never a timeline. */
function EditedFrom({ before }: { before: string | null }) {
  const p = usePalette();
  if (!before) return <Small style={{ marginTop: space.xs }}>Edited by you</Small>;
  return (
    <Small style={{ marginTop: space.xs }} accessibilityLabel={`Edited by you. Before: ${before}`}>
      {"Edited by you · was: "}
      <Text style={{ textDecorationLine: "line-through", color: p.inkQuiet }}>{before}</Text>
    </Small>
  );
}
