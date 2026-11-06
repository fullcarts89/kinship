// The A–Z rail (PR #77 `.az`), shown only above about 25 people: tap a letter, or slide along the
// rail, to go to that letter's break. One adjustable control for VoiceOver (swipe up or down to move
// a letter); the letter breaks are headers too, so the rotor reaches them.
import React, { useRef, useState } from "react";
import { type GestureResponderEvent, View } from "react-native";
import { space, TOUCH } from "@/design/tokens";
import { NText, useNotebookPalette } from "@/ui/notebook";
import { INDEX_COPY } from "./peopleIndexModel";

const LETTER_HEIGHT = 15;
/** The rail's width; the tiles beside it leave this much room. */
export const RAIL_WIDTH = TOUCH / 2 + space.s;

export function LetterRail({ letters, onLetter }: { letters: string[]; onLetter: (letter: string) => void }) {
  const n = useNotebookPalette();
  const rail = useRef<View>(null);
  const top = useRef(0);
  const [current, setCurrent] = useState<string | null>(null);
  const go = (i: number) => {
    const letter = letters[Math.max(0, Math.min(letters.length - 1, i))];
    if (!letter || letter === current) return;
    setCurrent(letter);
    onLetter(letter);
  };
  const at = (e: GestureResponderEvent) => go(Math.floor((e.nativeEvent.pageY - top.current - space.xs) / LETTER_HEIGHT));
  const measure = () => rail.current?.measureInWindow?.((_x, y) => {
    top.current = y;
  });
  const step = (by: number) => {
    const i = current ? letters.indexOf(current) : 0;
    const next = letters[Math.max(0, Math.min(letters.length - 1, i + by))];
    if (next) {
      setCurrent(next);
      onLetter(next);
    }
  };
  return (
    <View
      ref={rail}
      onLayout={measure}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={INDEX_COPY.rail}
      accessibilityValue={{ text: current ?? letters[0] }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        measure();
        at(e);
      }}
      onResponderMove={at}
      onResponderRelease={() => setCurrent(null)}
      testID="letter-rail"
      style={{ width: RAIL_WIDTH, paddingVertical: space.xs, alignItems: "center" }}
    >
      {letters.map((l) => (
        <NText key={l} v="dayCap" allowFontScaling={false} color={n.knownText} style={{ height: LETTER_HEIGHT, lineHeight: LETTER_HEIGHT, letterSpacing: 0 }}>{l}</NText>
      ))}
    </View>
  );
}
