// The Source view (plan §6; Design Direction §J "what you said, when"): the
// note as the user told it, the words each memory rests on underlined in
// mark, how and when it arrived, and what came of it. Deleting it forgets
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
   * still partial). `followUp`: what later notes ("Tell the rest") are, as the phone has them; `recovered`:
   * how many passages a read later note demonstrably answered; `uncertain`: how many it kept something new
   * on without that proving what was missed (words that held more than one thing); `resolved`: all
   * answered, and nothing unplaced; `tellRest`: offer the pill.
   */
  partial?: { followUp: "none" | "pending" | "failed" | "read"; resolved: boolean; recovered: number; uncertain: number; unlocated: number; tellRest: boolean } | null;
}

export const NOTE_COPY = {
  underlined: "Underlined: the words Kinship kept",
  dotted: "Dotted: words Kinship couldn't get to",
  /** A kept line's words that also hold something not got to (two things in one sentence): shown on the kept mark, never hidden by it. */
  shaded: "Shaded: kept words that also hold something Kinship couldn't get to",
  /** No span could be placed for what was left out: said plainly, nothing invented. */
  someLeft: "Kinship couldn't get to all of this note.",
  /** Only once a later note that was read has a kept line on every passage, and nothing was unplaced. */
  continued: "The rest was kept from a later note.",
  pending: "You told the rest in a later note. Kinship hasn't read it yet.",
  failed: "Kinship couldn't read the note that told the rest. Try again from that note.",
  some: "Some of it was kept from a later note. The marked words weren't.",
  missed: "Your later note didn't cover the marked words.",
  /** Kept something new on marked words that held more than one thing: said as that, never as recovery. */
  unsure: "A later note kept something from the marked words. Kinship can't tell if it was all it had missed.",
  unplaced: "Part of this note couldn't be placed in its words, so Kinship can't tell if a later note covered it.",
  tellRest: "Tell the rest",
} as const;

/** The one line under a partial note about what later notes did: from the evidence, never assumed. */
export function partialNoteLine(partial: NonNullable<NoteData["partial"]>, marked: boolean): string {
  if (partial.resolved) return NOTE_COPY.continued;
  if (partial.followUp === "pending") return NOTE_COPY.pending;
  if (partial.followUp === "failed") return NOTE_COPY.failed;
  if (partial.followUp === "read") return !marked ? NOTE_COPY.unplaced : partial.uncertain ? NOTE_COPY.unsure : partial.recovered ? NOTE_COPY.some : NOTE_COPY.missed;
  return marked ? "" : NOTE_COPY.someLeft;
}

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
                  ? {
                    textDecorationLine: "underline", textDecorationColor: p.mark, textDecorationStyle: "solid",
                    // Kept words that also hold something not got to: the kept mark stays, and the words are shaded.
                    ...(r.unprocessed ? { backgroundColor: p.hairline } : {}),
                  }
                  : r.unprocessed
                    // Not mark: nothing here was understood. A plain, dotted mark on the note's own words.
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
      {/* Option A: what the understanding did not get to, said plainly, and what later notes did, from the
          evidence; the rest can be told again while that is the honest next step. */}
      {note.partial ? (
        <View style={{ marginTop: space.s, gap: space.s, alignItems: "flex-start" }}>
          {note.runs?.some((r) => r.unprocessed && !r.marked) ? <Small>{NOTE_COPY.dotted}</Small> : null}
          {note.runs?.some((r) => r.unprocessed && r.marked) ? <Small>{NOTE_COPY.shaded}</Small> : null}
          {(() => {
            const line = partialNoteLine(note.partial, note.runs?.some((r) => r.unprocessed) ?? false);
            return line ? <Small>{line}</Small> : null;
          })()}
          {note.partial.tellRest && onTellRest ? <Pill size="small" label={NOTE_COPY.tellRest} accessibilityHint="Puts the words Kinship couldn't get to in the Tell field, to tell again" onPress={onTellRest} /> : null}
        </View>
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
