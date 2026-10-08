// People (Design Direction §I.6; board 3's list side): search at the top,
// then everyone, alphabetical: sprig, name, one live line. No counts, no
// ranking, nothing to keep up with. Adding someone is a name and Done.
import React, { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { Plus, Search, Settings } from "lucide-react-native";
import { height, maxScale, radius, size, space, type } from "@/design/tokens";
import { AddByNameSheet } from "@/features/setup/AddByNameSheet";
import { Body, IconButton, KeyboardBar, type NavKey, Pill, Row, Screen, Sprig, useKeyboardBarId, usePalette } from "@/ui";

export interface PersonRowData {
  id: string;
  label: string;
  line: string | null;
  remembered: boolean;
}

export function PeopleView({
  rows,
  onOpen,
  onAdd,
  initialAdding = null,
  onSettings,
  onAddFromContacts,
  onGo,
}: {
  rows: PersonRowData[];
  onOpen: (personId: string) => void;
  onAdd: (name: string) => Promise<unknown>;
  /** Opens with the add sheet showing (the lab). */
  initialAdding?: string | null;
  /** Settings, from the header. */
  onSettings?: () => void;
  /** Add from contacts (the setup picker). */
  onAddFromContacts?: () => void;
  /** Today · People on the keyboard's bar while searching (founder I6). */
  onGo?: (to: NavKey) => void;
}) {
  const p = usePalette();
  const bar = useKeyboardBarId();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(initialAdding);
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return q ? rows.filter((r) => r.label.toLocaleLowerCase().includes(q)) : rows;
  }, [rows, query]);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, paddingTop: space.l }}>
        <View
          style={{
            flex: 1, minHeight: height.search, borderRadius: radius.pill(height.search), backgroundColor: p.surface,
            borderWidth: 1, borderColor: p.hairline, flexDirection: "row", alignItems: "center", gap: space.s,
            paddingHorizontal: space.l,
          }}
        >
          <Search color={p.inkQuiet} size={size.icon} strokeWidth={1.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your people"
            placeholderTextColor={p.inkQuiet}
            accessibilityLabel="Search your people"
            returnKeyType="search"
            autoCorrect={false}
            inputAccessoryViewID={bar}
            maxFontSizeMultiplier={maxScale.text}
            style={[type.field, { flex: 1, color: p.ink, paddingVertical: space.m }]}
          />
          <KeyboardBar id={bar} nav={onGo ? { current: "people", onGo } : undefined} />
        </View>
        <IconButton label="Add someone" onPress={() => setAdding(query.trim())}>
          <Plus color={p.ink} size={size.iconLarge} strokeWidth={1.8} />
        </IconButton>
        {onSettings ? (
          <IconButton label="Settings" onPress={onSettings}>
            <Settings color={p.inkQuiet} size={size.icon + 2} strokeWidth={1.8} />
          </IconButton>
        ) : null}
      </View>

      <View style={{ marginTop: space.xl }}>
        {shown.map((r, i) => (
          <Row
            key={r.id}
            first={i === 0}
            leading={<Sprig personId={r.id} width={size.sprig.row} remembered={r.remembered} />}
            title={r.label}
            subtitle={r.line}
            onPress={() => onOpen(r.id)}
          />
        ))}
      </View>

      {rows.length === 0 ? (
        <View style={{ marginTop: space.l }}>
          <Body>{"The people you care about will be here. Bring them in from your contacts, or add someone by name."}</Body>
          <View style={{ alignItems: "flex-start", gap: space.xs, marginTop: space.l }}>
            {onAddFromContacts ? <Pill variant="primary" label="Add from contacts" onPress={onAddFromContacts} /> : null}
            <Pill variant={onAddFromContacts ? "quiet" : "primary"} label="Add by name" onPress={() => setAdding("")} />
          </View>
        </View>
      ) : shown.length === 0 ? (
        <View style={{ marginTop: space.l, alignItems: "flex-start", gap: space.m }}>
          <Body>{`No one called “${query.trim()}” yet.`}</Body>
          <Pill label={`Add ${query.trim()}`} onPress={() => setAdding(query.trim())} />
        </View>
      ) : null}

      <AddByNameSheet
        initial={adding}
        onDismiss={() => setAdding(null)}
        onContacts={onAddFromContacts ? () => {
          setAdding(null);
          onAddFromContacts();
        } : undefined}
        onDone={async (name) => {
          await onAdd(name);
          setAdding(null);
          setQuery("");
        }}
      />
    </Screen>
  );
}
