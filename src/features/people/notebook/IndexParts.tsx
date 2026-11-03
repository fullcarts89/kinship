// The index's pieces (PR #77 proto.css "People"): a tile, a row of tiles, a band portrait, a found
// line. Faces are identity only (D8); photos are the ones the user chose, read when a piece is on
// screen (a virtualized list mounts only what is near), never before.
import React, { memo } from "react";
import { Image, Text, View } from "react-native";
import { font, notebook, press, space, TOUCH } from "@/design/tokens";
import { usePersonPortrait } from "@/hooks/usePersonPortrait";
import { Pressable } from "@/ui/Pressable";
import { usePalette } from "@/ui";
import { Face, flowers, initialOf, NSource, NText, personLook, useNotebookPalette } from "@/ui/notebook";
import { bandDaySpoken, type BandEntry, type Hit, INDEX_COPY, markFound, type TileData } from "./peopleIndexModel";

export const INDEX_A11Y = {
  open: "Opens their notebook",
  hit: "Opens this in their notebook",
} as const;

/** One person, as an equal 4:5 tile: their photo, else their initial on their colour with their flower. */
export const PeopleTile = memo(function PeopleTile({ tile, onOpen }: { tile: TileData; onOpen: (id: string) => void }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const { uri } = usePersonPortrait(tile.id);
  const look = personLook(tile.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tile.line ? `${tile.name}, ${tile.line}` : tile.name}
      accessibilityHint={INDEX_A11Y.open}
      onPress={() => onOpen(tile.id)}
      testID={`tile-${tile.id}`}
      style={({ pressed }) => ({ flex: 1, minHeight: TOUCH, opacity: pressed ? press.surface : 1 })}
    >
      <View
        style={{
          width: "100%", aspectRatio: 1 / notebook.tile.aspect, borderRadius: notebook.tile.radius, overflow: "hidden",
          backgroundColor: look.color,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <>
            <Text
              allowFontScaling={false}
              style={{ position: "absolute", left: 10, top: 6, fontFamily: font.poster, fontSize: 52, lineHeight: 56, letterSpacing: -1.5, color: look.on, opacity: 0.9 }}
            >
              {initialOf(tile.name)}
            </Text>
            <Image
              source={flowers[look.flower]}
              resizeMode="contain"
              style={{ position: "absolute", width: "82%", aspectRatio: 1, right: "-14%", bottom: "-10%", transform: [{ rotate: "-8deg" }] }}
            />
          </>
        )}
      </View>
      <NText v="strong14" style={{ marginTop: space.s, color: p.ink }}>{tile.name}</NText>
      {tile.line ? <NText v="quote14" color={n.ink2} style={{ marginTop: 2 }}>{tile.line}</NText> : null}
    </Pressable>
  );
});

/** A row of tiles; a short last row keeps every tile the same width. */
export function TileRow({ tiles, columns, onOpen }: { tiles: TileData[]; columns: number; onOpen: (id: string) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: notebook.tile.gap, paddingHorizontal: space.l, marginBottom: notebook.tile.rowGap }}>
      {tiles.map((t) => <PeopleTile key={t.id} tile={t} onOpen={onOpen} />)}
      {Array.from({ length: Math.max(0, columns - tiles.length) }, (_, i) => <View key={`gap${i}`} style={{ flex: 1 }} />)}
    </View>
  );
}

/** One person in "Coming up for them": a soft blob portrait, their name, a dark day chip. */
export function BandPerson({ entry, today, onOpen }: { entry: BandEntry; today: string; onOpen: (id: string) => void }) {
  const p = usePalette();
  const { uri } = usePersonPortrait(entry.personId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${bandDaySpoken(entry.day, today)}`}
      accessibilityHint={INDEX_A11Y.open}
      onPress={() => onOpen(entry.personId)}
      testID={`band-${entry.personId}`}
      style={({ pressed }) => ({ width: 92, alignItems: "center", opacity: pressed ? press.surface : 1 })}
    >
      <Face personId={entry.personId} name={entry.name} photoUri={uri} size={notebook.band} blob />
      <NText v="strong14" style={{ marginTop: space.s, textAlign: "center", color: p.ink }}>{entry.name}</NText>
      <View style={{ marginTop: space.xs, backgroundColor: p.ink, borderRadius: 6, paddingHorizontal: 7, paddingVertical: space.xs }}>
        <NText v="dayCap" color={p.onInk}>{entry.label}</NText>
      </View>
    </Pressable>
  );
}

/** A line with the searched words marked in the find colour (never colour alone: the words are the match). */
export function Marked({ text, query, names }: { text: string; query: string; names: ReadonlySet<string> }) {
  const n = useNotebookPalette();
  const parts = markFound(text, query, names);
  return (
    <NText v="serif17">
      {parts.map((part, i) => (part.found ? <Text key={i} style={{ backgroundColor: n.find }}>{part.text}</Text> : part.text))}
    </NText>
  );
}

/** One thing a search found in what the user told Kinship: their face, their words, its source. */
export function HitRow({ hit, name, query, names, onPress }: {
  hit: Hit;
  name: string;
  query: string;
  names: ReadonlySet<string>;
  onPress: (href: string) => void;
}) {
  const p = usePalette();
  const { uri } = usePersonPortrait(hit.personId);
  const said = [hit.earlier ? `${INDEX_COPY.earlier}: ${hit.text}` : hit.text, ...hit.notes, hit.source].filter(Boolean).join(". ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={said}
      accessibilityHint={INDEX_A11Y.hit}
      onPress={() => onPress(hit.href)}
      testID={`hit-${hit.key}`}
      style={({ pressed }) => ({
        flexDirection: "row", gap: space.m, paddingVertical: 14, paddingHorizontal: space.xs, marginHorizontal: space.l,
        borderBottomWidth: 1, borderBottomColor: p.hairline, opacity: pressed ? press.surface : 1,
      })}
    >
      <Face personId={hit.personId} name={name} photoUri={uri} size={40} />
      <View style={{ flex: 1 }}>
        {hit.earlier ? <NText v="small" tone="quiet" style={{ marginBottom: space.xs }}>{INDEX_COPY.earlier}</NText> : null}
        <Marked text={hit.text} query={query} names={names} />
        {hit.notes.map((x) => <NText key={x} v="small" tone="quiet" style={{ marginTop: space.xs }}>{x}</NText>)}
        {hit.source ? <NSource kind={hit.sourceKind} label={hit.source} style={{ marginTop: 6 }} /> : null}
      </View>
    </Pressable>
  );
}
