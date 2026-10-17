// What a composed line comes from (Phase 4B B5; brief §12; investigation
// §8.1): its member lines, each in the words as stored, with its own
// provenance (tap → that note's Source view), Edit and Not this, through the
// same row What Kinship knows draws. The two notes are the explanation:
// nothing here says that one place is in another, and nothing names a
// reading, a dataset or a rule.
import React from "react";
import { View } from "react-native";
import { space } from "@/design/tokens";
import { MomentText, Pill, Provenance, Sheet, Small, usePalette } from "@/ui";
import { type PersonRecordViewProps, type RecordLine, RecordRow } from "./PersonRecordView";

export const COMPOSED_SHEET_COPY = {
  label: "What this comes from",
  from: "From these notes. Change or remove any of them.",
  done: "Done",
} as const;

export interface ComposedSheetProps {
  /** The composed line, or null when there is none to show. */
  row: RecordLine | null;
  visible: boolean;
  onChange: PersonRecordViewProps["onChange"];
  onForget: PersonRecordViewProps["onForget"];
  onSource: PersonRecordViewProps["onSource"];
  onSettle: PersonRecordViewProps["onSettle"];
  onDismiss: () => void;
}

export function ComposedSheet(props: ComposedSheetProps) {
  const p = usePalette();
  const c = props.row?.composed ?? null;
  return (
    <Sheet visible={props.visible && !!c} onDismiss={props.onDismiss} label={COMPOSED_SHEET_COPY.label}>
      {c && props.row ? (
        <View>
          <MomentText>{c.text}</MomentText>
          <View style={{ marginTop: space.xs }}>
            <Provenance line={props.row.provenance} />
          </View>
          <Small style={{ marginTop: space.m }}>{COMPOSED_SHEET_COPY.from}</Small>
          <View style={{ marginTop: space.l, borderTopWidth: 1, borderTopColor: p.hairline }}>
            {c.members.map((m) => (
              <View key={m.row.line.id} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
                <RecordRow r={m.row} onChange={props.onChange} onForget={props.onForget} onSource={props.onSource} onSettle={props.onSettle} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: space.m }}>
            <Pill variant="primary" label={COMPOSED_SHEET_COPY.done} onPress={props.onDismiss} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
