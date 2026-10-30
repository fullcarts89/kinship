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
import { HOLD_COPY, type HoldState } from "@/store/peopleStates";
import type { ExportFormat } from "@/lib/exportData";
import { PLACE_ATTRIBUTION } from "../../../supabase/functions/_shared/semantic/attribution";

/** The trust floor in Settings (FD-30e): held people, your data, your account. */
export const TRUST_COPY = {
  held: {
    title: "Paused and remembered",
    body: "They stay in People with everything you've told Kinship. Nothing about them comes up on its own until you resume.",
  },
  export: {
    title: "Your data",
    body: "Everything Kinship keeps for you, as a file you hold: your people, what Kinship knows about each and the notes it came from. Made on this phone and handed to the share sheet; nothing is uploaded.",
    markdown: "Export your data",
    json: "Export as JSON",
    unavailable: "Sharing isn't available on this device.",
    failed: "That couldn't be made. Nothing was shared.",
  },
  del: {
    action: "Delete account",
    firstTitle: "Delete your Kinship account?",
    firstBody: "Everything you've told Kinship, every person and every memory will be deleted from Kinship and from this phone. This can't be undone.",
    keep: "Keep my account",
    next: "Continue",
    secondTitle: "Last check",
    secondBody: "Kinship will delete your account now. If you'd like a copy of your data first, export it before you continue.",
    notNow: "Not now",
    confirm: "Delete my account",
    failedTitle: "Your account wasn't deleted",
  },
} as const;

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

/** Settings › Notifications (CC-25 item 3, FD-30e; WS-3): on or paused. Copy a proposal. */
export const NOTIFICATIONS_COPY = {
  title: "Notifications",
  how: "One private note on a day Kinship has something for you. Never what it is, and at most a few a week.",
  on: "On",
  paused: "Paused",
} as const;

export function SettingsSheetView(props: {
  visible: boolean;
  understanding: boolean | null;
  onUnderstanding: (on: boolean) => void;
  /** Notifications on or paused (null while unknown, or when the phone can't notify). */
  notifications?: boolean | null;
  onNotifications?: (on: boolean) => void;
  /** What Kinship can see of the contacts on this phone (null while checking). */
  contacts?: ContactsAccess | null;
  onAddFromContacts?: () => void;
  onAllowContacts?: () => void;
  onShareMore?: () => void;
  onOpenSettings?: () => void;
  onSignOut: () => void;
  onDismiss: () => void;
  /** People removed from People (founder I3): shown only when there are some, each with Bring back. */
  removed?: { id: string; name: string }[];
  onBringBack?: (personId: string) => void;
  /** People the user is holding (D13): shown only when there are some, each with Resume. */
  held?: { id: string; name: string; state: HoldState }[];
  onResume?: (personId: string) => void;
  /** Export your data (SET-04). */
  onExport?: (format: ExportFormat) => void;
  exporting?: boolean;
  /** Delete account (SET-05), asked twice by the screen. */
  onDeleteAccount?: () => void;
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
      {props.onNotifications ? (
        <View style={{ paddingVertical: space.l, borderBottomWidth: 1, borderColor: p.hairline }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
            <View style={{ flex: 1 }}>
              <Body tone="ink">{NOTIFICATIONS_COPY.title}</Body>
              <Small tone="inkBody" style={{ marginTop: space.xs }}>{props.notifications ? NOTIFICATIONS_COPY.on : NOTIFICATIONS_COPY.paused}</Small>
              <Small style={{ marginTop: space.xs }}>{NOTIFICATIONS_COPY.how}</Small>
            </View>
            <Switch
              accessibilityLabel={NOTIFICATIONS_COPY.title}
              value={props.notifications === true}
              disabled={props.notifications === null}
              onValueChange={props.onNotifications}
              trackColor={{ true: p.ink, false: p.hairline }}
              thumbColor={p.surface}
              ios_backgroundColor={p.hairline}
              {...({ activeThumbColor: p.surface } as object)}
            />
          </View>
        </View>
      ) : null}
      {props.removed?.length && props.onBringBack ? (
        <View style={{ paddingVertical: space.l, borderBottomWidth: 1, borderColor: p.hairline }}>
          <Body tone="ink">Removed from People</Body>
          <Small style={{ marginTop: space.xs }}>Their notes are kept. Bring someone back and everything you told Kinship about them returns.</Small>
          {props.removed.map((r) => (
            <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: space.m, marginTop: space.s }}>
              <Body style={{ flex: 1 }}>{r.name}</Body>
              <Pill variant="quiet" size="small" label="Bring back" accessibilityLabel={`Bring back ${r.name}`} onPress={() => props.onBringBack?.(r.id)} />
            </View>
          ))}
        </View>
      ) : null}
      {props.held?.length && props.onResume ? (
        <View style={{ paddingVertical: space.l, borderBottomWidth: 1, borderColor: p.hairline }}>
          <Body tone="ink">{TRUST_COPY.held.title}</Body>
          <Small style={{ marginTop: space.xs }}>{TRUST_COPY.held.body}</Small>
          {props.held.map((h) => (
            <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: space.m, marginTop: space.s }}>
              <View style={{ flex: 1 }}>
                <Body>{h.name}</Body>
                <Small>{HOLD_COPY[h.state].line}</Small>
              </View>
              <Pill variant="quiet" size="small" label={HOLD_COPY[h.state].resume} accessibilityLabel={`${HOLD_COPY[h.state].resume} ${h.name}`} onPress={() => props.onResume?.(h.id)} />
            </View>
          ))}
        </View>
      ) : null}
      {props.onExport ? (
        <View style={{ paddingVertical: space.l, borderBottomWidth: 1, borderColor: p.hairline }}>
          <Body tone="ink">{TRUST_COPY.export.title}</Body>
          <Small style={{ marginTop: space.xs }}>{TRUST_COPY.export.body}</Small>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, alignItems: "flex-start", marginTop: space.s }}>
            <Pill variant="quiet" size="small" label={TRUST_COPY.export.markdown} busy={props.exporting} onPress={() => props.onExport?.("markdown")} />
            <Pill variant="quiet" size="small" label={TRUST_COPY.export.json} disabled={props.exporting} onPress={() => props.onExport?.("json")} />
          </View>
        </View>
      ) : null}
      <Label style={{ marginTop: space.xl }}>Account</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, alignItems: "flex-start", marginTop: space.s }}>
        <Pill size="small" label="Sign out" onPress={props.onSignOut} />
        {props.onDeleteAccount ? <Pill variant="danger" size="small" label={TRUST_COPY.del.action} onPress={props.onDeleteAccount} /> : null}
      </View>
      {/* Where residence is read from (founder CC-20, decision 1): the licence's attribution, nothing else. */}
      <Label style={{ marginTop: space.xl }}>About</Label>
      <Small style={{ marginTop: space.xs }}>{PLACE_ATTRIBUTION}</Small>
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

export function SettingsSheet({ visible, onDismiss, understanding, setUnderstanding, notifications, setNotifications, signOut, onAddFromContacts, removed, onBringBack, held, onResume, onExport, onDeleteAccount }: {
  visible: boolean;
  onDismiss: () => void;
  understanding: boolean | null;
  setUnderstanding: (on: boolean) => Promise<void>;
  /** Notifications on or paused, and the way to change it (absent where the phone can't notify). */
  notifications?: boolean | null;
  setNotifications?: (on: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  onAddFromContacts: () => void;
  removed?: { id: string; name: string }[];
  onBringBack?: (personId: string) => void;
  held?: { id: string; name: string; state: HoldState }[];
  onResume?: (personId: string) => Promise<unknown>;
  /** Builds and shares the export; resolves false when sharing isn't available here. */
  onExport?: (format: ExportFormat) => Promise<boolean>;
  /** Deletes the account on the server, then wipes this phone; resolves with the failure to show, if any. */
  onDeleteAccount?: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [contacts, setContacts] = useState<ContactsAccess | null>(null);
  const fail = (title: string) => Alert.alert(title, "Nothing was lost. Try again in a moment.");
  // Leaving "remembered" is asked once more (D13: grief deserves a second thought); Resume from paused just resumes.
  const resume = (h: { id: string; name: string; state: HoldState }) => {
    const go = () => void onResume?.(h.id).catch(() => fail("That couldn't be changed"));
    if (h.state !== "remembered") return go();
    Alert.alert(HOLD_COPY.remembered.resumeTitle(h.name), HOLD_COPY.remembered.resumeBody(h.name), [
      { text: HOLD_COPY.cancel, style: "cancel" },
      { text: HOLD_COPY.remembered.resume, onPress: go },
    ]);
  };
  const exportData = (format: ExportFormat) => {
    if (!onExport || exporting) return;
    setExporting(true);
    onExport(format)
      .then((shared) => { if (!shared) Alert.alert(TRUST_COPY.export.unavailable); }, () => Alert.alert(TRUST_COPY.export.failed))
      .finally(() => setExporting(false));
  };
  // Two steps, in the app's own words (SET-05); the second names the export.
  const deleteAccount = () => {
    if (!onDeleteAccount) return;
    Alert.alert(TRUST_COPY.del.firstTitle, TRUST_COPY.del.firstBody, [
      { text: TRUST_COPY.del.keep, style: "cancel" },
      { text: TRUST_COPY.del.next, onPress: () => Alert.alert(TRUST_COPY.del.secondTitle, TRUST_COPY.del.secondBody, [
        { text: TRUST_COPY.del.notNow, style: "cancel" },
        { text: TRUST_COPY.del.confirm, style: "destructive", onPress: () => void onDeleteAccount().then((r) => {
          if (!r.ok) Alert.alert(TRUST_COPY.del.failedTitle, r.error);
        }, () => Alert.alert(TRUST_COPY.del.failedTitle, "Check your connection and try again. Nothing was removed.")) },
      ]) },
    ]);
  };
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
      removed={removed}
      onBringBack={onBringBack}
      notifications={notifications}
      onNotifications={setNotifications ? (on) => {
        setNotifications(on).catch(() => Alert.alert("That wasn't saved", "Try again when you're online."));
      } : undefined}
      held={held}
      onResume={onResume ? (id) => { const h = held?.find((x) => x.id === id); if (h) resume(h); } : undefined}
      onExport={onExport ? exportData : undefined}
      exporting={exporting}
      onDeleteAccount={onDeleteAccount ? deleteAccount : undefined}
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
