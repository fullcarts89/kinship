// The Moment detail sheet (founder I1): a focused look at one moment, never a
// field-heavy page. The line it's about, why now, when, where it came from;
// then Message and Call, and a quiet way to the person. From plain data
// (momentDetail.ts); app/v2/(main)/index.tsx supplies it and does the work.
import React from "react";
import { View } from "react-native";
import { MessageCircle, Phone } from "lucide-react-native";
import { space } from "@/design/tokens";
import { Body, Label, MomentText, Pill, Provenance, Sheet, Small } from "@/ui";
import type { MomentDetail } from "./momentDetail";

export interface MomentDetailSheetProps {
  detail: MomentDetail | null;
  onDismiss: () => void;
  onMessage: () => void;
  onCall: () => void;
  /** Their page, at this memory. */
  onPerson: () => void;
  onSource: (noteId: string) => void;
}

export function MomentDetailSheet({ detail, onDismiss, onMessage, onCall, onPerson, onSource }: MomentDetailSheetProps) {
  return (
    <Sheet visible={!!detail} onDismiss={onDismiss} label={detail ? detail.line : "Moment"}>
      {detail ? (
        <View>
          <Label>{detail.personName}</Label>
          <MomentText style={{ marginTop: space.s }}>{detail.line}</MomentText>
          {detail.hope ? <Body tone="ink" style={{ marginTop: space.xs }}>{detail.hope}</Body> : null}
          <Body style={{ marginTop: space.l }}>{detail.why}</Body>
          {detail.when ? <Small style={{ marginTop: space.xs }}>{detail.when}</Small> : null}
          {detail.provenance ? (
            <View style={{ marginTop: space.m }}>
              <Provenance line={detail.provenance} onPress={detail.noteId ? () => onSource(detail.noteId as string) : undefined} />
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: space.s, marginTop: space.xxl }}>
            <Pill
              variant="primary"
              dense
              label="Message"
              accessibilityHint={`Opens a conversation with ${detail.personName}`}
              style={{ flex: 1 }}
              icon={({ color, size, strokeWidth }) => <MessageCircle color={color} size={size} strokeWidth={strokeWidth} />}
              onPress={onMessage}
            />
            <Pill
              dense
              label="Call"
              accessibilityHint={`Calls ${detail.personName}`}
              style={{ flex: 1 }}
              icon={({ color, size, strokeWidth }) => <Phone color={color} size={size} strokeWidth={strokeWidth} />}
              onPress={onCall}
            />
          </View>
          <View style={{ alignItems: "flex-start", marginTop: space.m }}>
            <Pill variant="quiet" label={`View ${detail.personName}`} accessibilityHint={`Opens ${detail.personName}'s page at this`} onPress={onPerson} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
