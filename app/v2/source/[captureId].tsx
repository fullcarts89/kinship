// The Source view (plan §6): the note as the user told it, its evidence
// marked, and what came of it. Deleting it forgets what came only from it.
// Opened from a question ("See the note"), it hands the question back on the
// way out: looking never decides anything (stabilization Gate A).
// Behind `notebook_deck` it is the notebook's Source page (PR #77): the note
// on ruled paper with each line's words in its person's colour, and a line
// opens its line sheet (`item` underlines the line it was opened from).
import React, { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { NoteView } from "@/features/person/NoteView";
import { LineSheet } from "@/features/person/notebook/LineSheet";
import { NotebookSourceView } from "@/features/person/notebook/SourceView";
import { useTellFlow } from "@/features/tell/TellFlow";
import { useNotebook } from "@/hooks/useNotebook";
import { useSourcePage } from "@/hooks/usePages";
import { usePersonPortrait } from "@/hooks/usePersonPortrait";
import { todayIso, useNote, usePeople, useUnderstanding, useV2Actions } from "@/hooks/useV2";
import { Face } from "@/ui/notebook";

export default function SourceRoute() {
  return <SourceScreen notebook={useNotebook()} />;
}

function SourceScreen({ notebook }: { notebook: boolean }) {
  const { captureId, item } = useLocalSearchParams<{ captureId: string; item?: string }>();
  const note = useNote(String(captureId));
  const { deleteNote } = useV2Actions();
  const flow = useTellFlow();
  // Only on the way out (the latest handler, not the one from when it opened).
  const returnFromNote = useRef(flow.returnFromNote);
  returnFromNote.current = flow.returnFromNote;
  useEffect(() => () => returnFromNote.current(String(captureId)), [captureId]);
  const onDelete = () =>
    Alert.alert("Delete this note?", "What Kinship remembers only from it goes too.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteNote(String(captureId)).then(() => router.back()) },
    ]);
  // Option A: the words Kinship couldn't get to go back into the Tell field (on Today or People, where it lives).
  const onTellRest = () => {
    flow.tellRest(String(captureId));
    router.back();
  };
  if (notebook) {
    return <NotebookSource captureId={String(captureId)} note={note} focusItemId={typeof item === "string" ? item : null} onDelete={onDelete} onTellRest={onTellRest} />;
  }
  return (
    <NoteView
      note={note}
      onBack={() => router.back()}
      onPerson={(personId) => router.push(`/v2/person/${personId}`)}
      onDelete={onDelete}
      onTellRest={onTellRest}
    />
  );
}

function NotebookSource({ captureId, note, focusItemId, onDelete, onTellRest }: {
  captureId: string;
  note: ReturnType<typeof useNote>;
  focusItemId: string | null;
  onDelete: () => void;
  onTellRest: () => void;
}) {
  const page = useSourcePage(captureId);
  const people = usePeople();
  const u = useUnderstanding();
  const [itemId, setItemId] = useState<string | null>(null);
  const fail = (what: Promise<unknown>) =>
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  return (
    <>
      <NotebookSourceView
        note={note}
        page={page}
        focusItemId={focusItemId}
        onBack={() => router.back()}
        onLine={setItemId}
        onPerson={(personId) => router.push(`/v2/person/${personId}`)}
        onDelete={onDelete}
        onTellRest={onTellRest}
        faceFor={(personId, name) => <KeptFace personId={personId} name={name} />}
      />
      <LineSheet
        itemId={itemId}
        people={people}
        today={todayIso()}
        onCorrect={(iid, change) => fail(u.correct(iid, change))}
        onForget={(iid) => {
          setItemId(null);
          fail(u.reject(iid));
        }}
        // Already on this note: the sheet closes onto it.
        onSource={(noteId, iid) => {
          setItemId(null);
          if (noteId !== captureId) router.push(`/v2/source/${noteId}?item=${encodeURIComponent(iid)}`);
        }}
        onDismiss={() => setItemId(null)}
      />
    </>
  );
}

function KeptFace({ personId, name }: { personId: string; name: string }) {
  const photo = usePersonPortrait(personId);
  return <Face personId={personId} name={name} size={32} photoUri={photo.uri} />;
}
