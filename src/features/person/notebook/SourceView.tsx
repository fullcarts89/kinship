// The Source page in the notebook (PR #77 `renderSource`): "Your note" (or "Saved from an idea"), the day
// as its title, the note on ruled paper with each kept line's words marked in its person's colour (the
// line it was opened from underlined), "What Kinship kept from this" with each person's face, and
// everything the built Source view does (NoteView.tsx): Option A's words not got to and Tell the rest,
// "Since updated", the note's words gone, Delete this note.
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notebook, notebookShadow, press, space } from "@/design/tokens";
import { NOTE_COPY, partialNoteLine, type NoteData } from "@/features/person/NoteView";
import type { SourcePage } from "@/hooks/usePages";
import { Pressable } from "@/ui/Pressable";
import { usePalette } from "@/ui";
import { Face, Lbl, NButton, NText, RuledPaper, personLook } from "@/ui/notebook";
import { longDay } from "./pagesModel";
import { MarkedWords, PrivateSource, SolidBack, sourceType } from "./parts";

export const SOURCE_COPY = {
  note: "Your note",
  saved: "Saved from an idea",
  kept: "What Kinship kept from this",
  none: "Nothing from this note is kept as a line.",
  fine: "Kinship keeps your words exactly as you wrote them. Every line it understood points back here.",
  updated: "Since updated",
  delete: "Delete this note",
} as const;

/**
 * A person's colour as a highlighter. The prototype draws a 65% stroke under the lower third of the
 * line; React Native can only fill the whole line, so the tint is lighter to keep the same weight.
 */
function marker(color: string): string {
  return /^#[0-9a-f]{6}$/iu.test(color) ? `${color}57` : color;
}

export function NotebookSourceView({ note, page, focusItemId, now = new Date(), onBack, onLine, onPerson, onDelete, onTellRest, faceFor }: {
  note: NoteData | null;
  page: SourcePage | null;
  focusItemId?: string | null;
  now?: Date;
  onBack: () => void;
  /** A kept line: its line sheet. */
  onLine: (itemId: string) => void;
  onPerson: (personId: string) => void;
  onDelete: () => void;
  onTellRest?: () => void;
  /** A person's face (their photo, when the user chose one). */
  faceFor?: (personId: string, name: string) => React.ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const back = <SolidBack onPress={onBack} style={{ position: "absolute", top: insets.top + 10, left: 14, zIndex: 5 }} />;
  if (!note) {
    return (
      <View style={{ flex: 1, backgroundColor: p.paper }}>
        {back}
        <NText v="body16" tone="ink2" style={{ marginTop: insets.top + 80, marginHorizontal: 22 }}>{"This note isn't here any more."}</NText>
      </View>
    );
  }
  const runs = note.runs;
  const text = runs ? runs.map((r) => r.text).join("") : null;
  // Where Kinship couldn't get to (Option A), as ranges of the note's own text.
  const left: [number, number][] = [];
  if (runs) {
    let at = 0;
    for (const r of runs) {
      if (r.unprocessed) left.push([at, at + r.text.length]);
      at += r.text.length;
    }
  }
  const spans = (page?.spans ?? []).map((s) => ({ start: s.start, end: s.end, itemId: s.itemId, sensitive: s.sensitive, personId: s.personId }));
  const personOf = new Map(spans.map((s) => [s.itemId, s.personId]));
  const kept = page?.kept ?? note.items.map((i) => ({ itemId: i.id, statement: i.statement, personId: i.personId, person: i.person, sensitive: false, updated: !!i.updated }));
  const partialLine = note.partial ? partialNoteLine(note.partial, runs?.some((r) => r.unprocessed) ?? false) : "";
  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 60, paddingHorizontal: 22, paddingBottom: insets.bottom + 40 }}>
        <NText v="cap" tone="ink2">{page?.intention ? SOURCE_COPY.saved : SOURCE_COPY.note}</NText>
        <NText v="title" style={{ fontSize: 34, lineHeight: 34, marginTop: space.s }}>{page?.at ? longDay(page.at, now) : note.arrived}</NText>
        <NText v="small" tone="quiet" style={{ marginTop: space.s, marginBottom: 18 }}>{note.arrived}</NText>
        <View style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderTopRightRadius: 22, borderBottomRightRadius: 22, ...notebookShadow.card }}>
          <RuledPaper lineHeight={notebook.ruled.tell} style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderTopRightRadius: 22, borderBottomRightRadius: 22, paddingTop: space.l, paddingBottom: 18, paddingLeft: 26, paddingRight: 18 }}>
            {text !== null ? (
              <MarkedWords
                text={text}
                spans={spans}
                unprocessed={left}
                focusItemId={focusItemId}
                colorOf={(s) => marker(personLook(personOf.get(s.itemId) ?? s.itemId).color)}
                style={sourceType}
                onLine={onLine}
                lineLabel={(id) => kept.find((k) => k.itemId === id)?.statement ?? null}
              />
            ) : (
              <View>
                <NText v="body15" tone="ink2">{"You chose not to keep the note itself. These words from it stay with what they support:"}</NText>
                {note.quotes.map((q) => <NText key={q} v="quote19" style={{ marginTop: space.m }}>{`“${q}”`}</NText>)}
              </View>
            )}
          </RuledPaper>
        </View>
        {note.partial ? (
          <View style={{ marginTop: space.m, gap: space.s, alignItems: "flex-start" }}>
            {runs?.some((r) => r.unprocessed && !r.marked) ? <NText v="small" tone="quiet">{NOTE_COPY.dotted}</NText> : null}
            {runs?.some((r) => r.unprocessed && r.marked) ? <NText v="small" tone="quiet">{NOTE_COPY.shaded}</NText> : null}
            {partialLine ? <NText v="small" tone="quiet">{partialLine}</NText> : null}
            {note.partial.tellRest && onTellRest ? (
              <NButton small label={NOTE_COPY.tellRest} accessibilityHint="Puts the words Kinship couldn't get to in the Tell field, to tell again" onPress={onTellRest} />
            ) : null}
          </View>
        ) : null}
        <View style={{ marginTop: 24 }}>
          <Lbl style={{ marginBottom: space.s }}>{SOURCE_COPY.kept}</Lbl>
          {kept.length ? kept.map((k) => (
            <View key={k.itemId} style={{ flexDirection: "row", gap: space.m, alignItems: "flex-start", paddingVertical: space.s + 1 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={k.person} accessibilityHint={`Opens ${k.person}`} onPress={() => onPerson(k.personId)}
                style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}>
                {faceFor ? faceFor(k.personId, k.person) : <Face personId={k.personId} name={k.person} size={32} />}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={k.statement}
                accessibilityHint={k.updated ? `Opens ${k.person}` : "Opens this line"}
                onPress={() => (k.updated ? onPerson(k.personId) : onLine(k.itemId))}
                style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? press.surface : 1 })}
              >
                <NText v="serif17">{k.statement}</NText>
                {k.updated ? <NText v="small" tone="quiet" style={{ marginTop: 2 }}>{`${k.person} · ${SOURCE_COPY.updated}`}</NText> : null}
                {k.sensitive ? <View style={{ marginTop: space.xs }}><PrivateSource dot="held" /></View> : null}
              </Pressable>
            </View>
          )) : <NText v="fine" tone="quiet">{SOURCE_COPY.none}</NText>}
        </View>
        <NText v="fine" tone="quiet" style={{ marginTop: 14 }}>{SOURCE_COPY.fine}</NText>
        <View style={{ alignItems: "flex-start", marginTop: space.x3 }}>
          <NButton small variant="ghost" label={SOURCE_COPY.delete} accessibilityHint="What Kinship remembers only from it goes too" onPress={onDelete} />
        </View>
      </ScrollView>
      {back}
    </View>
  );
}
