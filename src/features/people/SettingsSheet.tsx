// Settings, from the People header (Design Direction §H): only what the
// first dogfood needs. Understanding on or off, with the approved sentence
// about the provider (D2 asks for it here too), and signing out.
import React, { useState } from "react";
import { Alert, Switch, View } from "react-native";
import { space } from "@/design/tokens";
import { CONSENT_COPY } from "@/features/tell/ConsentSheet";
import { Body, Label, Pill, Sheet, Small, Title, usePalette } from "@/ui";

export function SettingsSheetView(props: {
  visible: boolean;
  understanding: boolean | null;
  onUnderstanding: (on: boolean) => void;
  onSignOut: () => void;
  onDismiss: () => void;
}) {
  const p = usePalette();
  return (
    <Sheet visible={props.visible} onDismiss={props.onDismiss} label="Settings">
      <Title>Settings</Title>
      <View style={{ marginTop: space.xl, borderTopWidth: 1, borderBottomWidth: 1, borderColor: p.hairline, paddingVertical: space.l }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
          <View style={{ flex: 1 }}>
            <Body tone="ink">Understanding what you tell Kinship</Body>
            <Small style={{ marginTop: space.xs }}>{CONSENT_COPY.body}</Small>
            <Small style={{ marginTop: space.xs }}>{CONSENT_COPY.provider}</Small>
          </View>
          <Switch
            accessibilityLabel="Understanding what you tell Kinship"
            value={props.understanding === true}
            disabled={props.understanding === null}
            onValueChange={props.onUnderstanding}
            trackColor={{ true: p.ink, false: p.hairline }}
            thumbColor={p.surface}
            ios_backgroundColor={p.hairline}
            {...({ activeThumbColor: p.surface } as object)}
          />
        </View>
      </View>
      <Label style={{ marginTop: space.xl }}>Account</Label>
      <View style={{ alignItems: "flex-start", marginTop: space.s }}>
        <Pill size="small" label="Sign out" onPress={props.onSignOut} />
      </View>
    </Sheet>
  );
}

export function SettingsSheet({ visible, onDismiss, understanding, setUnderstanding, signOut }: {
  visible: boolean;
  onDismiss: () => void;
  understanding: boolean | null;
  setUnderstanding: (on: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <SettingsSheetView
      visible={visible}
      understanding={saving ? null : understanding}
      onUnderstanding={(on) => {
        setSaving(true);
        setUnderstanding(on)
          .catch(() => Alert.alert("That wasn't saved", "Try again when you're online."))
          .finally(() => setSaving(false));
      }}
      onSignOut={() => {
        Alert.alert("Sign out?", "Your notes stay safe in your account.", [
          { text: "Stay", style: "cancel" },
          { text: "Sign out", onPress: () => void signOut() },
        ]);
      }}
      onDismiss={onDismiss}
    />
  );
}
