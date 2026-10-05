// Settings, from the People header (Design Direction §H): only what the
// first dogfood needs. Understanding on or off, with the approved sentence
// about the provider (D2 asks for it here too); Contacts, with what Kinship
// can see and the way to change it (founder native pass F8: it used to be a
// sentence with nothing to do); and signing out.
import React, { useCallback, useEffect, useState } from "react";
import { contactsAccess, openAppSettings, requestContactsAccess, shareMoreContacts, type ContactsAccess } from "@/platform/deviceContacts";
import { Alert, AppState, Switch, View } from "react-native";
import { space } from "@/design/tokens";
import { CONSENT_COPY } from "@/features/tell/ConsentSheet";
import { Body, Label, Pill, Sheet, Small, Title, usePalette } from "@/ui";

export const CONTACTS_COPY = {
  title: "Contacts",
  how: "Read on this phone for names and birthdays. Only the people you pick are saved.",
  granted: "Kinship can see your contacts.",
  limited: "You've shared some of your contacts with Kinship.",
  denied: "Kinship can't see your contacts. You can allow it in iOS Settings, or add people by name.",
  undetermined: "Kinship hasn't asked to see your contacts yet.",
  unavailable: "Contacts aren't available on this device.",
  add: "Add from contacts",
  more: "Choose more contacts",
  allow: "Allow contacts",
  settings: "Open iOS Settings",
} as const;

export function SettingsSheetView(props: {
  visible: boolean;
  understanding: boolean | null;
  onUnderstanding: (on: boolean) => void;
  /** What Kinship can see of the contacts on this phone (null while checking). */
  contacts?: ContactsAccess | null;
  onAddFromContacts?: () => void;
  onAllowContacts?: () => void;
  onShareMore?: () => void;
  onOpenSettings?: () => void;
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
      <View style={{ paddingVertical: space.l, borderBottomWidth: 1, borderColor: p.hairline }}>
        <Body tone="ink">{CONTACTS_COPY.title}</Body>
        {props.contacts ? <Small tone="inkBody" style={{ marginTop: space.xs }}>{contactsLine(props.contacts)}</Small> : null}
        <Small style={{ marginTop: space.xs }}>{CONTACTS_COPY.how}</Small>
        <View style={{ alignItems: "flex-start", marginTop: space.xs }}>
          {contactsActions(props).map((a) => <Pill key={a.label} variant="quiet" label={a.label} onPress={a.onPress} />)}
        </View>
      </View>
      <Label style={{ marginTop: space.xl }}>Account</Label>
      <View style={{ alignItems: "flex-start", marginTop: space.s }}>
        <Pill size="small" label="Sign out" onPress={props.onSignOut} />
      </View>
    </Sheet>
  );
}

function contactsLine(a: ContactsAccess): string {
  if (a.state === "granted") return a.limited ? CONTACTS_COPY.limited : CONTACTS_COPY.granted;
  return CONTACTS_COPY[a.state];
}

function contactsActions(props: Parameters<typeof SettingsSheetView>[0]): { label: string; onPress: () => void }[] {
  const a = props.contacts;
  const out: { label: string; onPress: () => void }[] = [];
  if (!a) return out;
  if (a.state === "granted") {
    if (props.onAddFromContacts) out.push({ label: CONTACTS_COPY.add, onPress: props.onAddFromContacts });
    if (a.limited && props.onShareMore) out.push({ label: CONTACTS_COPY.more, onPress: props.onShareMore });
  } else if (a.state === "undetermined" && props.onAllowContacts) {
    out.push({ label: CONTACTS_COPY.allow, onPress: props.onAllowContacts });
  } else if (a.state === "denied" && props.onOpenSettings) {
    out.push({ label: CONTACTS_COPY.settings, onPress: props.onOpenSettings });
  }
  return out;
}

export function SettingsSheet({ visible, onDismiss, understanding, setUnderstanding, signOut, onAddFromContacts }: {
  visible: boolean;
  onDismiss: () => void;
  understanding: boolean | null;
  setUnderstanding: (on: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  onAddFromContacts: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<ContactsAccess | null>(null);
  const check = useCallback(() => void contactsAccess().then(setContacts, () => setContacts({ state: "unavailable" })), []);
  // Read when opened, and again on coming back from iOS Settings.
  useEffect(() => {
    if (!visible) return;
    check();
    const sub = AppState.addEventListener("change", (st) => st === "active" && check());
    return () => sub.remove();
  }, [visible, check]);
  return (
    <SettingsSheetView
      visible={visible}
      contacts={contacts}
      onAddFromContacts={() => {
        onDismiss();
        onAddFromContacts();
      }}
      onAllowContacts={() => void requestContactsAccess().then(setContacts)}
      onShareMore={() => void shareMoreContacts().then(check)}
      onOpenSettings={openAppSettings}
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
