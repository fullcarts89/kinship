// The one consent understanding needs (D2, D3): asked once, in plain words,
// before the first note is understood. Declining keeps every note exactly as
// written and is never asked again on this phone. The sentence about the
// provider is the approved disclosure, word for word.
import React, { useState } from "react";
import { View } from "react-native";
import { Lock } from "lucide-react-native";
import { size, space } from "@/design/tokens";
import { useConsentAsk } from "@/hooks/useV2";
import { Body, Label, Pill, Sheet, Small, Title, usePalette } from "@/ui";

// Recovery pass (founder native pass F16): it leads with what Kinship asks to
// do and what the user gets; the required disclosure (Apple 5.1.2(i): where
// data goes, including to a third-party AI, and explicit permission first)
// follows, in full and unchanged, as the quieter "Who reads it" part. The
// approved sentences are not reworded; their order and weight changed.
export const CONSENT_COPY = {
  title: "So Kinship can understand what you tell it",
  benefit: "Kinship can pick out things like dates, plans and what matters to someone, so it can bring them back when it's useful.",
  disclosureLabel: "Who reads it",
  body: "Information you choose to record about people in your life may be processed by Kinship's AI provider in order to understand and organize it.",
  provider: "Sent to Anthropic to understand it; not used to train models.",
  declined: "Without it, Kinship keeps your notes exactly as you write them.",
  allow: "Allow understanding",
  notNow: "Keep notes as written",
} as const;

/** The benefit first; the full disclosure under it, quieter but complete. */
export function ConsentBody() {
  const p = usePalette();
  return (
    <>
      <Body tone="ink" style={{ marginTop: space.l }}>{CONSENT_COPY.benefit}</Body>
      <View style={{ marginTop: space.xl, paddingTop: space.l, borderTopWidth: 1, borderTopColor: p.hairline, gap: space.s }}>
        <Label>{CONSENT_COPY.disclosureLabel}</Label>
        <Small tone="inkBody">{CONSENT_COPY.body}</Small>
        <View style={{ flexDirection: "row", gap: space.s, alignItems: "center" }}>
          <Lock color={p.inkQuiet} size={size.icon - 2} strokeWidth={1.8} />
          <Small tone="inkBody" style={{ flex: 1 }}>{CONSENT_COPY.provider}</Small>
        </View>
        <Small>{CONSENT_COPY.declined}</Small>
      </View>
    </>
  );
}

export function ConsentSheetView({ visible, busy, onAllow, onDecline }: {
  visible: boolean;
  /** The choice being saved (its button shows it's working), or false. */
  busy: false | "allow" | "decline";
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
          <Pill variant="primary" label={CONSENT_COPY.allow} busy={busy === "allow"} disabled={!!busy} onPress={onAllow} />
          <Pill variant="quiet" label={CONSENT_COPY.notNow} busy={busy === "decline"} disabled={!!busy} onPress={onDecline} />
        </View>
      }
    >
      <Title>{CONSENT_COPY.title}</Title>
      <ConsentBody />
    </Sheet>
  );
}

export function ConsentSheet() {
  const { ask, answer } = useConsentAsk();
  const [busy, setBusy] = useState<false | "allow" | "decline">(false);
  const [closed, setClosed] = useState(false);
  const go = async (allow: boolean) => {
    setBusy(allow ? "allow" : "decline");
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
