// The Source view (plan §6): the note as the user told it, its evidence
// marked, and what came of it. Deleting it forgets what came only from it.
// Opened from a question ("See the note"), it hands the question back on the
// way out: looking never decides anything (stabilization Gate A).
import React, { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { NoteView } from "@/features/person/NoteView";
import { useTellFlow } from "@/features/tell/TellFlow";
import { useNote, useV2Actions } from "@/hooks/useV2";

export default function SourceScreen() {
  const { captureId } = useLocalSearchParams<{ captureId: string }>();
  const note = useNote(String(captureId));
  const { deleteNote } = useV2Actions();
  const flow = useTellFlow();
  // Only on the way out (the latest handler, not the one from when it opened).
  const returnFromNote = useRef(flow.returnFromNote);
  returnFromNote.current = flow.returnFromNote;
  useEffect(() => () => returnFromNote.current(String(captureId)), [captureId]);
  return (
    <NoteView
      note={note}
      onBack={() => router.back()}
      onPerson={(personId) => router.push(`/v2/person/${personId}`)}
      onDelete={() =>
        Alert.alert("Delete this note?", "What Kinship remembers only from it goes too.", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => void deleteNote(String(captureId)).then(() => router.back()) },
        ])}
    />
  );
}
