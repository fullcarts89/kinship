// Setup, drawn (board 1, "Setting up · 1 of 2" and "2 of 2"; consent from
// D2/D3 in the same composition): a caps label, the question in the display
// serif, a line of explanation, the content, and the action pinned at the
// bottom in the gutter. From plain data; SetupScreen.tsx supplies it.
import React, { useRef } from "react";
import { ActivityIndicator, FlatList, Platform, ScrollView, TextInput, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { Check, Lock, Search } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUTTER, height, maxScale, press, radius, size, space, type } from "@/design/tokens";
import { CONSENT_COPY, ConsentBody } from "@/features/tell/ConsentSheet";
import { useKeyboardInset } from "@/ui/useKeyboardLift";
import { Body, Display, KeyboardBar, Label, MomentText, Pill, Provenance, Small, Sprig, useKeyboardBarId, usePalette } from "@/ui";
import type { PickRow, WorthLine } from "./setupModel";

export const SETUP_COPY = {
  nameTitle: "What should Kinship call you?",
  nameBody: "Your first name is enough.",
  nameHint: "First name",
  continue: "Continue",
  notNow: "Not now",
  consentLabel: "Before you start",
  pickTitle: "Who do you want to show up for?",
  pickBody: "Pick as many as feel right. Suggested from family names and birthdays coming up.",
  pickLock: "Kinship reads contacts on this phone. Only the people you pick are saved.",
  suggested: "Suggested",
  everyone: "Everyone",
  addByName: "Add someone by name",
  continueN: (n: number) => `Continue with ${n} ${n === 1 ? "person" : "people"}`,
  skip: "Skip for now",
  askTitle: "Who do you want to show up for?",
  askBody: "Kinship can suggest people from your contacts, so you don't have to type them in. It reads them on this phone, and only the people you pick are saved.",
  ask: "Choose from contacts",
  deniedBody: "Kinship can't see your contacts, and that's fine. Add the people you care about by name, or allow Contacts in Settings to choose from them.",
  openSettings: "Open Settings",
  limited: "You've shared some of your contacts with Kinship.",
  shareMore: "Choose more",
  unavailableBody: "Add the people you care about by name. You can always add more later.",
  noMatch: (q: string) => `No one called “${q}” in your contacts.`,
  addNamed: (q: string) => `Add ${q}`,
  worthTitle: "Already worth knowing",
  tellTitle: "Tell Kinship one thing about someone.",
  tellBody: "Say it the way you'd tell a friend. Kinship keeps what matters and asks only when unsure.",
  tellHint: "Something about someone you care about…",
  /**
   * What kinds of things are worth telling, by example rather than by
   * category: what's happening, what's coming and hoped for, what you said
   * you'd do. Never a health event first (activation pass).
   */
  examplesLabel: "Like",
  examples: [
    "Ben is running Chicago Sunday and wants to break four hours.",
    "Maya starts her new job next month.",
    "I told Chris I'd send him that restaurant.",
  ],
  keep: "Keep it",
  saveFailed: "Those people weren't saved. Nothing was lost; try again.",
} as const;

// ─── The frame ──────────────────────────────────────────────────────────

function SetupFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const p = usePalette();
  return (
    <View style={{ backgroundColor: p.paper, paddingHorizontal: GUTTER, paddingTop: space.m, paddingBottom: insets.bottom + space.xl, gap: space.m }}>
      {children}
    </View>
  );
}

function LockLine({ text }: { text: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", gap: space.s, alignItems: "center" }}>
      <Lock color={p.inkQuiet} size={size.icon - 2} strokeWidth={1.8} accessibilityElementsHidden importantForAccessibility="no" />
      <Small style={{ flex: 1 }}>{text}</Small>
    </View>
  );
}

function Head({ label, title, body }: { label: string; title: string; body?: string | null }) {
  return (
    <View>
      <Label>{label}</Label>
      <Display style={{ marginTop: space.m }}>{title}</Display>
      {body ? <Body style={{ marginTop: space.s }}>{body}</Body> : null}
    </View>
  );
}

function Frame({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const root = useRef<View>(null);
  const lift = useKeyboardInset(root);
  return (
    <View ref={root} style={{ flex: 1, backgroundColor: p.paper, paddingBottom: lift ? Math.max(0, lift - insets.bottom) : 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: insets.top + space.x3, paddingBottom: space.xl }}
      >
        {children}
      </ScrollView>
      <SetupFooter>{footer}</SetupFooter>
    </View>
  );
}

// ─── Name (recovery Gate 3: only when sign-in didn't give one) ──────────

export function NameStepView({ label, name, busy, onName, onContinue, onSkip, autoFocus = true }: {
  label: string;
  name: string;
  busy: boolean;
  onName: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  autoFocus?: boolean;
}) {
  const p = usePalette();
  return (
    <Frame
      footer={
        <View style={{ gap: space.xs }}>
          <Pill variant="primary" label={SETUP_COPY.continue} busy={busy} disabled={!name.trim()} onPress={onContinue} />
          <Pill variant="quiet" label={SETUP_COPY.notNow} disabled={busy} onPress={onSkip} />
        </View>
      }
    >
      <Head label={label} title={SETUP_COPY.nameTitle} body={SETUP_COPY.nameBody} />
      <TextInput
        value={name}
        onChangeText={onName}
        autoFocus={autoFocus}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="done"
        onSubmitEditing={() => name.trim() && onContinue()}
        placeholder={SETUP_COPY.nameHint}
        placeholderTextColor={p.inkQuiet}
        accessibilityLabel={SETUP_COPY.nameHint}
        maxLength={40}
        maxFontSizeMultiplier={maxScale.text}
        style={[type.field, {
          marginTop: space.xl, minHeight: height.search, color: p.ink, backgroundColor: p.surface, borderRadius: radius.inline,
          borderWidth: 1, borderColor: p.hairline, paddingHorizontal: space.l,
        }]}
      />
    </Frame>
  );
}

// ─── Consent (D2, D3) ───────────────────────────────────────────────────

export function ConsentStepView({ label, busy, onAllow, onDecline }: {
  label: string;
  /** The choice being saved (its button shows it's working), or false. */
  busy: false | "allow" | "decline";
  onAllow: () => void;
  onDecline: () => void;
}) {
  return (
    <Frame
      footer={
        <View style={{ gap: space.xs }}>
          <Pill variant="primary" label={CONSENT_COPY.allow} busy={busy === "allow"} disabled={!!busy} onPress={onAllow} />
          <Pill variant="quiet" label={CONSENT_COPY.notNow} busy={busy === "decline"} disabled={!!busy} onPress={onDecline} />
        </View>
      }
    >
      <Head label={label} title={CONSENT_COPY.title} />
      <ConsentBody />
    </Frame>
  );
}

// ─── Pick people (board 1, "Setting up · 1 of 2") ───────────────────────

export type PickAccess =
  | { state: "loading" }
  | { state: "undetermined" }
  | { state: "granted"; limited: boolean }
  | { state: "denied"; canAskAgain: boolean }
  | { state: "unavailable" };

export interface PeoplePickViewProps {
  label: string;
  access: PickAccess;
  suggested: PickRow[];
  everyone: PickRow[];
  /** People added by name in this step (always shown, picked). */
  added: PickRow[];
  /** When searching: the matches. */
  results: PickRow[] | null;
  query: string;
  selected: ReadonlySet<string>;
  busy: boolean;
  error: string | null;
  onQuery: (q: string) => void;
  onToggle: (row: PickRow) => void;
  onAddByName: (initial: string) => void;
  onAsk: () => void;
  onSettings: () => void;
  onShareMore: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

type ListItem =
  | { kind: "label"; key: string; text: string }
  | { kind: "row"; key: string; row: PickRow; first: boolean };

function CheckMark({ on }: { on: boolean }) {
  const p = usePalette();
  const d = 24;
  return (
    <View
      style={{
        width: d, height: d, borderRadius: d / 2, alignItems: "center", justifyContent: "center",
        borderWidth: on ? 0 : 1.5, borderColor: p.rule, backgroundColor: on ? p.ink : "transparent",
      }}
    >
      {on ? <Check color={p.onInk} size={size.icon - 2} strokeWidth={2.4} /> : null}
    </View>
  );
}

/** One contact row. Memoized: ticking one person redraws one row, not the list. */
export const PickRowView = React.memo(function PickRowView({ row, on, first, onToggle }: {
  row: PickRow; on: boolean; first: boolean; onToggle: (row: PickRow) => void;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={row.why ? `${row.name}, ${row.why}` : row.name}
      onPress={() => onToggle(row)}
      style={({ pressed }) => ({
        minHeight: height.row, paddingVertical: space.s, flexDirection: "row", alignItems: "center", gap: space.l,
        borderBottomWidth: 1, borderTopWidth: first ? 1 : 0, borderColor: p.hairline, opacity: pressed ? press.surface : 1,
      })}
    >
      <Sprig personId={row.personId} width={size.sprig.row} />
      <View style={{ flex: 1 }}>
        <Body tone="ink" numberOfLines={2}>{row.name}</Body>
        {row.why ? <Small>{row.why}</Small> : null}
      </View>
      <CheckMark on={on} />
    </Pressable>
  );
});

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const p = usePalette();
  return (
    <View
      style={{
        minHeight: height.search, borderRadius: radius.pill(height.search), backgroundColor: p.surface,
        borderWidth: 1, borderColor: p.hairline, flexDirection: "row", alignItems: "center", gap: space.s, paddingHorizontal: space.l,
      }}
    >
      <Search color={p.inkQuiet} size={size.icon} strokeWidth={1.8} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search your contacts"
        placeholderTextColor={p.inkQuiet}
        accessibilityLabel="Search your contacts"
        returnKeyType="search"
        autoCorrect={false}
        maxFontSizeMultiplier={maxScale.text}
        style={[type.field, { flex: 1, color: p.ink, paddingVertical: space.m, outlineWidth: 0 }]}
      />
    </View>
  );
}

export function PeoplePickView(props: PeoplePickViewProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const n = props.selected.size;
  const granted = props.access.state === "granted";

  const items: ListItem[] = [];
  const push = (rows: PickRow[], label: string | null) => {
    if (!rows.length) return;
    if (label) items.push({ kind: "label", key: `l-${label}`, text: label });
    rows.forEach((row, i) => items.push({ kind: "row", key: row.personId, row, first: i === 0 }));
  };
  if (props.results) {
    push([...props.added.filter((r) => props.results!.some((x) => x.personId === r.personId)), ...props.results], null);
  } else {
    push(props.added, null);
    if (granted) {
      push(props.suggested, props.suggested.length ? SETUP_COPY.suggested : null);
      push(props.everyone, props.suggested.length ? SETUP_COPY.everyone : null);
    }
  }

  const intro = (() => {
    switch (props.access.state) {
      case "granted":
        return SETUP_COPY.pickBody;
      case "undetermined":
        return SETUP_COPY.askBody;
      case "denied":
        return SETUP_COPY.deniedBody;
      case "unavailable":
        return SETUP_COPY.unavailableBody;
      default:
        return null;
    }
  })();

  const header = (
    <View style={{ paddingHorizontal: GUTTER, paddingTop: insets.top + space.x3 }}>
      <Head label={props.label} title={SETUP_COPY.pickTitle} body={intro} />
      {props.access.state === "loading" ? <ActivityIndicator style={{ marginTop: space.xl }} color={p.inkQuiet} /> : null}
      {props.access.state === "undetermined" ? (
        <View style={{ alignItems: "flex-start", marginTop: space.xl }}>
          <Pill variant="primary" label={SETUP_COPY.ask} onPress={props.onAsk} />
        </View>
      ) : null}
      {props.access.state === "denied" && !props.access.canAskAgain ? (
        <View style={{ alignItems: "flex-start", marginTop: space.l }}>
          <Pill size="small" label={SETUP_COPY.openSettings} onPress={props.onSettings} />
        </View>
      ) : null}
      {granted && (props.access as { limited: boolean }).limited ? (
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
          <Small>{SETUP_COPY.limited}</Small>
          <Pill size="small" variant="quiet" label={SETUP_COPY.shareMore} onPress={props.onShareMore} />
        </View>
      ) : null}
      {granted ? <View style={{ marginTop: space.xl }}><SearchField value={props.query} onChange={props.onQuery} /></View> : null}
      <View style={{ alignItems: "flex-start", marginTop: space.m, marginBottom: space.s }}>
        <Pill size="small" variant={granted ? "quiet" : "ghost"} label={SETUP_COPY.addByName} onPress={() => props.onAddByName(props.query.trim())} />
      </View>
      {props.results && props.results.length === 0 && props.query.trim() ? (
        <View style={{ alignItems: "flex-start", gap: space.s, marginBottom: space.l }}>
          <Body>{SETUP_COPY.noMatch(props.query.trim())}</Body>
          <Pill size="small" label={SETUP_COPY.addNamed(props.query.trim())} onPress={() => props.onAddByName(props.query.trim())} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        initialNumToRender={20}
        windowSize={11}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: GUTTER }}>
            {item.kind === "label" ? (
              <Label style={{ marginTop: space.xl, marginBottom: space.s }}>{item.text}</Label>
            ) : (
              <PickRowView row={item.row} on={props.selected.has(item.row.personId)} first={item.first} onToggle={props.onToggle} />
            )}
          </View>
        )}
        ListFooterComponent={<View style={{ height: space.xl }} />}
      />
      <SetupFooter>
        {props.error ? <Small tone="brick" accessibilityRole="alert" accessibilityLiveRegion="assertive">{props.error}</Small> : null}
        {granted ? <LockLine text={SETUP_COPY.pickLock} /> : null}
        {n ? (
          <Pill variant="primary" label={SETUP_COPY.continueN(n)} busy={props.busy} onPress={props.onContinue} />
        ) : (
          <Pill label={SETUP_COPY.skip} disabled={props.busy} onPress={props.onSkip} />
        )}
      </SetupFooter>
    </View>
  );
}

// ─── Already worth knowing + the first Tell (board 1, "Setting up · 2 of 2") ─

export interface WorthStepViewProps {
  label: string;
  lines: WorthLine[];
  text: string;
  busy: boolean;
  onText: (t: string) => void;
  onKeep: () => void;
  onSkip: () => void;
  /** The lab shows the field without focusing it. */
  autoFocus?: boolean;
}

export function WorthStepView(props: WorthStepViewProps) {
  const p = usePalette();
  const worth = props.lines.length > 0;
  const bar = useKeyboardBarId();
  return (
    <Frame
      footer={
        <View style={{ gap: space.xs }}>
          <Pill variant="primary" label={SETUP_COPY.keep} busy={props.busy} disabled={!props.text.trim()} onPress={props.onKeep} />
          <Pill variant="quiet" label={SETUP_COPY.skip} disabled={props.busy} onPress={props.onSkip} />
        </View>
      }
    >
      {worth ? (
        <>
          <Head label={props.label} title={SETUP_COPY.worthTitle} />
          <View style={{ marginTop: space.xl, gap: space.l }}>
            {props.lines.map((l, i) => (
              <View key={l.personId} style={{ flexDirection: "row", gap: space.l }}>
                <View style={{ width: 3, borderRadius: 2, backgroundColor: i === 0 ? p.ochre : p.hairline }} />
                <View style={{ flex: 1 }}>
                  <MomentText>{l.text}</MomentText>
                  <View style={{ marginTop: space.xs }}><Provenance line={l.provenance} dot={false} /></View>
                </View>
              </View>
            ))}
          </View>
          <View style={{ marginTop: space.x3, paddingTop: space.xl, borderTopWidth: 1, borderTopColor: p.hairline }}>
            <MomentText>{SETUP_COPY.tellTitle}</MomentText>
            <Body style={{ marginTop: space.s }}>{SETUP_COPY.tellBody}</Body>
          </View>
        </>
      ) : (
        <Head label={props.label} title={SETUP_COPY.tellTitle} body={SETUP_COPY.tellBody} />
      )}
      <TextInput
        value={props.text}
        onChangeText={props.onText}
        multiline
        autoFocus={props.autoFocus}
        placeholder={SETUP_COPY.tellHint}
        placeholderTextColor={p.inkQuiet}
        accessibilityLabel={SETUP_COPY.tellTitle}
        inputAccessoryViewID={bar}
        maxLength={5000}
        maxFontSizeMultiplier={maxScale.text}
        style={[type.line, {
          marginTop: space.l, minHeight: 112, color: p.ink, backgroundColor: p.surface, borderRadius: radius.inline + 2,
          borderWidth: 1, borderColor: p.hairline, paddingHorizontal: space.l + 2, paddingTop: space.l, paddingBottom: space.l,
          textAlignVertical: "top", outlineWidth: 0,
        }]}
      />
      <KeyboardBar id={bar} />
      <View style={{ marginTop: space.l, gap: space.xs }} accessibilityLabel={`For example: ${SETUP_COPY.examples.join(" ")}`} accessible>
        <Small>{SETUP_COPY.examplesLabel}</Small>
        {SETUP_COPY.examples.map((e) => (
          <Body key={e} tone="inkQuiet">{`“${e}”`}</Body>
        ))}
      </View>
    </Frame>
  );
}
