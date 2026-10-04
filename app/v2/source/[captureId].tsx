// The Source view (plan §6): the note as the user told it, its evidence
// marked, and what came of it. Deleting it forgets what came only from it.
import React from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { NoteView } from "@/features/person/NoteView";
import { useNote, useV2Actions } from "@/hooks/useV2";

export default function SourceScreen() {
  const { captureId } = useLocalSearchParams<{ captureId: string }>();
  const note = useNote(String(captureId));
  const { deleteNote } = useV2Actions();
  return (
    <NoteView
      note={note}
      onBack={() => router.back()}
      onPerson={(personId) => router.push(`/v2/person/${personId}`)}
      onDelete={() =>
        Alert.alert("Delete this note?", "What Kinship remembers only from it goes too.", [
          { text: "Keep it", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => void deleteNote(String(captureId)).then(() => router.back()) },
        ])}
    />
  );
}
