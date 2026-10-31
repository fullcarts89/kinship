// "In your memory" (Ask Kinship v1; CC-25; FD-30a; board B3 "When did I last
// see Sam?"): under the people a search finds, the lines of the user's own
// memory that answer what they typed, under the person each is filed on, in
// the words their page shows, with its source. Tap the words → that line on
// their page; tap the source → the note (a composed residence line → the
// notes it comes from, as on the page). A superseded line is marked Earlier.
// When nothing answers, one quiet line. No chat, no button, no model, no
// suggestion, no count. The Quiet Herbarium's rows; WS-2 restyles.
import React from "react";
import { View } from "react-native";
import { press, space } from "@/design/tokens";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { Body, Label, Line, Provenance, Small, usePalette } from "@/ui";
import { Pressable } from "@/ui/Pressable";
import { ASK_COPY } from "./retrieve";
import type { AskView } from "./useAsk";

export interface AskResultsProps {
  view: AskView;
  /** The line's words: that line on the person's page. */
  onLine: (href: string) => void;
  /** A line's source: the note. */
  onSource: (noteId: string) => void;
  /** A composed residence line's source: the notes it comes from (ComposedSheet). */
  onComposed: (row: RecordLine) => void;
}

/** The quiet mark a remembered or paused person's lines carry (a label, never a reason). */
export const ASK_A11Y = {
  hint: "Opens this on their page",
  conversation: "Opens their page",
} as const;

export function AskResults({ view, onLine, onSource, onComposed }: AskResultsProps) {
  const p = usePalette();
  if (!view.asked) return null;
  const empty = !view.groups.length && !view.birthdays.length;
  return (
    <View style={{ marginTop: space.x3 }} accessibilityLabel={ASK_COPY.section}>
      <Label tone="inkBody" accessibilityRole="header">{ASK_COPY.section}</Label>
      {empty ? (
        <Body style={{ marginTop: space.s }} accessibilityLabel={view.miss ?? ASK_COPY.nothing}>{view.miss ?? ASK_COPY.nothing}</Body>
      ) : null}
      {view.groups.map((g) => (
        <View key={g.personId} style={{ marginTop: space.l }}>
          <Small accessibilityRole="header">{g.name}</Small>
          <View style={{ marginTop: space.xs, borderTopWidth: 1, borderTopColor: p.hairline }}>
            {g.conversations.map((t) => (
              <View key={t.id} accessible accessibilityLabel={t.about ? `${t.label}. ${t.about}` : t.label} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
                <Line>{t.label}</Line>
                {t.about ? <Small style={{ marginTop: space.xs }}>{t.about}</Small> : null}
              </View>
            ))}
            {g.rows.map((r) => {
              const text = r.row.display ?? r.row.line.statement;
              const note = r.row.noteId;
              return (
                <View key={r.key} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
                  {r.earlier ? <Small style={{ marginBottom: space.xs }}>{ASK_COPY.earlier}</Small> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={r.earlier ? `${ASK_COPY.earlier}: ${text}` : text}
                    accessibilityHint={ASK_A11Y.hint}
                    onPress={() => onLine(r.href)}
                    style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
                  >
                    <Line>{text}</Line>
                  </Pressable>
                  <View style={{ marginTop: space.s }}>
                    <Provenance
                      line={r.row.provenance}
                      onPress={r.row.composed ? () => onComposed(r.row) : note ? () => onSource(note) : undefined}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {view.birthdays.length ? (
        <View style={{ marginTop: space.l, borderTopWidth: 1, borderTopColor: p.hairline }}>
          {view.birthdays.map((b) => (
            <View key={b.personId} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={b.text}
                accessibilityHint={ASK_A11Y.conversation}
                onPress={() => onLine(b.href)}
                style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
              >
                <Line>{b.text}</Line>
              </Pressable>
              <View style={{ marginTop: space.s }}>
                <Provenance line={b.provenance} />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
