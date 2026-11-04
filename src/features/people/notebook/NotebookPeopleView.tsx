// People as an index (Moment Deck × Notebook, PR #77 spec §9 and §10; stills people.jpg,
// people-dense.jpg, people-search.jpg), behind the notebook_deck flag:
//
//   the masthead  "People" at 44, Add (+) and Settings (sliders): the same add and Settings flows
//   the field     one field, "Find someone, or something you told Kinship": the people a search
//                 names, as tiles, then "In what you told Kinship", Ask v1's own grounded answer
//                 (useAsk, unchanged: no model, no synthesis, no new ranking), each line in the
//                 page's words with the found words marked, the person's face and the source. A tap
//                 opens that note in their notebook's Pages (else that line in Knows)
//   the band      "Coming up for them": ordered by date only, each person once
//   everyone      equal 4:5 tiles, three across, A–Z; letter breaks and an A–Z rail above about 25
//                 people. Virtualized rows of three, photos read only when a tile is on screen
//
// No sort, no groups, no pins, no counts. Paused and remembered people look like anyone else (D13).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, ScrollView, SectionList, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Search, Settings2 } from "lucide-react-native";
import { maxScale, notebook, notebookShadow, size, space } from "@/design/tokens";
import { ASK_COPY, looksLikeName } from "@/features/ask/retrieve";
import type { AskView } from "@/features/ask/useAsk";
import { AddByNameSheet } from "@/features/setup/AddByNameSheet";
import type { Person } from "@/store/repositories";
import { Grain, IconButton, isLargeText, KeyboardBar, type NavKey, useKeyboardBarId, usePalette, useReduceMotion } from "@/ui";
import { Lbl, NButton, NT, NText, useNotebookPalette } from "@/ui/notebook";
import { BandPerson, HitRow, TileRow } from "./IndexParts";
import { LetterRail, RAIL_WIDTH } from "./LetterRail";
import { type BandEntry, type Hit, hitsOf, INDEX_COPY, nameMatches, showsLetters, type TileData, tileSections } from "./peopleIndexModel";

type Item =
  | { kind: "tiles"; key: string; tiles: TileData[] }
  | { kind: "hit"; key: string; hit: Hit }
  | { kind: "miss"; key: string; text: string };

interface Section {
  key: string;
  /** A letter break. */
  letter: string | null;
  /** A labelled part of the search ("People", "In what you told Kinship"). */
  title: string | null;
  data: Item[];
}

export interface NotebookPeopleViewProps {
  /** Read at least once: until then nothing says "no one here yet". */
  loaded: boolean;
  /** Everyone in People (for finding by every name they go by). */
  people: readonly Person[];
  tiles: TileData[];
  band: BandEntry[];
  /** Every word of everyone's names (never marked as a found word). */
  names: ReadonlySet<string>;
  /** The ISO day the band was read for. */
  today: string;
  onOpen: (personId: string) => void;
  onAdd: (name: string) => Promise<unknown>;
  onSettings?: () => void;
  onAddFromContacts?: () => void;
  /** Today · People on the keyboard's bar while searching (founder I6). */
  onGo?: (to: NavKey) => void;
  /** The field's words, as typed (the route asks memory with them). */
  onQuery?: (query: string) => void;
  /** Ask v1's answer (useAsk) for `memory.query`. */
  memory?: AskView;
  /** A found line: that note in their notebook (an href from the model). */
  onHit: (href: string) => void;
  /** The lab and tests. */
  initialQuery?: string;
  initialAdding?: string | null;
}

export function NotebookPeopleView({
  loaded, people, tiles, band, names, today, onOpen, onAdd, onSettings, onAddFromContacts, onGo, onQuery, memory, onHit,
  initialQuery = "", initialAdding = null,
}: NotebookPeopleViewProps) {
  const p = usePalette();
  const n = useNotebookPalette();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const bar = useKeyboardBarId();
  const list = useRef<SectionList<Item, Section>>(null);
  const [query, setQuery] = useState(initialQuery);
  const [adding, setAdding] = useState<string | null>(initialAdding);
  // The rail sits beside Everyone (people-dense.jpg): it starts where the list does and stays in
  // view once the masthead and the band have scrolled away.
  const [headerH, setHeaderH] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    onQuery?.(query);
  }, [query, onQuery]);

  // The answer for these words; while a new one is being read, the last settled answer holds.
  const held = useRef<AskView | undefined>(undefined);
  const settled = memory && memory.query === query ? memory : held.current;
  if (memory && memory.query === query) held.current = memory;
  const q = query.trim();
  const searching = q.length > 0;
  // Only an account with people has memory to ask (contract §8).
  const asked = searching && !!settled?.asked && tiles.length > 0;
  const columns = isLargeText() ? 2 : notebook.tile.columns;
  const letters = !searching && showsLetters(tiles.length, notebook.railAbove);

  const found = useMemo(() => {
    if (!searching) return [] as TileData[];
    const named = new Set(settled?.named ?? []);
    // A question keeps the people it names ("When did I last see Sam?" → both Sams); a name filters.
    if (asked) return tiles.filter((t) => named.has(t.id));
    const byName = nameMatches(people, q);
    return tiles.filter((t) => named.has(t.id) || byName.has(t.id));
  }, [searching, settled, asked, tiles, people, q]);
  const hits = useMemo(() => (asked && settled ? hitsOf(settled) : []), [asked, settled]);
  // "Add Zelda" is for a name; a sentence nothing answers is never offered as someone to add.
  const offerAdd = searching && found.length === 0 && !asked && looksLikeName(query);
  const nameOf = useMemo(() => new Map(tiles.map((t) => [t.id, t.name])), [tiles]);

  const sections = useMemo<Section[]>(() => {
    const tileItems = (rows: TileData[][], prefix: string): Item[] =>
      rows.map((r) => ({ kind: "tiles", key: `${prefix}:${r.map((t) => t.id).join(",")}`, tiles: r }));
    if (!searching) {
      return tileSections(tiles, columns, letters).map((s) => ({ key: s.key, letter: s.letter, title: null, data: tileItems(s.rows, s.key) }));
    }
    const out: Section[] = [];
    if (found.length) {
      const rows: TileData[][] = [];
      for (let i = 0; i < found.length; i += columns) rows.push(found.slice(i, i + columns));
      out.push({ key: "people", letter: null, title: INDEX_COPY.people, data: tileItems(rows, "people") });
    }
    if (asked) {
      const data: Item[] = hits.length
        ? hits.map((hit) => ({ kind: "hit", key: hit.key, hit }))
        : [{ kind: "miss", key: "miss", text: settled?.miss ?? ASK_COPY.nothing }];
      out.push({ key: "found", letter: null, title: INDEX_COPY.found, data });
    }
    return out;
  }, [searching, tiles, columns, letters, found, asked, hits, settled]);

  const railLetters = useMemo(() => (letters ? sections.map((s) => s.letter).filter((l): l is string => !!l) : []), [letters, sections]);
  const toLetter = useCallback((letter: string) => {
    const sectionIndex = sections.findIndex((s) => s.letter === letter);
    if (sectionIndex < 0) return;
    list.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewOffset: 0, animated: !reduceMotion });
  }, [sections, reduceMotion]);

  const renderItem = useCallback(({ item }: { item: Item }) => {
    if (item.kind === "tiles") return <TileRow tiles={item.tiles} columns={columns} onOpen={onOpen} gutter={letters ? RAIL_WIDTH : 0} />;
    if (item.kind === "hit") {
      return <HitRow hit={item.hit} name={nameOf.get(item.hit.personId) ?? ""} query={query} names={names} onPress={onHit} />;
    }
    return <NText v="serif19" tone="ink2" style={{ paddingHorizontal: space.l + space.xs, paddingVertical: space.xl }}>{item.text}</NText>;
  }, [columns, onOpen, nameOf, query, names, onHit, letters]);

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => {
    if (section.letter) {
      return (
        <NText v="group" tone="quiet" accessibilityRole="header" accessibilityLabel={section.letter === "#" ? "Other" : section.letter}
          style={{ paddingHorizontal: 18, marginTop: space.s, marginBottom: space.m }}>
          {section.letter}
        </NText>
      );
    }
    if (section.title) return <Lbl dot={null} style={{ paddingHorizontal: space.l, marginTop: space.xl, marginBottom: space.m }}>{section.title}</Lbl>;
    return null;
  }, []);

  const header = (
    <View style={{ paddingTop: insets.top + space.l }} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
      {/* The masthead. */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 22, paddingRight: space.m }}>
        {/* In its own box: a Text given flex in a row clips at the largest text sizes. */}
        <View style={{ flex: 1 }}><NText v="hero">{INDEX_COPY.title}</NText></View>
        <IconButton label="Add someone" onPress={() => setAdding(q)}>
          <Plus color={p.ink} size={size.iconLarge} strokeWidth={1.8} />
        </IconButton>
        {onSettings ? (
          <IconButton label="Settings" onPress={onSettings}>
            <Settings2 color={p.ink} size={size.iconLarge} strokeWidth={1.8} />
          </IconButton>
        ) : null}
      </View>

      {/* The one field. */}
      <View
        style={{
          marginTop: 14, marginHorizontal: space.l, minHeight: 50, borderRadius: 25, backgroundColor: n.card,
          flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, ...notebookShadow.card,
        }}
      >
        <Search color={n.quiet} size={20} strokeWidth={1.8} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          {/* The prompt is drawn, not the field's placeholder: a placeholder can only clip, and at 375 pt
              (or large text) "…something you told Kinship" lost its last word. This one shrinks to fit. */}
          {query ? null : (
            <NText
              v="body16"
              color={n.quiet}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              maxFontSizeMultiplier={maxScale.text}
              importantForAccessibility="no"
              accessibilityElementsHidden
              style={{ position: "absolute", left: 0, right: 0 }}
              testID="people-search-prompt"
            >
              {INDEX_COPY.search}
            </NText>
          )}
          <TextInput
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={INDEX_COPY.search}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            inputAccessoryViewID={bar}
            maxFontSizeMultiplier={maxScale.text}
            testID="people-search"
            style={[NT.body16, { color: p.ink, paddingVertical: space.m }]}
          />
        </View>
        <KeyboardBar id={bar} nav={onGo ? { current: "people", onGo } : undefined} />
      </View>

      {/* Coming up for them: by date only, each person once. */}
      {!searching && band.length ? (
        <>
          <Lbl style={{ paddingHorizontal: space.xxl, paddingTop: space.xxl, paddingBottom: 10 }}>{INDEX_COPY.band}</Lbl>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 18, paddingTop: space.xs, paddingBottom: 6 }}>
            {band.map((b) => <BandPerson key={b.personId} entry={b} today={today} onOpen={onOpen} />)}
          </ScrollView>
        </>
      ) : null}
      {!searching && tiles.length ? (
        <Lbl style={{ paddingHorizontal: space.xxl, paddingTop: space.xxl, paddingBottom: letters ? space.s : 14 }}>{INDEX_COPY.everyone}</Lbl>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ paddingBottom: space.x4 }}>
      {loaded && !searching && tiles.length === 0 ? (
        <View style={{ paddingHorizontal: space.xxl, marginTop: space.xxl }}>
          <NText v="serif21">{INDEX_COPY.empty}</NText>
          <View style={{ alignItems: "flex-start", gap: space.s, marginTop: space.xl }}>
            {onAddFromContacts ? <NButton variant="ink" label={INDEX_COPY.addFromContacts} onPress={onAddFromContacts} /> : null}
            <NButton variant={onAddFromContacts ? "ghost" : "ink"} label={INDEX_COPY.addByName} onPress={() => setAdding("")} />
          </View>
        </View>
      ) : offerAdd ? (
        <View style={{ paddingHorizontal: space.xxl, marginTop: space.xl, alignItems: "flex-start", gap: space.m }}>
          <NText v="serif19" tone="ink2">{INDEX_COPY.noOne(q)}</NText>
          <NButton small variant="ink" label={INDEX_COPY.add(q)} onPress={() => setAdding(q)} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <SectionList<Item, Section>
        ref={list}
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={9}
        removeClippedSubviews={Platform.OS === "android"}
        onScrollToIndexFailed={(info) => {
          // Rows not measured yet: go near, then to the letter.
          const responder = list.current?.getScrollResponder() as unknown as { scrollTo?: (o: { y: number; animated: boolean }) => void } | undefined;
          responder?.scrollTo?.({ y: info.averageItemLength * info.index, animated: false });
          setTimeout(() => {
            const at = findSection(sections, info.index);
            if (at >= 0) list.current?.scrollToLocation({ sectionIndex: at, itemIndex: 0, viewOffset: 0, animated: false });
          }, 60);
        }}
        onScroll={railLetters.length ? (e) => scrollY.setValue(e.nativeEvent.contentOffset.y) : undefined}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      />
      {railLetters.length && headerH ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: "absolute", right: 2, top: 0,
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [0, Math.max(1, headerH - insets.top - space.s)],
                outputRange: [headerH, insets.top + space.s],
                extrapolate: "clamp",
              }),
            }],
          }}
        >
          <LetterRail letters={railLetters} onLetter={toLetter} />
        </Animated.View>
      ) : null}
      <Grain />
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
    </View>
  );
}

/** Which section a flat SectionList index falls in (each section is a header, its items, a footer). */
function findSection(sections: readonly Section[], index: number): number {
  let at = 0;
  for (let i = 0; i < sections.length; i++) {
    const span = sections[i].data.length + 2;
    if (index < at + span) return i;
    at += span;
  }
  return sections.length - 1;
}
