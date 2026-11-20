// Your words (CMR-1): the notes that belong with no one in People, kept where they can be found.
// Reached from the foot of People (notebook_deck); a note opens its Source page.
import React from "react";
import { router } from "expo-router";
import { WordsView } from "@/features/people/notebook/WordsView";
import { useWords } from "@/hooks/usePages";

export default function WordsRoute() {
  const { notes, loading } = useWords();
  return <WordsView notes={notes} loading={loading} onBack={() => router.back()} onOpen={(captureId) => router.push(`/v2/source/${captureId}`)} />;
}
