// People (Electric Garden, FD-30b; recomposed after the founder's review of PR #71): a directory with
// two explicit doors, not a search box over a list.
//
//   the masthead   "People" at title scale, leaves cut by the page's top right, Add and Settings
//   the two doors  Find someone (the field filters the names) and Ask your memory (the same field
//                  asks what the user has told Kinship: "When did I last see Sam?"), each said
//                  plainly; in Ask the field takes the question's placeholder and three example
//                  questions sit under it, so asking is never a hidden trick of the search box
//   the index      everyone, alphabetical, in letter groups with the letter set large down the left
//                  margin: sprig, name, one live line in the user's own serif. No counts, no ranking,
//                  nothing to keep up with
//   the answer     what the words find in memory (WS-6's AskResults), under the people they name
//
// Adding someone is a name and Done. The contract with the route (onQuery, memory) is WS-6's and
// unchanged: a question typed in either door still asks, so nothing a user types is lost.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Plus, Search, Settings } from "lucide-react-native";
import { font, height, maxScale, press, radius, shadow, size, space, TOUCH, type } from "@/design/tokens";
import { looksLikeName } from "@/features/ask/retrieve";
import { AddByNameSheet } from "@/features/setup/AddByNameSheet";
import { Pressable } from "@/ui/Pressable";
import { Body, Botanical, DawnWash, IconButton, isLargeText, Italic, KeyboardBar, Label, type NavKey, Pill, Screen, SectionDot, Small, Sprig, Title, useKeyboardBarId, usePalette } from "@/ui";

export interface PersonRowData {
  id: string;
  label: string;
  line: string | null;
  remembered: boolean;
}

type Door = "find" | "ask";

/** The two doors' words, and the questions Ask offers as examples (copy a proposal). */
export const PEOPLE_COPY = {
  title: "People",
  find: "Find someone",
  ask: "Ask your memory",
  asking: "Asking your memory",
  findHint: "Search your people",
  askHint: "Ask about anyone you know…",
  examples: ["When did I last see Sam?", "What is Ben into?", "Who do I know in Chicago?"],
  empty: "The people you care about will be here. Bring them in from your contacts, or add someone by name.",
} as const;

/** Rows in alphabetical letter groups; a name that doesn't start with a letter goes under "#". */
export function groupRows(rows: PersonRowData[]): { letter: string; rows: PersonRowData[] }[] {
  const groups = new Map<string, PersonRowData[]>();
  for (const r of rows) {
    const first = r.label.trim().charAt(0).toLocaleUpperCase();
    const letter = /\p{L}/u.test(first) ? first : "#";
    const list = groups.get(letter) ?? [];
    list.push(r);
    groups.set(letter, list);
  }
  return [...groups.entries()].map(([letter, list]) => ({ letter, rows: list }));
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
  // ── Ask Kinship v1 (WS-6; CC-25, FD-30a). The contract is WS-6's; the look is WS-2's. ──
  /** The field's words, as typed (the route asks memory with them). */
  onQuery?: (query: string) => void;
  /**
   * What the words find in memory (useAsk), for the `query` it answers: when `asked`, the list keeps
   * only the people the words name and the "In your memory" section follows it (AskResults); a
   * question that only names someone keeps them too. The "No one called … yet" offer is for a name,
   * never a sentence. An answer for other words (still being read) is held until the new one lands.
   */
  memory?: { query: string; asked: boolean; named: readonly string[]; node: React.ReactNode };
}) {
  const p = usePalette();
  const bar = useKeyboardBarId();
  const [query, setQuery] = useState(initialQuery);
  const [door, setDoor] = useState<Door>("find");
  const [adding, setAdding] = useState<string | null>(initialAdding);
  const input = useRef<TextInput>(null);
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
  const groups = useMemo(() => groupRows(shown), [shown]);
  const asking = door === "ask";

  const openDoor = (d: Door) => {
    setDoor(d);
    input.current?.focus();
  };

  const art = (
    <>
      <DawnWash kind="quiet" height={300} />
      <Botanical art="leaves" width={210} top={-70} right={-84} rotate={22} />
    </>
  );
  return (
    <Screen art={art}>
      {/* The masthead. */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: space.m }}>
        {/* In its own box: a Text given flex in a row clips at the largest text sizes. */}
        <View style={{ flex: 1 }}><Title>{PEOPLE_COPY.title}</Title></View>
        <IconButton label="Add someone" onPress={() => setAdding(query.trim())}>
          <Plus color={p.ink} size={size.iconLarge} strokeWidth={1.8} />
        </IconButton>
        {onSettings ? (
          <IconButton label="Settings" onPress={onSettings}>
            <Settings color={p.inkQuiet} size={size.icon + 2} strokeWidth={1.8} />
          </IconButton>
        ) : null}
      </View>

      {/* The field, and the two doors under it. */}
      {asking ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, marginTop: space.l }}>
          <SectionDot accent="butter" />
          <Label>{PEOPLE_COPY.asking}</Label>
        </View>
      ) : null}
      <View
        style={[shadow.field, {
          marginTop: asking ? space.s : space.l, minHeight: height.search, borderRadius: radius.pill(height.search), backgroundColor: p.surface,
          flexDirection: "row", alignItems: "center", gap: space.s, paddingHorizontal: space.l,
        }]}
      >
        <Search color={p.inkQuiet} size={size.icon} strokeWidth={1.8} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={setQuery}
          placeholder={asking ? PEOPLE_COPY.askHint : PEOPLE_COPY.findHint}
          placeholderTextColor={p.inkQuiet}
          accessibilityLabel={PEOPLE_COPY.findHint}
          accessibilityHint={asking ? "Asks what you've told Kinship" : undefined}
          returnKeyType="search"
          autoCorrect={asking}
          inputAccessoryViewID={bar}
          maxFontSizeMultiplier={maxScale.text}
          style={[type.field, { flex: 1, color: p.ink, paddingVertical: space.m }]}
        />
        <KeyboardBar id={bar} nav={onGo ? { current: "people", onGo } : undefined} />
      </View>
      {rows.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
          <Pill size="small" variant={asking ? "ghost" : "primary"} fixedLabel label={PEOPLE_COPY.find} selected={!asking} onPress={() => openDoor("find")} />
          <Pill size="small" variant={asking ? "primary" : "ghost"} fixedLabel label={PEOPLE_COPY.ask} selected={asking} onPress={() => openDoor("ask")} />
        </View>
      ) : null}
      {asking && !query.trim() ? (
        <View style={{ marginTop: space.l, gap: space.xs }}>
          <Small>{"For example"}</Small>
          {PEOPLE_COPY.examples.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="button"
              accessibilityLabel={e}
              accessibilityHint="Asks this"
              onPress={() => setQuery(e)}
              style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.link : 1 })}
            >
              <Italic tone="ink">{e}</Italic>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* The index: letter groups, the letter large down the left margin, rows set apart by space. */}
      <View style={{ marginTop: space.xl }}>
        {groups.map((g, gi) => (
          <View key={g.letter} style={{ flexDirection: "row", gap: space.l, paddingTop: gi === 0 ? 0 : space.l, marginTop: gi === 0 ? 0 : space.s, borderTopWidth: gi === 0 ? 0 : 1, borderTopColor: p.hairline }}>
            <Title
              tone="inkQuiet"
              accessibilityRole="header"
              accessibilityLabel={g.letter === "#" ? "Other" : g.letter}
              style={{ width: space.x3, fontFamily: font.poster, opacity: 0.55 }}
            >
              {g.letter}
            </Title>
            <View style={{ flex: 1, gap: space.m }}>
              {g.rows.map((r) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={r.line ? `${r.label}, ${r.line}` : r.label}
                  onPress={() => onOpen(r.id)}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.m, minHeight: TOUCH, opacity: pressed ? press.surface : 1 })}
                >
                  <Sprig personId={r.id} width={size.sprig.row} remembered={r.remembered} />
                  <View style={{ flex: 1 }}>
                    <Body tone="ink" style={{ fontFamily: font.sansMedium }}>{r.label}</Body>
                    {r.line ? <Italic numberOfLines={isLargeText() ? undefined : 2}>{r.line}</Italic> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>

      {rows.length === 0 ? (
        <View style={{ marginTop: space.l }}>
          <Body>{PEOPLE_COPY.empty}</Body>
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
