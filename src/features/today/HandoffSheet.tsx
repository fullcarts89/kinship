// The follow-up sheet (board 2, "Ask Ben how it went"; Electric Garden FD-30b): the door out to the
// real conversation, composed. A quiet wash and one leaf bleed from the sheet's top edge; the heading
// at title scale; what you could mention as the user's own lines behind a lavender rule, with the one
// suggested question under them; the usual way to reach them as the one primary action and the other
// ways as small choices beside each other; WS-3's "You could…" line (SUA-1) under them; and what
// happens when you come back. Kinship sends nothing.
import React from "react";
import { View } from "react-native";
import { space } from "@/design/tokens";
import { CHANNEL_LABEL, type HandoffChannel } from "@/platform/handoff";
import { Body, Botanical, DawnWash, Label, Line, Pill, Sheet, Small, Title, usePalette } from "@/ui";
import { SuggestionLine } from "./SuggestionLine";
import type { Suggestion } from "./suggestions";

export interface HandoffSheetProps {
  visible: boolean;
  heading: string;
  personName: string;
  mention: string[];
  /** One suggested question under the mentions, clearly a suggestion (K26); never the user's words. */
  opener?: string | null;
  /** Channels this phone can open for them; empty until their contact is linked. */
  channels: HandoffChannel[];
  /** True once we know whether they have a contact (avoids a flash of "choose"). */
  ready: boolean;
  onOpen: (channel: HandoffChannel) => void;
  onChooseContact: () => void;
  onDismiss: () => void;
  /** Whether returning brings the "Did you reach…?" line (a reason's hand-off). */
  returnCheck: boolean;
  /** SUA-1 (FD-30d, WS-3): one quiet "You could…" line under the channels, or none; a tap opens Messages. */
  suggestion?: Suggestion | null;
  onSuggestion?: () => void;
}

export function HandoffSheet(props: HandoffSheetProps) {
  const p = usePalette();
  const [first, ...others] = props.channels;
  const bleed = (
    <View style={{ height: 96, overflow: "hidden" }}>
      <DawnWash kind="quiet" height={160} />
      <Botanical art="leaf" width={140} top={-30} right={-50} rotate={24} dim />
    </View>
  );
  return (
    <Sheet visible={props.visible} onDismiss={props.onDismiss} label={props.heading} bleed={bleed}>
      <Title>{props.heading}</Title>
      {props.mention.length ? (
        <View style={{ marginTop: space.xl }}>
          <Label>You could mention</Label>
          <View style={{ marginTop: space.s, borderLeftWidth: 2, borderLeftColor: p.lavender, paddingLeft: space.l, gap: space.s }}>
            {props.mention.map((m) => (
              <Line key={m}>{m}</Line>
            ))}
            {props.opener ? <Small style={{ marginTop: space.xs }}>{props.opener}</Small> : null}
          </View>
        </View>
      ) : null}

      {!props.ready ? null : first ? (
        <>
          {/* The usual way as the one primary; the other ways as small choices beside each other. */}
          <View style={{ marginTop: space.xxl }}>
            <Pill variant="primary" label={CHANNEL_LABEL[first]} onPress={() => props.onOpen(first)} />
          </View>
          {others.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
              {others.map((c) => (
                <Pill key={c} size="small" variant="ghost" fixedLabel label={CHANNEL_LABEL[c]} onPress={() => props.onOpen(c)} />
              ))}
            </View>
          ) : null}
          <SuggestionLine suggestion={props.suggestion} personName={props.personName} onPress={props.onSuggestion} />
        </>
      ) : (
        <View style={{ marginTop: space.xl }}>
          <Body>{`Which contact is ${props.personName}? Kinship reads their number on this phone when you reach out, and never stores it.`}</Body>
          <View style={{ alignItems: "flex-start", marginTop: space.m }}>
            <Pill variant="primary" label={`Choose ${props.personName}`} onPress={props.onChooseContact} />
          </View>
        </View>
      )}

      {props.returnCheck && first ? (
        <Small style={{ textAlign: "center", marginTop: space.l }}>{`When you come back: “Did you reach ${props.personName}?”`}</Small>
      ) : null}
    </Sheet>
  );
}
