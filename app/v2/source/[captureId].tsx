// The Source view (plan §6): the note as the user told it, the words each
// memory rests on marked, how and when it arrived, and everything it
// produced. Deleting the note forgets what came only from it.
import React from "react";
import { Alert, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { space, type } from "@/design/tokens";
import { useNote, useV2Actions } from "@/hooks/useV2";
import { Body, Label, Pill, Row, Screen, Small, usePalette } from "@/ui";

export default function SourceScreen() {
  const { captureId } = useLocalSearchParams<{ captureId: string }>();
  const note = useNote(String(captureId));
  const { deleteNote } = useV2Actions();
  const p = usePalette();
  const back = <Pill variant="quiet" label="Back" onPress={() => router.back()} />;
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
        <Row key={i.id} title={i.statement} subtitle={i.person} onPress={() => router.push(`/v2/person/${i.personId}`)} />
      ))}
      <View style={{ alignItems: "flex-start", marginTop: space.xl }}>
        <Pill
          variant="danger"
          label="Delete this note"
          onPress={() =>
            Alert.alert("Delete this note?", "What Kinship remembers only from it goes too.", [
              { text: "Keep it", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  void deleteNote(String(captureId)).then(() => router.back());
                },
              },
            ])}
        />
      </View>
    </Screen>
  );
}
