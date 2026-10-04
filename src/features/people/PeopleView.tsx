// People (Design Direction §I.6; board 3's list side): search at the top,
// then everyone, alphabetical: sprig, name, one live line. No counts, no
// ranking, nothing to keep up with. Adding someone is a name and Done.
import React, { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { Plus, Search, Settings } from "lucide-react-native";
import { height, maxScale, radius, size, space, type } from "@/design/tokens";
import { Body, IconButton, Pill, Row, Screen, Sheet, Sprig, Title, usePalette } from "@/ui";

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
}: {
  rows: PersonRowData[];
  onOpen: (personId: string) => void;
  onAdd: (name: string) => Promise<unknown>;
  /** Opens with the add sheet showing (the lab). */
  initialAdding?: string | null;
  /** Settings, from the header. */
  onSettings?: () => void;
}) {
  const p = usePalette();
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
            maxFontSizeMultiplier={maxScale.text}
            style={[type.field, { flex: 1, color: p.ink, paddingVertical: space.m }]}
          />
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
          <Body>{"No one yet. Add someone, or tell Kinship about them."}</Body>
          <View style={{ alignItems: "flex-start", marginTop: space.l }}>
            <Pill label="Add someone" onPress={() => setAdding("")} />
          </View>
        </View>
      ) : shown.length === 0 ? (
        <View style={{ marginTop: space.l, alignItems: "flex-start", gap: space.m }}>
          <Body>{`No one called “${query.trim()}” yet.`}</Body>
          <Pill label={`Add ${query.trim()}`} onPress={() => setAdding(query.trim())} />
        </View>
      ) : null}

      <AddPersonSheet
        initial={adding}
        onDismiss={() => setAdding(null)}
        onDone={async (name) => {
          await onAdd(name);
          setAdding(null);
          setQuery("");
        }}
      />
    </Screen>
  );
}

function AddPersonSheet({
  initial,
  onDismiss,
  onDone,
}: {
  initial: string | null;
  onDismiss: () => void;
  onDone: (name: string) => Promise<void>;
}) {
  const p = usePalette();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (initial !== null) setName(initial);
  }, [initial]);
  const done = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onDone(name);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      visible={initial !== null}
      onDismiss={onDismiss}
      label="Add someone"
      footer={<Pill variant="primary" label="Done" disabled={!name.trim() || busy} onPress={() => void done()} />}
    >
      <Title>Add someone</Title>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="Their name"
        placeholderTextColor={p.inkQuiet}
        accessibilityLabel="Their name"
        returnKeyType="done"
        onSubmitEditing={() => void done()}
        maxLength={80}
        autoCapitalize="words"
        maxFontSizeMultiplier={maxScale.text}
        style={[type.moment, {
          color: p.ink, marginTop: space.l, paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: p.hairline,
          outlineWidth: 0,
        }]}
      />
    </Sheet>
  );
}
