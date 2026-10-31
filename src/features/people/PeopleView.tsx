// People (Design Direction §I.6; board 3's list side): search at the top,
// then everyone, alphabetical: sprig, name, one live line. No counts, no
// ranking, nothing to keep up with. Adding someone is a name and Done.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Plus, Search, Settings } from "lucide-react-native";
import { height, maxScale, radius, size, space, type } from "@/design/tokens";
import { looksLikeName } from "@/features/ask/retrieve";
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
  initialQuery = "",
  onSettings,
  onAddFromContacts,
  onGo,
  onQuery,
  memory,
}: {
  rows: PersonRowData[];
  onOpen: (personId: string) => void;
  onAdd: (name: string) => Promise<unknown>;
  /** Opens with the add sheet showing (the lab). */
  initialAdding?: string | null;
  /** Opens with these words in the search field (the lab). */
  initialQuery?: string;
  /** Settings, from the header. */
  onSettings?: () => void;
  /** Add from contacts (the setup picker). */
  onAddFromContacts?: () => void;
  /** Today · People on the keyboard's bar while searching (founder I6). */
  onGo?: (to: NavKey) => void;
  // ── Ask Kinship v1 (WS-6; CC-25, FD-30a). Minimal block; WS-2 restyles. ──
  /** The search field's words, as typed (the route asks memory with them). */
  onQuery?: (query: string) => void;
  /**
   * What the words find in memory (useAsk), for the `query` it answers: when
   * `asked`, the list keeps only the people the words name and the "In your
   * memory" section follows it (AskResults); a question that only names
   * someone keeps them too. The "No one called … yet" offer is for a name,
   * never a sentence. An answer for other words (still being read) is held
   * until the new one lands, so the list never flashes empty.
   */
  memory?: { query: string; asked: boolean; named: readonly string[]; node: React.ReactNode };
}) {
  const p = usePalette();
  const bar = useKeyboardBarId();
  const [query, setQuery] = useState(initialQuery);
  const [adding, setAdding] = useState<string | null>(initialAdding);
  // The answer for these words; while a new one is being read, the last settled answer holds.
  const held = useRef<typeof memory>(undefined);
  const settled = memory && memory.query === query ? memory : held.current;
  if (memory && memory.query === query) held.current = memory;
  // Only an account with people has memory to ask; an empty account keeps its own empty state (contract §8).
  const asked = !!settled?.asked && rows.length > 0;
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return rows;
    const named = settled?.named ?? [];
    // A question keeps the people it names ("When did I last see Sam?" → both Sams); a name filters as before.
    if (asked) return rows.filter((r) => named.includes(r.id));
    return rows.filter((r) => named.includes(r.id) || r.label.toLocaleLowerCase().includes(q));
  }, [rows, query, asked, settled]);
  // "Add Zelda" is for a name; a sentence no one answers is never offered as someone to add.
  const offerAdd = shown.length === 0 && !asked && looksLikeName(query);
  useEffect(() => {
    onQuery?.(query);
  }, [query, onQuery]);

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
      ) : offerAdd ? (
        <View style={{ marginTop: space.l, alignItems: "flex-start", gap: space.m }}>
          <Body>{`No one called “${query.trim()}” yet.`}</Body>
          <Pill label={`Add ${query.trim()}`} onPress={() => setAdding(query.trim())} />
        </View>
      ) : null}

      {/* Ask Kinship v1 (WS-6): what the words find in memory, under the people. */}
      {asked ? settled!.node : null}

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
