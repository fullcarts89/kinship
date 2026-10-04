// The Source view, from plain data (plan §6): the note as told, the words
// each memory rests on marked, how and when it arrived, and what it produced.
import React from "react";
import { Text, View } from "react-native";
import { space, type } from "@/design/tokens";
import { Body, Label, Pill, Row, Screen, Small, usePalette } from "@/ui";

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
  const back = <Pill variant="quiet" label="Back" onPress={onBack} />;
  if (!note) {
    return (
      <Screen left={back} title="Your note">
        <Body tone="inkSoft">{"This note isn't here any more."}</Body>
      </Screen>
    );
  }
  return (
    <Screen left={back} title="Your note">
      <Small>{note.arrived}</Small>
      <View style={{ marginTop: space.m }}>
        {note.runs ? (
          <Text style={[type.statement, { color: p.ink }]} accessibilityLabel={note.runs.map((r) => r.text).join("")}>
            {note.runs.map((r, i) => (
              <Text key={i} style={r.marked ? { backgroundColor: p.mark } : undefined}>{r.text}</Text>
            ))}
          </Text>
        ) : (
          <View>
            <Body tone="inkSoft">You chose not to keep the note itself. These words from it stay with what they support:</Body>
            {note.quotes.map((q) => (
              <Body key={q} style={{ marginTop: space.s }}>{`“${q}”`}</Body>
            ))}
          </View>
        )}
      </View>
      {note.items.length ? <Label style={{ marginTop: space.xl }}>From this note</Label> : null}
      {note.items.map((i) => (
        <Row key={i.id} title={i.statement} subtitle={i.person} onPress={() => onPerson(i.personId)} />
      ))}
      <View style={{ alignItems: "flex-start", marginTop: space.xl }}>
        <Pill variant="danger" label="Delete this note" onPress={onDelete} />
      </View>
    </Screen>
  );
}
