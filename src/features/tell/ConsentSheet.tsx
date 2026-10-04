// The one consent understanding needs (D2, D3): asked once, in plain words,
// before the first note is understood. Declining keeps every note exactly as
// written and is never asked again on this phone. The sentence about the
// provider is the approved disclosure, word for word.
import React, { useState } from "react";
import { View } from "react-native";
import { Lock } from "lucide-react-native";
import { size, space } from "@/design/tokens";
import { useConsentAsk } from "@/hooks/useV2";
import { Body, Pill, Sheet, Small, Title, usePalette } from "@/ui";

export const CONSENT_COPY = {
  title: "So Kinship can understand what you tell it",
  body: "Information you choose to record about people in your life may be processed by Kinship's AI provider in order to understand and organize it.",
  provider: "Sent to Anthropic to understand it; not used to train models.",
  declined: "Without it, Kinship keeps your notes exactly as you write them.",
  allow: "Allow",
  notNow: "Keep notes as written",
} as const;

export function ConsentSheetView({ visible, busy, onAllow, onDecline }: {
  visible: boolean;
  busy: boolean;
  onAllow: () => void;
  onDecline: () => void;
}) {
  const p = usePalette();
  return (
    <Sheet
      visible={visible}
      onDismiss={onDecline}
      label={CONSENT_COPY.title}
      footer={
        <View style={{ gap: space.s }}>
          <Pill variant="primary" label={CONSENT_COPY.allow} disabled={busy} onPress={onAllow} />
          <Pill variant="quiet" label={CONSENT_COPY.notNow} disabled={busy} onPress={onDecline} />
        </View>
      }
    >
      <Title>{CONSENT_COPY.title}</Title>
      <Body style={{ marginTop: space.l }}>{CONSENT_COPY.body}</Body>
      <View style={{ flexDirection: "row", gap: space.s, alignItems: "center", marginTop: space.l }}>
        <Lock color={p.inkQuiet} size={size.icon - 2} strokeWidth={1.8} />
        <Small style={{ flex: 1 }}>{CONSENT_COPY.provider}</Small>
      </View>
      <Small style={{ marginTop: space.s }}>{CONSENT_COPY.declined}</Small>
    </Sheet>
  );
}

export function ConsentSheet() {
  const { ask, answer } = useConsentAsk();
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const go = async (allow: boolean) => {
    setBusy(true);
    try {
      await answer(allow);
      setClosed(true);
    } catch {
      // Not saved (offline): ask again next time rather than assume.
      setClosed(true);
    } finally {
      setBusy(false);
    }
  };
  return <ConsentSheetView visible={ask && !closed} busy={busy} onAllow={() => void go(true)} onDecline={() => void go(false)} />;
}
