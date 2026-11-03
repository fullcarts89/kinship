// Small pieces of the person notebook (PR #77 proto.css "Person notebook", "Pages", "Source"): the
// solid back button, a line with its source, the private source, a sprout row, and a note's words with
// the kept, private and found words marked. Meaning colours always come with a word.
import React from "react";
import { Text, View, type TextStyle, type ViewStyle } from "react-native";
import { ChevronLeft, Lock, Sprout } from "lucide-react-native";
import { maxScale, notebookShadow, press, size, space, TOUCH } from "@/design/tokens";
import { Pressable } from "@/ui/Pressable";
import { usePalette } from "@/ui";
import { NSource, NText, NT, useNotebookPalette, type SourceKind } from "@/ui/notebook";
import { narrowest, segment, type PageSpan } from "./pagesModel";

/** The round white back button over the page's media (44 pt). */
export function SolidBack({ onPress, style }: { onPress: () => void; style?: ViewStyle }) {
  const p = usePalette();
  const n = useNotebookPalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={({ pressed }) => [{
        width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, backgroundColor: n.card, alignItems: "center", justifyContent: "center",
        opacity: pressed ? press.surface : 1, ...notebookShadow.card,
      }, style]}
    >
      <ChevronLeft color={p.ink} size={size.iconLarge} strokeWidth={2} />
    </Pressable>
  );
}

/** "Private · you said yes": a line the user kept after Kinship asked; its note is never shown here. */
export const PRIVATE_COPY = "Private · you said yes";

export function PrivateSource({ suffix, dot = "green", onPress }: { suffix?: string | null; dot?: "green" | "held"; onPress?: () => void }) {
  const n = useNotebookPalette();
  const label = suffix ? `${PRIVATE_COPY} · ${suffix}` : PRIVATE_COPY;
  const row = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s - 1 }}>
      <View style={{ width: size.dot, height: size.dot, borderRadius: size.dot / 2, backgroundColor: dot === "held" ? n.held : n.green }} />
      <Lock color={n.ink2} size={13} strokeWidth={2} />
      <NText v="source" tone="ink2" style={{ flexShrink: 1 }}>{label}</NText>
    </View>
  );
  if (!onPress) return <View accessible accessibilityLabel={label}>{row}</View>;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint="Opens where this came from" onPress={onPress}
      hitSlop={{ top: space.s, bottom: space.s, left: 0, right: space.l }} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? press.link : 1 })}>
      {row}
    </Pressable>
  );
}

/** Which dot a provenance gets: Contacts sky, a note green. */
export function sourceKind(provenance: string): SourceKind {
  return provenance === "From Contacts" ? "contacts" : "note";
}

/** "was: ~~Sam is interviewing at Stripe~~", quiet, under a line that replaced it. */
export function Was({ was, prefix = "" }: { was: string; prefix?: string }) {
  const n = useNotebookPalette();
  return (
    <NText v="small" tone="quiet" style={{ marginTop: space.xs }} accessibilityLabel={`${prefix}Was: ${was}`}>
      {`${prefix}was: `}
      <Text style={{ textDecorationLine: "line-through", color: n.quiet }}>{was}</Text>
    </NText>
  );
}

/** A sprout row (Between you; a showing-up entry): the bold line, the about in italic serif. */
export function SproutRow({ title, about, onPress }: { title: string; about?: string | null; onPress?: () => void }) {
  const n = useNotebookPalette();
  const body = (
    <View style={{ flexDirection: "row", gap: space.m, alignItems: "flex-start", paddingVertical: space.s }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: n.greenTint, alignItems: "center", justifyContent: "center" }}>
        <Sprout color={n.green} size={17} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <NText v="strong15">{title}</NText>
        {about ? <NText v="quote15" tone="ink2">{about}</NText> : null}
      </View>
    </View>
  );
  const label = about ? `${title}. ${about}` : title;
  if (!onPress) return <View accessible accessibilityLabel={label}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Opens this line" onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}>
      {body}
    </Pressable>
  );
}

/** A notebook line (`.ln`): the words in serif 18, what it replaced, and where it came from. */
export function NotebookLine({ text, was, provenance, sensitive, onPress, onSource, yours = false, sourceLabel, notes, sourceNode }: {
  text: string;
  was?: string | null;
  provenance: string;
  sensitive?: boolean;
  onPress?: () => void;
  onSource?: () => void;
  /** "You said you'd": the sunset edge. */
  yours?: boolean;
  /** Said instead of the provenance ("Kinship brings it back Sat"). */
  sourceLabel?: string;
  /** More under the words, before the source (Before, Edited by you, Replaces). */
  notes?: React.ReactNode;
  /** A source row of its own (a private line in Knows opens its note). */
  sourceNode?: React.ReactNode;
}) {
  const n = useNotebookPalette();
  const words = <NText v="serif18">{text}</NText>;
  return (
    <View style={[{ paddingVertical: space.s + 1 }, yours ? { borderLeftWidth: 3, borderLeftColor: n.yours, paddingLeft: 14 } : null]}>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityHint="Opens this line" onPress={onPress}
          style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}>
          {words}
        </Pressable>
      ) : words}
      {was ? <Was was={was} /> : null}
      {notes}
      <View style={{ marginTop: space.xs + 1 }}>
        {sourceNode ?? (sensitive ? <PrivateSource /> : (
          <NSource kind={yours ? "yours" : sourceKind(provenance)} label={sourceLabel ?? provenance} tone={yours ? "yours" : undefined} onPress={onSource} />
        ))}
      </View>
    </View>
  );
}

/**
 * A note's words with this person's kept words marked (lime; lavender for a private line the user said
 * yes to), the found words (butter), and words Kinship couldn't get to (dotted). A kept word opens its
 * line; other people's lines are not marked here.
 */
export function MarkedWords({ text, spans, found = [], unprocessed = [], colorOf, focusItemId, style, onLine, lineLabel }: {
  text: string;
  spans: PageSpan[];
  found?: [number, number][];
  unprocessed?: [number, number][];
  /** A line's own mark colour (the Source page marks each person's lines in their colour). */
  colorOf?: (s: PageSpan) => string;
  focusItemId?: string | null;
  style: TextStyle;
  onLine?: (itemId: string) => void;
  /** What a kept word says to screen readers: "Shows the line: …". */
  lineLabel?: (itemId: string) => string | null;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  type Layer = { kind: "kept"; span: PageSpan } | { kind: "found" } | { kind: "left" };
  const layers: { start: number; end: number; data: Layer }[] = [
    ...spans.map((s) => ({ start: s.start, end: s.end, data: { kind: "kept", span: s } as Layer })),
    ...found.map(([a, b]) => ({ start: a, end: b, data: { kind: "found" } as Layer })),
    ...unprocessed.map(([a, b]) => ({ start: a, end: b, data: { kind: "left" } as Layer })),
  ];
  const pieces = segment(text.length, layers);
  return (
    <Text maxFontSizeMultiplier={maxScale.text} style={[style, { color: p.ink }]}>
      {pieces.map((piece, i) => {
        const words = text.slice(piece.start, piece.end);
        const kept = narrowest(piece.on.filter((l): l is Extract<Layer, { kind: "kept" }> => l.kind === "kept").map((l) => l.span));
        const isFound = piece.on.some((l) => l.kind === "found");
        const left = piece.on.some((l) => l.kind === "left");
        const bg = isFound ? n.find : kept ? (colorOf ? colorOf(kept) : kept.sensitive ? n.privateSpan : n.keptSpan) : undefined;
        const focus = !!kept && !!focusItemId && kept.itemId === focusItemId;
        const look: TextStyle = {
          ...(bg ? { backgroundColor: bg } : {}),
          ...(left ? { textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: n.quiet } : {}),
          ...(focus ? { textDecorationLine: "underline", textDecorationColor: p.ink } : {}),
        };
        if (kept && onLine) {
          const label = lineLabel?.(kept.itemId) ?? kept.statement ?? null;
          return (
            <Text key={i} style={look} onPress={() => onLine(kept.itemId)} accessibilityRole="link"
              accessibilityLabel={label ? `Shows the line: ${label}` : undefined} testID={`kept-${kept.itemId}`}>
              {words}
            </Text>
          );
        }
        return <Text key={i} style={Object.keys(look).length ? look : undefined}>{words}</Text>;
      })}
    </Text>
  );
}

/** The note's type on Pages (Newsreader 17.5 on a 30 pt rule) and on the Source page (20 on 34). */
export const pagesType: TextStyle = { ...NT.serif18, fontSize: 17.5, lineHeight: 30 };
export const sourceType: TextStyle = { ...NT.serif20, fontSize: 20, lineHeight: 34 };
