// The follow-up sheet (board 2, "Ask Ben how it went"): what you could
// mention, in your own words, then one tap into Messages, Phone, FaceTime or
// WhatsApp. Kinship sends nothing. When you come back, Today asks once
// whether you reached them.
import React from "react";
import { View } from "react-native";
import { space } from "@/design/tokens";
import { CHANNEL_LABEL, type HandoffChannel } from "@/platform/handoff";
import { Body, Heading, Label, Pill, Sheet, Small } from "@/ui";

export interface HandoffSheetProps {
  visible: boolean;
  heading: string;
  personName: string;
  mention: string[];
  /** Channels this phone can open for them; empty until their contact is linked. */
  channels: HandoffChannel[];
  /** True once we know whether they have a contact (avoids a flash of "choose"). */
  ready: boolean;
  onOpen: (channel: HandoffChannel) => void;
  onChooseContact: () => void;
  onDismiss: () => void;
  /** Whether returning brings the "Did you reach…?" line (a reason's hand-off). */
  returnCheck: boolean;
}

export function HandoffSheet(props: HandoffSheetProps) {
  const [first, second, ...rest] = props.channels;
  return (
    <Sheet visible={props.visible} onDismiss={props.onDismiss} label={props.heading}>
      <Heading>{props.heading}</Heading>
      {props.mention.length ? (
        <View style={{ marginTop: space.xl }}>
          <Label>You could mention</Label>
          <View style={{ marginTop: space.s, gap: space.xs }}>
            {props.mention.map((m) => (
              <Body key={m}>{`•  ${m}`}</Body>
            ))}
          </View>
        </View>
      ) : null}

      {!props.ready ? null : first ? (
        <>
          <View style={{ flexDirection: "row", gap: space.s, marginTop: space.xl }}>
            <Pill variant="primary" label={CHANNEL_LABEL[first]} onPress={() => props.onOpen(first)} style={{ flex: 1.3 }} />
            {second ? <Pill label={CHANNEL_LABEL[second]} onPress={() => props.onOpen(second)} style={{ flex: 1 }} /> : null}
          </View>
          {rest.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.s }}>
              {rest.map((c) => (
                <Pill key={c} size="small" label={CHANNEL_LABEL[c]} onPress={() => props.onOpen(c)} />
              ))}
            </View>
          ) : null}
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
