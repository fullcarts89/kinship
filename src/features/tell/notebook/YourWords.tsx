// "Your words" (PR #77 §7; shots/review-j2.jpg): the note exactly as told, each phrase Kinship read
// underlined in its person's identity colour. A tap on a phrase finds its line; a removed line's
// phrase goes dotted and faded; words the understanding did not get to stay grey and dotted. Long
// notes fold to about five lines, with "Show all of it".
//
// The underlines arrive one after another the first time the words are shown (600 ms each, 110 ms
// apart; Reduce Motion: one 150 ms fade). React Native can't animate part of a paragraph's
// decoration, so each phrase's underline is drawn on its own copy of the paragraph (the words
// themselves clear) and faded in: the same layout, so it sits exactly under its words.
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Text, View, type TextStyle } from "react-native";
import { maxScale, notebook, notebookShadow, press, space, TOUCH } from "@/design/tokens";
import { useReduceMotion, usePalette } from "@/ui";
import { Pressable } from "@/ui/Pressable";
import { NText, NT, personLook, useNotebookPalette } from "@/ui/notebook";
import { inReadingOrder, WORDS_FOLD_AT, wordRuns, type WordMark, type WordRun } from "./words";

export interface YourWordsProps {
  text: string;
  /** "Your words · Mon, Nov 2". */
  cap: string;
  marks: WordMark[];
  unprocessed: { start: number; end: number }[];
  /** What a phrase shows when tapped, for VoiceOver ("Shows the line: Priya is back from Lisbon for good"). */
  describe: (mark: WordMark) => string;
  onPhrase: (mark: WordMark) => void;
  /** The phrase a line's tap lit up, by mark target ("line:<id>"), or null. */
  lit: string | null;
  open: boolean;
  onToggle: () => void;
  onOpenNote?: () => void;
}

export const targetKey = (m: WordMark) => (m.target.kind === "line" ? `line:${m.target.id}` : `held:${m.target.index}`);

const ALPHA_FLASH = "55";

export function YourWords(props: YourWordsProps) {
  const p = usePalette();
  const n = useNotebookPalette();
  const reduce = useReduceMotion();
  const runs = wordRuns(props.text, props.marks, props.unprocessed);
  const folds = props.text.length > WORDS_FOLD_AT;
  const lines = folds && !props.open ? 5 : undefined;
  const colourOf = (m: WordMark) => (m.personId ? personLook(m.personId).color : n.held);
  const base: TextStyle = { ...NT.serif17, lineHeight: notebook.ruled.words, color: p.ink };
  // Android draws no coloured decoration: there the underline is the paragraph's own, without the fade.
  const overlay = Platform.OS === "ios";
  const live = inReadingOrder(props.marks.filter((m) => !m.gone));
  const runStyle = (r: WordRun): TextStyle | null => {
    if (r.mark?.gone) return { textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: colourOf(r.mark), color: n.quiet };
    if (r.mark) {
      const lit = props.lit === targetKey(r.mark) ? { backgroundColor: `${colourOf(r.mark)}${ALPHA_FLASH}` } : null;
      return { ...(overlay ? null : { textDecorationLine: "underline", textDecorationColor: colourOf(r.mark) }), ...lit } as TextStyle;
    }
    if (r.unprocessed) return { textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: n.quiet, color: n.quiet };
    return null;
  };
  return (
    <View style={[{ borderTopLeftRadius: 10, borderBottomLeftRadius: 10, borderTopRightRadius: 22, borderBottomRightRadius: 22 }, notebookShadow.card]}>
      <View
        style={{
          backgroundColor: n.sheet, borderLeftWidth: 3, borderLeftColor: n.sheetMargin, overflow: "hidden",
          borderTopLeftRadius: 10, borderBottomLeftRadius: 10, borderTopRightRadius: 22, borderBottomRightRadius: 22,
          paddingTop: space.m, paddingBottom: space.m, paddingLeft: space.xl - 1, paddingRight: space.l,
        }}
      >
        <NText v="cap" tone="quiet" style={{ marginBottom: space.xs }}>{props.cap}</NText>
        <View>
          <Text style={base} numberOfLines={lines} maxFontSizeMultiplier={maxScale.text}>
            {runs.map((r) => (r.mark && !r.mark.gone ? (
              <Text
                key={`${r.start}`}
                accessibilityRole="link"
                accessibilityLabel={props.describe(r.mark)}
                onPress={() => props.onPhrase(r.mark!)}
                style={runStyle(r)}
              >
                {r.text}
              </Text>
            ) : (
              <Text key={`${r.start}`} style={runStyle(r)}>{r.text}</Text>
            )))}
          </Text>
          {overlay ? live.map((m, i) => (
            <Underline key={m.key} delay={reduce ? 0 : i * 110} duration={reduce ? 150 : 600}>
              <Text style={[base, { color: "transparent" }]} numberOfLines={lines} maxFontSizeMultiplier={maxScale.text}>
                {runs.map((r) => (
                  <Text
                    key={`${r.start}`}
                    style={r.mark?.key === m.key ? { textDecorationLine: "underline", textDecorationStyle: "solid", textDecorationColor: colourOf(m) } : null}
                  >
                    {r.text}
                  </Text>
                ))}
              </Text>
            </Underline>
          )) : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: space.l }}>
          {folds ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.open ? "Show less" : "Show all of it"}
              onPress={props.onToggle}
              hitSlop={{ top: 6, bottom: 6 }}
              style={({ pressed }) => ({ minHeight: TOUCH - space.s, justifyContent: "center", paddingTop: space.xs, opacity: pressed ? press.link : 1 })}
            >
              <NText v="strong14" tone="ink2" style={{ fontSize: 13 }}>{props.open ? "Show less" : "Show all of it"}</NText>
            </Pressable>
          ) : null}
          {props.onOpenNote ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See the note"
              accessibilityHint="Opens the note on its own page"
              onPress={props.onOpenNote}
              hitSlop={{ top: 6, bottom: 6 }}
              style={({ pressed }) => ({ minHeight: TOUCH - space.s, justifyContent: "center", paddingTop: space.xs, opacity: pressed ? press.link : 1 })}
            >
              <NText v="strong14" tone="quiet" style={{ fontSize: 13 }}>{"See the note"}</NText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** One phrase's underline, faded in after its turn (the arrival order of the note). */
function Underline({ delay, duration, children }: { delay: number; duration: number; children: React.ReactNode }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(o, { toValue: 1, delay, duration, useNativeDriver: true });
    a.start();
    return () => a.stop();
    // Only on first appearance: a re-render never draws it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, opacity: o }}
    >
      {children}
    </Animated.View>
  );
}
