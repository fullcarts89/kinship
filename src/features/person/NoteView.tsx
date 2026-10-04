// The Source view (plan §6; Design Direction §J "what you said, when"): the
// note as the user told it, the words each memory rests on underlined in
// ochre, how and when it arrived, and what came of it. Deleting it forgets
// what came only from it.
import React from "react";
import { Text, View } from "react-native";
import { maxScale, size, space, type } from "@/design/tokens";
import { Body, Label, MomentText, Pill, Row, Screen, Small, Sprig, usePalette } from "@/ui";

export interface NoteData {
  /** The note's words in plain and marked runs; null once the note's own text is gone. */
  runs: { text: string; marked: boolean }[] | null;
  /** The kept excerpts when the note's text is gone. */
  quotes: string[];
  arrived: string;
  items: { id: string; statement: string; person: string; personId: string }[];
}

export function NoteView({
  note,
  onBack,
  onPerson,
  onDelete,
}: {
  note: NoteData | null;
  onBack: () => void;
  onPerson: (personId: string) => void;
  onDelete: () => void;
}) {
  const p = usePalette();
  if (!note) {
    return (
      <Screen onBack={onBack}>
        <Body>{"This note isn't here any more."}</Body>
      </Screen>
    );
  }
  return (
    <Screen onBack={onBack}>
      <Label>Your note</Label>
      <Small style={{ marginTop: space.xs }}>{note.arrived}</Small>
      <View style={{ marginTop: space.xl }}>
        {note.runs ? (
          <Text
            maxFontSizeMultiplier={maxScale.text}
            style={[type.moment, { color: p.ink }]}
            accessibilityLabel={note.runs.map((r) => r.text).join("")}
          >
            {note.runs.map((r, i) => (
              <Text
                key={i}
                style={r.marked ? { textDecorationLine: "underline", textDecorationColor: p.ochre, textDecorationStyle: "solid" } : undefined}
              >
                {r.text}
              </Text>
            ))}
          </Text>
        ) : (
          <View>
            <Body>You chose not to keep the note itself. These words from it stay with what they support:</Body>
            {note.quotes.map((q) => (
              <MomentText key={q} style={{ marginTop: space.m }}>{`“${q}”`}</MomentText>
            ))}
          </View>
        )}
      </View>
      {note.runs && note.items.length ? (
        <Small style={{ marginTop: space.m }}>
          {"Underlined: the words Kinship kept"}
        </Small>
      ) : null}
      {note.items.length ? <Label style={{ marginTop: space.x3, marginBottom: space.s }}>From this note</Label> : null}
      {note.items.map((i, n) => (
        <Row
          key={i.id}
          first={n === 0}
          leading={<Sprig personId={i.personId} width={size.sprig.row} />}
          title={i.statement}
          subtitle={i.person}
          accessibilityHint={`Opens ${i.person}`}
          onPress={() => onPerson(i.personId)}
        />
      ))}
      <View style={{ alignItems: "flex-start", marginTop: space.x3 }}>
        <Pill variant="danger" size="small" label="Delete this note" onPress={onDelete} />
      </View>
    </Screen>
  );
}
