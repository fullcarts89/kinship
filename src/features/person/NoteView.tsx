// The Source view (plan §6; Design Direction §J "what you said, when"): the
// note as the user told it, the words each memory rests on underlined in
// ochre, how and when it arrived, and what came of it. Deleting it forgets
// what came only from it.
import React from "react";
import { Text, View } from "react-native";
import { maxScale, size, space, type } from "@/design/tokens";
import { Body, Label, MomentText, Pill, Row, Screen, Small, Sprig, usePalette } from "@/ui";

export interface NoteData {
  /**
   * The note's words in plain and marked runs; null once the note's own text is gone. `unprocessed`
   * (Option A): words the understanding did not get to, until the user tells the rest.
   */
  runs: { text: string; marked: boolean; unprocessed?: boolean }[] | null;
  /** The kept excerpts when the note's text is gone. */
  quotes: string[];
  arrived: string;
  /** What came of it; a line since replaced by a later note stays, marked (H25). */
  items: { id: string; statement: string; person: string; personId: string; updated?: boolean }[];
  /**
   * The note held more than the understanding could take (Option A, founder 19 Oct). `unlocated`: how
   * many of the things left out could not be placed in the note (nothing is marked for them; the note is
   * still partial). `continued`: the user has told the rest in a later note.
   */
  partial?: { continued: boolean; unlocated: number } | null;
}

export const NOTE_COPY = {
  underlined: "Underlined: the words Kinship kept",
  dotted: "Dotted: words Kinship couldn't get to",
  /** No span could be placed for what was left out: said plainly, nothing invented. */
  someLeft: "Kinship couldn't get to all of this note.",
  continued: "You told the rest in a later note.",
  tellRest: "Tell the rest",
} as const;

export function NoteView({
  note,
  onBack,
  onPerson,
  onDelete,
  onTellRest,
}: {
  note: NoteData | null;
  onBack: () => void;
  onPerson: (personId: string) => void;
  onDelete: () => void;
  /** "Tell the rest" of a note the understanding could not take whole (Option A). */
  onTellRest?: () => void;
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
                style={r.marked
                  ? { textDecorationLine: "underline", textDecorationColor: p.ochre, textDecorationStyle: "solid" }
                  : r.unprocessed
                    // Not ochre: nothing here was understood. A plain, dotted mark on the note's own words.
                    ? { textDecorationLine: "underline", textDecorationColor: p.inkQuiet, textDecorationStyle: "dotted" }
                    : undefined}
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
          {NOTE_COPY.underlined}
        </Small>
      ) : null}
      {/* Option A: what the understanding did not get to, said plainly; the rest can be told again. */}
      {note.partial && !note.partial.continued ? (
        <View style={{ marginTop: space.s, gap: space.s, alignItems: "flex-start" }}>
          <Small>{note.runs?.some((r) => r.unprocessed) ? NOTE_COPY.dotted : NOTE_COPY.someLeft}</Small>
          {onTellRest ? <Pill size="small" label={NOTE_COPY.tellRest} accessibilityHint="Puts the words Kinship couldn't get to in the Tell field, to tell again" onPress={onTellRest} /> : null}
        </View>
      ) : note.partial?.continued ? (
        <Small style={{ marginTop: space.s }}>{NOTE_COPY.continued}</Small>
      ) : null}
      {note.items.length ? <Label style={{ marginTop: space.x3, marginBottom: space.s }}>From this note</Label> : null}
      {note.items.map((i, n) => (
        <Row
          key={i.id}
          first={n === 0}
          leading={<Sprig personId={i.personId} width={size.sprig.row} />}
          title={i.statement}
          subtitle={i.updated ? `${i.person} · Since updated` : i.person}
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
